"use client";

import React from "react";
import { isGrid } from "@/core/editing/layoutOps";
import { worldBox } from "@/core/editing/layerBoxes";
import { equalTracks, parseTracks, trackSpans } from "@/core/layout/grid";
import { useCameraStore } from "@/core/store/useCameraStore";
import { useDocument } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";

/**
 * The layout grid of a selected grid container (ROADMAP Phase 42), drawn over it: a tinted band for every column
 * and a line for the start of every row. Columns come from the track list (px and fr); rows from the row list, or,
 * when rows are automatic, from where the children are.
 */
export const GridOverlay: React.FC = () => {
  const ids = useSelectionStore((s) => s.selectedIds);
  const layers = useDocument((d) => d.layers);
  const zoom = useCameraStore((s) => s.camera.zoom) || 1;
  const grids = ids.map((id) => layers[id]).filter(isGrid);
  if (grids.length === 0) return null;
  const px = 1 / zoom;
  return (
    <svg data-testid="grid-overlay" style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "visible", pointerEvents: "none" }}>
      {grids.map((g) => {
        const box = worldBox(g.id);
        if (!box) return null;
        const p = g.properties;
        const n = (k: string) => (typeof p[k] === "number" ? (p[k] as number) : 0);
        const pad = { top: n("layout.paddingTop") || n("layout.padding"), right: n("layout.paddingRight") || n("layout.padding"), bottom: n("layout.paddingBottom") || n("layout.padding"), left: n("layout.paddingLeft") || n("layout.padding") };
        const gap = n("layout.gap");
        const colGap = typeof p["layout.columnGap"] === "number" ? n("layout.columnGap") : gap;
        const rowGap = typeof p["layout.rowGap"] === "number" ? n("layout.rowGap") : gap;
        const colsText = typeof p["layout.gridTemplateColumns"] === "string" && p["layout.gridTemplateColumns"] ? (p["layout.gridTemplateColumns"] as string) : equalTracks(n("layout.gridColumns") || 2);
        const colTracks = parseTracks(colsText);
        const rowTracks = typeof p["layout.gridTemplateRows"] === "string" ? parseTracks(p["layout.gridTemplateRows"] as string) : null;
        const left = box.cx - box.w / 2;
        const top = box.cy - box.h / 2;
        const cols = colTracks ? trackSpans(colTracks, box.w, colGap, pad.left, pad.right) : [];
        let rows: { pos: number; len: number }[] = [];
        if (rowTracks && rowTracks.every((t) => t.kind === "px")) rows = trackSpans(rowTracks, box.h, rowGap, pad.top, pad.bottom);
        else {
          // automatic rows: where the children's rows are
          const kids = g.children.map((id) => worldBox(id)).filter((b): b is NonNullable<typeof b> => b !== null).map((b) => ({ y: b.cy - b.h / 2 - top, h: b.h }));
          kids.sort((a, b) => a.y - b.y);
          for (const k of kids) {
            const last = rows[rows.length - 1];
            if (last && k.y < last.pos + last.len - 1) last.len = Math.max(last.len, k.y + k.h - last.pos);
            else rows.push({ pos: k.y, len: k.h });
          }
        }
        return (
          <g key={g.id}>
            {cols.map((c, i) => (
              <rect key={`c${i}`} data-testid={`grid-col-${i}`} x={left + c.pos} y={top + pad.top} width={c.len} height={Math.max(0, box.h - pad.top - pad.bottom)} fill="rgba(239,68,68,0.10)" stroke="rgba(239,68,68,0.45)" strokeWidth={px} />
            ))}
            {rows.map((r, i) => (
              <line key={`r${i}`} data-testid={`grid-row-${i}`} x1={left + pad.left} x2={left + box.w - pad.right} y1={top + r.pos} y2={top + r.pos} stroke="rgba(239,68,68,0.55)" strokeWidth={px} />
            ))}
          </g>
        );
      })}
    </svg>
  );
};
