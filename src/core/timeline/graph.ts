import { sampleEasing } from "../kernel/easing";
import { SPRING_FEELS, resolveSpringConfig, type SpringFeel } from "../kernel/springs";
import { parseEasing } from "../document/motion";
import type { MotionDocument } from "../document/schema";
import { STOPWATCH_PROPERTIES } from "./model";
import { locateKeyframes, placementsOf, toComposition } from "./keyframeOps";
import { transaction } from "../editing/editOps";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { getTransport } from "../time/transport";

/**
 * ============================================================================
 * THE GRAPH EDITOR AS DATA (ROADMAP Phase 67)
 * ============================================================================
 * What the value and speed graphs draw, how a segment's feel is written down, and the edits that change it. A
 * keyframe's `ease` is the easing of the segment that ENDS at it (the kernel's rule), so "easing into this keyframe".
 * Springs are edited as Bounce and Time only (Law 17); the physical form (stiffness, damping) is for the Pro face.
 * ============================================================================
 */

const round = (n: number, digits = 3) => Math.round(n * 10 ** digits) / 10 ** digits;

// ---------------------------------------------------------------------------
// Easing strings: springs, bezier curves, presets
// ---------------------------------------------------------------------------

/** `spring(bounce: 0.3, time: 0.6)`. Bounce 0 to 1, time in seconds (0.1 to 3). */
export function springEase(bounce: number, time: number): string {
  const b = Math.min(1, Math.max(0, bounce));
  const t = Math.min(3, Math.max(0.1, time));
  return `spring(bounce: ${round(b, 2)}, time: ${round(t, 2)})`;
}

export type EaseKind = "linear" | "bezier" | "spring" | "physical spring" | "steps" | "named";

/** What kind of feel an easing string is. */
export function easeKind(ease: string | undefined): EaseKind {
  const parsed = parseEasing(ease ?? "linear");
  if (!parsed || parsed.kind === "linear") return "linear";
  if (parsed.kind === "cubicBezier") return "bezier";
  if (parsed.kind === "steps") return "steps";
  if (parsed.kind === "named") return "named";
  const spring = parsed.spring;
  return spring !== null && "bounce" in spring ? "spring" : "physical spring";
}

/** A spring easing as Bounce and Time, or null when it isn't a perceptual spring. */
export function springParams(ease: string | undefined): { bounce: number; time: number } | null {
  const parsed = parseEasing(ease ?? "linear");
  if (!parsed || parsed.kind !== "spring" || parsed.spring === null || !("bounce" in parsed.spring)) return null;
  return { bounce: parsed.spring.bounce, time: parsed.spring.time };
}

/** The physical numbers of a spring easing, for the Pro face only. Null for other easings. */
export function physicalSpring(ease: string | undefined): { stiffness: number; damping: number; mass: number } | null {
  const parsed = parseEasing(ease ?? "linear");
  return parsed && parsed.kind === "spring" ? resolveSpringConfig(parsed.spring) : null;
}

