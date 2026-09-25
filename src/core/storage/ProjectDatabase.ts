/**
 * ============================================================================
 * PROJECT DATABASE (INDEXEDDB)
 * ============================================================================
 * ROADMAP Phase 3.2. Stores projects, their list summaries and their undo
 * history in IndexedDB (`idb.ts`). localStorage is kept only for UI
 * preferences and the crash-recovery journal; projects saved there by older
 * builds are moved into IndexedDB once, on first use.
 *
 * When IndexedDB is unavailable (some privacy modes, server rendering), the
 * database runs in memory for the session and `persistent` is false.
 * ============================================================================
 */

import type { LegacyProjectSnapshot, ProjectStateSnapshot } from "../store/useProjectStore";
import type { PersistedHistory } from "../store/useHistoryStore";
import { DEFAULT_ENVIRONMENT_SETTINGS } from "../types/environment";
import { createDocumentFromLayers, createLayer } from "../document/factories";
import { upgradeSnapshot } from "../document/migrations";
import { getIndexedDB, openDatabase, requestResult, runTransaction } from "./idb";

export interface ProjectSettings {
  archetype?: string;
  framework?: string;
  styling?: string;
  animation?: string;
  language?: string;
  template?: string;
  scope?: string;
}

export interface StoredProjectRecord {
  id: string; // e.g. "prj_e9a1b2c3"
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Increments on every save; the crash-recovery journal is tied to one revision. */
  revision: number;
  settings: ProjectSettings;
  snapshot: ProjectStateSnapshot;
}

export interface ProjectRegistrySummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  elementCount: number;
  pageCount: number;
}

/** localStorage keys used by builds before Phase 3 (read once for migration). */
const LEGACY_REGISTRY_KEY = "__uweb_project_registry_v1__";
const LEGACY_PROJECT_PREFIX = "__uweb_proj_";
const MIGRATION_FLAG = "migratedFromLocalStorage";

/**
 * Generate a cryptographically distinct, URL-safe unique project ID
 * Format: prj_<timestamp36>_<random4> (e.g. prj_m2a4_9f2b)
 */
export function generateProjectId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `prj_${ts}_${rand}`;
}

/**
 * Creates a default blank canvas project snapshot.
 * Elements list is clean and empty (no pre-baked landing page mockups),
 * with a single root container element ready for designing.
 */
export function createDefaultBlankSnapshot(
  projectId: string,
  projectName = "Blank Project",
  settings?: ProjectSettings
): ProjectStateSnapshot {
  const rootElementId = "elem_canvas_root";

  return {
    projectId,
    projectName,
    scope: (settings?.scope as ProjectStateSnapshot["scope"]) || "page",
    rootArchetype: settings?.archetype || "container",
    activePageId: "page_home",
    pages: {
      page_home: {
        id: "page_home",
        name: "Home",
        slug: "/",
        rootElementId,
      },
    },
    document: {
      ...createDocumentFromLayers([
        createLayer({
          id: rootElementId,
          archetype: "container",
          name: "Root Canvas",
          properties: {
            "frame.width": 100,
            "frame.widthUnit": "%",
            "frame.height": 100,
            "frame.heightUnit": "%",
            "appearance.background.color": "transparent",
            "layout.display": "flex",
            "layout.flexDirection": "column",
          },
        }),
      ]),
      exportSettings: {
        framework: settings?.framework || "nextjs-app",
        styling: settings?.styling || "tailwind",
        animation: settings?.animation || "gsap",
        language: settings?.language || "typescript",
      },
    },
    databaseSchemas: {},
    databaseRecords: {},
    stateVariables: {},
    animationSamples: {},
    bindings: {},
    databaseLatches: {},
    blueprintGraphs: {},
    activeBlueprintGraphId: "graph_main_event",
    redirectRules: {},
    environment: { ...DEFAULT_ENVIRONMENT_SETTINGS },
  };
}

interface HistoryRecord extends PersistedHistory {
  projectId: string;
}

