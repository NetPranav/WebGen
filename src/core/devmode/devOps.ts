/**
 * Dev Mode's own edits (FigCraft port F13), saved with the file and undoable:
 *
 * - **Annotations**: notes on a layer for developers, each with pinned properties (shown with their current values)
 *   and a category (Development, Interaction, Accessibility, Content, or the file's own, each with a colour).
 * - **Measurements**: kept on the canvas, from a layer to another or across one side of a layer, drawn from the
 *   layers' current bounds so they follow them; one whose other layer is gone is neither drawn nor listed.
 * - **Ready for development**: a frame or section marked ready keeps a snapshot of itself from that moment, and
 *   Compare changes lists what changed since, layer by layer (`width 120 → 136`, `fill #FF0000 → #E03030`).
 *
 * Behaviour translated from FigCraft (`crates/engine/src/annotations.rs`, `dev_measurements.rs`, `devcompare.rs`),
 * commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import type { Layer, MotionDocument } from "../document/schema";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { between, type MRect } from "../geometry/measureDistances";
import type { SpacingMark } from "../geometry/snap";
import { inspectLayer } from "./inspect";

const layers = () => getDocument().layers;
type Doc = MotionDocument & { annotationCategories?: AnnotationCategory[] };

// --- annotations ---------------------------------------------------------------------------------

export interface Annotation {
  label?: string;
  properties?: string[];
  category?: string;
}
export interface AnnotationCategory {
  id: string;
  name: string;
  color: string;
}

export const MAX_ANNOTATIONS = 64;
export const DEFAULT_CATEGORIES: readonly AnnotationCategory[] = [
  { id: "development", name: "Development", color: "#2F6FEB" },
  { id: "interaction", name: "Interaction", color: "#8A4FE0" },
  { id: "accessibility", name: "Accessibility", color: "#1E9E6A" },
  { id: "content", name: "Content", color: "#D97A06" },
];
/** The colours offered for categories (the defaults take the first four). */
export const CATEGORY_COLORS = ["#2F6FEB", "#8A4FE0", "#1E9E6A", "#D97A06", "#D63A3A", "#D13F9B", "#0E9AA7", "#6B7280"];

/** The properties an annotation can pin, by id, with their label. */
export const PINNABLE: readonly (readonly [string, string])[] = [
  ["width", "Width"],
  ["height", "Height"],
  ["radius", "Radius"],
  ["opacity", "Opacity"],
  ["gap", "Gap"],
  ["padding", "Padding"],
  ["font", "Font"],
  ["fontSize", "Size"],
  ["lineHeight", "Line height"],
  ["fill", "Fills"],
  ["stroke", "Strokes"],
  ["effects", "Effects"],
];

export const categoriesOf = (doc: Pick<Doc, "annotationCategories">): readonly AnnotationCategory[] => doc.annotationCategories ?? DEFAULT_CATEGORIES;

/** The category named by `key`: its id, else its name (any case). */
export function findCategory(list: readonly AnnotationCategory[], key: string): AnnotationCategory | undefined {
  const k = key.trim();
  return list.find((c) => c.id === k) ?? list.find((c) => c.name.toLowerCase() === k.toLowerCase());
}

const cleanAnnotation = (a: Annotation, cats: readonly AnnotationCategory[]): Annotation | null => {
  const label = (a.label ?? "").slice(0, 5000);
  const properties = [...new Set((a.properties ?? []).filter((p) => typeof p === "string").map((p) => p.slice(0, 60)))].slice(0, 40);
  const category = a.category ? findCategory(cats, a.category)?.id : undefined;
  if (!label.trim() && properties.length === 0) return null;
  return { ...(label.trim() ? { label } : {}), ...(properties.length ? { properties } : {}), ...(category ? { category } : {}) };
};

/** Adds an annotation to a layer. Returns its index, or null (nothing to note, too many, no such layer). */
export function addAnnotation(id: string, a: Annotation): number | null {
  const l = layers()[id];
  const clean = cleanAnnotation(a, categoriesOf(getDocument() as Doc));
  if (!l || !clean || (l.annotations?.length ?? 0) >= MAX_ANNOTATIONS) return null;
  const index = l.annotations?.length ?? 0;
  documentCommands.mutate("Add annotation", (d) => {
    (d.layers[id].annotations ??= []).push(clean);
  });
  return index;
}

export function updateAnnotation(id: string, index: number, patch: Annotation): boolean {
  const l = layers()[id];
  const cur = l?.annotations?.[index];
  if (!cur) return false;
  const clean = cleanAnnotation({ ...cur, ...patch }, categoriesOf(getDocument() as Doc));
  documentCommands.mutate("Edit annotation", (d) => {
    const list = d.layers[id].annotations!;
    if (clean) list[index] = clean;
    else list.splice(index, 1);
    if (list.length === 0) delete d.layers[id].annotations;
  });
  return true;
}

