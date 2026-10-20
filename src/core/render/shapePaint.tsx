import React from "react";
import type { Layer } from "../document/schema";
import { parseColor, toCss } from "../paint/colorMath";
import { effectiveFills, paintCss, parseShadows, safeDashArray, type GradientStop, type Paint, type Shadow } from "../paint/paints";
import type { ResolvedProps } from "./types";

/**
 * Painting an SVG shape (ROADMAP Phase 35): its fills (solid, linear, radial, conic), its stroke with a dash
 * pattern, and its drop and inner shadows as an SVG filter. The shape's own geometry is passed in as a function
 * so every fill, the stroke, and the clip for a conic fill draw the same outline.
 *
 * Gradients use user-space coordinates so the stops sit exactly where the CSS gradient (and the handles on the
 * canvas) put them, whatever the box's shape. A conic gradient has no SVG form: it is a CSS gradient in a
 * `foreignObject`, clipped to the outline.
 */

/** The paint attributes a shape's outline is drawn with. */
export interface PaintAttrs {
  fill: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
}

export type Geometry = (attrs: PaintAttrs) => React.ReactElement;

const rgb = (color: string) => {
  const c = parseColor(color);
  return c ? { color: `rgb(${c.r}, ${c.g}, ${c.b})`, alpha: c.a } : { color: "#000000", alpha: 1 };
};

function Stops({ stops, opacity }: { stops: readonly GradientStop[]; opacity: number }) {
  return (
    <>
      {stops.map((s, i) => {
        const c = rgb(s.color);
        return <stop key={i} offset={s.at} stopColor={c.color} stopOpacity={Number((c.alpha * opacity).toFixed(4))} />;
      })}
    </>
  );
}

function ShadowFilter({ id, shadows }: { id: string; shadows: readonly Shadow[] }) {
  const visible = shadows.filter((s) => s.visible);
  // listed top first; an SVG filter draws bottom first, so go through them backwards
  const drops = visible.filter((s) => s.kind === "drop").reverse();
  const inners = visible.filter((s) => s.kind === "inner").reverse();
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
      {drops.map((s, i) => {
        const c = rgb(s.color);
        return (
          <React.Fragment key={`d${i}`}>
            {s.spread !== 0 ? <feMorphology in="SourceAlpha" operator={s.spread > 0 ? "dilate" : "erode"} radius={Math.abs(s.spread)} result={`m${i}`} /> : null}
            <feGaussianBlur in={s.spread !== 0 ? `m${i}` : "SourceAlpha"} stdDeviation={s.blur / 2} result={`b${i}`} />
            <feOffset in={`b${i}`} dx={s.x} dy={s.y} result={`o${i}`} />
            <feFlood floodColor={c.color} floodOpacity={c.alpha} result={`c${i}`} />
            <feComposite in={`c${i}`} in2={`o${i}`} operator="in" result={`d${i}`} />
          </React.Fragment>
        );
      })}
      {inners.map((s, i) => {
        const c = rgb(s.color);
        return (
          <React.Fragment key={`i${i}`}>
            <feFlood floodColor={c.color} floodOpacity={c.alpha} result={`ic${i}`} />
            <feComposite in={`ic${i}`} in2="SourceAlpha" operator="out" result={`iv${i}`} />
            {s.spread !== 0 ? <feMorphology in={`iv${i}`} operator={s.spread > 0 ? "dilate" : "erode"} radius={Math.abs(s.spread)} result={`im${i}`} /> : null}
            <feGaussianBlur in={s.spread !== 0 ? `im${i}` : `iv${i}`} stdDeviation={s.blur / 2} result={`ib${i}`} />
            <feOffset in={`ib${i}`} dx={s.x} dy={s.y} result={`io${i}`} />
            <feComposite in={`io${i}`} in2="SourceAlpha" operator="in" result={`is${i}`} />
          </React.Fragment>
        );
      })}
      <feMerge>
        {drops.map((_, i) => <feMergeNode key={`md${i}`} in={`d${i}`} />)}
        <feMergeNode in="SourceGraphic" />
        {inners.map((_, i) => <feMergeNode key={`mi${i}`} in={`is${i}`} />)}
      </feMerge>
    </filter>
  );
}

