/**
 * ============================================================================
 * EFFECT DEFINITION FORMAT (ROADMAP Phase 7.4 — types only)
 * ============================================================================
 * A library effect as versioned data (engine spec §11, PRD §5.3): typed props
 * the AI can read, an internal layer template, clips/states/behaviours,
 * surfaces with fallback chains, affordances and default bindings, engine
 * routing hints, a reduced-motion variant, a performance class, policies,
 * poster, export spec and provenance.
 *
 * Definitions live in the library (Phase 25 / 67), not in documents. A
 * document stores `EffectInstance`s (effects.ts): `{ effectId, version,
 * propOverrides, bindingOverrides, seed }`, checked against the definition by
 * `validateEffectInstance`.
 * ============================================================================
 */

import { z } from "zod";
import { PropValueSchema, ReducedMotionBehaviourSchema, TouchBehaviourSchema } from "./motion";
import { SEMVER, SurfaceSchema, type EffectInstance } from "./effects";
import { parseBinding, BindingSyntaxError } from "./signals";
import { BehaviourSchema, ClipSchema, StateSchema } from "./motion";
import { LayerSchema, createEmptyDocument, validateMotionDocument } from "./schema";
import type { PropValue } from "./registry";

const Ident = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Must be an identifier (letters, digits, _).");
const Finite = z.number().refine(Number.isFinite, "Must be a finite number.");

export const EFFECT_CATEGORIES = [
  "text", "interaction", "svg", "components", "backgrounds", "3d",
  "interactive-backgrounds", "cursor", "distortion",
] as const;

/** Affordances (engine spec §9): the reactions the Reactivity card can offer. */
export const AFFORDANCES = [
  "follow", "bend", "repel", "attract", "ripple", "glow", "tilt", "parallax", "speed-up", "calm-down",
  "burst", "trail", "reveal", "distort", "magnetize", "scatter",
] as const;

/** PRD §5.3 item 2. */
export const BEHAVIOUR_KINDS = ["timeline", "state", "reactive", "physics", "procedural", "shader"] as const;

const propSpec = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.strictObject({
    type: z.literal(type),
    /** One line the AI and the inspector read (PRD §5.3 item 1). */
    description: z.string().min(3),
    /** Shown in Simple mode (at most 7 per effect, Law 6). */
    simple: z.boolean().optional(),
    ...shape,
  });

export const EffectPropSpecSchema = z.discriminatedUnion("type", [
  propSpec("number", { default: Finite, min: Finite.optional(), max: Finite.optional(), unit: z.enum(["px", "deg", "s", "%"]).optional() }),
  propSpec("color", { default: z.string().min(1) }),
  propSpec("colorList", { default: z.array(z.string().min(1)).min(1) }),
  propSpec("boolean", { default: z.boolean() }),
  propSpec("enum", { options: z.array(z.string().min(1)).min(2), default: z.string() }),
  propSpec("string", { default: z.string() }),
  propSpec("vector2", { default: z.tuple([Finite, Finite]) }),
]);
export type EffectPropSpec = z.infer<typeof EffectPropSpecSchema>;

/** The internal layers an effect places inside its host layer, with their motion. */
export const EffectTemplateSchema = z.strictObject({
  rootLayerId: z.string().min(1),
  layers: z.record(z.string().min(1), LayerSchema),
  clips: z.array(ClipSchema).optional(),
  states: z.array(StateSchema).optional(),
  behaviours: z.array(BehaviourSchema).optional(),
});

