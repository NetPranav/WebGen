"use client";

/**
 * Overrides at the breakpoint being edited (ROADMAP Phase 43): what the selected layers change here, each with a
 * reset, a way to reset them all, and a switch that hides the layers at this breakpoint. Shown only below the base.
 */

import React from "react";
import { invokeCommand } from "@/core/commands";
import { appliedBreakpoints, breakpointsOf, isBase, VISIBLE_KEY } from "@/core/breakpoints/breakpoints";
import { setVisible } from "@/core/editing/editOps";
import { useBreakpointStore } from "@/core/store/useBreakpointStore";
import { documentStore } from "@/core/store/documentState";
import { useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";

const short = (v: unknown) => {
  const t = typeof v === "string" ? v : JSON.stringify(v);
  return t.length > 24 ? `${t.slice(0, 23)}…` : t;
};

export const OverridesPanel: React.FC = () => {
  const activeId = useBreakpointStore((s) => s.activeId);
  const doc = documentStore((s) => s.document);
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds).filter((id) => layers[id]);
  const list = breakpointsOf(doc);
  if (!activeId || isBase(list, activeId) || ids.length === 0) return null;
  const bp = list.find((b) => b.id === activeId)!;
  const rows = new Map<string, unknown>();
  for (const id of ids) for (const [k, v] of Object.entries(layers[id].overrides?.[activeId] ?? {})) if (k !== VISIBLE_KEY) rows.set(k, v);
  const inherited = new Set<string>();
  for (const id of ids) for (const b of appliedBreakpoints(list, activeId)) if (b.id !== activeId) for (const k of Object.keys(layers[id].overrides?.[b.id] ?? {})) inherited.add(k);
  const hidden = ids.every((id) => layers[id].visible === false);
  return (
    <section aria-label={`Overrides at ${bp.name}`} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 11 }}>
          Overrides at {bp.name} <span style={{ opacity: 0.6 }}>{bp.width}</span>
        </strong>
        {rows.size > 0 && (
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Reset all overrides" onClick={() => void invokeCommand("breakpoint.reset", { ids })}>
            Reset all
          </button>
        )}
      </div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
        <input type="checkbox" aria-label={`Hide at ${bp.name}`} checked={hidden} onChange={(e) => setVisible(ids, !e.target.checked)} />
        Hide at {bp.name}
      </label>
      {rows.size === 0 ? (
        <span style={{ fontSize: 11, opacity: 0.65 }}>Nothing is changed here: this layer looks as it does at {list[0].name}{inherited.size > 0 ? `, with ${inherited.size} change${inherited.size === 1 ? "" : "s"} from a larger breakpoint` : ""}.</span>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {[...rows].map(([k, v]) => (
            <li key={k} data-override={k} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 11 }}>
              <span title={k} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {k} <span style={{ opacity: 0.6 }}>{short(v)}</span>
              </span>
              <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Reset ${k}`} onClick={() => void invokeCommand("breakpoint.reset", { ids, keys: [k] })}>
                Reset
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
