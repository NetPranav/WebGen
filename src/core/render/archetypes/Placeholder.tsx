import React from "react";
import { layerBoxStyle } from "../geometry";
import type { ArchetypeRenderProps } from "../types";

const LABELS: Record<string, string> = {
  effectSurface: "Effect surface",
  object3D: "3D object",
  camera3D: "3D camera",
  light3D: "3D light",
};

/**
 * Effect surfaces and 3D scene layers have no 2D drawing until their own stages
 * (3: effects, 4: 3D). Until then they draw a labelled, dashed box, so a layer
 * of that kind is visible and selectable instead of vanishing.
 */
export const Placeholder: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, children, nodeRef }) => (
  <div
    ref={nodeRef}
    data-element-id={layer.id}
    data-archetype={layer.archetype}
    data-placeholder="true"
    style={{
      ...layerBoxStyle(layer, resolved, ctx),
      minWidth: 120,
      minHeight: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px dashed #94a3b8",
      borderRadius: 6,
      color: "#64748b",
      fontSize: 12,
      background: "repeating-linear-gradient(45deg, #f8fafc, #f8fafc 8px, #f1f5f9 8px, #f1f5f9 16px)",
    }}
  >
    {LABELS[layer.archetype] ?? layer.archetype}
    {children}
  </div>
);
