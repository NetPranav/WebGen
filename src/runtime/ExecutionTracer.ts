"use client";

/**
 * ============================================================================
 * BLUEPRINT EXECUTION TRACER & WIRE PULSE TELEMETRY ENGINE
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.3 & PANELS.md (Panel 20)
 *
 * Capabilities:
 *   1. Node-by-node runtime execution logging with input/output pin snapshots
 *   2. Ring buffer of execution runs (up to 50 runs) with TRACE_OVERFLOW_WARN protection
 *   3. 120 FPS Wasm Wire Pulse Telemetry emitter (speed synchronized to step latency)
 *   4. Blueprint DAG traversal & execution simulation for Play Mode verification
 *   5. DiagnosticBus integration routing runtime failures to Panel 07 (Output Log)
 *   6. Step-by-step playback scrubber support (forward, backward, pause, jump)
 * ============================================================================
 */

import { BlueprintGraph, BlueprintNodeInstance, BlueprintWire } from "@/core/ast/ASTManager";
import { getNodeDefinition } from "@/core/types/node-registry";
import {
  ExecutionRun,
  TraceStep,
  TracePinSnapshot,
  WirePulseTelemetry,
  ExecutionTraceListener,
  PulseTelemetryListener,
} from "@/core/types/trace";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
import { mockDatabase } from "./MockDatabase";
import { BreakpointManager, breakpointManager } from "./BreakpointManager";
import { PerformanceProfiler, performanceProfiler } from "./PerformanceProfiler";

const MAX_RUNS_CAPACITY = 50;

export class ExecutionTracer {
  private runs: ExecutionRun[] = [];
  private activePulses: Map<string, WirePulseTelemetry> = new Map();
  private traceListeners: Set<ExecutionTraceListener> = new Set();
  private pulseListeners: Set<PulseTelemetryListener> = new Set();
  private activeRunId: string | null = null;
  private bpManager: BreakpointManager;
  private profiler: PerformanceProfiler;

  constructor(
    customBpManager?: BreakpointManager,
    customProfiler?: PerformanceProfiler
  ) {
    this.bpManager = customBpManager || breakpointManager;
    this.profiler = customProfiler || performanceProfiler;
  }

  // --------------------------------------------------------------------------
  // Run Management
  // --------------------------------------------------------------------------

  public startRun(
    graphId: string,
    graphName: string,
    trigger = "Manual Simulation"
  ): string {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Buffer overflow management (ring buffer)
    if (this.runs.length >= MAX_RUNS_CAPACITY) {
      const removed = this.runs.shift();
      DiagnosticBus.emit({
        channel: "TRACE_OVERFLOW_WARN",
        severity: "warning",
        source: {
          panel: "ExecutionTracer",
          entityId: removed?.runId || "buffer",
          entityName: "Trace Ring Buffer",
        },
        message: `[TRACE_OVERFLOW_WARN] Execution trace buffer reached capacity (${MAX_RUNS_CAPACITY}). Oldest run '${removed?.runId}' was pruned.`,
        suggestion: "Export trace sessions to JSON if you need to retain long historical benchmarks.",
        isFixable: false,
      });
    }

    const newRun: ExecutionRun = {
      runId,
      graphId,
      graphName,
      trigger,
      startTime: Date.now(),
      totalDurationMs: 0,
      status: "running",
      steps: [],
    };

    this.runs.push(newRun);
    this.activeRunId = runId;
    this.notifyTraceListeners(newRun);

    return runId;
  }

  public recordStep(
    runId: string,
    stepData: Omit<TraceStep, "stepIndex" | "timestamp">
  ): TraceStep {
    const run = this.getRun(runId);
    if (!run) {
      throw new Error(`Execution run '${runId}' not found.`);
    }

    const stepIndex = run.steps.length;
    const fullStep: TraceStep = {
      ...stepData,
      stepIndex,
      timestamp: Date.now(),
    };

    run.steps.push(fullStep);
    run.totalDurationMs += fullStep.durationMs;

    if (fullStep.status === "error") {
      run.status = "failed";
      DiagnosticBus.emit({
        channel: "TRACE_EXEC_ERR",
        severity: "error",
        source: {
          panel: "Panel 20: Execution Trace",
          entityId: fullStep.nodeId,
          entityName: fullStep.nodeTitle,
        },
        message: `[TRACE_EXEC_ERR] Node '${fullStep.nodeTitle}' failed: ${fullStep.errorMessage || "Unknown execution fault"}`,
        suggestion: "Inspect input pin values and data bindings in the Details Inspector.",
        isFixable: false,
      });
    }

    // Trigger wire pulses for traversed output wires
    if (fullStep.nextTraversedWireIds && fullStep.nextTraversedWireIds.length > 0) {
      for (const wireId of fullStep.nextTraversedWireIds) {
        this.triggerWirePulse(wireId, {
          durationMs: Math.max(400, fullStep.durationMs * 40),
          speed: 0.0015,
        });
      }
    }

    this.notifyTraceListeners(run, fullStep);
    return fullStep;
  }

