import React from "react";
import { layerBoxStyle, px } from "../geometry";
import { clampText } from "../limits";
import type { ArchetypeRenderProps } from "../types";
import { fillStyle } from "../paintStyle";

/** A `button`. Hover and press looks come from states (Phase 78), not inline handlers. */
export const Button: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, nodeRef }) => {
  const raw = resolved.str("content.label", layer.name);
  const label = clampText(ctx.interpolate ? ctx.interpolate(raw) : raw);
  const disabled = resolved.bool("interaction.disabled", false);
  return (
    <button
      ref={nodeRef}
      type="button"
      data-element-id={layer.id}
      data-archetype="button"
      disabled={disabled}
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingInline: px(resolved.num("layout.paddingX", 20)),
        paddingBlock: px(resolved.num("layout.paddingY", 10)),
        fontSize: px(resolved.num("typography.fontSize", 14)),
        fontWeight: resolved.str("typography.fontWeight", "600"),
        color: resolved.str("typography.color", "#ffffff"),
        ...fillStyle(layer, resolved, resolved.str("appearance.background.color", "#206859")),
        border: "none",
        borderRadius: px(resolved.num("appearance.radius", 8)),
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : undefined,
        font: "inherit",
        fontFamily: "inherit",
      }}
    >
      <span>{label}</span>
    </button>
  );
};
