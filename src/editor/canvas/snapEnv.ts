/**
 * What a transform gesture can snap to (ROADMAP Phase 28): the other layers that share the selection's parent, the
 * parent's own box, and the top-level frame's ruler guides, all in canvas space. Pure given the hit index.
 */

import type { HitIndex } from "@/core/hit/hitTest";
import type { Layer } from "@/core/document/schema";
import { frameIdOf } from "@/core/frames/frames";
import { parseGuides, type Guide } from "@/core/geometry/snap";
import { rootIds } from "@/core/selection/selectionOps";
import type { Rect } from "@/core/viewport/camera";

export interface SnapEnvironment {
  others: Rect[];
  /** The selection's parent box (the frame's edges and centre are snap targets); null for a top-level frame. */
  parent: Rect | null;
  guides: Guide[];
  frameId: string | null;
}

export function snapEnvironment(index: HitIndex, layers: Record<string, Layer>, ids: readonly string[]): SnapEnvironment | null {
  const first = ids.find((id) => layers[id]);
  if (first === undefined) return null;
  const parentId = layers[first].parentId;
  const siblings = parentId ? layers[parentId]?.children ?? [] : rootIds(layers);
  const skip = new Set(ids);
  const others: Rect[] = [];
  for (const id of siblings) {
    if (skip.has(id)) continue;
    const hit = index.get(id);
    if (hit) others.push(hit.bounds);
  }
  const parent = parentId ? index.get(parentId)?.bounds ?? null : null;
  const frameId = frameIdOf(layers, first);
  const frameHit = frameId ? index.get(frameId) : undefined;
  const guides: Guide[] = [];
  if (frameId && frameHit && frameId !== first) {
    for (const g of parseGuides(layers[frameId].properties["frame.guides"])) {
      guides.push({ axis: g.axis, pos: g.axis === "x" ? frameHit.origin.x + g.pos : frameHit.origin.y + g.pos });
    }
  }
  return { others, parent, guides, frameId };
}

/** The boxes of every frame's guides as drawable lines (canvas space). */
export function guideLines(index: HitIndex, layers: Record<string, Layer>): { axis: "x" | "y"; pos: number; from: number; to: number; id: string }[] {
  const out: { axis: "x" | "y"; pos: number; from: number; to: number; id: string }[] = [];
  for (const id of rootIds(layers)) {
    const hit = index.get(id);
    if (!hit) continue;
    parseGuides(layers[id].properties["frame.guides"]).forEach((g, i) => {
      const f = hit.rect;
      out.push(
        g.axis === "x"
          ? { axis: "x", pos: hit.origin.x + g.pos, from: f.y, to: f.y + f.height, id: `${id}:${i}` }
          : { axis: "y", pos: hit.origin.y + g.pos, from: f.x, to: f.x + f.width, id: `${id}:${i}` },
      );
    });
  }
  return out;
}
