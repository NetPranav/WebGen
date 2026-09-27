"use client";

/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH PROJECT AST STORE
 * ============================================================================
 * Central Zustand reactive store managing all project pages, UI elements,
 * database schemas, in-memory records, scoped state variables, animations, and bindings.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.4 & FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md
 * ============================================================================
 */

import { create } from "zustand";
import { type MotionDocument, type Layer } from "../document/schema";
import { createLayer, createDocumentFromLayers } from "../document/factories";
import { getDocument, setDocument } from "./documentState";
import { getDefaultProps, isArchetypeId, getArchetype } from "../document/registry";
import { upgradeSnapshot, type DocumentSource } from "../document/migrations";
import { CollectionSchema } from "../types/database";
import { AnimationSample } from "../types/animations";
import {
  DataBindingDescriptor,
  DataContext,
} from "../types/data-binding";
import { ConnectionPipeline } from "../engine/ConnectionPipeline";
import { useHistoryStore } from "./useHistoryStore";
import { BlueprintGraph } from "../ast/ASTManager";
import { RedirectRule } from "../types/routing";
import type { AfterTrackActionSignatures } from "./afterTrackActionSignatures";
import { WorldEnvironmentSettings, DEFAULT_ENVIRONMENT_SETTINGS } from "../types/environment";
import { getEnvironment, setEnvironment } from "./useEnvironmentStore";
import {
  createShowcaseSnapshot,
  createBlankCanvasSnapshot,
} from "../storage/DemoProjectSnapshot";

export type {
  StateVariableScope,
  StateVariableType,
  StateVariable,
  DatabaseFunctionLatch,
  PageDefinition,
  ProjectTargetConfig,
} from "./projectTypes";
import type {
  StateVariable,
  DatabaseFunctionLatch,
  PageDefinition,
  ProjectTargetConfig,
} from "./projectTypes";

export interface ProjectStateSnapshot {
  projectId?: string;
  projectName: string;
  scope?: "element" | "component" | "page";
  rootArchetype?: string;
  activePageId: string;
  pages: Record<string, PageDefinition>;
  /** The Motion Document (MDM v2): layers, clips, states, tokens, export settings. */
  document: MotionDocument;
  databaseSchemas: Record<string, CollectionSchema>;
  databaseRecords: Record<string, Record<string, unknown>[]>;
  stateVariables: Record<string, StateVariable>;
  animationSamples: Record<string, AnimationSample>;
  bindings: Record<string, DataBindingDescriptor>;
  databaseLatches: Record<string, DatabaseFunctionLatch[]>;
  blueprintGraphs: Record<string, BlueprintGraph>;
  activeBlueprintGraphId: string;
  redirectRules: Record<string, RedirectRule>;
  environment?: WorldEnvironmentSettings;
}

/** A stored snapshot from any schema version (v1 kept an `elements` map and `target`). */
export type LegacyProjectSnapshot = Omit<ProjectStateSnapshot, "document"> & DocumentSource;

/** Snapshot keys that project history entries swap: everything except the project's identity and the document. */
const PROJECT_STATE_KEYS = [
  "projectName",
  "scope",
  "rootArchetype",
  "activePageId",
  "pages",
  "databaseSchemas",
  "databaseRecords",
  "stateVariables",
  "animationSamples",
  "bindings",
  "databaseLatches",
  "blueprintGraphs",
  "activeBlueprintGraphId",
  "redirectRules",
  "environment",
] as const satisfies readonly (keyof ProjectStateSnapshot)[];

function pickProjectState(snapshot: ProjectStateSnapshot, includeDocument: boolean): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const key of PROJECT_STATE_KEYS) state[key] = snapshot[key];
  if (includeDocument) state.document = snapshot.document;
  return state;
}

/** The live non-document project state (plus the document when asked), for history swaps. */
export function captureProjectState(includeDocument = false): Record<string, unknown> {
  return pickProjectState(useProjectStore.getState().getSnapshot(), includeDocument);
}

/**
 * Records an undo step for a project-level action (pages, blueprints,
 * databases …) from the snapshot taken *before* it. Pass `includesDocument`
 * when the action also writes document data outside the document commands.
 */
/** Exported for the After-track action modules (`src/after/store/*.ts`), which record undo steps the same way. */
export function recordProjectChange(label: string, before: ProjectStateSnapshot, options: { includesDocument?: boolean } = {}) {
  useHistoryStore.getState().record({
    actionLabel: label,
    change: { kind: "project", state: pickProjectState(before, options.includesDocument ?? false) },
  });
}

