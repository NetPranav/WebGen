/**
 * Auto-layout commands (ROADMAP Phase 41, Law 20): Shift+A adds auto layout, Shift+Alt+A removes it; the typed
 * commands are what the inspector's controls and agents call.
 */

import { z } from "zod";
import { defineCommand, defineTypedCommand, type ContextKeys } from "../commands";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { useToolStore } from "../store/useToolStore";
import { addAutoLayout, removeAutoLayout, reorderInStack, setChildSizing, setStack } from "./layoutOps";

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
        justify: z.enum(["flex-start", "center", "flex-end", "space-between"]).optional(),
        align: z.enum(["flex-start", "center", "flex-end", "stretch"]).optional(),
        wrap: z.boolean().optional(),
        ids: z.array(z.string()).optional(),
      }),
      run: ({ ids: only, ...patch }) => ({ changed: setStack(only ?? ids(), patch) }),
    }),
    defineTypedCommand({
      id: "layout.setSizing",
      title: "Set Sizing",
      category,
      args: z.object({ horizontal: Sizing.optional(), vertical: Sizing.optional(), ids: z.array(z.string()).optional() }),
      run: ({ ids: only, ...patch }) => ({ changed: setChildSizing(only ?? ids(), patch) }),
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
