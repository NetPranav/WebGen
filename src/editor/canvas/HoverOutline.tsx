"use client";

import React from "react";
import { useHoverStore } from "@/core/store/useHoverStore";

/** An outline around the layer a click would select. One pixel on screen at any zoom. (Phase 23 draws this on the overlay layer.) */
export const HoverOutline: React.FC = () => {
  const rect = useHoverStore((s) => s.rect);
  const id = useHoverStore((s) => s.hoveredId);
  if (!rect) return null;
  return (
    <div
      className="canvas-hover-outline"
      data-hover-id={id ?? undefined}
      aria-hidden="true"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    />
  );
};
