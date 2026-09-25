/**
 * Entry point for loading Motion Document data of any schema version.
 * Every path that brings a document into the editor (saved projects,
 * history, version control, the demo) goes through `loadDocument`.
 */

import { SCHEMA_VERSION, validateMotionDocument, type ExportSettings, type MotionDocument } from "../schema";
import { migrateElementsToDocument, repairTree } from "./v1-to-v2";
import { migrateV2ToV3 } from "./v2-to-v3";
import { isCanonicalPath, isPropertyLegalFor } from "../properties";

export { migrateAttachedAnimation, migrateTrigger, LEGACY_TRIGGER_MAP, toPropValue } from "./v1-to-v2";
export { migrateV2ToV3, type MigrationReportEntry } from "./v2-to-v3";

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
 * Returns a valid current-version document from v1, v2 or v3 data. Older data
 * is migrated forward one version at a time (v1 → v2 → v3); v3 data with
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
    if (version === 2) return validateOrRepair(migrateV2ToV3(raw).document);
  }

  const target = source.target && typeof source.target === "object" ? (source.target as Partial<ExportSettings>) : undefined;
  const exportSettings = target ? stripUndefined(target) : undefined;
  // v1 → v2 builds the document with v2 prop names; v2 → v3 renames them.
  return validateOrRepair(migrateV2ToV3(migrateElementsToDocument(source.elements, exportSettings)).document);
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

/**
 * Repairs tree links, drops clips/states/behaviours whose layer no longer
 * exists, and drops props, state keys and tracks that are not canonical
 * properties of their layer's archetype.
 */
export function normalizeDocument(doc: MotionDocument): MotionDocument {
  repairTree(doc);
  for (const collection of ["clips", "states", "behaviours"] as const) {
    const entries = doc[collection] as Record<string, { layerId: string }>;
    for (const [key, entity] of Object.entries(entries)) {
      if (!doc.layers[entity.layerId]) delete entries[key];
    }
  }
  const legal = (path: string, layerId: string) => {
    const layer = doc.layers[layerId];
    return Boolean(layer) && isCanonicalPath(path) && isPropertyLegalFor(path, layer.archetype);
  };
  for (const layer of Object.values(doc.layers)) {
    if (!layer.properties || typeof layer.properties !== "object") continue;
    for (const key of Object.keys(layer.properties)) if (!legal(key, layer.id)) delete layer.properties[key];
  }
  for (const state of Object.values(doc.states)) {
    if (!state.props || typeof state.props !== "object") continue;
    for (const key of Object.keys(state.props)) if (!legal(key, state.layerId)) delete state.props[key];
  }
  for (const clip of Object.values(doc.clips)) {
    if (Array.isArray(clip.tracks)) clip.tracks = clip.tracks.filter((t) => typeof t?.property !== "string" || legal(t.property, clip.layerId));
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