  public completeRun(
    runId?: string,
    finalStatus?: "completed" | "failed"
  ): ExecutionRun | undefined {
    const targetRunId =
      runId ||
      this.activeRunId ||
      (this.runs.length > 0 ? this.runs[this.runs.length - 1].runId : undefined);
    if (!targetRunId) return undefined;

    const run = this.getRun(targetRunId);
    if (!run) return undefined;

    run.endTime = Date.now();
    run.status =
      finalStatus ||
      (run.steps.some((s) => s.status === "error") ? "failed" : "completed");

    if (this.activeRunId === targetRunId) {
      this.activeRunId = null;
    }

    this.notifyTraceListeners(run);
    // Sub-Phase 5.6: Auto-profile completed execution run
    this.profiler.analyzeRun(run);
    return run;
  }

  public getRuns(): ExecutionRun[] {
    return [...this.runs];
  }

  public getRun(runId: string): ExecutionRun | undefined {
    return this.runs.find((r) => r.runId === runId);
  }

  public getActiveRun(): ExecutionRun | undefined {
    return this.activeRunId ? this.getRun(this.activeRunId) : undefined;
  }

  public getLatestRun(): ExecutionRun | undefined {
    return this.runs.length > 0 ? this.runs[this.runs.length - 1] : undefined;
  }

  public clear(): void {
    this.runs = [];
    this.activeRunId = null;
    this.activePulses.clear();
    this.notifyPulseListeners();
  }

  // --------------------------------------------------------------------------
  // Wire Pulse Telemetry
  // --------------------------------------------------------------------------

  public triggerWirePulse(
    wireId: string,
    options?: {
      sourceNodeId?: string;
      targetNodeId?: string;
      pinType?: string;
      speed?: number;
      durationMs?: number;
    }
  ): void {
    const durationMs = options?.durationMs || 800;
    const now = Date.now();

    const pulse: WirePulseTelemetry = {
      wireId,
      sourceNodeId: options?.sourceNodeId || "",
      targetNodeId: options?.targetNodeId || "",
      pinType: options?.pinType || "exec",
      speed: options?.speed || 0.0014,
      durationMs,
      startedAt: now,
      expiresAt: now + durationMs,
    };

    this.activePulses.set(wireId, pulse);
    this.notifyPulseListeners();

    // Auto-clean pulse on expiry
    setTimeout(() => {
      const current = this.activePulses.get(wireId);
      if (current && current.startedAt === pulse.startedAt) {
        this.activePulses.delete(wireId);
        this.notifyPulseListeners();
      }
    }, durationMs + 20);
  }

  public getActivePulses(): WirePulseTelemetry[] {
    const now = Date.now();
    const active: WirePulseTelemetry[] = [];

    for (const [id, pulse] of this.activePulses.entries()) {
      if (now <= pulse.expiresAt) {
        active.push(pulse);
      } else {
        this.activePulses.delete(id);
      }
    }

    return active;
  }

