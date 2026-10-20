"use client";

import { create } from "zustand";

/** Bumped each time a font finishes loading in any document the editor draws into: what depends on text size (selection boxes, the hit index) measures again. */
interface State {
  loaded: number;
  bump: () => void;
}

export const useFontsStore = create<State>((set) => ({
  loaded: 0,
  bump: () => set((s) => ({ loaded: s.loaded + 1 })),
}));
