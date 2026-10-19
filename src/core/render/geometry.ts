import type { CSSProperties } from "react";
import type { Layer } from "../document/schema";
import { getLayerGeometry } from "../document/properties";
import type { RenderContext, ResolvedProps } from "./types";

/** Largest frame dimension the renderer will draw; a larger stored value is clamped. */
export const MAX_FRAME_PX = 20_000;

/**
 * The box a layer occupies, from its geometry (Law 10): `frame`, `sizing` and `positioning`.
 * Absolute layers sit at `frame.x/y` inside their positioned parent; flow layers are placed by the
 * parent's layout and take their size from `sizing` (fixed: the frame size, hug: their content,
 * fill: grow along the parent's main axis or stretch across it). Rotation applies to both.
 */
export function layerBoxStyle(layer: Layer, resolved: ResolvedProps, ctx: RenderContext): CSSProperties {
  const g = getLayerGeometry(layer);
  const style: CSSProperties = { boxSizing: "border-box" };
  const px = (n: number, unit: string) => `${Math.min(MAX_FRAME_PX, Math.max(0, n))}${unit}`;

  if (g.positioning === "absolute") {
    style.position = "absolute";
    style.left = g.frame.x;
    style.top = g.frame.y;
  } else {
    // A positioned box, so absolute children inside it anchor to it.
    style.position = "relative";
  }

  const parentRow = ctx.parentDirection === "row";
  const axis = (kind: "horizontal" | "vertical") => {
    const sizing = g.sizing[kind];
    const isWidth = kind === "horizontal";
    const size = isWidth ? g.frame.width : g.frame.height;
    const unit = isWidth ? g.units.width : g.units.height;
    if (sizing === "fixed") {
      style[isWidth ? "width" : "height"] = px(size, unit);
    } else if (sizing === "fill") {
      if (g.positioning === "absolute") {
        style[isWidth ? "width" : "height"] = "100%";
      } else if ((isWidth && parentRow) || (!isWidth && !parentRow)) {
        style.flex = "1 1 0%";
        style[isWidth ? "minWidth" : "minHeight"] = 0;
      } else {
        style.alignSelf = "stretch";
      }
    }
  };
  axis("horizontal");
  axis("vertical");

  if (g.frame.rotation !== 0) style.transform = `rotate(${g.frame.rotation}deg)`;
  const opacity = resolved.get("appearance.opacity");
  if (typeof opacity === "number" && opacity >= 0 && opacity <= 1) style.opacity = opacity;
  return style;
}

/** `px` strings for numbers; used for radii, gaps and paddings read from props. */
export const px = (n: number) => `${n}px`;
