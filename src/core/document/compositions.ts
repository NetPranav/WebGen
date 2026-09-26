/**
 * ============================================================================
 * COMPOSITIONS: THE TIME MODEL (MDM v5, ROADMAP Phase 46)
 * ============================================================================
 * The After Effects time model inside the document, and the web's trigger
 * model expressed in it (decision 0002):
 *
 *   - Every document has one `main` composition: the "always playing" one
 *     (mount and ambient `time` clips).
 *   - A triggered clip (hover, press, inView, scroll, …) lives in an
 *     *interaction* composition that its trigger plays, reverses, restarts
 *     or scrubs. Web triggers and AE timelines are one model.
 *   - Layers have time bars in a composition: `start` (where layer time 0
 *     sits), `in`/`out` (when the layer is active) and `stretch`. Stored
 *     sparsely: a layer with no entry spans the whole composition.
 *   - Compositions nest (precomps) with an offset, stretch and time remap.
 *   - Markers sit on compositions and layer bars; a marker with an `event`
 *     fires that custom event.
 *
 * The time maths here (`layerTime`, `clipTime`, `childTime`, `compositionTimes`)
 * is pure and golden-tested. `evaluate()` (Phase 9) builds on it; the clock
 * (45) and the AE timeline (52) read it.
 * ============================================================================
 */

import { z } from "zod";
import { EventNameSchema, TriggerSchema, type Clip, type Trigger } from "./motion";

const Id = z.string().min(1);
const Seconds = z.number().min(0).describe("Seconds.");
const Finite = z.number().refine(Number.isFinite, "Must be a finite number.");

export const MAIN_COMPOSITION_ID = "comp_main";
/** Default size of a new main composition when nothing longer needs it (AE's default comp is similar). */
export const DEFAULT_MAIN_DURATION = 5;
export const DEFAULT_FPS = 60;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const MarkerSchema = z.strictObject({
  id: Id,
  /** Seconds: composition time for composition markers, layer time for layer markers. */
  time: Seconds,
  label: z.string(),
  /** A marker can span time (AE's marker duration). */
  duration: Seconds.optional(),
  /** Reaching the marker fires this custom event (clips and compositions with a `custom` trigger listen). */
  event: EventNameSchema.optional(),
  comment: z.string().optional(),
});
export type Marker = z.infer<typeof MarkerSchema>;

/** A layer's time bar in a composition. Every field is composition seconds except `stretch`. */
export const CompositionLayerSchema = z
  .strictObject({
    /** Where the layer's own time 0 sits (AE "start time"); may be negative. */
    start: Finite,
    /** The layer is active from `in` (inclusive) … */
    in: Finite,
    /** … to `out` (exclusive). */
    out: Finite,
    /** Time stretch: 2 plays at half speed (AE 200%). */
    stretch: z.number().gt(0).max(100),
    markers: z.array(MarkerSchema).optional(),
  })
  .refine((l) => l.out > l.in, { message: "A layer's out point must be after its in point.", path: ["out"] });
export type CompositionLayer = z.infer<typeof CompositionLayerSchema>;

/** Time remap: parent-local time → child composition time, linear between keys (or held). */
export const TimeRemapSchema = z
  .strictObject({
    keys: z.array(z.strictObject({ time: Finite, value: Seconds, hold: z.boolean().optional() })).min(2),
  })
  .refine((r) => r.keys.every((k, i) => i === 0 || k.time > r.keys[i - 1].time), "Time-remap keys must strictly increase in time.");
export type TimeRemap = z.infer<typeof TimeRemapSchema>;

/** A composition placed inside another (a precomp layer). */
export const NestedCompositionSchema = z
  .strictObject({
    id: Id,
    compositionId: Id,
    name: z.string().optional(),
    start: Finite,
    in: Finite,
    out: Finite,
    stretch: z.number().gt(0).max(100),
    timeRemap: TimeRemapSchema.optional(),
    markers: z.array(MarkerSchema).optional(),
  })
  .refine((n) => n.out > n.in, { message: "A nested composition's out point must be after its in point.", path: ["out"] });
