/**
 * ============================================================================
 * TRANSFORMS (ROADMAP Phase 27)
 * ============================================================================
 * Moving, resizing and rotating boxes, as pure functions with no DOM. A `Box`
 * is what a layer is on the canvas: its centre, its unrotated size and its
 * rotation (degrees, clockwise, about the centre). A selection is one box
 * (a single layer, rotated or not) or the axis-aligned union of several.
 *
 * Resizing works in the box's own axes, so a rotated box grows along its own
 * edges. `fromCenter` (Alt) grows both sides; `aspect` (Shift) keeps the ratio.
 * A group resize scales each member's centre and size with the frame.
 * ============================================================================
 */

import type { Point } from "../viewport/camera";

export interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Degrees, clockwise. */
  rot: number;
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const RESIZE_HANDLES: readonly ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** The least a box can shrink to, in px. */
export const MIN_SIZE = 1;

const DEG = Math.PI / 180;

function r2(n: number): number {
  return Math.round(n * 100) / 100 || 0; // `|| 0` turns -0 into 0
}

export function roundBox(b: Box): Box {
  return { cx: r2(b.cx), cy: r2(b.cy), w: r2(b.w), h: r2(b.h), rot: r2(b.rot) };
}

/** Rotates the vector (x, y) by `deg` degrees clockwise (screen axes: y down). */
export function rotateVec(x: number, y: number, deg: number): Point {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return { x: x * c - y * s, y: x * s + y * c };
}

/** The four corners of a box in world space: top-left, top-right, bottom-right, bottom-left. */
export function corners(b: Box): Point[] {
  return [
    [-b.w / 2, -b.h / 2],
    [b.w / 2, -b.h / 2],
    [b.w / 2, b.h / 2],
    [-b.w / 2, b.h / 2],
  ].map(([x, y]) => {
    const v = rotateVec(x, y, b.rot);
    return { x: b.cx + v.x, y: b.cy + v.y };
  });
}

/** The axis-aligned box around several boxes (rotation 0). One box stays itself, rotation and all. */
export function unionBox(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null;
  if (boxes.length === 1) return { ...boxes[0] };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    for (const p of corners(b)) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY, rot: 0 };
}

export function moveBoxes(boxes: readonly Box[], dx: number, dy: number): Box[] {
  return boxes.map((b) => roundBox({ ...b, cx: b.cx + dx, cy: b.cy + dy }));
}

/** Where each resize handle is: the corners and edge midpoints of the frame, in world space. */
export function handlePoints(frame: Box): Record<ResizeHandle, Point> {
  const at = (sx: number, sy: number): Point => {
    const v = rotateVec((sx * frame.w) / 2, (sy * frame.h) / 2, frame.rot);
    return { x: frame.cx + v.x, y: frame.cy + v.y };
  };
  return { nw: at(-1, -1), n: at(0, -1), ne: at(1, -1), e: at(1, 0), se: at(1, 1), s: at(0, 1), sw: at(-1, 1), w: at(-1, 0) };
}

/** The handle's direction in the frame's own axes: which edges it moves. */
const DIR: Record<ResizeHandle, { sx: -1 | 0 | 1; sy: -1 | 0 | 1 }> = {
  nw: { sx: -1, sy: -1 },
  n: { sx: 0, sy: -1 },
  ne: { sx: 1, sy: -1 },
  e: { sx: 1, sy: 0 },
  se: { sx: 1, sy: 1 },
  s: { sx: 0, sy: 1 },
  sw: { sx: -1, sy: 1 },
  w: { sx: -1, sy: 0 },
};

export interface ResizeOptions {
  /** Shift: keep the aspect ratio. */
  aspect?: boolean;
  /** Alt: resize about the centre. */
  fromCenter?: boolean;
}

/**
 * Drags `handle` of `frame` by `delta` (world space). The result is the new frame box; the opposite edge (or, with
 * `fromCenter`, the centre) stays where it was. A drag past the opposite edge stops at `MIN_SIZE` rather than flipping.
 */
export function resizeFrame(frame: Box, handle: ResizeHandle, delta: Point, opts: ResizeOptions = {}): Box {
  const { sx, sy } = DIR[handle];
  const local = rotateVec(delta.x, delta.y, -frame.rot); // the drag in the frame's own axes
  const grow = opts.fromCenter ? 2 : 1;
  let w = sx === 0 ? frame.w : Math.max(MIN_SIZE, frame.w + sx * local.x * grow);
  let h = sy === 0 ? frame.h : Math.max(MIN_SIZE, frame.h + sy * local.y * grow);

  if (opts.aspect && frame.w > 0 && frame.h > 0) {
    const ratio = frame.w / frame.h;
    if (sx !== 0 && sy !== 0) {
      // a corner: follow the larger relative change
      const kw = w / frame.w;
      const kh = h / frame.h;
      const k = Math.abs(kw - 1) >= Math.abs(kh - 1) ? kw : kh;
      w = Math.max(MIN_SIZE, frame.w * k);
      h = Math.max(MIN_SIZE, frame.h * k);
    } else if (sx !== 0) {
      h = Math.max(MIN_SIZE, w / ratio);
    } else {
      w = Math.max(MIN_SIZE, h * ratio);
    }
  }

  // Where the centre goes: with the opposite edge fixed it shifts half the growth along the dragged direction.
  const shift = opts.fromCenter ? { x: 0, y: 0 } : { x: (sx * (w - frame.w)) / 2, y: (sy * (h - frame.h)) / 2 };
  // An edge handle with the ratio kept also grows the other axis about the centre line, which doesn't move it.
  const v = rotateVec(shift.x, shift.y, frame.rot);
  return roundBox({ cx: frame.cx + v.x, cy: frame.cy + v.y, w, h, rot: frame.rot });
}

