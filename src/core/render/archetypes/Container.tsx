import React from "react";
import { layerBoxStyle, px } from "../geometry";
import type { ArchetypeRenderProps } from "../types";

/** `container` and `form`: a flex box that lays out its children. */
export const Container: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, children }) => {
  const display = resolved.str("layout.display", "flex") === "grid" ? "grid" : "flex";
  const direction = resolved.str("layout.flexDirection", "column") === "row" ? "row" : "column";
  const padding = resolved.num("layout.padding", 0);
  return (
    <div
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
        backgroundColor: resolved.str("appearance.background.color", "transparent"),
        borderRadius: px(resolved.num("appearance.radius", 0)),
      }}
    >
      {children}
    </div>
  );
};
