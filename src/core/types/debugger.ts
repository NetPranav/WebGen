"use client";

/**
 * ============================================================================
 * BREAKPOINT DEBUGGER & HOT RELOAD TYPE CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for the interactive breakpoint debugger and
 * hot-reload patch pipeline.
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.5
 * ============================================================================
 */

import { TracePinSnapshot } from "./trace";

// ---------------------------------------------------------------------------
// Debugger State Machine
// ---------------------------------------------------------------------------

/**
 * The four states of the execution debugger:
 * - `idle`: No active debugging session
 * - `running`: Execution is in progress (no breakpoint paused)
 * - `paused`: Execution has paused at a breakpoint node
 * - `stepping`: The debugger is advancing exactly one node before re-pausing
 */
export type DebuggerState = "idle" | "running" | "paused" | "stepping";

// ---------------------------------------------------------------------------
// Breakpoint Definitions
// ---------------------------------------------------------------------------

export interface Breakpoint {
  /** Unique breakpoint ID */
  id: string;
  /** The node on which this breakpoint is placed */
  nodeId: string;
  /** The graph containing the node */
  graphId: string;
  /** Whether this breakpoint is currently enabled */
  isEnabled: boolean;
  /** Number of times this breakpoint has been hit across all runs */
  hitCount: number;
  /**
   * Optional conditional expression evaluated against the step context.
   * Example: "inputs.amount > 100"
   * If set, the breakpoint only pauses when the condition evaluates to truthy.
   */
  condition?: string;
}

export interface BreakpointHitEvent {
  /** The breakpoint that triggered the pause */
  breakpointId: string;
  /** The active execution run */
  runId: string;
  /** The step index at which the pause occurred */
  stepIndex: number;
  /** The node ID where execution is paused */
  nodeId: string;
  /** Frozen input pin values at the moment of pause */
  frozenInputs: Record<string, TracePinSnapshot>;
  /** Frozen output pin values at the moment of pause */
  frozenOutputs: Record<string, TracePinSnapshot>;
  /** When the pause occurred */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Debugger State Listener
// ---------------------------------------------------------------------------

export type DebuggerStateListener = (
  state: DebuggerState,
  hitEvent?: BreakpointHitEvent
) => void;

// ---------------------------------------------------------------------------
// Hot Reload Patch Pipeline
// ---------------------------------------------------------------------------

export type HotReloadPatchType =
  | "node_added"
  | "node_removed"
  | "node_updated"
  | "property_changed"
  | "wire_changed"
  | "state_variable_changed";

export interface HotReloadPatch {
  /** Unique patch ID */
  patchId: string;
  /** The kind of change detected */
  patchType: HotReloadPatchType;
  /** The ID of the target entity (element, node, wire, or variable) */
  targetId: string;
  /** The delta — only the changed fields */
  delta: Record<string, unknown>;
  /** When the patch was generated */
  timestamp: number;
}

export interface HotReloadResult {
  /** The patch that was applied */
  patchId: string;
  /** Whether the patch was applied successfully */
  success: boolean;
  /** When the patch was applied */
  appliedAt: number;
  /** If the patch failed, the prior state snapshot for rollback */
  rollbackSnapshot?: Record<string, unknown>;
  /** Error message if the patch failed */
  errorMessage?: string;
}

export type HotReloadListener = (patch: HotReloadPatch, result: HotReloadResult) => void;
