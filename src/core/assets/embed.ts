/**
 * Putting assets into a `.lazy.json` file and taking them out again (ROADMAP Phase 36). Export embeds the bytes of
 * every asset the project lists (base64, within a size budget; what doesn't fit is named in the file as missing),
 * so a project file is self-contained. Import never trusts them: each one goes through the same import as a dropped
 * file (looked at, SVG cleaned) and is kept only if it ends up with the hash the file claims.
 */

import type { MotionDocument } from "../document/schema";
import type { AssetStore } from "./AssetStore";

export interface EmbeddedAsset {
  name: string;
  mime: string;
  /** Base64 of the bytes. */
  data: string;
}

export type EmbeddedAssets = Record<string, EmbeddedAsset>;

/** The most asset bytes a project file carries (the file as a whole is capped at 64 MB of text, and base64 adds a third). */
export const MAX_EMBED_BYTES = 40 * 1024 * 1024;

export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

export function fromBase64(text: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(text, "base64"));
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface EmbedResult {
  embedded: EmbeddedAssets;
  /** Manifest entries whose bytes aren't in this browser's store, or didn't fit the budget. */
  missing: string[];
}

export async function embedAssets(document: Pick<MotionDocument, "assets">, store: AssetStore, maxBytes = MAX_EMBED_BYTES): Promise<EmbedResult> {
  const embedded: EmbeddedAssets = {};
  const missing: string[] = [];
  let used = 0;
  for (const entry of Object.values(document.assets ?? {})) {
    const record = await store.get(entry.id);
    if (!record || used + record.bytes > maxBytes) {
      missing.push(entry.id);
      continue;
    }
    used += record.bytes;
    embedded[entry.id] = { name: record.name, mime: record.mime, data: toBase64(new Uint8Array(await record.blob.arrayBuffer())) };
  }
  return { embedded, missing };
}

export interface RestoreResult {
  restored: number;
  /** Embedded assets that were refused, or came out with a different hash than the file said. */
  rejected: string[];
}

export async function restoreAssets(embedded: EmbeddedAssets | undefined, store: AssetStore): Promise<RestoreResult> {
  let restored = 0;
  const rejected: string[] = [];
  for (const [id, asset] of Object.entries(embedded ?? {})) {
    try {
      const { entry } = await store.import(new Blob([fromBase64(asset.data) as unknown as ArrayBuffer]), asset.name);
      if (entry.id === id) restored++;
      else rejected.push(id);
    } catch {
      rejected.push(id);
    }
  }
  return { restored, rejected };
}
