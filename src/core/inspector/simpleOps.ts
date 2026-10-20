/**
 * Writing and reading the Simple face's seven controls (ROADMAP Phase 33). Every writer is one undo step, skips
 * locked layers, and does what is right for each kind of layer in a mixed selection (a rectangle's fill goes to
 * `svg.fill`, a text's to its colour). The commands in `editCommands.ts` are thin wrappers (Law 20).
 */

import type { PropValue } from "../document/registry";
import { resolveProps } from "../render/resolve";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { parentOrigin, worldBox } from "../editing/layerBoxes";
import { transaction } from "../editing/editOps";
import { safeRunColor } from "../text/runs";
import { fillSummary, hasFills } from "../paint/paintOps";
import { selectionSupports, sharedValue, simplePaths, supportsControl, type SimpleControl } from "./simpleControls";

const layers = () => getDocument().layers;
const round2 = (n: number) => Math.round(n * 100) / 100 || 0;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const NO_PAINT = new Set(["none", "transparent"]);

/** The layers that can be changed: they exist and neither they nor a parent is locked. */
function editable(ids: readonly string[]): string[] {
  const l = layers();
  return ids.filter((id) => {
    let cur: (typeof l)[string] | undefined = l[id];
    if (!cur) return false;
    let guard = 0;
    while (cur && guard++ < 10_000) {
      if (cur.locked === true) return false;
      cur = cur.parentId ? l[cur.parentId] : undefined;
    }
    return true;
  });
}

/** Writes `patch` on each target in one undo step; `build` decides the patch for a layer (null: nothing to write). Returns the number changed. */
function write(ids: readonly string[], label: string, build: (id: string) => Record<string, PropValue | undefined> | null): number {
  const targets = editable(ids);
  let changed = 0;
  transaction(label, () => {
    for (const id of targets) {
      const patch = build(id);
      if (!patch || Object.keys(patch).length === 0) continue;
      documentCommands.updateProps(id, patch);
      changed++;
    }
  });
  return changed;
}

const current = (id: string, path: string): PropValue | undefined => resolveProps(layers()[id]).get(path);
const isNoPaint = (v: PropValue | undefined) => v === undefined || (typeof v === "string" && NO_PAINT.has(v.trim().toLowerCase()));

/** Sets the fill. A colour is a hex value, an `rgb()` or `hsl()` value or a name; `none` clears it. An unsafe value changes nothing. */
export function setFill(ids: readonly string[], color: string): number {
  const safe = safeRunColor(color);
  if (safe === undefined) return 0;
  return write(ids, "Fill", (id) => {
    const layer = layers()[id];
    const path = simplePaths(layer.archetype).fill;
    // picking a colour here makes the fill that one plain colour: any gradients or extra fills go
    return path ? { [path]: safe, ...(hasFills(layer.archetype) ? { "paint.fills": undefined } : {}) } : null;
  });
}

export const MAX_STROKE = 200;

/**
 * Sets the stroke's colour and/or width. Turning the width up on a stroke that has no colour gives it a dark one,
 * and picking a colour on a stroke of no width gives it one pixel, so the change is always visible. Frames get a
 * solid border style while the width is above zero.
 */
export function setStroke(ids: readonly string[], stroke: { color?: string; width?: number }): number {
  const color = stroke.color === undefined ? undefined : safeRunColor(stroke.color);
  if (stroke.color !== undefined && color === undefined) return 0;
  if (stroke.width !== undefined && !Number.isFinite(stroke.width)) return 0;
  const width = stroke.width === undefined ? undefined : round2(clamp(stroke.width, 0, MAX_STROKE));
  return write(ids, "Stroke", (id) => {
    const p = simplePaths(layers()[id].archetype);
    if (!p.strokeColor || !p.strokeWidth) return null;
    const patch: Record<string, PropValue> = {};
    const prevWidth = Number(current(id, p.strokeWidth) ?? 0) || 0;
    const nextWidth = width ?? (color !== undefined && !NO_PAINT.has(color.toLowerCase()) && prevWidth <= 0 ? 1 : undefined);
    const widthNow = nextWidth ?? prevWidth;
    if (nextWidth !== undefined) patch[p.strokeWidth] = nextWidth;
    if (color !== undefined) patch[p.strokeColor] = color;
    else if (widthNow > 0 && isNoPaint(current(id, p.strokeColor))) patch[p.strokeColor] = "#0f172a";
    if (p.strokeStyle) patch[p.strokeStyle] = widthNow > 0 ? "solid" : "none";
    return patch;
  });
}

/** Sets the corner radius (0 or more). */
export function setRadius(ids: readonly string[], radius: number): number {
  if (!Number.isFinite(radius)) return 0;
  const r = round2(Math.max(0, radius));
  return write(ids, "Radius", (id) => {
    const path = simplePaths(layers()[id].archetype).radius;
    return path ? { [path]: r } : null;
  });
}

/** Sets the opacity, 0 (invisible) to 1 (solid). */
export function setOpacity(ids: readonly string[], opacity: number): number {
  if (!Number.isFinite(opacity)) return 0;
  const o = round2(clamp(opacity, 0, 1));
  return write(ids, "Opacity", (id) => (supportsControl(layers()[id].archetype, "opacity") ? { "appearance.opacity": o } : null));
}

