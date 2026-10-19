"use client";

import { create } from "zustand";
import { DEFAULT_SNAP, type SnapLine, type SnapSettings, type SpacingMark } from "../geometry/snap";

/**
 * Snapping settings (ROADMAP Phase 28) and what a gesture is currently showing: the guide lines it snapped to and
 * the spacing marks. The settings are a per-person preference, remembered in `localStorage`.
 */
interface SnapState extends SnapSettings {
  rulers: boolean;
  /** Alt is held: show the distance HUD. */
  alt: boolean;
  lines: SnapLine[];
  spacing: SpacingMark[];
  toggle: (key: "objects" | "guides" | "grid" | "rulers") => void;
  setAlt: (on: boolean) => void;
  setFeedback: (lines: SnapLine[], spacing: SpacingMark[]) => void;
  clearFeedback: () => void;
}

const KEY = "lazylayout:snap";

function load(): Partial<Pick<SnapState, "objects" | "guides" | "grid" | "rulers">> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    const out: Partial<Pick<SnapState, "objects" | "guides" | "grid" | "rulers">> = {};
    for (const k of ["objects", "guides", "grid", "rulers"] as const) if (typeof raw[k] === "boolean") out[k] = raw[k] as boolean;
    return out;
  } catch {
    return {};
  }
}

export const useSnapStore = create<SnapState>((set, get) => ({
  ...DEFAULT_SNAP,
  rulers: true,
  alt: false,
  lines: [],
  spacing: [],
  toggle: (key) => {
    set({ [key]: !get()[key] } as Partial<SnapState>);
    try {
      const { objects, guides, grid, rulers } = get();
      window.localStorage.setItem(KEY, JSON.stringify({ objects, guides, grid, rulers }));
    } catch {
      // not remembered
    }
  },
  setAlt: (alt) => {
    if (get().alt !== alt) set({ alt });
  },
  setFeedback: (lines, spacing) => set({ lines, spacing }),
  clearFeedback: () => {
    if (get().lines.length || get().spacing.length) set({ lines: [], spacing: [] });
  },
}));

/** Reads the remembered settings once the canvas is on the client. */
export function restoreSnapSettings(): void {
  const saved = load();
  if (Object.keys(saved).length) useSnapStore.setState(saved);
}
