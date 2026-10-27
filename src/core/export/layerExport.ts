/**
 * Exporting one layer (FigCraft port F11): a layer's export settings (format, scale, file-name suffix) and the files
 * they make. The layer is drawn with the same render definitions as the stage (Law 11) into an SVG (the markup in a
 * `foreignObject`, so text and every paint look as they do on the canvas), and PNG or JPG are that SVG drawn on a
 * canvas at the scale asked for. Pictures from the asset store are left out of the file (they would need the store).
 *
 * Behaviour translated from FigCraft (`crates/doc/src/props.rs` `ExportSetting`, `next_after`), commit 6ea44e9.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Layer } from "../document/schema";
import { RenderTree } from "../render/RenderLayer";

export type ExportFormat = "png" | "jpg" | "svg";
export const EXPORT_FORMATS: readonly ExportFormat[] = ["png", "jpg", "svg"];
export const MAX_EXPORT_SCALE = 4;

export interface ExportSetting {
  format: ExportFormat;
  /** 0.5 to 4. */
  scale: number;
  suffix: string;
}

export const DEFAULT_EXPORT: ExportSetting = { format: "png", scale: 1, suffix: "" };

/** A scale written as a label: `1x`, `2x`, `0.5x`. */
export const scaleLabel = (s: number): string => `${Math.round(s * 100) / 100}x`;

/** The row adding a setting after `last` makes: 1x first, then one scale step up with a matching `@2x` suffix (FigCraft `next_after`). */
export function nextExportSetting(last?: ExportSetting): ExportSetting {
  if (!last) return { ...DEFAULT_EXPORT };
  const scale = Math.min(MAX_EXPORT_SCALE, Math.floor(last.scale) + 1);
  return { format: "png", scale, suffix: `@${scaleLabel(scale)}` };
}

/** A layer's export settings from their JSON (`export.settings`); junk repaired, at most 16. */
export function parseExportSettings(json: unknown): ExportSetting[] {
  if (typeof json !== "string" || !json || json.length > 10_000) return [];
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 16).flatMap((o) => {
      if (!o || typeof o !== "object") return [];
      const r = o as Record<string, unknown>;
      const format = EXPORT_FORMATS.includes(r.format as ExportFormat) ? (r.format as ExportFormat) : "png";
      const scale = typeof r.scale === "number" && Number.isFinite(r.scale) ? Math.min(MAX_EXPORT_SCALE, Math.max(0.5, r.scale)) : 1;
      const suffix = typeof r.suffix === "string" ? r.suffix.replace(/[\\/:*?"<>|]/g, "").slice(0, 40) : "";
      return [{ format, scale, suffix }];
    });
  } catch {
    return [];
  }
}

export const serializeExportSettings = (s: readonly ExportSetting[]): string => (s.length === 0 ? "" : JSON.stringify(s.slice(0, 16)));

/** A file name from a layer name: what file systems allow. */
export const fileNameOf = (name: string, setting: ExportSetting): string => `${(name.replace(/[\\/:*?"<>|]/g, "-").trim() || "layer").slice(0, 100)}${setting.suffix}.${setting.format}`;

/**
 * The layer `id` (and what is in it) as an SVG of `w` × `h` (its size on the page), scaled by `scale`: the layer drawn
 * at the origin of its own box.
 */
export function layerSvg(layers: Record<string, Layer>, id: string, w: number, h: number, scale = 1): string {
  const l = layers[id];
  if (!l) return "";
  // the layer on its own, at the origin
  const alone: Record<string, Layer> = { ...layers, [id]: { ...l, parentId: null, properties: { ...l.properties, positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.rotation": 0 } } };
  const markup = renderToStaticMarkup(React.createElement(RenderTree, { layers: alone, rootIds: [id], ctx: { frameAtOrigin: true } }));
  const W = Math.max(1, Math.round(w * 100) / 100);
  const H = Math.max(1, Math.round(h * 100) / 100);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W * scale)}" height="${Math.round(H * scale)}" viewBox="0 0 ${W} ${H}">` +
    `<foreignObject x="0" y="0" width="${W}" height="${H}"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${W}px;height:${H}px;margin:0">${markup}</div></foreignObject></svg>`
  );
}

/** Draws an SVG on a canvas at its own size and returns the picture (browser only). */
export async function rasterize(svg: string, mime: "image/png" | "image/jpeg"): Promise<Blob> {
  const img = new Image();
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("the layer could not be drawn"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, img.naturalWidth || img.width);
  canvas.height = Math.max(1, img.naturalHeight || img.height);
  const ctx = canvas.getContext("2d")!;
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("the picture could not be made"))), mime, 0.92));
}

/** The file one setting makes for a layer. */
export async function exportFile(layers: Record<string, Layer>, id: string, size: { w: number; h: number }, setting: ExportSetting): Promise<{ name: string; blob: Blob }> {
  const svg = layerSvg(layers, id, size.w, size.h, setting.scale);
  const name = fileNameOf(layers[id]?.name ?? "layer", setting);
  if (setting.format === "svg") return { name, blob: new Blob([svg], { type: "image/svg+xml" }) };
  return { name, blob: await rasterize(svg, setting.format === "png" ? "image/png" : "image/jpeg") };
}

/** Saves a file through the browser. */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
