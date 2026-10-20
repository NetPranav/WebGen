"use client";

import { create } from "zustand";

/** What the Layers panel remembers while the editor is open: which layers are expanded, the search, and the Shift-click anchor. */
interface LayersUiState {
  expanded: ReadonlySet<string>;
  query: string;
  anchor: string | null;
  setExpanded: (id: string, open: boolean) => void;
  expandAll: (ids: readonly string[]) => void;
  setQuery: (query: string) => void;
  setAnchor: (id: string | null) => void;
}

export const useLayersUiStore = create<LayersUiState>((set) => ({
  expanded: new Set<string>(),
  query: "",
  anchor: null,
  setExpanded: (id, open) =>
    set((s) => {
      if (s.expanded.has(id) === open) return s;
      const next = new Set(s.expanded);
      if (open) next.add(id);
      else next.delete(id);
      return { expanded: next };
    }),
  expandAll: (ids) =>
    set((s) => {
      const missing = ids.filter((id) => !s.expanded.has(id));
      return missing.length === 0 ? s : { expanded: new Set([...s.expanded, ...missing]) };
    }),
  setQuery: (query) => set({ query }),
  setAnchor: (anchor) => set({ anchor }),
}));
