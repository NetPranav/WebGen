import { layerBar, type Composition, type CompositionLayer } from "../document/compositions";
import type { Layer, MotionDocument } from "../document/schema";
import { getPropertyDefinition, isPropertyLegalFor } from "../document/properties";
import { getDefaultProps, type PropValue } from "../document/registry";
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

// ---------------------------------------------------------------------------
// Twirl-downs and stopwatches (ROADMAP Phase 62)
// ---------------------------------------------------------------------------
// A layer opens into groups, a group into properties. A property with a stopwatch on has a track in one of the layer's
// clips in this composition; its keyframes show as diamonds on the layer's bar.

export const PROPERTY_GROUPS = ["transform", "appearance", "effects", "states", "behaviours", "links"] as const;
export type PropertyGroup = (typeof PROPERTY_GROUPS)[number];
export const GROUP_LABELS: Record<PropertyGroup, string> = { transform: "Transform", appearance: "Appearance", effects: "Effects", states: "States", behaviours: "Behaviours", links: "Links" };

/** The properties a stopwatch can start, by group, in plain words. A layer shows the ones its archetype allows. */
export const STOPWATCH_PROPERTIES: Record<"transform" | "appearance", ReadonlyArray<{ path: string; label: string }>> = {
  transform: [
    { path: "transform.x", label: "Position X" },
    { path: "transform.y", label: "Position Y" },
    { path: "transform.scale", label: "Scale" },
    { path: "transform.scaleX", label: "Scale X" },
    { path: "transform.scaleY", label: "Scale Y" },
    { path: "transform.rotate", label: "Rotation" },
    { path: "transform.skewX", label: "Skew X" },
    { path: "transform.skewY", label: "Skew Y" },
  ],
  appearance: [
    { path: "appearance.opacity", label: "Opacity" },
    { path: "appearance.radius", label: "Corner radius" },
    { path: "appearance.background.color", label: "Fill colour" },
    { path: "appearance.border.color", label: "Border colour" },
    { path: "appearance.border.width", label: "Border width" },
  ],
};

/** A keyframe on the ruler: where it sits in composition seconds. */
export interface KeyframeMark {
  id: string;
  clipId: string;
  trackId: string;
  /** Composition seconds (through the layer's bar and the clip's placement). */
  time: number;
  value: PropValue;
}

/** The tracks animating each property of a layer in a composition: `path → keyframe marks`. */
export function animatedProperties(doc: MotionDocument, compositionId: string, layerId: string): Map<string, KeyframeMark[]> {
  const out = new Map<string, KeyframeMark[]>();
  const comp = doc.compositions[compositionId];
  if (!comp) return out;
  const bar = layerBar(comp, layerId);
  for (const placement of comp.clips) {
    const clip = doc.clips[placement.clipId];
    if (!clip || clip.layerId !== layerId || !clip.enabled) continue;
    for (const track of clip.tracks) {
      const marks = out.get(track.property) ?? [];
      for (const k of track.keyframes) {
        marks.push({ id: k.id, clipId: clip.id, trackId: track.id, time: bar.start + (placement.offset + (clip.delay ?? 0) + k.time) * bar.stretch, value: k.value });
      }
      out.set(track.property, marks);
    }
  }
  for (const marks of out.values()) marks.sort((a, b) => a.time - b.time);
  return out;
}

/** The property's value on the layer itself (its own setting, else the archetype's default), ignoring animation. */
export function staticValue(layer: Layer, path: string): PropValue | undefined {
  return layer.properties[path] ?? getPropertyDefinition(path)?.default;
}

/** The property has been set away from the archetype's default, or is animated. */
export function isModified(layer: Layer, path: string, animated: boolean): boolean {
  if (animated) return true;
  const own = layer.properties[path];
  return own !== undefined && JSON.stringify(own) !== JSON.stringify(getDefaultProps(layer.archetype)[path] ?? getPropertyDefinition(path)?.default);
}

export type TimelineItem =
  | { kind: "layer"; row: TimelineRow; propsOpen: boolean }
  | { kind: "group"; layerId: string; layerName: string; group: PropertyGroup; label: string; open: boolean; count: number }
  | { kind: "property"; layerId: string; layerName: string; path: string; label: string; animated: boolean; keys: KeyframeMark[]; value: PropValue | undefined }
  | { kind: "info"; layerId: string; layerName: string; group: PropertyGroup; label: string; detail: string };

export type RevealMode = "animated" | "modified";

export interface TimelineViewState {
  /** `layerId` (a layer's groups are showing) and `layerId|group` (a group's properties are showing). */
  open: ReadonlySet<string>;
  /** U (animated) and UU (modified): show only those properties of these layers, everything open. */
  reveal: Readonly<Record<string, RevealMode>>;
}

