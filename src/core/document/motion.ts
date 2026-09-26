/**
 * ============================================================================
 * MOTION PRIMITIVES (MDM, ROADMAP Phase 7.2 – 7.3)
 * ============================================================================
 * The time-based and state-based building blocks of the Motion Document:
 *
 *   Easing ─┐
 *   Spring ─┴─► Keyframe ─► Track ─► Clip ─► Sequence          (7.2, time)
 *                                     └─ Stagger (first-class modifier)
 *   State ─► Transition (tween | spring, per-property overrides) (7.3, states)
 *   Trigger · Behaviour (typed params; each is a named binding preset, 7.5)
 *
 * Types and validation only: the evaluation kernel is Phase 9, the state
 * machine Phase 11, the behaviour runtime Phase 12. Units are seconds, px and
 * degrees (SCHEMA_REFERENCE §4). New entities use strict objects, so an
 * unknown key is a validation error rather than a silently kept escape hatch.
 * Decision record: DOCS/Initial/decisions/0004-motion-primitives.md.
 * ============================================================================
 */

import { z } from "zod";
import type { PropValue } from "./registry";

const Id = z.string().min(1);
const Seconds = z.number().min(0).describe("Seconds.");
const Finite = z.number().refine(Number.isFinite, "Must be a finite number.");

// ---------------------------------------------------------------------------
// Easing (7.2): one string grammar for every engine
// ---------------------------------------------------------------------------

/**
 * A parsed easing. The stored form stays a string (what GSAP, CSS and Motion
 * users type, and what the presets already use); `parseEasing` gives the
 * kernel (Phase 9.1) and the rules (Phase 8) its structure.
 */
export type Easing =
  | { kind: "linear" }
  | { kind: "named"; family: EasingFamily; direction: "in" | "out" | "inOut"; params: number[] }
  | { kind: "cubicBezier"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "steps"; count: number; position: "start" | "end" | "none" | "both" }
  | { kind: "spring"; spring: SpringConfig | null };

export const EASING_FAMILIES = [
  "power0", "power1", "power2", "power3", "power4",
  "quad", "cubic", "quart", "quint", "strong",
  "sine", "expo", "circ", "back", "elastic", "bounce",
] as const;
export type EasingFamily = (typeof EASING_FAMILIES)[number];

/** Families that take parameters: `back.out(1.7)` (overshoot), `elastic.out(1, 0.3)` (amplitude, period). */
const EASING_PARAM_COUNT: Partial<Record<EasingFamily, number>> = { back: 1, elastic: 2 };

