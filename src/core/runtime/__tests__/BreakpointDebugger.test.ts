import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { BreakpointManager } from "../../../runtime/BreakpointManager";
import { HotReloadEngine } from "../../../runtime/HotReloadEngine";
import { ExecutionTracer } from "../../../runtime/ExecutionTracer";
import { DiagnosticBus } from "../../engine/DiagnosticBus";
import { BlueprintGraph } from "../../ast/ASTManager";
import { mockDatabase } from "../../../runtime/MockDatabase";
import type { HotReloadPatchType } from "../../types/debugger";

describe("Sub-Phase 5.5: Hot Reload & Breakpoint Debugger", () => {
  let bpManager: BreakpointManager;
  let hrEngine: HotReloadEngine;
  let tracer: ExecutionTracer;

  beforeEach(() => {
    DiagnosticBus.clearHistory();
    bpManager = new BreakpointManager();
    hrEngine = new HotReloadEngine();
    tracer = new ExecutionTracer(bpManager);

    mockDatabase.seed(
      {
        Products: {
          id: "col_products",
          name: "Products",
          displayName: "Products",
          fields: {
            id: { id: "f1", name: "id", type: "String", isPrimaryKey: true },
            title: { id: "f2", name: "title", type: "String" },
            price: { id: "f3", name: "price", type: "Float" },
          },
        },
      },
      {
        Products: [
          { id: "p1", title: "Pro Headset", price: 149 },
          { id: "p2", title: "Desk Mat", price: 29 },
        ],
      }
    );
  });

  // --------------------------------------------------------------------------
  // 1. Breakpoint CRUD
  // --------------------------------------------------------------------------
  it("manages Breakpoint CRUD: add, toggle, remove, and clear", () => {
    const bp = bpManager.addBreakpoint("node_1", "graph_main");
    assert.equal(bp.nodeId, "node_1");
    assert.equal(bp.graphId, "graph_main");
    assert.equal(bp.isEnabled, true);
    assert.equal(bp.hitCount, 0);
    assert.equal(bpManager.hasBreakpoint("node_1"), true);
    assert.equal(bpManager.getBreakpoints().length, 1);

    // Toggle
    bpManager.toggleBreakpoint("node_1");
    assert.equal(bpManager.getBreakpoint("node_1")?.isEnabled, false);
    assert.equal(bpManager.getEnabledBreakpoints().length, 0);

    bpManager.toggleBreakpoint("node_1");
    assert.equal(bpManager.getBreakpoint("node_1")?.isEnabled, true);
    assert.equal(bpManager.getEnabledBreakpoints().length, 1);

    // Remove
    const removed = bpManager.removeBreakpoint("node_1");
    assert.equal(removed, true);
    assert.equal(bpManager.hasBreakpoint("node_1"), false);
    assert.equal(bpManager.getBreakpoints().length, 0);

    // Clear All
    bpManager.addBreakpoint("node_a", "graph_main");
    bpManager.addBreakpoint("node_b", "graph_main");
    assert.equal(bpManager.getBreakpoints().length, 2);
    bpManager.clearAll();
    assert.equal(bpManager.getBreakpoints().length, 0);
  });

  // --------------------------------------------------------------------------
  // 2. Pause Gate & Resume
  // --------------------------------------------------------------------------
  it("pauses execution at breakpoint and resumes to completion when resume() is called", async () => {
    const testGraph: BlueprintGraph = {
      id: "graph_pause_test",
      name: "Pause Test Graph",
      type: "event",
      nodes: {
        node_start: {
          id: "node_start",
          type: "events/onClick",
          title: "On Click",
          position: { x: 0, y: 0 },
        },
        node_calc: {
          id: "node_calc",
          type: "math/add",
          title: "Add Numbers",
          position: { x: 250, y: 0 },
          pinValues: { a: 10, b: 20 },
        },
      },
      wires: [
        {
          id: "wire_exec",
          sourceNodeId: "node_start",
          sourcePinId: "execOut",
          targetNodeId: "node_calc",
          targetPinId: "execIn",
          pinType: "exec",
        },
      ],
      variables: [],
    };

    // Add breakpoint on node_calc
    bpManager.addBreakpoint("node_calc", testGraph.id);

    let hitCountListenerCalled = false;
    let hitNodeCaptured: string | null = null;

    bpManager.subscribe((state, hitEvent) => {
      if (state === "paused" && hitEvent) {
        hitCountListenerCalled = true;
        hitNodeCaptured = hitEvent.nodeId;
      }
    });

    // Start simulation in background
    let runCompleted = false;
    const simulationPromise = tracer.simulateGraphExecution(testGraph, "Test Run").then((r) => {
      runCompleted = true;
      return r;
    });

    // Yield control to let execution reach node_calc
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Must be paused at node_calc
    assert.equal(bpManager.getState(), "paused");
    assert.equal(hitCountListenerCalled, true);
    assert.equal(hitNodeCaptured, "node_calc");
    assert.equal(runCompleted, false);

    // Resume execution
    bpManager.resume();

    const finalRun = await simulationPromise;
    assert.equal(runCompleted, true);
    assert.equal(finalRun.status, "completed");
    assert.equal(finalRun.steps.length, 2);
    assert.equal(finalRun.steps[1].nodeId, "node_calc");
    assert.ok(finalRun.steps[1].breakpointId);
  });

  // --------------------------------------------------------------------------
  // 3. Step Over
  // --------------------------------------------------------------------------
  it("steps over one node at a time advancing through the graph", async () => {
    const testGraph: BlueprintGraph = {
      id: "graph_step_test",
      name: "Step Test Graph",
      type: "event",
      nodes: {
        node_1: {
          id: "node_1",
          type: "events/onClick",
          title: "Click",
          position: { x: 0, y: 0 },
        },
        node_2: {
          id: "node_2",
          type: "math/add",
          title: "Add Step",
          position: { x: 200, y: 0 },
          pinValues: { a: 5, b: 5 },
        },
        node_3: {
          id: "node_3",
          type: "utility/printString",
          title: "Print Step",
          position: { x: 400, y: 0 },
          pinValues: { inString: "Stepped" },
        },
      },
      wires: [
        {
          id: "w1",
          sourceNodeId: "node_1",
          sourcePinId: "execOut",
          targetNodeId: "node_2",
          targetPinId: "execIn",
          pinType: "exec",
        },
        {
          id: "w2",
          sourceNodeId: "node_2",
          sourcePinId: "execOut",
          targetNodeId: "node_3",
          targetPinId: "execIn",
          pinType: "exec",
        },
      ],
      variables: [],
    };

    // Breakpoint at node_2
    bpManager.addBreakpoint("node_2", testGraph.id);

    const simulationPromise = tracer.simulateGraphExecution(testGraph);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(bpManager.getState(), "paused");
    assert.equal(bpManager.getLastHitEvent()?.nodeId, "node_2");

    // Call Step Over: should advance to node_3 and pause again
    bpManager.stepOver();
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(bpManager.getState(), "paused");
    assert.equal(bpManager.getLastHitEvent()?.nodeId, "node_3");

    // Resume to complete graph
    bpManager.resume();
    const run = await simulationPromise;
    assert.equal(run.status, "completed");
    assert.equal(run.steps.length, 3);
  });

  // --------------------------------------------------------------------------
  // 4. Conditional Breakpoints
  // --------------------------------------------------------------------------
  it("evaluates conditional breakpoints: pauses only when condition is truthy", () => {
    bpManager.addBreakpoint("node_branch", "graph_main");

    // Set condition: inputs.amount > 100
    bpManager.setCondition("node_branch", "inputs.amount > 100");

    // Case A: amount = 50 -> should NOT pause
    const shouldPauseFalsy = bpManager.shouldPauseAtNode("node_branch", {
      inputs: {
        amount: {
          pinId: "amount",
          name: "amount",
          type: "number",
          direction: "input",
          value: 50,
        },
      },
    });
    assert.equal(shouldPauseFalsy, false);

    // Case B: amount = 250 -> SHOULD pause
    const shouldPauseTruthy = bpManager.shouldPauseAtNode("node_branch", {
      inputs: {
        amount: {
          pinId: "amount",
          name: "amount",
          type: "number",
          direction: "input",
          value: 250,
        },
      },
    });
    assert.equal(shouldPauseTruthy, true);
  });

  // --------------------------------------------------------------------------
  // 5. Hit Counter
  // --------------------------------------------------------------------------
  it("tracks cumulative hit count across execution runs", async () => {
    bpManager.addBreakpoint("node_tracked", "graph_main");
    const bp = bpManager.getBreakpoint("node_tracked")!;
    assert.equal(bp.hitCount, 0);

    // Simulate pause 1
    const p1 = bpManager.pauseAtBreakpoint("node_tracked", "run_1", 0, {}, {});
    assert.equal(bp.hitCount, 1);
    bpManager.resume();
    await p1;

    // Simulate pause 2
    const p2 = bpManager.pauseAtBreakpoint("node_tracked", "run_2", 1, {}, {});
    assert.equal(bp.hitCount, 2);
    bpManager.resume();
    await p2;
  });

  // --------------------------------------------------------------------------
  // 6. DiagnosticBus Integration: BREAKPOINT_HIT
  // --------------------------------------------------------------------------
  it("emits [BREAKPOINT_HIT] event on DiagnosticBus with frozen pin payloads", async () => {
    bpManager.addBreakpoint("node_diag", "graph_main");

    const pausePromise = bpManager.pauseAtBreakpoint(
      "node_diag",
      "run_diag",
      0,
      {
        token: {
          pinId: "token",
          name: "token",
          type: "string",
          direction: "input",
          value: "secret_xyz",
        },
      },
      {
        isValid: {
          pinId: "isValid",
          name: "isValid",
          type: "boolean",
          direction: "output",
          value: true,
        },
      }
    );

    const hitDiag = DiagnosticBus.getHistory().find(
      (d) => d.channel === "BREAKPOINT_HIT"
    );
    assert.ok(hitDiag);
    assert.equal(hitDiag.source.entityId, "node_diag");
    assert.ok(hitDiag.message.includes("[BREAKPOINT_HIT]"));

    bpManager.resume();
    await pausePromise;
  });

  // --------------------------------------------------------------------------
  // 7. Hot Reload Patch Generation & Application
  // --------------------------------------------------------------------------
  it("generates and applies property patches with [HOT_RELOAD_INFO] diagnostic", () => {
    hrEngine.activate();

    const patch = hrEngine.generatePatch("property_changed", "btn_submit", {
      style: { backgroundColor: "#206859", borderRadius: "8px" },
    });

    assert.equal(patch.patchType, "property_changed");
    assert.equal(patch.targetId, "btn_submit");
    assert.deepEqual(patch.delta.style, {
      backgroundColor: "#206859",
      borderRadius: "8px",
    });

    // Apply patch
    const result = hrEngine.applyPatch(patch);
    assert.equal(result.success, true);

    const infoDiag = DiagnosticBus.getHistory().find(
      (d) => d.channel === "HOT_RELOAD_INFO"
    );
    assert.ok(infoDiag);
    assert.ok(infoDiag.message.includes("[HOT_RELOAD]"));

    assert.equal(hrEngine.getPatchHistory().length, 1);
    assert.equal(hrEngine.getSuccessfulPatches().length, 1);
  });

  // --------------------------------------------------------------------------
  // 8. Hot Reload Rollback Safety
  // --------------------------------------------------------------------------
  it("preserves prior state snapshot on rollback and emits [SANDBOX_WARN]", () => {
    hrEngine.activate();

    // Fabricate an unsupported patch type to trigger failure & rollback
    const badPatch = {
      patchId: "bad_patch_1",
      patchType: "unsupported_type" as unknown as HotReloadPatchType,
      targetId: "node_corrupt",
      delta: { invalid: true },
      timestamp: Date.now(),
    };

    const result = hrEngine.applyPatch(badPatch);
    assert.equal(result.success, false);
    assert.ok(result.rollbackSnapshot);
    assert.ok(result.errorMessage);

    const warnDiag = DiagnosticBus.getHistory().find(
      (d) => d.channel === "SANDBOX_WARN"
    );
    assert.ok(warnDiag);
    assert.ok(warnDiag.message.includes("[HOT_RELOAD_ROLLBACK]"));
  });

  // --------------------------------------------------------------------------
  // 9. Branch Traversal Bug Fix Verification (Audit Issue 1)
  // --------------------------------------------------------------------------
  it("evaluates condition input on flow/branch nodes and traverses the correct branch wire", async () => {
    // Construct graph with flow/branch where condition = false
    // True wire goes to node_true_branch, False wire goes to node_false_branch
    const branchGraph: BlueprintGraph = {
      id: "graph_branch_eval",
      name: "Branch Evaluation Test",
      type: "event",
      nodes: {
        node_event: {
          id: "node_event",
          type: "events/onClick",
          title: "On Click",
          position: { x: 0, y: 0 },
        },
        node_branch: {
          id: "node_branch",
          type: "flow/branch",
          title: "Branch If Admin",
          position: { x: 200, y: 0 },
          pinValues: { condition: false }, // Condition is FALSE!
        },
        node_true_branch: {
          id: "node_true_branch",
          type: "utility/printString",
          title: "Admin Panel",
          position: { x: 450, y: -100 },
          pinValues: { inString: "Welcome Admin" },
        },
        node_false_branch: {
          id: "node_false_branch",
          type: "utility/printString",
          title: "Guest Notice",
          position: { x: 450, y: 100 },
          pinValues: { inString: "Access Restricted" },
        },
      },
      wires: [
        {
          id: "w_to_branch",
          sourceNodeId: "node_event",
          sourcePinId: "execOut",
          targetNodeId: "node_branch",
          targetPinId: "execIn",
          pinType: "exec",
        },
        {
          id: "w_true",
          sourceNodeId: "node_branch",
          sourcePinId: "trueExec",
          targetNodeId: "node_true_branch",
          targetPinId: "execIn",
          pinType: "exec",
        },
        {
          id: "w_false",
          sourceNodeId: "node_branch",
          sourcePinId: "falseExec",
          targetNodeId: "node_false_branch",
          targetPinId: "execIn",
          pinType: "exec",
        },
      ],
      variables: [],
    };

    const run = await tracer.simulateGraphExecution(branchGraph);
    assert.equal(run.status, "completed");

    // Traversed nodes should be: node_event -> node_branch -> node_false_branch
    const visitedNodes = run.steps.map((s) => s.nodeId);
    assert.deepEqual(visitedNodes, ["node_event", "node_branch", "node_false_branch"]);
    assert.equal(visitedNodes.includes("node_true_branch"), false);
  });
});
