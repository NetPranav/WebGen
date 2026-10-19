"use client";

/**
 * ROADMAP Phase 14: the live workspace layout, saved in UI preferences
 * (localStorage; a layout is a per-browser preference, not project data) and
 * restored on load. Only the layout is stored; open full-page tabs and torn-off
 * panels are session state.
 */
import { create } from "zustand";
import {
  DEFAULT_LAYOUT,
  applyPreset,
  clampLayout,
  parseLayout,
  type PresetEffect,
  type WorkspaceLayout,
  type ZoneId,
} from "./layout";

export const WORKSPACE_STORAGE_KEY = "lazylayout.workspace.v1";

interface WorkspaceState {
  layout: WorkspaceLayout;
  /** False until the saved layout has been read on the client (the server render always uses the default). */
  hydrated: boolean;
  hydrate: () => void;
  setZoneSize: (zone: ZoneId, size: number) => void;
  setZoneCollapsed: (zone: ZoneId, collapsed: boolean | ((current: boolean) => boolean)) => void;
  setZoneTab: (zone: ZoneId | "center", tabId: string) => void;
  setOutputLogOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  setAi: (patch: Partial<WorkspaceLayout["ai"]>) => void;
  /** Applies a preset and returns the effects (full-page panel, zone focus) the shell must perform. */
  selectPreset: (preset: string) => PresetEffect[];
  /** Replaces the layout with a saved one, recorded as the custom preset `custom:<name>`. */
  applyLayout: (layout: WorkspaceLayout, name: string) => void;
  resetLayout: () => PresetEffect[];
}

const resolve = (value: boolean | ((current: boolean) => boolean), current: boolean) =>
  typeof value === "function" ? value(current) : value;

function readStored(): WorkspaceLayout | null {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(WORKSPACE_STORAGE_KEY);
    return raw ? clampLayout(parseLayout(JSON.parse(raw))) : null;
  } catch {
    return null; // blocked storage or corrupt JSON: use the default
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  layout: DEFAULT_LAYOUT,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ layout: readStored() ?? get().layout, hydrated: true });
  },

  setZoneSize: (zone, size) => set((s) => ({ layout: { ...s.layout, [zone]: { ...s.layout[zone], size } } })),
  setZoneCollapsed: (zone, collapsed) =>
    set((s) => ({ layout: { ...s.layout, [zone]: { ...s.layout[zone], collapsed: resolve(collapsed, s.layout[zone].collapsed) } } })),
  setZoneTab: (zone, tabId) =>
    set((s) =>
      zone === "center"
        ? { layout: { ...s.layout, center: { activeTab: tabId } } }
        : { layout: { ...s.layout, [zone]: { ...s.layout[zone], activeTab: tabId } } },
    ),
  setOutputLogOpen: (open) => set((s) => ({ layout: { ...s.layout, outputLogOpen: resolve(open, s.layout.outputLogOpen) } })),
  setAi: (patch) => set((s) => ({ layout: { ...s.layout, ai: { ...s.layout.ai, ...patch } } })),

  selectPreset: (preset) => {
    const viewportHeight = typeof window === "undefined" ? undefined : window.innerHeight;
    const { layout, effects } = applyPreset(get().layout, preset, { viewportHeight });
    set({ layout });
    return effects;
  },
  applyLayout: (layout, name) => set({ layout: { ...clampLayout(layout), preset: `custom:${name}` } }),
  resetLayout: () => {
    const { layout, effects } = applyPreset(DEFAULT_LAYOUT, "design");
    set({ layout });
    return effects;
  },
}));

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Saves the layout 300 ms after the last change. Returns an unsubscribe. */
export function installWorkspacePersistence(): () => void {
  const unsubscribe = useWorkspaceStore.subscribe((state, prev) => {
    if (!state.hydrated || state.layout === prev.layout) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(useWorkspaceStore.getState().layout));
      } catch {
        // storage full or blocked: the layout simply isn't remembered
      }
    }, 300);
  });
  return () => {
    unsubscribe();
    if (saveTimer) clearTimeout(saveTimer);
  };
}
