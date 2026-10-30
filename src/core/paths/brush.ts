/**
 * Brushes (FigCraft port F3): strokes drawn with a shape instead of a band. A stretch brush bends one shape along
 * each subpath; a scatter brush drops copies of a shape along it, spaced by the stroke weight and jittered in size,
 * rotation and distance from the path by a seeded (repeatable) sequence. The shapes are the built-in presets, drawn
 * in code. A width profile (pen pressure) scales the brush along the path. The result may overlap itself: fill it
 * with the non-zero rule.
 *
 * Translated from FigCraft (`crates/pathops/src/brush.rs`, `brush_tests.rs`), commit 6ea44e9. MIT, Copyright (c) 2026
 * ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import { BezPath, cubicEval } from "../geometry/bezpath";
import { polylines, type Polyline } from "../geometry/measure";
import { starPoints } from "../geometry/shapes";
import { scaleAt, type WidthPoint } from "./strokes";

type Pt = { x: number; y: number };

export type BrushKind = "stretch" | "scatter";
export interface Preset {
  id: string;
  label: string;
  kind: BrushKind;
}

/** The built-in brushes, stretch first. */
export const PRESETS: readonly Preset[] = [
  { id: "taper", label: "Taper", kind: "stretch" },
  { id: "ink", label: "Ink", kind: "stretch" },
  { id: "ribbon", label: "Ribbon", kind: "stretch" },
  { id: "bristle", label: "Bristle", kind: "stretch" },
  { id: "dots", label: "Dots", kind: "scatter" },
  { id: "stars", label: "Stars", kind: "scatter" },
  { id: "confetti", label: "Confetti", kind: "scatter" },
  { id: "leaves", label: "Leaves", kind: "scatter" },
];

/** The most copies a scatter brush makes along a whole path. */
export const MAX_COPIES = 5_000;
const STRETCH_STEPS = 512;
const MAX_STRETCH_STEPS = 65_536;

export interface Brush {
  preset: string;
  /** Scatter: distance between copies, in stroke weights. */
  spacing: number;
  /** Scatter: how much copies vary in size, 0..1. */
  sizeJitter: number;
  /** Scatter: how far copies turn from the path's direction, 0..1 (1: up to half a turn). */
  rotationJitter: number;
  /** Scatter: how far copies stray from the path, in stroke weights, 0..4. */
  scatter: number;
  seed: number;
}

export const DEFAULT_BRUSH: Brush = { preset: "taper", spacing: 1.5, sizeJitter: 0, rotationJitter: 0, scatter: 0, seed: 0 };

export const preset = (id: string): Preset | undefined => PRESETS.find((p) => p.id === id);

const clamp = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

/** A brush's values made safe (FigCraft `Brush::sanitized`). */
export function sanitizeBrush(b: Partial<Brush>): Brush {
  return {
    preset: typeof b.preset === "string" && preset(b.preset) ? b.preset : DEFAULT_BRUSH.preset,
    spacing: clamp(b.spacing, DEFAULT_BRUSH.spacing, 0, 100),
    sizeJitter: clamp(b.sizeJitter, 0, 0, 1),
    rotationJitter: clamp(b.rotationJitter, 0, 0, 1),
    scatter: clamp(b.scatter, 0, 0, 4),
    seed: Math.floor(clamp(b.seed, 0, 0, 4_294_967_295)),
  };
}

/** A brush stored as JSON (`stroke.brush`), or null. */
export function parseBrush(json: unknown): Brush | null {
  if (typeof json !== "string" || !json || json.length > 2000) return null;
  try {
    const v = JSON.parse(json) as Partial<Brush>;
    return v && typeof v.preset === "string" && preset(v.preset) ? sanitizeBrush(v) : null;
  } catch {
    return null;
  }
}

