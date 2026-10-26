/**
 * ============================================================================
 * VECTOR NETWORKS (FigCraft port, F4)
 * ============================================================================
 * Figma-style vector networks: vertices joined by curved segments, any number of segments meeting at a vertex (not
 * just a chain), and filled regions made of closed loops of segments, each with its own fill rule. A vertex can carry
 * a corner radius, handle mirroring, and a stroke cap and join of its own.
 *
 * - `fromPoints` / `fromPath` build a network; `fillPath` / `strokePath` / `strokeRuns` draw it (rounded vertices
 *   drawn in); `regionPath`, `regionAt`, `regionPoints` treat regions as areas.
 * - `faces` finds the closed areas between segments by a half-edge walk of the planar graph; `paint` is the paint
 *   bucket: it fills or unfills the face under a point.
 *
 * Networks are plain JSON (stored on an `svgPath` layer as `svg.network`); functions return new networks rather than
 * changing their input.
 *
 * Translated from FigCraft (`crates/doc/src/vector.rs`, `vector_regions.rs`, `vector_faces.rs`), commit 6ea44e9.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 * ============================================================================
 */

import { BezPath, cubicArclen, cubicDeriv, cubicEval, cubicInvArclen, cubicReverse, cubicSubsegment, dot, hypot, scale, sub, add, type Cubic, type Pt } from "../geometry/bezpath";
import { polylines, winding as pathWinding } from "../geometry/measure";
import type { StrokeCap, StrokeJoin } from "./strokes";

export type HandleMirroring = "none" | "angle" | "angleAndLength";
export type WindingRule = "nonzero" | "evenodd";

export interface Vertex {
  x: number;
  y: number;
  /** Corner radius, 0 sharp. */
  radius?: number;
  /** Handle mirroring; absent infers it from the handles. */
  mirror?: HandleMirroring;
  /** The cap where a stroke ends here; absent takes the layer's. */
  cap?: StrokeCap;
  /** The join where the stroke turns here; absent takes the layer's. */
  join?: StrokeJoin;
}

/** A segment from vertex `a` to `b`, with tangent handles relative to each end. */
export interface NetSegment {
  a: number;
  b: number;
  ta: [number, number];
  tb: [number, number];
}

export interface Region {
  loops: number[][];
  winding: WindingRule;
}

export interface VectorNetwork {
  vertices: Vertex[];
  segments: NetSegment[];
  regions: Region[];
}

export const emptyNetwork = (): VectorNetwork => ({ vertices: [], segments: [], regions: [] });
export const vertex = (x: number, y: number): Vertex => ({ x, y });
export const lineSeg = (a: number, b: number): NetSegment => ({ a, b, ta: [0, 0], tb: [0, 0] });
const isStraight = (s: NetSegment) => s.ta[0] === 0 && s.ta[1] === 0 && s.tb[0] === 0 && s.tb[1] === 0;
const vpt = (v: Vertex): Pt => ({ x: v.x, y: v.y });
const clone = (n: VectorNetwork): VectorNetwork => ({
  vertices: n.vertices.map((v) => ({ ...v })),
  segments: n.segments.map((s) => ({ a: s.a, b: s.b, ta: [s.ta[0], s.ta[1]], tb: [s.tb[0], s.tb[1]] })),
  regions: n.regions.map((r) => ({ loops: r.loops.map((l) => [...l]), winding: r.winding })),
});

/** A network from a polyline or polygon (a closed one gets a filled region). */
export function fromPoints(points: readonly Pt[], closed: boolean): VectorNetwork {
  const vertices = points.map((p) => vertex(p.x, p.y));
  const n = vertices.length;
  const segments: NetSegment[] = [];
  for (let i = 1; i < n; i++) segments.push(lineSeg(i - 1, i));
  const regions: Region[] = [];
  if (closed && n > 2) {
    segments.push(lineSeg(n - 1, 0));
    regions.push({ loops: [segments.map((_, i) => i)], winding: "nonzero" });
  }
  return { vertices, segments, regions };
}

