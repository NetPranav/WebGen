import { layerBar, type Marker } from "../document/compositions";
import { canReparent } from "../layers/reparent";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { transaction } from "../editing/editOps";
import { getTransport } from "../time/transport";
import { clampWorkArea, slideBar, snapTime, trimIn, trimOut } from "./model";

/**
 * Timeline operations (ROADMAP Phase 61): every edit the timeline panel makes, as a function the commands in
 * `timelineCommands.ts` wrap (Law 20). Each is one undo step and returns what it changed.
 */

export type LayerSwitch = "solo" | "shy" | "motionBlur";

const activeComposition = () => getTransport().compositionId;

/** Sets a switch (solo, shy, motion blur) on exactly these layers. */
export function setLayerSwitch(ids: readonly string[], key: LayerSwitch, on: boolean): number {
  const layers = getDocument().layers;
  const targets = ids.filter((id) => layers[id] && (layers[id][key] === true) !== on);
  if (targets.length === 0) return 0;
  const label = `${on ? "Turn on" : "Turn off"} ${key === "motionBlur" ? "motion blur" : key}`;
  transaction(label, () => targets.forEach((id) => documentCommands.setLayerFlags(id, { [key]: on || undefined })));
  return targets.length;
}

/** Moves a layer's in or out point to `time`. Returns the new bar, or null when nothing changed. */
export function trimLayer(layerId: string, edge: "in" | "out", time: number, compositionId = activeComposition()) {
  const doc = getDocument();
  const comp = doc.compositions[compositionId];
  if (!comp || !doc.layers[layerId]) return null;
  const bar = layerBar(comp, layerId);
  const next = edge === "in" ? trimIn(bar, time, comp) : trimOut(bar, time, comp);
  if (next.in === bar.in && next.out === bar.out) return null;
  documentCommands.setLayerBar(compositionId, layerId, next, edge === "in" ? "Trim layer in point" : "Trim layer out point");
  return next;
}

/** Slides a layer's bar by `delta` seconds. */
export function slideLayer(layerId: string, delta: number, compositionId = activeComposition()) {
  const doc = getDocument();
  const comp = doc.compositions[compositionId];
  if (!comp || !doc.layers[layerId]) return null;
  const bar = layerBar(comp, layerId);
  const next = slideBar(bar, delta, comp);
  if (next.in === bar.in) return null;
  documentCommands.setLayerBar(compositionId, layerId, next, "Move layer");
  return next;
}

/**
 * Sets a layer's bar in one step (a drag in the panel ends with this). Times snap to frames; the bar must stay inside
 * the composition and be at least a frame long, or nothing changes.
 */
export function setLayerBarTimes(layerId: string, times: { in?: number; out?: number; start?: number }, compositionId = activeComposition()) {
  const doc = getDocument();
  const comp = doc.compositions[compositionId];
  if (!comp || !doc.layers[layerId]) return null;
  const original = layerBar(comp, layerId);
  const bar = {
    ...original,
    ...(times.start !== undefined ? { start: snapTime(times.start, comp.fps) } : {}),
    ...(times.in !== undefined ? { in: snapTime(times.in, comp.fps) } : {}),
    ...(times.out !== undefined ? { out: snapTime(times.out, comp.fps) } : {}),
  };
  const frame = 1 / comp.fps;
  if (bar.in < 0 || bar.out > comp.duration + 1e-9 || bar.out < bar.in + frame - 1e-9) return null;
  if (bar.in === original.in && bar.out === original.out && bar.start === original.start) return null;
  documentCommands.setLayerBar(compositionId, layerId, bar, "Trim layer");
  return bar;
}

/** Sets the work area. Returns the area it set (snapped and clamped), or null. */
export function setWorkArea(start: number, end: number, compositionId = activeComposition()) {
  const comp = getDocument().compositions[compositionId];
  if (!comp) return null;
  const area = clampWorkArea(start, end, comp);
  if (!area || (area.start === comp.workArea.start && area.end === comp.workArea.end)) return null;
  documentCommands.setWorkArea(compositionId, area.start, area.end);
  return area;
}

/** Moves only the work area's start (B in After Effects) or end (N) to `time`. */
export function setWorkAreaEdge(edge: "start" | "end", time: number, compositionId = activeComposition()) {
  const comp = getDocument().compositions[compositionId];
  if (!comp) return null;
  const { start, end } = comp.workArea;
  return edge === "start" ? setWorkArea(Math.min(time, end - 1 / comp.fps), end, compositionId) : setWorkArea(start, Math.max(time, start + 1 / comp.fps), compositionId);
}

/** Adds a composition marker at `time` (snapped to a frame). Returns its id. */
export function addMarkerAt(time: number, label = "", compositionId = activeComposition()): string | null {
  const comp = getDocument().compositions[compositionId];
  if (!comp) return null;
  const at = Math.min(comp.duration, Math.max(0, snapTime(time, comp.fps)));
  const marker: Omit<Marker, "id"> = { time: at, label: label || `Marker ${comp.markers.length + 1}` };
  return documentCommands.addMarker(compositionId, marker);
}

export function removeMarkerById(id: string, compositionId = activeComposition()): boolean {
  const comp = getDocument().compositions[compositionId];
  if (!comp?.markers.some((m) => m.id === id)) return false;
  documentCommands.removeMarker(compositionId, id);
  return true;
}

/** Layers a layer may be parented to (the pick-whip's choices): what `canReparent` allows, nothing under itself. */
export function parentChoices(layerId: string): Array<{ id: string; name: string }> {
  const layers = getDocument().layers;
  return Object.values(layers)
    .filter((l) => l.id !== layerId && canReparent(layers, [layerId], l.id).ok)
    .map((l) => ({ id: l.id, name: l.name }));
}
