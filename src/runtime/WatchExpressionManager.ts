"use client";

/**
 * ============================================================================
 * WATCH EXPRESSION & LIVE VARIABLE INSPECTOR ENGINE
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.7 & PANELS.md (Panel 20)
 *
 * Capabilities:
 *   1. Manages persistent watch expressions across execution runs & sessions
 *   2. Evaluates expressions in a scoped context (`inputs`, `outputs`, `state`, `variables`)
 *   3. Detects value mutations across sequential steps and tracks previous values
 *   4. Dispatches [WATCH_MUTATION] telemetry to DiagnosticBus / Panel 07
 *   5. Provides reactive subscriptions for Panel 20 live UI updates
 * ============================================================================
 */

import {
  WatchExpression,
  WatchEvaluationContext,
  WatchEvaluationResult,
  WatchValueType,
  WatchListener,
} from "@/core/types/watch";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
import { errorMessage as messageOf } from "@/core/errors";

const STORAGE_KEY = "webgen_watch_expressions";

export class WatchExpressionManager {
  private watches: Map<string, WatchExpression> = new Map();
  private lastResults: Map<string, WatchEvaluationResult> = new Map();
  private listeners: Set<WatchListener> = new Set();

  constructor(initialWatches?: WatchExpression[]) {
    if (initialWatches && initialWatches.length > 0) {
      for (const w of initialWatches) {
        this.watches.set(w.id, w);
      }
    } else {
      this.loadFromStorage();
    }
  }

  // --------------------------------------------------------------------------
  // Watch CRUD Operations
  // --------------------------------------------------------------------------

