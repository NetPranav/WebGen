import { layerBar, type Composition, type NestedComposition } from "../document/compositions";
import type { MotionDocument } from "../document/schema";

/**
 * ============================================================================
 * COMPOSITION TABS AND BREADCRUMBS (ROADMAP Phase 65)
 * ============================================================================
 * The timeline shows one composition at a time. Main is always a tab. Each interaction composition (hover, press,
 * scroll, ...) is a tab named for its trigger. A precomp becomes a tab once it is opened from its bar in the parent;
 * the breadcrumbs say how you got there. Pure functions over the document; the open tabs and the trail are UI state.
 * ============================================================================
 */

const TRIGGER_WORDS: Record<string, string> = {
  mount: "On load",
  time: "On time",
  hover: "Hover",
  press: "Press",
  focus: "Focus",
  inView: "In view",
  scroll: "Scroll",
  drag: "Drag",
  pointer: "Pointer",
  custom: "Event",
};

/** "Hover on Buy Button", "Press on Card", "Event SceneTwo on Title": what starts an interaction composition. Empty for the others. */
export function triggerLabel(doc: Pick<MotionDocument, "layers">, comp: Pick<Composition, "kind" | "trigger">): string {
  const trigger = comp.trigger;
  if (comp.kind !== "interaction" || !trigger) return "";
  const word = TRIGGER_WORDS[trigger.on] ?? trigger.on;
  const layer = doc.layers[trigger.layerId]?.name ?? "a layer that no longer exists";
  return trigger.on === "custom" && trigger.event ? `${word} ${trigger.event} on ${layer}` : `${word} on ${layer}`;
}

export interface CompositionTab {
  id: string;
  /** The composition's name. */
  name: string;
  kind: Composition["kind"];
  /** What the trigger is, for an interaction tab (shown in the tab header). */
  trigger: string;
  /** Only precomp tabs close. */
  closable: boolean;
  active: boolean;
}

/** The tabs: Main, then every interaction composition by name, then the precomps that have been opened (in the order opened). */
export function compositionTabs(doc: MotionDocument, openPrecomps: readonly string[], activeId: string): CompositionTab[] {
  const comps = Object.values(doc.compositions);
  const tab = (c: Composition): CompositionTab => ({ id: c.id, name: c.name, kind: c.kind, trigger: triggerLabel(doc, c), closable: c.kind === "precomp", active: c.id === activeId });
  const main = comps.filter((c) => c.kind === "main").map(tab);
  const interactions = comps.filter((c) => c.kind === "interaction").sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).map(tab);
  const precomps = openPrecomps.flatMap((id) => {
    const c = doc.compositions[id];
    return c && c.kind === "precomp" ? [tab(c)] : [];
  });
  return [...main, ...interactions, ...precomps];
}

export interface Crumb {
  id: string;
  name: string;
}

/**
 * The breadcrumbs for `trail` (composition ids from the top one down), keeping only compositions that still exist and
 * only while each is actually placed in the one before it. A trail that doesn't end at `activeId` is replaced by just
 * the active composition.
 */
export function breadcrumbs(doc: MotionDocument, trail: readonly string[], activeId: string): Crumb[] {
  const valid: string[] = [];
  for (const id of trail) {
    const comp = doc.compositions[id];
    if (!comp) break;
    const parent = valid.length > 0 ? doc.compositions[valid[valid.length - 1]] : undefined;
    if (parent && !parent.nested.some((n) => n.compositionId === id)) break;
    valid.push(id);
  }
  const ids = valid[valid.length - 1] === activeId && valid.length > 0 ? valid : [activeId];
  return ids.flatMap((id) => (doc.compositions[id] ? [{ id, name: doc.compositions[id].name }] : []));
}

/** The trail after opening composition `id`: from a nested bar it extends the current trail; from a tab it starts again. */
export function trailAfterOpening(trail: readonly string[], currentId: string, id: string, fromBar: boolean): string[] {
  if (!fromBar) return [id];
  const at = trail.lastIndexOf(currentId);
  return [...(at === -1 ? [currentId] : trail.slice(0, at + 1)), id];
}

export interface NestedRow {
  /** The placement's id. */
  id: string;
  compositionId: string;
  name: string;
  /** Where the placement sits in the parent, in parent seconds. */
  in: number;
  out: number;
  start: number;
  stretch: number;
  /** The precomp's own length, seconds. */
  childDuration: number;
  /** Every keyframe of the precomp, as parent seconds (so the bar can show what is inside it). */
  keyTimes: number[];
  /** The precomp's layers that have motion in it, by name. */
  layers: string[];
}

/** The nested compositions placed in a composition, each with what its precomp animates. The parent shows the child's changes through this. */
export function nestedRows(doc: MotionDocument, compositionId: string): NestedRow[] {
  const comp = doc.compositions[compositionId];
  if (!comp) return [];
  return comp.nested.flatMap((n: NestedComposition) => {
    const child = doc.compositions[n.compositionId];
    if (!child) return [];
    const times = new Set<number>();
    const layerNames = new Set<string>();
    for (const placed of child.clips) {
      const clip = doc.clips[placed.clipId];
      if (!clip) continue;
      const bar = layerBar(child, clip.layerId);
      for (const track of clip.tracks) {
        if (track.keyframes.length > 0) layerNames.add(doc.layers[clip.layerId]?.name ?? clip.layerId);
        for (const k of track.keyframes) {
          const childTime = bar.start + (placed.offset + (clip.delay ?? 0) + k.time) * bar.stretch;
          const parentTime = n.start + childTime * n.stretch;
          if (parentTime >= n.in - 1e-9 && parentTime <= n.out + 1e-9) times.add(Math.round(parentTime * 1e6) / 1e6);
        }
      }
    }
    return [{ id: n.id, compositionId: n.compositionId, name: n.name ?? child.name, in: n.in, out: n.out, start: n.start, stretch: n.stretch, childDuration: child.duration, keyTimes: [...times].sort((a, b) => a - b), layers: [...layerNames] }];
  });
}
