/**
 * ============================================================================
 * STROKES: WIDTH PROFILES, OUTLINES, ARROWHEADS, PER-SIDE WEIGHTS (FigCraft port, F3)
 * ============================================================================
 * What a stroke is beyond a colour and a width: where it sits (inside, centre, outside), caps (round, square and
 * five arrowheads), joins with a miter limit, dashes, per-side weights on rectangles, and a variable width profile
 * (widths at points along the path, interpolated monotonically, each side on its own). Every function here turns
 * that into geometry: the filled outline of a stroke, arrowheads, the ring of a per-side stroke.
 *
 * The stage draws plain strokes natively (SVG `stroke`, clipped for inside and outside); these outlines draw the
 * strokes SVG can't (variable widths, per-side weights, arrowheads) and back the Outline Stroke command.
 *
 * FigCraft strokes its uniform centred strokes with kurbo's curve stroker. We outline every stroke with FigCraft's
 * own polyline outliner (the one it uses for variable widths) at a uniform width, so outlines are polygons within
 * the flattening tolerance (0.05 px).
 *
 * Translated from FigCraft (`crates/doc/src/props.rs` stroke and width-profile types, `crates/pathops/src/width.rs`,
 * `crates/pathops/src/lib.rs` arrowheads and side strokes), commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team
 * and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 * ============================================================================
 */

import { BezPath, add, arcToCubics, atan2, cross, dot, ellipsePath, hypot, lerp, pt, scale, sub, turn90, type Pt } from "../geometry/bezpath";
import { FLATTEN_TOL, MAX_SAMPLES, Polyline, polylines } from "../geometry/measure";
import { roundedRect } from "../geometry/shapes";
import { booleanPaths, simplifyPath } from "./pathOps";

// ---------------------------------------------------------------------------
// The stroke model
// ---------------------------------------------------------------------------

export type StrokeAlign = "inside" | "center" | "outside";
export const STROKE_ALIGNS: readonly StrokeAlign[] = ["inside", "center", "outside"];

export type StrokeCap = "none" | "round" | "square" | "lineArrow" | "triangleArrow" | "reversedTriangle" | "circleFilled" | "diamondFilled";
export const STROKE_CAPS: readonly StrokeCap[] = ["none", "round", "square", "lineArrow", "triangleArrow", "reversedTriangle", "circleFilled", "diamondFilled"];
const CAP_LABEL: Record<StrokeCap, string> = {
  none: "None", round: "Round", square: "Square", lineArrow: "Line arrow", triangleArrow: "Triangle arrow", reversedTriangle: "Reversed triangle",
  circleFilled: "Circle", diamondFilled: "Diamond",
};
export const capLabel = (c: StrokeCap): string => CAP_LABEL[c];
export const isArrowCap = (c: StrokeCap): boolean => c !== "none" && c !== "round" && c !== "square";

export type StrokeJoin = "miter" | "bevel" | "round";
export const STROKE_JOINS: readonly StrokeJoin[] = ["miter", "bevel", "round"];

/** One point of a width profile: `scale` is the width here as a multiple of the weight; `bias` puts more of it on the right (-1..1). */
export interface WidthPoint {
  t: number;
  scale: number;
  bias: number;
}

export interface StrokeProps {
  weight: number;
  align: StrokeAlign;
  /** Per-side weights `[top, right, bottom, left]` (rectangles and frames only). */
  sides: [number, number, number, number] | null;
  capStart: StrokeCap;
  capEnd: StrokeCap;
  join: StrokeJoin;
  miterLimit: number;
  /** Dash, gap, …; empty is solid. */
  dashes: number[];
  /** Variable width points (null: uniform). */
  widthProfile: WidthPoint[] | null;
}

export const defaultStroke = (): StrokeProps => ({
  weight: 1, align: "inside", sides: null, capStart: "none", capEnd: "none", join: "miter", miterLimit: 4, dashes: [], widthProfile: null,
});

/** The miter limit as the angle below which joins bevel (limit = 1 / sin(angle / 2); the default 4 is ~28.96°). */
export const miterAngle = (limit: number): number => (2 * Math.asin(1 / Math.min(100, Math.max(1, limit))) * 180) / Math.PI;
/** The miter limit for a miter angle in degrees (kept within 1–100). */
export function miterLimitFor(angle: number): number {
  const a = Number.isFinite(angle) ? Math.min(180, Math.max(1, angle)) : 28.955;
  return Math.min(100, Math.max(1, 1 / Math.sin(((a / 2) * Math.PI) / 180)));
}

// ---------------------------------------------------------------------------
// Width profiles
// ---------------------------------------------------------------------------