export type NestedComposition = z.infer<typeof NestedCompositionSchema>;

/**
 * How a trigger drives an interaction composition (web semantics, decision 0002 §2).
 * - `play`: play once from the start when the trigger fires.
 * - `play-reverse`: play forward while the trigger holds, reverse when it ends (hover, focus).
 * - `restart`: play from the start every time it fires (press, custom events).
 * - `toggle`: alternate forward / reverse on each firing.
 * - `scrub`: the trigger's progress sets the time (scroll with scrub, drag, pointer).
 */
export const PLAYBACK_MODES = ["play", "play-reverse", "restart", "toggle", "scrub"] as const;

export const CompositionTriggerSchema = z.strictObject({
  on: TriggerSchema,
  /** The layer whose trigger it is (its hover, press, view, …). */
  layerId: Id,
  event: EventNameSchema.optional(),
  playback: z.enum(PLAYBACK_MODES),
});

export const CompositionSchema = z
  .strictObject({
    id: Id,
    name: z.string().min(1),
    /** `main`: the always-playing timeline (exactly one). `interaction`: started by a trigger. `precomp`: only placed inside others. */
    kind: z.enum(["main", "interaction", "precomp"]),
    duration: z.number().gt(0),
    fps: z.number().int().min(1).max(240),
    workArea: z.strictObject({ start: Seconds, end: Seconds }),
    loop: z.boolean().optional(),
    trigger: CompositionTriggerSchema.optional(),
    markers: z.array(MarkerSchema),
    /** Sparse layer time bars; a layer with no entry spans the whole composition. */
    layers: z.record(Id, CompositionLayerSchema),
    /** Clips animating in this composition; `offset` is seconds from the layer's time 0. */
    clips: z.array(z.strictObject({ clipId: Id, offset: Finite })),
    nested: z.array(NestedCompositionSchema),
  })
  .superRefine((c, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    if (c.workArea.end <= c.workArea.start) issue(["workArea"], "The work area must end after it starts.");
    if (c.workArea.end > c.duration + 1e-9) issue(["workArea", "end"], "The work area can't go past the composition's end.");
    if ((c.kind === "interaction") !== (c.trigger !== undefined)) issue(["trigger"], "Interaction compositions have a trigger; others don't.");
    c.markers.forEach((m, i) => {
      if (m.time > c.duration + 1e-9) issue(["markers", i, "time"], `Marker "${m.label}" is after the composition's end.`);
    });
    const ids = [...c.markers.map((m) => m.id), ...c.nested.map((n) => n.id)];
    if (new Set(ids).size !== ids.length) issue(["markers"], "Duplicate marker or nested-composition id.");
    const clipIds = c.clips.map((p) => p.clipId);
    if (new Set(clipIds).size !== clipIds.length) issue(["clips"], "A clip is placed twice in one composition.");
  });
export type Composition = z.infer<typeof CompositionSchema>;

// ---------------------------------------------------------------------------
// Time maths (pure)
// ---------------------------------------------------------------------------

/** A layer's bar in a composition, with the sparse defaults filled in. */
export function layerBar(comp: Pick<Composition, "layers" | "duration">, layerId: string): CompositionLayer {
  return comp.layers[layerId] ?? { start: 0, in: 0, out: comp.duration, stretch: 1 };
}

/** Layer-local time at composition time `t`, or null when the layer isn't active (outside [in, out)). */
export function layerTime(bar: Pick<CompositionLayer, "start" | "in" | "out" | "stretch">, t: number): number | null {
  if (t < bar.in || t >= bar.out) return null;
  return (t - bar.start) / bar.stretch;
}

