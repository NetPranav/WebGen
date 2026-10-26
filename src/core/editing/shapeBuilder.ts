/**
 * The Shape Builder (FigCraft port F5): build shapes from the overlapping regions of the selected layers.
 *
 * The selected layers' outlines cut the canvas into **regions**: connected areas covered by the same layers. Merging
 * regions makes one new path layer from them, styled like the top-most layer over the first region; removing regions
 * deletes them. Either way every layer covering a picked region loses that area (it becomes a path layer, or is
 * deleted when nothing is left), so the rest of the drawing stays exactly where it was.
 *
 * A visible stroke takes part as its own region-maker (its painted band), above the layer's fill, so stroked lines
 * and open paths split the regions they cross. When a stroked layer takes part in a merge or removal, its stroke
 * becomes a path layer of its own (filled with the stroke's colour) just above it; open paths are replaced by it.
 *
 * Behaviour translated from FigCraft (`crates/engine/src/shapebuilder.rs`), commit 6ea44e9. MIT, Copyright (c) 2026
 * ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import type { Layer } from "../document/schema";
import type { PropValue } from "../document/registry";
import { BezPath, type Pt } from "../geometry/bezpath";
import { winding } from "../geometry/measure";
import { arrangementFaces, unionFaces, MAX_ARRANGEMENT_INPUTS } from "../paths/pathOps";
import { fromPath, serializeNetwork, interiorPointOf } from "../paths/vectorNetwork";
import { documentCommands } from "../store/useDocumentStore";
import { getDocument } from "../store/documentState";
import { useSelectionStore } from "../store/useSelectionStore";
import { transaction } from "./editOps";
import { parentOrigin, worldBox } from "./layerBoxes";
import { isBooleanGroup, layerOutline, layerSize, layerStrokeArea, toWorld } from "./layerOutline";

/** One input of the arrangement: a layer's fill, or its stroke's painted band. */
export interface Part {
  id: string;
  stroke: boolean;
}

export interface BuilderRegion {
  /** Outline in canvas space. */
  path: BezPath;
  /** The layers covering it, top-most first. */
  sources: string[];
  /** The fills and strokes covering it, top-most first. */
  parts: Part[];
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** A point inside. */
  point: Pt | null;
}

export interface Arrangement {
  /** The layers taking part, bottom to top. */
  sources: string[];
  /** Their fills and strokes, bottom to top (a layer's stroke above its fill). */
  parts: Part[];
  regions: BuilderRegion[];
}

const layers = () => getDocument().layers;
const SHAPES = new Set(["rectangle", "ellipse", "polygon", "star", "svgPath", "line"]);

/** Can a layer take part? Visible, unlocked shapes (lines through their strokes) and boolean groups, not inside a boolean group. */
function usable(l: Layer | undefined, all: Readonly<Record<string, Layer>>): boolean {
  if (!l || l.visible === false || l.locked === true) return false;
  if (!(SHAPES.has(l.archetype) || isBooleanGroup(l))) return false;
  let p = l.parentId ? all[l.parentId] : undefined;
  for (let guard = 0; p && guard < 10_000; guard++) {
    if (isBooleanGroup(p) || p.locked === true) return false;
    p = p.parentId ? all[p.parentId] : undefined;
  }
  return true;
}

/** Document order (depth first), for bottom-to-top sorting. */
function documentRank(all: Readonly<Record<string, Layer>>): Map<string, number> {
  const rank = new Map<string, number>();
  let i = 0;
  const walk = (id: string, depth: number) => {
    if (depth > 10_000) return;
    rank.set(id, i++);
    for (const c of all[id]?.children ?? []) walk(c, depth + 1);
  };
  for (const l of Object.values(all)) if (!l.parentId) walk(l.id, 0);
  return rank;
}

/** The layers `ids` stand for (plain groups contribute their shapes), bottom to top. */
export function eligible(ids: readonly string[]): string[] {
  const all = layers();
  const out: string[] = [];
  const walk = (id: string, depth: number) => {
    const l = all[id];
    if (!l) return;
    if ((l.archetype === "container" || l.archetype === "form") && !isBooleanGroup(l) && l.parentId && depth < 64) for (const c of l.children) walk(c, depth + 1);
    else if (usable(l, all)) out.push(id);
  };
  for (const id of ids) walk(id, 0);
  const rank = documentRank(all);
  return [...new Set(out)].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0)).slice(0, MAX_ARRANGEMENT_INPUTS);
}

/** A part's area on the canvas and whether it fills even-odd; null when it has none. */
function worldArea(part: Part): { path: BezPath; evenOdd: boolean } | null {
  const all = layers();
  const l = all[part.id];
  const box = l ? worldBox(part.id) : null;
  if (!l || !box) return null;
  const own = layerSize(l);
  if (part.stroke) {
    const s = layerStrokeArea(l, all);
    return s && !s.isEmpty() ? { path: toWorld(s, box, own), evenOdd: false } : null;
  }
  const o = layerOutline(l, all);
  return o && !o.path.isEmpty() ? { path: toWorld(o.path, box, own), evenOdd: o.evenOdd } : null;
}

