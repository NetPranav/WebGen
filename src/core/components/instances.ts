/**
 * ============================================================================
 * COMPONENTS AND INSTANCES (ROADMAP Phase 46)
 * ============================================================================
 * A main component is a layer (with its children) marked as the component; an instance is a copy of that subtree whose
 * layers each remember the main layer they mirror (`instance.source`). When the main changes, every instance is brought
 * in line in the same change: properties, visibility, bindings and children follow, except the properties an instance
 * has changed itself (`instance.overridden`), which stay as they are. These are the operations on a document draft;
 * the editor's commands in `componentOps.ts` wrap them in one undo step.
 *
 * Nesting (FigCraft port F9): a main may hold instances of other components. An instance of it copies them like any
 * layer (its copies mirror the outer main's layers, whose own `instance` says what they are inside it); a copy can be
 * swapped to another component (`instance.swap`), and its layers then mirror that component's main. Mains sync in
 * containment order (an inner main's change reaches its copy in the outer main before the outer instances follow),
 * and a component that would contain itself is refused.
 * ============================================================================
 */

import type { PropValue } from "../document/registry";
import type { Layer, MotionDocument } from "../document/schema";
import { createId } from "../ids";

/** What an instance root decides for itself even when it hasn't overridden it: where it sits in its parent. */
const PLACEMENT = new Set(["frame.x", "frame.y", "positioning", "frame.rotation", "breakpoints.responsive", "layout.gridColumnStart", "layout.gridColumnSpan", "layout.gridRowStart", "layout.gridRowSpan", "constraints.horizontal", "constraints.vertical"]);

/** The fields besides properties that an instance can override, named as they appear in `overridden`. */
export const FIELD_OVERRIDES = ["visible", "tokens", "styleRefs", "overrides", "link", "variableModes"] as const;

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
export function instantiate(doc: MotionDocument, componentId: string, sourceId: string, parentId: string | null, index: number | undefined, isRoot: boolean, shallow = false): string {
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
    ...(src.variableModes ? { variableModes: clone(src.variableModes) } : {}),
    ...(src.overrides ? { overrides: clone(src.overrides) } : {}),
    ...(src.link ? { link: clone(src.link) } : {}),
    ...(src.section ? { section: clone(src.section) } : {}),
    ...(src.componentSlot ? { componentSlot: true } : {}),
    instance: { component: componentId, source: sourceId, ...(isRoot ? { root: true } : {}) },
  };
  doc.layers[id] = layer;
  if (parentId !== null) {
    const siblings = doc.layers[parentId].children;
    if (index === undefined || index > siblings.length) siblings.push(id);
    else siblings.splice(index, 0, id);
  }
  // each child puts itself at the end of the new layer's children
  if (!shallow) for (const k of src.children) instantiate(doc, componentId, k, id, undefined, false);
  return id;
}

/**
 * Copies a layer and everything under it as new layers (no component marks) under `parentId`, at `index`. Returns the
 * new root's id. Instances inside stay instances of their components (FigCraft port F9: a variant made from a main that
 * holds a nested instance holds one too), with their overrides.
 */
export function cloneSubtree(doc: MotionDocument, sourceId: string, parentId: string | null, index?: number): string {
  const src = doc.layers[sourceId];
  const id = createId(src.archetype === "container" ? "frm" : "lay");
  const layer: Layer = {
    id,
    name: src.name,
    archetype: src.archetype,
    parentId,
    children: [],
    ...(src.visible === undefined ? {} : { visible: src.visible }),
    ...(src.locked === undefined ? {} : { locked: src.locked }),
    properties: clone(src.properties),
    ...(src.tokens ? { tokens: clone(src.tokens) } : {}),
    ...(src.styleRefs ? { styleRefs: clone(src.styleRefs) } : {}),
    ...(src.variableModes ? { variableModes: clone(src.variableModes) } : {}),
    ...(src.overrides ? { overrides: clone(src.overrides) } : {}),
    ...(src.componentSlot ? { componentSlot: true } : {}),
    ...(src.instance ? { instance: clone(src.instance) } : {}),
  };
  doc.layers[id] = layer;
  if (parentId !== null) {
    const siblings = doc.layers[parentId].children;
    if (index === undefined || index > siblings.length) siblings.push(id);
    else siblings.splice(index, 0, id);
  }
  for (const k of src.children) cloneSubtree(doc, k, id);
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
  if (src.componentSlot) dst.componentSlot = true;
  else delete dst.componentSlot;
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
  // the modes a frame of the main chose (FigCraft port F10); an instance root's own choice is its own
  if (!overridden.has("variableModes") && !root) {
    if (src.variableModes) dst.variableModes = clone(src.variableModes);
    else delete dst.variableModes;
  }
  if (!overridden.has("overrides")) {
    if (src.overrides) dst.overrides = clone(src.overrides);
    else delete dst.overrides;
  }
  if (src.section) dst.section = clone(src.section);
  else delete dst.section;
  if (!overridden.has("link")) {
    if (src.link) dst.link = clone(src.link);
    else delete dst.link;
  }
}

