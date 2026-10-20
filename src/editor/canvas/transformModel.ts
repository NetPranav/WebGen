/**
 * What the transform handles act on (ROADMAP Phase 27): the selection as boxes and the handles around them, computed
 * from the hit index (measured boxes in canvas space) and the layers' properties. Pure given its inputs.
 */

import type { HitIndex } from "@/core/hit/hitTest";
import type { Layer } from "@/core/document/schema";
import { corners, handlePoints, paramHandles, paramHandleWorld, rotateVec, unionBox, type Box, type ParamHandle, type ResizeHandle, RESIZE_HANDLES } from "@/core/geometry/transform";
import type { Camera, Point } from "@/core/viewport/camera";
import { docToScreen } from "@/core/viewport/camera";

export interface TransformModel {
  ids: string[];
  boxes: Box[];
  /** The box the handles surround: the one layer's own box, or the union of several. */
  frame: Box;
  /** Parameter handles (single selection only), with their position in canvas space. */
  params: { handle: ParamHandle; world: Point; layerId: string; value: number }[];
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
export function buildTransformModel(index: HitIndex, layers: Record<string, Layer>, selectedIds: readonly string[], inset: number): TransformModel | null {
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
  return { ids, boxes, frame, params };
}

function defaultParam(prop: string): number {
  return prop === "shape.innerRadius" ? 0.5 : prop === "shape.points" ? 5 : prop === "shape.sides" ? 6 : 0;
}

export type HandleHit =
  | { kind: "resize"; handle: ResizeHandle }
  | { kind: "rotate" }
  | { kind: "param"; index: number };

/** Screen-px radii. */
const PARAM_RADIUS = 8;
const RESIZE_RADIUS = 7;
const ROTATE_OUTER = 24;

/**
 * Which handle is under a screen point, if any. Parameter handles come first, then the eight resize handles, then
 * the rotation zones just outside the corners. A multi-selection rotates about the union's centre.
 */
export function handleAtScreen(model: TransformModel, camera: Camera, screen: Point): HandleHit | null {
  const toScreen = (p: Point) => docToScreen(camera, p);
  for (let i = 0; i < model.params.length; i++) {
    const s = toScreen(model.params[i].world);
    if (Math.hypot(s.x - screen.x, s.y - screen.y) <= PARAM_RADIUS) return { kind: "param", index: i };
  }
  const points = handlePoints(model.frame);
  for (const h of RESIZE_HANDLES) {
    const s = toScreen(points[h]);
    if (Math.hypot(s.x - screen.x, s.y - screen.y) <= RESIZE_RADIUS) return { kind: "resize", handle: h };
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
