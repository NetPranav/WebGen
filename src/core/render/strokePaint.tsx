import React from "react";
import type { BezPath } from "../geometry/bezpath";
import { parseColor, toCss } from "../paint/colorMath";
import { paintCss, parseFills, safeDashArray, type GradientStop, type Paint } from "../paint/paints";
import { arrowhead, isArrowCap, parseSides, parseWidthProfile, roundedSideStrokes, rectSideStrokes, variableOutline, type StrokeAlign, type StrokeCap, type WidthPoint } from "../paths/strokes";
import type { Geometry } from "./shapePaint";
import type { ResolvedProps } from "./types";

/**
 * Strokes beyond one plain colour (FigCraft port F3): several stroke paints of any kind, alignment inside, centred
 * or outside, per-side weights on rectangles, a variable width profile and arrowheads. Each stroke's *area* is drawn
 * white into an SVG mask (a native stroke, clipped for inside and masked out for outside, or the filled outline from
 * `core/paths/strokes.ts` for widths SVG can't stroke), and the paint is laid through it. A layer with none of these
 * settings keeps the plain SVG stroke `ShapePaint` always drew, unchanged.
 */

/** Older cap names Phase 7.6 stored. */
const LEGACY_CAP: Record<string, StrokeCap> = { arrow: "lineArrow", triangle: "triangleArrow", circle: "circleFilled" };
export function readCap(v: unknown): StrokeCap {
  const s = typeof v === "string" ? v : "none";
  if (s in LEGACY_CAP) return LEGACY_CAP[s];
  return (["none", "round", "square", "lineArrow", "triangleArrow", "reversedTriangle", "circleFilled", "diamondFilled"] as const).find((c) => c === s) ?? "none";
}

export interface StrokeSettings {
  paints: Paint[];
  weight: number;
  /** Null: no explicit alignment (the archetype's older placement). */
  align: StrokeAlign | null;
  sides: [number, number, number, number] | null;
  profile: WidthPoint[] | null;
  capStart: StrokeCap;
  capEnd: StrokeCap;
  join: "miter" | "round" | "bevel";
  miterLimit: number;
  dash: string | undefined;
  lineCap: "butt" | "round" | "square";
}

/** The layer's stroke settings, or null when it uses none of the FigCraft-port settings (draw the plain stroke). */
export function strokeSettings(resolved: ResolvedProps, defaultStroke: string, defaultWidth: number, open: boolean): StrokeSettings | null {
  const list = parseFills(resolved.get("paint.strokes"));
  const alignRaw = resolved.get("stroke.align");
  const align = alignRaw === "inside" || alignRaw === "center" || alignRaw === "outside" ? alignRaw : null;
  const sides = parseSides(resolved.get("stroke.sides"));
  const profile = parseWidthProfile(resolved.get("stroke.widthProfile"));
  const capStart = open ? readCap(resolved.get("shape.startCap")) : "none";
  const capEnd = open ? readCap(resolved.get("shape.endCap")) : "none";
  const arrows = isArrowCap(capStart) || isArrowCap(capEnd);
  if (list === null && align === null && !sides && !profile && !arrows) return null;
  const color = resolved.str("svg.stroke", defaultStroke);
  const paints = list ?? (color !== "none" && parseColor(color) ? [{ type: "solid", color, opacity: 1, visible: true } as Paint] : []);
  const cap = resolved.str("svg.strokeLinecap", "butt");
  const join = resolved.str("svg.strokeLinejoin", "miter");
  return {
    paints: paints.filter((p) => p.visible),
    weight: Math.min(200, Math.max(0, resolved.num("svg.strokeWidth", defaultWidth))),
    align,
    sides,
    profile,
    capStart,
    capEnd,
    join: join === "round" || join === "bevel" ? join : "miter",
    miterLimit: Math.min(100, Math.max(1, resolved.num("stroke.miterLimit", 4))),
    dash: safeDashArray(resolved.str("svg.strokeDasharray", "none")),
    lineCap: cap === "round" || cap === "square" ? cap : capStart === "round" || capEnd === "round" ? "round" : "butt",
  };
}

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

export interface StrokeLayerProps {
  id: string;
  settings: StrokeSettings;
  width: number;
  height: number;
  /** Draws the shape's outline with the given attributes (the same function the fills use). */
  geometry: Geometry;
  /** The shape's outline as a path in the same coordinates, for widths, sides and arrowheads. */
  outline: BezPath | null;
  /** Whether the outline is closed (alignment and sides apply only to closed shapes). */
  closed: boolean;
  /** Rectangle corner radii and smoothing, for per-side weights. */
  rect?: { radii: number[]; smoothing: number };
  /** Maps outline coordinates to the drawing's (an `svgPath` draws in a 200 × 200 space). */
  toDrawing?: (p: BezPath) => BezPath;
}

