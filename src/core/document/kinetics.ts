/**
 * ============================================================================
 * KINETIC COMPOSITION TYPES (MDM, ROADMAP Phase 7.5 v3.2 — types only)
 * ============================================================================
 * Track K's building blocks, so Phases 88–91 extend the schema instead of
 * migrating it (engine spec §8.6, grammar §14):
 *
 *   - `render.role` (content | helper) is a registry property (properties.ts);
 *   - pins: named points in layer-local space, on `Layer.pins`;
 *   - tags: free-form labels, on `Layer.tags`;
 *   - components attached to a layer: Follow, Field, Effector, Collider, Body;
 *   - generators: Split (text → letter/word/line pieces) and Clone groups,
 *     with per-piece `index`, `lineIndex`, `wordIndex`, `char`, `u`, `v`,
 *     `home`, `random` and overrides keyed by index and character. `count`
 *     is the number of pieces and isn't stored.
 *
 * Runtimes: helpers and follow (88), split/clone (89), fields and effectors
 * (90), colliders and bodies (91).
 * ============================================================================
 */

import { z } from "zod";
import { EasingSchema, LagSchema, SpringSchema, TouchBehaviourSchema, POINTER_SPACES, PropValueSchema } from "./motion";
import { BLEND_MODES, PIN_PRESETS, PinNameSchema, TargetSetSchema, LayerRefSchema } from "./signals";

const Id = z.string().min(1);
const Finite = z.number().refine(Number.isFinite, "Must be a finite number.");
const Vec2 = z.tuple([Finite, Finite]);
const Px = z.number().min(0);

// ---------------------------------------------------------------------------
// Pins and tags (on the layer)
// ---------------------------------------------------------------------------

/** A custom pin in layer-local space; may lie outside the box (an offset follow). */
export const PinSchema = z.strictObject({
  x: Finite,
  y: Finite,
  unit: z.enum(["px", "%"]),
});
export type Pin = z.infer<typeof PinSchema>;

/** Custom pins by name. The presets (PIN_PRESETS) always exist and can't be redefined. */
export const PinsSchema = z
  .record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), PinSchema)
  .refine((pins) => !Object.keys(pins).some((k) => (PIN_PRESETS as readonly string[]).includes(k)), "Custom pins can't reuse a preset pin name.");

export const TagSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/, "Tags are identifiers (letters, digits, _ and -).");

/** Layer-local position of a preset pin in a `width × height` box. */
export function presetPinPosition(pin: (typeof PIN_PRESETS)[number], width: number, height: number): [number, number] {
  const x = pin.includes("Left") || pin === "left" ? 0 : pin.includes("Right") || pin === "right" ? width : width / 2;
  const y = pin.startsWith("top") ? 0 : pin.startsWith("bottom") ? height : height / 2;
  return [x, y];
}

// ---------------------------------------------------------------------------
// Components (attachments on a layer)
// ---------------------------------------------------------------------------

const component = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.strictObject({ id: Id, layerId: Id, type: z.literal(type), enabled: z.boolean(), ...shape });

/** Follow (engine spec §8.6.3): which point of this layer follows what, and how. */
export const FollowSchema = component("follow", {
  target: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("pointer"), space: z.enum(POINTER_SPACES) }),
    z.strictObject({ kind: z.literal("pin"), layer: LayerRefSchema, pin: PinNameSchema }),
    z.strictObject({ kind: z.literal("path"), layer: LayerRefSchema, speed: z.number().gt(0).describe("px/s along the path.") }),
  ]),
  /** The point of *this* layer that sits on the target. */
  pin: PinNameSchema,
  offset: Vec2.describe("px, in frame space."),
  lag: LagSchema,
  axis: z.enum(["x", "y", "both"]),
  bounds: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("none") }),
    z.strictObject({ kind: z.literal("parent") }),
    z.strictObject({ kind: z.literal("rect"), x: Finite, y: Finite, width: Px, height: Px }),
  ]),
  onLeave: z.enum(["stay", "home", "fade"]),
  rotation: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("none") }),
    z.strictObject({ kind: z.literal("face") }),
    z.strictObject({ kind: z.literal("lean"), maxAngle: z.number().gt(0).max(90) }),
  ]),
  scale: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("constant") }),
    z.strictObject({ kind: z.literal("bySpeed"), min: z.number().gt(0), max: z.number().gt(0) }),
  ]),
  /** Required: pointer-driven kinetics declare a touch behaviour (grammar 6.22). */
  touch: TouchBehaviourSchema,
  reducedMotion: z.enum(["snap", "off"]),
});

