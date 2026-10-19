import React from "react";
import { layerBoxStyle } from "../geometry";
import type { ArchetypeRenderProps } from "../types";

const SIZES = { sm: { w: 36, h: 20 }, md: { w: 44, h: 24 }, lg: { w: 56, h: 30 } } as const;

export const Toggle: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, nodeRef }) => {
  const key = resolved.str("toggle.size", "md");
  const { w, h } = SIZES[key === "sm" || key === "lg" ? key : "md"];
  const checked = resolved.bool("toggle.checked", false);
  const disabled = resolved.bool("interaction.disabled", false);
  const pad = 2;
  return (
    <span
      ref={nodeRef}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      data-element-id={layer.id}
      data-archetype="toggle"
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
        display: "inline-block",
        width: w,
        height: h,
        borderRadius: h,
        backgroundColor: checked ? resolved.str("toggle.activeColor", "#206859") : resolved.str("toggle.inactiveColor", "#e2e8f0"),
        opacity: disabled ? 0.5 : undefined,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: pad,
          left: checked ? w - h + pad : pad,
          width: h - pad * 2,
          height: h - pad * 2,
          borderRadius: "50%",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </span>
  );
};