export interface Handles {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Rough bezier forms of the named power curves, so their handles can be picked up and bent. */
const NAMED_AS_BEZIER: Record<string, Handles> = {
  "power1.in": { x1: 0.55, y1: 0.085, x2: 0.68, y2: 0.53 },
  "power1.out": { x1: 0.25, y1: 0.46, x2: 0.45, y2: 0.94 },
  "power1.inOut": { x1: 0.455, y1: 0.03, x2: 0.515, y2: 0.955 },
  "power2.in": { x1: 0.55, y1: 0.055, x2: 0.675, y2: 0.19 },
  "power2.out": { x1: 0.215, y1: 0.61, x2: 0.355, y2: 1 },
  "power2.inOut": { x1: 0.645, y1: 0.045, x2: 0.355, y2: 1 },
  "power3.in": { x1: 0.895, y1: 0.03, x2: 0.685, y2: 0.22 },
  "power3.out": { x1: 0.165, y1: 0.84, x2: 0.44, y2: 1 },
  "power3.inOut": { x1: 0.77, y1: 0, x2: 0.175, y2: 1 },
};

/** The bezier handles of an easing, or null when it can't be drawn as one (springs, steps, other curves). Linear is a straight line. */
export function bezierHandles(ease: string | undefined): Handles | null {
  const text = (ease ?? "linear").trim();
  const parsed = parseEasing(text);
  if (!parsed) return null;
  if (parsed.kind === "linear") return { x1: 0, y1: 0, x2: 1, y2: 1 };
  if (parsed.kind === "cubicBezier") return { x1: parsed.x1, y1: parsed.y1, x2: parsed.x2, y2: parsed.y2 };
  if (parsed.kind === "named") return NAMED_AS_BEZIER[`${parsed.family}.${parsed.direction}`] ?? null;
  return null;
}

/** `cubic-bezier(x1, y1, x2, y2)` with the x handles kept inside 0..1 (the curve stays a function of time) and 3 digits. */
export function bezierEase(h: Handles): string {
  const x = (v: number) => round(Math.min(1, Math.max(0, v)));
  return `cubic-bezier(${x(h.x1)}, ${round(h.y1)}, ${x(h.x2)}, ${round(h.y2)})`;
}

export interface EasePreset {
  id: string;
  label: string;
  /** The easing string, or "hold" for a step to the next value. (Not called `ease`: a repo test reads every `ease:` string literal as an easing.) */
  value: string;
  group: "feel" | "curve" | "hold";
  hint: string;
}

const feel = (id: SpringFeel, label: string, hint: string): EasePreset => ({ id, label, value: springEase(SPRING_FEELS[id].bounce, SPRING_FEELS[id].time), group: "feel", hint });

/** The preset strip: the four named feels first (springs, by Bounce and Time), then classic curves, then Hold. */
export const EASE_PRESETS: readonly EasePreset[] = [
  feel("snappy", "Snappy", "Quick, with a touch of life"),
  feel("smooth", "Smooth", "No overshoot, settles gently"),
  feel("bouncy", "Bouncy", "Overshoots and springs back"),
  feel("lazy", "Lazy", "Slow to settle, a little give"),
  { id: "linear", label: "Linear", value: "linear", group: "curve", hint: "Constant speed" },
  { id: "ease-in", label: "Ease in", value: "cubic-bezier(0.42, 0, 1, 1)", group: "curve", hint: "Starts slow" },
  { id: "ease-out", label: "Ease out", value: "cubic-bezier(0, 0, 0.58, 1)", group: "curve", hint: "Ends slow" },
  { id: "ease-in-out", label: "Ease in and out", value: "cubic-bezier(0.42, 0, 0.58, 1)", group: "curve", hint: "Slow at both ends" },
  { id: "overshoot", label: "Overshoot", value: "cubic-bezier(0.34, 1.56, 0.64, 1)", group: "curve", hint: "Goes past, then back" },
  { id: "hold", label: "Hold", value: "hold", group: "hold", hint: "Keeps the value until the next keyframe" },
];

/** The labels the spring controls show on each face. Simple shows Bounce and Time only; stiffness and damping are Pro (Law 17). */
export function springControlLabels(face: "simple" | "pro"): string[] {
  return face === "pro" ? ["Bounce", "Time", "Stiffness", "Damping", "Mass"] : ["Bounce", "Time"];
}

// ---------------------------------------------------------------------------
// Curves
// ---------------------------------------------------------------------------

export interface GraphKey {
  id: string;
  /** Composition seconds. */
  time: number;
  value: number;
  ease?: string;
  hold?: boolean;
}

export interface GraphCurve {
  layerId: string;
  layerName: string;
  property: string;
  label: string;
  clipId: string;
  trackId: string;
  keys: GraphKey[];
}

const propertyLabel = (path: string): string => [...STOPWATCH_PROPERTIES.transform, ...STOPWATCH_PROPERTIES.appearance].find((p) => p.path === path)?.label ?? path;

/**
 * The curves to draw: the tracks that hold the selected keyframes or, when none are selected, every numeric track of
 * the selected layers. Tracks whose values aren't all numbers (colours, text) have no curve and are left out.
 */
export function graphCurves(doc: MotionDocument, compositionId: string, keyIds: ReadonlySet<string>, layerIds: readonly string[]): GraphCurve[] {
  const wantedTracks = new Set(locateKeyframes(doc, compositionId, keyIds).map((l) => l.trackId));
  const layers = new Set(layerIds);
  const out: GraphCurve[] = [];
  for (const placement of placementsOf(doc, compositionId)) {
    for (const track of placement.clip.tracks) {
      const wanted = wantedTracks.size > 0 ? wantedTracks.has(track.id) : layers.has(placement.clip.layerId);
      if (!wanted || track.keyframes.length === 0 || !track.keyframes.every((k) => typeof k.value === "number" && Number.isFinite(k.value))) continue;
      out.push({
        layerId: placement.clip.layerId,
        layerName: doc.layers[placement.clip.layerId]?.name ?? placement.clip.layerId,
        property: track.property,
        label: propertyLabel(track.property),
        clipId: placement.clip.id,
        trackId: track.id,
        keys: track.keyframes.map((k) => ({ id: k.id, time: toComposition(placement, k.time), value: k.value as number, ...(k.ease ? { ease: k.ease } : {}), ...(k.hold ? { hold: true } : {}) })),
      });
    }
  }
  return out;
}

/** The segment's progress (0 to 1, can overshoot) at `t` seconds between two keys, by the easing of the segment that ends at `to`. */
export function segmentProgress(from: GraphKey, to: GraphKey, time: number): number {
  if (from.hold) return 0;
  const span = to.time - from.time;
  if (span <= 0) return 1;
  const t = Math.min(1, Math.max(0, (time - from.time) / span));
  return sampleEasing(parseEasing(to.ease ?? "linear") ?? { kind: "linear" }, t);
}

/** The curve's value at composition time `time`: held before the first key and after the last. */
export function curveValue(curve: Pick<GraphCurve, "keys">, time: number): number {
  const keys = curve.keys;
  if (keys.length === 0) return 0;
  if (keys.length === 1 || time <= keys[0].time) return keys[0].value;
  const last = keys[keys.length - 1];
  if (time >= last.time) return last.value;
  let i = 1;
  while (keys[i].time < time) i++;
  const from = keys[i - 1];
  const to = keys[i];
  if (from.hold) return from.value;
  return from.value + (to.value - from.value) * segmentProgress(from, to, time);
}

/** Points along the whole curve for drawing: `samples` per segment, so each segment keeps its shape. */
export function curvePoints(curve: Pick<GraphCurve, "keys">, samples = 48): Array<[number, number]> {
  const keys = curve.keys;
  const points: Array<[number, number]> = [];
  if (keys.length === 0) return points;
  points.push([keys[0].time, keys[0].value]);
  for (let i = 1; i < keys.length; i++) {
    const from = keys[i - 1];
    const to = keys[i];
    if (from.hold) {
      points.push([to.time, from.value], [to.time, to.value]);
      continue;
    }
    for (let s = 1; s <= samples; s++) {
      const time = from.time + ((to.time - from.time) * s) / samples;
      points.push([time, from.value + (to.value - from.value) * segmentProgress(from, to, time)]);
    }
  }
  return points;
}

/** The speed graph: how fast the value changes (units per second) along the curve. */
export function speedPoints(curve: Pick<GraphCurve, "keys">, samples = 48): Array<[number, number]> {
  const values = curvePoints(curve, samples);
  const out: Array<[number, number]> = [];
  for (let i = 1; i < values.length; i++) {
    const dt = values[i][0] - values[i - 1][0];
    out.push([values[i][0], dt > 1e-9 ? Math.abs(values[i][1] - values[i - 1][1]) / dt : 0]);
  }
  return out;
}

export interface Bounds {
  t0: number;
  t1: number;
  v0: number;
  v1: number;
}

/** A box around the points with a margin, never flat (so a constant curve still has a scale). */
export function boundsOf(points: ReadonlyArray<readonly [number, number]>, pad = 0.08): Bounds {
  if (points.length === 0) return { t0: 0, t1: 1, v0: 0, v1: 1 };
  let t0 = Infinity, t1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [t, v] of points) {
    t0 = Math.min(t0, t); t1 = Math.max(t1, t);
    v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  if (t1 - t0 < 1e-6) t1 = t0 + 1;
  if (v1 - v0 < 1e-6) { v0 -= 0.5; v1 += 0.5; }
  const dv = (v1 - v0) * pad;
  return { t0, t1, v0: v0 - dv, v1: v1 + dv };
}

// ---------------------------------------------------------------------------
// Bezier handles on a segment
// ---------------------------------------------------------------------------

export interface Segment {
  fromTime: number;
  toTime: number;
  fromValue: number;
  toValue: number;
}

/** Where a handle sits on the graph, in seconds and value: (x, y) are fractions of the segment's width and height. */
export function handlePoint(seg: Segment, x: number, y: number): { time: number; value: number } {
  return { time: seg.fromTime + x * (seg.toTime - seg.fromTime), value: seg.fromValue + y * (seg.toValue - seg.fromValue) };
}

/** The (x, y) of a handle dragged to (time, value); null when the segment has no width or no height to measure against. */
export function handleFromPoint(seg: Segment, time: number, value: number): { x: number; y: number } | null {
  const w = seg.toTime - seg.fromTime;
  const h = seg.toValue - seg.fromValue;
  if (w <= 1e-9 || Math.abs(h) <= 1e-9) return null;
  return { x: Math.min(1, Math.max(0, (time - seg.fromTime) / w)), y: (value - seg.fromValue) / h };
}

// ---------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------

/**
 * Sets the easing into these keyframes (the segment each one ends). "hold" holds the PREVIOUS keyframe's value until
 * this one (a step). The first keyframe of a track has no segment into it and is skipped. Returns how many changed.
 */
export function setKeyframeEase(ids: Iterable<string>, ease: string, compositionId = getTransport().compositionId): number {
  const isHold = ease === "hold";
  if (!isHold && parseEasing(ease) === null) return 0;
  const doc = getDocument();
  const locations = locateKeyframes(doc, compositionId, ids);
  let changed = 0;
  transaction(isHold ? "Hold keyframe" : "Set easing", () => {
    for (const loc of locations) {
      const track = getDocument().clips[loc.clipId]?.tracks.find((t) => t.id === loc.trackId);
      if (!track) continue;
      const at = track.keyframes.findIndex((k) => k.id === loc.id);
      if (at <= 0) continue;
      if (isHold) {
        const previous = track.keyframes[at - 1];
        documentCommands.setKeyframe(loc.clipId, loc.trackId, { ...previous, hold: true });
      } else {
        const { hold: _h, ...previous } = track.keyframes[at - 1];
        if (track.keyframes[at - 1].hold) documentCommands.setKeyframe(loc.clipId, loc.trackId, previous);
        documentCommands.setKeyframe(loc.clipId, loc.trackId, { ...loc.keyframe, ease });
      }
      changed++;
    }
  });
  return changed;
}

/** Sets a spring easing from Bounce and Time on the segments into these keyframes. */
export function setKeyframeSpring(ids: Iterable<string>, bounce: number, time: number, compositionId = getTransport().compositionId): number {
  return setKeyframeEase(ids, springEase(bounce, time), compositionId);
}
