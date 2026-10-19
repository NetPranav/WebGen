import React, { useContext } from "react";
import { layerBoxStyle } from "../geometry";
import { clampNumber, clampText, safeFragmentHref, safePathData } from "../limits";
import type { ArchetypeRenderProps } from "../types";
import { InSvgContext } from "./svgContext";

/**
 * Draws `inner` as an SVG child inside an `svgGroup`, or inside its own `<svg>` standing alone.
 * `space` is the coordinate system of a standalone `<svg>`: the Pen and Pencil tools author paths in a
 * 200 × 200 space that stretches to the frame (`unit`); text and groups use the frame's own pixels.
 */
const SvgShell: React.FC<ArchetypeRenderProps & { inner: (nodeRef: ArchetypeRenderProps["nodeRef"]) => React.ReactNode; space?: "unit" | "pixels" }> = ({ layer, resolved, ctx, inner, space = "unit", nodeRef }) => {
  const inGroup = useContext(InSvgContext);
  if (inGroup) return <>{inner(nodeRef)}</>;
  const width = clampNumber(resolved.num("frame.width", 100), 1, 10_000, 100);
  const height = clampNumber(resolved.num("frame.height", 100), 1, 10_000, 100);
  return (
    <svg
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype={layer.archetype}
      viewBox={space === "unit" ? "0 0 200 200" : `0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ ...layerBoxStyle(layer, resolved, ctx), width, height, display: "block", overflow: "visible" }}
    >
      {inner(undefined)}
    </svg>
  );
};

/** `svgPath`: the Pen and Pencil tools' output, and any imported path. */
export const SvgPath: React.FC<ArchetypeRenderProps> = (p) => (
  <SvgShell
    {...p}
    inner={(ref) => (
      <path
        ref={ref as React.Ref<SVGPathElement>}
        data-element-id={p.layer.id}
        d={safePathData(p.resolved.str("svg.path", "M0 0 L100 100"))}
        stroke={p.resolved.str("svg.stroke", "#0f172a")}
        strokeWidth={clampNumber(p.resolved.num("svg.strokeWidth", 2), 0, 200, 2)}
        fill={p.resolved.str("svg.fill", "none")}
      />
    )}
  />
);

/** `svgText`: a text run in a group or on its own. */
export const SvgText: React.FC<ArchetypeRenderProps> = (p) => {
  const raw = p.resolved.str("content.text", "Text");
  const text = clampText(p.ctx.interpolate ? p.ctx.interpolate(raw) : raw);
  return (
    <SvgShell
      {...p}
      space="pixels"
      inner={(ref) => (
        <text ref={ref as React.Ref<SVGTextElement>} data-element-id={p.layer.id} x={0} y={20} fontSize={clampNumber(p.resolved.num("typography.fontSize", 16), 4, 512, 16)} fill={p.resolved.str("svg.fill", "#0f172a")}>
          {text}
        </text>
      )}
    />
  );
};

/** `svgUse`: a reference to something in the same document only; an external reference draws nothing. */
export const SvgUse: React.FC<ArchetypeRenderProps> = (p) => {
  const href = safeFragmentHref(p.resolved.str("svg.href", ""));
  return <SvgShell {...p} inner={(ref) => (href ? <use ref={ref as React.Ref<SVGUseElement>} data-element-id={p.layer.id} href={href} /> : null)} />;
};

/** `svgGroup`: one `<svg>` that its children draw into. */
export const SvgGroup: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, children, nodeRef }) => (
  <svg
    ref={nodeRef}
    data-element-id={layer.id}
    data-archetype="svgGroup"
    viewBox={`0 0 ${clampNumber(resolved.num("frame.width", 100), 1, 10_000, 100)} ${clampNumber(resolved.num("frame.height", 100), 1, 10_000, 100)}`}
    style={{ ...layerBoxStyle(layer, resolved, ctx), width: clampNumber(resolved.num("frame.width", 100), 1, 10_000, 100), height: clampNumber(resolved.num("frame.height", 100), 1, 10_000, 100), display: "block", overflow: "visible" }}
  >
    <InSvgContext.Provider value>
      <g>{children}</g>
    </InSvgContext.Provider>
  </svg>
);

/** `icon`: a single path in a square viewBox, tinted by its text colour. */
export const Icon: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, nodeRef }) => {
  const size = clampNumber(resolved.num("svg.size", 24), 4, 512, 24);
  return (
    <svg
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={resolved.str("content.iconName", layer.name)}
      style={{ ...layerBoxStyle(layer, resolved, ctx), width: size, height: size, display: "inline-block", flexShrink: 0, color: resolved.str("typography.color", "#0f172a") }}
    >
      <path
        d={safePathData(resolved.str("svg.path", ""))}
        stroke={resolved.str("svg.stroke", "currentColor")}
        strokeWidth={clampNumber(resolved.num("svg.strokeWidth", 2), 0, 24, 2)}
        fill={resolved.str("svg.fill", "none")}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
