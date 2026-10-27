/**
 * Working on a whole selection (FigCraft port F12), each change one undo step:
 *
 * - **Batch rename**: a match (plain text or a regular expression) whose occurrences are replaced, and/or a pattern for
 *   the whole name, with FigCraft's codes: `$&` the current name (the matched text when matching), `` $` `` / `$'` the
 *   text before / after the match, `$1`…`$9` a regular expression's groups, `$n` a number counting up and `$N` one
 *   counting down (`$nnn` pads it to three digits), `$$` a dollar sign. Numbers follow the stacking order, bottom first.
 * - **Selection spacing**: siblings in rows, columns or a grid ("tracks" of aligned layers) get one gap; each track
 *   keeps its own layout and every layer its size.
 * - **Selection reorder**: in a regular row, column or complete grid, a layer moves to another's slot (the rest
 *   reflow keeping their sizes and the gaps), or two swap.
 * - **Selection colours**: every solid or gradient paint the selection uses (descendants and styled text runs
 *   included), grouped by value and by the variable it follows; change one and every slot that showed it changes.
 *
 * Behaviour translated from FigCraft (`crates/engine/src/rename.rs`, `selection_spacing.rs`, `selection_reorder.rs`,
 * `selection_colors.rs` and their tests), commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft
 * contributors. See THIRD_PARTY_NOTICES.md.
 */

import type { Layer } from "../document/schema";
import type { PropValue } from "../document/registry";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { documentOrder } from "../selection/selectionOps";
import { corners, type Box } from "../geometry/transform";
import { parseCss, toCssHex } from "../paint/color";
import { parseFills, serializeFills, type Paint } from "../paint/paints";
import { parseRuns, serializeRuns } from "../text/runs";
import { transaction } from "./editOps";
import { worldBox, writeBoxes } from "./layerBoxes";

const layers = () => getDocument().layers;

// --- batch rename -----------------------------------------------------------------------------

const MAX_FIND = 1_000;
const MAX_NAME = 120; // our layer names are at most 120 characters (FigCraft: 10,000)
const MAX_PAD = 12;

export interface RenameSettings {
  /** What to match (empty: nothing). */
  find?: string;
  /** `find` is a regular expression. */
  regex?: boolean;
  /** What each match becomes. */
  replace?: string;
  /** A pattern for the whole name, after the replacement. */
  pattern?: string;
  /** Where `$n` starts and `$N` stops (default 1). */
  start?: number;
}

interface Ctx {
  matched: string;
  before: string;
  after: string;
  groups: string[] | null;
  up: number;
  down: number;
}

/** `template` with its codes filled in from `c` (FigCraft `expand`). */
function expand(template: string, c: Ctx): string {
  let out = "";
  const chars = [...template];
  for (let i = 0; i < chars.length; i++) {
    if (out.length >= MAX_NAME * 4) break;
    const ch = chars[i];
    if (ch !== "$") {
      out += ch;
      continue;
    }
    const next = chars[i + 1];
    if (next === "&") out += c.matched;
    else if (next === "`") out += c.before;
    else if (next === "'") out += c.after;
    else if (next === "$") out += "$";
    else if (next === "n" || next === "N") {
      let width = 0;
      while (chars[i + 1] === next) {
        i++;
        width++;
      }
      out += String(next === "n" ? c.up : c.down).padStart(Math.min(width, MAX_PAD), "0");
      continue;
    } else if (next !== undefined && next >= "1" && next <= "9" && c.groups && Number(next) < c.groups.length) out += c.groups[Number(next)] ?? "";
    else if (next !== undefined && next >= "1" && next <= "9") out += `$${next}`;
    else {
      out += "$";
      continue;
    }
    i++;
  }
  return out;
}

