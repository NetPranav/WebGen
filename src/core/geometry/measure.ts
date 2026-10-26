/**
 * ============================================================================
 * PATHS MEASURED BY LENGTH (FigCraft port, F3)
 * ============================================================================
 * Subpaths flattened into polylines with the length along them, for anything placed along a path (variable width
 * strokes, dashes, text on a path, arrowheads). A sample budget refuses paths too long to work with, enforced while
 * flattening so a hostile path costs at most one extra segment of work.
 *
 * Translated from FigCraft (`crates/geom/src/measure.rs`), commit 6ea44e9. Curves are flattened by uniform
 * subdivision with the second-derivative bound (kurbo flattens analytically; both meet the same tolerance).
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 * ============================================================================
 */

import { BezPath, hypot, lerp, sub, turn90, type Pt } from "./bezpath";

/** Flattening tolerance (local units). */
export const FLATTEN_TOL = 0.05;
/** The most flattened points a path is measured with; longer paths are refused. */
export const MAX_SAMPLES = 40_000;

const okPt = (p: Pt) => Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) < 1e9 && Math.abs(p.y) < 1e9;

/** Every coordinate is finite and of a sane magnitude. */
export function finitePath(path: BezPath): boolean {
  return path.els.every((el) => {
    switch (el.t) {
      case "M":
      case "L": return okPt(el.p);
      case "Q": return okPt(el.p1) && okPt(el.p2);
      case "C": return okPt(el.p1) && okPt(el.p2) && okPt(el.p3);
      case "Z": return true;
    }
  });
}

/** One subpath flattened, with the length along it at each point. A closed one ends on its start point. */
export class Polyline {
  points: Pt[] = [];
  /** Cumulative length at each point (starts at 0). */
  lengths: number[] = [];
  closed = false;

  length(): number {
    return this.lengths.length > 0 ? this.lengths[this.lengths.length - 1] : 0;
  }

  push(p: Pt): void {
    const last = this.points[this.points.length - 1];
    if (!last) {
      this.points.push(p);
      this.lengths.push(0);
      return;
    }
    const d = hypot(sub(p, last));
    if (d > 1e-9) {
      this.points.push(p);
      this.lengths.push(this.length() + d);
    }
  }

  /** The point at `t` (0..1 by length) and the unit normal there (the direction turned 90°). */
  at(t: number): { point: Pt; normal: Pt } | null {
    const len = this.length();
    if (len <= 1e-9 || !Number.isFinite(t)) return null;
    const s = Math.min(1, Math.max(0, t)) * len;
    let i = partitionPoint(this.lengths, (l) => l <= s);
    i = Math.min(Math.max(i, 1), Math.max(1, this.points.length - 1));
    const a = this.points[i - 1];
    const b = this.points[i];
    if (!a || !b) return null;
    const la = this.lengths[i - 1];
    const lb = this.lengths[i];
    const u = lb - la > 1e-12 ? Math.min(1, Math.max(0, (s - la) / (lb - la))) : 0;
    const d = sub(b, a);
    const n = turn90(d);
    const k = Math.max(1e-12, hypot(d));
    return { point: lerp(a, b, u), normal: { x: n.x / k, y: n.y / k } };
  }

  /** The nearest point to `p`: its t by length and the distance. */
  nearest(p: Pt): { t: number; distance: number } | null {
    const len = this.length();
    if (len <= 1e-9) return null;
    let best: { t: number; distance: number } | null = null;
    for (let i = 0; i + 1 < this.points.length; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const d = sub(b, a);
      const l2 = d.x * d.x + d.y * d.y;
      const u = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / l2)) : 0;
      const dist = hypot(sub(lerp(a, b, u), p));
      if (!best || dist < best.distance) best = { t: (this.lengths[i] + u * Math.sqrt(l2)) / len, distance: dist };
    }
    return best;
  }
}

