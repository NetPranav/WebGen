"use client";

/**
 * Grid and constraint controls (ROADMAP Phase 42). For a container: turn it into a grid, then its columns, rows,
 * gaps and track lists; for a layer inside a grid: its column and row start and span; for a free layer inside a
 * frame: how it follows the frame when the frame is resized (its constraints). Each control runs a command.
 */

import React from "react";
import { invokeCommand } from "@/core/commands";
import { isAutoLayout, isGrid, placesChildren } from "@/core/editing/layoutOps";
import { readHorizontal, readVertical } from "@/core/layout/constraints";
import { useDocument } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { NumberField } from "./controls/NumberField";

const run = (command: string, args?: unknown) => void invokeCommand(command, args);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

const Segmented: React.FC<{ label: string; value: string; options: { value: string; label: string }[]; onPick: (v: string) => void }> = ({ label, value, options, onPick }) => (
  <div role="group" aria-label={label} style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
    {options.map((o) => (
      <button key={o.value} type="button" className="panel-icon-btn panel-text-btn" aria-pressed={value === o.value} aria-label={`${label}: ${o.label}`} title={`${label}: ${o.label}`} style={{ fontSize: 11, padding: "2px 6px", fontWeight: value === o.value ? 600 : 400, opacity: value === o.value ? 1 : 0.7 }} onClick={() => onPick(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);

const H_OPTIONS = [
  { value: "start", label: "Left" },
  { value: "end", label: "Right" },
  { value: "both", label: "Left & right" },
  { value: "center", label: "Center" },
  { value: "scale", label: "Scale" },
];
const V_OPTIONS = [
  { value: "start", label: "Top" },
  { value: "end", label: "Bottom" },
  { value: "both", label: "Top & bottom" },
  { value: "center", label: "Center" },
  { value: "scale", label: "Scale" },
];

const box: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))" };

export const GridPanel: React.FC = () => {
  const ids = useSelectionStore((s) => s.selectedIds);
  const layers = useDocument((d) => d.layers);
  const selected = ids.map((id) => layers[id]).filter(Boolean);
  const grids = selected.filter(isGrid);
  const inGrid = selected.filter((l) => l.parentId && isGrid(layers[l.parentId]));
  const canAdd = grids.length === 0 && selected.length === 1 && selected[0].archetype === "container" && !isAutoLayout(selected[0]);
  if (grids.length === 0 && inGrid.length === 0 && !canAdd) return null;
  const g = grids[0];
  const same = (read: (l: (typeof grids)[number]) => number) => (grids.length > 0 && grids.every((l) => read(l) === read(grids[0])) ? read(grids[0]) : null);
  const cell = (key: string, d: number) => (inGrid.length > 0 && inGrid.every((l) => num(l.properties[key], d) === num(inGrid[0].properties[key], d)) ? num(inGrid[0].properties[key], d) : null);
  return (
    <section aria-label="Grid" style={box}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ fontSize: 11 }}>Grid</strong>
        {grids.length > 0 ? (
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Remove grid" onClick={() => run("layout.removeGrid")}>
            Remove
          </button>
        ) : (
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Add grid" onClick={() => run("layout.addGrid")}>
            Add
          </button>
        )}
      </div>
      {g && (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <NumberField label="Columns" badge="C" min={1} max={200} value={same((l) => num(l.properties["layout.gridColumns"], 2))} onCommit={(n) => run("layout.setGrid", { columns: n })} />
            <NumberField label="Rows" badge="R" min={1} max={200} value={same((l) => num(l.properties["layout.gridRows"], 0)) || null} onCommit={(n) => run("layout.setGrid", { rows: n })} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <NumberField label="Column gap" badge="CG" min={0} value={same((l) => num(l.properties["layout.columnGap"], num(l.properties["layout.gap"])))} onCommit={(n) => run("layout.setGrid", { columnGap: n })} />
            <NumberField label="Row gap" badge="RG" min={0} value={same((l) => num(l.properties["layout.rowGap"], num(l.properties["layout.gap"])))} onCommit={(n) => run("layout.setGrid", { rowGap: n })} />
          </div>
          <label className="simple-field" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
            Columns
            <input
              key={String(g.properties["layout.gridTemplateColumns"])}
              aria-label="Column tracks"
              defaultValue={typeof g.properties["layout.gridTemplateColumns"] === "string" ? (g.properties["layout.gridTemplateColumns"] as string) : ""}
              placeholder="repeat(3, 1fr)"
              style={{ flex: 1, minWidth: 0 }}
              onBlur={(e) => run("layout.setGrid", { columnsTemplate: e.target.value.trim() })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </label>
        </>
      )}
      {inGrid.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <NumberField label="Column start" badge="CS" min={0} max={200} value={cell("layout.gridColumnStart", 0)} onCommit={(n) => run("layout.setGridCell", { columnStart: n, ids: inGrid.map((l) => l.id) })} />
            <NumberField label="Column span" badge="C↔" min={1} max={200} value={cell("layout.gridColumnSpan", 1)} onCommit={(n) => run("layout.setGridCell", { columnSpan: n, ids: inGrid.map((l) => l.id) })} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <NumberField label="Row start" badge="RS" min={0} max={200} value={cell("layout.gridRowStart", 0)} onCommit={(n) => run("layout.setGridCell", { rowStart: n, ids: inGrid.map((l) => l.id) })} />
            <NumberField label="Row span" badge="R↕" min={1} max={200} value={cell("layout.gridRowSpan", 1)} onCommit={(n) => run("layout.setGridCell", { rowSpan: n, ids: inGrid.map((l) => l.id) })} />
          </div>
        </>
      )}
    </section>
  );
};

export const ConstraintsPanel: React.FC = () => {
  const ids = useSelectionStore((s) => s.selectedIds);
  const layers = useDocument((d) => d.layers);
  const free = ids.map((id) => layers[id]).filter((l) => l && l.parentId && l.properties.positioning === "absolute" && !placesChildren(layers[l.parentId]));
  if (free.length === 0) return null;
  const h = free.every((l) => readHorizontal(l.properties["constraints.horizontal"]) === readHorizontal(free[0].properties["constraints.horizontal"])) ? readHorizontal(free[0].properties["constraints.horizontal"]) : "";
  const v = free.every((l) => readVertical(l.properties["constraints.vertical"]) === readVertical(free[0].properties["constraints.vertical"])) ? readVertical(free[0].properties["constraints.vertical"]) : "";
  const only = free.map((l) => l.id);
  return (
    <section aria-label="Constraints" style={box}>
      <strong style={{ fontSize: 11 }}>Constraints</strong>
      <Segmented label="Horizontal" value={h} options={H_OPTIONS} onPick={(value) => run("layout.setConstraints", { horizontal: value, ids: only })} />
      <Segmented label="Vertical" value={v} options={V_OPTIONS} onPick={(value) => run("layout.setConstraints", { vertical: value, ids: only })} />
    </section>
  );
};
