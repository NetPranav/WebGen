"use client";

/**
 * The Export dialog (ROADMAP Phase 49): the site's target (Next.js, Vite + React, plain HTML), how it is styled (one
 * stylesheet, CSS Modules, Tailwind), the files it will have, anything it could not carry exactly, and Download ZIP.
 */

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { downloadSite, exportCurrentSite } from "@/core/export/site/editorExport";
import { textOf } from "@/core/export/site";
import type { SiteExport } from "@/core/export/site";
import type { Styling, Target } from "@/core/export/site";
import { useExportUiStore } from "@/core/store/useExportUiStore";

const TARGETS: { id: Target; label: string; hint: string }[] = [
  { id: "next", label: "Next.js", hint: "App Router, one route for each page" },
  { id: "vite", label: "Vite + React", hint: "a small router, one component for each page" },
  { id: "html", label: "HTML & CSS", hint: "a folder of pages and one stylesheet" },
];
const STYLINGS: { id: Styling; label: string }[] = [
  { id: "css", label: "One stylesheet" },
  { id: "modules", label: "CSS Modules" },
  { id: "tailwind", label: "Tailwind utilities" },
];

export const ExportDialog: React.FC = () => {
  const isOpen = useExportUiStore((s) => s.isOpen);
  const [target, setTarget] = useState<Target>("next");
  const [styling, setStyling] = useState<Styling>("css");
  const [site, setSite] = useState<SiteExport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    let live = true;
    /* eslint-disable react-hooks/set-state-in-effect -- the export starts here; its state belongs to this run */
    setBusy(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    exportCurrentSite({ target, styling })
      .then((s) => {
        if (!live) return;
        setSite(s);
        setPreview(s.files.find((f) => typeof f.content === "string")?.path ?? null);
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [isOpen, target, styling]);

  if (!isOpen) return null;
  const close = () => useExportUiStore.getState().close();
  const shown = site?.files.find((f) => f.path === preview);
  return (
    <div role="dialog" aria-modal="true" aria-label="Export site" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onKeyDown={(e) => e.key === "Escape" && close()}>
      <div style={{ width: "min(860px, 94vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 12, background: "var(--panel-bg, #fff)", color: "var(--text-primary, #0f172a)", boxShadow: "0 12px 40px rgba(0,0,0,0.35)", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Export site</strong>
          <button type="button" className="panel-icon-btn" aria-label="Close" onClick={close}>
            <X size={14} />
          </button>
        </div>
        <div role="radiogroup" aria-label="Target" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TARGETS.map((t) => (
            <label key={t.id} style={{ display: "flex", gap: 6, alignItems: "flex-start", padding: "6px 10px", border: `1px solid ${target === t.id ? "#6366f1" : "rgba(128,128,128,0.35)"}`, borderRadius: 8, cursor: "pointer" }}>
              <input type="radio" name="export-target" aria-label={t.label} checked={target === t.id} onChange={() => setTarget(t.id)} />
              <span>
                <strong style={{ fontSize: 12 }}>{t.label}</strong>
                <br />
                <span style={{ fontSize: 11, opacity: 0.7 }}>{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
          Styling
          <select aria-label="Styling" value={target === "html" ? "css" : styling} disabled={target === "html"} onChange={(e) => setStyling(e.target.value as Styling)}>
            {STYLINGS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {target === "html" && <span style={{ opacity: 0.65 }}>plain HTML always uses one stylesheet</span>}
        </label>
        <div style={{ display: "flex", gap: 10, minHeight: 0, flex: 1 }}>
          <ul aria-label="Files" style={{ listStyle: "none", margin: 0, padding: 0, width: 240, overflow: "auto", fontSize: 12, border: "1px solid rgba(128,128,128,0.25)", borderRadius: 8 }}>
            {busy && <li style={{ padding: 8, opacity: 0.7 }}>Building…</li>}
            {site?.files.map((f) => (
              <li key={f.path}>
                <button type="button" aria-label={`Show ${f.path}`} aria-pressed={preview === f.path} onClick={() => typeof f.content === "string" && setPreview(f.path)} style={{ width: "100%", textAlign: "left", padding: "3px 8px", background: preview === f.path ? "rgba(99,102,241,0.15)" : "none", border: "none", cursor: typeof f.content === "string" ? "pointer" : "default", font: "inherit" }}>
                  {f.path}
                </button>
              </li>
            ))}
          </ul>
          <pre aria-label="File" style={{ flex: 1, margin: 0, padding: 8, overflow: "auto", fontSize: 11, background: "rgba(128,128,128,0.08)", borderRadius: 8, minWidth: 0 }}>
            {shown ? textOf(shown).slice(0, 20000) : error ?? ""}
          </pre>
        </div>
        {site && site.warnings.length > 0 && (
          <ul aria-label="Not carried exactly" role="status" style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#b45309" }}>
            {site.warnings.slice(0, 6).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
          <span style={{ opacity: 0.7 }}>{site ? `${site.pages.length} ${site.pages.length === 1 ? "page" : "pages"} · ${site.files.length} files` : ""}</span>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Download ZIP" disabled={busy || !site} onClick={() => void downloadSite({ target, styling })}>
            Download ZIP
          </button>
        </div>
      </div>
    </div>
  );
};