/**
 * The timeline's list: each layer row, and under an open layer its groups (Transform, Appearance, Effects, States,
 * Behaviours, Links) and under an open group its properties with stopwatches (or, for Effects, States, Behaviours and
 * Links, what the layer has). A revealed layer (U / UU) lists only its animated (or modified) properties.
 */
export function buildTimelineItems(doc: MotionDocument, compositionId: string, expanded: ReadonlySet<string>, view: TimelineViewState, options: { hideShy?: boolean } = {}): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const row of buildTimelineRows(doc, compositionId, expanded, options)) {
    const layer = doc.layers[row.id];
    const reveal = view.reveal[row.id];
    const propsOpen = reveal !== undefined || view.open.has(row.id);
    items.push({ kind: "layer", row, propsOpen });
    if (!propsOpen) continue;
    const animated = animatedProperties(doc, compositionId, row.id);
    for (const group of PROPERTY_GROUPS) {
      const rows: TimelineItem[] = [];
      if (group === "transform" || group === "appearance") {
        for (const { path, label } of STOPWATCH_PROPERTIES[group]) {
          if (!isPropertyLegalFor(path, layer.archetype)) continue;
          const keys = animated.get(path) ?? [];
          const isAnimated = keys.length > 0;
          if (reveal === "animated" && !isAnimated) continue;
          if (reveal === "modified" && !isModified(layer, path, isAnimated)) continue;
          rows.push({ kind: "property", layerId: row.id, layerName: layer.name, path, label, animated: isAnimated, keys, value: staticValue(layer, path) });
        }
      } else if (!reveal) {
        const owned = group === "effects" ? Object.values(doc.effects).filter((e) => e.layerId === row.id).map((e) => ({ label: e.effectId, detail: `version ${e.version}` }))
          : group === "states" ? Object.values(doc.states).filter((s) => s.layerId === row.id).map((s) => ({ label: s.name, detail: `${Object.keys(s.props).length} propert${Object.keys(s.props).length === 1 ? "y" : "ies"}` }))
          : group === "behaviours" ? Object.values(doc.behaviours).filter((b) => b.layerId === row.id).map((b) => ({ label: b.type, detail: b.enabled ? "on" : "off" }))
          : Object.values(doc.bindings).filter((b) => b.ownerLayerId === row.id).map((b) => ({ label: b.name ?? "Link", detail: "binding" }));
        for (const item of owned) rows.push({ kind: "info", layerId: row.id, layerName: layer.name, group, label: item.label, detail: item.detail });
      }
      if (rows.length === 0 && reveal) continue;
      const open = reveal !== undefined || view.open.has(`${row.id}|${group}`);
      items.push({ kind: "group", layerId: row.id, layerName: layer.name, group, label: GROUP_LABELS[group], open, count: rows.length });
      if (open) items.push(...rows);
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Navigation (ROADMAP Phase 63)
// ---------------------------------------------------------------------------

/** Pixels per second the timeline can be zoomed to. */
export const ZOOM_LIMITS = { min: 20, max: 2400, default: 120 } as const;
export const ZOOM_STEP = 1.25;

export const clampZoom = (pixelsPerSecond: number): number => Math.min(ZOOM_LIMITS.max, Math.max(ZOOM_LIMITS.min, pixelsPerSecond));

/** One zoom step in or out (×1.25), within the limits. */
export const stepZoom = (pixelsPerSecond: number, direction: 1 | -1): number => clampZoom(direction === 1 ? pixelsPerSecond * ZOOM_STEP : pixelsPerSecond / ZOOM_STEP);

/**
 * The zoom and scroll that show `[start, end]` across `viewportPx` pixels with a margin on each side. The scroll is
 * in pixels from the start of the lanes.
 */
export function zoomToRange(start: number, end: number, viewportPx: number, marginPx = 24): { pixelsPerSecond: number; scrollLeft: number } {
  const span = Math.max(1e-6, end - start);
  const pixelsPerSecond = clampZoom(Math.max(1, viewportPx - 2 * marginPx) / span);
  return { pixelsPerSecond, scrollLeft: Math.max(0, start * pixelsPerSecond - marginPx) };
}

/**
 * Where "go to in point" (I) and "go to out point" (O) take the playhead: the earliest in (or latest out) of the
 * selected layers' bars, or the work area's start (end) when no layer is selected.
 */
export function navigationTarget(doc: MotionDocument, compositionId: string, selectedIds: readonly string[], edge: "in" | "out"): number | null {
  const comp = doc.compositions[compositionId];
  if (!comp) return null;
  const chosen = selectedIds.filter((id) => doc.layers[id]);
  if (chosen.length === 0) return edge === "in" ? comp.workArea.start : comp.workArea.end;
  const bars = chosen.map((id) => layerBar(comp, id));
  return edge === "in" ? Math.min(...bars.map((b) => b.in)) : Math.max(...bars.map((b) => b.out));
}
