/**
 * MDM v1 → v2 migration (ROADMAP Phase 2.1).
 *
 * v1 kept an `elements` map of `Layer`s. Animations lived either in
 * `element.properties.animationStack` (where the editor wrote them) or in a
 * top-level `element.animationStack` (the `BaseElementNode` shape); both are
 * `AttachedAnimation[]`. v2 moves elements to `layers` and animations to `clips`.
 *
 * The migration never throws on messy data: unknown archetypes become
 * `generic`, broken tree links are repaired, missing ids are generated and
 * non-JSON values are dropped, so any v1 project opens.
 */

import { createId } from "../../ids";
import { getArchetype, isArchetypeId, type ArchetypeId, type LayerProps, type PropValue } from "../registry";
import {
  CLIP_TYPES,
  TRIGGERS,
  createEmptyDocument,
  type Clip,
  type ClipType,
  type ExportSettings,
  type Keyframe,
  type Layer,
  type MotionDocument,
  type Track,
  type Trigger,
} from "../schema";

type Loose = Record<string, unknown>;

const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
const asString = (value: unknown, fallback: string): string => (typeof value === "string" ? value : fallback);
const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Legacy `AttachedAnimation.trigger` → PRD §4 trigger. */
export const LEGACY_TRIGGER_MAP: Record<string, Trigger> = {
  onMount: "mount",
  onHover: "hover",
  onClick: "press",
  onScroll: "scrollProgress",
  ambient: "time",
};

/** Converts any value to JSON-safe prop data, or `undefined` if nothing survives. */
export function toPropValue(value: unknown): PropValue | undefined {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    return value.map((item) => toPropValue(item) ?? null);
  }
  if (isObject(value)) {
    const out: Record<string, PropValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "__proto__") continue; // not representable as data; see schema RESERVED_KEYS
      const converted = toPropValue(item);
      if (converted !== undefined) out[key] = converted;
    }
    return out;
  }
  return undefined;
}

function toProps(value: unknown): LayerProps {
  const converted = toPropValue(value);
  return isObject(converted) ? (converted as LayerProps) : {};
}

function migrateKeyframe(raw: unknown): Keyframe | null {
  if (!isObject(raw)) return null;
  const keyframe: Keyframe = {
    id: asString(raw.id, "") || createId("kf"),
    time: Math.max(0, asNumber(raw.time, 0)),
    value: toPropValue(raw.value) ?? null,
  };
  const ease = raw.ease ?? raw.easing;
  if (typeof ease === "string") keyframe.ease = ease;
  return keyframe;
}

function migrateTrack(raw: unknown): Track | null {
  if (!isObject(raw)) return null;
  const property = asString(raw.property, "");
  if (!property) return null;
  const track: Track = {
    id: asString(raw.id, "") || createId("trk"),
    property,
    keyframes: (Array.isArray(raw.keyframes) ? raw.keyframes : [])
      .map(migrateKeyframe)
      .filter((k): k is Keyframe => k !== null),
  };
  if (typeof raw.muted === "boolean") track.muted = raw.muted;
  if (typeof raw.locked === "boolean") track.locked = raw.locked;
  return track;
}

/** Converts one legacy `AttachedAnimation` into a clip on `layerId`. */
export function migrateAttachedAnimation(raw: unknown, layerId: string): Clip | null {
  if (!isObject(raw)) return null;
  const type = (CLIP_TYPES as readonly string[]).includes(raw.type as string) ? (raw.type as ClipType) : "entrance";
  const clip: Clip = {
    id: asString(raw.id, "") || createId("clip"),
    layerId,
    name: asString(raw.name, "Animation"),
    type,
    trigger: migrateTrigger(raw.trigger),
    duration: Math.max(0, asNumber(raw.duration, 0.6)),
    easing: asString(raw.easing, "power2.out"),
    enabled: raw.enabled !== false,
    tracks: (Array.isArray(raw.tracks) ? raw.tracks : []).map(migrateTrack).filter((t): t is Track => t !== null),
  };
  if (raw.delay !== undefined) clip.delay = Math.max(0, asNumber(raw.delay, 0));
  if (raw.repeat !== undefined) clip.repeat = Math.max(-1, Math.trunc(asNumber(raw.repeat, 0)));
  if (typeof raw.locked === "boolean") clip.locked = raw.locked;
  if (isObject(raw.scrollTrigger)) clip.scrollTrigger = toProps(raw.scrollTrigger) as Clip["scrollTrigger"];
  if (isObject(raw.stagger) && typeof raw.stagger.amount === "number") {
    clip.stagger = toProps(raw.stagger) as Clip["stagger"];
  }
  return clip;
}

