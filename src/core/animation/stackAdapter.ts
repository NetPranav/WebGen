import type { Clip, Keyframe, Trigger } from "../document/motion";
import { coercePropertyValue, getPropertyDefinition, isPropertyLegalFor } from "../document/properties";
import type { PropValue } from "../document/registry";
import type { ClipTemplate, MotionDocument } from "../document/schema";
import { createId } from "../ids";
import { transaction } from "../editing/editOps";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";

/**
 * ============================================================================
 * THE ANIMATION STACK, ON THE DOCUMENT (ROADMAP Phase 68, closes AUD-39)
 * ============================================================================
 * The Content Browser's Animation panel used to keep its tracks in local React state, seeded from a constant: edits
 * were lost on reload, didn't undo and didn't export. It is now a view of the selected layer's clips: a "track" in the
 * panel is one clip, its "from" and "to" are the first and last keyframe of each property, and every edit is a
 * document command (one undo step, saved with the project, exported with it).
 * ============================================================================
 */

export type AnimationTrigger = "load" | "hover" | "click" | "scroll" | "state";

export interface PropertyDelta {
  property: string;
  from: string;
  to: string;
}

export interface ElementAnimationTrack {
  /** The clip's id. */
  id: string;
  name: string;
  trigger: AnimationTrigger;
  duration: number;
  delay: number;
  easing: string;
  properties: PropertyDelta[];
  /** Hand-tuned: more than a plain from and to, or an easing on a keyframe. */
  isCustomTuned?: boolean;
}

/** The panel's trigger words and the document's triggers (a "state" animation listens for the StateChange event). */
const TRIGGER_TO_DOC: Record<AnimationTrigger, { trigger: Trigger; event?: string; type: Clip["type"] }> = {
  load: { trigger: "mount", type: "entrance" },
  hover: { trigger: "hover", type: "hover" },
  click: { trigger: "press", type: "tap" },
  scroll: { trigger: "scrollProgress", type: "scroll" },
  state: { trigger: "custom", event: "StateChange", type: "loop" },
};

export function triggerFromClip(clip: Pick<Clip, "trigger">): AnimationTrigger {
  switch (clip.trigger) {
    case "hover":
    case "focus":
      return "hover";
    case "press":
      return "click";
    case "scrollProgress":
    case "inView":
      return "scroll";
    case "custom":
      return "state";
    default:
      return "load";
  }
}

/** A value as the panel shows it: numbers with their unit (`24px`, `180deg`), everything else as text. */
export function formatDeltaValue(path: string, value: PropValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "number") return String(value);
  const unit = getPropertyDefinition(path)?.unit;
  return unit ? `${value}${unit}` : String(value);
}

/** The panel's tracks for a layer: one per clip, in the order the clips were added. */
export function stackForLayer(doc: MotionDocument, layerId: string | null | undefined): ElementAnimationTrack[] {
  if (!layerId || !doc.layers[layerId]) return [];
  return Object.values(doc.clips)
    .filter((clip) => clip.layerId === layerId)
    .map((clip) => ({
      id: clip.id,
      name: clip.name,
      trigger: triggerFromClip(clip),
      duration: clip.duration,
      delay: clip.delay ?? 0,
      easing: clip.easing,
      properties: clip.tracks
        .filter((t) => t.keyframes.length > 0)
        .map((t) => ({ property: t.property, from: formatDeltaValue(t.property, t.keyframes[0].value), to: formatDeltaValue(t.property, t.keyframes[t.keyframes.length - 1].value) })),
      isCustomTuned: clip.tracks.some((t) => t.keyframes.length > 2 || t.keyframes.some((k) => k.ease !== undefined)),
    }));
}

function valueFor(path: string, text: string): PropValue | undefined {
  const def = getPropertyDefinition(path);
  return def ? coercePropertyValue(def, text) : text;
}

/** Adds a track (a clip) to a layer from a panel description. Returns the clip's id, or null when the layer can't take it. */
export function addStackTrack(layerId: string, track: Omit<ElementAnimationTrack, "id" | "isCustomTuned">): string | null {
  const layer = getDocument().layers[layerId];
  if (!layer) return null;
  const map = TRIGGER_TO_DOC[track.trigger];
  const tracks = track.properties.flatMap((p) => {
    if (!isPropertyLegalFor(p.property, layer.archetype)) return [];
    const from = valueFor(p.property, p.from);
    const to = valueFor(p.property, p.to);
    if (from === undefined || to === undefined) return [];
    const keyframes: Keyframe[] = [{ id: createId("kf"), time: 0, value: from }, { id: createId("kf"), time: track.duration, value: to }];
    return [{ id: createId("trk"), property: p.property, keyframes }];
  });
  const template = {
    id: createId("clip"),
    name: track.name,
    type: map.type,
    trigger: map.trigger,
    ...(map.event ? { event: map.event } : {}),
    duration: track.duration,
    ...(track.delay > 0 ? { delay: track.delay } : {}),
    easing: track.easing,
    enabled: true,
    ...(track.trigger === "state" ? { repeat: -1, direction: "alternate" as const } : {}),
    tracks,
  } as ClipTemplate;
  return documentCommands.addClip(layerId, template, `Add ${track.name}`);
}

/** Changes one clip-level field of a track. */
export function updateStackTrack(clipId: string, patch: Partial<Pick<ElementAnimationTrack, "name" | "duration" | "delay" | "easing">>): boolean {
  const clip = getDocument().clips[clipId];
  if (!clip) return false;
  const next: Partial<Omit<Clip, "id" | "layerId" | "tracks">> = {};
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.easing !== undefined) next.easing = patch.easing;
  if (patch.delay !== undefined) next.delay = Math.max(0, patch.delay);
  transaction("Edit animation", () => {
    if (patch.duration !== undefined && patch.duration > 0 && patch.duration !== clip.duration) {
      // Keyframes keep their place as a share of the clip: stretch them with it, so "from" stays at 0 and "to" at the end.
      const factor = patch.duration / clip.duration;
      documentCommands.setTracks(clipId, clip.tracks.map((t) => ({ ...t, keyframes: t.keyframes.map((k) => ({ ...k, time: k.time * factor })) })));
      next.duration = patch.duration;
    }
    if (Object.keys(next).length > 0) documentCommands.updateClip(clipId, next);
  });
  return true;
}

/** Changes the trigger of a track: the clip moves to the composition that trigger plays. */
export function setStackTrigger(clipId: string, trigger: AnimationTrigger): boolean {
  const clip = getDocument().clips[clipId];
  if (!clip) return false;
  const map = TRIGGER_TO_DOC[trigger];
  documentCommands.updateClip(clipId, { trigger: map.trigger, type: map.type, ...(map.event ? { event: map.event } : {}) }, "Change trigger");
  return true;
}

/** Sets the `from` or `to` value of one property of a track (the first or last keyframe). */
export function setStackPropertyValue(clipId: string, property: string, field: "from" | "to", text: string): boolean {
  const clip = getDocument().clips[clipId];
  const track = clip?.tracks.find((t) => t.property === property);
  const value = valueFor(property, text);
  if (!clip || !track || track.keyframes.length === 0 || value === undefined) return false;
  const key = field === "from" ? track.keyframes[0] : track.keyframes[track.keyframes.length - 1];
  documentCommands.setKeyframe(clipId, track.id, { ...key, value }, "Edit animation value");
  return true;
}

export function removeStackTrack(clipId: string): boolean {
  if (!getDocument().clips[clipId]) return false;
  documentCommands.removeClip(clipId, "Remove animation");
  return true;
}
