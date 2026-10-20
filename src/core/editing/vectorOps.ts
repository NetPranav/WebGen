/**
 * ============================================================================
 * VECTOR OPERATIONS ON LAYERS (ROADMAP Phase 40)
 * ============================================================================
 * Reads a layer's outline as paths in canvas space (a path, a rectangle, an ellipse), and writes results back:
 * boolean union, subtract, intersect and exclude into one new vector layer; flatten a shape into a path layer;
 * apply a path edit to a path layer (one undo step); import a sanitised SVG as editable vector layers. The shape
 * of a layer on the canvas is its frame (centre, size, rotation), which the canvas supplies as a `LayerBox`.
 * ============================================================================
 */

import type { Layer } from "../document/schema";
import type { PropValue } from "../document/registry";
import { effectiveFills } from "../paint/paints";
import { booleanShapes, flatten, ringsToPathData, type BooleanOp, type Ring } from "../paths/booleans";
import { ellipseSubPath, nodeCountOf, parsePathData, parsePoints, polySubPath, rectSubPath, type SubPath } from "../paths/pathData";
import { PATH_SPACE, pathFrame, serializePathNodes, buildPath } from "../paths/pathLayer";
import { nodesToPathData, type PathNode, type Vec } from "../paths/pathFit";
import { trySanitizeSvg } from "../assets/svgSanitize";
import { documentCommands, getDocument } from "../store/useDocumentStore";
import { transaction, setLayerProps } from "./editOps";

/** Where a layer is on the canvas: its unrotated frame's centre and size, and its rotation in degrees. */
export interface LayerBox {
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
}

