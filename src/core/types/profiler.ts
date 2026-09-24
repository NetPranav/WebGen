"use client";

/**
 * ============================================================================
 * PERFORMANCE PROFILER & FLAME GRAPH TYPE CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for the Play Mode Blueprint performance profiler,
 * execution latency aggregation, flame graph / waterfall charts, and hot node
 * bottleneck identification.
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.6
 * ============================================================================
 */

export interface NodePerformanceMetric {
  /** Unique ID of the Blueprint node */
  nodeId: string;
  /** Title of the node (e.g., "Query User", "Branch") */
  nodeTitle: string;
  /** Type of the node (e.g., "database/query", "flow/branch") */
  nodeType: string;
  /** Category (e.g., "Database", "Flow Control") */
  category: string;
  /** Distinctive header accent color */
  headerColor: string;
  /** Cumulative execution time spent on this node in milliseconds */
  totalDurationMs: number;
  /** Minimum execution time observed for a single execution */
  minDurationMs: number;
  /** Maximum execution time observed for a single execution */
  maxDurationMs: number;
  /** Average execution time per execution */
  avgDurationMs: number;
  /** Total number of times this node was executed */
  executionCount: number;
  /** Percentage of the total run execution time consumed by this node (0 - 100) */
  percentageOfTotal: number;
  /** Whether this node exceeded the hot node threshold (e.g. > 50ms) */
  isHotNode: boolean;
}

export interface FlameGraphBar {
  /** Unique identifier for this bar element */
  id: string;
  /** The chronological step index from the trace */
  stepIndex: number;
  /** Target node ID */
  nodeId: string;
  /** Target node title */
  nodeTitle: string;
  /** Target node type */
  nodeType: string;
  /** Node category */
  category: string;
  /** Display color */
  color: string;
  /** Offset in milliseconds from the start of the execution run */
  startTimeOffsetMs: number;
  /** Duration of this step in milliseconds */
  durationMs: number;
  /** Percentage of the total run duration (0 - 100) */
  percentageOfTotal: number;
  /** Whether this step is classified as a hot node bottleneck */
  isHot: boolean;
  /** Status of the step (success or error) */
  status: "success" | "error";
  /** Optional error message if the step failed */
  errorMessage?: string;
}

export interface ProfilerReport {
  /** ID of the execution run analyzed */
  runId: string;
  /** ID of the graph executed */
  graphId: string;
  /** Name of the graph executed */
  graphName: string;
  /** Total wall-clock execution time of all steps in milliseconds */
  totalExecutionTimeMs: number;
  /** Total number of steps executed */
  totalSteps: number;
  /** Average duration per step in milliseconds */
  averageStepDurationMs: number;
  /** The single slowest node in the run, or null if empty */
  slowestNode: NodePerformanceMetric | null;
  /** All nodes exceeding the hot node threshold, sorted by totalDurationMs descending */
  hotNodes: NodePerformanceMetric[];
  /** Full map of metrics keyed by nodeId */
  metricsByNodeId: Record<string, NodePerformanceMetric>;
  /** Ordered array of waterfall / flame graph bars */
  flameBars: FlameGraphBar[];
  /** When this analysis was performed */
  analyzedAt: number;
  /** The threshold in ms used for this report */
  thresholdMs: number;
}

export interface ProfilerSettings {
  /** Threshold in milliseconds above which a node is flagged as "hot" (default: 50) */
  hotNodeThresholdMs: number;
  /** Whether to automatically render glowing badges on the Blueprint Canvas (default: true) */
  autoHighlightHotNodes: boolean;
}

export type ProfilerListener = (report: ProfilerReport) => void;
