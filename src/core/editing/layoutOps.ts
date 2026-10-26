/**
 * ============================================================================
 * AUTO-LAYOUT OPERATIONS (ROADMAP Phase 41)
 * ============================================================================
 * Shift+A turns a container (or the layers you picked, wrapped in a new one) into an auto-layout frame: it reads the
 * direction, gap, padding and alignment out of where the layers are now, and from then on the children flow. The
 * frame is a CSS flex box (`layout.display`, `flexDirection`, `gap`, the four paddings, `justifyContent`, `alignItems` and `flexWrap`), each
 * child has a sizing (hug, fill or fixed) on each axis, and the order of the children is the order they lay out in.
 * Removing auto layout pins every child where it is. Each operation is one undo step.
 * ============================================================================
 */

import type { Layer } from "../document/schema";
import type { PropValue } from "../document/registry";
import { CONSTRAINTS, HORIZONTAL_NAMES, VERTICAL_NAMES, type Constraint } from "../layout/constraints";
import { equalTracks, inferGrid } from "../layout/grid";
import { DEFAULT_STACK, inferStack, uniformPadding, type AlignItems, type Direction, type Justify, type Padding, type SizingMode, type StackSpec } from "../layout/stack";
import { moveLayers } from "../layers/reparent";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { editableRoots, groupLayers, renameLayer, transaction } from "./editOps";
import { worldBox, writeBoxes } from "./layerBoxes";

const num = (v: PropValue | undefined, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: PropValue | undefined, d = ""): string => (typeof v === "string" ? v : d);
const round = (n: number) => Math.round(n * 100) / 100;

/** A grid container (Phase 42): its children sit in cells. */
export const isGrid = (l: Layer | undefined): boolean => !!l && l.archetype === "container" && l.properties["layout.display"] === "grid";

/** A frame whose layout places its children (a stack or a grid): they flow, and moving one is a reorder, not a free move. */
export const placesChildren = (l: Layer | undefined): boolean => isAutoLayout(l) || isGrid(l);

export const isAutoLayout = (l: Layer | undefined): boolean => !!l && l.archetype === "container" && l.properties["layout.auto"] === true;

/** The stack a layer's properties describe. */
export function readStack(layer: Layer): StackSpec {
  const p = layer.properties;
  const all = num(p["layout.padding"]);
  const side = (path: string, dflt: number) => num(p[path], dflt);
  const x = typeof p["layout.paddingX"] === "number" ? num(p["layout.paddingX"]) : all;
  return {
    direction: str(p["layout.flexDirection"], "column") === "row" ? "row" : "column",
    gap: num(p["layout.gap"]),
    padding: { top: side("layout.paddingTop", all), right: side("layout.paddingRight", x), bottom: side("layout.paddingBottom", all), left: side("layout.paddingLeft", x) },
    justify: (["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"].includes(str(p["layout.justifyContent"])) ? str(p["layout.justifyContent"]) : "flex-start") as Justify,
    align: (["flex-start", "center", "flex-end", "stretch", "baseline"].includes(str(p["layout.alignItems"])) ? str(p["layout.alignItems"]) : "flex-start") as AlignItems,
    wrap: str(p["layout.flexWrap"], "nowrap") === "wrap",
    ...(p["layout.alignContent"] === "space-between" ? { alignContent: "space-between" as const } : {}),
    ...(typeof p["layout.rowGap"] === "number" && str(p["layout.flexDirection"], "column") === "row" ? { crossGap: num(p["layout.rowGap"]) } : {}),
    ...(typeof p["layout.columnGap"] === "number" && str(p["layout.flexDirection"], "column") !== "row" ? { crossGap: num(p["layout.columnGap"]) } : {}),
  };
}

/** The properties that make a container this stack. */
export function stackProps(spec: StackSpec): Record<string, PropValue> {
  return {
    "layout.auto": true,
    "layout.display": "flex",
    "layout.flexDirection": spec.direction,
    "layout.gap": spec.gap,
    "layout.padding": 0,
    "layout.paddingTop": spec.padding.top,
    "layout.paddingRight": spec.padding.right,
    "layout.paddingBottom": spec.padding.bottom,
    "layout.paddingLeft": spec.padding.left,
    "layout.justifyContent": spec.justify,
    "layout.alignItems": spec.align,
    "layout.flexWrap": spec.wrap ? "wrap" : "nowrap",
    ...(spec.alignContent && spec.alignContent !== "auto" ? { "layout.alignContent": spec.alignContent } : {}),
  };
}

