import type { Draft } from "immer";
import { layerBar, type Composition } from "../document/compositions";
import type { Clip, Keyframe } from "../document/motion";
import { getPropertyDefinition, isPropertyLegalFor } from "../document/properties";
import type { PropValue } from "../document/registry";
import type { ClipTemplate, MotionDocument } from "../document/schema";
import { createId } from "../ids";
import { evaluate } from "../kernel/evaluate";
import { transaction } from "../editing/editOps";
import { getDocument } from "../store/documentState";
import { documentCommands, setCommitHook } from "../store/useDocumentStore";
import { useTimelineUiStore } from "../store/useTimelineUiStore";
import { getTransport } from "../time/transport";
import { snapTime } from "./model";

/**
 * ============================================================================
 * KEYFRAMING (ROADMAP Phase 66)
 * ============================================================================
 * Everything that edits keyframes as keyframes: add one at the playhead, move, copy and paste across layers, align,
 * distribute, scale time, delete, and the auto-key record mode. Each is one undo step. A keyframe is addressed by its
 * id; its time on the ruler is composition seconds, which this file maps to and from the clip's own time through the
 * layer's bar (start, stretch) and the clip's placement offset and delay (the same maths the timeline draws with).
 * ============================================================================
 */

const activeComposition = () => getTransport().compositionId;

/** The clip a keyframe or stopwatch makes when the layer has none in the composition. */
export const KEYFRAMES_CLIP_NAME = "Keyframes";

/** A clip for a layer in `comp`, with the trigger that keeps it in that composition (an interaction composition needs its own). */
export function clipTemplateFor(comp: Pick<Composition, "kind" | "trigger" | "duration">, duration: number): ClipTemplate {
  const trigger = comp.kind === "interaction" && comp.trigger ? comp.trigger : null;
  return {
    id: createId("clip"),
    name: KEYFRAMES_CLIP_NAME,
    type: trigger ? (trigger.on === "hover" ? "hover" : trigger.on === "press" ? "tap" : "entrance") : "entrance",
    trigger: trigger ? trigger.on : "mount",
    ...(trigger?.event ? { event: trigger.event } : {}),
    duration: Math.max(comp.duration, duration),
    easing: "power2.out",
    enabled: true,
    tracks: [],
  } as ClipTemplate;
}

/** Where a clip sits on the ruler: composition seconds = `bar.start + (offset + delay + clipTime) * stretch`. */
export interface Placement {
  clip: Clip;
  offset: number;
  bar: { start: number; stretch: number };
}

const toLocal = (p: Placement, time: number): number => (time - p.bar.start) / p.bar.stretch - p.offset - (p.clip.delay ?? 0);
export const toComposition = (p: Placement, local: number): number => p.bar.start + (p.offset + (p.clip.delay ?? 0) + local) * p.bar.stretch;

export function placementsOf(doc: MotionDocument, compositionId: string, layerId?: string): Placement[] {
  const comp = doc.compositions[compositionId];
  if (!comp) return [];
  const out: Placement[] = [];
  for (const placed of comp.clips) {
    const clip = doc.clips[placed.clipId];
    if (!clip || (layerId !== undefined && clip.layerId !== layerId)) continue;
    out.push({ clip, offset: placed.offset, bar: layerBar(comp, clip.layerId) });
  }
  return out;
}

/** A keyframe found in the document, with where it lives and when it sits on the ruler. */
export interface KeyLocation {
  id: string;
  layerId: string;
  clipId: string;
  trackId: string;
  property: string;
  keyframe: Keyframe;
  /** Composition seconds. */
  time: number;
  placement: Placement;
}

/** The keyframes with these ids in the composition (ids that don't exist are skipped), earliest first. */
export function locateKeyframes(doc: MotionDocument, compositionId: string, ids: Iterable<string>): KeyLocation[] {
  const wanted = new Set(ids);
  const found: KeyLocation[] = [];
  if (wanted.size === 0) return found;
  for (const placement of placementsOf(doc, compositionId)) {
    for (const track of placement.clip.tracks) {
      for (const keyframe of track.keyframes) {
        if (wanted.has(keyframe.id)) found.push({ id: keyframe.id, layerId: placement.clip.layerId, clipId: placement.clip.id, trackId: track.id, property: track.property, keyframe, time: toComposition(placement, keyframe.time), placement });
      }
    }
  }
  return found.sort((a, b) => a.time - b.time);
}

/** Every keyframe in the composition, for "select all". */
export function allKeyframeIds(doc: MotionDocument, compositionId: string, layerIds?: readonly string[]): string[] {
  const only = layerIds ? new Set(layerIds) : null;
  return placementsOf(doc, compositionId).flatMap((p) => (only && !only.has(p.clip.layerId) ? [] : p.clip.tracks.flatMap((t) => t.keyframes.map((k) => k.id))));
}

