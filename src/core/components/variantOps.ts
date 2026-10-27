/**
 * Variants, component properties and slots (ROADMAP Phase 47). A component can be a set of variants: properties such
 * as Size (S, M, L) and Tone, with one main layer for each combination, side by side. An instance picks a value for
 * each property and shows that variant, keeping its overrides when it switches (layers are matched by their names).
 * A component can expose properties (a text, a picture, a layer's visibility) that every instance sets from the
 * inspector, and mark a layer as a slot where an instance keeps layers of its own.
 */

import type { PropValue } from "../document/registry";
import type { Layer } from "../document/schema";
import { moveLayers } from "../layers/reparent";
import { createId } from "../ids";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { cloneSubtree, instanceRootOf, namePathOf, remapInstance, resolveNamePath, subtreeIds } from "./instances";
import { innerComponentOf, swapInPlace } from "./componentExtras";

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export const MAX_VARIANTS = 64;

/** The combinations of the given properties' values, in order. */
export function combinations(props: readonly { name: string; values: readonly string[] }[]): Record<string, string>[] {
  let out: Record<string, string>[] = [{}];
  for (const p of props) out = out.flatMap((o) => p.values.map((v) => ({ ...o, [p.name]: v })));
  return out;
}

/** The variant of a component that has exactly these values, or undefined. */
export function findVariant(comp: { variants?: { mainId: string; values: Record<string, string> }[] }, values: Record<string, string>) {
  return comp.variants?.find((v) => Object.entries(values).every(([k, x]) => v.values[k] === x));
}

/**
 * Adds a variant property (Size: S, M, L) to a component. The first value belongs to the layers the component already
 * has; every other value (and, with several properties, every combination) is a copy of a main, placed beside the
 * others. Existing instances take the first value. Returns false when the property exists, a value repeats, or there
 * would be more than 64 variants.
 */
export function addVariantProperty(componentId: string, name: string, values: readonly string[]): boolean {
  const doc = getDocument();
  const comp = doc.designComponents?.[componentId];
  const n = name.trim().slice(0, 60);
  const vals = [...new Set(values.map((v) => v.trim().slice(0, 60)).filter(Boolean))];
  if (!comp || !n || vals.length === 0 || comp.variantProps?.some((p) => p.name === n)) return false;
  const existing = comp.variants?.length ?? 1;
  if (existing * vals.length > MAX_VARIANTS) return false;
  documentCommands.mutate("Add variant property", (d) => {
    const c = d.designComponents![componentId];
    c.variantProps = [...(c.variantProps ?? []), { name: n, values: vals }];
    const current = c.variants && c.variants.length > 0 ? c.variants : [{ mainId: c.mainId, values: {} as Record<string, string> }];
    const next: { mainId: string; values: Record<string, string> }[] = [];
    for (const v of current) {
      vals.forEach((value, i) => {
        if (i === 0) {
          next.push({ mainId: v.mainId, values: { ...v.values, [n]: value } });
          return;
        }
        const src = d.layers[v.mainId];
        const parent = src.parentId ? d.layers[src.parentId] : null;
        const width = num(src.properties["frame.width"], 100);
        const copy = cloneSubtree(d, v.mainId, src.parentId, parent ? parent.children.indexOf(v.mainId) + 1 : undefined);
        const lay = d.layers[copy];
        lay.componentMain = componentId;
        lay.properties.positioning = "absolute";
        lay.properties["frame.x"] = num(src.properties["frame.x"]) + (width + 24) * i;
        lay.properties["frame.y"] = num(src.properties["frame.y"]);
        const values2 = { ...v.values, [n]: value };
        lay.name = `${c.name}, ${Object.entries(values2).map(([k, x]) => `${k}=${x}`).join(", ")}`;
        next.push({ mainId: copy, values: values2 });
      });
    }
    // the first variant's name says what it is, too
    for (const v of next) if (!d.layers[v.mainId].name.includes("=")) d.layers[v.mainId].name = `${c.name}, ${Object.entries(v.values).map(([k, x]) => `${k}=${x}`).join(", ")}`;
    c.variants = next;
    c.mainId = next[0].mainId;
    for (const l of Object.values(d.layers)) if (l.instance?.root && l.instance.component === componentId) l.instance.variant = { ...(l.instance.variant ?? {}), [n]: vals[0] };
  });
  return true;
}

