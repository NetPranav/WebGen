/**
 * ============================================================================
 * LOGIC BLUEPRINT DAG SORTER & CYCLE DETECTOR
 * ============================================================================
 * Computes topological execution order of logic graphs, detects circular loops,
 * and emits `[GRAPH_CYCLE_ERR]` diagnostics to Output Log.
 *
 * Architecture Ref: ROADMAP.md §Sub-Phase 3.3
 * ============================================================================
 */

import { DiagnosticBus } from "@/core/engine/DiagnosticBus";

export interface GraphNodeRef {
  id: string;
  type: string;
  title?: string;
}

export interface GraphWireRef {
  id: string;
  sourceNodeId: string;
  sourcePinId: string;
  targetNodeId: string;
  targetPinId: string;
  isExec?: boolean;
}

export interface DAGSortResult {
  hasCycle: boolean;
  sortedNodeIds: string[];
  cycleNodes?: string[];
  error?: string;
  batches: string[][]; // Execution tiers (nodes that can run concurrently/sequentially)
}

export class DAGSorter {
  /**
   * Performs topological sort with cycle detection on a graph structure.
   */
  public static sortGraph(
    nodes: Record<string, GraphNodeRef>,
    wires: GraphWireRef[],
    options?: { execOnly?: boolean; silent?: boolean }
  ): DAGSortResult {
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) {
      return { hasCycle: false, sortedNodeIds: [], batches: [] };
    }

    // Build Adjacency List: Map node -> Array of outgoing connected nodes
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    nodeIds.forEach((id) => {
      adj[id] = [];
      inDegree[id] = 0;
    });

    const activeWires = options?.execOnly
      ? wires.filter((w) => w.isExec)
      : wires;

    activeWires.forEach((w) => {
      if (adj[w.sourceNodeId] && inDegree[w.targetNodeId] !== undefined) {
        if (!adj[w.sourceNodeId].includes(w.targetNodeId)) {
          adj[w.sourceNodeId].push(w.targetNodeId);
          inDegree[w.targetNodeId] = (inDegree[w.targetNodeId] || 0) + 1;
        }
      }
    });

    // 1. Cycle Detection using DFS (3-state coloring)
    // 0 = unvisited, 1 = visiting (on current path), 2 = fully visited
    const state: Record<string, number> = {};
    nodeIds.forEach((id) => (state[id] = 0));
    const cyclePath: string[] = [];

    const dfsDetectCycle = (u: string, path: string[]): boolean => {
      state[u] = 1;
      path.push(u);

      for (const v of adj[u]) {
        if (state[v] === 1) {
          // Cycle found! Extract cycle segment
          const cycleStartIndex = path.indexOf(v);
          cyclePath.push(...path.slice(cycleStartIndex), v);
          return true;
        }
        if (state[v] === 0) {
          if (dfsDetectCycle(v, path)) return true;
        }
      }

      state[u] = 2;
      path.pop();
      return false;
    };

    for (const id of nodeIds) {
      if (state[id] === 0) {
        if (dfsDetectCycle(id, [])) {
          const cycleNames = cyclePath.map((nid) => nodes[nid]?.title || nid);
          const errorMsg = `[GRAPH_CYCLE_ERR] Circular execution loop detected: ${cycleNames.join(" ➔ ")}.`;

          if (!options?.silent) {
            DiagnosticBus.emit({
              channel: "BLUEPRINT_ERR",
              severity: "error",
              source: {
                panel: "Panel 05: Logic Blueprint",
                entityId: cyclePath[0],
              },
              message: errorMsg,
              suggestion: "Break the cycle by removing feedback loops or inserting a condition.",
            });
          }

          return {
            hasCycle: true,
            sortedNodeIds: [],
            cycleNodes: cyclePath,
            error: errorMsg,
            batches: [],
          };
        }
      }
    }

    // 2. Kahn's Algorithm for Topological Sort & Layered Batches
    const sorted: string[] = [];
    const batches: string[][] = [];

    // Current batch: All nodes with inDegree === 0 (Root events / Independent nodes)
    let currentTier: string[] = nodeIds.filter((id) => inDegree[id] === 0);

    const mutableInDegree = { ...inDegree };

    while (currentTier.length > 0) {
      batches.push([...currentTier]);
      const nextTier: string[] = [];

      for (const u of currentTier) {
        sorted.push(u);
        for (const v of adj[u]) {
          mutableInDegree[v]--;
          if (mutableInDegree[v] === 0) {
            nextTier.push(v);
          }
        }
      }

      currentTier = nextTier;
    }

    // Safety check: all nodes accounted for
    const remaining = nodeIds.filter((id) => !sorted.includes(id));
    if (remaining.length > 0) {
      sorted.push(...remaining);
      batches.push(remaining);
    }

    return {
      hasCycle: false,
      sortedNodeIds: sorted,
      batches,
    };
  }

  /**
   * Traces sequential execution steps starting from an Event entry point.
   */
  public static traceExecutionPath(
    startNodeId: string,
    nodes: Record<string, GraphNodeRef>,
    wires: GraphWireRef[]
  ): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const queue = [startNodeId];

    const execWires = wires.filter((w) => w.isExec);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      order.push(current);

      const nextNodes = execWires
        .filter((w) => w.sourceNodeId === current)
        .map((w) => w.targetNodeId);

      queue.push(...nextNodes);
    }

    return order;
  }
}
