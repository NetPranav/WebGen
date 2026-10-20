import React from "react";
import { layerBoxStyle, px } from "../geometry";
import type { ArchetypeRenderProps } from "../types";
import { fillStyle } from "../paintStyle";

/** `container` and `form`: a flex box that lays out its children. */
export const Container: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, children, nodeRef }) => {
  const display = resolved.str("layout.display", "flex") === "grid" ? "grid" : "flex";
  const direction = resolved.str("layout.flexDirection", "column") === "row" ? "row" : "column";
  const padding = resolved.num("layout.padding", 0);
  // A border is drawn only with a width and a style (the inspector's Stroke writes both).
  const borderWidth = Math.min(200, resolved.num("appearance.border.width", 0));
  const borderStyle = resolved.str("appearance.border.style", "none");
  const border =
    borderWidth > 0 && (borderStyle === "solid" || borderStyle === "dashed" || borderStyle === "dotted")
      ? { borderStyle, borderWidth: px(borderWidth), borderColor: resolved.str("appearance.border.color", "currentColor") }
      : {};
  return (
    <div
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype={layer.archetype}
      role={layer.archetype === "form" ? "form" : undefined}
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
        display,
        flexDirection: direction,
        gap: px(resolved.num("layout.gap", 0)),
        padding: px(padding),
        paddingInline: resolved.get("layout.paddingX") !== undefined ? px(resolved.num("layout.paddingX", padding)) : undefined,
        ...fillStyle(layer, resolved, resolved.str("appearance.background.color", "transparent")),
        borderRadius: px(resolved.num("appearance.radius", 0)),
        ...border,
      }}
    >
      {children}
    </div>
  );
};