/** How a layer sizes itself on each axis (the geometry rules: no stored size means hug). */
function sizingOf(l: Layer): { h: SizingMode; v: SizingMode } {
  const p = l.properties;
  const pick = (path: string, explicit: boolean): SizingMode => {
    const v = p[path];
    return v === "fixed" || v === "hug" || v === "fill" ? v : explicit ? "fixed" : "hug";
  };
  return { h: pick("sizing.horizontal", typeof p["frame.width"] === "number"), v: pick("sizing.vertical", typeof p["frame.height"] === "number") };
}

const rectIn = (id: string, origin: { x: number; y: number }) => {
  const b = worldBox(id);
  return b ? { x: b.cx - b.w / 2 - origin.x, y: b.cy - b.h / 2 - origin.y, w: b.w, h: b.h } : null;
};

/**
 * Adds auto layout. One container selected: it becomes the stack (its size stays). Anything else: the layers are
 * wrapped in a new transparent container that hugs them. The stack is read from where the layers are. Returns the
 * stacks (the wrapper or the container), selected.
 */
export function addAutoLayout(ids: readonly string[]): string[] {
  const roots = editableRoots(ids);
  const layers = getDocument().layers;
  if (roots.length === 0) return [];
  const solo = roots.length === 1 && layers[roots[0]].archetype === "container" ? layers[roots[0]] : null;
  if (solo && isAutoLayout(solo)) return [solo.id];
  let out: string[] = [];
  transaction("Add auto layout", () => {
    let targetId: string | null;
    let wrapped = false;
    if (solo) targetId = solo.id;
    else {
      targetId = groupLayers(roots, "group");
      wrapped = true;
      if (targetId) renameLayer(targetId, "Auto layout");
    }
    if (!targetId) return;
    const target = getDocument().layers[targetId];
    const box = worldBox(targetId);
    if (!box) return;
    const origin = { x: box.cx - box.w / 2, y: box.cy - box.h / 2 };
    const kids = target.children.filter((id) => getDocument().layers[id]?.visible !== false);
    const rects = kids.map((id) => rectIn(id, origin));
    if (rects.some((r) => r === null)) return;
    const found = inferStack({ x: 0, y: 0, w: box.w, h: box.h }, rects as { x: number; y: number; w: number; h: number }[]);
    const spec = kids.length === 0 ? { ...DEFAULT_STACK, padding: uniformPadding(8), gap: 8 } : found.spec;
    // children first, from their measured places
    const sizes = kids.map((id) => ({ id, size: worldBox(id)!, sizing: sizingOf(getDocument().layers[id]) }));
    for (const { id, size, sizing } of sizes) {
      const patch: Record<string, PropValue | undefined> = { positioning: "flow" };
      if (sizing.h === "fixed") patch["frame.width"] = round(size.w);
      if (sizing.v === "fixed") patch["frame.height"] = round(size.h);
      patch["sizing.horizontal"] = sizing.h;
      patch["sizing.vertical"] = sizing.v;
      documentCommands.updateProps(id, patch);
    }
    const props: Record<string, PropValue | undefined> = { ...stackProps(spec) };
    if (wrapped) {
      props["sizing.horizontal"] = "hug";
      props["sizing.vertical"] = "hug";
    } else {
      props["sizing.horizontal"] = sizingOf(target).h === "hug" && layers[targetId]?.parentId !== null ? "hug" : "fixed";
      props["sizing.vertical"] = sizingOf(target).v === "hug" && layers[targetId]?.parentId !== null ? "hug" : "fixed";
      if (props["sizing.horizontal"] === "fixed") props["frame.width"] = round(box.w);
      if (props["sizing.vertical"] === "fixed") props["frame.height"] = round(box.h);
    }
    documentCommands.updateProps(targetId, props);
    // lay the children out in reading order
    found.order.forEach((k, i) => {
      const id = kids[k];
      if (getDocument().layers[targetId!].children[i] !== id) documentCommands.moveLayer(id, targetId, i);
    });
    useSelectionStore.getState().selectMultiple([targetId], "element");
    out = [targetId];
  });
  return out;
}