export const WIDTH_MAX_POINTS = 64;
export const WIDTH_MAX_SCALE = 1000;

export const widthPoint = (t: number, scale: number): WidthPoint => ({ t, scale, bias: 0 });

/** A point from its left and right side scales (negative or non-finite count as 0). */
export function widthPointFromSides(t: number, left: number, right: number): WidthPoint {
  const clean = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);
  const l = clean(left);
  const r = clean(right);
  const sum = l + r;
  return { t, scale: sum / 2, bias: sum > 1e-12 ? Math.min(1, Math.max(-1, (r - l) / sum)) : 0 };
}

/** The left and right side scales of a point. */
export const pointSides = (p: WidthPoint): [number, number] => [p.scale * (1 - p.bias), p.scale * (1 + p.bias)];

/** Finite points only, t in 0..1, scales in 0..MAX, sorted by t, at most MAX_POINTS. */
export function sanitizeProfile(points: readonly Partial<WidthPoint>[] | null | undefined): WidthPoint[] {
  if (!Array.isArray(points)) return [];
  return points
    .filter((p) => typeof p?.t === "number" && typeof p?.scale === "number" && Number.isFinite(p.t) && Number.isFinite(p.scale))
    .slice(0, WIDTH_MAX_POINTS)
    .map((p) => ({
      t: Math.min(1, Math.max(0, p.t!)),
      scale: Math.min(WIDTH_MAX_SCALE, Math.max(0, p.scale!)),
      bias: typeof p.bias === "number" && Number.isFinite(p.bias) ? Math.min(1, Math.max(-1, p.bias)) : 0,
    }))
    .sort((a, b) => a.t - b.t);
}

const symmetric = (pts: readonly WidthPoint[]) => pts.every((p) => p.bias === 0);

function secant(pts: readonly WidthPoint[], i: number, value: (p: WidthPoint) => number): number {
  const a = pts[i];
  const b = pts[i + 1];
  return a && b && b.t - a.t > 1e-12 ? (value(b) - value(a)) / (b.t - a.t) : 0;
}

/** Fritsch–Carlson tangent: one-sided at the ends, harmonic mean inside, flat at local extremes. */
function tangent(pts: readonly WidthPoint[], i: number, value: (p: WidthPoint) => number): number {
  const last = Math.max(0, pts.length - 1);
  if (i === 0) return secant(pts, 0, value);
  if (i >= last) return secant(pts, Math.max(0, last - 1), value);
  const d0 = secant(pts, i - 1, value);
  const d1 = secant(pts, i, value);
  return d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1);
}

/** `value` of the points at `t`: monotone cubic between points, flat before the first and after the last. */
function interp(pts: readonly WidthPoint[], t: number, value: (p: WidthPoint) => number): number {
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return 1;
  if (!Number.isFinite(t) || t <= first.t) return value(first);
  if (t >= last.t) return value(last);
  let k = 0;
  while (k + 1 < pts.length && pts[k + 1].t <= t) k++;
  const a = pts[k];
  const b = pts[k + 1];
  if (!a || !b) return value(last);
  const h = b.t - a.t;
  if (h <= 1e-12) return value(b);
  const u = (t - a.t) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  const w = (2 * u3 - 3 * u2 + 1) * value(a) + (u3 - 2 * u2 + u) * h * tangent(pts, k, value) + (3 * u2 - 2 * u3) * value(b) + (u3 - u2) * h * tangent(pts, k + 1, value);
  return Math.max(0, w);
}

/** The left and right side scales at `t`, each side interpolated on its own. */
export function sidesAt(pts: readonly WidthPoint[], t: number): [number, number] {
  if (symmetric(pts)) {
    const s = interp(pts, t, (p) => p.scale);
    return [s, s];
  }
  return [interp(pts, t, (p) => pointSides(p)[0]), interp(pts, t, (p) => pointSides(p)[1])];
}

/** The width scale at `t`: the mean of the two sides. */
export const scaleAt = (pts: readonly WidthPoint[], t: number): number => {
  const [l, r] = sidesAt(pts, t);
  return (l + r) / 2;
};

/** The largest side scale (interpolation never exceeds its points). */
export const maxScale = (pts: readonly WidthPoint[]): number => pts.reduce((m, p) => Math.max(m, ...pointSides(p)), 0);

/** The widest the stroke gets anywhere. */
export const maxWeight = (s: StrokeProps): number => (s.widthProfile && s.widthProfile.length > 0 ? s.weight * maxScale(s.widthProfile) : s.weight);

