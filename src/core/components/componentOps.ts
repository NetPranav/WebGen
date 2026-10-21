/**
 * Component operations (ROADMAP Phase 46): make a component from a layer, insert instances, reset an instance's
 * overrides, swap it for another component, detach it, go to the main component, rename and delete. Each is one undo
 * step; the instances follow their main in the same step as any edit to it (see `instances.ts`).
 */

import { frameIdOf, listFrames } from "../frames/frames";
import { groupLayers, transaction } from "../editing/editOps";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { createId } from "../ids";
import { detachComponent, detachInstance, hasNestedComponent, instanceRootOf, instantiate, subtreeIds, syncInstanceLayer } from "./instances";

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const select = (ids: string[]) => useSelectionStore.getState().selectMultiple(ids, "element");

/**
 * Makes the selected container the main component. Anything else (several layers, a shape) is first wrapped in a
 * frame. A layer that already holds an instance or another component is refused: components don't nest in this version.
 * Returns the component's id, or null.
 */
export function createComponent(ids: readonly string[], name?: string): string | null {
  const layers = getDocument().layers;
  const roots = ids.filter((id) => layers[id] && layers[id].locked !== true);
  if (roots.length === 0) return null;
  if (roots.some((id) => hasNestedComponent(layers, id) || layers[id].instance || layers[id].componentMain)) return null;
  let id: string | null = null;
  transaction("Create component", () => {
    let mainId: string | null;
    if (roots.length === 1 && layers[roots[0]].archetype === "container") mainId = roots[0];
    else mainId = roots.every((r) => layers[r].parentId !== null) ? groupLayers(roots, "frame") : null;
    if (!mainId) return;
    const main = getDocument().layers[mainId];
    const cid = createId("cmp");
    documentCommands.mutate("Create component", (d) => {
      (d.designComponents ??= {})[cid] = { id: cid, name: (name ?? main.name ?? "Component").slice(0, 120), mainId };
      d.layers[mainId!].componentMain = cid;
    });
    select([mainId]);
    id = cid;
  });
  return id;
}

/**
 * Puts an instance of a component in a frame (the one being worked in, or `parentId`), at the middle of it or at `at`
 * (canvas space inside the parent). Returns the instance's id, selected. Not inside the main component itself.
 */
export function insertInstance(componentId: string, options: { parentId?: string | null; at?: { x: number; y: number } } = {}): string | null {
  const doc = getDocument();
  const comp = doc.designComponents?.[componentId];
  const main = comp ? doc.layers[comp.mainId] : undefined;
  if (!comp || !main) return null;
  const frames = listFrames(doc.layers);
  const activeId = useCanvasViewStore.getState().activeFrameId;
  let parentId: string | null = options.parentId ?? (frames.find((f) => f.id === activeId) ?? frames[0])?.id ?? null;
  if (!parentId || !doc.layers[parentId]) return null;
  // not into the main itself (a component can't contain its own instance): into the frame the main is in, or another frame
  if (subtreeIds(doc.layers, comp.mainId).includes(parentId)) {
    const outer = frameIdOf(doc.layers, comp.mainId);
    parentId = outer && outer !== comp.mainId ? outer : (frames.find((f) => f.id !== comp.mainId)?.id ?? null);
  }
  if (!parentId || doc.layers[parentId].instance) return null;
  const target: string = parentId;
  const w = num(main.properties["frame.width"], 100);
  const h = num(main.properties["frame.height"], 100);
  const parent = doc.layers[target];
  const pw = num(parent.properties["frame.width"], 800);
  const ph = num(parent.properties["frame.height"], 600);
  const x = options.at?.x ?? Math.max(0, Math.round((pw - w) / 2));
  const y = options.at?.y ?? Math.max(0, Math.round((ph - h) / 2));
  let out: string | null = null;
  documentCommands.mutate("Insert instance", (d) => {
    const id = instantiate(d, componentId, comp.mainId, target, undefined, true);
    const root = d.layers[id];
    root.properties.positioning = "absolute";
    root.properties["frame.x"] = x;
    root.properties["frame.y"] = y;
    out = id;
  });
  if (out) select([out]);
  return out;
}

/** The instance roots the given layers belong to. */
function rootsOf(ids: readonly string[]): string[] {
  const layers = getDocument().layers;
  const out = new Set<string>();
  for (const id of ids) {
    const r = instanceRootOf(layers, id);
    if (r) out.add(r);
  }
  return [...out];
}

