/**
 * ============================================================================
 * THE LAYER TREE AS ROWS (ROADMAP Phase 32)
 * ============================================================================
 * The Layers panel is a list of rows, not nested elements, so a 5,000-layer document is as cheap to scroll as a
 * 50-layer one (the panel draws only the rows in view). This module turns the document into those rows. It is
 * pure: no DOM, no store.
 *
 * Order: front-most first, as in Figma, so the last child of a layer is listed first and the last frame is on top.
 * ============================================================================
 */

import type { Layer } from "../document/schema";

export type Layers = Record<string, Layer>;

export interface LayerRow {
  id: string;
  depth: number;
  name: string;
  archetype: string;
  parentId: string | null;
  hasChildren: boolean;
  expanded: boolean;
  /** The layer itself is locked. */
  locked: boolean;
  /** Some ancestor is locked, so the layer can't be edited either. */
  lockedByAncestor: boolean;
  /** The layer itself is hidden. */
  hidden: boolean;
  hiddenByAncestor: boolean;
  /** The row is listed only because a layer below it matches the search. */
  context: boolean;
}

export const rootIdsOf = (layers: Layers): string[] => Object.values(layers).filter((l) => l.parentId === null).map((l) => l.id);

const MAX_DEPTH = 64;

/** Lower-cased words a search matches against: the name and the kind of layer. */
const haystack = (l: Layer): string => `${l.name} ${l.archetype}`.toLowerCase();

/**
 * The rows to show. With a search, only matching layers and the layers above them are listed, all expanded.
 * Layers whose parent is missing are not listed (a damaged document can't crash the panel).
 */
export function buildRows(layers: Layers, expanded: ReadonlySet<string>, query = ""): LayerRow[] {
  const q = query.trim().toLowerCase();
  let keep: Set<string> | null = null;
  let matches: Set<string> | null = null;
  if (q !== "") {
    keep = new Set();
    matches = new Set();
    for (const l of Object.values(layers)) {
      if (!haystack(l).includes(q)) continue;
      matches.add(l.id);
      let cur: Layer | undefined = l;
      let guard = 0;
      while (cur && !keep.has(cur.id) && guard++ < MAX_DEPTH + 1) {
        keep.add(cur.id);
        cur = cur.parentId ? layers[cur.parentId] : undefined;
      }
    }
  }
  const rows: LayerRow[] = [];
  const visit = (id: string, depth: number, lockedAbove: boolean, hiddenAbove: boolean) => {
    const l = layers[id];
    if (!l || depth > MAX_DEPTH || (keep && !keep.has(id))) return;
    const kids = keep ? l.children.filter((c) => keep!.has(c)) : l.children.filter((c) => layers[c]);
    const open = keep ? kids.length > 0 : expanded.has(id);
    rows.push({
      id,
      depth,
      name: l.name,
      archetype: l.archetype,
      parentId: l.parentId,
      hasChildren: l.children.length > 0,
      expanded: open,
      locked: l.locked === true,
      lockedByAncestor: lockedAbove,
      hidden: l.visible === false,
      hiddenByAncestor: hiddenAbove,
      context: matches !== null && !matches.has(id),
    });
    if (open) for (let i = kids.length - 1; i >= 0; i--) visit(kids[i], depth + 1, lockedAbove || l.locked === true, hiddenAbove || l.visible === false);
  };
  const roots = rootIdsOf(layers);
  for (let i = roots.length - 1; i >= 0; i--) visit(roots[i], 0, false, false);
  return rows;
}

/** The ids from the top-most ancestor down to the layer's parent. */
export function ancestorsOf(layers: Layers, id: string): string[] {
  const out: string[] = [];
  let cur = layers[id]?.parentId ?? null;
  let guard = 0;
  while (cur && guard++ < MAX_DEPTH + 1) {
    out.unshift(cur);
    cur = layers[cur]?.parentId ?? null;
  }
  return out;
}

/** The ids between two rows, both included (Shift-click). Either id missing gives just the one that is there. */
export function rangeBetween(rows: readonly LayerRow[], a: string, b: string): string[] {
  const i = rows.findIndex((r) => r.id === a);
  const j = rows.findIndex((r) => r.id === b);
  if (i < 0 || j < 0) return [b].filter((id) => rows.some((r) => r.id === id));
  return rows.slice(Math.min(i, j), Math.max(i, j) + 1).map((r) => r.id);
}