/** Evaluates a time remap at parent-local time `t` (linear, held keys step; clamped outside the keys). */
export function remapTime(remap: TimeRemap, t: number): number {
  const keys = remap.keys;
  if (t <= keys[0].time) return keys[0].value;
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i].time) {
      const a = keys[i - 1];
      const b = keys[i];
      if (a.hold) return a.value;
      return a.value + ((t - a.time) / (b.time - a.time)) * (b.value - a.value);
    }
  }
  return keys[keys.length - 1].value;
}

/**
 * Child composition time for a nested placement at parent time `t`, or null
 * when the placement is inactive or the child time falls outside the child
 * composition (AE shows nothing past a precomp's end unless it loops).
 */
export function childTime(placement: NestedComposition, child: Pick<Composition, "duration" | "loop">, t: number): number | null {
  const local = layerTime(placement, t);
  if (local === null) return null;
  const mapped = placement.timeRemap ? remapTime(placement.timeRemap, local) : local;
  if (child.loop && mapped >= 0) return mapped % child.duration;
  return mapped < 0 || mapped >= child.duration ? null : mapped;
}

export type ClipPhase = "before" | "active" | "after";

/**
 * Where a clip is at clip-placement time `t` (seconds since its layer's time
 * 0, minus the placement offset): its phase, iteration and the time inside
 * its tracks (0 … duration), honouring delay, repeat, repeatDelay and
 * direction. Before the start the clip shows its first frame; after the last
 * iteration it holds the last frame of that iteration.
 */
export function clipTime(
  clip: Pick<Clip, "duration" | "delay" | "repeat" | "repeatDelay" | "direction">,
  t: number
): { phase: ClipPhase; iteration: number; time: number } {
  const d = clip.duration;
  const direction = clip.direction ?? "normal";
  const reversed = (iteration: number) =>
    direction === "reverse" || (direction === "alternate" && iteration % 2 === 1) || (direction === "alternate-reverse" && iteration % 2 === 0);
  const at = (iteration: number, local: number) => (reversed(iteration) ? d - local : local);

  const local = t - (clip.delay ?? 0);
  if (local < 0) return { phase: "before", iteration: 0, time: at(0, 0) };
  if (d === 0) return { phase: "after", iteration: 0, time: 0 };

  const repeat = clip.repeat ?? 0;
  const period = d + (clip.repeatDelay ?? 0);
  const iterations = repeat < 0 ? Infinity : repeat + 1;
  const iteration = Math.floor(local / period);
  if (iteration >= iterations) {
    const last = iterations - 1;
    return { phase: "after", iteration: last, time: at(last, d) };
  }
  const within = local - iteration * period;
  // The end of the last pass is "after": the clip has finished.
  if (iteration === iterations - 1 && within >= d) return { phase: "after", iteration, time: at(iteration, d) };
  // In the repeat delay the clip holds the end of the iteration that just played.
  return { phase: "active", iteration, time: at(iteration, Math.min(within, d)) };
}

/** Seconds a clip takes to play through once from its placement, or Infinity when it loops forever. */
export function clipEnd(clip: Pick<Clip, "duration" | "delay" | "repeat" | "repeatDelay">): number {
  const repeat = clip.repeat ?? 0;
  if (repeat < 0) return Infinity;
  return (clip.delay ?? 0) + clip.duration * (repeat + 1) + (clip.repeatDelay ?? 0) * repeat;
}

/** Seconds of one pass (the first iteration) of a clip from its placement. */
export function clipFirstPass(clip: Pick<Clip, "duration" | "delay">): number {
  return (clip.delay ?? 0) + clip.duration;
}

/**
 * Every time composition `targetId` shows when `rootId` is at time `t`,
 * following nested placements (a precomp can be placed more than once).
 * Returns `[t]` when root and target are the same composition.
 */
export function compositionTimes(compositions: Record<string, Composition>, rootId: string, targetId: string, t: number, depth = 0): number[] {
  if (rootId === targetId) return [t];
  const root = compositions[rootId];
  if (!root || depth > 32) return [];
  const out: number[] = [];
  for (const placement of root.nested) {
    const child = compositions[placement.compositionId];
    if (!child) continue;
    const ct = childTime(placement, child, t);
    if (ct !== null) out.push(...compositionTimes(compositions, placement.compositionId, targetId, ct, depth + 1));
  }
  return out;
}