/** A network from a bezier path: each subpath a chain; closed subpaths (or ones ending on their start) a loop of one region. */
export function fromPath(path: BezPath): VectorNetwork {
  const net = emptyNetwork();
  let loopSegs: number[] = [];
  let firstV: number | null = null;
  let curV: number | null = null;
  const allLoops: number[][] = [];
  const pushV = (p: Pt) => {
    net.vertices.push(vertex(p.x, p.y));
    return net.vertices.length - 1;
  };
  const redirectLast = (from: number, to: number) => {
    const s = net.segments[loopSegs[loopSegs.length - 1]];
    if (s && s.b === from) s.b = to;
  };
  const closeOpen = () => {
    if (curV === null || firstV === null) return;
    const pa = net.vertices[curV];
    const pf = net.vertices[firstV];
    if (!pa || !pf || curV === firstV || loopSegs.length < 2 || hypot(sub(vpt(pa), vpt(pf))) > 1e-6 || curV + 1 !== net.vertices.length) return;
    redirectLast(curV, firstV);
    net.vertices.pop();
    allLoops.push(loopSegs);
    loopSegs = [];
  };
  for (const el of path.els) {
    switch (el.t) {
      case "M": {
        closeOpen();
        loopSegs = [];
        const v = pushV(el.p);
        firstV = v;
        curV = v;
        break;
      }
      case "L": {
        if (curV === null) break;
        const b = pushV(el.p);
        net.segments.push(lineSeg(curV, b));
        loopSegs.push(net.segments.length - 1);
        curV = b;
        break;
      }
      case "Q":
      case "C": {
        if (curV === null) break;
        const pa = vpt(net.vertices[curV]);
        const end = el.t === "Q" ? el.p2 : el.p3;
        const c1 = el.t === "Q" ? add(pa, scale(sub(el.p1, pa), 2 / 3)) : el.p1;
        const c2 = el.t === "Q" ? add(end, scale(sub(el.p1, end), 2 / 3)) : el.p2;
        const b = pushV(end);
        net.segments.push({ a: curV, b, ta: [c1.x - pa.x, c1.y - pa.y], tb: [c2.x - end.x, c2.y - end.y] });
        loopSegs.push(net.segments.length - 1);
        curV = b;
        break;
      }
      case "Z": {
        if (curV === null || firstV === null) break;
        const same = hypot(sub(vpt(net.vertices[curV]), vpt(net.vertices[firstV]))) <= 1e-6;
        if (same && curV !== firstV) {
          redirectLast(curV, firstV);
          if (curV + 1 === net.vertices.length) net.vertices.pop();
        } else if (curV !== firstV) {
          net.segments.push(lineSeg(curV, firstV));
          loopSegs.push(net.segments.length - 1);
        }
        if (loopSegs.length) {
          allLoops.push(loopSegs);
          loopSegs = [];
        }
        curV = firstV;
        break;
      }
    }
  }
  closeOpen();
  if (allLoops.length) net.regions.push({ loops: allLoops, winding: "nonzero" });
  return net;
}

/** Segments touching vertex `v`: [segment index, whether `v` is its `a` end]. */
export function incident(net: VectorNetwork, v: number): [number, boolean][] {
  const out: [number, boolean][] = [];
  net.segments.forEach((s, i) => {
    if (s.a === v) out.push([i, true]);
    else if (s.b === v) out.push([i, false]);
  });
  return out;
}

/** The handle (relative to its vertex) at one end of a segment. */
export const handle = (net: VectorNetwork, seg: number, start: boolean): [number, number] | null => {
  const s = net.segments[seg];
  return s ? (start ? s.ta : s.tb) : null;
};

/** A vertex's handle mirroring: its own setting, else inferred from its two handles. */
export function mirroring(net: VectorNetwork, v: number): HandleMirroring {
  const own = net.vertices[v]?.mirror;
  if (own) return own;
  const inc = incident(net, v);
  if (inc.length !== 2) return "none";
  const h1 = handle(net, inc[0][0], inc[0][1]);
  const h2 = handle(net, inc[1][0], inc[1][1]);
  if (!h1 || !h2) return "none";
  const l1 = Math.hypot(h1[0], h1[1]);
  const l2 = Math.hypot(h2[0], h2[1]);
  if (l1 < 1e-9 || l2 < 1e-9) return "none";
  const cr = (h1[0] * h2[1] - h1[1] * h2[0]) / (l1 * l2);
  const dt = (h1[0] * h2[0] + h1[1] * h2[1]) / (l1 * l2);
  if (Math.abs(cr) > 1e-3 || dt > -0.999) return "none";
  return Math.abs(l1 - l2) <= 1e-6 * Math.max(l1, l2, 1) ? "angleAndLength" : "angle";
}

function segPoints(net: VectorNetwork, s: NetSegment): Cubic | null {
  const a = net.vertices[s.a];
  const b = net.vertices[s.b];
  if (!a || !b) return null;
  return { p0: vpt(a), p1: { x: a.x + s.ta[0], y: a.y + s.ta[1] }, p2: { x: b.x + s.tb[0], y: b.y + s.tb[1] }, p3: vpt(b) };
}

/** Segment `i` as a cubic. */
export const cubicOf = (net: VectorNetwork, i: number): Cubic | null => (net.segments[i] ? segPoints(net, net.segments[i]) : null);

function pushSeg(net: VectorNetwork, path: BezPath, s: NetSegment, reversed: boolean): void {
  const c = segPoints(net, s);
  if (!c) return;
  const q = reversed ? cubicReverse(c) : c;
  if (isStraight(s)) path.lineTo(q.p3);
  else path.curveTo(q.p1, q.p2, q.p3);
}

function appendLoop(net: VectorNetwork, path: BezPath, lp: readonly number[]): void {
  const segs = lp.map((i) => net.segments[i]).filter((s): s is NetSegment => !!s);
  const first = segs[0];
  if (!first) return;
  const second = segs[1];
  const startV = second && (first.a === second.a || first.a === second.b) ? first.b : first.a;
  const start = net.vertices[startV];
  if (!start) return;
  path.moveTo(vpt(start));
  let cur = startV;
  for (const s of segs) {
    if (s.a === cur) {
      pushSeg(net, path, s, false);
      cur = s.b;
    } else {
      pushSeg(net, path, s, true);
      cur = s.a;
    }
  }
  path.closePath();
}

/** One closed loop of segments as a path. */
export function loopPath(net: VectorNetwork, lp: readonly number[]): BezPath {
  const p = new BezPath();
  appendLoop(net, p, lp);
  return p;
}

