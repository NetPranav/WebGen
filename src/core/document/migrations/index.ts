/**
 * Entry point for loading Motion Document data of any schema version.
 * Every path that brings a document into the editor (saved projects,
 * history, version control, the demo) goes through `loadDocument`.
 */

import { SCHEMA_VERSION, validateMotionDocument, type ExportSettings, type MotionDocument } from "../schema";
import { migrateElementsToDocument, repairTree } from "./v1-to-v2";

export { migrateAttachedAnimation, migrateTrigger, LEGACY_TRIGGER_MAP, toPropValue } from "./v1-to-v2";

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
 * Returns a valid v2 document from v1 or v2 data. v1 data is migrated;
 * v2 data with broken tree links is repaired. Throws only for documents from
 * a newer schema version or v2 data that cannot be repaired.
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
    if (version === SCHEMA_VERSION) {
      const first = validateMotionDocument(raw);
      if (first.ok) return first.document;
      const repaired = normalizeDocument(structuredClone(raw) as MotionDocument);
      const second = validateMotionDocument(repaired);
      if (second.ok) return second.document;
      throw new Error(
        `Motion Document could not be repaired: ${second.issues.slice(0, 3).map((i) => `${i.path}: ${i.message}`).join("; ")}`
      );
    }
  }

  const target = source.target && typeof source.target === "object" ? (source.target as Partial<ExportSettings>) : undefined;
  const exportSettings = target ? stripUndefined(target) : undefined;
  return migrateElementsToDocument(source.elements, exportSettings);
}

/** Repairs tree links and drops clips/states/behaviours whose layer no longer exists. */
export function normalizeDocument(doc: MotionDocument): MotionDocument {
  repairTree(doc);
  for (const collection of ["clips", "states", "behaviours"] as const) {
    const entries = doc[collection] as Record<string, { layerId: string }>;
    for (const [key, entity] of Object.entries(entries)) {
      if (!doc.layers[entity.layerId]) delete entries[key];
    }
  }
  return doc;
}

/**
 * Upgrades a stored snapshot of any version: `document` becomes a valid v2
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