/** CSS keywords and Motion names, as their GSAP-equivalent structure. */
const EASING_ALIASES: Record<string, Easing> = {
  linear: { kind: "linear" },
  none: { kind: "linear" },
  ease: { kind: "cubicBezier", x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  "ease-in": { kind: "cubicBezier", x1: 0.42, y1: 0, x2: 1, y2: 1 },
  "ease-out": { kind: "cubicBezier", x1: 0, y1: 0, x2: 0.58, y2: 1 },
  "ease-in-out": { kind: "cubicBezier", x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  "step-start": { kind: "steps", count: 1, position: "start" },
  "step-end": { kind: "steps", count: 1, position: "end" },
  easeIn: { kind: "cubicBezier", x1: 0.42, y1: 0, x2: 1, y2: 1 },
  easeOut: { kind: "cubicBezier", x1: 0, y1: 0, x2: 0.58, y2: 1 },
  easeInOut: { kind: "cubicBezier", x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  circIn: { kind: "named", family: "circ", direction: "in", params: [] },
  circOut: { kind: "named", family: "circ", direction: "out", params: [] },
  circInOut: { kind: "named", family: "circ", direction: "inOut", params: [] },
  backIn: { kind: "named", family: "back", direction: "in", params: [] },
  backOut: { kind: "named", family: "back", direction: "out", params: [] },
  backInOut: { kind: "named", family: "back", direction: "inOut", params: [] },
  anticipate: { kind: "named", family: "back", direction: "inOut", params: [] },
};

const NUMBER = String.raw`-?(?:\d+\.?\d*|\.\d+)`;
const NAMED_RE = new RegExp(String.raw`^(${EASING_FAMILIES.join("|")})(?:\.(in|out|inOut))?(?:\(\s*(${NUMBER}(?:\s*,\s*${NUMBER})*)?\s*\))?$`);
const BEZIER_RE = new RegExp(String.raw`^cubic-bezier\(\s*(${NUMBER})\s*,\s*(${NUMBER})\s*,\s*(${NUMBER})\s*,\s*(${NUMBER})\s*\)$`);
const STEPS_RE = /^steps\(\s*(\d+)\s*(?:,\s*(jump-start|jump-end|jump-none|jump-both|start|end)\s*)?\)$/;
const SPRING_RE = /^spring(?:\((.*)\))?$/;

/**
 * Parses an easing string, or returns null when it isn't one. Accepts:
 * `linear`/`none`; GSAP names (`power2.out`, `back.out(1.7)`, `elastic.out(1, 0.3)`);
 * CSS keywords, `cubic-bezier(…)` and `steps(n[, position])`; Motion names
 * (`easeOut`, `backOut`, `anticipate`); and springs: `spring`,
 * `spring(bounce: 0.3, time: 0.6)` (perceptual, Law 17) or
 * `spring(stiffness: 300, damping: 20[, mass: 1])`.
 */
export function parseEasing(input: string): Easing | null {
  const text = input.trim();
  if (Object.prototype.hasOwnProperty.call(EASING_ALIASES, text)) return EASING_ALIASES[text];

  const named = NAMED_RE.exec(text);
  if (named) {
    const family = named[1] as EasingFamily;
    const params = named[3] ? named[3].split(",").map((p) => Number(p.trim())) : [];
    if (params.length > (EASING_PARAM_COUNT[family] ?? 0)) return null;
    return { kind: "named", family, direction: (named[2] as "in" | "out" | "inOut" | undefined) ?? "out", params };
  }

  const bezier = BEZIER_RE.exec(text);
  if (bezier) {
    const [x1, y1, x2, y2] = bezier.slice(1, 5).map(Number);
    // CSS requires the x control points in [0, 1] so the curve stays a function of time.
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null;
    return { kind: "cubicBezier", x1, y1, x2, y2 };
  }

  const steps = STEPS_RE.exec(text);
  if (steps) {
    const count = Number(steps[1]);
    if (count < 1) return null;
    const raw = steps[2] ?? "end";
    const position = (raw.startsWith("jump-") ? raw.slice(5) : raw) as "start" | "end" | "none" | "both";
    if (position === "none" && count < 2) return null;
    return { kind: "steps", count, position };
  }

  const spring = SPRING_RE.exec(text);
  if (spring) {
    if (spring[1] === undefined) return { kind: "spring", spring: null };
    const fields: Record<string, number> = {};
    for (const part of spring[1].split(",")) {
      const m = /^\s*([a-zA-Z]+)\s*:\s*(-?(?:\d+\.?\d*|\.\d+))\s*$/.exec(part);
      if (!m || m[1] in fields) return null;
      fields[m[1]] = Number(m[2]);
    }
    const parsed = SpringSchema.safeParse(fields);
    return parsed.success ? { kind: "spring", spring: parsed.data } : null;
  }
  return null;
}

export function isEasing(input: unknown): input is string {
  return typeof input === "string" && parseEasing(input) !== null;
}

export const EasingSchema = z
  .string()
  .refine(isEasing, { message: "Not an easing. Use e.g. `power2.out`, `cubic-bezier(…)`, `steps(4)` or `spring(bounce: 0.3, time: 0.6)`." })
  .describe("Easing string (motion.ts `parseEasing`).");

// ---------------------------------------------------------------------------
// Springs (7.3; perceptual form per Law 17 and 9.1)
// ---------------------------------------------------------------------------

/**
 * Perceptual spring: what Simple mode shows ("Bounce" and "Time"). `bounce`
 * 0 = no overshoot … 1 = very bouncy; `time` = seconds to settle visually.
 * The kernel (9.1) maps it 1:1 to stiffness/damping, so switching is lossless.
 */
export const PerceptualSpringSchema = z.strictObject({
  bounce: z.number().min(0).max(1),
  time: z.number().gt(0).max(10),
});

/** Physical spring (Pro): stiffness k, damping c, mass m (default 1). */
export const PhysicalSpringSchema = z.strictObject({
  stiffness: z.number().gt(0),
  damping: z.number().min(0),
  mass: z.number().gt(0).optional(),
});

export const SpringSchema = z.union([PerceptualSpringSchema, PhysicalSpringSchema]);
export type SpringConfig = z.infer<typeof SpringSchema>;

/** How a value moves when it isn't keyframed: a tween or a spring (states, transitions, behaviours). */
export const MotionSpecSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("tween"),
    duration: Seconds,
    easing: EasingSchema,
    delay: Seconds.optional(),
  }),
  z.strictObject({
    type: z.literal("spring"),
    spring: SpringSchema,
    delay: Seconds.optional(),
  }),
]);
export type MotionSpec = z.infer<typeof MotionSpecSchema>;

