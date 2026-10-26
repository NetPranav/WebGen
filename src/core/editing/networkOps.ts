/**
 * Vector networks on layers (FigCraft port F4): a path layer (`svgPath`) can carry a vector network (`svg.network`,
 * in the same 200 × 200 space as its path data), which then draws its fill by regions and its stroke by segments.
 * These are the writers the commands wrap: make a network from a layer's path, fill or unfill the closed area under a
 * point (the paint bucket), and give one point a corner radius, handle mirroring, cap or join of its own. A path edit
 * made with the Phase 40 editor writes plain path data again and drops the network (`vectorOps.ts`).
 */

import type { Layer } from "../document/schema";
import { getDocument } from "../store/documentState";
import { pathDataToBez } from "../paths/bezBridge";
import { fromPath, paint, parseNetwork, serializeNetwork, strokePath, type HandleMirroring, type VectorNetwork } from "../paths/vectorNetwork";
import type { StrokeCap, StrokeJoin } from "../paths/strokes";
import { setLayerProps } from "./editOps";

const layers = () => getDocument().layers;
const isPath = (l: Layer | undefined): l is Layer => !!l && l.archetype === "svgPath";

/** A path layer's network: its stored one, else one built from its path data (closed subpaths filled by its fill rule). */
export function networkOf(layer: Layer): VectorNetwork | null {
  const stored = parseNetwork(layer.properties["svg.network"]);
  if (stored) return stored;
  const path = pathDataToBez(typeof layer.properties["svg.path"] === "string" ? layer.properties["svg.path"] : "");
  if (!path) return null;
  const net = fromPath(path);
  if (layer.properties["svg.fillRule"] === "evenodd") for (const r of net.regions) r.winding = "evenodd";
  return net;
}

/** Stores a network on a path layer, keeping its path data in step (what anything that doesn't read networks draws). */
function writeNetwork(id: string, net: VectorNetwork, label: string, extra: Record<string, string> = {}): number {
  return setLayerProps([id], { "svg.network": serializeNetwork(net), "svg.path": strokePath(net).toSvg(3), "svg.nodes": "", ...extra }, label);
}

/** Gives path layers a vector network made from their path data. Returns how many changed. */
export function makeNetwork(ids: readonly string[]): number {
  let changed = 0;
  for (const id of ids) {
    const l = layers()[id];
    if (!isPath(l) || parseNetwork(l.properties["svg.network"])) continue;
    const net = networkOf(l);
    if (net) changed += writeNetwork(id, net, "Make vector network");
  }
  return changed;
}

/** A visible fill for a layer that has none, so a face the bucket fills shows (Figma's default shape fill). */
const NO_FILL = new Set(["", "none", "transparent"]);

/**
 * The paint bucket: fills the closed area of path layer `id` under `point` (the layer's 200 × 200 space), or unfills
 * it when filled; `want` forces the result (a drag keeps doing what its first click did). Returns the new state, or
 * null when the point isn't inside a closed area.
 */
export function paintBucket(id: string, point: { x: number; y: number }, want?: boolean): boolean | null {
  const l = layers()[id];
  if (!isPath(l)) return null;
  const net = networkOf(l);
  if (!net) return null;
  const r = paint(net, point, want);
  if (!r) return null;
  const fill = typeof l.properties["svg.fill"] === "string" ? l.properties["svg.fill"] : "none";
  writeNetwork(id, r.network, r.filled ? "Fill area" : "Unfill area", r.filled && NO_FILL.has(fill.trim().toLowerCase()) && !l.properties["paint.fills"] ? { "svg.fill": "#d9d9d9" } : {});
  return r.filled;
}

export interface NetworkPointPatch {
  radius?: number;
  mirror?: HandleMirroring | null;
  cap?: StrokeCap | null;
  join?: StrokeJoin | null;
}

/** Sets one point's own corner radius, handle mirroring, cap or join (null clears it back to the layer's). */
export function setNetworkPoint(id: string, index: number, patch: NetworkPointPatch): boolean {
  const l = layers()[id];
  if (!isPath(l)) return false;
  const net = networkOf(l);
  const v = net?.vertices[index];
  if (!net || !v) return false;
  if (patch.radius !== undefined) {
    const r = Math.max(0, Math.min(1e6, Number.isFinite(patch.radius) ? patch.radius : 0));
    if (r > 0) v.radius = r;
    else delete v.radius;
  }
  for (const key of ["mirror", "cap", "join"] as const) {
    const value = patch[key];
    if (value === undefined) continue;
    if (value === null) delete v[key];
    else (v as unknown as Record<string, unknown>)[key] = value;
  }
  return writeNetwork(id, net, "Edit point") > 0;
}
