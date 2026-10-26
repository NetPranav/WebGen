/**
 * ============================================================================
 * BEZIER PATHS (FigCraft port, F1)
 * ============================================================================
 * The small part of the `kurbo` curve library that FigCraft's shape geometry is written against: a path of
 * move / line / quadratic / cubic / close elements, its segments, its exact signed area and bounds, arcs and
 * ellipses as cubics (with kurbo's own subdivision rule, so shapes match FigCraft's), reversing subpaths, and
 * SVG path data out. Coordinates are y-down. Pure functions, no DOM.
 *
 * Translated from FigCraft (`crates/geom/src/lib.rs`, its use of kurbo `BezPath`, `Arc`, `Ellipse`), commit
 * 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 * ============================================================================
 */

export interface Pt {
  x: number;
  y: number;
}

export type PathEl =
  | { t: "M"; p: Pt }
  | { t: "L"; p: Pt }
  | { t: "Q"; p1: Pt; p2: Pt }
  | { t: "C"; p1: Pt; p2: Pt; p3: Pt }
  | { t: "Z" };

export type Segment =
  | { kind: "line"; p0: Pt; p1: Pt }
  | { kind: "quad"; p0: Pt; p1: Pt; p2: Pt }
  | { kind: "cubic"; p0: Pt; p1: Pt; p2: Pt; p3: Pt };

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const pt = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y;
export const cross = (a: Pt, b: Pt): number => a.x * b.y - a.y * b.x;
export const hypot = (a: Pt): number => Math.hypot(a.x, a.y);
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const atan2 = (a: Pt): number => Math.atan2(a.y, a.x);
export const normalize = (a: Pt): Pt => {
  const l = hypot(a);
  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
};
/** The vector turned 90° (kurbo's `turn_90`: (-y, x)). */
export const turn90 = (a: Pt): Pt => ({ x: -a.y, y: a.x });

export class BezPath {
  els: PathEl[] = [];

  static from(els: readonly PathEl[]): BezPath {
    const p = new BezPath();
    p.els = [...els];
    return p;
  }

  moveTo(p: Pt): this {
    this.els.push({ t: "M", p });
    return this;
  }
  lineTo(p: Pt): this {
    this.els.push({ t: "L", p });
    return this;
  }
  quadTo(p1: Pt, p2: Pt): this {
    this.els.push({ t: "Q", p1, p2 });
    return this;
  }
  curveTo(p1: Pt, p2: Pt, p3: Pt): this {
    this.els.push({ t: "C", p1, p2, p3 });
    return this;
  }
  closePath(): this {
    this.els.push({ t: "Z" });
    return this;
  }
  extend(other: BezPath | readonly PathEl[]): this {
    this.els.push(...(other instanceof BezPath ? other.els : other));
    return this;
  }
  isEmpty(): boolean {
    return this.els.length === 0;
  }

  /** Every drawn segment, including the closing line of a closed subpath (kurbo `segments`). */
  segments(): Segment[] {
    const out: Segment[] = [];
    let start: Pt | null = null;
    let last: Pt | null = null;
    for (const el of this.els) {
      switch (el.t) {
        case "M":
          start = el.p;
          last = el.p;
          break;
        case "L":
          if (last) out.push({ kind: "line", p0: last, p1: el.p });
          last = el.p;
          break;
        case "Q":
          if (last) out.push({ kind: "quad", p0: last, p1: el.p1, p2: el.p2 });
          last = el.p2;
          break;
        case "C":
          if (last) out.push({ kind: "cubic", p0: last, p1: el.p1, p2: el.p2, p3: el.p3 });
          last = el.p3;
          break;
        case "Z":
          if (last && start && (last.x !== start.x || last.y !== start.y)) out.push({ kind: "line", p0: last, p1: start });
          last = start;
          break;
      }
    }
    return out;
  }