/**
 * Resizes a selection. `frame` is the selection's box (`unionBox`), `boxes` its members. A single member becomes
 * the new frame; several are scaled with it: each centre and size scales by the frame's change.
 */
export function resizeBoxes(boxes: readonly Box[], frame: Box, handle: ResizeHandle, delta: Point, opts: ResizeOptions = {}): Box[] {
  const next = resizeFrame(frame, handle, delta, opts);
  if (boxes.length === 1) return [next];
  const kx = frame.w === 0 ? 1 : next.w / frame.w;
  const ky = frame.h === 0 ? 1 : next.h / frame.h;
  return boxes.map((b) =>
    roundBox({
      cx: next.cx + (b.cx - frame.cx) * kx,
      cy: next.cy + (b.cy - frame.cy) * ky,
      w: b.w * kx,
      h: b.h * ky,
      rot: b.rot,
    }),
  );
}

/** The angle, in degrees clockwise, from `pivot` to `p`. */
export function angleTo(pivot: Point, p: Point): number {
  return Math.atan2(p.y - pivot.y, p.x - pivot.x) / DEG;
}

/** `deg` snapped to the nearest multiple of `step`. */
export function snapAngle(deg: number, step = 15): number {
  return Math.round(deg / step) * step;
}

function normalizeDeg(deg: number): number {
  const n = ((deg % 360) + 360) % 360;
  return n > 180 ? n - 360 : n;
}

/**
 * Rotates boxes about `pivot` by `delta` degrees. A single box turns about its own centre and its rotation is
 * `start + delta`; with `snap` (Shift) the resulting rotation is a multiple of 15. Several boxes turn together
 * about the selection's centre: each centre orbits the pivot and each rotation grows by the same delta.
 */
export function rotateBoxes(boxes: readonly Box[], pivot: Point, delta: number, snap = false): Box[] {
  if (boxes.length === 1) {
    const b = boxes[0];
    const rot = snap ? snapAngle(b.rot + delta) : b.rot + delta;
    return [roundBox({ ...b, rot: normalizeDeg(rot) })];
  }
  const d = snap ? snapAngle(delta) : delta;
  return boxes.map((b) => {
    const v = rotateVec(b.cx - pivot.x, b.cy - pivot.y, d);
    return roundBox({ ...b, cx: pivot.x + v.x, cy: pivot.y + v.y, rot: normalizeDeg(b.rot + d) });
  });
}

/** Where a rotate drag started and is now: the angle it turned through, about `pivot`. */
export function rotationDelta(pivot: Point, from: Point, to: Point): number {
  let d = angleTo(pivot, to) - angleTo(pivot, from);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// ---------------------------------------------------------------------------
// Parameter handles (corner radius, star points and inner radius, polygon sides)
// ---------------------------------------------------------------------------

export type ParamHandleKind = "radius" | "innerRadius" | "count";

export interface ParamHandle {
  kind: ParamHandleKind;
  /** The property the drag writes. */
  prop: string;
  /** Local position inside the box (origin at its top-left, unrotated px). */
  at: Point;
}

const RADIUS_INSET = 12;

/** The parameter handles a single layer of `archetype` has, at its current values (`props`). `inset` is the screen-constant gap in document px. */
export function paramHandles(archetype: string, box: Box, props: Record<string, unknown>, inset = RADIUS_INSET): ParamHandle[] {
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  switch (archetype) {
    case "rectangle": {
      const r = num(props["shape.cornerRadius"], 0);
      return [{ kind: "radius", prop: "shape.cornerRadius", at: { x: Math.min(box.w, r + inset), y: inset } }];
    }
    case "star": {
      const ratio = num(props["shape.innerRadius"], 0.5);
      return [
        { kind: "innerRadius", prop: "shape.innerRadius", at: { x: box.w / 2, y: box.h / 2 - ratio * (box.h / 2) } },
        { kind: "count", prop: "shape.points", at: { x: box.w / 2 + inset * 2, y: -inset } },
      ];
    }
    case "polygon":
      return [{ kind: "count", prop: "shape.sides", at: { x: box.w / 2, y: -inset } }];
    default:
      return [];
  }
}

/** A handle's position in world space. */
export function paramHandleWorld(box: Box, h: ParamHandle): Point {
  const v = rotateVec(h.at.x - box.w / 2, h.at.y - box.h / 2, box.rot);
  return { x: box.cx + v.x, y: box.cy + v.y };
}

/**
 * The new value of a parameter after the handle is dragged to world point `p`. A radius is the drag's distance along
 * the top edge less the inset, clamped to half the short side; an inner radius is how far down from the top vertex
 * the handle is, as a share of the half height (0.05 to 1); a count moves one step per 24 px dragged sideways.
 */
export function paramValue(handle: ParamHandle, box: Box, p: Point, startValue: number, startPoint: Point, inset = RADIUS_INSET): number {
  const local = (q: Point) => {
    const v = rotateVec(q.x - box.cx, q.y - box.cy, -box.rot);
    return { x: v.x + box.w / 2, y: v.y + box.h / 2 };
  };
  const l = local(p);
  switch (handle.kind) {
    case "radius":
      return r2(Math.min(Math.max(l.x - inset, 0), Math.min(box.w, box.h) / 2));
    case "innerRadius": {
      const share = (box.h / 2 - l.y) / (box.h / 2);
      return r2(Math.min(Math.max(share, 0.05), 1));
    }
    case "count": {
      const dx = local(p).x - local(startPoint).x;
      return Math.min(Math.max(Math.round(startValue + dx / 24), 3), 64);
    }
  }
}
