"use client";

import React from "react";
import { worldBox } from "@/core/editing/layerBoxes";
import { gridLines, parseLayoutGrids } from "@/core/layout/layoutGrids";
import { useCameraStore } from "@/core/store/useCameraStore";
import { useDocument } from "@/core/store/useDocumentStore";

/**
 * Layout grids (FigCraft port F6), drawn over every frame that has them: tinted bands for columns and rows, hairlines
 * for a square grid. Editor-only (the overlay never reaches an export). Like FigCraft, a frame turned off 0° shows none.
 */
export const LayoutGridsOverlay: React.FC = () => {
  // select the layers map itself (a stable reference between edits), then filter: a selector building a new array every call would re-render forever
  const layers = useDocument((d) => d.layers);
  const framed = Object.values(layers).filter((l) => typeof l.properties["frame.layoutGrids"] === "string" && l.properties["frame.layoutGrids"] !== "");
  const zoom = useCameraStore((s) => s.camera.zoom) || 1;
  if (framed.length === 0) return null;
  return (
    <svg data-testid="layout-grids-overlay" style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "visible", pointerEvents: "none" }}>
      {framed.map((f) => {
        const box = worldBox(f.id);
        if (!box || box.rot !== 0) return null;
        const left = box.cx - box.w / 2;
        const top = box.cy - box.h / 2;
        return (
          <g key={f.id} data-layout-grids={f.id} transform={`translate(${left} ${top})`}>
            {parseLayoutGrids(f.properties["frame.layoutGrids"])
              .filter((g) => g.visible)
              .map((g, gi) =>
                gridLines(g, box.w, box.h).map((r, i) =>
                  g.kind === "grid" ? (
                    <line key={`${gi}-${i}`} x1={r.x0} y1={r.y0} x2={r.x1} y2={r.y1} stroke={g.color} strokeWidth={1 / zoom} />
                  ) : (
                    <rect key={`${gi}-${i}`} x={r.x0} y={r.y0} width={Math.max(0, r.x1 - r.x0)} height={Math.max(0, r.y1 - r.y0)} fill={g.color} />
                  ),
                ),
              )}
          </g>
        );
      })}
    </svg>
  );
};
