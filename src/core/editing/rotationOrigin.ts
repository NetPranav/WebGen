/**
 * The rotation origin (FigCraft port F12, Alt+R): the point the selection turns about, its centre unless moved. A
 * moved origin belongs to the selection it was moved for and follows its first layer as it moves and turns (it is
 * kept in that layer's own space); it is dropped when the selection changes, and isn't saved in the file. Dragged, it
 * snaps to the selection box's corners, edge middles and centre (the centre puts it back). The rotation handles and
 * `transform.rotate` turn about it.
 *
 * Behaviour translated from FigCraft (`crates/engine/src/rotation_origin.rs`), commit 6ea44e9. MIT, Copyright (c) 2026
 * ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import { create } from "zustand";
import { corners, rotateVec, type Box } from "../geometry/transform";

export interface Pt {
  x: number;
  y: number;
}

interface OriginState {
  /** The selection it belongs to. */
  ids: string[];
  /** Where it was moved, from the first layer's centre in its own (unrotated) space; null: the centre. */
  at: Pt | null;
  /** The handle shows and can be dragged (Alt+R toggles it, Escape hides it). */
  editing: boolean;
}

export const useRotationOriginStore = create<OriginState>(() => ({ ids: [], at: null, editing: false }));

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
/** How near (screen px) a dragged origin snaps to a point of the box. */
export const ORIGIN_SNAP_PX = 6;

/** The selection's moved origin on the page, or null when it turns about its centre. */
export function movedOrigin(ids: readonly string[], firstBox: Box | undefined): Pt | null {
  const s = useRotationOriginStore.getState();
  if (!firstBox || !s.at || !same(s.ids, ids)) return null;
  const v = rotateVec(s.at.x, s.at.y, firstBox.rot);
  const p = { x: firstBox.cx + v.x, y: firstBox.cy + v.y };
  return Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
}

/** Where the selection turns: its moved origin, else the centre of the box around it. */
export const originPoint = (ids: readonly string[], frame: Box, firstBox: Box | undefined): Pt => movedOrigin(ids, firstBox) ?? { x: frame.cx, y: frame.cy };

/** The origin handle while it shows (page coordinates), or null. */
export function originHandle(ids: readonly string[], frame: Box, firstBox: Box | undefined): Pt | null {
  const s = useRotationOriginStore.getState();
  return s.editing && same(s.ids, ids) ? originPoint(ids, frame, firstBox) : null;
}

/** The state for this selection (a new one when the selection changed). */
function forSelection(ids: readonly string[]): OriginState {
  const s = useRotationOriginStore.getState();
  return same(s.ids, ids) ? s : { ids: [...ids], at: null, editing: false };
}

/** Shows or hides the origin handle (`on` undefined toggles). Returns whether it shows; false with nothing selected. */
export function editRotationOrigin(ids: readonly string[], on?: boolean): boolean {
  if (ids.length === 0) return false;
  const s = forSelection(ids);
  const editing = on ?? !s.editing;
  useRotationOriginStore.setState({ ...s, editing });
  return editing;
}

/** Moves the origin to page point `p` (null: back to the centre). */
export function setRotationOrigin(ids: readonly string[], p: Pt | null, firstBox: Box | undefined): boolean {
  if (ids.length === 0) return false;
  const s = forSelection(ids);
  let at: Pt | null = null;
  if (p && firstBox && Number.isFinite(p.x) && Number.isFinite(p.y)) at = rotateVec(p.x - firstBox.cx, p.y - firstBox.cy, -firstBox.rot);
  useRotationOriginStore.setState({ ...s, at });
  return true;
}

/** The selection box's corners, edge middles and centre (the centre last). */
export function boxPoints(frame: Box): Pt[] {
  const [a, b, c, d] = corners(frame);
  const mid = (p: Pt, q: Pt) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  return [a, b, c, d, mid(a, b), mid(b, c), mid(c, d), mid(d, a), { x: frame.cx, y: frame.cy }];
}

/** Where a drag puts the origin: the pointer, or a corner, edge middle or the centre within snapping distance (the centre: unmoved). */
export function dragRotationOrigin(ids: readonly string[], p: Pt, frame: Box, firstBox: Box | undefined, zoom: number): void {
  const pts = boxPoints(frame);
  let best = -1;
  let bestD = Infinity;
  pts.forEach((q, i) => {
    const d = Math.hypot(q.x - p.x, q.y - p.y) * Math.max(1e-6, zoom);
    if (d <= ORIGIN_SNAP_PX && d < bestD) [best, bestD] = [i, d];
  });
  setRotationOrigin(ids, best === 8 ? null : best >= 0 ? pts[best] : p, firstBox);
}