// ---------------------------------------------------------------------------
// Keyframes, tracks (7.2)
// ---------------------------------------------------------------------------

/** Values any prop may hold; mirrors registry `PropValue`. */
export const PropValueSchema: z.ZodType<PropValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(PropValueSchema),
    z.record(z.string(), PropValueSchema),
  ])
);

export const KeyframeSchema = z.object({
  id: Id,
  time: z.number().min(0).describe("Seconds from the start of the clip."),
  value: PropValueSchema,
  ease: EasingSchema.optional().describe(
    "Easing of the segment that ends at this keyframe (the previous keyframe's ease-out). Ignored on the first keyframe."
  ),
  hold: z
    .boolean()
    .optional()
    .describe("Hold this value until the next keyframe (a step). Discrete properties always hold."),
});

export const TrackSchema = z
  .object({
    id: Id,
    property: z.string().min(1).describe("Canonical property path (properties.ts), e.g. `transform.y`."),
    muted: z.boolean().optional(),
    locked: z.boolean().optional(),
    keyframes: z.array(KeyframeSchema),
  })
  .superRefine((track, ctx) => {
    // Sorted by time. Two keyframes at one time are an instant jump: the later one holds from then on.
    for (let i = 1; i < track.keyframes.length; i++) {
      if (track.keyframes[i].time < track.keyframes[i - 1].time) {
        ctx.addIssue({ code: "custom", path: ["keyframes", i, "time"], message: "Keyframes must be sorted by time." });
      }
    }
  });

// ---------------------------------------------------------------------------
// Triggers (7.3)
// ---------------------------------------------------------------------------

/** What starts a clip or state change (PRD §4). Continuous input is a Binding (7.5), not a trigger. */
export const TRIGGERS = [
  "mount",
  "hover",
  "press",
  "focus",
  "inView",
  "scrollProgress",
  "pointerMove",
  "drag",
  "time",
  "custom",
] as const;
export const TriggerSchema = z.enum(TRIGGERS);
export type Trigger = z.infer<typeof TriggerSchema>;

/** A custom event name (`custom` triggers, graph `Emit`/`Custom`, binding `event(...)`). */
export const EventNameSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Event names are identifiers (letters, digits, _).");

// ---------------------------------------------------------------------------
// Stagger (7.2): a first-class modifier
// ---------------------------------------------------------------------------

