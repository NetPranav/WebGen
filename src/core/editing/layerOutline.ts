/**
 * A layer's outline as a path (FigCraft port F5): what it fills, in its own box (0..width, 0..height, unrotated),
 * and the area its visible stroke paints. Boolean groups combine their children's outlines; the Shape Builder cuts
 * the selected layers' outlines into regions. Reads only the layer's own properties (and, for a boolean group, its
 * children's), so it works with or without a stage.
 *
 * Behaviour from FigCraft (`figcraft_render::node_outline` and `stroke_fill` as `crates/engine/src/shapebuilder.rs`
 * and `booleans.rs` use them), commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */

import type { Layer } from "../document/schema";
import { BezPath } from "../geometry/bezpath";
import { ellipse, polygonPoints, roundedRect, smoothedPolygon, starPoints } from "../geometry/shapes";
import { pathDataToBez } from "../paths/bezBridge";
import { fillPath as networkFill, fillRule as networkRule, parseNetwork, strokePath as networkStroke } from "../paths/vectorNetwork";
import { booleanPaths, type PathBoolOp } from "../paths/pathOps";
import { defaultStroke, parseSides, parseWidthProfile, strokeOutline, type StrokeProps } from "../paths/strokes";
import { readCap } from "../render/strokePaint";
import { parseColor } from "../paint/colorMath";

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);

export const BOOLEAN_OPERATIONS: readonly PathBoolOp[] = ["union", "subtract", "intersect", "exclude"];
export const isBooleanOp = (v: unknown): v is PathBoolOp => typeof v === "string" && (BOOLEAN_OPERATIONS as readonly string[]).includes(v);

/** Whether a layer is a live boolean group (a container with `boolean.operation`). */
export const isBooleanGroup = (l: Layer | undefined): boolean => !!l && (l.archetype === "container" || l.archetype === "form") && isBooleanOp(l.properties["boolean.operation"]);

/** A layer's own box size (its frame). */
export const layerSize = (l: Layer): { w: number; h: number } => ({ w: Math.max(0, num(l.properties["frame.width"], 0)), h: Math.max(0, num(l.properties["frame.height"], 0)) });

/** Maps a path from a child's own box into its parent's coordinates: placed at frame.x / frame.y, turned about its centre. */
export function toParent(path: BezPath, l: Layer): BezPath {
  const x = num(l.properties["frame.x"], 0);
  const y = num(l.properties["frame.y"], 0);
  const { w, h } = layerSize(l);
  const rot = (num(l.properties["frame.rotation"], 0) * Math.PI) / 180;
  if (rot === 0) return path.map((p) => ({ x: p.x + x, y: p.y + y }));
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return path.map((p) => {
    const dx = p.x - w / 2;
    const dy = p.y - h / 2;
    return { x: x + w / 2 + dx * c - dy * s, y: y + h / 2 + dx * s + dy * c };
  });
}