/** Takes auto layout off the selected stacks: every child stays exactly where it is drawn, as a free layer. */
export function removeAutoLayout(ids: readonly string[]): string[] {
  const targets = editableRoots(ids).filter((id) => isAutoLayout(getDocument().layers[id]));
  const out: string[] = [];
  transaction("Remove auto layout", () => {
    for (const id of targets) {
      const box = worldBox(id);
      const layer = getDocument().layers[id];
      if (!box || !layer) continue;
      const origin = { x: box.cx - box.w / 2, y: box.cy - box.h / 2 };
      const kids = layer.children;
      const boxes = kids.map((k) => worldBox(k));
      if (boxes.some((b) => b === null)) continue;
      writeBoxes(kids, boxes as NonNullable<(typeof boxes)[number]>[], origin, { size: true });
      for (const k of kids) documentCommands.updateProps(k, { "sizing.horizontal": "fixed", "sizing.vertical": "fixed" });
      const patch: Record<string, PropValue | undefined> = { "layout.auto": false, "sizing.horizontal": "fixed", "sizing.vertical": "fixed", "frame.width": round(box.w), "frame.height": round(box.h) };
      documentCommands.updateProps(id, patch);
      out.push(id);
    }
  });
  return out;
}

export interface StackPatch {
  direction?: Direction;
  gap?: number;
  /** One number for every side, or the sides to change. */
  padding?: number | Partial<Padding>;
  justify?: Justify;
  align?: AlignItems;
  wrap?: boolean;
  /** FigCraft port F6: how wrapped lines share the cross space, inside strokes in the layout, first child on top. */
  alignContent?: "auto" | "space-between";
  strokesIncluded?: boolean;
  reverseZ?: boolean;
}

/** Changes the stack settings of the selected auto-layout frames. Returns how many changed. */
export function setStack(ids: readonly string[], patch: StackPatch): number {
  const targets = editableRoots(ids).filter((id) => isAutoLayout(getDocument().layers[id]));
  if (targets.length === 0) return 0;
  transaction("Change auto layout", () => {
    for (const id of targets) {
      const props: Record<string, PropValue | undefined> = {};
      if (patch.direction) props["layout.flexDirection"] = patch.direction;
      if (patch.gap !== undefined) props["layout.gap"] = Math.max(0, round(patch.gap));
      if (typeof patch.padding === "number") {
        for (const k of ["Top", "Right", "Bottom", "Left"]) props[`layout.padding${k}`] = Math.max(0, round(patch.padding));
      } else if (patch.padding) {
        for (const [k, v] of Object.entries(patch.padding)) if (v !== undefined) props[`layout.padding${k[0].toUpperCase()}${k.slice(1)}`] = Math.max(0, round(v));
      }
      if (patch.justify) props["layout.justifyContent"] = patch.justify;
      if (patch.align) props["layout.alignItems"] = patch.align;
      if (patch.wrap !== undefined) props["layout.flexWrap"] = patch.wrap ? "wrap" : "nowrap";
      // FigCraft port F6
      if (patch.alignContent) props["layout.alignContent"] = patch.alignContent;
      if (patch.strokesIncluded !== undefined) props["layout.strokesIncluded"] = patch.strokesIncluded;
      if (patch.reverseZ !== undefined) props["layout.reverseZ"] = patch.reverseZ;
      documentCommands.updateProps(id, props);
    }
  });
  return targets.length;
}

/**
 * Sets how layers size themselves on each axis. A layer made `fixed` keeps the size it has now (a fixed layer with
 * no stored size would collapse). Returns how many layers changed.
 */
export function setChildSizing(ids: readonly string[], patch: { horizontal?: SizingMode; vertical?: SizingMode }): number {
  const targets = ids.filter((id) => {
    const l = getDocument().layers[id];
    return l && l.locked !== true && l.parentId !== null;
  });
  if (targets.length === 0) return 0;
  transaction("Change sizing", () => {
    for (const id of targets) {
      const b = worldBox(id);
      const props: Record<string, PropValue | undefined> = {};
      if (patch.horizontal) {
        props["sizing.horizontal"] = patch.horizontal;
        if (patch.horizontal === "fixed" && b) props["frame.width"] = round(b.w);
      }
      if (patch.vertical) {
        props["sizing.vertical"] = patch.vertical;
        if (patch.vertical === "fixed" && b) props["frame.height"] = round(b.h);
      }
      documentCommands.updateProps(id, props);
      // FigCraft port F6: a child that fills an axis its auto-layout parent hugs turns the parent fixed there
      // (a frame can't both size to its children and have a child that sizes to it), at the size it has now
      const parentId = getDocument().layers[id]?.parentId;
      const parent = parentId ? getDocument().layers[parentId] : undefined;
      if (parent && parentId && isAutoLayout(parent)) {
        const ps = sizingOf(parent);
        const pb = worldBox(parentId);
        const fix: Record<string, PropValue | undefined> = {};
        if (patch.horizontal === "fill" && ps.h === "hug") {
          fix["sizing.horizontal"] = "fixed";
          if (pb) fix["frame.width"] = round(pb.w);
        }
        if (patch.vertical === "fill" && ps.v === "hug") {
          fix["sizing.vertical"] = "fixed";
          if (pb) fix["frame.height"] = round(pb.h);
        }
        if (Object.keys(fix).length) documentCommands.updateProps(parentId, fix);
      }
    }
  });
  return targets.length;
}

