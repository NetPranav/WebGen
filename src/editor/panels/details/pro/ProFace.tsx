"use client";

/**
 * The Pro face of the Design inspector (ROADMAP Phase 34): every property the registry gives the selected layers,
 * in groups, each with the control its value type needs. Numbers scrub, step with the arrow keys and carry their
 * unit; colours have a swatch; enums are choices; vectors have a box per component; gradients and objects are
 * JSON, checked before they are written. A value the layers disagree on reads "Mixed", and a property someone set
 * has a reset button. Every change is `layer.setProps` (one undo step).
 */

import React, { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { PROPERTY_REGISTRY } from "@/core/document/properties";
import type { PropValue } from "@/core/document/registry";
import { proGroupsFor, type ProProperty } from "@/core/inspector/proModel";
import { proValue, type ProValue } from "@/core/inspector/proRead";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { ColorField } from "../controls/ColorField";
import { PaintEditor } from "../paint/PaintEditor";
import { EffectsEditor, StrokeStyleEditor } from "../paint/EffectsEditor";
import { ImageSourcePicker } from "../paint/ImageSourcePicker";
import { ScrubNumber } from "../controls/ScrubNumber";
import "@/editor/styles/pro-face.css";

type Write = (path: string, value: PropValue | null) => void;

const write: Write = (path, value) => void invokeCommand("layer.setProps", { props: { [path]: value }, label: `Set ${path}` });

const JsonControl: React.FC<{ property: ProProperty; value: ProValue["value"] }> = ({ property, value }) => {
  const shown = value === null || value === undefined ? "" : JSON.stringify(value);
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const text = draft ?? shown;
  return (
    <textarea
      className="pro-text pro-text--code"
      aria-label={property.label}
      aria-invalid={invalid}
      rows={2}
      spellCheck={false}
      placeholder={value === null ? "Mixed" : undefined}
      value={text}
      onFocus={() => setDraft(shown)}
      onChange={(e) => {
        setDraft(e.target.value);
        setInvalid(false);
      }}
      onBlur={() => {
        const t = (draft ?? shown).trim();
        setDraft(null);
        if (t === shown) return;
        try {
          write(property.path, JSON.parse(t) as PropValue);
        } catch {
          setInvalid(true); // not JSON: nothing is written
        }
      }}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
};

const VectorControl: React.FC<{ property: ProProperty; value: ProValue["value"] }> = ({ property, value }) => {
  const size = property.def.valueType === "quaternion" ? 4 : 3;
  const parts = Array.isArray(value) ? (value as number[]) : null;
  const names = size === 4 ? ["X", "Y", "Z", "W"] : ["X", "Y", "Z"];
  return (
    <span className="pro-vector">
      {names.map((n, i) => (
        <ScrubNumber
          key={n}
          path={`${property.path}[${i}]`}
          label={n}
          def={{ ...property.def, valueType: "number", range: undefined }}
          value={parts ? (parts[i] ?? 0) : null}
          write={(v) => {
            const next = (parts ?? (property.def.default as number[]).slice()).slice();
            next[i] = v;
            write(property.path, next);
          }}
        />
      ))}
    </span>
  );
};

const Control: React.FC<{ property: ProProperty; state: ProValue; unit: ProValue | null }> = ({ property, state, unit }) => {
  const { value } = state;
  switch (property.kind) {
    case "number":
      return (
        <>
          <ScrubNumber path={property.path} label={property.label} def={property.def} value={typeof value === "number" ? value : null} write={(n) => write(property.path, n)} />
          {property.unitPath && (
            <select className="pro-unit" aria-label={`${property.label} unit`} data-prop-path={property.unitPath} value={typeof unit?.value === "string" ? unit.value : ""} onChange={(e) => write(property.unitPath!, e.target.value)}>
              {unit?.value === null && <option value="">Mixed</option>}
              {(PROPERTY_REGISTRY[property.unitPath].options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
        </>
      );
    case "color":
      return <ColorField label={property.label} value={value === null ? null : typeof value === "string" ? value : undefined} onCommit={(c) => write(property.path, c)} />;
    case "select":
      return (
        <select className="pro-select" aria-label={property.label} value={typeof value === "string" ? value : ""} onChange={(e) => write(property.path, e.target.value)}>
          {value === null && <option value="">Mixed</option>}
          {typeof value === "string" && !property.def.options!.includes(value) && <option value={value}>{value}</option>}
          {property.def.options!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "toggle":
      return <input type="checkbox" className="pro-toggle" aria-label={property.label} checked={value === true} ref={(el) => {
        if (el) el.indeterminate = value === null;
      }} onChange={(e) => write(property.path, e.target.checked)} />;
    case "vector":
      return <VectorControl property={property} value={value} />;
    case "json":
      return <JsonControl property={property} value={value} />;
    case "longtext":
    case "text":
      return <TextControl property={property} value={value} long={property.kind === "longtext"} />;
  }
};

const TextControl: React.FC<{ property: ProProperty; value: ProValue["value"]; long: boolean }> = ({ property, value, long }) => {
  const shown = typeof value === "string" ? value : "";
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? shown;
  const commit = () => {
    setDraft(null);
    if (text !== shown || (value === null && text !== "")) write(property.path, text);
  };
  return long ? (
    <textarea className="pro-text" aria-label={property.label} rows={2} spellCheck={false} placeholder={value === null ? "Mixed" : undefined} value={text} onFocus={() => setDraft(shown)} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.target as HTMLTextAreaElement).blur(); }} />
  ) : (
    <input type="text" className="pro-text" aria-label={property.label} spellCheck={false} placeholder={value === null ? "Mixed" : undefined} value={text} onFocus={() => setDraft(shown)} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
  );
};

export const ProFace: React.FC = () => {
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds);
  const [filter, setFilter] = useState("");
  const archetypeKey = ids.map((id) => layers[id]?.archetype ?? "").join(",");
  const groups = useMemo(() => proGroupsFor(archetypeKey.split(",").filter(Boolean)), [archetypeKey]);
  const q = filter.trim().toLowerCase();
  if (groups.length === 0) return <div className="pro-face pro-face--empty">Select a layer to see its properties.</div>;
  return (
    <div className="pro-face" role="form" aria-label="Properties">
      {q === "" && (
        <>
          <ImageSourcePicker />
          <PaintEditor />
          <StrokeStyleEditor />
          <EffectsEditor />
        </>
      )}
      <input type="search" className="pro-face__filter" aria-label="Filter properties" placeholder="Filter properties" value={filter} onChange={(e) => setFilter(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
      {groups.map((group, gi) => {
        const rows = group.properties.filter((p) => !q || p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q));
        if (rows.length === 0) return null;
        return (
          <details key={group.id} className="pro-group" open={q !== "" || gi < 2} data-group={group.id}>
            <summary>
              {group.title} <span className="pro-group__count">{rows.length}</span>
            </summary>
            <div className="pro-group__body">
              {rows.map((p) => {
                const state = proValue(layers, ids, p.path, p.def);
                const unit = p.unitPath ? proValue(layers, ids, p.unitPath, PROPERTY_REGISTRY[p.unitPath]) : null;
                return (
                  <div key={p.path} className="pro-row" role="group" aria-label={p.label} data-prop-path={p.path} data-kind={p.kind}>
                    {p.kind !== "number" && <span className="pro-row__label">{p.label}</span>}
                    <span className="pro-row__control">
                      <Control property={p} state={state} unit={unit} />
                    </span>
                    {state.explicit ? (
                      <button type="button" className="pro-row__reset" aria-label={`Reset ${p.label}`} title="Back to the default" onClick={() => write(p.path, null)}>
                        <RotateCcw size={11} />
                      </button>
                    ) : (
                      <span className="pro-row__reset pro-row__reset--none" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
};