/** A batch rename, checked: null and why when the settings can't be used (a match too long, a bad regular expression). */
export function batchRename(settings: RenameSettings): { apply: (name: string, k: number, n: number) => string } | { error: string } {
  const find = settings.find ?? "";
  if ([...find].length > MAX_FIND) return { error: `the match is longer than ${MAX_FIND} characters` };
  let re: RegExp | null = null;
  if (find && settings.regex) {
    try {
      re = new RegExp(find, "gu");
    } catch (e) {
      return { error: `invalid regular expression: ${(e as Error).message}` };
    }
  }
  const start = Number.isFinite(settings.start) ? Math.round(Math.min(1e12, Math.max(0, settings.start!))) : 1;
  const replace = settings.replace ?? "";
  return {
    apply: (name, k, n) => {
      const up = start + k;
      const down = start + Math.max(0, n - (k + 1));
      let out = name;
      if (find && re) {
        out = "";
        let last = 0;
        re.lastIndex = 0;
        for (const m of name.matchAll(re)) {
          const at = m.index ?? 0;
          if (m[0] === "" && at === last && at >= name.length) break;
          out += name.slice(last, at) + expand(replace, { matched: m[0], before: name.slice(0, at), after: name.slice(at + m[0].length), groups: [...m], up, down });
          last = at + m[0].length;
          if (out.length >= MAX_NAME * 4) break;
        }
        out += name.slice(last);
      } else if (find) {
        out = "";
        let last = 0;
        for (let at = name.indexOf(find); at >= 0; at = name.indexOf(find, at + find.length)) {
          out += name.slice(last, at) + expand(replace, { matched: find, before: name.slice(0, at), after: name.slice(at + find.length), groups: null, up, down });
          last = at + find.length;
        }
        out += name.slice(last);
      }
      if (settings.pattern !== undefined && settings.pattern !== "") out = expand(settings.pattern, { matched: out, before: "", after: "", groups: null, up, down });
      return [...out].slice(0, MAX_NAME).join("");
    },
  };
}

/** Renames layers (numbered in stacking order, bottom first). Returns how many names changed, or an error. */
export function renameLayers(ids: readonly string[], settings: RenameSettings): { changed: number } | { error: string } {
  const r = batchRename(settings);
  if ("error" in r) return r;
  const wanted = new Set(ids);
  const ordered = documentOrder(layers()).filter((id) => wanted.has(id) && layers()[id].locked !== true);
  const plan = ordered.map((id, k) => [id, r.apply(layers()[id].name, k, ordered.length)] as const).filter(([id, name]) => name.trim() && name !== layers()[id].name);
  if (plan.length === 0) return { changed: 0 };
  documentCommands.mutate("Rename layers", (d) => {
    for (const [id, name] of plan) d.layers[id].name = name;
  });
  return { changed: plan.length };
}

// --- selection spacing ---------------------------------------------------------------------------

const EPS = 0.01;

/** A layer's bounds on the page (its rotated box's bounding rectangle). */
interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
function rectOf(b: Box): Rect {
  const pts = corners(b);
  return { x0: Math.min(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), x1: Math.max(...pts.map((p) => p.x)), y1: Math.max(...pts.map((p) => p.y)) };
}
const union = (a: Rect, b: Rect): Rect => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });

export interface Track {
  ids: string[];
  bounds: Rect;
  anchor: Rect;
}
export interface SpacingAxis {
  tracks: Track[];
  vertical: boolean;
  /** The gap shared by every pair of tracks; null when they differ. */
  value: number | null;
}

const lo = (b: Rect, vertical: boolean) => (vertical ? b.y0 : b.x0);
const hi = (b: Rect, vertical: boolean) => (vertical ? b.y1 : b.x1);

