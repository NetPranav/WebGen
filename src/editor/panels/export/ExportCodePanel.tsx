"use client";

/**
 * The Code tab (ROADMAP Phase 49): the real export of the selected layer, made by the same code as Export Site. The HTML
 * and JSX are the layer's markup, the CSS has its classes with the rules for narrower breakpoints and other modes, and the
 * Tailwind view has the same styles as utilities on the elements. The Inspect view is Dev Mode (FigCraft port F13).
 */

import React, { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { exportLayerCode } from "@/core/export/site";
import { documentStore } from "@/core/store/documentState";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { DevModePanel } from "./DevModePanel";

type View = "html" | "jsx" | "css" | "tailwind" | "inspect";
const VIEWS: { id: View; label: string }[] = [
  { id: "html", label: "HTML" },
  { id: "jsx", label: "JSX" },
  { id: "css", label: "CSS" },
  { id: "tailwind", label: "Tailwind" },
  // FigCraft port F13: Dev Mode's inspect, annotations, measurements and handoff
  { id: "inspect", label: "Inspect" },
];

export const ExportCodePanel: React.FC = () => {
  const doc = documentStore((s) => s.document);
  const ids = useSelectionStore((s) => s.selectedIds);
  const [view, setView] = useState<View>("html");
  const [copied, setCopied] = useState(false);
  const id = ids[0];
  const code = useMemo(() => {
    if (!id || !doc.layers[id]) return null;
    try {
      return exportLayerCode(doc, id);
    } catch {
      return null;
    }
  }, [doc, id]);
  const text = code && view !== "inspect" ? code[view] : "";
  return (
    <div className="export-code" role="region" aria-label="Code" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <div role="tablist" aria-label="Code view" style={{ display: "flex", gap: 2 }}>
          {VIEWS.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className="panel-icon-btn panel-text-btn" style={{ fontWeight: view === v.id ? 600 : 400 }} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="panel-icon-btn panel-text-btn"
          aria-label="Copy code"
          disabled={!text}
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />} Copy
        </button>
      </div>
      {view === "inspect" ? (
        <DevModePanel />
      ) : !id ? (
        <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>Select a layer to see the code Export Site writes for it.</p>
      ) : (
        <pre aria-label={`${view} of ${doc.layers[id]?.name ?? "the selection"}`} data-testid="export-code" style={{ flex: 1, minHeight: 0, margin: 0, padding: 8, overflow: "auto", fontSize: 11, lineHeight: 1.5, background: "rgba(128,128,128,0.08)", borderRadius: 8, whiteSpace: "pre" }}>
          {text || "Nothing to show for this layer."}
        </pre>
      )}
      {code && code.warnings.length > 0 && <p style={{ fontSize: 11, color: "#b45309", margin: 0 }}>{code.warnings[0]}</p>}
    </div>
  );
};
