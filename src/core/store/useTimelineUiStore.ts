"use client";

import { create } from "zustand";

/** What the timeline panel remembers while the editor is open (none of it is saved in the document). */
import { clampZoom, ZOOM_LIMITS, type RevealMode } from "../timeline/model";

interface TimelineUiState {
  /** Horizontal zoom: pixels per second of timeline (Phase 63). */
  pixelsPerSecond: number;
  /** Width in px of the lanes' visible part, kept by the panel so "zoom to work area" knows what to fit. */
  viewportWidth: number;
  /** A scroll the panel should apply (px from the start of the lanes), then clear. */
  scrollRequest: number | null;
  setZoom: (pixelsPerSecond: number, scrollLeft?: number) => void;
  setViewportWidth: (px: number) => void;
  clearScrollRequest: () => void;
  /** `layerId` (a layer's groups show) and `layerId|group` (a group's properties show): the twirl-downs that are open. */
  open: ReadonlySet<string>;
  /** U (animated) and UU (modified) reveal: show only those properties of these layers, everything open. */
  reveal: Readonly<Record<string, RevealMode>>;
  toggleOpen: (key: string) => void;
  setReveal: (ids: readonly string[], mode: RevealMode | null) => void;
  /** One U press: reveal the animated properties of these layers (or hide them again); a second press within 450 ms reveals the modified ones. */
  pressReveal: (ids: readonly string[]) => RevealMode | null;
  /** Hide layers marked shy from the timeline's list. */
  hideShy: boolean;
  /** How the ruler labels time. */
  rulerMode: "timecode" | "frames";
  /** A layer the timeline should scroll to and flash for a moment (set by the Layers panel's motion badge). */
  focusLayerId: string | null;
  setHideShy: (hide: boolean) => void;
  setRulerMode: (mode: "timecode" | "frames") => void;
  focusLayer: (id: string | null) => void;
}

let lastReveal = { at: 0, key: "" };

export const useTimelineUiStore = create<TimelineUiState>((set, get) => ({
  pixelsPerSecond: ZOOM_LIMITS.default,
  viewportWidth: 0,
  scrollRequest: null,
  setZoom: (pixelsPerSecond, scrollLeft) => set({ pixelsPerSecond: clampZoom(pixelsPerSecond), ...(scrollLeft !== undefined ? { scrollRequest: scrollLeft } : {}) }),
  setViewportWidth: (viewportWidth) => set((s) => (s.viewportWidth === viewportWidth ? s : { viewportWidth })),
  clearScrollRequest: () => set({ scrollRequest: null }),
  open: new Set<string>(),
  reveal: {},
  toggleOpen: (key) =>
    set((s) => {
      const next = new Set(s.open);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { open: next };
    }),
  setReveal: (ids, mode) =>
    set((s) => {
      const next = { ...s.reveal };
      for (const id of ids) {
        if (mode === null) delete next[id];
        else next[id] = mode;
      }
      return { reveal: next };
    }),
  pressReveal: (ids) => {
    if (ids.length === 0) return null;
    const now = Date.now();
    const key = [...ids].sort().join(",");
    const double = key === lastReveal.key && now - lastReveal.at < 450;
    lastReveal = { at: now, key };
    const { reveal, setReveal } = get();
    if (double) {
      setReveal(ids, "modified");
      return "modified";
    }
    const allAnimated = ids.every((id) => reveal[id] === "animated");
    setReveal(ids, allAnimated ? null : "animated");
    return allAnimated ? null : "animated";
  },
  hideShy: false,
  rulerMode: "timecode",
  focusLayerId: null,
  setHideShy: (hideShy) => set({ hideShy }),
  setRulerMode: (rulerMode) => set({ rulerMode }),
  focusLayer: (focusLayerId) => {
    set({ focusLayerId });
    // The row flashes for a moment, then the request is spent.
    if (focusLayerId !== null) setTimeout(() => set((s) => (s.focusLayerId === focusLayerId ? { focusLayerId: null } : s)), 1200);
  },
}));
