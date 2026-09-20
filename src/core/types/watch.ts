"use client";

/**
 * ============================================================================
 * WATCH EXPRESSION & LIVE VARIABLE INSPECTOR TYPE CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for tracking and evaluating persistent expressions
 * (e.g. `inputs.<pin>`, `outputs.<pin>`, `state.<var>`, `outputs.count > 0`)
 * across Blueprint execution trace steps with live mutation detection.
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.7 & PANELS.md (Panel 20)
 * ============================================================================
 */

export interface WatchExpression {
  /** Unique identifier (e.g. "watch_1726300000_abc") */
  id: string;
  /** The raw expression string provided by user (e.g. "inputs.amount", "state.activeTab") */
  expression: string;
  /** Optional user-friendly label / alias */
  name?: string;
  /** Whether evaluation is currently active */
  isEnabled: boolean;
  /** Timestamp when this watch was created */
  createdAt: number;
}

export interface WatchEvaluationContext {
  /** Map of pin ID and pin Name to resolved input values */
  inputs?: Record<string, unknown>;
  /** Map of pin ID and pin Name to resolved output values */
  outputs?: Record<string, unknown>;
  /** Map of project state variable names to current values */
  state?: Record<string, unknown>;
  /** Map of active Blueprint graph variable names to values */
  variables?: Record<string, unknown>;
  /** Active trace step summary */
  step?: {
    stepIndex?: number;
    nodeId?: string;
    nodeTitle?: string;
    nodeType?: string;
    category?: string;
    durationMs?: number;
    status?: string;
  };
  /** Active execution run summary */
  run?: {
    runId?: string;
    trigger?: string;
    status?: string;
    totalDurationMs?: number;
  };
}

export type WatchValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "undefined"
  | "function";

export interface WatchEvaluationResult {
  /** ID of the associated WatchExpression */
  expressionId: string;
  /** The expression that was evaluated */
  expression: string;
  /** Optional custom display name */
  name?: string;
  /** The raw result of evaluating the expression */
  value: unknown;
  /** Evaluated primitive or composite type */
  valueType: WatchValueType;
  /** Pretty-formatted string representation for UI display */
  formattedValue: string;
  /** Whether the evaluation succeeded or threw a runtime error */
  status: "success" | "error";
  /** Error message if evaluation threw an exception */
  errorMessage?: string;
  /** Whether this value changed compared to the immediately preceding evaluation */
  hasMutated: boolean;
  /** The prior evaluated value before mutation, if any */
  previousValue?: unknown;
  /** The step index at which this evaluation occurred */
  evaluatedAtStepIndex?: number;
  /** Evaluation timestamp in ms */
  timestamp: number;
}

export type WatchListener = (
  watches: WatchExpression[],
  results: Map<string, WatchEvaluationResult>
) => void;