/** Maps a legacy or current trigger name to a v2 trigger, defaulting to `mount`. */
export function migrateTrigger(value: unknown): Trigger {
  if (typeof value !== "string") return "mount";
  if (LEGACY_TRIGGER_MAP[value]) return LEGACY_TRIGGER_MAP[value];
  return (TRIGGERS as readonly string[]).includes(value) ? (value as Trigger) : "mount";
}

/** Fields of the v1 `BaseElementNode` shape that belong in v2 `properties`. */
const NODE_STYLE_FIELDS = ["layout", "appearance", "transform"] as const;

export interface V1Elements {
  elements?: unknown;
}

/**
 * Builds the v2 layers + clips from a v1 `elements` map.
 */
export function migrateElementsToDocument(
  elements: unknown,
  exportSettings?: Partial<ExportSettings>
): MotionDocument {
  const doc = createEmptyDocument({ exportSettings: exportSettings as ExportSettings | undefined });
  if (!isObject(elements)) return doc;

  // Pass 1: layers and clips.
  for (const [key, raw] of Object.entries(elements)) {
    if (!isObject(raw)) continue;
    const id = key;
    const archetype: ArchetypeId = isArchetypeId(raw.archetype) ? raw.archetype : "generic";
    const properties = toProps(raw.properties);

    const stacks = [properties.animationStack, raw.animationStack].filter(Array.isArray) as unknown[][];
    delete properties.animationStack;
    for (const field of NODE_STYLE_FIELDS) {
      if (isObject(raw[field]) && properties[field] === undefined) properties[field] = toProps(raw[field]);
    }

    for (const stack of stacks) {
      for (const anim of stack) {
        const clip = migrateAttachedAnimation(anim, id);
        if (clip && !doc.clips[clip.id]) doc.clips[clip.id] = clip;
      }
    }

    const layer: Layer = {
      id,
      name: asString(raw.name, getArchetype(archetype).label),
      archetype,
      parentId: typeof raw.parentId === "string" ? raw.parentId : null,
      children: (Array.isArray(raw.children) ? raw.children : []).filter((c): c is string => typeof c === "string"),
      properties,
    };
    doc.layers[id] = layer;
  }

  repairTree(doc);
  return doc;
}

/** Makes parent/children links agree, trusting `parentId` and keeping child order where it exists. */
export function repairTree(doc: MotionDocument): void {
  const layers = doc.layers;
  for (const layer of Object.values(layers)) {
    if (layer.parentId !== null && (!layers[layer.parentId] || layer.parentId === layer.id)) layer.parentId = null;
  }
  // Break cycles by detaching the layer where the walk loops.
  for (const layer of Object.values(layers)) {
    const seen = new Set<string>([layer.id]);
    let cursor = layer.parentId;
    while (cursor !== null) {
      if (seen.has(cursor)) {
        layer.parentId = null;
        break;
      }
      seen.add(cursor);
      cursor = layers[cursor]?.parentId ?? null;
    }
  }
  for (const layer of Object.values(layers)) {
    const kept = [...new Set(layer.children)].filter((id) => layers[id]?.parentId === layer.id);
    const missing = Object.values(layers)
      .filter((l) => l.parentId === layer.id && !kept.includes(l.id))
      .map((l) => l.id);
    layer.children = [...kept, ...missing];
  }
}