/** The direction a curve leaves its start in. */
function startDir(c: Cubic): Pt | null {
  for (const d of [sub(c.p1, c.p0), sub(c.p2, c.p0), sub(c.p3, c.p0)]) {
    const l = hypot(d);
    if (l > 1e-9) return scale(d, 1 / l);
  }
  return null;
}
const isLine = (c: Cubic) => c.p1.x === c.p0.x && c.p1.y === c.p0.y && c.p2.x === c.p3.x && c.p2.y === c.p3.y;
const lengthOf = (c: Cubic) => (isLine(c) ? hypot(sub(c.p3, c.p0)) : cubicArclen(c, 1e-6));

/** The point `t` along `c` (which is `len` long), the unit direction back toward the start there, and its parameter. */
function trim(c: Cubic, t: number, len: number): [Pt, Pt, number] {
  if (isLine(c)) {
    const u = scale(sub(c.p3, c.p0), 1 / len);
    return [add(c.p0, scale(u, t)), scale(u, -1), t / len];
  }
  const k = Math.min(1, Math.max(0, cubicInvArclen(c, t, 1e-6)));
  const d = cubicDeriv(c, k);
  const dl = hypot(d);
  const sd = startDir(c);
  const back = dl > 1e-9 ? scale(d, -1 / dl) : sd ? scale(sd, -1) : { x: 0, y: 0 };
  return [cubicEval(c, k), back, k];
}

interface Corner {
  v: number;
  s1: number;
  s1AtA: boolean;
  s2: number;
  s2AtA: boolean;
  a: Pt;
  b: Pt;
  ta: [number, number];
  tb: [number, number];
  cut1: number;
  cut2: number;
}

function cornerOf(net: VectorNetwork, v: number, inc: readonly [number, boolean][]): Corner | null {
  const r = net.vertices[v]?.radius ?? 0;
  if (inc.length !== 2) return null;
  const [[s1, a1], [s2, a2]] = inc;
  if (!(r > 0 && Number.isFinite(r)) || s1 === s2) return null;
  const c1raw = cubicOf(net, s1);
  const c2raw = cubicOf(net, s2);
  if (!c1raw || !c2raw) return null;
  const c1 = a1 ? c1raw : cubicReverse(c1raw);
  const c2 = a2 ? c2raw : cubicReverse(c2raw);
  const u1 = startDir(c1);
  const u2 = startDir(c2);
  if (!u1 || !u2) return null;
  const angle = Math.acos(Math.min(1, Math.max(-1, dot(u1, u2))));
  if (angle < 1e-6 || Math.PI - angle < 1e-6) return null;
  const l1 = lengthOf(c1);
  const l2 = lengthOf(c2);
  if (!(l1 > 1e-9 && l2 > 1e-9)) return null;
  const t = Math.min(r / Math.tan(angle / 2), Math.min(l1, l2) / 2);
  const [a, d1, k1] = trim(c1, t, l1);
  const [b, d2, k2] = trim(c2, t, l2);
  // a cubic arc: handles 4/3·tan(φ/4)·ρ along each end's direction, ρ the radius of the circle through both ends
  const turn = Math.acos(Math.min(1, Math.max(-1, -dot(d1, d2))));
  const chord = hypot(sub(b, a));
  const k = turn < 1e-9 ? chord / 3 : (((4 / 3) * Math.tan(turn / 4)) * chord) / (2 * Math.sin(turn / 2));
  if (![k, a.x, a.y, b.x, b.y].every(Number.isFinite)) return null;
  const own = (atA: boolean, x: number) => (atA ? x : 1 - x);
  return { v, s1, s1AtA: a1, s2, s2AtA: a2, a, b, ta: [d1.x * k, d1.y * k], tb: [d2.x * k, d2.y * k], cut1: own(a1, k1), cut2: own(a2, k2) };
}

/**
 * The network with its rounded vertices drawn in: each sharp vertex with a radius becomes an arc between its two
 * segments (shrunk to fit in half of each). A curved segment is cut where the arc meets it and keeps the rest of its
 * curve. Null when no vertex is rounded.
 */