/** Maps a path from a layer's own box to the canvas, given its box there (centre, size, clockwise rotation). */
export function toWorld(path: BezPath, box: { cx: number; cy: number; w: number; h: number; rot: number }, own: { w: number; h: number }): BezPath {
  const sx = own.w > 0 ? box.w / own.w : 1;
  const sy = own.h > 0 ? box.h / own.h : 1;
  const r = (box.rot * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return path.map((p) => {
    const dx = p.x * sx - box.w / 2;
    const dy = p.y * sy - box.h / 2;
    return { x: box.cx + dx * c - dy * s, y: box.cy + dx * s + dy * c };
  });
}

/** Maps a canvas path into a box's own coordinates (the inverse of `toWorld` with the box's own size). */
export function fromWorld(path: BezPath, box: { cx: number; cy: number; w: number; h: number; rot: number }): BezPath {
  const r = (-box.rot * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return path.map((p) => {
    const dx = p.x - box.cx;
    const dy = p.y - box.cy;
    return { x: dx * c - dy * s + box.w / 2, y: dx * s + dy * c + box.h / 2 };
  });
}

const radiiOf = (l: Layer): [number, number, number, number] => {
  const shared = Math.max(0, num(l.properties["shape.cornerRadius"], 0));
  const c = (n: string) => Math.max(0, num(l.properties[`shape.cornerRadius.${n}`], shared));
  return [c("topLeft"), c("topRight"), c("bottomRight"), c("bottomLeft")];
};

/** A path layer's path in its own box: the network's (or path data's) 200 × 200 space stretched to the frame. */
function pathLayerPath(l: Layer, kind: "fill" | "stroke"): { path: BezPath; evenOdd: boolean; closed: boolean } | null {
  const { w, h } = layerSize(l);
  const net = parseNetwork(l.properties["svg.network"]);
  const unit = net ? (kind === "fill" ? networkFill(net) : networkStroke(net)) : pathDataToBez(str(l.properties["svg.path"], ""));
  if (!unit || unit.isEmpty()) return null;
  const evenOdd = net ? networkRule(net) === "evenodd" : l.properties["svg.fillRule"] === "evenodd";
  return { path: unit.map((p) => ({ x: (p.x * w) / 200, y: (p.y * h) / 200 })), evenOdd, closed: unit.els.some((e) => e.t === "Z") };
}

/** What a layer fills, in its own box, with its fill rule; null for layers with no closed area (lines, open paths, text). */
export function layerOutline(l: Layer, layers: Readonly<Record<string, Layer>>, depth = 0): { path: BezPath; evenOdd: boolean } | null {
  const { w, h } = layerSize(l);
  const p = l.properties;
  switch (l.archetype) {
    case "rectangle":
      return { path: roundedRect(w, h, radiiOf(l), Math.min(1, Math.max(0, num(p["shape.cornerSmoothing"], 0)))), evenOdd: false };
    case "ellipse":
      return { path: ellipse(w, h, (num(p["shape.arcStart"], 0) * Math.PI) / 180, (num(p["shape.arcSweep"], 360) * Math.PI) / 180, Math.min(1, Math.max(0, num(p["shape.arcInnerRatio"], 0)))), evenOdd: true };
    case "polygon":
      return { path: smoothedPolygon(polygonPoints(w, h, num(p["shape.sides"], 6)), num(p["shape.vertexRadius"], 0), num(p["shape.cornerSmoothing"], 0)), evenOdd: false };
    case "star":
      return { path: smoothedPolygon(starPoints(w, h, num(p["shape.points"], 5), num(p["shape.innerRadius"], 0.5)), num(p["shape.vertexRadius"], 0), num(p["shape.cornerSmoothing"], 0)), evenOdd: false };
    case "svgPath": {
      const r = pathLayerPath(l, "fill");
      return r && (r.closed || parseNetwork(p["svg.network"])) ? { path: r.path, evenOdd: r.evenOdd } : null;
    }
    case "container":
    case "form": {
      if (isBooleanGroup(l) && depth < 32) {
        const res = booleanGroupResult(l, layers, depth + 1);
        return res ? { path: res, evenOdd: false } : null;
      }
      return { path: roundedRect(w, h, [num(p["appearance.radius"], 0), num(p["appearance.radius"], 0), num(p["appearance.radius"], 0), num(p["appearance.radius"], 0)], 0), evenOdd: false };
    }
    default:
      return null;
  }
}

/** The layer's stroke settings as the outliner takes them (an archetype without an explicit alignment keeps its older placement). */
function strokePropsOf(l: Layer): StrokeProps | null {
  const p = l.properties;
  const color = str(p["svg.stroke"], "none");
  const weight = num(p["svg.strokeWidth"], 0);
  if (weight <= 0 || color === "none" || !parseColor(color) || parseColor(color)!.a === 0) return null;
  const alignRaw = p["stroke.align"];
  const legacy = l.archetype === "rectangle" || l.archetype === "ellipse" ? "inside" : "center";
  const join = str(p["svg.strokeLinejoin"], "miter");
  const dash = str(p["svg.strokeDasharray"], "none");
  return {
    ...defaultStroke(),
    weight,
    align: alignRaw === "inside" || alignRaw === "center" || alignRaw === "outside" ? alignRaw : legacy,
    sides: parseSides(p["stroke.sides"]),
    capStart: readCap(p["shape.startCap"]),
    capEnd: readCap(p["shape.endCap"]),
    join: join === "round" || join === "bevel" ? join : "miter",
    miterLimit: num(p["stroke.miterLimit"], 4),
    dashes: dash === "none" ? [] : dash.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 0),
    widthProfile: parseWidthProfile(p["stroke.widthProfile"]),
  };
}

/** The area a layer's visible stroke paints, in its own box; null when it has no visible stroke. */
export function layerStrokeArea(l: Layer, layers: Readonly<Record<string, Layer>>): BezPath | null {
  const props = strokePropsOf(l);
  if (!props) return null;
  const { w, h } = layerSize(l);
  if (l.archetype === "line") {
    const line = new BezPath().moveTo({ x: 0, y: h / 2 }).lineTo({ x: w, y: h / 2 });
    return strokeOutline(line, { ...props, align: "center" }, false);
  }
  if (l.archetype === "svgPath") {
    const r = pathLayerPath(l, "stroke");
    return r ? strokeOutline(r.path, props, r.closed, r.evenOdd) : null;
  }
  const fill = layerOutline(l, layers);
  return fill ? strokeOutline(fill.path, props, true, fill.evenOdd) : null;
}

/**
 * A boolean group's result, in its own box: its children's outlines folded bottom to top, each operand above the first
 * combining with what is below by its own `boolean.operandOp`, else the group's operation. Null when nothing is left.
 */
export function booleanGroupResult(group: Layer, layers: Readonly<Record<string, Layer>>, depth = 0): BezPath | null {
  const op = group.properties["boolean.operation"];
  if (!isBooleanOp(op)) return null;
  let acc: BezPath | null = null;
  let accEvenOdd = false;
  for (const id of group.children) {
    const child = layers[id];
    if (!child || child.visible === false) continue;
    const o = layerOutline(child, layers, depth);
    if (!o) continue;
    const placed = toParent(o.path, child);
    if (!acc) {
      acc = placed;
      accEvenOdd = o.evenOdd;
      continue;
    }
    const own = child.properties["boolean.operandOp"];
    acc = booleanPaths(acc, placed, isBooleanOp(own) ? own : op, accEvenOdd ? "evenodd" : "nonzero", o.evenOdd ? "evenodd" : "nonzero");
    accEvenOdd = false;
  }
  return acc && !acc.isEmpty() ? acc : null;
}

/** Cache for the stage: a group's result path text, recomputed only when the group or one of its descendants changed. */
const cache = new WeakMap<Layer, { deps: Layer[]; d: string }>();

function descendants(group: Layer, layers: Readonly<Record<string, Layer>>, out: Layer[] = [], depth = 0): Layer[] {
  if (depth > 32) return out;
  for (const id of group.children) {
    const c = layers[id];
    if (!c) continue;
    out.push(c);
    descendants(c, layers, out, depth + 1);
  }
  return out;
}

/** A boolean group's result as SVG path data (its own box), cached by the identity of the layers it reads. */
export function booleanGroupD(groupId: string, layers: Readonly<Record<string, Layer>>): string {
  const g = layers[groupId];
  if (!g || !isBooleanGroup(g)) return "";
  const deps = descendants(g, layers);
  const hit = cache.get(g);
  if (hit && hit.deps.length === deps.length && hit.deps.every((d, i) => d === deps[i])) return hit.d;
  const d = booleanGroupResult(g, layers)?.toSvg(3) ?? "";
  cache.set(g, { deps, d });
  return d;
}

