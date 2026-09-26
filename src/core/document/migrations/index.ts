/**
 * Entry point for loading Motion Document data of any schema version.
 * Every path that brings a document into the editor (saved projects,
 * history, version control, the demo) goes through `loadDocument`.
 */

import { SCHEMA_VERSION, validateMotionDocument, type ExportSettings, type MotionDocument } from "../schema";
import { migrateElementsToDocument, repairTree } from "./v1-to-v2";
import { migrateV2ToV3 } from "./v2-to-v3";
import { migrateV3ToV4 } from "./v3-to-v4";
import { coercePropertyValue, getPropertyDefinition, isCanonicalPath, isPropertyLegalFor, validateGeometryValues, validatePropertyValues } from "../properties";
import { isEasing } from "../motion";
import { bindingLayerRefs } from "../signals";

export { migrateAttachedAnimation, migrateTrigger, LEGACY_TRIGGER_MAP, toPropValue } from "./v1-to-v2";
export { migrateV2ToV3, type MigrationReportEntry, type V3Document } from "./v2-to-v3";
export { migrateV3ToV4, DEFAULT_BEHAVIOUR_PARAMS } from "./v3-to-v4";

/** The parts of a stored project snapshot that can hold document data, in any version. */
export interface DocumentSource {
  document?: unknown;
  /** v1: element map. */
  elements?: unknown;
  /** v1: export target, now `document.exportSettings`. */
  target?: unknown;
}

export class DocumentVersionError extends Error {}

/**
 * Returns a valid current-version document from v1–v4 data. Older data is
 * migrated forward one version at a time (v1 → v2 → v3 → v4); v4 data with
 * broken tree links or invalid props is repaired. Throws only for documents
 * from a newer schema version or data that cannot be repaired.
 */
export function loadDocument(source: DocumentSource): MotionDocument {
  const raw = source.document as { schemaVersion?: unknown } | undefined;

  if (raw && typeof raw === "object") {
    const version = raw.schemaVersion;
    if (typeof version === "number" && version > SCHEMA_VERSION) {
      throw new DocumentVersionError(
        `This project was saved by a newer LazyLayout (schema v${version}); this editor reads up to v${SCHEMA_VERSION}.`
      );
    }
    if (version === SCHEMA_VERSION) return validateOrRepair(raw);
    if (version === 3) return validateOrRepair(migrateV3ToV4(raw as Record<string, unknown>).document);
    if (version === 2) return validateOrRepair(migrateV3ToV4(migrateV2ToV3(raw).document).document);
  }

  const target = source.target && typeof source.target === "object" ? (source.target as Partial<ExportSettings>) : undefined;
  const exportSettings = target ? stripUndefined(target) : undefined;
  // v1 → v2 builds the document with v2 prop names; v2 → v3 renames them.
  return validateOrRepair(migrateV3ToV4(migrateV2ToV3(migrateElementsToDocument(source.elements, exportSettings)).document).document);
}

function validateOrRepair(data: unknown): MotionDocument {
  const first = validateMotionDocument(data);
  if (first.ok) return first.document;
  const repaired = normalizeDocument(structuredClone(data) as MotionDocument);
  const second = validateMotionDocument(repaired);
  if (second.ok) return second.document;
  throw new Error(
    `Motion Document could not be repaired: ${second.issues.slice(0, 3).map((i) => `${i.path}: ${i.message}`).join("; ")}`
  );
}

/** Collections whose entities belong to one layer, and the field naming it. */
export const LAYER_OWNED_COLLECTIONS = [
  ["clips", "layerId"],
  ["states", "layerId"],
  ["behaviours", "layerId"],
  ["transitions", "layerId"],
  ["surfaces", "layerId"],
  ["effects", "layerId"],
  ["components", "layerId"],
  ["bindings", "ownerLayerId"],
  ["generators", "groupLayerId"],
] as const;

/**
 * Removes every entity that belongs to one of `layerIds` (layer deletion),
 * plus graph ownership and sequence items that pointed at removed clips.
 */
