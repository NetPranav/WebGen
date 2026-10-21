/**
 * ============================================================================
 * COMPONENTS AND INSTANCES (ROADMAP Phase 46)
 * ============================================================================
 * A main component is a layer (with its children) marked as the component; an instance is a copy of that subtree whose
 * layers each remember the main layer they mirror (`instance.source`). When the main changes, every instance is brought
 * in line in the same change: properties, visibility, bindings and children follow, except the properties an instance
 * has changed itself (`instance.overridden`), which stay as they are. These are the operations on a document draft;
 * the editor's commands in `componentOps.ts` wrap them in one undo step. Components do not nest in this version.
 * ============================================================================
 */

import type { PropValue } from "../document/registry";
import type { Layer, MotionDocument } from "../document/schema";
import { createId } from "../ids";

/** What an instance root decides for itself even when it hasn't overridden it: where it sits in its parent. */
const PLACEMENT = new Set(["frame.x", "frame.y", "positioning", "frame.rotation", "breakpoints.responsive", "layout.gridColumnStart", "layout.gridColumnSpan", "layout.gridRowStart", "layout.gridRowSpan", "constraints.horizontal", "constraints.vertical"]);

/** The fields besides properties that an instance can override, named as they appear in `overridden`. */
export const FIELD_OVERRIDES = ["visible", "tokens", "styleRefs", "overrides"] as const;

const clone = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

export const isMain = (l: Layer | undefined): boolean => !!l?.componentMain;
export const isInstanceLayer = (l: Layer | undefined): boolean => !!l?.instance;
export const isInstanceRoot = (l: Layer | undefined): boolean => !!l?.instance?.root;

/** The ids of a layer and all of its descendants. */
export function subtreeIds(layers: Record<string, Layer>, rootId: string): string[] {
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const l = layers[id];
    if (!l || out.length > 100_000) continue;
    out.push(id);
    for (let i = l.children.length - 1; i >= 0; i--) stack.push(l.children[i]);
  }
  return out;
}

/** Does any layer of the subtree contain a layer that is part of an instance, or a main of another component? (Components don't nest.) */
export function hasNestedComponent(layers: Record<string, Layer>, rootId: string, allowMain?: string): boolean {
  return subtreeIds(layers, rootId).some((id) => {
    const l = layers[id];
    return !!l && (!!l.instance || (!!l.componentMain && l.componentMain !== allowMain));
  });
}

/** Copies `source` as a new layer of an instance (and its children, recursively) under `parentId`. Returns the new layer's id. */
export function instantiate(doc: MotionDocument, componentId: string, sourceId: string, parentId: string | null, index: number | undefined, isRoot: boolean): string {
  const src = doc.layers[sourceId];
  const id = createId(src.archetype === "container" ? "inst" : "ic");
  const layer: Layer = {
    id,
    name: src.name,
    archetype: src.archetype,
    parentId,
    children: [],
    ...(src.visible === undefined ? {} : { visible: src.visible }),
    properties: clone(src.properties),
    ...(src.tokens ? { tokens: clone(src.tokens) } : {}),
    ...(src.styleRefs ? { styleRefs: clone(src.styleRefs) } : {}),
    ...(src.overrides ? { overrides: clone(src.overrides) } : {}),
    instance: { component: componentId, source: sourceId, ...(isRoot ? { root: true } : {}) },
  };
  doc.layers[id] = layer;
  if (parentId !== null) {
    const siblings = doc.layers[parentId].children;
    if (index === undefined || index > siblings.length) siblings.push(id);
    else siblings.splice(index, 0, id);
  }
  // each child puts itself at the end of the new layer's children
  for (const k of src.children) instantiate(doc, componentId, k, id, undefined, false);
  return id;
}

/** Removes a layer and its descendants from the document (not from its parent's list: the caller does that). */
function dropSubtree(doc: MotionDocument, id: string) {
  for (const x of subtreeIds(doc.layers, id)) delete doc.layers[x];
}

function copyFields(dst: Layer, src: Layer, overridden: ReadonlySet<string>, root: boolean) {
  for (const [k, v] of Object.entries(src.properties)) {
    if (overridden.has(k) || (root && PLACEMENT.has(k))) continue;
    dst.properties[k] = clone(v as PropValue);
  }
  for (const k of Object.keys(dst.properties)) {
    if (overridden.has(k) || (root && PLACEMENT.has(k))) continue;
    if (!(k in src.properties)) delete dst.properties[k];
  }
  if (!overridden.has("visible")) {
    if (src.visible === undefined) delete dst.visible;
    else dst.visible = src.visible;
  }
  if (!overridden.has("tokens")) {
    if (src.tokens) dst.tokens = clone(src.tokens);
    else delete dst.tokens;
  }
  if (!overridden.has("styleRefs")) {
    if (src.styleRefs) dst.styleRefs = clone(src.styleRefs);
    else delete dst.styleRefs;
  }
  if (!overridden.has("overrides")) {
    if (src.overrides) dst.overrides = clone(src.overrides);
    else delete dst.overrides;
  }
}

