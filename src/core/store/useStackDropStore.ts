"use client";

import { create } from "zustand";

/** Where a child dragged inside an auto-layout frame would be dropped (Phase 41): the line to draw, in canvas space. */
interface State {
  line: { x1: number; y1: number; x2: number; y2: number } | null;
  set: (line: State["line"]) => void;
  clear: () => void;
}

export const useStackDropStore = create<State>((set) => ({
  line: null,
  set: (line) => set({ line }),
  clear: () => set({ line: null }),
}));
