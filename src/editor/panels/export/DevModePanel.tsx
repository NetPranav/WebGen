"use client";

/**
 * Dev Mode for the selected layer (FigCraft port F13), the Code tab's Inspect view: its properties for handoff with
 * the styles and variables behind them (colours in hex, RGB, CSS, HSL or HSB; lengths in px or rem), its CSS with
 * variables written in their code syntax, its annotations (text, pinned properties, a category), measurements kept on
 * the canvas, and its handoff status with Compare changes.
 */

import React, { useEffect, useState } from "react";
import { useDevModeStore } from "@/core/devmode/useDevModeStore";
import { invokeCommand, tryRunCommand } from "@/core/commands";
import { documentStore } from "@/core/store/documentState";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { COLOR_FORMATS, type ColorFormat, type Section } from "@/core/devmode/inspect";
import { PINNABLE, categoriesOf, type LayerChange } from "@/core/devmode/devOps";

const head: React.CSSProperties = { fontSize: 11, fontWeight: 600, margin: "8px 0 4px" };
const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, padding: "2px 0" };
const stop = (e: React.KeyboardEvent) => e.stopPropagation();

export const DevModePanel: React.FC = () => {
  useLayers(); // re-read on every change
  // while this view is open, the canvas draws the measurements kept in the file
  useEffect(() => {
    useDevModeStore.getState().setOn(true);
    return () => useDevModeStore.getState().setOn(false);
  }, []);
  const doc = documentStore((s) => s.document) as ReturnType<typeof documentStore.getState>["document"] & { annotationCategories?: { id: string; name: string; color: string }[] };
  const ids = useSelectionStore((s) => s.selectedIds);
  const [fmt, setFmt] = useState<ColorFormat>("hex");
  const [unit, setUnit] = useState<"px" | "rem">("px");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [pins, setPins] = useState<string[]>([]);
  const [changes, setChanges] = useState<LayerChange[] | null>(null);
  const id = ids[0];
  const layer = id ? doc.layers[id] : undefined;
  if (!layer) return <p style={{ fontSize: 11, opacity: 0.7 }}>Select a layer to inspect it.</p>;
  const res = tryRunCommand("inspect.properties", { id, colorFormat: fmt, unit });
  const sections = res.ok ? (res.result as { sections: Section[] }).sections : [];
  const cssRes = tryRunCommand("inspect.css", { id });
  const css = cssRes.ok ? (cssRes.result as { css: string }).css : "";
  const cats = categoriesOf(doc);
  const status = layer.devStatus?.status;
  return (
    <div role="region" aria-label="Inspect" style={{ display: "block", overflow: "auto", minHeight: 0, flex: 1 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <select aria-label="Colour format" value={fmt} onChange={(e) => setFmt(e.target.value as ColorFormat)}>
          {COLOR_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f.toUpperCase()}
            </option>
          ))}
        </select>
        <select aria-label="Units" value={unit} onChange={(e) => setUnit(e.target.value as "px" | "rem")}>
          <option value="px">px</option>
          <option value="rem">rem</option>
        </select>
      </div>
      {sections.map((s) => (
        <section key={s.title} aria-label={`Inspect ${s.title}`}>
          <div style={head}>{s.title}</div>
          {s.rows.map((r, i) => (
            <div key={i} style={rowStyle} data-inspect-row={r.label}>
              <span style={{ opacity: 0.7 }}>{r.label}</span>
              <span style={{ display: "flex", gap: 4, alignItems: "center", textAlign: "right" }}>
                {r.color && <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: r.color, border: "1px solid rgba(0,0,0,0.15)" }} />}
                {r.value}
                {r.token && <span style={{ opacity: 0.6, fontStyle: "italic" }}>{r.token}</span>}
              </span>
            </div>
          ))}
        </section>
      ))}
      <div style={head}>CSS</div>
      <pre aria-label="Inspect CSS" style={{ margin: 0, fontSize: 10, whiteSpace: "pre-wrap", background: "var(--surface-sunken, rgba(128,128,128,0.08))", padding: 6, borderRadius: 4 }}>{css}</pre>

      <div style={head}>Annotations</div>
      {(layer.annotations ?? []).map((a, i) => {
        const cat = cats.find((c) => c.id === a.category);
        return (
          <div key={i} style={{ ...rowStyle, alignItems: "flex-start" }} data-annotation={i}>
            <span>
              {cat && <span style={{ color: cat.color, fontWeight: 600 }}>{cat.name} · </span>}
              {a.label}
              {a.properties?.length ? <span style={{ opacity: 0.6 }}> [{a.properties.join(", ")}]</span> : null}
            </span>
            <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Remove annotation ${i + 1}`} onClick={() => void invokeCommand("annotation.remove", { id, index: i })}>
              ×
            </button>
          </div>
        );
      })}
      <textarea aria-label="New annotation" placeholder="A note for developers" value={note} rows={2} style={{ display: "block", width: "100%", boxSizing: "border-box" }} onChange={(e) => setNote(e.target.value)} onKeyDown={stop} />
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", fontSize: 11 }}>
        <select aria-label="Annotation category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">No category</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {PINNABLE.map(([pid, label]) => (
          <label key={pid} style={{ display: "flex", gap: 2, alignItems: "center" }}>
            <input type="checkbox" aria-label={`Pin ${label}`} checked={pins.includes(pid)} onChange={(e) => setPins(e.target.checked ? [...pins, pid] : pins.filter((p) => p !== pid))} />
            {label}
          </label>
        ))}
        <button
          type="button"
          className="panel-icon-btn panel-text-btn"
          aria-label="Add annotation"
          disabled={!note.trim() && pins.length === 0}
          onClick={() => {
            void invokeCommand("annotation.add", { id, label: note, properties: pins, ...(category ? { category } : {}) });
            setNote("");
            setPins([]);
          }}
        >
          Annotate
        </button>
      </div>

      <div style={head}>Measurements</div>
      {(layer.measurements ?? []).map((m, i) => (
        <div key={i} style={rowStyle}>
          <span>{m.to ? `to ${doc.layers[m.to]?.name ?? "a deleted layer"}` : `${m.side} side`}</span>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Remove measurement ${i + 1}`} onClick={() => void invokeCommand("measurement.remove", { from: id, index: i })}>
            ×
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Keep measurement to the other selected layer" disabled={ids.length < 2} onClick={() => void invokeCommand("measurement.add", { from: id, to: ids[1] })}>
          To other layer
        </button>
        {(["top", "left"] as const).map((side) => (
          <button key={side} type="button" className="panel-icon-btn panel-text-btn" aria-label={`Keep measurement across the ${side} side`} onClick={() => void invokeCommand("measurement.add", { from: id, side })}>
            {side === "top" ? "Width" : "Height"}
          </button>
        ))}
      </div>

      {(layer.archetype === "container" || layer.archetype === "form") && (
        <>
          <div style={head}>Handoff</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", fontSize: 11 }}>
            <span data-dev-status={status ?? "none"}>{status === "ready" ? "Ready for development" : status === "completed" ? "Completed" : "No status"}</span>
            <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Mark ready for development" onClick={() => void invokeCommand("dev.setStatus", { status: "ready", ids: [id] })}>
              Ready
            </button>
            <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Mark completed" onClick={() => void invokeCommand("dev.setStatus", { status: "completed", ids: [id] })}>
              Completed
            </button>
            {status && (
              <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Clear status" onClick={() => void invokeCommand("dev.setStatus", { status: null, ids: [id] })}>
                Clear
              </button>
            )}
            {layer.devStatus?.snapshot && (
              <button
                type="button"
                className="panel-icon-btn panel-text-btn"
                aria-label="Compare changes"
                onClick={() => {
                  const r = tryRunCommand("dev.compare", { id });
                  setChanges(r.ok ? ((r.result as { changes: LayerChange[] | null }).changes ?? []) : []);
                }}
              >
                Compare changes
              </button>
            )}
          </div>
          {changes && (
            <ul aria-label="Changes" style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 11 }}>
              {changes.length === 0 && <li style={{ opacity: 0.7 }}>No changes since it was marked.</li>}
              {changes.map((c) => (
                <li key={c.id} data-change={c.kind}>
                  <strong>{c.name}</strong> {c.kind === "changed" ? c.changes.map((x) => x.text).join("; ") : c.kind}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};