export function removeAnnotation(id: string, index: number): boolean {
  if (!layers()[id]?.annotations?.[index]) return false;
  documentCommands.mutate("Remove annotation", (d) => {
    d.layers[id].annotations!.splice(index, 1);
    if (d.layers[id].annotations!.length === 0) delete d.layers[id].annotations;
  });
  return true;
}

/** Adds a category (its colour the next unused one unless given). Returns its id. */
export function addCategory(name: string, color?: string): string | null {
  const doc = getDocument() as Doc;
  const list = categoriesOf(doc);
  const n = name.trim().slice(0, 64);
  if (!n || list.length >= 64 || findCategory(list, n)) return null;
  let id = n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "category";
  for (let k = 2; list.some((c) => c.id === id); k++) id = `${id.replace(/-\d+$/, "")}-${k}`;
  const used = new Set(list.map((c) => c.color.toUpperCase()));
  const c = color ?? CATEGORY_COLORS.find((x) => !used.has(x)) ?? CATEGORY_COLORS[list.length % CATEGORY_COLORS.length];
  documentCommands.mutate("Add annotation category", (d) => {
    (d as Doc).annotationCategories = [...categoriesOf(d as Doc), { id, name: n, color: c }];
  });
  return id;
}

/** Removes a category; annotations in it become uncategorised. */
export function removeCategory(key: string): boolean {
  const list = categoriesOf(getDocument() as Doc);
  const c = findCategory(list, key);
  if (!c) return false;
  documentCommands.mutate("Remove annotation category", (d) => {
    (d as Doc).annotationCategories = list.filter((x) => x.id !== c.id);
    for (const l of Object.values(d.layers)) for (const a of l.annotations ?? []) if (a.category === c.id) delete a.category;
  });
  return true;
}

/** Every annotated layer, in document order (at most 2,000). */
export function annotatedLayers(doc: Pick<MotionDocument, "layers">): { id: string; name: string; annotations: Annotation[] }[] {
  return Object.values(doc.layers)
    .filter((l) => l.annotations && l.annotations.length > 0)
    .slice(0, 2000)
    .map((l) => ({ id: l.id, name: l.name, annotations: l.annotations as Annotation[] }));
}

// --- measurements -------------------------------------------------------------------------------------

export interface Measurement {
  to?: string;
  side?: "top" | "right" | "bottom" | "left";
}

/** Keeps a measurement from layer `from`: to layer `to`, or across `side` of `from`. Returns its index, or null. */
export function addMeasurement(from: string, m: Measurement): number | null {
  const L = layers();
  if (!L[from] || (m.to && (!L[m.to] || m.to === from)) || (!m.to && !m.side) || (L[from].measurements?.length ?? 0) >= 64) return null;
  if (L[from].measurements?.some((x) => x.to === m.to && x.side === m.side)) return null;
  const index = L[from].measurements?.length ?? 0;
  documentCommands.mutate("Add measurement", (d) => {
    (d.layers[from].measurements ??= []).push(m.to ? { to: m.to } : { side: m.side });
  });
  return index;
}

export function removeMeasurement(from: string, index: number): boolean {
  if (!layers()[from]?.measurements?.[index]) return false;
  documentCommands.mutate("Remove measurement", (d) => {
    d.layers[from].measurements!.splice(index, 1);
    if (d.layers[from].measurements!.length === 0) delete d.layers[from].measurements;
  });
  return true;
}

/**
 * The measurements to draw, from the layers' current page boxes (`boxOf`): between two layers as Alt-hover measures,
 * or across one side of a layer (its width along the top or bottom, its height along a side). A measurement whose
 * other layer is gone is left out.
 */
export function placedMeasurements(doc: Pick<MotionDocument, "layers">, boxOf: (id: string) => MRect | null): { from: string; index: number; marks: SpacingMark[] }[] {
  const out: { from: string; index: number; marks: SpacingMark[] }[] = [];
  for (const l of Object.values(doc.layers)) {
    (l.measurements ?? []).forEach((m, index) => {
      if (out.length >= 2000) return;
      const a = boxOf(l.id);
      if (!a) return;
      if (m.to) {
        const b = doc.layers[m.to] ? boxOf(m.to) : null;
        if (b) out.push({ from: l.id, index, marks: between(a, b) });
        return;
      }
      const w = Math.round((a.x1 - a.x0) * 100) / 100;
      const h = Math.round((a.y1 - a.y0) * 100) / 100;
      const mark: SpacingMark =
        m.side === "top" || m.side === "bottom" ? { axis: "x", from: a.x0, to: a.x1, at: m.side === "top" ? a.y0 : a.y1, value: w } : { axis: "y", from: a.y0, to: a.y1, at: m.side === "left" ? a.x0 : a.x1, value: h };
      out.push({ from: l.id, index, marks: [mark] });
    });
  }
  return out;
}

