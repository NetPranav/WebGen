/**
 * Dev Mode commands (FigCraft port F13, Law 20): inspect a layer (its properties for handoff and its CSS), annotations
 * and their categories, measurements kept on the canvas, the ready-for-development status and Compare changes.
 */

import { z } from "zod";
import { defineTypedCommand } from "../commands";
import { getDocument } from "../store/documentState";
import { getResolvedDocument } from "../store/useDocumentStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { worldBox } from "../editing/layerBoxes";
import { inspectLayer, layerCss } from "./inspect";
import { addAnnotation, addCategory, addMeasurement, compareChanges, devItems, removeAnnotation, removeCategory, removeMeasurement, setDevStatus, updateAnnotation } from "./devOps";

const first = () => useSelectionStore.getState().selectedIds[0] ?? "";
const sel = () => useSelectionStore.getState().selectedIds;
const annotation = z.object({ label: z.string().max(5000).optional(), properties: z.array(z.string().max(60)).max(40).optional(), category: z.string().max(64).optional() });

export function registerDevCommands(): () => void {
  const category = "Dev Mode";
  const offs = [
    defineTypedCommand({
      id: "inspect.properties",
      title: "Inspect Properties",
      category,
      args: z.object({ id: z.string().optional(), colorFormat: z.enum(["hex", "rgb", "css", "hsl", "hsb"]).optional(), unit: z.enum(["px", "rem"]).optional(), remBase: z.number().positive().max(100).optional() }).default({}),
      run: ({ id, ...options }) => {
        const target = id ?? first();
        const own = getDocument().layers[target];
        const resolved = getResolvedDocument().layers[target];
        const box = target ? worldBox(target) : null;
        return { sections: own && resolved ? inspectLayer(getDocument(), own, resolved, box ? { w: box.w, h: box.h } : undefined, options) : [] };
      },
    }),
    defineTypedCommand({
      id: "inspect.css",
      title: "Copy CSS",
      category,
      args: z.object({ id: z.string().optional() }).default({}),
      run: ({ id }) => {
        const target = id ?? first();
        const own = getDocument().layers[target];
        return { css: own ? layerCss(getDocument(), own, getResolvedDocument().layers) : "" };
      },
    }),
    defineTypedCommand({ id: "annotation.add", title: "Add Annotation", category, args: annotation.extend({ id: z.string().optional() }), run: ({ id, ...a }) => ({ index: addAnnotation(id ?? first(), a) }) }),
    defineTypedCommand({ id: "annotation.update", title: "Edit Annotation", category, args: annotation.extend({ id: z.string(), index: z.number().int().min(0) }), run: ({ id, index, ...a }) => ({ ok: updateAnnotation(id, index, a) }) }),
    defineTypedCommand({ id: "annotation.remove", title: "Remove Annotation", category, args: z.object({ id: z.string(), index: z.number().int().min(0) }), run: ({ id, index }) => ({ ok: removeAnnotation(id, index) }) }),
    defineTypedCommand({ id: "annotation.addCategory", title: "Add Annotation Category", category, args: z.object({ name: z.string().min(1).max(64), color: z.string().max(40).optional() }), run: ({ name, color }) => ({ id: addCategory(name, color) }) }),
    defineTypedCommand({ id: "annotation.removeCategory", title: "Remove Annotation Category", category, args: z.object({ category: z.string() }), run: ({ category: c }) => ({ ok: removeCategory(c) }) }),
    defineTypedCommand({
      id: "measurement.add",
      title: "Keep Measurement",
      category,
      args: z.object({ from: z.string().optional(), to: z.string().optional(), side: z.enum(["top", "right", "bottom", "left"]).optional() }).default({}),
      run: ({ from, to, side }) => {
        // with no ids: from the first selected layer to the second
        const [a, b] = sel();
        return { index: addMeasurement(from ?? a ?? "", to || side ? { to, side } : { to: b }) };
      },
    }),
    defineTypedCommand({ id: "measurement.remove", title: "Remove Measurement", category, args: z.object({ from: z.string(), index: z.number().int().min(0) }), run: ({ from, index }) => ({ ok: removeMeasurement(from, index) }) }),
    defineTypedCommand({
      id: "dev.setStatus",
      title: "Mark Ready for Development",
      category,
      args: z.object({ status: z.enum(["ready", "completed"]).nullable(), ids: z.array(z.string()).optional() }),
      run: ({ status, ids }) => ({ changed: setDevStatus(ids ?? sel(), status) }),
    }),
    defineTypedCommand({ id: "dev.compare", title: "Compare Changes", category, args: z.object({ id: z.string().optional() }).default({}), run: ({ id }) => ({ changes: compareChanges(id ?? first()) }) }),
    defineTypedCommand({ id: "dev.items", title: "Ready for Development", category, args: z.object({ status: z.enum(["ready", "completed"]).optional() }).default({}), run: ({ status }) => ({ items: devItems(getDocument(), status) }) }),
  ];
  return () => offs.forEach((off) => off());
}