/**
 * Resets overrides: the selected layers (all of an instance when its root is selected) go back to what the main says,
 * for `keys` or for everything they changed. Returns how many layers had overrides.
 */
export function resetOverrides(ids: readonly string[], keys?: readonly string[]): number {
  const layers = getDocument().layers;
  const targets = new Set<string>();
  for (const id of ids) {
    const l = layers[id];
    if (!l?.instance) continue;
    if (l.instance.root) for (const x of subtreeIds(layers, id)) targets.add(x);
    else targets.add(id);
  }
  const touched = [...targets].filter((id) => (layers[id].instance?.overridden?.length ?? 0) > 0);
  if (touched.length === 0) return 0;
  documentCommands.mutate("Reset overrides", (d) => {
    for (const id of touched) {
      const meta = d.layers[id].instance!;
      if (keys) {
        meta.overridden = (meta.overridden ?? []).filter((k) => !keys.includes(k));
        if (meta.overridden.length === 0) delete meta.overridden;
      } else delete meta.overridden;
    }
    for (const r of new Set(touched.map((id) => instanceRootOf(d.layers, id)))) if (r) syncInstanceLayer(d, r);
  });
  return touched.length;
}

/** Detaches instances: they become plain layers and no longer follow the component. Returns how many. */
export function detachInstances(ids: readonly string[]): number {
  const roots = rootsOf(ids);
  if (roots.length === 0) return 0;
  documentCommands.mutate("Detach instance", (d) => roots.forEach((r) => detachInstance(d, r)));
  return roots.length;
}

/** Swaps an instance for an instance of another component, in the same place with the same position and size. */
export function swapInstance(id: string, componentId: string): string | null {
  const doc = getDocument();
  const root = instanceRootOf(doc.layers, id);
  const old = root ? doc.layers[root] : undefined;
  const comp = doc.designComponents?.[componentId];
  if (!old || !comp || !doc.layers[comp.mainId] || old.instance!.component === componentId || old.parentId === null) return null;
  let out: string | null = null;
  documentCommands.mutate("Swap instance", (d) => {
    const parent = d.layers[old.parentId!];
    const index = parent.children.indexOf(old.id);
    const placed = {
      positioning: old.properties.positioning,
      "frame.x": old.properties["frame.x"],
      "frame.y": old.properties["frame.y"],
      "frame.rotation": old.properties["frame.rotation"],
    };
    const nid = instantiate(d, componentId, comp.mainId, old.parentId, index, true);
    for (const [k, v] of Object.entries(placed)) if (v !== undefined) d.layers[nid].properties[k] = v;
    for (const x of subtreeIds(d.layers, old.id)) delete d.layers[x];
    parent.children = parent.children.filter((c) => c !== old.id);
    out = nid;
  });
  if (out) select([out]);
  return out;
}

/** Selects the main component of an instance (or the layer itself if it is a main), and makes its frame the one being worked in. */
export function goToMain(id: string): string | null {
  const doc = getDocument();
  const layer = doc.layers[id];
  const componentId = layer?.componentMain ?? layer?.instance?.component;
  const mainId = componentId ? doc.designComponents?.[componentId]?.mainId : undefined;
  if (!mainId || !doc.layers[mainId]) return null;
  select([mainId]);
  const frame = frameIdOf(doc.layers, mainId);
  if (frame) useCanvasViewStore.getState().setActiveFrame(frame);
  return mainId;
}

export function renameComponent(componentId: string, name: string): boolean {
  const comp = getDocument().designComponents?.[componentId];
  const trimmed = name.trim().slice(0, 120);
  if (!comp || !trimmed) return false;
  documentCommands.mutate("Rename component", (d) => {
    d.designComponents![componentId].name = trimmed;
    if (d.layers[comp.mainId]) d.layers[comp.mainId].name = trimmed;
  });
  return true;
}

/** Deletes the component: its instances become plain layers, the main stays as an ordinary frame. */
export function deleteComponent(componentId: string): boolean {
  const comp = getDocument().designComponents?.[componentId];
  if (!comp) return false;
  documentCommands.mutate("Delete component", (d) => {
    detachComponent(d, componentId);
    if (d.layers[comp.mainId]) delete d.layers[comp.mainId].componentMain;
    delete d.designComponents![componentId];
    if (Object.keys(d.designComponents!).length === 0) delete d.designComponents;
  });
  return true;
}

/** How many instances a component has. */
export function instanceCount(componentId: string): number {
  return Object.values(getDocument().layers).filter((l) => l.instance?.component === componentId && l.instance.root).length;
}
