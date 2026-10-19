/**
 * ============================================================================
 * SNAPPING AND SMART GUIDES (ROADMAP Phase 28)
 * ============================================================================
 * Pure functions: given the box being moved (or the edges being resized), the
 * other boxes in its frame, the frame's guides and the settings, say how far
 * to nudge it and which guide lines and spacing marks to draw.
 *
 *  - Object snap: the moving box's left / centre / right (and top / middle /
 *    bottom) line up with the same lines of other boxes and of the frame.
 *  - Guide snap: the same lines meet one of the frame's ruler guides.
 *  - Pixel grid: positions round to whole pixels.
 *  - Equal spacing: between two neighbours in a row or a column, or matching
 *    the gap two other boxes already have.
 *  - The distance HUD: the gaps from the selection to its nearest neighbours.
 *
 * Distances are in canvas px; the caller passes the threshold already divided
 * by the zoom, so a snap always feels the same on screen.
 * ============================================================================
 */

import type { Rect } from "../viewport/camera";

export interface SnapSettings {
  objects: boolean;
  guides: boolean;
  grid: boolean;
  /** The pixel grid's size. */
  gridSize: number;
}

export const DEFAULT_SNAP: SnapSettings = { objects: true, guides: true, grid: false, gridSize: 1 };

export interface Guide {
  axis: "x" | "y";
  /** Position along the axis, relative to the frame's own top-left. */
  pos: number;
}

/** A line drawn while snapping: vertical (`axis: "x"` at `pos`) or horizontal, spanning `from` to `to` on the other axis. */
export interface SnapLine {
  axis: "x" | "y";
  pos: number;
  from: number;
  to: number;
  kind: "object" | "guide" | "frame";
}

/** A gap shown between two boxes (equal-spacing marks and the distance HUD). */
export interface SpacingMark {
  axis: "x" | "y";
  /** Start and end along the axis. */
  from: number;
  to: number;
  /** Where across the other axis it is drawn. */
  at: number;
  value: number;
  equal?: boolean;
}

export interface SnapResult {
  dx: number;
  dy: number;
  lines: SnapLine[];
  spacing: SpacingMark[];
}

interface Lines {
  min: number;
  mid: number;
  max: number;
}

const xLines = (r: Rect): Lines => ({ min: r.x, mid: r.x + r.width / 2, max: r.x + r.width });
const yLines = (r: Rect): Lines => ({ min: r.y, mid: r.y + r.height / 2, max: r.y + r.height });

function r2(n: number): number {
  return Math.round(n * 100) / 100 || 0;
}

interface Best {
  delta: number;
  /** The target line's position. */
  pos: number;
  /** The rectangle the line came from (null for a guide), to span the drawn line. */
  source: Rect | null;
  kind: SnapLine["kind"];
}

/** The smallest nudge, within `threshold`, that brings any of `mine` onto any of `targets`. */
function bestSnap(mine: number[], targets: { pos: number; source: Rect | null; kind: SnapLine["kind"] }[], threshold: number): Best | null {
  let best: Best | null = null;
  for (const m of mine) {
    for (const t of targets) {
      const d = t.pos - m;
      if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best.delta) - 1e-9)) best = { delta: d, pos: t.pos, source: t.source, kind: t.kind };
    }
  }
  return best;
}

/**
 * How to nudge `moving` (the selection's bounds, already at its dragged position) so it snaps. `others` are the
 * boxes it can snap to, `frame` is the frame's own box (its edges and centre are targets), `guides` are the frame's
 * ruler guides in canvas space (already offset by the frame's position).
 */
