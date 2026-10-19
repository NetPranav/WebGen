import React from "react";
import { layerBoxStyle } from "../geometry";
import { clampNumber } from "../limits";
import type { ArchetypeRenderProps } from "../types";

interface Stop {
  color: string;
  offset: number;
}

const BLEND = new Set(["normal", "multiply", "screen", "overlay", "darken", "lighten", "soft-light", "hard-light", "difference"]);

function stops(value: unknown): Stop[] {
  if (!Array.isArray(value)) return [];
  const out: Stop[] = [];
  for (const s of value.slice(0, 16)) {
    if (s && typeof s === "object" && !Array.isArray(s) && typeof (s as Stop).color === "string") {
      out.push({ color: (s as Stop).color, offset: clampNumber((s as Stop).offset, 0, 100, 0) });
    }
  }
  return out;
}

/** A `background` layer: a flat colour or a linear gradient. */
export const Background: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx }) => {
  const kind = resolved.str("background.type", "color");
  const color = resolved.str("background.color", "#0f172a");
  const list = stops(resolved.get("background.gradient.stops"));
  const angle = clampNumber(resolved.num("background.gradient.angle", 180), -360, 360, 180);
  const gradient = kind === "gradient" && list.length >= 2 ? `linear-gradient(${angle}deg, ${list.map((s) => `${s.color} ${s.offset}%`).join(", ")})` : undefined;
  const blend = resolved.str("background.blendMode", "normal");
  return (
    <div
      data-element-id={layer.id}
      data-archetype="background"
      style={{
        ...layerBoxStyle(layer, resolved, ctx),
        minWidth: 40,
        minHeight: 40,
        backgroundColor: color,
        backgroundImage: gradient,
        mixBlendMode: (BLEND.has(blend) ? blend : "normal") as React.CSSProperties["mixBlendMode"],
      }}
    />
  );
};
