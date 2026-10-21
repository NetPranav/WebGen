"use client";

/**
 * Auto layout controls (ROADMAP Phase 41). For a container: a button that turns it into an auto-layout frame, or, when
 * it is one, its direction, gap, padding, alignment, wrap, and a way to turn it off. For a layer inside an auto-layout
 * frame: how it sizes itself on each axis (hug, fill or fixed). Each control runs a command: one undo step.
 */

import React from "react";
import { ArrowDown, ArrowRight, WrapText } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { isAutoLayout, readStack } from "@/core/editing/layoutOps";
import type { AlignItems, Justify, SizingMode } from "@/core/layout/stack";
import { useDocument } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { NumberField } from "./controls/NumberField";

const run = (command: string, args?: unknown) => void invokeCommand(command, args);

const JUSTIFY: { value: Justify; label: string }[] = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Centre" },
  { value: "flex-end", label: "End" },
  { value: "space-between", label: "Space between" },
];
const ALIGN: { value: AlignItems; label: string }[] = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Centre" },
  { value: "flex-end", label: "End" },
  { value: "stretch", label: "Stretch" },
];
const SIZING: { value: SizingMode; label: string }[] = [
  { value: "hug", label: "Hug" },
  { value: "fill", label: "Fill" },
  { value: "fixed", label: "Fixed" },
];

const Segmented: React.FC<{ label: string; value: string | undefined; options: { value: string; label: string }[]; onPick: (v: string) => void }> = ({ label, value, options, onPick }) => (
  <div role="group" aria-label={label} style={{ display: "flex", gap: 2 }}>
    {options.map((o) => (
      <button key={o.value} type="button" className="panel-icon-btn panel-text-btn" aria-pressed={value === o.value} aria-label={`${label}: ${o.label}`} title={`${label}: ${o.label}`} style={{ fontSize: 11, padding: "2px 6px", fontWeight: value === o.value ? 600 : 400, opacity: value === o.value ? 1 : 0.7 }} onClick={() => onPick(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);

export const AutoLayoutPanel: React.FC = () => {
  const ids = useSelectionStore((s) => s.selectedIds);
  const layers = useDocument((d) => d.layers);
  const selected = ids.map((id) => layers[id]).filter(Boolean);
  if (selected.length === 0) return null;
  const stacks = selected.filter((l) => isAutoLayout(l));
  const containers = selected.filter((l) => l.archetype === "container");
  const inStack = selected.filter((l) => l.parentId && isAutoLayout(layers[l.parentId]));
  const showAdd = stacks.length === 0 && (containers.length === 1 || selected.length > 1 || selected.every((l) => l.parentId !== null));
  if (stacks.length === 0 && inStack.length === 0 && !showAdd) return null;
  const first = stacks[0] ? readStack(stacks[0]) : null;
  const same = (pick: (s: ReturnType<typeof readStack>) => string | number | boolean) => {
    if (stacks.length === 0) return undefined;
    const v = pick(readStack(stacks[0]));
    return stacks.every((l) => pick(readStack(l)) === v) ? v : null;
  };
  const sizingOf = (axis: "horizontal" | "vertical") => {
    const vals = inStack.map((l) => {
      const v = l.properties[`sizing.${axis}`];
      return v === "fixed" || v === "hug" || v === "fill" ? v : typeof l.properties[axis === "horizontal" ? "frame.width" : "frame.height"] === "number" ? "fixed" : "hug";
    });
    return vals.every((v) => v === vals[0]) ? vals[0] : undefined;
  };
  return (
    <section className="auto-layout-panel" aria-label="Auto layout" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
        <strong style={{ fontSize: 11 }}>Auto layout</strong>
        {stacks.length > 0 ? (
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Remove auto layout" title="Remove auto layout (Shift+Alt+A)" onClick={() => run("layout.removeAuto")}>
            Remove
          </button>
        ) : showAdd ? (
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Add auto layout" title="Add auto layout (Shift+A)" onClick={() => run("layout.addAuto")}>
            Add
          </button>
        ) : null}
      </div>
      {first && (
        <>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button type="button" className="panel-icon-btn" aria-label="Direction: vertical" title="Vertical" aria-pressed={same((s) => s.direction) === "column"} onClick={() => run("layout.setStack", { direction: "column" })}>
              <ArrowDown size={14} />
            </button>
            <button type="button" className="panel-icon-btn" aria-label="Direction: horizontal" title="Horizontal" aria-pressed={same((s) => s.direction) === "row"} onClick={() => run("layout.setStack", { direction: "row" })}>
              <ArrowRight size={14} />
            </button>
            <button type="button" className="panel-icon-btn" aria-label="Wrap" title="Wrap" aria-pressed={same((s) => s.wrap) === true} onClick={() => run("layout.setStack", { wrap: same((s) => s.wrap) !== true })}>
              <WrapText size={14} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <NumberField label="Gap" badge="G" min={0} value={same((s) => s.gap) as number | null | undefined} onCommit={(n) => run("layout.setStack", { gap: n })} />
            <NumberField label="Padding" badge="P" min={0} value={same((s) => (s.padding.top === s.padding.right && s.padding.top === s.padding.bottom && s.padding.top === s.padding.left ? s.padding.top : -1)) === -1 ? null : (same((s) => s.padding.top) as number | null | undefined)} onCommit={(n) => run("layout.setStack", { padding: n })} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <NumberField label="Padding top" badge="T" min={0} value={same((s) => s.padding.top) as number | null | undefined} onCommit={(n) => run("layout.setStack", { padding: { top: n } })} />
            <NumberField label="Padding right" badge="R" min={0} value={same((s) => s.padding.right) as number | null | undefined} onCommit={(n) => run("layout.setStack", { padding: { right: n } })} />
            <NumberField label="Padding bottom" badge="B" min={0} value={same((s) => s.padding.bottom) as number | null | undefined} onCommit={(n) => run("layout.setStack", { padding: { bottom: n } })} />
            <NumberField label="Padding left" badge="L" min={0} value={same((s) => s.padding.left) as number | null | undefined} onCommit={(n) => run("layout.setStack", { padding: { left: n } })} />
          </div>
          <Segmented label="Justify" value={same((s) => s.justify) as string | undefined} options={JUSTIFY} onPick={(v) => run("layout.setStack", { justify: v })} />
          <Segmented label="Align" value={same((s) => s.align) as string | undefined} options={ALIGN} onPick={(v) => run("layout.setStack", { align: v })} />
        </>
      )}
      {inStack.length > 0 && (
        <>
          <Segmented label="Width" value={sizingOf("horizontal")} options={SIZING} onPick={(v) => run("layout.setSizing", { horizontal: v, ids: inStack.map((l) => l.id) })} />
          <Segmented label="Height" value={sizingOf("vertical")} options={SIZING} onPick={(v) => run("layout.setSizing", { vertical: v, ids: inStack.map((l) => l.id) })} />
        </>
      )}
    </section>
  );
};
