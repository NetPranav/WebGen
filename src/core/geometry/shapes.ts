/**
 * ============================================================================
 * SHAPE GEOMETRY (FigCraft port, F1)
 * ============================================================================
 * The outlines a design tool draws: rectangles with independent corner radii and corner smoothing (the
 * continuous-curvature "squircle" corner Figma calls Corner smoothing; 0.6 is the iOS look), regular polygons and
 * stars with rounded and smoothed vertices, and ellipse arcs, pies and rings. Coordinates are y-down, at the
 * origin of a `width`×`height` box. Every function accepts junk (NaN, Infinity, negatives) without throwing.
 *
 * The render definitions turn these into SVG path data (`BezPath.toSvg`), so the stage and the exporter draw the
 * same outline (Law 11).
 *
 * Translated from FigCraft (`crates/geom/src/lib.rs`), commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and
 * the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 * ============================================================================
 */

import { BezPath, add, arcToCubics, atan2, dot, ellipsePath, hypot, normalize, pt, scale, sub, type Pt } from "./bezpath";

/** Corner radii clockwise from the top-left: `[tl, tr, br, bl]`. */
export type Radii = readonly [number, number, number, number];

const TAU = Math.PI * 2;
const finite = (v: number): number => (Number.isFinite(v) ? v : 0);
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** The smoothed-corner profile along one corner (lengths measured from the corner point). */
interface CornerProfile {
  r: number;
  /** Total length the corner occupies along each edge. */
  p: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

function cornerProfile(radius: number, smoothing: number, maxP: number): CornerProfile {
  let r = Math.max(0, radius);
  if (r <= 0) return { r: 0, p: 0, a: 0, b: 0, c: 0, d: 0 };
  let s = smoothing;
  // reduce smoothing first when the smoothed corner doesn't fit along the edge
  if ((1 + s) * r > maxP) s = clamp(maxP / r - 1, 0, s);
  r = Math.min(r, maxP);
  const p = Math.min((1 + s) * r, maxP);
  const arcMeasure = 90 * (1 - s);
  const arcSectionLength = Math.sin(toRad(arcMeasure / 2)) * r * Math.SQRT2;
  const angleAlpha = (90 - arcMeasure) / 2;
  const p3ToP4 = r * Math.tan(toRad(angleAlpha / 2));
  const angleBeta = 45 * s;
  const c = p3ToP4 * Math.cos(toRad(angleBeta));
  const d = c * Math.tan(toRad(angleBeta));
  const b = Math.max(0, (p - arcSectionLength - c - d) / 3);
  const a = 2 * b;
  return { r, p, a, b, c, d };
}

/** Normalises an angle difference into (-π, π]. */
function wrapSweep(sweep: number): number {
  let s = sweep;
  while (s <= -Math.PI) s += TAU;
  while (s > Math.PI) s -= TAU;
  return s;
}

function appendCorner(path: BezPath, corner: Pt, din: Pt, dout: Pt, prof: CornerProfile): void {
  // position = corner - back * din + side * dout
  const at = (back: number, side: number) => add(sub(corner, scale(din, back)), scale(dout, side));
  if (prof.r <= 0) {
    path.lineTo(corner);
    return;
  }
  const { r, p, a, b, c, d } = prof;
  path.lineTo(at(p, 0));
  const p3 = at(p - a - b - c, d);
  if (a + b + c > 1e-9) path.curveTo(at(p - a, 0), at(p - a - b, 0), p3);
  const p4 = at(d, p - a - b - c);
  const center = at(r, r);
  const a0 = atan2(sub(p3, center));
  const sweep = wrapSweep(atan2(sub(p4, center)) - a0);
  if (Math.abs(sweep) > 1e-9) arcToCubics(center, pt(r, r), a0, sweep, 0, 0.01, (q1, q2, q3) => path.curveTo(q1, q2, q3));
  const end = at(0, p);
  if (a + b + c > 1e-9) path.curveTo(at(0, p - a - b), at(0, p - a), end);
  else path.lineTo(end);
}

/**
 * A rectangle at the origin with per-corner radii and corner smoothing (0..1). Radii are clamped so adjacent
 * corners never overlap; when smoothing doesn't fit, it is reduced first, then the radius.
 */
export function roundedRect(width: number, height: number, radii: Radii, smoothing: number): BezPath {
  const w = Math.max(0, finite(width));
  const h = Math.max(0, finite(height));
  const path = new BezPath();
  if (w <= 0 && h <= 0) return path;
  const s = clamp(finite(smoothing), 0, 1);
  const maxR = Math.min(w, h) / 2;
  const rs = radii.map((r) => clamp(finite(r), 0, maxR)) as unknown as Radii;
  if (rs.every((r) => r <= 0)) return path.moveTo(pt(0, 0)).lineTo(pt(w, 0)).lineTo(pt(w, h)).lineTo(pt(0, h)).closePath();
  // corners clockwise starting top-right, each: (corner, incoming edge direction, outgoing, radius)
  const corners: [Pt, Pt, Pt, number][] = [
    [pt(w, 0), pt(1, 0), pt(0, 1), rs[1]],
    [pt(w, h), pt(0, 1), pt(-1, 0), rs[2]],
    [pt(0, h), pt(-1, 0), pt(0, -1), rs[3]],
    [pt(0, 0), pt(0, -1), pt(1, 0), rs[0]],
  ];
  const first = cornerProfile(rs[0], s, maxR);
  // start on the top edge just after the top-left corner
  path.moveTo(pt(first.p, 0));
  for (const [c, din, dout, r] of corners) appendCorner(path, c, din, dout, cornerProfile(r, s, maxR));
  return path.closePath();
}

/** The vertices of a regular polygon inscribed in the box, first vertex at the top centre (Figma's polygon). */
export function polygonPoints(width: number, height: number, count: number): Pt[] {
  const n = clamp(Math.round(finite(count)), 3, 120);
  const rx = finite(width) / 2;
  const ry = finite(height) / 2;
  return Array.from({ length: n }, (_, i) => {
    const t = -Math.PI / 2 + (TAU * i) / n;
    return pt(rx + rx * Math.cos(t), ry + ry * Math.sin(t));
  });
}

/** The vertices of a star with `count` points and an inner radius of `innerRatio` (0..1) of the outer. */
export function starPoints(width: number, height: number, count: number, innerRatio: number): Pt[] {
  const n = clamp(Math.round(finite(count)), 3, 120);
  const k = clamp(finite(innerRatio), 0.001, 1);
  const rx = finite(width) / 2;
  const ry = finite(height) / 2;
  return Array.from({ length: n * 2 }, (_, i) => {
    const t = -Math.PI / 2 + (Math.PI * i) / n;
    const f = i % 2 === 0 ? 1 : k;
    return pt(rx + rx * f * Math.cos(t), ry + ry * f * Math.sin(t));
  });
}

/** A closed polygon through `points` with every vertex rounded by `radius` (clamped so the arcs fit). */
export function roundedPolygon(points: readonly Pt[], radius: number): BezPath {
  const path = new BezPath();
  const n = points.length;
  if (n < 2) return path;
  const rad = Math.max(0, finite(radius));
  if (rad <= 0 || n < 3) {
    points.forEach((p, i) => (i === 0 ? path.moveTo(p) : path.lineTo(p)));
    return path.closePath();
  }
  // for each vertex: the tangent points on its two edges and the bezier between them
  const corners: [Pt, Pt, Pt, Pt][] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i + n - 1) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const v1 = sub(prev, cur);
    const v2 = sub(next, cur);
    const l1 = hypot(v1);
    const l2 = hypot(v2);
    if (l1 < 1e-9 || l2 < 1e-9) {
      corners.push([cur, cur, cur, cur]);
      continue;
    }
    const u1 = scale(v1, 1 / l1);
    const u2 = scale(v2, 1 / l2);
    const angle = Math.acos(clamp(dot(u1, u2), -1, 1));
    if (angle < 1e-6 || Math.PI - angle < 1e-6) {
      corners.push([cur, cur, cur, cur]);
      continue;
    }
    let t = rad / Math.tan(angle / 2);
    const maxT = Math.min(l1, l2) / 2;
    let r = rad;
    if (t > maxT) {
      r = (r * maxT) / t;
      t = maxT;
    }
    const a = add(cur, scale(u1, t));
    const b = add(cur, scale(u2, t));
    // cubic arc approximation: handle length k·r with k = 4/3 tan(θ/4), θ = π - angle
    const theta = Math.PI - angle;
    const k = (4 / 3) * Math.tan(theta / 4) * r;
    corners.push([a, sub(a, scale(u1, k)), sub(b, scale(u2, k)), b]);
  }
  corners.forEach(([a, c1, c2, b], i) => {
    if (i === 0) path.moveTo(a);
    else path.lineTo(a);
    path.curveTo(c1, c2, b);
  });
  return path.closePath();
}