export const EffectDefinitionSchema = z
  .strictObject({
    schema: z.literal("lazylayout.effect/1"),
    id: z.string().regex(/^fx_[a-z0-9_]+$/, "Effect ids look like `fx_aurora_veil`."),
    version: z.string().regex(SEMVER, "Versions are semver (`1.0.0`)."),
    name: z.string().min(1),
    category: z.enum(EFFECT_CATEGORIES),
    behaviourKinds: z.array(z.enum(BEHAVIOUR_KINDS)).min(1),
    provenance: z.strictObject({ inspiration: z.string().min(1), original: z.boolean(), notes: z.string().optional() }),
    props: z.record(Ident, EffectPropSpecSchema),
    template: EffectTemplateSchema,
    surfaces: z.array(SurfaceSchema),
    affordances: z.array(z.enum(AFFORDANCES)),
    /** Keyed so instances can override one binding. Text form (signals.ts), layer refs by template layer name. */
    defaultBindings: z.record(Ident, z.string().min(1)),
    /** Named prop snapshots (engine spec §9), e.g. `Calm`, `Excited`. */
    states: z.record(Ident, z.record(Ident, PropValueSchema)),
    routing: z.strictObject({
      engine: z.enum(["css", "waapi", "motion", "gsap", "svg", "canvas2d", "webgl2", "three"]),
      fallbacks: z.array(z.enum(["css", "waapi", "motion", "gsap", "svg", "canvas2d", "webgl2", "three"])),
    }),
    performance: z.strictObject({
      class: z.enum(["css", "dom", "svg", "canvas", "gpu"]),
      budgetMsPerFrame: z.number().gt(0),
      at: z.literal("1080p"),
    }),
    policies: z.strictObject({
      touch: TouchBehaviourSchema,
      reducedMotion: z.strictObject({
        mode: ReducedMotionBehaviourSchema,
        at: z.number().min(0).optional(),
        /** The reduced-motion variant (PRD §5.3 item 4): prop values used under reduced motion. */
        propOverrides: z.record(Ident, PropValueSchema).optional(),
      }),
      pauseControl: z.enum(["auto", "always", "never"]),
    }),
    poster: z.strictObject({ at: z.number().min(0) }),
    export: z.strictObject({ runtime: z.array(Ident), sizeBudgetKb: z.number().gt(0) }),
  })
  .superRefine((def, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

    for (const [name, spec] of Object.entries(def.props)) {
      const problem = propValueProblem(spec, spec.default);
      if (problem) issue(["props", name, "default"], problem);
      if (spec.type === "number" && spec.min !== undefined && spec.max !== undefined && spec.min > spec.max) issue(["props", name], "min must be ≤ max.");
    }
    if (Object.values(def.props).filter((p) => p.simple).length > 7) issue(["props"], "At most 7 props can be Simple (Law 6).");

    for (const [state, values] of Object.entries(def.states)) {
      for (const [prop, value] of Object.entries(values)) {
        const spec = def.props[prop];
        if (!spec) issue(["states", state, prop], `"${prop}" is not a prop of this effect.`);
        else {
          const problem = propValueProblem(spec, value);
          if (problem) issue(["states", state, prop], problem);
        }
      }
    }
    for (const [prop, value] of Object.entries(def.policies.reducedMotion.propOverrides ?? {})) {
      const spec = def.props[prop];
      if (!spec) issue(["policies", "reducedMotion", "propOverrides", prop], `"${prop}" is not a prop of this effect.`);
      else {
        const problem = propValueProblem(spec, value);
        if (problem) issue(["policies", "reducedMotion", "propOverrides", prop], problem);
      }
    }

    for (const [key, text] of Object.entries(def.defaultBindings)) {
      try {
        parseBinding(text);
      } catch (e) {
        issue(["defaultBindings", key], e instanceof BindingSyntaxError ? e.message : String(e));
      }
    }

    // The template is a valid document fragment: tree links, canonical props, owned clips/states/behaviours.
    const t = def.template;
    if (!t.layers[t.rootLayerId]) issue(["template", "rootLayerId"], `Root layer "${t.rootLayerId}" is not in the template.`);
    const doc = createEmptyDocument();
    doc.layers = t.layers;
    for (const c of t.clips ?? []) doc.clips[c.id] = c;
    for (const s of t.states ?? []) doc.states[s.id] = s;
    for (const b of t.behaviours ?? []) doc.behaviours[b.id] = b;
    for (const s of def.surfaces) doc.surfaces[s.id] = s;
    const check = validateMotionDocument(doc);
    if (!check.ok) for (const i of check.issues) issue(["template", ...i.path.split(".")], i.message);
  });
export type EffectDefinition = z.infer<typeof EffectDefinitionSchema>;

/** Why `value` isn't a valid value of a prop spec, or null. */
export function propValueProblem(spec: EffectPropSpec, value: PropValue): string | null {
  switch (spec.type) {
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return "must be a number";
      if (spec.min !== undefined && value < spec.min) return `must be at least ${spec.min}`;
      if (spec.max !== undefined && value > spec.max) return `must be at most ${spec.max}`;
      return null;
    case "color":
    case "string":
      return typeof value === "string" ? null : "must be text";
    case "colorList":
      return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string") ? null : "must be a list of colours";
    case "boolean":
      return typeof value === "boolean" ? null : "must be true or false";
    case "enum":
      return typeof value === "string" && spec.options.includes(value) ? null : `must be one of ${spec.options.join(", ")}`;
    case "vector2":
      return Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number") ? null : "must be [x, y]";
  }
}

/** Checks an instance's version, overrides and bindings against its definition. */
export function validateEffectInstance(instance: EffectInstance, def: EffectDefinition): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (instance.effectId !== def.id) issues.push({ path: "effectId", message: `Instance is of "${instance.effectId}", not "${def.id}".` });
  if (instance.version.split(".")[0] !== def.version.split(".")[0]) {
    issues.push({ path: "version", message: `Instance needs ${instance.version}; the library has ${def.version} (a different major version needs a migration, Phase 67.2).` });
  }
  for (const [prop, value] of Object.entries(instance.propOverrides)) {
    const spec = def.props[prop];
    const problem = spec ? propValueProblem(spec, value) : `"${prop}" is not a prop of ${def.id}`;
    if (problem) issues.push({ path: `propOverrides.${prop}`, message: problem });
  }
  for (const key of Object.keys(instance.bindingOverrides)) {
    if (!(key in def.defaultBindings)) issues.push({ path: `bindingOverrides.${key}`, message: `${def.id} has no binding "${key}".` });
  }
  return issues;
}
