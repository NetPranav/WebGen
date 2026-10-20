/**
 * ============================================================================
 * FITTING A DRAWN STROKE (ROADMAP Phase 39)
 * ============================================================================
 * A pencil stroke arrives as hundreds of pointer samples. This turns it into a handful of bezier nodes: smooth the
 * jitter (`streamline`), drop the points that add nothing (`rdp`, Ramer–Douglas–Peucker), then fit cubic curves
 * through what is left (`fitCurve`, Schneider's algorithm from Graphics Gems). Every sample keeps its time and
 * pressure, and a node keeps the time of the sample it sits on, so a stroke can be replayed as it was drawn
 * (draw-to-animate, Phase 181). Pure functions, no DOM.
 * ============================================================================
 */

export interface Sample {
  x: number;
  y: number;
  /** Milliseconds since the stroke began. */
  t: number;
  /** 0 to 1 (0.5 for a mouse). */
  p: number;
}

export interface Vec {
  x: number;
  y: number;
}

/** A point of a path with its bezier handles (absolute positions; absent for a corner) and the sample it came from. */
export interface PathNode {
  x: number;
  y: number;
  hin?: Vec;
  hout?: Vec;
  t?: number;
  p?: number;
}

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const len = (a: Vec) => Math.hypot(a.x, a.y);
const norm = (a: Vec): Vec => {
  const l = len(a);
  return l < 1e-12 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};

/** Drops samples that sit on the one before (a press that didn't move twice, a repeated event). */
export function dedupe(samples: readonly Sample[], minDistance = 0.01): Sample[] {
  const out: Sample[] = [];
  for (const s of samples) {
    if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
    const last = out[out.length - 1];
    if (!last || Math.hypot(s.x - last.x, s.y - last.y) >= minDistance) out.push(s);
  }
  return out;
}

/**
 * Smooths jitter: each point becomes the average of its neighbours within `radius` samples (a triangular weight),
 * and the ends stay exactly where they are. `amount` 0 to 1 sets the radius (0 does nothing, 1 is 8 samples each way).
 */
export function streamline(samples: readonly Sample[], amount: number): Sample[] {
  const r = Math.round(Math.max(0, Math.min(1, amount)) * 8);
  if (r === 0 || samples.length < 3) return samples.map((s) => ({ ...s }));
  const out: Sample[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (i === 0 || i === samples.length - 1) {
      out.push({ ...samples[i] });
      continue;
    }
    // the window shrinks near the ends so a point is never pulled by samples on the other side of the start
    const k = Math.min(r, i, samples.length - 1 - i);
    let x = 0;
    let y = 0;
    let w = 0;
    for (let j = -k; j <= k; j++) {
      const weight = k + 1 - Math.abs(j);
      x += samples[i + j].x * weight;
      y += samples[i + j].y * weight;
      w += weight;
    }
    out.push({ ...samples[i], x: x / w, y: y / w });
  }
  return out;
}

/** Ramer–Douglas–Peucker: keeps the points that stray more than `epsilon` from the line between the ones around them. Iterative, so a long stroke can't overflow the stack. */
export function rdp(samples: readonly Sample[], epsilon: number): Sample[] {
  const n = samples.length;
  if (n < 3) return samples.map((s) => ({ ...s }));
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    let worst = -1;
    let at = -1;
    const pa = samples[a];
    const pb = samples[b];
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const l2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const d = l2 < 1e-12 ? Math.hypot(samples[i].x - pa.x, samples[i].y - pa.y) : Math.abs((samples[i].x - pa.x) * dy - (samples[i].y - pa.y) * dx) / Math.sqrt(l2);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > epsilon && at > 0) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return samples.filter((_, i) => keep[i] === 1).map((s) => ({ ...s }));
}

// ---------------------------------------------------------------------------
// Schneider's curve fitting
// ---------------------------------------------------------------------------

type Cubic = [Vec, Vec, Vec, Vec];

