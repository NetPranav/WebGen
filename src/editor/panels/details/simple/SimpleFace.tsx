"use client";

/**
 * The Simple face of the Design inspector (ROADMAP Phase 33): position, size, fill, stroke, radius, opacity and
 * text, and nothing else, in plain words. Each control reads what the selected layers share ("Mixed" when they
 * differ) and writes through a typed command, one undo step. A control shows only for layers that have it.
 */

import React, { useState } from "react";
import { invokeCommand } from "@/core/commands";
import { readSimple } from "@/core/inspector/simpleOps";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { NumberField } from "../controls/NumberField";
import "@/editor/styles/simple-face.css";

const run = (id: string, args: Record<string, unknown>) => void invokeCommand(id, args);

/** A colour as the swatch needs it: `#rrggbb`, or black for anything else. */
const swatchValue = (v: string | null | undefined): string => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : typeof v === "string" && /^#[0-9a-fA-F]{3}$/.test(v) ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : "#000000");

const ColorField: React.FC<{ label: string; value: string | null | undefined; onCommit: (color: string) => void }> = ({ label, value, onCommit }) => (
  <ColorInput key={value === null ? "mixed" : String(value)} label={label} value={value} onCommit={onCommit} />
);

const ColorInput: React.FC<{ label: string; value: string | null | undefined; onCommit: (color: string) => void }> = ({ label, value, onCommit }) => {
  const [text, setText] = useState(value === null || value === undefined ? "" : value);
  const commit = () => {
    const t = text.trim();
    if (t !== "" && t !== value) onCommit(t);
    else setText(value === null || value === undefined ? "" : value);
  };
  return (
    <span className="simple-color">
      <input type="color" aria-label={`${label} colour`} value={swatchValue(value)} onChange={(e) => onCommit(e.target.value)} />
      <input
        type="text"
        aria-label={label}
        placeholder={value === null ? "Mixed" : undefined}
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
    </span>
  );
};

const TextField: React.FC<{ value: string | null | undefined; onCommit: (text: string) => void }> = ({ value, onCommit }) => (
  <TextInput key={value === null ? "mixed" : String(value)} value={value} onCommit={onCommit} />
);

const TextInput: React.FC<{ value: string | null | undefined; onCommit: (text: string) => void }> = ({ value, onCommit }) => {
  const [text, setText] = useState(value === null || value === undefined ? "" : value);
  return (
    <textarea
      className="simple-text"
      aria-label="Text"
      rows={2}
      placeholder={value === null ? "Mixed" : undefined}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && !(value === null && text === "") && onCommit(text)}
      onKeyDown={(e) => {
        e.stopPropagation(); // typing words is not a shortcut
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.target as HTMLTextAreaElement).blur();
      }}
    />
  );
};

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="simple-group" role="group" aria-label={title}>
    <div className="simple-group__title">{title}</div>
    <div className="simple-group__body">{children}</div>
  </div>
);

export const SimpleFace: React.FC = () => {
  const layers = useLayers(); // re-reads when the document changes
  const ids = useSelectionStore((s) => s.selectedIds);
  void layers;
  const r = readSimple(ids);
  if (!Object.values(r.has).some(Boolean)) return <div className="simple-face simple-face--empty">Select a layer to change it.</div>;
  return (
    <div className="simple-face" role="form" aria-label="Design">
      {r.has.position && (
        <Group title="Position">
          <NumberField label="X" badge="X" value={r.x} onCommit={(x) => run("layer.setFrame", { x })} />
          <NumberField label="Y" badge="Y" value={r.y} onCommit={(y) => run("layer.setFrame", { y })} />
        </Group>
      )}
      {r.has.size && (
        <Group title="Size">
          <NumberField label="Width" badge="W" min={1} value={r.width} onCommit={(width) => run("layer.setFrame", { width })} />
          <NumberField label="Height" badge="H" min={1} value={r.height} onCommit={(height) => run("layer.setFrame", { height })} />
        </Group>
      )}
      {r.has.fill && (
        <Group title="Fill">
          <ColorField label="Fill" value={r.fill} onCommit={(color) => run("layer.setFill", { color })} />
        </Group>
      )}
      {r.has.stroke && (
        <Group title="Stroke">
          <ColorField label="Stroke" value={r.strokeColor} onCommit={(color) => run("layer.setStroke", { color })} />
          <NumberField label="Stroke width" badge="W" min={0} max={200} step={0.5} value={r.strokeWidth} onCommit={(width) => run("layer.setStroke", { width })} />
        </Group>
      )}
      {r.has.radius && (
        <Group title="Corner radius">
          <NumberField label="Radius" min={0} value={r.radius} onCommit={(radius) => run("layer.setRadius", { radius })} />
        </Group>
      )}
      {r.has.opacity && (
        <Group title="Opacity">
          <NumberField label="Opacity" min={0} max={100} value={r.opacity === null || r.opacity === undefined ? r.opacity : Math.round(r.opacity * 100)} onCommit={(pct) => run("layer.setOpacity", { opacity: pct / 100 })} />
          <span className="simple-field__unit" aria-hidden>%</span>
        </Group>
      )}
      {r.has.text && (
        <Group title="Text">
          <TextField value={r.text} onCommit={(text) => run("layer.setText", { text })} />
        </Group>
      )}
    </div>
  );
};
