/**
 * ============================================================================
 * MOVING LAYERS BETWEEN PARENTS (ROADMAP Phase 32)
 * ============================================================================
 * `canReparent` is the question every drag in the Layers panel asks before it drops: can these layers go under
 * this parent? The answer carries a reason in plain words, shown when the answer is no. `moveLayers` does the
 * move as one undo step, keeping each layer where it was on the canvas.
 * ============================================================================
 */

import type { Layers } from "./layerTree";
import { documentCommands } from "../store/useDocumentStore";
import { getDocument } from "../store/documentState";
import { subtreeIds, topmost } from "../editing/cloneLayers";
import { worldBox, writeBoxes } from "../editing/layerBoxes";
import { MAX_TREE_DEPTH } from "../render/limits";
import type { Box } from "../geometry/transform";
import { documentOrder } from "../selection/selectionOps";

/** Archetypes that can hold other layers. Everything else is a leaf. */
export const CONTAINER_ARCHETYPES: ReadonlySet<string> = new Set(["container", "form", "svgGroup"]);

export type ReparentResult = { ok: true } | { ok: false; reason: string };

const nameOf = (layers: Layers, id: string) => layers[id]?.name || id;

function isLockedWithin(layers: Layers, id: string): boolean {
  let cur: Layers[string] | undefined = layers[id];
  let guard = 0;
  while (cur && guard++ < MAX_TREE_DEPTH + 2) {
    if (cur.locked === true) return true;
    cur = cur.parentId ? layers[cur.parentId] : undefined;
  }
  return false;
}

function depthOf(layers: Layers, id: string): number {
  let d = 0;
  let cur = layers[id]?.parentId ?? null;
  while (cur && d < MAX_TREE_DEPTH + 2) {
    d++;
    cur = layers[cur]?.parentId ?? null;
  }
  return d;
}

function heightOf(layers: Layers, id: string): number {
  const l = layers[id];
  if (!l || l.children.length === 0) return 0;
  return 1 + Math.max(...l.children.map((c) => heightOf(layers, c)));
}

/** Whether `ids` may be moved under `parentId` (null: onto the canvas as top-level frames). */
export function canReparent(layers: Layers, ids: readonly string[], parentId: string | null): ReparentResult {
  const moving = topmost(layers, ids.filter((id) => layers[id]));
  if (moving.length === 0) return { ok: false, reason: "There is nothing to move." };
  for (const id of moving) {
    if (isLockedWithin(layers, id)) return { ok: false, reason: `"${nameOf(layers, id)}" is locked. Unlock it to move it.` };
  }
  if (parentId === null) {
    const leaf = moving.find((id) => !CONTAINER_ARCHETYPES.has(layers[id].archetype));
    if (leaf) return { ok: false, reason: `Only frames can sit on the canvas by themselves; "${nameOf(layers, leaf)}" is a ${layers[leaf].archetype}.` };
    return { ok: true };
  }
  const parent = layers[parentId];
  if (!parent) return { ok: false, reason: "That place no longer exists." };
  for (const id of moving) {
    if (subtreeIds(layers, id).includes(parentId)) return { ok: false, reason: `"${nameOf(layers, id)}" can't go inside itself.` };
  }
  if (!CONTAINER_ARCHETYPES.has(parent.archetype)) return { ok: false, reason: `"${parent.name}" is a ${parent.archetype}; only frames and groups can hold other layers.` };
  if (isLockedWithin(layers, parentId)) return { ok: false, reason: `"${parent.name}" is locked. Unlock it to put layers inside.` };
  const base = depthOf(layers, parentId) + 1;
  for (const id of moving) {
    if (base + heightOf(layers, id) > MAX_TREE_DEPTH) return { ok: false, reason: `Layers can be nested ${MAX_TREE_DEPTH} deep at most.` };
  }
  return { ok: true };
}

export type MoveResult = { ok: true; moved: string[] } | { ok: false; reason: string };

/**
 * Moves layers under `parentId` at `index` (in the parent's `children`, which run back to front; the index counts
 * after the moved layers have left it). Their order relative to each other is kept. A layer placed with
 * `absolute` positioning stays where it was on the canvas. Moving within the top level is refused: the order of
 * frames is their place on the canvas.
 */
export function moveLayers(ids: readonly string[], parentId: string | null, index?: number): MoveResult {
  const layers = getDocument().layers;
  const verdict = canReparent(layers, ids, parentId);
  if (!verdict.ok) return verdict;
  const order = new Map(documentOrder(layers).map((id, i) => [id, i] as const));
  const moving = topmost(layers, ids.filter((id) => layers[id])).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  if (parentId === null && moving.every((id) => layers[id].parentId === null)) return { ok: false, reason: "Frames are ordered by where they sit on the canvas." };

  // where each absolute layer is now, so it can stay there
  const keep = moving.filter((id) => layers[id].properties.positioning === "absolute" || layers[id].parentId === null);
  const boxes = new Map<string, Box>();
  for (const id of keep) {
    const b = worldBox(id);
    if (b) boxes.set(id, b);
  }
  const tx = documentCommands.begin("Move layers");
  try {
    moving.forEach((id, i) => documentCommands.moveLayer(id, parentId, parentId === null || index === undefined ? undefined : index + i));
    const placed = keep.filter((id) => boxes.has(id));
    if (placed.length > 0) {
      // positions are relative to the new parent's top-left (a top-level frame's parent is the canvas)
      writeBoxes(placed, placed.map((id) => boxes.get(id)!), parentId === null ? { x: 0, y: 0 } : undefined);
    }
    tx.commit();
  } catch (error) {
    tx.cancel();
    throw error;
  }
  return { ok: true, moved: moving };
}

