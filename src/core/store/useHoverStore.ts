"use client";

import { create } from "zustand";
import type { Rect } from "@/core/viewport/camera";

/** The layer under the pointer (what a click would select) and its box in canvas space. Written by the canvas' hit-testing (Phase 22). */
interface HoverState {
  hoveredId: string | null;
  rect: Rect | null;
  set: (hoveredId: string | null, rect: Rect | null) => void;
}

export const useHoverStore = create<HoverState>((set, get) => ({
  hoveredId: null,
  rect: null,
  set: (hoveredId, rect) => {
    if (get().hoveredId === hoveredId) return;
    set({ hoveredId, rect });
  },
}));
