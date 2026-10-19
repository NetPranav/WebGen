/**
 * ROADMAP Phase 19: the stage's render plan as an external store, so a layer re-renders only when
 * *its own* list of drawn children changes. `selectRenderable` (Phase 17) still decides what may be
 * drawn (limits, cycles, hidden layers); this keeps the answer, hands out the same child-id array
 * for a layer whose children did not change, and tells subscribers only when something did.
 */
import type { Layer } from "../document/schema";
import { selectRenderable, type RenderPlan } from "./RenderLayer";

type Listener = () => void;

export interface PlanStore {
  /** The ids drawn inside `layerId`, or undefined when the layer is not drawn at all. The same array is returned while it is unchanged. */
  get: (layerId: string) => readonly string[] | undefined;
  roots: () => readonly string[];
  subscribe: (listener: Listener) => () => void;
  /** Recomputes the plan if the structure (ids, children, visibility, roots) changed. Returns whether anything changed. */
  refresh: (layers: Record<string, Layer>, rootIds: readonly string[]) => boolean;
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** A cheap fingerprint of everything the plan depends on, so a property edit skips recomputing it. */
function structureKey(layers: Record<string, Layer>, rootIds: readonly string[]): string {
  let key = `${rootIds.join(",")}|`;
  for (const id in layers) {
    const layer = layers[id];
    key += `${id}:${layer.visible === false ? "h" : "v"}:${layer.children.join(",")};`;
  }
  return key;
}

export function createPlanStore(): PlanStore {
  let plan: RenderPlan = new Map();
  let rootList: readonly string[] = [];
  let key = "";
  const listeners = new Set<Listener>();

  return {
    get: (layerId) => plan.get(layerId),
    roots: () => rootList,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh: (layers, rootIds) => {
      const nextKey = structureKey(layers, rootIds);
      if (nextKey === key) return false;
      key = nextKey;

      const next = selectRenderable(layers, rootIds);
      // Keep the previous array for any layer whose children are unchanged: its subscriber sees the same snapshot and does not re-render.
      const merged = new Map<string, readonly string[]>();
      let changed = next.size !== plan.size || !sameList(rootIds, rootList);
      for (const [id, children] of next) {
        const before = plan.get(id);
        if (before && sameList(before, children)) merged.set(id, before);
        else {
          merged.set(id, children);
          changed = true;
        }
      }
      for (const id of plan.keys()) if (!next.has(id)) changed = true;
      plan = merged;
      rootList = rootIds.slice();
      if (changed) for (const listener of listeners) listener();
      return changed;
    },
  };
}