/** Sets the words of text layers (and the label of buttons and badges). Styled runs are dropped: they no longer spell the text. */
export function setSimpleText(ids: readonly string[], text: string): number {
  const t = text.slice(0, 20_000);
  return write(ids, "Text", (id) => {
    const layer = layers()[id];
    const path = simplePaths(layer.archetype).text;
    if (!path) return null;
    return layer.archetype === "text" ? { [path]: t, "content.runs": "" } : { [path]: t };
  });
}

export interface FramePatch {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * Sets position and size. X and Y are measured from the parent's top-left (a top-level frame's from the canvas
 * origin). Moving a layer that is placed by its parent's layout makes it absolute at its current place first, so
 * only the coordinate you changed moves. A width or height makes that size fixed.
 */
export function setFrame(ids: readonly string[], patch: FramePatch): number {
  const clean = (v: number | undefined) => (v !== undefined && Number.isFinite(v) ? round2(v) : undefined);
  const x = clean(patch.x);
  const y = clean(patch.y);
  const w = clean(patch.width) === undefined ? undefined : Math.max(1, round2(patch.width!));
  const h = clean(patch.height) === undefined ? undefined : Math.max(1, round2(patch.height!));
  if (x === undefined && y === undefined && w === undefined && h === undefined) return 0;
  return write(ids, "Position and size", (id) => {
    if (!supportsControl(layers()[id].archetype, "position")) return null;
    const out: Record<string, PropValue> = {};
    if (x !== undefined || y !== undefined) {
      const box = worldBox(id);
      const o = parentOrigin(id);
      out.positioning = "absolute";
      out["frame.x"] = x ?? (box ? round2(box.cx - box.w / 2 - o.x) : 0);
      out["frame.y"] = y ?? (box ? round2(box.cy - box.h / 2 - o.y) : 0);
    }
    if (w !== undefined) out["frame.width"] = w;
    if (h !== undefined) out["frame.height"] = h;
    return out;
  });
}

/** One control's value across the selection: `null` when the layers disagree ("Mixed"), `undefined` when no layer has the control. */
export type Shared<T> = T | null | undefined;

export interface SimpleReadout {
  /** How many of the layers each control applies to is not needed by the face; whether it applies at all is. */
  has: Record<SimpleControl, boolean>;
  x: Shared<number>;
  y: Shared<number>;
  width: Shared<number>;
  height: Shared<number>;
  fill: Shared<string>;
  /** Some selected layer keeps its fills as a list (so the Fill control opens the fills editor, not just a colour). */
  paintList: boolean;
  strokeColor: Shared<string>;
  strokeWidth: Shared<number>;
  radius: Shared<number>;
  /** 0 to 1. */
  opacity: Shared<number>;
  text: Shared<string>;
}

/** What the Simple face shows for a selection. */
export function readSimple(ids: readonly string[]): SimpleReadout {
  const l = layers();
  const live = ids.filter((id) => l[id]);
  const archetypes = live.map((id) => l[id].archetype);
  const has = Object.fromEntries((["position", "size", "fill", "stroke", "radius", "opacity", "text"] as SimpleControl[]).map((c) => [c, selectionSupports(archetypes, c)])) as Record<SimpleControl, boolean>;
  const geo = live.filter((id) => supportsControl(l[id].archetype, "position"));
  const boxes = geo.map((id) => ({ b: worldBox(id), o: parentOrigin(id) }));
  const per = (pick: (b: NonNullable<ReturnType<typeof worldBox>>, o: { x: number; y: number }) => number) =>
    sharedValue(boxes.filter((e) => e.b).map((e) => round2(pick(e.b!, e.o))));
  const prop = <T extends PropValue>(path: (id: string) => string | undefined, fallback: T, filter: (id: string) => boolean = () => true): Shared<T> =>
    sharedValue(
      live.filter((id) => path(id) !== undefined && filter(id)).map((id) => {
        const v = resolveProps(l[id]).get(path(id)!);
        return (v === undefined ? fallback : v) as T;
      }),
    );
  const fillFallback = (id: string) => (l[id].archetype === "text" ? "#0f172a" : l[id].archetype.startsWith("container") || l[id].archetype === "form" ? "transparent" : "none");
  const fillValues = live.filter((id) => simplePaths(l[id].archetype).fill).map((id) => (hasFills(l[id].archetype) && resolveProps(l[id]).get("paint.fills") ? fillSummary(id) : String(resolveProps(l[id]).get(simplePaths(l[id].archetype).fill!) ?? fillFallback(id))));
  return {
    has,
    x: per((b, o) => b.cx - b.w / 2 - o.x),
    y: per((b, o) => b.cy - b.h / 2 - o.y),
    width: per((b) => b.w),
    height: per((b) => b.h),
    fill: sharedValue(fillValues),
    paintList: live.some((id) => hasFills(l[id].archetype)),
    strokeColor: prop((id) => simplePaths(l[id].archetype).strokeColor, "none"),
    strokeWidth: prop((id) => simplePaths(l[id].archetype).strokeWidth, 0),
    radius: prop((id) => simplePaths(l[id].archetype).radius, 0),
    opacity: sharedValue(live.filter((id) => supportsControl(l[id].archetype, "opacity")).map((id) => Number(resolveProps(l[id]).get("appearance.opacity") ?? 1))),
    text: prop((id) => simplePaths(l[id].archetype).text, ""),
  };
}
