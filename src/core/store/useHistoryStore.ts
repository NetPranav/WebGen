"use client";

/**
 * ============================================================================
 * TRANSACTIONAL UNDO/REDO HISTORY STORE
 * ============================================================================
 * Manages reversible action history snapshots with descriptive action labels.
 * Powers global Ctrl+Z / Ctrl+Shift+Z and the History Timeline panel.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.4 & PANELS.md §Panel 23
 * ============================================================================
 */

import { create } from "zustand";

export interface HistoryEntry<T = unknown> {
  id: string;
  actionLabel: string;
  timestamp: number;
  snapshot: T;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxStackSize: number;

  // Actions
  pushState: (actionLabel: string, currentSnapshot: unknown) => void;
  undo: (presentSnapshot: unknown) => unknown | null;
  redo: (presentSnapshot: unknown) => unknown | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getLastActionLabel: () => string | null;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxStackSize: 50,

  pushState: (actionLabel: string, currentSnapshot: unknown) => {
    const entry: HistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actionLabel,
      timestamp: Date.now(),
      snapshot: JSON.parse(JSON.stringify(currentSnapshot)),
    };

    set((state) => {
      const newPast = [...state.past, entry];
      if (newPast.length > state.maxStackSize) {
        newPast.shift();
      }
      return {
        past: newPast,
        future: [], // New action clears redo future branch
      };
    });
  },

  undo: (presentSnapshot: unknown) => {
    const state = get();
    if (state.past.length === 0) return null;

    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);

    const redoEntry: HistoryEntry = {
      id: `hist_redo_${Date.now()}`,
      actionLabel: previous.actionLabel,
      timestamp: Date.now(),
      snapshot: JSON.parse(JSON.stringify(presentSnapshot)),
    };

    set({
      past: newPast,
      future: [redoEntry, ...state.future],
    });

    return previous.snapshot;
  },

  redo: (presentSnapshot: unknown) => {
    const state = get();
    if (state.future.length === 0) return null;

    const next = state.future[0];
    const newFuture = state.future.slice(1);

    const undoEntry: HistoryEntry = {
      id: `hist_undo_${Date.now()}`,
      actionLabel: next.actionLabel,
      timestamp: Date.now(),
      snapshot: JSON.parse(JSON.stringify(presentSnapshot)),
    };

    set({
      past: [...state.past, undoEntry],
      future: newFuture,
    });

    return next.snapshot;
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
}));
