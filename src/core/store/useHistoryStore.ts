"use client";

/**
 * ============================================================================
 * ADVANCED TRANSACTIONAL UNDO/REDO HISTORY STORE
 * ============================================================================
 * Manages reversible action history snapshots with action categorization,
 * diff metadata, action grouping/debouncing, arbitrary state jumping,
 * and integrity violation diagnostic trapping.
 * Architecture Ref: ROADMAP.md §Sub-Phase 8.1 & PANELS.md §Panel 23
 * ============================================================================
 */

import { create } from "zustand";
import {
  HistoryTransaction,
  TransactionOptions,
  HistoryActionCategory,
  HistoryTimeline,
} from "../types/history";
import { DiagnosticBus } from "../engine/DiagnosticBus";

export type HistoryEntry<T = unknown> = HistoryTransaction<T>;

export interface HistoryState {
  past: HistoryTransaction[];
  future: HistoryTransaction[];
  maxStackSize: number;

  // Actions
  pushState: (actionLabel: string, currentSnapshot: unknown) => void;
  pushTransaction: (options: TransactionOptions) => void;
  undo: (presentSnapshot: unknown) => unknown | null;
  redo: (presentSnapshot: unknown) => unknown | null;
  jumpToState: (transactionId: string, presentSnapshot: unknown) => unknown | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getLastActionLabel: () => string | null;
  getTimeline: (presentLabel?: string, presentSnapshot?: unknown) => HistoryTimeline;
}

/**
 * Infers an action category from an action label when not explicitly declared.
 */
function inferActionCategory(label: string): HistoryActionCategory {
  const l = label.toLowerCase();
  if (l.includes("page") || l.includes("route") || l.includes("slug") || l.includes("redirect")) {
    return "page";
  }
  if (l.includes("blueprint") || l.includes("node") || l.includes("wire") || l.includes("pin") || l.includes("graph")) {
    return "blueprint";
  }
  if (l.includes("collection") || l.includes("field") || l.includes("schema") || l.includes("table") || l.includes("record")) {
    return "database";
  }
  if (l.includes("style") || l.includes("color") || l.includes("font") || l.includes("padding") || l.includes("margin") || l.includes("radius") || l.includes("shadow")) {
    return "style";
  }
  if (l.includes("prop") || l.includes("value") || l.includes("label") || l.includes("disabled") || l.includes("toggle") || l.includes("text")) {
    return "property";
  }
  if (l.includes("variable") || l.includes("state")) {
    return "variable";
  }
  if (l.includes("element") || l.includes("add") || l.includes("delete") || l.includes("move") || l.includes("resize") || l.includes("canvas") || l.includes("container")) {
    return "canvas";
  }
  return "general";
}

/**
 * Validates a snapshot object to prevent restoring corrupted or undefined states.
 */
