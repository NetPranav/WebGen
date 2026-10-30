"use client";

/**
 * Stroke settings (FigCraft port F3): where the stroke sits (inside, centre, outside), per-side weights on rectangles
 * and frames, the ends of open paths (round, square, five arrowheads), a width profile from the presets, and the
 * miter limit. Every change is the typed `stroke.set` command, so a person, a shortcut and an agent all edit it the
 * same way.
 */

import React from "react";
import { invokeCommand } from "@/core/commands";
import { isPropertyLegalFor } from "@/core/document/properties";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { resolveProps } from "@/core/render/resolve";
import { readCap } from "@/core/render/strokePaint";
import { STROKE_ALIGNS, STROKE_CAPS, WIDTH_PRESETS, capLabel, parseSides, parseWidthProfile, presetLabel, presetProfile, profilePreset, type StrokeAlign } from "@/core/paths/strokes";
import { NumberField } from "../controls/NumberField";
import { PRESETS as BRUSHES, parseBrush, preset as brushPreset } from "@/core/paths/brush";

const set = (patch: Record<string, unknown>) => void invokeCommand("stroke.set", patch);
const ALIGN_LABEL: Record<StrokeAlign, string> = { inside: "Inside", center: "Center", outside: "Outside" };
const SIDE_LABEL = ["Top", "Right", "Bottom", "Left"];

export const StrokeSettingsEditor: React.FC = () => {
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds);
  const id = ids.find((i) => layers[i] && isPropertyLegalFor("stroke.align", layers[i].archetype));
  if (!id) return null;
  const layer = layers[id];
  const r = resolveProps(layer);
  const alignRaw = r.get("stroke.align");
  const align = alignRaw === "inside" || alignRaw === "center" || alignRaw === "outside" ? alignRaw : null;
  const sides = parseSides(r.get("stroke.sides"));
  const takesSides = isPropertyLegalFor("stroke.sides", layer.archetype);
  const takesCaps = isPropertyLegalFor("shape.startCap", layer.archetype);
  const takesProfile = isPropertyLegalFor("stroke.widthProfile", layer.archetype);
  const takesMiter = isPropertyLegalFor("stroke.miterLimit", layer.archetype);
  const preset = profilePreset(parseWidthProfile(r.get("stroke.widthProfile")));
  const weight = Number(r.get("svg.strokeWidth") ?? r.get("appearance.border.width") ?? 1) || 1;

  return (
    <div className="effects-block" role="group" aria-label="Stroke settings">
      <div className="effects-block__head">Stroke settings</div>
      <div className="effects-block__row" role="radiogroup" aria-label="Stroke position">
        {STROKE_ALIGNS.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={align === a} className={`effects-chip ${align === a ? "effects-chip--on" : ""}`} onClick={() => set({ align: a })}>
            {ALIGN_LABEL[a]}
          </button>
        ))}
      </div>
      {takesSides && (
        <div className="effects-block__row" role="group" aria-label="Stroke weight per side">
          <button type="button" className={`effects-chip ${sides ? "effects-chip--on" : ""}`} aria-pressed={!!sides} onClick={() => set({ sides: sides ? null : [weight, weight, weight, weight] })}>
            Per side
          </button>
          {sides &&
            sides.map((v, i) => (
              <NumberField key={i} label={`${SIDE_LABEL[i]} stroke weight`} badge={SIDE_LABEL[i][0]} min={0} max={1000} value={v} onCommit={(n) => set({ sides: sides.map((x, j) => (j === i ? n : x)) })} />
            ))}
        </div>
      )}
      {takesCaps && (
        <div className="effects-block__row">
          {(["start", "end"] as const).map((end) => (
            <label key={end} className="image-fill__num">
              <span>{end === "start" ? "Start" : "End"}</span>
              <select aria-label={`Stroke ${end}`} value={readCap(r.get(end === "start" ? "shape.startCap" : "shape.endCap"))} onChange={(e) => set({ [end === "start" ? "capStart" : "capEnd"]: e.target.value })}>
                {STROKE_CAPS.map((c) => <option key={c} value={c}>{capLabel(c)}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      {takesProfile && (
        <div className="effects-block__row" role="radiogroup" aria-label="Stroke width profile">
          {WIDTH_PRESETS.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={preset === p} className={`effects-chip ${preset === p ? "effects-chip--on" : ""}`} onClick={() => set({ widthProfile: presetProfile(p) })}>
              {presetLabel(p)}
            </button>
          ))}
        </div>
      )}
      {takesProfile && (() => {
        // FigCraft port F3: a brush draws the stroke with shapes
        const brush = parseBrush(r.get("stroke.brush"));
        const setBrush = (b: Record<string, unknown> | null) => void invokeCommand("stroke.setBrush", { brush: b });
        return (
          <div className="effects-block__row" style={{ flexWrap: "wrap" }}>
            <select aria-label="Stroke brush" value={brush?.preset ?? ""} onChange={(e) => setBrush(e.target.value ? { ...(brush ?? {}), preset: e.target.value } : null)}>
              <option value="">No brush</option>
              {BRUSHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            {brush && brushPreset(brush.preset)?.kind === "scatter" && (
              <>
                <NumberField label="Brush spacing" badge="Sp" min={0} max={100} step={0.25} value={brush.spacing} onCommit={(spacing) => setBrush({ ...brush, spacing })} />
                <NumberField label="Brush size jitter" badge="Sz" min={0} max={100} value={Math.round(brush.sizeJitter * 100)} onCommit={(v) => setBrush({ ...brush, sizeJitter: v / 100 })} />
                <NumberField label="Brush rotation jitter" badge="Rt" min={0} max={100} value={Math.round(brush.rotationJitter * 100)} onCommit={(v) => setBrush({ ...brush, rotationJitter: v / 100 })} />
                <NumberField label="Brush scatter" badge="Sc" min={0} max={4} step={0.25} value={brush.scatter} onCommit={(scatter) => setBrush({ ...brush, scatter })} />
              </>
            )}
          </div>
        );
      })()}
      {takesMiter && (
        <div className="effects-block__row">
          <NumberField label="Miter limit" badge="Miter" min={1} max={100} value={Number(r.get("stroke.miterLimit") ?? 4) || 4} onCommit={(miterLimit) => set({ miterLimit })} />
        </div>
      )}
    </div>
  );
};
