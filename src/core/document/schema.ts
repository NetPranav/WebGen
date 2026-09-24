/**
 * ============================================================================
 * MOTION DOCUMENT MODEL (MDM v2): SCHEMA
 * ============================================================================
 * ROADMAP Phase 2.1. One source, three outputs:
 *   1. TypeScript types      (`z.infer`, exported below)
 *   2. Runtime validation    (`parseMotionDocument` / `validateMotionDocument`)
 *   3. JSON Schema           (`getMotionDocumentJsonSchema`, for the AI in Phase 30)
 *
 * Units: times and durations are in seconds (SCHEMA_REFERENCE §4). Track
 * `property` values are CONVENTIONS §4 dot-paths such as `transform.x`.
 * ============================================================================
 */

import { z } from "zod";
import { ARCHETYPE_IDS, type PropValue } from "./registry";

export const SCHEMA_VERSION = 2 as const;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Keys JS treats as prototype access. Zod's record parsing silently skips them,
 * which would lose data, so `validateMotionDocument` rejects them up front.
 */
const RESERVED_KEY = "__proto__";

export const IdSchema = z.string().min(1).describe("Stable entity id, `<prefix>_<8hex>` for new entities.");

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

export const LayerPropsSchema = z
  .record(z.string(), PropValueSchema)
  .describe("Archetype-specific props; the registry lists each archetype's defaults.");

// ---------------------------------------------------------------------------
// Animation: keyframes, tracks, clips
// ---------------------------------------------------------------------------

export const KeyframeSchema = z.object({
  id: IdSchema,
  time: z.number().min(0).describe("Seconds from the start of the clip."),
  value: PropValueSchema,
  ease: z.string().optional().describe("Easing into this keyframe, e.g. `power2.out` or `cubic-bezier(...)`."),
});

export const TrackSchema = z.object({
  id: IdSchema,
  property: z.string().min(1).describe("CONVENTIONS §4 dot-path, e.g. `transform.y`."),
  muted: z.boolean().optional(),
  locked: z.boolean().optional(),
  keyframes: z.array(KeyframeSchema),
});

/** What starts a clip or state change (PRD §4). */
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

export const StaggerSchema = z.object({
  amount: z.number(),
  from: z.enum(["start", "center", "end", "random"]),
  grid: z.tuple([z.number(), z.number()]).optional(),
  axis: z.enum(["x", "y"]).optional(),
});

export const ClipSchema = z.object({
  id: IdSchema,
  layerId: IdSchema,
  name: z.string(),
  type: ClipTypeSchema,
  trigger: TriggerSchema,
  duration: z.number().min(0).describe("Seconds."),
  delay: z.number().min(0).optional().describe("Seconds."),
  easing: z.string(),
  repeat: z.number().int().min(-1).optional().describe("-1 loops forever."),
  enabled: z.boolean(),
  locked: z.boolean().optional(),
  scrollTrigger: ScrollTriggerSchema.optional(),
  stagger: StaggerSchema.optional(),
  tracks: z.array(TrackSchema),
});

// ---------------------------------------------------------------------------
// States & behaviours
// ---------------------------------------------------------------------------

export const StateSchema = z.object({
  id: IdSchema,
  layerId: IdSchema,
  name: z.string().min(1).describe("e.g. `idle`, `hover`, `pressed`, `inView`."),
  props: LayerPropsSchema,
});

export const BEHAVIOUR_TYPES = [
  "follow-pointer",
  "magnet",
  "tilt",
  "spring-to",
  "inertia",
  "noise",
  "loop",
  "shader-uniform",
] as const;

export const BehaviourSchema = z.object({
  id: IdSchema,
  layerId: IdSchema,
  type: z.enum(BEHAVIOUR_TYPES),
  enabled: z.boolean(),
  params: LayerPropsSchema,
});

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
});

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export const ArtboardSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  background: z.string(),
});

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
  artboard: ArtboardSchema,
  layers: z.record(IdSchema, LayerSchema),
  clips: z.record(IdSchema, ClipSchema),
  states: z.record(IdSchema, StateSchema),
  behaviours: z.record(IdSchema, BehaviourSchema),
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

  const owned = (collection: "clips" | "states" | "behaviours") => {
    for (const [key, entity] of Object.entries(doc[collection])) {
      if (entity.id !== key) issue([collection, key, "id"], `Stored under "${key}" but has id "${entity.id}".`);
      if (!doc.layers[entity.layerId]) issue([collection, key, "layerId"], `Layer "${entity.layerId}" does not exist.`);
    }
  };
  owned("clips");
  owned("states");
  owned("behaviours");
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Keyframe = z.infer<typeof KeyframeSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type ClipType = z.infer<typeof ClipTypeSchema>;
export type ScrollTriggerConfig = z.infer<typeof ScrollTriggerSchema>;
export type StaggerConfig = z.infer<typeof StaggerSchema>;
export type Clip = z.infer<typeof ClipSchema>;
/** A clip not yet attached to a layer, e.g. an instantiated preset. */
export type ClipTemplate = Omit<Clip, "layerId">;
export type LayerState = z.infer<typeof StateSchema>;
export type Behaviour = z.infer<typeof BehaviourSchema>;
export type Layer = z.infer<typeof LayerSchema>;
export type Artboard = z.infer<typeof ArtboardSchema>;
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

export function createEmptyDocument(overrides: Partial<Pick<MotionDocument, "exportSettings" | "artboard">> = {}): MotionDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    artboard: { width: 1440, height: 900, background: "#ffffff", ...overrides.artboard },
    layers: {},
    clips: {},
    states: {},
    behaviours: {},
    tokens: { colors: {}, spacing: {}, radii: {} },
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS, ...overrides.exportSettings },
  };
}
