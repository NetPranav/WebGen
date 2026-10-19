import React from "react";
import { layerBoxStyle, px } from "../geometry";
import { clampText } from "../limits";
import type { ArchetypeRenderProps } from "../types";

export const Text: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, nodeRef }) => {
  const raw = resolved.str("content.text", layer.name);
  const text = clampText(ctx.interpolate ? ctx.interpolate(raw) : raw);
  const align = resolved.str("typography.textAlign", "left");
  return (
    <div
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype="text"
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
        margin: 0,
        fontSize: px(resolved.num("typography.fontSize", 16)),
        fontWeight: resolved.str("typography.fontWeight", "400"),
        fontFamily: resolved.str("typography.fontFamily", "inherit"),
        color: resolved.str("typography.color", "#0f172a"),
        textAlign: align === "center" || align === "right" || align === "justify" ? align : "left",
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      {text}
    </div>
  );
};
