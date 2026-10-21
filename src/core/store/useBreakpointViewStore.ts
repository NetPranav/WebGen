"use client";

import { create } from "zustand";

/** Whether the canvas shows every breakpoint of a responsive page side by side (ROADMAP Phase 44), not only the one being edited. */
interface State {
  showAll: boolean;
  setShowAll: (on: boolean) => void;
}

export const useBreakpointViewStore = create<State>((set) => ({
  showAll: false,
  setShowAll: (showAll) => set({ showAll }),
}));
