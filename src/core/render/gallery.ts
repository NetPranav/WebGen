/**
 * The render gallery's cases (Phase 17): every archetype with its default props and the edge cases that
 * used to break the old stage (empty and hostile text, huge and tiny shapes, blocked sources, rotation,
 * fill sizing). Pure data, so the unit tests, the dev route and the browser test share one list.
 */
import type { Layer } from "../document/schema";
import { createLayer } from "../document/factories";
import { ARCHETYPE_IDS, getDefaultProps, type ArchetypeId, type PropValue } from "../document/registry";

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
  { id: "arrow", archetype: "arrow", label: "Arrow", expectSize: { width: 160, height: 32 } },
  { id: "arrow-big-head", archetype: "arrow", label: "Arrow, head larger than the box", properties: { "shape.headLength": 400, "shape.headWidth": 400 }, expectSize: { width: 160, height: 32 } },
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
