"use client";

import { create } from "zustand";
import type { PathNode } from "../paths/pathFit";
import type { LayerBox } from "../editing/vectorOps";
import { getDocument } from "./documentState";
import { useSelectionStore } from "./useSelectionStore";

/**
 * Path edit mode (ROADMAP Phase 40): which path layer is being edited, its nodes in canvas space as they are right
 * now (a drag changes them before the layer does), which nodes are selected, and where the layer is on the canvas.
 */
interface State {
  layerId: string | null;
  nodes: PathNode[];
  closed: boolean;
  selected: number[];
  box: LayerBox | null;
  enter: (layerId: string, nodes: PathNode[], closed: boolean, box: LayerBox) => void;
  set: (nodes: PathNode[], closed: boolean, selected?: number[]) => void;
  select: (selected: number[]) => void;
  setBox: (box: LayerBox) => void;
  exit: () => void;
}

export const useVectorEditStore = create<State>((set) => ({
  layerId: null,
  nodes: [],
  closed: false,
  selected: [],
  box: null,
  enter: (layerId, nodes, closed, box) => set({ layerId, nodes, closed, box, selected: [] }),
  set: (nodes, closed, selected) => set((s) => ({ nodes, closed, selected: selected ?? s.selected })),
  select: (selected) => set({ selected }),
  setBox: (box) => set({ box }),
  exit: () => set({ layerId: null, nodes: [], closed: false, selected: [], box: null }),
}));

/** The one path layer that is selected (what Enter or a double click starts editing), or null. */
export function editablePathSelection(): string | null {
  const ids = useSelectionStore.getState().selectedIds;
  if (ids.length !== 1) return null;
  const layer = getDocument().layers[ids[0]];
  return layer && layer.archetype === "svgPath" && layer.locked !== true ? layer.id : null;
}

export const isEditingPath = (): boolean => useVectorEditStore.getState().layerId !== null;