  /** Signed area by Green's theorem, exact for lines, quadratics and cubics (kurbo `area`). */
  area(): number {
    return this.segments().reduce((a, s) => a + segmentSignedArea(s), 0);
  }

  /** Exact axis-aligned bounds (curve extrema, not control points). An empty path gives a zero rect. */
  boundingBox(): Rect {
    let r: Rect | null = null;
    for (const s of this.segments()) {
      const b = segmentBounds(s);
      r = r ? unionRect(r, b) : b;
    }
    if (r) return r;
    const m = this.els.find((e): e is { t: "M"; p: Pt } => e.t === "M");
    return m ? { x0: m.p.x, y0: m.p.y, x1: m.p.x, y1: m.p.y } : { x0: 0, y0: 0, x1: 0, y1: 0 };
  }

  /** SVG path data, numbers rounded to `digits` decimals. */
  toSvg(digits = 3): string {
    const f = (n: number) => {
      const v = Number(n.toFixed(digits));
      return Object.is(v, -0) ? "0" : String(v);
    };
    const p = (q: Pt) => `${f(q.x)} ${f(q.y)}`;
    return this.els
      .map((el) => {
        switch (el.t) {
          case "M": return `M${p(el.p)}`;
          case "L": return `L${p(el.p)}`;
          case "Q": return `Q${p(el.p1)} ${p(el.p2)}`;
          case "C": return `C${p(el.p1)} ${p(el.p2)} ${p(el.p3)}`;
          case "Z": return "Z";
        }
      })
      .join("");
  }

  /** Every subpath reversed; open stays open, closed stays closed. */
  reverseSubpaths(): BezPath {
    const out = new BezPath();
    for (const sp of splitSubpaths(this)) {
      // as kurbo does it: a closed subpath's closing line is reversed with the rest, then the path is closed again
      const segs = sp.segments();
      const last = segs[segs.length - 1];
      if (!last) continue;
      out.moveTo(segmentEnd(last));
      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        if (s.kind === "line") out.lineTo(s.p0);
        else if (s.kind === "quad") out.quadTo(s.p1, s.p0);
        else out.curveTo(s.p2, s.p1, s.p0);
      }
      if (sp.els[sp.els.length - 1]?.t === "Z") out.closePath();
    }
    return out;
  }

  /** The path with every point mapped by `f`. */
  map(f: (p: Pt) => Pt): BezPath {
    return BezPath.from(
      this.els.map((el): PathEl => {
        switch (el.t) {
          case "M": return { t: "M", p: f(el.p) };
          case "L": return { t: "L", p: f(el.p) };
          case "Q": return { t: "Q", p1: f(el.p1), p2: f(el.p2) };
          case "C": return { t: "C", p1: f(el.p1), p2: f(el.p2), p3: f(el.p3) };
          case "Z": return el;
        }
      }),
    );
  }
}

export function segmentStart(s: Segment): Pt {
  return s.p0;
}
export function segmentEnd(s: Segment): Pt {
  return s.kind === "line" ? s.p1 : s.kind === "quad" ? s.p2 : s.p3;
}

/** The point at `t` (0..1) along a segment. */
export function segmentEval(s: Segment, t: number): Pt {
  const mt = 1 - t;
  switch (s.kind) {
    case "line":
      return lerp(s.p0, s.p1, t);
    case "quad":
      return {
        x: mt * mt * s.p0.x + 2 * mt * t * s.p1.x + t * t * s.p2.x,
        y: mt * mt * s.p0.y + 2 * mt * t * s.p1.y + t * t * s.p2.y,
      };
    case "cubic":
      return {
        x: mt * mt * mt * s.p0.x + 3 * mt * mt * t * s.p1.x + 3 * mt * t * t * s.p2.x + t * t * t * s.p3.x,
        y: mt * mt * mt * s.p0.y + 3 * mt * mt * t * s.p1.y + 3 * mt * t * t * s.p2.y + t * t * t * s.p3.y,
      };
  }
}