function toSummary(record: StoredProjectRecord): ProjectRegistrySummary {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    elementCount: Object.keys(record.snapshot.document?.layers || {}).length,
    pageCount: Object.keys(record.snapshot.pages || {}).length,
  };
}

/** Upgrades a stored snapshot from any schema version to the current one. */
function upgradeRecord(record: StoredProjectRecord): StoredProjectRecord {
  return { ...record, revision: record.revision ?? 0, snapshot: upgradeSnapshot(record.snapshot as unknown as LegacyProjectSnapshot) };
}

export class ProjectDatabaseManager {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memory = new Map<string, StoredProjectRecord>();
  private memoryHistory = new Map<string, PersistedHistory>();

  constructor(
    private readonly factory: () => IDBFactory | null = getIndexedDB,
    private readonly legacyStorage: () => Storage | null = () => {
      try {
        return typeof localStorage === "undefined" ? null : localStorage;
      } catch {
        return null;
      }
    }
  ) {}

  private db(): Promise<IDBDatabase | null> {
    if (!this.dbPromise) {
      const factory = this.factory();
      this.dbPromise = factory
        ? openDatabase(factory)
            .then(async (db) => {
              await this.migrateFromLocalStorage(db);
              return db;
            })
            .catch((error) => {
              console.warn("[ProjectDatabase] IndexedDB unavailable; projects are kept in memory for this session.", error);
              return null;
            })
        : Promise.resolve(null);
    }
    return this.dbPromise;
  }

  /** True when projects survive a reload (IndexedDB is available). */
  public async isPersistent(): Promise<boolean> {
    return (await this.db()) !== null;
  }

  public generateProjectId(): string {
    return generateProjectId();
  }

  public createDefaultBlankSnapshot(projectId: string, projectName = "Blank Project", settings?: ProjectSettings): ProjectStateSnapshot {
    return createDefaultBlankSnapshot(projectId, projectName, settings);
  }