/** Adds a symmetric point, kept sorted; returns the new list and its index. */
export function insertWidthPoint(pts: readonly WidthPoint[], t: number, scale: number): { points: WidthPoint[]; index: number } {
  const p = { t: Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0, scale: Math.min(WIDTH_MAX_SCALE, Math.max(0, Number.isFinite(scale) ? scale : 1)), bias: 0 };
  let i = 0;
  while (i < pts.length && pts[i].t <= p.t) i++;
  return { points: [...pts.slice(0, i), p, ...pts.slice(i)], index: i };
}

/** Adds a point at `t` as wide on each side as the stroke already is there. */
export function insertWidthPointHere(pts: readonly WidthPoint[], t: number): { points: WidthPoint[]; index: number } {
  const [l, r] = sidesAt(pts, t);
  const p = widthPointFromSides(Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0, l, r);
  let i = 0;
  while (i < pts.length && pts[i].t <= p.t) i++;
  return { points: [...pts.slice(0, i), p, ...pts.slice(i)], index: i };
}

/** Moves point `i` (kept between its neighbours) and/or sets its scale (which makes it symmetric again). */
export function setWidthPoint(pts: readonly WidthPoint[], i: number, t?: number, scale?: number): WidthPoint[] | null {
  const p = pts[i];
  if (!p) return null;
  const lo = i > 0 ? pts[i - 1].t : 0;
  const hi = i + 1 < pts.length ? pts[i + 1].t : 1;
  const next = { ...p };
  if (t !== undefined && Number.isFinite(t)) next.t = Math.min(Math.max(lo, hi), Math.max(lo, t));
  if (scale !== undefined && Number.isFinite(scale)) {
    next.scale = Math.min(WIDTH_MAX_SCALE, Math.max(0, scale));
    next.bias = 0;
  }
  return pts.map((q, j) => (j === i ? next : q));
}

/** Sets one side of point `i` to a side scale, keeping the other side. */
export function setWidthSide(pts: readonly WidthPoint[], i: number, side: "left" | "right", value: number): WidthPoint[] | null {
  const p = pts[i];
  if (!p) return null;
  if (!Number.isFinite(value)) return [...pts];
  const s = Math.min(2 * WIDTH_MAX_SCALE, Math.max(0, value));
  const [l, r] = pointSides(p);
  const q = side === "left" ? widthPointFromSides(p.t, s, r) : widthPointFromSides(p.t, l, s);
  return pts.map((x, j) => (j === i ? { ...x, scale: Math.min(WIDTH_MAX_SCALE, q.scale), bias: q.bias } : x));
}

export type WidthPreset = "uniform" | "wedge" | "taper" | "eye" | "rounded" | "pinch";
export const WIDTH_PRESETS: readonly WidthPreset[] = ["uniform", "wedge", "taper", "eye", "rounded", "pinch"];
const PRESET_LABEL: Record<WidthPreset, string> = { uniform: "Uniform", wedge: "Wedge", taper: "Taper both ends", eye: "Eye", rounded: "Rounded", pinch: "Pinch" };
export const presetLabel = (p: WidthPreset): string => PRESET_LABEL[p];

/** A preset's profile (null for uniform). */
export function presetProfile(p: WidthPreset): WidthPoint[] | null {
  const pairs: Record<Exclude<WidthPreset, "uniform">, [number, number][]> = {
    wedge: [[0, 1], [1, 0]],
    taper: [[0, 0], [0.2, 1], [0.8, 1], [1, 0]],
    eye: [[0, 0], [0.5, 1], [1, 0]],
    rounded: [[0, 0.3], [0.05, 0.8], [0.15, 1], [0.85, 1], [0.95, 0.8], [1, 0.3]],
    pinch: [[0, 1], [0.5, 0.25], [1, 1]],
  };
  return p === "uniform" ? null : sanitizeProfile(pairs[p].map(([t, s]) => widthPoint(t, s)));
}

/** A preset by id or label (ignoring case and spaces; "bulge" is the eye). */
export function presetFromId(s: string): WidthPreset | null {
  const k = s.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return WIDTH_PRESETS.find((p) => p === k || PRESET_LABEL[p].replace(/ /g, "").toLowerCase() === k) ?? (k === "bulge" ? "eye" : null);
}

/** The preset a profile is, if any. */
export function profilePreset(pts: readonly WidthPoint[] | null): WidthPreset | null {
  return WIDTH_PRESETS.find((p) => JSON.stringify(presetProfile(p)) === JSON.stringify(pts && pts.length ? pts : null)) ?? null;
}

// ---------------------------------------------------------------------------
// The outliner
// ---------------------------------------------------------------------------

