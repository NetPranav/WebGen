"use client";

import { create } from "zustand";

/** What the timeline panel remembers while the editor is open (none of it is saved in the document). */
interface TimelineUiState {
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

export const useTimelineUiStore = create<TimelineUiState>((set) => ({
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