/** The main a swapped nested instance shows: the component's (its first variant's) main layer. */
export function swapMainOf(doc: MotionDocument, componentId: string): Layer | undefined {
  const c = doc.designComponents?.[componentId];
  return c ? doc.layers[mainsOf(c)[0]] : undefined;
}

/** Brings one instance layer (and below) in line with the main layer it mirrors, keeping what it overrides. */
export function syncInstanceLayer(doc: MotionDocument, instId: string, depth = 0, pool?: Map<string, string>): void {
  const inst = doc.layers[instId];
  const meta = inst?.instance;
  const mirrored = meta ? doc.layers[meta.source] : undefined;
  if (!inst || !meta || !mirrored || depth > 64) return;
  // layers that no longer sit where they did wait in a pool for the place they now have (FigCraft port F9: a main that
  // wraps or moves a layer keeps the instances' overrides on it); what is left in it at the end goes
  const top = !pool;
  const spare = pool ?? new Map<string, string>();
  // a nested copy swapped to another component (FigCraft port F9) shows that component's main, where its own source puts it
  const swapped = meta.swap ? swapMainOf(doc, meta.swap) : undefined;
  const src = swapped ?? mirrored;
  const overridden = new Set(meta.overridden ?? []);
  copyFields(inst, src, overridden, meta.root === true || !!swapped);
  if (swapped && !meta.root) for (const k of PLACEMENT) if (!overridden.has(k)) {
    if (mirrored.properties[k] !== undefined) inst.properties[k] = clone(mirrored.properties[k]);
    else delete inst.properties[k];
  }
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
  for (const id of stale) {
    const m = doc.layers[id]?.instance;
    if (m && !spare.has(m.source)) spare.set(m.source, id);
    else dropSubtree(doc, id);
  }
  const next: string[] = [];
  for (const mainKid of src.children) {
    let id = byMain.get(mainKid);
    if (!id && spare.has(mainKid)) {
      id = spare.get(mainKid)!;
      spare.delete(mainKid);
    }
    if (!id) id = instantiate(doc, meta.component, mainKid, inst.id, undefined, false, true);
    doc.layers[id].parentId = inst.id;
    syncInstanceLayer(doc, id, depth + 1, spare);
    next.push(id);
  }
  // `instantiate` appended the new ones to inst.children itself; the list is rebuilt once, in the main's order
  inst.children = [...next, ...own];
  for (const id of next) doc.layers[id].parentId = inst.id;
  // (a pooled layer was already taken out of its old parent's children)
  if (top) for (const id of spare.values()) if (doc.layers[id]) dropSubtree(doc, id);
}

/** A cheap fingerprint of what an instance would copy from a layer. */
function sig(l: Layer | undefined): string {
  return l ? JSON.stringify([l.properties, l.children, l.visible, l.tokens, l.styleRefs, l.overrides, l.archetype, l.link, l.componentSlot, l.variableModes]) : "";
}

/** Every main layer of a component: the one, or one for each variant. */
export function mainsOf(comp: { mainId: string; variants?: { mainId: string }[] }): string[] {
  return comp.variants && comp.variants.length > 0 ? comp.variants.map((v) => v.mainId) : [comp.mainId];
}

/** A layer's place under `rootId` as names: `label`, or `row/icon`, with `#n` when siblings share a name. Null when it isn't under the root. */
export function namePathOf(layers: Record<string, Layer>, rootId: string, id: string): string[] | null {
  const chain: string[] = [];
  let cur = layers[id];
  let guard = 0;
  while (cur && cur.id !== rootId && guard++ < 10_000) {
    const parent = cur.parentId ? layers[cur.parentId] : undefined;
    if (!parent) return null;
    const same = parent.children.filter((c) => layers[c]?.name === cur!.name);
    chain.unshift(same.length > 1 ? `${cur.name}#${same.indexOf(cur.id)}` : cur.name);
    cur = parent;
  }
  return cur && cur.id === rootId ? chain : null;
}

