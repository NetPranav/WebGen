"use client";

/**
 * ============================================================================
 * DOCUMENT STORE API (MDM v2)
 * ============================================================================
 * ROADMAP Phases 2.3 and 3.1. The only way to read and change the Motion Document.
 *
 * - Reads: `useDocument(selector)` and the `useLayer` / `useLayerClips` hooks,
 *   or `getDocument()` outside React.
 * - Writes: the typed commands in `documentCommands`. Each runs as an Immer
 *   recipe and yields patches plus inverse patches, the format that undo, AI
 *   diffs (Phase 31) and collaboration share. `applyDiff` replays patches.
 * - Gestures: `documentCommands.begin(label)` opens a transaction. Commands
 *   inside it apply at once (the stage shows them) but are *transient*: they
 *   reach neither history nor autosave until `commit()` squashes them into one
 *   entry. `cancel()` restores the document from before the transaction.
 *   `installGestureCoalescing(window)` opens one automatically for every
 *   pointer press, so any drag, scrub or slider is a single undo step.
 * - History: `historyCommands.undo / redo / jumpTo`.
 *
 * The document owns its own store (Sub-Phase 41.1, `documentState.ts`),
 * independent of `useProjectStore`. `getSnapshot`/`restoreSnapshot` there
 * compose it back into the full `ProjectStateSnapshot` for persistence, so
 * snapshots, `.lazy.json` export/import and version control keep covering it.
 * ============================================================================
 */

import { useMemo } from "react";
import { applyPatches, enablePatches, produceWithPatches, type Draft, type Patch } from "immer";
import { captureProjectState, useProjectStore } from "./useProjectStore";
import { documentStore, getDocument, isDocumentReadOnly, setDocument } from "./documentState";
import { setEnvironment } from "./useEnvironmentStore";
import { useProjectMetaStore, splitProjectMeta } from "./useProjectMetaStore";
import type { WorldEnvironmentSettings } from "../types/environment";
import { useHistoryStore } from "./useHistoryStore";
import { DiagnosticBus } from "../engine/DiagnosticBus";
import { createId } from "../ids";
import { diffPatches } from "../document/diff";
import type { HistoryTransaction } from "../types/history";
import { attachClip, createLayer, getLayerClips, getSubtreeIds, type NewLayerInput } from "../document/factories";
import { type ArchetypeId, type LayerProps, type PropValue } from "../document/registry";
import { canonicalizeProps, canonicalizeTrackPath, coercePropertyValue, getPropertyDefinition, resolvePropertyPath } from "../document/properties";
import { removeLayerDependents } from "../document/migrations";
import { applyConstraintsToChildren } from "../layout/constrainChildren";
import { appliedBreakpoints, breakpointsOf, isBase, resolveDocumentAt, resolveLayerAt, VISIBLE_KEY } from "../breakpoints/breakpoints";
import { useBreakpointStore } from "./useBreakpointStore";
import { useModeStore } from "./useModeStore";
import { STYLE_PROPS } from "../tokens/tokens";
import { markOverridden, syncInstances } from "../components/instances";
import { syncCompositions, type CompositionLayer, type Marker } from "../document/compositions";
import {
  validateMotionDocument,
  type Clip,
  type ClipTemplate,
  type Composition,
  type ExportSettings,
  type Keyframe,
  type AssetEntry,
  type Layer,
  type LayerState,
  type MotionDocument,
  type Track,
} from "../document/schema";

enablePatches();

export type DocumentChangeSource = "command" | "transaction" | "undo" | "redo" | "history";

export interface DocumentChange {
  label?: string;
  patches: Patch[];
  inversePatches: Patch[];
  source?: DocumentChangeSource;
  /** Part of an open transaction: already visible, but not yet durable (no history, no autosave). */
  transient?: boolean;
  /**
   * A transaction's final record. The document already holds this state (its
   * transient changes were emitted earlier), so listeners that mirror state
   * should skip it; listeners that persist changes should use it.
   */
  summary?: boolean;
}

export type DocumentChangeListener = (change: DocumentChange) => void;

const listeners = new Set<DocumentChangeListener>();

