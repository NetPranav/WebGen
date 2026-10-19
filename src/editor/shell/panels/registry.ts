/**
 * ROADMAP Phase 14: the panel registry. A panel is registered once with where
 * it lives, which edition has it, how to load it, and what focus scope its
 * shortcuts belong to. The shell renders panels by id through `PanelHost`, so
 * a panel that isn't in the current layout is never loaded and costs no bytes.
 * Pure registry: no React rendering here (see `PanelHost.tsx`).
 */
import type { ComponentType } from "react";
import type { FocusScope } from "@/core/commands";
import type { Edition } from "@/core/flags";

export type PanelZone = "left" | "right" | "bottom" | "center" | "fullpage";

/** Which tab a panel is being rendered for: the id and title the shell gave it. */
export interface PanelTarget {
  panelId: string;
  title: string;
}

export interface PanelDefinition<P extends object = object, C = unknown> {
  id: string;
  title: string;
  zone: PanelZone;
  /** The edition that ships the panel. A `full` panel renders nothing in the `initial` edition. */
  edition: Edition;
  /** Which focus region its keyboard shortcuts belong to, if any. */
  focusScope?: FocusScope;
  /** Loads the component. Called at most once, the first time the panel is shown. Omit for an `component` that is always in the layout. */
  load?: () => Promise<ComponentType<P>>;
  /** A component that is in every default layout (the stage, Details, Content Browser), imported statically so it never flashes a loading state. */
  component?: ComponentType<P>;
  /** Builds the panel's props from the shell's context and the tab being shown. */
  props?: (context: C, target: PanelTarget) => P;
  /** Full-page panels only: another id or title the shell may use for this panel (legacy tab ids, file names). */
  match?: (panelId: string, title: string) => boolean;
}

const panels = new Map<string, PanelDefinition>();
const loaded = new Set<string>();

const keyOf = (zone: PanelZone, id: string) => `${zone}:${id}`;

/** Registers a panel; registering the same zone and id again replaces it. */
export function registerPanel<P extends object, C>(definition: PanelDefinition<P, C>): void {
  panels.set(keyOf(definition.zone, definition.id), definition as unknown as PanelDefinition);
}

export function getPanel(zone: PanelZone, id: string): PanelDefinition | undefined {
  return panels.get(keyOf(zone, id));
}

export function getPanels(zone?: PanelZone): PanelDefinition[] {
  const all = Array.from(panels.values());
  return zone ? all.filter((p) => p.zone === zone) : all;
}

/**
 * The full-page panel that handles a tab: an exact id first, then each
 * registered panel's `match`, in registration order. The last full-page panel
 * registered with `match: () => true` is the fallback (the asset file editor).
 */
export function resolveFullPagePanel(panelId: string, title: string): PanelDefinition | undefined {
  const exact = panels.get(keyOf("fullpage", panelId));
  if (exact) return exact;
  return getPanels("fullpage").find((p) => p.match?.(panelId, title));
}

const listeners = new Set<() => void>();

/** Records that a panel's code has been fetched (called by `PanelHost`). */
export function markPanelLoaded(zone: PanelZone, id: string): void {
  const key = keyOf(zone, id);
  if (loaded.has(key)) return;
  loaded.add(key);
  for (const listener of listeners) listener();
}

/** Calls `listener` whenever another panel's code has been fetched. Returns an unsubscribe. */
export function onPanelLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Ids of the panels whose code has been fetched so far, for the bundle test. */
export function loadedPanelIds(): string[] {
  return Array.from(loaded).sort();
}

/** Test seam. */
export function clearPanelRegistry(): void {
  panels.clear();
  loaded.clear();
  listeners.clear();
}