  public isWirePulsing(wireId: string): boolean {
    const pulse = this.activePulses.get(wireId);
    if (!pulse) return false;
    if (Date.now() > pulse.expiresAt) {
      this.activePulses.delete(wireId);
      return false;
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // Simulated Graph Execution Runner
  // --------------------------------------------------------------------------

  /**
   * Evaluates an entire BlueprintGraph in Play Mode simulation,
   * traversing exec wires and recording live execution trace steps.
   */
  public async simulateGraphExecution(
    graph: BlueprintGraph,
    triggerName = "Interactive Simulation"
  ): Promise<ExecutionRun> {
    const runId = this.startRun(graph.id, graph.name, triggerName);
    this.bpManager.startDebugging();

    // 1. Locate entry node (prefer Event nodes)
    const nodes = Object.values(graph.nodes);
    if (nodes.length === 0) {
      this.completeRun(runId, "completed");
      return this.getRun(runId)!;
    }

    let currentNode: BlueprintNodeInstance | undefined = nodes.find(
      (n) => n.type.startsWith("events/") || n.type.includes("Event")
    );
    if (!currentNode) {
      currentNode = nodes[0];
    }

    const visitedNodeIds = new Set<string>();
    const intermediateValues: Record<string, unknown> = {};

    while (currentNode && !visitedNodeIds.has(currentNode.id)) {
      visitedNodeIds.add(currentNode.id);
      const def = getNodeDefinition(currentNode.type);

      const stepStartTime = performance.now();

      // Resolve Input Pin Snapshots
      const inputSnapshots: Record<string, TracePinSnapshot> = {};
      for (const inputPin of def?.inputs || []) {
        if (inputPin.type === "exec") continue;

        // Check if there is an incoming data wire
        const incomingWire = graph.wires.find(
          (w) => w.targetNodeId === currentNode!.id && w.targetPinId === inputPin.id
        );

        let resolvedVal = currentNode.pinValues?.[inputPin.id];
        if (incomingWire) {
          const upstreamKey = `${incomingWire.sourceNodeId}:${incomingWire.sourcePinId}`;
          if (intermediateValues[upstreamKey] !== undefined) {
            resolvedVal = intermediateValues[upstreamKey];
          }
        }
        if (resolvedVal === undefined) {
          resolvedVal = inputPin.defaultValue;
        }

        inputSnapshots[inputPin.id] = {
          pinId: inputPin.id,
          name: inputPin.name,
          type: inputPin.type,
          direction: "input",
          value: resolvedVal,
          wireId: incomingWire?.id,
        };
      }

      // Execute simulated node logic based on type
      const outputSnapshots: Record<string, TracePinSnapshot> = {};
      let isStepError = false;
      let stepErrorMessage: string | undefined;

      try {
        if (currentNode.type === "database/query") {
          const table = String(inputSnapshots.table?.value || "Products");
          const filter = (inputSnapshots.filter?.value as Record<string, unknown>) || {};
          const limit = Number(inputSnapshots.limit?.value || 20);

          const records = mockDatabase.query(table, filter, { limit });
          outputSnapshots.records = {
            pinId: "records",
            name: "records",
            type: "array",
            direction: "output",
            value: records,
          };
          outputSnapshots.count = {
            pinId: "count",
            name: "count",
            type: "number",
            direction: "output",
            value: records.length,
          };
          outputSnapshots.success = {
            pinId: "success",
            name: "success",
            type: "boolean",
            direction: "output",
            value: true,
          };
          intermediateValues[`${currentNode.id}:records`] = records;
          intermediateValues[`${currentNode.id}:count`] = records.length;
        } else if (currentNode.type === "database/insert") {
          const table = String(inputSnapshots.table?.value || "Products");
          const recordData = (inputSnapshots.recordData?.value as Record<string, unknown>) || {};
          const inserted = mockDatabase.insert(table, recordData);

          outputSnapshots.insertedRecord = {
            pinId: "insertedRecord",
            name: "insertedRecord",
            type: "object",
            direction: "output",
            value: inserted,
          };
          outputSnapshots.success = {
            pinId: "success",
            name: "success",
            type: "boolean",
            direction: "output",
            value: true,
          };
          intermediateValues[`${currentNode.id}:insertedRecord`] = inserted;
        } else if (currentNode.type === "math/add") {
          const a = Number(inputSnapshots.a?.value || 0);
          const b = Number(inputSnapshots.b?.value || 0);
          const sum = a + b;
          outputSnapshots.result = {
            pinId: "result",
            name: "result",
            type: "number",
            direction: "output",
            value: sum,
          };
          intermediateValues[`${currentNode.id}:result`] = sum;
        } else if (currentNode.type === "utility/printString") {
          const inString = String(inputSnapshots.inString?.value || "Hello Engine");
          outputSnapshots.outString = {
            pinId: "outString",
            name: "outString",
            type: "string",
            direction: "output",
            value: inString,
          };
        } else {
          // Generic output population
          for (const outPin of def?.outputs || []) {
            if (outPin.type === "exec") continue;
            outputSnapshots[outPin.id] = {
              pinId: outPin.id,
              name: outPin.name,
              type: outPin.type,
              direction: "output",
              value: outPin.defaultValue ?? true,
            };
          }
        }
      } catch (err: unknown) {
        isStepError = true;
        stepErrorMessage = err instanceof Error ? err.message : String(err);
      }

      // Small simulated delay (8ms to 24ms)
      const simulatedDuration = Math.round(
        Math.max(6, performance.now() - stepStartTime + Math.random() * 12 + 6)
      );

      // Check if breakpoint should pause execution at this node
      const shouldPause = this.bpManager.shouldPauseAtNode(currentNode.id, {
        inputs: inputSnapshots,
        outputs: outputSnapshots,
      });
      const activeBp = this.bpManager.getBreakpoint(currentNode.id);
      const stepBreakpointId = shouldPause
        ? (activeBp?.id || `bp_${currentNode.id}`)
        : undefined;

      // Find next connected exec wires (with conditional branch traversal support)
      let outgoingExecWires: BlueprintWire[] = [];
      if (currentNode.type === "flow/branch") {
        const condValue = Boolean(inputSnapshots.condition?.value);
        const expectedPin = condValue ? "trueExec" : "falseExec";
        outgoingExecWires = graph.wires.filter(
          (w) =>
            w.sourceNodeId === currentNode!.id &&
            (w.sourcePinId === expectedPin ||
              (condValue && (w.sourcePinId === "then" || w.sourcePinId === "true")) ||
              (!condValue && (w.sourcePinId === "else" || w.sourcePinId === "false")))
        );
      } else {
        outgoingExecWires = graph.wires.filter(
          (w) =>
            w.sourceNodeId === currentNode!.id &&
            (w.pinType === "exec" || w.isExec || w.sourcePinId === "execOut" || w.sourcePinId === "then")
        );
      }

      const traversedWireIds = outgoingExecWires.map((w) => w.id);

      // Record Step
      const recordedStep = this.recordStep(runId, {
        nodeId: currentNode.id,
        nodeTitle: currentNode.title,
        nodeType: currentNode.type,
        category: def?.category || "General",
        headerColor: def?.headerColor || "#206859",
        inputs: inputSnapshots,
        outputs: outputSnapshots,
        durationMs: simulatedDuration,
        status: isStepError ? "error" : "success",
        errorMessage: stepErrorMessage,
        nextTraversedWireIds: traversedWireIds,
        breakpointId: stepBreakpointId,
      });

      // Pause Gate: freeze execution if breakpoint hit
      if (shouldPause) {
        const activeRun = this.getRun(runId);
        if (activeRun) {
          activeRun.isPaused = true;
          this.notifyTraceListeners(activeRun, recordedStep);
        }

        await this.bpManager.pauseAtBreakpoint(
          currentNode.id,
          runId,
          recordedStep.stepIndex,
          inputSnapshots,
          outputSnapshots
        );

        if (activeRun) {
          activeRun.isPaused = false;
          this.notifyTraceListeners(activeRun, recordedStep);
        }

        // Abort simulation early if stopDebugging was called
        if (this.bpManager.getState() === "idle") {
          this.completeRun(runId, "failed");
          return this.getRun(runId)!;
        }
      }

      if (isStepError) {
        break;
      }

      // Traverse next node
      if (outgoingExecWires.length > 0) {
        const nextWire = outgoingExecWires[0];
        currentNode = graph.nodes[nextWire.targetNodeId];
      } else {
        currentNode = undefined;
      }
    }

    this.completeRun(runId);
    if (this.bpManager.getState() !== "idle") {
      this.bpManager.stopDebugging();
    }
    return this.getRun(runId)!;
  }

  // --------------------------------------------------------------------------
  // Serialization & Export
  // --------------------------------------------------------------------------

  public exportTraceJson(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
        totalRuns: this.runs.length,
        runs: this.runs,
      },
      null,
      2
    );
  }

