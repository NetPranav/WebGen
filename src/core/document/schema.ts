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
 */
export const SCHEMA_VERSION = 5 as const;

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
  properties: LayerPropsSchema,
  /** Custom pins (Phase 7.5 / 88.2); the 10 preset pins always exist. */
  pins: PinsSchema.optional(),
  /** Free-form labels a rule can target as `tag:<name>` (Phase 7.5 / 89). */
  tags: z.array(TagSchema).optional(),
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