/** Chooses variant values for instances (any layer of an instance works): each switches to the matching variant, keeping its overrides. Returns how many switched. */
export function setVariant(ids: readonly string[], values: Record<string, string>): number {
  const doc = getDocument();
  const roots = new Set<string>();
  for (const id of ids) {
    const r = instanceRootOf(doc.layers, id);
    if (r) roots.add(r);
  }
  const plan: { root: string; main: string; variant: Record<string, string> }[] = [];
  for (const r of roots) {
    const meta = doc.layers[r].instance!;
    const comp = doc.designComponents?.[meta.component];
    if (!comp?.variants) continue;
    const want = { ...(meta.variant ?? {}), ...values };
    const hit = findVariant(comp, want);
    if (hit && (hit.mainId !== meta.source || JSON.stringify(want) !== JSON.stringify(meta.variant))) plan.push({ root: r, main: hit.mainId, variant: want });
  }
  if (plan.length === 0) return 0;
  documentCommands.mutate("Change variant", (d) => {
    for (const p of plan) {
      remapInstance(d, p.root, p.main);
      d.layers[p.root].instance!.variant = p.variant;
    }
  });
  return plan.length;
}

// --- component properties ----------------------------------------------------------

/** `instance` (FigCraft port F9): an instance-swap property, which component a nested instance shows. */
export type PropertyKind = "text" | "image" | "boolean" | "instance";
const PROP_OF: Record<PropertyKind, string> = { text: "content.text", image: "media.src", boolean: "visible", instance: "instance.swap" };

/** The main layer that holds `layerId` (it or an ancestor with `componentMain`), or null. */
function mainOfLayer(layers: Record<string, Layer>, layerId: string): string | null {
  let cur: Layer | undefined = layers[layerId];
  let guard = 0;
  while (cur && guard++ < 10_000) {
    if (cur.componentMain) return cur.id;
    cur = cur.parentId ? layers[cur.parentId] : undefined;
  }
  return null;
}

