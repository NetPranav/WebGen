import React, { useMemo } from "react";
import type { Layer } from "../document/schema";
import { MAX_RENDERED_LAYERS, MAX_TREE_DEPTH } from "./limits";
import { RENDER_DEFINITIONS } from "./definitions";
import { resolveProps } from "./resolve";
import type { RenderContext } from "./types";

/**
 * What may be drawn: each renderable layer id mapped to the ids of its renderable children, in paint
 * order. Visible layers reachable from `rootIds` only, stopping at `MAX_TREE_DEPTH` levels and
 * `MAX_RENDERED_LAYERS` layers, and with any edge that would close a cycle cut. Pure, so the limits are
 * decided once, up front, and rendering itself needs no counters and cannot recurse without end.
 */
export type RenderPlan = ReadonlyMap<string, readonly string[]>;

/**
 * With any layer soloed (Phase 61), only soloed layers are drawn, with what contains them and what they contain.
 * Returns null when nothing is soloed (everything draws).
 */
function soloKeep(layers: Record<string, Layer>): Set<string> | null {
  let keep: Set<string> | null = null;
  for (const id in layers) {
    if (layers[id].solo !== true) continue;
    keep ??= new Set();
    for (let cur: Layer | undefined = layers[id], guard = 0; cur && guard++ < MAX_TREE_DEPTH + 1; cur = cur.parentId ? layers[cur.parentId] : undefined) keep.add(cur.id);
    const down = [id];
    for (let next = down.pop(); next !== undefined; next = down.pop()) {
      keep.add(next);
      for (const child of layers[next]?.children ?? []) if (!keep.has(child)) down.push(child);
    }
  }
  return keep;
}

export function selectRenderable(layers: Record<string, Layer>, rootIds: readonly string[]): RenderPlan {
  const plan = new Map<string, string[]>();
  const keep = soloKeep(layers);
  const visit = (id: string, depth: number, path: ReadonlySet<string>): boolean => {
    const layer = layers[id];
    if (!layer || layer.visible === false || (keep && !keep.has(id))) return false;
    if (depth > MAX_TREE_DEPTH || path.has(id) || plan.has(id) || plan.size >= MAX_RENDERED_LAYERS) return false;
    const kept: string[] = [];
    plan.set(id, kept);
    const below = new Set(path).add(id);
    for (const childId of layer.children) if (visit(childId, depth + 1, below)) kept.push(childId);
    return true;
  };
  for (const id of rootIds) visit(id, 0, new Set());
  return plan;
}

interface RenderLayerProps {
  layerId: string;
  layers: Record<string, Layer>;
  ctx?: RenderContext;
  /** From `RenderTree`; when omitted the layer and its descendants are planned here. */
  plan?: RenderPlan;
}

/** Draws one layer and its children through the archetype's render definition. */
export const RenderLayer: React.FC<RenderLayerProps> = ({ layerId, layers, ctx = {}, plan }) => {
  const own = useMemo(() => (plan ? null : selectRenderable(layers, [layerId])), [plan, layers, layerId]);
  const permitted = plan ?? own!;
  const layer = layers[layerId];
  const childIds = permitted.get(layerId);
  if (!layer || !childIds) return null;

  const resolved = resolveProps(layer);
  const Definition = RENDER_DEFINITIONS[layer.archetype];
  const isFlexContainer = layer.archetype === "container" || layer.archetype === "form";
  const childDirection = isFlexContainer && resolved.str("layout.flexDirection", "column") === "row" ? "row" : "column";
  const childCtx: RenderContext = { ...ctx, parentDirection: childDirection };

  return (
    <Definition layer={layer} resolved={resolved} ctx={ctx}>
      {childIds.map((childId) => (
        <RenderLayer key={childId} layerId={childId} layers={layers} ctx={childCtx} plan={permitted} />
      ))}
    </Definition>
  );
};

/** Draws every top-level layer of a document, within one layer budget. */
export const RenderTree: React.FC<{ layers: Record<string, Layer>; rootIds?: string[]; ctx?: RenderContext }> = ({ layers, rootIds, ctx }) => {
  const roots = useMemo(() => rootIds ?? Object.values(layers).filter((l) => l.parentId === null).map((l) => l.id), [layers, rootIds]);
  const plan = useMemo(() => selectRenderable(layers, roots), [layers, roots]);
  return (
    <>
      {roots.map((id) => (
        <RenderLayer key={id} layerId={id} layers={layers} ctx={ctx} plan={plan} />
      ))}
    </>
  );
};
