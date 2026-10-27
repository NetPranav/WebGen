/**
 * SVG import into an editable design (FigCraft port F14): an SVG file becomes a frame of layers, not one picture.
 *
 * - The file is cleaned first (`sanitizeSvg`), then read as a tree: presentation attributes, inline `style` and the
 *   file's simple `<style>` rules (by tag, class and id; read, never injected) are inherited down the tree the way
 *   SVG does; `<use>` copies what it points at.
 * - Groups stay groups (named by their `id`), each the box of its layers. Transforms are baked into the layers:
 *   rectangles and ellipses stay those shapes while the transform only moves and scales them; anything else, or
 *   anything turned or skewed, becomes a path layer (a compound path keeps its holes).
 * - Fills and strokes keep their colour and opacity; linear and radial gradients stay gradients (`href` chains,
 *   `objectBoundingBox` and `userSpaceOnUse`); `opacity`, fill rules, caps, joins and dashes carry over.
 * - `feDropShadow` and `feGaussianBlur` filters become a drop shadow and a layer blur; text becomes text layers;
 *   images (data URLs only) become image layers.
 * - What can't be represented (clip paths and masks, other filters, gradient transforms, patterns) is left out and
 *   listed in the import notes. Budgets bound hostile files: elements, depth, path nodes.
 *
 * Behaviour translated from FigCraft (`crates/svg/src/import/*` and its tests), commit 6ea44e9. FigCraft normalises
 * with usvg; this does the part of that normalisation the import needs. MIT, Copyright (c) 2026 ArtCraft Team and
 * the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import type { PropValue } from "../document/registry";
import { trySanitizeSvg } from "../assets/svgSanitize";
import { parseCss, toCss } from "../paint/color";
import type { GradientStop, Paint } from "../paint/paints";
import { ellipseSubPath, parsePathData, parsePoints, polySubPath, rectSubPath, type SubPath } from "./pathData";
import { nodesToPathData, type PathNode } from "./pathFit";
import { PATH_SPACE, pathFrame, serializePathNodes, toPathSpace, buildPath } from "./pathLayer";

export const MAX_SVG_ELEMENTS = 10_000;
export const MAX_SVG_DEPTH = 64;
export const MAX_SVG_NODES = 20_000;

/** One layer of the plan: what to create, its box in the frame (px), and what is in it. */
export interface PlanLayer {
  archetype: "container" | "svgPath" | "rectangle" | "ellipse" | "text" | "image";
  name: string;
  properties: Record<string, PropValue>;
  box: { x: number; y: number; w: number; h: number };
  children: PlanLayer[];
}

export interface SvgPlan {
  width: number;
  height: number;
  layers: PlanLayer[];
  notes: string[];
}

// --- a small XML tree -----------------------------------------------------------------------------

interface XNode {
  tag: string;
  attrs: Record<string, string>;
  children: XNode[];
  text: string;
}

const ENTITY: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'" };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => ENTITY[m] ?? m).replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Math.min(0x10ffff, Number(n))));

function attrsOf(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([A-Za-z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1]] = decode(m[2] ?? m[3] ?? "");
  return out;
}

/** The cleaned file as a tree (tags lower-cased only where SVG is case-insensitive: never; kept as written). */
function parseXml(text: string): XNode | null {
  const root: XNode = { tag: "#root", attrs: {}, children: [], text: "" };
  const stack: XNode[] = [root];
  let count = 0;
  for (const m of text.matchAll(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([A-Za-z][-\w:.]*)([^>]*?)(\/?)>|([^<]+)/g)) {
    if (m[0].startsWith("<!--") || m[0].startsWith("<?")) continue;
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[6] !== undefined) top.text += decode(m[6]);
    else if (m[3]) {
      if (++count > MAX_SVG_ELEMENTS * 2) break;
      if (m[2] === "/") {
        if (stack.length > 1) stack.pop();
      } else {
        const node: XNode = { tag: m[3], attrs: attrsOf(m[4]), children: [], text: "" };
        top.children.push(node);
        if (m[5] !== "/" && stack.length < MAX_SVG_DEPTH * 2) stack.push(node);
      }
    }
  }
  return root.children.find((c) => c.tag === "svg") ?? null;
}

