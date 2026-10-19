"use client";

/** The user's saved layouts, kept in `localStorage` next to the live layout (Phase 15). */
import { create } from "zustand";
import { clampLayout, type WorkspaceLayout } from "./layout";
import { findLayout, parseSavedLayouts, removeLayout, saveLayoutAs, type SaveResult, type SavedLayout } from "./savedLayouts";

export const SAVED_LAYOUTS_STORAGE_KEY = "lazylayout.layouts.v1";

interface SavedLayoutsState {
  layouts: SavedLayout[];
  hydrated: boolean;
  hydrate: () => void;
  save: (name: string, layout: WorkspaceLayout) => SaveResult;
  remove: (name: string) => void;
  get: (name: string) => WorkspaceLayout | undefined;
}

function persist(layouts: SavedLayout[]) {
  try {
    localStorage.setItem(SAVED_LAYOUTS_STORAGE_KEY, JSON.stringify({ version: 1, layouts }));
  } catch {
    // storage full or blocked: the layout simply isn't remembered
  }
}

export const useSavedLayouts = create<SavedLayoutsState>((set, get) => ({
  layouts: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    let layouts: SavedLayout[] = [];
    try {
      const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(SAVED_LAYOUTS_STORAGE_KEY);
      if (raw) layouts = parseSavedLayouts(JSON.parse(raw)).map((l) => ({ ...l, layout: clampLayout(l.layout) }));
    } catch {
      layouts = [];
    }
    set({ layouts, hydrated: true });
  },

  save: (name, layout) => {
    const result = saveLayoutAs(get().layouts, name, layout);
    if (result.ok) {
      set({ layouts: result.layouts });
      persist(result.layouts);
    }
    return result;
  },

  remove: (name) => {
    const layouts = removeLayout(get().layouts, name);
    set({ layouts });
    persist(layouts);
  },

  get: (name) => findLayout(get().layouts, name)?.layout,
}));
