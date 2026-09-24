import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BlueprintGraph } from "@/core/ast/ASTManager";
import { computeGraphDiff, applySelectiveDiff } from "../graph-diff";

describe("Sub-Phase 6.5: Approval & Diff Review Gate (No Silent AI Writes Law)", () => {
  const baselineGraph: BlueprintGraph = {
    id: "graph_test_1",
    name: "Auth Login Flow",
    type: "event",
    nodes: {
      node_start: {
        id: "node_start",
        type: "event_click",
        position: { x: 50, y: 100 },
        title: "On Click",
        customParams: {},
        pinValues: {},
      },
      node_old_action: {
        id: "node_old_action",
        type: "log_console",
        position: { x: 300, y: 100 },
        title: "Log Console",
        customParams: { message: "Logging old event" },
        pinValues: {},
      },
    },
    wires: [
      {
        id: "wire_1",
        sourceNodeId: "node_start",
        sourcePinId: "out_exec",
        targetNodeId: "node_old_action",
        targetPinId: "in_exec",
        pinType: "exec",
        isExec: true,
      },
    ],
    variables: [],
  };

  const proposedGraph: BlueprintGraph = {
    id: "graph_test_1",
    name: "Auth Login Flow",
    type: "event",
    nodes: {
      node_start: {
        id: "node_start",
        type: "event_click",
        position: { x: 50, y: 120 }, // Modified position
        title: "On Click",
        customParams: {},
        pinValues: {},
      },
      node_new_validate: {
        id: "node_new_validate",
        type: "validate_input",
        position: { x: 320, y: 100 }, // Added node
        title: "Validate Input",
        customParams: { schema: "email" },
        pinValues: {},
      },
      node_new_auth: {
        id: "node_new_auth",
        type: "auth_login",
        position: { x: 600, y: 100 }, // Added node
        title: "Authenticate User",
        customParams: {},
        pinValues: {},
      },
    },
    wires: [
      {
        id: "wire_start_to_val",
        sourceNodeId: "node_start",
        sourcePinId: "out_exec",
        targetNodeId: "node_new_validate",
        targetPinId: "in_exec",
        pinType: "exec",
        isExec: true,
      },
      {
        id: "wire_val_to_auth",
        sourceNodeId: "node_new_validate",
        sourcePinId: "out_valid",
        targetNodeId: "node_new_auth",
        targetPinId: "in_exec",
        pinType: "exec",
        isExec: true,
      },
    ],
    variables: [],
  };

  it("calculates accurate semantic diff metrics for added, modified, and removed nodes", () => {
    const diff = computeGraphDiff(baselineGraph, proposedGraph);

    assert.strictEqual(diff.hasChanges, true);
    assert.strictEqual(diff.addedCount, 2, "Must identify 2 added nodes (node_new_validate, node_new_auth)");
    assert.strictEqual(diff.modifiedCount, 1, "Must identify 1 modified node (node_start)");
    assert.strictEqual(diff.removedCount, 1, "Must identify 1 removed node (node_old_action)");

    // Inspect individual diff statuses
    assert.strictEqual(diff.nodeDiffs["node_new_validate"].status, "added");
    assert.strictEqual(diff.nodeDiffs["node_new_auth"].status, "added");
    assert.strictEqual(diff.nodeDiffs["node_start"].status, "modified");
    assert.strictEqual(diff.nodeDiffs["node_old_action"].status, "removed");

    // Wires
    assert.strictEqual(diff.wireDiffs["wire_1"].status, "removed");
    assert.strictEqual(diff.wireDiffs["wire_start_to_val"].status, "added");
    assert.strictEqual(diff.wireDiffs["wire_val_to_auth"].status, "added");
  });

  it("merges only the accepted subset when rejecting individual nodes, leaving the rest untouched", () => {
    const diff = computeGraphDiff(baselineGraph, proposedGraph);

    // Scenario: User accepts node_new_validate and node_start modification,
    // but REJECTS node_new_auth (added) and REJECTS node_old_action removal (wants to keep old logger).
    const acceptedNodeIds = new Set<string>([
      "node_start",          // accept modification
      "node_new_validate",   // accept addition
      // "node_new_auth" is omitted (rejected)
      // "node_old_action" is omitted (rejection of removal = keep)
    ]);

    const merged = applySelectiveDiff(baselineGraph, proposedGraph, diff, acceptedNodeIds);

    // 1. Verify Nodes in merged graph
    assert.ok(merged.nodes["node_start"], "node_start must exist");
    assert.strictEqual(merged.nodes["node_start"].position.y, 120, "node_start must have accepted proposed position");

    assert.ok(merged.nodes["node_new_validate"], "node_new_validate must be accepted and present");
    assert.strictEqual(merged.nodes["node_new_auth"], undefined, "node_new_auth was rejected and must NOT be in graph");

    assert.ok(merged.nodes["node_old_action"], "node_old_action removal was rejected, so it must be preserved!");

    // 2. Verify Wires in merged graph (zero orphaned wires)
    const wireIds = new Set(merged.wires.map((w) => w.id));
    assert.ok(wireIds.has("wire_start_to_val"), "wire from node_start to node_new_validate must exist");
    assert.strictEqual(
      wireIds.has("wire_val_to_auth"),
      false,
      "wire_val_to_auth must be cleanly pruned because target node_new_auth was rejected"
    );
    assert.ok(wireIds.has("wire_1"), "wire_1 to preserved node_old_action must still exist");
  });

  it("completely preserves baseline graph when rejecting all proposed changes", () => {
    const diff = computeGraphDiff(baselineGraph, proposedGraph);

    // Reject all: empty set of accepted IDs
    const acceptedNodeIds = new Set<string>();

    const merged = applySelectiveDiff(baselineGraph, proposedGraph, diff, acceptedNodeIds);

    // Should match baseline exactly
    assert.strictEqual(Object.keys(merged.nodes).length, 2);
    assert.ok(merged.nodes["node_start"]);
    assert.ok(merged.nodes["node_old_action"]);
    assert.strictEqual(merged.nodes["node_start"].position.y, 100, "Position should remain baseline 100");
    assert.strictEqual(merged.nodes["node_new_validate"], undefined);
    assert.strictEqual(merged.nodes["node_new_auth"], undefined);

    const wireIds = merged.wires.map((w) => w.id);
    assert.ok(wireIds.includes("wire_1"));
    assert.strictEqual(merged.wires.length, 1);
  });

  it("applies full proposed graph when accepting all changes", () => {
    const diff = computeGraphDiff(baselineGraph, proposedGraph);

    // Accept all non-unchanged nodes
    const acceptedNodeIds = new Set<string>(["node_start", "node_new_validate", "node_new_auth", "node_old_action"]);

    const merged = applySelectiveDiff(baselineGraph, proposedGraph, diff, acceptedNodeIds);

    assert.strictEqual(Object.keys(merged.nodes).length, 3);
    assert.ok(merged.nodes["node_start"]);
    assert.ok(merged.nodes["node_new_validate"]);
    assert.ok(merged.nodes["node_new_auth"]);
    assert.strictEqual(merged.nodes["node_old_action"], undefined); // Accepted removal

    const wireIds = merged.wires.map((w) => w.id);
    assert.ok(wireIds.includes("wire_start_to_val"));
    assert.ok(wireIds.includes("wire_val_to_auth"));
    assert.strictEqual(wireIds.includes("wire_1"), false);
  });
});
