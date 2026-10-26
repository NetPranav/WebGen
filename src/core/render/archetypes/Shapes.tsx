import React from "react";
import { layerBoxStyle } from "../geometry";
import { clampNumber } from "../limits";
import { safeDashArray } from "../../paint/paints";
import { ShapePaint, type Geometry } from "../shapePaint";
import { ellipse as ellipseOutline, polygonPoints, smoothedPolygon, starPoints, roundedRect } from "../../geometry/shapes";
import type { ArchetypeRenderProps, ResolvedProps } from "../types";

/** Largest side of a drawn shape, in px. */
const MAX_SIDE = 10_000;

function size(resolved: ResolvedProps, w: number, h: number) {
  return {
    width: clampNumber(resolved.num("frame.width", w), 1, MAX_SIDE, w),
    height: clampNumber(resolved.num("frame.height", h), 1, MAX_SIDE, h),
  };
}

const strokeOf = (resolved: ResolvedProps, defaultStrokeWidth: number) => clampNumber(resolved.num("svg.strokeWidth", defaultStrokeWidth), 0, 200, defaultStrokeWidth);

interface FrameProps extends ArchetypeRenderProps {
  width: number;
  height: number;
  children: React.ReactNode;
}

/** The `<svg>` every parametric shape draws into, sized to its frame. Its shadows are drawn inside, by the shape's own outline (an SVG filter), not as a box. */
const ShapeSvg: React.FC<FrameProps> = ({ layer, resolved, ctx, width, height, children, nodeRef }) => (
  <svg
    ref={nodeRef}
    data-element-id={layer.id}
    data-archetype={layer.archetype}
    width={width}
    height={height}
    viewBox={`0 0 ${width} ${height}`}
    style={{ ...layerBoxStyle(layer, resolved, ctx, { shadow: "none" }), width, height, display: "block", flexShrink: 0, overflow: "visible" }}
  >
    {children}
  </svg>
);

/** A rectangle's four corner radii, `[tl, tr, br, bl]`: each corner's own value when it has one, else the shared radius. */
export function rectangleRadii(resolved: ResolvedProps): [number, number, number, number] {
  const shared = Math.max(0, resolved.num("shape.cornerRadius", 0));
  const corner = (name: string) => Math.max(0, resolved.num(`shape.cornerRadius.${name}`, shared));
  return [corner("topLeft"), corner("topRight"), corner("bottomRight"), corner("bottomLeft")];
}

export const Rectangle: React.FC<ArchetypeRenderProps> = (p) => {
  const { width, height } = size(p.resolved, 160, 120);
  const strokeWidth = strokeOf(p.resolved, 0);
  const inset = strokeWidth / 2;
  const w = Math.max(0, width - strokeWidth);
  const h = Math.max(0, height - strokeWidth);
  const radii = rectangleRadii(p.resolved);
  const smoothing = clampNumber(p.resolved.num("shape.cornerSmoothing", 0), 0, 1, 0);
  const uniform = radii.every((r) => r === radii[0]);
  // a plain `<rect>` when it can say it (one radius, no smoothing); otherwise the outline from the shape geometry
  const d = uniform && smoothing === 0 ? null : roundedRect(w, h, radii, smoothing).map((q) => ({ x: q.x + inset, y: q.y + inset })).toSvg();
  const radius = Math.min(radii[0], Math.min(w, h) / 2);
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <ShapePaint
        layer={p.layer} resolved={p.resolved} width={width} height={height} defaultFill="#cbd5e1" defaultStroke="none" defaultStrokeWidth={0}
        geometry={(a) => (d ? <path {...a} d={d} /> : <rect {...a} x={inset} y={inset} width={w} height={h} rx={radius} />)}
      />
    </ShapeSvg>
  );
};

export const Ellipse: React.FC<ArchetypeRenderProps> = (p) => {
  const { width, height } = size(p.resolved, 120, 120);
  const strokeWidth = strokeOf(p.resolved, 0);
  const sweep = clampNumber(p.resolved.num("shape.arcSweep", 360), -360, 360, 360);
  const start = clampNumber(p.resolved.num("shape.arcStart", 0), -360, 360, 0);
  const inner = clampNumber(p.resolved.num("shape.arcInnerRatio", 0), 0, 1, 0);
  const inset = strokeWidth / 2;
  const w = Math.max(0, width - strokeWidth);
  const h = Math.max(0, height - strokeWidth);
  // a whole ellipse is an `<ellipse>`; an arc, a pie or a ring is the outline from the shape geometry
  const d = Math.abs(sweep) >= 360 && inner === 0 ? null : ellipseOutline(w, h, (start * Math.PI) / 180, (sweep * Math.PI) / 180, inner).map((q) => ({ x: q.x + inset, y: q.y + inset })).toSvg();
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <ShapePaint
        layer={p.layer} resolved={p.resolved} width={width} height={height} defaultFill="#cbd5e1" defaultStroke="none" defaultStrokeWidth={0}
        geometry={(a) => (d ? <path {...a} d={d} fillRule="evenodd" /> : <ellipse {...a} cx={width / 2} cy={height / 2} rx={w / 2} ry={h / 2} />)}
      />
    </ShapeSvg>
  );
};

