"use client";

/**
 * Layout grids of a frame (FigCraft port F6): add a 12-column grid, rows or a square grid, change each one's kind,
 * count, gutter, size, offset and alignment, hide or remove it. Each change is the `layout.setLayoutGrids` command.
 */

import React from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { columnsGrid, parseLayoutGrids, type GridAlign, type GridKind, type LayoutGrid } from "@/core/layout/layoutGrids";
import { useDocument } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { NumberField } from "./controls/NumberField";

export const LayoutGridsPanel: React.FC = () => {
  const ids = useSelectionStore((s) => s.selectedIds);
  const layers = useDocument((d) => d.layers);
  const frame = ids.length === 1 && layers[ids[0]]?.archetype === "container" ? layers[ids[0]] : null;
  if (!frame) return null;
  const grids = parseLayoutGrids(frame.properties["frame.layoutGrids"]);
  const write = (next: LayoutGrid[]) => void invokeCommand("layout.setLayoutGrids", { ids: [frame.id], grids: next });
  const change = (i: number, patch: Partial<LayoutGrid>) => write(grids.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  return (
    <section aria-label="Layout grids" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 11 }}>Layout grids</strong>
        <button type="button" className="panel-icon-btn" aria-label="Add layout grid" onClick={() => write([...grids, columnsGrid(12)])}>
          <Plus size={13} />
        </button>
      </div>
      {grids.map((g, i) => (
        <div key={i} role="group" aria-label={`Layout grid ${i + 1}`} style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <button type="button" className="panel-icon-btn" aria-label={g.visible ? `Hide layout grid ${i + 1}` : `Show layout grid ${i + 1}`} onClick={() => change(i, { visible: !g.visible })}>
            {g.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <select aria-label={`Layout grid ${i + 1} kind`} value={g.kind} onChange={(e) => change(i, { kind: e.target.value as GridKind })}>
            <option value="columns">Columns</option>
            <option value="rows">Rows</option>
            <option value="grid">Grid</option>
          </select>
          {g.kind === "grid" ? (
            <NumberField label={`Layout grid ${i + 1} size`} badge="Size" min={1} value={g.size} onCommit={(size) => change(i, { size })} />
          ) : (
            <>
              <NumberField label={`Layout grid ${i + 1} count`} badge="N" min={0} max={500} value={g.count} onCommit={(count) => change(i, { count: Math.round(count) })} />
              <NumberField label={`Layout grid ${i + 1} gutter`} badge="Gut" min={0} value={g.gutter} onCommit={(gutter) => change(i, { gutter })} />
              <NumberField label={`Layout grid ${i + 1} offset`} badge="Off" min={0} value={g.offset} onCommit={(offset) => change(i, { offset })} />
              <select aria-label={`Layout grid ${i + 1} type`} value={g.align} onChange={(e) => change(i, { align: e.target.value as GridAlign })}>
                <option value="stretch">Stretch</option>
                <option value="min">{g.kind === "columns" ? "Left" : "Top"}</option>
                <option value="center">Centre</option>
                <option value="max">{g.kind === "columns" ? "Right" : "Bottom"}</option>
              </select>
              {g.align !== "stretch" && <NumberField label={`Layout grid ${i + 1} width`} badge="W" min={1} value={g.size || 60} onCommit={(size) => change(i, { size })} />}
            </>
          )}
          <button type="button" className="panel-icon-btn" aria-label={`Remove layout grid ${i + 1}`} onClick={() => write(grids.filter((_, j) => j !== i))}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </section>
  );
};
