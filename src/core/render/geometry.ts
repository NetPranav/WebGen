import type { CSSProperties } from "react";
import type { Layer } from "../document/schema";
import { getLayerGeometry } from "../document/properties";
import { boxShadowCss, parseShadows } from "../paint/paints";
import { blurOf, effectFilterId, glassCss, maxRadius, needsFilter, parseEffects } from "../paint/effects";
import type { RenderContext, ResolvedProps } from "./types";

/** Largest frame dimension the renderer will draw; a larger stored value is clamped. */
export const MAX_FRAME_PX = 20_000;

/**
 * The box a layer occupies, from its geometry (Law 10): `frame`, `sizing` and `positioning`.
 * Absolute layers sit at `frame.x/y` inside their positioned parent; flow layers are placed by the
 * parent's layout and take their size from `sizing` (fixed: the frame size, hug: their content,
 * fill: grow along the parent's main axis or stretch across it). Rotation applies to both.
 */
export function layerBoxStyle(layer: Layer, resolved: ResolvedProps, ctx: RenderContext, options: { shadow?: "box" | "none"; /** The archetype draws progressive blurs itself (a frame's backdrop layers). */ bands?: boolean } = {}): CSSProperties {
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
  const inGrid = g.positioning === "flow" && ctx.parentDirection === "grid";
  const axis = (kind: "horizontal" | "vertical") => {
    const sizing = g.sizing[kind];
    const isWidth = kind === "horizontal";
    const size = isWidth ? g.frame.width : g.frame.height;
    const unit = isWidth ? g.units.width : g.units.height;
    if (inGrid) {
      // in a grid cell: fixed is its size, fill stretches across the cell, hug is its content at the cell's start
      if (sizing === "fixed") style[isWidth ? "width" : "height"] = px(size, unit);
      if (sizing === "hug") style[isWidth ? "justifySelf" : "alignSelf"] = "start";
      return;
    }
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
  // FigCraft port F6: a grid child's own place in its cell (horizontal; `layout.alignSelf` is the vertical one)
  if (inGrid) {
    const js = resolved.get("layout.justifySelf");
    if (js === "start" || js === "center" || js === "end" || js === "stretch") style.justifySelf = js;
    const as = resolved.get("layout.alignSelf");
    if (as === "start" || as === "center" || as === "end" || as === "stretch") style.alignSelf = as;
  }
  // FigCraft port F6: a parent that paints its first child on top hands each child its place in the stacking order
  if (typeof ctx.stackZ === "number") style.zIndex = ctx.stackZ;
  if (inGrid) {
    // the cell this layer sits in: a start (1-based) and how many tracks it spans
    const span = (path: string) => {
      const v = resolved.get(path);
      return typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.min(200, Math.floor(v)) : 1;
    };
    const start = (path: string) => {
      const v = resolved.get(path);
      return typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.min(200, Math.floor(v)) : 0;
    };
    const cs = start("layout.gridColumnStart");
    const rs = start("layout.gridRowStart");
    const ce = span("layout.gridColumnSpan");
    const re = span("layout.gridRowSpan");
    if (cs > 0 || ce > 1) style.gridColumn = cs > 0 ? `${cs} / span ${ce}` : `span ${ce}`;
    if (rs > 0 || re > 1) style.gridRow = rs > 0 ? `${rs} / span ${re}` : `span ${re}`;
  }

  if (g.frame.rotation !== 0) style.transform = `rotate(${g.frame.rotation}deg)`;
  const opacity = resolved.get("appearance.opacity");
  if (typeof opacity === "number" && opacity >= 0 && opacity <= 1) style.opacity = opacity;
  // Effects (Phase 35): drop and inner shadows (a shape draws its own, inside its SVG), layer blur and background blur.
  if (options.shadow !== "none") {
    const shadow = boxShadowCss(parseShadows(resolved.get("paint.shadows")));
    if (shadow) style.boxShadow = shadow;
  }
  // FigCraft port F7: the effect list (`paint.effects`); a blur in it wins over the plain one
  const effects = parseEffects(resolved.get("paint.effects"));
  const filters: string[] = [];
  const backdrops: string[] = [];
  if (needsFilter(effects)) filters.push(`url(#${effectFilterId(layer.id)})`);
  const layerBlur = blurOf(effects, "layerBlur");
  const blur = resolved.get("filter.blur");
  if (layerBlur) {
    // a progressive one is drawn by the frame's backdrop layers; elsewhere it is the uniform blur half way up its ramp
    if (layerBlur.blurType !== "progressive") filters.push(`blur(${Math.min(layerBlur.radius, 200)}px)`);
    else if (!options.bands) filters.push(`blur(${Math.min((layerBlur.radius + layerBlur.startRadius) / 2, 200)}px)`);
  } else if (typeof blur === "number" && blur > 0) filters.push(`blur(${Math.min(blur, 200)}px)`);
  if (filters.length > 0) style.filter = filters.join(" ");
  const bgBlur = blurOf(effects, "backgroundBlur");
  const backdrop = resolved.get("paint.backgroundBlur");
  if (bgBlur) {
    if (bgBlur.blurType !== "progressive") backdrops.push(`blur(${Math.min(bgBlur.radius, 200)}px)`);
    else if (!options.bands) backdrops.push(`blur(${Math.min(maxRadius(bgBlur), 200)}px)`);
  } else if (typeof backdrop === "number" && backdrop > 0) backdrops.push(`blur(${Math.min(backdrop, 200)}px)`);
  const glass = effects.find((e) => e.visible && e.type === "glass");
  if (glass && glass.type === "glass") {
    const g = glassCss(glass);
    backdrops.push(g.backdropFilter);
    if (options.shadow !== "none") style.boxShadow = style.boxShadow ? `${style.boxShadow}, ${g.boxShadow}` : g.boxShadow;
  }
  if (backdrops.length > 0) {
    style.backdropFilter = backdrops.join(" ");
    (style as Record<string, unknown>).WebkitBackdropFilter = backdrops.join(" ");
  }
  return style;
}

/** `px` strings for numbers; used for radii, gaps and paddings read from props. */
export const px = (n: number) => `${n}px`;
