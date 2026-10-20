/**
 * ============================================================================
 * EDITING OPERATIONS (ROADMAP Phase 29)
 * ============================================================================
 * Copy, cut, paste, duplicate, delete, nudge, z-order, group, ungroup, frame
 * selection, lock, hide and rename, as functions over the document. Each is one
 * document transaction, so one undo step, and leaves the selection where a
 * person expects it (pasted layers, the copies, the new group, the children).
 * The commands in `editCommands.ts` call these; nothing here touches the DOM.
 * ============================================================================
 */

import { getDefaultProps } from "../document/registry";
import type { Layer } from "../document/schema";
import { duplicateFrame } from "../frames/frameCommands";
import { listFrames, nextFramePosition } from "../frames/frames";
import { alignBoxes, distributeBoxes, tidyBoxes, unionBounds, type AlignMode, type SpreadAxis } from "../geometry/align";
import { moveBoxes, unionBox, type Box } from "../geometry/transform";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { cloneLayers, subtreeIds, topmost } from "./cloneLayers";
import { MAX_CLIP_LAYERS, parseClip, serializeClip, type ClipPayload } from "./clipboard";
import { parentOrigin, worldBox, writeBoxes } from "./layerBoxes";
import { documentOrder, isSelectable } from "../selection/selectionOps";
import { repairPageRoots } from "../frames/pageRoots";

const DEFAULT_OFFSET = { dx: 16, dy: 16 };

/** Runs `fn` as one undo step. Nested inside another transaction it joins it. */
function transaction<T>(label: string, fn: () => T): T {
  const tx = documentCommands.begin(label);
  try {
    const result = fn();
    tx.commit();
    return result;
  } catch (error) {
    tx.cancel();
    throw error;
  }
}

const select = (ids: readonly string[]) => useSelectionStore.getState().selectMultiple([...ids], "element");
const layers = () => getDocument().layers;

/** The selection as the top-most layers, in document order. */
export function selectionRoots(ids: readonly string[]): string[] {
  const l = layers();
  const top = new Set(topmost(l, ids));
  return documentOrder(l).filter((id) => top.has(id));
}

// ---------------------------------------------------------------------------
// Copy and paste
// ---------------------------------------------------------------------------

/** The selection's top-most layers that can be changed: not locked, and not inside a locked layer. */
export function editableRoots(ids: readonly string[]): string[] {
  const l = layers();
  return selectionRoots(ids).filter((id) => {
    let cur: Layer | undefined = l[id];
    let guard = 0;
    while (cur && guard++ < 10_000) {
      if (cur.locked === true) return false;
      cur = cur.parentId ? l[cur.parentId] : undefined;
    }
    return true;
  });
}

/** The clipboard text for `ids` (their subtrees and animations), or null when there is nothing to copy. */
export function copyText(ids: readonly string[], projectId?: string): string | null {
  const roots = selectionRoots(ids);
  if (roots.length === 0) return null;
  const doc = getDocument();
  const include = new Set<string>();
  for (const r of roots) subtreeIds(doc.layers, r).forEach((id) => include.add(id));
  // More than a paste will take: copy nothing rather than put a clip on the clipboard that pastes nothing.
  if (include.size > MAX_CLIP_LAYERS) return null;
  const payload: ClipPayload = {
    v: 1,
    layers: documentOrder(doc.layers).filter((id) => include.has(id)).map((id) => structuredClone(doc.layers[id])),
    clips: Object.values(doc.clips).filter((c) => include.has(c.layerId)).map((c) => structuredClone(c)),
    roots,
    source: { projectId, parentId: doc.layers[roots[0]].parentId, at: Date.now() },
  };
  return serializeClip(payload);
}

export interface PasteOptions {
  /** Paste into this container (the selection) instead of where the layers came from. */
  into?: string | null;
  /** Keep the exact position; otherwise a copy beside its original is nudged so it doesn't hide it. */
  inPlace?: boolean;
}

