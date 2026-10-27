/**
 * The Scale tool (K) and `transform.scale` (FigCraft port F12): everything in the selection scales by one factor about
 * a pivot, sizes and positions (whatever the children's constraints) and every size-like property with them: strokes,
 * dashes, radii, shadows and effects, auto-layout spacing, min and max sizes, layout grids, ruler guides, text sizes,
 * spacing and paths. Dragging a handle picks the factor and the pivot: the anchor point (one of nine), or the opposite
 * handle when the anchor lies on the side being dragged, or the centre with Alt; past the pivot the layer turns over.
 *
 * Behaviour translated from FigCraft (`crates/engine/src/tools.rs` `scale_factor`, `cmd/arrange.rs` `scale_node`,
 * `scale_tool_tests.rs`), commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */

import type { Layer } from "../document/schema";
import type { PropValue } from "../document/registry";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { pathDataToBez } from "../paths/bezBridge";
import { parseEffects, scaledBlur, serializeEffects, type Effect } from "../paint/effects";
import { parseShadows, serializeShadows } from "../paint/paints";
import { corners, type Box, type ResizeHandle } from "../geometry/transform";
import { transaction } from "./editOps";
import { subtreeIds, topmost } from "./cloneLayers";
import { worldBox, writeBoxes } from "./layerBoxes";

export interface Pt {
  x: number;
  y: number;
}

/** An anchor: column and row, 0..2 each (top-left is 0, 0). */
export type Anchor = [number, number];
const ANCHOR_NAMES = ["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"];

/** An anchor by name (`tl`, `t`, `tr`, `l`, `c`, `r`, `bl`, `b`, `br`, any case and spacing), or null. */
export function anchorOf(name: string): Anchor | null {
  const i = ANCHOR_NAMES.indexOf(name.trim().toLowerCase());
  return i < 0 ? null : [i % 3, Math.floor(i / 3)];
}
export const anchorName = (a: Anchor): string => ANCHOR_NAMES[Math.min(2, Math.max(0, a[1])) * 3 + Math.min(2, Math.max(0, a[0]))] ?? "br";

/** A handle in FigCraft's terms: a corner (0 top-left, clockwise) or an edge (0 top, clockwise). */
export type ScaleHandle = { corner: number } | { edge: number };

/** Our resize handle names as FigCraft's corners and edges. */
export function scaleHandleOf(h: ResizeHandle): ScaleHandle {
  return ({ nw: { corner: 0 }, ne: { corner: 1 }, se: { corner: 2 }, sw: { corner: 3 }, n: { edge: 0 }, e: { edge: 1 }, s: { edge: 2 }, w: { edge: 3 } } as const)[h];
}

function handlePoint(h: ScaleHandle, w: number, h0: number): Pt {
  if ("corner" in h) return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h0 }, { x: 0, y: h0 }][h.corner % 4];
  return [{ x: w / 2, y: 0 }, { x: w, y: h0 / 2 }, { x: w / 2, y: h0 }, { x: 0, y: h0 / 2 }][h.edge % 4];
}
const opposite = (h: ScaleHandle): ScaleHandle => ("corner" in h ? { corner: (h.corner + 2) % 4 } : { edge: (h.edge + 2) % 4 });

/**
 * The factor and pivot (in the box's own space, 0..w by 0..h) of dragging `handle` of a `w0` × `h0` box to `q`. The
 * pivot is the anchor point, or the opposite handle when the anchor lies on the side being dragged, or the centre
 * (`fromCenter`). Corners follow the axis that moved the most; a negative factor flips; never smaller than 1% or larger
 * than 1000×. Null when the box has no size to scale by (FigCraft `scale_factor`).
 */
export function scaleFactor(handle: ScaleHandle, q: Pt, w0: number, h0: number, anchor: Anchor, fromCenter: boolean): { k: number; pivot: Pt } | null {
  const EPS = 1e-9;
  if (![q.x, q.y, w0, h0].every(Number.isFinite)) return null;
  const h = handlePoint(handle, w0, h0);
  const a = { x: (anchor[0] * w0) / 2, y: (anchor[1] * h0) / 2 };
  const axX = "corner" in handle || handle.edge % 2 === 1;
  const axY = "corner" in handle || handle.edge % 2 === 0;
  const onSide = (axX && Math.abs(a.x - h.x) < EPS) || (axY && Math.abs(a.y - h.y) < EPS);
  const pivot = fromCenter ? { x: w0 / 2, y: h0 / 2 } : onSide ? handlePoint(opposite(handle), w0, h0) : a;
  const ratio = (on: boolean, to: number, from: number, p: number) => (on && Math.abs(from - p) > EPS ? (to - p) / (from - p) : null);
  const kx = ratio(axX, q.x, h.x, pivot.x);
  const ky = ratio(axY, q.y, h.y, pivot.y);
  const k = kx !== null && ky !== null ? (Math.abs(kx) > Math.abs(ky) ? kx : ky) : (kx ?? ky);
  if (k === null || !Number.isFinite(k)) return null;
  return { k: (k < 0 ? -1 : 1) * Math.min(1000, Math.max(0.01, Math.abs(k))), pivot };
}

