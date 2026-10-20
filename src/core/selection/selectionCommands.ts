/**
 * Selection commands (ROADMAP Phase 26, Law 20): select all, none, inverse, children, parent, and set the selection
 * outright (what an agent calls). Keyboard shortcuts apply while the canvas has focus. They read and write the one
 * selection store that the canvas, the inspector and the status bar share.
 */

import { useDraftPathStore } from "../store/useDraftPathStore";
import { editableTextSelection } from "../text/textCommands";
import { z } from "zod";
import { defineCommand, defineTypedCommand, type ContextKeys } from "../commands";
import { getDocument } from "../store/documentState";
import { useSelectionStore } from "../store/useSelectionStore";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useToolStore } from "../store/useToolStore";
import { selectAll, selectChildren, selectInverse, selectParents } from "./selectionOps";

const onCanvas = (ctx: ContextKeys) => ctx.canvasFocus && !ctx.textEditing;

function apply(ids: string[]): { ids: string[] } {
  const store = useSelectionStore.getState();
  store.selectMultiple(ids, "element");
  return { ids: useSelectionStore.getState().selectedIds };
}

const current = () => useSelectionStore.getState().selectedIds;
const layers = () => getDocument().layers;
const activeFrame = () => useCanvasViewStore.getState().activeFrameId;

export function registerSelectionCommands(): () => void {
  const category = "Selection";
  const offs = [
    defineCommand({ id: "selection.all", title: "Select All", category, keybinding: "Ctrl+A", when: onCanvas, run: () => void apply(selectAll(layers(), current(), activeFrame())) }),
    defineCommand({ id: "selection.none", title: "Select None", category, keybinding: "Escape", when: (ctx) => onCanvas(ctx) && current().length > 0 && !useToolStore.getState().gesturing && useDraftPathStore.getState().kind !== "pen", run: () => void useSelectionStore.getState().clearSelection() }),
    defineCommand({ id: "selection.inverse", title: "Invert Selection", category, keybinding: "Ctrl+Shift+A", when: onCanvas, run: () => void apply(selectInverse(layers(), current(), activeFrame())) }),
    defineCommand({ id: "selection.children", title: "Select Children", category, keybinding: "Enter", when: (ctx) => onCanvas(ctx) && current().length > 0 && editableTextSelection() === null, run: () => void apply(selectChildren(layers(), current())) }),
    defineCommand({ id: "selection.parent", title: "Select Parent", category, keybinding: "Shift+Enter", when: (ctx) => onCanvas(ctx) && current().length > 0, run: () => void apply(selectParents(layers(), current())) }),
    defineTypedCommand({
      id: "selection.set",
      title: "Set Selection",
      category,
      args: z.object({ ids: z.array(z.string()) }),
      run: ({ ids }) => {
        const known = ids.filter((id) => layers()[id]);
        return apply(known);
      },
    }),
  ];
  return () => offs.forEach((off) => off());
}