const bez = (c: Cubic, t: number): Vec => {
  const u = 1 - t;
  return {
    x: u * u * u * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t * t * t * c[3].x,
    y: u * u * u * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t * t * t * c[3].y,
  };
};
const bez1 = (c: Cubic, t: number): Vec => {
  const u = 1 - t;
  return add(add(mul(sub(c[1], c[0]), 3 * u * u), mul(sub(c[2], c[1]), 6 * u * t)), mul(sub(c[3], c[2]), 3 * t * t));
};
const bez2 = (c: Cubic, t: number): Vec => {
  const u = 1 - t;
  return add(mul(add(sub(c[2], mul(c[1], 2)), c[0]), 6 * u), mul(add(sub(c[3], mul(c[2], 2)), c[1]), 6 * t));
};

function chordLengths(pts: readonly Vec[]): number[] {
  const u = [0];
  for (let i = 1; i < pts.length; i++) u.push(u[i - 1] + len(sub(pts[i], pts[i - 1])));
  const total = u[u.length - 1] || 1;
  return u.map((v) => v / total);
}

function generateBezier(pts: readonly Vec[], u: readonly number[], t1: Vec, t2: Vec): Cubic {
  const n = pts.length;
  const first = pts[0];
  const last = pts[n - 1];
  const A: [Vec, Vec][] = u.map((t) => [mul(t1, 3 * (1 - t) * (1 - t) * t), mul(t2, 3 * (1 - t) * t * t)]);
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let i = 0; i < n; i++) {
    c00 += dot(A[i][0], A[i][0]);
    c01 += dot(A[i][0], A[i][1]);
    c11 += dot(A[i][1], A[i][1]);
    const t = u[i];
    const tmp = sub(pts[i], add(add(mul(first, (1 - t) ** 3), mul(first, 3 * (1 - t) ** 2 * t)), add(mul(last, 3 * (1 - t) * t * t), mul(last, t ** 3))));
    x0 += dot(A[i][0], tmp);
    x1 += dot(A[i][1], tmp);
  }
  const det = c00 * c11 - c01 * c01;
  const alpha1 = Math.abs(det) > 1e-12 ? (x0 * c11 - x1 * c01) / det : 0;
  const alpha2 = Math.abs(det) > 1e-12 ? (c00 * x1 - c01 * x0) / det : 0;
  const seg = len(sub(last, first));
  const eps = 1e-6 * seg;
  // a handle that came out negative, or tiny, would fold the curve back: fall back to a third of the chord
  if (alpha1 < eps || alpha2 < eps) return [first, add(first, mul(t1, seg / 3)), add(last, mul(t2, seg / 3)), last];
  return [first, add(first, mul(t1, alpha1)), add(last, mul(t2, alpha2)), last];
}

function reparameterize(c: Cubic, pts: readonly Vec[], u: readonly number[]): number[] {
  return u.map((t, i) => {
    const d = sub(bez(c, t), pts[i]);
    const d1 = bez1(c, t);
    const d2 = bez2(c, t);
    const numerator = dot(d, d1);
    const denominator = dot(d1, d1) + dot(d, d2);
    return Math.abs(denominator) < 1e-12 ? t : Math.max(0, Math.min(1, t - numerator / denominator));
  });
}

function maxError(c: Cubic, pts: readonly Vec[], u: readonly number[]): { error: number; at: number } {
  let worst = 0;
  let at = Math.floor(pts.length / 2);
  for (let i = 1; i < pts.length - 1; i++) {
    const d = len(sub(bez(c, u[i]), pts[i]));
    if (d >= worst) {
      worst = d;
      at = i;
    }
  }
  return { error: worst, at };
}

/** One fitted curve: from sample `from` to sample `to` (indices into the points given to `fitCurve`). */
export interface FittedSegment {
  c1: Vec;
  c2: Vec;
  from: number;
  to: number;
}

function leftTangent(pts: readonly Vec[], at: number): Vec {
  for (let i = at + 1; i < pts.length; i++) {
    const v = norm(sub(pts[i], pts[at]));
    if (v.x !== 0 || v.y !== 0) return v;
  }
  return { x: 1, y: 0 };
}
function rightTangent(pts: readonly Vec[], at: number): Vec {
  for (let i = at - 1; i >= 0; i--) {
    const v = norm(sub(pts[i], pts[at]));
    if (v.x !== 0 || v.y !== 0) return v;
  }
  return { x: -1, y: 0 };
}
function centerTangent(pts: readonly Vec[], at: number): Vec {
  const v = norm(add(norm(sub(pts[at - 1], pts[at])), norm(sub(pts[at], pts[at + 1]))));
  return v.x === 0 && v.y === 0 ? norm(sub(pts[at - 1], pts[at + 1])) : v;
}