/** Every subpath gets at least this many width samples. */
const SAMPLES_PER_SUBPATH = 128;
/** The most dashes a dashed stroke makes. */
const MAX_DASHES = 20_000;
/** A stroke wider than this draws as if this wide. */
export const MAX_STROKE_WIDTH = 1e6;

/** Half-widths at a sample: [along the normal (the right side), against it]. */
type Half = [number, number];
const on = (h: Half, sigma: number) => (sigma > 0 ? h[0] : h[1]);

interface Seg {
  a: Pt;
  b: Pt;
  ha: Half;
  hb: Half;
  d: Pt;
  n: Pt;
}
interface Style {
  join: StrokeJoin;
  miterLimit: number;
  capStart: StrokeCap;
  capEnd: StrokeCap;
}

/** The cap shape an end draws (arrowheads are added separately; their stroke ends round or square). */
function capShape(c: StrokeCap): "round" | "square" | "none" {
  if (c === "round" || c === "circleFilled") return "round";
  if (c === "square" || c === "diamondFilled") return "square";
  return "none";
}

const fromAngle = (a: number): Pt => ({ x: Math.cos(a), y: Math.sin(a) });

/** Points of an arc around `c` from the direction `from`, turning by `sweep`, radius going r0 → r1 (ends excluded). */
function arcPts(out: Pt[], c: Pt, from: Pt, sweep: number, r0: number, r1: number): void {
  const r = Math.max(r0, r1);
  if (r <= FLATTEN_TOL || !Number.isFinite(sweep)) return;
  const step = 2 * Math.acos(Math.min(1, Math.max(-1, 1 - FLATTEN_TOL / r)));
  const n = Math.min(64, Math.max(2, Math.ceil(Math.abs(sweep) / Math.max(1e-3, step))));
  const a0 = atan2(from);
  for (let k = 1; k < n; k++) {
    const f = k / n;
    out.push(add(c, scale(fromAngle(a0 + sweep * f), r0 + (r1 - r0) * f)));
  }
}

function joinPts(out: Pt[], p: Seg, c: Seg, sigma: number, style: Style): void {
  const phb = on(p.hb, sigma);
  const cha = on(c.ha, sigma);
  const pe = add(p.b, scale(p.n, sigma * phb));
  const cs = add(c.a, scale(c.n, sigma * cha));
  out.push(pe);
  const cr = cross(p.d, c.d);
  const dt = dot(p.d, c.d);
  if (Math.abs(cr) < 1e-12 && dt > 0) {
    out.push(cs);
    return;
  }
  const outer = Math.abs(cr) < 1e-12 ? sigma < 0 : cr * sigma < 0;
  const v = c.a;
  if (outer) {
    const theta = Math.abs(cr) < 1e-12 ? Math.PI : Math.atan2(cr, dt);
    if (style.join === "round") arcPts(out, v, sub(pe, v), theta, phb, cha);
    else if (style.join === "miter") {
      const half = Math.cos(theta / 2);
      const bis = add(p.n, c.n);
      const bl = hypot(bis);
      if (half > 1e-6 && 1 / half <= style.miterLimit && bl > 1e-9) out.push(add(v, scale(bis, (sigma * (phb + cha)) / 2 / half / bl)));
    }
  } else {
    // through the centre: keeps the winding right when segments are shorter than the width
    out.push(v);
  }
  out.push(cs);
}

function sidePts(segs: readonly Seg[], sigma: number, closed: boolean, style: Style): Pt[] {
  const out: Pt[] = [];
  segs.forEach((s, j) => {
    const prev = j === 0 ? (closed ? segs[segs.length - 1] : undefined) : segs[j - 1];
    if (prev) joinPts(out, prev, s, sigma, style);
    else out.push(add(s.a, scale(s.n, sigma * on(s.ha, sigma))));
  });
  const l = segs[segs.length - 1];
  if (!closed && l) out.push(add(l.b, scale(l.n, sigma * on(l.hb, sigma))));
  return out;
}

/** A cap at `c` facing `dir` (unit, outwards) from the `turn90(dir)` side, `from` wide, to the other side, `to` wide. */
function capPts(out: Pt[], c: Pt, dir: Pt, from: number, to: number, kind: StrokeCap): void {
  const n = turn90(dir);
  const m = add(c, scale(n, (from - to) / 2));
  const r = (from + to) / 2;
  const shape = capShape(kind);
  if (shape === "square") {
    out.push(add(add(m, scale(n, r)), scale(dir, r)));
    out.push(add(sub(m, scale(n, r)), scale(dir, r)));
  } else if (shape === "round") {
    arcPts(out, m, n, -Math.PI, r, r);
  }
}

