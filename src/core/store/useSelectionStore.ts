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
import { documentStore } from "./documentState";

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

// A layer that stops existing (an undo of its creation, a delete from anywhere, a frame removed) leaves the selection
// with it. Only ids that *were* layers are dropped: the selection also holds folders and assets, which aren't layers.
documentStore.subscribe((state, prev) => {
  if (state.document === prev.document) return;
  const { selectedIds, selectionType } = useSelectionStore.getState();
  if (selectedIds.length === 0) return;
  const kept = selectedIds.filter((id) => !(prev.document.layers[id] && !state.document.layers[id]));
  if (kept.length === selectedIds.length) return;
  useSelectionStore.setState({
    selectedIds: kept,
    selectedId: kept.length > 0 ? kept[kept.length - 1] : null,
    selectionType: kept.length > 0 ? selectionType : null,
  });
});

/** Test seam: with `window.__LL_TEST__` set before load, `window.__LL_SELECTION__()` is the ids of the selected layers. */
if (typeof window !== "undefined" && (window as unknown as { __LL_TEST__?: boolean }).__LL_TEST__) {
  (window as unknown as Record<string, unknown>).__LL_SELECTION__ = () => useSelectionStore.getState().selectedIds;
}