export const Line: React.FC<ArchetypeRenderProps> = (p) => {
  const strokeWidth = clampNumber(p.resolved.num("svg.strokeWidth", 2), 0.5, 200, 2);
  const { width } = size(p.resolved, 160, 2);
  const height = Math.max(clampNumber(p.resolved.num("frame.height", 2), 1, MAX_SIDE, 2), strokeWidth);
  const cap = p.resolved.str("svg.strokeLinecap", "round");
  const dash = safeDashArray(p.resolved.str("svg.strokeDasharray", "none"));
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={p.resolved.str("svg.stroke", "#0f172a")} strokeWidth={strokeWidth} strokeLinecap={cap === "butt" || cap === "square" ? cap : "round"} {...(dash ? { strokeDasharray: dash } : {})} />
    </ShapeSvg>
  );
};

/** A polygon or star outline: plain points when it has no rounding, else the rounded (and smoothed) path. */
function vertexGeometry(points: { x: number; y: number }[], resolved: ResolvedProps): Geometry {
  const radius = Math.max(0, resolved.num("shape.vertexRadius", 0));
  const smoothing = clampNumber(resolved.num("shape.cornerSmoothing", 0), 0, 1, 0);
  if (radius === 0) {
    const pts = points.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" ");
    return function polygonOutline(a) {
      return <polygon {...a} points={pts} />;
    };
  }
  const d = smoothedPolygon(points, radius, smoothing).toSvg();
  return function roundedOutline(a) {
    return <path {...a} d={d} />;
  };
}

export const Polygon: React.FC<ArchetypeRenderProps> = (p) => {
  const { width, height } = size(p.resolved, 120, 120);
  const sides = Math.round(clampNumber(p.resolved.num("shape.sides", 6), 3, 64, 6));
  const geometry = vertexGeometry(polygonPoints(width, height, sides), p.resolved);
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <ShapePaint layer={p.layer} resolved={p.resolved} width={width} height={height} defaultFill="#cbd5e1" defaultStroke="none" defaultStrokeWidth={0} geometry={geometry} />
    </ShapeSvg>
  );
};

export const Star: React.FC<ArchetypeRenderProps> = (p) => {
  const { width, height } = size(p.resolved, 120, 120);
  const count = Math.round(clampNumber(p.resolved.num("shape.points", 5), 3, 64, 5));
  const inner = clampNumber(p.resolved.num("shape.innerRadius", 0.5), 0.05, 1, 0.5);
  const geometry = vertexGeometry(starPoints(width, height, count, inner), p.resolved);
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <ShapePaint layer={p.layer} resolved={p.resolved} width={width} height={height} defaultFill="#cbd5e1" defaultStroke="none" defaultStrokeWidth={0} geometry={geometry} />
    </ShapeSvg>
  );
};

export const Arrow: React.FC<ArchetypeRenderProps> = (p) => {
  const { width, height } = size(p.resolved, 160, 32);
  const headLength = Math.min(clampNumber(p.resolved.num("shape.headLength", 16), 1, MAX_SIDE, 16), width);
  const headWidth = Math.min(clampNumber(p.resolved.num("shape.headWidth", 24), 1, MAX_SIDE, 24), height);
  const shaftWidth = Math.min(clampNumber(p.resolved.num("shape.shaftWidth", 6), 1, MAX_SIDE, 6), headWidth);
  const cy = height / 2;
  const shaftEnd = width - headLength;
  const d = `M0,${cy - shaftWidth / 2} L${shaftEnd},${cy - shaftWidth / 2} L${shaftEnd},${cy - headWidth / 2} L${width},${cy} L${shaftEnd},${cy + headWidth / 2} L${shaftEnd},${cy + shaftWidth / 2} L0,${cy + shaftWidth / 2} Z`;
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <ShapePaint layer={p.layer} resolved={p.resolved} width={width} height={height} defaultFill="#cbd5e1" defaultStroke="none" defaultStrokeWidth={0} strokable={false} geometry={(a) => <path {...a} d={d} />} />
    </ShapeSvg>
  );
};
