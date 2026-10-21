"use client";

import { create } from "zustand";
import type { PathNode, Vec } from "../paths/pathFit";

/**
 * The path being drawn right now (Phase 39), for the overlay to show: a pencil stroke's points so far, or the pen's
 * nodes with the rubber band to the pointer. In canvas space. Empty when nothing is being drawn.
 */
interface State {
  kind: "pencil" | "pen" | null;
  points: Vec[];
  nodes: PathNode[];
  closed: boolean;
  cursor: Vec | null;
  setPencil: (points: Vec[]) => void;
  setPen: (nodes: PathNode[], closed: boolean, cursor: Vec | null) => void;
  clear: () => void;
}

export const useDraftPathStore = create<State>((set) => ({
  kind: null,
  points: [],
  nodes: [],
  closed: false,
  cursor: null,
  setPencil: (points) => set({ kind: "pencil", points, nodes: [], closed: false, cursor: null }),
  setPen: (nodes, closed, cursor) => set({ kind: "pen", points: [], nodes, closed, cursor }),
  clear: () => set({ kind: null, points: [], nodes: [], closed: false, cursor: null }),
}));