/**
 * The live store's state no longer includes the document (Sub-Phase 41.1 —
 * `useDocumentStore`/`documentState.ts` own it independently). `ProjectStateSnapshot`
 * itself is unchanged: it's the stable serialization contract (.lazy.json,
 * IndexedDB, version control), and still includes `document`; `getSnapshot`/
 * `restoreSnapshot` compose it by reading/writing the document store directly.
 */
/**
 * The After-track action methods (`AfterTrackActionSignatures`) are mixed in
 * as `Partial<>`: each is `undefined` on the live store unless its
 * `src/after/store/*.ts` module has registered it (Sub-Phase 41.1). Core
 * actions used in every edition are declared directly below.
 */
export interface ProjectStoreState
  extends Omit<ProjectStateSnapshot, "document" | "environment">,
    Partial<AfterTrackActionSignatures> {
  // Actions: Project Identity & Management
  setProjectId: (projectId: string) => void;
  setProjectName: (name: string) => void;

  // Actions: Project Initialization (Sub-Phase 2.4)
  initElementProject: (params: {
    projectId?: string;
    projectName: string;
    archetype: string;
    target?: ProjectTargetConfig;
    template?: string;
    actionLabel?: string;
  }) => string;

  // Layer edits go through `documentCommands` (useDocumentStore.ts).
  mountDemoProject: () => void;
  clearToBlankCanvas: () => void;
  /** Inserts generated layers and attaches `rootId` to the active page's root layer. */
  insertGeneratedComponent: (layers: Layer[], rootId: string, actionLabel?: string) => void;

  // Actions: Data Binding Management
  registerBinding: (binding: DataBindingDescriptor, actionLabel?: string) => void;
  unregisterBinding: (bindingId: string, actionLabel?: string) => void;

  // Actions: Animation Sample Management
  registerAnimationSample: (sample: AnimationSample, actionLabel?: string) => void;

  // Actions: Page Management. Core (Phase 2's single default page needs it in
  // every edition); the multi-page CRUD actions are After-track (above).
  setActivePage: (pageId: string) => void;

  // System Helpers
  getDataContext: () => DataContext;
  getSnapshot: () => ProjectStateSnapshot;
  /** Restores a snapshot; v1 snapshots (with `elements`) are migrated on the way in. */
  restoreSnapshot: (snapshot: ProjectStateSnapshot | LegacyProjectSnapshot) => void;
}

