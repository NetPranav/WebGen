/**
 * Measuring (FigCraft port F12): distance lines with value labels between two boxes on the page, what Alt-hover
 * shows from the selection to the layer under the pointer. One box inside the other measures to each edge of the
 * outer one; boxes apart measure the gaps, with a dashed extension line to the other box when the line passes beside
 * it; boxes that overlap measure between their matching edges. Also: from a box to a ruler guide.
 *
 * Behaviour translated from FigCraft (`crates/engine/src/distance.rs` `between`, `inside`, `to_guide`, `label`),
 * commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import type { SpacingMark } from "./snap";

export interface MRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const EPS = 1e-6;

/** A distance as a label shows it: up to two decimals, no trailing zeros. */
export function distanceLabel(d: number): string {
  const v = Math.round(Math.abs(d) * 100) / 100;
  return Number.isInteger(v) ? String(v) : String(v);
}

const finite = (r: MRect) => [r.x0, r.y0, r.x1, r.y1].every(Number.isFinite);
const contains = (outer: MRect, inner: MRect) => outer.x0 <= inner.x0 + EPS && outer.y0 <= inner.y0 + EPS && outer.x1 >= inner.x1 - EPS && outer.y1 >= inner.y1 - EPS;
/** The middle of the overlap of two spans, if they overlap. */
const overlapMid = (a0: number, a1: number, b0: number, b1: number): number | null => {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return lo <= hi ? (lo + hi) / 2 : null;
};

/** A labelled line along x (at y) or along y (at x), unless it has no length. */
function measured(out: SpacingMark[], axis: "x" | "y", p: number, q: number, at: number) {
  const d = Math.abs(q - p);
  if (d > EPS && Number.isFinite(d)) out.push({ axis, from: Math.min(p, q), to: Math.max(p, q), at, value: Math.round(d * 100) / 100 });
}
/** A dashed extension line (no label), unless it has no length. */
function extension(out: SpacingMark[], axis: "x" | "y", p: number, q: number, at: number) {
  if (Math.abs(q - p) > EPS) out.push({ axis, from: Math.min(p, q), to: Math.max(p, q), at, value: 0, dashed: true });
}

/** From `inner` to each edge of `outer`, along `inner`'s centre lines. */
function inside(out: SpacingMark[], inner: MRect, outer: MRect) {
  const cx = (inner.x0 + inner.x1) / 2;
  const cy = (inner.y0 + inner.y1) / 2;
  measured(out, "x", outer.x0, inner.x0, cy);
  measured(out, "x", inner.x1, outer.x1, cy);
  measured(out, "y", outer.y0, inner.y0, cx);
  measured(out, "y", inner.y1, outer.y1, cx);
}

/** Distance lines from box `a` (the selection) to box `b`. */
export function between(a: MRect, b: MRect): SpacingMark[] {
  const out: SpacingMark[] = [];
  if (!finite(a) || !finite(b)) return out;
  if (contains(b, a)) {
    inside(out, a, b);
    return out;
  }
  if (contains(a, b)) {
    inside(out, b, a);
    return out;
  }
  const ox = overlapMid(a.x0, a.x1, b.x0, b.x1);
  const oy = overlapMid(a.y0, a.y1, b.y0, b.y1);
  const overlapping = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  if (overlapping && ox !== null && oy !== null) {
    // overlapping: between matching edges
    measured(out, "x", a.x0, b.x0, oy);
    measured(out, "x", a.x1, b.x1, oy);
    measured(out, "y", a.y0, b.y0, ox);
    measured(out, "y", a.y1, b.y1, ox);
    return out;
  }
  const cx = (a.x0 + a.x1) / 2;
  const cy = (a.y0 + a.y1) / 2;
  // horizontal gap: along the shared rows, or from the middle of `a` with an extension to `b`
  const gapX = b.x0 >= a.x1 ? [a.x1, b.x0] : b.x1 <= a.x0 ? [a.x0, b.x1] : null;
  if (gapX) {
    const y = oy ?? cy;
    measured(out, "x", gapX[0], gapX[1], y);
    if (oy === null) extension(out, "y", y, y < b.y0 ? b.y0 : b.y1, gapX[1]);
  }
  const gapY = b.y0 >= a.y1 ? [a.y1, b.y0] : b.y1 <= a.y0 ? [a.y0, b.y1] : null;
  if (gapY) {
    const x = ox ?? cx;
    measured(out, "y", gapY[0], gapY[1], x);
    if (ox === null) extension(out, "x", x, x < b.x0 ? b.x0 : b.x1, gapY[1]);
  }
  return out;
}

/** Distance lines from box `a` to a ruler guide (`vertical` at x = `at`, else at y = `at`): to the nearer side, or both when it crosses the box. */
export function toGuide(a: MRect, vertical: boolean, at: number): SpacingMark[] {
  const out: SpacingMark[] = [];
  if (!finite(a) || !Number.isFinite(at)) return out;
  const axis = vertical ? "x" : "y";
  const across = vertical ? (a.y0 + a.y1) / 2 : (a.x0 + a.x1) / 2;
  const [lo, hi] = vertical ? [a.x0, a.x1] : [a.y0, a.y1];
  if (at >= hi) measured(out, axis, hi, at, across);
  else if (at <= lo) measured(out, axis, at, lo, across);
  else {
    measured(out, axis, lo, at, across);
    measured(out, axis, at, hi, across);
  }
  return out;
}
