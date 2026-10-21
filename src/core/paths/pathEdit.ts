/**
 * ============================================================================
 * EDITING A PATH POINT BY POINT (ROADMAP Phase 40)
 * ============================================================================
 * The operations of path edit mode as pure functions on `{ nodes, closed }`: move nodes (their handles go along),
 * drag a handle (mirrored by default, Alt breaks the pair), add a node on a segment without changing the curve,
 * delete nodes, close and open, turn a node smooth or sharp, and find what is under a point. Positions are in
 * whatever space the caller uses; the tolerance is in the same space.
 * ============================================================================
 */

import { sampleNodes, type PathNode, type Vec } from "./pathFit";

export interface EditPath {
  nodes: PathNode[];
  closed: boolean;
}

export type HandleSide = "in" | "out";

const len = (a: Vec) => Math.hypot(a.x, a.y);
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const shift = (v: Vec | undefined, dx: number, dy: number): Vec | undefined => (v ? { x: v.x + dx, y: v.y + dy } : undefined);

function withHandles(n: PathNode, hin: Vec | undefined, hout: Vec | undefined): PathNode {
  const { hin: _a, hout: _b, ...rest } = n;
  void _a;
  void _b;
  return { ...rest, ...(hin ? { hin } : {}), ...(hout ? { hout } : {}) };
}

/** Number of segments: one fewer than nodes, or as many when closed. */
export const segmentCount = (p: EditPath): number => (p.closed && p.nodes.length > 2 ? p.nodes.length : Math.max(0, p.nodes.length - 1));

/** Moves the nodes at `indices` by (dx, dy); each takes its handles with it. */
export function moveNodes(p: EditPath, indices: ReadonlySet<number> | readonly number[], dx: number, dy: number): EditPath {
  const set = new Set(indices);
  return {
    ...p,
    nodes: p.nodes.map((n, i) => (set.has(i) ? withHandles({ ...n, x: n.x + dx, y: n.y + dy }, shift(n.hin, dx, dy), shift(n.hout, dx, dy)) : n)),
  };
}

/**
 * Drags one handle to `to`. If the node's two handles were a straight line through it (a smooth node) the other one
 * turns to stay opposite, keeping its own length, or taking this one's when they were equal (mirrored). `free`
 * (Alt) moves only this handle.
 */
export function moveHandle(p: EditPath, index: number, side: HandleSide, to: Vec, free = false): EditPath {
  const n = p.nodes[index];
  if (!n) return p;
  const key = side === "in" ? "hin" : "hout";
  const otherKey = side === "in" ? "hout" : "hin";
  const mine = n[key];
  const other = n[otherKey];
  let nextOther = other;
  if (!free && mine && other) {
    const a = sub(mine, n);
    const b = sub(other, n);
    const la = len(a);
    const lb = len(b);
    const collinear = la > 1e-9 && lb > 1e-9 && Math.abs((a.x * b.y - a.y * b.x) / (la * lb)) < 0.02 && a.x * b.x + a.y * b.y < 0;
    if (collinear) {
      const d = sub(to, n);
      const ld = len(d);
      const keep = Math.abs(la - lb) / Math.max(la, lb) < 0.01 ? ld : lb; // mirrored keeps equal lengths
      nextOther = ld < 1e-9 ? other : { x: n.x - (d.x / ld) * keep, y: n.y - (d.y / ld) * keep };
    }
  } else if (!free && !other && !mine) {
    nextOther = undefined;
  }
  const out = { ...n, [key]: { x: to.x, y: to.y } } as PathNode;
  const patched = withHandles(out, side === "in" ? out.hin : nextOther, side === "out" ? out.hout : nextOther);
  return { ...p, nodes: p.nodes.map((m, i) => (i === index ? patched : m)) };
}

/** Splits segment `seg` at `t` (de Casteljau), keeping the curve exactly. Returns the new path and the new node's index. */
export function insertNode(p: EditPath, seg: number, t: number): { path: EditPath; index: number } {
  const n = p.nodes.length;
  if (seg < 0 || seg >= segmentCount(p)) return { path: p, index: -1 };
  const a = p.nodes[seg];
  const bi = (seg + 1) % n;
  const b = p.nodes[bi];
  const p0: Vec = a;
  const p1: Vec = a.hout ?? a;
  const p2: Vec = b.hin ?? b;
  const p3: Vec = b;
  const curved = !!(a.hout || b.hin);
  const q0 = lerp(p0, p1, t);
  const q1 = lerp(p1, p2, t);
  const q2 = lerp(p2, p3, t);
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);
  // a straight segment is split in a straight line (the cubic with its controls on its ends moves unevenly)
  const m = curved ? lerp(r0, r1, t) : lerp(p0, p3, t);
  const mid: PathNode = curved ? { x: m.x, y: m.y, hin: r0, hout: r1 } : { x: m.x, y: m.y };
  const left = withHandles(a, a.hin, curved ? q0 : undefined);
  const right = withHandles(b, curved ? q2 : undefined, b.hout);
  const nodes = p.nodes.slice();
  nodes[seg] = left;
  nodes[bi] = right;
  // wrapping segment of a closed path: the new node goes at the end
  const at = bi === 0 ? n : seg + 1;
  nodes.splice(at, 0, mid);
  return { path: { ...p, nodes }, index: at };
}

