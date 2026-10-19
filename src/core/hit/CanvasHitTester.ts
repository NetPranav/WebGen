/**
 * The canvas' hit-tester (ROADMAP Phase 22): builds a `HitIndex` from the frames' measured layer rectangles and
 * keeps it until something could have moved a layer (an edit, or a frame's layout changing). `pickAt` and
 * `hoverAt` take points in canvas (world) space: `screenToDoc` of the pointer.
 */

import type { MotionDocument } from "../document/schema";
import { listFrames, type FrameInfo } from "../frames/frames";
import { HitIndex, walkFrame, type HitLayer, type PickOptions } from "./hitTest";
import type { LayerRect } from "../render/StageRenderer";
import type { Point } from "../viewport/camera";

export interface FrameSurface {
  frameId: string;
  /** Changes whenever the frame's layout could have changed. */
  layoutVersion: number;
  measureNow: (layerIds: readonly string[]) => (LayerRect | null)[];
}

/** The hit layers of every frame: measured, moved to canvas space, clipped to their frame. Pure given `measure`. */
export function buildHitLayers(
  document: Pick<MotionDocument, "layers">,
  frames: readonly FrameInfo[],
  surface: (frameId: string) => FrameSurface | null,
): HitLayer[] {
  const out: HitLayer[] = [];
  let order = 0;
  for (const frame of frames) {
    const s = surface(frame.id);
    if (!s) continue;
    const walk = walkFrame(document.layers, frame.id);
    const rects = s.measureNow(walk.map((w) => w.id));
    walk.forEach((w, i) => {
      const r = rects[i];
      order++;
      if (!r) return; // not drawn: hidden, or not mounted yet
      // The frame clips what it draws: a layer's reachable part is what lies inside the frame.
      const left = Math.max(r.x, 0);
      const top = Math.max(r.y, 0);
      const right = Math.min(r.x + r.width, frame.width);
      const bottom = Math.min(r.y + r.height, frame.height);
      if (right <= left || bottom <= top) return;
      const layer = document.layers[w.id];
      out.push({
        id: w.id,
        rect: { x: frame.x + left, y: frame.y + top, width: right - left, height: bottom - top },
        parentId: layer.parentId,
        frameId: frame.id,
        depth: w.depth,
        order,
        locked: layer.locked === true,
      });
    });
  }
  return out;
}

export class CanvasHitTester {
  private index: HitIndex | null = null;
  private key = "";
  /** Index builds, for the tests. */
  builds = 0;

  constructor(
    private readonly getDocument: () => MotionDocument,
    private readonly surfaces: () => Map<string, FrameSurface>,
  ) {}

  /** The current index, rebuilt when the document or any frame's layout changed since it was made. */
  ensure(): HitIndex {
    const doc = this.getDocument();
    const surfaces = this.surfaces();
    const frames = listFrames(doc.layers);
    const key = frames.map((f) => `${f.id}:${f.x},${f.y},${f.width},${f.height}:${surfaces.get(f.id)?.layoutVersion ?? "-"}`).join("|");
    if (!this.index || key !== this.key || doc !== this.docOfIndex) {
      this.index = new HitIndex(buildHitLayers(doc, frames, (id) => surfaces.get(id) ?? null));
      this.key = key;
      this.docOfIndex = doc;
      this.builds++;
    }
    return this.index;
  }
  private docOfIndex: MotionDocument | null = null;

  pickAt(world: Point, options: PickOptions = {}): HitLayer | null {
    return this.ensure().pick(world, options);
  }
}