/** The first index whose element fails `pred` (elements that pass come first). */
export function partitionPoint<T>(arr: readonly T[], pred: (v: T) => boolean): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pred(arr[mid])) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** How many straight pieces keep a quadratic or cubic within `tol` of itself. */
function pieceCount(p0: Pt, p1: Pt, p2: Pt, p3: Pt | null, tol: number): number {
  const dd = (a: Pt, b: Pt, c: Pt) => Math.hypot(a.x - 2 * b.x + c.x, a.y - 2 * b.y + c.y);
  // max |B''| on [0, 1]: 2|p0-2p1+p2| for a quadratic, at most 6·max(...) for a cubic
  const m = p3 ? 6 * Math.max(dd(p0, p1, p2), dd(p1, p2, p3)) : 2 * dd(p0, p1, p2);
  return Math.max(1, Math.ceil(Math.sqrt(m / (8 * tol))));
}

/** Every subpath flattened (to `tol`, default FLATTEN_TOL); null when the path has invalid coordinates or is too long. */
export function polylines(path: BezPath, limit = MAX_SAMPLES, tol = FLATTEN_TOL): Polyline[] | null {
  if (!finitePath(path)) return null;
  if (path.els.length > limit) return null;
  const out: Polyline[] = [];
  let cur = new Polyline();
  let start: Pt = { x: 0, y: 0 };
  let pen: Pt = { x: 0, y: 0 };
  let count = 0;
  const finish = () => {
    if (cur.points.length >= 2) out.push(cur);
    cur = new Polyline();
  };
  for (const el of path.els) {
    if (count > limit) return null;
    switch (el.t) {
      case "M":
        count++;
        finish();
        start = el.p;
        pen = el.p;
        cur.push(el.p);
        break;
      case "L":
        count++;
        if (cur.points.length === 0) cur.push(start);
        cur.push(el.p);
        pen = el.p;
        break;
      case "Q":
      case "C": {
        const end = el.t === "Q" ? el.p2 : el.p3;
        const n = el.t === "Q" ? pieceCount(pen, el.p1, el.p2, null, tol) : pieceCount(pen, el.p1, el.p2, el.p3, tol);
        if (count + n > limit) return null;
        if (cur.points.length === 0) cur.push(pen);
        const p0 = pen;
        for (let k = 1; k <= n; k++) {
          const t = k / n;
          const mt = 1 - t;
          const q =
            el.t === "Q"
              ? { x: mt * mt * p0.x + 2 * mt * t * el.p1.x + t * t * el.p2.x, y: mt * mt * p0.y + 2 * mt * t * el.p1.y + t * t * el.p2.y }
              : {
                  x: mt * mt * mt * p0.x + 3 * mt * mt * t * el.p1.x + 3 * mt * t * t * el.p2.x + t * t * t * el.p3.x,
                  y: mt * mt * mt * p0.y + 3 * mt * mt * t * el.p1.y + 3 * mt * t * t * el.p2.y + t * t * t * el.p3.y,
                };
          cur.push(k === n ? end : q);
        }
        count += n;
        pen = end;
        break;
      }
      case "Z":
        count++;
        cur.push(start);
        cur.closed = cur.points.length >= 3;
        pen = start;
        finish();
        break;
    }
  }
  finish();
  return count <= limit ? out : null;
}

/**
 * The winding number of the path around `p` (open subpaths are closed implicitly). Curves are flattened to 0.001 px,
 * so a point is classified as the curve itself would classify it (kurbo's winding is exact on curves).
 */
export function winding(path: BezPath, p: Pt): number {
  const lines = polylines(path, MAX_SAMPLES * 8, 0.001) ?? [];
  let w = 0;
  for (const l of lines) {
    const pts = l.points;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (a.y <= p.y) {
        if (b.y > p.y && (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y) > 0) w++;
      } else if (b.y <= p.y && (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y) < 0) {
        w--;
      }
    }
  }
  return w;
}
