/**
 * The Pen tool's drafting, as pure functions (ROADMAP Phase 39), the way Figma's pen works: a click puts a corner
 * node; a click and drag puts a smooth node and pulls its two handles out symmetrically (Alt breaks the pair, so
 * the incoming handle stays); a click on the first node closes the path; Backspace takes back the last node.
 */

import type { PathNode, Vec } from "./pathFit";

export interface PenState {
  nodes: PathNode[];
  closed: boolean;
}

export const EMPTY_PEN: PenState = { nodes: [], closed: false };

/** Adds a corner node at `p`. `t` is the time since the path was begun, `pressure` 0 to 1. */
export function penPress(s: PenState, p: Vec, t = 0, pressure = 0.5): PenState {
  if (s.closed) return s;
  return { ...s, nodes: [...s.nodes, { x: p.x, y: p.y, t: Math.round(t), p: pressure }] };
}

/**
 * While the button is down after a press: pulls the last node's outgoing handle to `p` and puts the incoming handle
 * opposite it. With `breakPair` (Alt) only the outgoing handle moves. A drag that ends where the node is leaves a corner.
 */
export function penDrag(s: PenState, p: Vec, breakPair = false): PenState {
  const last = s.nodes[s.nodes.length - 1];
  if (!last || s.closed) return s;
  const node: PathNode = { ...last, hout: { x: p.x, y: p.y } };
  if (!breakPair) node.hin = s.nodes.length > 1 ? { x: 2 * last.x - p.x, y: 2 * last.y - p.y } : undefined;
  if (node.hin === undefined) delete node.hin;
  return { ...s, nodes: [...s.nodes.slice(0, -1), node] };
}

/** Is `p` close enough to the first node to close the path on it? Needs three nodes at least. */
export function penNearFirst(s: PenState, p: Vec, tolerance: number): boolean {
  const first = s.nodes[0];
  return !!first && s.nodes.length >= 3 && !s.closed && Math.hypot(p.x - first.x, p.y - first.y) <= tolerance;
}

export function penClose(s: PenState): PenState {
  return s.nodes.length >= 3 ? { ...s, closed: true } : s;
}

/** Takes back the last node. */
export function penUndo(s: PenState): PenState {
  if (s.closed) return { ...s, closed: false };
  return { ...s, nodes: s.nodes.slice(0, -1) };
}

/** Can this draft become a layer? (Two nodes make a line.) */
export const penFinishable = (s: PenState): boolean => s.nodes.length >= 2;

/**
 * The curve the next segment will take if a node is placed at `p`: the rubber band shown while the pointer moves.
 * It leaves the last node by its outgoing handle, if it has one.
 */
export function penRubberBand(s: PenState, p: Vec): PathNode[] {
  const last = s.nodes[s.nodes.length - 1];
  return last ? [last, { x: p.x, y: p.y }] : [];
}
