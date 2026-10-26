/**
 * Layout grids (FigCraft port F6): guides a frame shows over its content to lay things out by: a square grid, or
 * columns or rows (a count or as many as fit, stretched across the frame or a fixed size placed at the start, centre
 * or end, with gutters and an offset). Editor-only: they draw on the canvas overlay, never in an export. Stored on a
 * frame as JSON (`frame.layoutGrids`).
 *
 * Translated from FigCraft (`crates/layout/src/lib.rs` `grid_lines`, `crates/doc/src/props.rs` `LayoutGrid`), commit
 * 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

export type GridKind = "grid" | "columns" | "rows";
export type GridAlign = "stretch" | "min" | "center" | "max";

export interface LayoutGrid {
  kind: GridKind;
  /** Grid: cell size. Fixed columns/rows: their width/height. */
  size: number;
  /** Columns/rows: how many (0: as many fixed-size ones as fit). */
  count: number;
  gutter: number;
  offset: number;
  align: GridAlign;
  color: string;
  visible: boolean;
}

export interface GridLine {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const defaultGrid = (): LayoutGrid => ({ kind: "grid", size: 10, count: 5, gutter: 20, offset: 0, align: "stretch", color: "rgba(255, 0, 0, 0.1)", visible: true });
export const columnsGrid = (count = 12): LayoutGrid => ({ ...defaultGrid(), kind: "columns", count, gutter: 20, size: 0 });
export const rowsGrid = (count = 5): LayoutGrid => ({ ...defaultGrid(), kind: "rows", count, gutter: 20, size: 0 });

const fin = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/**
 * The lines (grid) or bands (columns, rows) a layout grid draws in a `w`×`h` frame: each a rect in the frame's own
 * coordinates (a grid line has zero width or height). At most 4,000 lines a direction and 500 bands.
 */
export function gridLines(g: LayoutGrid, w: number, h: number): GridLine[] {
  const out: GridLine[] = [];
  if (g.kind === "grid") {
    const s = Number.isFinite(g.size) && g.size >= 1 ? g.size : 10;
    for (let x = 0, k = 0; x <= w && k < 4000; x += s, k++) out.push({ x0: x, y0: 0, x1: x, y1: h });
    for (let y = 0, k = 0; y <= h && k < 4000; y += s, k++) out.push({ x0: 0, y0: y, x1: w, y1: y });
    return out;
  }
  const cols = g.kind === "columns";
  const total = cols ? w : h;
  const gutter = Number.isFinite(g.gutter) ? Math.max(0, g.gutter) : 0;
  const offset = Number.isFinite(g.offset) ? Math.max(0, g.offset) : 0;
  let count: number;
  if (g.count === 0 && g.align !== "stretch") {
    // auto: as many fixed-size bands as fit in the room the alignment leaves them
    const size = Number.isFinite(g.size) && g.size > 0 ? g.size : 60;
    const room = g.align === "center" ? total : total - offset;
    count = Math.min(500, Math.max(1, Math.floor((room + gutter) / (size + gutter))));
  } else {
    count = Math.min(500, Math.max(1, Math.round(fin(g.count, 1))));
  }
  let start: number;
  let size: number;
  if (g.align === "stretch") {
    size = Math.max(0, (total - 2 * offset - gutter * (count - 1)) / count);
    start = offset;
  } else {
    size = Number.isFinite(g.size) && g.size > 0 ? g.size : 60;
    const span = size * count + gutter * (count - 1);
    start = g.align === "min" ? offset : g.align === "center" ? (total - span) / 2 : total - offset - span;
  }
  for (let i = 0; i < count; i++) {
    const a = start + i * (size + gutter);
    out.push(cols ? { x0: a, y0: 0, x1: a + size, y1: h } : { x0: 0, y0: a, x1: w, y1: a + size });
  }
  return out;
}

/** Snap targets of visible column and row grids: their band edges (x for columns, y for rows), in the frame's coordinates. */
export function gridSnapLines(grids: readonly LayoutGrid[], w: number, h: number): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const g of grids.filter((x) => x.visible && x.kind !== "grid")) {
    for (const r of gridLines(g, w, h)) {
      if (g.kind === "columns") xs.push(r.x0, r.x1);
      else ys.push(r.y0, r.y1);
    }
  }
  return { xs, ys };
}

const KINDS: GridKind[] = ["grid", "columns", "rows"];
const ALIGNS: GridAlign[] = ["stretch", "min", "center", "max"];

/** Reads `frame.layoutGrids`; empty for anything absent or malformed (at most 16 grids). */
export function parseLayoutGrids(json: unknown): LayoutGrid[] {
  if (typeof json !== "string" || json === "" || json.length > 20_000) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 16).flatMap((v): LayoutGrid[] => {
    if (typeof v !== "object" || v === null) return [];
    const o = v as Record<string, unknown>;
    const d = defaultGrid();
    return [{
      kind: KINDS.includes(o.kind as GridKind) ? (o.kind as GridKind) : d.kind,
      size: Math.min(10_000, Math.max(0, fin(o.size, d.size))),
      count: Math.min(500, Math.max(0, Math.round(fin(o.count, d.count)))),
      gutter: Math.min(10_000, Math.max(0, fin(o.gutter, d.gutter))),
      offset: Math.min(10_000, Math.max(0, fin(o.offset, d.offset))),
      align: ALIGNS.includes(o.align as GridAlign) ? (o.align as GridAlign) : d.align,
      color: typeof o.color === "string" && o.color.length <= 64 && /^[#a-z0-9(),.\s%-]+$/i.test(o.color) ? o.color : d.color,
      visible: o.visible !== false,
    }];
  });
}

export const serializeLayoutGrids = (grids: readonly LayoutGrid[]): string => (grids.length ? JSON.stringify(grids.slice(0, 16)) : "");
