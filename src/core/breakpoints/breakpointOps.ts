/**
 * Breakpoint operations (ROADMAP Phase 43): choosing the breakpoint being edited, adding, resizing and removing
 * breakpoints, making a frame responsive, and resetting or hiding at a breakpoint. Edits themselves need no special
 * call: while a smaller breakpoint is active the document store sends property changes to the overrides.
 */

import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { useBreakpointStore } from "../store/useBreakpointStore";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { frameIdOf } from "../frames/frames";
import { MAX_BREAKPOINTS, breakpointsOf, isBase, type Breakpoint } from "./breakpoints";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "bp";

/** The frame the breakpoint bar acts on: the selection's frame, else the active one. */
export function targetFrameId(): string | null {
  const layers = getDocument().layers;
  const selected = useSelectionStore.getState().selectedIds[0];
  const fromSelection = selected ? frameIdOf(layers, selected) : null;
  if (fromSelection) return fromSelection;
  const active = useCanvasViewStore.getState().activeFrameId;
  return active && layers[active] ? active : null;
}

/**
 * Chooses the breakpoint to edit (null or the base for the base). The first time a smaller one is chosen the target
 * frame is made responsive (its width follows the breakpoint), so the canvas shows the page at that width.
 */
export function setActiveBreakpoint(id: string | null): boolean {
  const list = breakpointsOf(getDocument());
  if (id !== null && !list.some((b) => b.id === id)) return false;
  if (!isBase(list, id)) {
    const frame = targetFrameId();
    const layer = frame ? getDocument().layers[frame] : undefined;
    if (layer && layer.parentId === null && layer.properties["breakpoints.responsive"] !== true && !Object.values(getDocument().layers).some((l) => l.parentId === null && l.properties["breakpoints.responsive"] === true)) {
      useBreakpointStore.getState().setActive(null);
      documentCommands.updateProps(layer.id, { "breakpoints.responsive": true }, "Make frame responsive");
    }
  }
  useBreakpointStore.getState().setActive(isBase(list, id) ? null : id);
  return true;
}

export function addBreakpoint(name: string, width: number): string | null {
  const list = breakpointsOf(getDocument());
  const w = Math.round(width);
  if (list.length >= MAX_BREAKPOINTS || !Number.isFinite(w) || w < 100 || w > 10000 || list.some((b) => b.width === w) || !name.trim()) return null;
  let id = slug(name);
  for (let n = 2; list.some((b) => b.id === id); n++) id = `${slug(name)}-${n}`;
  documentCommands.setBreakpoints([...list, { id, name: name.trim().slice(0, 40), width: w }], "Add breakpoint");
  return id;
}

export function updateBreakpoint(id: string, patch: { name?: string; width?: number }): boolean {
  const list = breakpointsOf(getDocument());
  const target = list.find((b) => b.id === id);
  if (!target) return false;
  const width = patch.width === undefined ? target.width : Math.round(patch.width);
  if (width < 100 || width > 10000 || list.some((b) => b.id !== id && b.width === width)) return false;
  documentCommands.setBreakpoints(list.map((b): Breakpoint => (b.id === id ? { ...b, name: (patch.name ?? b.name).trim().slice(0, 40) || b.name, width } : b)), "Change breakpoint");
  return true;
}

/** Removes a breakpoint and every override made for it. The base can't be removed. */
export function removeBreakpoint(id: string): boolean {
  const list = breakpointsOf(getDocument());
  if (list.length <= 1 || list[0].id === id || !list.some((b) => b.id === id)) return false;
  if (useBreakpointStore.getState().activeId === id) useBreakpointStore.getState().setActive(null);
  documentCommands.setBreakpoints(list.filter((b) => b.id !== id), "Remove breakpoint");
  return true;
}

export function setResponsive(frameId: string, on: boolean): boolean {
  const layer = getDocument().layers[frameId];
  if (!layer || layer.parentId !== null) return false;
  const active = useBreakpointStore.getState().activeId;
  useBreakpointStore.getState().setActive(null); // the flag belongs to the base
  documentCommands.updateProps(frameId, { "breakpoints.responsive": on ? true : undefined }, on ? "Make frame responsive" : "Make frame fixed");
  useBreakpointStore.getState().setActive(active);
  return true;
}

/** Resets overrides (the given properties, or all) of layers at the breakpoint being edited. Returns how many layers had any. */
export function resetOverrides(ids: readonly string[], keys?: readonly string[]): number {
  const active = useBreakpointStore.getState().activeId;
  if (!active) return 0;
  const layers = getDocument().layers;
  const with_ = ids.filter((id) => layers[id]?.overrides?.[active]);
  if (with_.length === 0) return 0;
  documentCommands.resetOverrides(with_, active, keys);
  return with_.length;
}