  public importTraceJson(jsonString: string): void {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.runs && Array.isArray(parsed.runs)) {
        this.runs = parsed.runs;
        this.activeRunId = this.runs.length > 0 ? this.runs[this.runs.length - 1].runId : null;
        if (this.runs.length > 0) {
          this.notifyTraceListeners(this.runs[this.runs.length - 1]);
        }
      }
    } catch (err) {
      console.error("Failed to import trace JSON:", err);
    }
  }

  // --------------------------------------------------------------------------
  // Event Subscription
  // --------------------------------------------------------------------------

  public subscribe(listener: ExecutionTraceListener): () => void {
    this.traceListeners.add(listener);
    return () => {
      this.traceListeners.delete(listener);
    };
  }

  public subscribePulses(listener: PulseTelemetryListener): () => void {
    this.pulseListeners.add(listener);
    return () => {
      this.pulseListeners.delete(listener);
    };
  }

  private notifyTraceListeners(run: ExecutionRun, activeStep?: TraceStep): void {
    for (const listener of this.traceListeners) {
      try {
        listener(run, activeStep);
      } catch (err) {
        console.error("ExecutionTrace listener error:", err);
      }
    }
  }

  private notifyPulseListeners(): void {
    const pulses = this.getActivePulses();
    for (const listener of this.pulseListeners) {
      try {
        listener(pulses);
      } catch (err) {
        console.error("PulseTelemetry listener error:", err);
      }
    }
  }
}

// Global Singleton Instance
export const executionTracer = new ExecutionTracer();