/** A closed band from x 0 to 1 between edges `f(x) = [top, bottom]`, as a polygon. */
function band(f: (x: number) => [number, number]): Pt[] {
  const N = 64;
  const xs = Array.from({ length: N + 1 }, (_, i) => i / N);
  return [...xs.map((x) => ({ x, y: f(x)[0] })), ...[...xs].reverse().map((x) => ({ x, y: f(x)[1] }))];
}

/** A closed cubic outline sampled as a polygon. */
function cubics(segs: [Pt, Pt, Pt, Pt][]): Pt[] {
  const out: Pt[] = [];
  for (const [a, b, c, d] of segs) for (let i = 0; i < 32; i++) out.push(cubicEval({ p0: a, p1: b, p2: c, p3: d }, i / 32));
  return out;
}

/**
 * A preset's shape, as closed polygons: stretch shapes span x 0..1 along the path and y −0.5..0.5 across it (one
 * stroke weight); scatter shapes are about one unit wide, centred on the origin, pointing along x.
 */
function shape(id: string): Pt[][] | null {
  const PI = Math.PI;
  switch (id) {
    case "taper":
      return [cubics([[{ x: 0, y: 0 }, { x: 0.3, y: -0.5 }, { x: 0.7, y: -0.5 }, { x: 1, y: 0 }], [{ x: 1, y: 0 }, { x: 0.7, y: 0.5 }, { x: 0.3, y: 0.5 }, { x: 0, y: 0 }]])];
    case "ink":
      // a blunt start, uneven edges and a long tail
      return [
        band((x) => {
          const w = Math.min(x / 0.04, 1) * Math.min((1 - x) / 0.3, 1);
          return [-0.5 * w + 0.04 * Math.sin(9 * PI * x) * w, 0.45 * w + 0.04 * Math.sin(13 * PI * x + 1) * w];
        }),
      ];
    case "ribbon":
      // edges that cross three times: a twisting ribbon
      return [
        band((x) => {
          const c = 0.5 * Math.cos(3 * PI * x);
          return [-c, c];
        }),
      ];
    case "bristle":
      // four thin strands with ragged ends
      return [0, 1, 2, 3].map((k) => {
        const y = -0.375 + 0.25 * k;
        const x0 = 0.03 * k;
        const x1 = 1 - 0.04 * (3 - k);
        return band((x) => {
          const u = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
          const h = 0.09 * Math.sqrt(Math.max(0, Math.sin(PI * u)));
          return [y - h, y + h];
        });
      });
    case "dots":
      return [Array.from({ length: 32 }, (_, i) => ({ x: 0.5 * Math.cos((i / 32) * 2 * PI), y: 0.5 * Math.sin((i / 32) * 2 * PI) }))];
    case "stars":
      return [starPoints(1, 1, 5, 0.4).map((q) => ({ x: q.x - 0.5, y: q.y - 0.5 }))];
    case "confetti":
      return [[{ x: -0.3, y: -0.3 }, { x: 0.3, y: -0.3 }, { x: 0.3, y: 0.3 }, { x: -0.3, y: 0.3 }]];
    case "leaves":
      return [cubics([[{ x: -0.5, y: 0 }, { x: -0.2, y: -0.3 }, { x: 0.2, y: -0.3 }, { x: 0.5, y: 0 }], [{ x: 0.5, y: 0 }, { x: 0.2, y: 0.3 }, { x: -0.2, y: 0.3 }, { x: -0.5, y: 0 }]])];
    default:
      return null;
  }
}

/** A repeatable pseudo-random number in 0..1 for copy `i`, channel `k` (splitmix64, in 64-bit integers). */
const B = (s: string) => BigInt(s);
const M64 = B("18446744073709551615");
const [K1, K2, K3, K4] = ["0x9e3779b97f4a7c15", "0xd1b54a32d192ed03", "0xbf58476d1ce4e5b9", "0x94d049bb133111eb"].map(B);
const [S30, S27, S31, S11] = [30, 27, 31, 11].map((n) => B(String(n)));