/**
 * The tracks-time of a clip in composition `compId` at composition time `t`:
 * through the layer's bar (in/out, start, stretch), the placement offset and
 * the clip's own timing. Null when the clip isn't in that composition or its
 * layer is inactive at `t`.
 */
export function clipTimeInComposition(
  comp: Composition,
  clip: Pick<Clip, "id" | "layerId" | "duration" | "delay" | "repeat" | "repeatDelay" | "direction">,
  t: number
): { phase: ClipPhase; iteration: number; time: number } | null {
  const placement = comp.clips.find((p) => p.clipId === clip.id);
  if (!placement) return null;
  const local = layerTime(layerBar(comp, clip.layerId), t);
  if (local === null) return null;
  return clipTime(clip, local - placement.offset);
}

// ---------------------------------------------------------------------------
// Keeping compositions in step with clips (store write boundary, migration)
// ---------------------------------------------------------------------------

/** Triggers whose clips belong to the always-playing main composition. */
export const MAIN_TRIGGERS: readonly Trigger[] = ["mount", "time"];

/** The default playback for a clip's trigger (decision 0002 §2). */
export function defaultPlayback(clip: Pick<Clip, "trigger" | "scrollTrigger">): (typeof PLAYBACK_MODES)[number] {
  switch (clip.trigger) {
    case "hover":
    case "focus":
      return "play-reverse";
    case "press":
    case "custom":
      return "restart";
    case "scrollProgress":
      return clip.scrollTrigger?.scrub ? "scrub" : "play";
    case "drag":
    case "pointerMove":
      return "scrub";
    default:
      return "play";
  }
}

export function createMainComposition(duration = DEFAULT_MAIN_DURATION): Composition {
  return {
    id: MAIN_COMPOSITION_ID,
    name: "Main",
    kind: "main",
    duration,
    fps: DEFAULT_FPS,
    workArea: { start: 0, end: duration },
    markers: [],
    layers: {},
    clips: [],
    nested: [],
  };
}

/** Does a clip belong in this composition? Main takes mount/time clips; an interaction composition takes clips with its trigger. */
export function clipFits(comp: Pick<Composition, "kind" | "trigger">, clip: Pick<Clip, "trigger" | "event">): boolean {
  if (comp.kind === "main") return MAIN_TRIGGERS.includes(clip.trigger);
  if (comp.kind === "interaction" && comp.trigger) {
    return comp.trigger.on === clip.trigger && (clip.trigger !== "custom" || comp.trigger.event === clip.event);
  }
  // A precomp plays like a small main composition wherever it is placed.
  return MAIN_TRIGGERS.includes(clip.trigger);
}

