"use client";

/**
 * ============================================================================
 * PERFORMANCE PROFILER & FLAME GRAPH ENGINE
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.6 & PANELS.md (Panel 20)
 *
 * Capabilities:
 *   1. Aggregates TraceStep execution durations into per-node latency metrics
 *   2. Generates time-aligned waterfall / flame graph bars with start offsets
 *   3. Identifies hot node bottlenecks exceeding the configurable threshold (default: 50ms)
 *   4. Emits proactive [PERF_WARN] diagnostics to DiagnosticBus / Panel 07
 *   5. Provides reactive subscriptions for Panel 20 and BlueprintCanvas overlays
 * ============================================================================
 */

import { ExecutionRun, TraceStep } from "@/core/types/trace";
import {
  NodePerformanceMetric,
  FlameGraphBar,
  ProfilerReport,
  ProfilerSettings,
  ProfilerListener,
} from "@/core/types/profiler";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";

const MAX_REPORTS_CAPACITY = 50;

export class PerformanceProfiler {
  private settings: ProfilerSettings = {
    hotNodeThresholdMs: 50,
    autoHighlightHotNodes: true,
  };

  private reports: Map<string, ProfilerReport> = new Map();
  private latestReport: ProfilerReport | null = null;
  private listeners: Set<ProfilerListener> = new Set();

