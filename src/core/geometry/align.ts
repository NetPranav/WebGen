/**
 * ============================================================================
 * ALIGN, DISTRIBUTE & TIDY (ROADMAP Phase 30)
 * ============================================================================
 * Moving boxes so their edges line up, their gaps are equal, or they sit on a grid. Pure functions with no DOM:
 * every one takes `Box`es (centre, size, rotation) and returns new boxes in the same order. Only positions
 * change, never sizes. A rotated box is aligned by its axis-aligned bounds (what you see), then moved whole.
 * ============================================================================
 */

import { corners, roundBox, type Box } from "./transform";
import type { Rect } from "../viewport/camera";

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";
export const ALIGN_MODES: readonly AlignMode[] = ["left", "hcenter", "right", "top", "vcenter", "bottom"];

/** `h` spreads along x (horizontal spacing), `v` along y. */
export type SpreadAxis = "h" | "v";

/** The gap used by Tidy when the boxes have no positive gap to learn one from. */
export const DEFAULT_TIDY_GAP = 16;

/** The axis-aligned rectangle around a (possibly rotated) box. */
export function boundsOf(b: Box): Rect {
  const cs = corners(b);
  const xs = cs.map((p) => p.x);
  const ys = cs.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** The rectangle around several boxes' bounds, or null for none. */
export function unionBounds(boxes: readonly Box[]): Rect | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    const r = boundsOf(b);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const finite = (b: Box) => [b.cx, b.cy, b.w, b.h, b.rot].every(Number.isFinite);
const shift = (b: Box, dx: number, dy: number): Box => roundBox({ ...b, cx: b.cx + dx, cy: b.cy + dy });

/** Aligns every box's bounds to `target` (a rectangle: the selection's union, or the parent's). */
export function alignBoxes(boxes: readonly Box[], mode: AlignMode, target: Rect): Box[] {
  if (![target.x, target.y, target.width, target.height].every(Number.isFinite)) return boxes.map((b) => ({ ...b }));
  return boxes.map((b) => {
    if (!finite(b)) return { ...b };
    const r = boundsOf(b);
    switch (mode) {
      case "left": return shift(b, target.x - r.x, 0);
      case "hcenter": return shift(b, target.x + target.width / 2 - (r.x + r.width / 2), 0);
      case "right": return shift(b, target.x + target.width - (r.x + r.width), 0);
      case "top": return shift(b, 0, target.y - r.y);
      case "vcenter": return shift(b, 0, target.y + target.height / 2 - (r.y + r.height / 2));
      case "bottom": return shift(b, 0, target.y + target.height - (r.y + r.height));
    }
  });
}

interface Span {
  /** Index in the caller's array. */
  i: number;
  start: number;
  size: number;
}

function spans(boxes: readonly Box[], axis: SpreadAxis): Span[] {
  return boxes
    .map((b, i) => {
      const r = boundsOf(b);
      return axis === "h" ? { i, start: r.x, size: r.width } : { i, start: r.y, size: r.height };
    })
    .sort((a, b) => a.start - b.start || a.i - b.i);
}

const delta = (axis: SpreadAxis, d: number) => (axis === "h" ? { dx: d, dy: 0 } : { dx: 0, dy: d });

/** The gaps between neighbours along an axis, in order of position: `a` and `b` are indices into `boxes`. */
export function gapsBetween(boxes: readonly Box[], axis: SpreadAxis): { a: number; b: number; from: number; to: number; size: number }[] {
  const s = spans(boxes.filter(finite), axis);
  const out: { a: number; b: number; from: number; to: number; size: number }[] = [];
  for (let k = 0; k + 1 < s.length; k++) {
    const from = s[k].start + s[k].size;
    out.push({ a: s[k].i, b: s[k + 1].i, from, to: s[k + 1].start, size: s[k + 1].start - from });
  }
  return out;
}

/**
 * Spreads the boxes so the gaps between neighbours are equal, keeping the outermost two where they are
 * (Figma's "distribute spacing"). Fewer than three boxes are returned unchanged.
 */
export function distributeBoxes(boxes: readonly Box[], axis: SpreadAxis): Box[] {
  if (boxes.length < 3 || !boxes.every(finite)) return boxes.map((b) => ({ ...b }));
  const s = spans(boxes, axis);
  const first = s[0].start;
  const last = s[s.length - 1];
  const total = last.start + last.size - first;
  const inner = s.reduce((n, x) => n + x.size, 0);
  const gap = (total - inner) / (s.length - 1);
  const out = boxes.map((b) => ({ ...b }));
  let cursor = first;
  for (const x of s) {
    const d = delta(axis, cursor - x.start);
    out[x.i] = shift(boxes[x.i], d.dx, d.dy);
    cursor += x.size + gap;
  }
  return out;
}

/**
 * Gives every neighbouring pair the same gap `gap`, keeping the first box (the one with the smallest position)
 * where it is: what dragging a spacing handle on the canvas does. The gap may be negative (overlap) but not NaN.
 */
export function setUniformGap(boxes: readonly Box[], axis: SpreadAxis, gap: number): Box[] {
  if (boxes.length < 2 || !Number.isFinite(gap) || !boxes.every(finite)) return boxes.map((b) => ({ ...b }));
  const s = spans(boxes, axis);
  const out = boxes.map((b) => ({ ...b }));
  let cursor = s[0].start;
  for (const x of s) {
    const d = delta(axis, cursor - x.start);
    out[x.i] = shift(boxes[x.i], d.dx, d.dy);
    cursor += x.size + gap;
  }
  return out;
}

const median = (values: number[]): number => {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

/**
 * Tidy up: puts the boxes on a grid. Boxes are grouped into rows (a box joins a row when it overlaps the row's
 * vertical extent), each row is sorted left to right, column `n` takes the width of the widest box in column `n`,
 * and every row the height of its tallest. The gaps are learned from the boxes' own positive gaps (their median),
 * or `DEFAULT_TIDY_GAP`. The grid starts at the selection's top-left; boxes sit at the top-left of their cell.
 */
export function tidyBoxes(boxes: readonly Box[]): Box[] {
  if (boxes.length < 2 || !boxes.every(finite)) return boxes.map((b) => ({ ...b }));
  const items = boxes.map((b, i) => ({ i, r: boundsOf(b) })).sort((a, b) => a.r.y + a.r.height / 2 - (b.r.y + b.r.height / 2) || a.i - b.i);
  const rows: { top: number; bottom: number; items: typeof items }[] = [];
  for (const it of items) {
    const row = rows[rows.length - 1];
    if (row && it.r.y < row.bottom && it.r.y + it.r.height > row.top) {
      row.items.push(it);
      row.top = Math.min(row.top, it.r.y);
      row.bottom = Math.max(row.bottom, it.r.y + it.r.height);
    } else {
      rows.push({ top: it.r.y, bottom: it.r.y + it.r.height, items: [it] });
    }
  }
  for (const row of rows) row.items.sort((a, b) => a.r.x - b.r.x || a.i - b.i);

  const colGaps: number[] = [];
  for (const row of rows) for (let k = 0; k + 1 < row.items.length; k++) {
    const g = row.items[k + 1].r.x - (row.items[k].r.x + row.items[k].r.width);
    if (g > 0) colGaps.push(g);
  }
  const rowGaps: number[] = [];
  for (let k = 0; k + 1 < rows.length; k++) {
    const g = rows[k + 1].top - rows[k].bottom;
    if (g > 0) rowGaps.push(g);
  }
  const colGap = Math.round(colGaps.length ? median(colGaps) : DEFAULT_TIDY_GAP);
  const rowGap = Math.round(rowGaps.length ? median(rowGaps) : DEFAULT_TIDY_GAP);

  const colCount = Math.max(...rows.map((r) => r.items.length));
  const colWidth = Array.from({ length: colCount }, (_, c) => Math.max(0, ...rows.map((r) => r.items[c]?.r.width ?? 0)));
  const colX: number[] = [];
  const origin = unionBounds(boxes)!;
  let x = origin.x;
  for (let c = 0; c < colCount; c++) {
    colX.push(x);
    x += colWidth[c] + colGap;
  }
  const out = boxes.map((b) => ({ ...b }));
  let y = origin.y;
  for (const row of rows) {
    row.items.forEach((it, c) => {
      out[it.i] = shift(boxes[it.i], colX[c] - it.r.x, y - it.r.y);
    });
    y += Math.max(...row.items.map((it) => it.r.height)) + rowGap;
  }
  return out;
}
