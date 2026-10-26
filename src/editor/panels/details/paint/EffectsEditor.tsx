"use client";

/**
 * Strokes' pattern and effects (ROADMAP Phase 35): solid, dashed or dotted strokes; drop and inner shadows with
 * offset, blur, spread and colour; layer blur and background blur. Each change is a typed command (`paint.*`).
 * FigCraft port F7: an effect list beside them (`paint.setEffects`): blurs that can be progressive, noise, texture and
 * glass, each with its own settings.
 */

import React, { useRef } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { documentCommands, useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { effectsOf, shadowsOf, strokeStyleOf, type StrokeStyle } from "@/core/paint/paintOps";
import { EFFECT_TYPES, effectLabel, effectOfType, type Effect } from "@/core/paint/effects";
import { BLEND_MODES, blendLabel } from "@/core/paint/color";
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

const writeEffects = (effects: Effect[]) => void invokeCommand("paint.setEffects", { effects });

/** One effect of the list (FigCraft port F7): show or hide, remove, and its own settings. */
const EffectRow: React.FC<{ effects: Effect[]; index: number }> = ({ effects, index }) => {
  const e = effects[index];
  const label = `Effect ${index + 1}`;
  const tx = useRef<{ commit: () => void } | null>(null);
  const change = (patch: Partial<Effect>) => writeEffects(effects.map((x, i) => (i === index ? ({ ...x, ...patch } as Effect) : x)));
  /** A number setting; `percent` ones are stored 0–1 and shown 0–100. */
  const num = (name: string, field: string, value: number, opts: { min?: number; max?: number; step?: number; badge?: string; percent?: boolean } = {}) => (
    <NumberField
      key={field}
      label={`${label} ${name}`}
      badge={opts.badge ?? name.slice(0, 2)}
      min={opts.percent ? 0 : opts.min}
      max={opts.percent ? 100 : opts.max}
      step={opts.step}
      value={opts.percent ? Math.round(value * 100) : value}
      onCommit={(v) => change({ [field]: opts.percent ? v / 100 : v } as Partial<Effect>)}
    />
  );
  const color = (name: string, field: "color" | "secondary", value: string) => (
    <SwatchPopover key={field} label={`${label} ${name}`} swatch={value}>
      <ColorPicker
        value={value}
        onBegin={() => (tx.current ??= documentCommands.begin("Edit effect"))}
        onEnd={() => {
          tx.current?.commit();
          tx.current = null;
        }}
        onChange={(c) => change({ [field]: c } as Partial<Effect>)}
      />
    </SwatchPopover>
  );
  let fields: React.ReactNode = null;
  if (e.type === "layerBlur" || e.type === "backgroundBlur") {
    fields = (
      <>
        <select className="paint-row__type" aria-label={`${label} blur type`} value={e.blurType} onChange={(ev) => change({ blurType: ev.target.value as "uniform" | "progressive" })}>
          <option value="uniform">Uniform</option>
          <option value="progressive">Progressive</option>
        </select>
        {num("radius", "radius", e.radius, { min: 0, max: 200, badge: "R" })}
        {e.blurType === "progressive" && (
          <>
            {num("start radius", "startRadius", e.startRadius, { min: 0, max: 200, badge: "R0" })}
            <NumberField label={`${label} start Y`} badge="Y0" min={0} max={100} value={Math.round(e.start[1] * 100)} onCommit={(v) => change({ start: [e.start[0], v / 100] })} />
            <NumberField label={`${label} end Y`} badge="Y1" min={0} max={100} value={Math.round(e.end[1] * 100)} onCommit={(v) => change({ end: [e.end[0], v / 100] })} />
          </>
        )}
      </>
    );
  } else if (e.type === "noise") {
    fields = (
      <>
        <select className="paint-row__type" aria-label={`${label} noise mode`} value={e.mode} onChange={(ev) => change({ mode: ev.target.value as "mono" | "duo" | "multi" })}>
          <option value="mono">Mono</option>
          <option value="duo">Duo</option>
          <option value="multi">Multi</option>
        </select>
        {num("size", "size", e.size, { min: 0.01, max: 1000, step: 0.25, badge: "S" })}
        {num("density", "density", e.density, { percent: true, badge: "D" })}
        {e.mode !== "multi" && color("colour", "color", e.color)}
        {e.mode === "duo" && color("second colour", "secondary", e.secondary)}
        {e.mode === "multi" && num("opacity", "opacity", e.opacity, { percent: true, badge: "%" })}
        <select className="paint-row__type" aria-label={`${label} blend`} value={e.blend} onChange={(ev) => change({ blend: ev.target.value as typeof e.blend })}>
          {BLEND_MODES.map((m) => (
            <option key={m} value={m}>
              {blendLabel(m)}
            </option>
          ))}
        </select>
      </>
    );
  } else if (e.type === "texture") {
    fields = (
      <>
        {num("size", "size", e.size, { min: 0.01, max: 1000, step: 0.25, badge: "S" })}
        {num("radius", "radius", e.radius, { min: 0, max: 1000, badge: "R" })}
        <label className="effects-block__check">
          <input type="checkbox" aria-label={`${label} clip to shape`} checked={e.clipToShape} onChange={(ev) => change({ clipToShape: ev.target.checked })} />
          Clip
        </label>
      </>
    );
  } else if (e.type === "glass") {
    fields = (
      <>
        {num("light angle", "lightAngle", e.lightAngle, { min: -360, max: 360, badge: "∠" })}
        {num("light", "lightIntensity", e.lightIntensity, { percent: true, badge: "L" })}
        {num("refraction", "refraction", e.refraction, { percent: true, badge: "Rf" })}
        {num("depth", "depth", e.depth, { min: 1, max: 1000, badge: "D" })}
        {num("dispersion", "dispersion", e.dispersion, { percent: true, badge: "Ds" })}
        {num("frost", "frost", e.frost, { min: 0, max: 200, badge: "F" })}
        {num("splay", "splay", e.splay, { percent: true, badge: "Sp" })}
      </>
    );
  }
  return (
    <div className="shadow-row" role="group" aria-label={label} data-effect={e.type}>
      <div className="shadow-row__main">
        <button type="button" className="paint-row__btn" aria-label={e.visible ? `Hide ${label}` : `Show ${label}`} aria-pressed={!e.visible} onClick={() => change({ visible: !e.visible })}>
          {e.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <span className="paint-row__type">{effectLabel(e)}</span>
        <button type="button" className="paint-row__btn" aria-label={`Remove ${label}`} onClick={() => writeEffects(effects.filter((_, i) => i !== index))}>
          <Trash2 size={12} />
        </button>
      </div>
      <div className="shadow-row__nums">
        {fields}
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
  const effects = effectsOf(id);
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
      {effects.map((_, i) => (
        <EffectRow key={i} effects={effects} index={i} />
      ))}
      <div className="effects-block__row">
        <select
          aria-label="Add effect"
          value=""
          onChange={(ev) => {
            const e = effectOfType(ev.target.value);
            if (e) writeEffects([...effects, e]);
          }}
        >
          <option value="">Add effect…</option>
          {EFFECT_TYPES.map(([label, type]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
