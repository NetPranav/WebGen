"use client";

/**
 * ============================================================================
 * PANEL 20: VISUAL EXECUTION TRACE & BLUEPRINT DEBUGGER
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.3 & PANELS.md (Panel 20)
 *
 * Capabilities:
 *   1. Chronological timeline of executed nodes with input/output pin payload snapshots
 *   2. Step-by-step playback scrubber (Play, Pause, Step Next, Step Prev, Jump to Start/End)
 *   3. Real-time Wasm wire pulse telemetry triggering as nodes execute
 *   4. Click-to-Jump-to-Node navigation focusing the node on Blueprint Canvas
 *   5. "⚡ Run Test Trace" action simulating full active graph DAG traversal
 *   6. Status filtering (All, Success, Errors) and JSON trace export
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  Download,
  Zap,
  Filter,
  ArrowRight,
  Search,
  Square,
  Bug,
  Flame,
  BarChart2,
  Eye,
  Plus,
  Check,
  Edit2,
} from "lucide-react";
import { executionTracer } from "@/runtime/ExecutionTracer";
import { breakpointManager } from "@/runtime/BreakpointManager";
import { performanceProfiler } from "@/runtime/PerformanceProfiler";
import { ProfilerReport, NodePerformanceMetric, FlameGraphBar } from "@/core/types/profiler";
import { watchExpressionManager } from "@/runtime/WatchExpressionManager";
import { WatchExpression, WatchEvaluationResult, WatchEvaluationContext } from "@/core/types/watch";
import { DebuggerState, BreakpointHitEvent } from "@/core/types/debugger";
import { ExecutionRun, TraceStep, TracePinSnapshot } from "@/core/types/trace";
import { useProjectStore } from "@/core/store/useProjectStore";
import { getPinColor, PinDataType } from "@/core/types/node-registry";

export interface ExecutionTracePanelProps {
  onNavigateToNode?: (nodeId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface FlameGraphViewProps {
  currentReport: ProfilerReport | null;
  warnThreshold: number;
  setWarnThreshold: (val: number) => void;
  activeRun: ExecutionRun | null;
  onNavigateToNode?: (nodeId: string) => void;
  onSelectStepIndex?: (index: number) => void;
}

const FlameGraphView: React.FC<FlameGraphViewProps> = ({
  currentReport,
  warnThreshold,
  setWarnThreshold,
  activeRun,
  onNavigateToNode,
  onSelectStepIndex,
}) => {
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const metricList: NodePerformanceMetric[] = useMemo(() => {
    if (!currentReport) return [];
    return Object.values(currentReport.metricsByNodeId).sort(
      (a: NodePerformanceMetric, b: NodePerformanceMetric) => b.totalDurationMs - a.totalDurationMs
    );
  }, [currentReport]);

  if (!currentReport || currentReport.totalSteps === 0) {
    return (
      <div className="flame-graph-view" style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 16px",
            color: "#64748B",
            textAlign: "center",
            gap: 12,
          }}
        >
          <Flame size={36} style={{ opacity: 0.35, color: "#EA580C" }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8" }}>
            No Profiling Data Available
          </div>
          <div style={{ fontSize: 11, maxWidth: 320, color: "#64748B", lineHeight: 1.5 }}>
            Run the Blueprint flow or click <strong style={{ color: "#E2E8F0" }}>&apos;Run Test Trace&apos;</strong> above to generate a performance flame graph waterfall and bottleneck metrics.
          </div>
        </div>
      </div>
    );
  }

  const totalDuration = Math.max(currentReport.totalExecutionTimeMs, 1);

  return (
    <div className="flame-graph-view">
      {/* Profiler Controls Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "8px 12px",
          backgroundColor: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flame size={16} style={{ color: "#EA580C" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC" }}>
            Waterfall Flame Graph & Bottleneck Analysis
          </span>
          <span
            style={{
              fontSize: 9.5,
              padding: "1px 6px",
              borderRadius: 4,
              backgroundColor: "rgba(234, 88, 12, 0.15)",
              border: "1px solid rgba(234, 88, 12, 0.3)",
              color: "#FB923C",
              fontWeight: 700,
            }}
          >
            {currentReport.totalSteps} STEPS • {currentReport.totalExecutionTimeMs}ms
          </span>
        </div>

        {/* Bottleneck threshold slider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "#94A3B8" }}>
          <span>Bottleneck Threshold:</span>
          <input
            type="range"
            min={10}
            max={250}
            step={5}
            value={warnThreshold}
            onChange={(e) => {
              const val = Number(e.target.value);
              setWarnThreshold(val);
              performanceProfiler.setSettings({ hotNodeThresholdMs: val });
              if (activeRun) {
                performanceProfiler.analyzeRun(activeRun);
              }
            }}
            style={{ width: 90, accentColor: "#EA580C", cursor: "pointer" }}
          />
          <span
            style={{
              padding: "2px 7px",
              borderRadius: 4,
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              color: "#F97316",
              fontWeight: 800,
              minWidth: 42,
              textAlign: "center",
            }}
          >
            {warnThreshold}ms
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="profiler-kpi-grid">
        <div className="profiler-kpi-card">
          <div className="profiler-kpi-card__label">
            <Clock size={11} style={{ color: "#38BDF8" }} />
            Total Latency
          </div>
          <div className="profiler-kpi-card__value">
            {currentReport.totalExecutionTimeMs}{" "}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>ms</span>
          </div>
          <div className="profiler-kpi-card__sub">
            Complete run duration
          </div>
        </div>

        <div className="profiler-kpi-card">
          <div className="profiler-kpi-card__label">
            <BarChart2 size={11} style={{ color: "#34D399" }} />
            Executed Nodes
          </div>
          <div className="profiler-kpi-card__value">
            {currentReport.totalSteps}{" "}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>steps</span>
          </div>
          <div className="profiler-kpi-card__sub">
            {metricList.length} unique nodes evaluated
          </div>
        </div>

        <div className="profiler-kpi-card">
          <div className="profiler-kpi-card__label">
            <Activity size={11} style={{ color: "#A78BFA" }} />
            Average Step
          </div>
          <div className="profiler-kpi-card__value">
            {currentReport.averageStepDurationMs.toFixed(1)}{" "}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>ms</span>
          </div>
          <div className="profiler-kpi-card__sub">
            Per-step mean execution time
          </div>
        </div>

        <div
          className="profiler-kpi-card"
          style={{
            borderColor: currentReport.hotNodes.length > 0 ? "rgba(234, 88, 12, 0.5)" : "#1E293B",
            background: currentReport.hotNodes.length > 0 ? "rgba(234, 88, 12, 0.08)" : "#0F172A",
          }}
        >
          <div className="profiler-kpi-card__label">
            <Flame size={11} style={{ color: currentReport.hotNodes.length > 0 ? "#EA580C" : "#64748B" }} />
            Hot Bottlenecks
          </div>
          <div
            className="profiler-kpi-card__value"
            style={{ color: currentReport.hotNodes.length > 0 ? "#F97316" : "#10B981" }}
          >
            {currentReport.hotNodes.length}{" "}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>
              {currentReport.hotNodes.length === 1 ? "node" : "nodes"}
            </span>
          </div>
          <div className="profiler-kpi-card__sub">
            {currentReport.hotNodes.length > 0
              ? `Exceeding ${currentReport.thresholdMs}ms threshold`
              : "All nodes performing within budget"}
          </div>
        </div>
      </div>

      {/* Waterfall Flame Graph Card */}
      <div className="flame-graph-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#F1F5F9" }}>
            <BarChart2 size={13} style={{ color: "#38BDF8" }} />
            <span>Execution Timeline Waterfall</span>
          </div>
          <span style={{ fontSize: 9.5, color: "#64748B" }}>
            Click any bar to navigate canvas to that node
          </span>
        </div>

        {/* Time Ticks Axis */}
        <div className="flame-graph-axis">
          <span>0ms</span>
          <span>{(totalDuration * 0.25).toFixed(1)}ms</span>
          <span>{(totalDuration * 0.5).toFixed(1)}ms</span>
          <span>{(totalDuration * 0.75).toFixed(1)}ms</span>
          <span>{totalDuration}ms</span>
        </div>

        {/* Waterfall Bars */}
        <div className="flame-graph-list">
          {currentReport.flameBars.map((bar: FlameGraphBar, idx: number) => {
            const leftPercent = totalDuration > 0
              ? (bar.startTimeOffsetMs / totalDuration) * 100
              : 0;
            const widthPercent = Math.max(bar.percentageOfTotal, 2);
            const isHovered = hoveredBarIndex === idx;

            return (
              <div
                key={idx}
                className="flame-graph-row"
                onMouseEnter={() => setHoveredBarIndex(idx)}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                <div
                  className="flame-graph-row__label"
                  onClick={() => {
                    if (onNavigateToNode) onNavigateToNode(bar.nodeId);
                    if (onSelectStepIndex) onSelectStepIndex(bar.stepIndex);
                  }}
                  title={`Click to jump to node: ${bar.nodeTitle}`}
                >
                  <span style={{ color: "#64748B", fontSize: 9 }}>#{bar.stepIndex + 1}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {bar.nodeTitle}
                  </span>
                </div>

                <div className="flame-graph-row__track">
                  <div
                    className={`flame-graph-bar ${bar.isHot ? "flame-graph-bar--hot" : ""}`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: bar.isHot ? undefined : "#206859",
                      boxShadow: isHovered
                        ? "0 0 10px rgba(56, 189, 248, 0.5)"
                        : undefined,
                    }}
                    onClick={() => {
                      if (onNavigateToNode) onNavigateToNode(bar.nodeId);
                      if (onSelectStepIndex) onSelectStepIndex(bar.stepIndex);
                    }}
                    title={`${bar.nodeTitle} (${bar.category})
Step #${bar.stepIndex + 1}
Start Offset: +${bar.startTimeOffsetMs}ms
Duration: ${bar.durationMs}ms (${bar.percentageOfTotal}% of run total)
Status: ${bar.status}${bar.isHot ? "\n🔥 BOTTLENECK: Exceeds " + currentReport.thresholdMs + "ms threshold!" : ""}`}
                  >
                    {bar.isHot && <Flame size={9} style={{ marginRight: 3, flexShrink: 0 }} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      {bar.durationMs}ms
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Latency & Bottleneck Ranking Table */}
      <div className="profiler-table-container">
        <div
          style={{
            padding: "10px 14px",
            background: "#1E293B",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #334155",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 6 }}>
            <Flame size={13} style={{ color: "#EA580C" }} />
            <span>Node Latency & Bottleneck Ranking</span>
          </div>
          <span style={{ fontSize: 9.5, color: "#94A3B8" }}>
            Sorted by total execution duration descending
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="profiler-table">
            <thead>
              <tr>
                <th style={{ width: 45 }}>Rank</th>
                <th>Node Title & Category</th>
                <th style={{ width: 60 }}>Hits</th>
                <th style={{ width: 90 }}>Total Latency</th>
                <th style={{ width: 85 }}>% of Run</th>
                <th style={{ width: 130 }}>Min / Max / Avg</th>
                <th style={{ width: 110 }}>Performance</th>
                <th style={{ width: 75, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {metricList.map((m: NodePerformanceMetric, idx: number) => (
                <tr key={m.nodeId}>
                  <td style={{ fontWeight: 700, color: idx < 3 ? "#F59E0B" : "#64748B" }}>
                    #{idx + 1}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, color: "#F1F5F9" }}>{m.nodeTitle}</span>
                      <span
                        style={{
                          fontSize: 8.5,
                          padding: "1px 5px",
                          borderRadius: 3,
                          backgroundColor: "rgba(100, 116, 139, 0.2)",
                          color: "#94A3B8",
                          textTransform: "uppercase",
                        }}
                      >
                        {m.category}
                      </span>
                    </div>
                  </td>
                  <td>{m.executionCount}</td>
                  <td style={{ fontWeight: 700, color: m.isHotNode ? "#F97316" : "#38BDF8" }}>
                    {m.totalDurationMs} ms
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{m.percentageOfTotal}%</span>
                      <div
                        style={{
                          width: 32,
                          height: 4,
                          backgroundColor: "#334155",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(m.percentageOfTotal, 100)}%`,
                            height: "100%",
                            backgroundColor: m.isHotNode ? "#EA580C" : "#206859",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 10, color: "#94A3B8", fontFamily: "monospace" }}>
                    {m.minDurationMs} / {m.maxDurationMs} / {m.avgDurationMs.toFixed(1)} ms
                  </td>
                  <td>
                    {m.isHotNode ? (
                      <span className="hot-node-badge">
                        🔥 Bottleneck
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 9.5,
                          color: "#34D399",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={11} /> Normal
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToNode) onNavigateToNode(m.nodeId);
                      }}
                      title="Navigate to node on canvas"
                      style={{
                        background: "none",
                        border: "1px solid #334155",
                        borderRadius: 4,
                        color: "#38BDF8",
                        fontSize: 9.5,
                        padding: "2px 7px",
                        cursor: "pointer",
                      }}
                    >
                      Jump ➔
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const ExecutionTracePanel: React.FC<ExecutionTracePanelProps> = ({
  onNavigateToNode,
  className = "",
  style = {},
}) => {
  const { blueprintGraphs, activeBlueprintGraphId, stateVariables } = useProjectStore();
  const activeGraph = activeBlueprintGraphId ? blueprintGraphs[activeBlueprintGraphId] : null;

  // Local state
  const [runs, setRuns] = useState<ExecutionRun[]>(() => executionTracer.getRuns());
  const [selectedRunId, setSelectedRunId] = useState<string | null>(() => {
    const latest = executionTracer.getLatestRun();
    return latest ? latest.runId : null;
  });
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "error">("all");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isExecutingTest, setIsExecutingTest] = useState<boolean>(false);
  const [debuggerState, setDebuggerState] = useState<DebuggerState>(() => breakpointManager.getState());
  const [lastHitEvent, setLastHitEvent] = useState<BreakpointHitEvent | null>(() => breakpointManager.getLastHitEvent());
  const [breakpointCount, setBreakpointCount] = useState<number>(() => breakpointManager.getBreakpoints().length);

  // Sub-Phase 5.6: Performance Profiler & Flame Graph State
  const [viewMode, setViewMode] = useState<"timeline" | "flamegraph">("timeline");
  const [profilerReport, setProfilerReport] = useState<ProfilerReport | null>(() => performanceProfiler.getLatestReport());
  const [warnThreshold, setWarnThreshold] = useState<number>(() => performanceProfiler.getSettings().hotNodeThresholdMs);

  // Sub-Phase 5.7: Watch Expressions & Live Variable Inspector State
  const [inspectorTab, setInspectorTab] = useState<"pins" | "watch">("pins");
  const [watches, setWatches] = useState<WatchExpression[]>(() => watchExpressionManager.getWatches());
  const [watchResults, setWatchResults] = useState<Map<string, WatchEvaluationResult>>(() =>
    watchExpressionManager.getLastResults()
  );
  const [newWatchInput, setNewWatchInput] = useState<string>("");
  const [editingWatchId, setEditingWatchId] = useState<string | null>(null);
  const [editingWatchExpr, setEditingWatchExpr] = useState<string>("");

  // Subscribe to live trace updates
  useEffect(() => {
    const unsubscribe = executionTracer.subscribe((updatedRun) => {
      setRuns(executionTracer.getRuns());
      setSelectedRunId(updatedRun.runId);
      if (updatedRun.steps.length > 0) {
        setSelectedStepIndex(updatedRun.steps.length - 1);
      }
    });

    const unsubscribeDebugger = breakpointManager.subscribe((newState, hitEvent) => {
      setDebuggerState(newState);
      setBreakpointCount(breakpointManager.getBreakpoints().length);
      if (hitEvent) {
        setLastHitEvent(hitEvent);
        setSelectedStepIndex(hitEvent.stepIndex);
      } else if (newState === "idle") {
        setLastHitEvent(null);
      }
    });

    const unsubscribeProfiler = performanceProfiler.subscribe((report: ProfilerReport) => {
      setProfilerReport(report);
    });

    const unsubscribeWatch = watchExpressionManager.subscribe((updatedWatches, updatedResults) => {
      setWatches([...updatedWatches]);
      setWatchResults(new Map(updatedResults));
    });

    return () => {
      unsubscribe();
      unsubscribeDebugger();
      unsubscribeProfiler();
      unsubscribeWatch();
    };
  }, []);

  // Active run
  const activeRun = useMemo(() => {
    return runs.find((r) => r.runId === selectedRunId) || runs[runs.length - 1] || null;
  }, [runs, selectedRunId]);

  // Selected step
  const activeStep: TraceStep | null = useMemo(() => {
    if (!activeRun || activeRun.steps.length === 0) return null;
    return activeRun.steps[selectedStepIndex] || activeRun.steps[0] || null;
  }, [activeRun, selectedStepIndex]);

  // Sub-Phase 5.7: Real-time Evaluation of Watch Expressions across steps
  useEffect(() => {
    const inputs: Record<string, unknown> = {};
    if (activeStep?.inputs) {
      for (const [key, snap] of Object.entries(activeStep.inputs)) {
        inputs[key] = snap.value;
        if (snap.name) inputs[snap.name] = snap.value;
      }
    }

    const outputs: Record<string, unknown> = {};
    if (activeStep?.outputs) {
      for (const [key, snap] of Object.entries(activeStep.outputs)) {
        outputs[key] = snap.value;
        if (snap.name) outputs[snap.name] = snap.value;
      }
    }

    const stateMap: Record<string, unknown> = {};
    if (stateVariables) {
      for (const [key, v] of Object.entries(stateVariables)) {
        stateMap[key] = v.value ?? v.defaultValue;
        if (v.name) stateMap[v.name] = v.value ?? v.defaultValue;
      }
    }

    const graphVars: Record<string, unknown> = {};
    if (activeGraph?.variables) {
      for (const v of activeGraph.variables) {
        graphVars[v.name] = v.defaultValue;
      }
    }

    const ctx: WatchEvaluationContext = {
      inputs,
      outputs,
      state: stateMap,
      variables: graphVars,
      step: activeStep
        ? {
            stepIndex: activeStep.stepIndex,
            nodeId: activeStep.nodeId,
            nodeTitle: activeStep.nodeTitle,
            nodeType: activeStep.nodeType,
            category: activeStep.category,
            durationMs: activeStep.durationMs,
            status: activeStep.status,
          }
        : undefined,
      run: activeRun
        ? {
            runId: activeRun.runId,
            trigger: activeRun.trigger,
            status: activeRun.status,
            totalDurationMs: activeRun.totalDurationMs,
          }
        : undefined,
    };

    // Results reach `watchResults` through the manager subscription above.
    watchExpressionManager.evaluateAll(ctx, selectedStepIndex);
  }, [activeStep, selectedStepIndex, activeRun, stateVariables, activeGraph]);

  const hasMutatedWatch = useMemo(() => {
    return Array.from(watchResults.values()).some((r) => r.hasMutated);
  }, [watchResults]);

  // Profiler Report for the active run
  const currentReport: ProfilerReport | null = useMemo(() => {
    if (!activeRun) return null;
    if (profilerReport && profilerReport.runId === activeRun.runId) {
      return profilerReport;
    }
    return performanceProfiler.analyzeRun(activeRun);
  }, [activeRun, profilerReport]);

  const hotNodesCount = currentReport?.hotNodes.length || 0;

  // Filtered steps
  const filteredSteps = useMemo(() => {
    if (!activeRun) return [];
    if (filterStatus === "all") return activeRun.steps;
    return activeRun.steps.filter((s) => s.status === filterStatus);
  }, [activeRun, filterStatus]);


  // Playback Scrubber Timer
  useEffect(() => {
    if (!isPlaying || !activeRun || activeRun.steps.length === 0) return;

    const timer = setInterval(() => {
      setSelectedStepIndex((prev) => {
        if (prev >= activeRun.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const nextIdx = prev + 1;
        const step = activeRun.steps[nextIdx];
        if (step && onNavigateToNode) {
          onNavigateToNode(step.nodeId);
        }
        return nextIdx;
      });
    }, 850);

    return () => clearInterval(timer);
  }, [isPlaying, activeRun, onNavigateToNode]);

  // Scrubber controls
  const handleGoStart = () => {
    setSelectedStepIndex(0);
    if (activeRun?.steps[0] && onNavigateToNode) {
      onNavigateToNode(activeRun.steps[0].nodeId);
    }
  };

  const handleGoEnd = () => {
    if (!activeRun) return;
    const last = activeRun.steps.length - 1;
    setSelectedStepIndex(Math.max(0, last));
    if (activeRun.steps[last] && onNavigateToNode) {
      onNavigateToNode(activeRun.steps[last].nodeId);
    }
  };

  const handleStepPrev = () => {
    setSelectedStepIndex((prev) => {
      const next = Math.max(0, prev - 1);
      if (activeRun?.steps[next] && onNavigateToNode) {
        onNavigateToNode(activeRun.steps[next].nodeId);
      }
      return next;
    });
  };

  const handleStepNext = () => {
    if (!activeRun) return;
    setSelectedStepIndex((prev) => {
      const next = Math.min(activeRun.steps.length - 1, prev + 1);
      if (activeRun.steps[next] && onNavigateToNode) {
        onNavigateToNode(activeRun.steps[next].nodeId);
      }
      return next;
    });
  };

  // Run simulated graph trace
  const handleRunTestTrace = useCallback(async () => {
    if (!activeGraph) return;
    setIsExecutingTest(true);
    try {
      const run = await executionTracer.simulateGraphExecution(
        activeGraph,
        `Play Simulation (${activeGraph.name})`
      );
      setRuns(executionTracer.getRuns());
      setSelectedRunId(run.runId);
      setSelectedStepIndex(0);
      if (run.steps.length > 0 && onNavigateToNode) {
        onNavigateToNode(run.steps[0].nodeId);
      }
    } finally {
      setIsExecutingTest(false);
    }
  }, [activeGraph, onNavigateToNode]);

  // Clear traces
  const handleClear = () => {
    executionTracer.clear();
    setRuns([]);
    setSelectedRunId(null);
    setSelectedStepIndex(0);
  };

  // Export trace JSON
  const handleExport = () => {
    const json = executionTracer.exportTraceJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trace-${activeRun?.runId || "session"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`execution-trace-panel ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#0B0F19",
        color: "#E2E8F0",
        fontFamily: "Inter, -apple-system, sans-serif",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Top Header & Playback Scrubber Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 14px",
          height: 42,
          backgroundColor: "#0F172A",
          borderBottom: "1px solid #1E293B",
          fontSize: 11,
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Left: Panel Title & Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={14} style={{ color: "#38BDF8" }} />
            <span style={{ fontWeight: 700, color: "#F8FAFC", fontSize: 12 }}>
              Execution Trace
            </span>
          </div>
          <span
            style={{
              padding: "2px 6px",
              backgroundColor: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: 4,
              color: "#38BDF8",
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            PANEL 20 • BLUEPRINT DEBUGGER
          </span>

          {/* View Mode Toggle: Timeline vs Flame Graph */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#0B0F19",
              border: "1px solid #334155",
              borderRadius: 6,
              padding: 2,
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 4,
                border: "none",
                backgroundColor: viewMode === "timeline" ? "#1E293B" : "transparent",
                color: viewMode === "timeline" ? "#38BDF8" : "#94A3B8",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Activity size={11} />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flamegraph")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 4,
                border: "none",
                backgroundColor: viewMode === "flamegraph" ? "#EA580C" : "transparent",
                color: viewMode === "flamegraph" ? "#FFFFFF" : "#94A3B8",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Flame size={11} />
              <span>Flame Graph & Profiler</span>
              {hotNodesCount > 0 && (
                <span
                  style={{
                    backgroundColor: viewMode === "flamegraph" ? "#7C2D12" : "#EA580C",
                    color: "#FFFFFF",
                    fontSize: 8.5,
                    padding: "0 4px",
                    borderRadius: 10,
                    fontWeight: 800,
                  }}
                >
                  {hotNodesCount}
                </span>
              )}
            </button>
          </div>

          {/* Run Switcher Dropdown */}
          {runs.length > 0 && (
            <select
              value={selectedRunId || ""}
              onChange={(e) => {
                setSelectedRunId(e.target.value);
                setSelectedStepIndex(0);
              }}
              style={{
                backgroundColor: "#1E293B",
                color: "#E2E8F0",
                border: "1px solid #334155",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 10,
                outline: "none",
                cursor: "pointer",
                maxWidth: 220,
              }}
            >
              {runs.map((r, i) => (
                <option key={r.runId} value={r.runId}>
                  #{runs.length - i} {r.trigger} ({r.steps.length} steps • {r.totalDurationMs}ms)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Center: Playback Scrubber */}
        {activeRun && activeRun.steps.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#1E293B",
              padding: "2px 8px",
              borderRadius: 6,
              border: "1px solid #334155",
            }}
          >
            <button
              type="button"
              onClick={handleGoStart}
              title="Go to First Step"
              style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 3 }}
            >
              <SkipBack size={12} />
            </button>
            <button
              type="button"
              onClick={handleStepPrev}
              disabled={selectedStepIndex === 0}
              title="Step Backward"
              style={{
                background: "none",
                border: "none",
                color: selectedStepIndex === 0 ? "#475569" : "#E2E8F0",
                cursor: selectedStepIndex === 0 ? "not-allowed" : "pointer",
                padding: 3,
              }}
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause Playback" : "Play Step-by-Step"}
              style={{
                background: isPlaying ? "#EF4444" : "#206859",
                border: "none",
                color: "#FFFFFF",
                borderRadius: 4,
                cursor: "pointer",
                padding: "3px 8px",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              {isPlaying ? <Pause size={10} /> : <Play size={10} fill="#FFFFFF" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              onClick={handleStepNext}
              disabled={selectedStepIndex === activeRun.steps.length - 1}
              title="Step Forward"
              style={{
                background: "none",
                border: "none",
                color: selectedStepIndex === activeRun.steps.length - 1 ? "#475569" : "#E2E8F0",
                cursor: selectedStepIndex === activeRun.steps.length - 1 ? "not-allowed" : "pointer",
                padding: 3,
              }}
            >
              <ChevronRight size={13} />
            </button>
            <button
              type="button"
              onClick={handleGoEnd}
              title="Go to Last Step"
              style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 3 }}
            >
              <SkipForward size={12} />
            </button>

            <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 4 }}>
              Step <strong style={{ color: "#F8FAFC" }}>{selectedStepIndex + 1}</strong> / {activeRun.steps.length}
            </span>
          </div>
        )}

        {/* Right Actions: Test Trace, Clear, Export */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Status filter chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {(["all", "success", "error"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterStatus(mode)}
                style={{
                  padding: "2px 7px",
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  cursor: "pointer",
                  border: filterStatus === mode ? "1px solid #38BDF8" : "1px solid transparent",
                  backgroundColor: filterStatus === mode ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: filterStatus === mode ? "#38BDF8" : "#64748B",
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          <span style={{ color: "#334155" }}>|</span>

          {/* Test Trace Runner */}
          <button
            type="button"
            onClick={handleRunTestTrace}
            disabled={isExecutingTest || !activeGraph}
            title="Simulate full graph traversal and fire real-time wire pulses"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 9px",
              borderRadius: 4,
              border: "1px solid #206859",
              backgroundColor: "#206859",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 600,
              cursor: isExecutingTest || !activeGraph ? "not-allowed" : "pointer",
              opacity: isExecutingTest || !activeGraph ? 0.6 : 1,
            }}
          >
            <Zap size={11} fill="#FFFFFF" />
            <span>{isExecutingTest ? "Running..." : "Run Test Trace"}</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExport}
            disabled={runs.length === 0}
            title="Export full execution trace session as JSON"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 7px",
              borderRadius: 4,
              border: "1px solid #334155",
              backgroundColor: "#1E293B",
              color: "#94A3B8",
              fontSize: 10,
              cursor: runs.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <Download size={11} />
            <span>Export</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            disabled={runs.length === 0}
            title="Clear all trace history"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 6px",
              borderRadius: 4,
              border: "1px solid #334155",
              backgroundColor: "#1E293B",
              color: "#94A3B8",
              fontSize: 10,
              cursor: runs.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Interactive Debugger Action Toolbar (Sub-Phase 5.5) */}
      <div className="debugger-toolbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Resume Button */}
          <button
            type="button"
            className="debugger-btn debugger-btn--resume"
            onClick={() => breakpointManager.resume()}
            disabled={debuggerState !== "paused"}
            title="Resume execution to next breakpoint (▶)"
          >
            <Play size={10} fill={debuggerState === "paused" ? "#34D399" : "none"} />
            <span>Resume</span>
          </button>

          {/* Step Over Button */}
          <button
            type="button"
            className="debugger-btn debugger-btn--step"
            onClick={() => breakpointManager.stepOver()}
            disabled={debuggerState !== "paused"}
            title="Step over to next node (⏭)"
          >
            <SkipForward size={10} />
            <span>Step Over</span>
          </button>

          {/* Stop Debugging Button */}
          <button
            type="button"
            className="debugger-btn debugger-btn--stop"
            onClick={() => breakpointManager.stopDebugging()}
            disabled={debuggerState === "idle"}
            title="Stop debugging session (⏹)"
          >
            <Square size={10} fill={debuggerState !== "idle" ? "#F87171" : "none"} />
            <span>Stop</span>
          </button>

          {/* Live Debugger Status Pill */}
          <div className={`debugger-status-pill debugger-status-pill--${debuggerState}`}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor:
                  debuggerState === "paused"
                    ? "#F59E0B"
                    : debuggerState === "running"
                    ? "#38BDF8"
                    : debuggerState === "stepping"
                    ? "#FBBF24"
                    : "#64748B",
                boxShadow:
                  debuggerState === "paused"
                    ? "0 0 6px #F59E0B"
                    : debuggerState === "running"
                    ? "0 0 6px #38BDF8"
                    : "none",
              }}
            />
            <span>
              {debuggerState === "paused"
                ? `PAUSED AT: ${
                    lastHitEvent?.nodeId
                      ? activeGraph?.nodes[lastHitEvent.nodeId]?.title || lastHitEvent.nodeId
                      : "BREAKPOINT"
                  }`
                : debuggerState === "running"
                ? "DEBUGGER RUNNING"
                : debuggerState === "stepping"
                ? "STEPPING..."
                : "DEBUGGER IDLE"}
            </span>
          </div>
        </div>

        {/* Breakpoints Count Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#94A3B8" }}>
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: breakpointCount > 0 ? "#EF4444" : "#64748B",
              boxShadow: breakpointCount > 0 ? "0 0 6px rgba(239, 68, 68, 0.7)" : "none",
            }}
          />
          <span>{breakpointCount} Breakpoint{breakpointCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Main Content Area: Left Chronological Stream + Right Pin Payload Inspector OR Flame Graph */}
      {viewMode === "flamegraph" ? (
        <FlameGraphView
          currentReport={currentReport}
          warnThreshold={warnThreshold}
          setWarnThreshold={setWarnThreshold}
          activeRun={activeRun}
          onNavigateToNode={onNavigateToNode}
          onSelectStepIndex={setSelectedStepIndex}
        />
      ) : (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Column: Chronological Node Step Timeline */}
        <div
          style={{
            flex: "0 0 380px",
            borderRight: "1px solid #1E293B",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0B0F19",
            overflowY: "auto",
          }}
        >
          {filteredSteps.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 16px",
                color: "#64748B",
                textAlign: "center",
                gap: 8,
              }}
            >
              <Activity size={24} style={{ opacity: 0.4 }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>
                No Execution Traces Recorded
              </div>
              <div style={{ fontSize: 10, maxWidth: 260 }}>
                Interact with elements in Play Mode or click <strong>&lsquo;Run Test Trace&rsquo;</strong> above to simulate logic execution and visualize Wasm wire pulses.
              </div>
            </div>
          ) : (
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredSteps.map((step, idx) => {
                const isSelected = selectedStepIndex === step.stepIndex;
                const isSuccess = step.status === "success";

                return (
                  <div
                    key={step.stepIndex}
                    onClick={() => {
                      setSelectedStepIndex(step.stepIndex);
                      if (onNavigateToNode) onNavigateToNode(step.nodeId);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 6,
                      backgroundColor: isSelected ? "#1E293B" : "rgba(15, 23, 42, 0.6)",
                      border: isSelected
                        ? "1px solid #38BDF8"
                        : "1px solid #1E293B",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    {/* Category Color Stripe */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 4,
                        bottom: 4,
                        width: 3,
                        borderRadius: "0 2px 2px 0",
                        backgroundColor: step.headerColor || "#206859",
                      }}
                    />

                    {/* Step Index Badge with Breakpoint Indicator */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: isSelected ? "#38BDF8" : "#64748B",
                        backgroundColor: isSelected ? "rgba(56, 189, 248, 0.15)" : "#0F172A",
                        padding: "1px 5px",
                        borderRadius: 3,
                        marginTop: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {step.breakpointId && (
                        <span
                          title={`Paused at Breakpoint: ${step.breakpointId}`}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "#EF4444",
                            boxShadow: "0 0 6px rgba(239, 68, 68, 0.9)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      #{step.stepIndex + 1}
                    </span>

                    {/* Node Info & Timing */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: isSelected ? "#FFFFFF" : "#E2E8F0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {step.nodeTitle}
                        </span>

                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 9,
                            fontWeight: 600,
                            color: isSuccess ? "#34D399" : "#F87171",
                          }}
                        >
                          {isSuccess ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                          <span>{step.durationMs}ms</span>
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: 3,
                          fontSize: 9,
                          color: "#64748B",
                        }}
                      >
                        <span>{step.category} • {step.nodeType}</span>

                        {/* Click to Navigate / Focus Node on Canvas */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStepIndex(step.stepIndex);
                            if (onNavigateToNode) onNavigateToNode(step.nodeId);
                          }}
                          title="Focus and highlight node on Blueprint Canvas"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#38BDF8",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            padding: "1px 3px",
                          }}
                        >
                          <span>Jump</span>
                          <ExternalLink size={9} />
                        </button>
                      </div>

                      {/* Traversed wire note */}
                      {step.nextTraversedWireIds && step.nextTraversedWireIds.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                            fontSize: 9,
                            color: "#38BDF8",
                            opacity: 0.85,
                          }}
                        >
                          <ArrowRight size={8} />
                          <span>Pulsed {step.nextTraversedWireIds.length} wire connection(s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Pin Payload & Watch Expressions Inspector */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0F172A",
            overflowY: "auto",
            padding: "12px 16px",
          }}
        >
          {/* Inspector Sub-Tabs: Pin Payloads vs Watch Expressions */}
          <div className="inspector-tab-strip">
            <button
              type="button"
              className={`inspector-tab ${inspectorTab === "pins" ? "inspector-tab--active" : ""}`}
              onClick={() => setInspectorTab("pins")}
            >
              <Zap size={12} />
              <span>Pin Payloads</span>
            </button>
            <button
              type="button"
              className={`inspector-tab ${inspectorTab === "watch" ? "inspector-tab--active" : ""}`}
              onClick={() => setInspectorTab("watch")}
            >
              <Eye size={12} />
              <span>Watch Expressions</span>
              {watches.length > 0 && (
                <span className="inspector-tab-badge">
                  {watches.length}
                </span>
              )}
              {hasMutatedWatch && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "#F59E0B",
                    boxShadow: "0 0 6px #F59E0B",
                  }}
                  title="A watched variable changed at this step!"
                />
              )}
            </button>
          </div>

          {inspectorTab === "watch" ? (
            /* Sub-Phase 5.7: Watch Expressions Sub-Panel */
            <div className="watch-subpanel">
              {/* Add Watch Input Bar */}
              <div className="watch-add-box">
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
                  Add Watch Expression
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newWatchInput.trim()) {
                      watchExpressionManager.addWatch(newWatchInput.trim());
                      setNewWatchInput("");
                    }
                  }}
                  className="watch-add-row"
                >
                  <input
                    type="text"
                    className="watch-add-input"
                    placeholder="e.g. inputs.amount, state.activeTab, outputs.count > 0"
                    value={newWatchInput}
                    onChange={(e) => setNewWatchInput(e.target.value)}
                  />
                  <button type="submit" className="watch-add-btn">
                    <Plus size={11} />
                    <span>Add Watch</span>
                  </button>
                </form>

                {/* Suggestions Quick Chips */}
                <div className="watch-suggestion-chips">
                  <span>Quick Add:</span>
                  {[
                    "inputs.amount",
                    "outputs.count > 0",
                    "state.activeTab",
                    "outputs.status === 'success'",
                    "Boolean(inputs.table)",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="watch-chip"
                      onClick={() => {
                        watchExpressionManager.addWatch(s);
                      }}
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Watch Expressions List */}
              {watches.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "36px 16px",
                    color: "#64748B",
                    textAlign: "center",
                    gap: 8,
                    background: "#0B0F19",
                    borderRadius: 6,
                    border: "1px solid #1E293B",
                  }}
                >
                  <Eye size={24} style={{ opacity: 0.4 }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>
                    No Watch Expressions
                  </div>
                  <div style={{ fontSize: 10, maxWidth: 320, color: "#64748B", lineHeight: 1.5 }}>
                    Track live expressions across execution steps. Type an expression above or click <strong>&apos;+ Watch&apos;</strong> on any pin in the Pin Payloads tab.
                  </div>
                </div>
              ) : (
                <div className="watch-list">
                  {watches.map((watch) => {
                    const res = watchResults.get(watch.id);
                    const isEditing = editingWatchId === watch.id;

                    return (
                      <div
                        key={watch.id}
                        className={`watch-card ${
                          res?.hasMutated ? "watch-card--mutated" : ""
                        } ${!watch.isEnabled ? "watch-card--disabled" : ""}`}
                      >
                        <div className="watch-card__header">
                          <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={watch.isEnabled}
                              onChange={() => watchExpressionManager.toggleWatch(watch.id)}
                              title="Toggle Watch Expression"
                              style={{ cursor: "pointer", accentColor: "#206859" }}
                            />
                            {isEditing ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (editingWatchExpr.trim()) {
                                    watchExpressionManager.updateExpression(watch.id, editingWatchExpr.trim());
                                    setEditingWatchId(null);
                                  }
                                }}
                                style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}
                              >
                                <input
                                  type="text"
                                  className="watch-add-input"
                                  value={editingWatchExpr}
                                  onChange={(e) => setEditingWatchExpr(e.target.value)}
                                  autoFocus
                                  style={{ padding: "2px 6px", fontSize: 10 }}
                                />
                                <button
                                  type="submit"
                                  style={{
                                    background: "#206859",
                                    border: "none",
                                    borderRadius: 3,
                                    color: "#FFFFFF",
                                    padding: "2px 6px",
                                    fontSize: 9,
                                    cursor: "pointer",
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingWatchId(null)}
                                  style={{
                                    background: "none",
                                    border: "1px solid #334155",
                                    borderRadius: 3,
                                    color: "#94A3B8",
                                    padding: "2px 6px",
                                    fontSize: 9,
                                    cursor: "pointer",
                                  }}
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <span className="watch-card__expr" title={watch.expression}>
                                {watch.name && (
                                  <span style={{ color: "#38BDF8", fontWeight: 600 }}>{watch.name}:</span>
                                )}
                                <span>{watch.expression}</span>
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {res && (
                              <span className={`watch-type-pill watch-type-pill--${res.valueType}`}>
                                {res.valueType}
                              </span>
                            )}
                            {res?.hasMutated && (
                              <span className="watch-mutation-tag">
                                ⚡ MUTATED
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWatchId(watch.id);
                                setEditingWatchExpr(watch.expression);
                              }}
                              title="Edit expression"
                              style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: 2 }}
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => watchExpressionManager.removeWatch(watch.id)}
                              title="Delete watch expression"
                              style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: 2 }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Value Display Box */}
                        {res && (
                          <div className="watch-card__val">
                            {res.status === "error" ? (
                              <span style={{ color: "#F87171", fontSize: 10 }}>
                                ⚠️ {res.errorMessage || "Evaluation error"}
                              </span>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "space-between" }}>
                                <span style={{ color: res.value === undefined ? "#64748B" : "#34D399" }}>
                                  {res.formattedValue}
                                </span>
                                {res.previousValue !== undefined && res.hasMutated && (
                                  <span style={{ fontSize: 9, color: "#94A3B8", fontStyle: "italic", flexShrink: 0 }}>
                                    (was: {JSON.stringify(res.previousValue)})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Pin Payloads View */
            activeStep ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Frozen State Alert Banner (when paused at breakpoint) */}
                {debuggerState === "paused" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      backgroundColor: "rgba(245, 158, 11, 0.12)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Pause size={14} style={{ color: "#F59E0B", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#FBBF24" }}>
                          FROZEN PIN PAYLOAD (PAUSED AT BREAKPOINT)
                        </div>
                        <div style={{ fontSize: 9.5, color: "#FDE68A" }}>
                          Execution is frozen at this step. Values represent exact live pin states. Use Resume (▶) or Step Over (⏭) to advance.
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: 4,
                        backgroundColor: "#F59E0B",
                        color: "#0F172A",
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                      }}
                    >
                      STEP #{selectedStepIndex + 1}
                    </span>
                  </div>
                )}

                {/* Step Header Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 6,
                    backgroundColor: "#1E293B",
                    border: "1px solid #334155",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: activeStep.headerColor || "#206859",
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>
                        {activeStep.nodeTitle}
                      </div>
                      <div style={{ fontSize: 10, color: "#94A3B8" }}>
                        ID: {activeStep.nodeId} • Type: {activeStep.nodeType}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        borderRadius: 4,
                        backgroundColor:
                          activeStep.status === "success"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                        border:
                          activeStep.status === "success"
                            ? "1px solid rgba(16, 185, 129, 0.4)"
                            : "1px solid rgba(239, 68, 68, 0.4)",
                        color: activeStep.status === "success" ? "#10B981" : "#F87171",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {activeStep.status === "success" ? (
                        <CheckCircle2 size={11} />
                      ) : (
                        <AlertCircle size={11} />
                      )}
                      <span style={{ textTransform: "uppercase" }}>{activeStep.status}</span>
                    </div>

                    <span style={{ fontSize: 11, color: "#94A3B8" }}>
                      Duration: <strong>{activeStep.durationMs}ms</strong>
                    </span>
                  </div>
                </div>

                {/* Error Notice if Step Failed */}
                {activeStep.errorMessage && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      backgroundColor: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid #DC2626",
                      color: "#FCA5A5",
                      fontSize: 11,
                    }}
                  >
                    <strong>Execution Fault:</strong> {activeStep.errorMessage}
                  </div>
                )}

                {/* Input Pins Snapshot Table */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94A3B8",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Input Pins Snapshot
                  </div>
                  {Object.keys(activeStep.inputs).length === 0 ? (
                    <div style={{ fontSize: 11, color: "#64748B", fontStyle: "italic" }}>
                      No data input pins for this node.
                    </div>
                  ) : (
                    <div
                      style={{
                        borderRadius: 6,
                        border: "1px solid #1E293B",
                        overflow: "hidden",
                        backgroundColor: "#0B0F19",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #1E293B", color: "#64748B" }}>
                            <th style={{ padding: "6px 10px", textAlign: "left" }}>Pin Name</th>
                            <th style={{ padding: "6px 10px", textAlign: "left" }}>Type</th>
                            <th style={{ padding: "6px 10px", textAlign: "left" }}>Resolved Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(activeStep.inputs).map(([pinId, pin]) => (
                            <tr
                              key={pinId}
                              style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                            >
                              <td style={{ padding: "6px 10px", fontWeight: 600, color: "#E2E8F0" }}>
                                {pin.name}
                              </td>
                              <td style={{ padding: "6px 10px" }}>
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    backgroundColor: "rgba(255,255,255,0.05)",
                                    color: getPinColor(pin.type as PinDataType) || "#38BDF8",
                                  }}
                                >
                                  {pin.type}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                  fontFamily: "JetBrains Mono, monospace",
                                  color: "#A5B4FC",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                                  <span>
                                    {pin.value === undefined
                                      ? "undefined"
                                      : typeof pin.value === "object"
                                      ? JSON.stringify(pin.value)
                                      : String(pin.value)}
                                  </span>
                                  <button
                                    type="button"
                                    className="pin-watch-btn"
                                    onClick={() => {
                                      watchExpressionManager.addWatch(`inputs.${pin.name}`);
                                      setInspectorTab("watch");
                                    }}
                                    title={`Add 'inputs.${pin.name}' to Watch Expressions`}
                                  >
                                    <Eye size={10} />
                                    <span>+ Watch</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Output Pins Snapshot Table */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94A3B8",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Output Pins Snapshot
                  </div>
                  {Object.keys(activeStep.outputs).length === 0 ? (
                    <div style={{ fontSize: 11, color: "#64748B", fontStyle: "italic" }}>
                      No data output pins evaluated for this node.
                    </div>
                  ) : (
                    <div
                      style={{
                        borderRadius: 6,
                        border: "1px solid #1E293B",
                        overflow: "hidden",
                        backgroundColor: "#0B0F19",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #1E293B", color: "#64748B" }}>
                            <th style={{ padding: "6px 10px", textAlign: "left" }}>Pin Name</th>
                            <th style={{ padding: "6px 10px", textAlign: "left" }}>Type</th>
                            <th style={{ padding: "6px 10px", textAlign: "left" }}>Evaluated Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(activeStep.outputs).map(([pinId, pin]) => (
                            <tr
                              key={pinId}
                              style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                            >
                              <td style={{ padding: "6px 10px", fontWeight: 600, color: "#E2E8F0" }}>
                                {pin.name}
                              </td>
                              <td style={{ padding: "6px 10px" }}>
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    backgroundColor: "rgba(255,255,255,0.05)",
                                    color: getPinColor(pin.type as PinDataType) || "#34D399",
                                  }}
                                >
                                  {pin.type}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "6px 10px",
                                  fontFamily: "JetBrains Mono, monospace",
                                  color: "#34D399",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                                  <span>
                                    {pin.value === undefined
                                      ? "undefined"
                                      : typeof pin.value === "object"
                                      ? JSON.stringify(pin.value)
                                      : String(pin.value)}
                                  </span>
                                  <button
                                    type="button"
                                    className="pin-watch-btn"
                                    onClick={() => {
                                      watchExpressionManager.addWatch(`outputs.${pin.name}`);
                                      setInspectorTab("watch");
                                    }}
                                    title={`Add 'outputs.${pin.name}' to Watch Expressions`}
                                  >
                                    <Eye size={10} />
                                    <span>+ Watch</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#64748B",
                  fontSize: 11,
                }}
              >
                Select an executed node from the timeline to inspect its pin data snapshot.
              </div>
            )
          )}
        </div>
      </div>
      )}
    </div>
  );
};
