"use client";

/**
 * Vector buttons (ROADMAP Phase 40): edit a path point by point, combine shapes (union, subtract, intersect,
 * exclude) and flatten a shape into a path. Each runs the same command as its shortcut; a button is disabled when the
 * selection can't use it.
 */

import React from "react";
import { PenLine, Spline, SquaresExclude, SquaresIntersect, SquaresSubtract, SquaresUnite } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { useDocument } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { useVectorEditStore } from "@/core/store/useVectorEditStore";

const SOURCES = new Set(["svgPath", "rectangle", "ellipse"]);

export const VectorBar: React.FC = () => {
  const ids = useSelectionStore((s) => s.selectedIds);
  const layers = useDocument((d) => d.layers);
  const editing = useVectorEditStore((s) => s.layerId !== null);
  const sources = ids.filter((id) => SOURCES.has(layers[id]?.archetype ?? ""));
  const single = ids.length === 1 && layers[ids[0]]?.archetype === "svgPath";
  const flattenable = sources.some((id) => layers[id].archetype !== "svgPath");
  if (!single && sources.length === 0 && !editing) return null;
  const button = (command: string, label: string, Icon: React.ComponentType<{ size?: number }>, enabled: boolean) => (
    <button key={command} type="button" className="panel-icon-btn" title={label} aria-label={label} disabled={!enabled} data-command={command} onClick={() => void invokeCommand(command)}>
      <Icon size={14} />
    </button>
  );
  return (
    <div className="vector-bar" role="toolbar" aria-label="Vector" style={{ display: "flex", gap: 2, padding: "6px 8px", flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))" }}>
      {button("path.edit", editing ? "Done editing path" : "Edit path", PenLine, editing || single)}
      <span style={{ width: 8 }} aria-hidden />
      {button("boolean.union", "Union selection", SquaresUnite, !editing && sources.length >= 2)}
      {button("boolean.subtract", "Subtract selection", SquaresSubtract, !editing && sources.length >= 2)}
      {button("boolean.intersect", "Intersect selection", SquaresIntersect, !editing && sources.length >= 2)}
      {button("boolean.exclude", "Exclude selection", SquaresExclude, !editing && sources.length >= 2)}
      <span style={{ width: 8 }} aria-hidden />
      {button("vector.flatten", "Flatten to path", Spline, !editing && flattenable)}
    </div>
  );
};
