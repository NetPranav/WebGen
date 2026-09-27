"use client";

/**
 * ============================================================================
 * AFTER-TRACK: BLUEPRINT ACTIONS (ROADMAP Sub-Phase 41.1)
 * ============================================================================
 * `blueprintGraphs`/`activeBlueprintGraphId` stay plain (empty-by-default)
 * fields on `useProjectStore`. Only the *mutation* actions are After-track:
 * importing this module attaches them to the live store. It is imported
 * exactly once, as a side effect, from `src/editor/shell/afterTrackPanels.tsx`'s
 * `edition === "full"` branch — never imported anywhere reachable from the
 * Initial edition, so it (and everything it pulls in, including `ASTManager`)
 * is absent from an `edition=initial` production bundle (verified the same
 * way panels are, see `scripts/check-bundle-scope.mts`).
 *
 * `setActiveBlueprintGraph` has one Initial-edition-reachable call site
 * (`GlobalSearchEngine.ts`'s `navigateTo`, for a blueprint-node search
 * result) — guarded there with `?.()` since it's only ever undefined when
 * `blueprintGraphs` is also always empty (no blueprint-node result can exist
 * without this module registered), so the guard is defensive, not load-bearing.
 * ============================================================================
 */

import { recordProjectChange, useProjectStore } from "@/core/store/useProjectStore";
import { ASTManager } from "@/core/ast/ASTManager";

// The Full edition's demo seed data (moved verbatim off `INITIAL_PROJECT_STATE`).
useProjectStore.setState({
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
});

useProjectStore.setState({
  createBlueprintGraph: (name, type = "event", actionLabel) => {
    const graphId = `graph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newGraph = ASTManager.createGraph(graphId, name, type);
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    useProjectStore.setState((state) => ({
      blueprintGraphs: {
        ...state.blueprintGraphs,
        [graphId]: newGraph,
      },
      activeBlueprintGraphId: graphId,
    }));
    return graphId;
  },

  setActiveBlueprintGraph: (graphId) => {
    useProjectStore.setState({ activeBlueprintGraphId: graphId });
  },

  addBlueprintNode: (graphId, typeId, position, customParams, actionLabel) => {
    const state = useProjectStore.getState();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) {
      throw new Error(`Blueprint graph '${graphId}' not found.`);
    }
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const { graph: updatedGraph, node } = ASTManager.addNode(graph, typeId, position, customParams);
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
    return node;
  },

  removeBlueprintNode: (graphId, nodeId, actionLabel) => {
    const state = useProjectStore.getState();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.removeNode(graph, nodeId);
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  moveBlueprintNode: (graphId, nodeId, position, actionLabel) => {
    const state = useProjectStore.getState();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    if (actionLabel) {
      const snapshot = state.getSnapshot();
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.moveNode(graph, nodeId, position);
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  connectBlueprintPins: (graphId, sourceNodeId, sourcePinId, targetNodeId, targetPinId, actionLabel) => {
    const state = useProjectStore.getState();
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
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: result.graph,
      },
    }));
    return { success: true };
  },

  disconnectBlueprintWire: (graphId, wireId, actionLabel) => {
    const state = useProjectStore.getState();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.disconnectWire(graph, wireId);
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  setBlueprintPinValue: (graphId, nodeId, pinId, value, actionLabel) => {
    const state = useProjectStore.getState();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    if (actionLabel) {
      const snapshot = state.getSnapshot();
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.setPinLiteralValue(graph, nodeId, pinId, value);
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  addBlueprintVariable: (graphId, variable, actionLabel) => {
    const state = useProjectStore.getState();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const { graph: updatedGraph } = ASTManager.addVariable(graph, variable);
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  updateBlueprintVariable: (graphId, varId, updates, actionLabel) => {
    const state = useProjectStore.getState();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.updateVariable(graph, varId, updates);
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  removeBlueprintVariable: (graphId, varId, actionLabel) => {
    const state = useProjectStore.getState();
    const graph = state.blueprintGraphs[graphId];
    if (!graph) return;
    const snapshot = state.getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    const updatedGraph = ASTManager.removeVariable(graph, varId);
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graphId]: updatedGraph,
      },
    }));
  },

  compileActiveBlueprintGraph: () => {
    const state = useProjectStore.getState();
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
    const snapshot = useProjectStore.getState().getSnapshot();
    if (actionLabel) {
      recordProjectChange(actionLabel, snapshot);
    }
    useProjectStore.setState((s) => ({
      blueprintGraphs: {
        ...s.blueprintGraphs,
        [graph.id]: graph,
      },
      activeBlueprintGraphId: graph.id,
    }));
  },
});