/** The point of a box an anchor names, on the page. */
export function anchorPoint(b: Box, anchor: Anchor): Pt {
  const local = { x: (anchor[0] - 1) * (b.w / 2), y: (anchor[1] - 1) * (b.h / 2) };
  const r = (b.rot * Math.PI) / 180;
  return { x: b.cx + local.x * Math.cos(r) - local.y * Math.sin(r), y: b.cy + local.x * Math.sin(r) + local.y * Math.cos(r) };
}

// --- what scales -----------------------------------------------------------------------------------

/** Plain numbers that are lengths. */
const LENGTHS = [
  "svg.strokeWidth",
  "appearance.border.width",
  "appearance.radius",
  "shape.cornerRadius",
  "shape.cornerRadius.topLeft",
  "shape.cornerRadius.topRight",
  "shape.cornerRadius.bottomRight",
  "shape.cornerRadius.bottomLeft",
  "shape.vertexRadius",
  "shape.headLength",
  "shape.headWidth",
  "shape.shaftWidth",
  "filter.blur",
  "paint.backgroundBlur",
  "layout.gap",
  "layout.rowGap",
  "layout.columnGap",
  "layout.padding",
  "layout.paddingX",
  "layout.paddingY",
  "layout.paddingTop",
  "layout.paddingRight",
  "layout.paddingBottom",
  "layout.paddingLeft",
  "layout.minWidth",
  "layout.maxWidth",
  "layout.minHeight",
  "layout.maxHeight",
  "typography.fontSize",
  "typography.decorationThickness",
  "typography.decorationOffset",
  "typography.paragraphSpacing",
  "typography.paragraphIndent",
  "typography.listSpacing",
];

const scaleEffect = (e: Effect, k: number): Effect => {
  if (e.type === "layerBlur" || e.type === "backgroundBlur") return { ...e, ...scaledBlur(e, k) };
  if (e.type === "noise" || e.type === "texture") return { ...e, size: e.size * k, ...(e.sizeY !== undefined ? { sizeY: e.sizeY * k } : {}), ...(e.type === "texture" ? { radius: e.radius * k } : {}) };
  return { ...e, depth: e.depth * k, frost: e.frost * k };
};

/** A layer's size-like properties scaled by `k` (its frame excepted): the patch to write. */
export function scaleProps(l: Layer, k: number): Record<string, PropValue> {
  const p = l.properties;
  const out: Record<string, PropValue> = {};
  const r = (v: number) => Math.round(v * k * 1000) / 1000;
  for (const key of LENGTHS) if (typeof p[key] === "number" && Number.isFinite(p[key])) out[key] = r(p[key] as number);
  // a letter, word or line spacing in pixels (a multiplier, em or percent follows the font size by itself)
  const px = (key: string, unitKey: string, pxByDefault: boolean) => {
    const unit = p[unitKey];
    if (typeof p[key] === "number" && (unit === "px" || (pxByDefault && (unit === undefined || unit === "")))) out[key] = r(p[key] as number);
  };
  px("typography.letterSpacing", "typography.letterSpacingUnit", true);
  px("typography.wordSpacing", "typography.wordSpacingUnit", true);
  px("typography.lineHeight", "typography.lineHeightUnit", false);
  if (typeof p["stroke.sides"] === "string" && p["stroke.sides"]) {
    try {
      const s = JSON.parse(p["stroke.sides"]) as unknown;
      if (Array.isArray(s) && s.every((v) => typeof v === "number")) out["stroke.sides"] = JSON.stringify(s.map((v: number) => r(v)));
    } catch {
      /* junk stays */
    }
  }
  if (typeof p["svg.strokeDasharray"] === "string" && /^[\d.\s,]+$/.test(p["svg.strokeDasharray"])) out["svg.strokeDasharray"] = p["svg.strokeDasharray"].trim().split(/[\s,]+/).map((v) => String(r(Number(v)))).join(" ");
  const shadows = parseShadows(p["paint.shadows"]);
  if (shadows.length > 0) out["paint.shadows"] = serializeShadows(shadows.map((s) => ({ ...s, x: r(s.x), y: r(s.y), blur: r(s.blur), spread: r(s.spread) })));
  const effects = parseEffects(p["paint.effects"]);
  if (effects.length > 0) out["paint.effects"] = serializeEffects(effects.map((e) => scaleEffect(e, k)));
  if (typeof p["frame.layoutGrids"] === "string" && p["frame.layoutGrids"]) {
    try {
      const g = JSON.parse(p["frame.layoutGrids"]) as { size?: number; gutter?: number; offset?: number }[];
      if (Array.isArray(g)) out["frame.layoutGrids"] = JSON.stringify(g.map((x) => ({ ...x, ...(typeof x.size === "number" ? { size: r(x.size) } : {}), ...(typeof x.gutter === "number" ? { gutter: r(x.gutter) } : {}), ...(typeof x.offset === "number" ? { offset: r(x.offset) } : {}) })));
    } catch {
      /* junk stays */
    }
  }
  if (typeof p["frame.guides"] === "string" && p["frame.guides"]) {
    try {
      const g = JSON.parse(p["frame.guides"]) as { axis: string; pos: number }[];
      if (Array.isArray(g)) out["frame.guides"] = JSON.stringify(g.map((x) => ({ ...x, pos: typeof x.pos === "number" ? r(x.pos) : x.pos })));
    } catch {
      /* junk stays */
    }
  }
  if (typeof p["typography.textPath"] === "string" && p["typography.textPath"]) {
    try {
      const tp = JSON.parse(p["typography.textPath"]) as { d: string };
      const path = pathDataToBez(tp.d);
      if (path) out["typography.textPath"] = JSON.stringify({ ...tp, d: path.map((q) => ({ x: q.x * k, y: q.y * k })).toSvg(2) });
    } catch {
      /* junk stays */
    }
  }
  return out;
}

