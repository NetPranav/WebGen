import React from "react";
import { layerBoxStyle } from "../geometry";
import { clampNumber } from "../limits";
import { safeDashArray } from "../../paint/paints";
import { ShapePaint } from "../shapePaint";
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

export const Rectangle: React.FC<ArchetypeRenderProps> = (p) => {
  const { width, height } = size(p.resolved, 160, 120);
  const strokeWidth = strokeOf(p.resolved, 0);
  const radius = clampNumber(p.resolved.num("shape.cornerRadius", 0), 0, Math.min(width, height) / 2, 0);
  const inset = strokeWidth / 2;
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <ShapePaint
        layer={p.layer} resolved={p.resolved} width={width} height={height} defaultFill="#cbd5e1" defaultStroke="none" defaultStrokeWidth={0}
        geometry={(a) => <rect {...a} x={inset} y={inset} width={Math.max(0, width - strokeWidth)} height={Math.max(0, height - strokeWidth)} rx={radius} />}
      />
    </ShapeSvg>
  );
};

export const Ellipse: React.FC<ArchetypeRenderProps> = (p) => {
  const { width, height } = size(p.resolved, 120, 120);
  const strokeWidth = strokeOf(p.resolved, 0);
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <ShapePaint
        layer={p.layer} resolved={p.resolved} width={width} height={height} defaultFill="#cbd5e1" defaultStroke="none" defaultStrokeWidth={0}
        geometry={(a) => <ellipse {...a} cx={width / 2} cy={height / 2} rx={Math.max(0, (width - strokeWidth) / 2)} ry={Math.max(0, (height - strokeWidth) / 2)} />}
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

export const Polygon: React.FC<ArchetypeRenderProps> = (p) => {
  const { width, height } = size(p.resolved, 120, 120);
  const sides = Math.round(clampNumber(p.resolved.num("shape.sides", 6), 3, 64, 6));
  const cx = width / 2;
  const cy = height / 2;
  const points = Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return `${(cx + cx * Math.cos(angle)).toFixed(2)},${(cy + cy * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <ShapePaint layer={p.layer} resolved={p.resolved} width={width} height={height} defaultFill="#cbd5e1" defaultStroke="none" defaultStrokeWidth={0} geometry={(a) => <polygon {...a} points={points} />} />
    </ShapeSvg>
  );
};

export const Star: React.FC<ArchetypeRenderProps> = (p) => {
  const { width, height } = size(p.resolved, 120, 120);
  const count = Math.round(clampNumber(p.resolved.num("shape.points", 5), 3, 64, 5));
  const inner = clampNumber(p.resolved.num("shape.innerRadius", 0.5), 0.05, 1, 0.5);
  const cx = width / 2;
  const cy = height / 2;
  const vertices: string[] = [];
  for (let i = 0; i < count * 2; i++) {
    const angle = (Math.PI * i) / count - Math.PI / 2;
    const scale = i % 2 === 0 ? 1 : inner;
    vertices.push(`${(cx + cx * scale * Math.cos(angle)).toFixed(2)},${(cy + cy * scale * Math.sin(angle)).toFixed(2)}`);
  }
  const points = vertices.join(" ");
  return (
    <ShapeSvg {...p} width={width} height={height}>
      <ShapePaint layer={p.layer} resolved={p.resolved} width={width} height={height} defaultFill="#cbd5e1" defaultStroke="none" defaultStrokeWidth={0} geometry={(a) => <polygon {...a} points={points} />} />
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