/** The regions formed by `ids` (default: the selection). */
export function arrangement(ids: readonly string[] = useSelectionStore.getState().selectedIds): Arrangement {
  const sources: string[] = [];
  const parts: Part[] = [];
  const inputs: { path: BezPath; evenOdd: boolean }[] = [];
  for (const id of eligible(ids)) {
    const before = parts.length;
    for (const part of [{ id, stroke: false }, { id, stroke: true }]) {
      if (inputs.length >= MAX_ARRANGEMENT_INPUTS) break;
      const a = worldArea(part);
      if (a) {
        parts.push(part);
        inputs.push(a);
      }
    }
    if (parts.length > before) sources.push(id);
  }
  const faces = arrangementFaces(inputs) ?? [];
  const regions: BuilderRegion[] = faces
    .filter((f) => Math.abs(f.path.area()) > 1e-4)
    .map((f) => {
      const covering = [...f.cover].reverse().map((i) => parts[i]).filter((p): p is Part => !!p);
      return { path: f.path, parts: covering, sources: [...new Set(covering.map((p) => p.id))], bounds: f.path.boundingBox(), point: interiorPointOf(f.path) };
    })
    // reading order: top to bottom, then left to right
    .sort((a, b) => a.bounds.y0 - b.bounds.y0 || a.bounds.x0 - b.bounds.x0);
  return { sources, parts, regions };
}

/** The region under a canvas point. */
export function regionAt(a: Arrangement, p: Pt): number | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  const i = a.regions.findIndex((r) => p.x >= r.bounds.x0 && p.x <= r.bounds.x1 && p.y >= r.bounds.y0 && p.y <= r.bounds.y1 && winding(r.path, p) !== 0);
  return i >= 0 ? i : null;
}

const partKey = (p: Part) => `${p.id}|${p.stroke ? 1 : 0}`;

/** The style a new path takes from a layer's fill (or, for a stroke part, its stroke colour as the fill). */
function styleOf(l: Layer, stroke: boolean): Record<string, PropValue> {
  const p = l.properties;
  const pick = (k: string) => (p[k] !== undefined ? { [k]: p[k] as PropValue } : {});
  if (stroke) {
    const strokes: Record<string, PropValue> = typeof p["paint.strokes"] === "string" && p["paint.strokes"] ? { "paint.fills": p["paint.strokes"] } : {};
    return { "svg.fill": typeof p["svg.stroke"] === "string" ? p["svg.stroke"] : "#000000", "svg.stroke": "none", "svg.strokeWidth": 0, ...strokes, ...pick("appearance.opacity") };
  }
  if (isBooleanGroup(l)) {
    return {
      "svg.fill": typeof p["appearance.background.color"] === "string" && p["appearance.background.color"] !== "transparent" ? p["appearance.background.color"] : "#d9d9d9",
      ...pick("paint.fills"),
      "svg.stroke": Number(p["appearance.border.width"]) > 0 && typeof p["appearance.border.color"] === "string" ? p["appearance.border.color"] : "none",
      "svg.strokeWidth": Number(p["appearance.border.width"]) || 0,
      ...pick("paint.shadows"),
      ...pick("appearance.opacity"),
    };
  }
  return {
    "svg.fill": typeof p["svg.fill"] === "string" ? p["svg.fill"] : "#d9d9d9",
    ...pick("paint.fills"),
    ...pick("svg.stroke"),
    ...pick("svg.strokeWidth"),
    ...pick("paint.strokes"),
    ...pick("stroke.align"),
    ...pick("paint.shadows"),
    ...pick("appearance.opacity"),
  };
}

/** Properties placing a canvas-space area as a path layer inside `parentId` (whose top-left on the canvas is `origin`). */
function placed(area: BezPath, origin: Pt): Record<string, PropValue> | null {
  const bb = area.boundingBox();
  const w = bb.x1 - bb.x0;
  const h = bb.y1 - bb.y0;
  if (!(w > 0.01 && h > 0.01)) return null;
  const unit = area.map((p) => ({ x: ((p.x - bb.x0) / w) * 200, y: ((p.y - bb.y0) / h) * 200 }));
  const net = fromPath(unit);
  for (const r of net.regions) r.winding = "evenodd";
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    positioning: "absolute",
    "frame.x": r2(bb.x0 - origin.x),
    "frame.y": r2(bb.y0 - origin.y),
    "frame.width": r2(w),
    "frame.height": r2(h),
    "svg.network": serializeNetwork(net),
    "svg.path": unit.toSvg(3),
    "svg.fillRule": "evenodd",
  };
}

/** A new path layer for a canvas-space area, styled like `style`, just above that layer. */
function createFrom(style: Part, area: BezPath): string | null {
  const l = layers()[style.id];
  if (!l?.parentId) return null;
  const props = placed(area, parentOrigin(style.id));
  if (!props) return null;
  const parent = layers()[l.parentId];
  const index = parent.children.indexOf(style.id) + 1;
  return documentCommands.addLayer({ archetype: "svgPath", parentId: l.parentId, name: l.name ?? "Shape", index, properties: { ...styleOf(l, style.stroke), ...props } }, "Shape builder");
}

