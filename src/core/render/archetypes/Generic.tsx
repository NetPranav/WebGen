import React from "react";
import { layerBoxStyle } from "../geometry";
import type { ArchetypeRenderProps } from "../types";

/** `generic`, and the fallback box for an archetype with nothing of its own to draw. */
export const Generic: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, children }) => (
  <div data-element-id={layer.id} data-archetype={layer.archetype} style={layerBoxStyle(layer, resolved, ctx)}>
    {children}
  </div>
);