function axisOf(items: readonly [string, Rect][], vertical: boolean): SpacingAxis | null {
  const sorted = [...items].sort((a, b) => lo(a[1], vertical) - lo(b[1], vertical) || (a[0] < b[0] ? -1 : 1));
  const tracks: Track[] = [];
  for (const [id, b] of sorted) {
    const [l, h] = [lo(b, vertical), hi(b, vertical)];
    const aligned = tracks.find((t) => {
      const [a, z] = [lo(t.anchor, vertical), hi(t.anchor, vertical)];
      return Math.abs(l - a) <= EPS || Math.abs(h - z) <= EPS || Math.abs((l + h - a - z) * 0.5) <= EPS;
    });
    if (aligned) {
      aligned.ids.push(id);
      aligned.bounds = union(aligned.bounds, b);
    } else tracks.push({ ids: [id], bounds: b, anchor: b });
  }
  if (tracks.length < 2) return null;
  tracks.sort((a, b) => lo(a.bounds, vertical) - lo(b.bounds, vertical));
  // diagonally scattered layers aren't a row, column or grid
  const crossLo = Math.max(...tracks.map((t) => lo(t.bounds, !vertical)));
  const crossHi = Math.min(...tracks.map((t) => hi(t.bounds, !vertical)));
  if (crossHi - crossLo <= EPS) return null;
  const gaps = tracks.slice(1).map((t, i) => lo(t.bounds, vertical) - hi(tracks[i].bounds, vertical));
  return { tracks, vertical, value: gaps.every((g) => Math.abs(g - gaps[0]) <= EPS) ? gaps[0] : null };
}

/**
 * The spacing a selection offers: only movable, visible siblings outside an auto-layout flow, none inside an
 * instance, none locked (a gap edit must not move anything else); two or more, at most 2,000.
 */
export function selectionSpacing(ids: readonly string[]): { horizontal: SpacingAxis | null; vertical: SpacingAxis | null } {
  const none = { horizontal: null, vertical: null };
  const L = layers();
  const unique = [...new Set(ids)];
  if (unique.length < 2 || unique.length > 2000) return none;
  const parent = L[unique[0]]?.parentId;
  const items: [string, Rect][] = [];
  for (const id of unique) {
    const l = L[id];
    if (!l || l.parentId !== parent || parent === null || !visibleUp(L, id) || lockedUp(L, id) || (l.instance && !l.instance.root)) return none;
    const p = L[parent];
    if (p && p.properties["layout.auto"] === true && l.properties.positioning !== "absolute") return none;
    const box = worldBox(id);
    if (!box) return none;
    const r = rectOf(box);
    if (![r.x0, r.y0, r.x1, r.y1].every(Number.isFinite) || r.x1 - r.x0 <= EPS || r.y1 - r.y0 <= EPS) return none;
    items.push([id, r]);
  }
  return { horizontal: axisOf(items, false), vertical: axisOf(items, true) };
}

function visibleUp(L: Record<string, Layer>, id: string): boolean {
  for (let cur: Layer | undefined = L[id], g = 0; cur && g < 10_000; cur = cur.parentId ? L[cur.parentId] : undefined, g++) if (cur.visible === false) return false;
  return true;
}
function lockedUp(L: Record<string, Layer>, id: string): boolean {
  for (let cur: Layer | undefined = L[id], g = 0; cur && g < 10_000; cur = cur.parentId ? L[cur.parentId] : undefined, g++) if (cur.locked === true) return true;
  return false;
}

/** The page-space moves that give an axis one gap, keeping the first track where it is. */
export function spacingOffsets(axis: SpacingAxis, value: number): [string, number][] {
  let pos = lo(axis.tracks[0].bounds, axis.vertical);
  const out: [string, number][] = [];
  for (const t of axis.tracks) {
    const delta = pos - lo(t.bounds, axis.vertical);
    for (const id of t.ids) out.push([id, delta]);
    pos += hi(t.bounds, axis.vertical) - lo(t.bounds, axis.vertical) + value;
  }
  return out;
}