/**
 * Fits cubic beziers through `pts` (at least two points) so that no point is more than `maxErr` from its curve.
 * Returns the segments in order, joined end to end; a corner in the stroke (a sharp turn) becomes a node with no
 * smooth continuation, since each side is fitted on its own.
 */
export function fitCurve(pts: readonly Vec[], maxErr: number): FittedSegment[] {
  const out: FittedSegment[] = [];
  if (pts.length < 2) return out;
  const fit = (a: number, b: number, t1: Vec, t2: Vec, depth: number) => {
    const slice = pts.slice(a, b + 1);
    if (slice.length === 2) {
      const dist = len(sub(slice[1], slice[0])) / 3;
      out.push({ c1: add(slice[0], mul(t1, dist)), c2: add(slice[1], mul(t2, dist)), from: a, to: b });
      return;
    }
    let u = chordLengths(slice);
    let c = generateBezier(slice, u, t1, t2);
    let { error, at } = maxError(c, slice, u);
    if (error < maxErr) {
      out.push({ c1: c[1], c2: c[2], from: a, to: b });
      return;
    }
    if (error < maxErr * 4) {
      for (let i = 0; i < 4; i++) {
        u = reparameterize(c, slice, u);
        c = generateBezier(slice, u, t1, t2);
        ({ error, at } = maxError(c, slice, u));
        if (error < maxErr) {
          out.push({ c1: c[1], c2: c[2], from: a, to: b });
          return;
        }
      }
    }
    if (depth > 40 || b - a < 2) {
      out.push({ c1: c[1], c2: c[2], from: a, to: b });
      return;
    }
    const split = a + Math.max(1, Math.min(slice.length - 2, at));
    const tc = centerTangent(pts, split);
    fit(a, split, t1, mul(tc, 1), depth + 1);
    fit(split, b, mul(tc, -1), t2, depth + 1);
  };
  fit(0, pts.length - 1, leftTangent(pts, 0), rightTangent(pts, pts.length - 1), 0);
  return out;
}

// ---------------------------------------------------------------------------
// Nodes and path data
// ---------------------------------------------------------------------------

/** Turns fitted segments into nodes: each segment's ends, with the handles on either side of every joint. */
export function segmentsToNodes(samples: readonly Sample[], segments: readonly FittedSegment[]): PathNode[] {
  if (segments.length === 0) return [];
  const node = (s: Sample): PathNode => ({ x: s.x, y: s.y, t: s.t, p: s.p });
  const nodes: PathNode[] = [node(samples[segments[0].from])];
  segments.forEach((seg, i) => {
    nodes[nodes.length - 1].hout = seg.c1;
    const end = node(samples[seg.to]);
    end.hin = seg.c2;
    nodes.push(end);
    void i;
  });
  return nodes;
}

const fx = (n: number) => Number(n.toFixed(2));

/** SVG path data for nodes: `M x y C … Z`. A segment between two nodes without handles is a straight `L`. */
export function nodesToPathData(nodes: readonly PathNode[], closed: boolean): string {
  if (nodes.length === 0) return "";
  const parts = [`M${fx(nodes[0].x)} ${fx(nodes[0].y)}`];
  const seg = (a: PathNode, b: PathNode) => {
    if (!a.hout && !b.hin) return `L${fx(b.x)} ${fx(b.y)}`;
    const c1 = a.hout ?? a;
    const c2 = b.hin ?? b;
    return `C${fx(c1.x)} ${fx(c1.y)} ${fx(c2.x)} ${fx(c2.y)} ${fx(b.x)} ${fx(b.y)}`;
  };
  for (let i = 1; i < nodes.length; i++) parts.push(seg(nodes[i - 1], nodes[i]));
  if (closed && nodes.length > 2) {
    parts.push(seg(nodes[nodes.length - 1], nodes[0]));
    parts.push("Z");
  }
  return parts.join("");
}