const num = (v: PropValue | undefined, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const str = (v: PropValue | undefined, fallback = ""): string => (typeof v === "string" ? v : fallback);

const rotate = (p: Vec, c: Vec, deg: number): Vec => {
  if (deg === 0) return p;
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
};

function mapNode(n: PathNode, f: (v: Vec) => Vec): PathNode {
  return { ...n, ...f(n), ...(n.hin ? { hin: f(n.hin) } : {}), ...(n.hout ? { hout: f(n.hout) } : {}) };
}

/** The kinds of layer a vector operation reads. */
export const isVectorSource = (l: Layer | undefined): boolean => !!l && (l.archetype === "svgPath" || l.archetype === "rectangle" || l.archetype === "ellipse");

/** The layer's outline as subpaths in canvas space, rotation applied; null when the layer isn't a path or basic shape. */
export function layerSubPaths(layer: Layer, box: LayerBox): SubPath[] | null {
  const c = { x: box.cx, y: box.cy };
  const left = box.cx - box.w / 2;
  const top = box.cy - box.h / 2;
  let subs: SubPath[] | null = null;
  if (layer.archetype === "svgPath") {
    const parsed = parsePathData(str(layer.properties["svg.path"]));
    if (!parsed) return null;
    const sx = box.w / PATH_SPACE;
    const sy = box.h / PATH_SPACE;
    subs = parsed.map((s) => ({ ...s, nodes: s.nodes.map((n) => mapNode(n, (v) => ({ x: left + v.x * sx, y: top + v.y * sy }))) }));
  } else if (layer.archetype === "rectangle") {
    const r = num(layer.properties["shape.cornerRadius"]);
    subs = [rectSubPath(left, top, box.w, box.h, r)];
  } else if (layer.archetype === "ellipse") {
    subs = [ellipseSubPath(box.cx, box.cy, box.w / 2, box.h / 2)];
  }
  if (!subs) return null;
  return subs.map((s) => ({ ...s, nodes: s.nodes.map((n) => mapNode(n, (v) => rotate(v, c, box.rot))) }));
}

/** A path layer's nodes in canvas space for editing: exactly one subpath. Null for a compound path or a non-path. */
export function editablePath(layer: Layer, box: LayerBox): SubPath | null {
  if (layer.archetype !== "svgPath") return null;
  const subs = layerSubPaths(layer, box);
  return subs && subs.length === 1 ? subs[0] : null;
}

const solidFillOf = (layer: Layer): string | null => {
  const fills = effectiveFills(layer.properties["paint.fills"], str(layer.properties["svg.fill"]) || undefined);
  const first = fills.find((f) => f.type === "solid" && f.visible !== false);
  return first && first.type === "solid" ? first.color : null;
};

function styleProps(layer: Layer): Record<string, PropValue> {
  const out: Record<string, PropValue> = {
    "svg.fill": solidFillOf(layer) ?? "#cbd5e1",
    "svg.stroke": str(layer.properties["svg.stroke"]) || "#0f172a",
    "svg.strokeWidth": num(layer.properties["svg.strokeWidth"], 2),
  };
  for (const k of ["svg.strokeLinecap", "svg.strokeLinejoin", "svg.strokeDasharray"]) if (layer.properties[k] !== undefined) out[k] = layer.properties[k] as PropValue;
  return out;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** The properties that place a path (given in unrotated canvas space) in a layer inside a parent whose top-left is `origin`. */
function pathProps(nodes: readonly PathNode[], closed: boolean, strokeWidth: number, origin: Vec): Record<string, PropValue> {
  const built = buildPath(nodes, closed, strokeWidth);
  return {
    "frame.x": r2(built.frame.x - origin.x),
    "frame.y": r2(built.frame.y - origin.y),
    "frame.width": built.frame.width,
    "frame.height": built.frame.height,
    "svg.path": built.d,
    "svg.nodes": serializePathNodes(built.nodes, closed),
  };
}

// --- booleans -------------------------------------------------------------------

/**
 * Combines the vector layers `ids` into one new path layer, replacing them (one undo step). The new layer sits where
 * the first of them was and takes its look. For `subtract` the first layer is the one cut. Returns the new layer's
 * id, or null when fewer than two usable layers were given or nothing is left of the result.
 */
export function booleanLayers(op: BooleanOp, ids: readonly string[], boxOf: (id: string) => LayerBox | null): string | null {
  const layers = getDocument().layers;
  const usable = ids.filter((id) => isVectorSource(layers[id]) && layers[id].locked !== true && boxOf(id));
  if (usable.length < 2) return null;
  const shapes = usable.map((id) => {
    const subs = layerSubPaths(layers[id], boxOf(id)!) ?? [];
    return { rings: subs.map((s) => flatten(s.nodes, s.closed)) };
  });
  const result = booleanShapes(op, shapes);
  if (result.length === 0) return null;
  const first = layers[usable[0]];
  const parentId = first.parentId;
  const parentIndex = parentId ? layers[parentId].children.indexOf(first.id) : -1;
  const firstBox = boxOf(usable[0])!;
  const origin = { x: firstBox.cx - firstBox.w / 2 - num(first.properties["frame.x"]), y: firstBox.cy - firstBox.h / 2 - num(first.properties["frame.y"]) };
  const style = styleProps(first);
  const sw = num(style["svg.strokeWidth"], 2);
  // one outline and no hole is a plain editable path; anything else is a compound path drawn with the even-odd rule
  const simple = result.length === 1 && result[0].length === 1;
  const flatNodes: PathNode[] = result.flat().flat().map((p) => ({ x: p.x, y: p.y }));
  const frame = pathFrame(flatNodes, false, sw);
  let props: Record<string, PropValue>;
  if (simple) {
    props = pathProps(result[0][0].map((p) => ({ x: p.x, y: p.y })), true, sw, origin);
  } else {
    const k = PATH_SPACE;
    const unit: Ring[][] = result.map((poly) => poly.map((ring) => ring.map((p) => ({ x: ((p.x - frame.x) / frame.width) * k, y: ((p.y - frame.y) / frame.height) * k }))));
    props = {
      "frame.x": r2(frame.x - origin.x),
      "frame.y": r2(frame.y - origin.y),
      "frame.width": frame.width,
      "frame.height": frame.height,
      "svg.path": ringsToPathData(unit),
      "svg.nodes": "",
      "svg.fillRule": "evenodd",
    };
  }
  let created = "";
  transaction(`${op[0].toUpperCase()}${op.slice(1)}`, () => {
    created = documentCommands.addLayer(
      { archetype: "svgPath", parentId, name: first.name ?? "Path", properties: { positioning: "absolute", ...style, ...props, ...(first.properties["frame.rotation"] ? {} : {}) }, ...(parentIndex >= 0 ? { index: parentIndex } : {}) },
      "Combine",
    );
    for (const id of usable) if (getDocument().layers[id]) documentCommands.removeLayer(id, "Combine");
  });
  return created;
}

/** Turns rectangles and ellipses into path layers in place (same parent, same place in the stack). Returns the new ids. */
export function flattenLayers(ids: readonly string[], boxOf: (id: string) => LayerBox | null): string[] {
  const layers = getDocument().layers;
  const out: string[] = [];
  transaction("Flatten", () => {
    for (const id of ids) {
      const layer = getDocument().layers[id];
      const box = boxOf(id);
      if (!layer || !box || layer.locked === true || layer.archetype === "svgPath" || !isVectorSource(layer)) continue;
      const subs = layerSubPaths(layer, box);
      if (!subs || subs.length !== 1) continue;
      const style = styleProps(layer);
      const origin = { x: box.cx - box.w / 2 - num(layer.properties["frame.x"]), y: box.cy - box.h / 2 - num(layer.properties["frame.y"]) };
      const parentId = layer.parentId;
      const index = parentId ? layers[parentId].children.indexOf(id) : -1;
      const made = documentCommands.addLayer(
        { archetype: "svgPath", parentId, name: layer.name ?? "Path", properties: { positioning: "absolute", ...style, ...pathProps(subs[0].nodes, subs[0].closed, num(style["svg.strokeWidth"], 2), origin) }, ...(index >= 0 ? { index } : {}) },
        "Flatten",
      );
      documentCommands.removeLayer(id, "Flatten");
      out.push(made);
    }
  });
  return out;
}

// --- editing -------------------------------------------------------------------

/** Writes an edited path (nodes in canvas space, as `editablePath` gave them) back to its layer: one undo step. */
export function applyPathEdit(layerId: string, box: LayerBox, nodes: readonly PathNode[], closed: boolean): boolean {
  const layer = getDocument().layers[layerId];
  if (!layer || layer.archetype !== "svgPath" || layer.locked === true || nodes.length < 2) return false;
  const c = { x: box.cx, y: box.cy };
  const unrotated = nodes.map((n) => mapNode(n, (v) => rotate(v, c, -box.rot)));
  const sw = num(layer.properties["svg.strokeWidth"], 2);
  const built = buildPath(unrotated, closed, sw);
  // the new frame's centre in the old rotated frame of reference: the layer turns about it
  const nc = rotate({ x: built.frame.x + built.frame.width / 2, y: built.frame.y + built.frame.height / 2 }, c, box.rot);
  const left = box.cx - box.w / 2;
  const top = box.cy - box.h / 2;
  const origin = { x: left - num(layer.properties["frame.x"]), y: top - num(layer.properties["frame.y"]) };
  setLayerProps(
    [layerId],
    {
      "frame.x": r2(nc.x - built.frame.width / 2 - origin.x),
      "frame.y": r2(nc.y - built.frame.height / 2 - origin.y),
      "frame.width": built.frame.width,
      "frame.height": built.frame.height,
      "svg.path": built.d,
      "svg.nodes": serializePathNodes(built.nodes, closed),
    },
    "Edit path",
  );
  return true;
}

// --- SVG import ------------------------------------------------------------------

export interface ImportedShape {
  sub: SubPath;
  fill: string;
  stroke: string;
  strokeWidth: number;
  name: string;
}

export const MAX_IMPORT_NODES = 20_000;

/** Reads the attributes of a tag: `name="value"` pairs. The text is already sanitised, so the quoting is regular. */
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([A-Za-z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1]] = m[2] ?? m[3] ?? "";
  return out;
}

const n0 = (s: string | undefined, d = 0) => {
  const v = s === undefined ? NaN : parseFloat(s);
  return Number.isFinite(v) ? v : d;
};

/**
 * The shapes of an SVG as subpaths, in the file's own units, translated so the picture's viewBox starts at the
 * origin. The text is cleaned first (`sanitizeSvg`); a file that can't be cleaned gives null. Group transforms
 * aren't applied, and fills that are gradients or `url()` references fall back to a flat grey: the shapes are what
 * is imported, to be restyled with the paint controls.
 */
export function readSvgShapes(svgText: string): { shapes: ImportedShape[]; width: number; height: number } | null {
  const clean = trySanitizeSvg(svgText);
  if (!clean) return null;
  const root = /<svg\b[^>]*>/i.exec(clean);
  if (!root) return null;
  const ra = attrs(root[0]);
  let vbx = 0, vby = 0, vbw = n0(ra.width, 100), vbh = n0(ra.height, 100);
  if (ra.viewBox) {
    const v = ra.viewBox.split(/[\s,]+/).map(Number);
    if (v.length === 4 && v.every(Number.isFinite) && v[2] > 0 && v[3] > 0) [vbx, vby, vbw, vbh] = v;
  }
  const shapes: ImportedShape[] = [];
  let nodes = 0;
  const paint = (a: Record<string, string>) => {
    const raw = a.fill ?? "#000000";
    const fill = raw === "none" ? "none" : /^url\(/i.test(raw) || raw === "currentColor" ? "#cbd5e1" : raw;
    const stroke = a.stroke && a.stroke !== "none" && !/^url\(/i.test(a.stroke) ? a.stroke : "none";
    return { fill, stroke: stroke === "none" ? "#0f172a" : stroke, strokeWidth: stroke === "none" ? 0 : n0(a["stroke-width"], 1) };
  };
  const push = (subs: SubPath[] | null, a: Record<string, string>, name: string) => {
    if (!subs) return;
    const p = paint(a);
    for (const sub of subs) {
      nodes += sub.nodes.length;
      if (nodes > MAX_IMPORT_NODES) return;
      shapes.push({ sub: { ...sub, nodes: sub.nodes.map((n) => mapNode(n, (v) => ({ x: v.x - vbx, y: v.y - vby }))) }, ...p, name });
    }
  };
  for (const m of clean.matchAll(/<(path|rect|circle|ellipse|line|polyline|polygon)\b([^>]*?)\/?>/gi)) {
    const tag = m[1].toLowerCase();
    const a = attrs(m[2]);
    if (a.display === "none") continue;
    switch (tag) {
      case "path":
        push(parsePathData(a.d ?? ""), a, "Path");
        break;
      case "rect":
        push([rectSubPath(n0(a.x), n0(a.y), n0(a.width), n0(a.height), n0(a.rx, n0(a.ry)), n0(a.ry, n0(a.rx)))], a, "Rectangle");
        break;
      case "circle":
        push([ellipseSubPath(n0(a.cx), n0(a.cy), n0(a.r), n0(a.r))], a, "Circle");
        break;
      case "ellipse":
        push([ellipseSubPath(n0(a.cx), n0(a.cy), n0(a.rx), n0(a.ry))], a, "Ellipse");
        break;
      case "line": {
        const s = polySubPath([{ x: n0(a.x1), y: n0(a.y1) }, { x: n0(a.x2), y: n0(a.y2) }], false);
        push(s ? [s] : null, { ...a, fill: "none" }, "Line");
        break;
      }
      case "polyline": {
        const s = polySubPath(parsePoints(a.points ?? ""), false);
        push(s ? [s] : null, { ...a, fill: a.fill ?? "none" }, "Polyline");
        break;
      }
      case "polygon": {
        const s = polySubPath(parsePoints(a.points ?? ""), true);
        push(s ? [s] : null, a, "Polygon");
        break;
      }
    }
  }
  return shapes.length > 0 ? { shapes, width: vbw, height: vbh } : null;
}

/**
 * Imports an SVG as editable vector layers: one path layer for each shape, each straight into `parent` with the
 * picture's top-left at `at` (canvas space), in one undo step. Returns the ids.
 */
export function importSvgAsVectors(svgText: string, parent: { id: string; origin: Vec } | null, at: Vec): string[] {
  const read = readSvgShapes(svgText);
  if (!read || !parent) return [];
  const ids: string[] = [];
  transaction("Import SVG", () => {
    for (const s of read.shapes) {
      const nodes = s.sub.nodes.map((n) => mapNode(n, (v) => ({ x: v.x + at.x, y: v.y + at.y })));
      const props: Record<string, PropValue> = {
        positioning: "absolute",
        "svg.fill": s.sub.closed ? s.fill : s.fill === "#000000" ? "none" : s.fill,
        "svg.stroke": s.stroke,
        "svg.strokeWidth": s.strokeWidth,
        ...pathProps(nodes, s.sub.closed, s.strokeWidth, parent.origin),
      };
      ids.push(documentCommands.addLayer({ archetype: "svgPath", parentId: parent.id, name: s.name, properties: props }, "Import SVG"));
    }
  });
  return ids;
}

export { nodeCountOf, nodesToPathData };