// --- styles -----------------------------------------------------------------------------------------

/** The presentation properties the import reads (and inherits where SVG inherits them). */
const PRESENTATION = ["fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "display", "visibility", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "clip-path", "mask", "filter", "mix-blend-mode", "stop-color", "stop-opacity"];
const NOT_INHERITED = new Set(["opacity", "display", "clip-path", "mask", "filter", "mix-blend-mode", "stop-color", "stop-opacity"]);

type Style = Record<string, string>;

const declarations = (s: string): Style => {
  const out: Style = {};
  for (const part of s.split(";")) {
    const i = part.indexOf(":");
    if (i <= 0) continue;
    const k = part.slice(0, i).trim().toLowerCase();
    if (PRESENTATION.includes(k)) out[k] = part.slice(i + 1).replace(/!important/i, "").trim();
  }
  return out;
};

interface Rule {
  kind: "tag" | "class" | "id";
  name: string;
  style: Style;
}

/** Simple `<style>` rules from the original text: selectors that are one tag, class or id (comma lists too). */
function cssRules(original: string): Rule[] {
  const rules: Rule[] = [];
  for (const block of original.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = block[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!\[CDATA\[|\]\]>/g, "");
    for (const r of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const style = declarations(r[2]);
      for (const sel of r[1].split(",").map((x) => x.trim())) {
        const m = /^([.#]?)([A-Za-z_][-\w]*)$/.exec(sel);
        if (m) rules.push({ kind: m[1] === "." ? "class" : m[1] === "#" ? "id" : "tag", name: m[2], style });
      }
      if (rules.length > 2000) return rules;
    }
  }
  return rules;
}

/** An element's own style: attributes, then rules by tag, class and id, then its inline `style`. */
function ownStyle(n: XNode, rules: readonly Rule[]): Style {
  const s: Style = {};
  for (const k of PRESENTATION) if (n.attrs[k] !== undefined) s[k] = n.attrs[k];
  const classes = (n.attrs.class ?? "").split(/\s+/).filter(Boolean);
  for (const kind of ["tag", "class", "id"] as const)
    for (const r of rules) if (r.kind === kind && (kind === "tag" ? r.name === n.tag : kind === "class" ? classes.includes(r.name) : r.name === n.attrs.id)) Object.assign(s, r.style);
  if (n.attrs.style) Object.assign(s, declarations(n.attrs.style));
  return s;
}

const inherit = (parent: Style, own: Style): Style => {
  const out: Style = {};
  for (const [k, v] of Object.entries(parent)) if (!NOT_INHERITED.has(k)) out[k] = v;
  for (const [k, v] of Object.entries(own)) if (v !== "inherit") out[k] = v;
  return out;
};

// --- transforms ------------------------------------------------------------------------------------

type M = [number, number, number, number, number, number];
const I: M = [1, 0, 0, 1, 0, 0];
const mul = (a: M, b: M): M => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const apply = (m: M, p: { x: number; y: number }) => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });

/** An SVG `transform` list as a matrix (junk is the identity). */
export function parseTransform(s: string | undefined): M {
  let m: M = I;
  if (!s) return m;
  for (const t of s.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const v = t[2].split(/[\s,]+/).filter(Boolean).map(Number);
    if (v.some((x) => !Number.isFinite(x))) continue;
    let n: M = I;
    if (t[1] === "matrix" && v.length === 6) n = v as M;
    else if (t[1] === "translate") n = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0];
    else if (t[1] === "scale") n = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0];
    else if (t[1] === "rotate") {
      const a = ((v[0] ?? 0) * Math.PI) / 180;
      const r: M = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
      n = v.length >= 3 ? mul(mul([1, 0, 0, 1, v[1], v[2]], r), [1, 0, 0, 1, -v[1], -v[2]]) : r;
    } else if (t[1] === "skewX") n = [1, 0, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
    else if (t[1] === "skewY") n = [1, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    m = mul(m, n);
  }
  return m;
}

/** Whether a matrix only moves and scales (no turn, skew or flip): then a rectangle or ellipse stays one. */
const axisAligned = (m: M) => Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9 && m[0] > 0 && m[3] > 0;
/** How much a matrix scales a length (its area's square root). */
const lengthScale = (m: M) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;

// --- paints -----------------------------------------------------------------------------------------

const num = (s: string | undefined, d = 0) => {
  const v = s === undefined ? NaN : parseFloat(s);
  return Number.isFinite(v) ? v : d;
};
/** A length or a share: `50%` of `of`, or a number. */
const len = (s: string | undefined, d: number, of = 1) => (s && s.trim().endsWith("%") ? (num(s) / 100) * of : num(s, d));
const opacityOf = (s: string | undefined) => Math.min(1, Math.max(0, len(s, 1)));

/** A colour with an opacity applied, as CSS; null for none or junk. */
function colorWith(c: string | undefined, opacity: number): string | null {
  if (!c || c === "none" || c === "transparent") return null;
  const parsed = parseCss(c === "currentColor" ? "#000000" : c);
  if (!parsed) return null;
  return opacity >= 0.999 && parsed.a >= 0.999 ? c.trim() : toCss({ ...parsed, a: parsed.a * opacity });
}

interface Defs {
  byId: Map<string, XNode>;
  notes: Set<string>;
}

/** A gradient's stops, following its `href` chain for stops it doesn't have itself. */
function gradientStops(g: XNode, defs: Defs, rules: readonly Rule[], depth = 0): GradientStop[] {
  const own = g.children.filter((c) => c.tag === "stop");
  if (own.length === 0 && depth < 8) {
    const ref = (g.attrs.href ?? g.attrs["xlink:href"] ?? "").replace(/^#/, "");
    const base = defs.byId.get(ref);
    if (base) return gradientStops(base, defs, rules, depth + 1);
  }
  return own.slice(0, 32).map((s) => {
    const st = ownStyle(s, rules);
    const color = colorWith(st["stop-color"] ?? "#000000", opacityOf(st["stop-opacity"])) ?? "rgba(0, 0, 0, 0)";
    return { at: Math.min(1, Math.max(0, len(s.attrs.offset, 0))), color };
  });
}

/** An attribute of a gradient, from it or along its `href` chain. */
function gradAttr(g: XNode, defs: Defs, name: string, depth = 0): string | undefined {
  if (g.attrs[name] !== undefined) return g.attrs[name];
  if (depth >= 8) return undefined;
  const base = defs.byId.get((g.attrs.href ?? g.attrs["xlink:href"] ?? "").replace(/^#/, ""));
  return base ? gradAttr(base, defs, name, depth + 1) : undefined;
}

/**
 * A fill or stroke as a paint for a shape whose box (in its own user space) is `bb`: a solid colour, or a linear or
 * radial gradient placed as fractions of the box. Null for none.
 */
function paintOf(value: string | undefined, opacity: number, bb: { x: number; y: number; w: number; h: number }, defs: Defs, rules: readonly Rule[]): Paint | null {
  if (!value || value === "none") return null;
  const ref = /^url\(\s*#([^)\s]+)\s*\)/.exec(value);
  if (!ref) {
    const c = colorWith(value, opacity);
    return c ? { type: "solid", color: c, opacity: 1, visible: true } : null;
  }
  const g = defs.byId.get(ref[1]);
  if (!g || (g.tag !== "linearGradient" && g.tag !== "radialGradient")) {
    if (g?.tag === "pattern") defs.notes.add("Patterns are left out (the shape keeps a flat fill).");
    const fallback = colorWith(value.replace(/^url\([^)]*\)\s*/, ""), opacity);
    return fallback ? { type: "solid", color: fallback, opacity: 1, visible: true } : null;
  }
  const stops = gradientStops(g, defs, rules);
  if (stops.length === 0) return null;
  if (gradAttr(g, defs, "gradientTransform")) defs.notes.add("Gradient transforms are left out.");
  const user = gradAttr(g, defs, "gradientUnits") === "userSpaceOnUse";
  const fx = (s: string | undefined, d: number) => (user ? (len(s, d * bb.w + bb.x, bb.w) - bb.x) / (bb.w || 1) : len(s, d));
  const fy = (s: string | undefined, d: number) => (user ? (len(s, d * bb.h + bb.y, bb.h) - bb.y) / (bb.h || 1) : len(s, d));
  const base = { opacity, visible: true, stops };
  const spread = gradAttr(g, defs, "spreadMethod");
  if (g.tag === "linearGradient") {
    const from = { x: fx(gradAttr(g, defs, "x1"), 0), y: fy(gradAttr(g, defs, "y1"), 0) };
    const to = { x: fx(gradAttr(g, defs, "x2"), 1), y: fy(gradAttr(g, defs, "y2"), 0) };
    if (spread === "reflect" || spread === "repeat") return { type: "linear", ...base, ...unroll(from, to, stops, spread === "reflect") };
    return { type: "linear", ...base, from, to };
  }
  const r = gradAttr(g, defs, "r");
  const rr = user ? len(r, 0.5 * Math.max(bb.w, bb.h)) : len(r, 0.5);
  if (spread === "reflect" || spread === "repeat") defs.notes.add("Repeating radial gradients are imported padded.");
  // centred on its focal point, as FigCraft draws it
  const cx = fx(gradAttr(g, defs, "fx") ?? gradAttr(g, defs, "cx"), 0.5);
  const cy = fy(gradAttr(g, defs, "fy") ?? gradAttr(g, defs, "cy"), 0.5);
  return { type: "radial", ...base, center: { x: cx, y: cy }, radius: user ? { x: rr / (bb.w || 1), y: rr / (bb.h || 1) } : { x: rr, y: rr } };
}

/**
 * A repeating or reflecting linear gradient unrolled over the unit box (FigCraft): the handles stretched over whole
 * periods until the box is covered (at most 16), the stops repeated in each, every other one backwards for reflect.
 */
function unroll(from: { x: number; y: number }, to: { x: number; y: number }, stops: GradientStop[], reflect: boolean): { from: { x: number; y: number }; to: { x: number; y: number }; stops: GradientStop[] } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return { from, to, stops };
  const reach = Math.max(...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => ((x - from.x) * dx + (y - from.y) * dy) / l2));
  const n = Math.min(16, Math.max(1, Math.ceil(reach - 1e-9)));
  const out: GradientStop[] = [];
  for (let k = 0; k < n; k++) {
    const back = reflect && k % 2 === 1;
    const list = back ? [...stops].reverse().map((s) => ({ ...s, at: 1 - s.at })) : stops;
    for (const s of list) out.push({ at: (k + s.at) / n, color: s.color });
  }
  return { from, to: { x: from.x + dx * n, y: from.y + dy * n }, stops: out.slice(0, 32) };
}

/** A filter as what we can draw: a drop shadow and a layer blur; anything else noted. */
function filterOf(value: string | undefined, defs: Defs, scale: number): Record<string, PropValue> {
  const ref = value && /^url\(\s*#([^)\s]+)\s*\)/.exec(value);
  const f = ref ? defs.byId.get(ref[1]) : undefined;
  if (!f) return {};
  const out: Record<string, PropValue> = {};
  const shadows: unknown[] = [];
  let other = false;
  for (const p of f.children) {
    if (p.tag === "feDropShadow") {
      const color = colorWith(p.attrs["flood-color"] ?? "#000000", opacityOf(p.attrs["flood-opacity"])) ?? "rgba(0, 0, 0, 0.33)";
      shadows.push({ kind: "drop", x: num(p.attrs.dx, 2) * scale, y: num(p.attrs.dy, 2) * scale, blur: num(p.attrs.stdDeviation, 2) * 2 * scale, spread: 0, color });
    } else if (p.tag === "feGaussianBlur" && f.children.length === 1) out["filter.blur"] = Math.min(200, num(p.attrs.stdDeviation) * scale);
    else other = true;
  }
  if (shadows.length > 0) out["paint.shadows"] = JSON.stringify(shadows.slice(0, 16));
  if (other) defs.notes.add("Filters other than drop shadows and blurs are left out.");
  return out;
}

// --- shapes -------------------------------------------------------------------------------------------

/** A subpath's nodes through a matrix. */
const mapSub = (s: SubPath, m: M): SubPath => ({
  closed: s.closed,
  nodes: s.nodes.map((n) => ({ ...n, ...apply(m, n), ...(n.hin ? { hin: apply(m, n.hin) } : {}), ...(n.hout ? { hout: apply(m, n.hout) } : {}) })),
});

/** The box of subpaths (their nodes and handles). */
function boundsOf(subs: readonly SubPath[]): { x: number; y: number; w: number; h: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of subs)
    for (const n of s.nodes)
      for (const p of [n, n.hin, n.hout]) {
        if (!p) continue;
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x);
        y1 = Math.max(y1, p.y);
      }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** A path layer's properties for subpaths already in the frame's space: one subpath stays editable node by node; several make one compound path. */
function pathLayer(subs: SubPath[], strokeWidth: number): { properties: Record<string, PropValue>; box: { x: number; y: number; w: number; h: number } } | null {
  if (subs.length === 0) return null;
  if (subs.length === 1) {
    const built = buildPath(subs[0].nodes, subs[0].closed, strokeWidth);
    return { box: { x: built.frame.x, y: built.frame.y, w: built.frame.width, h: built.frame.height }, properties: { "svg.path": built.d, "svg.nodes": serializePathNodes(built.nodes, subs[0].closed) } };
  }
  const frames = subs.map((s) => pathFrame(s.nodes, s.closed, strokeWidth));
  const x0 = Math.min(...frames.map((f) => f.x));
  const y0 = Math.min(...frames.map((f) => f.y));
  const frame = { x: x0, y: y0, width: Math.max(1, Math.max(...frames.map((f) => f.x + f.width)) - x0), height: Math.max(1, Math.max(...frames.map((f) => f.y + f.height)) - y0) };
  const d = subs.map((s) => nodesToPathData(toPathSpace(s.nodes, frame), s.closed)).join(" ");
  return { box: { x: frame.x, y: frame.y, w: frame.width, h: frame.height }, properties: { "svg.path": d } };
}

// --- the walk -----------------------------------------------------------------------------------------

interface Ctx {
  defs: Defs;
  rules: readonly Rule[];
  elements: number;
  nodes: number;
}

/** The subpaths an element draws, in its own user space; null for none. */
function subPathsOf(n: XNode): { subs: SubPath[]; kind: "rect" | "ellipse" | "path"; rect?: { x: number; y: number; w: number; h: number; rx: number } } | null {
  const a = n.attrs;
  switch (n.tag) {
    case "path": {
      const subs = parsePathData(a.d ?? "");
      return subs && subs.length > 0 ? { subs, kind: "path" } : null;
    }
    case "rect": {
      const w = num(a.width);
      const h = num(a.height);
      if (!(w > 0 && h > 0)) return null;
      let rx = num(a.rx, num(a.ry));
      let ry = num(a.ry, rx);
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      return { subs: [rectSubPath(num(a.x), num(a.y), w, h, rx, ry)], kind: Math.abs(rx - ry) < 1e-9 ? "rect" : "path", rect: { x: num(a.x), y: num(a.y), w, h, rx } };
    }
    case "circle":
    case "ellipse": {
      const rx = n.tag === "circle" ? num(a.r) : num(a.rx);
      const ry = n.tag === "circle" ? num(a.r) : num(a.ry);
      if (!(rx > 0 && ry > 0)) return null;
      return { subs: [ellipseSubPath(num(a.cx), num(a.cy), rx, ry)], kind: "ellipse", rect: { x: num(a.cx) - rx, y: num(a.cy) - ry, w: rx * 2, h: ry * 2, rx: 0 } };
    }
    case "line": {
      const s = polySubPath([{ x: num(a.x1), y: num(a.y1) }, { x: num(a.x2), y: num(a.y2) }], false);
      return s ? { subs: [s], kind: "path" } : null;
    }
    case "polyline":
    case "polygon": {
      const s = polySubPath(parsePoints(a.points ?? ""), n.tag === "polygon");
      return s ? { subs: [s], kind: "path" } : null;
    }
    default:
      return null;
  }
}

const SKIP = new Set(["defs", "title", "desc", "metadata", "style", "linearGradient", "radialGradient", "pattern", "clipPath", "mask", "filter", "marker", "symbol"]);

function walk(n: XNode, parentStyle: Style, m: M, ctx: Ctx, depth: number, out: PlanLayer[]): void {
  if (depth > MAX_SVG_DEPTH || ++ctx.elements > MAX_SVG_ELEMENTS) {
    ctx.defs.notes.add("The file is larger than the import reads: the rest is left out.");
    return;
  }
  if (SKIP.has(n.tag)) return;
  const own = ownStyle(n, ctx.rules);
  const style = inherit(parentStyle, own);
  if (own.display === "none") return;
  const here = mul(m, parseTransform(n.attrs.transform));
  if (own["clip-path"] && own["clip-path"] !== "none") ctx.defs.notes.add("Clip paths are left out (masks are roadmap Phase 74).");
  if (own.mask && own.mask !== "none") ctx.defs.notes.add("Masks are left out (masks are roadmap Phase 74).");
  const k = lengthScale(here);
  const common: Record<string, PropValue> = {};
  const op = opacityOf(own.opacity);
  if (op < 0.999) common["appearance.opacity"] = r2(op);
  if (style.visibility === "hidden") common["__hidden"] = true;
  Object.assign(common, filterOf(own.filter, ctx.defs, k));
  const name = decodeId(n.attrs.id ?? "");

  if (n.tag === "g" || n.tag === "svg" || n.tag === "a") {
    const kids: PlanLayer[] = [];
    let inner = here;
    if (n.tag === "svg" && depth > 0) inner = mul(here, [1, 0, 0, 1, num(n.attrs.x), num(n.attrs.y)]);
    for (const c of n.children) walk(c, style, inner, ctx, depth + 1, kids);
    if (kids.length === 0) return;
    // the wrapper a single element needs for a transform or opacity merges into it (FigCraft); a named group stays
    if (kids.length === 1 && !name) {
      out.push(mergeInto(kids[0], common));
      return;
    }
    out.push(group(kids, name || "Group", common));
    return;
  }

  if (n.tag === "use") {
    const ref = ctx.defs.byId.get((n.attrs.href ?? n.attrs["xlink:href"] ?? "").replace(/^#/, ""));
    if (!ref || depth > MAX_SVG_DEPTH - 2) return;
    const moved = mul(here, [1, 0, 0, 1, num(n.attrs.x), num(n.attrs.y)]);
    const kids: PlanLayer[] = [];
    // a symbol (or anything) used here draws as a group of its contents
    if (ref.tag === "symbol") for (const c of ref.children) walk(c, style, moved, ctx, depth + 1, kids);
    else walk(ref, style, moved, ctx, depth + 1, kids);
    if (kids.length === 1 && !name) out.push(mergeInto(kids[0], common));
    else if (kids.length > 0) out.push(group(kids, name || decodeId(ref.attrs.id ?? "") || "Use", common));
    return;
  }

  if (n.tag === "text") {
    const content = textOf(n).replace(/\s+/g, " ").trim();
    if (!content) return;
    const size = Math.max(1, len(style["font-size"], 16) * k);
    const p = apply(here, { x: num(n.attrs.x), y: num(n.attrs.y) });
    const w = Math.max(1, content.length * size * 0.55);
    const anchor = style["text-anchor"];
    const x = anchor === "middle" ? p.x - w / 2 : anchor === "end" ? p.x - w : p.x;
    const color = colorWith(style.fill ?? "#000000", opacityOf(style["fill-opacity"])) ?? "#000000";
    if (!axisAligned(here)) ctx.defs.notes.add("Turned or skewed text is imported upright.");
    out.push({
      archetype: "text",
      name: name || content.slice(0, 40),
      box: { x, y: p.y - size * 0.8, w, h: size * 1.2 },
      children: [],
      properties: {
        ...common,
        "content.text": content.slice(0, 20_000),
        "typography.fontSize": r2(size),
        "typography.color": color,
        "typography.lineHeight": 1.2,
        ...(style["font-family"] ? { "typography.fontFamily": style["font-family"].split(",")[0].replace(/["']/g, "").trim() } : {}),
        ...(style["font-weight"] ? { "typography.fontWeight": style["font-weight"] === "bold" ? "700" : style["font-weight"] === "normal" ? "400" : style["font-weight"] } : {}),
        ...(style["font-style"] === "italic" ? { "typography.fontStyle": "italic" } : {}),
        ...(anchor === "middle" ? { "typography.textAlign": "center" } : anchor === "end" ? { "typography.textAlign": "right" } : {}),
        "text.sizing": "autoWidth",
      },
    });
    return;
  }

  if (n.tag === "image") {
    const href = n.attrs.href ?? n.attrs["xlink:href"] ?? "";
    if (!/^data:image\//i.test(href)) return;
    const a = apply(here, { x: num(n.attrs.x), y: num(n.attrs.y) });
    const b = apply(here, { x: num(n.attrs.x) + num(n.attrs.width), y: num(n.attrs.y) + num(n.attrs.height) });
    out.push({ archetype: "image", name: name || "Image", box: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }, children: [], properties: { ...common, "media.src": href, "media.fit": "fill" } });
    return;
  }

  const shape = subPathsOf(n);
  if (!shape) {
    for (const c of n.children) walk(c, style, here, ctx, depth + 1, out);
    return;
  }
  const count = shape.subs.reduce((s, x) => s + x.nodes.length, 0);
  if ((ctx.nodes += count) > MAX_SVG_NODES) {
    ctx.defs.notes.add("The file has more path nodes than the import reads: the rest is left out.");
    return;
  }
  const bb = boundsOf(shape.subs) ?? { x: 0, y: 0, w: 1, h: 1 };
  const fill = paintOf(style.fill ?? "#000000", opacityOf(style["fill-opacity"]), bb, ctx.defs, ctx.rules);
  const stroke = paintOf(style.stroke, opacityOf(style["stroke-opacity"]), bb, ctx.defs, ctx.rules);
  const strokeWidth = stroke ? r2(len(style["stroke-width"], 1) * k) : 0;
  const strokeProps: Record<string, PropValue> = {};
  if (stroke) {
    strokeProps["svg.strokeWidth"] = strokeWidth;
    if (stroke.type === "solid") strokeProps["svg.stroke"] = stroke.color;
    else strokeProps["paint.strokes"] = JSON.stringify([stroke]);
    if (style["stroke-linecap"]) strokeProps["svg.strokeLinecap"] = style["stroke-linecap"];
    if (style["stroke-linejoin"]) strokeProps["svg.strokeLinejoin"] = style["stroke-linejoin"];
    if (style["stroke-dasharray"] && style["stroke-dasharray"] !== "none") strokeProps["svg.strokeDasharray"] = style["stroke-dasharray"].split(/[\s,]+/).map((v) => String(r2(num(v) * k))).join(" ");
  } else strokeProps["svg.stroke"] = "none";
  const fillProps: Record<string, PropValue> = !fill ? { "svg.fill": "none" } : fill.type === "solid" ? { "svg.fill": fill.color } : { "paint.fills": JSON.stringify([fill]) };
  const label = name || (shape.kind === "rect" ? "Rectangle" : shape.kind === "ellipse" ? "Ellipse" : n.tag === "path" ? "Path" : n.tag[0].toUpperCase() + n.tag.slice(1));

  if ((shape.kind === "rect" || shape.kind === "ellipse") && shape.rect && axisAligned(here)) {
    const a = apply(here, { x: shape.rect.x, y: shape.rect.y });
    const w = shape.rect.w * here[0];
    const h = shape.rect.h * here[3];
    out.push({
      archetype: shape.kind === "rect" ? "rectangle" : "ellipse",
      name: label,
      box: { x: a.x, y: a.y, w, h },
      children: [],
      properties: { ...common, ...fillProps, ...strokeProps, ...(shape.kind === "rect" && shape.rect.rx > 0 ? { "shape.cornerRadius": r2(shape.rect.rx * Math.min(here[0], here[3])) } : {}), ...(stroke ? { "stroke.align": "center" } : {}) },
    });
    return;
  }
  const placed = pathLayer(shape.subs.map((s) => mapSub(s, here)), strokeWidth);
  if (!placed) return;
  out.push({
    archetype: "svgPath",
    name: label,
    box: placed.box,
    children: [],
    properties: { ...common, ...placed.properties, ...fillProps, ...strokeProps, ...(style["fill-rule"] === "evenodd" ? { "svg.fillRule": "evenodd" } : {}) },
  });
}

/** A layer name from an `id`: Illustrator's escapes (`_x20_` is a space) decoded, underscores kept. */
export const decodeId = (id: string): string => id.replace(/_x([0-9A-Fa-f]{2,4})_/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16))).slice(0, 120);

/** Merges a wrapper's opacity, shadow and blur into its only layer (opacities multiply). */
function mergeInto(kid: PlanLayer, common: Record<string, PropValue>): PlanLayer {
  const props = { ...common, ...kid.properties };
  const a = typeof common["appearance.opacity"] === "number" ? common["appearance.opacity"] : 1;
  const b = typeof kid.properties["appearance.opacity"] === "number" ? kid.properties["appearance.opacity"] : 1;
  if (a * b < 0.999) props["appearance.opacity"] = r2(a * b);
  return { ...kid, properties: props };
}

const textOf = (n: XNode): string => n.text + n.children.map((c) => (c.tag === "tspan" || c.tag === "textPath" ? textOf(c) : "")).join("");

/** A group around layers: its box is theirs. */
function group(kids: PlanLayer[], name: string, common: Record<string, PropValue>): PlanLayer {
  const x0 = Math.min(...kids.map((k) => k.box.x));
  const y0 = Math.min(...kids.map((k) => k.box.y));
  const x1 = Math.max(...kids.map((k) => k.box.x + k.box.w));
  const y1 = Math.max(...kids.map((k) => k.box.y + k.box.h));
  return { archetype: "container", name, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, children: kids, properties: { ...common, "frame.kind": "group", "appearance.background.color": "transparent", "layout.padding": 0, "layout.gap": 0 } };
}

/** The file as a plan of layers, in the frame's px (the viewBox mapped to its width and height), with notes; null when it can't be read. */
export function planSvgImport(original: string): SvgPlan | null {
  const clean = trySanitizeSvg(original);
  if (!clean) return null;
  const svg = parseXml(clean);
  if (!svg) return null;
  const byId = new Map<string, XNode>();
  const index = (n: XNode, d: number) => {
    if (d > MAX_SVG_DEPTH || byId.size > MAX_SVG_ELEMENTS) return;
    if (n.attrs.id && !byId.has(n.attrs.id)) byId.set(n.attrs.id, n);
    for (const c of n.children) index(c, d + 1);
  };
  index(svg, 0);
  const vb = (svg.attrs.viewBox ?? "").split(/[\s,]+/).map(Number);
  const hasVb = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
  const width = len(svg.attrs.width, hasVb ? vb[2] : 100, hasVb ? vb[2] : 100) || 100;
  const height = len(svg.attrs.height, hasVb ? vb[3] : 100, hasVb ? vb[3] : 100) || 100;
  // the viewBox scaled into the picture's size (uniformly, centred, as preserveAspectRatio's default does)
  let m: M = I;
  if (hasVb) {
    const s = Math.min(width / vb[2], height / vb[3]);
    m = [s, 0, 0, s, (width - vb[2] * s) / 2 - vb[0] * s, (height - vb[3] * s) / 2 - vb[1] * s];
  }
  const ctx: Ctx = { defs: { byId, notes: new Set() }, rules: cssRules(original), elements: 0, nodes: 0 };
  const layers: PlanLayer[] = [];
  for (const c of svg.children) walk(c, inherit({}, ownStyle(svg, ctx.rules)), m, ctx, 1, layers);
  return { width: r2(width), height: r2(height), layers, notes: [...ctx.defs.notes] };
}

export { PATH_SPACE };
export type { PathNode };