/** Moves a child to position `index` among its auto-layout parent's children (the other children shift). */
export function reorderInStack(id: string, index: number): boolean {
  const layer = getDocument().layers[id];
  if (!layer || !layer.parentId || !isAutoLayout(getDocument().layers[layer.parentId])) return false;
  const res = moveLayers([id], layer.parentId, index);
  return res.ok === true;
}

// --- grids (Phase 42) -------------------------------------------------------------

export interface GridPatch {
  columns?: number;
  rows?: number;
  /** Written track lists (`1fr 200px`, `repeat(3, 1fr)`); an empty string goes back to equal columns / automatic rows. */
  columnsTemplate?: string;
  rowsTemplate?: string;
  columnGap?: number;
  rowGap?: number;
  padding?: number;
}

/**
 * Turns a container into a grid: columns and rows from the distinct edges of its children, gaps from the spacing
 * between them, padding from the room around them; the children flow into cells, filling them across and hugging
 * down. The frame keeps its size. Returns the container, selected.
 */
export function addGridLayout(ids: readonly string[]): string[] {
  const roots = editableRoots(ids);
  const solo = roots.length === 1 && getDocument().layers[roots[0]].archetype === "container" ? getDocument().layers[roots[0]] : null;
  if (!solo) return [];
  if (isGrid(solo)) return [solo.id];
  let out: string[] = [];
  transaction("Add grid", () => {
    const box = worldBox(solo.id);
    if (!box) return;
    const origin = { x: box.cx - box.w / 2, y: box.cy - box.h / 2 };
    const kids = solo.children.filter((id) => getDocument().layers[id]?.visible !== false);
    const rects = kids.map((id) => rectIn(id, origin));
    if (rects.some((r) => r === null)) return;
    const list = rects as { x: number; y: number; w: number; h: number }[];
    const inferred = inferGrid(list);
    const minX = list.length ? Math.min(...list.map((r) => r.x)) : 8;
    const minY = list.length ? Math.min(...list.map((r) => r.y)) : 8;
    const maxR = list.length ? Math.max(...list.map((r) => r.x + r.w)) : box.w - 8;
    const maxB = list.length ? Math.max(...list.map((r) => r.y + r.h)) : box.h - 8;
    for (const id of kids) {
      documentCommands.updateProps(id, { positioning: "flow", "sizing.horizontal": "fill", "sizing.vertical": "hug" });
    }
    // reading order: top to bottom, then left to right
    const order = kids.map((_, i) => i).sort((a, b) => list[a].y - list[b].y || list[a].x - list[b].x);
    order.forEach((k, i) => {
      if (getDocument().layers[solo.id].children[i] !== kids[k]) documentCommands.moveLayer(kids[k], solo.id, i);
    });
    documentCommands.updateProps(solo.id, {
      "layout.display": "grid",
      "layout.gridColumns": Math.max(1, inferred.columns),
      "layout.gridTemplateColumns": equalTracks(inferred.columns),
      "layout.gridTemplateRows": undefined,
      "layout.gap": 0,
      "layout.columnGap": inferred.columnGap,
      "layout.rowGap": inferred.rowGap,
      "layout.padding": 0,
      "layout.paddingTop": Math.max(0, Math.round(minY)),
      "layout.paddingLeft": Math.max(0, Math.round(minX)),
      "layout.paddingRight": Math.max(0, Math.round(box.w - maxR)),
      "layout.paddingBottom": Math.max(0, Math.round(box.h - maxB)),
      "sizing.horizontal": "fixed",
      "sizing.vertical": "fixed",
      "frame.width": round(box.w),
      "frame.height": round(box.h),
    });
    useSelectionStore.getState().selectMultiple([solo.id], "element");
    out = [solo.id];
  });
  return out;
}

