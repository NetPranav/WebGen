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
import { ElementType } from "../types/element-sections";
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

export interface ProjectElement {
  id: string;
  name: string;
  archetype: ElementType;
  parentId: string | null;
  properties: Record<string, unknown>;
  children: string[];
}

export interface PageDefinition {
  id: string;
  name: string;
  slug: string;
  rootElementId: string;
}

export interface ProjectStateSnapshot {
  projectName: string;
  activePageId: string;
  pages: Record<string, PageDefinition>;
  elements: Record<string, ProjectElement>;
  databaseSchemas: Record<string, CollectionSchema>;
  databaseRecords: Record<string, Record<string, unknown>[]>;
  stateVariables: Record<string, StateVariable>;
  animationSamples: Record<string, AnimationSample>;
  bindings: Record<string, DataBindingDescriptor>;
  databaseLatches: Record<string, DatabaseFunctionLatch[]>;
  blueprintGraphs: Record<string, BlueprintGraph>;
  activeBlueprintGraphId: string;
}

export interface ProjectStoreState extends ProjectStateSnapshot {
  // Actions: Element Management
  setElementProperty: (
    elementId: string,
    propertyKey: string,
    value: unknown,
    actionLabel?: string
  ) => void;
  addElement: (element: ProjectElement, actionLabel?: string) => void;
  removeElement: (elementId: string, actionLabel?: string) => void;

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

  // System Helpers
  getDataContext: () => DataContext;
  getSnapshot: () => ProjectStateSnapshot;
  restoreSnapshot: (snapshot: ProjectStateSnapshot) => void;
  undo: () => void;
  redo: () => void;
}

const INITIAL_PROJECT_STATE: ProjectStateSnapshot = {
  projectName: "Visual Web App",
  activePageId: "page_home",
  pages: {
    page_home: {
      id: "page_home",
      name: "Home",
      slug: "/",
      rootElementId: "el_root_container",
    },
  },
  elements: {
    el_root_container: {
      id: "el_root_container",
      name: "RootContainer",
      archetype: "container",
      parentId: null,
      properties: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 24,
      },
      children: ["el_hero_heading", "el_buy_button"],
    },
    el_hero_heading: {
      id: "el_hero_heading",
      name: "HeroHeading",
      archetype: "text",
      parentId: "el_root_container",
      properties: {
        textContent: "Unreal Engine for Web Applications",
        fontSize: 32,
        fontWeight: 700,
        color: "#ffffff",
      },
      children: [],
    },
    el_buy_button: {
      id: "el_buy_button",
      name: "BuyButton",
      archetype: "button",
      parentId: "el_root_container",
      properties: {
        label: "Get Started Free",
        disabled: false,
        backgroundColor: "#206859",
      },
      children: [],
    },
  },
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
      projectName: s.projectName,
      activePageId: s.activePageId,
      pages: s.pages,
      elements: s.elements,
      databaseSchemas: s.databaseSchemas,
      databaseRecords: s.databaseRecords,
      stateVariables: s.stateVariables,
      animationSamples: s.animationSamples,
      bindings: s.bindings,
      databaseLatches: s.databaseLatches || {},
      blueprintGraphs: s.blueprintGraphs || {},
      activeBlueprintGraphId: s.activeBlueprintGraphId || "graph_main_event",
    };
  },

  restoreSnapshot: (snapshot: ProjectStateSnapshot) => {
    set(snapshot);
    // Sync connection pipeline
    ConnectionPipeline.clear();
    Object.values(snapshot.bindings).forEach((b) => {
      ConnectionPipeline.registerBinding(b);
    });
  },

  setElementProperty: (elementId, propertyKey, value, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      useHistoryStore.getState().pushState(actionLabel, snapshot);
    }

    set((state) => {
      const element = state.elements[elementId];
      if (!element) return state;

      return {
        elements: {
          ...state.elements,
          [elementId]: {
            ...element,
            properties: {
              ...element.properties,
              [propertyKey]: value,
            },
          },
        },
      };
    });

    EventBus.emit("element:modified", { elementId, propertyKey, value });
  },

  addElement: (element, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      useHistoryStore.getState().pushState(actionLabel, snapshot);
    }

    set((state) => ({
      elements: {
        ...state.elements,
        [element.id]: element,
      },
    }));
  },

  removeElement: (elementId, actionLabel) => {
    const snapshot = get().getSnapshot();
    if (actionLabel) {
      useHistoryStore.getState().pushState(actionLabel, snapshot);
    }

    set((state) => {
      const copy = { ...state.elements };
      delete copy[elementId];
      return { elements: copy };
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
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
      useHistoryStore.getState().pushState(actionLabel, snapshot);
    }
    set((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graph.id]: graph,
      },
      activeBlueprintGraphId: graph.id,
    }));
  },

  undo: () => {
    const currentSnapshot = get().getSnapshot();
    const previousSnapshot = useHistoryStore.getState().undo(currentSnapshot) as ProjectStateSnapshot | null;
    if (previousSnapshot) {
      get().restoreSnapshot(previousSnapshot);
    }
  },

  redo: () => {
    const currentSnapshot = get().getSnapshot();
    const nextSnapshot = useHistoryStore.getState().redo(currentSnapshot) as ProjectStateSnapshot | null;
    if (nextSnapshot) {
      get().restoreSnapshot(nextSnapshot);
    }
  },
}));