function pushContour(path: BezPath, pts: readonly Pt[]): void {
  if (pts.length === 0) return;
  path.moveTo(pts[0]);
  for (const p of pts.slice(1)) path.lineTo(p);
  path.closePath();
}

function outlinePiece(path: BezPath, pts: readonly Pt[], hw: readonly Half[], closed: boolean, style: Style): void {
  const segs: Seg[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = hypot(sub(b, a));
    if (len > 1e-9) {
      const d = scale(sub(b, a), 1 / len);
      segs.push({ a, b, ha: hw[i], hb: hw[i + 1], d, n: turn90(d) });
    }
  }
  const first = segs[0];
  const last = segs[segs.length - 1];
  if (!first || !last) {
    // a zero-length piece is a dot with round caps
    const r = hw[0] ? (hw[0][0] + hw[0][1]) / 2 : 0;
    if (pts[0] && capShape(style.capStart) === "round" && r > 0) path.extend(ellipsePath(pts[0], pt(r, r), FLATTEN_TOL));
    return;
  }
  const left = sidePts(segs, 1, closed, style);
  const right = sidePts(segs, -1, closed, style);
  if (closed) {
    pushContour(path, left);
    pushContour(path, [...right].reverse());
    return;
  }
  const ring = left;
  capPts(ring, last.b, last.d, last.hb[0], last.hb[1], style.capEnd);
  ring.push(...[...right].reverse());
  capPts(ring, first.a, scale(first.d, -1), first.ha[1], first.ha[0], style.capStart);
  pushContour(path, ring);
}

/** Splits a sampled polyline into dashes (`pattern` alternates dash and gap lengths). */
function dashPieces(pts: readonly Pt[], hw: readonly Half[], pattern: readonly number[]): [Pt[], Half[]][] {
  const out: [Pt[], Half[]][] = [];
  if (pattern.length === 0) return out;
  let idx = 0;
  let left = pattern[0];
  let isOn = true;
  let cur: [Pt[], Half[]] = [pts.slice(0, 1), hw.slice(0, 1)];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const ha = hw[i];
    const hb = hw[i + 1];
    const len = hypot(sub(b, a));
    let used = 0;
    while (len - used > left) {
      used += left;
      const f = len > 0 ? used / len : 0;
      const q = lerp(a, b, f);
      const hq: Half = [ha[0] + (hb[0] - ha[0]) * f, ha[1] + (hb[1] - ha[1]) * f];
      if (isOn) {
        cur[0].push(q);
        cur[1].push(hq);
        out.push(cur);
        cur = [[], []];
        if (out.length >= MAX_DASHES) return out;
      } else {
        cur = [[q], [hq]];
      }
      isOn = !isOn;
      idx = (idx + 1) % pattern.length;
      left = pattern[idx] ?? pattern[0];
    }
    left -= len - used;
    if (isOn) {
      cur[0].push(b);
      cur[1].push(hb);
    }
  }
  if (isOn && cur[0].length > 0) out.push(cur);
  return out;
}

/** The dash pattern a stroke uses (odd lengths repeat twice), or null for solid. */
export function dashPattern(dashes: readonly number[]): number[] | null {
  const d = dashes.filter((x) => Number.isFinite(x) && x >= 0);
  if (d.length === 0 || d.reduce((a, b) => a + b, 0) <= 0.01) return null;
  return d.length % 2 === 1 ? [...d, ...d] : d;
}

/** Whether a pattern makes at most MAX_DASHES dashes along `len` (past that the stroke draws solid). */
export const dashesFit = (len: number, pattern: readonly number[]): boolean => (len / pattern.reduce((a, b) => a + b, 0)) * pattern.length < MAX_DASHES;

/** Resamples a polyline so no step is longer than `maxStep`; null past the sample budget. */
function resample(line: Polyline, maxStep: number, budget: { left: number }): { pts: Pt[]; lens: number[] } | null {
  const pts: Pt[] = [];
  const lens: number[] = [];
  line.points.forEach((p, i) => {
    const s = line.lengths[i] ?? 0;
    const prev = pts[pts.length - 1];
    const ps = lens[lens.length - 1];
    if (prev && ps !== undefined) {
      const n = Math.min(MAX_SAMPLES, Math.max(1, Math.ceil((s - ps) / maxStep)));
      for (let k = 1; k < n; k++) {
        const f = k / n;
        pts.push(lerp(prev, p, f));
        lens.push(ps + (s - ps) * f);
      }
    }
    pts.push(p);
    lens.push(s);
  });
  if (pts.length > budget.left) return null;
  budget.left -= pts.length;
  return { pts, lens };
}