export function rounded(net: VectorNetwork): VectorNetwork | null {
  if (!net.vertices.some((v) => (v.radius ?? 0) > 0)) return null;
  const inc: [number, boolean][][] = net.vertices.map(() => []);
  net.segments.forEach((s, i) => {
    inc[s.a]?.push([i, true]);
    inc[s.b]?.push([i, false]);
  });
  const corners = net.vertices.map((_, v) => cornerOf(net, v, inc[v] ?? [])).filter((c): c is Corner => c !== null);
  const out = clone(net);
  for (const v of out.vertices) v.radius = 0;
  const cuts: [number, number][] = net.segments.map(() => [0, 1]);
  for (const c of corners) {
    for (const [s, atA, t] of [[c.s1, c.s1AtA, c.cut1], [c.s2, c.s2AtA, c.cut2]] as const) {
      const k = cuts[s];
      if (!k) continue;
      if (atA) k[0] = t;
      else k[1] = t;
    }
  }
  cuts.forEach(([t0, t1], i) => {
    const c = cubicOf(net, i);
    const s = out.segments[i];
    if (!c || !s || (t0 === 0 && t1 === 1) || isStraight(s)) return;
    const q = cubicSubsegment(c, t0, t1);
    s.ta = [q.p1.x - q.p0.x, q.p1.y - q.p0.y];
    s.tb = [q.p2.x - q.p3.x, q.p2.y - q.p3.y];
  });
  const byVertex = new Map<number, number>();
  for (const c of corners) {
    const v = out.vertices[c.v];
    if (v) {
      v.x = c.a.x;
      v.y = c.a.y;
    }
    out.vertices.push(vertex(c.b.x, c.b.y));
    const nb = out.vertices.length - 1;
    const s2 = out.segments[c.s2];
    if (s2) {
      if (c.s2AtA) s2.a = nb;
      else s2.b = nb;
    }
    out.segments.push({ a: c.v, b: nb, ta: c.ta, tb: c.tb });
    byVertex.set(c.v, out.segments.length - 1);
  }
  // the arc goes between the two segments wherever a loop walks through the vertex
  for (const r of out.regions) {
    r.loops = r.loops.map((lp) => {
      const first = net.segments[lp[0]];
      if (!first) return lp;
      const second = lp[1] !== undefined ? net.segments[lp[1]] : undefined;
      let cur = second && (first.a === second.a || first.a === second.b) ? first.b : first.a;
      const rebuilt: number[] = [];
      for (const x of lp) {
        rebuilt.push(x);
        const s = net.segments[x];
        if (!s) continue;
        cur = s.a === cur ? s.b : s.a;
        const arc = byVertex.get(cur);
        if (arc !== undefined) rebuilt.push(arc);
      }
      return rebuilt;
    });
  }
  return out;
}

/** The unit direction a segment leaves its `a` end (atA) or its `b` end in. */
export function tangentOut(net: VectorNetwork, seg: number, atA: boolean): Pt | null {
  const c = cubicOf(net, seg);
  return c ? startDir(atA ? c : cubicReverse(c)) : null;
}

/** Whether any vertex has a cap of its own or a join other than the layer's. */
export const hasPointStyles = (net: VectorNetwork, layerJoin: StrokeJoin): boolean => net.vertices.some((v) => v.cap !== undefined || (v.join !== undefined && v.join !== layerJoin));

/** The fill path: every region's loops (rounded vertices drawn in). */
export function fillPath(net: VectorNetwork): BezPath {
  const r = rounded(net);
  if (r) return fillPath(r);
  const p = new BezPath();
  for (const region of net.regions) for (const lp of region.loops) appendLoop(net, p, lp);
  return p;
}

/** The fill rule the whole network renders with: even-odd when any region asks for it. */
export const fillRule = (net: VectorNetwork): WindingRule => (net.regions.some((r) => r.winding === "evenodd") ? "evenodd" : "nonzero");

/** Whether the rendered fill covers `p`. */
export function fillContains(net: VectorNetwork, p: Pt): boolean {
  const w = pathWinding(fillPath(net), p);
  return fillRule(net) === "evenodd" ? w % 2 !== 0 : w !== 0;
}

/** A run of the stroke: its path and the vertices it starts and ends at (the same when closed). */
export interface StrokeRun {
  path: BezPath;
  start: number;
  end: number;
  closed: boolean;
}

function runs(net: VectorNetwork, breaks: (v: number) => boolean): StrokeRun[] {
  const out: StrokeRun[] = [];
  const used = net.segments.map(() => false);
  const degrees = net.vertices.map(() => 0);
  for (const s of net.segments) {
    if (s.a < degrees.length) degrees[s.a]++;
    if (s.b < degrees.length) degrees[s.b]++;
  }
  const adjacent: [number, boolean][][] = net.vertices.map(() => []);
  net.segments.forEach((s, i) => {
    adjacent[s.a]?.push([i, false]);
    if (s.b !== s.a) adjacent[s.b]?.push([i, true]);
  });
  const cursor = net.vertices.map(() => 0);
  let remaining = net.segments.length;
  const nextFrom = (v: number): [number, boolean] | null => {
    const list = adjacent[v];
    if (!list) return null;
    while (cursor[v] < list.length) {
      const e = list[cursor[v]];
      if (!used[e[0]]) return e;
      cursor[v]++;
    }
    return null;
  };
  const stop = (v: number) => (degrees[v] ?? 0) !== 2 || breaks(v);
  const starts = [...net.vertices.keys()].filter(stop).concat([...net.vertices.keys()].filter((v) => !stop(v)));
  for (const v0 of starts) {
    if (remaining === 0) break;
    let e = nextFrom(v0);
    while (e) {
      const start = net.vertices[v0];
      if (!start) break;
      const path = new BezPath().moveTo(vpt(start));
      let cur = v0;
      let closed = false;
      let seg: [number, boolean] | null = e;
      while (seg) {
        const [i, r] = seg;
        if (!used[i]) {
          used[i] = true;
          remaining--;
        }
        const s = net.segments[i];
        if (!s) break;
        pushSeg(net, path, s, r);
        cur = r ? s.a : s.b;
        if (cur === v0 && !breaks(v0)) {
          path.closePath();
          closed = true;
          break;
        }
        seg = stop(cur) ? null : nextFrom(cur);
      }
      out.push({ path, start: v0, end: cur, closed });
      e = nextFrom(v0);
    }
  }
  return out;
}

/** The stroke path: segments chained into maximal runs (degree-2 vertices continue a run); closed loops come out closed. */
export function strokePath(net: VectorNetwork): BezPath {
  const r = rounded(net);
  if (r) return strokePath(r);
  const p = new BezPath();
  for (const run of runs(net, () => false)) p.extend(run.path);
  return p;
}

