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
import { getDefaultProps, isArchetypeId, getArchetype } from "../document/registry";
import { upgradeSnapshot, type DocumentSource } from "../document/migrations";
import { CollectionSchema, DatabaseField } from "../types/database";
import { AnimationSample } from "../types/animations";
import {
  DataBindingDescriptor,
  DataContext,
} from "../types/data-binding";
import { ConnectionPipeline } from "../engine/ConnectionPipeline";
import { StateVariableValidator } from "../engine/StateVariableValidator";
import { EventBus } from "../events/EventBus";
import { useHistoryStore } from "./useHistoryStore";
import {
  BlueprintGraph,
  BlueprintNodeInstance,
  BlueprintWire,
  BlueprintVariable,
  GraphValidationResult,
  ASTManager,
} from "../ast/ASTManager";
import { DiagnosticBus } from "../engine/DiagnosticBus";
import {
  RouteParameter,
  RouteGuard,
  RedirectRule,
  extractRouteParameters,
  normalizeRouteSlug,
} from "../types/routing";
import {
  WorldEnvironmentSettings,
  DEFAULT_ENVIRONMENT_SETTINGS,
  SPRING_PRESETS,
  SpringPresetName,
} from "../types/environment";
import {
  createShowcaseSnapshot,
  createBlankCanvasSnapshot,
} from "../storage/DemoProjectSnapshot";

export type StateVariableScope = "global" | "page" | "component";
export type StateVariableType = "string" | "number" | "boolean" | "json" | "array" | "color";

export interface StateVariable {
  id: string;
  name: string;
  type: StateVariableType;
  value: unknown;
  defaultValue: unknown;
  scope: StateVariableScope;
  componentId?: string; // for component-scoped variables
  description?: string;
  isPersistent?: boolean;
}

export interface DatabaseFunctionLatch {
  id: string;
  targetKey: string; // e.g. "Products.id" or "Products"
  functionName: string;
  category: "blueprint" | "api" | "component" | "action";
  sourceFile: string;
  operation: "READ" | "CREATE" | "UPDATE" | "DELETE";
  description: string;
}

export interface PageDefinition {
  id: string;
  name: string;
  slug: string;
  rootElementId: string;
  isDynamic?: boolean;
  parameters?: RouteParameter[];
  guard?: RouteGuard;
  metaTitle?: string;
  metaDescription?: string;
  layoutId?: string;
  isCustom404?: boolean;
  order?: number;
}

export interface ProjectTargetConfig {
  framework?: string;
  styling?: string;
  animation?: string;
  language?: string;
}

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
function recordProjectChange(label: string, before: ProjectStateSnapshot, options: { includesDocument?: boolean } = {}) {
  useHistoryStore.getState().record({
    actionLabel: label,
    change: { kind: "project", state: pickProjectState(before, options.includesDocument ?? false) },
  });
}

export interface ProjectStoreState extends ProjectStateSnapshot {
  environment: WorldEnvironmentSettings;

  // Actions: Environment Settings (The Top 20)
  updateEnvironment: (
    partial:
      | Partial<WorldEnvironmentSettings>
      | ((prev: WorldEnvironmentSettings) => Partial<WorldEnvironmentSettings>)
  ) => void;
  resetEnvironment: () => void;
  setSpringPreset: (preset: Exclude<SpringPresetName, "custom">) => void;
  toggleInspectMode: () => void;

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

  // Actions: State Variable Management
  addStateVariable: (variable: StateVariable, actionLabel?: string) => void;
  updateStateVariable: (id: string, value: unknown, actionLabel?: string) => void;
  deleteStateVariable: (id: string, actionLabel?: string) => void;