/** Replaces a layer's shape with a canvas-space area, keeping its place in the tree and its style. Returns the id that now holds it. */
function reshape(id: string, area: BezPath): string | null {
  const l = layers()[id];
  if (!l?.parentId) return null;
  const props = placed(area, parentOrigin(id));
  if (!props) return null;
  if (l.archetype === "svgPath") {
    documentCommands.updateProps(id, { ...props, "frame.rotation": 0 });
    return id;
  }
  // another kind of shape (or a boolean group) becomes a path layer in its place
  const index = layers()[l.parentId].children.indexOf(id);
  const created = documentCommands.addLayer({ archetype: "svgPath", parentId: l.parentId, name: l.name ?? "Shape", index, properties: { ...styleOf(l, false), ...props } }, "Shape builder");
  documentCommands.removeLayer(id);
  return created;
}

export interface BuildResult {
  created: string | null;
  changed: string[];
  removed: string[];
  outlines: string[];
}

/**
 * Merges (`merge`) or removes the picked regions of `ids`' arrangement, as one undo step. `regions` are indexes into
 * `arrangement(ids).regions`; `points` are canvas points inside regions. Null when nothing was picked.
 */
export function buildShapes(ids: readonly string[], pick: { regions?: number[]; points?: Pt[] }, merge: boolean): BuildResult | null {
  const a = arrangement(ids);
  const picked: number[] = [];
  const add = (i: number | null) => {
    if (i !== null && i >= 0 && i < a.regions.length && !picked.includes(i)) picked.push(i);
  };
  for (const i of pick.regions ?? []) add(Number.isInteger(i) ? i : null);
  for (const p of (pick.points ?? []).slice(0, 10_000)) add(regionAt(a, p));
  if (picked.length === 0) return null;
  const regions = picked.map((i) => a.regions[i]);
  const touchedParts = new Set(regions.flatMap((r) => r.parts.map(partKey)));
  const touched = new Set(regions.flatMap((r) => r.parts.map((p) => p.id)));
  // merging every region of a single layer would only replace it with a copy of itself
  const wholeShape = touched.size === 1 && a.regions.every((r, i) => picked.includes(i) || !r.sources.some((s) => touched.has(s)));
  if (merge && wholeShape) return { created: null, changed: [], removed: [], outlines: [] };

  return transaction(merge ? "Merge shapes" : "Remove shapes", () => {
    let created: string | null = null;
    if (merge) {
      const style = regions[0]?.parts[0];
      if (style) created = createFrom(style, unionFaces(regions.map((r) => r.path)));
    }
    // what part `part` keeps: the regions it covers that weren't picked, as one area (null: nothing)
    const kept = (part: Part): BezPath | null => {
      const keep = a.regions.filter((r, i) => !picked.includes(i) && r.parts.some((p) => partKey(p) === partKey(part))).map((r) => r.path);
      if (keep.length === 0) return null;
      const area = unionFaces(keep);
      return area.isEmpty() ? null : area;
    };
    const removed: string[] = [];
    const changed: string[] = [];
    /** A layer that became a path layer under a new id: old id → new. */
    const replaced = new Map<string, string>();
    const outlined: [string, string][] = [];
    const has = (p: Part) => a.parts.some((q) => partKey(q) === partKey(p));
    for (const src of a.sources.filter((s) => touched.has(s))) {
      const fill: Part = { id: src, stroke: false };
      const stroke: Part = { id: src, stroke: true };
      // the stroke becomes a path layer of its own (what is left of it); the layer loses its stroke
      if (has(stroke)) {
        const area = kept(stroke);
        if (area) {
          const o = createFrom(stroke, area);
          if (o) outlined.push([src, o]);
        }
        documentCommands.updateProps(src, { "svg.stroke": "none", "svg.strokeWidth": 0, ...(layers()[src]?.properties["paint.strokes"] ? { "paint.strokes": "" } : {}), ...(isBooleanGroup(layers()[src]) ? { "appearance.border.width": 0 } : {}) });
      }
      let left: BezPath | null;
      if (!has(fill)) left = null;
      else if (touchedParts.has(partKey(fill))) left = kept(fill);
      else {
        // the fill wasn't picked: the layer stays as it is
        changed.push(src);
        continue;
      }
      const holder = left ? reshape(src, left) : null;
      if (holder) {
        changed.push(holder);
        if (holder !== src) replaced.set(src, holder);
      }
      else {
        documentCommands.removeLayer(src);
        removed.push(src);
      }
    }
    // the selection stays (minus what went, plus the outlines of selected strokes) and gains the new shape
    const sel = ids.map((i) => replaced.get(i) ?? i).filter((i) => !removed.includes(i) && layers()[i]).concat(outlined.filter(([s]) => ids.includes(s)).map(([, o]) => o));
    if (created) sel.push(created);
    useSelectionStore.getState().selectMultiple([...new Set(sel)], "element");
    return { created, changed, removed, outlines: outlined.map(([, o]) => o) };
  });
}
