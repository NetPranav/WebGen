/**
 * ============================================================================
 * SIGNALS, OPERATORS & BINDINGS (MDM, ROADMAP Phase 7.5 — types only)
 * ============================================================================
 * A Binding is `signal |> operators -> target [blend] [when guard] [@priority]`
 * (engine spec §3.3, grammar §13.1): a continuous, deterministic mapping from
 * an input to a property, shader uniform, simulation parameter, state input,
 * CSS variable, layer pin or edge event.
 *
 * Stored structured (so the AI, the rules and the UI address fields, not text),
 * with a round-tripping text form (`parseBinding` / `formatBinding`) that is the
 * storage-independent format the spec, the AI and tests use.
 *
 * Runtimes: Input Bus (59), bindings and operators (60). Additions to the spec
 * grammar, recorded in decision 0004 and engine spec §3:
 *   - `pointer.velocity` (vec2 px/s; spec §12.3 used it, §3.1 didn't list it);
 *   - a numeric literal as a constant signal (`0 |> spring(…)`, for spring-to);
 *   - `component(x|y)`, picking one axis of a vec2 chain (so `pointer.ndc` can
 *     drive `rotateY`; spec §9 wrote this as `transform.x/y`);
 *   - `spring(bounce: b, time: t)`, the perceptual spring of Law 17;
 *   - `position(pin, x|y)`, a single-axis follow.
 * ============================================================================
 */

import { z } from "zod";
import { EasingSchema, SpringSchema, EventNameSchema, POINTER_SPACES, type SpringConfig } from "./motion";

const Finite = z.number().refine(Number.isFinite, "Must be a finite number.");
const Ident = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Must be an identifier (letters, digits, _).");

// ---------------------------------------------------------------------------
// Layer references and target sets
// ---------------------------------------------------------------------------

/**
 * A layer reference: `self` (the binding's owner, or each target of a set),
 * `parent`, or a layer id. The text form also accepts layer names, resolved
 * to ids with `resolveLayerRefs` before storing.
 */
export const LayerRefSchema = z.string().min(1);

/** One layer, every piece of a Split/Clone group (`Group[*]`), or every layer with a tag. */
export const TargetSetSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("layer"), ref: LayerRefSchema }),
  z.strictObject({ kind: z.literal("group"), ref: LayerRefSchema }),
  z.strictObject({ kind: z.literal("tag"), tag: Ident }),
]);
export type TargetSet = z.infer<typeof TargetSetSchema>;

// ---------------------------------------------------------------------------
// Signals (engine spec §3.1, §4)
// ---------------------------------------------------------------------------

export const POINTER_CHANNELS = ["x", "y", "dx", "dy", "speed", "angle", "velocity", "down", "pressure", "type", "coarse"] as const;

export const SignalSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("pointer"), channel: z.enum(POINTER_CHANNELS) }),
  z.strictObject({ kind: z.literal("pointerIn"), channel: z.enum(["uv", "ndc", "px"]), space: z.enum(POINTER_SPACES) }),
  z.strictObject({ kind: z.literal("pointerInside"), layer: LayerRefSchema }),
  z.strictObject({ kind: z.literal("layerState"), channel: z.enum(["hover", "press", "focus"]), layer: LayerRefSchema }),
  z.strictObject({ kind: z.literal("proximity"), layer: LayerRefSchema, measure: z.enum(["edge", "center"]).optional() }),
  z.strictObject({ kind: z.literal("scroll"), channel: z.enum(["y", "progress", "velocity", "direction"]) }),
  z.strictObject({ kind: z.literal("view"), layer: LayerRefSchema, channel: z.enum(["progress", "visible"]) }),
  z.strictObject({ kind: z.literal("time") }),
  z.strictObject({ kind: z.literal("frameDt") }),
  z.strictObject({ kind: z.literal("audio"), layer: LayerRefSchema, channel: z.enum(["level", "beat", "band"]), band: z.number().int().min(0).optional() }),
  z.strictObject({ kind: z.literal("device"), channel: z.enum(["tiltX", "tiltY", "orientation"]) }),
  z.strictObject({ kind: z.literal("state"), name: z.string().min(1) }),
  z.strictObject({ kind: z.literal("sm"), input: Ident }),
  z.strictObject({ kind: z.literal("prop"), name: Ident }),
  z.strictObject({ kind: z.literal("var"), name: Ident }),
  z.strictObject({ kind: z.literal("seed") }),
  z.strictObject({ kind: z.literal("constant"), value: Finite }),
]);
export type Signal = z.infer<typeof SignalSchema>;

// ---------------------------------------------------------------------------
// Operators (engine spec §3.2, §5)
// ---------------------------------------------------------------------------

export type SignalExpr = { signal: Signal; operators: Operator[] };