/** The stroke as runs for vertices with caps and joins of their own: a run also breaks at a vertex with a join of its own. */
export function strokeRuns(net: VectorNetwork): StrokeRun[] {
  const r = rounded(net);
  if (r) return strokeRuns(r);
  return runs(net, (v) => net.vertices[v]?.join !== undefined);
}

/** Scales every vertex and handle (when the layer is resized). */
export function scaleNetwork(net: VectorNetwork, sx: number, sy: number): VectorNetwork {
  const out = clone(net);
  for (const v of out.vertices) {
    v.x *= sx;
    v.y *= sy;
  }
  for (const s of out.segments) {
    s.ta = [s.ta[0] * sx, s.ta[1] * sy];
    s.tb = [s.tb[0] * sx, s.tb[1] * sy];
  }
  return out;
}

export function translateNetwork(net: VectorNetwork, dx: number, dy: number): VectorNetwork {
  const out = clone(net);
  for (const v of out.vertices) {
    v.x += dx;
    v.y += dy;
  }
  return out;
}

/** Removes segments that reference missing vertices, and loops that reference missing segments (renumbered). */
export function sanitizeNetwork(net: VectorNetwork): VectorNetwork {
  const out = clone(net);
  const nv = out.vertices.length;
  const keep = out.segments.map((s) => s.a < nv && s.b < nv && s.a >= 0 && s.b >= 0);
  if (keep.every(Boolean)) {
    const ns = out.segments.length;
    for (const r of out.regions) r.loops = r.loops.filter((l) => l.every((i) => i >= 0 && i < ns));
    return out;
  }
  const remap = out.segments.map(() => -1);
  const segs: NetSegment[] = [];
  out.segments.forEach((s, i) => {
    if (keep[i]) {
      remap[i] = segs.length;
      segs.push(s);
    }
  });
  out.segments = segs;
  for (const r of out.regions) r.loops = r.loops.filter((l) => l.every((i) => remap[i] !== undefined && remap[i] !== -1)).map((l) => l.map((i) => remap[i]));
  return out;
}

// ---------------------------------------------------------------------------
// Regions as areas (vector_regions.rs)
// ---------------------------------------------------------------------------

/** A loop walked as a ring: each existing segment with whether it is walked backwards (b → a). */
export function loopWalk(net: VectorNetwork, lp: readonly number[]): [number, boolean][] {
  const existing = lp.map((i) => net.segments[i]).filter((s): s is NetSegment => !!s);
  const first = existing[0];
  if (!first) return [];
  const second = existing[1];
  const forwardFirst = second ? first.b === second.a || first.b === second.b : true;
  let cur = forwardFirst ? first.a : first.b;
  const out: [number, boolean][] = [];
  for (const i of lp) {
    const s = net.segments[i];
    if (!s) continue;
    if (s.a === cur) {
      out.push([i, false]);
      cur = s.b;
    } else if (s.b === cur) {
      out.push([i, true]);
      cur = s.a;
    } else {
      out.push([i, false]);
      cur = s.b;
    }
  }
  return out;
}

/** Region `r`'s outline: each loop one closed contour. Null when there is no such region or nothing of it remains. */
export function regionPath(net: VectorNetwork, r: number): BezPath | null {
  const region = net.regions[r];
  if (!region) return null;
  const path = new BezPath();
  for (const lp of region.loops) {
    let open = false;
    let at: Pt = { x: 0, y: 0 };
    for (const [i, back] of loopWalk(net, lp)) {
      const s = net.segments[i];
      const c = s ? segPoints(net, s) : null;
      if (!s || !c) continue;
      const q = back ? cubicReverse(c) : c;
      if (!open) {
        path.moveTo(q.p0);
        open = true;
      } else if (q.p0.x !== at.x || q.p0.y !== at.y) {
        path.lineTo(q.p0);
      }
      if (isStraight(s)) path.lineTo(q.p3);
      else path.curveTo(q.p1, q.p2, q.p3);
      at = q.p3;
    }
    if (open) path.closePath();
  }
  return path.isEmpty() ? null : path;
}

/** The winding of `p` about region `r`'s loops; null when there is no such region. */
export function regionWinding(net: VectorNetwork, r: number, p: Pt): number | null {
  if (!net.regions[r]) return null;
  const path = regionPath(net, r);
  return path ? pathWinding(path, p) : 0;
}

/** Whether `p` is inside region `r` by the region's own fill rule. */
export function regionContains(net: VectorNetwork, r: number, p: Pt): boolean {
  const region = net.regions[r];
  const w = regionWinding(net, r, p);
  if (!region || w === null) return false;
  return region.winding === "nonzero" ? w !== 0 : w % 2 !== 0;
}

/** The region under `p`: the last one listed that contains it. */
export function regionAt(net: VectorNetwork, p: Pt): number | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  for (let r = net.regions.length - 1; r >= 0; r--) if (regionContains(net, r, p)) return r;
  return null;
}

/** Every vertex on region `r`'s loops, each once, sorted. */
export function regionPoints(net: VectorNetwork, r: number): number[] {
  const region = net.regions[r];
  if (!region) return [];
  const out = new Set<number>();
  for (const i of region.loops.flat()) {
    const s = net.segments[i];
    if (!s) continue;
    for (const v of [s.a, s.b]) if (v < net.vertices.length) out.add(v);
  }
  return [...out].sort((a, b) => a - b);
}

