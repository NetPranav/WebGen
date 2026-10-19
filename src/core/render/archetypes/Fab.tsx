import React from "react";
import { layerBoxStyle } from "../geometry";
import { clampNumber } from "../limits";
import type { ArchetypeRenderProps } from "../types";

const ICONS: Record<string, string> = {
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  check: "M5 12l5 5L20 7",
  menu: "M4 7h16M4 12h16M4 17h16",
};

/** A circular floating action button with a small built-in icon set. */
export const Fab: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, nodeRef }) => {
  const size = clampNumber(resolved.num("button.size", 56), 16, 200, 56);
  const icon = ICONS[resolved.str("content.icon", "plus")] ?? ICONS.plus;
  const elevated = resolved.str("appearance.elevation", "lg") !== "none";
  return (
    <button
      ref={nodeRef}
      type="button"
      data-element-id={layer.id}
      data-archetype="fab"
      aria-label={layer.name}
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        border: "none",
        color: resolved.str("typography.color", "#ffffff"),
        backgroundColor: resolved.str("appearance.background.color", "#206859"),
        boxShadow: elevated ? "0 8px 24px rgba(15, 23, 42, 0.25)" : undefined,
        cursor: "pointer",
      }}
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={icon} />
      </svg>
    </button>
  );
};