/** The layer at a name path under `rootId` (undefined when there is none). */
export function resolveNamePath(layers: Record<string, Layer>, rootId: string, path: readonly string[]): Layer | undefined {
  let cur = layers[rootId];
  for (const seg of path) {
    if (!cur) return undefined;
    const m = /^(.*)#(\d+)$/.exec(seg);
    const name = m ? m[1] : seg;
    const nth = m ? Number(m[2]) : 0;
    cur = layers[cur.children.filter((c) => layers[c]?.name === name)[nth]];
  }
  return cur;
}

/**
 * Points an instance at another main layer of the same component (a different variant): each of its layers is matched
 * to the layer with the same name path in the new main, keeping its overrides, and then the instance is brought in
 * line with it. Layers the new main has no counterpart for go; the instance's own layers stay.
 */
export function remapInstance(doc: MotionDocument, instRootId: string, newMainId: string): void {
  const root = doc.layers[instRootId];
  const oldMainId = root?.instance?.source;
  if (!root?.instance || !oldMainId || !doc.layers[newMainId]) return;
  const walk = (id: string) => {
    const l = doc.layers[id];
    if (!l?.instance) return;
    const path = namePathOf(doc.layers, oldMainId, l.instance.source);
    const target = id === instRootId ? doc.layers[newMainId] : path ? resolveNamePath(doc.layers, newMainId, path) : undefined;
    if (target) l.instance.source = target.id;
    for (const k of l.children) walk(k);
  };
  walk(instRootId);
  syncInstanceLayer(doc, instRootId);
}

/**
 * After a change: every main layer of a component (the one, or each variant's) that differs from `before`, or
 * anything under it, brings the instances of that main in line. A main that was deleted: an instance of a variant
 * that is gone moves to another variant, and with no main left the instances become plain layers and the component
 * goes. Called inside the same change as the edit.
 */
export function syncInstances(doc: MotionDocument, before: MotionDocument): void {
  const comps = doc.designComponents;
  if (!comps) return;
  const cycle = componentCycle(doc);
  if (cycle) throw new Error(`A component can't contain itself: "${comps[cycle]?.name ?? cycle}".`);
  for (const c of containmentOrder(doc)) {
    let mains = mainsOf(c);
    const gone = mains.filter((m) => !doc.layers[m]);
    if (gone.length > 0) {
      const left = mains.filter((m) => doc.layers[m]);
      if (left.length === 0) {
        detachComponent(doc, c.id);
        delete comps[c.id];
        continue;
      }
      if (c.variants) c.variants = c.variants.filter((v) => doc.layers[v.mainId]);
      c.mainId = left[0];
      for (const l of Object.values(doc.layers)) if (l.instance?.root && l.instance.component === c.id && gone.includes(l.instance.source)) detachInstance(doc, l.id);
      mains = left;
    }
    for (const m of mains) {
      const ids = subtreeIds(doc.layers, m);
      const was = before.layers;
      let changed = ids.length !== subtreeIds(was, m).length;
      for (let i = 0; !changed && i < ids.length; i++) changed = sig(doc.layers[ids[i]]) !== sig(was[ids[i]]);
      if (!changed) continue;
      for (const l of Object.values(doc.layers)) if (l.instance?.component === c.id && l.instance.root && l.instance.source === m) syncInstanceLayer(doc, l.id);
      // nested copies swapped to this component follow it too
      if (m === mainsOf(c)[0]) for (const l of Object.values(doc.layers)) if (l.instance?.swap === c.id) syncInstanceLayer(doc, l.id);
    }
  }
  if (Object.keys(comps).length === 0) delete doc.designComponents;
}

/** The components whose instances (or swaps) are inside a component's mains. */
export function componentDeps(doc: MotionDocument, componentId: string): Set<string> {
  const c = doc.designComponents?.[componentId];
  const out = new Set<string>();
  if (!c) return out;
  for (const m of mainsOf(c))
    for (const id of subtreeIds(doc.layers, m)) {
      const meta = doc.layers[id]?.instance;
      if (meta && meta.component !== componentId) out.add(meta.component);
      if (meta?.swap) out.add(meta.swap);
    }
  return out;
}

