"use client";

/**
 * The Assets panel (ROADMAP Phase 36): the files this document uses, with previews. Import with the button, or drop
 * files on the canvas or paste a picture; click a tile to put it on the canvas, drag it to a place, remove one that
 * nothing uses. The bytes live in the browser's asset store (IndexedDB); the document keeps only the manifest.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, ImagePlus, Trash2, Upload } from "lucide-react";
import { getAssetStore } from "@/core/assets/AssetStore";
import { importFiles, placeAsDesign, placeAsVectors, placeImage } from "@/core/assets/assetImport";
import type { AssetEntry } from "@/core/document/schema";
import { documentCommands, useDocument } from "@/core/store/useDocumentStore";
import { useAssetUiStore } from "@/core/store/useAssetUiStore";
import { ComponentsList } from "./ComponentsList";
import "@/editor/styles/assets.css";

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml,.svg,.woff,.woff2,.ttf,.otf";

const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** The preview URL for an asset: its thumbnail, else the file itself for an SVG. */
function usePreview(entry: AssetEntry, version: number): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let made: string | null = null;
    void getAssetStore().get(entry.id).then((r) => {
      if (revoked || !r) return;
      const source = r.thumb ?? (r.kind === "svg" ? r.blob : null);
      if (!source) return setUrl(null);
      made = URL.createObjectURL(source);
      setUrl(made);
    });
    return () => {
      revoked = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [entry.id, version]);
  return url;
}

const Tile: React.FC<{ entry: AssetEntry; uses: number; version: number }> = ({ entry, uses, version }) => {
  const url = usePreview(entry, version);
  return (
    <li
      className="asset-tile"
      data-asset-id={entry.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-lazylayout-asset", entry.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
    >
      <button type="button" className="asset-tile__thumb" aria-label={`Add ${entry.name} to the canvas`} disabled={entry.kind === "font"} onClick={() => placeImage(entry)}>
        {url ? <img src={url} alt="" /> : entry.kind === "font" ? <span className="asset-tile__font">Aa</span> : <FileText size={22} aria-hidden />}
      </button>
      {entry.kind === "svg" && (
        <button type="button" className="asset-tile__vectors" aria-label={`Place ${entry.name} as vectors`} title="Place as editable vector layers" onClick={() => void placeAsVectors(entry)}>
          Vectors
        </button>
      )}
      {entry.kind === "svg" && (
        <button type="button" className="asset-tile__vectors" aria-label={`Place ${entry.name} as a design`} title="Place as an editable design: groups, shapes, gradients and text as layers" onClick={() => void placeAsDesign(entry)}>
          Design
        </button>
      )}
      <div className="asset-tile__name" title={entry.name}>{entry.name}</div>
      <div className="asset-tile__meta">
        {entry.width && entry.height ? `${Math.round(entry.width)} × ${Math.round(entry.height)} · ` : ""}
        {formatBytes(entry.bytes)}
        {uses > 0 ? ` · used ${uses}×` : ""}
      </div>
      <button
        type="button"
        className="asset-tile__remove"
        aria-label={`Remove ${entry.name}`}
        title={uses > 0 ? "In use: remove the layers that use it first" : "Remove from this project"}
        disabled={uses > 0}
        onClick={() => documentCommands.removeAsset(entry.id, `Remove ${entry.name}`)}
      >
        <Trash2 size={12} />
      </button>
    </li>
  );
};

export const AssetsPanel: React.FC = () => {
  const assets = useDocument((d) => d.assets);
  const layers = useDocument((d) => d.layers);
  const version = useAssetUiStore((s) => s.version);
  const notice = useAssetUiStore((s) => s.notice);
  const input = useRef<HTMLInputElement | null>(null);
  const [storeBytes, setStoreBytes] = useState<number | null>(null);

  const entries = useMemo(() => Object.values(assets ?? {}).sort((a, b) => b.addedAt - a.addedAt), [assets]);
  const uses = useMemo(() => {
    const n = new Map<string, number>();
    for (const l of Object.values(layers)) {
      const src = l.properties["media.src"];
      if (typeof src === "string" && src.startsWith("asset:")) n.set(src.slice(6), (n.get(src.slice(6)) ?? 0) + 1);
    }
    return n;
  }, [layers]);

  useEffect(() => {
    let live = true;
    void getAssetStore().totalBytes().then((b) => live && setStoreBytes(b)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [version, assets]);

  return (
    <div className="assets-panel panel-shell" role="region" aria-label="Assets">
      <div className="assets-panel__head">
        <button type="button" className="assets-panel__import" onClick={() => input.current?.click()}>
          <Upload size={13} aria-hidden /> Import files
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          aria-label="Import files"
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void importFiles(files);
          }}
        />
      </div>
      <ComponentsList />
      {entries.length === 0 ? (
        <div className="assets-panel__empty">
          <ImagePlus size={28} aria-hidden />
          <p>No files yet.</p>
          <p>Drop pictures on the canvas, paste one, or import files.</p>
        </div>
      ) : (
        <ul className="assets-panel__grid" aria-label="Imported files">
          {entries.map((e) => <Tile key={e.id} entry={e} uses={uses.get(e.id) ?? 0} version={version} />)}
        </ul>
      )}
      <div className="assets-panel__foot" role="status">
        {notice ?? `${entries.length} ${entries.length === 1 ? "file" : "files"}${storeBytes ? ` · ${formatBytes(storeBytes)} kept in this browser` : ""}`}
      </div>
    </div>
  );
};

