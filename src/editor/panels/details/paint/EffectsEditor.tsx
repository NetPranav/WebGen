"use client";

/**
 * Strokes' pattern and effects (ROADMAP Phase 35): solid, dashed or dotted strokes; drop and inner shadows with
 * offset, blur, spread and colour; layer blur and background blur. Each change is a typed command (`paint.*`).
 */

import React, { useRef } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { documentCommands, useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { shadowsOf, strokeStyleOf, type StrokeStyle } from "@/core/paint/paintOps";
import { DEFAULT_SHADOW, type Shadow } from "@/core/paint/paints";
import { simplePaths } from "@/core/inspector/simpleControls";
import { resolveProps } from "@/core/render/resolve";
import { ColorPicker } from "./ColorPicker";
import { SwatchPopover } from "./SwatchPopover";
import { NumberField } from "../controls/NumberField";

const writeShadows = (shadows: Shadow[]) => void invokeCommand("paint.setShadows", { shadows });

export const StrokeStyleEditor: React.FC = () => {
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds);
  const id = ids.find((i) => layers[i] && simplePaths(layers[i].archetype).strokeColor);
  if (!id) return null;
  const current = strokeStyleOf(id);
  return (
    <div className="effects-block" role="group" aria-label="Stroke style">
      <div className="effects-block__head">Stroke style</div>
      <div className="effects-block__row" role="radiogroup" aria-label="Stroke pattern">
        {(["solid", "dashed", "dotted"] as StrokeStyle[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={current === s} className={`effects-chip ${current === s ? "effects-chip--on" : ""}`} onClick={() => void invokeCommand("paint.setStrokeStyle", { style: s })}>
            {s === "solid" ? "Solid" : s === "dashed" ? "Dashed" : "Dotted"}
          </button>
        ))}
      </div>
    </div>
  );
};

const ShadowRow: React.FC<{ shadows: Shadow[]; index: number }> = ({ shadows, index }) => {
  const s = shadows[index];
  const label = `Shadow ${index + 1}`;
  const tx = useRef<{ commit: () => void } | null>(null);
  const change = (patch: Partial<Shadow>) => writeShadows(shadows.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  return (
    <div className="shadow-row" role="group" aria-label={label}>
      <div className="shadow-row__main">
        <button type="button" className="paint-row__btn" aria-label={s.visible ? `Hide ${label}` : `Show ${label}`} aria-pressed={!s.visible} onClick={() => change({ visible: !s.visible })}>
          {s.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <select className="paint-row__type" aria-label={`${label} type`} value={s.kind} onChange={(e) => change({ kind: e.target.value as Shadow["kind"] })}>
          <option value="drop">Drop shadow</option>
          <option value="inner">Inner shadow</option>
        </select>
        <SwatchPopover label={`${label} colour`} swatch={s.color}>
          <ColorPicker
            value={s.color}
            onBegin={() => (tx.current ??= documentCommands.begin("Edit shadow"))}
            onEnd={() => {
              tx.current?.commit();
              tx.current = null;
            }}
            onChange={(color) => change({ color })}
          />
        </SwatchPopover>
        <button type="button" className="paint-row__btn" aria-label={`Remove ${label}`} onClick={() => writeShadows(shadows.filter((_, i) => i !== index))}><Trash2 size={12} /></button>
      </div>
      <div className="shadow-row__nums">
        <NumberField label={`${label} X`} badge="X" value={s.x} onCommit={(x) => change({ x })} />
        <NumberField label={`${label} Y`} badge="Y" value={s.y} onCommit={(y) => change({ y })} />
        <NumberField label={`${label} blur`} badge="B" min={0} max={200} value={s.blur} onCommit={(blur) => change({ blur })} />
        <NumberField label={`${label} spread`} badge="S" min={-100} max={100} value={s.spread} onCommit={(spread) => change({ spread })} />
      </div>
    </div>
  );
};

export const EffectsEditor: React.FC = () => {
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds);
  const id = ids.find((i) => layers[i] && layers[i].archetype !== "object3D" && layers[i].archetype !== "camera3D" && layers[i].archetype !== "light3D");
  if (!id) return null;
  const shadows = shadowsOf(id);
  const resolved = resolveProps(layers[id]);
  const layerBlur = Number(resolved.get("filter.blur") ?? 0) || 0;
  const backgroundBlur = Number(resolved.get("paint.backgroundBlur") ?? 0) || 0;
  return (
    <div className="effects-block" role="group" aria-label="Effects">
      <div className="effects-block__head">
        <span>Effects</span>
        <button type="button" className="paint-row__btn" aria-label="Add shadow" onClick={() => writeShadows([{ ...DEFAULT_SHADOW }, ...shadows])}><Plus size={13} /></button>
      </div>
      {shadows.map((_, i) => <ShadowRow key={i} shadows={shadows} index={i} />)}
      <div className="effects-block__row">
        <NumberField label="Layer blur" badge="Blur" min={0} max={200} value={layerBlur} onCommit={(layer) => void invokeCommand("paint.setBlur", { layer })} />
        <NumberField label="Background blur" badge="BG" min={0} max={200} value={backgroundBlur} onCommit={(background) => void invokeCommand("paint.setBlur", { background })} />
      </div>
    </div>
  );
};
