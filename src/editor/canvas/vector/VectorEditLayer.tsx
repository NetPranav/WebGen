"use client";

import React from "react";
import { nodesToPathData } from "@/core/paths/pathFit";
import { useCameraStore } from "@/core/store/useCameraStore";
import { useVectorEditStore } from "@/core/store/useVectorEditStore";

/**
 * Path edit mode's overlay (ROADMAP Phase 40): the path being edited as an outline, its nodes (selected ones filled),
 * and the bezier handles of the selected nodes. In canvas space, sized in screen pixels by the camera's zoom.
 */
/** One node's square. Memoised, so dragging one node of a path of hundreds re-renders that one and not the rest. */
const NodeMark = React.memo(function NodeMark({ i, x, y, selected, px }: { i: number; x: number; y: number; selected: boolean; px: number }) {
  return <rect data-testid={`node-${i}`} data-selected={selected ? "true" : "false"} x={x - 4 * px} y={y - 4 * px} width={8 * px} height={8 * px} fill={selected ? "#2563eb" : "#fff"} stroke="#2563eb" strokeWidth={px} />;
});

export const VectorEditLayer: React.FC = () => {
  const { layerId, nodes, closed, selected } = useVectorEditStore();
  const zoom = useCameraStore((s) => s.camera.zoom) || 1;
  if (!layerId) return null;
  const px = 1 / zoom;
  const blue = "#2563eb";
  return (
    <svg data-testid="vector-edit" style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "visible", pointerEvents: "none" }}>
      <path d={nodesToPathData(nodes, closed)} fill="none" stroke={blue} strokeWidth={1.5 * px} />
      {selected.map((i) => {
        const n = nodes[i];
        if (!n) return null;
        return (
          <g key={`h${i}`}>
            {n.hin && <line x1={n.x} y1={n.y} x2={n.hin.x} y2={n.hin.y} stroke={blue} strokeWidth={px} />}
            {n.hout && <line x1={n.x} y1={n.y} x2={n.hout.x} y2={n.hout.y} stroke={blue} strokeWidth={px} />}
            {n.hin && <circle data-testid={`handle-${i}-in`} cx={n.hin.x} cy={n.hin.y} r={3.5 * px} fill="#fff" stroke={blue} strokeWidth={px} />}
            {n.hout && <circle data-testid={`handle-${i}-out`} cx={n.hout.x} cy={n.hout.y} r={3.5 * px} fill="#fff" stroke={blue} strokeWidth={px} />}
          </g>
        );
      })}
      {nodes.map((n, i) => (
        <NodeMark key={i} i={i} x={n.x} y={n.y} selected={selected.includes(i)} px={px} />
      ))}
    </svg>
  );
};