export const FIELD_SHAPES = ["circle", "box", "capsule", "layer", "pathStroke", "linear", "noise"] as const;

/** Field (engine spec §8.6.5): a falloff shape giving every point a weight 0–1. */
export const FieldSchema = component("field", {
  /** `layer` uses the layer's own shape: an ellipse gives a circle/ellipse, a rectangle a box. */
  shape: z.enum(FIELD_SHAPES),
  /** px from the shape: full weight inside `inner`, zero beyond `outer`. `inner = outer` is a hard edge. */
  inner: Px,
  outer: Px,
  falloff: z.union([z.enum(["hard", "linear", "smoothstep", "inverse-square"]), z.strictObject({ curve: EasingSchema })]),
});

/** What an effector does with each target's weight (engine spec §8.6.5). */
export const EffectorEffectSchema = z.discriminatedUnion("kind", [
  /** Hard constraint (grammar 6.23): never inside the field's inner shape at a rendered frame. */
  z.strictObject({ kind: z.literal("keepOut"), margin: Px }),
  z.strictObject({ kind: z.literal("push"), distance: Px }),
  z.strictObject({ kind: z.literal("attract"), distance: Px }),
  z.strictObject({ kind: z.literal("swirl"), degrees: Finite }),
  z.strictObject({
    kind: z.literal("transform"),
    scale: z.number().gt(0).optional(),
    rotate: Finite.optional(),
    x: Finite.optional(),
    y: Finite.optional(),
  }),
  z.strictObject({
    kind: z.literal("style"),
    opacity: z.number().min(0).max(1).optional(),
    blur: Px.optional(),
    color: z.string().min(1).optional(),
  }),
  z.strictObject({ kind: z.literal("lookAt"), offsetAngle: Finite }),
  /** Seeded per-target randomness (uses each target's `random`). */
  z.strictObject({ kind: z.literal("jitter"), rotate: Finite, x: Finite, y: Finite }),
  /** Weight → curve → any animatable property. */
  z.strictObject({ kind: z.literal("custom"), property: z.string().min(1), curve: EasingSchema, from: PropValueSchema, to: PropValueSchema }),
]);

/** Effector: needs a Field on the same layer (grammar 14.4). */
export const EffectorSchema = component("effector", {
  targets: TargetSetSchema,
  effect: EffectorEffectSchema,
  strength: z.number().min(0).max(2),
  /** How targets ease out and spring back home (a perceptual spring by default, Law 17). */
  smoothing: SpringSchema,
  blend: z.enum(BLEND_MODES),
  /** Stacking order among this layer's effectors (lower runs first). */
  order: z.number().int(),
  stayInside: z.enum(["none", "parent", "frame"]),
});

/** Collider (engine spec §8.6.6). */
export const ColliderSchema = component("collider", {
  /** `auto` derives from geometry: ellipse → circle, text piece → box, path → convex polygon. */
  shape: z.enum(["auto", "circle", "box", "roundedBox", "capsule", "polygon"]),
  padding: Finite,
  mode: z.enum(["trigger", "solid"]),
  layer: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).describe("Collision layer name."),
  mask: z.array(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/)).describe("Collision layers this collider interacts with (grammar 6.20)."),
});

/** Body (engine spec §8.6.6). */
export const BodySchema = component("body", {
  body: z.enum(["static", "kinematic", "dynamic"]),
  mass: z.number().gt(0),
  damping: z.number().min(0),
  bounciness: z.number().min(0).max(1),
  friction: z.number().min(0),
  gravityScale: Finite,
  /** Pulls the body back to its home (grammar 6.18: moved text pieces need one). */
  homeSpring: SpringSchema.optional(),
  maxOffset: Px.optional(),
  rotation: z.boolean(),
  sleep: z.boolean(),
  /** Draggable bodies (91.2): kinematic while dragged, then dynamic with the throw velocity. */
  draggable: z
    .strictObject({ throw: z.boolean(), snapPoints: z.array(Vec2).optional(), bounds: z.enum(["none", "parent", "frame"]) })
    .optional(),
});

