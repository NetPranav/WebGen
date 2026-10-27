/**
 * More component behaviour (FigCraft port F9):
 *
 * - **Push changes**: what an instance changed (on the selected layers, or the whole instance) goes to the main
 *   component, so every instance gets it; the instance then follows the main again.
 * - **Combine as variants**: two or more separate main components become one variant set ("Property 1" = "Default",
 *   "Variant2"…, or the `Property=Value` their names already say); their instances become instances of the set.
 * - **Descriptions** on components.
 * - **The default variant** is the top-left one (what a new instance shows).
 * - **What an instance can't change**: the position, rotation and constraints of the layers inside it (it can move as a
 *   whole, and change their look) — the main's layout decides those.
 *
 * Behaviour translated from FigCraft (`crates/engine/src/components.rs`, `docs/components-parity.md`), commit
 * 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import { documentCommands } from "../store/useDocumentStore";
import { getDocument } from "../store/documentState";
import type { Layer, MotionDocument } from "../document/schema";
import { INSTANCE_LOCKED_PROPS, containedComponents, instanceRootOf, markOverridden, namePathOf, resolveNamePath, subtreeIds, swapMainOf, syncInstanceLayer } from "./instances";

export { INSTANCE_LOCKED_PROPS, lockedByInstance } from "./instances";

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Pushes instance overrides to the main component. Returns how many layers' changes went to the main. */
export function pushChanges(ids: readonly string[]): number {
  const layers = getDocument().layers;
  // the layers whose changes go: a selected instance root means its whole instance
  const targets = new Set<string>();
  for (const id of ids) {
    const l = layers[id];
    if (!l?.instance) continue;
    if (l.instance.root) for (const s of subtreeIds(layers, id)) targets.add(s);
    else targets.add(id);
  }
  let pushed = 0;
  documentCommands.mutate("Push changes to main", (d) => {
    for (const id of targets) {
      const inst = d.layers[id];
      const over = inst?.instance?.overridden ?? [];
      const main = inst?.instance ? d.layers[inst.instance.source] : undefined;
      if (!inst || !main || over.length === 0) continue;
      for (const key of over) {
        if (key === "visible") main.visible = inst.visible;
        else if (key === "tokens" || key === "styleRefs" || key === "overrides" || key === "link" || key === "variableModes") (main as Record<string, unknown>)[key] = structuredClone((inst as Record<string, unknown>)[key]);
        else if (inst.instance!.root && INSTANCE_LOCKED_PROPS.has(key)) continue; // the instance's own place stays its own
        else if (key in inst.properties) main.properties[key] = structuredClone(inst.properties[key]);
        else delete main.properties[key];
        // the main's layer is itself part of a nested instance: what it took is its own override there
        if (main.instance) markOverridden(main as Layer, [key]);
      }
      // the instance follows the main again for what it pushed (its own place excepted)
      inst.instance!.overridden = over.filter((k) => inst.instance!.root && INSTANCE_LOCKED_PROPS.has(k));
      if (inst.instance!.overridden.length === 0) delete inst.instance!.overridden;
      pushed++;
    }
  });
  return pushed;
}

/**
 * Combines separate main components (by main layer or component id) into one variant set, in layer order. Main names
 * already in `Property=Value` form (all with the same property) keep it; otherwise, as FigCraft names them, the
 * property is "Property 1" and the values "Default", "Variant2", "Variant3"…. Returns the set's component id.
 */
