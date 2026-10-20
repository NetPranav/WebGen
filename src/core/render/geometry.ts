import type { CSSProperties } from "react";
import type { Layer } from "../document/schema";
import { getLayerGeometry } from "../document/properties";
import { boxShadowCss, parseShadows } from "../paint/paints";
import type { RenderContext, ResolvedProps } from "./types";

/** Largest frame dimension the renderer will draw; a larger stored value is clamped. */
export const MAX_FRAME_PX = 20_000;

/**
 * The box a layer occupies, from its geometry (Law 10): `frame`, `sizing` and `positioning`.
 * Absolute layers sit at `frame.x/y` inside their positioned parent; flow layers are placed by the
 * parent's layout and take their size from `sizing` (fixed: the frame size, hug: their content,
 * fill: grow along the parent's main axis or stretch across it). Rotation applies to both.
 */
export function layerBoxStyle(layer: Layer, resolved: ResolvedProps, ctx: RenderContext, options: { shadow?: "box" | "none" } = {}): CSSProperties {
  const g = getLayerGeometry(layer);
  const style: CSSProperties = { boxSizing: "border-box" };
  const px = (n: number, unit: string) => `${Math.min(MAX_FRAME_PX, Math.max(0, n))}${unit}`;

  if (g.positioning === "absolute") {
    style.position = "absolute";
    const atOrigin = ctx.frameAtOrigin === true && layer.parentId === null;
    style.left = atOrigin ? 0 : g.frame.x;
    style.top = atOrigin ? 0 : g.frame.y;
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
      // a fixed size in a stack never shrinks to fit (Figma's fixed): the stack's overflow is the author's to see
      if (g.positioning === "flow" && ((isWidth && parentRow) || (!isWidth && ctx.parentDirection === "column"))) style.flexShrink = 0;
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
  // Effects (Phase 35): drop and inner shadows (a shape draws its own, inside its SVG), layer blur and background blur.
  if (options.shadow !== "none") {
    const shadow = boxShadowCss(parseShadows(resolved.get("paint.shadows")));
    if (shadow) style.boxShadow = shadow;
  }
  const blur = resolved.get("filter.blur");
  if (typeof blur === "number" && blur > 0) style.filter = `blur(${Math.min(blur, 200)}px)`;
  const backdrop = resolved.get("paint.backgroundBlur");
  if (typeof backdrop === "number" && backdrop > 0) {
    style.backdropFilter = `blur(${Math.min(backdrop, 200)}px)`;
    (style as Record<string, unknown>).WebkitBackdropFilter = `blur(${Math.min(backdrop, 200)}px)`;
  }
  return style;
}

/** `px` strings for numbers; used for radii, gaps and paddings read from props. */
export const px = (n: number) => `${n}px`;
