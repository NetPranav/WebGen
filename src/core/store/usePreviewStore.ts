"use client";

import { create } from "zustand";

/**
 * Where Preview is (ROADMAP Phase 48): the frame being shown, a section to scroll to, and a history to go back and
 * forward through, like a browser. `entries` are frame ids with an optional anchor.
 */
export interface PreviewEntry {
  frameId: string;
  anchor?: string;
}

interface State {
  entries: PreviewEntry[];
  index: number;
  /** Bumped when the same frame is visited again with an anchor, so the view scrolls again. */
  nonce: number;
  current: () => PreviewEntry | null;
  /** Starts at `entry` (clears the history). */
  reset: (entry: PreviewEntry | null) => void;
  go: (entry: PreviewEntry) => void;
  back: () => boolean;
  forward: () => boolean;
}

export const usePreviewStore = create<State>((set, get) => ({
  entries: [],
  index: -1,
  nonce: 0,
  current: () => get().entries[get().index] ?? null,
  reset: (entry) => set((s) => ({ entries: entry ? [entry] : [], index: entry ? 0 : -1, nonce: s.nonce + 1 })),
  go: (entry) =>
    set((s) => {
      const here = s.entries[s.index];
      if (here && here.frameId === entry.frameId && here.anchor === entry.anchor) return { nonce: s.nonce + 1 };
      const entries = [...s.entries.slice(0, s.index + 1), entry].slice(-200);
      return { entries, index: entries.length - 1, nonce: s.nonce + 1 };
    }),
  back: () => {
    const s = get();
    if (s.index <= 0) return false;
    set({ index: s.index - 1, nonce: s.nonce + 1 });
    return true;
  },
  forward: () => {
    const s = get();
    if (s.index >= s.entries.length - 1) return false;
    set({ index: s.index + 1, nonce: s.nonce + 1 });
    return true;
  },
}));
