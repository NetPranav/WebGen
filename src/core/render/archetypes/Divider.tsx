import React from "react";
import { layerBoxStyle } from "../geometry";
import { clampNumber } from "../limits";
import type { ArchetypeRenderProps } from "../types";

export const Divider: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, nodeRef }) => {
  const vertical = resolved.str("divider.orientation", "horizontal") === "vertical";
  const length = clampNumber(resolved.num("divider.length", 100), 1, 20_000, 100);
  const thickness = clampNumber(resolved.num("divider.thickness", 1), 0, 200, 1);
  const style = resolved.str("divider.style", "solid");
  const color = resolved.str("divider.color", "#e2e8f0");
  const line = `${thickness}px ${style === "dashed" || style === "dotted" ? style : "solid"} ${color}`;
  return (
    <div
      ref={nodeRef}
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      data-element-id={layer.id}
      data-archetype="divider"
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
        width: vertical ? thickness : length,
        height: vertical ? length : thickness,
        borderTop: vertical ? undefined : line,
        borderLeft: vertical ? line : undefined,
        borderRadius: resolved.str("divider.capStyle", "round") === "round" ? thickness : 0,
        flexShrink: 0,
      }}
    />
  );
};