  // Actions: Database Management
  addDatabaseCollection: (schema: CollectionSchema, actionLabel?: string) => void;
  deleteDatabaseCollection: (collectionName: string, actionLabel?: string) => void;
  addFieldToCollection: (collectionName: string, field: DatabaseField, actionLabel?: string) => void;
  deleteFieldFromCollection: (collectionName: string, fieldName: string, actionLabel?: string) => void;
  addDatabaseRecord: (
    collectionName: string,
    record: Record<string, unknown>,
    actionLabel?: string
  ) => void;
  updateDatabaseRecord: (
    collectionName: string,
    recordIndex: number,
    updatedFields: Record<string, unknown>,
    actionLabel?: string
  ) => void;
  deleteDatabaseRecord: (
    collectionName: string,
    recordIndex: number,
    actionLabel?: string
  ) => void;
  addDatabaseLatch: (latch: DatabaseFunctionLatch, actionLabel?: string) => void;
  removeDatabaseLatch: (targetKey: string, latchId: string, actionLabel?: string) => void;

  // Actions: Data Binding Management
  registerBinding: (binding: DataBindingDescriptor, actionLabel?: string) => void;
  unregisterBinding: (bindingId: string, actionLabel?: string) => void;

  // Actions: Animation Sample Management
  registerAnimationSample: (sample: AnimationSample, actionLabel?: string) => void;

  // Actions: Blueprint AST Management
  createBlueprintGraph: (
    name: string,
    type?: "event" | "function" | "macro",
    actionLabel?: string
  ) => string;
  setActiveBlueprintGraph: (graphId: string) => void;
  addBlueprintNode: (
    graphId: string,
    typeId: string,
    position: { x: number; y: number },
    customParams?: Record<string, unknown>,
    actionLabel?: string
  ) => BlueprintNodeInstance;
  removeBlueprintNode: (graphId: string, nodeId: string, actionLabel?: string) => void;
  moveBlueprintNode: (
    graphId: string,
    nodeId: string,
    position: { x: number; y: number },
    actionLabel?: string
  ) => void;
  connectBlueprintPins: (
    graphId: string,
    sourceNodeId: string,
    sourcePinId: string,
    targetNodeId: string,
    targetPinId: string,
    actionLabel?: string
  ) => { success: boolean; error?: string };
  disconnectBlueprintWire: (graphId: string, wireId: string, actionLabel?: string) => void;
  setBlueprintPinValue: (
    graphId: string,
    nodeId: string,
    pinId: string,
    value: unknown,
    actionLabel?: string
  ) => void;
  addBlueprintVariable: (
    graphId: string,
    variable: Omit<BlueprintVariable, "id">,
    actionLabel?: string
  ) => void;
  updateBlueprintVariable: (
    graphId: string,
    varId: string,
    updates: Partial<BlueprintVariable>,
    actionLabel?: string
  ) => void;
  removeBlueprintVariable: (graphId: string, varId: string, actionLabel?: string) => void;
  compileActiveBlueprintGraph: () => GraphValidationResult;
  loadBlueprintGraph: (graph: BlueprintGraph, actionLabel?: string) => void;

  // Actions: Page & Route Management
  setActivePage: (pageId: string) => void;
  addPage: (
    page: Omit<PageDefinition, "id" | "rootElementId"> & { id?: string; rootElementId?: string },
    rootElement?: Layer,
    actionLabel?: string
  ) => string;
  updatePage: (pageId: string, updates: Partial<PageDefinition>, actionLabel?: string) => void;
  deletePage: (pageId: string, actionLabel?: string) => void;
  duplicatePage: (pageId: string, actionLabel?: string) => string;
  detectRouteCollisions: () => string[];

  // Actions: Redirect Rule Management
  addRedirectRule: (rule: Omit<RedirectRule, "id"> & { id?: string }, actionLabel?: string) => string;
  updateRedirectRule: (id: string, updates: Partial<RedirectRule>, actionLabel?: string) => void;
  deleteRedirectRule: (id: string, actionLabel?: string) => void;

  // System Helpers
  getDataContext: () => DataContext;
  getSnapshot: () => ProjectStateSnapshot;
  /** Restores a snapshot; v1 snapshots (with `elements`) are migrated on the way in. */
  restoreSnapshot: (snapshot: ProjectStateSnapshot | LegacyProjectSnapshot) => void;
}