export interface ShapePaintProps {
  layer: Layer;
  resolved: ResolvedProps;
  width: number;
  height: number;
  /** The plain fill colour when the layer has no `paint.fills`. */
  defaultFill: string;
  defaultStroke: string;
  defaultStrokeWidth: number;
  /** Draws the shape's outline with the given paint attributes. */
  geometry: Geometry;
  /** Draw no fill and no stroke (a line is stroke only: set `fillable` false). */
  fillable?: boolean;
  /** Does the shape draw a stroke? (An arrow doesn't.) */
  strokable?: boolean;
}

/** The fills, stroke and shadows of a shape, as the children of its `<svg>`. */
export function ShapePaint({ layer, resolved, width, height, defaultFill, defaultStroke, defaultStrokeWidth, geometry, fillable = true, strokable = true }: ShapePaintProps) {
  const id = layer.id.replace(/[^A-Za-z0-9_-]/g, "_");
  const fills: Paint[] = fillable ? effectiveFills(resolved.get("paint.fills"), resolved.str("svg.fill", defaultFill)) : [];
  const stroke = resolved.str("svg.stroke", defaultStroke);
  const strokeWidth = Math.min(200, Math.max(0, resolved.num("svg.strokeWidth", defaultStrokeWidth)));
  const dash = safeDashArray(resolved.str("svg.strokeDasharray", "none"));
  const cap = resolved.str("svg.strokeLinecap", "butt");
  const join = resolved.str("svg.strokeLinejoin", "miter");
  const shadows = parseShadows(resolved.get("paint.shadows")).filter((s) => s.visible);
  const filterId = `${id}__shadow`;

  const defs: React.ReactNode[] = [];
  const painted: React.ReactNode[] = [];
  // the first fill is on top, so draw them last to first
  [...fills].reverse().forEach((p, k) => {
    if (!p.visible) return;
    const i = fills.length - 1 - k;
    const gid = `${id}__f${i}`;
    switch (p.type) {
      case "solid":
        painted.push(<React.Fragment key={`f${i}`}>{geometry({ fill: p.color, fillOpacity: p.opacity, stroke: "none" })}</React.Fragment>);
        break;
      case "linear":
        defs.push(
          <linearGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" x1={p.from.x * width} y1={p.from.y * height} x2={p.to.x * width} y2={p.to.y * height}>
            <Stops stops={p.stops} opacity={p.opacity} />
          </linearGradient>,
        );
        painted.push(<React.Fragment key={`f${i}`}>{geometry({ fill: `url(#${gid})`, stroke: "none" })}</React.Fragment>);
        break;
      case "radial":
        defs.push(
          <radialGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={1} gradientTransform={`translate(${p.center.x * width} ${p.center.y * height}) scale(${p.radius.x * width} ${p.radius.y * height})`}>
            <Stops stops={p.stops} opacity={p.opacity} />
          </radialGradient>,
        );
        painted.push(<React.Fragment key={`f${i}`}>{geometry({ fill: `url(#${gid})`, stroke: "none" })}</React.Fragment>);
        break;
      case "conic": {
        const css = paintCss(p, width, height);
        defs.push(<clipPath key={gid} id={gid}>{geometry({ fill: "#000", stroke: "none" })}</clipPath>);
        painted.push(
          <foreignObject key={`f${i}`} x={0} y={0} width={width} height={height} clipPath={`url(#${gid})`}>
            <div style={{ width: "100%", height: "100%", backgroundImage: css ?? "none" }} />
          </foreignObject>,
        );
        break;
      }
    }
  });
  if (strokable && strokeWidth > 0 && stroke !== "none" && parseColor(stroke) !== null) {
    painted.push(
      <React.Fragment key="stroke">
        {geometry({
          fill: "none",
          stroke: toCss(parseColor(stroke)!),
          strokeWidth,
          ...(dash ? { strokeDasharray: dash } : {}),
          strokeLinecap: cap === "round" || cap === "square" ? cap : "butt",
          strokeLinejoin: join === "round" || join === "bevel" ? join : "miter",
        })}
      </React.Fragment>,
    );
  }
  return (
    <>
      {(defs.length > 0 || shadows.length > 0) && (
        <defs>
          {defs}
          {shadows.length > 0 && <ShadowFilter id={filterId} shadows={shadows} />}
        </defs>
      )}
      <g filter={shadows.length > 0 ? `url(#${filterId})` : undefined}>{painted}</g>
    </>
  );
}
