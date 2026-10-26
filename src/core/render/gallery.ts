/**
 * The render gallery's cases (Phase 17): every archetype with its default props and the edge cases that
 * used to break the old stage (empty and hostile text, huge and tiny shapes, blocked sources, rotation,
 * fill sizing). Pure data, so the unit tests, the dev route and the browser test share one list.
 */
import type { Layer } from "../document/schema";
import { createLayer } from "../document/factories";
import { ARCHETYPE_IDS, getDefaultProps, type ArchetypeId, type PropValue } from "../document/registry";
import { serializeFills, serializeShadows, type ImagePaint, type Paint } from "../paint/paints";

export interface GalleryCase {
  id: string;
  archetype: ArchetypeId;
  label: string;
  /** Overrides on top of the archetype's defaults. */
  properties?: Record<string, PropValue>;
  /** Child cases, drawn inside this layer. */
  children?: GalleryCase[];
  /** The size this layer must draw at, in px, when its geometry fixes it (checked in 3 browsers). */
  expectSize?: { width: number; height: number };
}

/** A deterministic inline image, so no case depends on the network. */
const IMG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><defs><linearGradient id="g"><stop offset="0" stop-color="#206859"/><stop offset="1" stop-color="#e6f4f1"/></linearGradient></defs><rect width="240" height="120" fill="url(#g)"/></svg>',
)}`;

const text = (id: string, label: string, properties: Record<string, PropValue> = {}): GalleryCase => ({ id, archetype: "text", label, properties: { "typography.fontSize": 14, ...properties } });

export const GALLERY_CASES: GalleryCase[] = [
  // ---- interactive ----
  { id: "button", archetype: "button", label: "Button" },
  { id: "button-disabled", archetype: "button", label: "Button, disabled", properties: { "interaction.disabled": true } },
  { id: "button-long", archetype: "button", label: "Button, long label", properties: { "content.label": "A very long label that keeps going and going well past any sensible width" } },
  { id: "toggle-off", archetype: "toggle", label: "Toggle, off", expectSize: { width: 44, height: 24 } },
  { id: "toggle-on", archetype: "toggle", label: "Toggle, on, large", properties: { "toggle.checked": true, "toggle.size": "lg" }, expectSize: { width: 56, height: 30 } },
  { id: "badge", archetype: "badge", label: "Badge" },
  { id: "badge-outline", archetype: "badge", label: "Badge, outline", properties: { "appearance.variant": "outline" } },
  { id: "fab", archetype: "fab", label: "Floating action button", expectSize: { width: 56, height: 56 } },
  { id: "fab-small", archetype: "fab", label: "FAB, small, close icon", properties: { "button.size": 28, "content.icon": "x" }, expectSize: { width: 28, height: 28 } },
  { id: "input", archetype: "input", label: "Input" },
  { id: "input-value", archetype: "input", label: "Input, with value, disabled", properties: { "input.value": "hello@example.com", "interaction.disabled": true } },
  // ---- media ----
  { id: "image", archetype: "image", label: "Image", properties: { "media.src": IMG, "frame.width": 240, "frame.height": 120 }, expectSize: { width: 240, height: 120 } },
  { id: "image-contain", archetype: "image", label: "Image, contain, filtered", properties: { "media.src": IMG, "frame.width": 160, "frame.height": 160, "media.objectFit": "contain", "media.filter.grayscale": 1 }, expectSize: { width: 160, height: 160 } },
  { id: "image-blocked", archetype: "image", label: "Image, javascript: source is not loaded", properties: { "media.src": "javascript:alert(1)", "media.alt": "Blocked source", "frame.width": 200, "frame.height": 60 }, expectSize: { width: 200, height: 60 } },
  { id: "icon", archetype: "icon", label: "Icon", expectSize: { width: 24, height: 24 } },
  { id: "icon-large", archetype: "icon", label: "Icon, large, thin", properties: { "svg.size": 96, "svg.strokeWidth": 1 }, expectSize: { width: 96, height: 96 } },
  { id: "icon-bad-path", archetype: "icon", label: "Icon, path with script is dropped", properties: { "svg.path": "M0 0 <script>alert(1)</script>" }, expectSize: { width: 24, height: 24 } },
  // ---- structural ----
  { id: "divider", archetype: "divider", label: "Divider", properties: { "divider.length": 200 }, expectSize: { width: 200, height: 1 } },
  { id: "divider-vertical", archetype: "divider", label: "Divider, vertical, dashed", properties: { "divider.orientation": "vertical", "divider.length": 60, "divider.thickness": 2, "divider.style": "dashed" }, expectSize: { width: 2, height: 60 } },
  { id: "background", archetype: "background", label: "Background, gradient", properties: { "frame.width": 240, "frame.height": 80 }, expectSize: { width: 240, height: 80 } },
  { id: "background-flat", archetype: "background", label: "Background, flat colour", properties: { "background.type": "color", "background.color": "#206859", "frame.width": 240, "frame.height": 40 }, expectSize: { width: 240, height: 40 } },
  {
    id: "container",
    archetype: "container",
    label: "Container with three children",
    properties: { "frame.width": 300, "appearance.background.color": "#f1f5f9" },
    children: [text("container-a", "A", { "content.text": "First" }), text("container-b", "B", { "content.text": "Second" }), { id: "container-c", archetype: "button", label: "C" }],
    expectSize: { width: 300, height: 0 },
  },
  {
    id: "container-row",
    archetype: "container",
    label: "Row container, one child fills",
    properties: { "layout.flexDirection": "row", "frame.width": 320, "frame.height": 60, "appearance.background.color": "#f1f5f9", "layout.padding": 8 },
    children: [
      { id: "container-row-fixed", archetype: "badge", label: "Fixed", properties: { "content.label": "fixed" } },
      { id: "container-row-fill", archetype: "text", label: "Fill", properties: { "content.text": "fills the rest of the row", "sizing.horizontal": "fill", "typography.fontSize": 13 } },
    ],
    expectSize: { width: 320, height: 60 },
  },
  {
    id: "container-absolute",
    archetype: "container",
    label: "Absolute, rotated child",
    properties: { "frame.width": 300, "frame.height": 120, "appearance.background.color": "#f1f5f9", "layout.padding": 0 },
    children: [{ id: "container-absolute-child", archetype: "rectangle", label: "Child", properties: { positioning: "absolute", "frame.x": 40, "frame.y": 30, "frame.width": 80, "frame.height": 40, "frame.rotation": 15, "svg.fill": "#206859" } }],
    expectSize: { width: 300, height: 120 },
  },
  { id: "generic", archetype: "generic", label: "Generic with a child", children: [text("generic-child", "child", { "content.text": "Inside a generic box" })] },
  {
    id: "form",
    archetype: "form",
    label: "Form",
    properties: { "frame.width": 280, "appearance.background.color": "#ffffff" },
    children: [{ id: "form-input", archetype: "input", label: "Field" }, { id: "form-button", archetype: "button", label: "Submit", properties: { "content.label": "Submit" } }],
    expectSize: { width: 280, height: 0 },
  },
  // ---- text ----
  text("text", "Text", { "content.text": "Dynamic Typography", "typography.fontSize": 24, "typography.fontWeight": "600" }),
  text("text-empty", "Text, empty falls back to the layer name", { "content.text": "" }),
  { ...text("text-long", "Text, long and wrapping", { "content.text": "The quick brown fox jumps over the lazy dog. ".repeat(6), "frame.width": 260 }), expectSize: { width: 260, height: 0 } },
  text("text-hostile", "Text, HTML is shown, not run", { "content.text": '<img src=x onerror="document.title=\'pwned\'"> <b>bold?</b>' }),
  text("text-centered", "Text, centred, wide word", { "content.text": "Supercalifragilisticexpialidocious_and_more_and_more_and_more", "typography.textAlign": "center", "frame.width": 200 }),
  // ---- vector ----
  { id: "svg-path", archetype: "svgPath", label: "SVG path", properties: { "svg.path": "M10 100 C 40 10, 90 10, 120 100 S 180 190, 190 100", "frame.width": 160, "frame.height": 80 }, expectSize: { width: 160, height: 80 } },
  {
    id: "svg-group",
    archetype: "svgGroup",
    label: "SVG group (path + text)",
    properties: { "frame.width": 160, "frame.height": 80 },
    children: [
      { id: "svg-group-path", archetype: "svgPath", label: "p", properties: { "svg.path": "M0 50 L160 50" } },
      { id: "svg-group-text", archetype: "svgText", label: "t", properties: { "content.text": "In a group", "typography.fontSize": 14 } },
    ],
    expectSize: { width: 160, height: 80 },
  },
  { id: "svg-use-external", archetype: "svgUse", label: "SVG use, external reference draws nothing", properties: { "svg.href": "https://example.com/x.svg#a", "frame.width": 60, "frame.height": 30 } },
  { id: "svg-text", archetype: "svgText", label: "SVG text", properties: { "content.text": "SVG text", "frame.width": 120, "frame.height": 40 }, expectSize: { width: 120, height: 40 } },
  // ---- parametric shapes, all SVG ----
  { id: "rectangle", archetype: "rectangle", label: "Rectangle", expectSize: { width: 160, height: 120 } },
  { id: "rectangle-rounded", archetype: "rectangle", label: "Rectangle, rounded, stroked", properties: { "shape.cornerRadius": 24, "svg.stroke": "#0f172a", "svg.strokeWidth": 6, "frame.width": 180, "frame.height": 80 }, expectSize: { width: 180, height: 80 } },
  { id: "rectangle-tiny", archetype: "rectangle", label: "Rectangle, 1 × 1", properties: { "frame.width": 1, "frame.height": 1 }, expectSize: { width: 1, height: 1 } },
  { id: "ellipse", archetype: "ellipse", label: "Ellipse", expectSize: { width: 120, height: 120 } },
  { id: "ellipse-stroked", archetype: "ellipse", label: "Ellipse, wide, stroked", properties: { "frame.width": 200, "frame.height": 70, "svg.stroke": "#206859", "svg.strokeWidth": 4, "svg.fill": "none" }, expectSize: { width: 200, height: 70 } },
  { id: "line", archetype: "line", label: "Line", expectSize: { width: 160, height: 2 } },
  { id: "line-thick", archetype: "line", label: "Line, thick, butt caps", properties: { "svg.strokeWidth": 12, "svg.strokeLinecap": "butt", "frame.width": 200 }, expectSize: { width: 200, height: 12 } },
  { id: "polygon", archetype: "polygon", label: "Polygon, hexagon", expectSize: { width: 120, height: 120 } },
  { id: "polygon-triangle", archetype: "polygon", label: "Polygon, triangle", properties: { "shape.sides": 3 }, expectSize: { width: 120, height: 120 } },
  { id: "polygon-many", archetype: "polygon", label: "Polygon, 64 sides (clamped from 500)", properties: { "shape.sides": 500 }, expectSize: { width: 120, height: 120 } },
  { id: "star", archetype: "star", label: "Star", expectSize: { width: 120, height: 120 } },
  { id: "star-sharp", archetype: "star", label: "Star, 8 points, sharp", properties: { "shape.points": 8, "shape.innerRadius": 0.2 }, expectSize: { width: 120, height: 120 } },
  // ---- FigCraft port F1: per-corner radii, corner smoothing, rounded vertices, arcs, pies and rings ----
  { id: "rectangle-corners", archetype: "rectangle", label: "Rectangle, a radius per corner", properties: { "shape.cornerRadius.topLeft": 40, "shape.cornerRadius.topRight": 0, "shape.cornerRadius.bottomRight": 24, "shape.cornerRadius.bottomLeft": 8, "frame.width": 180, "frame.height": 100 }, expectSize: { width: 180, height: 100 } },
  { id: "rectangle-smooth", archetype: "rectangle", label: "Rectangle, corner smoothing 60%, stroked", properties: { "shape.cornerRadius": 32, "shape.cornerSmoothing": 0.6, "svg.stroke": "#0f172a", "svg.strokeWidth": 4, "frame.width": 140, "frame.height": 140 }, expectSize: { width: 140, height: 140 } },
  { id: "polygon-rounded", archetype: "polygon", label: "Polygon, rounded and smoothed vertices", properties: { "shape.sides": 5, "shape.vertexRadius": 14, "shape.cornerSmoothing": 0.6 }, expectSize: { width: 120, height: 120 } },
  { id: "star-rounded", archetype: "star", label: "Star, rounded points", properties: { "shape.vertexRadius": 6, "shape.innerRadius": 0.45 }, expectSize: { width: 120, height: 120 } },
  { id: "ellipse-pie", archetype: "ellipse", label: "Ellipse, a three-quarter pie", properties: { "shape.arcStart": -90, "shape.arcSweep": 270 }, expectSize: { width: 120, height: 120 } },
  { id: "ellipse-ring", archetype: "ellipse", label: "Ellipse, a ring", properties: { "shape.arcInnerRatio": 0.6, "frame.width": 160, "frame.height": 120 }, expectSize: { width: 160, height: 120 } },
  { id: "ellipse-arc-ring", archetype: "ellipse", label: "Ellipse, a half ring, stroked", properties: { "shape.arcStart": 180, "shape.arcSweep": 180, "shape.arcInnerRatio": 0.5, "svg.stroke": "#206859", "svg.strokeWidth": 3 }, expectSize: { width: 120, height: 120 } },
  // ---- FigCraft port F2: the diamond gradient and blend modes per fill ----
  { id: "rectangle-diamond", archetype: "rectangle", label: "Rectangle, diamond gradient", properties: { "paint.fills": JSON.stringify([{ type: "diamond", stops: [{ at: 0, color: "#facc15" }, { at: 1, color: "#7c3aed" }], center: { x: 0.5, y: 0.5 }, radius: { x: 0.5, y: 0.5 } }]), "frame.width": 160, "frame.height": 100 }, expectSize: { width: 160, height: 100 } },
  { id: "container-diamond", archetype: "container", label: "Frame, off-centre diamond gradient", properties: { "paint.fills": JSON.stringify([{ type: "diamond", stops: [{ at: 0, color: "#ffffff" }, { at: 1, color: "#0f766e" }], center: { x: 0.3, y: 0.4 }, radius: { x: 0.4, y: 0.6 } }]), "frame.width": 160, "frame.height": 100, "sizing.horizontal": "fixed", "sizing.vertical": "fixed" }, expectSize: { width: 160, height: 100 } },
  { id: "rectangle-blend", archetype: "rectangle", label: "Rectangle, a multiply fill over a gradient", properties: { "paint.fills": JSON.stringify([{ type: "solid", color: "#38bdf8", blend: "multiply" }, { type: "linear", stops: [{ at: 0, color: "#f43f5e" }, { at: 1, color: "#fde047" }], from: { x: 0, y: 0.5 }, to: { x: 1, y: 0.5 } }]), "frame.width": 160, "frame.height": 80 }, expectSize: { width: 160, height: 80 } },
  // ---- FigCraft port F3: stroke alignment, several strokes, per-side weights, widths and arrowheads ----
  { id: "rectangle-stroke-inside", archetype: "rectangle", label: "Rectangle, 8 px inside stroke", properties: { "svg.stroke": "#0f172a", "svg.strokeWidth": 8, "stroke.align": "inside", "shape.cornerRadius": 16, "frame.width": 140, "frame.height": 90 }, expectSize: { width: 140, height: 90 } },
  { id: "ellipse-stroke-outside", archetype: "ellipse", label: "Ellipse, 6 px outside stroke", properties: { "svg.stroke": "#be185d", "svg.strokeWidth": 6, "stroke.align": "outside", "svg.fill": "#fbcfe8" }, expectSize: { width: 120, height: 120 } },
  { id: "star-two-strokes", archetype: "star", label: "Star, a gradient stroke over a wide solid one", properties: { "svg.strokeWidth": 4, "stroke.align": "center", "paint.strokes": JSON.stringify([{ type: "linear", stops: [{ at: 0, color: "#f59e0b" }, { at: 1, color: "#dc2626" }], from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }]) }, expectSize: { width: 120, height: 120 } },
  { id: "rectangle-stroke-sides", archetype: "rectangle", label: "Rectangle, a bottom border only", properties: { "svg.stroke": "#2563eb", "svg.strokeWidth": 1, "stroke.sides": "0 0 6 0", "shape.cornerRadius": 12, "frame.width": 160, "frame.height": 60, "svg.fill": "#eff6ff" }, expectSize: { width: 160, height: 60 } },
  { id: "line-arrow", archetype: "line", label: "Line, triangle arrow at the end, round start", properties: { "shape.endCap": "triangleArrow", "shape.startCap": "circleFilled", "svg.strokeWidth": 3, "frame.width": 180, "frame.height": 24 }, expectSize: { width: 180, height: 24 } },
  { id: "line-tapered", archetype: "line", label: "Line, tapered both ends", properties: { "stroke.widthProfile": JSON.stringify([{ t: 0, scale: 0 }, { t: 0.2, scale: 1 }, { t: 0.8, scale: 1 }, { t: 1, scale: 0 }]), "svg.strokeWidth": 10, "frame.width": 180, "frame.height": 12 }, expectSize: { width: 180, height: 12 } },
  { id: "container-stroke-outside", archetype: "container", label: "Frame, 4 px outside stroke", properties: { "appearance.border.width": 4, "appearance.border.style": "solid", "appearance.border.color": "#0f766e", "stroke.align": "outside", "appearance.radius": 12, "frame.width": 140, "frame.height": 80, "sizing.horizontal": "fixed", "sizing.vertical": "fixed", "appearance.background.color": "#f0fdfa" }, expectSize: { width: 140, height: 80 } },
  // ---- FigCraft port F4: a vector network (a square with a diagonal, one triangle filled, one rounded point) ----
  {
    id: "svg-network",
    archetype: "svgPath",
    label: "Vector network, one of two faces filled, a rounded point",
    properties: {
      "frame.width": 120,
      "frame.height": 120,
      "svg.fill": "#a78bfa",
      "svg.stroke": "#4c1d95",
      "svg.strokeWidth": 2,
      "svg.network": '{"vertices":[{"x":20,"y":20},{"x":180,"y":20,"radius":30},{"x":180,"y":180},{"x":20,"y":180}],"segments":[{"a":0,"b":1},{"a":1,"b":2},{"a":2,"b":3},{"a":3,"b":0},{"a":0,"b":2}],"regions":[{"loops":[[0,1,4]]}]}',
    },
    expectSize: { width: 120, height: 120 },
  },
  // ---- FigCraft port F5: a live boolean group (a square minus a circle), its operands hidden but kept ----
  {
    id: "boolean-subtract",
    archetype: "container",
    label: "Live boolean group: a square minus a circle",
    properties: { "boolean.operation": "subtract", "frame.width": 120, "frame.height": 120, "sizing.horizontal": "fixed", "sizing.vertical": "fixed", "paint.fills": JSON.stringify([{ type: "solid", color: "#0ea5e9" }]) },
    children: [
      { id: "boolean-subtract-square", archetype: "rectangle", label: "square", properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 90, "frame.height": 90 } },
      { id: "boolean-subtract-circle", archetype: "ellipse", label: "circle", properties: { positioning: "absolute", "frame.x": 40, "frame.y": 40, "frame.width": 80, "frame.height": 80 } },
    ],
    expectSize: { width: 120, height: 120 },
  },
  { id: "arrow", archetype: "arrow", label: "Arrow", expectSize: { width: 160, height: 32 } },
  { id: "arrow-big-head", archetype: "arrow", label: "Arrow, head larger than the box", properties: { "shape.headLength": 400, "shape.headWidth": 400 }, expectSize: { width: 160, height: 32 } },
  // ---- paint and effects (Phase 35): the cases the screenshot gate compares across browsers ----
  ...paintCases(),
  // ---- no 2D drawing yet: a labelled placeholder ----
  { id: "effect-surface", archetype: "effectSurface", label: "Effect surface (placeholder)" },
  { id: "object-3d", archetype: "object3D", label: "3D object (placeholder)" },
  { id: "camera-3d", archetype: "camera3D", label: "3D camera (placeholder)" },
  { id: "light-3d", archetype: "light3D", label: "3D light (placeholder)" },
];

function build(c: GalleryCase, parentId: string | null, out: Record<string, Layer>): void {
  const layer = createLayer({
    id: `gallery_${c.id}`,
    name: c.label,
    archetype: c.archetype,
    parentId,
    children: (c.children ?? []).map((k) => `gallery_${k.id}`),
    properties: { ...getDefaultProps(c.archetype), ...(c.properties ?? {}) },
  });
  // Gallery roots flow inside their cell and hug their content unless the case gives a size; a
  // top-level layer would otherwise default to a full-width frame.
  if (parentId === null) {
    if (layer.properties.positioning === undefined) layer.properties.positioning = "flow";
    if (layer.properties["frame.width"] === undefined && layer.properties["sizing.horizontal"] === undefined) layer.properties["sizing.horizontal"] = "hug";
    if (layer.properties["frame.height"] === undefined && layer.properties["sizing.vertical"] === undefined) layer.properties["sizing.vertical"] = "hug";
  }
  out[layer.id] = layer;
  for (const k of c.children ?? []) build(k, layer.id, out);
}

/** Every case as real layers, ready for `RenderLayer`. */
export function buildGalleryLayers(cases: GalleryCase[] = GALLERY_CASES): Record<string, Layer> {
  const layers: Record<string, Layer> = {};
  for (const c of cases) build(c, null, layers);
  return layers;
}

/** Archetypes with no case in the gallery (the unit test requires none). */
export function archetypesMissingFromGallery(): ArchetypeId[] {
  const covered = new Set<ArchetypeId>();
  const walk = (c: GalleryCase) => {
    covered.add(c.archetype);
    c.children?.forEach(walk);
  };
  GALLERY_CASES.forEach(walk);
  return ARCHETYPE_IDS.filter((id) => !covered.has(id));
}


function paintCases(): GalleryCase[] {
const BOX = { "frame.width": 120, "frame.height": 80 } as const;
const stops2 = [{ at: 0, color: "#206859" }, { at: 1, color: "#f59e0b" }];
const wedge = (n: number) => Array.from({ length: n * 2 }, (_, i) => ({ at: i / (n * 2), color: i % 2 === 0 ? "#e2e8f0" : "#94a3b8" }));
  const fills = (paints: Paint[]) => serializeFills(paints);
  // an asymmetric picture (four colours, a diagonal, a dot in one corner), so fit, crop and tile each look different
  const PIC = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120"><rect width="120" height="60" fill="#ef4444"/><rect x="120" width="120" height="60" fill="#22c55e"/><rect y="60" width="120" height="60" fill="#3b82f6"/><rect x="120" y="60" width="120" height="60" fill="#f59e0b"/><path d="M0 0L240 120" stroke="#fff" stroke-width="6"/><circle cx="30" cy="30" r="14" fill="#0f172a"/></svg>')}`;
  const pic = (over: Partial<ImagePaint>): Paint => ({ type: "image", opacity: 1, visible: true, src: PIC, mode: "fill", crop: { x: 0, y: 0, w: 1, h: 1 }, scale: 1, brightness: 1, contrast: 1, saturation: 1, natural: { w: 240, h: 120 }, ...over });
  const lin: Paint = { type: "linear", opacity: 1, visible: true, stops: stops2, from: { x: 0, y: 0 }, to: { x: 1, y: 1 } };
  const rad: Paint = { type: "radial", opacity: 1, visible: true, stops: [{ at: 0, color: "#ffffff" }, { at: 1, color: "#206859" }], center: { x: 0.35, y: 0.4 }, radius: { x: 0.6, y: 0.7 } };
  const con: Paint = { type: "conic", opacity: 1, visible: true, stops: [{ at: 0, color: "#ef4444" }, { at: 0.33, color: "#22c55e" }, { at: 0.66, color: "#3b82f6" }, { at: 1, color: "#ef4444" }], center: { x: 0.5, y: 0.5 }, angle: 20 };
  const shape = (id: string, label: string, properties: Record<string, PropValue>, archetype: ArchetypeId = "rectangle"): GalleryCase => ({ id: `paint-${id}`, archetype, label: `Paint: ${label}`, properties: { ...BOX, ...properties }, expectSize: { width: Number(properties["frame.width"] ?? 120), height: Number(properties["frame.height"] ?? 80) } });
  return [
    shape("solid", "solid with opacity", { "paint.fills": fills([{ type: "solid", color: "#206859", opacity: 0.8, visible: true }]) }),
    shape("linear", "linear, corner to corner", { "paint.fills": fills([lin]) }),
    shape("radial", "radial, off centre", { "paint.fills": fills([rad]) }),
    shape("conic", "conic, three colours", { "paint.fills": fills([con]) }),
    shape("multi", "three fills stacked", { "paint.fills": fills([{ type: "solid", color: "#000000", opacity: 0.25, visible: true }, { ...rad, opacity: 0.7 }, con]) }),
    shape("ellipse", "linear on an ellipse", { "paint.fills": fills([lin]) }, "ellipse"),
    shape("star", "conic on a star", { "paint.fills": fills([con]) }, "star"),
    shape("linear-box", "linear on a frame", { "paint.fills": fills([lin]), "appearance.radius": 12 }, "container"),
    shape("conic-box", "conic on a frame", { "paint.fills": fills([con]), "appearance.radius": 12 }, "container"),
    shape("dashed", "dashed stroke, rounded corners", { "svg.fill": "none", "svg.stroke": "#0f172a", "svg.strokeWidth": 4, "svg.strokeDasharray": "10 6", "shape.cornerRadius": 14 }),
    shape("dotted", "dotted round-cap stroke on an ellipse", { "svg.fill": "#f1f5f9", "svg.stroke": "#206859", "svg.strokeWidth": 5, "svg.strokeDasharray": "1 10", "svg.strokeLinecap": "round" }, "ellipse"),
    shape("shadow-drop", "drop shadow on a shape", { "svg.fill": "#ffffff", "shape.cornerRadius": 10, "paint.shadows": serializeShadows([{ kind: "drop", x: 6, y: 8, blur: 10, spread: 0, color: "#000000", visible: true }]) }),
    shape("shadow-inner", "inner shadow on a shape", { "svg.fill": "#f8fafc", "shape.cornerRadius": 10, "paint.shadows": serializeShadows([{ kind: "inner", x: 4, y: 6, blur: 8, spread: 0, color: "#000000", visible: true }]) }),
    shape("shadow-box", "drop and inner shadows on a frame", { "appearance.background.color": "#ffffff", "appearance.radius": 10, "paint.shadows": serializeShadows([{ kind: "drop", x: 6, y: 8, blur: 10, spread: 0, color: "#000000", visible: true }, { kind: "inner", x: 4, y: 6, blur: 8, spread: 0, color: "#206859", visible: true }]) }, "container"),
    shape("image-fill", "picture fill on a rectangle", { "paint.fills": fills([pic({})]) }),
    shape("image-fit", "picture fit in an ellipse", { "paint.fills": fills([pic({ mode: "fit" }), { type: "solid", color: "#e2e8f0", opacity: 1, visible: true }]) }, "ellipse"),
    shape("image-crop", "picture crop (the right-hand middle)", { "paint.fills": fills([pic({ mode: "crop", crop: { x: 0.5, y: 0.25, w: 0.5, h: 0.5 } })]) }),
    shape("image-tile", "picture tiled at a fifth", { "paint.fills": fills([pic({ mode: "tile", scale: 0.2 })]) }),
    shape("image-star", "picture fill on a star", { "paint.fills": fills([pic({})]) }, "star"),
    shape("image-frame", "picture fill on a frame", { "paint.fills": fills([pic({})]), "appearance.radius": 12 }, "container"),
    shape("image-frame-filtered", "picture on a frame, desaturated and brighter", { "paint.fills": fills([pic({ saturation: 0, brightness: 1.3 })]), "appearance.radius": 12 }, "container"),
    shape("image-shape-filtered", "picture on a shape, high contrast", { "paint.fills": fills([pic({ contrast: 1.8 })]) }),
    shape("blur-layer", "layer blur", { "paint.fills": fills([con]), "filter.blur": 4 }),
    {
      id: "paint-blur-background",
      archetype: "container",
      label: "Paint: background blur over stripes",
      properties: { "frame.width": 160, "frame.height": 100, "layout.padding": 0, "paint.fills": fills([{ type: "conic", opacity: 1, visible: true, stops: wedge(8), center: { x: 0.5, y: 0.5 }, angle: 0 }]) },
      children: [
        { id: "paint-blur-background-glass", archetype: "container", label: "Glass", properties: { positioning: "absolute", "frame.x": 30, "frame.y": 20, "frame.width": 100, "frame.height": 60, "appearance.radius": 8, "paint.fills": fills([{ type: "solid", color: "#ffffff", opacity: 0.25, visible: true }]), "paint.backgroundBlur": 8 } },
      ],
      expectSize: { width: 160, height: 100 },
    },
  ];
}