export type Operator =
  | { op: "smooth"; tau: number }
  | { op: "spring"; spring: SpringConfig }
  | { op: "remap"; inMin: number; inMax: number; outMin: number; outMax: number; clamp?: boolean }
  | { op: "clamp"; min: number; max: number }
  | { op: "curve"; easing: string }
  | { op: "deadzone"; radius: number }
  | { op: "falloff"; shape: "linear" | "smoothstep" | "gaussian" | "inverse-square"; radius: number }
  | { op: "noise"; frequency: number; amplitude: number; seed: number }
  | { op: "delay"; seconds: number }
  | { op: "trail"; samples: number }
  | { op: "velocity" }
  | { op: "accumulate"; decay: number }
  | { op: "threshold"; on: number; off: number }
  | { op: "edge"; mode: "rise" | "fall" | "both" }
  | { op: "toggle" }
  | { op: "sampleHold"; trigger: SignalExpr }
  | { op: "quantize"; step: number }
  | { op: "mix"; with: SignalExpr; t: number }
  | { op: "add" | "mul" | "min" | "max"; x: number }
  | { op: "abs" | "length" | "normalize" }
  | { op: "rotate"; degrees: number }
  | { op: "distance" | "angleTo"; to: SignalExpr }
  | { op: "select"; whenTrue: SignalExpr; whenFalse: SignalExpr }
  | { op: "component"; axis: "x" | "y" };

export const SignalExprSchema: z.ZodType<SignalExpr> = z.lazy(() =>
  z.strictObject({ signal: SignalSchema, operators: z.array(OperatorSchema) })
);

export const FALLOFF_SHAPES = ["linear", "smoothstep", "gaussian", "inverse-square"] as const;

export const OperatorSchema: z.ZodType<Operator> = z.lazy(() =>
  z.union([
    z.strictObject({ op: z.literal("smooth"), tau: z.number().gt(0) }),
    z.strictObject({ op: z.literal("spring"), spring: SpringSchema }),
    z
      .strictObject({ op: z.literal("remap"), inMin: Finite, inMax: Finite, outMin: Finite, outMax: Finite, clamp: z.boolean().optional() })
      .refine((r) => r.inMin !== r.inMax, "remap needs inMin ≠ inMax."),
    z.strictObject({ op: z.literal("clamp"), min: Finite, max: Finite }).refine((c) => c.min <= c.max, "clamp needs min ≤ max."),
    z.strictObject({ op: z.literal("curve"), easing: EasingSchema }),
    z.strictObject({ op: z.literal("deadzone"), radius: z.number().min(0) }),
    z.strictObject({ op: z.literal("falloff"), shape: z.enum(FALLOFF_SHAPES), radius: z.number().gt(0) }),
    z.strictObject({ op: z.literal("noise"), frequency: z.number().gt(0), amplitude: Finite, seed: z.number().int().min(0) }),
    z.strictObject({ op: z.literal("delay"), seconds: z.number().gt(0).max(10) }),
    z.strictObject({ op: z.literal("trail"), samples: z.number().int().min(2).max(256) }),
    z.strictObject({ op: z.literal("velocity") }),
    z.strictObject({ op: z.literal("accumulate"), decay: z.number().min(0) }),
    z.strictObject({ op: z.literal("threshold"), on: Finite, off: Finite }).refine((t) => t.off <= t.on, "threshold needs off ≤ on (hysteresis)."),
    z.strictObject({ op: z.literal("edge"), mode: z.enum(["rise", "fall", "both"]) }),
    z.strictObject({ op: z.literal("toggle") }),
    z.strictObject({ op: z.literal("sampleHold"), trigger: SignalExprSchema }),
    z.strictObject({ op: z.literal("quantize"), step: z.number().gt(0) }),
    z.strictObject({ op: z.literal("mix"), with: SignalExprSchema, t: z.number().min(0).max(1) }),
    z.strictObject({ op: z.enum(["add", "mul", "min", "max"]), x: Finite }),
    z.strictObject({ op: z.enum(["abs", "length", "normalize"]) }),
    z.strictObject({ op: z.literal("rotate"), degrees: Finite }),
    z.strictObject({ op: z.enum(["distance", "angleTo"]), to: SignalExprSchema }),
    z.strictObject({ op: z.literal("select"), whenTrue: SignalExprSchema, whenFalse: SignalExprSchema }),
    z.strictObject({ op: z.literal("component"), axis: z.enum(["x", "y"]) }),
  ])
);

/** Operators that keep state between frames: they replay from a tape (Law 15). */
export const STATEFUL_OPERATORS: ReadonlySet<Operator["op"]> = new Set([
  "smooth", "spring", "delay", "trail", "velocity", "accumulate", "threshold", "edge", "toggle", "sampleHold",
]);

// ---------------------------------------------------------------------------
// Targets (engine spec §6)
// ---------------------------------------------------------------------------

