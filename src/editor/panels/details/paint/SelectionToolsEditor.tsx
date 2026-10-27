"use client";

/**
 * Working on the whole selection (FigCraft port F12): its colours (every solid and gradient paint it uses, its
 * descendants' and text runs' included; change one and every layer showing it follows, or select those layers), the
 * gaps between its columns and rows, and renaming its layers at once (find and replace, a pattern with `$n` numbers).
 */

import React, { useRef, useState } from "react";
import { invokeCommand, tryRunCommand } from "@/core/commands";
import { documentCommands, useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { selectionColors, selectionSpacing, type SelectionColor } from "@/core/editing/selectionTools";
import { ColorPicker } from "./ColorPicker";
import { SwatchPopover } from "./SwatchPopover";
import { NumberField } from "../controls/NumberField";

const ColorRow: React.FC<{ color: SelectionColor; index: number }> = ({ color, index }) => {
  const tx = useRef<{ commit: () => void } | null>(null);
  const label = `Selection colour ${index + 1}`;
  const solid = color.paint.type === "solid" ? color.paint.color : null;
  return (
    <li data-selection-color={color.key.slice(0, 40)} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
      {solid ? (
        <SwatchPopover label={label} swatch={solid}>
          <ColorPicker
            value={solid}
            onBegin={() => (tx.current ??= documentCommands.begin("Selection colour"))}
            onEnd={() => {
              tx.current?.commit();
              tx.current = null;
            }}
            onChange={(c) => void invokeCommand("selection.setPaint", { targets: color.targets, paint: { type: "solid", color: c, opacity: 1, visible: true } })}
          />
        </SwatchPopover>
      ) : (
        <span aria-label={label} style={{ width: 16, height: 16, borderRadius: 3, background: "linear-gradient(90deg,#999,#eee)" }} />
      )}
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{solid ?? "Gradient"}</span>
      <span style={{ opacity: 0.6 }}>{color.targets.length}</span>
      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Select layers with ${label}`} onClick={() => void invokeCommand("selection.selectColor", { targets: color.targets })}>
        Select
      </button>
    </li>
  );
};

export const SelectionToolsEditor: React.FC = () => {
  useLayers(); // re-read on every change
  const ids = useSelectionStore((s) => s.selectedIds);
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [pattern, setPattern] = useState("");
  const [regex, setRegex] = useState(false);
  const [error, setError] = useState("");
  if (ids.length === 0) return null;
  // a very large selection skips the colours and spacing (they read every layer on each change)
  const small = ids.length <= 200;
  const colors = small ? selectionColors(ids).slice(0, 24) : [];
  const spacing = small && ids.length > 1 ? selectionSpacing(ids) : { horizontal: null, vertical: null };
  const rename = () => {
    const r = tryRunCommand("selection.rename", { find, replace, pattern, regex });
    const res = r.ok ? (r.result as { error?: string }) : { error: "could not rename" };
    setError(res.error ?? "");
  };
  const stop = (e: React.KeyboardEvent) => e.stopPropagation();
  return (
    <div className="effects-block" role="group" aria-label="Selection">
      <div className="effects-block__head">Selection</div>
      {colors.length > 0 && (
        <ul aria-label="Selection colours" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {colors.map((c, i) => (
            <ColorRow key={`${c.key}:${c.variable ?? ""}`} color={c} index={i} />
          ))}
        </ul>
      )}
      {(spacing.horizontal || spacing.vertical) && (
        <div className="effects-block__row">
          {spacing.horizontal && <NumberField label="Horizontal spacing" badge="↔" value={spacing.horizontal.value ?? null} onCommit={(horizontal) => void invokeCommand("arrange.spacing", { horizontal })} />}
          {spacing.vertical && <NumberField label="Vertical spacing" badge="↕" value={spacing.vertical.value ?? null} onCommit={(vertical) => void invokeCommand("arrange.spacing", { vertical })} />}
        </div>
      )}
      <div className="effects-block__row" style={{ flexWrap: "wrap" }}>
        <input aria-label="Rename: find" placeholder="Find" value={find} style={{ width: 70 }} onChange={(e) => setFind(e.target.value)} onKeyDown={stop} />
        <input aria-label="Rename: replace with" placeholder="Replace" value={replace} style={{ width: 70 }} onChange={(e) => setReplace(e.target.value)} onKeyDown={stop} />
        <input aria-label="Rename: whole name" placeholder="Name ($n)" value={pattern} style={{ width: 80 }} onChange={(e) => setPattern(e.target.value)} onKeyDown={stop} />
        <label style={{ display: "flex", gap: 3, alignItems: "center", fontSize: 11 }}>
          <input type="checkbox" aria-label="Rename: regular expression" checked={regex} onChange={(e) => setRegex(e.target.checked)} />
          .*
        </label>
        <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Rename selected layers" disabled={!find && !pattern} onClick={rename}>
          Rename
        </button>
      </div>
      {error && <span role="alert" style={{ color: "#dc2626", fontSize: 11 }}>{error}</span>}
    </div>
  );
};
