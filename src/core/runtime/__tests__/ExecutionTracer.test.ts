import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ExecutionTracer } from "../../../runtime/ExecutionTracer";
import { MockDatabase } from "../../../runtime/MockDatabase";
import { DiagnosticBus } from "../../engine/DiagnosticBus";
import { BlueprintGraph } from "../../ast/ASTManager";

describe("Sub-Phase 5.3: ExecutionTracer & Wire Pulse Telemetry", () => {
  let tracer: ExecutionTracer;

  beforeEach(() => {
    DiagnosticBus.clearHistory();
    tracer = new ExecutionTracer();
  });

  it("starts a run, records steps, and completes run cleanly", () => {
    const runId = tracer.startRun("graph_test", "AuthFlow", "onClick (loginBtn)");
    assert.ok(runId.startsWith("run_"));

    const step1 = tracer.recordStep(runId, {
      nodeId: "node_1",
      nodeTitle: "On Button Click",
      nodeType: "events/onClick",
      category: "Events",
      headerColor: "#4338CA",
      inputs: {},
      outputs: {},
      durationMs: 4,
      status: "success",
      nextTraversedWireIds: ["wire_1_2"],
    });

    assert.equal(step1.stepIndex, 0);
    assert.equal(step1.status, "success");

    const step2 = tracer.recordStep(runId, {
      nodeId: "node_2",
      nodeTitle: "Query User",
      nodeType: "database/query",
      category: "Database",
      headerColor: "#206859",
      inputs: {
        table: {
          pinId: "table",
          name: "table",
          type: "string",
          direction: "input",
          value: "Users",
        },
      },
      outputs: {
        count: {
          pinId: "count",
          name: "count",
          type: "number",
          direction: "output",
          value: 1,
        },
      },
      durationMs: 14,
      status: "success",
    });

    assert.equal(step2.stepIndex, 1);
    assert.equal(step2.inputs.table.value, "Users");

    const completed = tracer.completeRun(runId);
    assert.ok(completed);
    assert.equal(completed.status, "completed");
    assert.equal(completed.steps.length, 2);
    assert.equal(completed.totalDurationMs, 18);
  });

  it("handles execution faults, marks run as failed, and emits [TRACE_EXEC_ERR]", () => {
    const runId = tracer.startRun("graph_err", "PaymentFlow", "onClick (payBtn)");

    tracer.recordStep(runId, {
      nodeId: "node_err",
      nodeTitle: "Charge Credit Card",
      nodeType: "api/request",
      category: "API",
      headerColor: "#059669",
      inputs: {
        amount: {
          pinId: "amount",
          name: "amount",
          type: "number",
          direction: "input",
          value: null,
        },
      },
      outputs: {},
      durationMs: 8,
      status: "error",
      errorMessage: "Amount cannot be null or negative",
    });

    const run = tracer.getRun(runId);
    assert.ok(run);
    assert.equal(run.status, "failed");

    const errEvents = DiagnosticBus.getHistoryByChannel("TRACE_EXEC_ERR");
    assert.equal(errEvents.length, 1);
    assert.equal(errEvents[0].severity, "error");
    assert.ok(errEvents[0].message.includes("Amount cannot be null"));
  });

  it("enforces ring buffer capacity (50 runs) and emits [TRACE_OVERFLOW_WARN]", () => {
    for (let i = 0; i < 55; i++) {
      tracer.startRun("graph_loop", `LoopGraph_${i}`, `Iteration ${i}`);
    }

    assert.equal(tracer.getRuns().length, 50);

    const warnEvents = DiagnosticBus.getHistoryByChannel("TRACE_OVERFLOW_WARN");
    assert.equal(warnEvents.length, 5); // 55 - 50 = 5 overflow warnings
    assert.equal(warnEvents[0].severity, "warning");
    assert.ok(warnEvents[0].message.includes("capacity (50)"));
  });

  it("dispatches and expires wire pulse telemetry", () => {
    tracer.triggerWirePulse("wire_101", {
      pinType: "exec",
      speed: 0.002,
      durationMs: 50,
    });

    assert.equal(tracer.isWirePulsing("wire_101"), true);
    assert.equal(tracer.getActivePulses().length, 1);

    const pulse = tracer.getActivePulses()[0];
    assert.equal(pulse.wireId, "wire_101");
    assert.equal(pulse.pinType, "exec");
  });

  it("simulates full BlueprintGraph DAG traversal and records step snapshots", async () => {
    const testGraph: BlueprintGraph = {
      id: "graph_sim",
      name: "ProductQueryWorkflow",
      type: "event",
      nodes: {
        node_event: {
          id: "node_event",
          type: "events/onClick",
          title: "On Click",
          position: { x: 100, y: 100 },
        },
        node_db: {
          id: "node_db",
          type: "database/query",
          title: "Query Products",
          position: { x: 400, y: 100 },
          pinValues: {
            table: "Products",
            limit: 5,
          },
        },
        node_print: {
          id: "node_print",
          type: "utility/printString",
          title: "Print Result",
          position: { x: 750, y: 100 },
        },
      },
      wires: [
        {
          id: "w_event_to_db",
          sourceNodeId: "node_event",
          sourcePinId: "execOut",
          targetNodeId: "node_db",
          targetPinId: "execIn",
          pinType: "exec",
        },
        {
          id: "w_db_to_print",
          sourceNodeId: "node_db",
          sourcePinId: "execOut",
          targetNodeId: "node_print",
          targetPinId: "execIn",
          pinType: "exec",
        },
      ],
      variables: [],
    };

    const run = await tracer.simulateGraphExecution(testGraph, "Simulated Button Click");

    assert.equal(run.status, "completed");
    assert.equal(run.steps.length, 3);

    // Step 0: Event
    assert.equal(run.steps[0].nodeId, "node_event");
    assert.equal(run.steps[0].status, "success");

    // Step 1: Database query
    assert.equal(run.steps[1].nodeId, "node_db");
    assert.equal(run.steps[1].inputs.table.value, "Products");
    assert.ok(Array.isArray(run.steps[1].outputs.records.value));

    // Step 2: Print
    assert.equal(run.steps[2].nodeId, "node_print");

    // Wires traversed should be pulsing
    assert.equal(tracer.isWirePulsing("w_event_to_db"), true);
    assert.equal(tracer.isWirePulsing("w_db_to_print"), true);
  });

  it("exports trace session to JSON and imports back faithfully", () => {
    const runId = tracer.startRun("graph_export", "ExportGraph", "Benchmark");
    tracer.recordStep(runId, {
      nodeId: "node_exp",
      nodeTitle: "Export Node",
      nodeType: "events/onClick",
      category: "Events",
      headerColor: "#4338CA",
      inputs: {},
      outputs: {},
      durationMs: 10,
      status: "success",
    });
    tracer.completeRun(runId);

    const json = tracer.exportTraceJson();
    assert.ok(json.includes("ExportGraph"));

    const newTracer = new ExecutionTracer();
    newTracer.importTraceJson(json);
    assert.equal(newTracer.getRuns().length, 1);
    assert.equal(newTracer.getRuns()[0].graphName, "ExportGraph");
  });
});