export const STAGGER_ORIGINS = ["start", "end", "center", "edges", "random"] as const;

export const StaggerSchema = z
  .object({
    /** Seconds between consecutive targets. */
    each: z.number().min(0).optional(),
    /** Total seconds spread across all targets (GSAP `amount`). */
    amount: z.number().min(0).optional(),
    /** Where the wave starts, or an explicit order of target indices. */
    from: z.union([z.enum(STAGGER_ORIGINS), z.array(z.number().int().min(0)).min(1)]),
    /** 2D distribution: `[rows, cols]`, or `auto` from the targets' layout. */
    grid: z.union([z.tuple([z.number().int().min(1), z.number().int().min(1)]), z.literal("auto")]).optional(),
    axis: z.enum(["x", "y"]).optional(),
    /** Distributes the start times along a curve instead of evenly. */
    ease: EasingSchema.optional(),
    /** Seed for `from: "random"`, so the order is stable across reloads and exports. */
    seed: z.number().int().min(0).optional(),
    /**
     * What is staggered: the layer's children, the pieces of its split text or
     * Split group, or every layer with a tag. Default: split pieces when the
     * layer is split, else children.
     */
    targets: z.union([z.enum(["children", "split"]), z.strictObject({ tag: z.string().min(1) })]).optional(),
  })
  .superRefine((s, ctx) => {
    if ((s.each === undefined) === (s.amount === undefined)) {
      ctx.addIssue({ code: "custom", path: ["each"], message: "A stagger sets exactly one of `each` or `amount`." });
    }
    if (Array.isArray(s.from) && new Set(s.from).size !== s.from.length) {
      ctx.addIssue({ code: "custom", path: ["from"], message: "The index order lists a target twice." });
    }
    if (s.axis && !s.grid) ctx.addIssue({ code: "custom", path: ["axis"], message: "`axis` needs a `grid`." });
  });

// ---------------------------------------------------------------------------
// Clips and sequences (7.2)
// ---------------------------------------------------------------------------

/** The motion category a clip belongs to; drives presets and the Sequencer UI. */
export const CLIP_TYPES = ["entrance", "hover", "tap", "scroll", "loop", "morph"] as const;
export const ClipTypeSchema = z.enum(CLIP_TYPES);

export const ScrollTriggerSchema = z.object({
  start: z.string().optional().describe("e.g. `top 80%`"),
  end: z.string().optional().describe("e.g. `bottom 20%`"),
  scrub: z.union([z.boolean(), z.number()]).optional(),
  pin: z.boolean().optional(),
  markers: z.boolean().optional(),
});

export const PLAY_DIRECTIONS = ["normal", "reverse", "alternate", "alternate-reverse"] as const;

export const ClipSchema = z
  .object({
    id: Id,
    layerId: Id,
    name: z.string(),
    type: ClipTypeSchema,
    trigger: TriggerSchema,
    /** The event a `custom` trigger listens for. */
    event: EventNameSchema.optional(),
    duration: Seconds,
    delay: Seconds.optional(),
    easing: EasingSchema,
    repeat: z.number().int().min(-1).optional().describe("-1 loops forever."),
    repeatDelay: Seconds.optional(),
    direction: z.enum(PLAY_DIRECTIONS).optional().describe("Default `normal`; `alternate` ping-pongs on repeats."),
    enabled: z.boolean(),
    locked: z.boolean().optional(),
    scrollTrigger: ScrollTriggerSchema.optional(),
    stagger: StaggerSchema.optional(),
    tracks: z.array(TrackSchema),
  })
  .superRefine((clip, ctx) => {
    clip.tracks.forEach((track, t) =>
      track.keyframes.forEach((kf, k) => {
        if (kf.time > clip.duration + 1e-9) {
          ctx.addIssue({ code: "custom", path: ["tracks", t, "keyframes", k, "time"], message: `Keyframe at ${kf.time}s is after the clip's ${clip.duration}s duration.` });
        }
      })
    );
    if (clip.event !== undefined && clip.trigger !== "custom") {
      ctx.addIssue({ code: "custom", path: ["event"], message: "`event` is only used by `custom` triggers." });
    }
  });