export function removeLayerDependents(doc: MotionDocument, layerIds: ReadonlySet<string>): void {
  const removedClips = new Set<string>();
  for (const [collection, field] of LAYER_OWNED_COLLECTIONS) {
    const entries = doc[collection] as unknown as Record<string, Record<string, unknown>>;
    for (const [key, entity] of Object.entries(entries)) {
      const owner = entity[field];
      if (typeof owner === "string" && layerIds.has(owner)) {
        if (collection === "clips") removedClips.add(key);
        delete entries[key];
      }
    }
  }
  // Bindings and components that point at a removed layer can't mean anything any more.
  for (const [key, b] of Object.entries(doc.bindings)) {
    if (bindingLayerRefs(b).some((r) => layerIds.has(r.ref))) delete doc.bindings[key];
  }
  for (const [key, c] of Object.entries(doc.components)) {
    const refs = c.type === "follow" && c.target.kind !== "pointer" ? [c.target.layer] : c.type === "effector" && c.targets.kind !== "tag" ? [c.targets.ref] : [];
    if (refs.some((r) => layerIds.has(r))) delete doc.components[key];
  }
  // A generator that lost pieces or its source is detached: the rest stay, re-indexed.
  for (const [key, g] of Object.entries(doc.generators)) {
    if (layerIds.has(g.sourceLayerId)) {
      delete doc.generators[key];
      continue;
    }
    if (!g.pieces.some((p) => layerIds.has(p.layerId))) continue;
    if (g.kind === "clone") {
      delete doc.generators[key];
      continue;
    }
    g.pieces = g.pieces.filter((p) => !layerIds.has(p.layerId)).map((p, index) => ({ ...p, index }));
    g.detached = true;
    g.overrides.byIndex = {};
  }
  for (const graph of Object.values(doc.graphs)) if (graph.ownerLayerId && layerIds.has(graph.ownerLayerId)) graph.ownerLayerId = null;
  for (const [key, seq] of Object.entries(doc.sequences)) {
    seq.items = seq.items.filter((i) => !removedClips.has(i.clipId));
    if (seq.items.length === 0) delete doc.sequences[key];
  }
}

/**
 * Repairs tree links, drops entities whose layer no longer exists, drops
 * props, state keys and tracks that are not canonical properties of their
 * layer's archetype, and fixes clip timing the v4 checks reject.
 */
export function normalizeDocument(doc: MotionDocument): MotionDocument {
  repairTree(doc);
  for (const [collection] of LAYER_OWNED_COLLECTIONS) if (!doc[collection] || typeof doc[collection] !== "object") (doc as Record<string, unknown>)[collection] = {};
  for (const collection of ["sequences", "inputTapes", "graphs"] as const) if (!doc[collection] || typeof doc[collection] !== "object") doc[collection] = {};
  const missing = new Set<string>();
  for (const [collection, field] of LAYER_OWNED_COLLECTIONS) {
    for (const entity of Object.values(doc[collection] as unknown as Record<string, Record<string, unknown>>)) {
      const owner = entity?.[field];
      if (typeof owner === "string" && !doc.layers[owner]) missing.add(owner);
    }
  }
  removeLayerDependents(doc, missing);
  const legal = (path: string, layerId: string) => {
    const layer = doc.layers[layerId];
    return Boolean(layer) && isCanonicalPath(path) && isPropertyLegalFor(path, layer.archetype);
  };
  for (const layer of Object.values(doc.layers)) {
    if (!layer.properties || typeof layer.properties !== "object") continue;
    for (const key of Object.keys(layer.properties)) if (!legal(key, layer.id)) delete layer.properties[key];
    for (const bad of validateGeometryValues(layer.properties)) delete layer.properties[bad.key];
    for (const bad of validatePropertyValues(layer.properties)) delete layer.properties[bad.key];
  }
  for (const state of Object.values(doc.states)) {
    if (!state.props || typeof state.props !== "object") continue;
    for (const key of Object.keys(state.props)) {
      const def = getPropertyDefinition(key);
      if (!legal(key, state.layerId) || !def) delete state.props[key];
      else state.props[key] = coercePropertyValue(def, state.props[key]);
    }
  }
  for (const clip of Object.values(doc.clips)) {
    if (typeof clip.easing === "string" && !isEasing(clip.easing)) clip.easing = "power1.out";
    if (Array.isArray(clip.tracks)) {
      clip.tracks = clip.tracks.filter((t) => typeof t?.property !== "string" || legal(t.property, clip.layerId));
      for (const track of clip.tracks) {
        if (!Array.isArray(track?.keyframes)) continue;
        const def = getPropertyDefinition(track.property);
        track.keyframes.sort((a, b) => a.time - b.time);
        for (const kf of track.keyframes) {
          if (typeof kf.ease === "string" && !isEasing(kf.ease)) delete kf.ease;
          if (def) kf.value = coercePropertyValue(def, kf.value);
          if (typeof kf.time === "number" && typeof clip.duration === "number" && kf.time > clip.duration) clip.duration = kf.time;
        }
      }
    }
  }
  return doc;
}

/**
 * Upgrades a stored snapshot of any version: `document` becomes a valid v3
 * document and the v1-only `elements` / `target` fields are removed.
 */
export function upgradeSnapshot<T extends DocumentSource>(
  snapshot: T
): Omit<T, "elements" | "target" | "document"> & { document: MotionDocument } {
  const { elements: _elements, target: _target, document: _document, ...rest } = snapshot;
  void _elements;
  void _target;
  void _document;
  return { ...rest, document: loadDocument(snapshot) };
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === "string")) as Partial<T>;
}