export function combineAsVariants(ids: readonly string[]): string | null {
  const doc = getDocument();
  const comps = doc.designComponents ?? {};
  const chosen: string[] = [];
  for (const id of ids) {
    const cid = comps[id] ? id : doc.layers[id]?.componentMain;
    if (cid && comps[cid] && doc.layers[comps[cid].mainId] && !comps[cid].variantProps && !doc.layers[comps[cid].mainId].instance && !chosen.includes(cid)) chosen.push(cid);
  }
  // a component inside another of the chosen ones can't join it
  if (chosen.some((a) => chosen.some((b) => a !== b && subtreeIds(doc.layers, comps[b].mainId).includes(comps[a].mainId)))) return null;
  if (chosen.length < 2) return null;
  // layer order: by parent, then place among its siblings (FigCraft sorts by paint order)
  const orderOf = (cid: string) => {
    const m = doc.layers[comps[cid].mainId];
    return [m.parentId ?? "", m.parentId ? doc.layers[m.parentId].children.indexOf(m.id) : 0] as const;
  };
  chosen.sort((a, b) => orderOf(a)[0].localeCompare(orderOf(b)[0]) || orderOf(a)[1] - orderOf(b)[1]);
  const [first, ...rest] = chosen;
  const parsed = chosen.map((cid) => /^\s*([^=,]{1,60}?)\s*=\s*([^=,]{1,60}?)\s*$/.exec(doc.layers[comps[cid].mainId].name));
  const sameKey = parsed.every((p) => p && p[1] === parsed[0]![1]) && new Set(parsed.map((p) => p![2])).size === parsed.length;
  const prop = sameKey ? parsed[0]![1] : "Property 1";
  const values = chosen.map((_, k) => (sameKey ? parsed[k]![2] : k === 0 ? "Default" : `Variant${k + 1}`));
  documentCommands.mutate("Combine as variants", (d) => {
    const set = d.designComponents![first];
    set.variantProps = [{ name: prop, values }];
    set.variants = chosen.map((cid, i) => ({ mainId: d.designComponents![cid].mainId, values: { [prop]: values[i] } }));
    set.mainId = set.variants[0].mainId;
    chosen.forEach((cid, i) => {
      const main = d.layers[d.designComponents![cid].mainId];
      main.componentMain = first;
      main.name = `${prop}=${values[i]}`;
    });
    for (const l of Object.values(d.layers)) {
      if (!l.instance) continue;
      const i = chosen.indexOf(l.instance.component);
      if (i < 0) continue;
      l.instance.component = first;
      if (l.instance.root) l.instance.variant = { [prop]: values[i] };
    }
    for (const cid of rest) delete d.designComponents![cid];
  });
  return first;
}

/** Sets a component's description (empty clears it). */
export function setComponentDescription(componentId: string, text: string): boolean {
  if (!getDocument().designComponents?.[componentId]) return false;
  documentCommands.mutate("Component description", (d) => {
    const c = d.designComponents![componentId] as { description?: string };
    const t = text.trim().slice(0, 2000);
    if (t) c.description = t;
    else delete c.description;
  });
  return true;
}

/** The default variant of a set: the top-left main (smallest y, then x), as Figma and FigCraft choose it. */
export function defaultVariantMain(componentId: string): string | null {
  const doc = getDocument();
  const c = doc.designComponents?.[componentId];
  if (!c) return null;
  const mains = c.variants?.length ? c.variants.map((v) => v.mainId) : [c.mainId];
  const place = (id: string) => ({ x: num(doc.layers[id]?.properties["frame.x"]), y: num(doc.layers[id]?.properties["frame.y"]) });
  return [...mains].filter((m) => doc.layers[m]).sort((a, b) => place(a).y - place(b).y || place(a).x - place(b).x)[0] ?? null;
}

/** The instance root of a layer, for callers that only know a layer. */
export const rootOf = (id: string): string | null => instanceRootOf(getDocument().layers, id);

// --- nested components (FigCraft port F9) -------------------------------------------------

/** Does a layer hold a main component below it? */
export function holdsMain(layers: Record<string, Layer>, id: string): boolean {
  return subtreeIds(layers, id).some((x) => x !== id && !!layers[x]?.componentMain);
}

/** The component whose main a layer is inside (or is), if any. */
export function mainAround(layers: Record<string, Layer>, id: string): string | null {
  for (let cur: Layer | undefined = layers[id], g = 0; cur && g < 10_000; cur = cur.parentId ? layers[cur.parentId] : undefined, g++) if (cur.componentMain) return cur.componentMain;
  return null;
}