/** Brings one instance layer (and below) in line with the main layer it mirrors, keeping what it overrides. */
export function syncInstanceLayer(doc: MotionDocument, instId: string): void {
  const inst = doc.layers[instId];
  const meta = inst?.instance;
  const src = meta ? doc.layers[meta.source] : undefined;
  if (!inst || !meta || !src) return;
  copyFields(inst, src, new Set(meta.overridden ?? []), meta.root === true);
  // children: one for each of the main's, in its order; the instance's own additions stay, after them
  const byMain = new Map<string, string>();
  const own: string[] = [];
  const stale: string[] = [];
  for (const kid of inst.children) {
    const m = doc.layers[kid]?.instance;
    if (m && m.component === meta.component) {
      if (src.children.includes(m.source) && !byMain.has(m.source)) byMain.set(m.source, kid);
      else stale.push(kid);
    } else own.push(kid);
  }
  for (const id of stale) dropSubtree(doc, id);
  const next: string[] = [];
  for (const mainKid of src.children) {
    let id = byMain.get(mainKid);
    if (!id) id = instantiate(doc, meta.component, mainKid, inst.id, undefined, false);
    else syncInstanceLayer(doc, id);
    next.push(id);
  }
  // `instantiate` appended the new ones to inst.children itself; the list is rebuilt once, in the main's order
  inst.children = [...next, ...own];
  for (const id of next) doc.layers[id].parentId = inst.id;
}

/** A cheap fingerprint of what an instance would copy from a layer. */
function sig(l: Layer | undefined): string {
  return l ? JSON.stringify([l.properties, l.children, l.visible, l.tokens, l.styleRefs, l.overrides, l.archetype]) : "";
}

/**
 * After a change: every component whose main (or anything under it) differs from `before` brings its instances in
 * line. A main that was deleted turns its instances into plain layers. Called inside the same change as the edit.
 */
export function syncInstances(doc: MotionDocument, before: MotionDocument): void {
  const comps = doc.designComponents;
  if (!comps) return;
  for (const c of Object.values(comps)) {
    const main = doc.layers[c.mainId];
    if (!main) {
      detachComponent(doc, c.id);
      delete comps[c.id];
      continue;
    }
    const ids = subtreeIds(doc.layers, c.mainId);
    const was = before.layers;
    let changed = ids.length !== subtreeIds(was, c.mainId).length;
    for (let i = 0; !changed && i < ids.length; i++) changed = sig(doc.layers[ids[i]]) !== sig(was[ids[i]]);
    if (!changed) continue;
    for (const l of Object.values(doc.layers)) if (l.instance?.component === c.id && l.instance.root) syncInstanceLayer(doc, l.id);
  }
  if (Object.keys(comps).length === 0) delete doc.designComponents;
}

/** Turns every instance of a component into plain layers (the look stays; they no longer follow the main). */
export function detachComponent(doc: MotionDocument, componentId: string): void {
  for (const l of Object.values(doc.layers)) if (l.instance?.component === componentId) delete l.instance;
}

/** Turns one instance (below `rootId`) into plain layers. */
export function detachInstance(doc: MotionDocument, rootId: string): void {
  for (const id of subtreeIds(doc.layers, rootId)) delete doc.layers[id].instance;
}

/** The instance root a layer belongs to, or null. */
export function instanceRootOf(layers: Record<string, Layer>, id: string): string | null {
  let cur = layers[id];
  let guard = 0;
  while (cur && guard++ < 10_000) {
    if (cur.instance?.root) return cur.id;
    cur = cur.parentId ? layers[cur.parentId] : (undefined as unknown as Layer);
  }
  return null;
}

/** Notes that a layer of an instance changed these on its own: the main stops overwriting them. */
export function markOverridden(layer: Layer, keys: readonly string[]): void {
  if (!layer.instance || keys.length === 0) return;
  const set = new Set(layer.instance.overridden ?? []);
  for (const k of keys) set.add(k);
  layer.instance.overridden = [...set].sort();
}