export function snapMove(moving: Rect, others: readonly Rect[], frame: Rect | null, guides: readonly Guide[], threshold: number, settings: SnapSettings): SnapResult {
  const result: SnapResult = { dx: 0, dy: 0, lines: [], spacing: [] };
  const mx = xLines(moving);
  const my = yLines(moving);

  const targetsX: { pos: number; source: Rect | null; kind: SnapLine["kind"] }[] = [];
  const targetsY: { pos: number; source: Rect | null; kind: SnapLine["kind"] }[] = [];
  if (settings.objects) {
    for (const o of others) {
      const ox = xLines(o);
      const oy = yLines(o);
      for (const p of [ox.min, ox.mid, ox.max]) targetsX.push({ pos: p, source: o, kind: "object" });
      for (const p of [oy.min, oy.mid, oy.max]) targetsY.push({ pos: p, source: o, kind: "object" });
    }
    if (frame) {
      const fx = xLines(frame);
      const fy = yLines(frame);
      for (const p of [fx.min, fx.mid, fx.max]) targetsX.push({ pos: p, source: frame, kind: "frame" });
      for (const p of [fy.min, fy.mid, fy.max]) targetsY.push({ pos: p, source: frame, kind: "frame" });
    }
  }
  if (settings.guides) {
    for (const g of guides) (g.axis === "x" ? targetsX : targetsY).push({ pos: g.pos, source: null, kind: "guide" });
  }

  const bx = bestSnap([mx.min, mx.mid, mx.max], targetsX, threshold);
  const by = bestSnap([my.min, my.mid, my.max], targetsY, threshold);
  if (bx) result.dx = bx.delta;
  if (by) result.dy = by.delta;

  // Equal spacing, only where an object snap didn't already claim the axis.
  if (settings.objects) {
    if (!bx) {
      const eq = equalSpacing("x", moving, others, threshold);
      if (eq) {
        result.dx = eq.delta;
        result.spacing.push(...eq.marks);
      }
    }
    if (!by) {
      const eq = equalSpacing("y", moving, others, threshold);
      if (eq) {
        result.dy = eq.delta;
        result.spacing.push(...eq.marks);
      }
    }
  }

  // The pixel grid rounds whatever is left.
  if (settings.grid && settings.gridSize > 0) {
    if (!bx && result.spacing.every((s) => s.axis !== "x")) result.dx = snapToGrid(moving.x, settings.gridSize) - moving.x;
    if (!by && result.spacing.every((s) => s.axis !== "y")) result.dy = snapToGrid(moving.y, settings.gridSize) - moving.y;
  }

  // The guide lines to draw, spanning the moving box and the box it lined up with.
  const snapped: Rect = { x: moving.x + result.dx, y: moving.y + result.dy, width: moving.width, height: moving.height };
  if (bx) result.lines.push(line("x", bx, snapped));
  if (by) result.lines.push(line("y", by, snapped));
  result.dx = r2(result.dx);
  result.dy = r2(result.dy);
  return result;
}

function line(axis: "x" | "y", hit: Best, moving: Rect): SnapLine {
  const spans = [moving, ...(hit.source ? [hit.source] : [])];
  const from = Math.min(...spans.map((r) => (axis === "x" ? r.y : r.x)));
  const to = Math.max(...spans.map((r) => (axis === "x" ? r.y + r.height : r.x + r.width)));
  return { axis, pos: hit.pos, from, to, kind: hit.kind };
}

export function snapToGrid(value: number, size: number): number {
  return Math.round(value / size) * size;
}

/** The boxes in the same row (for `axis` "x") or column that overlap `moving` across the other axis. */
function neighbours(axis: "x" | "y", moving: Rect, others: readonly Rect[]): Rect[] {
  const cross = (r: Rect) => (axis === "x" ? [r.y, r.y + r.height] : [r.x, r.x + r.width]);
  const [m0, m1] = cross(moving);
  return others.filter((o) => {
    const [o0, o1] = cross(o);
    return o0 < m1 && o1 > m0;
  });
}

/**
 * Equal spacing along one axis. Two cases: the moving box sits between a neighbour on each side and is centred in
 * the gap between them (the two gaps become equal), or it is one gap away from a neighbour where two other boxes
 * are already that same gap apart (it repeats their spacing).
 */
function equalSpacing(axis: "x" | "y", moving: Rect, others: readonly Rect[], threshold: number): { delta: number; marks: SpacingMark[] } | null {
  const start = (r: Rect) => (axis === "x" ? r.x : r.y);
  const size = (r: Rect) => (axis === "x" ? r.width : r.height);
  const end = (r: Rect) => start(r) + size(r);
  const across = (r: Rect) => (axis === "x" ? r.y + r.height / 2 : r.x + r.width / 2);
  const row = neighbours(axis, moving, others).sort((a, b) => start(a) - start(b));
  const before = row.filter((r) => end(r) <= start(moving) + threshold);
  const after = row.filter((r) => start(r) >= end(moving) - threshold);
  const L = before.length ? before[before.length - 1] : null;
  const R = after.length ? after[0] : null;
  const mark = (from: number, to: number, at: number): SpacingMark => ({ axis, from, to, at, value: r2(to - from), equal: true });

  // 1. centred between its two neighbours
  if (L && R) {
    const target = (end(L) + start(R) - size(moving)) / 2;
    const delta = target - start(moving);
    if (Math.abs(delta) <= threshold && end(L) <= target && target + size(moving) <= start(R)) {
      const at = across(moving);
      return { delta, marks: [mark(end(L), target, at), mark(target + size(moving), start(R), at)] };
    }
  }
  // 2. the same gap as two other boxes already have
  const gaps: { gap: number; a: Rect; b: Rect }[] = [];
  for (let i = 0; i + 1 < row.length; i++) gaps.push({ gap: start(row[i + 1]) - end(row[i]), a: row[i], b: row[i + 1] });
  for (const { gap, a, b } of gaps) {
    if (gap <= 0) continue;
    if (R) {
      const target = start(R) - gap - size(moving);
      const delta = target - start(moving);
      if (Math.abs(delta) <= threshold) return { delta, marks: [mark(end(a), start(b), across(a)), mark(target + size(moving), start(R), across(moving))] };
    }
    if (L) {
      const target = end(L) + gap;
      const delta = target - start(moving);
      if (Math.abs(delta) <= threshold) return { delta, marks: [mark(end(a), start(b), across(a)), mark(end(L), target, across(moving))] };
    }
  }
  return null;
}

