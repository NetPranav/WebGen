/**
 * ============================================================================
 * BREAKPOINTS AND OVERRIDES (ROADMAP Phase 43)
 * ============================================================================
 * A document has breakpoints, widths with names (Desktop 1440, Tablet 768, Mobile 375, and your own). The largest is
 * the base: what a layer's own properties describe. Any layer can carry an override for a smaller breakpoint: a few
 * properties (and whether it is hidden) that replace its own from that width down. Overrides cascade: Mobile sees
 * Tablet's overrides first, then its own. This file is the rule as pure functions: which overrides apply at a
 * breakpoint, a layer and a whole document as seen there, and how a free layer's constraints carry it from the base
 * frame width to the width of the breakpoint. Nothing here writes; the document store routes edits to overrides.
 * ============================================================================
 */

import type { Layer, MotionDocument } from "../document/schema";
import type { PropValue } from "../document/registry";
import { constrainSpan, readHorizontal, readVertical } from "../layout/constraints";

export interface Breakpoint {
  id: string;
  name: string;
  width: number;
}

export const DEFAULT_BREAKPOINTS: readonly Breakpoint[] = [
  { id: "desktop", name: "Desktop", width: 1440 },
  { id: "tablet", name: "Tablet", width: 768 },
  { id: "mobile", name: "Mobile", width: 375 },
];

export const MAX_BREAKPOINTS = 12;
/** The override key for "hidden at this breakpoint". */
export const VISIBLE_KEY = "layer.visible";

/** The document's breakpoints, widest first. Documents that never set any have the three defaults. */
export function breakpointsOf(doc: Pick<MotionDocument, "breakpoints">): Breakpoint[] {
  const list = doc.breakpoints && doc.breakpoints.length > 0 ? doc.breakpoints : DEFAULT_BREAKPOINTS;
  return [...list].sort((a, b) => b.width - a.width);
}

/** The base breakpoint: the widest. */
export const baseBreakpoint = (list: readonly Breakpoint[]): Breakpoint => list[0];

/** Is `id` (null: nothing chosen) the base? */
export function isBase(list: readonly Breakpoint[], id: string | null | undefined): boolean {
  return !id || id === list[0]?.id || !list.some((b) => b.id === id);
}

/** The breakpoints whose overrides apply when viewing at `activeId`, widest first: every one from the one under the base down to it. */
export function appliedBreakpoints(list: readonly Breakpoint[], activeId: string | null | undefined): Breakpoint[] {
  if (isBase(list, activeId)) return [];
  const active = list.find((b) => b.id === activeId)!;
  return list.slice(1).filter((b) => b.width >= active.width);
}

/** A layer's properties as seen at a breakpoint, and whether it is visible there. */
export function resolveLayerAt(layer: Layer, applied: readonly Breakpoint[]): Layer {
  if (!layer.overrides || applied.length === 0) return layer;
  let props: Record<string, PropValue> | null = null;
  let visible = layer.visible;
  for (const bp of applied) {
    const o = layer.overrides[bp.id];
    if (!o) continue;
    for (const [k, v] of Object.entries(o)) {
      if (k === VISIBLE_KEY) {
        visible = v === false ? false : true;
        continue;
      }
      props ??= { ...layer.properties };
      props[k] = v;
    }
  }
  if (!props && visible === layer.visible) return layer;
  return { ...layer, properties: props ?? layer.properties, ...(visible === undefined ? {} : { visible }) };
}

/** Which properties of a layer are overridden at exactly this breakpoint (not those it inherits from a larger one). */
export const overriddenAt = (layer: Layer, id: string): string[] => Object.keys(layer.overrides?.[id] ?? {});

