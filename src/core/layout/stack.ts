/**
 * ============================================================================
 * AUTO-LAYOUT STACKS AS PURE GEOMETRY (ROADMAP Phase 41)
 * ============================================================================
 * An auto-layout frame is a CSS flex box (`display: flex`, a direction, a gap, padding, `justify-content`,
 * `align-items`, wrap), and its children are laid out by the browser. This file is the same layout written down as
 * plain functions: `computeStack` says where every child goes (the oracle the browser tests compare against, and
 * what the editor uses to know a drop position without asking the DOM), `inferStack` reads a stack out of layers
 * that were placed by hand (Shift+A on loose layers), and `insertionIndex` says where a dragged child would land.
 * Only what the editor can set is modelled: fixed, hug and fill sizing; start, centre, end and space-between on the
 * main axis; start, centre, end and stretch across it.
 * ============================================================================
 */

export type Direction = "row" | "column";
/** Main-axis placement; the three `space-*` values are auto gaps (FigCraft port F6 adds around and evenly). */
export type Justify = "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
/** Cross-axis placement; `baseline` lines text up by its first baseline (FigCraft port F6; geometry treats it as start). */
export type AlignItems = "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
/** How wrapped lines share the free space across the flow (FigCraft port F6): packed where the cross alignment says, or spread. */
export type AlignContent = "auto" | "space-between";
export type SizingMode = "fixed" | "hug" | "fill";

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface StackSpec {
  direction: Direction;
  gap: number;
  padding: Padding;
  justify: Justify;
  align: AlignItems;
  wrap: boolean;
  /** Wrapped lines: packed per `align` (stretched when it is `stretch`), or the free space between them. Default auto. */
  alignContent?: AlignContent;
  /** Gap between wrapped lines; default `gap` (FigCraft's cross gap). */
  crossGap?: number;
}

export const DEFAULT_STACK: StackSpec = { direction: "column", gap: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 }, justify: "flex-start", align: "flex-start", wrap: false };

/**
 * Where the first child starts and the step between children along the main axis, from the free space. Auto gaps
 * share the free space and never go below 0; a single child of "space between" sits at the start; "space around"
 * makes gaps twice the edge space, "space evenly" equal to it (FigCraft `main_offsets`, port F6).
 */
export function mainOffsets(justify: Justify, free: number, n: number, gap: number): { start: number; step: number } {
  const k = Math.max(1, n);
  switch (justify) {
    case "center": return { start: free / 2, step: gap };
    case "flex-end": return { start: free, step: gap };
    case "space-between": return n > 1 ? { start: 0, step: gap + Math.max(0, free) / (n - 1) } : { start: 0, step: gap };
    case "space-around": {
      const g = Math.max(0, free + gap * (n - 1)) / k;
      return { start: g / 2, step: g };
    }
    case "space-evenly": {
      const g = Math.max(0, free + gap * (n - 1)) / (k + 1);
      return { start: g, step: g };
    }
    default: return { start: 0, step: gap };
  }
}

