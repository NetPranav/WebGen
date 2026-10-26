/**
 * Writing and reading paints and effects on layers (ROADMAP Phase 35). Each writer is one undo step, skips locked
 * layers and layers that can't carry the property. The commands in `editCommands.ts` wrap them (Law 20).
 */

import { isPropertyLegalFor } from "../document/properties";
import { setLayerProps } from "../editing/editOps";
import { resolveProps } from "../render/resolve";
import { getDocument } from "../store/documentState";
import { simplePaths } from "../inspector/simpleControls";
import { safeImageSrc } from "../render/limits";
import { DASH_PRESETS, effectiveFills, parseShadows, safeDashArray, serializeFills, serializeShadows, type Paint, type Shadow } from "./paints";

const layers = () => getDocument().layers;

/** Where a layer keeps its plain fill colour, for the layers that have fills at all. */
const PLAIN_FILL: Record<string, { path: string; fallback: string }> = {
  container: { path: "appearance.background.color", fallback: "transparent" },
  form: { path: "appearance.background.color", fallback: "transparent" },
  generic: { path: "appearance.background.color", fallback: "transparent" },
  button: { path: "appearance.background.color", fallback: "#206859" },
  badge: { path: "appearance.background.color", fallback: "#e6f4f1" },
  fab: { path: "appearance.background.color", fallback: "#206859" },
  rectangle: { path: "svg.fill", fallback: "#cbd5e1" },
  ellipse: { path: "svg.fill", fallback: "#cbd5e1" },
  polygon: { path: "svg.fill", fallback: "#cbd5e1" },
  star: { path: "svg.fill", fallback: "#cbd5e1" },
  arrow: { path: "svg.fill", fallback: "#cbd5e1" },
};

/** Whether a layer can have a list of fills. */
export const hasFills = (archetype: string): boolean => archetype in PLAIN_FILL && isPropertyLegalFor("paint.fills", archetype as never);

/** The fills a layer draws, whether it keeps them in `paint.fills` or only has a plain colour. */
export function fillsOf(id: string): Paint[] {
  const layer = layers()[id];
  if (!layer || !hasFills(layer.archetype)) return [];
  const resolved = resolveProps(layer);
  const plain = PLAIN_FILL[layer.archetype];
  return effectiveFills(resolved.get("paint.fills"), String(resolved.get(plain.path) ?? plain.fallback));
}

/** Replaces the fills of these layers. An empty list means no fill (stored as `[]`, so the plain colour doesn't come back). Returns how many layers changed. */
export function setFills(ids: readonly string[], fills: readonly Paint[]): number {
  const json = serializeFills(fills);
  return setLayerProps(ids.filter((id) => layers()[id] && hasFills(layers()[id].archetype)), { "paint.fills": json }, "Fill");
}

export function shadowsOf(id: string): Shadow[] {
  const layer = layers()[id];
  return layer ? parseShadows(resolveProps(layer).get("paint.shadows")) : [];
}

export function setShadows(ids: readonly string[], shadows: readonly Shadow[]): number {
  return setLayerProps(ids, { "paint.shadows": serializeShadows(shadows) }, "Shadow");
}

export function setBlur(ids: readonly string[], blur: { layer?: number; background?: number }): number {
  const props: Record<string, number> = {};
  if (blur.layer !== undefined && Number.isFinite(blur.layer)) props["filter.blur"] = Math.min(200, Math.max(0, blur.layer));
  if (blur.background !== undefined && Number.isFinite(blur.background)) props["paint.backgroundBlur"] = Math.min(200, Math.max(0, blur.background));
  return Object.keys(props).length === 0 ? 0 : setLayerProps(ids, props, "Blur");
}


/**
 * What a layer's fill reads as in one word for the Simple face: its colour when it is one solid fill, "Gradient"
 * when any fill is a gradient, "Multiple fills" for several solids, "None" for no fill.
 */
export function fillSummary(id: string): string {
  const fills = fillsOf(id).filter((p) => p.visible);
  if (fills.length === 0) return "None";
  if (fills.length === 1 && fills[0].type === "solid") return fills[0].color;
  if (fills.some((p) => p.type === "linear" || p.type === "radial" || p.type === "conic" || p.type === "diamond")) return "Gradient";
  if (fills.some((p) => p.type === "image")) return "Picture";
  return "Multiple fills";
}

export type StrokeStyle = "solid" | "dashed" | "dotted";

/** What a layer's stroke pattern reads as: solid, dashed (a dash pattern, or a dashed border) or dotted. */
export function strokeStyleOf(id: string): StrokeStyle | null {
  const layer = layers()[id];
  if (!layer) return null;
  const paths = simplePaths(layer.archetype);
  if (!paths.strokeColor) return null;
  const resolved = resolveProps(layer);
  if (paths.strokeStyle) {
    const v = resolved.get(paths.strokeStyle);
    return v === "dashed" || v === "dotted" ? v : "solid";
  }
  const dash = safeDashArray(String(resolved.get("svg.strokeDasharray") ?? "none"));
  if (!dash) return "solid";
  const [on, off] = dash.split(" ").map(Number);
  return (off ?? on) > on * 1.5 && on <= Number(resolved.get("svg.strokeWidth") ?? 1) * 1.01 ? "dotted" : "dashed";
}

/**
 * Sets a stroke to solid, dashed or dotted. A shape gets a dash pattern scaled to its stroke width (dots with round
 * caps); a frame gets a border style. Layers without a stroke are skipped.
 */
export function setStrokeStyle(ids: readonly string[], style: StrokeStyle): number {
  const l = layers();
  let changed = 0;
  const preset = DASH_PRESETS.find((p) => p.id === style)!;
  for (const id of ids) {
    const layer = l[id];
    if (!layer) continue;
    const paths = simplePaths(layer.archetype);
    if (!paths.strokeColor) continue;
    const width = Number(resolveProps(layer).get("svg.strokeWidth") ?? 1) || 1;
    const props: Record<string, string | number> = paths.strokeStyle
      ? { [paths.strokeStyle]: style === "solid" ? "solid" : style }
      : { "svg.strokeDasharray": preset.array(width), "svg.strokeLinecap": style === "dotted" ? "round" : "butt" };
    changed += setLayerProps([id], props, "Stroke style");
  }
  return changed;
}

/**
 * Swaps the picture on layers (Phase 37, "replace image"): an image layer's source, or the image fills of any other
 * layer (all of them, or just fill `index`). Everything else about them (fit, crop, colours) stays. A source that
 * isn't a safe picture changes nothing. Returns how many layers changed.
 */
export function replaceImage(ids: readonly string[], src: string, natural?: { w: number; h: number }, index?: number): number {
  const safe = safeImageSrc(src);
  if (!safe) return 0;
  let changed = 0;
  for (const id of ids) {
    const layer = layers()[id];
    if (!layer) continue;
    if (layer.archetype === "image") {
      changed += setLayerProps([id], { "media.src": safe }, "Replace image");
      continue;
    }
    if (!hasFills(layer.archetype)) continue;
    const fills = fillsOf(id);
    if (!fills.some((p, i) => p.type === "image" && (index === undefined || i === index))) continue;
    changed += setFills([id], fills.map((p, i) => (p.type === "image" && (index === undefined || i === index) ? { ...p, src: safe, natural } : p)));
  }
  return changed;
}