/** A fingerprint of the topology: moving vertices or handles keeps it; adding, removing or reordering segments, regions or loops changes it. */
export function topologyKey(net: VectorNetwork): string {
  return JSON.stringify([net.segments.map((s) => [s.a, s.b]), net.regions.map((r) => r.loops)]);
}

// ---------------------------------------------------------------------------
// Faces and the paint bucket (vector_faces.rs)
// ---------------------------------------------------------------------------

const AREA_EPS = 1e-9;

/** A bounded area: its outer loop first, then the outer loops of pieces nested in it (holes). */
export interface Face {
  loops: number[][];
  area: number;
  /** All loops; fill it even-odd. */
  path: BezPath;
}

export const faceContains = (f: Face, p: Pt): boolean => pathWinding(f.path, p) % 2 !== 0;
export const faceRegion = (f: Face): Region => ({ loops: f.loops.map((l) => [...l]), winding: f.loops.length > 1 ? "evenodd" : "nonzero" });

/** A point inside a closed path under the even-odd rule: the middle of the widest span on a few scanlines. */
export function interiorPointOf(path: BezPath): Pt | null {
  const bb = path.boundingBox();
  const w = bb.x1 - bb.x0;
  const h = bb.y1 - bb.y0;
  if (!(w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h))) return null;
  const lines: [Pt, Pt][] = [];
  for (const l of polylines(path, 400_000, Math.max(w, h) * 1e-3) ?? []) {
    for (let i = 0; i + 1 < l.points.length; i++) lines.push([l.points[i], l.points[i + 1]]);
    const first = l.points[0];
    const last = l.points[l.points.length - 1];
    if (first && last && (first.x !== last.x || first.y !== last.y)) lines.push([last, first]);
  }
  let best: [number, Pt] | null = null;
  for (const k of [0.5, 0.3, 0.7, 0.15, 0.85, 0.05, 0.95]) {
    const y = bb.y0 + h * (k + 0.0001234567);
    const xs = lines
      .filter(([p, q]) => (p.y <= y && y < q.y) || (q.y <= y && y < p.y))
      .map(([p, q]) => p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const span = xs[i + 1] - xs[i];
      if (span > (best ? best[0] : 1e-9)) best = [span, { x: (xs[i] + xs[i + 1]) / 2, y }];
    }
  }
  return best ? best[1] : null;
}

interface Cycle {
  halfEdges: [number, boolean][];
  area: number;
  component: number;
}

