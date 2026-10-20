/**
 * ============================================================================
 * PATHS AS LAYERS (ROADMAP Phase 39)
 * ============================================================================
 * A drawn path is an `svgPath` layer. Its frame is the path's bounding box (a little padding for the stroke) and
 * its geometry lives in a 200 x 200 space that stretches to the frame (what `SvgPath` draws), so resizing the layer
 * resizes the drawing. Two properties hold it: `svg.path` (the path data, what is drawn) and `svg.nodes` (the nodes
 * with their handles, times and pressures, what a vector editor and a draw-to-animate replay read). Pure functions.
 * ============================================================================
 */

import { nodesToPathData, sampleNodes, type PathNode } from "./pathFit";

/** The side of the square space a path's coordinates are in. */
export const PATH_SPACE = 200;
export const MAX_PATH_NODES = 5_000;
export const MAX_NODES_JSON = 1_000_000;

export interface PathFrame {
  /** Where the frame's top-left is, in the same space as the nodes given (canvas space). */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BuiltPath {
  frame: PathFrame;
  /** The nodes in the layer's own 200 x 200 space. */
  nodes: PathNode[];
  /** Path data in that space. */
  d: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const MIN_SIDE = 4;

/** The frame a path needs: its bounds plus half the stroke and a pixel, never thinner than 4 px (a horizontal line has no height of its own). */
export function pathFrame(nodes: readonly PathNode[], closed: boolean, strokeWidth: number): PathFrame {
  const pts = sampleNodes(nodes, closed, 24);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: MIN_SIDE, height: MIN_SIDE };
  const pad = Math.max(0, strokeWidth) / 2 + 1;
  const width = Math.max(MIN_SIDE, maxX - minX + 2 * pad);
  const height = Math.max(MIN_SIDE, maxY - minY + 2 * pad);
  // a path thinner than the minimum stays centred in its frame
  return { x: r2(minX - pad - (width - (maxX - minX + 2 * pad)) / 2), y: r2(minY - pad - (height - (maxY - minY + 2 * pad)) / 2), width: r2(width), height: r2(height) };
}

/** Puts canvas-space nodes into a frame's 200 x 200 space. */
export function toPathSpace(nodes: readonly PathNode[], frame: PathFrame): PathNode[] {
  const sx = PATH_SPACE / frame.width;
  const sy = PATH_SPACE / frame.height;
  const map = (v: { x: number; y: number }) => ({ x: r2((v.x - frame.x) * sx), y: r2((v.y - frame.y) * sy) });
  return nodes.map((n) => ({ ...n, ...map(n), ...(n.hin ? { hin: map(n.hin) } : {}), ...(n.hout ? { hout: map(n.hout) } : {}) }));
}

/** And back: a node in a layer's space as a point in the canvas, given the frame it sits in. */
export function fromPathSpace(nodes: readonly PathNode[], frame: PathFrame): PathNode[] {
  const sx = frame.width / PATH_SPACE;
  const sy = frame.height / PATH_SPACE;
  const map = (v: { x: number; y: number }) => ({ x: v.x * sx + frame.x, y: v.y * sy + frame.y });
  return nodes.map((n) => ({ ...n, ...map(n), ...(n.hin ? { hin: map(n.hin) } : {}), ...(n.hout ? { hout: map(n.hout) } : {}) }));
}

export function buildPath(nodes: readonly PathNode[], closed: boolean, strokeWidth: number): BuiltPath {
  const frame = pathFrame(nodes, closed, strokeWidth);
  const unit = toPathSpace(nodes, frame);
  return { frame, nodes: unit, d: nodesToPathData(unit, closed) };
}

// --- `svg.nodes` JSON ----------------------------------------------------------

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pair = (v: unknown): { x: number; y: number } | undefined => {
  if (!Array.isArray(v) || v.length !== 2) return undefined;
  const x = num(v[0]);
  const y = num(v[1]);
  return x === null || y === null ? undefined : { x, y };
};

/** The JSON stored in `svg.nodes`: compact arrays for points, times in whole milliseconds. */
export function serializePathNodes(nodes: readonly PathNode[], closed: boolean): string {
  return JSON.stringify({
    closed,
    nodes: nodes.slice(0, MAX_PATH_NODES).map((n) => [
      r2(n.x), r2(n.y), n.hin ? [r2(n.hin.x), r2(n.hin.y)] : 0, n.hout ? [r2(n.hout.x), r2(n.hout.y)] : 0, n.t === undefined ? -1 : Math.round(n.t), n.p === undefined ? -1 : r2(n.p),
    ]),
  });
}

/** Reads `svg.nodes`. Anything malformed, over the limits or not numbers gives null (the layer still has its path data). */
export function parsePathNodes(json: unknown): { nodes: PathNode[]; closed: boolean } | null {
  if (typeof json !== "string" || json === "" || json.length > MAX_NODES_JSON) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const o = raw as { closed?: unknown; nodes?: unknown } | null;
  if (!o || !Array.isArray(o.nodes) || o.nodes.length > MAX_PATH_NODES) return null;
  const nodes: PathNode[] = [];
  for (const row of o.nodes) {
    if (!Array.isArray(row) || row.length < 2) return null;
    const x = num(row[0]);
    const y = num(row[1]);
    if (x === null || y === null) return null;
    const hin = pair(row[2]);
    const hout = pair(row[3]);
    const t = num(row[4]);
    const p = num(row[5]);
    // -1 (or anything missing) means the node has no time or pressure
    nodes.push({ x, y, ...(hin ? { hin } : {}), ...(hout ? { hout } : {}), ...(t !== null && t >= 0 ? { t } : {}), ...(p !== null && p >= 0 ? { p } : {}) });
  }
  return { nodes, closed: o.closed === true };
}