/** The stroke paints of a shape, each laid through a mask of the stroke's area. */
export function StrokeLayer({ id, settings: s, width, height, geometry, outline, closed, rect, toDrawing = (p) => p }: StrokeLayerProps) {
  if (s.weight <= 0 || s.paints.length === 0) return null;
  const align = closed ? (s.align ?? "center") : "center";
  // how far a stroke can reach past the box (outside alignment, wide profiles, arrowheads)
  const reach = s.weight * (s.profile ? Math.max(1, ...s.profile.map((p) => p.scale * (1 + Math.abs(p.bias)))) : 1) * 4 + 24;
  const box = { x: -reach, y: -reach, width: width + 2 * reach, height: height + 2 * reach };
  const maskId = `${id}__stroke`;
  const clipId = `${id}__strokeclip`;

  // the stroke's area, white
  let area: React.ReactNode;
  if (closed && rect && s.sides) {
    const ring = toDrawing(rect.radii.some((r) => r > 0) || rect.smoothing > 0 ? roundedSideStrokes(width, height, rect.radii, rect.smoothing, s.sides, align) : rectSideStrokes(width, height, s.sides, align));
    area = <path d={ring.toSvg()} fill="#fff" fillRule="evenodd" />;
  } else if (s.profile && outline) {
    const w = align === "center" ? s.weight : s.weight * 2;
    const body = variableOutline(outline, w, { join: s.join, miterLimit: s.miterLimit, capStart: s.capStart, capEnd: s.capEnd, dashes: s.dash ? s.dash.split(" ").map(Number) : [] }, s.profile);
    area = body ? <path d={toDrawing(body).toSvg()} fill="#fff" /> : null;
  } else {
    area = geometry({
      fill: "none",
      stroke: "#fff",
      strokeWidth: align === "center" ? s.weight : s.weight * 2,
      ...(s.dash ? { strokeDasharray: s.dash } : {}),
      strokeLinecap: s.lineCap,
      strokeLinejoin: s.join,
    });
  }
  const heads: React.ReactNode[] = [];
  if (!closed && outline) {
    for (const [atEnd, cap] of [[false, s.capStart], [true, s.capEnd]] as const) {
      const head = isArrowCap(cap) ? arrowhead(outline, cap, s.weight, atEnd) : null;
      if (head) heads.push(<path key={atEnd ? "end" : "start"} d={toDrawing(head).toSvg()} fill="#fff" />);
    }
  }

  const defs: React.ReactNode[] = [
    <clipPath key="clip" id={clipId}>{geometry({ fill: "#000", stroke: "none" })}</clipPath>,
    <mask key="mask" id={maskId} maskUnits="userSpaceOnUse" {...box}>
      {align === "inside" && !s.sides ? <g clipPath={`url(#${clipId})`}>{area}</g> : area}
      {align === "outside" && !s.sides ? geometry({ fill: "#000", stroke: "none" }) : null}
      {heads}
    </mask>,
  ];
  const painted: React.ReactNode[] = [];
  // the first stroke is on top: draw last to first
  [...s.paints].reverse().forEach((p, k) => {
    const i = s.paints.length - 1 - k;
    const gid = `${id}__s${i}`;
    switch (p.type) {
      case "solid":
        painted.push(<rect key={i} {...box} fill={toCss(parseColor(p.color) ?? { r: 0, g: 0, b: 0, a: 1 })} fillOpacity={p.opacity} />);
        break;
      case "linear":
        defs.push(
          <linearGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" x1={p.from.x * width} y1={p.from.y * height} x2={p.to.x * width} y2={p.to.y * height}>
            <Stops stops={p.stops} opacity={p.opacity} />
          </linearGradient>,
        );
        painted.push(<rect key={i} {...box} fill={`url(#${gid})`} />);
        break;
      case "radial":
        defs.push(
          <radialGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={1} gradientTransform={`translate(${p.center.x * width} ${p.center.y * height}) scale(${p.radius.x * width} ${p.radius.y * height})`}>
            <Stops stops={p.stops} opacity={p.opacity} />
          </radialGradient>,
        );
        painted.push(<rect key={i} {...box} fill={`url(#${gid})`} />);
        break;
      default: {
        // conic, diamond and pictures have no SVG paint: a CSS background in a foreignObject, through the same mask
        const css = paintCss(p, width, height);
        if (css) {
          painted.push(
            <foreignObject key={i} x={0} y={0} width={width} height={height}>
              <div style={{ width: "100%", height: "100%", backgroundImage: css }} />
            </foreignObject>,
          );
        }
      }
    }
  });
  return (
    <>
      <defs>{defs}</defs>
      <g mask={`url(#${maskId})`}>{painted}</g>
    </>
  );
}