/** Subscribe to every document change (patches included). See `DocumentChange` for the flags. */
export function subscribeToDocumentChanges(listener: DocumentChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export { getDocument, documentStore };

function emit(change: DocumentChange) {
  listeners.forEach((listener) => listener(change));
}

/** Label for commands called without one; every durable change is undoable. */
const DEFAULT_LABEL = "Edit";

/** Consecutive edits with the same label to the same targets within this window become one undo step. */
export const MERGE_WINDOW_MS = 1000;

/**
 * Label plus the entities a change touches (paths cut to 3 segments, e.g.
 * `layers/<id>/properties`), or undefined when the change can't merge. Only
 * plain value edits merge (text, numbers, toggles); structural changes such
 * as adding a keyframe or a layer are always their own step.
 */
function mergeKeyFor(label: string, patches: Patch[]): string | undefined {
  const valueEdit = patches.every(
    (p) => (p.op === "replace" || p.op === "add") && (p.value === null || typeof p.value !== "object")
  );
  if (!valueEdit) return undefined;
  const targets = new Set(patches.map((p) => p.path.slice(0, 3).join("/")));
  return `${label}|${[...targets].sort().join(",")}`;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

interface OpenTransaction {
  label: string;
  base: MotionDocument;
}

let openTransaction: OpenTransaction | null = null;
/** True while a pointer is pressed and gesture coalescing is installed. */
let gestureActive = false;
/** The transaction the current gesture opened lazily on its first labelled command. */
let gestureTransaction: DocumentTransaction | null = null;
/** The handle of the open transaction (the owner's), so undo and redo can cancel a drag that is still in progress. */
let openHandle: DocumentTransaction | null = null;

export interface DocumentTransaction {
  readonly label: string;
  /** False once committed or cancelled, or when this handle joined an outer transaction. */
  readonly isOwner: boolean;
  commit(): DocumentChange | null;
  cancel(): void;
}

function recordDocumentEntry(label: string, patches: Patch[], inversePatches: Patch[], mergeKey?: string) {
  useHistoryStore.getState().record({ actionLabel: label, change: { kind: "document", patches, inversePatches }, mergeKey });
}

/**
 * Records a durable command change, merging it into the previous entry when
 * it repeats the same edit (same label and targets) within `MERGE_WINDOW_MS`,
 * e.g. typing into one field. The merged entry is re-squashed with a diff so
 * it stays compact.
 */
function recordCommandChange(label: string, before: MotionDocument, after: MotionDocument, patches: Patch[], inversePatches: Patch[]) {
  const history = useHistoryStore.getState();
  const mergeKey = mergeKeyFor(label, patches);
  const last = history.past[history.past.length - 1];
  const canMerge =
    mergeKey !== undefined &&
    last &&
    last.change.kind === "document" &&
    last.mergeKey === mergeKey &&
    Date.now() - last.timestamp < MERGE_WINDOW_MS &&
    history.future.length === 0;

  if (!canMerge || last.change.kind !== "document") {
    recordDocumentEntry(label, patches, inversePatches, mergeKey);
    return;
  }

  const base = applyPatches(before, last.change.inversePatches);
  const squashed = diffPatches(base, after);
  if (squashed.length === 0) {
    history.dropLast();
    return;
  }
  history.replaceLast({
    ...last,
    timestamp: Date.now(),
    groupCount: (last.groupCount ?? 1) + 1,
    change: { kind: "document", patches: squashed, inversePatches: diffPatches(after, base) },
  });
}

/**
 * Runs `recipe` against the document and commits the result: recorded in
 * history and emitted as durable, unless a transaction is open, in which case
 * it is applied and emitted as transient.
 */
function commit(label: string | undefined, recipe: (draft: Draft<MotionDocument>) => void): DocumentChange {
  if (isDocumentReadOnly()) return { label: label ?? DEFAULT_LABEL, patches: [], inversePatches: [] }; // another tab has this project
  const before = getDocument();
  // Phase 46: every write leaves clips placed in compositions (the legacy editor writes clips only).
  const [next, patches, inversePatches] = produceWithPatches(before, (draft) => {
    recipe(draft);
    syncCompositions(draft as MotionDocument);
    // an edited main component brings its instances in line, in this same change (Phase 46)
    syncInstances(draft as MotionDocument, before);
  });
  const resolvedLabel = label ?? DEFAULT_LABEL;
  if (patches.length === 0) return { label: resolvedLabel, patches, inversePatches };

  if (!openTransaction && gestureActive) gestureTransaction = beginTransaction(resolvedLabel);

  setDocument(next);
  if (openTransaction) {
    const change: DocumentChange = { label: resolvedLabel, patches, inversePatches, source: "transaction", transient: true };
    emit(change);
    return change;
  }

  recordCommandChange(resolvedLabel, before, next, patches, inversePatches);
  const change: DocumentChange = { label: resolvedLabel, patches, inversePatches, source: "command" };
  emit(change);
  return change;
}

function beginTransaction(label: string): DocumentTransaction {
  if (openTransaction) {
    // Join the outer transaction: it alone decides commit or cancel.
    return { label, isOwner: false, commit: () => null, cancel: () => {} };
  }
  const tx: OpenTransaction = { label, base: getDocument() };
  openTransaction = tx;
  let open = true;

  const handle: DocumentTransaction = {
    label,
    get isOwner() {
      return open;
    },
    commit() {
      if (!open) return null;
      open = false;
      openTransaction = null;
      if (openHandle === handle) openHandle = null;
      if (gestureTransaction === this) gestureTransaction = null;
      const after = getDocument();
      const patches = diffPatches(tx.base, after);
      if (patches.length === 0) return null;
      const inversePatches = diffPatches(after, tx.base);
      recordDocumentEntry(tx.label, patches, inversePatches);
      const change: DocumentChange = { label: tx.label, patches, inversePatches, source: "transaction", summary: true };
      emit(change);
      return change;
    },
    cancel() {
      if (!open) return;
      open = false;
      openTransaction = null;
      if (openHandle === handle) openHandle = null;
      if (gestureTransaction === this) gestureTransaction = null;
      const current = getDocument();
      const patches = diffPatches(current, tx.base);
      if (patches.length === 0) return;
      setDocument(tx.base);
      emit({ label: tx.label, patches, inversePatches: diffPatches(tx.base, current), source: "transaction", transient: true });
    },
  };
  openHandle = handle;
  return handle;
}

/** True while a transaction is open (a gesture is in progress). */
export function isTransactionOpen(): boolean {
  return openTransaction !== null;
}

function endGesture() {
  gestureActive = false;
  const tx = gestureTransaction;
  gestureTransaction = null;
  tx?.commit();
}

/**
 * Coalesces every command issued while a pointer is pressed into one
 * transaction, committed when the pointer is released (or the window loses
 * focus). Returns a disposer.
 */
export function installGestureCoalescing(target: Window): () => void {
  const onDown = (e: PointerEvent) => {
    if (e.button === 0) gestureActive = true;
  };
  target.addEventListener("pointerdown", onDown, true);
  target.addEventListener("pointerup", endGesture, true);
  target.addEventListener("pointercancel", endGesture, true);
  target.addEventListener("blur", endGesture);
  return () => {
    target.removeEventListener("pointerdown", onDown, true);
    target.removeEventListener("pointerup", endGesture, true);
    target.removeEventListener("pointercancel", endGesture, true);
    target.removeEventListener("blur", endGesture);
    endGesture();
  };
}

/** Test and scripting hooks for the gesture coalescer. */
export const gestureCoalescing = {
  press() {
    gestureActive = true;
  },
  release: endGesture,
};

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function applyDocumentPatches(patches: Patch[], inversePatches: Patch[], label: string, source: DocumentChangeSource) {
  if (isDocumentReadOnly()) return;
  setDocument(applyPatches(getDocument(), patches));
  emit({ label, patches, inversePatches, source });
}

/**
 * Replaces the document with `next` as a durable change that is not itself
 * recorded in history (history swaps, loading recovered changes).
 */
export function setDocumentFromHistory(next: MotionDocument, label: string, source: DocumentChangeSource = "history") {
  const current = getDocument();
  const patches = diffPatches(current, next);
  if (patches.length === 0) return;
  setDocument(next);
  emit({ label, patches, inversePatches: diffPatches(next, current), source });
}

/** Applies a history entry in one direction and returns the entry to push on the opposite stack. */
function applyEntry(entry: HistoryTransaction, direction: "undo" | "redo"): HistoryTransaction {
  const { change } = entry;
  if (change.kind === "document") {
    if (direction === "undo") applyDocumentPatches(change.inversePatches, change.patches, entry.actionLabel, "undo");
    else applyDocumentPatches(change.patches, change.inversePatches, entry.actionLabel, "redo");
    return entry;
  }

  // Project entries swap: the stored state goes live, the live state is stored.
  const { document: storedDocument, environment: storedEnvironment, ...withMeta } = change.state as Record<string, unknown> & {
    document?: MotionDocument;
    environment?: WorldEnvironmentSettings;
  };
  const { meta, rest } = splitProjectMeta(withMeta);
  const current = captureProjectState(storedDocument !== undefined);
  useProjectMetaStore.getState().setProjectMeta(meta);
  useProjectStore.setState(rest as Partial<ReturnType<typeof useProjectStore.getState>>);
  if (storedDocument) setDocumentFromHistory(storedDocument, entry.actionLabel, direction);
  if (storedEnvironment) setEnvironment(storedEnvironment);
  return { ...entry, change: { kind: "project", state: current } };
}

/** Applies an entry; an entry that no longer applies is dropped and reported instead of crashing. */
function tryApplyEntry(entry: HistoryTransaction, direction: "undo" | "redo"): HistoryTransaction | null {
  try {
    return applyEntry(entry, direction);
  } catch (error) {
    DiagnosticBus.emit({
      channel: "UNDO_STACK_CORRUPT",
      severity: "error",
      source: { panel: "Panel 23: Undo History", entityId: entry.id },
      message: `History entry "${entry.actionLabel}" could not be ${direction === "undo" ? "undone" : "redone"} and was removed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      suggestion: "The document is unchanged. Earlier history entries are still available.",
    });
    return null;
  }
}

export const historyCommands = {
  undo(): boolean {
    // A drag a tool opened (not the automatic pointer-press one) is still in progress: undo takes it back instead of
    // swapping history underneath it, which used to leave the document and the history disagreeing.
    if (openHandle && openHandle !== gestureTransaction) {
      openHandle.cancel();
      return true;
    }
    gestureTransaction?.commit();
    const history = useHistoryStore.getState();
    const entry = history.takeUndo();
    if (!entry) return false;
    const applied = tryApplyEntry(entry, "undo");
    if (!applied) return false;
    history.pushFuture(applied);
    return true;
  },

  redo(): boolean {
    if (openHandle && openHandle !== gestureTransaction) return false; // nothing to redo while a drag is in progress
    gestureTransaction?.commit();
    const history = useHistoryStore.getState();
    const entry = history.takeRedo();
    if (!entry) return false;
    const applied = tryApplyEntry(entry, "redo");
    if (!applied) return false;
    history.pushPast(applied);
    return true;
  },

  /**
   * Jumps to the state just before `transactionId` (if it is in the undo
   * stack) or just after it (if it is in the redo stack), stepping one entry
   * at a time so mixed document and project entries stay consistent.
   */
  jumpTo(transactionId: string): boolean {
    const { past, future } = useHistoryStore.getState();
    // Every step must shrink the stack it walks; one that doesn't (a refused entry) ends the jump instead of spinning.
    if (past.some((t) => t.id === transactionId)) {
      while (useHistoryStore.getState().past.length > 0) {
        const last = useHistoryStore.getState().past.at(-1)!;
        const before = useHistoryStore.getState().past.length;
        historyCommands.undo();
        if (last.id === transactionId) return true;
        if (useHistoryStore.getState().past.length >= before) return false;
      }
    } else if (future.some((t) => t.id === transactionId)) {
      while (useHistoryStore.getState().future.length > 0) {
        const next = useHistoryStore.getState().future[0];
        const before = useHistoryStore.getState().future.length;
        historyCommands.redo();
        if (next.id === transactionId) return true;
        if (useHistoryStore.getState().future.length >= before) return false;
      }
    }
    return false;
  },
};

function requireLayer(draft: Draft<MotionDocument>, layerId: string): Draft<Layer> {
  const layer = draft.layers[layerId];
  if (!layer) throw new Error(`Layer "${layerId}" does not exist.`);
  return layer;
}

function clipArchetype(draft: Draft<MotionDocument>, layerId: string): ArchetypeId {
  return requireLayer(draft, layerId).archetype;
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

// ---------------------------------------------------------------------------
// Property-name boundary (Phase 42): whatever a caller passes, only canonical,
// archetype-legal paths reach the document. Writers should already use
// canonical names; a legacy one is renamed and an unknown one is dropped with
// a warning instead of corrupting a saved project.
// ---------------------------------------------------------------------------

function warnDropped(where: string, keys: { key: string; message: string }[]) {
  if (keys.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(`[document] ${where}: dropped ${keys.map((k) => k.message).join(" ")}`);
  }
}

function canonicalProps(archetype: ArchetypeId, props: LayerProps, where: string): LayerProps {
  const { props: out, dropped } = canonicalizeProps(archetype, props);
  warnDropped(where, dropped);
  return out;
}

/** A keyframe with its value as the property's type (`"20px"` → 20; unreadable → the default). */
function typedKeyframe(path: string, keyframe: Keyframe): Keyframe {
  const def = getPropertyDefinition(path);
  return def ? { ...keyframe, value: coercePropertyValue(def, keyframe.value) } : keyframe;
}

function canonicalTracks<T extends { property: string; keyframes?: Keyframe[] }>(archetype: ArchetypeId, tracks: T[], where: string): T[] {
  const out: T[] = [];
  for (const track of tracks) {
    const resolved = canonicalizeTrackPath(track.property, archetype);
    if (!resolved) {
      warnDropped(where, [{ key: track.property, message: `track "${track.property}" is not a property of ${archetype}.` }]);
      continue;
    }
    // Phase 7: keyframe values are typed by their property, and sorted by time (stable for equal times).
    const keyframes = track.keyframes?.map((k) => typedKeyframe(resolved.path, k)).sort((a, b) => a.time - b.time);
    out.push({ ...track, property: resolved.path, ...(keyframes ? { keyframes } : {}) });
  }
  return out;
}

/** The clip's duration covers its last keyframe (v4 refuses keyframes after the end). */
function coverKeyframes<T extends { duration: number; tracks: Track[] }>(clip: T): T {
  const last = Math.max(0, ...clip.tracks.flatMap((t) => t.keyframes.map((k) => k.time)));
  return last > clip.duration ? { ...clip, duration: last } : clip;
}

function canonicalClip<T extends { duration: number; tracks: Track[] }>(archetype: ArchetypeId, clip: T, where: string): T {
  return coverKeyframes({ ...clip, tracks: canonicalTracks(archetype, clip.tracks, where) });
}

/**
 * Before a hand edit lands on `paths` of `layer`: a property bound to a variable is marked detached (the edit is its new
 * literal value), and a text or effect style that owns an edited property is let go after its values are copied into
 * the layer, so the rest of the style's look stays where it was.
 */
function detachOnEdit(doc: MotionDocument, layer: Layer, paths: readonly string[]) {
  if (layer.tokens) {
    for (const key of paths) {
      const res = resolvePropertyPath(key, layer.archetype);
      const b = layer.tokens[res.ok ? res.path : key];
      if (b && !b.detached) b.detached = true;
    }
  }
  if (layer.styleRefs) {
    for (const kind of ["text", "effect"] as const) {
      const id = layer.styleRefs[kind];
      if (!id || !paths.some((p) => (STYLE_PROPS[kind] as readonly string[]).includes(p))) continue;
      const style = doc.styles?.[id];
      if (style) for (const path of STYLE_PROPS[kind]) if (style.props[path] !== undefined) layer.properties[path] = style.props[path];
      delete layer.styleRefs[kind];
    }
    if (!layer.styleRefs.text && !layer.styleRefs.effect) delete layer.styleRefs;
  }
}

export const documentCommands = {
  /** Opens a transaction for a gesture (see the file header). Nested calls join the open one. */
  begin(label: string): DocumentTransaction {
    return beginTransaction(label);
  },

  // ---------------------------------------------------------------- layers

  /** Adds a new layer of `archetype` (registry defaults unless props are given). Returns its id. */
  addLayer(input: NewLayerInput & { index?: number }, label = "Add layer"): string {
    // Ids are random and 32 bits wide: a large document can hand out one that is already taken, so draw again.
    let layer = createLayer(input);
    for (let tries = 0; !input.id && getDocument().layers[layer.id] && tries < 16; tries++) layer = createLayer(input);
    layer.properties = canonicalProps(layer.archetype, layer.properties, "addLayer");
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
      for (const layer of layers) {
        if (draft.layers[layer.id]) throw new Error(`Layer "${layer.id}" already exists.`);
      }
      for (const layer of layers) {
        draft.layers[layer.id] = { ...layer, properties: canonicalProps(layer.archetype, layer.properties, "insertLayers") };
      }
      for (const layer of layers) {
        if (layer.parentId !== null && !batch.has(layer.parentId)) insertChild(draft, layer.parentId, layer.id);
      }
      for (const clip of clips) {
        const owner = draft.layers[clip.layerId];
        draft.clips[clip.id] = owner ? canonicalClip(owner.archetype, clip, "insertLayers") : clip;
      }
    });
  },

  /** Removes a layer, its descendants, and every entity they own or that points at them. */
  removeLayer(layerId: string, label = "Delete layer") {
    commit(label, (draft) => {
      const layer = draft.layers[layerId];
      if (!layer) return;
      // a layer inside an instance mirrors the main one: deleting it hides it (the instance's own change), it isn't gone (Phase 46)
      if (layer.instance && !layer.instance.root) {
        layer.visible = false;
        markOverridden(layer as Layer, ["visible"]);
        return;
      }
      detachChild(draft, layer);
      const doomed = new Set(getSubtreeIds(draft as MotionDocument, layerId));
      doomed.forEach((id) => delete draft.layers[id]);
      removeLayerDependents(draft as MotionDocument, doomed);
    });
  },

  renameLayer(layerId: string, name: string, label = "Rename layer") {
    commit(label, (draft) => {
      requireLayer(draft, layerId).name = name;
    });
  },

  /**
   * Shallow-merges `patch` into the layer's props. An `undefined` value deletes that prop. While a smaller breakpoint
   * is active (Phase 43) the changes go to the layer's overrides for it instead, so the base is untouched; a change
   * to the value the layer already has there writes nothing, and a change back to the base value drops the override.
   */
  updateProps(layerId: string, patch: Record<string, PropValue | undefined>, label?: string) {
    commit(label, (draft) => {
      const layer = requireLayer(draft, layerId);
      const props = layer.properties;
      const list = breakpointsOf(draft);
      const activeId = useBreakpointStore.getState().activeId;
      const routed: Record<string, PropValue | undefined> = {};
      let direct = patch;
      if (!isBase(list, activeId)) {
        direct = {};
        for (const [key, value] of Object.entries(patch)) {
          const res = resolvePropertyPath(key, layer.archetype);
          const path = res.ok ? res.path : key;
          // the canvas position of a top-level frame, and the responsive flag, are the document's, not a breakpoint's
          const global = path === "breakpoints.responsive" || (layer.parentId === null && (path === "frame.x" || path === "frame.y" || path === "positioning"));
          if (global) direct[key] = value;
          else routed[path] = value;
        }
      }
      const defined: LayerProps = {};
      for (const [key, value] of Object.entries(direct)) {
        if (value !== undefined) {
          defined[key] = value;
          continue;
        }
        const res = resolvePropertyPath(key, layer.archetype);
        delete props[res.ok ? res.path : key];
      }
      const before = { width: props["frame.width"], height: props["frame.height"] };
      // an instance's own change is an override: the main no longer overwrites it (Phase 46)
      if (layer.instance) {
        const named = [...Object.keys(direct)].map((k) => {
          const res = resolvePropertyPath(k, layer.archetype);
          return res.ok ? res.path : k;
        });
        markOverridden(layer as Layer, [...named, ...(Object.keys(routed).length > 0 ? ["overrides"] : [])]);
      }
      // a property a person edits by hand stops following its variable or style, and keeps the value they gave it (Phase 45)
      detachOnEdit(draft as MotionDocument, layer as Layer, [...Object.keys(defined), ...Object.keys(direct).filter((k) => direct[k] === undefined)]);
      Object.assign(props, canonicalProps(layer.archetype, defined, "updateProps"));
      if (Object.keys(routed).length > 0) {
        // what a larger breakpoint (or the base) already says: a value equal to it needs no override of its own
        const inherited = resolveLayerAt(layer as Layer, appliedBreakpoints(list, activeId).filter((b) => b.id !== activeId)).properties;
        const slot = ((layer.overrides ??= {})[activeId!] ??= {});
        for (const [path, value] of Object.entries(routed)) {
          if (value === undefined) {
            delete slot[path];
            continue;
          }
          const canon = canonicalProps(layer.archetype, { [path]: value }, "updateProps")[path];
          if (canon === undefined) continue;
          if (JSON.stringify(canon) === JSON.stringify(inherited[path])) delete slot[path];
          else slot[path] = canon;
        }
        if (Object.keys(slot).length === 0) delete layer.overrides![activeId!];
        if (Object.keys(layer.overrides!).length === 0) delete layer.overrides;
      }
      // a frame that changed size: the layers pinned to it follow, in this same change (Phase 42)
      const after = { width: props["frame.width"], height: props["frame.height"] };
      if (typeof before.width === "number" && typeof before.height === "number" && typeof after.width === "number" && typeof after.height === "number" && (before.width !== after.width || before.height !== after.height)) {
        applyConstraintsToChildren(draft as MotionDocument, layerId, { width: before.width, height: before.height }, { width: after.width, height: after.height });
      }
    });
  },

  /** Replaces all of the layer's props. */
  replaceProps(layerId: string, properties: LayerProps, label?: string) {
    commit(label, (draft) => {
      const layer = requireLayer(draft, layerId);
      layer.properties = canonicalProps(layer.archetype, properties, "replaceProps");
    });
  },

  setLayerFlags(layerId: string, flags: Partial<Pick<Layer, "visible" | "locked" | "solo" | "shy" | "motionBlur">>, label?: string) {
    commit(label, (draft) => {
      const layer = requireLayer(draft, layerId);
      if ("visible" in flags) markOverridden(layer as Layer, ["visible"]);
      const activeId = useBreakpointStore.getState().activeId;
      // at a smaller breakpoint, showing or hiding a layer is that breakpoint's override (Phase 43)
      if ("visible" in flags && !isBase(breakpointsOf(draft), activeId)) {
        const { visible, ...rest } = flags;
        Object.assign(layer, rest);
        // visible or hidden as the larger breakpoints (or the base) have it: no override; otherwise this breakpoint says so
        const above = resolveLayerAt(layer as Layer, appliedBreakpoints(breakpointsOf(draft), activeId).filter((b) => b.id !== activeId));
        const slot = ((layer.overrides ??= {})[activeId!] ??= {});
        if ((visible !== false) === (above.visible !== false)) delete slot[VISIBLE_KEY];
        else slot[VISIBLE_KEY] = visible !== false;
        if (Object.keys(slot).length === 0) delete layer.overrides![activeId!];
        if (Object.keys(layer.overrides!).length === 0) delete layer.overrides;
        return;
      }
      Object.assign(layer, flags);
    });
  },

  /**
   * Changes the document in one undo step with a recipe over the draft. The token operations (variables, styles,
   * modes, bindings; Phase 45) are written this way: they touch layers and document fields together.
   */
  mutate(label: string, recipe: (draft: MotionDocument) => void) {
    commit(label, (draft) => recipe(draft as MotionDocument));
  },

  /** Replaces the document's breakpoints (widest first is the base). Overrides of breakpoints that are gone are dropped. */
  setBreakpoints(list: { id: string; name: string; width: number }[], label = "Change breakpoints") {
    commit(label, (draft) => {
      const sorted = [...list].sort((a, b) => b.width - a.width);
      draft.breakpoints = sorted;
      const keep = new Set(sorted.map((b) => b.id));
      for (const layer of Object.values(draft.layers)) {
        if (!layer.overrides) continue;
        for (const id of Object.keys(layer.overrides)) if (!keep.has(id)) delete layer.overrides[id];
        if (Object.keys(layer.overrides).length === 0) delete layer.overrides;
      }
    });
  },

  /** Removes a breakpoint's overrides from layers (all of them, or just `keys`): a layer goes back to what it inherits there. */
  resetOverrides(layerIds: readonly string[], breakpointId: string, keys?: readonly string[], label = "Reset overrides") {
    commit(label, (draft) => {
      for (const id of layerIds) {
        const layer = draft.layers[id];
        const slot = layer?.overrides?.[breakpointId];
        if (!layer || !slot) continue;
        if (keys) for (const k of keys) delete slot[k];
        else delete layer.overrides![breakpointId];
        if (layer.overrides![breakpointId] && Object.keys(slot).length === 0) delete layer.overrides![breakpointId];
        if (Object.keys(layer.overrides!).length === 0) delete layer.overrides;
      }
    });
  },

  /** Sets how fonts show while loading (the project's `font-display`). */
  setFontDisplay(display: "swap" | "block" | "fallback" | "optional" | "auto", label = "Font loading") {
    commit(label, (draft) => {
      if (display === "swap") delete draft.fontDisplay;
      else draft.fontDisplay = display;
    });
  },

  /** Records an imported file in the document's asset manifest (Phase 36). The bytes are in the asset store. */
  addAsset(entry: AssetEntry, label = "Import asset") {
    commit(label, (draft) => {
      (draft.assets ??= {})[entry.id] = entry;
    });
  },

  /** Removes a file from the manifest (the bytes stay in the store until nothing refers to them). */
  removeAsset(id: string, label = "Remove asset") {
    commit(label, (draft) => {
      if (draft.assets) delete draft.assets[id];
    });
  },

  /**
   * Sets a layer's time bar in a composition (Phase 61). A bar equal to the default (the whole composition, no stretch)
   * is removed, so bars stay sparse.
   */
  setLayerBar(compositionId: string, layerId: string, bar: CompositionLayer, label = "Trim layer") {
    commit(label, (draft) => {
      const comp = draft.compositions[compositionId];
      if (!comp) throw new Error(`No composition "${compositionId}".`);
      requireLayer(draft, layerId);
      const isDefault = bar.start === 0 && bar.in === 0 && bar.out === comp.duration && bar.stretch === 1 && !(bar.markers && bar.markers.length > 0);
      if (isDefault) delete comp.layers[layerId];
      else comp.layers[layerId] = { ...bar };
    });
  },

  /** Sets a composition's work area, the part that plays and exports (Phase 61). */
  setWorkArea(compositionId: string, start: number, end: number, label = "Set work area") {
    commit(label, (draft) => {
      const comp = draft.compositions[compositionId];
      if (!comp) throw new Error(`No composition "${compositionId}".`);
      if (!(start >= 0 && end > start && end <= comp.duration + 1e-9)) throw new Error("The work area must lie inside the composition.");
      comp.workArea = { start, end };
    });
  },

  /** Adds a marker to a composition (Phase 61). Returns its id. */
  addMarker(compositionId: string, marker: Omit<Marker, "id"> & { id?: string }, label = "Add marker"): string {
    const id = marker.id ?? createId("mk");
    commit(label, (draft) => {
      const comp = draft.compositions[compositionId];
      if (!comp) throw new Error(`No composition "${compositionId}".`);
      comp.markers.push({ ...marker, id });
      comp.markers.sort((a, b) => a.time - b.time);
    });
    return id;
  },

  updateMarker(compositionId: string, markerId: string, patch: Partial<Omit<Marker, "id">>, label = "Edit marker") {
    commit(label, (draft) => {
      const marker = draft.compositions[compositionId]?.markers.find((m) => m.id === markerId);
      if (!marker) throw new Error(`No marker "${markerId}".`);
      Object.assign(marker, patch);
      draft.compositions[compositionId].markers.sort((a, b) => a.time - b.time);
    });
  },

  removeMarker(compositionId: string, markerId: string, label = "Delete marker") {
    commit(label, (draft) => {
      const comp = draft.compositions[compositionId];
      if (!comp) throw new Error(`No composition "${compositionId}".`);
      comp.markers = comp.markers.filter((m) => m.id !== markerId);
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
      const layer = requireLayer(draft, layerId);
      draft.clips[clip.id] = canonicalClip(layer.archetype, clip, "addClip");
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
      const layer = requireLayer(draft, layerId);
      for (const clip of getLayerClips(draft as MotionDocument, layerId)) delete draft.clips[clip.id];
      for (const template of templates) {
        const clip = attachClip(template, layerId);
        draft.clips[clip.id] = canonicalClip(layer.archetype, clip, "setLayerClips");
      }
    });
  },

  // ---------------------------------------------------------------- tracks

  addTrack(clipId: string, track: Omit<Track, "id"> & { id?: string }, label = "Add track"): string {
    const id = track.id ?? createId("trk");
    commit(label, (draft) => {
      const clip = requireClip(draft, clipId);
      const [canonical] = canonicalTracks(clipArchetype(draft, clip.layerId), [{ ...track, id }], "addTrack");
      if (canonical) clip.tracks.push(canonical);
    });
    return id;
  },

  updateTrack(clipId: string, trackId: string, patch: Partial<Omit<Track, "id" | "keyframes">>, label?: string) {
    commit(label, (draft) => {
      const next = { ...patch };
      if (next.property !== undefined) {
        const resolved = canonicalizeTrackPath(next.property, clipArchetype(draft, requireClip(draft, clipId).layerId));
        if (!resolved) {
          warnDropped("updateTrack", [{ key: next.property, message: `track "${next.property}" is not a property of this layer.` }]);
          delete next.property;
        } else next.property = resolved.path;
      }
      Object.assign(requireTrack(draft, clipId, trackId), next);
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
      const clip = requireClip(draft, clipId);
      clip.tracks = canonicalTracks(clipArchetype(draft, clip.layerId), tracks, "setTracks");
      clip.duration = coverKeyframes(clip).duration;
    });
  },

  /** Inserts or replaces (by id) a keyframe, keeping the track sorted by time. */
  setKeyframe(clipId: string, trackId: string, keyframe: Keyframe, label?: string) {
    commit(label, (draft) => {
      const track = requireTrack(draft, clipId, trackId);
      const next = track.keyframes.filter((k) => k.id !== keyframe.id);
      next.push(typedKeyframe(track.property, keyframe));
      track.keyframes = next.sort((a, b) => a.time - b.time);
      const clip = requireClip(draft, clipId);
      clip.duration = coverKeyframes(clip).duration;
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
      const layer = requireLayer(draft, layerId);
      draft.states[state.id] = { ...state, props: canonicalProps(layer.archetype, props, "addState") };
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
  const activeId = useBreakpointStore((s) => s.activeId);
  const mode = useModeStore((s) => s.activeModeId);
  // the document as seen at the breakpoint and in the mode being edited (the document itself when neither changes anything)
  return documentStore((state) => selector(resolveDocumentAt(state.document, activeId, mode)));
}

export function useLayer(layerId: string | null | undefined): Layer | undefined {
  const activeId = useBreakpointStore((s) => s.activeId);
  const mode = useModeStore((s) => s.activeModeId);
  return documentStore((state) => (layerId ? resolveDocumentAt(state.document, activeId, mode).layers[layerId] : undefined));
}

export function useLayers(): Record<string, Layer> {
  const activeId = useBreakpointStore((s) => s.activeId);
  const mode = useModeStore((s) => s.activeModeId);
  return documentStore((state) => resolveDocumentAt(state.document, activeId, mode).layers);
}

/** `useLayer`, at a given breakpoint rather than the one being edited (a stage drawing a breakpoint of its own, Phase 44). `undefined` follows the one being edited. */
export function useLayerAt(layerId: string | null | undefined, breakpointId: string | null | undefined): Layer | undefined {
  const activeId = useBreakpointStore((s) => s.activeId);
  const mode = useModeStore((s) => s.activeModeId);
  const at = breakpointId === undefined ? activeId : breakpointId;
  return documentStore((state) => (layerId ? resolveDocumentAt(state.document, at, mode).layers[layerId] : undefined));
}

/** `useDocument`, at a given breakpoint (`undefined`: the one being edited). */
export function useDocumentAt<T>(selector: (document: MotionDocument) => T, breakpointId: string | null | undefined): T {
  const activeId = useBreakpointStore((s) => s.activeId);
  const mode = useModeStore((s) => s.activeModeId);
  const at = breakpointId === undefined ? activeId : breakpointId;
  return documentStore((state) => selector(resolveDocumentAt(state.document, at, mode)));
}

/** The document as seen at the breakpoint being edited, for reads outside React that need what is drawn (hit testing, measuring). */
export function getResolvedDocument(): MotionDocument {
  return resolveDocumentAt(documentStore.getState().document, useBreakpointStore.getState().activeId, useModeStore.getState().activeModeId);
}

/** The layer's clips in stack order; stable between renders while clips are unchanged. */
export function useLayerClips(layerId: string | null | undefined): Clip[] {
  const clips = documentStore((state) => state.document.clips);
  return useMemo(() => (layerId ? Object.values(clips).filter((c) => c.layerId === layerId) : []), [clips, layerId]);
}

/** Sub-Phase 41.3: a per-entity selector — re-renders only when this clip's own object reference changes (Immer structural sharing). */
export function useClip(clipId: string | null | undefined): Clip | undefined {
  return documentStore((state) => (clipId ? state.document.clips[clipId] : undefined));
}

/** Sub-Phase 41.3: a per-entity selector — re-renders only when this composition's own object reference changes. */
export function useComposition(compositionId: string | null | undefined): Composition | undefined {
  return documentStore((state) => (compositionId ? state.document.compositions[compositionId] : undefined));
}

/**
 * Test seam: with `window.__LL_TEST__` set before load, `window.__LL_DOC__` gives a browser test the real document
 * commands and the current document, to build fixtures a person would build by hand (nested stacks, many components).
 */
if (typeof window !== "undefined" && (window as unknown as { __LL_TEST__?: boolean }).__LL_TEST__) {
  (window as unknown as Record<string, unknown>).__LL_DOC__ = { commands: documentCommands, get: () => documentStore.getState().document };
}
