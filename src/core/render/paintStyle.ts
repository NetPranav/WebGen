import type { CSSProperties } from "react";
import type { Layer } from "../document/schema";
import { getLayerGeometry } from "../document/properties";
import { effectiveFills, fillsBackground, parseFills } from "../paint/paints";
import type { ResolvedProps } from "./types";

/**
 * The background of an HTML layer (Phase 35). With no `paint.fills` it is the layer's plain colour, exactly as
 * before. With them, the fills stack as background images (first on top) and the plain colour steps aside.
 */
export function fillStyle(layer: Layer, resolved: ResolvedProps, plainColor: string): CSSProperties {
  if (parseFills(resolved.get("paint.fills")) === null) return { backgroundColor: plainColor };
  const g = getLayerGeometry(layer);
  const image = fillsBackground(effectiveFills(resolved.get("paint.fills"), undefined), g.frame.width, g.frame.height);
  return { backgroundColor: "transparent", ...(image ? { backgroundImage: image } : {}) };
}
