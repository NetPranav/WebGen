/**
 * ============================================================================
 * MOTION DOCUMENT MODEL (MDM v2): SCHEMA
 * ============================================================================
 * ROADMAP Phase 2.1. One source, three outputs:
 *   1. TypeScript types      (`z.infer`, exported below)
 *   2. Runtime validation    (`parseMotionDocument` / `validateMotionDocument`)
 *   3. JSON Schema           (`getMotionDocumentJsonSchema`, for the AI in Phase 30)
 *
 * Units: times and durations are in seconds (SCHEMA_REFERENCE §4). Layer
 * prop keys, state snapshot keys and track `property` values are canonical
 * paths from `properties.ts` (CONVENTIONS §4 names such as `transform.x`).
 * ============================================================================
 */

import { z } from "zod";
import { ARCHETYPE_IDS } from "./registry";
import { validateGeometryValues, validatePropertyValues } from "./properties";
import {
  PropValueSchema,
  ClipSchema,
  StateSchema,
  BehaviourSchema,
  SequenceSchema,
  TransitionSchema,
  type Keyframe,
  type Track,
  type Trigger,
  type ClipType,
  type ScrollTriggerConfig,
  type StaggerConfig,
  type Clip,
  type Sequence,
  type LayerState,
  type Transition,
  type Behaviour,
  type MotionSpec,
  type SpringConfig,
  type Lag,
} from "./motion";
import { BindingSchema } from "./signals";
import { SurfaceSchema, InputTapeSchema, EffectInstanceSchema } from "./effects";
import { InteractionGraphSchema } from "./graph";
import { ComponentSchema, GeneratorSchema, PinsSchema, TagSchema } from "./kinetics";
import { CompositionSchema, createMainComposition, MAIN_COMPOSITION_ID } from "./compositions";
import { checkReferences } from "./references";

/**
 * v3 (Phase 42): every prop key and track path is a canonical `properties.ts`
 * path, and geometry (`frame.*`, `sizing.*`, `positioning`) lives on layers —
 * a top-level layer is a frame; there is no document-level artboard.
 *
 * v4 (Phase 7): the complete motion model. Typed easing, keyframe holds,
 * first-class staggers, sequences, transitions and typed behaviours (7.2–7.3);
 * effect instances (7.4); bindings, surfaces, input tapes and interaction
 * graphs (7.5); Track K pins, tags, components and Split/Clone generators
 * (7.5 v3.2); shape and effect-surface archetypes (7.6).
 *
 * v5 (Phase 46): compositions — the After Effects time model. A `main`
 * composition plus interaction compositions for triggered clips, layer time
 * bars, nesting with stretch and time remap, markers (compositions.ts).
 *
 * v6 (Phase 53): the animation grammar's gaps closed. Clip types `exit`,
 * `focus`, `stagger` and `layout`; triggers `unmount` and `layoutChange`.
 * Purely additive: a v5 document is a valid v6 document.
 */
export const SCHEMA_VERSION = 6 as const;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Keys JS treats as prototype access. Zod's record parsing silently skips them,
 * which would lose data, so `validateMotionDocument` rejects them up front.
 */
const RESERVED_KEY = "__proto__";

export const IdSchema = z.string().min(1).describe("Stable entity id, `<prefix>_<8hex>` for new entities.");

export { PropValueSchema } from "./motion";

export const LayerPropsSchema = z
  .record(z.string(), PropValueSchema)
  .describe("Props keyed by canonical property path (properties.ts); each must be legal for the layer's archetype.");

// Animation, state and behaviour primitives (Phase 7.2–7.3) live in motion.ts.
export {
  KeyframeSchema,
  TrackSchema,
  TRIGGERS,
  TriggerSchema,
  CLIP_TYPES,
  ClipTypeSchema,
  ScrollTriggerSchema,
  StaggerSchema,
  ClipSchema,
  SequenceSchema,
  StateSchema,
  TransitionSchema,
  BEHAVIOUR_TYPES,
  BehaviourSchema,
  EasingSchema,
  SpringSchema,
  MotionSpecSchema,
  LagSchema,
} from "./motion";

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