/** Signed area contribution of one segment (kurbo's per-segment formulas). */
export function segmentSignedArea(s: Segment): number {
  switch (s.kind) {
    case "line":
      return cross(s.p0, s.p1) * 0.5;
    case "quad": {
      const { p0, p1, p2 } = s;
      return (p0.x * (2 * p1.y + p2.y) + 2 * p1.x * (p2.y - p0.y) - p2.x * (p0.y + 2 * p1.y)) * (1 / 6);
    }
    case "cubic": {
      const { p0, p1, p2, p3 } = s;
      return (
        (p0.x * (6 * p1.y + 3 * p2.y + p3.y) +
          3 * (p1.x * (-2 * p0.y + p2.y + p3.y) - p2.x * (p0.y + p1.y - 2 * p3.y)) -
          p3.x * (p0.y + 3 * p1.y + 6 * p2.y)) *
        (1 / 20)
      );
    }
  }
}

function unionRect(a: Rect, b: Rect): Rect {
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

/** Roots in (0, 1) of the derivative of a 1-D bezier with the given control values. */
function extremaParams(vals: number[]): number[] {
  const out: number[] = [];
  if (vals.length === 3) {
    const [a, b, c] = vals;
    const d = a - 2 * b + c;
    if (Math.abs(d) > 1e-12) out.push((a - b) / d);
  } else if (vals.length === 4) {
    const [p0, p1, p2, p3] = vals;
    // derivative / 3 = a t² + b t + c
    const a = -p0 + 3 * p1 - 3 * p2 + p3;
    const b = 2 * (p0 - 2 * p1 + p2);
    const c = p1 - p0;
    if (Math.abs(a) < 1e-12) {
      if (Math.abs(b) > 1e-12) out.push(-c / b);
    } else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const s = Math.sqrt(disc);
        out.push((-b + s) / (2 * a), (-b - s) / (2 * a));
      }
    }
  }
  return out.filter((t) => t > 0 && t < 1);
}

export function segmentBounds(s: Segment): Rect {
  const pts = [s.p0, segmentEnd(s)];
  if (s.kind !== "line") {
    const xs = s.kind === "quad" ? [s.p0.x, s.p1.x, s.p2.x] : [s.p0.x, s.p1.x, s.p2.x, s.p3.x];
    const ys = s.kind === "quad" ? [s.p0.y, s.p1.y, s.p2.y] : [s.p0.y, s.p1.y, s.p2.y, s.p3.y];
    for (const t of [...extremaParams(xs), ...extremaParams(ys)]) pts.push(segmentEval(s, t));
  }
  return pointsBounds(pts) ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
}

/** Bounding box of a set of points (`null` when empty). */
export function pointsBounds(points: Iterable<Pt>): Rect | null {
  let r: Rect | null = null;
  for (const p of points) r = r ? { x0: Math.min(r.x0, p.x), y0: Math.min(r.y0, p.y), x1: Math.max(r.x1, p.x), y1: Math.max(r.y1, p.y) } : { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  return r;
}

/** Arc length of a segment, by adaptive sampling to `accuracy`. */
export function segmentArclen(s: Segment, accuracy = 1e-6): number {
  if (s.kind === "line") return hypot(sub(s.p1, s.p0));
  let n = 16;
  let prev = Infinity;
  for (;;) {
    let len = 0;
    let a = s.p0;
    for (let i = 1; i <= n; i++) {
      const b = segmentEval(s, i / n);
      len += hypot(sub(b, a));
      a = b;
    }
    if (Math.abs(len - prev) < accuracy || n >= 1 << 14) return len;
    prev = len;
    n *= 2;
  }
}

/** The nearest point on a segment to `p`: its parameter and the squared distance (sampled, then refined). */
export function segmentNearest(s: Segment, p: Pt): { t: number; distanceSq: number } {
  const d2 = (t: number) => {
    const q = segmentEval(s, t);
    return (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
  };
  if (s.kind === "line") {
    const d = sub(s.p1, s.p0);
    const l2 = dot(d, d);
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, dot(sub(p, s.p0), d) / l2)) : 0;
    return { t, distanceSq: d2(t) };
  }
  const N = 64;
  let bestT = 0;
  let best = Infinity;
  for (let i = 0; i <= N; i++) {
    const v = d2(i / N);
    if (v < best) {
      best = v;
      bestT = i / N;
    }
  }
  let lo = Math.max(0, bestT - 1 / N);
  let hi = Math.min(1, bestT + 1 / N);
  for (let k = 0; k < 60; k++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (d2(m1) < d2(m2)) hi = m2;
    else lo = m1;
  }
  const t = (lo + hi) / 2;
  return { t, distanceSq: Math.min(best, d2(t)) };
}

