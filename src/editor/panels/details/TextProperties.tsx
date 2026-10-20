"use client";

/**
 * Text properties in the inspector (ROADMAP Phase 31): family, size, weight, line height, letter spacing,
 * alignment, decoration, case, and how the box follows its text. Shown when the selection has text layers; a value
 * the layers disagree on reads "Mixed". Every change runs `layer.setProps` (or `text.setSizing`), one undo step.
 */

import React from "react";
import { NumberField } from "./controls/NumberField";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { resolveProps } from "@/core/render/resolve";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import type { PropValue } from "@/core/document/registry";
import { FontPicker } from "./FontPicker";
import { axesFor, parseVariations, primaryFamily, serializeVariations, weightsFor, assetFamily } from "@/core/fonts/families";
import { FONT_DISPLAYS, type FontDisplay } from "@/core/fonts/catalog";
import { useDocument } from "@/core/store/useDocumentStore";

const ALIGNS = [
  { value: "left", label: "Align text left", Icon: AlignLeft },
  { value: "center", label: "Align text centre", Icon: AlignCenter },
  { value: "right", label: "Align text right", Icon: AlignRight },
  { value: "justify", label: "Justify text", Icon: AlignJustify },
] as const;
const SIZINGS = [
  { value: "autoWidth", label: "Auto width" },
  { value: "autoHeight", label: "Auto height" },
  { value: "fixed", label: "Fixed size" },
] as const;

const set = (props: Record<string, PropValue | null>) => void invokeCommand("layer.setProps", { props, label: "Text properties" });

/** A variable-font axis: a slider and a number, written when you let go (one undo step, not one per pixel). */
const AxisControl: React.FC<{ axis: { tag: string; name: string; min: number; max: number }; value: number; onCommit: (n: number) => void }> = ({ axis, value, onCommit }) => {
  const [draft, setDraft] = React.useState<number | null>(null);
  const shown = draft ?? value;
  const done = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <div className="font-axis" role="group" aria-label={`${axis.name} axis`}>
      <span>{axis.name}</span>
      <input type="range" aria-label={axis.name} min={axis.min} max={axis.max} step={(axis.max - axis.min) / 100} value={shown} onChange={(e) => setDraft(Number(e.target.value))} onPointerUp={done} onKeyUp={done} onBlur={done} />
      <input type="number" aria-label={`${axis.name} value`} min={axis.min} max={axis.max} value={Number(shown.toFixed(2))} onChange={(e) => Number.isFinite(Number(e.target.value)) && setDraft(Math.min(axis.max, Math.max(axis.min, Number(e.target.value))))} onBlur={done} onKeyDown={(e) => e.key === "Enter" && done()} />
    </div>
  );
};

