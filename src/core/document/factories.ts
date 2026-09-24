/**
 * Constructors and pure read helpers for Motion Document entities.
 */

import { createId } from "../ids";
import { getArchetype, getDefaultProps, type ArchetypeId, type LayerKind, type LayerProps } from "./registry";
import { createEmptyDocument, type Clip, type ClipTemplate, type Keyframe, type Layer, type MotionDocument, type Track } from "./schema";

export interface NewLayerInput {
  archetype: ArchetypeId;
  id?: string;
  name?: string;
  parentId?: string | null;
  children?: string[];
  /** Replaces the archetype defaults when given. */
  properties?: LayerProps;
}

/** A new layer; props default to the archetype's registry defaults. */
export function createLayer(input: NewLayerInput): Layer {
  const entry = getArchetype(input.archetype);
  return {
    id: input.id ?? createId(entry.idPrefix),
    name: input.name ?? entry.label,
    archetype: input.archetype,
    parentId: input.parentId ?? null,
    children: input.children ?? [],
    properties: input.properties ?? getDefaultProps(input.archetype),
  };
}

/** Builds a document from layers (tree links as given) and optional clips. */
export function createDocumentFromLayers(layers: Layer[], clips: Clip[] = []): MotionDocument {
  const doc = createEmptyDocument();
  for (const layer of layers) doc.layers[layer.id] = layer;
  for (const clip of clips) doc.clips[clip.id] = clip;
  return doc;
}

export function createTrack(property: string, keyframes: Track["keyframes"] = []): Track {
  return { id: createId("trk"), property, keyframes };
}

/** A clip written by hand or by a generator: ids and `enabled` are optional. */
export type ClipDraft = Omit<ClipTemplate, "id" | "enabled" | "tracks"> & {
  id?: string;
  enabled?: boolean;
  tracks?: (Omit<Track, "id" | "keyframes"> & { id?: string; keyframes: (Omit<Keyframe, "id"> & { id?: string })[] })[];
};

/** Turns a draft into a complete clip template, generating any missing ids. */
export function hydrateClip(draft: ClipDraft): ClipTemplate {
  const { tracks = [], ...rest } = structuredClone(draft);
  return {
    ...rest,
    id: rest.id ?? createId("clip"),
    enabled: rest.enabled ?? true,
    tracks: tracks.map((track) => ({
      ...track,
      id: track.id ?? createId("trk"),
      keyframes: track.keyframes.map((keyframe) => ({ ...keyframe, id: keyframe.id ?? createId("kf") })),
    })),
  };
}

/** Attaches a clip template to a layer, giving it a fresh id unless it has one. */
export function attachClip(template: ClipTemplate, layerId: string): Clip {
  return { ...template, id: template.id || createId("clip"), layerId };
}

// ---------------------------------------------------------------------------
// Pure selectors
// ---------------------------------------------------------------------------

/** A layer's kind (PRD §4) is determined by its archetype. */
export function getLayerKind(layer: Pick<Layer, "archetype">): LayerKind {
  return getArchetype(layer.archetype).kind;
}

/** A layer's clips in stack order (document insertion order). */
export function getLayerClips(doc: MotionDocument, layerId: string): Clip[] {
  return Object.values(doc.clips).filter((clip) => clip.layerId === layerId);
}

export function getRootLayers(doc: MotionDocument): Layer[] {
  return Object.values(doc.layers).filter((layer) => layer.parentId === null);
}

/** The layer and all its descendants, depth first. */
export function getSubtreeIds(doc: MotionDocument, layerId: string): string[] {
  const out: string[] = [];
  const visit = (id: string) => {
    const layer = doc.layers[id];
    if (!layer || out.includes(id)) return;
    out.push(id);
    layer.children.forEach(visit);
  };
  visit(layerId);
  return out;
}

/** Clip without its owner, e.g. to copy it onto another layer. */
export function toClipTemplate(clip: Clip): ClipTemplate {
  const { layerId: _layerId, ...template } = clip;
  void _layerId;
  return template;
}