/** Split a path into its subpaths. */
export function splitSubpaths(path: BezPath): BezPath[] {
  const out: BezPath[] = [];
  let cur = new BezPath();
  for (const el of path.els) {
    if (el.t === "M" && !cur.isEmpty()) {
      out.push(cur);
      cur = new BezPath();
    }
    cur.els.push(el);
  }
  if (!cur.isEmpty()) out.push(cur);
  return out;
}

const sampleEllipse = (rx: number, ry: number, xRotation: number, angle: number): Pt => {
  const u = { x: rx * Math.cos(angle), y: ry * Math.sin(angle) };
  if (xRotation === 0) return u;
  const c = Math.cos(xRotation);
  const s = Math.sin(xRotation);
  return { x: u.x * c - u.y * s, y: u.x * s + u.y * c };
};

/**
 * An elliptical arc as cubic beziers, the way kurbo's `Arc::to_cubic_beziers` does it: the number of pieces comes
 * from the error tolerance, each piece's handles are `4/3 tan(step/4)` long. `emit` gets each cubic's three
 * control points; the arc's start point is not emitted.
 */
export function arcToCubics(
  center: Pt,
  radii: Pt,
  startAngle: number,
  sweepAngle: number,
  xRotation: number,
  tolerance: number,
  emit: (p1: Pt, p2: Pt, p3: Pt) => void,
): void {
  if (!Number.isFinite(sweepAngle) || sweepAngle === 0) return;
  const sign = Math.sign(sweepAngle);
  const scaledErr = Math.max(radii.x, radii.y) / tolerance;
  const nErr = Math.max(Math.pow(1.1163 * scaledErr, 1 / 6), 3.999999);
  const n = Math.max(1, Math.ceil(nErr * Math.abs(sweepAngle) * (1 / (2 * Math.PI))));
  const step = sweepAngle / n;
  const armLen = (4 / 3) * Math.abs(Math.tan(step / 4)) * sign;
  let angle0 = startAngle;
  let p0 = add(center, sampleEllipse(radii.x, radii.y, xRotation, angle0));
  for (let i = 0; i < n; i++) {
    const angle1 = angle0 + step;
    const p1 = add(p0, scale(sampleEllipse(radii.x, radii.y, xRotation, angle0 + Math.PI / 2), armLen));
    const p3 = add(center, sampleEllipse(radii.x, radii.y, xRotation, angle1));
    const p2 = sub(p3, scale(sampleEllipse(radii.x, radii.y, xRotation, angle1 + Math.PI / 2), armLen));
    emit(p1, p2, p3);
    angle0 = angle1;
    p0 = p3;
  }
}

/** A full ellipse as a closed path starting at 3 o'clock, clockwise in y-down (kurbo `Ellipse::to_path`). */
export function ellipsePath(center: Pt, radii: Pt, tolerance = 0.01): BezPath {
  const path = new BezPath();
  path.moveTo(add(center, { x: radii.x, y: 0 }));
  arcToCubics(center, radii, 0, Math.PI * 2, 0, tolerance, (a, b, c) => path.curveTo(a, b, c));
  path.closePath();
  return path;
}