// --- scaling layers ------------------------------------------------------------------------------------

let anchor: Anchor = [0, 0];
/** The Scale tool's anchor (one of nine points; top-left to begin with). */
export const scaleAnchor = (): Anchor => anchor;
export function setScaleAnchor(a: Anchor): void {
  anchor = [Math.min(2, Math.max(0, Math.round(a[0]))), Math.min(2, Math.max(0, Math.round(a[1])))];
}

/**
 * Scales layers and everything in them by `k` about page point `pivot`, from `base` (the layers as they were when a
 * drag began, so a drag can write its absolute result each move; the document by default). One undo step.
 */
export function scaleLayers(ids: readonly string[], k: number, pivot: Pt, base?: { layers: Record<string, Layer>; boxes: Map<string, Box> }): number {
  if (!Number.isFinite(k) || k === 0 || !Number.isFinite(pivot.x) || !Number.isFinite(pivot.y)) return 0;
  const L = base?.layers ?? getDocument().layers;
  const roots = topmost(L, ids).filter((id) => L[id] && L[id].locked !== true && L[id].parentId !== null);
  if (roots.length === 0) return 0;
  const m = Math.abs(k);
  transaction("Scale", () => {
    for (const id of roots) {
      const box = base?.boxes.get(id) ?? worldBox(id);
      if (!box) continue;
      const l = L[id];
      const parent = l.parentId ? L[l.parentId] : undefined;
      const inFlow = parent?.properties["layout.auto"] === true && l.properties.positioning !== "absolute";
      if (inFlow) documentCommands.updateProps(id, { "frame.width": Math.round(box.w * m * 100) / 100, "frame.height": Math.round(box.h * m * 100) / 100 });
      else writeBoxes([id], [{ ...box, cx: pivot.x + (box.cx - pivot.x) * k, cy: pivot.y + (box.cy - pivot.y) * k, w: box.w * m, h: box.h * m }], undefined, { size: true });
      documentCommands.updateProps(id, scaleProps(l, m));
      // what is inside scales with it, wherever its constraints would have put it
      for (const d of subtreeIds(L, id)) {
        if (d === id || !L[d]) continue;
        const dl = L[d];
        const patch: Record<string, PropValue> = scaleProps(dl, m);
        for (const key of ["frame.x", "frame.y", "frame.width", "frame.height"]) if (typeof dl.properties[key] === "number") patch[key] = Math.round((dl.properties[key] as number) * m * 100) / 100;
        documentCommands.updateProps(d, patch);
      }
    }
  });
  return roots.length;
}

/** The page box of several layers together (their rotated boxes' bounds). */
export function boundsOf(ids: readonly string[]): Box | null {
  const pts = ids.map((id) => worldBox(id)).filter((b): b is Box => !!b).flatMap((b) => corners(b));
  if (pts.length === 0) return null;
  const x0 = Math.min(...pts.map((p) => p.x));
  const y0 = Math.min(...pts.map((p) => p.y));
  const x1 = Math.max(...pts.map((p) => p.x));
  const y1 = Math.max(...pts.map((p) => p.y));
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, rot: 0 };
}

/** `transform.scale`: scales the selection by `factor` about its anchor point (the Scale tool's, or the one given). */
export function scaleSelection(ids: readonly string[], factor: number, at?: Anchor): number {
  const b = boundsOf(topmost(getDocument().layers, ids));
  if (!b || !(factor > 0)) return 0;
  return scaleLayers(ids, factor, anchorPoint(b, at ?? anchor));
}
