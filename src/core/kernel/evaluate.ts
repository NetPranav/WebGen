"use client";

/**
 * ============================================================================
 * PHASE 9, SUB-PHASE 9.3 — THE DETERMINISTIC EVALUATION KERNEL
 * ============================================================================
 * `evaluate(doc, compositionId, layerId, t, inputs)` is a pure function: the
 * exact value of every property on a layer at any time, for any inputs — the
 * oracle for preview, export parity, AI verification and scrubbing (ROADMAP
 * Phase 9's goal). Composition order (9.3, v2.1/v3.0 amendments):
 *
 *   base props → state → clips (by priority) → behaviours → STA synthesis
 *
 * Composition **time** (in/out, stretch, remap, nesting) is Phase 46's job,
 * already built (`compositions.ts`) — this module calls `clipTimeInComposition`
 * rather than re-deriving time math. Track sampling uses `easing.ts`
 * (9.1) and `interpolators.ts` (9.2). The **behaviours** slot in the
 * composition order is real and tested, but only `loop` (a pure function of
 * `t`) is implemented here — motion.ts's own header names Phase 12 as "the
 * behaviour runtime"; the rest need pointer/scroll history this kernel's
 * `inputs` snapshot doesn't carry (see `KERNEL_GAPS`). Signal bindings (v3.0:
 * evaluated after behaviours, before STA) need Phase 60 and are the same kind
 * of documented gap.
 * ============================================================================
 */

import type { MotionDocument, Clip, Track } from "../document/schema";
import { clipTimeInComposition } from "../document/compositions";
import { getPropertyDefinition } from "../document/properties";
import type { PropValue } from "../document/registry";
import { CLIP_TYPE_TO_CATEGORY } from "../rules/clip-adapter";
import { CATEGORY_PRIORITY_ORDER, type AnimationCategory } from "../types/element-grammar";
import { parseEasing } from "../document/motion";
import { sampleEasing } from "./easing";
import { interpolateValue } from "./interpolators";
import { synthesizeSingleTransformMatrix, type TransformComponents } from "../runtime/EngineAdapters";

export interface EvaluateInputs {
  /** Which named state (if any) is active on each layer — e.g. `{ [buttonId]: "hover" }`. */
  activeStates?: Record<string, string>;
  reducedMotion?: boolean;
  /** A virtual pointer position, layer-local px — for the behaviours this kernel does evaluate (`loop` needs none; reserved for Phase 12's expansion). */
  pointer?: { x: number; y: number } | null;
  /** A virtual scroll progress, 0-1 — reserved the same way. */
  scrollProgress?: number;
}

export type ResolvedProps = Record<string, PropValue>;

export interface KernelGap {
  area: string;
  note: string;
}

/** What this kernel's composition order can't evaluate yet, and why — see the module header. */
export const KERNEL_GAPS: KernelGap[] = [
  { area: "behaviours", note: "Only `loop` is evaluated (a pure function of t). follow-pointer, magnet, tilt, proximity's spring, spring-to, inertia and noise all need pointer/scroll *history* (springs respond to a path, not a single sample) — that's the Deterministic Replay Law's territory (Phase 64) and Phase 12's behaviour runtime, not this kernel." },
  { area: "signal bindings", note: "The v3.0 amendment slots signal bindings in after behaviours and before STA synthesis. Phase 60 (Signal Bindings) doesn't exist yet, so `doc.bindings` are not evaluated here." },
  { area: "stateful clip categories", note: "Clip-authored motion only reaches the 6 ClipTypes AUD-59 already names (no Exit/Focus/Stagger/LayoutTransition clips); those categories can't be sourced from `doc.clips` regardless of composition order." },
];

function findActiveState(doc: MotionDocument, layerId: string, stateName: string | undefined) {
  if (!stateName) return undefined;
  return Object.values(doc.states).find((s) => s.layerId === layerId && s.name === stateName);
}

/** Finds the keyframe pair surrounding `time` and the eased, interpolated value between them. */
function sampleTrack(track: Track, time: number): PropValue | undefined {
  const keyframes = track.keyframes;
  if (keyframes.length === 0) return undefined;
  if (keyframes.length === 1 || time <= keyframes[0].time) return keyframes[0].value;

  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) return last.value;

  let i = 1;
  while (i < keyframes.length && keyframes[i].time < time) i++;
  const k0 = keyframes[i - 1];
  const k1 = keyframes[i];

  if (k0.hold) return k0.value;

  const span = k1.time - k0.time;
  const segmentT = span > 0 ? (time - k0.time) / span : 1;
  const easing = parseEasing(k1.ease ?? "linear") ?? { kind: "linear" as const };
  const eased = sampleEasing(easing, segmentT);

  const def = getPropertyDefinition(track.property);
  const method = def?.interpolation ?? "discrete";
  return interpolateValue(method, k0.value, k1.value, eased);
}

