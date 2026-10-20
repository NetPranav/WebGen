/**
 * Copying layers (ROADMAP Phase 29): clones a set of subtrees with fresh ids, and their animation clips with them.
 * Used by duplicate, paste and "duplicate frame". Pure: no store, no DOM.
 */

import { createUniqueId } from "../ids";
import type { Clip, Layer } from "../document/schema";

export interface LayerBundle {
  layers: Layer[];
  clips: Clip[];
  /** The ids of the cloned subtree roots, in the order given. */
  roots: string[];
  /** Old id to new id, for every cloned layer. */
  idMap: Map<string, string>;
}

/** The ids of `rootId` and everything under it, parents before children. */
export function subtreeIds(layers: Record<string, Layer>, rootId: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    const l = layers[id];
    if (!l || seen.has(id)) return;
    seen.add(id);
    out.push(id);
    l.children.forEach(visit);
  };
  visit(rootId);
  return out;
}

/** Of `ids`, the ones that aren't inside another of `ids` (what a selection means: a selected group's children are along for the ride). */
export function topmost(layers: Record<string, Layer>, ids: readonly string[]): string[] {
  const picked = new Set(ids);
  return ids.filter((id) => {
    let p = layers[id]?.parentId ?? null;
    let guard = 0;
    while (p && guard++ < 10_000) {
      if (picked.has(p)) return false;
      p = layers[p]?.parentId ?? null;
    }
    return !!layers[id];
  });
}

export function cloneLayers(
  layers: Record<string, Layer>,
  clips: Record<string, Clip>,
  rootIds: readonly string[],
  /** Ids already in the document the copies are going into: no copy takes one. */
  existing: { layers?: Record<string, unknown>; clips?: Record<string, unknown> } = {},
): LayerBundle {
  const idMap = new Map<string, string>();
  const taken = new Set<string>([...Object.keys(existing.layers ?? {}), ...Object.keys(layers)]);
  const order: string[] = [];
  for (const root of rootIds) {
    for (const id of subtreeIds(layers, root)) {
      if (idMap.has(id)) continue;
      const fresh = createUniqueId(id.split("_").slice(0, -1).join("_") || "el", taken);
      taken.add(fresh);
      idMap.set(id, fresh);
      order.push(id);
    }
  }
  const copies = order.map((id): Layer => {
    const layer = structuredClone(layers[id]);
    return {
      ...layer,
      id: idMap.get(id)!,
      parentId: layer.parentId !== null && idMap.has(layer.parentId) ? idMap.get(layer.parentId)! : null,
      children: layer.children.filter((c) => idMap.has(c)).map((c) => idMap.get(c)!),
    };
  });
  const clipIds = new Set<string>([...Object.keys(clips), ...Object.keys(existing.clips ?? {})]);
  const clipCopies: Clip[] = Object.values(clips)
    .filter((c) => idMap.has(c.layerId))
    .map((c) => {
      const id = createUniqueId("clip", clipIds);
      clipIds.add(id);
      return { ...structuredClone(c), id, layerId: idMap.get(c.layerId)! };
    });
  return { layers: copies, clips: clipCopies, roots: rootIds.map((r) => idMap.get(r)!), idMap };
}