// ---------------------------------------------------------------------------
// A track for a property
// ---------------------------------------------------------------------------

/**
 * The clip and track that hold `path` for the layer in the composition. If no track does, one is made: in the layer's
 * first clip there, or in a new "Keyframes" clip placed in this composition. Call inside a transaction.
 */
export function ensureTrack(layerId: string, path: string, compositionId = activeComposition()): { clipId: string; trackId: string } | null {
  const doc = getDocument();
  const comp = doc.compositions[compositionId];
  const layer = doc.layers[layerId];
  const def = getPropertyDefinition(path);
  if (!comp || !layer || !def || !def.animatable || !isPropertyLegalFor(path, layer.archetype)) return null;
  const placed = placementsOf(doc, compositionId, layerId);
  const withTrack = placed.find((p) => p.clip.tracks.some((t) => t.property === path));
  if (withTrack) return { clipId: withTrack.clip.id, trackId: withTrack.clip.tracks.find((t) => t.property === path)!.id };
  const first = placed[0];
  const clipId = first
    ? first.clip.id
    : documentCommands.addClip(layerId, clipTemplateFor(comp, 0), "Add keyframes", { compositionId });
  const trackId = documentCommands.addTrack(clipId, { property: path, keyframes: [] }, "Add track");
  return { clipId, trackId };
}

/** Adds a keyframe at `time` (composition seconds, snapped to a frame), or replaces the one already there. Returns its id. */
export function setKeyframeAt(layerId: string, path: string, time: number, options: { value?: PropValue; ease?: string; compositionId?: string } = {}): string | null {
  const compositionId = options.compositionId ?? activeComposition();
  const doc = getDocument();
  const comp = doc.compositions[compositionId];
  if (!comp || !doc.layers[layerId]) return null;
  const at = Math.min(comp.duration, Math.max(0, snapTime(time, comp.fps)));
  const value = options.value ?? evaluate(doc, compositionId, layerId, at)[path] ?? doc.layers[layerId].properties[path] ?? getPropertyDefinition(path)?.default;
  if (value === undefined || value === null) return null;
  let id: string | null = null;
  transaction("Add keyframe", () => {
    const target = ensureTrack(layerId, path, compositionId);
    if (!target) return;
    const now = getDocument();
    const placement = placementsOf(now, compositionId, layerId).find((p) => p.clip.id === target.clipId)!;
    const local = Math.max(0, snapTime(toLocal(placement, at), comp.fps));
    const track = now.clips[target.clipId].tracks.find((t) => t.id === target.trackId)!;
    const same = track.keyframes.find((k) => Math.abs(k.time - local) < 0.5 / comp.fps);
    id = same?.id ?? createId("kf");
    documentCommands.setKeyframe(target.clipId, target.trackId, { ...(same ?? {}), id, time: same?.time ?? local, value, ...(options.ease ? { ease: options.ease } : {}) });
  });
  return id;
}

// ---------------------------------------------------------------------------
// Selection edits
// ---------------------------------------------------------------------------

/** Sets keyframe times: `target(location)` is each one's new composition time. Clamped to the composition and frames. Returns how many moved. */
function retime(ids: Iterable<string>, label: string, target: (loc: KeyLocation, all: KeyLocation[]) => number, compositionId = activeComposition()): number {
  const doc = getDocument();
  const comp = doc.compositions[compositionId];
  const locations = locateKeyframes(doc, compositionId, ids);
  if (!comp || locations.length === 0) return 0;
  let moved = 0;
  transaction(label, () => {
    for (const loc of locations) {
      const next = Math.min(comp.duration, Math.max(0, snapTime(target(loc, locations), comp.fps)));
      const local = Math.max(0, snapTime(toLocal(loc.placement, next), comp.fps));
      if (Math.abs(local - loc.keyframe.time) < 1e-9) continue;
      documentCommands.setKeyframe(loc.clipId, loc.trackId, { ...loc.keyframe, time: local });
      moved++;
    }
  });
  return moved;
}

/** Moves the keyframes by `delta` seconds together (so their spacing is kept), stopping at the composition's edges. */
export function moveKeyframes(ids: Iterable<string>, delta: number, compositionId = activeComposition()): number {
  const doc = getDocument();
  const comp = doc.compositions[compositionId];
  const locations = locateKeyframes(doc, compositionId, ids);
  if (!comp || locations.length === 0) return 0;
  const lowest = locations[0].time;
  const highest = locations[locations.length - 1].time;
  const shift = snapTime(Math.min(comp.duration - highest, Math.max(-lowest, delta)), comp.fps);
  if (shift === 0) return 0;
  return retime(locations.map((l) => l.id), "Move keyframes", (loc) => loc.time + shift, compositionId);
}

