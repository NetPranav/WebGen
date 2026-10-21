"use client";

/**
 * The Pages panel (ROADMAP Phase 48), a tab of the left dock: the site's pages with their routes (click one to go to
 * it, edit its route, make it the home page), the sections of the page you are on with their anchors, and the shared
 * header and footer. It works on the document, so every change is one undo step; the older After-track Pages Manager
 * keeps its own project-level page list and is not used here.
 */

import React from "react";
import { Home, Plus, Trash2 } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { anchorOf, pagesOf, sectionsOf } from "@/core/pages/pages";
import { documentStore } from "@/core/store/documentState";
import { useCanvasViewStore } from "@/core/store/useCanvasViewStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";

const run = (command: string, args?: unknown) => void invokeCommand(command, args);
const row: React.CSSProperties = { display: "flex", gap: 6, alignItems: "center", fontSize: 12 };

export const PagesPanel: React.FC = () => {
  const doc = documentStore((s) => s.document);
  const active = useCanvasViewStore((s) => s.activeFrameId);
  const selected = useSelectionStore((s) => s.selectedIds);
  const pages = pagesOf(doc);
  const frames = Object.values(doc.layers).filter((l) => l.parentId === null && !l.page);
  const current = pages.find((p) => p.id === active) ?? pages.find((p) => selected.some((id) => id === p.id)) ?? null;
  const sections = current ? sectionsOf(doc.layers, current.id) : [];
  const shared = Object.values(doc.designComponents ?? {}).filter((c) => c.shared);
  return (
    <div className="pages-panel" role="region" aria-label="Pages" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10, overflow: "auto", height: "100%" }}>
      <section aria-label="Site pages">
        <div style={{ ...row, justifyContent: "space-between" }}>
          <strong style={{ fontSize: 11 }}>Pages {pages.length > 0 && <span style={{ opacity: 0.6 }}>{pages.length}</span>}</strong>
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Add page" onClick={() => run("page.create", {})}>
            <Plus size={12} aria-hidden /> Add page
          </button>
        </div>
        {pages.length === 0 ? (
          <p style={{ fontSize: 11, opacity: 0.65, margin: "6px 0" }}>No pages yet. Add one, or make an existing frame a page below.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {pages.map((p) => (
              <li key={p.id} data-page={p.name} data-route={p.route} aria-current={current?.id === p.id ? "page" : undefined} style={{ ...row, padding: "2px 4px", borderRadius: 6, background: current?.id === p.id ? "rgba(99,102,241,0.12)" : undefined }}>
                <button type="button" className="panel-icon-btn" aria-label={`${p.name} is${p.home ? "" : " not"} the home page`} title={p.home ? "Home page" : "Make this the home page"} onClick={() => run("page.setHome", { frame: p.id })}>
                  <Home size={13} style={{ opacity: p.home ? 1 : 0.35 }} aria-hidden />
                </button>
                <button type="button" style={{ flex: "0 1 90px", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", font: "inherit" }} aria-label={`Go to ${p.name}`} onClick={() => run("frame.focus", { frameId: p.id })}>
                  {p.name}
                </button>
                <input
                  key={p.route}
                  aria-label={`Route of ${p.name}`}
                  defaultValue={p.route}
                  style={{ flex: 1, minWidth: 0 }}
                  onBlur={(e) => e.target.value !== p.route && run("page.setRoute", { frame: p.id, route: e.target.value })}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
                <button type="button" className="panel-icon-btn" aria-label={`Remove page ${p.name}`} title="Stop being a page" onClick={() => run("page.remove", { frame: p.id })}>
                  <Trash2 size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {frames.length > 0 && (
          <div style={{ ...row, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, opacity: 0.65 }}>Make a page of:</span>
            {frames.map((f) => (
              <button key={f.id} type="button" className="panel-icon-btn panel-text-btn" aria-label={`Make ${f.name} a page`} onClick={() => run("page.make", { frame: f.id })}>
                {f.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {current && (
        <section aria-label={`Sections of ${current.name}`}>
          <div style={{ ...row, justifyContent: "space-between" }}>
            <strong style={{ fontSize: 11 }}>Sections of {current.name}</strong>
            <span style={row}>
              <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Add section" onClick={() => run("section.add", { page: current.id })}>
                Add section
              </button>
              <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Make sections of this page's frames" title="Turn the containers in this page into stacked sections" onClick={() => run("section.make", { page: current.id })}>
                Make sections
              </button>
            </span>
          </div>
          <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {sections.map((s) => {
              const comp = s.componentMain ? doc.designComponents?.[s.componentMain] : s.instance ? doc.designComponents?.[s.instance.component] : undefined;
              return (
                <li key={s.id} data-section={s.name} style={{ ...row, flexWrap: "wrap" }}>
                  <button type="button" style={{ flex: "0 1 80px", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} aria-label={`Select ${s.name}`} onClick={() => useSelectionStore.getState().select(s.id, "element")}>
                    {s.name}
                    {comp?.shared && <span style={{ opacity: 0.6 }}> · shared {comp.shared}</span>}
                  </button>
                  <input
                    key={anchorOf(s)}
                    aria-label={`Anchor of ${s.name}`}
                    defaultValue={anchorOf(s)}
                    style={{ flex: 1, minWidth: 0 }}
                    onBlur={(e) => e.target.value !== anchorOf(s) && run("section.setAnchor", { section: s.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                  {!s.instance && !s.componentMain && (
                    <>
                      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Share ${s.name} as the header`} onClick={() => run("section.share", { section: s.id, kind: "header" })}>
                        Header
                      </button>
                      <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Share ${s.name} as the footer`} onClick={() => run("section.share", { section: s.id, kind: "footer" })}>
                        Footer
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {shared.length > 0 && (
        <section aria-label="Shared sections">
          <strong style={{ fontSize: 11 }}>Shared on every page</strong>
          <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
            {shared.map((c) => (
              <li key={c.id} data-shared={c.shared} style={{ ...row, justifyContent: "space-between" }}>
                <span>
                  {c.name} <span style={{ opacity: 0.6 }}>{c.shared}</span>
                </span>
                <button type="button" className="panel-icon-btn panel-text-btn" aria-label={`Stop sharing ${c.name}`} onClick={() => run("section.unshare", { component: c.id })}>
                  Stop sharing
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