const lineOrMove = (path: BezPath, p: Pt) => (path.isEmpty() ? path.moveTo(p) : path.lineTo(p));

/**
 * `roundedPolygon` with corner smoothing (0..1, as `roundedRect` takes it): each rounded vertex keeps a circular
 * arc over `1 - smoothing` of its turn and eases into both edges with curves that start `1 + smoothing` times the
 * plain corner's length from the vertex. When a smoothed corner doesn't fit in half of its shorter edge, smoothing
 * is reduced first, then the radius. Without smoothing this is `roundedPolygon`.
 */
export function smoothedPolygon(points: readonly Pt[], radius: number, smoothing: number): BezPath {
  const s = clamp(finite(smoothing), 0, 1);
  const rad = Math.max(0, finite(radius));
  const n = points.length;
  if (s <= 0 || rad <= 0 || n < 3) return roundedPolygon(points, rad);
  const path = new BezPath();
  for (let i = 0; i < n; i++) {
    const prev = points[(i + n - 1) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const v1 = sub(prev, cur);
    const v2 = sub(next, cur);
    const l1 = hypot(v1);
    const l2 = hypot(v2);
    const angle = l1 < 1e-9 || l2 < 1e-9 ? 0 : Math.acos(clamp(dot(scale(v1, 1 / l1), scale(v2, 1 / l2)), -1, 1));
    if (angle < 1e-6 || Math.PI - angle < 1e-6) {
      lineOrMove(path, cur);
      continue;
    }
    const u1 = scale(v1, 1 / l1);
    const u2 = scale(v2, 1 / l2);
    // the plain corner's length along each edge, then the fit: smoothing first, then the radius
    const maxP = Math.min(l1, l2) / 2;
    let r = rad;
    let t = r / Math.tan(angle / 2);
    let sm = s;
    if ((1 + sm) * t > maxP) sm = clamp(maxP / t - 1, 0, sm);
    if (t > maxP) {
      r *= maxP / t;
      t = maxP;
    }
    const p = Math.min((1 + sm) * t, maxP);
    // each easing curve covers `beta` of the turn and ends on the arc at `back` along the edge and `side` across
    // it; its last handle points along the arc there
    const beta = ((Math.PI - angle) * sm) / 2;
    const back = t - r * Math.sin(beta);
    const side = r * (1 - Math.cos(beta));
    const c = r * Math.tan(beta / 2) * Math.cos(beta);
    const b = Math.max(0, (p - back - c) / 3);
    const a = 2 * b;
    const bisector = normalize(add(u1, u2));
    const center = add(cur, scale(bisector, r / Math.sin(angle / 2)));
    // a point `along` an edge from the vertex and `across` it toward the arc's centre
    const at = (u: Pt, along: number, across: number) => add(add(cur, scale(u, along)), scale(normalize(sub(bisector, scale(u, dot(bisector, u)))), across));
    lineOrMove(path, at(u1, p, 0));
    const p3 = at(u1, back, side);
    const p4 = at(u2, back, side);
    if (a + b + c > 1e-9) path.curveTo(at(u1, p - a, 0), at(u1, p - a - b, 0), p3);
    else path.lineTo(p3);
    const a0 = atan2(sub(p3, center));
    const sweep = wrapSweep(atan2(sub(p4, center)) - a0);
    if (Math.abs(sweep) > 1e-9) arcToCubics(center, pt(r, r), a0, sweep, 0, 0.01, (q1, q2, q3) => path.curveTo(q1, q2, q3));
    const end = at(u2, p, 0);
    if (a + b + c > 1e-9) path.curveTo(at(u2, p - a - b, 0), at(u2, p - a, 0), end);
    else path.lineTo(end);
  }
  return path.closePath();
}

/**
 * An ellipse in the box; with arc data, a pie, arc or ring: `start` and `sweep` in radians (clockwise from
 * 3 o'clock, y-down) and `inner` radius ratio 0..1. A full sweep with an inner ratio is a ring (outer clockwise,
 * inner counter-clockwise, so it fills with either fill rule).
 */
export function ellipse(width: number, height: number, start: number, sweep: number, inner: number): BezPath {
  const rx = Math.max(0, finite(width)) / 2;
  const ry = Math.max(0, finite(height)) / 2;
  const c = pt(rx, ry);
  const sw = clamp(finite(sweep), -TAU, TAU);
  const st = finite(start);
  const inn = clamp(finite(inner), 0, 1);
  const full = Math.abs(sw) >= TAU - 1e-9;
  if (full && inn <= 0) return ellipsePath(c, pt(rx, ry));
  if (full) {
    const path = ellipsePath(c, pt(rx, ry));
    return path.extend(ellipsePath(c, pt(rx * inn, ry * inn)).reverseSubpaths());
  }
  const path = new BezPath();
  path.moveTo(add(c, pt(rx * Math.cos(st), ry * Math.sin(st))));
  arcToCubics(c, pt(rx, ry), st, sw, 0, 0.01, (p1, p2, p3) => path.curveTo(p1, p2, p3));
  if (inn > 0) {
    const end = st + sw;
    path.lineTo(add(c, pt(rx * inn * Math.cos(end), ry * inn * Math.sin(end))));
    arcToCubics(c, pt(rx * inn, ry * inn), end, -sw, 0, 0.01, (p1, p2, p3) => path.curveTo(p1, p2, p3));
  } else {
    path.lineTo(c);
  }
  return path.closePath();
}
