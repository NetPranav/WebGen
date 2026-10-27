/**
 * Bringing files into the editor (ROADMAP Phase 36): drop, paste or pick. Each file goes through the asset store
 * (looked at, cleaned, hashed, kept), is recorded in the document's manifest (one undo step), and, for pictures,
 * becomes an image layer where it was dropped.
 */

import type { AssetEntry } from "../document/schema";
import { listFrames } from "../frames/frames";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { useAssetUiStore } from "../store/useAssetUiStore";
import { AssetError, getAssetStore } from "./AssetStore";
import { assetSrc } from "./useAssetUrl";
import { importSvgAsVectors, readSvgShapes } from "../editing/vectorOps";
import { importSvgDesign } from "../editing/svgImportOps";
import { makeThumbnail } from "./thumbnails";

export interface ImportOutcome {
  name: string;
  entry?: AssetEntry;
  /** True when it was new to this browser's store. */
  created?: boolean;
  error?: string;
}

/** The size a picture is placed at: its own, scaled down so the longer side is at most `max`. */
export function placedSize(entry: Pick<AssetEntry, "width" | "height">, max = 600): { width: number; height: number } {
  const w = entry.width ?? 240;
  const h = entry.height ?? 160;
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/** Keeps files, and records them in the document. Nothing is placed on the canvas. */
export async function importFiles(files: readonly File[]): Promise<ImportOutcome[]> {
  const store = getAssetStore();
  const outcomes: ImportOutcome[] = [];
  for (const file of files) {
    try {
      const { entry, created } = await store.import(file, file.name);
      if (!getDocument().assets?.[entry.id]) documentCommands.addAsset(entry, `Import ${entry.name}`);
      outcomes.push({ name: file.name, entry, created });
      if (created && entry.kind === "image") {
        // the preview is made in the background; the panel shows it when it arrives
        void store.get(entry.id).then(async (r) => {
          const thumb = r ? await makeThumbnail(r.blob) : null;
          if (thumb) await store.setThumbnail(entry.id, thumb);
          useAssetUiStore.getState().bump();
        });
      }
    } catch (error) {
      outcomes.push({ name: file.name, error: error instanceof AssetError ? error.message : `${file.name} couldn't be imported${error instanceof Error && error.message ? ` (${error.name}: ${error.message})` : ""}.` });
    }
  }
  useAssetUiStore.getState().bump();
  const failed = outcomes.filter((o) => o.error);
  if (failed.length > 0) useAssetUiStore.getState().setNotice(failed.map((f) => f.error).join(" "));
  return outcomes;
}

/** Makes an image layer for an imported picture. `at` is where its centre goes, in canvas space; without it, the middle of the active frame. Returns the new layer's id, or null. */
export function placeImage(entry: AssetEntry, at?: { x: number; y: number; parentId?: string | null; parentOrigin?: { x: number; y: number } }): string | null {
  if (entry.kind === "font") return null;
  const layers = getDocument().layers;
  const frames = listFrames(layers);
  const activeId = useCanvasViewStore.getState().activeFrameId;
  const frame = frames.find((f) => f.id === (at?.parentId ?? activeId)) ?? frames[0];
  if (!frame && !at?.parentId) return null;
  const parentId = at?.parentId ?? frame!.id;
  const origin = at?.parentOrigin ?? (frame ? { x: frame.x, y: frame.y } : { x: 0, y: 0 });
  const size = placedSize(entry);
  const centre = at ? { x: at.x, y: at.y } : frame ? { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 } : { x: 0, y: 0 };
  const id = documentCommands.addLayer(
    {
      archetype: "image",
      parentId,
      name: entry.name.replace(/\.[^.]+$/, "") || "Image",
      properties: {
        positioning: "absolute",
        "media.src": assetSrc(entry.id),
        "media.alt": entry.name,
        "frame.x": Math.round(centre.x - size.width / 2 - origin.x),
        "frame.y": Math.round(centre.y - size.height / 2 - origin.y),
        "frame.width": size.width,
        "frame.height": size.height,
      },
    },
    `Add ${entry.name}`,
  );
  useSelectionStore.getState().select(id, "element");
  return id;
}

/**
 * Places an SVG asset as editable vector layers (one path layer per shape) instead of one picture (ROADMAP Phase 40).
 * Returns the new layer ids; empty when the asset isn't an SVG, has no shapes, or there is no frame to put them in.
 */
export async function placeAsVectors(entry: AssetEntry, at?: { x: number; y: number; parentId?: string | null; parentOrigin?: { x: number; y: number } }): Promise<string[]> {
  if (entry.kind !== "svg") return [];
  const record = await getAssetStore().get(entry.id);
  if (!record) return [];
  const read = readSvgShapes(await record.blob.text());
  if (!read) return [];
  const frames = listFrames(getDocument().layers);
  const activeId = useCanvasViewStore.getState().activeFrameId;
  const frame = frames.find((f) => f.id === (at?.parentId ?? activeId)) ?? frames[0];
  if (!frame && !at?.parentId) return [];
  const parentId = at?.parentId ?? frame!.id;
  const origin = at?.parentOrigin ?? (frame ? { x: frame.x, y: frame.y } : { x: 0, y: 0 });
  const size = placedSize({ width: read.width, height: read.height });
  const k = size.width / read.width;
  const centre = at ? { x: at.x, y: at.y } : frame ? { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 } : { x: 0, y: 0 };
  const ids = importSvgAsVectors(await record.blob.text(), { id: parentId, origin }, { x: centre.x - size.width / 2, y: centre.y - size.height / 2 }, k);
  if (ids.length > 0) useSelectionStore.getState().selectMultiple(ids, "element");
  return ids;
}

/**
 * Places an SVG asset as an editable design (FigCraft port F14): a frame holding the file's groups, shapes, gradients
 * and text as layers. Returns the frame's id and the notes on what was left out; null when it can't be placed.
 */
export async function placeAsDesign(entry: AssetEntry, at?: { x: number; y: number; parentId?: string | null; parentOrigin?: { x: number; y: number } }): Promise<{ frame: string; notes: string[] } | null> {
  if (entry.kind !== "svg") return null;
  const record = await getAssetStore().get(entry.id);
  if (!record) return null;
  const text = await record.blob.text();
  const read = readSvgShapes(text);
  const frames = listFrames(getDocument().layers);
  const activeId = useCanvasViewStore.getState().activeFrameId;
  const frame = frames.find((f) => f.id === (at?.parentId ?? activeId)) ?? frames[0];
  if (!frame && !at?.parentId) return null;
  const parentId = at?.parentId ?? frame!.id;
  const origin = at?.parentOrigin ?? (frame ? { x: frame.x, y: frame.y } : { x: 0, y: 0 });
  const natural = read ? { width: read.width, height: read.height } : { width: 100, height: 100 };
  const size = placedSize(natural);
  const k = size.width / natural.width;
  const centre = at ? { x: at.x, y: at.y } : frame ? { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 } : { x: 0, y: 0 };
  return importSvgDesign(text, parentId, { x: centre.x - size.width / 2 - origin.x, y: centre.y - size.height / 2 - origin.y }, k, entry.name);
}

/** Import, then place every picture among them. */
export async function importAndPlace(files: readonly File[], at?: Parameters<typeof placeImage>[1]): Promise<ImportOutcome[]> {
  const outcomes = await importFiles(files);
  let offset = 0;
  for (const o of outcomes) {
    if (o.entry && o.entry.kind !== "font") {
      placeImage(o.entry, at ? { ...at, x: at.x + offset, y: at.y + offset } : undefined);
      offset += 24; // several pictures at once fan out instead of piling up
    }
  }
  return outcomes;
}

/**
 * Test seam: with `window.__LL_TEST__` set before load, `window.__LL_ASSETS__` lets a browser test look inside the
 * asset store and fill it with many large files (the 200 MB gate), without a file dialog.
 */
if (typeof window !== "undefined" && (window as unknown as { __LL_TEST__?: boolean }).__LL_TEST__) {
  (window as unknown as Record<string, unknown>).__LL_ASSETS__ = {
    placeAsVectors: async (id: string) => {
      const entry = getDocument().assets?.[id] ?? Object.values(getDocument().assets ?? {}).find((e) => e.id === id);
      return entry ? placeAsVectors(entry) : [];
    },
    placeAsDesign: async (id: string) => {
      const entry = getDocument().assets?.[id] ?? Object.values(getDocument().assets ?? {}).find((e) => e.id === id);
      return entry ? placeAsDesign(entry) : null;
    },
    list: async () => (await getAssetStore().list()).map((r) => ({ id: r.id, name: r.name, kind: r.kind, bytes: r.bytes, thumb: !!r.thumb })),
    totalBytes: () => getAssetStore().totalBytes(),
    text: async (id: string) => (await getAssetStore().get(id))?.blob.text() ?? null,
    /** The SHA-256 of what is stored under `id`, computed again from the bytes. */
    rehash: async (id: string) => {
      const r = await getAssetStore().get(id);
      if (!r) return null;
      const digest = await crypto.subtle.digest("SHA-256", await r.blob.arrayBuffer());
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    },
    /** Imports `count` distinct files of `bytesEach` bytes: a PNG header and random data. */
    fill: async (count: number, bytesEach: number) => {
      const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0];
      for (let i = 0; i < count; i++) {
        const bytes = new Uint8Array(bytesEach);
        bytes.set(png);
        for (let at = png.length; at < bytesEach; at += 65536) crypto.getRandomValues(bytes.subarray(at, Math.min(bytesEach, at + 65536)));
        const [outcome] = await importFiles([new File([bytes], `big-${i}.png`, { type: "image/png" })]);
        if (outcome.error) throw new Error(outcome.error);
      }
    },
  };
}
