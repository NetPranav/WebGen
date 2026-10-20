/**
 * ============================================================================
 * FRAMES (ROADMAP Phase 21)
 * ============================================================================
 * A frame is a top-level layer (Phase 42: "a top-level layer is a frame; there
 * is no document-level artboard"). Its position on the canvas is its
 * `frame.x` / `frame.y`, its size is `frame.width` / `frame.height`, its title
 * is the layer's name. Frames sit side by side, left to right: that order is
 * the order of the frame list. Plain functions over a document's layers; the
 * commands that change a document live in `frameCommands.ts`.
 * ============================================================================
 */

import type { Layer } from "../document/schema";
import { getLayerGeometry } from "../document/properties";

export interface FrameInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FramePreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

/** The sizes the header's Desktop / Tablet / Mobile switch and the "Add frame" menu offer. */
export const FRAME_PRESETS: readonly FramePreset[] = [
  { id: "desktop", label: "Desktop", width: 1440, height: 900 },
  { id: "laptop", label: "Laptop", width: 1280, height: 800 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "mobile", label: "Mobile", width: 375, height: 812 },
];

export type DevicePresetId = "desktop" | "tablet" | "mobile";

/** The space between two frames placed side by side, in canvas px. */
export const FRAME_GAP = 120;
export const MIN_FRAME_SIZE = 40;
export const MAX_FRAME_SIZE = 20_000;

export function getPreset(id: string): FramePreset | undefined {
  return FRAME_PRESETS.find((p) => p.id === id);
}

export function clampFrameSize(n: number): number {
  if (!Number.isFinite(n)) return MIN_FRAME_SIZE;
  return Math.min(MAX_FRAME_SIZE, Math.max(MIN_FRAME_SIZE, Math.round(n)));
}

/** A top-level layer's frame description. */
export function frameInfo(layer: Pick<Layer, "id" | "name" | "parentId" | "properties">): FrameInfo {
  const { frame } = getLayerGeometry(layer);
  return { id: layer.id, name: layer.name, x: frame.x, y: frame.y, width: frame.width, height: frame.height };
}

/** Every frame of a document, left to right (ties: top to bottom, then by id so the order is stable). */
export function listFrames(layers: Record<string, Layer>): FrameInfo[] {
  const frames: FrameInfo[] = [];
  for (const layer of Object.values(layers)) {
    if (layer.parentId === null) frames.push(frameInfo(layer));
  }
  return frames.sort((a, b) => a.x - b.x || a.y - b.y || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The top-level frame a layer belongs to (the layer itself when it is one), or null for an unknown or detached layer. */
export function frameIdOf(layers: Record<string, Layer>, layerId: string): string | null {
  let current = layers[layerId];
  let guard = 0;
  while (current && guard++ < 10_000) {
    if (current.parentId === null) return current.id;
    current = layers[current.parentId];
  }
  return null;
}

/** Where a new frame of `width` goes: to the right of the rightmost frame, on the same top edge as the first. */
export function nextFramePosition(allFrames: readonly FrameInfo[]): { x: number; y: number } {
  const frames = allFrames.filter((f) => Number.isFinite(f.x) && Number.isFinite(f.y) && Number.isFinite(f.width));
  if (frames.length === 0) return { x: 0, y: 0 };
  const rightmost = frames.reduce((best, f) => (f.x + f.width > best.x + best.width ? f : best));
  return { x: Math.round(rightmost.x + rightmost.width + FRAME_GAP), y: Math.min(...frames.map((f) => f.y)) };
}

/** The frame whose size is `preset`'s, if there is one (the first such frame, left to right). */
export function findFrameOfSize(frames: readonly FrameInfo[], width: number, height: number): FrameInfo | undefined {
  return frames.find((f) => f.width === width && f.height === height);
}

/**
 * The x positions that put `orderedIds` side by side in that order, keeping the first frame where it is and a
 * `FRAME_GAP` between neighbours. Used after a reorder, so frames never overlap.
 */
export function reflowPositions(frames: readonly FrameInfo[], orderedIds: readonly string[]): Map<string, number> {
  const byId = new Map(frames.map((f) => [f.id, f] as const));
  const positions = new Map<string, number>();
  const ordered = orderedIds.map((id) => byId.get(id)).filter((f): f is FrameInfo => !!f);
  if (ordered.length === 0) return positions;
  let x = Math.min(...ordered.map((f) => f.x));
  for (const f of ordered) {
    positions.set(f.id, Math.round(x));
    x += f.width + FRAME_GAP;
  }
  return positions;
}

/** `orderedIds` with `id` moved one place left (-1) or right (+1); unchanged at the ends. */
export function moveInOrder(orderedIds: readonly string[], id: string, direction: -1 | 1): string[] {
  const next = [...orderedIds];
  const from = next.indexOf(id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= next.length) return next;
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** A title for a new frame: "Mobile", then "Mobile 2", "Mobile 3" while the name is taken. */
export function uniqueFrameName(frames: readonly FrameInfo[], base: string): string {
  const taken = new Set(frames.map((f) => f.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