const INITIAL_PROJECT_STATE: Omit<ProjectStateSnapshot, "document"> = {
  projectName: "Visual Web App",
  scope: "element",
  rootArchetype: "button",
  activePageId: "page_home",
  pages: {
    page_home: {
      id: "page_home",
      name: "Home",
      slug: "/",
      rootElementId: "el_root_container",
    },
  },
  // These four After-track domains default to empty in the core store; their
  // demo seed data (a Products collection, cartTotal/isUserLoggedIn state
  // variables, a Main Event Graph) moves with their actions into
  // `src/after/store/*.ts`, applied only when `edition === "full"` (Sub-Phase 41.1).
  databaseSchemas: {},
  databaseRecords: {},
  stateVariables: {},
  animationSamples: {},
  bindings: {},
  databaseLatches: {},
  blueprintGraphs: {},
  activeBlueprintGraphId: "",
  redirectRules: {},
};

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  ...INITIAL_PROJECT_STATE,

  getDataContext: (): DataContext => {
    const state = get();
    const stateVars: Record<string, unknown> = {};
    Object.values(state.stateVariables).forEach((v) => {
      stateVars[v.name] = v.value;
      stateVars[v.id] = v.value;
    });

    return {
      database: state.databaseRecords,
      stateVariables: stateVars,
      urlParams: { ref: "home" },
      localStorage: { theme: "dark" },
    };
  },

  getSnapshot: (): ProjectStateSnapshot => {
    const s = get();
    return {
      projectId: s.projectId,
      projectName: s.projectName,
      scope: s.scope || "element",
      rootArchetype: s.rootArchetype || "button",
      activePageId: s.activePageId,
      pages: s.pages,
      document: getDocument(),
      databaseSchemas: s.databaseSchemas,
      databaseRecords: s.databaseRecords,
      stateVariables: s.stateVariables,
      animationSamples: s.animationSamples,
      bindings: s.bindings,
      databaseLatches: s.databaseLatches || {},
      blueprintGraphs: s.blueprintGraphs || {},
      activeBlueprintGraphId: s.activeBlueprintGraphId || "graph_main_event",
      redirectRules: s.redirectRules || {},
      environment: getEnvironment(),
    };
  },

  restoreSnapshot: (snapshot) => {
    // Accepts snapshots of any schema version: v1 `elements` are migrated to the v2 document.
    const { document, environment, ...rest } = upgradeSnapshot(snapshot as LegacyProjectSnapshot);
    setDocument(document);
    setEnvironment(environment || DEFAULT_ENVIRONMENT_SETTINGS);
    set(rest);
    // Sync connection pipeline
    ConnectionPipeline.clear();
    Object.values(snapshot.bindings || {}).forEach((b) => {
      ConnectionPipeline.registerBinding(b);
    });
  },

  setProjectId: (projectId: string) => set({ projectId }),
  setProjectName: (name: string) => set({ projectName: name }),

  initElementProject: (params) => {
    const arch = isArchetypeId(params.archetype) ? params.archetype : "button";
    const rootElementId = `${getArchetype(arch).idPrefix}_root`;

    // Registry defaults, with the project name used as the element's visible text.
    const rootProperties = getDefaultProps(arch);
    if (params.projectName) {
      if (arch === "button" || arch === "badge") rootProperties["content.label"] = params.projectName;
      else if (arch === "image") rootProperties["media.alt"] = params.projectName;
      else if (arch === "text") rootProperties["content.text"] = params.projectName;
    }

    const newPage: PageDefinition = {
      id: "page_stage",
      name: "Stage",
      slug: "/",
      rootElementId: rootElementId,
    };

    const document = createDocumentFromLayers([
      createLayer({ id: rootElementId, archetype: arch, name: params.projectName || "Root Element", properties: rootProperties }),
    ]);
    const target = params.target ?? {};
    document.exportSettings = {
      ...document.exportSettings,
      ...Object.fromEntries(Object.entries(target).filter(([, v]) => typeof v === "string")),
    };

    setDocument(document);
    set({
      projectId: params.projectId || get().projectId,
      projectName: params.projectName || "MyElementProject",
      scope: "element",
      rootArchetype: arch,
      activePageId: "page_stage",
      pages: {
        page_stage: newPage,
      },
    });

    return rootElementId;
  },

  mountDemoProject: () => {
    const before = get().getSnapshot();
    get().restoreSnapshot(createShowcaseSnapshot());
    recordProjectChange("Mount Showcase Demo", before, { includesDocument: true });
  },

  clearToBlankCanvas: () => {
    const before = get().getSnapshot();
    get().restoreSnapshot(createBlankCanvasSnapshot());
    recordProjectChange("Clear Canvas", before, { includesDocument: true });
  },

  insertGeneratedComponent: (layers, rootId, actionLabel = "Insert AI Component") => {
    recordProjectChange(actionLabel, get().getSnapshot(), { includesDocument: true });

    const state = get();
    const doc = getDocument();
    const nextLayers = { ...doc.layers };
    for (const layer of layers) nextLayers[layer.id] = layer;

    // Attach the component's root under the active page's root layer (both sides of the link).
    const pageRootId = state.pages[state.activePageId]?.rootElementId;
    const pageRoot = pageRootId ? nextLayers[pageRootId] : undefined;
    if (pageRoot && nextLayers[rootId] && rootId !== pageRoot.id) {
      nextLayers[rootId] = { ...nextLayers[rootId], parentId: pageRoot.id };
      if (!pageRoot.children.includes(rootId)) {
        nextLayers[pageRoot.id] = { ...pageRoot, children: [...pageRoot.children, rootId] };
      }
    }

    setDocument({ ...doc, layers: nextLayers });
  },


  registerBinding: (binding, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => ({
      bindings: {
        ...state.bindings,
        [binding.id]: binding,
      },
    }));

    ConnectionPipeline.registerBinding(binding);
    const ctx = get().getDataContext();
    ConnectionPipeline.evaluateElementProperties(binding.target.elementId, ctx);
  },

  unregisterBinding: (bindingId, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => {
      const copy = { ...state.bindings };
      delete copy[bindingId];
      return { bindings: copy };
    });

    ConnectionPipeline.unregisterBinding(bindingId);
  },

  registerAnimationSample: (sample, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => ({
      animationSamples: {
        ...state.animationSamples,
        [sample.id]: sample,
      },
    }));
  },

  // --------------------------------------------------------------------------
  // Page & Route Management: only `setActivePage` is core (Phase 2's single
  // default page needs it in every edition); the multi-page CRUD actions are
  // After-track (`src/after/store/pagesActions.ts`).
  // --------------------------------------------------------------------------
  setActivePage: (pageId: string) => {
    const state = get();
    if (state.pages[pageId]) {
      set({ activePageId: pageId });
    }
  },
}));
