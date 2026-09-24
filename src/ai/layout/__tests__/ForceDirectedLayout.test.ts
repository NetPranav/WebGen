import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ForceDirectedLayout } from "../ForceDirectedLayout";
import { BlueprintGraph, BlueprintNodeInstance, BlueprintWire } from "@/core/ast/ASTManager";

describe("Sub-Phase 6.3: Graph Auto-Layout Engine", () => {
  const NODE_W = ForceDirectedLayout.DEFAULT_NODE_WIDTH;
  const NODE_H = ForceDirectedLayout.DEFAULT_NODE_HEIGHT;

  function createMockNode(id: string, type: string, pos = { x: 0, y: 0 }): BlueprintNodeInstance {
    return {
      id,
      type,
      title: id,
      position: pos,
      customParams: {},
      pinValues: {},
    };
  }

  function createMockWire(id: string, srcNode: string, srcPin: string, tgtNode: string, tgtPin: string): BlueprintWire {
    return {
      id,
      sourceNodeId: srcNode,
      sourcePinId: srcPin,
      targetNodeId: tgtNode,
      targetPinId: tgtPin,
      pinType: "exec",
      isExec: true,
    };
  }

  // --------------------------------------------------------------------------
  // 1. 15-Node Complex Graph Overlap & Left-to-Right Flow Verification
  // --------------------------------------------------------------------------
  it("should lay out a 15-node AI-generated graph with zero overlapping nodes and readable left-to-right flow", () => {
    const nodes: Record<string, BlueprintNodeInstance> = {
      n1: createMockNode("n1", "Event.onPageLoad"),
      n2: createMockNode("n2", "Database.query"),
      n3: createMockNode("n3", "Flow.branch"),
      n4: createMockNode("n4", "API.request"),
      n5: createMockNode("n5", "Utility.printString"),
      n6: createMockNode("n6", "Variables.get"),
      n7: createMockNode("n7", "Variables.set"),
      n8: createMockNode("n8", "Flow.sequence"),
      n9: createMockNode("n9", "Database.insert"),
      n10: createMockNode("n10", "Database.update"),
      n11: createMockNode("n11", "Navigation.push"),
      n12: createMockNode("n12", "Math.compare"),
      n13: createMockNode("n13", "Utility.formatText"),
      n14: createMockNode("n14", "Event.onClick"),
      n15: createMockNode("n15", "Utility.printString"),
    };

    const wires: BlueprintWire[] = [
      createMockWire("w1", "n1", "exec", "n2", "execIn"),
      createMockWire("w2", "n2", "execOut", "n3", "execIn"),
      createMockWire("w3", "n3", "trueExec", "n4", "execIn"),
      createMockWire("w4", "n3", "falseExec", "n5", "execIn"),
      createMockWire("w5", "n4", "execOut", "n7", "execIn"),
      createMockWire("w6", "n7", "execOut", "n8", "execIn"),
      createMockWire("w7", "n8", "then0", "n9", "execIn"),
      createMockWire("w8", "n8", "then1", "n10", "execIn"),
      createMockWire("w9", "n10", "execOut", "n11", "execIn"),
      createMockWire("w10", "n14", "exec", "n12", "execIn"),
      createMockWire("w11", "n12", "execOut", "n13", "execIn"),
      createMockWire("w12", "n13", "execOut", "n15", "execIn"),
      createMockWire("w13", "n6", "value", "n2", "params"),
    ];

    const rawGraph: BlueprintGraph = {
      id: "graph_15_node",
      name: "Complex15NodeFlow",
      type: "event",
      nodes,
      wires,
      variables: [],
    };

    const laidOut = ForceDirectedLayout.layoutGraph(rawGraph);
    const nodeIds = Object.keys(laidOut.nodes);
    assert.strictEqual(nodeIds.length, 15, "Graph must retain all 15 nodes");

    // 1. Assert zero collisions between any two nodes
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const idA = nodeIds[i];
        const idB = nodeIds[j];
        const posA = laidOut.nodes[idA].position;
        const posB = laidOut.nodes[idB].position;

        const isColliding = ForceDirectedLayout.checkCollision(posA, posB, NODE_W, NODE_H);
        assert.strictEqual(
          isColliding,
          false,
          `Nodes '${idA}' and '${idB}' overlap at (${posA.x}, ${posA.y}) vs (${posB.x}, ${posB.y})`
        );
      }
    }

    // 2. Assert left-to-right flow for forward wires
    for (const wire of laidOut.wires) {
      const srcPos = laidOut.nodes[wire.sourceNodeId].position;
      const tgtPos = laidOut.nodes[wire.targetNodeId].position;

      assert.ok(
        srcPos.x <= tgtPos.x,
        `Wire ${wire.sourceNodeId} -> ${wire.targetNodeId} violates left-to-right order: src.x=${srcPos.x}, tgt.x=${tgtPos.x}`
      );
    }
  });

  // --------------------------------------------------------------------------
  // 2. Incremental Subset Reflow & Position Preservation
  // --------------------------------------------------------------------------
  it("should respect manual node positions when regenerating a subset of a graph", () => {
    const existingNodes: Record<string, BlueprintNodeInstance> = {
      manual1: createMockNode("manual1", "Event.onClick", { x: 120, y: 340 }),
      manual2: createMockNode("manual2", "API.request", { x: 500, y: 340 }),
      newNode1: createMockNode("newNode1", "Flow.branch", { x: 0, y: 0 }),
      newNode2: createMockNode("newNode2", "Navigation.push", { x: 0, y: 0 }),
    };

    const wires: BlueprintWire[] = [
      createMockWire("w1", "manual1", "exec", "manual2", "execIn"),
      createMockWire("w2", "manual2", "execOut", "newNode1", "execIn"),
      createMockWire("w3", "newNode1", "trueExec", "newNode2", "execIn"),
    ];

    const graph: BlueprintGraph = {
      id: "subset_graph",
      name: "SubsetGraph",
      type: "event",
      nodes: existingNodes,
      wires,
      variables: [],
    };

    const laidOut = ForceDirectedLayout.layoutGraph(graph, {
      preserveExistingPositions: true,
    });

    // Pinned/manual nodes must retain exact coordinates
    assert.strictEqual(laidOut.nodes["manual1"].position.x, 120);
    assert.strictEqual(laidOut.nodes["manual1"].position.y, 340);
    assert.strictEqual(laidOut.nodes["manual2"].position.x, 500);
    assert.strictEqual(laidOut.nodes["manual2"].position.y, 340);

    // New nodes must receive valid positions
    assert.notStrictEqual(laidOut.nodes["newNode1"].position.x, 0);
    assert.notStrictEqual(laidOut.nodes["newNode2"].position.x, 0);

    // Assert zero collisions with manual nodes
    const manualPos1 = laidOut.nodes["manual1"].position;
    const newPos1 = laidOut.nodes["newNode1"].position;
    const newPos2 = laidOut.nodes["newNode2"].position;

    assert.strictEqual(ForceDirectedLayout.checkCollision(manualPos1, newPos1, NODE_W, NODE_H), false);
    assert.strictEqual(ForceDirectedLayout.checkCollision(manualPos1, newPos2, NODE_W, NODE_H), false);
  });
});