  constructor(initialSettings?: Partial<ProfilerSettings>) {
    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }
  }

  // --------------------------------------------------------------------------
  // Settings Management
  // --------------------------------------------------------------------------

  public getSettings(): ProfilerSettings {
    return { ...this.settings };
  }

  public setSettings(newSettings: Partial<ProfilerSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    // Re-analyze latest report if settings changed
    if (this.latestReport) {
      const runId = this.latestReport.runId;
      const cached = this.reports.get(runId);
      if (cached) {
        // Recompute hot flags based on new threshold
        const updatedHotNodes: NodePerformanceMetric[] = [];
        for (const metric of Object.values(cached.metricsByNodeId)) {
          metric.isHotNode = metric.totalDurationMs >= this.settings.hotNodeThresholdMs;
          if (metric.isHotNode) {
            updatedHotNodes.push(metric);
          }
        }
        updatedHotNodes.sort((a, b) => b.totalDurationMs - a.totalDurationMs);

        cached.hotNodes = updatedHotNodes;
        cached.thresholdMs = this.settings.hotNodeThresholdMs;
        for (const bar of cached.flameBars) {
          bar.isHot = bar.durationMs >= this.settings.hotNodeThresholdMs;
        }
        this.notifyListeners(cached);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Run Analysis & Metric Aggregation
  // --------------------------------------------------------------------------

  /**
   * Analyzes an ExecutionRun, generating a complete ProfilerReport with
   * per-node performance metrics, flame graph waterfall bars, and [PERF_WARN] diagnostics.
   */
  public analyzeRun(run: ExecutionRun): ProfilerReport {
    const steps: TraceStep[] = run.steps || [];
    const totalSteps = steps.length;

    // Sum wall-clock execution duration across all steps
    let totalExecutionTimeMs = 0;
    for (const step of steps) {
      totalExecutionTimeMs += Math.max(0, step.durationMs || 0);
    }

    const averageStepDurationMs =
      totalSteps > 0 ? Math.round((totalExecutionTimeMs / totalSteps) * 10) / 10 : 0;

    // Per-node aggregation
    const metricsByNodeId: Record<string, NodePerformanceMetric> = {};
    const flameBars: FlameGraphBar[] = [];

    let currentOffsetMs = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const duration = Math.max(0, step.durationMs || 0);
      const stepPercent =
        totalExecutionTimeMs > 0
          ? Math.round((duration / totalExecutionTimeMs) * 1000) / 10
          : 0;

      const isStepHot = duration >= this.settings.hotNodeThresholdMs;

      // Build FlameGraphBar for this step
      flameBars.push({
        id: `bar_${step.stepIndex}_${step.nodeId}`,
        stepIndex: step.stepIndex,
        nodeId: step.nodeId,
        nodeTitle: step.nodeTitle,
        nodeType: step.nodeType,
        category: step.category,
        color: step.headerColor || "#206859",
        startTimeOffsetMs: currentOffsetMs,
        durationMs: duration,
        percentageOfTotal: stepPercent,
        isHot: isStepHot,
        status: step.status === "error" ? "error" : "success",
        errorMessage: step.errorMessage,
      });

      currentOffsetMs += duration;

      // Aggregate into NodePerformanceMetric
      let metric = metricsByNodeId[step.nodeId];
      if (!metric) {
        metric = {
          nodeId: step.nodeId,
          nodeTitle: step.nodeTitle,
          nodeType: step.nodeType,
          category: step.category,
          headerColor: step.headerColor || "#206859",
          totalDurationMs: 0,
          minDurationMs: duration,
          maxDurationMs: duration,
          avgDurationMs: duration,
          executionCount: 0,
          percentageOfTotal: 0,
          isHotNode: false,
        };
        metricsByNodeId[step.nodeId] = metric;
      }

      metric.executionCount += 1;
      metric.totalDurationMs += duration;
      metric.minDurationMs = Math.min(metric.minDurationMs, duration);
      metric.maxDurationMs = Math.max(metric.maxDurationMs, duration);
      metric.avgDurationMs =
        Math.round((metric.totalDurationMs / metric.executionCount) * 10) / 10;
    }

    // Finalize percentage of total and hot node flags for each metric
    const allMetrics = Object.values(metricsByNodeId);
    const hotNodes: NodePerformanceMetric[] = [];
    let slowestNode: NodePerformanceMetric | null = null;

    for (const metric of allMetrics) {
      metric.percentageOfTotal =
        totalExecutionTimeMs > 0
          ? Math.round((metric.totalDurationMs / totalExecutionTimeMs) * 1000) / 10
          : 0;

      metric.isHotNode = metric.totalDurationMs >= this.settings.hotNodeThresholdMs;

      if (metric.isHotNode) {
        hotNodes.push(metric);
      }

      if (!slowestNode || metric.totalDurationMs > slowestNode.totalDurationMs) {
        slowestNode = metric;
      }
    }

    // Sort hot nodes descending by total duration
    hotNodes.sort((a, b) => b.totalDurationMs - a.totalDurationMs);

    // Build the complete ProfilerReport
    const report: ProfilerReport = {
      runId: run.runId,
      graphId: run.graphId,
      graphName: run.graphName,
      totalExecutionTimeMs,
      totalSteps,
      averageStepDurationMs,
      slowestNode,
      hotNodes,
      metricsByNodeId,
      flameBars,
      analyzedAt: Date.now(),
      thresholdMs: this.settings.hotNodeThresholdMs,
    };

    // Store report in memory with capacity limit
    this.reports.set(run.runId, report);
    if (this.reports.size > MAX_REPORTS_CAPACITY) {
      const oldestKey = this.reports.keys().next().value;
      if (oldestKey) {
        this.reports.delete(oldestKey);
      }
    }
    this.latestReport = report;

    // Dispatch [PERF_WARN] diagnostics for hot node bottlenecks
    for (const hot of hotNodes) {
      DiagnosticBus.emit({
        channel: "PERF_WARN",
        severity: "warning",
        source: {
          panel: "Panel 20: Performance Profiler",
          entityId: hot.nodeId,
          entityName: hot.nodeTitle,
        },
        message: `[PERF_WARN] Node '${hot.nodeTitle}' (${hot.nodeType}) consumed ${hot.totalDurationMs}ms (${hot.percentageOfTotal}% of total run time), exceeding the ${this.settings.hotNodeThresholdMs}ms performance threshold.`,
        suggestion:
          "Consider indexing database queries, caching values, or deferring non-critical operations.",
        isFixable: false,
      });
    }

    this.notifyListeners(report);
    return report;
  }

  // --------------------------------------------------------------------------
  // Querying Reports
  // --------------------------------------------------------------------------

  public getLatestReport(): ProfilerReport | null {
    return this.latestReport;
  }

  public getReportByRunId(runId: string): ProfilerReport | null {
    return this.reports.get(runId) || null;
  }

  public getAllReports(): ProfilerReport[] {
    return Array.from(this.reports.values());
  }

  public getHotNodes(runId?: string): NodePerformanceMetric[] {
    if (runId) {
      const rep = this.reports.get(runId);
      return rep ? rep.hotNodes : [];
    }
    return this.latestReport ? this.latestReport.hotNodes : [];
  }

  public getMetricForNode(nodeId: string, runId?: string): NodePerformanceMetric | null {
    const report = runId ? this.reports.get(runId) : this.latestReport;
    if (!report) return null;
    return report.metricsByNodeId[nodeId] || null;
  }

  // --------------------------------------------------------------------------
  // Subscriptions & Lifecycle
  // --------------------------------------------------------------------------

  public subscribe(listener: ProfilerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(report: ProfilerReport): void {
    for (const listener of this.listeners) {
      try {
        listener(report);
      } catch (err) {
        console.error("[PerformanceProfiler] Listener error:", err);
      }
    }
  }

  public clear(): void {
    this.reports.clear();
    this.latestReport = null;
  }
}

// Global Singleton Instance
export const performanceProfiler = new PerformanceProfiler();