/** Puts the keyframes at one time: the playhead, or the first or last of them. */
export function alignKeyframes(ids: Iterable<string>, to: "playhead" | "first" | "last", compositionId = activeComposition()): number {
  const doc = getDocument();
  const locations = locateKeyframes(doc, compositionId, ids);
  if (locations.length < 1) return 0;
  const at = to === "playhead" ? getTransport().time : to === "first" ? locations[0].time : locations[locations.length - 1].time;
  return retime(locations.map((l) => l.id), "Align keyframes", () => at, compositionId);
}

/** Spaces three or more keyframes evenly in time between the earliest and the latest, in time order. */
export function distributeKeyframes(ids: Iterable<string>, compositionId = activeComposition()): number {
  const doc = getDocument();
  const locations = locateKeyframes(doc, compositionId, ids);
  if (locations.length < 3) return 0;
  const first = locations[0].time;
  const step = (locations[locations.length - 1].time - first) / (locations.length - 1);
  const order = new Map(locations.map((l, i) => [l.id, i]));
  return retime(locations.map((l) => l.id), "Distribute keyframes", (loc) => first + step * order.get(loc.id)!, compositionId);
}

/** Stretches the keyframes' spacing by `factor` (2 = twice as slow), around the first of them or the playhead. */
export function scaleKeyframeTime(ids: Iterable<string>, factor: number, around: "first" | "playhead" = "first", compositionId = activeComposition()): number {
  if (!(factor > 0) || !Number.isFinite(factor)) return 0;
  const doc = getDocument();
  const locations = locateKeyframes(doc, compositionId, ids);
  if (locations.length === 0) return 0;
  const anchor = around === "playhead" ? getTransport().time : locations[0].time;
  return retime(locations.map((l) => l.id), "Scale keyframe time", (loc) => anchor + (loc.time - anchor) * factor, compositionId);
}

/** Deletes keyframes. A track left with none goes too (the stopwatch turns off), and so does a "Keyframes" clip left empty. */
export function deleteKeyframes(ids: Iterable<string>, compositionId = activeComposition()): number {
  const locations = locateKeyframes(getDocument(), compositionId, ids);
  if (locations.length === 0) return 0;
  transaction("Delete keyframes", () => {
    for (const loc of locations) documentCommands.removeKeyframe(loc.clipId, loc.trackId, loc.id);
    for (const clipId of new Set(locations.map((l) => l.clipId))) {
      const clip = getDocument().clips[clipId];
      if (!clip) continue;
      for (const track of clip.tracks.filter((t) => t.keyframes.length === 0)) documentCommands.removeTrack(clipId, track.id);
      const left = getDocument().clips[clipId];
      if (left && left.tracks.length === 0 && left.name === KEYFRAMES_CLIP_NAME) documentCommands.removeClip(clipId);
    }
  });
  return locations.length;
}

// ---------------------------------------------------------------------------
// Copy and paste across layers
// ---------------------------------------------------------------------------

export interface KeyClip {
  /** One group per layer the keyframes came from, in time order of each group's first keyframe. */
  groups: Array<{ layerId: string; keys: Array<{ property: string; at: number; value: PropValue; ease?: string; hold?: boolean }> }>;
  span: number;
}

let clipboard: KeyClip | null = null;
export const keyClipboard = (): KeyClip | null => clipboard;
export const clearKeyClipboard = (): void => {
  clipboard = null;
};

/** Copies keyframes (times kept relative to the earliest). Returns how many were copied. */
export function copyKeyframes(ids: Iterable<string>, compositionId = activeComposition()): number {
  const locations = locateKeyframes(getDocument(), compositionId, ids);
  if (locations.length === 0) return 0;
  const origin = locations[0].time;
  const groups = new Map<string, KeyClip["groups"][number]>();
  for (const loc of locations) {
    let group = groups.get(loc.layerId);
    if (!group) groups.set(loc.layerId, (group = { layerId: loc.layerId, keys: [] }));
    group.keys.push({ property: loc.property, at: loc.time - origin, value: loc.keyframe.value, ...(loc.keyframe.ease ? { ease: loc.keyframe.ease } : {}), ...(loc.keyframe.hold ? { hold: true } : {}) });
  }
  clipboard = { groups: [...groups.values()], span: locations[locations.length - 1].time - origin };
  return locations.length;
}

/**
 * Pastes the copied keyframes onto layers with the first one landing at `time` (default: the playhead). Copied from one
 * layer, they go onto every target; from several, the first copied layer's keys go on the first target, the second's on
 * the second, and so on (extra targets are left alone). A property the target can't animate is skipped. A keyframe
 * already at that time on the track is replaced. Returns the ids it made.
 */