/** Exposes a property of a layer inside a main component: every instance gets a field for it. Returns the property's id. */
export function exposeProperty(layerId: string, kind: PropertyKind, name?: string): string | null {
  const doc = getDocument();
  const mainId = mainOfLayer(doc.layers, layerId);
  const main = mainId ? doc.layers[mainId] : undefined;
  const layer = doc.layers[layerId];
  const comp = main?.componentMain ? doc.designComponents?.[main.componentMain] : undefined;
  if (!main || !comp || !layer) return null;
  const path = namePathOf(doc.layers, main.id, layerId);
  if (!path) return null;
  if (kind === "text" && layer.archetype !== "text") return null;
  if (kind === "image" && layer.archetype !== "image") return null;
  // an instance-swap property is on an instance nested in the main
  if (kind === "instance" && !(layer.instance?.root && layer.instance.component !== comp.id)) return null;
  const label = (name ?? (path.length > 0 ? path[path.length - 1].replace(/#\d+$/, "") : "Root")).trim().slice(0, 60);
  if (!label || comp.properties?.some((p) => p.name === label)) return null;
  const id = createId("prp");
  documentCommands.mutate("Expose property", (d) => {
    const c = d.designComponents![comp.id];
    c.properties = [...(c.properties ?? []), { id, name: label, type: kind, path, prop: PROP_OF[kind] }];
  });
  return id;
}

export function removeProperty(componentId: string, propertyId: string): boolean {
  const comp = getDocument().designComponents?.[componentId];
  if (!comp?.properties?.some((p) => p.id === propertyId)) return false;
  documentCommands.mutate("Remove property", (d) => {
    const c = d.designComponents![componentId];
    c.properties = c.properties!.filter((p) => p.id !== propertyId);
    if (c.properties.length === 0) delete c.properties;
  });
  return true;
}

/** The instance layer a component property sets. */
function propertyLayer(layers: Record<string, Layer>, rootId: string, path: readonly string[]): Layer | undefined {
  return resolveNamePath(layers, rootId, path);
}

/** The value a property has on an instance (what the layer shows now). */
export function readProperty(instanceId: string, propertyId: string): string | boolean | undefined {
  const doc = getDocument();
  const root = instanceRootOf(doc.layers, instanceId);
  const meta = root ? doc.layers[root].instance : undefined;
  const p = meta ? doc.designComponents?.[meta.component]?.properties?.find((x) => x.id === propertyId) : undefined;
  const layer = root && p ? propertyLayer(doc.layers, root, p.path) : undefined;
  if (!layer || !p) return undefined;
  if (p.type === "boolean") return layer.visible !== false;
  if (p.type === "instance") return innerComponentOf(doc, layer.id) ?? undefined;
  const v = layer.properties[p.prop];
  return typeof v === "string" ? v : undefined;
}

/** Sets a component property on an instance: the layer it points at changes, as that instance's own override. */
export function setProperty(instanceId: string, propertyId: string, value: string | boolean): boolean {
  const doc = getDocument();
  const root = instanceRootOf(doc.layers, instanceId);
  const meta = root ? doc.layers[root].instance : undefined;
  const p = meta ? doc.designComponents?.[meta.component]?.properties?.find((x) => x.id === propertyId) : undefined;
  const layer = root && p ? propertyLayer(doc.layers, root, p.path) : undefined;
  if (!layer || !p || layer.locked === true) return false;
  if (p.type === "boolean") documentCommands.setLayerFlags(layer.id, { visible: value !== false });
  else if (p.type === "instance") return typeof value === "string" && !!swapInPlace(layer.id, value);
  else if (typeof value === "string") documentCommands.updateProps(layer.id, { [p.prop]: value as PropValue });
  else return false;
  return true;
}

// --- slots -------------------------------------------------------------------------

/** Marks a layer of a main component as a slot, or takes the mark off. Instances keep their own layers inside it. */
export function markSlot(layerId: string, on: boolean): boolean {
  const doc = getDocument();
  const layer = doc.layers[layerId];
  if (!layer || layer.archetype !== "container" || !mainOfLayer(doc.layers, layerId) || layer.instance) return false;
  documentCommands.mutate(on ? "Make slot" : "Remove slot", (d) => {
    if (on) d.layers[layerId].componentSlot = true;
    else delete d.layers[layerId].componentSlot;
    // the instances' counterparts carry the mark so the panel can find them
    const mainId = mainOfLayer(d.layers, layerId)!;
    const path = namePathOf(d.layers, mainId, layerId);
    if (!path) return;
    for (const l of Object.values(d.layers)) {
      if (!l.instance?.root || l.instance.source !== mainId) continue;
      const mine = resolveNamePath(d.layers, l.id, path);
      if (mine) {
        if (on) mine.componentSlot = true;
        else delete mine.componentSlot;
      }
    }
  });
  return true;
}

/** Puts layers into the slot of an instance (a slot layer inside it). The layers must not be part of an instance themselves. Returns how many moved. */
export function fillSlot(slotLayerId: string, ids: readonly string[]): number {
  const doc = getDocument();
  const slot = doc.layers[slotLayerId];
  if (!slot?.instance || !slot.componentSlot) return 0;
  const movable = ids.filter((id) => {
    const l = doc.layers[id];
    return l && !l.instance && !l.componentMain && l.parentId !== null && id !== slotLayerId && !subtreeIds(doc.layers, id).includes(slotLayerId);
  });
  if (movable.length === 0) return 0;
  const res = moveLayers(movable, slotLayerId);
  return res.ok === true ? movable.length : 0;
}

/** The slots of an instance: its layers that are slots. */
export function slotsOf(layers: Record<string, Layer>, rootId: string): Layer[] {
  return subtreeIds(layers, rootId).map((id) => layers[id]).filter((l) => l.componentSlot && l.instance);
}