  public getWatches(): WatchExpression[] {
    return Array.from(this.watches.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  public getWatch(id: string): WatchExpression | undefined {
    return this.watches.get(id);
  }

  public addWatch(expression: string, name?: string): WatchExpression {
    const trimmed = expression.trim();
    if (!trimmed) {
      throw new Error("Watch expression cannot be empty.");
    }

    const id = `watch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newWatch: WatchExpression = {
      id,
      expression: trimmed,
      name: name?.trim() || undefined,
      isEnabled: true,
      createdAt: Date.now(),
    };

    this.watches.set(id, newWatch);
    this.saveToStorage();
    this.notifyListeners();
    return newWatch;
  }

  public removeWatch(id: string): boolean {
    const deleted = this.watches.delete(id);
    if (deleted) {
      this.lastResults.delete(id);
      this.saveToStorage();
      this.notifyListeners();
    }
    return deleted;
  }

  public toggleWatch(id: string): boolean {
    const watch = this.watches.get(id);
    if (!watch) return false;

    watch.isEnabled = !watch.isEnabled;
    this.saveToStorage();
    this.notifyListeners();
    return watch.isEnabled;
  }

  public updateExpression(id: string, newExpression: string, newName?: string): boolean {
    const watch = this.watches.get(id);
    if (!watch) return false;

    const trimmed = newExpression.trim();
    if (!trimmed) return false;

    watch.expression = trimmed;
    if (newName !== undefined) {
      watch.name = newName.trim() || undefined;
    }

    // Reset cached result for this expression
    this.lastResults.delete(id);
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  public clearWatches(): void {
    this.watches.clear();
    this.lastResults.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  // --------------------------------------------------------------------------
  // Expression Evaluation & Mutation Detection
  // --------------------------------------------------------------------------

  public getLastResults(): Map<string, WatchEvaluationResult> {
    return new Map(this.lastResults);
  }

  public getResult(id: string): WatchEvaluationResult | undefined {
    return this.lastResults.get(id);
  }

  /**
   * Evaluates all enabled watch expressions against the provided context.
   * Compares values with the prior evaluation to detect mutations and
   * emit [WATCH_MUTATION] diagnostics on the DiagnosticBus.
   */
  public evaluateAll(
    context: WatchEvaluationContext,
    stepIndex?: number
  ): Map<string, WatchEvaluationResult> {
    const newResults = new Map<string, WatchEvaluationResult>();

    const safeInputs = context.inputs || {};
    const safeOutputs = context.outputs || {};
    const safeState = context.state || {};
    const safeVariables = context.variables || {};
    const safeStep = context.step || {};
    const safeRun = context.run || {};

    for (const watch of this.watches.values()) {
      if (!watch.isEnabled) {
        continue;
      }

      const prevResult = this.lastResults.get(watch.id);
      let value: unknown = undefined;
      let status: "success" | "error" = "success";
      let errorMessage: string | undefined = undefined;

      try {
        // Evaluate in a sandboxed Function scope with provided runtime globals
        const evaluator = new Function(
          "inputs",
          "outputs",
          "state",
          "variables",
          "step",
          "run",
          "context",
          `"use strict"; return (${watch.expression});`
        );

        value = evaluator(
          safeInputs,
          safeOutputs,
          safeState,
          safeVariables,
          safeStep,
          safeRun,
          context
        );
      } catch (err) {
        status = "error";
        errorMessage = messageOf(err);
        value = undefined;
      }

      const valueType = this.detectValueType(value);
      const formattedValue = this.formatValue(value, valueType, errorMessage);

      // Check if value has mutated compared to previous result
      let hasMutated = false;
      let previousValue: unknown = undefined;

      if (prevResult && prevResult.status === "success" && status === "success") {
        if (!this.areValuesEqual(prevResult.value, value)) {
          hasMutated = true;
          previousValue = prevResult.value;

          // Dispatch [WATCH_MUTATION] event to DiagnosticBus
          DiagnosticBus.emit({
            channel: "WATCH_MUTATION",
            severity: "info",
            source: {
              panel: "Panel 20: Execution Trace (Watch)",
              entityId: watch.id,
              entityName: watch.name || watch.expression,
            },
            message: `[WATCH_MUTATION] Watch '${watch.expression}' mutated: ${this.formatValue(
              prevResult.value,
              this.detectValueType(prevResult.value)
            )} ➔ ${formattedValue} ${
              stepIndex !== undefined ? `(at step #${stepIndex + 1})` : ""
            }`,
            suggestion: "Inspect step input/output snapshots and state mutations in Panel 20.",
            isFixable: false,
          });
        }
      }

      const evalResult: WatchEvaluationResult = {
        expressionId: watch.id,
        expression: watch.expression,
        name: watch.name,
        value,
        valueType,
        formattedValue,
        status,
        errorMessage,
        hasMutated,
        previousValue,
        evaluatedAtStepIndex: stepIndex,
        timestamp: Date.now(),
      };

      newResults.set(watch.id, evalResult);
      this.lastResults.set(watch.id, evalResult);
    }

    this.notifyListeners();
    return newResults;
  }

  // --------------------------------------------------------------------------
  // Helpers: Type Detection, Formatting, Equality
  // --------------------------------------------------------------------------

  private detectValueType(val: unknown): WatchValueType {
    if (val === null) return "null";
    if (val === undefined) return "undefined";
    if (Array.isArray(val)) return "array";
    const t = typeof val;
    if (t === "string" || t === "number" || t === "boolean" || t === "function") {
      return t;
    }
    return "object";
  }

  private formatValue(val: unknown, type: WatchValueType, errorMsg?: string): string {
    if (errorMsg) return `<Error: ${errorMsg}>`;
    if (type === "undefined") return "undefined";
    if (type === "null") return "null";
    if (type === "string") return `"${val}"`;
    if (type === "number" || type === "boolean") return String(val);
    if (type === "function") return "[Function]";
    try {
      return JSON.stringify(val);
    } catch {
      return "[Complex Object]";
    }
  }

  private areValuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null || a === undefined || b === undefined) return a === b;
    if (typeof a === "object") {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch {
        return false;
      }
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // Subscriptions & Persistence
  // --------------------------------------------------------------------------

  public subscribe(listener: WatchListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const list = this.getWatches();
    const results = this.getLastResults();
    for (const listener of this.listeners) {
      try {
        listener(list, results);
      } catch (err) {
        console.error("[WatchExpressionManager] Listener error:", err);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const data = JSON.stringify(this.getWatches());
      localStorage.setItem(STORAGE_KEY, data);
    } catch (err) {
      console.warn("[WatchExpressionManager] Failed to persist watches to localStorage:", err);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id && item.expression) {
              this.watches.set(item.id, item);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[WatchExpressionManager] Failed to restore watches from localStorage:", err);
    }
  }
}

// Global Singleton Instance
export const watchExpressionManager = new WatchExpressionManager();
