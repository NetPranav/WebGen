/**
 * ============================================================================
 * PROJECT DATABASE & REGISTRY (CLIENT STORAGE ENGINE)
 * ============================================================================
 * Manages client-side persistent storage of projects with unique IDs.
 * Whenever a project is opened or created, it is registered with its unique ID
 * so it can be reloaded, shared via URL, and persisted.
 * ============================================================================
 */

import { ProjectStateSnapshot } from "../store/useProjectStore";
import { DEFAULT_ENVIRONMENT_SETTINGS } from "../types/environment";

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

const REGISTRY_INDEX_KEY = "__uweb_project_registry_v1__";
const PROJECT_PREFIX_KEY = "__uweb_proj_";

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
    scope: (settings?.scope as any) || "page",
    rootArchetype: settings?.archetype || "container",
    target: {
      framework: settings?.framework || "nextjs-app",
      styling: settings?.styling || "tailwind",
      animation: settings?.animation || "gsap",
      language: settings?.language || "typescript",
    },
    activePageId: "page_home",
    pages: {
      page_home: {
        id: "page_home",
        name: "Home",
        slug: "/",
        rootElementId,
      },
    },
    elements: {
      [rootElementId]: {
        id: rootElementId,
        name: "Root Canvas",
        archetype: "container",
        parentId: null,
        properties: {
          width: "100%",
          height: "100%",
          backgroundColor: "transparent",
          display: "flex",
          flexDirection: "column",
        },
        children: [], // Empty canvas by default
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

class ProjectDatabaseManager {
  private memoryCache = new Map<string, StoredProjectRecord>();

  private isStorageAvailable(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const test = "__test_storage__";
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper delegate to generate a unique project ID
   */
  public generateProjectId(): string {
    return generateProjectId();
  }

  /**
   * Helper delegate to create a default blank canvas snapshot
   */
  public createDefaultBlankSnapshot(
    projectId: string,
    projectName = "Blank Project",
    settings?: ProjectSettings
  ): ProjectStateSnapshot {
    return createDefaultBlankSnapshot(projectId, projectName, settings);
  }

  /**
   * Retrieves all registered project summaries
   */
  public listProjects(): ProjectRegistrySummary[] {
    if (!this.isStorageAvailable()) {
      return Array.from(this.memoryCache.values()).map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        elementCount: Object.keys(p.snapshot.elements || {}).length,
        pageCount: Object.keys(p.snapshot.pages || {}).length,
      }));
    }

    try {
      const raw = window.localStorage.getItem(REGISTRY_INDEX_KEY);
      if (!raw) return [];
      const summaries: ProjectRegistrySummary[] = JSON.parse(raw);
      return summaries.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (e) {
      console.warn("[ProjectDatabase] Error listing projects from localStorage:", e);
      return [];
    }
  }

  /**
   * Loads a project by unique ID from database storage
   */
  public getProject(id: string): StoredProjectRecord | null {
    if (!id) return null;

    if (this.memoryCache.has(id)) {
      return this.memoryCache.get(id)!;
    }

    if (!this.isStorageAvailable()) return null;

    try {
      const raw = window.localStorage.getItem(`${PROJECT_PREFIX_KEY}${id}`);
      if (!raw) return null;
      const record: StoredProjectRecord = JSON.parse(raw);
      this.memoryCache.set(id, record);
      return record;
    } catch (e) {
      console.warn(`[ProjectDatabase] Error loading project '${id}':`, e);
      return null;
    }
  }

  /**
   * Registers and saves a project into the storage database.
   * If the project doesn't exist, it creates a new registered entry.
   */
  public registerProject(params: {
    id?: string;
    name?: string;
    settings?: ProjectSettings;
    snapshot?: Partial<ProjectStateSnapshot>;
  }): StoredProjectRecord {
    const id = params.id && params.id.trim() ? params.id.trim() : generateProjectId();
    const existing = this.getProject(id);
    const now = new Date().toISOString();

    const name = params.name || existing?.name || "Blank Project";
    const settings = params.settings || existing?.settings || { template: "blank" };

    let fullSnapshot: ProjectStateSnapshot;
    if (existing?.snapshot) {
      fullSnapshot = {
        ...existing.snapshot,
        ...(params.snapshot || {}),
        projectId: id,
        projectName: name,
      };
    } else if (params.snapshot && Object.keys(params.snapshot.elements || {}).length > 0) {
      fullSnapshot = {
        ...createDefaultBlankSnapshot(id, name, settings),
        ...params.snapshot,
        projectId: id,
        projectName: name,
      };
    } else {
      fullSnapshot = createDefaultBlankSnapshot(id, name, settings);
    }

    const record: StoredProjectRecord = {
      id,
      name,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      settings,
      snapshot: fullSnapshot,
    };

    // Save into memory cache
    this.memoryCache.set(id, record);

    // Save into localStorage
    if (this.isStorageAvailable()) {
      try {
        window.localStorage.setItem(`${PROJECT_PREFIX_KEY}${id}`, JSON.stringify(record));

        // Update registry index
        const list = this.listProjects().filter((p) => p.id !== id);
        list.unshift({
          id,
          name,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          elementCount: Object.keys(fullSnapshot.elements || {}).length,
          pageCount: Object.keys(fullSnapshot.pages || {}).length,
        });
        window.localStorage.setItem(REGISTRY_INDEX_KEY, JSON.stringify(list));
      } catch (e) {
        console.warn("[ProjectDatabase] Storage quota or write error:", e);
      }
    }

    return record;
  }

  /**
   * Updates an existing project's snapshot in the database
   */
  public saveProjectSnapshot(
    id: string,
    snapshot: ProjectStateSnapshot,
    name?: string
  ): StoredProjectRecord | null {
    if (!id) return null;

    const existing = this.getProject(id);
    const now = new Date().toISOString();
    const projectName = name || snapshot.projectName || existing?.name || "Blank Project";

    const record: StoredProjectRecord = {
      id,
      name: projectName,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      settings: existing?.settings || {},
      snapshot: {
        ...snapshot,
        projectId: id,
        projectName,
      },
    };

    this.memoryCache.set(id, record);

    if (this.isStorageAvailable()) {
      try {
        window.localStorage.setItem(`${PROJECT_PREFIX_KEY}${id}`, JSON.stringify(record));

        const list = this.listProjects().filter((p) => p.id !== id);
        list.unshift({
          id,
          name: projectName,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          elementCount: Object.keys(snapshot.elements || {}).length,
          pageCount: Object.keys(snapshot.pages || {}).length,
        });
        window.localStorage.setItem(REGISTRY_INDEX_KEY, JSON.stringify(list));
      } catch (e) {
        console.warn(`[ProjectDatabase] Error updating project '${id}':`, e);
      }
    }

    return record;
  }

  /**
   * Deletes a project from the storage database
   */
  public deleteProject(id: string): boolean {
    this.memoryCache.delete(id);

    if (this.isStorageAvailable()) {
      try {
        window.localStorage.removeItem(`${PROJECT_PREFIX_KEY}${id}`);
        const list = this.listProjects().filter((p) => p.id !== id);
        window.localStorage.setItem(REGISTRY_INDEX_KEY, JSON.stringify(list));
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }
}

export const ProjectDatabase = new ProjectDatabaseManager();
