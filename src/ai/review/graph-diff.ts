/**
 * ============================================================================
 * BLUEPRINT GRAPH DIFF & SELECTIVE MERGE ENGINE
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 6.5
 *
 * Enforces the "No Silent AI Writes Law":
 * - Calculates semantic node and wire additions, modifications, and removals.
 * - Enables per-node selective approval/rejection before merging into the active AST.
 * - Prunes orphaned wires connecting to rejected or deleted nodes.
 * ============================================================================
 */

import { BlueprintGraph, BlueprintNodeInstance, BlueprintWire } from "@/core/ast/ASTManager";

export type NodeDiffStatus = "added" | "removed" | "modified" | "unchanged";
export type WireDiffStatus = "added" | "removed" | "unchanged";

export interface NodeDiffItem {
  nodeId: string;
  status: NodeDiffStatus;
  baselineNode?: BlueprintNodeInstance;
  proposedNode?: BlueprintNodeInstance;
  changeSummary: string;
  fieldChanges?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

export interface WireDiffItem {
  wireId: string;
  status: WireDiffStatus;
  baselineWire?: BlueprintWire;
  proposedWire?: BlueprintWire;
}

export interface GraphDiffReport {
  baselineGraphId: string;
  proposedGraphId: string;
  nodeDiffs: Record<string, NodeDiffItem>;
  wireDiffs: Record<string, WireDiffItem>;
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  hasChanges: boolean;
}

/**
 * Computes a fine-grained semantic diff between baseline and proposed Blueprint graphs.
 */
export function computeGraphDiff(
  baseline: BlueprintGraph,
  proposed: BlueprintGraph
): GraphDiffReport {
  const nodeDiffs: Record<string, NodeDiffItem> = {};
  const wireDiffs: Record<string, WireDiffItem> = {};

  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  const baselineNodeIds = new Set(Object.keys(baseline.nodes));
  const proposedNodeIds = new Set(Object.keys(proposed.nodes));

  // 1. Evaluate Proposed Nodes (Added or Modified or Unchanged)
  for (const [nodeId, proposedNode] of Object.entries(proposed.nodes)) {
    if (!baselineNodeIds.has(nodeId)) {
      nodeDiffs[nodeId] = {
        nodeId,
        status: "added",
        proposedNode,
        changeSummary: `Added node "${proposedNode.title || proposedNode.type}"`,
      };
      addedCount++;
    } else {
      const baselineNode = baseline.nodes[nodeId];
      const fieldChanges: NodeDiffItem["fieldChanges"] = [];

      if (baselineNode.type !== proposedNode.type) {
        fieldChanges.push({
          field: "type",
          oldValue: baselineNode.type,
          newValue: proposedNode.type,
        });
      }

      if (
        baselineNode.position.x !== proposedNode.position.x ||
        baselineNode.position.y !== proposedNode.position.y
      ) {
        fieldChanges.push({
          field: "position",
          oldValue: baselineNode.position,
          newValue: proposedNode.position,
        });
      }

      const baselineParamsStr = JSON.stringify(baselineNode.customParams || {});
      const proposedParamsStr = JSON.stringify(proposedNode.customParams || {});
      if (baselineParamsStr !== proposedParamsStr) {
        fieldChanges.push({
          field: "customParams",
          oldValue: baselineNode.customParams,
          newValue: proposedNode.customParams,
        });
      }

      const baselinePinsStr = JSON.stringify(baselineNode.pinValues || {});
      const proposedPinsStr = JSON.stringify(proposedNode.pinValues || {});
      if (baselinePinsStr !== proposedPinsStr) {
        fieldChanges.push({
          field: "pinValues",
          oldValue: baselineNode.pinValues,
          newValue: proposedNode.pinValues,
        });
      }

      if (fieldChanges.length > 0) {
        nodeDiffs[nodeId] = {
          nodeId,
          status: "modified",
          baselineNode,
          proposedNode,
          changeSummary: `Modified ${fieldChanges.map((f) => f.field).join(", ")}`,
          fieldChanges,
        };
        modifiedCount++;
      } else {
        nodeDiffs[nodeId] = {
          nodeId,
          status: "unchanged",
          baselineNode,
          proposedNode,
          changeSummary: "No changes",
        };
      }
    }
  }

  // 2. Evaluate Baseline Nodes Removed in Proposed
  for (const [nodeId, baselineNode] of Object.entries(baseline.nodes)) {
    if (!proposedNodeIds.has(nodeId)) {
      nodeDiffs[nodeId] = {
        nodeId,
        status: "removed",
        baselineNode,
        changeSummary: `Removed node "${baselineNode.title || baselineNode.type}"`,
      };
      removedCount++;
    }
  }

  // 3. Evaluate Wire Diffs (wires is BlueprintWire[])
  const baselineWiresMap = new Map(baseline.wires.map((w) => [w.id, w]));
  const proposedWiresMap = new Map(proposed.wires.map((w) => [w.id, w]));

  for (const proposedWire of proposed.wires) {
    if (!baselineWiresMap.has(proposedWire.id)) {
      wireDiffs[proposedWire.id] = {
        wireId: proposedWire.id,
        status: "added",
        proposedWire,
      };
    } else {
      wireDiffs[proposedWire.id] = {
        wireId: proposedWire.id,
        status: "unchanged",
        baselineWire: baselineWiresMap.get(proposedWire.id),
        proposedWire,
      };
    }
  }

  for (const baselineWire of baseline.wires) {
    if (!proposedWiresMap.has(baselineWire.id)) {
      wireDiffs[baselineWire.id] = {
        wireId: baselineWire.id,
        status: "removed",
        baselineWire,
      };
    }
  }

  const hasChanges = addedCount > 0 || modifiedCount > 0 || removedCount > 0;

  return {
    baselineGraphId: baseline.id,
    proposedGraphId: proposed.id,
    nodeDiffs,
    wireDiffs,
    addedCount,
    modifiedCount,
    removedCount,
    hasChanges,
  };
}

/**
 * Selectively merges approved nodes into the graph and cleans up orphaned wires.
 */
export function applySelectiveDiff(
  baseline: BlueprintGraph,
  proposed: BlueprintGraph,
  diff: GraphDiffReport,
  acceptedNodeIds: Set<string>
): BlueprintGraph {
  const mergedNodes: Record<string, BlueprintNodeInstance> = {};

  // 1. Process Baseline and Proposed Nodes based on user acceptance
  for (const [nodeId, diffItem] of Object.entries(diff.nodeDiffs)) {
    const isAccepted = acceptedNodeIds.has(nodeId);

    switch (diffItem.status) {
      case "added":
        if (isAccepted && diffItem.proposedNode) {
          mergedNodes[nodeId] = { ...diffItem.proposedNode };
        }
        break;

      case "modified":
        if (isAccepted && diffItem.proposedNode) {
          mergedNodes[nodeId] = { ...diffItem.proposedNode };
        } else if (diffItem.baselineNode) {
          mergedNodes[nodeId] = { ...diffItem.baselineNode };
        }
        break;

      case "removed":
        if (!isAccepted && diffItem.baselineNode) {
          // Rejection of removal means we KEEP the baseline node!
          mergedNodes[nodeId] = { ...diffItem.baselineNode };
        }
        break;

      case "unchanged":
        if (diffItem.baselineNode) {
          mergedNodes[nodeId] = { ...diffItem.baselineNode };
        } else if (diffItem.proposedNode) {
          mergedNodes[nodeId] = { ...diffItem.proposedNode };
        }
        break;
    }
  }

  // 2. Reconcile Wires: Preserve wires whose endpoints both exist in mergedNodes
  const candidateWires: BlueprintWire[] = [];

  for (const diffWire of Object.values(diff.wireDiffs)) {
    if (diffWire.status === "added" && diffWire.proposedWire) {
      candidateWires.push(diffWire.proposedWire);
    } else if (diffWire.status === "unchanged" && diffWire.baselineWire) {
      candidateWires.push(diffWire.baselineWire);
    } else if (diffWire.status === "removed" && diffWire.baselineWire) {
      // If the removal was due to a node that was kept (removal rejected), candidate is retained
      candidateWires.push(diffWire.baselineWire);
    }
  }

  const mergedWires: BlueprintWire[] = [];
  const addedWireIds = new Set<string>();

  for (const wire of candidateWires) {
    // Only attach wire if BOTH source and target nodes exist in mergedNodes
    if (
      mergedNodes[wire.sourceNodeId] &&
      mergedNodes[wire.targetNodeId] &&
      !addedWireIds.has(wire.id)
    ) {
      mergedWires.push({ ...wire });
      addedWireIds.add(wire.id);
    }
  }

  // 3. Variables: union from baseline and proposed
  const variables = [...baseline.variables];
  const existingVarIds = new Set(variables.map((v) => v.id));
  for (const v of proposed.variables) {
    if (!existingVarIds.has(v.id)) {
      variables.push({ ...v });
    }
  }

  return {
    ...baseline,
    nodes: mergedNodes,
    wires: mergedWires,
    variables,
  };
}