function components(net: VectorNetwork): number[] {
  const nv = net.vertices.length;
  const parent = [...Array(nv).keys()];
  const find = (x0: number) => {
    let x = x0;
    for (let k = 0; k < nv && parent[x] !== x; k++) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (const s of net.segments) {
    if (s.a < nv && s.b < nv && s.a >= 0 && s.b >= 0) parent[find(s.a)] = find(s.b);
  }
  return [...Array(nv).keys()].map(find);
}

function halfEdgeDir(net: VectorNetwork, i: number, fwd: boolean): [number, Pt, Pt] | null {
  const s = net.segments[i];
  const c = cubicOf(net, i);
  if (!s || !c) return null;
  const origin = fwd ? s.a : s.b;
  const p0 = fwd ? c.p0 : c.p3;
  const d = fwd ? cubicDeriv(c, 0) : scale(cubicDeriv(c, 1), -1);
  const along = fwd ? sub(cubicEval(c, 0.25), c.p0) : sub(cubicEval(c, 0.75), c.p3);
  const fallback = fwd ? [sub(c.p2, p0), sub(c.p3, p0)] : [sub(c.p1, p0), sub(c.p0, p0)];
  const nominal = fwd ? { x: 1, y: 0 } : { x: -1, y: 0 };
  const dir = [d, ...fallback].find((v) => hypot(v) > 1e-9) ?? nominal;
  return [origin, dir, hypot(along) > 1e-9 ? along : dir];
}

function halfEdgePath(net: VectorNetwork, hes: readonly [number, boolean][]): BezPath {
  const p = new BezPath();
  hes.forEach(([i, fwd], k) => {
    const c0 = cubicOf(net, i);
    if (!c0) return;
    const c = fwd ? c0 : cubicReverse(c0);
    if (k === 0) p.moveTo(c.p0);
    p.curveTo(c.p1, c.p2, c.p3);
  });
  return p.closePath();
}

function cycles(net: VectorNetwork): Cycle[] {
  const n = net.segments.length;
  const nv = net.vertices.length;
  const valid = (i: number) => {
    const s = net.segments[i];
    return !!s && s.a >= 0 && s.b >= 0 && s.a < nv && s.b < nv;
  };
  const out: [number, number, number, boolean][][] = net.vertices.map(() => []);
  for (let i = 0; i < n; i++) {
    if (!valid(i)) continue;
    for (const fwd of [true, false]) {
      const d = halfEdgeDir(net, i, fwd);
      if (!d) continue;
      out[d[0]]?.push([Math.atan2(d[1].y, d[1].x), Math.atan2(d[2].y, d[2].x), i, fwd]);
    }
  }
  for (const list of out) list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const dest = (i: number, fwd: boolean) => (fwd ? net.segments[i].b : net.segments[i].a);
  const origin = (i: number, fwd: boolean) => (fwd ? net.segments[i].a : net.segments[i].b);
  const next = (i: number, fwd: boolean): [number, boolean] | null => {
    const list = out[dest(i, fwd)];
    if (!list) return null;
    const k = list.findIndex((e) => e[2] === i && e[3] !== fwd);
    if (k < 0) return null;
    const e = list[(k + list.length - 1) % list.length];
    return [e[2], e[3]];
  };
  const comp = components(net);
  const idx = (i: number, fwd: boolean) => i * 2 + (fwd ? 0 : 1);
  const seen = new Array(n * 2).fill(false);
  const result: Cycle[] = [];
  for (let i = 0; i < n; i++) {
    if (!valid(i)) continue;
    for (const fwd of [true, false]) {
      if (seen[idx(i, fwd)]) continue;
      const hes: [number, boolean][] = [];
      let cur: [number, boolean] = [i, fwd];
      let closed = false;
      for (let k = 0; k <= n * 2; k++) {
        seen[idx(cur[0], cur[1])] = true;
        hes.push(cur);
        const nx = next(cur[0], cur[1]);
        if (!nx) break;
        if (nx[0] === i && nx[1] === fwd) {
          closed = true;
          break;
        }
        if (seen[idx(nx[0], nx[1])]) break;
        cur = nx;
      }
      if (!closed) continue;
      const area = halfEdgePath(net, hes).area();
      result.push({ halfEdges: hes, area: Number.isFinite(area) ? area : 0, component: comp[origin(i, fwd)] ?? 0 });
    }
  }
  return result;
}

/** A cycle's segments as closed loops: segments walked twice (dangling paths, bridges) are dropped and the rest chained. */
function splitLoops(net: VectorNetwork, hes: readonly [number, boolean][]): number[][] {
  const count = new Map<number, number>();
  for (const [i] of hes) count.set(i, (count.get(i) ?? 0) + 1);
  const kept = hes.filter(([i]) => count.get(i) === 1);
  const ends = ([i, fwd]: [number, boolean]): [number, number] | null => {
    const s = net.segments[i];
    return s ? (fwd ? [s.a, s.b] : [s.b, s.a]) : null;
  };
  const used = kept.map(() => false);
  const loops: number[][] = [];
  for (let start = 0; start < kept.length; start++) {
    if (used[start]) continue;
    const first = kept[start];
    const e = ends(first);
    if (!e) continue;
    const [v0] = e;
    let v = e[1];
    used[start] = true;
    const lp = [first[0]];
    let pos = start;
    while (v !== v0) {
      let found = -1;
      for (let d = 1; d <= kept.length; d++) {
        const j = (pos + d) % kept.length;
        const ej = ends(kept[j]);
        if (!used[j] && ej && ej[0] === v) {
          found = j;
          break;
        }
      }
      if (found < 0) break;
      used[found] = true;
      lp.push(kept[found][0]);
      v = ends(kept[found])?.[1] ?? v0;
      pos = found;
    }
    if (v === v0) loops.push(lp);
  }
  return loops;
}

const loopsPath = (net: VectorNetwork, loops: readonly number[][]) => {
  const p = new BezPath();
  for (const lp of loops) p.extend(loopPath(net, lp));
  return p;
};

function componentPoint(net: VectorNetwork, cs: readonly Cycle[], comp: number): Pt | null {
  const c = cs.find((x) => x.component === comp);
  const he = c?.halfEdges[0];
  const s = he ? net.segments[he[0]] : undefined;
  if (!he || !s) return null;
  const v = net.vertices[he[1] ? s.a : s.b];
  return v ? vpt(v) : null;
}

/** Every bounded face of the network, holes included. */
export function faces(net: VectorNetwork): Face[] {
  const cs = cycles(net);
  const outside = new Map<number, Cycle>();
  for (const c of cs.filter((x) => x.area < -AREA_EPS)) {
    const e = outside.get(c.component);
    if (!e || c.area < e.area) outside.set(c.component, c);
  }
  const boundaries = [...outside.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([comp, c]) => {
      const loops = splitLoops(net, c.halfEdges);
      return { comp, loops, path: loopsPath(net, loops), area: -c.area };
    })
    .filter((b) => b.loops.length > 0);
  const result: Face[] = [];
  for (const c of cs.filter((x) => x.area > AREA_EPS)) {
    const loops = splitLoops(net, c.halfEdges);
    if (loops.length === 0) continue;
    const outer = loopsPath(net, loops);
    const inside = boundaries.filter((b) => b.comp !== c.component).filter((b) => {
      const p = componentPoint(net, cs, b.comp);
      return p !== null && pathWinding(outer, p) % 2 !== 0;
    });
    const face: Face = { loops, area: c.area, path: outer };
    for (const b of inside) {
      const nested = inside.some((o) => {
        if (o.comp === b.comp) return false;
        const p = componentPoint(net, cs, b.comp);
        return p !== null && pathWinding(o.path, p) % 2 !== 0;
      });
      if (nested) continue;
      face.loops.push(...b.loops.map((l) => [...l]));
      face.path.extend(b.path);
      face.area -= b.area;
    }
    result.push(face);
  }
  return result;
}

/** The smallest face containing `p`. */
export function faceAt(net: VectorNetwork, p: Pt): Face | null {
  let best: Face | null = null;
  for (const f of faces(net)) if (faceContains(f, p) && (!best || f.area < best.area)) best = f;
  return best;
}

const loopsKey = (loops: readonly number[][]) => JSON.stringify(loops.map((l) => [...l].sort((a, b) => a - b)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));

/**
 * The paint bucket: fills the face under `p`, or unfills it when filled; with `want`, the face ends up filled (true)
 * or unfilled (false) whatever it was (a bucket drag keeps doing what its first click did). Returns the new network
 * and the face's new state, or null when `p` isn't inside a closed area. Regions that aren't single faces are first
 * re-expressed as one region per filled face, so any face can be toggled on its own.
 */
export function paint(net: VectorNetwork, p: Pt, want?: boolean): { network: VectorNetwork; filled: boolean } | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  const face = faceAt(net, p);
  if (!face) return null;
  let out = clone(net);
  const all = faces(net);
  const faceKeys = all.map((f) => loopsKey(f.loops));
  if (!out.regions.every((r) => faceKeys.includes(loopsKey(r.loops)))) {
    out = { ...out, regions: all.filter((f) => {
      const q = interiorPointOf(f.path);
      return q !== null && fillContains(net, q);
    }).map(faceRegion) };
  }
  const k = loopsKey(face.loops);
  const has = out.regions.some((r) => loopsKey(r.loops) === k);
  if (has && want !== true) {
    out.regions = out.regions.filter((r) => loopsKey(r.loops) !== k);
    return { network: out, filled: false };
  }
  if (has) return { network: out, filled: true };
  if (want === false) return { network: out, filled: false };
  out.regions.push(faceRegion(face));
  return { network: out, filled: true };
}