export interface StackChild {
  /** The size it has when it sizes itself (fixed: its own size; hug: its content). */
  w: number;
  h: number;
  /** Per axis. */
  sizingH: SizingMode;
  sizingV: SizingMode;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const uniformPadding = (n: number): Padding => ({ top: n, right: n, bottom: n, left: n });

/**
 * The size of a stack that hugs its children on an axis, from the children's sizes: padding and gaps around the
 * sum (main axis) or the largest child (cross axis). With wrap the main axis is the `limit` it wraps at.
 */
export function hugSize(spec: StackSpec, children: readonly StackChild[], limit = Infinity): { w: number; h: number } {
  const row = spec.direction === "row";
  const main = (c: StackChild) => (row ? c.w : c.h);
  const cross = (c: StackChild) => (row ? c.h : c.w);
  const padMain = row ? spec.padding.left + spec.padding.right : spec.padding.top + spec.padding.bottom;
  const padCross = row ? spec.padding.top + spec.padding.bottom : spec.padding.left + spec.padding.right;
  if (children.length === 0) return { w: spec.padding.left + spec.padding.right, h: spec.padding.top + spec.padding.bottom };
  let mainSize: number;
  let crossSize: number;
  if (spec.wrap && Number.isFinite(limit)) {
    const lines = breakLines(spec, children, limit - padMain);
    mainSize = Math.max(...lines.map((l) => l.reduce((s, c) => s + main(c), 0) + spec.gap * (l.length - 1)));
    crossSize = lines.reduce((s, l) => s + Math.max(...l.map(cross)), 0) + spec.gap * (lines.length - 1);
  } else {
    mainSize = children.reduce((s, c) => s + main(c), 0) + spec.gap * (children.length - 1);
    crossSize = Math.max(...children.map(cross));
  }
  const total = { main: mainSize + padMain, cross: crossSize + padCross };
  return row ? { w: total.main, h: total.cross } : { w: total.cross, h: total.main };
}

function breakLines(spec: StackSpec, children: readonly StackChild[], room: number): StackChild[][] {
  const row = spec.direction === "row";
  const lines: StackChild[][] = [[]];
  let used = 0;
  for (const c of children) {
    const size = row ? c.w : c.h;
    const line = lines[lines.length - 1];
    if (line.length > 0 && used + spec.gap + size > room + 1e-9) {
      lines.push([c]);
      used = size;
    } else {
      line.push(c);
      used += (line.length > 1 ? spec.gap : 0) + size;
    }
  }
  return lines;
}

/**
 * Where each child is inside a stack of `size` (its border box), as the browser lays out
 * `display:flex; flex-direction; gap; padding; justify-content; align-items; flex-wrap`. Fill children share what
 * the fixed and hug ones leave, equally (`flex: 1 1 0%`), and stretch across the line; with `align: stretch` a hug
 * child stretches across too. Positions are relative to the stack's top-left.
 */
export function computeStack(spec: StackSpec, size: { w: number; h: number }, children: readonly StackChild[]): Rect[] {
  const row = spec.direction === "row";
  const p = spec.padding;
  const innerW = Math.max(0, size.w - p.left - p.right);
  const innerH = Math.max(0, size.h - p.top - p.bottom);
  const mainRoom = row ? innerW : innerH;
  const crossRoom = row ? innerH : innerW;
  const sizingMain = (c: StackChild) => (row ? c.sizingH : c.sizingV);
  const sizingCross = (c: StackChild) => (row ? c.sizingV : c.sizingH);
  const natMain = (c: StackChild) => (row ? c.w : c.h);
  const natCross = (c: StackChild) => (row ? c.h : c.w);

  const lines: number[][] = [[]];
  if (spec.wrap) {
    let used = 0;
    children.forEach((c, i) => {
      // a fill child has no size of its own to break on: it counts as zero
      const s = sizingMain(c) === "fill" ? 0 : natMain(c);
      const line = lines[lines.length - 1];
      if (line.length > 0 && used + spec.gap + s > mainRoom + 1e-9) {
        lines.push([i]);
        used = s;
      } else {
        line.push(i);
        used += (line.length > 1 ? spec.gap : 0) + s;
      }
    });
  } else {
    lines[0] = children.map((_, i) => i);
  }

  const out: Rect[] = new Array(children.length);
  // each line's cross size: the tallest child; a lone line with no wrap takes the whole inner cross room
  const lineCross = lines.map((idx) => Math.max(0, ...idx.map((i) => (sizingCross(children[i]) === "fill" ? 0 : natCross(children[i])))));
  const crossGap = spec.crossGap ?? spec.gap;
  // FigCraft port F6: several lines share the free space across the flow: packed where the cross alignment says
  // (stretched over it when the alignment is stretch), or (space-between) the space goes between them
  let lineSizes = spec.wrap ? [...lineCross] : [crossRoom];
  let lineGap = crossGap;
  let crossAt = 0;
  if (spec.wrap && lines.length === 1) lineSizes = [crossRoom];
  else if (spec.wrap && lines.length > 1) {
    const used = lineCross.reduce((a, b) => a + b, 0);
    const between = lines.length - 1;
    const spread = (crossRoom - used) / between;
    if (spec.alignContent === "space-between" && spread > 0) lineGap = spread;
    else {
      // no room to spread: the rows touch, then sit where the alignment says (even past the edges, as CSS does)
      if (spec.alignContent === "space-between") lineGap = 0;
      const free = crossRoom - used - lineGap * between;
      if (free > 0 && spec.align === "stretch") lineSizes = lineCross.map((c) => c + free / lines.length);
      else if (spec.align === "center") crossAt = free / 2;
      else if (spec.align === "flex-end") crossAt = free;
    }
  }
  lines.forEach((idx, li) => {
    const lc = lineSizes[li];
    const fixedMain = idx.reduce((s, i) => s + (sizingMain(children[i]) === "fill" ? 0 : natMain(children[i])), 0);
    const gaps = spec.gap * Math.max(0, idx.length - 1);
    const fills = idx.filter((i) => sizingMain(children[i]) === "fill").length;
    const free = mainRoom - fixedMain - gaps;
    const share = fills > 0 ? Math.max(0, free) / fills : 0;
    const total = fixedMain + gaps + (fills > 0 ? Math.max(0, free) : 0);
    const left = Math.max(0, mainRoom - total);
    let at = 0;
    let between = spec.gap;
    if (fills === 0) {
      const o = mainOffsets(spec.justify, left, idx.length, spec.gap);
      at = o.start;
      between = o.step;
    }
    idx.forEach((i) => {
      const c = children[i];
      const m = sizingMain(c) === "fill" ? share : natMain(c);
      const stretch = sizingCross(c) === "fill" || (spec.align === "stretch" && sizingCross(c) === "hug");
      const x = stretch ? lc : natCross(c);
      let off = 0;
      if (!stretch) {
        if (spec.align === "center") off = (lc - x) / 2;
        else if (spec.align === "flex-end") off = lc - x;
      }
      const mainPos = (row ? p.left : p.top) + at;
      const crossPos = (row ? p.top : p.left) + crossAt + off;
      out[i] = row ? { x: mainPos, y: crossPos, w: m, h: x } : { x: crossPos, y: mainPos, w: x, h: m };
      at += m + between;
    });
    crossAt += lc + lineGap;
  });
  return out;
}

// --- reading a stack out of loose layers ------------------------------------------

const median = (v: number[]): number => {
  const s = [...v].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s[Math.floor((s.length - 1) / 2)];
};

/**
 * What stack would reproduce `children` (placed by hand inside `parent`, both relative to the same origin) as
 * closely as one can: the direction from how the layers are spread out, the gap their usual spacing, padding the
 * space around them, alignment from where their edges agree. Also the order they go in (left to right or top to bottom).
 */
export function inferStack(parent: Rect, children: readonly Rect[]): { spec: StackSpec; order: number[] } {
  if (children.length === 0) return { spec: { ...DEFAULT_STACK }, order: [] };
  const xs = children.map((c) => c.x);
  const ys = children.map((c) => c.y);
  const spreadX = Math.max(...xs.map((x, i) => x + children[i].w)) - Math.min(...xs);
  const spreadY = Math.max(...ys.map((y, i) => y + children[i].h)) - Math.min(...ys);
  // layers that sit side by side don't overlap in x (a row); one under another, not in y (a column)
  let hSeparate = 0;
  let vSeparate = 0;
  for (let i = 0; i < children.length; i++) {
    for (let j = i + 1; j < children.length; j++) {
      const a = children[i];
      const b = children[j];
      if (a.x + a.w <= b.x + 1e-6 || b.x + b.w <= a.x + 1e-6) hSeparate++;
      if (a.y + a.h <= b.y + 1e-6 || b.y + b.h <= a.y + 1e-6) vSeparate++;
    }
  }
  const row = children.length === 1 ? parent.w >= parent.h : hSeparate > vSeparate || (hSeparate === vSeparate && spreadX >= spreadY);
  const direction: Direction = row ? "row" : "column";
  const order = children.map((_, i) => i).sort((a, b) => (row ? children[a].x - children[b].x || children[a].y - children[b].y : children[a].y - children[b].y || children[a].x - children[b].x));
  const sorted = order.map((i) => children[i]);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    gaps.push(Math.max(0, row ? cur.x - (prev.x + prev.w) : cur.y - (prev.y + prev.h)));
  }
  const gap = Math.round(median(gaps));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxR = Math.max(...children.map((c) => c.x + c.w));
  const maxB = Math.max(...children.map((c) => c.y + c.h));
  const padding: Padding = {
    top: Math.max(0, Math.round(minY - parent.y)),
    left: Math.max(0, Math.round(minX - parent.x)),
    right: Math.max(0, Math.round(parent.x + parent.w - maxR)),
    bottom: Math.max(0, Math.round(parent.y + parent.h - maxB)),
  };
  // cross alignment: whichever of start, centre, end the layers' edges agree on
  const tol = 1;
  const crossStart = row ? ys : xs;
  const crossSize = children.map((c) => (row ? c.h : c.w));
  const crossEnd = crossStart.map((s, i) => s + crossSize[i]);
  const crossMid = crossStart.map((s, i) => s + crossSize[i] / 2);
  const same = (v: number[]) => Math.max(...v) - Math.min(...v) <= tol;
  let align: AlignItems = "flex-start";
  if (children.length > 1 && !same(crossStart)) align = same(crossMid) ? "center" : same(crossEnd) ? "flex-end" : "flex-start";
  return { spec: { direction, gap, padding, justify: "flex-start", align, wrap: false }, order };
}

