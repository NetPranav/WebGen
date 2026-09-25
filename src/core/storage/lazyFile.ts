/**
 * ============================================================================
 * .lazy.json PROJECT FILES
 * ============================================================================
 * ROADMAP Phase 3.3. A portable, versioned file holding one project:
 *
 *   {
 *     "format": "lazylayout-project",
 *     "formatVersion": 1,
 *     "schemaVersion": 2,          // MotionDocument schema at export time
 *     "exportedAt": "...",
 *     "project": { "name": "...", "settings": { ... } },
 *     "snapshot": { ...project snapshot, document included... },
 *     "assets": { "linked": ["https://..."] }
 *   }
 *
 * Assets are linked (referenced by URL) until the asset pipeline (Phase 54)
 * can embed them. Import migrates older schema versions and validates the
 * document; files from a newer schema version are refused with a clear message.
 * ============================================================================
 */

import type { LegacyProjectSnapshot, ProjectStateSnapshot } from "../store/useProjectStore";
import type { ProjectSettings } from "./ProjectDatabase";
import { SCHEMA_VERSION, validateMotionDocument } from "../document/schema";
import { upgradeSnapshot } from "../document/migrations";

export const LAZY_FILE_FORMAT = "lazylayout-project";
export const LAZY_FILE_FORMAT_VERSION = 1;
export const LAZY_FILE_EXTENSION = ".lazy.json";

export interface LazyFile {
  format: typeof LAZY_FILE_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  exportedAt: string;
  project: { name: string; settings?: ProjectSettings };
  snapshot: ProjectStateSnapshot;
  assets: { linked: string[] };
}

export class LazyFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LazyFileError";
  }
}

/** Every http(s) URL string anywhere in the document (image sources and the like). */
function collectLinkedAssets(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) out.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectLinkedAssets(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectLinkedAssets(v, out));
  }
  return out;
}

export function createLazyFile(snapshot: ProjectStateSnapshot, settings?: ProjectSettings): LazyFile {
  return {
    format: LAZY_FILE_FORMAT,
    formatVersion: LAZY_FILE_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    project: { name: snapshot.projectName, ...(settings ? { settings } : {}) },
    snapshot,
    assets: { linked: [...collectLinkedAssets(snapshot.document)].sort() },
  };
}

export function serializeLazyFile(snapshot: ProjectStateSnapshot, settings?: ProjectSettings): string {
  return JSON.stringify(createLazyFile(snapshot, settings), null, 2);
}

/** A file name like `My Project.lazy.json`, safe on every OS. */
export function lazyFileName(projectName: string): string {
  const base = projectName.replace(/[\\/:*?"<>|]+/g, "-").trim() || "project";
  return `${base}${LAZY_FILE_EXTENSION}`;
}

/**
 * Parses and checks a `.lazy.json` file: format, format version, schema
 * version (migrating older ones), and the document itself.
 */
export function parseLazyFile(text: string): LazyFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new LazyFileError("This file is not valid JSON, so it can't be a LazyLayout project.");
  }
  if (!raw || typeof raw !== "object") throw new LazyFileError("This file is not a LazyLayout project.");
  const file = raw as Partial<LazyFile>;

  if (file.format !== LAZY_FILE_FORMAT) throw new LazyFileError("This file is not a LazyLayout project (missing the `lazylayout-project` format tag).");
  if (typeof file.formatVersion !== "number" || file.formatVersion > LAZY_FILE_FORMAT_VERSION) {
    throw new LazyFileError(
      `This file uses file format ${String(file.formatVersion)}, which is newer than this version of LazyLayout supports (${LAZY_FILE_FORMAT_VERSION}). Update LazyLayout to open it.`
    );
  }
  if (typeof file.schemaVersion !== "number" || file.schemaVersion > SCHEMA_VERSION) {
    throw new LazyFileError(
      `This project was saved with document schema v${String(file.schemaVersion)}; this version of LazyLayout reads up to v${SCHEMA_VERSION}. Update LazyLayout to open it.`
    );
  }
  if (!file.snapshot || typeof file.snapshot !== "object") throw new LazyFileError("This file has no project data.");

  // Older schema versions are migrated; the result must be a valid current document.
  let snapshot: ProjectStateSnapshot;
  try {
    snapshot = upgradeSnapshot(file.snapshot as unknown as LegacyProjectSnapshot);
  } catch (error) {
    throw new LazyFileError(`The project data can't be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  const check = validateMotionDocument(snapshot.document);
  if (!check.ok) {
    const detail = check.issues.slice(0, 3).map((i) => `${i.path || "(root)"}: ${i.message}`).join("; ");
    throw new LazyFileError(`The project's document is damaged and can't be opened (${detail}).`);
  }

  return {
    format: LAZY_FILE_FORMAT,
    formatVersion: file.formatVersion,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : new Date(0).toISOString(),
    project: { name: file.project?.name || snapshot.projectName || "Imported Project", settings: file.project?.settings },
    snapshot: { ...snapshot, document: check.document },
    assets: { linked: Array.isArray(file.assets?.linked) ? file.assets.linked.filter((a): a is string => typeof a === "string") : [] },
  };
}

/** True for file names this app should try to open (`*.lazy.json`, or any `.json`). */
export function isLazyFileName(name: string): boolean {
  return name.toLowerCase().endsWith(".json");
}
