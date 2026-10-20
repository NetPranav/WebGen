"use client";

import { create } from "zustand";

/** What the asset features tell the person: the last import's problems, shown for a few seconds, and a counter the Assets panel watches to refresh. */
interface State {
  notice: string | null;
  /** Bumped whenever the asset store changes (an import, a thumbnail, a delete). */
  version: number;
  setNotice: (notice: string | null) => void;
  bump: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useAssetUiStore = create<State>((set) => ({
  notice: null,
  version: 0,
  setNotice: (notice) => {
    if (timer) clearTimeout(timer);
    set({ notice });
    if (notice) timer = setTimeout(() => set({ notice: null }), 8000);
  },
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