export const PIN_PRESETS = [
  "center", "top", "bottom", "left", "right", "topLeft", "topRight", "bottomLeft", "bottomRight", "bottomCentre",
] as const;
export const PinNameSchema = z.union([z.enum(PIN_PRESETS), Ident]);

export const TargetSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("property"), on: TargetSetSchema, path: z.string().min(1) }),
  z.strictObject({ kind: z.literal("uniform"), on: TargetSetSchema, name: Ident }),
  z.strictObject({ kind: z.literal("param"), on: TargetSetSchema, name: Ident }),
  z.strictObject({ kind: z.literal("input"), on: TargetSetSchema, name: Ident }),
  z.strictObject({ kind: z.literal("cssvar"), on: TargetSetSchema, name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/) }),
  z.strictObject({ kind: z.literal("position"), on: TargetSetSchema, pin: PinNameSchema, axis: z.enum(["x", "y"]).optional() }),
  z.strictObject({ kind: z.literal("event"), name: EventNameSchema }),
]);
export type BindingTarget = z.infer<typeof TargetSchema>;

// ---------------------------------------------------------------------------
// Guards (engine spec §3.3)
// ---------------------------------------------------------------------------

export const ConditionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("state"), name: z.string().min(1) }),
  z.strictObject({ kind: z.literal("pointerCoarse"), equals: z.boolean() }),
  z.strictObject({ kind: z.literal("breakpoint"), name: Ident, negate: z.boolean() }),
  z.strictObject({ kind: z.literal("reducedMotion"), equals: z.boolean() }),
  z.strictObject({ kind: z.literal("compare"), expr: SignalExprSchema, cmp: z.enum([">", "<", ">=", "<="]), value: Finite }),
]);
export type Condition = z.infer<typeof ConditionSchema>;

/** Conditions joined left to right: `joins[i]` joins conditions i and i+1 (no parentheses, as in the grammar). */
export const GuardSchema = z
  .strictObject({ conditions: z.array(ConditionSchema).min(1), joins: z.array(z.enum(["and", "or"])) })
  .refine((g) => g.joins.length === g.conditions.length - 1, "A guard needs one join between each pair of conditions.");
export type Guard = z.infer<typeof GuardSchema>;

// ---------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------

export const BLEND_MODES = ["replace", "add", "multiply", "max"] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

/** A binding without document identity: what the text form, presets and effect definitions carry. */
export const BindingDraftSchema = z.strictObject({
  expr: SignalExprSchema,
  target: TargetSchema,
  /** Omitted: the target's default (engine spec §6, `defaultBlend`). */
  blend: z.enum(BLEND_MODES).optional(),
  guard: GuardSchema.optional(),
  priority: z.number().int().optional(),
});
export type BindingDraft = z.infer<typeof BindingDraftSchema>;

export const BindingSchema = BindingDraftSchema.extend({
  id: z.string().min(1),
  /** The layer `self` refers to (and the one the binding is listed under). */
  ownerLayerId: z.string().min(1),
  enabled: z.boolean(),
  name: z.string().optional(),
});
export type Binding = z.infer<typeof BindingSchema>;

/**
 * The blend a binding uses when it names none (engine spec §6): offsets and
 * rotations add, scales/opacity/speeds multiply, everything else replaces.
 */
export function defaultBlend(target: BindingTarget): BlendMode {
  if (target.kind === "position") return "add";
  if (target.kind !== "property") return "replace";
  const p = target.path;
  if (/^transform\.(x|y|z|rotate|rotateX|rotateY|skewX|skewY)$/.test(p)) return "add";
  if (/^transform\.scale/.test(p) || p === "appearance.opacity") return "multiply";
  return "replace";
}

/** Every layer reference a binding makes, with where it occurs. */
export function bindingLayerRefs(b: BindingDraft): { ref: string; role: "signal" | "target" | "group" }[] {
  const out: { ref: string; role: "signal" | "target" | "group" }[] = [];
  const walk = (e: SignalExpr) => {
    const s = e.signal;
    if ("layer" in s) out.push({ ref: s.layer, role: "signal" });
    for (const op of e.operators) {
      if (op.op === "sampleHold") walk(op.trigger);
      if (op.op === "mix") walk(op.with);
      if (op.op === "distance" || op.op === "angleTo") walk(op.to);
      if (op.op === "select") {
        walk(op.whenTrue);
        walk(op.whenFalse);
      }
    }
  };
  walk(b.expr);
  for (const c of b.guard?.conditions ?? []) if (c.kind === "compare") walk(c.expr);
  if ("on" in b.target) {
    if (b.target.on.kind === "layer") out.push({ ref: b.target.on.ref, role: "target" });
    if (b.target.on.kind === "group") out.push({ ref: b.target.on.ref, role: "group" });
  }
  return out;
}

// ===========================================================================
// Text form
// ===========================================================================

type Tok =
  | { t: "id"; v: string }
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "p"; v: string };