/** Pastes a clipboard text. Returns the new layers' ids, or [] if the text isn't a layer clip. */
export function pasteText(text: string | null | undefined, options: PasteOptions = {}): string[] {
  const payload = parseClip(text);
  if (!payload) return [];
  const doc = getDocument();
  const byId: Record<string, Layer> = Object.fromEntries(payload.layers.map((l) => [l.id, l]));
  const clipById = Object.fromEntries(payload.clips.map((c) => [c.id, c]));
  const bundle = cloneLayers(byId, clipById, payload.roots, { layers: doc.layers, clips: doc.clips });
  const frames = listFrames(doc.layers);
  const active = useCanvasViewStore.getState().activeFrameId;
  const fallbackFrame = (active && doc.layers[active] && doc.layers[active].parentId === null ? active : frames[0]?.id) ?? null;

  return transaction("Paste", () => {
    let nextFrame = nextFramePosition(frames);
    payload.roots.forEach((originalId, i) => {
      const clone = bundle.layers.find((l) => l.id === bundle.roots[i])!;
      const original = byId[originalId];
      const wasFrame = original.parentId === null;
      const sourceStillThere = !!doc.layers[originalId];
      let parentId: string | null;
      if (wasFrame) parentId = null;
      else if (options.into && doc.layers[options.into] && isSelectable(doc.layers, options.into)) parentId = options.into;
      else if (original.parentId && doc.layers[original.parentId]) parentId = original.parentId;
      else parentId = fallbackFrame;
      clone.parentId = parentId;
      const props = { ...clone.properties };
      const absolute = props.positioning === "absolute" || wasFrame;
      if (wasFrame) {
        if (!options.inPlace) {
          props["frame.x"] = nextFrame.x;
          props["frame.y"] = nextFrame.y;
          nextFrame = { x: nextFrame.x + (typeof props["frame.width"] === "number" ? props["frame.width"] : 1440) + 120, y: nextFrame.y };
        }
      } else if (absolute && !options.inPlace && sourceStillThere && parentId === original.parentId) {
        props["frame.x"] = (typeof props["frame.x"] === "number" ? props["frame.x"] : 0) + DEFAULT_OFFSET.dx;
        props["frame.y"] = (typeof props["frame.y"] === "number" ? props["frame.y"] : 0) + DEFAULT_OFFSET.dy;
      }
      clone.properties = props;
    });
    documentCommands.insertLayers(bundle.layers, bundle.clips, "Paste");
    select(bundle.roots);
    return bundle.roots;
  });
}

// ---------------------------------------------------------------------------
// Duplicate
// ---------------------------------------------------------------------------

let duplicateMemory: { sources: string[]; copies: string[] } | null = null;

/** Forgets the last duplicate's offset (a new document, or tests). */
export function resetDuplicateMemory(): void {
  duplicateMemory = null;
}

/** The offset a duplicate gets: the last duplicate's, if the copy was moved and is being duplicated again; else 16, 16. */
function duplicateOffset(ids: readonly string[]): { dx: number; dy: number } {
  const mem = duplicateMemory;
  if (mem && mem.copies.length === ids.length && mem.copies.every((c, i) => c === ids[i])) {
    const a = worldBox(mem.copies[0]);
    const b = worldBox(mem.sources[0]);
    if (a && b) {
      const dx = Math.round((a.cx - b.cx) * 100) / 100;
      const dy = Math.round((a.cy - b.cy) * 100) / 100;
      if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) return { dx, dy };
    }
  }
  return DEFAULT_OFFSET;
}

