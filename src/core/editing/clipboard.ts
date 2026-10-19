/**
 * The layer clipboard (ROADMAP Phase 29). Copied layers travel as text with a marker, so they go through the system
 * clipboard (to another tab, another window, another project) and survive being pasted into a text field harmlessly.
 * Every paste re-validates the payload against the document schema, caps its size, and gives every layer a fresh id.
 * A copy is also mirrored to `localStorage`, which is what a paste falls back to when the browser gives the page no
 * clipboard text (some engines don't, without a permission prompt): tabs of the same origin always share it.
 */

import { z } from "zod";
import { LayerSchema } from "../document/schema";
import { ClipSchema } from "../document/motion";
import type { Clip, Layer } from "../document/schema";

export const CLIP_MARK = "lazylayout:clip:1";
export const CLIP_STORAGE_KEY = "lazylayout:clipboard";
/** Most layers one paste may bring, and the longest payload text read (protects the tab from a hostile clipboard). */
export const MAX_CLIP_LAYERS = 5_000;
export const MAX_CLIP_CHARS = 8_000_000;

const PayloadSchema = z.object({
  v: z.literal(1),
  layers: z.array(LayerSchema).min(1).max(MAX_CLIP_LAYERS),
  clips: z.array(ClipSchema).max(MAX_CLIP_LAYERS),
  roots: z.array(z.string()).min(1),
  source: z.object({ projectId: z.string().optional(), parentId: z.string().nullable(), at: z.number() }),
});

export interface ClipPayload {
  v: 1;
  layers: Layer[];
  clips: Clip[];
  /** Ids (in `layers`) of the copied subtree roots, in the order they were selected. */
  roots: string[];
  /** Where they came from: the parent they were copied out of (null for a frame) and when. */
  source: { projectId?: string; parentId: string | null; at: number };
}

export function serializeClip(payload: ClipPayload): string {
  return `${CLIP_MARK}\n${JSON.stringify(payload)}`;
}

/** The payload in `text`, or null if it isn't ours or doesn't pass the schema. */
export function parseClip(text: string | null | undefined): ClipPayload | null {
  if (!text || text.length > MAX_CLIP_CHARS || !text.startsWith(CLIP_MARK)) return null;
  try {
    const json: unknown = JSON.parse(text.slice(CLIP_MARK.length));
    const parsed = PayloadSchema.safeParse(json);
    if (!parsed.success) return null;
    const { layers, roots } = parsed.data;
    const ids = new Set(layers.map((l) => l.id));
    if (ids.size !== layers.length || !roots.every((r) => ids.has(r))) return null;
    return parsed.data as ClipPayload;
  } catch {
    return null;
  }
}

/** Mirrors the clip to localStorage. Returns false when storage is full or blocked, so a cut knows nothing was kept. */
export function mirrorWrite(text: string): boolean {
  try {
    window.localStorage.setItem(CLIP_STORAGE_KEY, text);
    return true;
  } catch {
    return false;
  }
}

export function mirrorRead(): string | null {
  try {
    return window.localStorage.getItem(CLIP_STORAGE_KEY);
  } catch {
    return null;
  }
}
