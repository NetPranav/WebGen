/**
 * ============================================================================
 * GRADIENT HANDLES (ROADMAP Phase 35)
 * ============================================================================
 * The points you drag on the canvas to shape a gradient, and what a drag does to the paint. Geometry is in
 * fractions of the layer's box (0,0 is its top-left, 1,1 its bottom-right; a gradient may reach outside), so these
 * functions work on the paint alone; `normToWorld` / `worldToNorm` put them on the canvas, turned with the layer.
 * Pure: no DOM, no store.
 * ============================================================================
 */

import type { Box } from "../geometry/transform";
import type { Paint, Point } from "./paints";
import { moveStop } from "./paintEdits";

export type HandleKind = "from" | "to" | "center" | "radiusX" | "radiusY" | "angle" | "stop" | "imgNW" | "imgNE" | "imgSE" | "imgSW" | "imgMove";

export interface GradientHandle {
  kind: HandleKind;
  /** Which stop, for a `stop` handle. */
  stopIndex?: number;
  /** Where the handle is, as fractions of the layer's box. */
  at: Point;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The distance (as a fraction of the shorter side) of a conic gradient's angle handle from its centre. */
export const CONIC_HANDLE = 0.35;

/** A conic angle in degrees (0 is up, clockwise) as a unit direction in pixels. */
const dir = (deg: number): Point => ({ x: Math.sin((deg * Math.PI) / 180), y: -Math.cos((deg * Math.PI) / 180) });

/** The handles for a paint: none for a solid. */
/**
 * Where a cropped picture's own outline is, in fractions of the box: the box is the window onto the picture, so the
 * picture reaches outside it (a crop of the middle half is twice the box, centred).
 */
export function imageOutline(crop: { x: number; y: number; w: number; h: number }): { x0: number; y0: number; x1: number; y1: number } {
  const x0 = -crop.x / crop.w || 0; // `|| 0` turns -0 into 0
  const y0 = -crop.y / crop.h || 0;
  return { x0, y0, x1: x0 + 1 / crop.w, y1: y0 + 1 / crop.h };
}

export function handlesFor(p: Paint, box: { w: number; h: number }): GradientHandle[] {
  switch (p.type) {
    case "image": {
      if (p.mode !== "crop") return [];
      const o = imageOutline(p.crop);
      return [
        { kind: "imgMove", at: { x: (o.x0 + o.x1) / 2, y: (o.y0 + o.y1) / 2 } },
        { kind: "imgNW", at: { x: o.x0, y: o.y0 } }, { kind: "imgNE", at: { x: o.x1, y: o.y0 } },
        { kind: "imgSE", at: { x: o.x1, y: o.y1 } }, { kind: "imgSW", at: { x: o.x0, y: o.y1 } },
      ];
    }
    case "solid":
      return [];
    // Stops come first and the shaping handles last: they are drawn on top and picked first, so an end that has a stop on it is the end.
    case "linear": {
      const out: GradientHandle[] = p.stops.map((s, i) => ({ kind: "stop", stopIndex: i, at: { x: p.from.x + s.at * (p.to.x - p.from.x), y: p.from.y + s.at * (p.to.y - p.from.y) } }));
      out.push({ kind: "from", at: p.from }, { kind: "to", at: p.to });
      return out;
    }
    case "radial":
    case "diamond": {
      // the stops sit along the horizontal radius, which is where the gradient's colour changes
      const out: GradientHandle[] = p.stops.map((s, i) => ({ kind: "stop", stopIndex: i, at: { x: p.center.x + s.at * p.radius.x, y: p.center.y } }));
      out.push(
        { kind: "center", at: p.center },
        { kind: "radiusX", at: { x: p.center.x + p.radius.x, y: p.center.y } },
        { kind: "radiusY", at: { x: p.center.x, y: p.center.y + p.radius.y } },
      );
      return out;
    }
    case "conic": {
      const d = dir(p.angle);
      const reach = CONIC_HANDLE * Math.min(box.w, box.h);
      return [{ kind: "center", at: p.center }, { kind: "angle", at: { x: p.center.x + (d.x * reach) / box.w, y: p.center.y + (d.y * reach) / box.h } }];
    }
  }
}

/**
 * The paint after dragging a handle to `to` (fractions of the box). A linear gradient's ends move freely (Shift
 * keeps the direction to 15 degree steps); the stops slide along the line; a radial centre moves with its radii;
 * its radii follow the pointer; a conic centre moves and its angle handle sets the angle.
 */
export function dragHandle(p: Paint, handle: Pick<GradientHandle, "kind" | "stopIndex">, to: Point, box: { w: number; h: number }, options: { shift?: boolean } = {}): Paint {
  const pt = { x: clamp(to.x, -4, 5), y: clamp(to.y, -4, 5) };
  switch (p.type) {
    case "image": {
      if (p.mode !== "crop") return p;
      const o = imageOutline(p.crop);
      let { x0, y0, x1, y1 } = o;
      if (handle.kind === "imgMove") {
        const w = x1 - x0;
        const h = y1 - y0;
        x0 = clamp(pt.x - w / 2, 1 - w, 0);
        y0 = clamp(pt.y - h / 2, 1 - h, 0);
        x1 = x0 + w;
        y1 = y0 + h;
      } else {
        // a corner drags two sides; the picture must keep covering the box, so a side can't come inside it
        if (handle.kind === "imgNW" || handle.kind === "imgSW") x0 = Math.min(pt.x, 0);
        else x1 = Math.max(pt.x, 1);
        if (handle.kind === "imgNW" || handle.kind === "imgNE") y0 = Math.min(pt.y, 0);
        else y1 = Math.max(pt.y, 1);
        x1 = Math.min(x1, x0 + 100);
        y1 = Math.min(y1, y0 + 100);
      }
      const w = 1 / (x1 - x0);
      const h = 1 / (y1 - y0);
      return { ...p, crop: { x: clamp(-x0 * w, 0, 1 - w), y: clamp(-y0 * h, 0, 1 - h), w, h } };
    }
    case "solid":
      return p;
    case "linear": {
      if (handle.kind === "from" || handle.kind === "to") {
        const other = handle.kind === "from" ? p.to : p.from;
        let moved = pt;
        if (options.shift) {
          // keep the angle on a 15 degree step, in pixels
          const dx = (pt.x - other.x) * box.w, dy = (pt.y - other.y) * box.h;
          const len = Math.hypot(dx, dy);
          const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12);
          moved = { x: other.x + (Math.cos(a) * len) / box.w, y: other.y + (Math.sin(a) * len) / box.h };
        }
        return handle.kind === "from" ? { ...p, from: moved } : { ...p, to: moved };
      }
      if (handle.kind === "stop" && handle.stopIndex !== undefined) {
        const lx = (p.to.x - p.from.x) * box.w, ly = (p.to.y - p.from.y) * box.h;
        const len2 = lx * lx + ly * ly;
        if (len2 < 1e-9) return p;
        const t = (((pt.x - p.from.x) * box.w) * lx + ((pt.y - p.from.y) * box.h) * ly) / len2;
        return { ...p, stops: moveStop(p.stops, handle.stopIndex, t).stops };
      }
      return p;
    }
    case "radial":
    case "diamond": {
      if (handle.kind === "center") return { ...p, center: pt };
      if (handle.kind === "radiusX") return { ...p, radius: { ...p.radius, x: Math.max(0.01, Math.abs(pt.x - p.center.x)) } };
      if (handle.kind === "radiusY") return { ...p, radius: { ...p.radius, y: Math.max(0.01, Math.abs(pt.y - p.center.y)) } };
      if (handle.kind === "stop" && handle.stopIndex !== undefined) {
        const t = (pt.x - p.center.x) / p.radius.x;
        return { ...p, stops: moveStop(p.stops, handle.stopIndex, t).stops };
      }
      return p;
    }
    case "conic": {
      if (handle.kind === "center") return { ...p, center: pt };
      if (handle.kind === "angle") {
        const dx = (pt.x - p.center.x) * box.w, dy = (pt.y - p.center.y) * box.h;
        if (Math.hypot(dx, dy) < 1e-6) return p;
        let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
        if (options.shift) deg = Math.round(deg / 15) * 15;
        return { ...p, angle: Number(((deg + 360) % 360).toFixed(2)) };
      }
      return p;
    }
  }
}

/** A point in fractions of a layer's box, on the canvas: the box is turned about its centre. */
export function normToWorld(box: Box, p: Point): Point {
  const lx = (p.x - 0.5) * box.w;
  const ly = (p.y - 0.5) * box.h;
  const r = (box.rot * Math.PI) / 180;
  return { x: box.cx + lx * Math.cos(r) - ly * Math.sin(r), y: box.cy + lx * Math.sin(r) + ly * Math.cos(r) };
}

/** The inverse: a canvas point as fractions of the layer's box. */
export function worldToNorm(box: Box, p: Point): Point {
  const dx = p.x - box.cx;
  const dy = p.y - box.cy;
  const r = (-box.rot * Math.PI) / 180;
  const lx = dx * Math.cos(r) - dy * Math.sin(r);
  const ly = dx * Math.sin(r) + dy * Math.cos(r);
  return { x: lx / (box.w || 1) + 0.5, y: ly / (box.h || 1) + 0.5 };
}
