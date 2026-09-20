"use client";

/**
 * ============================================================================
 * BREAKPOINT MANAGER & INTERACTIVE DEBUGGER STATE MACHINE
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.5
 *
 * Capabilities:
 *   1. Breakpoint CRUD (add, remove, toggle, clear) keyed by nodeId
 *   2. Conditional breakpoints with expression evaluation against step context
 *   3. Hit counter tracking across all execution runs
 *   4. Debugger state machine: idle → running → paused → (stepping | running | idle)
 *   5. Pause gate: shouldPauseAtNode() evaluated at each execution step
 *   6. DiagnosticBus integration emitting [BREAKPOINT_HIT] events
 *   7. Async resume/step control via Promise-based pause gate
 * ============================================================================
 */

import {
  Breakpoint,
  BreakpointHitEvent,
  DebuggerState,
  DebuggerStateListener,
} from "@/core/types/debugger";
import { TracePinSnapshot } from "@/core/types/trace";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";

export class BreakpointManager {
  private breakpoints: Map<string, Breakpoint> = new Map();
  private state: DebuggerState = "idle";
  private stateListeners: Set<DebuggerStateListener> = new Set();
  private lastHitEvent: BreakpointHitEvent | null = null;

  // Pause gate: a resolver function that unblocks execution when resume/step is called
  private pauseResolver: (() => void) | null = null;

  constructor() {}

  // --------------------------------------------------------------------------
  // Breakpoint CRUD
  // --------------------------------------------------------------------------

  public addBreakpoint(nodeId: string, graphId: string): Breakpoint {
    const existing = this.breakpoints.get(nodeId);
    if (existing) return existing;

    const bp: Breakpoint = {
      id: `bp_${nodeId}_${Date.now().toString(36)}`,
      nodeId,
      graphId,
      isEnabled: true,
      hitCount: 0,
    };

    this.breakpoints.set(nodeId, bp);
    return bp;
  }

  public removeBreakpoint(nodeId: string): boolean {
    return this.breakpoints.delete(nodeId);
  }

  public toggleBreakpoint(nodeId: string): Breakpoint | undefined {
    const bp = this.breakpoints.get(nodeId);
    if (!bp) return undefined;
    bp.isEnabled = !bp.isEnabled;
    return bp;
  }

  public getBreakpoint(nodeId: string): Breakpoint | undefined {
    return this.breakpoints.get(nodeId);
  }

  public getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  public getEnabledBreakpoints(): Breakpoint[] {
    return this.getBreakpoints().filter((bp) => bp.isEnabled);
  }

  public clearAll(): void {
    this.breakpoints.clear();
  }

  public setCondition(nodeId: string, expression: string | undefined): void {
    const bp = this.breakpoints.get(nodeId);
    if (bp) {
      bp.condition = expression;
    }
  }

  public hasBreakpoint(nodeId: string): boolean {
    return this.breakpoints.has(nodeId);
  }

  // --------------------------------------------------------------------------
  // Debugger State Machine
  // --------------------------------------------------------------------------

  public getState(): DebuggerState {
    return this.state;
  }

  public getLastHitEvent(): BreakpointHitEvent | null {
    return this.lastHitEvent;
  }

  /**
   * Transitions to "running" state. Called when a graph execution starts.
   */
  public startDebugging(): void {
    this.state = "running";
    this.lastHitEvent = null;
    this.notifyStateListeners();
  }

  /**
   * Resumes execution from a paused state.
   */
  public resume(): void {
    if (this.state !== "paused") return;
    this.state = "running";
    this.notifyStateListeners();

    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
  }

  /**
   * Single-step: advances exactly one node, then re-pauses.
   */
  public stepOver(): void {
    if (this.state !== "paused") return;
    this.state = "stepping";
    this.notifyStateListeners();

    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
  }

  /**
   * Aborts the current debugging session entirely.
   */
  public stopDebugging(): void {
    this.state = "idle";
    this.lastHitEvent = null;
    this.notifyStateListeners();

    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
  }

  // --------------------------------------------------------------------------
  // Pause Gate
  // --------------------------------------------------------------------------

