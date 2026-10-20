/**
 * ============================================================================
 * THE ASSET STORE (ROADMAP Phase 36)
 * ============================================================================
 * Importing a file: look at its bytes (not its name), refuse what isn't an image, SVG or font, clean an SVG
 * (decision 0008 R5), name it by the SHA-256 of what will be stored, measure it from its header, and keep it. The
 * same bytes imported twice are one asset. The document gets only a description (`AssetEntry`); the bytes stay here.
 * ============================================================================
 */

import type { AssetEntry } from "../document/schema";
import { IdbAssetBackend, type AssetBackend, type AssetRecord } from "./backend";
import { sha256Hex } from "./hash";
import { rasterSize, sniffAsset, svgSize } from "./sniff";
import { SvgRejected, sanitizeSvg } from "./svgSanitize";

/** The biggest file one import accepts. */
export const MAX_ASSET_BYTES = 50 * 1024 * 1024;

export type AssetErrorCode = "too-big" | "unsupported" | "bad-svg" | "empty";

export class AssetError extends Error {
  constructor(readonly code: AssetErrorCode, message: string) {
    super(message);
    this.name = "AssetError";
  }
}

export interface ImportResult {
  entry: AssetEntry;
  /** False when these exact bytes were already in the store. */
  created: boolean;
}

/** A file name safe to show and to store: no path, no control characters, at most 200 characters. */
export function assetName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  return base.replace(/[\u0000-\u001f\u007f]+/g, "").trim().slice(0, 200) || "Untitled";
}

export class AssetStore {
  private readonly urls = new Map<string, string>();

  constructor(
    readonly backend: AssetBackend,
    private readonly maxBytes = MAX_ASSET_BYTES,
  ) {}

  async import(file: Blob, name: string): Promise<ImportResult> {
    if (file.size === 0) throw new AssetError("empty", `${assetName(name)} is empty.`);
    if (file.size > this.maxBytes) throw new AssetError("too-big", `${assetName(name)} is larger than the ${Math.round(this.maxBytes / 1024 / 1024)} MB a file import accepts.`);
    let bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffAsset(bytes);
    if (!kind) throw new AssetError("unsupported", `${assetName(name)} isn't an image, an SVG or a font this editor can use.`);

    let size: { width: number; height: number } | null = null;
    if (kind.kind === "svg") {
      let clean: string;
      try {
        clean = sanitizeSvg(new TextDecoder("utf-8").decode(bytes).replace(/^\ufeff/, ""));
      } catch (e) {
        throw new AssetError("bad-svg", e instanceof SvgRejected ? `${assetName(name)}: ${e.message}` : `${assetName(name)} can't be read as an SVG.`);
      }
      bytes = new TextEncoder().encode(clean);
      size = svgSize(clean);
    } else if (kind.kind === "image") {
      size = rasterSize(bytes, kind.mime);
    }

    const id = await sha256Hex(bytes);
    const existing = await this.backend.get(id);
    if (existing) return { entry: toEntry(existing), created: false };

    const record: AssetRecord = {
      id,
      kind: kind.kind,
      mime: kind.mime,
      name: assetName(name),
      bytes: bytes.length,
      ...(size ? { width: size.width, height: size.height } : {}),
      blob: new Blob([bytes as unknown as ArrayBuffer], { type: kind.mime }),
      addedAt: Date.now(),
    };
    await this.backend.put(record);
    return { entry: toEntry(record), created: true };
  }

  get(id: string) {
    return this.backend.get(id);
  }

  list() {
    return this.backend.list();
  }

  totalBytes() {
    return this.backend.size();
  }

  async remove(id: string) {
    const url = this.urls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.urls.delete(id);
    }
    await this.backend.delete(id);
  }

  /** A `blob:` URL for the asset, the same one every time, or null when it isn't stored. */
  async urlFor(id: string): Promise<string | null> {
    const cached = this.urls.get(id);
    if (cached) return cached;
    const record = await this.backend.get(id);
    if (!record) return null;
    const url = URL.createObjectURL(record.blob);
    this.urls.set(id, url);
    return url;
  }

  async setThumbnail(id: string, thumb: Blob): Promise<void> {
    const record = await this.backend.get(id);
    if (record) await this.backend.put({ ...record, thumb });
  }
}

export function toEntry(record: AssetRecord): AssetEntry {
  return {
    id: record.id,
    name: record.name,
    kind: record.kind,
    mime: record.mime,
    bytes: record.bytes,
    ...(record.width ? { width: record.width } : {}),
    ...(record.height ? { height: record.height } : {}),
    addedAt: record.addedAt,
  };
}

let shared: AssetStore | null = null;

/** The browser's asset store (IndexedDB). */
export function getAssetStore(): AssetStore {
  return (shared ??= new AssetStore(new IdbAssetBackend()));
}

/** For tests: swap in a store with another backend. */
export function setAssetStore(store: AssetStore | null): void {
  shared = store;
}
