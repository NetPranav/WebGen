"use client";

/**
 * ============================================================================
 * DOCUMENT STORE API (MDM v2)
 * ============================================================================
 * ROADMAP Phase 2.3. The only way to read and change the Motion Document.
 *
 * - Reads: `useDocument(selector)` and the `useLayer` / `useLayerClips` hooks,
 *   or `getDocument()` outside React.
 * - Writes: the typed commands in `documentCommands`. Each runs as an Immer
 *   recipe and returns the resulting patches, the format that undo (Phase 3),
 *   AI diffs (Phase 31) and collaboration share. `applyDiff` replays patches.
 *
 * The document lives in the project store's `document` field, so snapshots,
 * persistence and history keep covering it.
 * ============================================================================
 */

import { useMemo } from "react";
import { applyPatches, enablePatches, produceWithPatches, type Draft, type Patch } from "immer";
import { useProjectStore } from "./useProjectStore";
import { useHistoryStore } from "./useHistoryStore";
import { EventBus } from "../events/EventBus";
import { createId } from "../ids";
import { attachClip, createLayer, getLayerClips, getSubtreeIds, type NewLayerInput } from "../document/factories";
import { type LayerProps, type PropValue } from "../document/registry";
import {
  validateMotionDocument,
  type Clip,
  type ClipTemplate,
  type ExportSettings,
  type Keyframe,
  type Layer,
  type LayerState,
  type MotionDocument,
  type Track,
} from "../document/schema";

enablePatches();

export interface DocumentChange {
  label?: string;
  patches: Patch[];
  inversePatches: Patch[];
}

export type DocumentChangeListener = (change: DocumentChange) => void;

const listeners = new Set<DocumentChangeListener>();