/** Duplicates the selection beside the originals (frames to the right). Returns the copies' ids. */
export function duplicateLayers(ids: readonly string[]): string[] {
  const roots = editableRoots(ids);
  if (roots.length === 0) return [];
  const doc = getDocument();
  const offset = duplicateOffset(roots);
  const copies: string[] = [];
  transaction("Duplicate", () => {
    for (const id of roots) {
      const original = doc.layers[id];
      if (original.parentId === null) {
        copies.push(duplicateFrame(id));
        continue;
      }
      const bundle = cloneLayers(getDocument().layers, getDocument().clips, [id], { layers: getDocument().layers, clips: getDocument().clips });
      const root = bundle.layers[0];
      root.parentId = original.parentId;
      if (original.properties.positioning === "absolute") {
        const x = typeof original.properties["frame.x"] === "number" ? original.properties["frame.x"] : 0;
        const y = typeof original.properties["frame.y"] === "number" ? original.properties["frame.y"] : 0;
        root.properties = { ...root.properties, "frame.x": x + offset.dx, "frame.y": y + offset.dy };
      }
      documentCommands.insertLayers(bundle.layers, bundle.clips, "Duplicate");
      const index = getDocument().layers[original.parentId].children.indexOf(id);
      documentCommands.moveLayer(root.id, original.parentId, index + 1);
      copies.push(root.id);
    }
  });
  duplicateMemory = { sources: roots, copies };
  select(copies);
  return copies;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/** Deletes the selection. A document keeps at least one frame. Returns how many top-level layers went. */
export function deleteLayers(ids: readonly string[]): number {
  let roots = editableRoots(ids);
  const frameCount = listFrames(layers()).length;
  const frames = roots.filter((id) => layers()[id].parentId === null);
  if (frames.length >= frameCount) {
    const keep = frames[0];
    roots = roots.filter((id) => id !== keep);
  }
  if (roots.length === 0) return 0;
  transaction("Delete", () => {
    for (const id of roots) if (getDocument().layers[id]) documentCommands.removeLayer(id, "Delete");
  });
  repairPageRoots();
  useSelectionStore.getState().clearSelection();
  return roots.length;
}

// ---------------------------------------------------------------------------
// Nudge
// ---------------------------------------------------------------------------

/** Moves the selection by (dx, dy). A flow-placed layer becomes absolute at its place first. */
export function nudgeLayers(ids: readonly string[], dx: number, dy: number): void {
  const roots = editableRoots(ids);
  const boxes = roots.map((id) => worldBox(id)).filter((b): b is Box => b !== null);
  if (boxes.length !== roots.length || roots.length === 0) return;
  transaction("Nudge", () => writeBoxes(roots, moveBoxes(boxes, dx, dy)));
}

// ---------------------------------------------------------------------------
// Align, distribute and tidy (Phase 30)
// ---------------------------------------------------------------------------

/** What an alignment lines up with: the selection's own bounds, or the parent's box. By default several layers align to each other and one layer to its parent. */
export type AlignTarget = "auto" | "selection" | "parent";

/** The boxes of the editable top-most layers in the selection, or null when any can't be found. */
function editableBoxes(ids: readonly string[]): { roots: string[]; boxes: Box[] } | null {
  const roots = editableRoots(ids);
  const boxes = roots.map((id) => worldBox(id)).filter((b): b is Box => b !== null);
  return boxes.length === roots.length && roots.length > 0 ? { roots, boxes } : null;
}

/** Aligns the selection. Returns false (and changes nothing) when there is nothing to align to: one layer with no parent, or no editable layers. */
export function alignLayers(ids: readonly string[], mode: AlignMode, to: AlignTarget = "auto"): boolean {
  const e = editableBoxes(ids);
  if (!e) return false;
  const layers = getDocument().layers;
  const useParent = to === "parent" || (to === "auto" && selectionRoots(ids).length === 1); // a locked layer in the selection still counts as "several"
  let target;
  if (useParent) {
    const parentIds = new Set(e.roots.map((id) => layers[id].parentId));
    if (parentIds.size !== 1) return false;
    const parentId = [...parentIds][0];
    const pb = parentId ? worldBox(parentId) : null;
    if (!pb) return false; // a top-level frame has no parent to align to
    target = { x: pb.cx - pb.w / 2, y: pb.cy - pb.h / 2, width: pb.w, height: pb.h };
  } else {
    if (e.roots.length < 2) return false;
    target = unionBounds(e.boxes)!;
  }
  const next = alignBoxes(e.boxes, mode, target);
  if (next.every((b, i) => b.cx === e.boxes[i].cx && b.cy === e.boxes[i].cy)) return false;
  transaction("Align", () => writeBoxes(e.roots, next));
  return true;
}

/** Spreads three or more layers so the gaps between them are equal. */
export function distributeLayers(ids: readonly string[], axis: SpreadAxis): boolean {
  const e = editableBoxes(ids);
  if (!e || e.roots.length < 3) return false;
  const next = distributeBoxes(e.boxes, axis);
  if (next.every((b, i) => b.cx === e.boxes[i].cx && b.cy === e.boxes[i].cy)) return false;
  transaction("Distribute spacing", () => writeBoxes(e.roots, next));
  return true;
}

/** Puts two or more layers on a tidy grid. */
export function tidyLayers(ids: readonly string[]): boolean {
  const e = editableBoxes(ids);
  if (!e || e.roots.length < 2) return false;
  const next = tidyBoxes(e.boxes);
  if (next.every((b, i) => b.cx === e.boxes[i].cx && b.cy === e.boxes[i].cy)) return false;
  transaction("Tidy up", () => writeBoxes(e.roots, next));
  return true;
}

// ---------------------------------------------------------------------------
// Z-order
// ---------------------------------------------------------------------------

export type ZOrderOp = "forward" | "backward" | "front" | "back";

/** The new child order after moving `selected` per `op`. Pure. Selected layers keep their relative order. */
export function reorder(children: readonly string[], selected: ReadonlySet<string>, op: ZOrderOp): string[] {
  const out = [...children];
  if (op === "front") return [...out.filter((c) => !selected.has(c)), ...out.filter((c) => selected.has(c))];
  if (op === "back") return [...out.filter((c) => selected.has(c)), ...out.filter((c) => !selected.has(c))];
  if (op === "forward") {
    for (let i = out.length - 2; i >= 0; i--) if (selected.has(out[i]) && !selected.has(out[i + 1])) [out[i], out[i + 1]] = [out[i + 1], out[i]];
  } else {
    for (let i = 1; i < out.length; i++) if (selected.has(out[i]) && !selected.has(out[i - 1])) [out[i], out[i - 1]] = [out[i - 1], out[i]];
  }
  return out;
}

/** Brings the selection forward / backward / to the front / to the back among its siblings. Returns whether the order changed. */
export function reorderLayers(ids: readonly string[], op: ZOrderOp): boolean {
  const doc = getDocument();
  const byParent = new Map<string, Set<string>>();
  for (const id of editableRoots(ids)) {
    const parent = doc.layers[id].parentId;
    if (parent === null) continue; // the frames' order is their position, not a z-order
    byParent.set(parent, (byParent.get(parent) ?? new Set()).add(id));
  }
  let changed = false;
  transaction("Arrange", () => {
    for (const [parentId, selected] of byParent) {
      const before = getDocument().layers[parentId].children;
      const after = reorder(before, selected, op);
      if (after.every((c, i) => c === before[i])) continue;
      changed = true;
      after.forEach((id, index) => {
        if (getDocument().layers[parentId].children[index] !== id) documentCommands.moveLayer(id, parentId, index, "Arrange");
      });
    }
  });
  return changed;
}

// ---------------------------------------------------------------------------
// Group, ungroup, frame selection
// ---------------------------------------------------------------------------

/** Wraps the selected siblings in a new container at their combined box. `frame` makes it a white frame, not an invisible group. */
export function groupLayers(ids: readonly string[], kind: "group" | "frame" = "group"): string | null {
  const doc = getDocument();
  const roots = editableRoots(ids);
  if (roots.length === 0) return null;
  // Top-level frames aren't grouped; layers from different parents are, under the first one's parent (their canvas
  // positions are kept, so nothing seems to move).
  if (roots.some((id) => doc.layers[id].parentId === null)) return null;
  const parentId = doc.layers[roots[0]].parentId!;
  const members = roots;
  const boxes = members.map((id) => worldBox(id)).filter((b): b is Box => b !== null);
  if (boxes.length !== members.length) return null;
  const u = unionBox(boxes)!;
  const rect = { x: u.cx - u.w / 2, y: u.cy - u.h / 2, w: u.w, h: u.h };
  const origin = parentOrigin(members[0]);
  const sameParent = members.filter((id) => doc.layers[id].parentId === parentId);
  const index = Math.min(...sameParent.map((id) => doc.layers[parentId].children.indexOf(id)));
  return transaction(kind === "frame" ? "Frame selection" : "Group", () => {
    const props = {
      ...getDefaultProps("container"),
      positioning: "absolute",
      "frame.x": Math.round((rect.x - origin.x) * 100) / 100,
      "frame.y": Math.round((rect.y - origin.y) * 100) / 100,
      "frame.width": Math.round(rect.w * 100) / 100,
      "frame.height": Math.round(rect.h * 100) / 100,
      "layout.padding": 0,
      "layout.gap": 0,
      "appearance.radius": 0,
      "appearance.background.color": kind === "frame" ? "#ffffff" : "transparent",
    };
    const groupId = documentCommands.addLayer({ archetype: "container", parentId, name: kind === "frame" ? "Frame" : "Group", properties: props, index }, kind === "frame" ? "Frame selection" : "Group");
    members.forEach((id, i) => documentCommands.moveLayer(id, groupId, i));
    writeBoxes(members, boxes, { x: rect.x, y: rect.y });
    select([groupId]);
    return groupId;
  });
}

/** Dissolves each selected container (not a top-level frame) into its parent; the children take its place. Returns the freed layers. */
export function ungroupLayers(ids: readonly string[]): string[] {
  const roots = editableRoots(ids).filter((id) => {
    const l = layers()[id];
    return l && l.parentId !== null && l.archetype === "container" && l.children.length > 0;
  });
  if (roots.length === 0) return [];
  const freed: string[] = [];
  transaction("Ungroup", () => {
    for (const groupId of roots) {
      const group = getDocument().layers[groupId];
      const parentId = group.parentId!;
      const kids = [...group.children];
      const boxes = kids.map((id) => worldBox(id));
      const origin = parentOrigin(groupId);
      let at = getDocument().layers[parentId].children.indexOf(groupId);
      for (const kid of kids) documentCommands.moveLayer(kid, parentId, at++, "Ungroup");
      kids.forEach((kid, i) => {
        const b = boxes[i];
        if (b) writeBoxes([kid], [b], origin);
      });
      documentCommands.removeLayer(groupId, "Ungroup");
      freed.push(...kids);
    }
  });
  select(freed);
  return freed;
}

// ---------------------------------------------------------------------------
// Lock, hide, rename
// ---------------------------------------------------------------------------

/** Locks the selection, or unlocks it if every selected layer is already locked. Returns the new state. */
export function toggleLock(ids: readonly string[]): boolean {
  const roots = selectionRoots(ids);
  if (roots.length === 0) return false;
  const lock = !roots.every((id) => layers()[id].locked === true);
  transaction(lock ? "Lock" : "Unlock", () => roots.forEach((id) => documentCommands.setLayerFlags(id, { locked: lock })));
  return lock;
}

/** Hides the selection, or shows it if every selected layer is already hidden. Returns whether they are now hidden. */
export function toggleHidden(ids: readonly string[]): boolean {
  const roots = selectionRoots(ids);
  if (roots.length === 0) return false;
  const hide = !roots.every((id) => layers()[id].visible === false);
  transaction(hide ? "Hide" : "Show", () => roots.forEach((id) => documentCommands.setLayerFlags(id, { visible: !hide })));
  if (hide) useSelectionStore.getState().clearSelection(); // a hidden layer can't stay selected
  return hide;
}

/** Unlocks every locked layer (a locked layer can't be clicked, so this is how to get them back until the Layers panel). Returns how many. */
export function unlockAll(): number {
  const locked = Object.values(layers()).filter((l) => l.locked === true);
  if (locked.length === 0) return 0;
  transaction("Unlock all", () => locked.forEach((l) => documentCommands.setLayerFlags(l.id, { locked: false })));
  return locked.length;
}

/** Shows every hidden layer. Returns how many. */
export function showAll(): number {
  const hidden = Object.values(layers()).filter((l) => l.visible === false);
  if (hidden.length === 0) return 0;
  transaction("Show all", () => hidden.forEach((l) => documentCommands.setLayerFlags(l.id, { visible: true })));
  return hidden.length;
}

export function renameLayer(id: string, name: string): void {
  const title = name.trim();
  if (!title) throw new Error("A layer needs a name.");
  if (!layers()[id]) throw new Error(`No layer "${id}".`);
  documentCommands.renameLayer(id, title, "Rename");
}