export const TextProperties: React.FC = () => {
  const layers = useLayers();
  const assets = useDocument((d) => d.assets);
  const fontDisplay = useDocument((d) => d.fontDisplay) ?? "swap";
  const ids = useSelectionStore((s) => s.selectedIds);
  const texts = ids.map((id) => layers[id]).filter((l) => l && l.archetype === "text");
  if (texts.length === 0) return null;

  /** The value every text layer shares, or null when they differ. */
  const shared = <T extends PropValue>(path: string, fallback: T): T | null => {
    const values = texts.map((l) => (resolveProps(l).get(path) ?? fallback) as T);
    return values.every((v) => v === values[0]) ? values[0] : null;
  };
  const family = shared("typography.fontFamily", "Inter");
  const weight = shared<string>("typography.fontWeight", "400");
  const size = shared("typography.fontSize", 16);
  const lineHeight = shared("typography.lineHeight", 1.5);
  const spacing = shared("typography.letterSpacing", 0);
  const align = shared("typography.textAlign", "left");
  const decoration = shared("typography.textDecoration", "none");
  const textCase = shared("typography.textTransform", "none");
  const sizing = shared("text.sizing", "fixed");
  const variations = shared("typography.fontVariations", "");
  const primary = family === null ? null : primaryFamily(String(family));
  const uploaded = primary !== null && Object.values(assets ?? {}).some((a) => a.kind === "font" && assetFamily(a)?.toLowerCase() === primary.toLowerCase());
  const weights = weightsFor(primary, uploaded);
  const axes = uploaded ? [] : axesFor(primary);
  const current = parseVariations(variations ?? "");

  return (
    <div className="text-props" role="group" aria-label="Text" style={{ display: "grid", gap: 6, padding: "8px" , borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))" }}>
      <div className="text-props__field">
        <span>Font</span>
        <FontPicker value={family as string | null} onChoose={(css) => set({ "typography.fontFamily": css, "typography.fontVariations": null })} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <NumberField label="Size" value={size as number | null} min={1} onCommit={(n) => set({ "typography.fontSize": n })} />
        <label className="text-props__field">
          <span>Weight</span>
          <select aria-label="Weight" value={weight ?? ""} onChange={(e) => set({ "typography.fontWeight": e.target.value })}>
            {weight === null && <option value="">Mixed</option>}
            {weight !== null && !weights.includes(Number(weight)) && <option value={String(weight)}>{String(weight)}</option>}
            {weights.map((w) => <option key={w} value={String(w)}>{w}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <NumberField label="Line height" value={lineHeight as number | null} step={0.1} min={0.1} onCommit={(n) => set({ "typography.lineHeight": n, "typography.lineHeightUnit": null })} />
        <NumberField label="Letter spacing" value={spacing as number | null} step={0.1} onCommit={(n) => set({ "typography.letterSpacing": n })} />
      </div>
      <div role="group" aria-label="Text alignment" style={{ display: "flex", gap: 2 }}>
        {ALIGNS.map(({ value, label, Icon }) => (
          <button key={value} type="button" className={`panel-icon-btn ${align === value ? "panel-icon-btn--active" : ""}`} title={label} aria-label={label} aria-pressed={align === value} onClick={() => set({ "typography.textAlign": value })}>
            <Icon size={14} />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <label className="text-props__field">
          <span>Decoration</span>
          <select aria-label="Decoration" value={decoration ?? ""} onChange={(e) => set({ "typography.textDecoration": e.target.value })}>
            {decoration === null && <option value="">Mixed</option>}
            <option value="none">None</option>
            <option value="underline">Underline</option>
            <option value="line-through">Strikethrough</option>
          </select>
        </label>
        <label className="text-props__field">
          <span>Case</span>
          <select aria-label="Case" value={textCase ?? ""} onChange={(e) => set({ "typography.textTransform": e.target.value })}>
            {textCase === null && <option value="">Mixed</option>}
            <option value="none">As typed</option>
            <option value="uppercase">UPPERCASE</option>
            <option value="lowercase">lowercase</option>
            <option value="capitalize">Capitalize Each Word</option>
          </select>
        </label>
      </div>
      {axes.map((a) => {
        const v = current.find((x) => x.tag === a.tag)?.value ?? a.default;
        return (
          <AxisControl
            key={a.tag}
            axis={a}
            value={v}
            onCommit={(n) => set({ "typography.fontVariations": serializeVariations([...current.filter((x) => x.tag !== a.tag), { tag: a.tag, value: n }].sort((p, q) => p.tag.localeCompare(q.tag))) })}
          />
        );
      })}
      <label className="text-props__field">
        <span>Font loading</span>
        <select aria-label="Font loading" value={fontDisplay} onChange={(e) => void invokeCommand("fonts.setDisplay", { display: e.target.value as FontDisplay })}>
          {FONT_DISPLAYS.map((d) => <option key={d} value={d}>{d === "swap" ? "Show text at once (swap)" : d === "block" ? "Wait for the font (block)" : d === "fallback" ? "Short wait (fallback)" : d === "optional" ? "Only if quick (optional)" : "Browser default (auto)"}</option>)}
        </select>
      </label>
      <div role="group" aria-label="Text box sizing" style={{ display: "flex", gap: 2 }}>
        {SIZINGS.map(({ value, label }) => (
          <button key={value} type="button" className={`panel-icon-btn ${sizing === value ? "panel-icon-btn--active" : ""}`} style={{ width: "auto", padding: "0 6px", fontSize: 11 }} aria-pressed={sizing === value} onClick={() => void invokeCommand("text.setSizing", { mode: value })}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