export class BindingSyntaxError extends Error {}

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === "|>" || two === "->" || two === ">=" || two === "<=" || two === "!=") {
      out.push({ t: "p", v: two });
      i += 2;
      continue;
    }
    if ("()[],.:*@=<>".includes(c)) {
      out.push({ t: "p", v: c });
      i++;
      continue;
    }
    if (c === '"') {
      const end = src.indexOf('"', i + 1);
      if (end < 0) throw new BindingSyntaxError(`Unterminated string at ${i}.`);
      out.push({ t: "str", v: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    const num = /^-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/.exec(src.slice(i));
    // A leading '-' is a number only where an identifier can't precede it (after `->` it's already consumed).
    if (num && (c !== "-" || /[\d.]/.test(src[i + 1] ?? ""))) {
      out.push({ t: "num", v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i));
    if (id) {
      // `-` inside identifiers is allowed (`inverse-square`, `cssvar.my-var`) but not a trailing `->`.
      let word = id[0];
      const arrow = word.indexOf("->");
      if (arrow >= 0) word = word.slice(0, arrow);
      if (word.endsWith("-") && src[i + word.length] === ">") word = word.slice(0, -1);
      out.push({ t: "id", v: word });
      i += word.length;
      continue;
    }
    throw new BindingSyntaxError(`Unexpected "${c}" at ${i}.`);
  }
  return out;
}

class Parser {
  private i = 0;
  constructor(private readonly toks: Tok[]) {}

  peek(offset = 0): Tok | undefined {
    return this.toks[this.i + offset];
  }
  isP(v: string, offset = 0) {
    const t = this.peek(offset);
    return t?.t === "p" && t.v === v;
  }
  isId(v?: string, offset = 0) {
    const t = this.peek(offset);
    return t?.t === "id" && (v === undefined || t.v === v);
  }
  eatP(v: string) {
    if (!this.isP(v)) throw new BindingSyntaxError(`Expected "${v}" but found ${this.describe()}.`);
    this.i++;
  }
  eatId(v?: string): string {
    const t = this.peek();
    if (t?.t !== "id" || (v !== undefined && t.v !== v)) throw new BindingSyntaxError(`Expected ${v ? `"${v}"` : "a name"} but found ${this.describe()}.`);
    this.i++;
    return t.v;
  }
  num(): number {
    const t = this.peek();
    if (t?.t !== "num") throw new BindingSyntaxError(`Expected a number but found ${this.describe()}.`);
    this.i++;
    return t.v;
  }
  bool(): boolean {
    const v = this.eatId();
    if (v !== "true" && v !== "false") throw new BindingSyntaxError(`Expected true or false, found "${v}".`);
    return v === "true";
  }
  ref(): string {
    const t = this.peek();
    if (t?.t === "str") {
      this.i++;
      return t.v;
    }
    return this.eatId();
  }
  done() {
    return this.i >= this.toks.length;
  }
  describe() {
    const t = this.peek();
    return t ? `"${t.v}"` : "the end";
  }

  // <SignalExpr> ::= <Signal> { "|>" <Operator> }
  expr(): SignalExpr {
    const signal = this.signal();
    const operators: Operator[] = [];
    while (this.isP("|>")) {
      this.i++;
      operators.push(this.operator());
    }
    return { signal, operators };
  }

  signal(): Signal {
    const t = this.peek();
    if (t?.t === "num") {
      this.i++;
      return { kind: "constant", value: t.v };
    }
    const head = this.eatId();
    const call = (): string => {
      this.eatP("(");
      const r = this.ref();
      this.eatP(")");
      return r;
    };
    switch (head) {
      case "pointer": {
        this.eatP(".");
        const ch = this.eatId();
        if (ch === "uv" || ch === "ndc" || ch === "px") {
          this.eatP("(");
          const space = this.eatId();
          this.eatP(")");
          if (!(POINTER_SPACES as readonly string[]).includes(space)) throw new BindingSyntaxError(`Unknown space "${space}".`);
          return { kind: "pointerIn", channel: ch, space: space as (typeof POINTER_SPACES)[number] };
        }
        if (ch === "inside") return { kind: "pointerInside", layer: call() };
        if (!(POINTER_CHANNELS as readonly string[]).includes(ch)) throw new BindingSyntaxError(`Unknown pointer channel "${ch}".`);
        return { kind: "pointer", channel: ch as (typeof POINTER_CHANNELS)[number] };
      }
      case "hover":
      case "press":
      case "focus":
        return { kind: "layerState", channel: head, layer: call() };
      case "proximity": {
        this.eatP("(");
        const layer = this.ref();
        let measure: "edge" | "center" | undefined;
        if (this.isP(",")) {
          this.i++;
          const m = this.eatId();
          if (m !== "edge" && m !== "center") throw new BindingSyntaxError(`proximity measures "edge" or "center", not "${m}".`);
          measure = m;
        }
        this.eatP(")");
        return measure ? { kind: "proximity", layer, measure } : { kind: "proximity", layer };
      }
      case "scroll": {
        this.eatP(".");
        const ch = this.eatId();
        if (!["y", "progress", "velocity", "direction"].includes(ch)) throw new BindingSyntaxError(`Unknown scroll channel "${ch}".`);
        return { kind: "scroll", channel: ch as "y" };
      }
      case "view": {
        const layer = call();
        this.eatP(".");
        const ch = this.eatId();
        if (ch !== "progress" && ch !== "visible") throw new BindingSyntaxError(`Unknown view channel "${ch}".`);
        return { kind: "view", layer, channel: ch };
      }
      case "time":
        return { kind: "time" };
      case "frame":
        this.eatP(".");
        this.eatId("dt");
        return { kind: "frameDt" };
      case "audio": {
        const layer = call();
        this.eatP(".");
        const ch = this.eatId();
        if (ch === "band") {
          this.eatP("(");
          const band = this.num();
          this.eatP(")");
          return { kind: "audio", layer, channel: "band", band };
        }
        if (ch !== "level" && ch !== "beat") throw new BindingSyntaxError(`Unknown audio channel "${ch}".`);
        return { kind: "audio", layer, channel: ch };
      }
      case "device": {
        this.eatP(".");
        const ch = this.eatId();
        if (!["tiltX", "tiltY", "orientation"].includes(ch)) throw new BindingSyntaxError(`Unknown device channel "${ch}".`);
        return { kind: "device", channel: ch as "tiltX" };
      }
      case "state":
        return { kind: "state", name: call() };
      case "sm":
        return { kind: "sm", input: call() };
      case "prop":
        return { kind: "prop", name: call() };
      case "var":
        return { kind: "var", name: call() };
      case "seed":
        return { kind: "seed" };
    }
    throw new BindingSyntaxError(`Unknown signal "${head}".`);
  }

  args(): (number | string | SignalExpr)[] {
    // Positional args: numbers, bare words, or nested signal expressions.
    const out: (number | string | SignalExpr)[] = [];
    if (!this.isP("(")) return out;
    this.eatP("(");
    while (!this.isP(")")) {
      const t = this.peek();
      if (t?.t === "num" && (this.isP(",", 1) || this.isP(")", 1))) {
        this.i++;
        out.push(t.v);
      } else if (t?.t === "id" && (this.isP(",", 1) || this.isP(")", 1)) && !["time", "seed"].includes(t.v)) {
        this.i++;
        out.push(t.v);
      } else {
        out.push(this.expr());
      }
      if (!this.isP(")")) this.eatP(",");
    }
    this.eatP(")");
    return out;
  }

  operator(): Operator {
    const name = this.eatId();
    if (name === "spring") return { op: "spring", spring: this.springArgs() };
    if (name === "curve") return { op: "curve", easing: this.rawArgument() };
    const a = this.args();
    const n = (i: number): number => {
      if (typeof a[i] !== "number") throw new BindingSyntaxError(`${name}: argument ${i + 1} must be a number.`);
      return a[i] as number;
    };
    const w = (i: number): string => {
      if (typeof a[i] !== "string") throw new BindingSyntaxError(`${name}: argument ${i + 1} must be a name.`);
      return a[i] as string;
    };
    const e = (i: number): SignalExpr => {
      const v = a[i];
      if (typeof v === "number") return { signal: { kind: "constant", value: v }, operators: [] };
      if (typeof v === "string" || v === undefined) throw new BindingSyntaxError(`${name}: argument ${i + 1} must be a signal.`);
      return v;
    };
    const arity = (min: number, max = min) => {
      if (a.length < min || a.length > max) throw new BindingSyntaxError(`${name} takes ${min === max ? min : `${min}–${max}`} argument(s), got ${a.length}.`);
    };
    switch (name) {
      case "smooth":
        arity(1);
        return { op: "smooth", tau: n(0) };
      case "remap":
        arity(4, 5);
        if (a.length === 5 && w(4) !== "clamp") throw new BindingSyntaxError(`remap's 5th argument is "clamp".`);
        return { op: "remap", inMin: n(0), inMax: n(1), outMin: n(2), outMax: n(3), ...(a.length === 5 ? { clamp: true } : {}) };
      case "clamp":
        arity(2);
        return { op: "clamp", min: n(0), max: n(1) };
      case "deadzone":
        arity(1);
        return { op: "deadzone", radius: n(0) };
      case "falloff":
        arity(2);
        return { op: "falloff", shape: w(0) as "linear", radius: n(1) };
      case "noise":
        arity(3);
        return { op: "noise", frequency: n(0), amplitude: n(1), seed: n(2) };
      case "delay":
        arity(1);
        return { op: "delay", seconds: n(0) };
      case "trail":
        arity(1);
        return { op: "trail", samples: n(0) };
      case "accumulate":
        arity(1);
        return { op: "accumulate", decay: n(0) };
      case "threshold":
        arity(2);
        return { op: "threshold", on: n(0), off: n(1) };
      case "edge":
        arity(1);
        return { op: "edge", mode: w(0) as "rise" };
      case "sampleHold":
        arity(1);
        return { op: "sampleHold", trigger: e(0) };
      case "quantize":
        arity(1);
        return { op: "quantize", step: n(0) };
      case "mix":
        arity(2);
        return { op: "mix", with: e(0), t: n(1) };
      case "add":
      case "mul":
      case "min":
      case "max":
        arity(1);
        return { op: name, x: n(0) };
      case "rotate":
        arity(1);
        return { op: "rotate", degrees: n(0) };
      case "distance":
      case "angleTo":
        arity(1);
        return { op: name, to: e(0) };
      case "select":
        arity(2);
        return { op: "select", whenTrue: e(0), whenFalse: e(1) };
      case "component":
        arity(1);
        return { op: "component", axis: w(0) as "x" };
      case "velocity":
      case "toggle":
      case "abs":
      case "length":
      case "normalize":
        arity(0);
        return { op: name };
    }
    throw new BindingSyntaxError(`Unknown operator "${name}".`);
  }

  /** The text between balanced parentheses, re-spaced canonically (an easing such as `back.out(1.7)`). */
  rawArgument(): string {
    this.eatP("(");
    let depth = 0;
    let text = "";
    for (;;) {
      const t = this.peek();
      if (!t) throw new BindingSyntaxError("Unterminated curve(...).");
      if (t.t === "p" && t.v === ")" && depth === 0) break;
      this.i++;
      if (t.t === "p" && t.v === "(") depth++;
      if (t.t === "p" && t.v === ")") depth--;
      text += t.t === "p" && t.v === "," ? ", " : t.t === "p" && t.v === ":" ? ": " : String(t.v);
    }
    this.eatP(")");
    return text;
  }

  /** `spring(k, c[, m])` or `spring(bounce: b, time: t)` / `spring(stiffness: k, damping: c[, mass: m])`. */
  springArgs(): SpringConfig {
    this.eatP("(");
    if (this.isId() && this.isP(":", 1)) {
      const fields: Record<string, number> = {};
      while (!this.isP(")")) {
        const key = this.eatId();
        this.eatP(":");
        fields[key] = this.num();
        if (!this.isP(")")) this.eatP(",");
      }
      this.eatP(")");
      const parsed = SpringSchema.safeParse(fields);
      if (!parsed.success) throw new BindingSyntaxError(`Invalid spring: ${parsed.error.issues[0]?.message}`);
      return parsed.data;
    }
    const nums = [this.num()];
    while (this.isP(",")) {
      this.i++;
      nums.push(this.num());
    }
    this.eatP(")");
    if (nums.length < 2 || nums.length > 3) throw new BindingSyntaxError("spring takes (stiffness, damping[, mass]).");
    return nums.length === 3 ? { stiffness: nums[0], damping: nums[1], mass: nums[2] } : { stiffness: nums[0], damping: nums[1] };
  }

  // <Target>
  target(): BindingTarget {
    if (this.isId("event") && this.isP("(", 1)) {
      this.i++;
      this.eatP("(");
      const name = this.eatId();
      this.eatP(")");
      return { kind: "event", name };
    }
    let on: TargetSet;
    if (this.isId("tag") && this.isP(":", 1)) {
      this.i += 2;
      on = { kind: "tag", tag: this.eatId() };
    } else {
      const ref = this.ref();
      if (this.isP("[")) {
        this.eatP("[");
        this.eatP("*");
        this.eatP("]");
        on = { kind: "group", ref };
      } else on = { kind: "layer", ref };
    }
    this.eatP(".");
    const first = this.eatId();
    if (first === "position" && this.isP("(")) {
      this.eatP("(");
      const pin = this.eatId();
      let axis: "x" | "y" | undefined;
      if (this.isP(",")) {
        this.i++;
        const ax = this.eatId();
        if (ax !== "x" && ax !== "y") throw new BindingSyntaxError(`position axis is x or y, not "${ax}".`);
        axis = ax;
      }
      this.eatP(")");
      return axis ? { kind: "position", on, pin, axis } : { kind: "position", on, pin };
    }
    const segments = [first];
    while (this.isP(".")) {
      this.i++;
      segments.push(this.eatId());
    }
    if (segments.length === 2 && ["uniform", "param", "input", "cssvar"].includes(first)) {
      return { kind: first as "uniform", on, name: segments[1] };
    }
    return { kind: "property", on, path: segments.join(".") };
  }

  condition(): Condition {
    if (this.isId("state") && this.isP("(", 1)) {
      this.i++;
      this.eatP("(");
      const name = this.ref();
      this.eatP(")");
      return { kind: "state", name };
    }
    if (this.isId("pointer") && this.isP(".", 1) && this.isId("coarse", 2) && (this.isP("=", 3) || this.isP("!=", 3))) {
      this.i += 3;
      const neg = this.isP("!=");
      this.i++;
      return { kind: "pointerCoarse", equals: this.bool() !== neg };
    }
    if (this.isId("breakpoint") && (this.isP("=", 1) || this.isP("!=", 1))) {
      this.i++;
      const negate = this.isP("!=");
      this.i++;
      return { kind: "breakpoint", name: this.eatId(), negate };
    }
    if (this.isId("reducedMotion") && (this.isP("=", 1) || this.isP("!=", 1))) {
      this.i++;
      const neg = this.isP("!=");
      this.i++;
      return { kind: "reducedMotion", equals: this.bool() !== neg };
    }
    const expr = this.expr();
    const t = this.peek();
    if (t?.t !== "p" || ![">", "<", ">=", "<="].includes(t.v)) throw new BindingSyntaxError(`Expected a comparison after the signal, found ${this.describe()}.`);
    this.i++;
    return { kind: "compare", expr, cmp: t.v as ">", value: this.num() };
  }
}

/** Parses the binding text form (engine spec §3.3). Throws `BindingSyntaxError` with a readable message. */
export function parseBinding(text: string): BindingDraft {
  const p = new Parser(tokenize(text));
  const expr = p.expr();
  p.eatP("->");
  const target = p.target();
  const draft: BindingDraft = { expr, target };
  if (p.isId("blend")) {
    p.eatId();
    const mode = p.eatId();
    if (!(BLEND_MODES as readonly string[]).includes(mode)) throw new BindingSyntaxError(`Unknown blend "${mode}".`);
    draft.blend = mode as BlendMode;
  }
  if (p.isId("when")) {
    p.eatId();
    const conditions = [p.condition()];
    const joins: ("and" | "or")[] = [];
    while (p.isId("and") || p.isId("or")) {
      joins.push(p.eatId() as "and" | "or");
      conditions.push(p.condition());
    }
    draft.guard = { conditions, joins };
  }
  if (p.isP("@")) {
    p.eatP("@");
    draft.priority = p.num();
  }
  if (!p.done()) throw new BindingSyntaxError(`Unexpected ${p.describe()} after the binding.`);
  const checked = BindingDraftSchema.safeParse(draft);
  if (!checked.success) {
    const issue = checked.error.issues[0];
    throw new BindingSyntaxError(`${issue?.path.join(".") || "binding"}: ${issue?.message}`);
  }
  return checked.data;
}

// ---------------------------------------------------------------------------
// Formatting (the inverse of parseBinding)
// ---------------------------------------------------------------------------

const fmtNum = (n: number) => String(n);
const fmtRef = (r: string) => (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(r) ? r : `"${r}"`);

export function formatSignal(s: Signal): string {
  switch (s.kind) {
    case "pointer":
      return `pointer.${s.channel}`;
    case "pointerIn":
      return `pointer.${s.channel}(${s.space})`;
    case "pointerInside":
      return `pointer.inside(${fmtRef(s.layer)})`;
    case "layerState":
      return `${s.channel}(${fmtRef(s.layer)})`;
    case "proximity":
      return `proximity(${fmtRef(s.layer)}${s.measure ? `, ${s.measure}` : ""})`;
    case "scroll":
      return `scroll.${s.channel}`;
    case "view":
      return `view(${fmtRef(s.layer)}).${s.channel}`;
    case "time":
      return "time";
    case "frameDt":
      return "frame.dt";
    case "audio":
      return `audio(${fmtRef(s.layer)}).${s.channel === "band" ? `band(${s.band ?? 0})` : s.channel}`;
    case "device":
      return `device.${s.channel}`;
    case "state":
      return `state(${fmtRef(s.name)})`;
    case "sm":
      return `sm(${s.input})`;
    case "prop":
      return `prop(${s.name})`;
    case "var":
      return `var(${s.name})`;
    case "seed":
      return "seed";
    case "constant":
      return fmtNum(s.value);
  }
}

function formatSpring(s: SpringConfig): string {
  if ("bounce" in s) return `spring(bounce: ${s.bounce}, time: ${s.time})`;
  return `spring(${s.stiffness}, ${s.damping}${s.mass !== undefined ? `, ${s.mass}` : ""})`;
}

export function formatOperator(o: Operator): string {
  switch (o.op) {
    case "smooth":
      return `smooth(${o.tau})`;
    case "spring":
      return formatSpring(o.spring);
    case "remap":
      return `remap(${o.inMin}, ${o.inMax}, ${o.outMin}, ${o.outMax}${o.clamp ? ", clamp" : ""})`;
    case "clamp":
      return `clamp(${o.min}, ${o.max})`;
    case "curve":
      return `curve(${o.easing})`;
    case "deadzone":
      return `deadzone(${o.radius})`;
    case "falloff":
      return `falloff(${o.shape}, ${o.radius})`;
    case "noise":
      return `noise(${o.frequency}, ${o.amplitude}, ${o.seed})`;
    case "delay":
      return `delay(${o.seconds})`;
    case "trail":
      return `trail(${o.samples})`;
    case "accumulate":
      return `accumulate(${o.decay})`;
    case "threshold":
      return `threshold(${o.on}, ${o.off})`;
    case "edge":
      return `edge(${o.mode})`;
    case "sampleHold":
      return `sampleHold(${formatExpr(o.trigger)})`;
    case "quantize":
      return `quantize(${o.step})`;
    case "mix":
      return `mix(${formatExpr(o.with)}, ${o.t})`;
    case "add":
    case "mul":
    case "min":
    case "max":
      return `${o.op}(${o.x})`;
    case "rotate":
      return `rotate(${o.degrees})`;
    case "distance":
    case "angleTo":
      return `${o.op}(${formatExpr(o.to)})`;
    case "select":
      return `select(${formatExpr(o.whenTrue)}, ${formatExpr(o.whenFalse)})`;
    case "component":
      return `component(${o.axis})`;
    case "velocity":
    case "toggle":
    case "abs":
    case "length":
    case "normalize":
      return o.op;
  }
}

export function formatExpr(e: SignalExpr): string {
  return [formatSignal(e.signal), ...e.operators.map(formatOperator)].join(" |> ");
}

function formatTargetSet(on: TargetSet): string {
  if (on.kind === "tag") return `tag:${on.tag}`;
  return on.kind === "group" ? `${fmtRef(on.ref)}[*]` : fmtRef(on.ref);
}

export function formatTarget(t: BindingTarget): string {
  switch (t.kind) {
    case "event":
      return `event(${t.name})`;
    case "property":
      return `${formatTargetSet(t.on)}.${t.path}`;
    case "position":
      return `${formatTargetSet(t.on)}.position(${t.pin}${t.axis ? `, ${t.axis}` : ""})`;
    default:
      return `${formatTargetSet(t.on)}.${t.kind}.${t.name}`;
  }
}

function formatCondition(c: Condition): string {
  switch (c.kind) {
    case "state":
      return `state(${fmtRef(c.name)})`;
    case "pointerCoarse":
      return `pointer.coarse = ${c.equals}`;
    case "breakpoint":
      return `breakpoint ${c.negate ? "!=" : "="} ${c.name}`;
    case "reducedMotion":
      return `reducedMotion = ${c.equals}`;
    case "compare":
      return `${formatExpr(c.expr)} ${c.cmp} ${c.value}`;
  }
}

/** The canonical text form of a binding; `parseBinding(formatBinding(b))` equals `b`'s draft. */
export function formatBinding(b: BindingDraft): string {
  let s = `${formatExpr(b.expr)} -> ${formatTarget(b.target)}`;
  if (b.blend) s += ` blend ${b.blend}`;
  if (b.guard) {
    s += " when " + b.guard.conditions.map((c, i) => (i === 0 ? "" : `${b.guard!.joins[i - 1]} `) + formatCondition(c)).join(" ");
  }
  if (b.priority !== undefined) s += ` @ ${b.priority}`;
  return s;
}

/**
 * Replaces layer names in a parsed binding with ids (the text form lets
 * authors write `cta` or `"Cursor Circle"`). Unknown names are left as they
 * are, so validation reports them.
 */
export function resolveLayerRefs(draft: BindingDraft, idForName: (name: string) => string | undefined): BindingDraft {
  const r = (ref: string) => (ref === "self" || ref === "parent" ? ref : idForName(ref) ?? ref);
  const expr = (e: SignalExpr): SignalExpr => ({
    signal: "layer" in e.signal ? { ...e.signal, layer: r(e.signal.layer) } : e.signal,
    operators: e.operators.map((op) => {
      if (op.op === "sampleHold") return { ...op, trigger: expr(op.trigger) };
      if (op.op === "mix") return { ...op, with: expr(op.with) };
      if (op.op === "distance" || op.op === "angleTo") return { ...op, to: expr(op.to) };
      if (op.op === "select") return { ...op, whenTrue: expr(op.whenTrue), whenFalse: expr(op.whenFalse) };
      return op;
    }),
  });
  const target = "on" in draft.target && draft.target.on.kind !== "tag" ? { ...draft.target, on: { ...draft.target.on, ref: r(draft.target.on.ref) } } : draft.target;
  const guard = draft.guard
    ? { ...draft.guard, conditions: draft.guard.conditions.map((c) => (c.kind === "compare" ? { ...c, expr: expr(c.expr) } : c)) }
    : undefined;
  return { ...draft, expr: expr(draft.expr), target: target as BindingTarget, ...(guard ? { guard } : {}) };
}