/**
 * The filled outline of a stroke of `width` along `path` whose width follows `profile` (scales multiply `width`;
 * an empty profile is uniform). Fill it non-zero. Null when the path is invalid or too long.
 */
export function variableOutline(path: BezPath, width: number, props: Pick<StrokeProps, "join" | "miterLimit" | "capStart" | "capEnd" | "dashes">, profile: readonly WidthPoint[]): BezPath | null {
  if (!(Number.isFinite(width) && width > 0)) return new BezPath();
  const prof = sanitizeProfile(profile);
  const points = prof.length > 0 ? prof : [widthPoint(0, 1), widthPoint(1, 1)];
  const lines = polylines(path);
  if (!lines) return null;
  const style: Style = { join: props.join, miterLimit: Math.min(100, Math.max(1, props.miterLimit)), capStart: props.capStart, capEnd: props.capEnd };
  const pattern = dashPattern(props.dashes);
  const budget = { left: MAX_SAMPLES };
  const out = new BezPath();
  for (const line of lines) {
    const len = line.length();
    if (len <= 1e-9) continue;
    const r = resample(line, len / SAMPLES_PER_SUBPATH, budget);
    if (!r) return null;
    const hw: Half[] = r.lens.map((s) => {
      const [l, rt] = sidesAt(points, s / len);
      return [0.5 * width * rt, 0.5 * width * l];
    });
    if (pattern && dashesFit(len, pattern)) {
      for (const [p, h] of dashPieces(r.pts, hw, pattern)) outlinePiece(out, p, h, false, style);
    } else {
      outlinePiece(out, r.pts, hw, line.closed, style);
    }
  }
  return out;
}

/** A plain centred stroke of `path` at `width` (capped at MAX_STROKE_WIDTH), as a filled outline. */
export function strokeCenter(path: BezPath, width: number, props: Pick<StrokeProps, "join" | "miterLimit" | "capStart" | "capEnd" | "dashes">): BezPath {
  if (!(Number.isFinite(width) && width > 0)) return new BezPath();
  return variableOutline(path, Math.min(width, MAX_STROKE_WIDTH), props, []) ?? new BezPath();
}

/** The painted area of a stroke as a fill path. `closedShape` decides whether inside/outside apply. Fill it non-zero. */
export function strokeOutline(path: BezPath, props: StrokeProps, closedShape: boolean, shapeEvenOdd = false): BezPath {
  if (!(Number.isFinite(props.weight) && props.weight > 0)) return new BezPath();
  const w = Math.min(props.weight, MAX_STROKE_WIDTH);
  const profile = props.widthProfile && props.widthProfile.length > 0 ? props.widthProfile : null;
  const centred = (width: number) => (profile ? variableOutline(path, width, props, profile) ?? strokeCenter(path, width, props) : strokeCenter(path, width, props));
  const align = closedShape ? props.align : "center";
  let out: BezPath;
  if (align === "center") out = centred(w);
  else {
    const rule = shapeEvenOdd ? "evenodd" : "nonzero";
    out = booleanPaths(simplifyPath(centred(w * 2), "nonzero"), path, align === "inside" ? "intersect" : "subtract", "nonzero", rule);
  }
  if (!closedShape) {
    for (const [atEnd, cap] of [[false, props.capStart], [true, props.capEnd]] as const) {
      const head = isArrowCap(cap) ? arrowhead(path, cap, w, atEnd) : null;
      if (head) out.extend(head);
    }
  }
  return out;
}

/** The end point and outward direction of an open path at its start or end (skipping zero-length pieces). */
function pathEnd(path: BezPath, atEnd: boolean): { tip: Pt; dir: Pt } | null {
  const segs = path.segments();
  const order = atEnd ? [...segs].reverse() : segs;
  for (const s of order) {
    let tip: Pt;
    let d: Pt;
    if (atEnd) {
      tip = s.kind === "line" ? s.p1 : s.kind === "quad" ? s.p2 : s.p3;
      d = s.kind === "line" ? sub(s.p1, s.p0) : s.kind === "quad" ? sub(s.p2, s.p1) : hypot(sub(s.p3, s.p2)) > 1e-9 ? sub(s.p3, s.p2) : sub(s.p3, s.p1);
    } else {
      tip = s.p0;
      d = s.kind === "line" ? sub(s.p0, s.p1) : hypot(sub(s.p0, s.p1)) > 1e-9 ? sub(s.p0, s.p1) : sub(s.p0, s.kind === "quad" ? s.p2 : s.p2);
    }
    const len = hypot(d);
    if (len >= 1e-12) return { tip, dir: scale(d, 1 / len) };
  }
  return null;
}

