"use client";

/**
 * ============================================================================
 * CANVAS VIEW STORE (ROADMAP Phase 21)
 * ============================================================================
 * What the canvas shows that isn't the camera and isn't document content: the
 * backdrop behind the frames and which frame is the active one (the one new
 * shapes are drawn into and `getStageRenderer()` answers for). The backdrop is
 * a per-person view preference, remembered in `localStorage`.
 * ============================================================================
 */

import { create } from "zustand";

export const BACKDROPS = ["light", "dark", "checker"] as const;
export type Backdrop = (typeof BACKDROPS)[number];

const BACKDROP_KEY = "lazylayout:canvas-backdrop";

/** Design: the canvas captures pointer events and picks layers. Preview: they reach the frames, so links and buttons work. */
export type CanvasMode = "design" | "preview";

export function isBackdrop(value: unknown): value is Backdrop {
  return typeof value === "string" && (BACKDROPS as readonly string[]).includes(value);
}

function loadBackdrop(): Backdrop {
  try {
    const raw = window.localStorage.getItem(BACKDROP_KEY);
    return isBackdrop(raw) ? raw : "light";
  } catch {
    return "light";
  }
}

interface CanvasViewState {
  backdrop: Backdrop;
  /** The frame (top-level layer id) new shapes go into; null until a frame is picked, then the first frame is used. */
  activeFrameId: string | null;
  mode: CanvasMode;
  setMode: (mode: CanvasMode) => void;
  setBackdrop: (backdrop: Backdrop) => void;
  setActiveFrame: (frameId: string | null) => void;
}

export const useCanvasViewStore = create<CanvasViewState>((set) => ({
  backdrop: "light",
  activeFrameId: null,
  mode: "design",
  setMode: (mode) => set({ mode }),
  setBackdrop: (backdrop) => {
    set({ backdrop });
    try {
      window.localStorage.setItem(BACKDROP_KEY, backdrop);
    } catch {
      // not remembered
    }
  },
  setActiveFrame: (activeFrameId) => set({ activeFrameId }),
}));

/** Reads the remembered backdrop (called once, on the client, when the canvas mounts). */
export function restoreBackdrop(): void {
  const saved = loadBackdrop();
  if (saved !== useCanvasViewStore.getState().backdrop) useCanvasViewStore.setState({ backdrop: saved });
}
