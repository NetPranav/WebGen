"use client";

/**
 * ============================================================================
 * SELECTION MANAGEMENT STORE
 * ============================================================================
 * Zustand store managing selected entities across the IDE (elements on canvas,
 * assets in content browser, database tables, state variables, or Blueprint nodes).
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.4 & PANELS.md §Panel 03
 * ============================================================================
 */

import { create } from "zustand";

export type SelectionType =
  | "element"
  | "asset"
  | "database_table"
  | "state_var"
  | "node"
  | null;

export interface SelectionState {
  selectedId: string | null;
  selectedIds: string[];
  selectionType: SelectionType;

  // Actions
  select: (id: string, type: SelectionType) => void;
  toggleSelection: (id: string, type: SelectionType) => void;
  selectMultiple: (ids: string[], type: SelectionType) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedId: null,
  selectedIds: [],
  selectionType: null,

  select: (id: string, type: SelectionType) => {
    set({
      selectedId: id,
      selectedIds: [id],
      selectionType: type,
    });
  },

  toggleSelection: (id: string, type: SelectionType) => {
    const current = get().selectedIds;
    const exists = current.includes(id);
    const updated = exists ? current.filter((x) => x !== id) : [...current, id];

    set({
      selectedId: updated.length > 0 ? updated[updated.length - 1] : null,
      selectedIds: updated,
      selectionType: updated.length > 0 ? type : null,
    });
  },

  selectMultiple: (ids: string[], type: SelectionType) => {
    set({
      selectedId: ids.length > 0 ? ids[ids.length - 1] : null,
      selectedIds: ids,
      selectionType: ids.length > 0 ? type : null,
    });
  },

  clearSelection: () => {
    set({
      selectedId: null,
      selectedIds: [],
      selectionType: null,
    });
  },

  isSelected: (id: string) => {
    return get().selectedIds.includes(id);
  },
}));