/** Sets the gap between a selection's columns (`horizontal`) and/or rows (`vertical`). Refused (false) when the selection has no such axis. */
export function setSelectionSpacing(ids: readonly string[], gaps: { horizontal?: number; vertical?: number }): boolean {
  const layout = selectionSpacing(ids);
  const ok = (v: number | undefined) => v === undefined || (Number.isFinite(v) && Math.abs(v) <= 100_000);
  if (!ok(gaps.horizontal) || !ok(gaps.vertical) || (gaps.horizontal === undefined && gaps.vertical === undefined)) return false;
  if ((gaps.horizontal !== undefined && !layout.horizontal) || (gaps.vertical !== undefined && !layout.vertical)) return false;
  const dx = new Map<string, number>(gaps.horizontal !== undefined ? spacingOffsets(layout.horizontal!, gaps.horizontal) : []);
  const dy = new Map<string, number>(gaps.vertical !== undefined ? spacingOffsets(layout.vertical!, gaps.vertical) : []);
  const moved = [...new Set([...dx.keys(), ...dy.keys()])].filter((id) => Math.abs(dx.get(id) ?? 0) > 1e-9 || Math.abs(dy.get(id) ?? 0) > 1e-9);
  transaction("Spacing", () => {
    const boxes = moved.map((id) => {
      const b = worldBox(id)!;
      return { ...b, cx: b.cx + (dx.get(id) ?? 0), cy: b.cy + (dy.get(id) ?? 0) };
    });
    writeBoxes(moved, boxes);
  });
  return true;
}

// --- selection reorder ------------------------------------------------------------------------------

export interface ReorderLayout {
  /** Visual order (rows, then columns), independent of selection order and stacking. */
  slots: [string, Rect][];
  columns: number;
  rows: number;
  gapX: number;
  gapY: number;
}

/** A regular, non-overlapping row, column or complete top-left-aligned grid; null for anything else. */
export function reorderLayout(ids: readonly string[]): ReorderLayout | null {
  const { horizontal: h, vertical: v } = selectionSpacing(ids);
  const gap = (a: SpacingAxis | null) => (a ? (a.value !== null && a.value >= 0 ? a.value : null) : 0);
  const gapX = gap(h);
  const gapY = gap(v);
  if (gapX === null || gapY === null) return null;
  const unique = [...new Set(ids)];
  const columns = h?.tracks.length ?? 1;
  const rows = v?.tracks.length ?? 1;
  if (unique.length < 2 || columns * rows !== unique.length) return null;
  const cells = new Map<string, [string, Rect]>();
  for (const id of unique) {
    const col = h ? h.tracks.findIndex((t) => t.ids.includes(id)) : 0;
    const row = v ? v.tracks.findIndex((t) => t.ids.includes(id)) : 0;
    if (col < 0 || row < 0) return null;
    const b = rectOf(worldBox(id)!);
    if (columns > 1 && rows > 1 && (Math.abs(b.x0 - h!.tracks[col].bounds.x0) > EPS || Math.abs(b.y0 - v!.tracks[row].bounds.y0) > EPS)) return null;
    const key = `${String(row).padStart(6, "0")}:${String(col).padStart(6, "0")}`;
    if (cells.has(key)) return null;
    cells.set(key, [id, b]);
  }
  return { slots: [...cells.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v), columns, rows, gapX, gapY };
}