/**
 * Where a dragged child would be put: the index among `rects` (the other children, in order, relative to the stack),
 * from the pointer position along the main axis. Between two children at their midpoints.
 */
export function insertionIndex(direction: Direction, rects: readonly Rect[], pointer: { x: number; y: number }): number {
  const row = direction === "row";
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const mid = row ? r.x + r.w / 2 : r.y + r.h / 2;
    if ((row ? pointer.x : pointer.y) < mid) return i;
  }
  return rects.length;
}

/** The line to draw for an insertion at `index`: along the cross axis, between the neighbours. */
export function insertionLine(direction: Direction, rects: readonly Rect[], index: number, gap = 0): { x1: number; y1: number; x2: number; y2: number } | null {
  if (rects.length === 0) return null;
  const row = direction === "row";
  const before = rects[index - 1];
  const after = rects[index];
  const mainPos = before && after ? (row ? (before.x + before.w + after.x) / 2 : (before.y + before.h + after.y) / 2) : before ? (row ? before.x + before.w + gap / 2 : before.y + before.h + gap / 2) : row ? after.x - gap / 2 : after.y - gap / 2;
  const lo = Math.min(...rects.map((r) => (row ? r.y : r.x)));
  const hi = Math.max(...rects.map((r) => (row ? r.y + r.h : r.x + r.w)));
  return row ? { x1: mainPos, y1: lo, x2: mainPos, y2: hi } : { x1: lo, y1: mainPos, x2: hi, y2: mainPos };
}
