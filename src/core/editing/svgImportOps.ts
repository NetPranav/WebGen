/**
 * Placing an SVG as an editable design (FigCraft port F14): the plan of `planSvgImport` becomes layers, a frame named
 * after the file holding the file's groups and shapes, each in its parent's space, everything scaled by `scale`, in
 * one undo step. The notes say what was left out.
 */

import type { Layer } from "../document/schema";
import type { PropValue } from "../document/registry";
import { createLayer } from "../document/factories";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { planSvgImport, type PlanLayer } from "../paths/svgImport";
import { scaleProps } from "./scaleLayers";

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Imports an SVG as a frame of editable layers in `parent` (its top-left at `at`, in the parent's space), scaled by
 * `scale`. Returns the frame's id and the notes, or null when the file can't be read or draws nothing.
 */
export function importSvgDesign(text: string, parentId: string | null, at: { x: number; y: number }, scale = 1, name = "SVG"): { frame: string; notes: string[] } | null {
  const plan = planSvgImport(text);
  if (!plan || plan.layers.length === 0) return null;
  if (parentId !== null && !getDocument().layers[parentId]) return null;
  const k = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const out: Layer[] = [];
  const make = (p: PlanLayer, parent: string, origin: { x: number; y: number }): string => {
    const { __hidden, ...props } = p.properties;
    const box = { x: p.box.x * k, y: p.box.y * k, w: Math.max(1, p.box.w * k), h: Math.max(1, p.box.h * k) };
    const base = createLayer({ archetype: p.archetype, parentId: parent, name: p.name.slice(0, 120) || "Layer", properties: {} });
    const scaled: Record<string, PropValue> = k === 1 ? props : { ...props, ...scaleProps({ ...base, properties: props } as Layer, k) };
    const layer: Layer = {
      ...base,
      ...(__hidden ? { visible: false } : {}),
      properties: { ...base.properties, ...scaled, positioning: "absolute", "frame.x": r2(box.x - origin.x), "frame.y": r2(box.y - origin.y), "frame.width": r2(box.w), "frame.height": r2(box.h), ...(p.archetype === "text" ? {} : { "sizing.horizontal": "fixed", "sizing.vertical": "fixed" }) },
      children: [],
    };
    out.push(layer);
    layer.children = p.children.map((c) => make(c, layer.id, { x: box.x, y: box.y }));
    return layer.id;
  };
  const frame = createLayer({
    archetype: "container",
    parentId,
    name: name.replace(/\.svg$/i, "").slice(0, 120) || "SVG",
    properties: { positioning: "absolute", "frame.x": r2(at.x), "frame.y": r2(at.y), "frame.width": r2(plan.width * k), "frame.height": r2(plan.height * k), "layout.padding": 0, "layout.gap": 0, "appearance.background.color": "transparent", "sizing.horizontal": "fixed", "sizing.vertical": "fixed" },
  });
  out.push(frame);
  frame.children = plan.layers.map((p) => make(p, frame.id, { x: 0, y: 0 }));
  // the frame first, then everything in it in order
  documentCommands.insertLayers([frame, ...out.filter((l) => l !== frame)], [], "Import SVG");
  useSelectionStore.getState().select(frame.id, "element");
  return { frame: frame.id, notes: plan.notes };
}