/** Sets the grid of the selected grid containers. Returns how many changed. */
export function setGrid(ids: readonly string[], patch: GridPatch): number {
  const targets = editableRoots(ids).filter((id) => isGrid(getDocument().layers[id]));
  if (targets.length === 0) return 0;
  transaction("Change grid", () => {
    for (const id of targets) {
      const props: Record<string, PropValue | undefined> = {};
      if (patch.columns !== undefined) {
        props["layout.gridColumns"] = Math.max(1, Math.min(200, Math.round(patch.columns)));
        if (patch.columnsTemplate === undefined) props["layout.gridTemplateColumns"] = equalTracks(patch.columns);
      }
      if (patch.columnsTemplate !== undefined) props["layout.gridTemplateColumns"] = patch.columnsTemplate === "" ? equalTracks(num(getDocument().layers[id].properties["layout.gridColumns"], 2)) : patch.columnsTemplate;
      if (patch.rows !== undefined) {
        props["layout.gridRows"] = Math.max(1, Math.min(200, Math.round(patch.rows)));
        if (patch.rowsTemplate === undefined) props["layout.gridTemplateRows"] = `repeat(${props["layout.gridRows"]}, auto)`;
      }
      if (patch.rowsTemplate !== undefined) props["layout.gridTemplateRows"] = patch.rowsTemplate === "" ? undefined : patch.rowsTemplate;
      if (patch.columnGap !== undefined) props["layout.columnGap"] = Math.max(0, round(patch.columnGap));
      if (patch.rowGap !== undefined) props["layout.rowGap"] = Math.max(0, round(patch.rowGap));
      if (patch.padding !== undefined) for (const k of ["Top", "Right", "Bottom", "Left"]) props[`layout.padding${k}`] = Math.max(0, round(patch.padding));
      documentCommands.updateProps(id, props);
    }
  });
  return targets.length;
}

/** Puts layers in a grid cell: a 1-based start (0 for automatic) and spans. Returns how many changed. */
export function setGridCell(ids: readonly string[], patch: { columnStart?: number; columnSpan?: number; rowStart?: number; rowSpan?: number }): number {
  const targets = ids.filter((id) => {
    const l = getDocument().layers[id];
    return l && l.locked !== true && l.parentId && isGrid(getDocument().layers[l.parentId]);
  });
  if (targets.length === 0) return 0;
  const clamp = (n: number, lo: number) => Math.max(lo, Math.min(200, Math.round(n)));
  transaction("Change grid cell", () => {
    for (const id of targets) {
      const props: Record<string, PropValue | undefined> = {};
      if (patch.columnStart !== undefined) props["layout.gridColumnStart"] = clamp(patch.columnStart, 0);
      if (patch.columnSpan !== undefined) props["layout.gridColumnSpan"] = clamp(patch.columnSpan, 1);
      if (patch.rowStart !== undefined) props["layout.gridRowStart"] = clamp(patch.rowStart, 0);
      if (patch.rowSpan !== undefined) props["layout.gridRowSpan"] = clamp(patch.rowSpan, 1);
      documentCommands.updateProps(id, props);
    }
  });
  return targets.length;
}

/** Takes the grid off a container: its children are pinned where they are drawn. */
export function removeGridLayout(ids: readonly string[]): string[] {
  const targets = editableRoots(ids).filter((id) => isGrid(getDocument().layers[id]));
  const out: string[] = [];
  transaction("Remove grid", () => {
    for (const id of targets) {
      const box = worldBox(id);
      const layer = getDocument().layers[id];
      if (!box || !layer) continue;
      const origin = { x: box.cx - box.w / 2, y: box.cy - box.h / 2 };
      const boxes = layer.children.map((k) => worldBox(k));
      if (boxes.some((b) => b === null)) continue;
      writeBoxes(layer.children, boxes as NonNullable<(typeof boxes)[number]>[], origin, { size: true });
      for (const k of layer.children) documentCommands.updateProps(k, { "sizing.horizontal": "fixed", "sizing.vertical": "fixed" });
      documentCommands.updateProps(id, { "layout.display": "flex" });
      out.push(id);
    }
  });
  return out;
}

// --- constraints (Phase 42) -------------------------------------------------------

/** Sets how free layers follow their frame. Returns how many changed. */
export function setConstraints(ids: readonly string[], patch: { horizontal?: Constraint; vertical?: Constraint }): number {
  const targets = ids.filter((id) => {
    const l = getDocument().layers[id];
    return l && l.locked !== true && l.parentId !== null && l.properties.positioning === "absolute";
  });
  if (targets.length === 0) return 0;
  transaction("Change constraints", () => {
    for (const id of targets) {
      const props: Record<string, PropValue | undefined> = {};
      if (patch.horizontal && CONSTRAINTS.includes(patch.horizontal)) props["constraints.horizontal"] = patch.horizontal === "start" ? undefined : HORIZONTAL_NAMES[patch.horizontal];
      if (patch.vertical && CONSTRAINTS.includes(patch.vertical)) props["constraints.vertical"] = patch.vertical === "start" ? undefined : VERTICAL_NAMES[patch.vertical];
      documentCommands.updateProps(id, props);
    }
  });
  return targets.length;
}