/** The filled arrowhead shape for a cap at one end of an open path. */
export function arrowhead(path: BezPath, cap: StrokeCap, weight: number, atEnd: boolean): BezPath | null {
  const e = pathEnd(path, atEnd);
  if (!e) return null;
  const { tip, dir } = e;
  const n = { x: -dir.y, y: dir.x };
  const s = Math.max(6, weight * 3);
  const p = new BezPath();
  switch (cap) {
    case "triangleArrow":
      return p.moveTo(add(tip, scale(dir, weight * 0.5))).lineTo(add(sub(tip, scale(dir, s)), scale(n, s * 0.6))).lineTo(sub(sub(tip, scale(dir, s)), scale(n, s * 0.6))).closePath();
    case "reversedTriangle":
      return p.moveTo(sub(tip, scale(dir, s))).lineTo(add(tip, scale(n, s * 0.6))).lineTo(sub(tip, scale(n, s * 0.6))).closePath();
    case "lineArrow": {
      const l = new BezPath().moveTo(add(sub(tip, scale(dir, s)), scale(n, s * 0.7))).lineTo(tip).lineTo(sub(sub(tip, scale(dir, s)), scale(n, s * 0.7)));
      return strokeCenter(l, weight, { join: "round", miterLimit: 4, capStart: "round", capEnd: "round", dashes: [] });
    }
    case "circleFilled":
      return ellipsePath(tip, pt(s * 0.4, s * 0.4), 0.05);
    case "diamondFilled": {
      const r = s * 0.5;
      return p.moveTo(add(tip, scale(dir, r))).lineTo(add(tip, scale(n, r))).lineTo(sub(tip, scale(dir, r))).lineTo(sub(tip, scale(n, r))).closePath();
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Per-side strokes
// ---------------------------------------------------------------------------

const nonNeg = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);
const alignFactor = (a: StrokeAlign) => (a === "inside" ? 0 : a === "center" ? 0.5 : 1);

const rectPath = (x0: number, y0: number, x1: number, y1: number) => new BezPath().moveTo(pt(x0, y0)).lineTo(pt(x1, y0)).lineTo(pt(x1, y1)).lineTo(pt(x0, y1)).closePath();

/** Per-side stroke of a square-cornered rectangle `[top, right, bottom, left]`, painted inside, centred or outside. */
export function rectSideStrokes(w: number, h: number, sides: readonly number[], align: StrokeAlign): BezPath {
  const [t, r, b, l] = [0, 1, 2, 3].map((i) => nonNeg(sides[i] ?? 0));
  const f = alignFactor(align);
  const p = new BezPath();
  const ox0 = -l * f;
  const oy0 = -t * f;
  const ox1 = w + r * f;
  const oy1 = h + b * f;
  if (t > 0) p.extend(rectPath(ox0, oy0, ox1, oy0 + t));
  if (b > 0) p.extend(rectPath(ox0, oy1 - b, ox1, oy1));
  if (l > 0) p.extend(rectPath(ox0, oy0 + t, ox0 + l, oy1 - b));
  if (r > 0) p.extend(rectPath(ox1 - r, oy0 + t, ox1, oy1 - b));
  return p;
}

type Corners = [[number, number], [number, number], [number, number], [number, number]];

/** A rectangle with an (rx, ry) quarter ellipse at each corner [tl, tr, br, bl]. */
function ellipticalRect(x0: number, y0: number, x1: number, y1: number, [tl, tr, br, bl]: Corners): BezPath {
  const quarters: [Pt, [number, number], [number, number], number][] = [
    [pt(x1, y0), [-1, 1], tr, -Math.PI / 2],
    [pt(x1, y1), [-1, -1], br, 0],
    [pt(x0, y1), [1, -1], bl, Math.PI / 2],
    [pt(x0, y0), [1, 1], tl, Math.PI],
  ];
  const p = new BezPath().moveTo(pt(x0 + tl[0], y0));
  for (const [corner, [sx, sy], [rx, ry], start] of quarters) {
    if (rx > 0 && ry > 0) {
      const c = pt(corner.x + sx * rx, corner.y + sy * ry);
      p.lineTo(pt(c.x + rx * Math.cos(start), c.y + ry * Math.sin(start)));
      arcToCubics(c, pt(rx, ry), start, Math.PI / 2, 0, 0.01, (a, b2, e) => p.curveTo(a, b2, e));
    } else {
      p.lineTo(corner);
    }
  }
  return p.closePath();
}

/** A rectangle with (rx, ry) corners, smoothed like `roundedRect` where every corner is circular. */
function cornerRect(x0: number, y0: number, x1: number, y1: number, corners: Corners, smoothing: number): BezPath {
  if (smoothing > 0 && corners.every(([rx, ry]) => rx === ry)) {
    return roundedRect(x1 - x0, y1 - y0, [corners[0][0], corners[1][0], corners[2][0], corners[3][0]], smoothing).map((q) => pt(q.x + x0, q.y + y0));
  }
  return ellipticalRect(x0, y0, x1, y1, corners);
}

/**
 * Per-side stroke of a rectangle with corner radii [tl, tr, br, bl], like CSS borders: the outer edge is the rounded
 * rectangle (grown for centre and outside), the inner edge is inset by each side's weight with elliptical corners
 * max(0, R − weight). An even-odd ring whose hole runs against the outer edge, so it is a ring under non-zero too.
 */
export function roundedSideStrokes(w: number, h: number, radii: readonly number[], smoothing: number, sides: readonly number[], align: StrokeAlign): BezPath {
  const [t, r, b, l] = [0, 1, 2, 3].map((i) => nonNeg(sides[i] ?? 0));
  if (t + r + b + l <= 0) return new BezPath();
  const f = alignFactor(align);
  const maxR = nonNeg(Math.min(w, h)) / 2;
  const rad = [0, 1, 2, 3].map((i) => Math.min(maxR, nonNeg(radii[i] ?? 0)));
  const corners: [number, number, number][] = [[rad[0], l, t], [rad[1], r, t], [rad[2], r, b], [rad[3], l, b]];
  const outer =
    align === "inside"
      ? roundedRect(w, h, [rad[0], rad[1], rad[2], rad[3]], smoothing)
      : cornerRect(-l * f, -t * f, w + r * f, h + b * f, corners.map(([rr, x, y]) => (rr > 0 ? [rr + x * f, rr + y * f] : [0, 0])) as Corners, smoothing);
  const k = 1 - f;
  const ix0 = l * k;
  const iy0 = t * k;
  const ix1 = w - r * k;
  const iy1 = h - b * k;
  if (ix1 - ix0 <= 0 || iy1 - iy0 <= 0) return outer;
  // inner corners, square where either radius is 0, all shrunk by one factor where two on an edge overrun it
  const raw = corners.map(([rr, x, y]) => [Math.max(0, rr - x * k), Math.max(0, rr - y * k)]).map(([rx, ry]) => (rx > 0 && ry > 0 ? [rx, ry] : [0, 0])) as Corners;
  const [tl, tr, br, bl] = raw;
  const edges: [number, number][] = [[ix1 - ix0, tl[0] + tr[0]], [ix1 - ix0, bl[0] + br[0]], [iy1 - iy0, tl[1] + bl[1]], [iy1 - iy0, tr[1] + br[1]]];
  const fit = edges.filter(([, sum]) => sum > 0).reduce((m, [len, sum]) => Math.min(m, len / sum), 1);
  const inset = raw.map(([rx, ry]) => [rx * fit, ry * fit]) as Corners;
  const hole = cornerRect(ix0, iy0, ix1, iy1, inset, smoothing);
  if (fit < 1 || smoothing > 0) {
    const cut = booleanPaths(outer, hole, "subtract");
    if (!cut.isEmpty()) return cut;
  }
  return BezPath.from(outer.els).extend(hole.reverseSubpaths());
}

// ---------------------------------------------------------------------------
// Stored form: `stroke.*` properties
// ---------------------------------------------------------------------------

/** Reads a width profile stored as JSON text (`stroke.widthProfile`); null when absent, malformed or empty. */
export function parseWidthProfile(json: unknown): WidthPoint[] | null {
  if (typeof json !== "string" || json === "" || json.length > 20_000) return null;
  try {
    const pts = sanitizeProfile(JSON.parse(json));
    return pts.length > 0 ? pts : null;
  } catch {
    return null;
  }
}

export const serializeWidthProfile = (pts: readonly WidthPoint[] | null): string =>
  pts && pts.length > 0 ? JSON.stringify(sanitizeProfile(pts).map((p) => ({ t: Number(p.t.toFixed(4)), scale: Number(p.scale.toFixed(4)), ...(p.bias ? { bias: Number(p.bias.toFixed(4)) } : {}) }))) : "";

/** Reads per-side weights stored as "top right bottom left" (`stroke.sides`); null when absent or malformed. */
export function parseSides(v: unknown): [number, number, number, number] | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = v.trim().split(/[\s,]+/).map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x) || x < 0)) return null;
  return [Math.min(n[0], 1000), Math.min(n[1], 1000), Math.min(n[2], 1000), Math.min(n[3], 1000)];
}
