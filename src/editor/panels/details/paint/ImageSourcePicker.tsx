"use client";

import React, { useRef } from "react";
import { invokeCommand } from "@/core/commands";
import { importFiles } from "@/core/assets/assetImport";
import { assetSrc } from "@/core/assets/useAssetUrl";
import { useDocument, useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";

/** For a selected image layer: its picture, with "Replace" by choosing another or importing one (ROADMAP Phase 37). */
export const ImageSourcePicker: React.FC = () => {
  const layers = useLayers();
  const assets = useDocument((d) => d.assets);
  const ids = useSelectionStore((s) => s.selectedIds);
  const input = useRef<HTMLInputElement | null>(null);
  const id = ids.find((i) => layers[i]?.archetype === "image");
  if (!id) return null;
  const src = String(layers[id].properties["media.src"] ?? "");
  const pictures = Object.values(assets ?? {}).filter((a) => a.kind === "image" || a.kind === "svg").sort((a, b) => b.addedAt - a.addedAt);
  const use = (entry: { id: string; width?: number; height?: number }) => void invokeCommand("paint.replaceImage", { src: assetSrc(entry.id) });
  return (
    <div className="effects-block" role="group" aria-label="Picture">
      <div className="effects-block__head">Picture</div>
      <div className="image-fill__row">
        <select className="paint-row__type" aria-label="Replace picture" value={src.startsWith("asset:") ? src.slice(6) : ""} onChange={(e) => { const a = pictures.find((p) => p.id === e.target.value); if (a) use(a); }}>
          <option value="">{src && !src.startsWith("asset:") ? "Linked picture" : "Choose a picture"}</option>
          {pictures.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button type="button" className="paint-row__btn paint-row__btn--text" onClick={() => input.current?.click()}>Replace…</button>
        <input
          ref={input}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml,.svg"
          aria-label="Import a replacement picture"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            const [first] = (await importFiles(files)).filter((o) => o.entry && o.entry.kind !== "font");
            if (first?.entry) use(first.entry);
          }}
        />
      </div>
    </div>
  );
};
