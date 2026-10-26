/**
 * Auto-layout commands (ROADMAP Phase 41, Law 20): Shift+A adds auto layout, Shift+Alt+A removes it; the typed
 * commands are what the inspector's controls and agents call.
 */

import { serializeLayoutGrids } from "../layout/layoutGrids";
import { setLayerProps } from "./editOps";
import { getDocument } from "../store/documentState";
import { z } from "zod";
import { defineCommand, defineTypedCommand, type ContextKeys } from "../commands";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { useToolStore } from "../store/useToolStore";
import { CONSTRAINTS } from "../layout/constraints";
import { addAutoLayout, addGridLayout, removeAutoLayout, removeGridLayout, reorderInStack, setChildSizing, setConstraints, setGrid, setGridCell, setStack } from "./layoutOps";

const ids = () => useSelectionStore.getState().selectedIds;
const onSelection = (ctx: ContextKeys) =>
  ctx.canvasFocus && !ctx.textEditing && ids().length > 0 && !useToolStore.getState().gesturing && useCanvasViewStore.getState().mode === "design";

const Direction = z.enum(["row", "column"]);
const Sizing = z.enum(["fixed", "hug", "fill"]);

export function registerLayoutCommands(): () => void {
  const category = "Layout";
  const offs = [
    defineCommand({ id: "layout.addAuto", title: "Add Auto Layout", category, keybinding: "Shift+A", when: onSelection, run: () => void addAutoLayout(ids()) }),
    defineCommand({ id: "layout.removeAuto", title: "Remove Auto Layout", category, keybinding: "Alt+Shift+A", when: onSelection, run: () => void removeAutoLayout(ids()) }),
    defineTypedCommand({
      id: "layout.setStack",
      title: "Set Auto Layout",
      category,
      args: z.object({
        direction: Direction.optional(),
        gap: z.number().min(0).max(1000).optional(),
        padding: z.union([z.number().min(0).max(1000), z.object({ top: z.number().min(0).max(1000).optional(), right: z.number().min(0).max(1000).optional(), bottom: z.number().min(0).max(1000).optional(), left: z.number().min(0).max(1000).optional() })]).optional(),
        justify: z.enum(["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]).optional(),
        align: z.enum(["flex-start", "center", "flex-end", "stretch", "baseline"]).optional(),
        alignContent: z.enum(["auto", "space-between"]).optional(),
        strokesIncluded: z.boolean().optional(),
        reverseZ: z.boolean().optional(),
        wrap: z.boolean().optional(),
        ids: z.array(z.string()).optional(),
      }),
      run: ({ ids: only, ...patch }) => ({ changed: setStack(only ?? ids(), patch) }),
    }),
    // FigCraft port F6: layout grids on frames (editor guides)
    defineTypedCommand({
      id: "layout.setLayoutGrids",
      title: "Set Layout Grids",
      category,
      args: z.object({
        ids: z.array(z.string()).optional(),
        grids: z.array(z.object({ kind: z.enum(["grid", "columns", "rows"]), size: z.number().min(0).max(10_000), count: z.number().int().min(0).max(500), gutter: z.number().min(0).max(10_000), offset: z.number().min(0).max(10_000), align: z.enum(["stretch", "min", "center", "max"]), color: z.string().max(64), visible: z.boolean() })).max(16),
      }),
      run: ({ ids: only, grids }) => ({ changed: setLayerProps((only ?? ids()).filter((id) => getDocument().layers[id]?.archetype === "container"), { "frame.layoutGrids": serializeLayoutGrids(grids) }, "Layout grids") }),
    }),
    defineTypedCommand({
      id: "layout.setSizing",
      title: "Set Sizing",
      category,
      args: z.object({ horizontal: Sizing.optional(), vertical: Sizing.optional(), ids: z.array(z.string()).optional() }),
      run: ({ ids: only, ...patch }) => ({ changed: setChildSizing(only ?? ids(), patch) }),
    }),
    defineCommand({ id: "layout.addGrid", title: "Add Grid Layout", category, when: onSelection, run: () => void addGridLayout(ids()) }),
    defineCommand({ id: "layout.removeGrid", title: "Remove Grid Layout", category, when: onSelection, run: () => void removeGridLayout(ids()) }),
    defineTypedCommand({
      id: "layout.setGrid",
      title: "Set Grid",
      category,
      args: z.object({
        columns: z.number().int().min(1).max(200).optional(),
        rows: z.number().int().min(1).max(200).optional(),
        columnsTemplate: z.string().max(200).regex(/^[\w\s.,()%-]*$/).optional(),
        rowsTemplate: z.string().max(200).regex(/^[\w\s.,()%-]*$/).optional(),
        columnGap: z.number().min(0).max(1000).optional(),
        rowGap: z.number().min(0).max(1000).optional(),
        padding: z.number().min(0).max(1000).optional(),
        ids: z.array(z.string()).optional(),
      }),
      run: ({ ids: only, ...patch }) => ({ changed: setGrid(only ?? ids(), patch) }),
    }),
    defineTypedCommand({
      id: "layout.setGridCell",
      title: "Set Grid Cell",
      category,
      args: z.object({ columnStart: z.number().int().min(0).max(200).optional(), columnSpan: z.number().int().min(1).max(200).optional(), rowStart: z.number().int().min(0).max(200).optional(), rowSpan: z.number().int().min(1).max(200).optional(), ids: z.array(z.string()).optional() }),
      run: ({ ids: only, ...patch }) => ({ changed: setGridCell(only ?? ids(), patch) }),
    }),
    defineTypedCommand({
      id: "layout.setConstraints",
      title: "Set Constraints",
      category,
      args: z.object({ horizontal: z.enum(CONSTRAINTS as unknown as [string, ...string[]]).optional(), vertical: z.enum(CONSTRAINTS as unknown as [string, ...string[]]).optional(), ids: z.array(z.string()).optional() }),
      run: ({ ids: only, horizontal, vertical }) => ({ changed: setConstraints(only ?? ids(), { horizontal: horizontal as never, vertical: vertical as never }) }),
    }),
    defineTypedCommand({
      id: "layout.reorder",
      title: "Move Within Auto Layout",
      category,
      args: z.object({ id: z.string(), index: z.number().int().min(0) }),
      run: ({ id, index }) => ({ ok: reorderInStack(id, index) }),
    }),
  ];
  return () => offs.forEach((off) => off());
}