function validateSnapshotIntegrity(snapshot: unknown, transactionId: string): boolean {
  if (!snapshot || typeof snapshot !== "object") {
    DiagnosticBus.emit({
      channel: "UNDO_STACK_CORRUPT",
      severity: "error",
      source: { panel: "Panel 23: Undo History", entityId: transactionId },
      message: `History snapshot integrity violation: Target transaction "${transactionId}" snapshot is corrupted or null.`,
      suggestion: "Revert to an earlier snapshot or clear undo history.",
    });
    return false;
  }
  return true;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxStackSize: 50,

  /**
   * Backwards-compatible state pushing with auto-inferred category.
   */
  pushState: (actionLabel: string, currentSnapshot: unknown) => {
    get().pushTransaction({
      actionLabel,
      actionCategory: inferActionCategory(actionLabel),
      snapshot: currentSnapshot,
    });
  },

  /**
   * Pushes a detailed transaction with category, entity tags, diff summary,
   * and auto-grouping debounce for continuous rapid edits.
   */
  pushTransaction: (options: TransactionOptions) => {
    const { actionLabel, actionCategory, snapshot, entityId, entityName, propertyKey, diffSummary, groupKey } = options;
    const category = actionCategory || inferActionCategory(actionLabel);
    const now = Date.now();

    set((state) => {
      // Check for action grouping within 800ms
      const last = state.past[state.past.length - 1];
      const effectiveGroupKey = groupKey || (entityId && propertyKey ? `${entityId}:${propertyKey}` : undefined);

      if (
        last &&
        effectiveGroupKey &&
        last.groupKey === effectiveGroupKey &&
        now - last.timestamp < 800
      ) {
        // Update the existing transaction in place
        const updatedPast = [...state.past];
        updatedPast[updatedPast.length - 1] = {
          ...last,
          actionLabel,
          snapshot: JSON.parse(JSON.stringify(snapshot)),
          diffSummary: diffSummary || last.diffSummary,
          timestamp: now,
          groupCount: (last.groupCount || 1) + 1,
        };
        return {
          past: updatedPast,
          future: [],
        };
      }

      // Create new transaction
      const transaction: HistoryTransaction = {
        id: `hist_${now}_${Math.random().toString(36).substring(2, 7)}`,
        actionLabel,
        actionCategory: category,
        timestamp: now,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        entityId,
        entityName,
        propertyKey,
        diffSummary,
        groupKey: effectiveGroupKey,
        groupCount: 1,
      };

      const newPast = [...state.past, transaction];
      if (newPast.length > state.maxStackSize) {
        newPast.shift();
      }

      return {
        past: newPast,
        future: [], // New user action clears redo future stack
      };
    });
  },

  undo: (presentSnapshot: unknown) => {
    const state = get();
    if (state.past.length === 0) return null;

    const previous = state.past[state.past.length - 1];
    if (!validateSnapshotIntegrity(previous.snapshot, previous.id)) {
      return null;
    }

    const newPast = state.past.slice(0, state.past.length - 1);

    const redoTransaction: HistoryTransaction = {
      id: `hist_redo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actionLabel: previous.actionLabel,
      actionCategory: previous.actionCategory,
      timestamp: Date.now(),
      snapshot: JSON.parse(JSON.stringify(presentSnapshot)),
      entityId: previous.entityId,
      entityName: previous.entityName,
      propertyKey: previous.propertyKey,
      diffSummary: previous.diffSummary,
    };

    set({
      past: newPast,
      future: [redoTransaction, ...state.future],
    });

    return previous.snapshot;
  },

  redo: (presentSnapshot: unknown) => {
    const state = get();
    if (state.future.length === 0) return null;

    const next = state.future[0];
    if (!validateSnapshotIntegrity(next.snapshot, next.id)) {
      return null;
    }

    const newFuture = state.future.slice(1);

    const undoTransaction: HistoryTransaction = {
      id: `hist_undo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actionLabel: next.actionLabel,
      actionCategory: next.actionCategory,
      timestamp: Date.now(),
      snapshot: JSON.parse(JSON.stringify(presentSnapshot)),
      entityId: next.entityId,
      entityName: next.entityName,
      propertyKey: next.propertyKey,
      diffSummary: next.diffSummary,
    };

    set({
      past: [...state.past, undoTransaction],
      future: newFuture,
    });

    return next.snapshot;
  },

  /**
   * Jumps directly to any state in past or future timeline without linear manual stepping.
   */
  jumpToState: (transactionId: string, presentSnapshot: unknown) => {
    const state = get();

    // 1. Check if target is in past
    const pastIdx = state.past.findIndex((t) => t.id === transactionId);
    if (pastIdx !== -1) {
      const targetTx = state.past[pastIdx];
      if (!validateSnapshotIntegrity(targetTx.snapshot, targetTx.id)) {
        return null;
      }

      // Target becomes the active state
      const targetSnapshot = targetTx.snapshot;

      // Everything after target in past (plus current present) moves to future
      const undidTxList = state.past.slice(pastIdx + 1);
      const newPast = state.past.slice(0, pastIdx);

      const presentTx: HistoryTransaction = {
        id: `hist_jump_head_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        actionLabel: targetTx.actionLabel,
        actionCategory: targetTx.actionCategory,
        timestamp: Date.now(),
        snapshot: JSON.parse(JSON.stringify(presentSnapshot)),
        entityId: targetTx.entityId,
        entityName: targetTx.entityName,
      };

      const newFuture = [presentTx, ...undidTxList.reverse(), ...state.future];

      set({
        past: newPast,
        future: newFuture,
      });

      return targetSnapshot;
    }

    // 2. Check if target is in future
    const futureIdx = state.future.findIndex((t) => t.id === transactionId);
    if (futureIdx !== -1) {
      const targetTx = state.future[futureIdx];
      if (!validateSnapshotIntegrity(targetTx.snapshot, targetTx.id)) {
        return null;
      }

      const targetSnapshot = targetTx.snapshot;

      // Everything in future up to and including targetIdx - 1 (plus current present) moves to past
      const redidTxList = state.future.slice(0, futureIdx);
      const newFuture = state.future.slice(futureIdx + 1);

      const presentTx: HistoryTransaction = {
        id: `hist_jump_head_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        actionLabel: targetTx.actionLabel,
        actionCategory: targetTx.actionCategory,
        timestamp: Date.now(),
        snapshot: JSON.parse(JSON.stringify(presentSnapshot)),
        entityId: targetTx.entityId,
        entityName: targetTx.entityName,
      };

      const newPast = [...state.past, presentTx, ...redidTxList];

      set({
        past: newPast,
        future: newFuture,
      });

      return targetSnapshot;
    }

    return null;
  },

  canUndo: () => {
    return get().past.length > 0;
  },

  canRedo: () => {
    return get().future.length > 0;
  },

  clearHistory: () => {
    set({ past: [], future: [] });
  },

  getLastActionLabel: () => {
    const past = get().past;
    return past.length > 0 ? past[past.length - 1].actionLabel : null;
  },

  getTimeline: (presentLabel: string = "Current State", presentSnapshot?: unknown): HistoryTimeline => {
    const state = get();
    const present: HistoryTransaction | null = presentSnapshot
      ? {
          id: "hist_present",
          actionLabel: presentLabel,
          actionCategory: "general",
          timestamp: Date.now(),
          snapshot: presentSnapshot,
        }
      : null;

    return {
      past: [...state.past],
      present,
      future: [...state.future],
      totalCount: state.past.length + state.future.length + (present ? 1 : 0),
    };
  },
}));