/**
 * Snaps the edges being dragged in a resize. `edges` says which of the box's edges move: only those lines look for
 * a target. Returns the adjustment to the dragged edge(s), in the same sign as the drag.
 */
export function snapEdges(
  box: Rect,
  edges: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean },
  others: readonly Rect[],
  frame: Rect | null,
  guides: readonly Guide[],
  threshold: number,
  settings: SnapSettings,
): { left: number; right: number; top: number; bottom: number; lines: SnapLine[] } {
  const out = { left: 0, right: 0, top: 0, bottom: 0, lines: [] as SnapLine[] };
  const tx: { pos: number; source: Rect | null; kind: SnapLine["kind"] }[] = [];
  const ty: { pos: number; source: Rect | null; kind: SnapLine["kind"] }[] = [];
  const add = (r: Rect, kind: SnapLine["kind"]) => {
    const x = xLines(r);
    const y = yLines(r);
    for (const p of [x.min, x.mid, x.max]) tx.push({ pos: p, source: r, kind });
    for (const p of [y.min, y.mid, y.max]) ty.push({ pos: p, source: r, kind });
  };
  if (settings.objects) {
    others.forEach((o) => add(o, "object"));
    if (frame) add(frame, "frame");
  }
  if (settings.guides) for (const g of guides) (g.axis === "x" ? tx : ty).push({ pos: g.pos, source: null, kind: "guide" });

  const pick = (mine: number, targets: typeof tx, axis: "x" | "y") => {
    const b = bestSnap([mine], targets, threshold);
    if (b) out.lines.push(line(axis, b, box));
    return b ? b.delta : settings.grid ? snapToGrid(mine, settings.gridSize) - mine : 0;
  };
  if (edges.left) out.left = pick(box.x, tx, "x");
  if (edges.right) out.right = pick(box.x + box.width, tx, "x");
  if (edges.top) out.top = pick(box.y, ty, "y");
  if (edges.bottom) out.bottom = pick(box.y + box.height, ty, "y");
  return out;
}

/** The distance HUD: the gap from `box` to the nearest other box in each direction (Alt shows these). */
export function distanceMarks(box: Rect, others: readonly Rect[], frame: Rect | null): SpacingMark[] {
  const marks: SpacingMark[] = [];
  const midX = box.x + box.width / 2;
  const midY = box.y + box.height / 2;
  const consider = (axis: "x" | "y", dir: -1 | 1) => {
    let bestGap = Infinity;
    let bestFrom = 0;
    let bestTo = 0;
    const pool = [...others, ...(frame ? [frame] : [])];
    for (const o of pool) {
      if (axis === "x") {
        const overlaps = o.y < box.y + box.height && o.y + o.height > box.y;
        if (!overlaps && o !== frame) continue;
        const gap = dir === 1 ? (o === frame ? o.x + o.width - (box.x + box.width) : o.x - (box.x + box.width)) : o === frame ? box.x - o.x : box.x - (o.x + o.width);
        if (gap >= 0 && gap < bestGap) {
          bestGap = gap;
          bestFrom = dir === 1 ? box.x + box.width : box.x - gap;
          bestTo = dir === 1 ? box.x + box.width + gap : box.x;
        }
      } else {
        const overlaps = o.x < box.x + box.width && o.x + o.width > box.x;
        if (!overlaps && o !== frame) continue;
        const gap = dir === 1 ? (o === frame ? o.y + o.height - (box.y + box.height) : o.y - (box.y + box.height)) : o === frame ? box.y - o.y : box.y - (o.y + o.height);
        if (gap >= 0 && gap < bestGap) {
          bestGap = gap;
          bestFrom = dir === 1 ? box.y + box.height : box.y - gap;
          bestTo = dir === 1 ? box.y + box.height + gap : box.y;
        }
      }
    }
    if (bestGap !== Infinity && bestGap > 0) marks.push({ axis, from: r2(bestFrom), to: r2(bestTo), at: axis === "x" ? midY : midX, value: r2(bestGap) });
  };
  consider("x", -1);
  consider("x", 1);
  consider("y", -1);
  consider("y", 1);
  return marks;
}

/** Parses a frame's stored guides (`frame.guides`, JSON text); a malformed value is no guides. */
export function parseGuides(value: unknown): Guide[] {
  if (typeof value !== "string" || value === "") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((g): g is Guide => !!g && typeof g === "object" && ((g as Guide).axis === "x" || (g as Guide).axis === "y") && Number.isFinite((g as Guide).pos))
      .map((g) => ({ axis: g.axis, pos: r2(g.pos) }));
  } catch {
    return [];
  }
}

export function serializeGuides(guides: readonly Guide[]): string {
  return JSON.stringify(guides.map((g) => ({ axis: g.axis, pos: r2(g.pos) })));
}
