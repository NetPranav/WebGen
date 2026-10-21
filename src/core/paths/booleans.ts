/**
 * ============================================================================
 * BOOLEAN OPERATIONS ON PATHS (ROADMAP Phase 40)
 * ============================================================================
 * Union, subtract, intersect and exclude on closed shapes. Curves are flattened to short straight pieces (fine
 * enough to be within a fraction of a pixel), the polygons are combined by the `polygon-clipping` library, and the
 * answer comes back as rings: the outlines and the holes. Pure functions; the layer-level work is in
 * `core/editing/vectorOps.ts`.
 * ============================================================================
 */

import polygonClipping from "polygon-clipping";
import type { PathNode, Vec } from "./pathFit";
import { sampleNodes } from "./pathFit";

export type BooleanOp = "union" | "subtract" | "intersect" | "exclude";
export const BOOLEAN_OPS: readonly BooleanOp[] = ["union", "subtract", "intersect", "exclude"];

/** One outline or hole: points in order, not repeating the first at the end. */
export type Ring = Vec[];

/** A shape: the rings of one polygon (the first its outline; with `evenOdd` several rings alternate in and out). */
export interface ShapeRings {
  rings: Ring[];
}

/** How many pieces a curved segment is cut into. A 200 px circle's error at 24 pieces per quarter is under 0.02 px. */
const CURVE_STEPS = 24;

/** The flattened outline of a closed path: a straight segment stays one piece, a curve is cut into several. */
export function flatten(nodes: readonly PathNode[], closed = true): Ring {
  const count = closed && nodes.length > 2 ? nodes.length : nodes.length - 1;
  const out: Ring = [];
  for (let i = 0; i < count; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    if (!a.hout && !b.hin) out.push({ x: a.x, y: a.y });
    else for (const p of sampleNodes([a, b], false, CURVE_STEPS).slice(0, -1)) out.push(p);
  }
  if (!(closed && nodes.length > 2) && nodes.length > 0) out.push({ x: nodes[nodes.length - 1].x, y: nodes[nodes.length - 1].y });
  return out;
}

const toGeom = (ring: Ring): [number, number][] => {
  const pts = ring.map((p) => [p.x, p.y] as [number, number]);
  pts.push([ring[0].x, ring[0].y]);
  return pts;
};

type Multi = [number, number][][][];

/** The area of a ring (positive whichever way it turns). */
export function ringArea(ring: readonly Vec[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** Area of a result: outlines minus holes. */
export function resultArea(result: readonly Ring[][]): number {
  return result.reduce((sum, poly) => sum + poly.reduce((s, ring, i) => s + (i === 0 ? 1 : -1) * ringArea(ring), 0), 0);
}

/** A layer's subpaths as one geometry: a single ring is a polygon; several are combined by exclusive or (even-odd). */
function shapeGeom(shape: ShapeRings): Multi {
  const rings = shape.rings.filter((r) => r.length >= 3);
  if (rings.length === 0) return [];
  if (rings.length === 1) return [[toGeom(rings[0])]];
  const [first, ...rest] = rings.map((r) => [toGeom(r)] as [number, number][][]);
  return polygonClipping.xor(first, ...rest) as Multi;
}

/**
 * Combines the shapes. For `subtract` the first is the one cut into by all the rest (and the bottom-most in the
 * usual order). Returns polygons, each an outline followed by its holes; empty when nothing is left.
 */
export function booleanShapes(op: BooleanOp, shapes: readonly ShapeRings[]): Ring[][] {
  const geoms = shapes.map(shapeGeom).filter((g) => g.length > 0);
  if (geoms.length === 0) return [];
  if (op === "subtract" && shapeGeom(shapes[0]).length === 0) return [];
  if (geoms.length === 1) return fromMulti(op === "intersect" && shapes.length > 1 ? [] : geoms[0]);
  const [a, ...rest] = geoms;
  let out: Multi;
  switch (op) {
    case "union":
      out = polygonClipping.union(a, ...rest) as Multi;
      break;
    case "subtract":
      out = polygonClipping.difference(a, ...rest) as Multi;
      break;
    case "intersect":
      out = polygonClipping.intersection(a, ...rest) as Multi;
      break;
    case "exclude":
      out = polygonClipping.xor(a, ...rest) as Multi;
      break;
  }
  return fromMulti(out);
}

function fromMulti(m: Multi): Ring[][] {
  return m.map((poly) => poly.map((ring) => ring.slice(0, -1).map(([x, y]) => ({ x, y }))));
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Path data for a result: one `M … Z` for each outline and hole (draw it with the even-odd rule). */
export function ringsToPathData(result: readonly Ring[][]): string {
  return result
    .flat()
    .map((ring) => `M${ring.map((p) => `${r2(p.x)} ${r2(p.y)}`).join("L")}Z`)
    .join("");
}
