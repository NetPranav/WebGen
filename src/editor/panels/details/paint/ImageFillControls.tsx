"use client";

/**
 * The picture controls of an image fill (ROADMAP Phase 37): which picture (any imported file, or import one now),
 * how it sits (fill, fit, crop, tile), the tile size, and its brightness, contrast and saturation. "Crop" puts the
 * picture's outline on the canvas to drag; "Replace" is simply choosing another picture.
 */

import React, { useRef } from "react";
import { importFiles } from "@/core/assets/assetImport";
import { assetSrc } from "@/core/assets/useAssetUrl";
import type { AssetEntry } from "@/core/document/schema";
import { IMAGE_MODES, type ImageMode, type ImagePaint } from "@/core/paint/paints";
import { useDocument } from "@/core/store/useDocumentStore";

const MODE_LABEL: Record<ImageMode, string> = { fill: "Fill", fit: "Fit", crop: "Crop", tile: "Tile" };

const pct = (n: number) => Math.round(n * 100);

export const ImageFillControls: React.FC<{ label: string; paint: ImagePaint; onChange: (next: ImagePaint) => void }> = ({ label, paint, onChange }) => {
  const assets = useDocument((d) => d.assets);
  const input = useRef<HTMLInputElement | null>(null);
  const pictures = Object.values(assets ?? {}).filter((a) => a.kind === "image" || a.kind === "svg").sort((a, b) => b.addedAt - a.addedAt);

  const choose = (entry: AssetEntry | undefined) =>
    onChange(entry ? { ...paint, src: assetSrc(entry.id), ...(entry.width && entry.height ? { natural: { w: entry.width, h: entry.height } } : { natural: undefined }) } : { ...paint, src: "", natural: undefined });

  const filter = (key: "brightness" | "contrast" | "saturation", name: string) => (
    <label className="image-fill__num">
      <span>{name}</span>
      <input
        type="number"
        aria-label={`${label} ${key}`}
        min={0}
        max={300}
        value={pct(paint[key])}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange({ ...paint, [key]: Math.min(3, Math.max(0, n / 100)) });
        }}
      />
    </label>
  );

  return (
    <div className="image-fill" role="group" aria-label={`${label} picture`}>
      <div className="image-fill__row">
        <select className="paint-row__type" aria-label={`${label} picture file`} value={paint.src.startsWith("asset:") ? paint.src.slice(6) : ""} onChange={(e) => choose(pictures.find((a) => a.id === e.target.value))}>
          <option value="">{paint.src && !paint.src.startsWith("asset:") ? "Linked picture" : "Choose a picture"}</option>
          {pictures.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button type="button" className="paint-row__btn paint-row__btn--text" onClick={() => input.current?.click()}>Import…</button>
        <input
          ref={input}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml,.svg"
          aria-label={`${label} import picture`}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            const [first] = (await importFiles(files)).filter((o) => o.entry && o.entry.kind !== "font");
            if (first?.entry) choose(first.entry);
          }}
        />
      </div>
      <div className="effects-block__row" role="radiogroup" aria-label={`${label} picture fit`}>
        {IMAGE_MODES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={paint.mode === m} className={`effects-chip ${paint.mode === m ? "effects-chip--on" : ""}`} onClick={() => onChange({ ...paint, mode: m })}>
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      {paint.mode === "tile" && (
        <label className="image-fill__num">
          <span>Tile size</span>
          <input type="number" aria-label={`${label} tile size`} min={5} max={2000} value={pct(paint.scale)} onChange={(e) => Number.isFinite(Number(e.target.value)) && onChange({ ...paint, scale: Math.min(20, Math.max(0.05, Number(e.target.value) / 100)) })} />
          <span aria-hidden>%</span>
        </label>
      )}
      {paint.mode === "crop" && (
        <div className="image-fill__hint">Drag the corners of the picture on the canvas, or its middle to move it.</div>
      )}
      <div className="image-fill__row">
        {filter("brightness", "Brightness")}
        {filter("contrast", "Contrast")}
        {filter("saturation", "Saturation")}
      </div>
    </div>
  );
};
