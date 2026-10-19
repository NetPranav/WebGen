/**
 * ============================================================================
 * HIT-TESTING (ROADMAP Phase 22)
 * ============================================================================
 * What is under a point on the canvas? A spatial index (the quadtree
 * `SpatialIndex`, now with a `layer` item type) over the layers' measured
 * rectangles in canvas space. The index answers "which layers contain this
 * point", deepest first and, among equals, topmost in paint order. `pick`
 * turns that into the layer a click selects:
 *
 *  - Hidden layers aren't drawn, so they have no rectangle and are never hit.
 *  - A locked layer, and everything inside it, is skipped: the click falls
 *    through to what is beneath.
 *  - A plain click picks the outermost layer inside the frame (Figma's rule: a
 *    click selects the frame's direct child); Cmd/Ctrl "deep select" picks the
 *    deepest layer under the point. With nothing under the point inside the
 *    frame, the frame itself.
 *
 * Plain functions and a class over plain data: no DOM, so the speed and the
 * rules are unit-tested.
 * ============================================================================
 */

import { SpatialIndex, type AABB } from "../wasm/SpatialIndex";
import type { Layer } from "../document/schema";
import type { Point, Rect } from "../viewport/camera";

export interface HitLayer {
  id: string;
  /** Canvas (world) space. */
  rect: Rect;
  parentId: string | null;
  frameId: string;
  /** 0 for a frame, 1 for its children, and so on. */
  depth: number;
  /** Paint order within the document: later is on top. */
  order: number;
  locked: boolean;
}

export interface PickOptions {
  /** Cmd/Ctrl deep select: the deepest layer under the point. */
  deep?: boolean;
}

const toAABB = (r: Rect): AABB => ({ minX: r.x, minY: r.y, maxX: r.x + r.width, maxY: r.y + r.height });

export class HitIndex {
  private readonly index: SpatialIndex;
  private readonly byId = new Map<string, HitLayer>();

  constructor(layers: readonly HitLayer[]) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const l of layers) {
      minX = Math.min(minX, l.rect.x);
      minY = Math.min(minY, l.rect.y);
      maxX = Math.max(maxX, l.rect.x + l.rect.width);
      maxY = Math.max(maxY, l.rect.y + l.rect.height);
    }
    const world: AABB = layers.length ? { minX: minX - 1, minY: minY - 1, maxX: maxX + 1, maxY: maxY + 1 } : { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    this.index = new SpatialIndex(world);
    for (const layer of layers) {
      this.byId.set(layer.id, layer);
      this.index.insert(layer.id, "layer", toAABB(layer.rect), layer.order);
    }
  }

  get size(): number {
    return this.byId.size;
  }

  get(id: string): HitLayer | undefined {
    return this.byId.get(id);
  }

  /** Every selectable layer containing the point, deepest first, then topmost first. Locked layers and their contents are left out. */
  candidates(point: Point): HitLayer[] {
    const out: HitLayer[] = [];
    for (const item of this.index.queryPoint(point.x, point.y)) {
      const layer = this.byId.get(item.id);
      if (layer && !this.isLocked(layer)) out.push(layer);
    }
    return out.sort((a, b) => b.depth - a.depth || b.order - a.order);
  }

  private isLocked(layer: HitLayer): boolean {
    let current: HitLayer | undefined = layer;
    let guard = 0;
    while (current && guard++ < 10_000) {
      if (current.locked) return true;
      current = current.parentId ? this.byId.get(current.parentId) : undefined;
    }
    return false;
  }

  /** The layer a click at `point` selects, or null when the point is over no frame. */
  pick(point: Point, options: PickOptions = {}): HitLayer | null {
    const hits = this.candidates(point);
    const deepest = hits[0];
    if (!deepest) return null;
    if (options.deep) return deepest;
    // Outermost: walk up from the deepest hit to the frame's direct child (or the frame itself if that is all there is).
    let current: HitLayer = deepest;
    let guard = 0;
    while (current.depth > 1 && current.parentId && guard++ < 10_000) {
      const parent = this.byId.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
    return current;
  }
}

/** The paint order of a layer tree: a depth-first walk from each frame, children in order (later paints on top). */
export function walkFrame(layers: Record<string, Layer>, frameId: string): { id: string; depth: number }[] {
  const out: { id: string; depth: number }[] = [];
  const visit = (id: string, depth: number) => {
    const layer = layers[id];
    if (!layer || depth > 10_000) return;
    out.push({ id, depth });
    for (const child of layer.children) visit(child, depth + 1);
  };
  visit(frameId, 0);
  return out;
}