/** Every component a component contains, however deep. */
export function containedComponents(doc: MotionDocument, componentId: string): Set<string> {
  const seen = new Set<string>();
  const stack = [...componentDeps(doc, componentId)];
  while (stack.length > 0 && seen.size < 10_000) {
    const x = stack.pop()!;
    if (seen.has(x)) continue;
    seen.add(x);
    stack.push(...componentDeps(doc, x));
  }
  return seen;
}

/** A component that contains itself (directly or through others), if any. */
export function componentCycle(doc: MotionDocument): string | null {
  for (const id of Object.keys(doc.designComponents ?? {})) if (containedComponents(doc, id).has(id)) return id;
  return null;
}

/** The components, those contained in others first (so an inner main's change reaches the outer main before its instances sync). */
function containmentOrder(doc: MotionDocument): NonNullable<MotionDocument["designComponents"]>[string][] {
  const comps = doc.designComponents ?? {};
  const out: string[] = [];
  const state = new Map<string, number>();
  const visit = (id: string) => {
    if (state.get(id) === 2 || state.get(id) === 1 || !comps[id]) return;
    state.set(id, 1);
    for (const d of componentDeps(doc, id)) visit(d);
    state.set(id, 2);
    out.push(id);
  };
  for (const id of Object.keys(comps)) visit(id);
  return out.map((id) => comps[id]);
}

/** Turns every instance of a component into plain layers (the look stays; they no longer follow the main); copies swapped to it show their own main again. */
export function detachComponent(doc: MotionDocument, componentId: string): void {
  for (const l of Object.values(doc.layers)) if (l.instance?.component === componentId && l.instance.root) detachInstance(doc, l.id);
  for (const l of Object.values(doc.layers)) {
    if (l.instance?.component === componentId) delete l.instance;
    if (l.instance?.swap === componentId) delete l.instance.swap;
  }
}

/**
 * Turns one instance (below `rootId`) into plain layers. The instances nested in it stay instances of their own
 * components (FigCraft port F9), keeping their overrides; a swapped one becomes an instance of what it was swapped to.
 */
export function detachInstance(doc: MotionDocument, rootId: string): void {
  const keep = new Map<string, NonNullable<Layer["instance"]>>();
  const walk = (id: string, swapTo: string | null, depth: number) => {
    const l = doc.layers[id];
    if (!l || depth > 64) return;
    const meta = l.instance;
    let inner = swapTo;
    if (meta && id !== rootId) {
      if (meta.swap) {
        const main = swapMainOf(doc, meta.swap);
        if (main) keep.set(id, { component: meta.swap, source: main.id, root: true, ...(meta.overridden ? { overridden: meta.overridden } : {}) });
        inner = meta.swap;
      } else if (swapTo) keep.set(id, { component: swapTo, source: meta.source, ...(meta.overridden ? { overridden: meta.overridden } : {}) });
      else {
        const s = doc.layers[meta.source]?.instance;
        if (s) keep.set(id, { component: s.component, source: s.source, ...(s.root ? { root: true } : {}), ...(s.variant ? { variant: clone(s.variant) } : {}), ...(meta.overridden ? { overridden: meta.overridden } : {}) });
      }
    }
    for (const k of l.children) walk(k, inner, depth + 1);
  };
  walk(rootId, null, 0);
  for (const id of subtreeIds(doc.layers, rootId)) {
    const k = keep.get(id);
    if (k) doc.layers[id].instance = k;
    else delete doc.layers[id].instance;
  }
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

/** Properties a layer inside an instance (not its root) can't change: the main's layout places it (FigCraft port F9). */
export const INSTANCE_LOCKED_PROPS = new Set(["frame.x", "frame.y", "frame.rotation", "positioning", "constraints.horizontal", "constraints.vertical", "layout.gridColumnStart", "layout.gridRowStart", "layout.gridColumnSpan", "layout.gridRowSpan"]);

/** Whether `prop` of `layer` is locked by its instance (a layer inside an instance, not the instance itself). */
export const lockedByInstance = (layer: Layer | undefined, prop: string): boolean => !!layer?.instance && !layer.instance.root && INSTANCE_LOCKED_PROPS.has(prop);