/** For a nested instance (a copy inside another instance that mirrors an instance, or one swapped), its own component; else null. */
export function innerComponentOf(doc: Pick<MotionDocument, "layers">, id: string): string | null {
  const l = doc.layers[id];
  if (!l?.instance || l.instance.root) return null;
  if (l.instance.swap) return l.instance.swap;
  const src = doc.layers[l.instance.source]?.instance;
  return src?.root ? src.component : null;
}

/** The main a nested instance shows (its swap's, or its own component's variant), for Go to main; null for anything else. */
export function innerMainOf(doc: MotionDocument, id: string): string | null {
  const l = doc.layers[id];
  if (!l?.instance || l.instance.root) return null;
  if (l.instance.swap) return swapMainOf(doc, l.instance.swap)?.id ?? null;
  const src = doc.layers[l.instance.source]?.instance;
  return src?.root ? src.source : null;
}

/**
 * Points the layers below `rootId` at the layers with the same name paths under `newRoot` (from under `oldRoot`),
 * keeping them and their overrides; the ones with no counterpart lose their overrides (and go when the instance syncs).
 */
function repoint(d: MotionDocument, rootId: string, oldRoot: string, newRoot: string, component?: string) {
  for (const id of subtreeIds(d.layers, rootId)) {
    if (id === rootId) continue;
    const l = d.layers[id];
    if (!l.instance) continue;
    const path = namePathOf(d.layers, oldRoot, l.instance.source);
    const target = path ? resolveNamePath(d.layers, newRoot, path) : undefined;
    if (target) {
      l.instance.source = target.id;
      if (component) l.instance.component = component;
    } else delete l.instance.overridden;
  }
}

/**
 * Swaps a nested instance in place (FigCraft port F9): a copy inside another instance shows another component (its
 * overrides kept on layers with the same name path; swapping back to its own component resets it), and an instance
 * inside a main becomes an instance of the other component keeping its layers' ids, so the outer instances' overrides
 * on them survive. Returns the layer's id, null when refused (a component can't contain itself), or undefined when the
 * layer isn't nested (the caller swaps it the usual way).
 */
export function swapInPlace(id: string, componentId: string): string | null | undefined {
  const doc = getDocument();
  const comp = doc.designComponents?.[componentId];
  const l = doc.layers[id];
  if (!l?.instance || !comp) return undefined;
  const inner = innerComponentOf(doc, id);
  const root = l.instance.root ? id : null;
  const around = mainAround(doc.layers, id);
  if (!inner && !(root && around)) return undefined;
  // a component can't contain itself
  const outerComponent = inner ? doc.layers[instanceRootOf(doc.layers, id) ?? ""]?.instance?.component : undefined;
  if (componentId === outerComponent || (around && (around === componentId || containedComponents(doc, componentId).has(around)))) return null;
  if (inner) {
    const original = doc.layers[l.instance.source]?.instance?.root ? doc.layers[l.instance.source].instance!.component : null;
    const oldRoot = l.instance.swap ? swapMainOf(doc, l.instance.swap)?.id : l.instance.source;
    const back = componentId === original;
    const newRoot = back ? l.instance.source : comp.mainId;
    if (!oldRoot || (!back && componentId === l.instance.swap)) return null;
    documentCommands.mutate("Swap instance", (d) => {
      repoint(d, id, oldRoot, newRoot);
      const meta = d.layers[id].instance!;
      if (back) delete meta.swap;
      else meta.swap = componentId;
      syncInstanceLayer(d, id);
    });
    return id;
  }
  if (l.instance.component === componentId) return null;
  const oldRoot = l.instance.source;
  documentCommands.mutate("Swap instance", (d) => {
    repoint(d, id, oldRoot, comp.mainId, componentId);
    const meta = d.layers[id].instance!;
    meta.component = componentId;
    meta.source = comp.mainId;
    delete meta.variant;
    syncInstanceLayer(d, id);
  });
  return id;
}
