"use client";

/**
 * The font picker (ROADMAP Phase 38): search the Google Fonts catalog, the project's own font files and the system
 * fonts, or import a font file (it becomes an asset and the picker's choice). Choosing writes the family with a
 * fallback of its kind through `layer.setProps`; the stylesheet is only requested once a layer uses the family.
 */

import React, { useRef, useState } from "react";
import { ChevronDown, Upload } from "lucide-react";
import { importFiles } from "@/core/assets/assetImport";
import { GOOGLE_FONTS, SYSTEM_FONTS, type FontCategory } from "@/core/fonts/catalog";
import { assetFamily, familyCss, primaryFamily } from "@/core/fonts/families";
import { useDocument } from "@/core/store/useDocumentStore";

interface Choice {
  family: string;
  category: FontCategory;
  group: "project" | "google" | "system";
}

interface Props {
  /** The CSS family value the selected layers share, or null when they differ. */
  value: string | null;
  onChoose: (css: string) => void;
}

export const FontPicker: React.FC<Props> = ({ value, onChoose }) => {
  const assets = useDocument((d) => d.assets);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement | null>(null);

  const project: Choice[] = Object.values(assets ?? {})
    .filter((a) => a.kind === "font")
    .flatMap((a) => {
      const family = assetFamily(a);
      return family ? [{ family, category: "sans-serif" as FontCategory, group: "project" as const }] : [];
    });
  const all: Choice[] = [
    ...project,
    ...GOOGLE_FONTS.map((f) => ({ family: f.family, category: f.category, group: "google" as const })),
    ...SYSTEM_FONTS.map((f) => ({ ...f, group: "system" as const })),
  ];
  const q = query.trim().toLowerCase();
  const shown = q ? all.filter((c) => c.family.toLowerCase().includes(q)) : all;
  const current = value === null ? "Mixed" : (primaryFamily(value) ?? "Default");
  const groups: { id: Choice["group"]; title: string }[] = [
    { id: "project", title: "In this project" },
    { id: "google", title: "Google Fonts" },
    { id: "system", title: "System" },
  ];

  const choose = (c: Choice) => {
    onChoose(familyCss(c.family, c.category));
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="font-picker">
      <button type="button" className="font-picker__button" aria-label="Font family" aria-haspopup="listbox" aria-expanded={open} style={{ fontFamily: value ?? undefined }} onClick={() => { setOpen((o) => !o); setTimeout(() => input.current?.focus(), 0); }}>
        <span>{current}</span>
        <ChevronDown size={12} aria-hidden />
      </button>
      {open && (
        <div className="font-picker__panel" role="dialog" aria-label="Choose a font">
          <input ref={input} type="search" className="font-picker__search" aria-label="Search fonts" placeholder="Search fonts" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") setOpen(false); }} />
          <div className="font-picker__list" role="listbox" aria-label="Fonts">
            {groups.map((g) => {
              const list = shown.filter((c) => c.group === g.id);
              if (list.length === 0) return null;
              return (
                <div key={g.id} role="group" aria-label={g.title}>
                  <div className="font-picker__group">{g.title}</div>
                  {list.map((c) => (
                    <button key={`${g.id}:${c.family}`} type="button" role="option" aria-selected={value !== null && primaryFamily(value)?.toLowerCase() === c.family.toLowerCase()} className="font-picker__option" data-family={c.family} style={{ fontFamily: c.group === "system" ? c.family : undefined }} onClick={() => choose(c)}>
                      {c.family}
                    </button>
                  ))}
                </div>
              );
            })}
            {shown.length === 0 && <div className="font-picker__empty">No font matches.</div>}
          </div>
          <label className="font-picker__upload">
            <Upload size={12} aria-hidden /> Upload a font…
            <input
              type="file"
              hidden
              accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf"
              aria-label="Upload a font file"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                const [first] = (await importFiles(files)).filter((o) => o.entry?.kind === "font");
                const family = first?.entry ? assetFamily(first.entry) : null;
                if (family) choose({ family, category: "sans-serif", group: "project" });
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
};
