/**
 * What the transform handles act on (ROADMAP Phase 27): the selection as boxes and the handles around them, computed
 * from the hit index (measured boxes in canvas space) and the layers' properties. Pure given its inputs.
 */

import type { HitIndex } from "@/core/hit/hitTest";
import type { Layer } from "@/core/document/schema";
import { boundsOf, gapsBetween, type SpreadAxis } from "@/core/geometry/align";
import { corners, handlePoints, paramHandles, paramHandleWorld, rotateVec, unionBox, type Box, type ParamHandle, type ResizeHandle, RESIZE_HANDLES } from "@/core/geometry/transform";
import { handlesFor, normToWorld, type GradientHandle } from "@/core/paint/gradientHandles";
import type { Paint } from "@/core/paint/paints";
import type { Camera, Point } from "@/core/viewport/camera";
import { docToScreen } from "@/core/viewport/camera";

export interface TransformModel {
  ids: string[];
  boxes: Box[];
  /** The box the handles surround: the one layer's own box, or the union of several. */
  frame: Box;
  /** Parameter handles (single selection only), with their position in canvas space. */
  params: { handle: ParamHandle; world: Point; layerId: string; value: number }[];
  /** Spacing handles between neighbouring layers of a multi-selection laid out in a row or a column (Phase 30). */
  gaps: GapHandle[];
  /** The handles of the gradient fill being edited (single selection only), with their place on the canvas. */
  gradient: GradientModel | null;
}

export interface GradientModel {
  layerId: string;
  paintIndex: number;
  paint: Paint;
  /** The layer's box on the canvas: the gradient's fractions are of this box. */
  box: Box;
  handles: { handle: GradientHandle; world: Point }[];
}