// --- ready for development, and compare changes ----------------------------------------------------------

export type DevStatus = "ready" | "completed";

/** The layer and everything under it, as stored (for a snapshot). */
function subtree(L: Record<string, Layer>, id: string): Record<string, Layer> {
  const out: Record<string, Layer> = {};
  const stack = [id];
  while (stack.length > 0 && Object.keys(out).length < 20_000) {
    const l = L[stack.pop()!];
    if (!l || out[l.id]) continue;
    out[l.id] = structuredClone({ ...l, devStatus: undefined });
    stack.push(...l.children);
  }
  return out;
}

/** Marks frames or sections ready for development or completed (null clears it). A ready one keeps its snapshot from that moment. */
export function setDevStatus(ids: readonly string[], status: DevStatus | null): number {
  const L = layers();
  const targets = ids.filter((id) => L[id] && (L[id].archetype === "container" || L[id].archetype === "form"));
  if (targets.length === 0) return 0;
  documentCommands.mutate(status ? "Mark ready for development" : "Clear dev status", (d) => {
    for (const id of targets) {
      const l = d.layers[id];
      if (!status) delete l.devStatus;
      else if (l.devStatus?.status !== status || !l.devStatus.snapshot) l.devStatus = { status, since: Date.now(), snapshot: JSON.stringify(subtree(L, id)) };
    }
  });
  return targets.length;
}

export interface PropChange {
  section: string;
  property: string;
  before: string;
  after: string;
  /** `width 120 → 136`. */
  text: string;
}
export interface LayerChange {
  id: string;
  name: string;
  kind: "added" | "removed" | "changed";
  changes: PropChange[];
}

/** Inspect's rows of a layer as `section:label` → value. */
function rows(doc: Pick<MotionDocument, "variables" | "styles">, l: Layer): Map<string, [string, string, string]> {
  const out = new Map<string, [string, string, string]>();
  for (const s of inspectLayer(doc, l, l)) {
    const seen = new Map<string, number>();
    for (const r of s.rows) {
      const n = (seen.get(r.label) ?? 0) + 1;
      seen.set(r.label, n);
      out.set(`${s.title}:${r.label}#${n}`, [s.title, r.label.toLowerCase(), r.value]);
    }
  }
  if (l.archetype === "text") out.set("Content:text#1", ["Content", "text", String(l.properties["content.text"] ?? "").slice(0, 60)]);
  out.set("Layer:name#1", ["Layer", "name", l.name]);
  return out;
}

/**
 * What changed in a frame or section since it was marked ready (or since `since`, a snapshot of it): layers added and
 * removed (matched by id), and for the others the properties that differ, formatted as Inspect shows them.
 */
export function compareChanges(id: string, since?: Record<string, Layer>): LayerChange[] | null {
  const doc = getDocument();
  const l = doc.layers[id];
  if (!l) return null;
  let before = since;
  if (!before) {
    try {
      before = l.devStatus?.snapshot ? (JSON.parse(l.devStatus.snapshot) as Record<string, Layer>) : undefined;
    } catch {
      before = undefined;
    }
  }
  if (!before) return null;
  const now = subtree(doc.layers, id);
  const out: LayerChange[] = [];
  const ids = [...new Set([...Object.keys(before), ...Object.keys(now)])];
  for (const lid of ids) {
    if (out.length >= 2000) break;
    const a = before[lid];
    const b = now[lid];
    if (!a && b) out.push({ id: lid, name: b.name, kind: "added", changes: [] });
    else if (a && !b) out.push({ id: lid, name: a.name, kind: "removed", changes: [] });
    else if (a && b) {
      const ra = rows(doc, a);
      const rb = rows(doc, b);
      const changes: PropChange[] = [];
      for (const key of new Set([...ra.keys(), ...rb.keys()])) {
        const x = ra.get(key);
        const y = rb.get(key);
        if (x?.[2] === y?.[2]) continue;
        const [section, property] = (y ?? x)!;
        const before = x?.[2] ?? "none";
        const after = y?.[2] ?? "none";
        changes.push({ section, property, before, after, text: `${property} ${before} → ${after}` });
      }
      if (changes.length > 0) out.push({ id: lid, name: b.name, kind: "changed", changes });
    }
  }
  return out;
}

/** The frames and sections with a status, for Dev Mode's list of what's ready. */
export const devItems = (doc: Pick<MotionDocument, "layers">, status?: DevStatus): { id: string; name: string; status: DevStatus }[] =>
  Object.values(doc.layers)
    .filter((l) => l.devStatus && (!status || l.devStatus.status === status))
    .map((l) => ({ id: l.id, name: l.name, status: l.devStatus!.status }));
