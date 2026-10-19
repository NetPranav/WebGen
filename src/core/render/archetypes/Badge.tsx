import React from "react";
import { layerBoxStyle, px } from "../geometry";
import { clampText } from "../limits";
import type { ArchetypeRenderProps } from "../types";

export const Badge: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx }) => {
  const raw = resolved.str("content.label", layer.name);
  const label = clampText(ctx.interpolate ? ctx.interpolate(raw) : raw);
  const outlined = resolved.str("appearance.variant", "filled") === "outline";
  const color = resolved.str("typography.color", "#206859");
  return (
    <span
      data-element-id={layer.id}
      data-archetype="badge"
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
        display: "inline-flex",
        alignItems: "center",
        paddingInline: px(resolved.num("layout.paddingX", 12)),
        paddingBlock: px(resolved.num("layout.paddingY", 4)),
        fontSize: px(resolved.num("typography.fontSize", 12)),
        fontWeight: 600,
        color,
        backgroundColor: outlined ? "transparent" : resolved.str("appearance.background.color", "#e6f4f1"),
        border: outlined ? `1px solid ${color}` : undefined,
        borderRadius: px(resolved.num("appearance.radius", 16)),
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
};