/** Is the property overridden at this breakpoint or inherited from a larger one? Returns the breakpoint that sets it. */
export function overrideSource(layer: Layer, applied: readonly Breakpoint[], key: string): Breakpoint | null {
  let found: Breakpoint | null = null;
  for (const bp of applied) if (layer.overrides?.[bp.id] && key in layer.overrides[bp.id]) found = bp;
  return found;
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Is a top-level frame responsive: its width follows the breakpoint being viewed. */
export const isResponsiveFrame = (layer: Layer): boolean => layer.parentId === null && layer.properties["breakpoints.responsive"] === true;

/**
 * Constraints at a breakpoint: a free layer inside a frame that is wider or narrower here than at the base is put
 * where its constraints say, from the frame's base size to its size here. Done on the base properties, before the
 * layer's own overrides, so an override always wins. Returns the layers that changed.
 */
function constrainFrame(layers: Record<string, Layer>, frameId: string, from: { width: number; height: number }, to: { width: number; height: number }, out: Record<string, Layer>, depth = 0): void {
  if (depth > 64) return;
  const frame = layers[frameId];
  if (!frame || frame.properties["layout.auto"] === true || (from.width === to.width && from.height === to.height)) return;
  for (const childId of frame.children) {
    const child = out[childId] ?? layers[childId];
    if (!child || child.properties.positioning !== "absolute") continue;
    const h = readHorizontal(child.properties["constraints.horizontal"]);
    const v = readVertical(child.properties["constraints.vertical"]);
    if (h === "start" && v === "start") continue;
    const x = num(child.properties["frame.x"]) ?? 0;
    const y = num(child.properties["frame.y"]) ?? 0;
    const w = num(child.properties["frame.width"]);
    const ht = num(child.properties["frame.height"]);
    const nh = constrainSpan({ pos: x, size: w ?? 0 }, h, from.width, to.width);
    const nv = constrainSpan({ pos: y, size: ht ?? 0 }, v, from.height, to.height);
    const props: Record<string, PropValue> = { ...child.properties, "frame.x": nh.pos, "frame.y": nv.pos };
    if (w !== undefined) props["frame.width"] = nh.size;
    if (ht !== undefined) props["frame.height"] = nv.size;
    out[childId] = { ...child, properties: props };
    if (child.children.length > 0 && ((w !== undefined && nh.size !== w) || (ht !== undefined && nv.size !== ht))) {
      constrainFrame(layers, childId, { width: w ?? 0, height: ht ?? 0 }, { width: nh.size, height: nv.size }, out, depth + 1);
    }
  }
}

const cache = new WeakMap<object, Map<string, MotionDocument>>();

/**
 * The document as seen at a breakpoint. At the base, or when nothing in the document differs at that width, it is the
 * document itself (the same object, so nothing re-renders). Otherwise a copy whose layers have the breakpoint's
 * overrides applied, responsive top-level frames at the breakpoint's width, and constraints followed. Memoised.
 */
export function resolveDocumentAt(doc: MotionDocument, activeId: string | null | undefined): MotionDocument {
  const list = breakpointsOf(doc);
  if (isBase(list, activeId)) return doc;
  const key = `${activeId}|${list.map((b) => `${b.id}:${b.width}`).join(",")}`;
  let perDoc = cache.get(doc);
  if (!perDoc) cache.set(doc, (perDoc = new Map()));
  const hit = perDoc.get(key);
  if (hit) return hit;

  const applied = appliedBreakpoints(list, activeId);
  const active = list.find((b) => b.id === activeId)!;
  const layers = doc.layers;
  const changed: Record<string, Layer> = {};

  // 1. responsive frames take the breakpoint's width, and their free children follow their constraints
  for (const layer of Object.values(layers)) {
    if (!isResponsiveFrame(layer)) continue;
    const baseW = num(layer.properties["frame.width"]);
    const baseH = num(layer.properties["frame.height"]);
    if (baseW === undefined) continue;
    changed[layer.id] = { ...layer, properties: { ...layer.properties, "frame.width": active.width } };
    constrainFrame(layers, layer.id, { width: baseW, height: baseH ?? 0 }, { width: active.width, height: baseH ?? 0 }, changed);
  }
  // 2. then every layer's overrides on top (a frame's own width override beats the breakpoint's width)
  for (const layer of Object.values(layers)) {
    const base = changed[layer.id] ?? layer;
    const resolved = resolveLayerAt(base, applied);
    if (resolved !== layer) changed[layer.id] = resolved;
  }
  let result: MotionDocument = doc;
  if (Object.keys(changed).length > 0) result = { ...doc, layers: { ...layers, ...changed } };
  perDoc.set(key, result);
  return result;
}
