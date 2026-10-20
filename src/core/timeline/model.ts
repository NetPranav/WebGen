import { layerBar, type Composition, type CompositionLayer } from "../document/compositions";
import type { MotionDocument } from "../document/schema";
import { canRunOnWaapi } from "../engine/stage/waapiEligibility";
import { animatedLayers, animatedPaths } from "../engine/stage/styleWrites";
import { buildRows, type LayerRow } from "../layers/layerTree";

/**
 * ============================================================================
 * THE TIMELINE AS DATA (ROADMAP Phase 61)
 * ============================================================================
 * Pure functions behind the timeline panel: which rows it lists (the Layers panel's order and expansion), each layer's
 * time bar, and the trim, slide and work-area arithmetic, snapped to whole frames. No DOM, no store.
 * ============================================================================
 */

export type MotionEngine = "web animations" | "kernel";

export interface MotionSummary {
  clips: number;
  states: number;
  /** Which engine plays the layer's animation, or null when it has none. */
  engine: MotionEngine | null;
}

/** What a layer animates: how many clips and states it has and which engine plays them. Drives the Layers panel's motion badge. */
export function motionSummary(doc: MotionDocument, layerId: string): MotionSummary {
  let clips = 0;
  for (const clip of Object.values(doc.clips)) if (clip.layerId === layerId) clips++;
  let states = 0;
  for (const state of Object.values(doc.states)) if (state.layerId === layerId) states++;
  const paths = animatedPaths(doc, layerId);
  return { clips, states, engine: paths.size === 0 ? null : canRunOnWaapi(paths) ? "web animations" : "kernel" };
}

export interface TimelineRow extends LayerRow {
  /** The layer's bar in the composition (the whole composition when it has none). */
  bar: CompositionLayer;
  /** The layer has a bar of its own (it was trimmed or moved). */
  trimmed: boolean;
  solo: boolean;
  shy: boolean;
  motionBlur: boolean;
  /** CSS `mix-blend-mode` of the layer. */
  blendMode: string;
  parentName: string | null;
  motion: MotionSummary;
}

/** The rows of the timeline: the Layers panel's rows (same order and open groups), with each layer's bar and switches. */
export function buildTimelineRows(doc: MotionDocument, compositionId: string, expanded: ReadonlySet<string>, options: { hideShy?: boolean } = {}): TimelineRow[] {
  const comp = doc.compositions[compositionId];
  if (!comp) return [];
  const rows: TimelineRow[] = [];
  for (const row of buildRows(doc.layers, expanded)) {
    const layer = doc.layers[row.id];
    if (options.hideShy && layer.shy === true) continue;
    const blend = layer.properties["appearance.blendMode"];
    rows.push({
      ...row,
      bar: layerBar(comp, row.id),
      trimmed: comp.layers[row.id] !== undefined,
      solo: layer.solo === true,
      shy: layer.shy === true,
      motionBlur: layer.motionBlur === true,
      blendMode: typeof blend === "string" && blend !== "" ? blend : "normal",
      parentName: layer.parentId ? (doc.layers[layer.parentId]?.name ?? null) : null,
      motion: motionSummary(doc, row.id),
    });
  }
  return rows;
}

/** `mix-blend-mode` values the timeline offers. */
export const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"] as const;

// ---------------------------------------------------------------------------
// Arithmetic, in seconds, snapped to whole frames
// ---------------------------------------------------------------------------

export const snapTime = (time: number, fps: number): number => Math.round(time * fps) / fps;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Dimensions = Pick<Composition, "duration" | "fps">;

/** Moves the bar's in point to `time` (snapped to a frame): never before 0, and at least one frame before the out point. */
export function trimIn(bar: CompositionLayer, time: number, comp: Dimensions): CompositionLayer {
  const frame = 1 / comp.fps;
  return { ...bar, in: clamp(snapTime(time, comp.fps), 0, bar.out - frame) };
}

/** Moves the bar's out point to `time`: never past the composition's end, and at least one frame after the in point. */
export function trimOut(bar: CompositionLayer, time: number, comp: Dimensions): CompositionLayer {
  const frame = 1 / comp.fps;
  return { ...bar, out: clamp(snapTime(time, comp.fps), bar.in + frame, comp.duration) };
}

/** Slides the whole bar (in, out and the layer's own time 0) by `delta`, keeping it inside the composition. */
export function slideBar(bar: CompositionLayer, delta: number, comp: Dimensions): CompositionLayer {
  const wanted = snapTime(delta, comp.fps);
  const shift = clamp(wanted, -bar.in, comp.duration - bar.out);
  return { ...bar, in: bar.in + shift, out: bar.out + shift, start: bar.start + shift };
}

/** A work area inside the composition, snapped to frames, at least one frame long. Null when it can't be made. */
export function clampWorkArea(start: number, end: number, comp: Dimensions): { start: number; end: number } | null {
  const frame = 1 / comp.fps;
  const s = clamp(snapTime(start, comp.fps), 0, comp.duration - frame);
  const e = clamp(snapTime(end, comp.fps), s + frame, comp.duration);
  return e > s ? { start: s, end: e } : null;
}

/** Seconds as the ruler shows them: `MM:SS:FF` timecode, or the frame number. */
export function rulerLabel(time: number, fps: number, mode: "timecode" | "frames"): string {
  const frame = Math.round(time * fps);
  if (mode === "frames") return String(frame);
  const f = frame % fps;
  const totalSeconds = Math.floor(frame / fps);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}:${pad(f)}`;
}

/** Seconds between ruler ticks so ticks sit at least `minPx` apart at `pixelsPerSecond`. */
export function tickStep(pixelsPerSecond: number, minPx = 70): number {
  for (const step of [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60]) if (step * pixelsPerSecond >= minPx) return step;
  return 60;
}

/**
 * `motionSummary` for every layer that has clips or states, in one pass (the Layers panel draws a badge on each).
 * Layers with neither are absent.
 */
export function motionIndex(doc: Pick<MotionDocument, "layers" | "clips" | "states" | "behaviours">): Map<string, MotionSummary> {
  const out = new Map<string, MotionSummary>();
  const entry = (id: string): MotionSummary => {
    let e = out.get(id);
    if (!e) out.set(id, (e = { clips: 0, states: 0, engine: null }));
    return e;
  };
  for (const clip of Object.values(doc.clips)) if (doc.layers[clip.layerId]) entry(clip.layerId).clips++;
  for (const state of Object.values(doc.states)) if (doc.layers[state.layerId]) entry(state.layerId).states++;
  for (const [id, paths] of animatedLayers(doc as MotionDocument)) {
    const e = out.get(id);
    if (e) e.engine = canRunOnWaapi(paths) ? "web animations" : "kernel";
  }
  return out;
}

/** What a motion badge says, in words: "2 animations, 1 state, plays on web animations". */
export function motionLabel(m: MotionSummary): string {
  const parts: string[] = [];
  if (m.clips > 0) parts.push(`${m.clips} animation${m.clips === 1 ? "" : "s"}`);
  if (m.states > 0) parts.push(`${m.states} state${m.states === 1 ? "" : "s"}`);
  if (m.engine) parts.push(`plays on ${m.engine}`);
  return parts.join(", ");
}