export interface GapHandle {
  axis: SpreadAxis;
  /** The gap in canvas px. */
  size: number;
  /** Where the handle sits (the middle of the gap, centred on the neighbours' overlap), in canvas space. */
  world: Point;
  /** The gap's extent along its axis. */
  from: number;
  to: number;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A layer's box on the canvas: its measured centre, its own size when it is rotated (its measured box is then the bounding box), its rotation. */
export function layerBox(layer: Layer, bounds: { x: number; y: number; width: number; height: number }): Box {
  const rot = num(layer.properties["frame.rotation"]) ?? 0;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  if (rot === 0) return { cx, cy, w: bounds.width, h: bounds.height, rot: 0 };
  return { cx, cy, w: num(layer.properties["frame.width"]) ?? bounds.width, h: num(layer.properties["frame.height"]) ?? bounds.height, rot };
}

/** The model for a selection, or null when nothing selected is drawn. `inset` is the screen-constant handle gap in canvas px (14 / zoom). */
export function buildTransformModel(index: HitIndex, layers: Record<string, Layer>, selectedIds: readonly string[], inset: number, editing?: { layerId: string; index: number; paint: Paint } | null): TransformModel | null {
  const ids: string[] = [];
  const boxes: Box[] = [];
  for (const id of selectedIds) {
    const hit = index.get(id);
    const layer = layers[id];
    if (!hit || !layer) continue;
    ids.push(id);
    boxes.push(layerBox(layer, hit.bounds));
  }
  const frame = unionBox(boxes);
  if (!frame) return null;
  const params: TransformModel["params"] = [];
  if (ids.length === 1) {
    const layer = layers[ids[0]];
    for (const handle of paramHandles(layer.archetype, boxes[0], layer.properties, inset)) {
      params.push({ handle, world: paramHandleWorld(boxes[0], handle), layerId: ids[0], value: num(layer.properties[handle.prop]) ?? defaultParam(handle.prop) });
    }
  }
  let gradient: GradientModel | null = null;
  if (editing && ids.length === 1 && ids[0] === editing.layerId && editing.paint.type !== "solid") {
    const box = boxes[0];
    gradient = { layerId: editing.layerId, paintIndex: editing.index, paint: editing.paint, box, handles: handlesFor(editing.paint, box).map((handle) => ({ handle, world: normToWorld(box, handle.at) })) };
  }
  return { ids, boxes, frame, params, gaps: spacingHandles(boxes), gradient };
}

/**
 * The spacing handles of a selection: for each axis, when every neighbouring pair has a gap of zero or more and
 * overlaps the next across the other axis (a row or a column of layers), one handle in the middle of each gap.
 */
export function spacingHandles(boxes: readonly Box[]): GapHandle[] {
  if (boxes.length < 2) return [];
  const out: GapHandle[] = [];
  for (const axis of ["h", "v"] as const) {
    const gaps = gapsBetween(boxes, axis);
    if (gaps.length !== boxes.length - 1 || gaps.some((g) => g.size < 0)) continue;
    const cross = gaps.map((g) => {
      const a = boundsOf(boxes[g.a]);
      const b = boundsOf(boxes[g.b]);
      const lo = axis === "h" ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
      const hi = axis === "h" ? Math.min(a.y + a.height, b.y + b.height) : Math.min(a.x + a.width, b.x + b.width);
      return hi > lo ? (lo + hi) / 2 : null;
    });
    if (cross.some((c) => c === null)) continue;
    gaps.forEach((g, i) => {
      const mid = (g.from + g.to) / 2;
      out.push({ axis, size: g.size, from: g.from, to: g.to, world: axis === "h" ? { x: mid, y: cross[i]! } : { x: cross[i]!, y: mid } });
    });
  }
  return out;
}

function defaultParam(prop: string): number {
  return prop === "shape.innerRadius" ? 0.5 : prop === "shape.points" ? 5 : prop === "shape.sides" ? 6 : 0;
}

export type HandleHit =
  | { kind: "resize"; handle: ResizeHandle }
  | { kind: "rotate" }
  | { kind: "param"; index: number }
  | { kind: "gap"; index: number }
  | { kind: "gradient"; index: number };

/** Screen-px radii. */
const PARAM_RADIUS = 8;
const RESIZE_RADIUS = 7;
const ROTATE_OUTER = 24;
const GAP_RADIUS = 9;
const GRADIENT_RADIUS = 9;

/**
 * Which handle is under a screen point, if any. Parameter handles come first, then the eight resize handles, then
 * the rotation zones just outside the corners. A multi-selection rotates about the union's centre.
 */
export function handleAtScreen(model: TransformModel, camera: Camera, screen: Point): HandleHit | null {
  const toScreen = (p: Point) => docToScreen(camera, p);
  // a gradient's handles come first: they sit on top of the layer they shape
  if (model.gradient) {
    for (let i = model.gradient.handles.length - 1; i >= 0; i--) {
      const s = toScreen(model.gradient.handles[i].world);
      if (Math.hypot(s.x - screen.x, s.y - screen.y) <= GRADIENT_RADIUS) return { kind: "gradient", index: i };
    }
  }
  for (let i = 0; i < model.params.length; i++) {
    const s = toScreen(model.params[i].world);
    if (Math.hypot(s.x - screen.x, s.y - screen.y) <= PARAM_RADIUS) return { kind: "param", index: i };
  }
  const points = handlePoints(model.frame);
  for (const h of RESIZE_HANDLES) {
    const s = toScreen(points[h]);
    if (Math.hypot(s.x - screen.x, s.y - screen.y) <= RESIZE_RADIUS) return { kind: "resize", handle: h };
  }
  for (let i = 0; i < model.gaps.length; i++) {
    const s = toScreen(model.gaps[i].world);
    if (Math.hypot(s.x - screen.x, s.y - screen.y) <= GAP_RADIUS) return { kind: "gap", index: i };
  }
  // Rotation: close to a corner, outside the box.
  const cs = corners(model.frame).map(toScreen);
  const near = cs.some((c) => {
    const d = Math.hypot(c.x - screen.x, c.y - screen.y);
    return d > RESIZE_RADIUS && d <= ROTATE_OUTER;
  });
  if (near && !insideFrame(model.frame, camera, screen)) return { kind: "rotate" };
  return null;
}

function insideFrame(frame: Box, camera: Camera, screen: Point): boolean {
  const world = { x: (screen.x - camera.x) / camera.zoom, y: (screen.y - camera.y) / camera.zoom };
  const v = rotateVec(world.x - frame.cx, world.y - frame.cy, -frame.rot);
  return Math.abs(v.x) <= frame.w / 2 && Math.abs(v.y) <= frame.h / 2;
}

/** Is a canvas point inside the selection's frame (used to start a move from anywhere on a selected layer)? */
export function frameContains(frame: Box, p: Point): boolean {
  const v = rotateVec(p.x - frame.cx, p.y - frame.cy, -frame.rot);
  return Math.abs(v.x) <= frame.w / 2 && Math.abs(v.y) <= frame.h / 2;
}
