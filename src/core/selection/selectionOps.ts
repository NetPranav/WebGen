/**
 * ============================================================================
 * SELECTION OPERATIONS (ROADMAP Phase 26)
 * ============================================================================
 * What "select all", "inverse", "children" and "parent" mean, as pure functions
 * over a document's layers and the current selection, so the rules are tested
 * without a canvas. All of them work on one *scope*: the layers that share a
 * parent with the selection (Figma's rule), and skip hidden and locked layers.
 * Results are in document order, so the same selection always comes out the
 * same way.
 * ============================================================================
 */

import type { Layer } from "../document/schema";

type Layers = Record<string, Layer>;

/** Selectable on the canvas: drawn (not hidden) and not locked, itself and by every ancestor. */
export function isSelectable(layers: Layers, id: string): boolean {
  let current: Layer | undefined = layers[id];
  let guard = 0;
  while (current && guard++ < 10_000) {
    if (current.visible === false || current.locked === true) return false;
    current = current.parentId ? layers[current.parentId] : undefined;
  }
  return current === undefined && layers[id] !== undefined;
}

/** The top-level layers (frames), in document order. */
export function rootIds(layers: Layers): string[] {
  return Object.values(layers)
    .filter((l) => l.parentId === null)
    .map((l) => l.id);
}

/** Every layer in the document in paint order: each frame, then its subtree depth-first. */
export function documentOrder(layers: Layers): string[] {
  const out: string[] = [];
  const visit = (id: string, depth: number) => {
    const l = layers[id];
    if (!l || depth > 10_000) return;
    out.push(id);
    l.children.forEach((c) => visit(c, depth + 1));
  };
  rootIds(layers).forEach((r) => visit(r, 0));
  return out;
}

function inDocumentOrder(layers: Layers, ids: Iterable<string>): string[] {
  const wanted = new Set(ids);
  return documentOrder(layers).filter((id) => wanted.has(id));
}

/** The layers that share the selection's parent: the scope for select all and inverse. With no selection, the active frame's children. */
export function scopeOf(layers: Layers, selected: readonly string[], activeFrameId: string | null): string[] {
  const first = selected.find((id) => layers[id]);
  if (first !== undefined) {
    const parentId = layers[first].parentId;
    return parentId === null ? rootIds(layers) : [...layers[parentId].children];
  }
  const frame = activeFrameId && layers[activeFrameId] ? activeFrameId : rootIds(layers)[0];
  return frame && layers[frame] ? [...layers[frame].children] : [];
}

export function selectAll(layers: Layers, selected: readonly string[], activeFrameId: string | null): string[] {
  return inDocumentOrder(layers, scopeOf(layers, selected, activeFrameId).filter((id) => isSelectable(layers, id)));
}

export function selectInverse(layers: Layers, selected: readonly string[], activeFrameId: string | null): string[] {
  const picked = new Set(selected);
  return inDocumentOrder(layers, scopeOf(layers, selected, activeFrameId).filter((id) => !picked.has(id) && isSelectable(layers, id)));
}

/** The children of everything selected. A selection with no children to go into stays as it is. */
export function selectChildren(layers: Layers, selected: readonly string[]): string[] {
  const kids = new Set<string>();
  for (const id of selected) for (const c of layers[id]?.children ?? []) if (isSelectable(layers, c)) kids.add(c);
  return kids.size > 0 ? inDocumentOrder(layers, kids) : [...selected];
}

/** The parents of everything selected (a top-level layer has none and stays selected). */
export function selectParents(layers: Layers, selected: readonly string[]): string[] {
  const out = new Set<string>();
  for (const id of selected) {
    const l = layers[id];
    if (!l) continue;
    out.add(l.parentId !== null && layers[l.parentId] ? l.parentId : id);
  }
  return inDocumentOrder(layers, out);
}

/** Replaces, adds to, or toggles `picked` in `current` (Shift-click and Shift-marquee add; a toggle removes what was already there). */
export function combineSelection(current: readonly string[], picked: readonly string[], mode: "replace" | "add" | "toggle"): string[] {
  if (mode === "replace") return [...picked];
  if (mode === "add") return [...current, ...picked.filter((id) => !current.includes(id))];
  const set = new Set(current);
  for (const id of picked) {
    if (set.has(id)) set.delete(id);
    else set.add(id);
  }
  return Array.from(set);
}

/**
 * What a marquee selects. Started inside a frame: that frame's direct children the box touches. Started on bare
 * canvas: the frames it touches. Locked and hidden layers are skipped.
 */
export function marqueeCandidates(
  layers: Layers,
  boxes: ReadonlyMap<string, { x: number; y: number; width: number; height: number }>,
  rect: { x: number; y: number; width: number; height: number },
  startFrameId: string | null,
): string[] {
  const touches = (b: { x: number; y: number; width: number; height: number }) =>
    b.x <= rect.x + rect.width && b.x + b.width >= rect.x && b.y <= rect.y + rect.height && b.y + b.height >= rect.y;
  const pool = startFrameId && layers[startFrameId] ? layers[startFrameId].children : rootIds(layers);
  return inDocumentOrder(
    layers,
    pool.filter((id) => {
      const b = boxes.get(id);
      return !!b && touches(b) && isSelectable(layers, id);
    }),
  );
}