export const ComponentSchema = z.discriminatedUnion("type", [FollowSchema, FieldSchema, EffectorSchema, ColliderSchema, BodySchema]);
export type Component = z.infer<typeof ComponentSchema>;
export type ComponentType = Component["type"];

/** Components a layer can carry more than one of. */
export const REPEATABLE_COMPONENTS: ReadonlySet<ComponentType> = new Set(["effector"]);

// ---------------------------------------------------------------------------
// Generators: Split and Clone groups
// ---------------------------------------------------------------------------

const Overrides = z.record(z.string(), z.record(z.string(), PropValueSchema));

const PieceBase = {
  layerId: Id,
  index: z.number().int().min(0),
  /** Rest position (where the piece was laid out), px in the group's space. */
  home: Vec2,
  /** Seeded 0–1 value, stable across reloads and exports. */
  random: z.number().min(0).max(1),
};

export const SplitGeneratorSchema = z.strictObject({
  id: Id,
  kind: z.literal("split"),
  /** The Split group layer (grammar 3.G.1); its children are exactly the pieces. */
  groupLayerId: Id,
  /** The text the pieces come from; stays editable unless `detached`. */
  sourceLayerId: Id,
  mode: z.enum(["letters", "words", "lines"]),
  detached: z.boolean(),
  pieces: z.array(
    z.strictObject({
      ...PieceBase,
      /** The grapheme (letters) or text (words, lines) of this piece. */
      char: z.string().min(1),
      wordIndex: z.number().int().min(0),
      lineIndex: z.number().int().min(0),
    })
  ),
  /** Props applied to pieces by index (`"0"`) and by character (`"A"`). Index wins. */
  overrides: z.strictObject({ byIndex: Overrides, byChar: Overrides }),
});

export const CloneLayoutSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("grid"), rows: z.number().int().min(1), cols: z.number().int().min(1), gap: Vec2 }),
  z.strictObject({ kind: z.literal("radial"), count: z.number().int().min(1), radius: Px, startAngle: Finite }),
  z.strictObject({ kind: z.literal("path"), pathLayerId: Id, count: z.number().int().min(1) }),
  z.strictObject({ kind: z.literal("scatter"), count: z.number().int().min(1), seed: z.number().int().min(0), bounds: z.enum(["parent", "frame"]) }),
  z.strictObject({ kind: z.literal("linear"), count: z.number().int().min(1), step: Vec2 }),
]);

export const CloneGeneratorSchema = z.strictObject({
  id: Id,
  kind: z.literal("clone"),
  groupLayerId: Id,
  /** The layer that is cloned; each clone follows its grammar. */
  sourceLayerId: Id,
  layout: CloneLayoutSchema,
  pieces: z.array(
    z.strictObject({
      ...PieceBase,
      /** Grid clones only: 0–1 coordinates. */
      u: z.number().min(0).max(1).optional(),
      v: z.number().min(0).max(1).optional(),
    })
  ),
  overrides: z.strictObject({ byIndex: Overrides }),
});

export const GeneratorSchema = z.discriminatedUnion("kind", [SplitGeneratorSchema, CloneGeneratorSchema]);
export type Generator = z.infer<typeof GeneratorSchema>;
export type SplitGenerator = z.infer<typeof SplitGeneratorSchema>;
export type CloneGenerator = z.infer<typeof CloneGeneratorSchema>;

/** Number of clones a layout produces. */
export function cloneCount(layout: z.infer<typeof CloneLayoutSchema>): number {
  return layout.kind === "grid" ? layout.rows * layout.cols : layout.count;
}

/** User-perceived characters (grapheme clusters), so "é" or an emoji is one letter. */
export function splitGraphemes(text: string): string[] {
  const Segmenter = (Intl as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  return Array.from(text);
}