/** Removes the nodes at `indices`. A closed path left with fewer than three nodes opens; fewer than two nodes leaves an empty path. */
export function deleteNodes(p: EditPath, indices: ReadonlySet<number> | readonly number[]): EditPath {
  const set = new Set(indices);
  const nodes = p.nodes.filter((_, i) => !set.has(i));
  if (nodes.length < 2) return { nodes: [], closed: false };
  return { nodes, closed: p.closed && nodes.length > 2 };
}

export function setClosed(p: EditPath, closed: boolean): EditPath {
  return p.nodes.length > 2 ? { ...p, closed } : p;
}

/** A corner with handles becomes sharp; a corner without them becomes smooth, with handles a third of the way to its neighbours along their direction. */
export function toggleSmooth(p: EditPath, index: number): EditPath {
  const n = p.nodes[index];
  if (!n) return p;
  if (n.hin || n.hout) return { ...p, nodes: p.nodes.map((m, i) => (i === index ? withHandles(m, undefined, undefined) : m)) };
  const count = p.nodes.length;
  const prev = index > 0 ? p.nodes[index - 1] : p.closed ? p.nodes[count - 1] : null;
  const next = index < count - 1 ? p.nodes[index + 1] : p.closed ? p.nodes[0] : null;
  const from = prev ?? n;
  const to = next ?? n;
  const dir = sub(to, from);
  const l = len(dir);
  if (l < 1e-9) return p;
  const u = { x: dir.x / l, y: dir.y / l };
  const lin = prev ? len(sub(n, prev)) / 3 : 0;
  const lout = next ? len(sub(next, n)) / 3 : 0;
  const hin = prev ? { x: n.x - u.x * lin, y: n.y - u.y * lin } : undefined;
  const hout = next ? { x: n.x + u.x * lout, y: n.y + u.y * lout } : undefined;
  return { ...p, nodes: p.nodes.map((m, i) => (i === index ? withHandles(m, hin, hout) : m)) };
}

// --- what is under a point -----------------------------------------------------

export function hitNode(p: EditPath, at: Vec, tolerance: number): number | null {
  let best: number | null = null;
  let bestD = tolerance;
  p.nodes.forEach((n, i) => {
    const d = Math.hypot(n.x - at.x, n.y - at.y);
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/** A handle under `at`; only the nodes in `among` show handles. */
export function hitHandle(p: EditPath, at: Vec, tolerance: number, among: ReadonlySet<number> | readonly number[]): { index: number; side: HandleSide } | null {
  let best: { index: number; side: HandleSide } | null = null;
  let bestD = tolerance;
  for (const i of new Set(among)) {
    const n = p.nodes[i];
    if (!n) continue;
    for (const side of ["in", "out"] as const) {
      const h = side === "in" ? n.hin : n.hout;
      if (!h) continue;
      const d = Math.hypot(h.x - at.x, h.y - at.y);
      if (d <= bestD) {
        bestD = d;
        best = { index: i, side };
      }
    }
  }
  return best;
}

/** The segment nearest `at` within `tolerance`, with the curve parameter of the closest point. */
export function hitSegment(p: EditPath, at: Vec, tolerance: number): { seg: number; t: number; distance: number } | null {
  let best: { seg: number; t: number; distance: number } | null = null;
  const steps = 24;
  for (let s = 0; s < segmentCount(p); s++) {
    const a = p.nodes[s];
    const b = p.nodes[(s + 1) % p.nodes.length];
    if (!a.hout && !b.hin) {
      const uv = sub(b, a);
      const l2 = uv.x * uv.x + uv.y * uv.y;
      const k = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((at.x - a.x) * uv.x + (at.y - a.y) * uv.y) / l2));
      const d = Math.hypot(at.x - (a.x + uv.x * k), at.y - (a.y + uv.y * k));
      if (d <= tolerance && (!best || d < best.distance)) best = { seg: s, t: k, distance: d };
      continue;
    }
    const pts = sampleNodes([a, b], false, steps);
    for (let i = 1; i < pts.length; i++) {
      const u = pts[i - 1];
      const v = pts[i];
      const uv = sub(v, u);
      const l2 = uv.x * uv.x + uv.y * uv.y;
      const k = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((at.x - u.x) * uv.x + (at.y - u.y) * uv.y) / l2));
      const d = Math.hypot(at.x - (u.x + uv.x * k), at.y - (u.y + uv.y * k));
      if (d <= tolerance && (!best || d < best.distance)) best = { seg: s, t: (i - 1 + k) / steps, distance: d };
    }
  }
  return best;
}