  /** Project summaries, most recently updated first. */
  public async listProjects(): Promise<ProjectRegistrySummary[]> {
    const db = await this.db();
    const summaries = db
      ? await runTransaction(db, ["summaries"], "readonly", (tx) =>
          requestResult(tx.objectStore("summaries").getAll() as IDBRequest<ProjectRegistrySummary[]>)
        )
      : Array.from(this.memory.values(), toSummary);
    return summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public async getProject(id: string): Promise<StoredProjectRecord | null> {
    if (!id) return null;
    const db = await this.db();
    if (!db) return this.memory.get(id) ?? null;
    const stored = await runTransaction(db, ["projects"], "readonly", (tx) =>
      requestResult(tx.objectStore("projects").get(id) as IDBRequest<StoredProjectRecord | undefined>)
    );
    return stored ? upgradeRecord(stored) : null;
  }

  /**
   * Writes a project record, its summary and (optionally) its history in one
   * transaction. Rejects with `StorageQuotaError` when storage is full.
   */
  public async putProject(record: StoredProjectRecord, history?: PersistedHistory): Promise<StoredProjectRecord> {
    const db = await this.db();
    if (!db) {
      this.memory.set(record.id, record);
      if (history) this.memoryHistory.set(record.id, history);
      return record;
    }
    await runTransaction(db, ["projects", "summaries", "history"], "readwrite", (tx) => {
      tx.objectStore("projects").put(record);
      tx.objectStore("summaries").put(toSummary(record));
      if (history) tx.objectStore("history").put({ projectId: record.id, ...history } satisfies HistoryRecord);
    });
    return record;
  }

  /**
   * Registers a project. An existing project keeps its data and is merged with
   * `params.snapshot`; a new one starts from `params.snapshot` or a blank canvas.
   */
  public async registerProject(params: {
    id?: string;
    name?: string;
    settings?: ProjectSettings;
    snapshot?: Partial<ProjectStateSnapshot>;
  }): Promise<StoredProjectRecord> {
    const id = params.id && params.id.trim() ? params.id.trim() : generateProjectId();
    const existing = await this.getProject(id);
    const now = new Date().toISOString();
    const name = params.name || existing?.name || "Blank Project";
    const settings = params.settings || existing?.settings || { template: "blank" };

    let snapshot: ProjectStateSnapshot;
    if (existing?.snapshot) {
      snapshot = { ...existing.snapshot, ...(params.snapshot || {}), projectId: id, projectName: name };
    } else if (params.snapshot && Object.keys(params.snapshot.document?.layers || {}).length > 0) {
      snapshot = { ...createDefaultBlankSnapshot(id, name, settings), ...params.snapshot, projectId: id, projectName: name };
    } else {
      snapshot = createDefaultBlankSnapshot(id, name, settings);
    }

    return this.putProject({
      id,
      name,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      revision: (existing?.revision ?? 0) + 1,
      settings,
      snapshot,
    });
  }

  /** Saves a new snapshot (and history) for a project. Creates the record if it doesn't exist. */
  public async saveProjectSnapshot(
    id: string,
    snapshot: ProjectStateSnapshot,
    options: { name?: string; history?: PersistedHistory } = {}
  ): Promise<StoredProjectRecord | null> {
    if (!id) return null;
    const existing = await this.getProject(id);
    const now = new Date().toISOString();
    const name = options.name || snapshot.projectName || existing?.name || "Blank Project";
    return this.putProject(
      {
        id,
        name,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        revision: (existing?.revision ?? 0) + 1,
        settings: existing?.settings || {},
        snapshot: { ...snapshot, projectId: id, projectName: name },
      },
      options.history
    );
  }

  public async loadHistory(id: string): Promise<PersistedHistory | null> {
    const db = await this.db();
    if (!db) return this.memoryHistory.get(id) ?? null;
    const stored = await runTransaction(db, ["history"], "readonly", (tx) =>
      requestResult(tx.objectStore("history").get(id) as IDBRequest<HistoryRecord | undefined>)
    );
    return stored ? { past: stored.past, future: stored.future } : null;
  }

  public async deleteProject(id: string): Promise<boolean> {
    const db = await this.db();
    if (!db) {
      this.memoryHistory.delete(id);
      return this.memory.delete(id);
    }
    await runTransaction(db, ["projects", "summaries", "history"], "readwrite", (tx) => {
      tx.objectStore("projects").delete(id);
      tx.objectStore("summaries").delete(id);
      tx.objectStore("history").delete(id);
    });
    return true;
  }

  /**
   * Moves projects saved in localStorage by pre-Phase-3 builds into IndexedDB,
   * once. The localStorage copies are removed only after the move commits.
   */
  private async migrateFromLocalStorage(db: IDBDatabase): Promise<void> {
    const done = await runTransaction(db, ["meta"], "readonly", (tx) => requestResult(tx.objectStore("meta").get(MIGRATION_FLAG)));
    if (done) return;

    const storage = this.legacyStorage();

    const records: StoredProjectRecord[] = [];
    const legacyKeys: string[] = [];
    if (storage) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith(LEGACY_PROJECT_PREFIX)) continue;
        legacyKeys.push(key);
        try {
          records.push(upgradeRecord(JSON.parse(storage.getItem(key) || "null") as StoredProjectRecord));
        } catch (error) {
          console.warn(`[ProjectDatabase] Skipping unreadable legacy project "${key}".`, error);
        }
      }
    }

    await runTransaction(db, ["projects", "summaries", "meta"], "readwrite", (tx) => {
      for (const record of records) {
        if (!record?.id) continue;
        tx.objectStore("projects").put(record);
        tx.objectStore("summaries").put(toSummary(record));
      }
      tx.objectStore("meta").put({ key: MIGRATION_FLAG, value: new Date().toISOString(), count: records.length });
    });

    if (storage) {
      for (const key of legacyKeys) storage.removeItem(key);
      storage.removeItem(LEGACY_REGISTRY_KEY);
    }
  }
}

export const ProjectDatabase = new ProjectDatabaseManager();