export const LayerSchema = z.object({
  id: IdSchema,
  name: z.string(),
  archetype: z.enum(ARCHETYPE_IDS).describe("Determines the layer kind, legal props and states (see the registry)."),
  parentId: IdSchema.nullable(),
  children: z.array(IdSchema).describe("Child layer ids in paint order."),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  /** Timeline switches (Phase 61), stored like `visible` and `locked`. With any layer soloed, only soloed layers (and what contains them) are drawn. */
  solo: z.boolean().optional(),
  /** Shy layers can be hidden from the timeline's list (a view filter; they still draw). */
  shy: z.boolean().optional(),
  /** Marks the layer for motion blur. Recorded only; the renderer draws it in a later phase. */
  motionBlur: z.boolean().optional(),
  properties: LayerPropsSchema,
  /** Custom pins (Phase 7.5 / 88.2); the 10 preset pins always exist. */
  pins: PinsSchema.optional(),
  /** Free-form labels a rule can target as `tag:<name>` (Phase 7.5 / 89). */
  tags: z.array(TagSchema).optional(),
  /**
   * Properties that replace this layer's own at a breakpoint and below (Phase 43): breakpoint id to property path to
   * value. The key `layer.visible` with `false` hides the layer there. Absent: no overrides.
   */
  overrides: z.record(z.string(), z.record(z.string(), PropValueSchema)).optional(),
  /** Properties bound to variables (Phase 45): property path to the variable, and whether the layer has detached from it. */
  tokens: z.record(z.string(), z.object({ variable: z.string(), detached: z.boolean().optional() })).optional(),
  /** The text style and effect style this layer follows (Phase 45): style ids. */
  styleRefs: z.object({ text: z.string().optional(), effect: z.string().optional() }).optional(),
  /** This layer is the main component with this id (Phase 46): the one place the component is edited. */
  componentMain: z.string().optional(),
  /**
   * This layer is part of an instance of a component (Phase 46): the component, the main layer it mirrors, whether it
   * is the instance's root, and the properties (and `visible`, `tokens`, `styleRefs`, `overrides`) the instance
   * changed on its own, which the main no longer overwrites.
   */
  instance: z
    .object({
      component: z.string(),
      source: z.string(),
      root: z.boolean().optional(),
      overridden: z.array(z.string()).optional(),
      /** On an instance root of a variant set (Phase 47): the value chosen for each variant property. */
      variant: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  /** This top-level frame is a page (Phase 48): its route (`/`, `/about`) and an optional title. */
  page: z.object({ route: z.string().min(1).max(200), title: z.string().max(200).optional() }).optional(),
  /** This layer is a section, a full-width band of a page (Phase 48), with an optional anchor name for links to it (`#pricing`). */
  section: z.object({ anchor: z.string().max(80).optional() }).optional(),
  /** Where clicking this layer goes in Preview and in the exported site (Phase 48). */
  link: z.object({ kind: z.enum(["page", "anchor", "url", "frame"]), target: z.string().min(1).max(2000) }).optional(),
  /** This main layer is a slot (Phase 47): its instances keep layers of their own inside it, which the main never touches. */
  componentSlot: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export const TokensSchema = z.object({
  colors: z.record(z.string(), z.string()),
  spacing: z.record(z.string(), z.number()),
  radii: z.record(z.string(), z.number()),
});

export const ExportSettingsSchema = z.object({
  framework: z.string(),
  styling: z.string(),
  animation: z.string(),
  language: z.string(),
});

/** One imported file the document uses (Phase 36). The bytes live in the asset store, keyed by `id` (their SHA-256); the document keeps this description. */
export const AssetEntrySchema = z.object({
  id: z.string().regex(/^[0-9a-f]{64}$/, "An asset id is a SHA-256 in hex."),
  name: z.string().max(200),
  kind: z.enum(["image", "svg", "font"]),
  mime: z.string().max(100),
  bytes: z.number().int().nonnegative(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  addedAt: z.number().int().nonnegative(),
});
export type AssetEntry = z.infer<typeof AssetEntrySchema>;

const MotionDocumentShape = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  layers: z.record(IdSchema, LayerSchema),
  clips: z.record(IdSchema, ClipSchema),
  states: z.record(IdSchema, StateSchema),
  behaviours: z.record(IdSchema, BehaviourSchema),
  sequences: z.record(IdSchema, SequenceSchema),
  transitions: z.record(IdSchema, TransitionSchema),
  bindings: z.record(IdSchema, BindingSchema),
  surfaces: z.record(IdSchema, SurfaceSchema),
  inputTapes: z.record(IdSchema, InputTapeSchema),
  graphs: z.record(IdSchema, InteractionGraphSchema),
  effects: z.record(IdSchema, EffectInstanceSchema),
  components: z.record(IdSchema, ComponentSchema),
  generators: z.record(IdSchema, GeneratorSchema),
  compositions: z.record(IdSchema, CompositionSchema),
  tokens: TokensSchema,
  exportSettings: ExportSettingsSchema,
  /** Imported files, by content hash (Phase 36). Absent in documents saved before assets: read it as empty. */
  assets: z.record(z.string(), AssetEntrySchema).optional(),
  /** The design components: id, name and the layer that is the main component (Phase 46). */
  designComponents: z
    .record(
      z.string(),
      z.object({
        id: z.string(),
        name: z.string().min(1).max(120),
        /** The main component; for a variant set, the first variant's. */
        mainId: z.string(),
        /** A section shared by every page, as the header or the footer (Phase 48). */
        shared: z.enum(["header", "footer"]).optional(),
        /** A variant set (Phase 47): its properties (Size: S, M, L) and one main layer for each combination. */
        variantProps: z.array(z.object({ name: z.string().min(1).max(60), values: z.array(z.string().min(1).max(60)).min(1).max(12) })).max(4).optional(),
        variants: z.array(z.object({ mainId: z.string(), values: z.record(z.string(), z.string()) })).max(64).optional(),
        /** Properties exposed on every instance (Phase 47): a name, a kind, and the layer (by name path from the main's root) and property it sets. */
        properties: z
          .array(z.object({ id: z.string(), name: z.string().min(1).max(60), type: z.enum(["text", "image", "boolean"]), path: z.array(z.string()).max(32), prop: z.string().min(1).max(120) }))
          .max(40)
          .optional(),
      }),
    )
    .optional(),
  /** Modes for variables, the first is the default (Phase 45). Absent: Light and Dark. */
  modes: z.array(z.object({ id: z.string().min(1).max(40), name: z.string().min(1).max(40) })).max(8).optional(),
  /** Colour and number variables with a value for each mode (Phase 45). */
  variables: z
    .record(z.string(), z.object({ id: z.string(), name: z.string().min(1).max(120), type: z.enum(["color", "number"]), values: z.record(z.string(), z.union([z.string().max(200), z.number()])) }))
    .optional(),
  /** Text styles and effect styles (Phase 45). */
  styles: z.record(z.string(), z.object({ id: z.string(), name: z.string().min(1).max(120), kind: z.enum(["text", "effect"]), props: z.record(z.string(), PropValueSchema) })).optional(),
  /** The breakpoints, widest (the base) first (Phase 43). Absent: Desktop 1440, Tablet 768, Mobile 375. */
  breakpoints: z.array(z.object({ id: z.string().min(1).max(40), name: z.string().min(1).max(40), width: z.number().int().min(100).max(10000) })).max(12).optional(),
  /** How fonts show while they load (the CSS `font-display`; Phase 38). Absent: `swap`. */
  fontDisplay: z.enum(["swap", "block", "fallback", "optional", "auto"]).optional(),
});

/** Structural schema plus referential integrity (keys, tree links, owners). */
export const MotionDocumentSchema = MotionDocumentShape.superRefine((doc, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

  for (const [key, layer] of Object.entries(doc.layers)) {
    const at = ["layers", key];
    if (layer.id !== key) issue([...at, "id"], `Layer is stored under "${key}" but has id "${layer.id}".`);
    if (layer.parentId !== null) {
      const parent = doc.layers[layer.parentId];
      if (!parent) issue([...at, "parentId"], `Parent "${layer.parentId}" does not exist.`);
      else if (!parent.children.includes(key)) issue([...at, "parentId"], `Parent "${layer.parentId}" does not list "${key}" as a child.`);
    }
    layer.children.forEach((childId, i) => {
      const child = doc.layers[childId];
      if (!child) issue([...at, "children", i], `Child "${childId}" does not exist.`);
      else if (child.parentId !== key) issue([...at, "children", i], `Child "${childId}" has parent "${child.parentId}".`);
    });
    if (new Set(layer.children).size !== layer.children.length) issue([...at, "children"], "Duplicate child ids.");
  }

  // Every layer must reach a root without revisiting a layer.
  for (const key of Object.keys(doc.layers)) {
    const seen = new Set<string>();
    let cursor: string | null = key;
    while (cursor !== null && doc.layers[cursor]) {
      if (seen.has(cursor)) {
        issue(["layers", key, "parentId"], "Layer tree contains a cycle.");
        break;
      }
      seen.add(cursor);
      cursor = doc.layers[cursor].parentId;
    }
  }

  // Every other entity: stored under its id, owned by a layer that exists,
  // and every path, name and reference it holds resolves (references.ts).
  checkReferences(doc, issue);

  for (const [key, layer] of Object.entries(doc.layers)) {
    for (const bad of validateGeometryValues(layer.properties)) issue(["layers", key, "properties", bad.key], bad.message);
    for (const bad of validatePropertyValues(layer.properties)) issue(["layers", key, "properties", bad.key], bad.message);
  }
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { Keyframe, Track, Trigger, ClipType, ScrollTriggerConfig, StaggerConfig, Clip, Sequence, LayerState, Transition, Behaviour, MotionSpec, SpringConfig, Lag };
/** A clip not yet attached to a layer, e.g. an instantiated preset. */
export type ClipTemplate = Omit<Clip, "layerId">;
export type { Binding, BindingDraft } from "./signals";
export type { Surface, InputTape, EffectInstance } from "./effects";
export type { InteractionGraph } from "./graph";
export type { Component, Generator } from "./kinetics";
export type { Composition, CompositionLayer, NestedComposition, Marker, TimeRemap } from "./compositions";
export type Layer = z.infer<typeof LayerSchema>;
export type Tokens = z.infer<typeof TokensSchema>;
export type ExportSettings = z.infer<typeof ExportSettingsSchema>;
export type MotionDocument = z.infer<typeof MotionDocumentShape>;

// ---------------------------------------------------------------------------
// Validation & JSON Schema
// ---------------------------------------------------------------------------

export type ValidationResult =
  | { ok: true; document: MotionDocument }
  | { ok: false; issues: { path: string; message: string }[] };

/** Paths of every own `__proto__` key in plain JSON data. */
function findReservedKeys(value: unknown, path: string[] = [], out: string[] = []): string[] {
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key === RESERVED_KEY) out.push([...path, key].join("."));
      else findReservedKeys((value as Record<string, unknown>)[key], [...path, key], out);
    }
  }
  return out;
}

export function validateMotionDocument(input: unknown): ValidationResult {
  const reserved = findReservedKeys(input);
  if (reserved.length > 0) {
    return {
      ok: false,
      issues: reserved.map((path) => ({ path, message: "`__proto__` is not allowed as a key; it cannot be stored as data." })),
    };
  }
  const result = MotionDocumentSchema.safeParse(input);
  if (result.success) return { ok: true, document: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

/** Parses and validates, throwing a readable error on failure. */
export function parseMotionDocument(input: unknown): MotionDocument {
  const result = validateMotionDocument(input);
  if (result.ok) return result.document;
  const detail = result.issues.slice(0, 5).map((i) => `${i.path || "(root)"}: ${i.message}`).join("; ");
  throw new Error(`Invalid Motion Document: ${detail}`);
}

/** JSON Schema (draft 2020-12) generated from the same Zod source. */
export function getMotionDocumentJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(MotionDocumentShape, { target: "draft-2020-12" }) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  framework: "nextjs-app",
  styling: "tailwind",
  animation: "gsap",
  language: "typescript",
};

export function createEmptyDocument(overrides: Partial<Pick<MotionDocument, "exportSettings">> = {}): MotionDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    layers: {},
    clips: {},
    states: {},
    behaviours: {},
    sequences: {},
    transitions: {},
    bindings: {},
    surfaces: {},
    inputTapes: {},
    graphs: {},
    effects: {},
    components: {},
    generators: {},
    compositions: { [MAIN_COMPOSITION_ID]: createMainComposition() },
    tokens: { colors: {}, spacing: {}, radii: {} },
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS, ...overrides.exportSettings },
  };
}