/** Subscribe to every committed document change (patches included). */
export function subscribeToDocumentChanges(listener: DocumentChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDocument(): MotionDocument {
  return useProjectStore.getState().document;
}

/**
 * Runs `recipe` against the document and commits the result. A labelled change
 * also records an undo step (snapshot history until Phase 3 moves undo onto patches).
 */
function commit(label: string | undefined, recipe: (draft: Draft<MotionDocument>) => void): DocumentChange {
  const store = useProjectStore.getState();
  const [next, patches, inversePatches] = produceWithPatches(store.document, recipe);
  const change: DocumentChange = { label, patches, inversePatches };
  if (patches.length === 0) return change;

  if (label) useHistoryStore.getState().pushState(label, store.getSnapshot());
  useProjectStore.setState({ document: next });
  listeners.forEach((listener) => listener(change));
  EventBus.emit("document:changed", change);
  return change;
}

function requireLayer(draft: Draft<MotionDocument>, layerId: string): Draft<Layer> {
  const layer = draft.layers[layerId];
  if (!layer) throw new Error(`Layer "${layerId}" does not exist.`);
  return layer;
}

function requireClip(draft: Draft<MotionDocument>, clipId: string): Draft<Clip> {
  const clip = draft.clips[clipId];
  if (!clip) throw new Error(`Clip "${clipId}" does not exist.`);
  return clip;
}

function requireTrack(draft: Draft<MotionDocument>, clipId: string, trackId: string): Draft<Track> {
  const track = requireClip(draft, clipId).tracks.find((t) => t.id === trackId);
  if (!track) throw new Error(`Track "${trackId}" does not exist on clip "${clipId}".`);
  return track;
}

function insertChild(draft: Draft<MotionDocument>, parentId: string | null, childId: string, index?: number) {
  if (parentId === null) return;
  const children = requireLayer(draft, parentId).children;
  const at = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
  children.splice(at, 0, childId);
}

function detachChild(draft: Draft<MotionDocument>, layer: Draft<Layer>) {
  if (layer.parentId === null) return;
  const parent = draft.layers[layer.parentId];
  if (parent) parent.children = parent.children.filter((id) => id !== layer.id);
}

export const documentCommands = {
  // ---------------------------------------------------------------- layers

  /** Adds a new layer of `archetype` (registry defaults unless props are given). Returns its id. */
  addLayer(input: NewLayerInput & { index?: number }, label = "Add layer"): string {
    const layer = createLayer(input);
    commit(label, (draft) => {
      if (draft.layers[layer.id]) throw new Error(`Layer "${layer.id}" already exists.`);
      draft.layers[layer.id] = layer;
      insertChild(draft, layer.parentId, layer.id, input.index);
    });
    return layer.id;
  },

  /**
   * Inserts complete layers (e.g. a generated component) in one step. Layers
   * whose parent is outside the batch are appended to that parent's children.
   */
  insertLayers(layers: Layer[], clips: Clip[] = [], label = "Insert layers") {
    commit(label, (draft) => {
      const batch = new Set(layers.map((l) => l.id));
      for (const layer of layers) draft.layers[layer.id] = layer;
      for (const layer of layers) {
        if (layer.parentId !== null && !batch.has(layer.parentId)) insertChild(draft, layer.parentId, layer.id);
      }
      for (const clip of clips) draft.clips[clip.id] = clip;
    });
  },

  /** Removes a layer, its descendants, and the clips, states and behaviours they own. */
  removeLayer(layerId: string, label = "Delete layer") {
    commit(label, (draft) => {
      const layer = draft.layers[layerId];
      if (!layer) return;
      detachChild(draft, layer);
      const doomed = new Set(getSubtreeIds(draft as MotionDocument, layerId));
      doomed.forEach((id) => delete draft.layers[id]);
      for (const collection of ["clips", "states", "behaviours"] as const) {
        const entries = draft[collection] as Record<string, { layerId: string }>;
        for (const [key, entity] of Object.entries(entries)) {
          if (doomed.has(entity.layerId)) delete entries[key];
        }
      }
    });
  },

  renameLayer(layerId: string, name: string, label = "Rename layer") {
    commit(label, (draft) => {
      requireLayer(draft, layerId).name = name;
    });
  },

  /** Shallow-merges `patch` into the layer's props. An `undefined` value deletes that prop. */
  updateProps(layerId: string, patch: Record<string, PropValue | undefined>, label?: string) {
    commit(label, (draft) => {
      const props = requireLayer(draft, layerId).properties;
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) delete props[key];
        else props[key] = value;
      }
    });
  },

  /** Replaces all of the layer's props. */
  replaceProps(layerId: string, properties: LayerProps, label?: string) {
    commit(label, (draft) => {
      requireLayer(draft, layerId).properties = properties;
    });
  },

  setLayerFlags(layerId: string, flags: Partial<Pick<Layer, "visible" | "locked">>, label?: string) {
    commit(label, (draft) => {
      Object.assign(requireLayer(draft, layerId), flags);
    });
  },

  /** Moves a layer under `parentId` (null for root) at `index`. Refuses to create a cycle. */
  moveLayer(layerId: string, parentId: string | null, index?: number, label = "Move layer") {
    commit(label, (draft) => {
      const layer = requireLayer(draft, layerId);
      if (parentId !== null && getSubtreeIds(draft as MotionDocument, layerId).includes(parentId)) {
        throw new Error("A layer cannot be moved inside itself.");
      }
      detachChild(draft, layer);
      layer.parentId = parentId;
      insertChild(draft, parentId, layerId, index);
    });
  },

  // ----------------------------------------------------------------- clips

  addClip(layerId: string, template: ClipTemplate, label = "Add animation"): string {
    const clip = attachClip(template, layerId);
    commit(label, (draft) => {
      requireLayer(draft, layerId);
      draft.clips[clip.id] = clip;
    });
    return clip.id;
  },

  updateClip(clipId: string, patch: Partial<Omit<Clip, "id" | "layerId" | "tracks">>, label?: string) {
    commit(label, (draft) => {
      Object.assign(requireClip(draft, clipId), patch);
    });
  },

  removeClip(clipId: string, label = "Remove animation") {
    commit(label, (draft) => {
      delete draft.clips[clipId];
    });
  },

  /** Replaces a layer's whole animation stack, keeping the given order. */
  setLayerClips(layerId: string, templates: ClipTemplate[], label?: string) {
    commit(label, (draft) => {
      requireLayer(draft, layerId);
      for (const clip of getLayerClips(draft as MotionDocument, layerId)) delete draft.clips[clip.id];
      for (const template of templates) {
        const clip = attachClip(template, layerId);
        draft.clips[clip.id] = clip;
      }
    });
  },

  // ---------------------------------------------------------------- tracks

  addTrack(clipId: string, track: Omit<Track, "id"> & { id?: string }, label = "Add track"): string {
    const id = track.id ?? createId("trk");
    commit(label, (draft) => {
      requireClip(draft, clipId).tracks.push({ ...track, id });
    });
    return id;
  },

  updateTrack(clipId: string, trackId: string, patch: Partial<Omit<Track, "id" | "keyframes">>, label?: string) {
    commit(label, (draft) => {
      Object.assign(requireTrack(draft, clipId, trackId), patch);
    });
  },

  removeTrack(clipId: string, trackId: string, label = "Remove track") {
    commit(label, (draft) => {
      const clip = requireClip(draft, clipId);
      clip.tracks = clip.tracks.filter((t) => t.id !== trackId);
    });
  },

  setTracks(clipId: string, tracks: Track[], label?: string) {
    commit(label, (draft) => {
      requireClip(draft, clipId).tracks = tracks;
    });
  },

  /** Inserts or replaces (by id) a keyframe, keeping the track sorted by time. */
  setKeyframe(clipId: string, trackId: string, keyframe: Keyframe, label?: string) {
    commit(label, (draft) => {
      const track = requireTrack(draft, clipId, trackId);
      const next = track.keyframes.filter((k) => k.id !== keyframe.id);
      next.push(keyframe);
      track.keyframes = next.sort((a, b) => a.time - b.time);
    });
  },

  removeKeyframe(clipId: string, trackId: string, keyframeId: string, label = "Delete keyframe") {
    commit(label, (draft) => {
      const track = requireTrack(draft, clipId, trackId);
      track.keyframes = track.keyframes.filter((k) => k.id !== keyframeId);
    });
  },

  // ---------------------------------------------------------------- states

  addState(layerId: string, name: string, props: LayerProps = {}, label = "Add state"): string {
    const state: LayerState = { id: createId("state"), layerId, name, props };
    commit(label, (draft) => {
      requireLayer(draft, layerId);
      draft.states[state.id] = state;
    });
    return state.id;
  },

  removeState(stateId: string, label = "Remove state") {
    commit(label, (draft) => {
      delete draft.states[stateId];
    });
  },

  // -------------------------------------------------------------- document

  setExportSettings(patch: Partial<ExportSettings>, label?: string) {
    commit(label, (draft) => {
      Object.assign(draft.exportSettings, patch);
    });
  },

  /** Replaces the whole document (e.g. starting a new project). */
  replaceDocument(document: MotionDocument, label?: string) {
    commit(label, (draft) => {
      for (const key of Object.keys(draft) as (keyof MotionDocument)[]) {
        (draft as Record<string, unknown>)[key] = document[key];
      }
    });
  },

  /**
   * Applies externally produced patches (AI diffs, collaboration). The result
   * must still be a valid document; otherwise nothing is applied.
   */
  applyDiff(patches: Patch[], label = "Apply changes"): DocumentChange {
    const current = getDocument();
    const next = applyPatches(current, patches);
    const check = validateMotionDocument(next);
    if (!check.ok) {
      throw new Error(`Diff would produce an invalid document: ${check.issues.slice(0, 3).map((i) => `${i.path}: ${i.message}`).join("; ")}`);
    }
    return commit(label, (draft) => {
      applyPatches(draft, patches);
    });
  },
};

export type DocumentCommands = typeof documentCommands;

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

/** Subscribe to a slice of the document. The selector must return a stable value (not a new array/object). */
export function useDocument<T>(selector: (document: MotionDocument) => T): T {
  return useProjectStore((state) => selector(state.document));
}

export function useLayer(layerId: string | null | undefined): Layer | undefined {
  return useProjectStore((state) => (layerId ? state.document.layers[layerId] : undefined));
}

export function useLayers(): Record<string, Layer> {
  return useProjectStore((state) => state.document.layers);
}

/** The layer's clips in stack order; stable between renders while clips are unchanged. */
export function useLayerClips(layerId: string | null | undefined): Clip[] {
  const clips = useProjectStore((state) => state.document.clips);
  return useMemo(() => (layerId ? Object.values(clips).filter((c) => c.layerId === layerId) : []), [clips, layerId]);
}