/** Where each layer goes when `source` moves to `target`'s slot (the rest reflow) or, with `swap`, the two exchange. */
export function reorderPositions(layout: ReorderLayout, source: string, target: string, swap = false): [string, number, number][] | null {
  const from = layout.slots.findIndex(([id]) => id === source);
  const to = layout.slots.findIndex(([id]) => id === target);
  if (from < 0 || to < 0) return null;
  if (from === to) return layout.slots.map(([id, b]) => [id, b.x0, b.y0]);
  const order = [...layout.slots];
  if (swap) [order[from], order[to]] = [order[to], order[from]];
  else order.splice(to, 0, ...order.splice(from, 1));
  const widths = new Array(layout.columns).fill(0);
  const heights = new Array(layout.rows).fill(0);
  order.forEach(([, b], i) => {
    widths[i % layout.columns] = Math.max(widths[i % layout.columns], b.x1 - b.x0);
    heights[Math.floor(i / layout.columns)] = Math.max(heights[Math.floor(i / layout.columns)], b.y1 - b.y0);
  });
  const x0 = Math.min(...layout.slots.map(([, b]) => b.x0));
  const y0 = Math.min(...layout.slots.map(([, b]) => b.y0));
  const starts = (sizes: number[], at: number, gap: number) => sizes.map((s) => ((at += s + gap), at - s - gap));
  const xs = starts(widths, x0, layout.gapX);
  const ys = starts(heights, y0, layout.gapY);
  return order.map(([id, b], i) => [id, layout.columns === 1 ? b.x0 : xs[i % layout.columns], layout.rows === 1 ? b.y0 : ys[Math.floor(i / layout.columns)]]);
}

/** Moves `source` to `target`'s place in a smart selection (or swaps them). False when the selection isn't regular. */
export function reorderSelection(ids: readonly string[], source: string, target: string, swap = false): boolean {
  const layout = reorderLayout(ids);
  const pos = layout && reorderPositions(layout, source, target, swap);
  if (!pos) return false;
  const moves = pos
    .map(([id, x, y]) => {
      const b = worldBox(id)!;
      const r = rectOf(b);
      return { id, box: { ...b, cx: b.cx + (x - r.x0), cy: b.cy + (y - r.y0) }, moved: Math.abs(x - r.x0) > 1e-9 || Math.abs(y - r.y0) > 1e-9 };
    })
    .filter((m) => m.moved);
  if (moves.length === 0) return true;
  transaction("Reorder selection", () => writeBoxes(moves.map((m) => m.id), moves.map((m) => m.box)));
  return true;
}

// --- selection colours ------------------------------------------------------------------------------

/** One paint slot: a paint list's entry (`index`), a plain colour property, or a styled text run's colour. */
export interface PaintTarget {
  id: string;
  prop: string;
  /** The entry of a paint list (`paint.fills`, `paint.strokes`), or the run of `content.runs`. */
  index?: number;
}

export interface SelectionColor {
  /** A solid paint is its colour as hex (`#rrggbbaa` when translucent); a gradient its paint JSON. */
  key: string;
  paint: Paint;
  /** The variable the slots follow, when they do. */
  variable?: string;
  targets: PaintTarget[];
}

/** The plain colour properties that are a layer's fill or stroke, by archetype kind. */
const PLAIN = ["appearance.background.color", "svg.fill", "typography.color", "svg.stroke", "appearance.border.color"];

const solidKey = (color: string): string | null => {
  const c = parseCss(color);
  return c && c.a > 0 ? toCssHex(c).toLowerCase() : null;
};

/**
 * Every visible solid or gradient paint the selection uses, its layers' descendants included (a boolean group's
 * operands excepted), grouped by value and variable, in a stable order. Images are assets, not colours.
 */
