"use client";

/**
 * The Simple face of the Design inspector (ROADMAP Phase 33): position, size, fill, stroke, radius, opacity and
 * text, and nothing else, in plain words. Each control reads what the selected layers share ("Mixed" when they
 * differ) and writes through a typed command, one undo step. A control shows only for layers that have it.
 */

import React, { useState } from "react";
import { invokeCommand } from "@/core/commands";
import { readSimple, type SimpleReadout } from "@/core/inspector/simpleOps";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { NumberField } from "../controls/NumberField";
import { ColorField } from "../controls/ColorField";
import { PaintEditor } from "../paint/PaintEditor";
import "@/editor/styles/simple-face.css";

const run = (id: string, args: Record<string, unknown>) => void invokeCommand(id, args);

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

/** The face for the selection: re-reads when the document or the selection changes. */
export const SimpleFace: React.FC = () => {
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds);
  void layers;
  return <SimpleFaceView readout={readSimple(ids)} />;
};

/** The face for what a selection shares: no store, so it renders the same on a server and in a test. */
export const SimpleFaceView: React.FC<{ readout: SimpleReadout }> = ({ readout: r }) => {
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
          <ColorField label="Fill" value={r.fill} onCommit={(color) => run("layer.setFill", { color })} popover={r.paintList ? <PaintEditor /> : undefined} />
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