interface CategorizedSample {
  category: AnimationCategory;
  props: ResolvedProps;
}

function sampleClip(clip: Clip, time: number): ResolvedProps {
  const props: ResolvedProps = {};
  for (const track of clip.tracks) {
    if (track.muted) continue;
    const value = sampleTrack(track, time);
    if (value !== undefined) props[track.property] = value;
  }
  return props;
}

/** Merges categorized samples onto `base`, lowest grammar §6.2 priority first, so the highest priority wins any shared property. */
function mergeByPriority(base: ResolvedProps, samples: CategorizedSample[]): ResolvedProps {
  const ranked = [...samples].sort((a, b) => {
    const ia = CATEGORY_PRIORITY_ORDER.indexOf(a.category);
    const ib = CATEGORY_PRIORITY_ORDER.indexOf(b.category);
    return (ib === -1 ? 999 : ib) - (ia === -1 ? 999 : ia); // descending priority-index = ascending priority; applied in that order so the highest priority (lowest index) lands last
  });
  let out = base;
  for (const { props } of ranked) out = { ...out, ...props };
  return out;
}

/** The `loop` behaviour: cycles a property between two values forever, a pure function of `t`. */
function applyLoopBehaviours(doc: MotionDocument, layerId: string, t: number, props: ResolvedProps): ResolvedProps {
  let out = props;
  for (const behaviour of Object.values(doc.behaviours)) {
    if (behaviour.layerId !== layerId || !behaviour.enabled || behaviour.type !== "loop") continue;
    const { property, from, to, duration, easing, yoyo } = behaviour.params;
    const cycle = duration > 0 ? (t % (duration * (yoyo ? 2 : 1))) / duration : 0;
    const goingBack = yoyo && cycle >= 1;
    const localT = goingBack ? cycle - 1 : Math.min(cycle, 1);
    const easedT = sampleEasing(parseEasing(easing) ?? { kind: "linear" }, localT);
    const def = getPropertyDefinition(property);
    const method = def?.interpolation ?? "discrete";
    const value = goingBack ? interpolateValue(method, to, from, easedT) : interpolateValue(method, from, to, easedT);
    out = { ...out, [property]: value };
  }
  return out;
}

const TRANSFORM_PATHS = ["x", "y", "z", "scale", "scaleX", "scaleY", "rotate", "rotateX", "rotateY", "skewX", "skewY"] as const;

/** Grammar's Single Transform Authority: every `transform.*` becomes one synthesized `transform` string (reuses `EngineAdapters.ts`'s existing synthesizer). */
function synthesizeTransform(props: ResolvedProps): ResolvedProps {
  const components: Partial<TransformComponents> = {};
  let touched = false;
  for (const key of TRANSFORM_PATHS) {
    const value = props[`transform.${key}`];
    if (typeof value !== "number") continue;
    touched = true;
    if (key === "x" || key === "y" || key === "z") (components as Record<string, string>)[key] = `${value}px`;
    else (components as Record<string, number>)[key] = value;
  }
  if (!touched) return props;
  return { ...props, transform: synthesizeSingleTransformMatrix(components) };
}

/**
 * The evaluation kernel. Pure: the same `(doc, compositionId, layerId, t,
 * inputs)` always produces the same `ResolvedProps` (fuzz-tested for this in
 * `__tests__/evaluate.test.ts`).
 */
export function evaluate(doc: MotionDocument, compositionId: string, layerId: string, t: number, inputs: EvaluateInputs = {}): ResolvedProps {
  const layer = doc.layers[layerId];
  if (!layer) return {};

  // 1. Base props.
  let resolved: ResolvedProps = { ...layer.properties };

  // 2. State.
  const activeState = findActiveState(doc, layerId, inputs.activeStates?.[layerId]);
  if (activeState) resolved = { ...resolved, ...activeState.props };

  // 3. Clips, by grammar §6.2 priority.
  const comp = doc.compositions[compositionId];
  if (comp) {
    const samples: CategorizedSample[] = [];
    for (const clip of Object.values(doc.clips)) {
      if (clip.layerId !== layerId || !clip.enabled) continue;
      const timing = clipTimeInComposition(comp, clip, t);
      if (!timing) continue;
      samples.push({ category: CLIP_TYPE_TO_CATEGORY[clip.type], props: sampleClip(clip, timing.time) });
    }
    resolved = mergeByPriority(resolved, samples);
  }

  // 4. Behaviours (composition slot — see KERNEL_GAPS for what's deferred to Phase 12).
  resolved = applyLoopBehaviours(doc, layerId, t, resolved);

  // 5. Single Transform Authority synthesis.
  resolved = synthesizeTransform(resolved);

  return resolved;
}
