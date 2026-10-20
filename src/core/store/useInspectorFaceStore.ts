"use client";

import { create } from "zustand";

export type InspectorFace = "simple" | "pro";
const KEY = "lazylayout:inspector-face";

function read(): InspectorFace {
  try {
    return window.localStorage.getItem(KEY) === "pro" ? "pro" : "simple";
  } catch {
    return "simple";
  }
}

/** Which face of the Design inspector is showing: the Simple one (the default) or the Pro one (Phase 34). A per-person view setting, remembered in the browser. */
interface State {
  face: InspectorFace;
  setFace: (face: InspectorFace) => void;
}

export const useInspectorFaceStore = create<State>((set) => ({
  face: typeof window === "undefined" ? "simple" : read(),
  setFace: (face) => {
    set({ face });
    try {
      window.localStorage.setItem(KEY, face);
    } catch {
      // not remembered
    }
  },
}));