/** Clips placed on one timeline with offsets (7.2). Placed in a composition by Phase 46. */
export const SequenceSchema = z.strictObject({
  id: Id,
  name: z.string().min(1),
  items: z
    .array(
      z.strictObject({
        id: Id,
        clipId: Id,
        /** Seconds from the start of the sequence. */
        offset: Seconds,
      })
    )
    .min(1),
  /** Offsets items further by their order: item i starts `each × i` later. */
  stagger: StaggerSchema.optional(),
  repeat: z.number().int().min(-1).optional(),
});

// ---------------------------------------------------------------------------
// States and transitions (7.3)
// ---------------------------------------------------------------------------

export const StateSchema = z.object({
  id: Id,
  layerId: Id,
  name: z.string().min(1).describe("e.g. `idle`, `hover`, `pressed`, `inView`."),
  props: z
    .record(z.string(), PropValueSchema)
    .describe("Props keyed by canonical property path (properties.ts); each must be legal for the layer's archetype."),
});

/** Smart-animate between two states of a layer (Figma-style), tween or spring, per-property overrides. */
export const TransitionSchema = z.strictObject({
  id: Id,
  layerId: Id,
  /** A state id of this layer, or `*` for any state. */
  from: z.union([Id, z.literal("*")]),
  to: Id,
  /** What fires it. Omitted: it runs whenever something (a rule, a state machine) sets `to`. */
  trigger: TriggerSchema.optional(),
  event: EventNameSchema.optional(),
  motion: MotionSpecSchema,
  overrides: z.array(z.strictObject({ property: z.string().min(1), motion: MotionSpecSchema })).optional(),
});

// ---------------------------------------------------------------------------
// Behaviours (7.3): typed continuous drivers
// ---------------------------------------------------------------------------

/**
 * How a follower lags behind its target (engine spec §8.6.3). `smooth.time`
 * is the smoothing time constant τ in seconds (Simple: "Smoothness").
 */
export const LagSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("none") }),
  z.strictObject({ type: z.literal("smooth"), time: z.number().gt(0).max(5) }),
  z.strictObject({ type: z.literal("spring"), spring: SpringSchema }),
]);
export type Lag = z.infer<typeof LagSchema>;

/** What a pointer-driven behaviour does on touch devices (grammar 6.11, 6.22). */
export const TOUCH_BEHAVIOURS = ["while-pressed", "tap", "drag", "autopilot", "gyro", "hide", "static"] as const;
export const TouchBehaviourSchema = z.enum(TOUCH_BEHAVIOURS);

/** What a behaviour does under `prefers-reduced-motion` (grammar 6.15). */
export const ReducedMotionBehaviourSchema = z.enum(["off", "snap", "calm", "freeze"]);

export const POINTER_SPACES = ["local", "parent", "frame", "page"] as const;
const Vec2 = z.tuple([Finite, Finite]);
const Path = z.string().min(1).describe("Canonical property path (properties.ts).");

/**
 * The behaviour catalogue (ROADMAP 7.3). Names are the PRD §4 names;
 * `shader-uniform` is the roadmap's `uniformDriver`. Each behaviour expands to
 * a named binding preset (`behaviourToBindings`, signals.ts), so there is one
 * reactive model underneath (7.5).
 */
export const BEHAVIOUR_TYPES = [
  "follow-pointer",
  "magnet",
  "tilt",
  "proximity",
  "spring-to",
  "inertia",
  "noise",
  "loop",
  "shader-uniform",
] as const;
export type BehaviourType = (typeof BEHAVIOUR_TYPES)[number];

