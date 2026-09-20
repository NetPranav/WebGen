import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PerformanceProfiler } from "../../../runtime/PerformanceProfiler";
import { ExecutionTracer } from "../../../runtime/ExecutionTracer";
import { DiagnosticBus } from "../../engine/DiagnosticBus";
import { ExecutionRun, TraceStep } from "../../types/trace";

describe("Sub-Phase 5.6: Performance Profiler & Flame Graph", () => {
  let profiler: PerformanceProfiler;
  let tracer: ExecutionTracer;

  beforeEach(() => {
    DiagnosticBus.clearHistory();
    profiler = new PerformanceProfiler();
    tracer = new ExecutionTracer(undefined, profiler);
  });

  // --------------------------------------------------------------------------
  // 1. Metric Aggregation & Basic Analysis
  // --------------------------------------------------------------------------
  it("aggregates TraceStep durations into per-node latency metrics accurately", () => {
    const mockRun: ExecutionRun = {
      runId: "run_perf_1",
      graphId: "graph_main",
      graphName: "Main Graph",
      trigger: "button_click",
      status: "completed",
      startTime: 1000,
      endTime: 1120,
      totalDurationMs: 120,
      steps: [
        {
          stepIndex: 0,
          nodeId: "node_query",
          nodeTitle: "Query Database",
          nodeType: "database/query",
          category: "Database",
          headerColor: "#059669",
          status: "success",
          durationMs: 70,
          timestamp: 1000,
          inputs: {},
          outputs: {},
        },
        {
          stepIndex: 1,
          nodeId: "node_transform",
          nodeTitle: "Transform List",
          nodeType: "data/transform",
          category: "Logic",
          headerColor: "#4338CA",
          status: "success",
          durationMs: 20,
          timestamp: 1070,
          inputs: {},
          outputs: {},
        },
        {
          stepIndex: 2,
          nodeId: "node_query",
          nodeTitle: "Query Database",
          nodeType: "database/query",
          category: "Database",
          headerColor: "#059669",
          status: "success",
          durationMs: 30,
          timestamp: 1090,
          inputs: {},
          outputs: {},
        },
      ],
    };

    const report = profiler.analyzeRun(mockRun);

    assert.equal(report.runId, "run_perf_1");
    assert.equal(report.totalExecutionTimeMs, 120);
    assert.equal(report.totalSteps, 3);
    assert.equal(report.averageStepDurationMs, 40); // 120 / 3

    // Verify node_query metrics (executed twice: 70ms + 30ms = 100ms)
    const queryMetric = report.metricsByNodeId["node_query"];
    assert.ok(queryMetric);
    assert.equal(queryMetric.executionCount, 2);
    assert.equal(queryMetric.totalDurationMs, 100);
    assert.equal(queryMetric.minDurationMs, 30);
    assert.equal(queryMetric.maxDurationMs, 70);
    assert.equal(queryMetric.avgDurationMs, 50);
    assert.equal(queryMetric.percentageOfTotal, 83.3); // (100 / 120) * 100

    // Verify node_transform metrics (executed once: 20ms)
    const transformMetric = report.metricsByNodeId["node_transform"];
    assert.ok(transformMetric);
    assert.equal(transformMetric.executionCount, 1);
    assert.equal(transformMetric.totalDurationMs, 20);
    assert.equal(transformMetric.minDurationMs, 20);
    assert.equal(transformMetric.maxDurationMs, 20);
    assert.equal(transformMetric.avgDurationMs, 20);
    assert.equal(transformMetric.percentageOfTotal, 16.7); // (20 / 120) * 100
  });

  // --------------------------------------------------------------------------
  // 2. Flame Graph Waterfall Construction
  // --------------------------------------------------------------------------
  it("constructs chronological waterfall bars with cumulative time offsets", () => {
    const mockRun: ExecutionRun = {
      runId: "run_waterfall",
      graphId: "graph_main",
      graphName: "Main Graph",
      trigger: "page_load",
      status: "completed",
      startTime: 100,
      endTime: 200,
      totalDurationMs: 100,
      steps: [
        {
          stepIndex: 0,
          nodeId: "node_init",
          nodeTitle: "Init",
          nodeType: "lifecycle/init",
          category: "Lifecycle",
          headerColor: "#206859",
          status: "success",
          durationMs: 15,
          timestamp: 100,
          inputs: {},
          outputs: {},
        },
        {
          stepIndex: 1,
          nodeId: "node_fetch",
          nodeTitle: "Fetch Data",
          nodeType: "network/fetch",
          category: "Network",
          headerColor: "#0284C7",
          status: "success",
          durationMs: 60,
          timestamp: 115,
          inputs: {},
          outputs: {},
        },
        {
          stepIndex: 2,
          nodeId: "node_render",
          nodeTitle: "Render UI",
          nodeType: "ui/render",
          category: "UI",
          headerColor: "#7C3AED",
          status: "success",
          durationMs: 25,
          timestamp: 175,
          inputs: {},
          outputs: {},
        },
      ],
    };

    const report = profiler.analyzeRun(mockRun);
    assert.equal(report.flameBars.length, 3);

    // Bar 0: starts at 0ms, duration 15ms (15% of 100ms)
    assert.equal(report.flameBars[0].startTimeOffsetMs, 0);
    assert.equal(report.flameBars[0].durationMs, 15);
    assert.equal(report.flameBars[0].percentageOfTotal, 15);
    assert.equal(report.flameBars[0].isHot, false);

    // Bar 1: starts at 15ms, duration 60ms (60% of 100ms, hot node > 50ms)
    assert.equal(report.flameBars[1].startTimeOffsetMs, 15);
    assert.equal(report.flameBars[1].durationMs, 60);
    assert.equal(report.flameBars[1].percentageOfTotal, 60);
    assert.equal(report.flameBars[1].isHot, true);

    // Bar 2: starts at 75ms (15 + 60), duration 25ms
    assert.equal(report.flameBars[2].startTimeOffsetMs, 75);
    assert.equal(report.flameBars[2].durationMs, 25);
    assert.equal(report.flameBars[2].percentageOfTotal, 25);
    assert.equal(report.flameBars[2].isHot, false);
  });

  // --------------------------------------------------------------------------
  // 3. Hot Node Bottleneck Detection & DiagnosticBus Emission
  // --------------------------------------------------------------------------
  it("detects bottlenecks exceeding threshold and dispatches [PERF_WARN] diagnostics", () => {
    const mockRun: ExecutionRun = {
      runId: "run_bottleneck",
      graphId: "graph_main",
      graphName: "Main Graph",
      trigger: "search_input",
      status: "completed",
      startTime: 500,
      endTime: 680,
      totalDurationMs: 180,
      steps: [
        {
          stepIndex: 0,
          nodeId: "node_heavy_sort",
          nodeTitle: "Heavy Array Sort",
          nodeType: "data/sort",
          category: "Data",
          headerColor: "#B45309",
          status: "success",
          durationMs: 95, // Bottleneck: > 50ms
          timestamp: 500,
          inputs: {},
          outputs: {},
        },
        {
          stepIndex: 1,
          nodeId: "node_format",
          nodeTitle: "Format String",
          nodeType: "string/format",
          category: "Data",
          headerColor: "#4338CA",
          status: "success",
          durationMs: 10,
          timestamp: 595,
          inputs: {},
          outputs: {},
        },
      ],
    };

    const report = profiler.analyzeRun(mockRun);

    // Verify hot nodes list
    assert.equal(report.hotNodes.length, 1);
    assert.equal(report.hotNodes[0].nodeId, "node_heavy_sort");
    assert.equal(report.hotNodes[0].totalDurationMs, 95);
    assert.equal(report.hotNodes[0].isHotNode, true);

    // Verify DiagnosticBus event
    const events = DiagnosticBus.getHistory();
    const perfWarns = events.filter((e) => e.channel === "PERF_WARN");
    assert.equal(perfWarns.length, 1);
    assert.equal(perfWarns[0].source.panel, "Panel 20: Performance Profiler");
    assert.equal(perfWarns[0].source.entityId, "node_heavy_sort");
    assert.ok(perfWarns[0].message.includes("Heavy Array Sort"));
    assert.ok(perfWarns[0].message.includes("95ms"));
  });

  // --------------------------------------------------------------------------
  // 4. Threshold Reconfiguration
  // --------------------------------------------------------------------------
  it("supports dynamic threshold reconfiguration and re-evaluates cached reports", () => {
    const mockRun: ExecutionRun = {
      runId: "run_reconfig",
      graphId: "graph_main",
      graphName: "Main Graph",
      trigger: "timer",
      status: "completed",
      startTime: 10,
      endTime: 60,
      totalDurationMs: 50,
      steps: [
        {
          stepIndex: 0,
          nodeId: "node_step1",
          nodeTitle: "Step 1",
          nodeType: "logic/step",
          category: "Logic",
          headerColor: "#206859",
          status: "success",
          durationMs: 30, // < 50ms default, but > 20ms custom
          timestamp: 10,
          inputs: {},
          outputs: {},
        },
      ],
    };

    // Default 50ms: not hot
    const report1 = profiler.analyzeRun(mockRun);
    assert.equal(report1.hotNodes.length, 0);
    assert.equal(report1.metricsByNodeId["node_step1"].isHotNode, false);

    // Lower threshold to 20ms
    profiler.setSettings({ hotNodeThresholdMs: 20 });
    assert.equal(profiler.getSettings().hotNodeThresholdMs, 20);

    // Latest report should now flag node_step1 as hot
    const latest = profiler.getLatestReport();
    assert.ok(latest);
    assert.equal(latest.thresholdMs, 20);
    assert.equal(latest.hotNodes.length, 1);
    assert.equal(latest.hotNodes[0].nodeId, "node_step1");
    assert.equal(latest.metricsByNodeId["node_step1"].isHotNode, true);
    assert.equal(latest.flameBars[0].isHot, true);
  });

  // --------------------------------------------------------------------------
  // 5. Tracer Integration
  // --------------------------------------------------------------------------
  it("automatically profiles runs when ExecutionTracer completes a run", () => {
    const runId = tracer.startRun("graph_main", "user_submit");
    tracer.recordStep(runId, {
      nodeId: "node_submit",
      nodeTitle: "Submit Request",
      nodeType: "network/api",
      category: "Network",
      headerColor: "#0284C7",
      status: "success",
      durationMs: 65, // Hot node
      inputs: {},
      outputs: {},
    });
    const run = tracer.completeRun(runId);
    assert.ok(run);

    // Verify profiler received and analyzed the run
    const latestReport = profiler.getLatestReport();
    assert.ok(latestReport);
    assert.equal(latestReport.runId, run.runId);
    assert.equal(latestReport.totalExecutionTimeMs, 65);
    assert.equal(latestReport.hotNodes.length, 1);
    assert.equal(latestReport.hotNodes[0].nodeId, "node_submit");
  });

  // --------------------------------------------------------------------------
  // 6. Reactive Subscription
  // --------------------------------------------------------------------------
  it("notifies listeners when a new report is generated", () => {
    let notifiedReport: any = null;
    const unsub = profiler.subscribe((rep) => {
      notifiedReport = rep;
    });

    const mockRun: ExecutionRun = {
      runId: "run_sub",
      graphId: "graph_main",
      graphName: "Main Graph",
      trigger: "test",
      status: "completed",
      startTime: 1,
      endTime: 10,
      totalDurationMs: 9,
      steps: [
        {
          stepIndex: 0,
          nodeId: "node_test",
          nodeTitle: "Test Node",
          nodeType: "test",
          category: "Test",
          headerColor: "#206859",
          status: "success",
          durationMs: 9,
          timestamp: 1,
          inputs: {},
          outputs: {},
        },
      ],
    };

    profiler.analyzeRun(mockRun);
    assert.ok(notifiedReport);
    assert.equal(notifiedReport.runId, "run_sub");

    unsub();
  });

  // --------------------------------------------------------------------------
  // 7. Safety & Edge Cases
  // --------------------------------------------------------------------------
  it("safely handles empty execution runs without dividing by zero", () => {
    const emptyRun: ExecutionRun = {
      runId: "run_empty",
      graphId: "graph_main",
      graphName: "Empty Graph",
      trigger: "noop",
      status: "completed",
      startTime: 100,
      endTime: 100,
      totalDurationMs: 0,
      steps: [],
    };

    const report = profiler.analyzeRun(emptyRun);
    assert.equal(report.totalExecutionTimeMs, 0);
    assert.equal(report.totalSteps, 0);
    assert.equal(report.averageStepDurationMs, 0);
    assert.equal(report.slowestNode, null);
    assert.equal(report.hotNodes.length, 0);
    assert.equal(report.flameBars.length, 0);
  });
});
