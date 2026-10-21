"use client";

/**
 * Link of the selection (ROADMAP Phase 48), in the Design inspector: where clicking the layer goes in Preview and in the
 * exported site: a page, a section of a page, a web address, or another frame (a prototype link).
 */

import React, { useState } from "react";
import { invokeCommand } from "@/core/commands";
import { anchorOf, pagesOf, resolveLink, type LinkKind } from "@/core/pages/pages";
import { useLayers } from "@/core/store/useDocumentStore";
import { documentStore } from "@/core/store/documentState";
import { useSelectionStore } from "@/core/store/useSelectionStore";

const run = (command: string, args?: unknown) => void invokeCommand(command, args);
const box: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, rgba(128,128,128,0.2))", fontSize: 11 };

export const LinkPanel: React.FC = () => {
  const doc = documentStore((s) => s.document);
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds).filter((id) => layers[id] && layers[id].parentId !== null);
  const [kind, setKind] = useState<LinkKind>("page");
  const [url, setUrl] = useState("");
  if (ids.length === 0) return null;
  const first = layers[ids[0]];
  const link = first.link;
  const pages = pagesOf(doc);
  const frames = Object.values(doc.layers).filter((l) => l.parentId === null);
  const sections = pages.flatMap((p) => Object.values(doc.layers).filter((l) => l.section && l.parentId === p.id).map((s) => ({ s, page: p })));
  const broken = link && !resolveLink(doc, link);
  const shownKind = link?.kind ?? kind;
  return (
    <section aria-label="Link" style={box}>
      <strong>Link</strong>
      <span style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="Link to" value={shownKind} onChange={(e) => setKind(e.target.value as LinkKind)}>
          <option value="page">A page</option>
          <option value="anchor">A section</option>
          <option value="frame">A frame</option>
          <option value="url">A web address</option>
        </select>
        {shownKind === "page" && (
          <select aria-label="Page" value={link?.kind === "page" ? link.target : ""} onChange={(e) => e.target.value && run("link.set", { kind: "page", target: e.target.value, ids })}>
            <option value="">Choose a page…</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.route}
              </option>
            ))}
          </select>
        )}
        {shownKind === "anchor" && (
          <select aria-label="Section" value={link?.kind === "anchor" ? link.target : ""} onChange={(e) => e.target.value && run("link.set", { kind: "anchor", target: e.target.value, ids })}>
            <option value="">Choose a section…</option>
            {sections.map(({ s, page }) => (
              <option key={s.id} value={s.id}>
                {page.route}#{anchorOf(s)}
              </option>
            ))}
          </select>
        )}
        {shownKind === "frame" && (
          <select aria-label="Frame" value={link?.kind === "frame" ? link.target : ""} onChange={(e) => e.target.value && run("link.set", { kind: "frame", target: e.target.value, ids })}>
            <option value="">Choose a frame…</option>
            {frames.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
        {shownKind === "url" && (
          <input
            aria-label="Web address"
            placeholder="https://"
            defaultValue={link?.kind === "url" ? link.target : url}
            key={link?.kind === "url" ? link.target : "new"}
            style={{ flex: 1, minWidth: 100 }}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={(e) => e.target.value.trim() && run("link.set", { kind: "url", target: e.target.value.trim(), ids })}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        )}
        {link && (
          <button type="button" className="panel-icon-btn panel-text-btn" aria-label="Remove link" onClick={() => run("link.set", { kind: null, ids })}>
            Remove link
          </button>
        )}
      </span>
      {broken && <span role="alert" style={{ color: "#b91c1c" }}>This link leads nowhere: its target is gone.</span>}
    </section>
  );
};
