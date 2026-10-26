"use client";

/**
 * Vector buttons (ROADMAP Phase 40): edit a path point by point, combine shapes (union, subtract, intersect,
 * exclude) and flatten a shape into a path. Each runs the same command as its shortcut; a button is disabled when the
 * selection can't use it.
 */

import React from "react";
import { Combine, Network, PenLine, Spline, SquaresExclude, SquaresIntersect, SquaresSubtract, SquaresUnite } from "lucide-react";
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
  // FigCraft port F4: a path without a network can become one (then the paint bucket fills any closed area of it)
  const liveable = ids.filter((id) => layers[id] && ["rectangle", "ellipse", "polygon", "star", "svgPath", "container"].includes(layers[id].archetype)).length >= 2;
  const groupSelected = ids.some((id) => !!layers[id]?.properties["boolean.operation"]);
  const networkable = ids.some((id) => layers[id]?.archetype === "svgPath" && !layers[id].properties["svg.network"]);
  // the operation of a selected boolean group, or of selected operands (they share one, else "mixed")
  const opOf = (id: string) => {
    const l = layers[id];
    const parent = l?.parentId ? layers[l.parentId] : undefined;
    if (l?.properties["boolean.operation"]) return String(l.properties["boolean.operation"]);
    if (parent?.properties["boolean.operation"]) return String(l?.properties["boolean.operandOp"] || parent.properties["boolean.operation"]);
    return null;
  };
  const ops = ids.map(opOf);
  const shownOp = ops.length > 0 && ops[0] !== null && ops.every((o) => o === ops[0]) ? ops[0] : ops.some((o) => o !== null) ? "mixed" : null;
  if (!single && sources.length === 0 && !editing && !groupSelected && !shownOp) return null;
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
      {button("vector.makeNetwork", "Make vector network", Network, !editing && networkable)}
      <span style={{ width: 8 }} aria-hidden />
      {/* FigCraft port F5: a live boolean group keeps its operands editable; the plain buttons above bake the result */}
      {button("boolean.makeGroup", "Live boolean group (union)", Combine, !editing && liveable)}
      {button("boolean.flattenGroup", "Flatten boolean group", Spline, !editing && groupSelected)}
      {shownOp && (
        <select
          aria-label="Boolean operation"
          value={shownOp}
          onChange={(e) => void invokeCommand("boolean.setOperation", { operation: e.target.value })}
          style={{ marginLeft: 4 }}
        >
          {shownOp === "mixed" && <option value="mixed" disabled>Mixed</option>}
          <option value="union">Union</option>
          <option value="subtract">Subtract</option>
          <option value="intersect">Intersect</option>
          <option value="exclude">Exclude</option>
        </select>
      )}
    </div>
  );
};
