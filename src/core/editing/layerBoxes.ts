/**
 * Layer boxes for editing operations (ROADMAP Phase 29): where a layer is on the canvas, and writing a position
 * back. The drawn stage is asked first (`renderer.measureNow`, so flow-placed layers have their real place); with
 * no stage (a unit test, a layer not drawn) the layer's own `frame.*` and its ancestors' are used.
 */

import type { Layer } from "../document/schema";
import { frameIdOf, frameInfo } from "../frames/frames";
import type { Box } from "../geometry/transform";
import { getStageRendererForLayer } from "../render/StageRenderer";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import type { Point } from "../viewport/camera";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round = (n: number) => Math.round(n * 100) / 100 || 0;

/** The layer's top-left in canvas space, from props alone (absolute layers only: a flow layer's `frame.x` is not its place). */
function propsOrigin(layers: Record<string, Layer>, id: string): Point {
  const chain: Layer[] = [];
  let cur: Layer | undefined = layers[id];
  let guard = 0;
  while (cur && guard++ < 10_000) {
    chain.unshift(cur);
    cur = cur.parentId ? layers[cur.parentId] : undefined;
  }
  let x = 0;
  let y = 0;
  for (const l of chain) {
    x += num(l.properties["frame.x"]) ?? 0;
    y += num(l.properties["frame.y"]) ?? 0;
  }
  return { x, y };
}

/** A layer's box on the canvas (centre, own size, rotation), or null if it can't be found. */
export function worldBox(id: string): Box | null {
  const layers = getDocument().layers;
  const layer = layers[id];
  if (!layer) return null;
  const rot = num(layer.properties["frame.rotation"]) ?? 0;
  const renderer = getStageRendererForLayer(id, layers);
  const frameId = frameIdOf(layers, id);
  const frame = frameId ? frameInfo(layers[frameId]) : null;
  const measured = renderer && frame ? renderer.measureNow([id])[0] : null;
  if (measured && frame) {
    const cx = frame.x + measured.x + measured.width / 2;
    const cy = frame.y + measured.y + measured.height / 2;
    return rot === 0
      ? { cx, cy, w: measured.width, h: measured.height, rot: 0 }
      : { cx, cy, w: num(layer.properties["frame.width"]) ?? measured.width, h: num(layer.properties["frame.height"]) ?? measured.height, rot };
  }
  const w = num(layer.properties["frame.width"]) ?? 0;
  const h = num(layer.properties["frame.height"]) ?? 0;
  const o = propsOrigin(layers, id);
  return { cx: o.x + w / 2, cy: o.y + h / 2, w, h, rot };
}

/** The top-left of a layer's parent in canvas space (0, 0 for a top-level frame). */
export function parentOrigin(id: string): Point {
  const layers = getDocument().layers;
  const parentId = layers[id]?.parentId;
  if (!parentId) return { x: 0, y: 0 };
  const b = worldBox(parentId);
  return b ? { x: b.cx - b.w / 2, y: b.cy - b.h / 2 } : propsOrigin(layers, parentId);
}

/**
 * Writes boxes back as `frame.*`, positioned absolutely relative to each layer's parent (`origin` overrides where
 * the parent is, for layers about to be moved into a parent that doesn't exist yet or isn't drawn). A flow layer
 * becomes absolute at its measured place.
 */
export function writeBoxes(ids: readonly string[], boxes: readonly Box[], origin?: Point): void {
  ids.forEach((id, i) => {
    const layer = getDocument().layers[id];
    const box = boxes[i];
    if (!layer || !box) return;
    const o = origin ?? parentOrigin(id);
    const patch: Record<string, number | string> = {
      positioning: "absolute",
      "frame.x": round(box.cx - box.w / 2 - o.x),
      "frame.y": round(box.cy - box.h / 2 - o.y),
      "frame.width": round(box.w),
      "frame.height": round(box.h),
    };
    if (box.rot !== 0 || num(layer.properties["frame.rotation"]) !== null) patch["frame.rotation"] = round(box.rot);
    documentCommands.updateProps(id, patch);
  });
}