// ---------------------------------------------------------------------------
// Stored form: `svg.network`
// ---------------------------------------------------------------------------

export const MAX_NETWORK_VERTICES = 20_000;
export const MAX_NETWORK_JSON = 2_000_000;

const finiteNum = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const pair = (v: unknown): [number, number] => (Array.isArray(v) ? [finiteNum(v[0]), finiteNum(v[1])] : [0, 0]);

/** Reads a network stored as JSON text; null when absent, malformed or too big. Damaged parts are repaired (`sanitizeNetwork`). */
export function parseNetwork(json: unknown): VectorNetwork | null {
  if (typeof json !== "string" || json === "" || json.length > MAX_NETWORK_JSON) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
  if (!o || !Array.isArray(o.vertices) || !Array.isArray(o.segments)) return null;
  if (o.vertices.length > MAX_NETWORK_VERTICES || o.segments.length > MAX_NETWORK_VERTICES * 4) return null;
  const caps = ["none", "round", "square", "lineArrow", "triangleArrow", "reversedTriangle", "circleFilled", "diamondFilled"];
  const net: VectorNetwork = {
    vertices: o.vertices.map((v) => {
      const x = typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
      const out: Vertex = { x: finiteNum(x.x), y: finiteNum(x.y) };
      const r = finiteNum(x.radius);
      if (r > 0) out.radius = Math.min(r, 1e6);
      if (x.mirror === "none" || x.mirror === "angle" || x.mirror === "angleAndLength") out.mirror = x.mirror;
      if (typeof x.cap === "string" && caps.includes(x.cap)) out.cap = x.cap as StrokeCap;
      if (x.join === "miter" || x.join === "round" || x.join === "bevel") out.join = x.join;
      return out;
    }),
    segments: o.segments.map((s) => {
      const x = typeof s === "object" && s !== null ? (s as Record<string, unknown>) : {};
      return { a: Math.trunc(finiteNum(x.a, -1)), b: Math.trunc(finiteNum(x.b, -1)), ta: pair(x.ta), tb: pair(x.tb) };
    }),
    regions: (Array.isArray(o.regions) ? o.regions : []).slice(0, 10_000).map((r) => {
      const x = typeof r === "object" && r !== null ? (r as Record<string, unknown>) : {};
      const loops = Array.isArray(x.loops) ? x.loops.filter(Array.isArray).map((l) => (l as unknown[]).map((i) => Math.trunc(finiteNum(i, -1)))) : [];
      return { loops, winding: x.winding === "evenodd" ? "evenodd" : "nonzero" } as Region;
    }),
  };
  return sanitizeNetwork(net);
}

/** The JSON for `svg.network`: compact, numbers rounded to 1/1000 px. */
export function serializeNetwork(net: VectorNetwork): string {
  const r = (n: number) => Number(n.toFixed(3));
  return JSON.stringify({
    vertices: net.vertices.map((v) => ({ x: r(v.x), y: r(v.y), ...(v.radius ? { radius: r(v.radius) } : {}), ...(v.mirror ? { mirror: v.mirror } : {}), ...(v.cap ? { cap: v.cap } : {}), ...(v.join ? { join: v.join } : {}) })),
    segments: net.segments.map((s) => ({ a: s.a, b: s.b, ...(s.ta[0] || s.ta[1] ? { ta: [r(s.ta[0]), r(s.ta[1])] } : {}), ...(s.tb[0] || s.tb[1] ? { tb: [r(s.tb[0]), r(s.tb[1])] } : {}) })),
    regions: net.regions.map((g) => ({ loops: g.loops, ...(g.winding === "evenodd" ? { winding: "evenodd" } : {}) })),
  });
}