export function pasteKeyframes(layerIds: readonly string[], time = getTransport().time, compositionId = activeComposition()): string[] {
  const source = clipboard;
  const doc = getDocument();
  const comp = doc.compositions[compositionId];
  const targets = layerIds.filter((id) => doc.layers[id]);
  if (!source || !comp || targets.length === 0) return [];
  const pairs = source.groups.length === 1 ? targets.map((layerId) => ({ layerId, group: source.groups[0] })) : source.groups.flatMap((group, i) => (targets[i] ? [{ layerId: targets[i], group }] : []));
  const made: string[] = [];
  transaction("Paste keyframes", () => {
    for (const { layerId, group } of pairs) {
      for (const key of group.keys) {
        const at = time + key.at;
        if (at > comp.duration + 1e-9) continue;
        const id = setKeyframeAt(layerId, key.property, at, { value: key.value, ease: key.ease, compositionId });
        if (id) {
          made.push(id);
          if (key.hold) holdKeyframe(id, true, compositionId);
        }
      }
    }
  });
  return made;
}

/** Sets or clears a keyframe's hold (a step to the next keyframe). */
export function holdKeyframe(id: string, hold: boolean, compositionId = activeComposition()): boolean {
  const [loc] = locateKeyframes(getDocument(), compositionId, [id]);
  if (!loc) return false;
  const { hold: _drop, ...rest } = loc.keyframe;
  documentCommands.setKeyframe(loc.clipId, loc.trackId, hold ? { ...rest, hold: true } : rest, hold ? "Hold keyframe" : "Release keyframe");
  return true;
}

// ---------------------------------------------------------------------------
// Auto-key (record mode)
// ---------------------------------------------------------------------------

const sameValue = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * The auto-key hook: with record mode on, any animatable property a command changed on an existing layer also gets a
 * keyframe at the playhead holding the new value, in the same undo step. Works on the draft, the way the command did.
 */
export function applyAutoKey(draft: Draft<MotionDocument>, before: MotionDocument): void {
  if (!useTimelineUiStore.getState().recordMode) return;
  const { compositionId, time } = getTransport();
  const comp = draft.compositions[compositionId];
  if (!comp) return;
  for (const [layerId, layer] of Object.entries(draft.layers)) {
    const was = before.layers[layerId];
    if (!was || layer.properties === was.properties) continue;
    for (const [path, value] of Object.entries(layer.properties)) {
      if (sameValue(value, was.properties[path])) continue;
      const def = getPropertyDefinition(path);
      if (!def || !def.animatable || !isPropertyLegalFor(path, layer.archetype) || value === undefined || value === null) continue;
      writeKeyframe(draft, comp as Draft<Composition>, layerId, path, time, value as PropValue);
    }
  }
}

function writeKeyframe(draft: Draft<MotionDocument>, comp: Draft<Composition>, layerId: string, path: string, time: number, value: PropValue): void {
  const at = Math.min(comp.duration, Math.max(0, snapTime(time, comp.fps)));
  const bar = comp.layers[layerId] ?? { start: 0, stretch: 1 };
  const placements = comp.clips.filter((p) => draft.clips[p.clipId]?.layerId === layerId);
  const holder = placements.find((p) => draft.clips[p.clipId].tracks.some((t) => t.property === path)) ?? placements[0];
  let clip = holder ? draft.clips[holder.clipId] : undefined;
  const offset = holder?.offset ?? 0;
  if (!clip) {
    const template = clipTemplateFor(comp, 0);
    draft.clips[template.id as string] = { ...template, id: template.id as string, layerId } as Draft<Clip>;
    clip = draft.clips[template.id as string];
    comp.clips.push({ clipId: clip.id, offset });
  }
  const local = Math.max(0, snapTime((at - bar.start) / bar.stretch - offset - (clip.delay ?? 0), comp.fps));
  let track = clip.tracks.find((t) => t.property === path);
  if (!track) {
    clip.tracks.push({ id: createId("trk"), property: path, keyframes: [] });
    track = clip.tracks[clip.tracks.length - 1];
  }
  const same = track.keyframes.find((k) => Math.abs(k.time - local) < 0.5 / comp.fps);
  if (same) same.value = value;
  else {
    track.keyframes.push({ id: createId("kf"), time: local, value });
    track.keyframes.sort((a, b) => a.time - b.time);
  }
  if (local > clip.duration) clip.duration = local;
}

/** Installs the auto-key hook on the document store. Returns the remover. */
export function installAutoKey(): () => void {
  setCommitHook(applyAutoKey);
  return () => setCommitHook(null);
}