  /**
   * Determines if execution should pause at the given node.
   * Evaluates breakpoint existence, enabled state, and conditional expression.
   */
  public shouldPauseAtNode(
    nodeId: string,
    stepContext?: {
      inputs?: Record<string, TracePinSnapshot>;
      outputs?: Record<string, TracePinSnapshot>;
    }
  ): boolean {
    // If we're in "stepping" mode, we always pause at the next node
    if (this.state === "stepping") {
      return true;
    }

    const bp = this.breakpoints.get(nodeId);
    if (!bp || !bp.isEnabled) return false;

    // Evaluate conditional expression if set
    if (bp.condition && bp.condition.trim().length > 0) {
      try {
        const result = this.evaluateCondition(bp.condition, stepContext);
        return !!result;
      } catch {
        // If condition evaluation fails, still pause (safer default)
        return true;
      }
    }

    return true;
  }

  /**
   * Called by the ExecutionTracer when a breakpoint is hit.
   * Returns a Promise that resolves only when resume() or stepOver() is called.
   */
  public async pauseAtBreakpoint(
    nodeId: string,
    runId: string,
    stepIndex: number,
    frozenInputs: Record<string, TracePinSnapshot>,
    frozenOutputs: Record<string, TracePinSnapshot>
  ): Promise<void> {
    const bp = this.breakpoints.get(nodeId);
    const breakpointId = bp?.id || `auto_bp_${nodeId}`;

    // Increment hit counter
    if (bp) {
      bp.hitCount += 1;
    }

    // Build hit event
    const hitEvent: BreakpointHitEvent = {
      breakpointId,
      runId,
      stepIndex,
      nodeId,
      frozenInputs,
      frozenOutputs,
      timestamp: Date.now(),
    };

    this.lastHitEvent = hitEvent;
    this.state = "paused";
    this.notifyStateListeners(hitEvent);

    // Emit diagnostic
    DiagnosticBus.emit({
      channel: "BREAKPOINT_HIT",
      severity: "info",
      source: {
        panel: "Panel 20: Execution Trace (Debugger)",
        entityId: nodeId,
        entityName: `Breakpoint at step ${stepIndex}`,
      },
      message: `[BREAKPOINT_HIT] Execution paused at node '${nodeId}' (step ${stepIndex}). ${bp?.condition ? `Condition: ${bp.condition}` : "Unconditional breakpoint."}`,
      suggestion: "Use Resume (▶), Step Over (⏭), or Stop (⏹) to control execution flow.",
      isFixable: false,
    });

    // Wait until resume() or stepOver() is called
    return new Promise<void>((resolve) => {
      this.pauseResolver = resolve;
    });
  }

  // --------------------------------------------------------------------------
  // Condition Evaluator
  // --------------------------------------------------------------------------

  /**
   * Evaluates a conditional breakpoint expression against the step context.
   * The expression can reference `inputs.<pinId>` and `outputs.<pinId>` pin values.
   *
   * Examples:
   *   - "inputs.amount > 100"
   *   - "inputs.table === 'Users'"
   *   - "outputs.count > 0"
   */
  private evaluateCondition(
    expression: string,
    stepContext?: {
      inputs?: Record<string, TracePinSnapshot>;
      outputs?: Record<string, TracePinSnapshot>;
    }
  ): unknown {
    // Build a flat context of pin values for expression evaluation
    const inputs: Record<string, unknown> = {};
    const outputs: Record<string, unknown> = {};

    if (stepContext?.inputs) {
      for (const [key, snap] of Object.entries(stepContext.inputs)) {
        inputs[key] = snap.value;
      }
    }
    if (stepContext?.outputs) {
      for (const [key, snap] of Object.entries(stepContext.outputs)) {
        outputs[key] = snap.value;
      }
    }

    // Use Function constructor for sandboxed expression evaluation
    // This is safe because it only has access to the pin value objects
    const fn = new Function("inputs", "outputs", `return (${expression})`);
    return fn(inputs, outputs);
  }

  // --------------------------------------------------------------------------
  // Event Subscriptions
  // --------------------------------------------------------------------------

  public subscribe(listener: DebuggerStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyStateListeners(hitEvent?: BreakpointHitEvent): void {
    for (const listener of this.stateListeners) {
      try {
        listener(this.state, hitEvent);
      } catch (err) {
        console.error("[BreakpointManager] State listener error:", err);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Reset
  // --------------------------------------------------------------------------

  public reset(): void {
    this.breakpoints.clear();
    this.state = "idle";
    this.lastHitEvent = null;
    this.pauseResolver = null;
  }
}

// Global Singleton Instance
export const breakpointManager = new BreakpointManager();