/** Points along the path, `steps` to each segment: for measuring and for bounding boxes. */
export function sampleNodes(nodes: readonly PathNode[], closed: boolean, steps = 16): Vec[] {
  const out: Vec[] = [];
  const count = closed && nodes.length > 2 ? nodes.length : nodes.length - 1;
  for (let i = 0; i < count; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    const c: Cubic = [a, a.hout ?? a, b.hin ?? b, b];
    for (let s = 0; s < steps; s++) out.push(bez(c, s / steps));
  }
  if (nodes.length > 0 && !(closed && nodes.length > 2)) out.push({ x: nodes[nodes.length - 1].x, y: nodes[nodes.length - 1].y });
  return out;
}

/** The largest distance from any of `pts` to the path `nodes` draw (a polyline of fine samples). */
export function maxDeviation(pts: readonly Vec[], nodes: readonly PathNode[], closed = false): number {
  const line = sampleNodes(nodes, closed, 48);
  if (line.length < 2) return line.length === 1 ? Math.max(0, ...pts.map((p) => len(sub(p, line[0])))) : Infinity;
  let worst = 0;
  for (const p of pts) {
    let best = Infinity;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const ab = sub(b, a);
      const l2 = dot(ab, ab);
      const t = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
      best = Math.min(best, len(sub(p, add(a, mul(ab, t)))));
    }
    worst = Math.max(worst, best);
  }
  return worst;
}

export interface FitOptions {
  /** 0 to 1: how much jitter to smooth away first (default 0.35). */
  smoothing?: number;
  /** RDP tolerance in px (default 0.4): only points that add nothing are dropped. */
  simplify?: number;
  /** The most any sample may be from the fitted curve, in px (default 0.9). */
  tolerance?: number;
  /** The most any recorded sample may be from the finished path, in px (default 1.4). Smoothing is eased off until it holds. */
  maxDeviation?: number;
}

function fitOnce(samples: readonly Sample[], smoothing: number, simplify: number, tolerance: number) {
  const thin = rdp(streamline(samples, smoothing), simplify);
  return segmentsToNodes(thin, fitCurve(thin, tolerance));
}

/**
 * A pencil stroke to nodes: dedupe, streamline, simplify, fit. Returns an empty list for less than two distinct points.
 * Smoothing helps a shaky hand but pulls tight curves inward, so the result is checked against what was recorded and
 * the smoothing and tolerance are tightened until no sample is more than `maxDeviation` from the path. A stroke that
 * comes back to where it began (within `closeWithin` px) is reported closed.
 */
export function fitStroke(raw: readonly Sample[], options: FitOptions = {}, closeWithin = 0): { nodes: PathNode[]; closed: boolean } {
  const samples = dedupe(raw);
  if (samples.length < 2) return { nodes: [], closed: false };
  const smoothing = options.smoothing ?? 0.35;
  const simplify = options.simplify ?? 0.4;
  const tolerance = options.tolerance ?? 0.9;
  const limit = options.maxDeviation ?? 1.4;
  // checking every sample of a very long stroke would cost more than fitting it: a spread of 800 is as good
  const stride = Math.max(1, Math.floor(samples.length / 800));
  const checked = samples.filter((_, i) => i % stride === 0 || i === samples.length - 1);
  // smoothing, simplification and tolerance each tighten together; the last attempt fits the raw samples closely
  const attempts: [number, number, number][] = [[smoothing, simplify, tolerance], [smoothing / 2, simplify * 0.6, tolerance * 0.75], [0, simplify * 0.25, tolerance * 0.6], [0, 0, tolerance * 0.4]];
  let nodes: PathNode[] = [];
  for (const [sm, simp, tol] of attempts) {
    nodes = fitOnce(samples, sm, simp, tol);
    if (maxDeviation(checked, nodes) <= limit) break;
  }
  let closed = false;
  if (closeWithin > 0 && nodes.length > 3) {
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) <= closeWithin) {
      // the last node is the first one again: merge their handles into one
      first.hin = last.hin;
      nodes.pop();
      closed = true;
    }
  }
  return { nodes, closed };
}
