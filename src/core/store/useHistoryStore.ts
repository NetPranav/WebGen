"use client";

/**
 * ============================================================================
 * HISTORY STACK
 * ============================================================================
 * ROADMAP Phase 3.1. Holds the undo (`past`) and redo (`future`) stacks. It
 * only stores entries; applying them is `historyCommands` in
 * `useDocumentStore.ts`, which knows how to replay patches and swap project
 * state.
 *
 * Document entries are patches, so memory grows with the size of each edit,
 * not with the size of the project. The stack is capped at `maxStackSize`.
 * ============================================================================
 */

import { create } from "zustand";
import type { HistoryActionCategory, HistoryChange, HistoryTransaction } from "../types/history";
import { createId } from "../ids";

export type HistoryEntry = HistoryTransaction;

export interface NewHistoryEntry {
  actionLabel: string;
  change: HistoryChange;
  actionCategory?: HistoryActionCategory;
  entityId?: string;
  entityName?: string;
  propertyKey?: string;
  diffSummary?: string;
  mergeKey?: string;
}

export interface PersistedHistory {
  past: HistoryTransaction[];
  future: HistoryTransaction[];
}

export interface HistoryState {
  past: HistoryTransaction[];
  future: HistoryTransaction[];
  maxStackSize: number;

  /** Records a new change: clears the redo stack and trims the oldest entries past the cap. */
  record: (entry: NewHistoryEntry) => HistoryTransaction;
  /** Replaces the most recent undo entry (used when merging consecutive edits). */
  replaceLast: (entry: HistoryTransaction) => void;
  /** Removes the most recent undo entry (a merge that cancelled itself out). */
  dropLast: () => void;
  /** Pops the entry to undo; the caller applies it and hands it back with `pushFuture`. */
  takeUndo: () => HistoryTransaction | null;
  /** Pops the entry to redo; the caller applies it and hands it back with `pushPast`. */
  takeRedo: () => HistoryTransaction | null;
  pushPast: (entry: HistoryTransaction) => void;
  pushFuture: (entry: HistoryTransaction) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  /** Replaces both stacks, e.g. with the history saved alongside a project. */
  load: (history: PersistedHistory) => void;
  getLastActionLabel: () => string | null;
}

/** Infers an action category from its label when the caller doesn't give one. */
export function inferActionCategory(label: string): HistoryActionCategory {
  const l = label.toLowerCase();
  if (l.includes("page") || l.includes("route") || l.includes("slug") || l.includes("redirect")) return "page";
  if (l.includes("blueprint") || l.includes("node") || l.includes("wire") || l.includes("pin") || l.includes("graph")) {
    return "blueprint";
  }
  if (l.includes("collection") || l.includes("field") || l.includes("schema") || l.includes("table") || l.includes("record")) {
    return "database";
  }
  if (
    l.includes("style") ||
    l.includes("color") ||
    l.includes("font") ||
    l.includes("padding") ||
    l.includes("margin") ||
    l.includes("radius") ||
    l.includes("shadow")
  ) {
    return "style";
  }
  if (l.includes("prop") || l.includes("value") || l.includes("label") || l.includes("disabled") || l.includes("toggle") || l.includes("text")) {
    return "property";
  }
  if (l.includes("variable") || l.includes("state")) return "variable";
  if (
    l.includes("element") ||
    l.includes("layer") ||
    l.includes("add") ||
    l.includes("delete") ||
    l.includes("move") ||
    l.includes("resize") ||
    l.includes("canvas") ||
    l.includes("container")
  ) {
    return "canvas";
  }
  return "general";
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxStackSize: 200,

  record: (entry) => {
    const transaction: HistoryTransaction = {
      ...entry,
      id: createId("hist"),
      timestamp: Date.now(),
      actionCategory: entry.actionCategory ?? inferActionCategory(entry.actionLabel),
    };
    set((state) => {
      const past = [...state.past, transaction];
      return { past: past.slice(Math.max(0, past.length - state.maxStackSize)), future: [] };
    });
    return transaction;
  },

  replaceLast: (entry) => {
    set((state) => (state.past.length === 0 ? state : { past: [...state.past.slice(0, -1), entry] }));
  },

  dropLast: () => {
    set((state) => ({ past: state.past.slice(0, -1) }));
  },

  takeUndo: () => {
    const { past } = get();
    if (past.length === 0) return null;
    set({ past: past.slice(0, -1) });
    return past[past.length - 1];
  },

  takeRedo: () => {
    const { future } = get();
    if (future.length === 0) return null;
    set({ future: future.slice(1) });
    return future[0];
  },

  pushPast: (entry) => set((state) => ({ past: [...state.past, entry] })),
  pushFuture: (entry) => set((state) => ({ future: [entry, ...state.future] })),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clearHistory: () => set({ past: [], future: [] }),

  load: (history) => {
    const cap = get().maxStackSize;
    set({ past: history.past.slice(Math.max(0, history.past.length - cap)), future: history.future.slice(0, cap) });
  },

  getLastActionLabel: () => {
    const past = get().past;
    return past.length > 0 ? past[past.length - 1].actionLabel : null;
  },
}));