export function selectionColors(ids: readonly string[]): SelectionColor[] {
  const L = layers();
  const groups: SelectionColor[] = [];
  const index = new Map<string, number>();
  const seen = new Set<string>();
  const add = (key: string, paint: Paint, variable: string | undefined, target: PaintTarget) => {
    const k = `${variable ?? ""}\u0000${key}`;
    const at = index.get(k);
    if (at !== undefined) groups[at].targets.push(target);
    else {
      index.set(k, groups.length);
      groups.push({ key, paint, ...(variable ? { variable } : {}), targets: [target] });
    }
  };
  const pending = [...ids].reverse();
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const l = L[id];
    if (!l) continue;
    if (!l.properties["boolean.operation"]) pending.push(...[...l.children].reverse());
    for (const prop of ["paint.fills", "paint.strokes"]) {
      const list = parseFills(l.properties[prop]);
      if (!list) continue;
      list.forEach((p, i) => {
        if (p.visible === false) return;
        if (p.type === "solid") {
          const key = solidKey(p.color);
          if (key) add(key, p, undefined, { id, prop, index: i });
        } else if (p.type !== "image") add(JSON.stringify({ ...p, visible: true }), p, undefined, { id, prop, index: i });
      });
    }
    for (const prop of PLAIN) {
      const v = l.properties[prop];
      // a plain colour is drawn only when no paint list stands for it
      if (typeof v !== "string" || (prop !== "typography.color" && prop !== "svg.stroke" && prop !== "appearance.border.color" && parseFills(l.properties["paint.fills"]))) continue;
      if (prop === "svg.stroke" && parseFills(l.properties["paint.strokes"])) continue;
      if (prop === "appearance.border.color" && !(Number(l.properties["appearance.border.width"]) > 0)) continue;
      const key = solidKey(v);
      const b = l.tokens?.[prop];
      if (key) add(key, { type: "solid", color: v, opacity: 1, visible: true }, b && !b.detached ? b.variable : undefined, { id, prop });
    }
    if (l.archetype === "text") {
      const text = typeof l.properties["content.text"] === "string" ? (l.properties["content.text"] as string) : "";
      parseRuns(l.properties["content.runs"], text)?.forEach((r, i) => {
        const key = r.color ? solidKey(r.color) : null;
        if (key && r.color) add(key, { type: "solid", color: r.color, opacity: 1, visible: true }, undefined, { id, prop: "content.runs", index: i });
      });
    }
  }
  return groups;
}

/**
 * Changes the paint of every target slot. A plain colour property or a text run takes a solid paint's colour only;
 * a list entry takes the whole paint (keeping its own blend and visibility). Returns how many layers changed.
 */
export function setSelectionPaint(targets: readonly PaintTarget[], paint: Paint): number {
  const L = layers();
  const byLayer = new Map<string, PaintTarget[]>();
  for (const t of targets) if (L[t.id] && L[t.id].locked !== true) (byLayer.get(t.id) ?? byLayer.set(t.id, []).get(t.id)!).push(t);
  if (byLayer.size === 0) return 0;
  transaction("Selection colour", () => {
    for (const [id, list] of byLayer) {
      const l = layers()[id];
      const patch: Record<string, PropValue> = {};
      for (const t of list) {
        if (t.prop === "paint.fills" || t.prop === "paint.strokes") {
          const paints = parseFills(patch[t.prop] ?? l.properties[t.prop]);
          if (!paints || t.index === undefined || !paints[t.index]) continue;
          const keep = { blend: paints[t.index].blend, visible: paints[t.index].visible };
          paints[t.index] = { ...paint, ...(keep.blend ? { blend: keep.blend } : {}), visible: keep.visible } as Paint;
          patch[t.prop] = serializeFills(paints);
        } else if (paint.type === "solid") {
          if (t.prop === "content.runs") {
            const text = typeof l.properties["content.text"] === "string" ? (l.properties["content.text"] as string) : "";
            const runs = parseRuns(patch["content.runs"] ?? l.properties["content.runs"], text);
            if (!runs || t.index === undefined || !runs[t.index]) continue;
            runs[t.index] = { ...runs[t.index], color: paint.color };
            patch["content.runs"] = serializeRuns(runs);
          } else patch[t.prop] = paint.color;
        }
      }
      if (Object.keys(patch).length > 0) documentCommands.updateProps(id, patch, "Selection colour");
    }
  });
  return byLayer.size;
}

/** Selects the layers that show a colour. */
export function selectWithColor(targets: readonly PaintTarget[]): string[] {
  const ids = [...new Set(targets.map((t) => t.id))].filter((id) => layers()[id]);
  if (ids.length > 0) useSelectionStore.getState().selectMultiple(ids, "element");
  return ids;
}