const behaviour = <T extends BehaviourType, P extends z.ZodRawShape>(type: T, params: P) =>
  z.strictObject({
    id: Id,
    layerId: Id,
    type: z.literal(type),
    enabled: z.boolean(),
    params: z.strictObject(params),
  });

export const BehaviourSchema = z.discriminatedUnion("type", [
  /** The layer follows the pointer by its centre (pins and full Follow: 7.5 components). */
  behaviour("follow-pointer", {
    space: z.enum(POINTER_SPACES),
    lag: LagSchema,
    axis: z.enum(["x", "y", "both"]),
    touch: TouchBehaviourSchema,
    reducedMotion: ReducedMotionBehaviourSchema,
  }),
  /** Pulled toward the pointer while it is near, capped (grammar 6.12 target stability). */
  behaviour("magnet", {
    radius: z.number().gt(0).describe("px: how close the pointer must be."),
    maxOffset: z.number().gt(0).max(64).describe("px: the largest pull."),
    spring: SpringSchema,
    whileHovered: z.boolean(),
    touch: TouchBehaviourSchema,
  }),
  /** 3D tilt toward the pointer. */
  behaviour("tilt", {
    maxAngle: z.number().gt(0).max(45).describe("Degrees."),
    perspective: z.number().gt(0).describe("px."),
    spring: SpringSchema,
    glare: z.boolean(),
    touch: TouchBehaviourSchema,
  }),
  /** One property moves between two values by the pointer's distance (dock magnification, glows). */
  behaviour("proximity", {
    property: Path,
    near: PropValueSchema,
    far: PropValueSchema,
    radius: z.number().gt(0).describe("px: beyond this the value is `far`."),
    measure: z.enum(["edge", "center"]),
    falloff: z.enum(["linear", "smoothstep", "gaussian", "inverse-square"]),
    spring: SpringSchema.optional(),
    touch: TouchBehaviourSchema,
  }),
  /** Springs one property to a value whenever the value changes. */
  behaviour("spring-to", {
    property: Path,
    value: PropValueSchema,
    spring: SpringSchema,
  }),
  /** Keeps moving after a drag or flick is released, decaying to rest. */
  behaviour("inertia", {
    axis: z.enum(["x", "y", "both"]),
    decay: z.number().gt(0).max(10).describe("Seconds to come to rest."),
    bounds: z.enum(["none", "parent", "frame"]),
    snap: z.array(Vec2).optional().describe("Rest points in parent px."),
  }),
  /** Seeded organic wobble on one or more properties. */
  behaviour("noise", {
    targets: z.array(z.strictObject({ property: Path, amplitude: Finite })).min(1),
    frequency: z.number().gt(0).max(30).describe("Hz."),
    seed: z.number().int().min(0),
  }),
  /** A property cycles between two values forever (ambient motion). */
  behaviour("loop", {
    property: Path,
    from: PropValueSchema,
    to: PropValueSchema,
    duration: z.number().gt(0),
    easing: EasingSchema,
    yoyo: z.boolean(),
  }),
  /** Drives a shader uniform of this layer's surface from a signal source. */
  behaviour("shader-uniform", {
    uniform: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
    source: z.enum(["time", "scroll.progress", "pointer.x", "pointer.y", "pointer.speed"]),
    scale: Finite,
    offset: Finite,
  }),
]);

export type Keyframe = z.infer<typeof KeyframeSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type ClipType = z.infer<typeof ClipTypeSchema>;
export type ScrollTriggerConfig = z.infer<typeof ScrollTriggerSchema>;
export type StaggerConfig = z.infer<typeof StaggerSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type Sequence = z.infer<typeof SequenceSchema>;
export type LayerState = z.infer<typeof StateSchema>;
export type Transition = z.infer<typeof TransitionSchema>;
export type Behaviour = z.infer<typeof BehaviourSchema>;
export type TouchBehaviour = z.infer<typeof TouchBehaviourSchema>;
