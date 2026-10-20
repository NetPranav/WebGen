/**
 * ============================================================================
 * GRID LAYOUT AS PURE GEOMETRY (ROADMAP Phase 42)
 * ============================================================================
 * A grid container is a CSS grid (`display: grid`, column and row tracks, gaps, padding) and its children sit in
 * cells, optionally spanning several. This file reads track lists (`1fr 200px`, `repeat(3, 1fr)`), says where the
 * tracks are for the overlay that draws them, and works out which cell a layer is in. Tracks are `px` or `fr`;
 * anything else (auto, minmax) is not drawn.
 * ============================================================================
 */

export interface Track {
  kind: "px" | "fr";
  value: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A track list as tracks, or null when it uses something this reader doesn't know. */
export function parseTracks(template: string): Track[] | null {
  // `minmax(0, 1fr)` is how equal columns are written so they can shrink: for tracks it is the same as `1fr`
  const text = template.trim().replace(/minmax\(\s*0(?:px)?\s*,\s*(\d*\.?\d+fr)\s*\)/gi, "$1");
  if (!text) return null;
  const out: Track[] = [];
  const repeat = /^repeat\(\s*(\d+)\s*,\s*([^)]+)\)\s*(.*)$/i.exec(text);
  if (repeat) {
    const count = Math.min(200, Number(repeat[1]));
    const each = parseTracks(repeat[2]);
    const rest = repeat[3] ? parseTracks(repeat[3]) : [];
    if (!each || rest === null) return null;
    for (let i = 0; i < count; i++) out.push(...each);
    return [...out, ...rest];
  }
  for (const part of text.split(/\s+/)) {
    const m = /^(\d*\.?\d+)(px|fr)$/i.exec(part);
    if (!m) return null;
    out.push({ kind: m[2].toLowerCase() as "px" | "fr", value: Number(m[1]) });
  }
  return out.length > 0 && out.length <= 200 ? out : null;
}

/** `repeat(n, minmax(0, 1fr))` for a plain column count: equal columns that can shrink. */
export const equalTracks = (count: number): string => `repeat(${Math.max(1, Math.min(200, Math.round(count)))}, minmax(0, 1fr))`;

/** Where the tracks lie along an axis of `size`: start and length of each, inside `padding` on both sides and with `gap` between. */
export function trackSpans(tracks: readonly Track[], size: number, gap: number, paddingStart: number, paddingEnd: number): { pos: number; len: number }[] {
  const inner = Math.max(0, size - paddingStart - paddingEnd);
  const fixed = tracks.reduce((s, t) => s + (t.kind === "px" ? t.value : 0), 0);
  const frs = tracks.reduce((s, t) => s + (t.kind === "fr" ? t.value : 0), 0);
  const free = Math.max(0, inner - fixed - gap * Math.max(0, tracks.length - 1));
  let at = paddingStart;
  return tracks.map((t) => {
    const len = t.kind === "px" ? t.value : frs > 0 ? (free * t.value) / frs : 0;
    const span = { pos: at, len };
    at += len + gap;
    return span;
  });
}

/** The cell (0-based column and row) a point inside the grid falls in, or the nearest one. */
export function cellAt(cols: readonly { pos: number; len: number }[], rows: readonly { pos: number; len: number }[], x: number, y: number): { col: number; row: number } {
  const along = (spans: readonly { pos: number; len: number }[], v: number) => {
    let best = 0;
    let bestD = Infinity;
    spans.forEach((s, i) => {
      const d = v < s.pos ? s.pos - v : v > s.pos + s.len ? v - (s.pos + s.len) : 0;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };
  return { col: along(cols, x), row: along(rows, y) };
}

const clusters = (values: number[], tolerance: number): number[] => {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) if (out.length === 0 || v - out[out.length - 1] > tolerance) out.push(v);
  return out;
};

/**
 * A grid that would hold layers placed by hand: as many columns as there are distinct left edges, rows as there are
 * distinct top edges (edges within a few pixels count as one), the gaps from the usual spacing between them.
 */
export function inferGrid(children: readonly Rect[], tolerance = 4): { columns: number; rows: number; columnGap: number; rowGap: number } {
  if (children.length === 0) return { columns: 2, rows: 1, columnGap: 8, rowGap: 8 };
  const xs = clusters(children.map((c) => c.x), tolerance);
  const ys = clusters(children.map((c) => c.y), tolerance);
  const gapOf = (edges: number[], size: (edge: number) => number) => {
    const gaps: number[] = [];
    for (let i = 1; i < edges.length; i++) gaps.push(Math.max(0, edges[i] - (edges[i - 1] + size(edges[i - 1]))));
    gaps.sort((a, b) => a - b);
    return gaps.length === 0 ? 0 : Math.round(gaps[Math.floor((gaps.length - 1) / 2)]);
  };
  const widthAt = (x: number) => Math.max(...children.filter((c) => Math.abs(c.x - x) <= tolerance).map((c) => c.w));
  const heightAt = (y: number) => Math.max(...children.filter((c) => Math.abs(c.y - y) <= tolerance).map((c) => c.h));
  return { columns: xs.length, rows: ys.length, columnGap: gapOf(xs, widthAt), rowGap: gapOf(ys, heightAt) };
}

/**
 * Where a dragged child would be put among the others (`rects` in order, relative to the grid): next to the one
 * nearest the pointer, before it if the pointer is on its left half (or its upper half when it is above), after it
 * otherwise. Returns the index and a line to draw beside that cell.
 */
export function gridInsertion(rects: readonly Rect[], p: { x: number; y: number }): { index: number; line: { x1: number; y1: number; x2: number; y2: number } } | null {
  if (rects.length === 0) return null;
  let best = 0;
  let bestD = Infinity;
  rects.forEach((r, i) => {
    const dx = p.x < r.x ? r.x - p.x : p.x > r.x + r.w ? p.x - (r.x + r.w) : 0;
    const dy = p.y < r.y ? r.y - p.y : p.y > r.y + r.h ? p.y - (r.y + r.h) : 0;
    const d = Math.hypot(dx, dy);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  const r = rects[best];
  const before = p.x < r.x + r.w / 2;
  const x = before ? r.x : r.x + r.w;
  return { index: before ? best : best + 1, line: { x1: x, y1: r.y, x2: x, y2: r.y + r.h } };
}
