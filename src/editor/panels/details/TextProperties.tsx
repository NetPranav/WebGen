"use client";

/**
 * Text properties in the inspector (ROADMAP Phase 31): family, size, weight, line height, letter spacing,
 * alignment, decoration, case, and how the box follows its text. Shown when the selection has text layers; a value
 * the layers disagree on reads "Mixed". Every change runs `layer.setProps` (or `text.setSizing`), one undo step.
 */

import React, { useState } from "react";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { resolveProps } from "@/core/render/resolve";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import type { PropValue } from "@/core/document/registry";

const FAMILIES = ["Inter", "Outfit", "Roboto", "Roboto Mono", "JetBrains Mono", "Playfair Display", "Georgia", "system-ui"];
const WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
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

/** A number field that writes on Enter or blur, so typing "24" is one undo step, not two. It restarts when the value changes under it. */
const NumberField: React.FC<{ label: string; value: number | null; step?: number; min?: number; onCommit: (n: number) => void }> = (props) => (
  <NumberInput key={props.value === null ? "mixed" : props.value} {...props} />
);

const NumberInput: React.FC<{ label: string; value: number | null; step?: number; min?: number; onCommit: (n: number) => void }> = ({ label, value, step = 1, min, onCommit }) => {
  const [text, setText] = useState(value === null ? "" : String(value));
  const commit = () => {
    const n = Number(text);
    if (text.trim() !== "" && Number.isFinite(n) && n !== value) onCommit(min !== undefined ? Math.max(min, n) : n);
    else setText(value === null ? "" : String(value));
  };
  return (
    <label className="text-props__field">
      <span>{label}</span>
      <input type="number" aria-label={label} step={step} min={min} placeholder={value === null ? "Mixed" : undefined} value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
    </label>
  );
};

export const TextProperties: React.FC = () => {
  const layers = useLayers();
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

  return (
    <div className="text-props" role="group" aria-label="Text" style={{ display: "grid", gap: 6, padding: "8px" , borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))" }}>
      <label className="text-props__field">
        <span>Font</span>
        <select aria-label="Font family" value={family ?? ""} onChange={(e) => set({ "typography.fontFamily": e.target.value })}>
          {family === null && <option value="">Mixed</option>}
          {family !== null && !FAMILIES.includes(String(family)) && <option value={String(family)}>{String(family)}</option>}
          {FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <NumberField label="Size" value={size as number | null} min={1} onCommit={(n) => set({ "typography.fontSize": n })} />
        <label className="text-props__field">
          <span>Weight</span>
          <select aria-label="Weight" value={weight ?? ""} onChange={(e) => set({ "typography.fontWeight": e.target.value })}>
            {weight === null && <option value="">Mixed</option>}
            {weight !== null && !WEIGHTS.includes(String(weight)) && <option value={String(weight)}>{String(weight)}</option>}
            {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
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