const INITIAL_PROJECT_STATE: ProjectStateSnapshot = {
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
  document: createDocumentFromLayers([
    createLayer({
      id: "el_root_container",
      archetype: "container",
      name: "RootContainer",
      children: ["el_hero_heading", "el_buy_button"],
      properties: { "layout.display": "flex", "layout.flexDirection": "column", "layout.gap": 16, "layout.padding": 24 },
    }),
    createLayer({
      id: "el_hero_heading",
      archetype: "text",
      name: "HeroHeading",
      parentId: "el_root_container",
      properties: {
        "content.text": "Unreal Engine for Web Applications",
        "typography.fontSize": 32,
        "typography.fontWeight": 700,
        "typography.color": "#ffffff",
      },
    }),
    createLayer({
      id: "el_buy_button",
      archetype: "button",
      name: "BuyButton",
      parentId: "el_root_container",
      properties: { "content.label": "Get Started Free", "interaction.disabled": false, "appearance.background.color": "#206859" },
    }),
  ]),
  databaseSchemas: {
    Products: {
      id: "col_products",
      name: "Products",
      displayName: "Products",
      fields: {
        id: { id: "f_id", name: "id", type: "Int", isPrimaryKey: true },
        title: { id: "f_title", name: "title", type: "String" },
        price: { id: "f_price", name: "price", type: "Float" },
        inStock: { id: "f_stock", name: "inStock", type: "Boolean" },
      },
    },
  },
  databaseRecords: {
    Products: [
      { id: 1, title: "Pro Subscription", price: 29.99, inStock: true },
      { id: 2, title: "Enterprise License", price: 199.0, inStock: true },
    ],
  },
  stateVariables: {
    cartTotal: {
      id: "cartTotal",
      name: "cartTotal",
      type: "number",
      value: 0,
      defaultValue: 0,
      scope: "global",
      description: "Total value of items in checkout",
    },
    isUserLoggedIn: {
      id: "isUserLoggedIn",
      name: "isUserLoggedIn",
      type: "boolean",
      value: false,
      defaultValue: false,
      scope: "global",
      description: "Current authentication status",
    },
  },
  animationSamples: {},
  bindings: {},
  databaseLatches: {},
  blueprintGraphs: {
    graph_main_event: {
      id: "graph_main_event",
      name: "Main Event Graph",
      type: "event",
      nodes: {
        node_evt_click: {
          id: "node_evt_click",
          type: "event/onClick",
          title: "On Click",
          position: { x: 40, y: 120 },
          customParams: {},
          pinValues: {},
        },
        node_db_query: {
          id: "node_db_query",
          type: "database/query",
          title: "Query Collection",
          position: { x: 330, y: 100 },
          customParams: {},
          pinValues: { collection: "Products", limit: 10 },
        },
        node_flow_branch: {
          id: "node_flow_branch",
          type: "flow/branch",
          title: "Branch",
          position: { x: 620, y: 100 },
          customParams: {},
          pinValues: {},
        },
        node_print_success: {
          id: "node_print_success",
          type: "utility/printString",
          title: "Print String",
          position: { x: 910, y: 60 },
          customParams: {},
          pinValues: { text: "Products loaded successfully!" },
        },
        node_print_fail: {
          id: "node_print_fail",
          type: "utility/printString",
          title: "Print String",
          position: { x: 910, y: 220 },
          customParams: {},
          pinValues: { text: "Failed to fetch products" },
        },
      },
      wires: [
        {
          id: "wire_1",
          sourceNodeId: "node_evt_click",
          sourcePinId: "exec",
          targetNodeId: "node_db_query",
          targetPinId: "execIn",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "wire_2",
          sourceNodeId: "node_db_query",
          sourcePinId: "execOut",
          targetNodeId: "node_flow_branch",
          targetPinId: "execIn",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "wire_2b",
          sourceNodeId: "node_db_query",
          sourcePinId: "success",
          targetNodeId: "node_flow_branch",
          targetPinId: "condition",
          pinType: "boolean",
          isExec: false,
        },
        {
          id: "wire_3",
          sourceNodeId: "node_flow_branch",
          sourcePinId: "trueExec",
          targetNodeId: "node_print_success",
          targetPinId: "execIn",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "wire_4",
          sourceNodeId: "node_flow_branch",
          sourcePinId: "falseExec",
          targetNodeId: "node_print_fail",
          targetPinId: "execIn",
          pinType: "exec",
          isExec: true,
        },
      ],
      variables: [
        {
          id: "var_is_admin",
          name: "isAdmin",
          type: "boolean",
          defaultValue: false,
          category: "Security",
          description: "Admin privileges check",
        },
        {
          id: "var_retry_count",
          name: "retryCount",
          type: "number",
          defaultValue: 3,
          category: "Network",
          description: "Max network retry attempts",
        },
      ],
      metadata: {
        schemaVersion: "1.0.0",
        description: "Default application event flow graph",
        updatedAt: new Date().toISOString(),
      },
    },
  },
  activeBlueprintGraphId: "graph_main_event",
  redirectRules: {},
  environment: DEFAULT_ENVIRONMENT_SETTINGS,
};

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  ...INITIAL_PROJECT_STATE,
  // Snapshots keep `environment` optional for pre-environment saves; live state always has it.
  environment: INITIAL_PROJECT_STATE.environment ?? DEFAULT_ENVIRONMENT_SETTINGS,

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
      document: s.document,
      databaseSchemas: s.databaseSchemas,
      databaseRecords: s.databaseRecords,
      stateVariables: s.stateVariables,
      animationSamples: s.animationSamples,
      bindings: s.bindings,
      databaseLatches: s.databaseLatches || {},
      blueprintGraphs: s.blueprintGraphs || {},
      activeBlueprintGraphId: s.activeBlueprintGraphId || "graph_main_event",
      redirectRules: s.redirectRules || {},
      environment: s.environment || DEFAULT_ENVIRONMENT_SETTINGS,
    };
  },

  restoreSnapshot: (snapshot) => {
    // Accepts snapshots of any schema version: v1 `elements` are migrated to the v2 document.
    set({
      ...upgradeSnapshot(snapshot as LegacyProjectSnapshot),
      environment: snapshot.environment || DEFAULT_ENVIRONMENT_SETTINGS,
    });
    // Sync connection pipeline
    ConnectionPipeline.clear();
    Object.values(snapshot.bindings || {}).forEach((b) => {
      ConnectionPipeline.registerBinding(b);
    });
  },

  updateEnvironment: (partial) => {
    set((state) => {
      const nextEnv = typeof partial === "function" ? partial(state.environment) : partial;
      const merged: WorldEnvironmentSettings = {
        ...state.environment,
        ...nextEnv,
        viewport: {
          ...state.environment.viewport,
          ...(nextEnv.viewport || {}),
          pan: {
            ...state.environment.viewport.pan,
            ...(nextEnv.viewport?.pan || {}),
          },
          zoom: {
            ...state.environment.viewport.zoom,
            ...(nextEnv.viewport?.zoom || {}),
          },
          grid: {
            ...state.environment.viewport.grid,
            ...(nextEnv.viewport?.grid || {}),
          },
          axes: {
            ...state.environment.viewport.axes,
            ...(nextEnv.viewport?.axes || {}),
          },
        },
        elements: {
          ...state.environment.elements,
          ...(nextEnv.elements || {}),
        },
        snapping: {
          ...state.environment.snapping,
          ...(nextEnv.snapping || {}),
          details: {
            ...state.environment.snapping.details,
            ...(nextEnv.snapping?.details || {}),
          },
        },
        theme: {
          ...state.environment.theme,
          ...(nextEnv.theme || {}),
          typography: {
            ...state.environment.theme.typography,
            ...(nextEnv.theme?.typography || {}),
          },
        },
        motion: {
          ...state.environment.motion,
          ...(nextEnv.motion || {}),
          spring: {
            ...state.environment.motion.spring,
            ...(nextEnv.motion?.spring || {}),
          },
        },
        diagnostics: {
          ...state.environment.diagnostics,
          ...(nextEnv.diagnostics || {}),
        },
      };
      return { environment: merged };
    });
  },

  resetEnvironment: () => {
    set({ environment: DEFAULT_ENVIRONMENT_SETTINGS });
  },

  setSpringPreset: (preset) => {
    const springVals = SPRING_PRESETS[preset];
    if (!springVals) return;
    set((state) => ({
      environment: {
        ...state.environment,
        motion: {
          ...state.environment.motion,
          springPreset: preset,
          spring: { ...springVals },
        },
      },
    }));
  },

  toggleInspectMode: () => {
    set((state) => ({
      environment: {
        ...state.environment,
        diagnostics: {
          ...state.environment.diagnostics,
          inspectMode: !state.environment.diagnostics.inspectMode,
        },
      },
    }));
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

    set({
      projectId: params.projectId || get().projectId,
      projectName: params.projectName || "MyElementProject",
      scope: "element",
      rootArchetype: arch,
      activePageId: "page_stage",
      pages: {
        page_stage: newPage,
      },
      document,
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

    set((state) => {
      const nextLayers = { ...state.document.layers };
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

      return { document: { ...state.document, layers: nextLayers } };
    });
  },


  addStateVariable: (variable, actionLabel) => {
    // Validate value against declared type and dispatch diagnostic if mismatch
    const validated = StateVariableValidator.validateAndEmit(
      variable.name || variable.id,
      variable.type,
      variable.value,
      variable.scope
    );

    const sanitizedVar: StateVariable = {
      ...variable,
      value: validated.parsedValue,
      defaultValue: validated.parsedValue,
    };

    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => ({
      stateVariables: {
        ...state.stateVariables,
        [sanitizedVar.id]: sanitizedVar,
      },
    }));

    EventBus.emit("state:changed", { variableId: sanitizedVar.id, value: sanitizedVar.value });

    // Trigger reactive evaluation on connection pipeline
    const ctx = get().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  updateStateVariable: (id, value, actionLabel) => {
    const current = get().stateVariables[id];
    let sanitizedValue = value;

    if (current) {
      const validated = StateVariableValidator.validateAndEmit(
        current.name || id,
        current.type,
        value,
        current.scope
      );
      sanitizedValue = validated.parsedValue;
    }

    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => {
      const curr = state.stateVariables[id];
      if (!curr) return state;

      return {
        stateVariables: {
          ...state.stateVariables,
          [id]: {
            ...curr,
            value: sanitizedValue,
          },
        },
      };
    });

    EventBus.emit("state:changed", { variableId: id, value: sanitizedValue });

    // Trigger reactive evaluation on connection pipeline
    const ctx = get().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  deleteStateVariable: (id, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => {
      const copy = { ...state.stateVariables };
      delete copy[id];
      return { stateVariables: copy };
    });
  },

  addDatabaseCollection: (schema, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => ({
      databaseSchemas: {
        ...state.databaseSchemas,
        [schema.name]: schema,
      },
    }));

    EventBus.emit("database:updated", { collectionName: schema.name });
  },

  deleteDatabaseCollection: (collectionName, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => {
      const schemas = { ...state.databaseSchemas };
      delete schemas[collectionName];
      const records = { ...state.databaseRecords };
      delete records[collectionName];
      return { databaseSchemas: schemas, databaseRecords: records };
    });

    EventBus.emit("database:updated", { collectionName });
  },

  addFieldToCollection: (collectionName, field, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => {
      const schema = state.databaseSchemas[collectionName];
      if (!schema) return state;

      return {
        databaseSchemas: {
          ...state.databaseSchemas,
          [collectionName]: {
            ...schema,
            fields: {
              ...schema.fields,
              [field.name]: field,
            },
          },
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });
  },

  deleteFieldFromCollection: (collectionName, fieldName, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => {
      const schema = state.databaseSchemas[collectionName];
      if (!schema) return state;

      const fields = { ...schema.fields };
      delete fields[fieldName];

      return {
        databaseSchemas: {
          ...state.databaseSchemas,
          [collectionName]: {
            ...schema,
            fields,
          },
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });
  },

  addDatabaseRecord: (collectionName, record, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => {
      const existing = state.databaseRecords[collectionName] || [];
      return {
        databaseRecords: {
          ...state.databaseRecords,
          [collectionName]: [...existing, record],
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });

    // Trigger reactive evaluation
    const ctx = get().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  updateDatabaseRecord: (collectionName, recordIndex, updatedFields, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => {
      const existing = [...(state.databaseRecords[collectionName] || [])];
      if (!existing[recordIndex]) return state;

      existing[recordIndex] = {
        ...existing[recordIndex],
        ...updatedFields,
      };

      return {
        databaseRecords: {
          ...state.databaseRecords,
          [collectionName]: existing,
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });

    // Trigger reactive evaluation
    const ctx = get().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  deleteDatabaseRecord: (collectionName, recordIndex, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((state) => {
      const existing = [...(state.databaseRecords[collectionName] || [])];
      existing.splice(recordIndex, 1);

      return {
        databaseRecords: {
          ...state.databaseRecords,
          [collectionName]: existing,
        },
      };
    });

    EventBus.emit("database:updated", { collectionName });

    // Trigger reactive evaluation
    const ctx = get().getDataContext();
    ConnectionPipeline.evaluateAll(ctx);
  },

  addDatabaseLatch: (latch, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    set((state) => ({
      databaseLatches: {
        ...state.databaseLatches,
        [latch.targetKey]: [...(state.databaseLatches[latch.targetKey] || []), latch],
      },
    }));
    EventBus.emit("database:latched", { targetKey: latch.targetKey, latch });
  },

  removeDatabaseLatch: (targetKey, latchId, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    set((state) => ({
      databaseLatches: {
        ...state.databaseLatches,
        [targetKey]: (state.databaseLatches[targetKey] || []).filter((l) => l.id !== latchId),
      },
    }));
    EventBus.emit("database:unlatched", { targetKey, latchId });
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

  // Blueprint AST Actions
  createBlueprintGraph: (name, type = "event", actionLabel) => {
    const graphId = `graph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newGraph = ASTManager.createGraph(graphId, name, type);
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    set((state) => ({
      blueprintGraphs: {
        ...state.blueprintGraphs,
        [graphId]: newGraph,
      },
      activeBlueprintGraphId: graphId,
    }));
    return graphId;
  },

  setActiveBlueprintGraph: (graphId) => {
    set({ activeBlueprintGraphId: graphId });
  },

  addBlueprintNode: (graphId, typeId, position, customParams, actionLabel) => {
    const state = get();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) {
      throw new Error(`Blueprint graph '${graphId}' not found.`);
    }
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const { graph: updatedGraph, node } = ASTManager.addNode(graph, typeId, position, customParams);
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
    return node;
  },

  removeBlueprintNode: (graphId, nodeId, actionLabel) => {
    const state = get();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.removeNode(graph, nodeId);
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  moveBlueprintNode: (graphId, nodeId, position, actionLabel) => {
    const state = get();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    if (actionLabel) {
      const snapshot = state.getSnapshot();
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.moveNode(graph, nodeId, position);
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  connectBlueprintPins: (graphId, sourceNodeId, sourcePinId, targetNodeId, targetPinId, actionLabel) => {
    const state = get();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return { success: false, error: "Graph not found." };
    const snapshot = state.getSnapshot();
    const result = ASTManager.connectPins(graph, sourceNodeId, sourcePinId, targetNodeId, targetPinId);
    if (!result.wire) {
      return { success: false, error: result.error || "Failed to connect pins." };
    }
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: result.graph,
      },
    }));
    return { success: true };
  },

  disconnectBlueprintWire: (graphId, wireId, actionLabel) => {
    const state = get();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.disconnectWire(graph, wireId);
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  setBlueprintPinValue: (graphId, nodeId, pinId, value, actionLabel) => {
    const state = get();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    if (actionLabel) {
      const snapshot = state.getSnapshot();
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.setPinLiteralValue(graph, nodeId, pinId, value);
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  addBlueprintVariable: (graphId, variable, actionLabel) => {
    const state = get();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const { graph: updatedGraph } = ASTManager.addVariable(graph, variable);
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  updateBlueprintVariable: (graphId, varId, updates, actionLabel) => {
    const state = get();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.updateVariable(graph, varId, updates);
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  removeBlueprintVariable: (graphId, varId, actionLabel) => {
    const state = get();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.removeVariable(graph, varId);
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  compileActiveBlueprintGraph: () => {
    const state = get();
    const graph = state.blueprintGraphs[state.activeBlueprintGraphId];
    if (!graph) {
      return {
        isValid: false,
        issues: [
          {
            id: "issue_no_graph",
            severity: "error",
            code: "GRAPH_NOT_FOUND",
            message: "No active blueprint graph selected for compilation.",
          },
        ],
      };
    }
    return ASTManager.validateGraph(graph);
  },

  loadBlueprintGraph: (graph, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graph.id]: graph,
      },
      activeBlueprintGraphId: graph.id,
    }));
  },

  // --------------------------------------------------------------------------
  // Page & Route Management Actions
  // --------------------------------------------------------------------------
  setActivePage: (pageId: string) => {
    const state = get();
    if (state.pages[pageId]) {
      set({ activePageId: pageId });
    }
  },

  addPage: (pageData, rootElement, actionLabel) => {
    const snapshot = get().getSnapshot();
    const pageId = pageData.id || `page_${Math.random().toString(36).substring(2, 9)}`;
    const rootElId = pageData.rootElementId || rootElement?.id || `root_${pageId}`;
    const normalizedSlug = normalizeRouteSlug(pageData.slug);
    const parsedParams = extractRouteParameters(normalizedSlug);

    const newPage: PageDefinition = {
      id: pageId,
      name: pageData.name || "Untitled Page",
      slug: normalizedSlug,
      rootElementId: rootElId,
      isDynamic: parsedParams.length > 0,
      parameters: pageData.parameters || parsedParams,
      guard: pageData.guard || { type: "public" },
      metaTitle: pageData.metaTitle || pageData.name,
      metaDescription: pageData.metaDescription || "",
      isCustom404: pageData.isCustom404 || false,
      order: pageData.order ?? Object.keys(snapshot.pages).length,
    };

    const newRootElement: Layer =
      rootElement ??
      createLayer({
        id: rootElId,
        archetype: "container",
        name: `${newPage.name} Container`,
        properties: { "layout.display": "flex", "layout.flexDirection": "column", "layout.minHeight": "100vh", "layout.padding": 24 },
      });

    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot, { includesDocument: true });
    }

    set((s) => ({
      pages: {
        ...s.pages,
        [pageId]: newPage,
      },
      document: { ...s.document, layers: { ...s.document.layers, [newRootElement.id]: newRootElement } },
      activePageId: pageId,
    }));

    get().detectRouteCollisions();
    return pageId;
  },

  updatePage: (pageId: string, updates: Partial<PageDefinition>, actionLabel) => {
    const state = get();
    const existingPage = state.pages[pageId];
    if (!existingPage) return;

    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    const updatedSlug = updates.slug !== undefined ? normalizeRouteSlug(updates.slug) : existingPage.slug;
    const parsedParams = updates.slug !== undefined ? extractRouteParameters(updatedSlug) : (existingPage.parameters || []);

    const mergedPage: PageDefinition = {
      ...existingPage,
      ...updates,
      slug: updatedSlug,
      isDynamic: parsedParams.length > 0,
      parameters: updates.parameters || parsedParams,
    };

    set((s) => ({
      pages: {
        ...s.pages,
        [pageId]: mergedPage,
      },
    }));

    get().detectRouteCollisions();
  },

  deletePage: (pageId: string, actionLabel) => {
    const state = get();
    const pageKeys = Object.keys(state.pages);
    if (pageKeys.length <= 1) {
      console.warn("[ProjectStore] Cannot delete the last remaining page.");
      return;
    }

    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    const nextPages = { ...state.pages };
    delete nextPages[pageId];

    let nextActiveId = state.activePageId;
    if (state.activePageId === pageId) {
      nextActiveId = Object.keys(nextPages)[0];
    }

    set({
      pages: nextPages,
      activePageId: nextActiveId,
    });

    get().detectRouteCollisions();
  },

  duplicatePage: (pageId: string, actionLabel) => {
    const state = get();
    const originalPage = state.pages[pageId];
    if (!originalPage) return "";

    const snapshot = state.getSnapshot();
    const newPageId = `page_${Math.random().toString(36).substring(2, 9)}`;
    const newRootId = `root_${newPageId}`;

    let duplicateSlug = `${originalPage.slug}-copy`;
    if (originalPage.slug === "/") duplicateSlug = "/home-copy";

    const duplicatedPage: PageDefinition = {
      ...originalPage,
      id: newPageId,
      name: `${originalPage.name} (Copy)`,
      slug: normalizeRouteSlug(duplicateSlug),
      rootElementId: newRootId,
    };

    // Duplicate root element
    const originalRoot = state.document.layers[originalPage.rootElementId];
    const duplicatedRoot: Layer = originalRoot
      ? { ...originalRoot, id: newRootId, name: `${originalRoot.name} (Copy)`, parentId: null, children: [] }
      : createLayer({ id: newRootId, archetype: "container", name: `${duplicatedPage.name} Container`, properties: {} });

    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot, { includesDocument: true });
    }

    set((s) => ({
      pages: {
        ...s.pages,
        [newPageId]: duplicatedPage,
      },
      document: { ...s.document, layers: { ...s.document.layers, [newRootId]: duplicatedRoot } },
      activePageId: newPageId,
    }));

    get().detectRouteCollisions();
    return newPageId;
  },

  detectRouteCollisions: (): string[] => {
    const state = get();
    const slugMap = new Map<string, string>();
    const collisions: string[] = [];

    for (const page of Object.values(state.pages)) {
      const normalized = normalizeRouteSlug(page.slug);
      // Generalized pattern replacing [param] or :param with a placeholder token
      const pattern = normalized.replace(/\[[^\]]+\]/g, ":param").replace(/:[a-zA-Z0-9_]+/g, ":param");

      if (slugMap.has(pattern)) {
        const conflictingId = slugMap.get(pattern)!;
        const conflictingPage = state.pages[conflictingId];
        const msg = `Route collision detected between "${page.name}" (${page.slug}) and "${conflictingPage?.name || conflictingId}" (${conflictingPage?.slug || ""})`;
        collisions.push(msg);

        DiagnosticBus.emit({
          channel: "ROUTE_COLLISION",
          severity: "error",
          source: {
            panel: "Panel 30: Pages & Routing Manager",
            entityId: page.id,
            entityName: page.name,
          },
          message: msg,
          suggestion: `Ensure every page has a unique route path or distinct dynamic prefix.`,
        });
      } else {
        slugMap.set(pattern, page.id);
      }
    }

    return collisions;
  },

  // --------------------------------------------------------------------------
  // Redirect Rule Management Actions
  // --------------------------------------------------------------------------
  addRedirectRule: (ruleData, actionLabel) => {
    const snapshot = get().getSnapshot();
    const id = ruleData.id || `redir_${Math.random().toString(36).substring(2, 9)}`;
    const rule: RedirectRule = {
      id,
      sourcePattern: normalizeRouteSlug(ruleData.sourcePattern),
      targetPattern: normalizeRouteSlug(ruleData.targetPattern),
      statusCode: ruleData.statusCode || 308,
      description: ruleData.description || "",
      isActive: ruleData.isActive ?? true,
    };

    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((s) => ({
      redirectRules: {
        ...s.redirectRules,
        [id]: rule,
      },
    }));

    return id;
  },

  updateRedirectRule: (id: string, updates: Partial<RedirectRule>, actionLabel) => {
    const state = get();
    const existing = state.redirectRules[id];
    if (!existing) return;

    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    set((s) => ({
      redirectRules: {
        ...s.redirectRules,
        [id]: {
          ...existing,
          ...updates,
          sourcePattern: updates.sourcePattern ? normalizeRouteSlug(updates.sourcePattern) : existing.sourcePattern,
          targetPattern: updates.targetPattern ? normalizeRouteSlug(updates.targetPattern) : existing.targetPattern,
        },
      },
    }));
  },

  deleteRedirectRule: (id: string, actionLabel) => {
    const state = get();
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }

    const nextRules = { ...state.redirectRules };
    delete nextRules[id];

    set({ redirectRules: nextRules });
  },
}));