export function rand(seed: number, i: number, k: number): number {
  let z = (B(String(seed >>> 0)) ^ ((B(String(i)) * K1) & M64) ^ ((B(String(k)) * K2) & M64)) & M64;
  z = ((z ^ (z >> S30)) * K3) & M64;
  z = ((z ^ (z >> S27)) * K4) & M64;
  z ^= z >> S31;
  return Number(z >> S11) / 2 ** 53;
}

/**
 * The stroke of `path` drawn with `brush` at `width` (a width profile, if any, scales it along each subpath). Null for
 * an unknown preset or a path too long to measure.
 */
export function brushOutline(path: BezPath, width: number, brush: Brush, profile?: readonly WidthPoint[] | null): BezPath | null {
  const p = preset(brush.preset);
  const unit = p ? shape(p.id) : null;
  const lines = polylines(path);
  if (!p || !unit || !lines || lines.length === 0) return null;
  const scale = (t: number) => width * (profile && profile.length > 0 ? scaleAt(profile, t) : 1);
  const out = new BezPath();
  if (p.kind === "stretch") {
    const steps = Math.min(STRETCH_STEPS, Math.max(8, Math.floor(MAX_STRETCH_STEPS / lines.length)));
    for (const line of lines) stretch(out, unit, line, steps, scale);
  } else scatter(out, unit, lines, width, sanitizeBrush(brush), scale);
  return out;
}

/** `unit` bent along `line`: x by length (in short steps, so it bends), y across at the scaled width. */
function stretch(out: BezPath, unit: Pt[][], line: Polyline, steps: number, scale: (t: number) => number) {
  const map = (q: Pt) => {
    const at = line.at(q.x);
    return at ? { x: at.point.x + at.normal.x * q.y * scale(q.x), y: at.point.y + at.normal.y * q.y * scale(q.x) } : null;
  };
  for (const poly of unit) {
    let started = false;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i === 0 ? poly.length - 1 : i - 1];
      const b = poly[i];
      const n = i === 0 ? 1 : Math.min(steps, Math.max(1, Math.ceil(Math.abs(b.x - a.x) * steps)));
      for (let k = 1; k <= n; k++) {
        const q = i === 0 ? b : { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n };
        const m = map(q);
        if (!m) continue;
        if (!started) {
          out.moveTo(m);
          started = true;
        } else out.lineTo(m);
      }
    }
    if (started) out.closePath();
  }
}

/** Copies of `unit` along `lines`, `brush.spacing` weights apart, jittered. */
function scatter(out: BezPath, unit: Pt[][], lines: Polyline[], width: number, b: Brush, scale: (t: number) => number) {
  const total = lines.reduce((s, l) => s + l.length(), 0);
  const step = Math.max(b.spacing * width, total / MAX_COPIES, 1e-3);
  let i = 0;
  for (const line of lines) {
    const len = line.length();
    for (let s = step / 2; s < len; s += step) {
      const t = s / len;
      const at = line.at(t);
      if (at) {
        const r = (k: number) => rand(b.seed, i, k) * 2 - 1;
        const size = scale(t) * Math.max(1 + b.sizeJitter * r(0), 0.05);
        const angle = Math.atan2(-at.normal.x, at.normal.y) + b.rotationJitter * Math.PI * r(1);
        const off = b.scatter * width * r(2);
        const cx = at.point.x + at.normal.x * off;
        const cy = at.point.y + at.normal.y * off;
        const cos = Math.cos(angle) * size;
        const sin = Math.sin(angle) * size;
        for (const poly of unit) {
          poly.forEach((q, j) => {
            const m = { x: cx + q.x * cos - q.y * sin, y: cy + q.x * sin + q.y * cos };
            if (j === 0) out.moveTo(m);
            else out.lineTo(m);
          });
          out.closePath();
        }
      }
      i++;
    }
  }
}