interface SyncableDocument {
  layers: Record<string, unknown>;
  clips: Record<string, Clip>;
  compositions: Record<string, Composition>;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Keeps compositions consistent with clips, idempotently and without writing
 * anything that is already right (so the store records no empty patches):
 *
 *  1. the main composition exists;
 *  2. placements of deleted clips, layer bars of deleted layers and nested
 *     placements of deleted compositions are removed;
 *  3. every clip is placed exactly once, in a composition that fits its
 *     trigger — mount/time clips in main, a triggered clip in its own
 *     interaction composition `comp_<clipId>` unless it already sits in a
 *     fitting one;
 *  4. interaction compositions left with nothing in them are removed;
 *  5. every composition is long enough for its clips' first pass (main only grows).
 *
 * The legacy editor writes clips with a trigger and no composition; this is
 * what places them, so everything it writes stays a valid v5 document.
 */
export function syncCompositions(doc: SyncableDocument): void {
  const comps = doc.compositions;
  if (!comps[MAIN_COMPOSITION_ID]) comps[MAIN_COMPOSITION_ID] = createMainComposition();

  // An interaction composition whose trigger layer is gone can never fire.
  for (const [id, comp] of Object.entries(comps)) if (comp.trigger && !doc.layers[comp.trigger.layerId]) delete comps[id];
  for (const comp of Object.values(comps)) {
    if (comp.clips.some((p) => !doc.clips[p.clipId])) comp.clips = comp.clips.filter((p) => doc.clips[p.clipId]);
    for (const layerId of Object.keys(comp.layers)) if (!doc.layers[layerId]) delete comp.layers[layerId];
    if (comp.nested.some((n) => !comps[n.compositionId])) comp.nested = comp.nested.filter((n) => comps[n.compositionId]);
  }

  // Where each clip is placed now (first fitting placement wins; the rest are removed).
  const placedIn = new Map<string, string>();
  for (const comp of Object.values(comps)) {
    for (const p of comp.clips) {
      const clip = doc.clips[p.clipId];
      if (!placedIn.has(p.clipId) && clipFits(comp, clip)) placedIn.set(p.clipId, comp.id);
    }
  }
  for (const comp of Object.values(comps)) {
    if (comp.clips.some((p) => placedIn.get(p.clipId) !== comp.id)) comp.clips = comp.clips.filter((p) => placedIn.get(p.clipId) === comp.id);
  }

  for (const clip of Object.values(doc.clips)) {
    if (placedIn.has(clip.id)) continue;
    let target: Composition;
    if (MAIN_TRIGGERS.includes(clip.trigger)) target = comps[MAIN_COMPOSITION_ID];
    else {
      const id = `comp_${clip.id}`;
      // The clip's trigger changed (hover → press): its emptied interaction composition is rebuilt for the new trigger.
      const stale = comps[id];
      if (stale && stale.clips.length === 0 && stale.nested.length === 0 && !clipFits(stale, clip)) delete comps[id];
      target = comps[id] ??= {
        id,
        name: clip.name || `${clip.trigger} interaction`,
        kind: "interaction",
        duration: 1,
        fps: DEFAULT_FPS,
        workArea: { start: 0, end: 1 },
        ...(clip.repeat === -1 ? { loop: true } : {}),
        trigger: { on: clip.trigger, layerId: clip.layerId, ...(clip.event ? { event: clip.event } : {}), playback: defaultPlayback(clip) },
        markers: [],
        layers: {},
        clips: [],
        nested: [],
      };
      if (!clipFits(target, clip)) continue; // an id collision with an unrelated composition; validation reports it
    }
    target.clips.push({ clipId: clip.id, offset: 0 });
    placedIn.set(clip.id, target.id);
  }

  for (const [id, comp] of Object.entries(comps)) {
    if (comp.kind === "interaction" && comp.clips.length === 0 && comp.nested.length === 0) {
      delete comps[id];
      continue;
    }
    // Long enough for one pass of every clip placed in it.
    let needed = 0;
    for (const p of comp.clips) {
      const clip = doc.clips[p.clipId];
      const bar = layerBar(comp, clip.layerId);
      needed = Math.max(needed, bar.start + (p.offset + clipFirstPass(clip)) * bar.stretch);
    }
    needed = round(needed);
    const auto = comp.kind === "interaction" && comp.id.startsWith("comp_") && comp.clips.length === 1 && comp.nested.length === 0;
    const duration = auto ? Math.max(needed, 1 / comp.fps) : Math.max(comp.duration, needed);
    if (round(duration) !== comp.duration) {
      // A work area that spanned to the end keeps spanning to the end; one that no longer fits is clamped.
      const followEnd = comp.workArea.end === comp.duration;
      comp.duration = round(duration);
      if (followEnd || comp.workArea.end > comp.duration) {
        comp.workArea = comp.workArea.start < comp.duration ? { start: comp.workArea.start, end: comp.duration } : { start: 0, end: comp.duration };
      }
    }
  }
}
