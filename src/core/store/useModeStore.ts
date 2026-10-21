"use client";

import { create } from "zustand";

/** The mode of the variables being viewed (ROADMAP Phase 45): its id, or null for the document's first mode. */
interface State {
  activeModeId: string | null;
  setActive: (id: string | null) => void;
}

export const useModeStore = create<State>((set) => ({
  activeModeId: null,
  setActive: (activeModeId) => set({ activeModeId }),
}));
