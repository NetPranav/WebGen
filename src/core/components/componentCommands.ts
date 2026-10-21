/** Component commands (ROADMAP Phase 46, Law 20): Ctrl+Alt+K makes a component; the typed ones are what the panels and agents call. */

import { z } from "zod";
import { defineCommand, defineTypedCommand, type ContextKeys } from "../commands";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { useToolStore } from "../store/useToolStore";
import { createComponent, deleteComponent, detachInstances, goToMain, insertInstance, renameComponent, resetOverrides, swapInstance } from "./componentOps";

const ids = () => useSelectionStore.getState().selectedIds;
const onSelection = (ctx: ContextKeys) => ctx.canvasFocus && !ctx.textEditing && ids().length > 0 && !useToolStore.getState().gesturing && useCanvasViewStore.getState().mode === "design";

export function registerComponentCommands(): () => void {
  const category = "Components";
  const offs = [
    defineCommand({ id: "component.create", title: "Create Component", category, keybinding: "Ctrl+Alt+K", when: onSelection, run: () => void createComponent(ids()) }),
    defineTypedCommand({ id: "component.createFrom", title: "Create Component From Layers", category, args: z.object({ ids: z.array(z.string()).optional(), name: z.string().min(1).max(120).optional() }), run: ({ ids: only, name }) => ({ id: createComponent(only ?? ids(), name) }) }),
    defineTypedCommand({
      id: "component.insert",
      title: "Insert Instance",
      category,
      args: z.object({ component: z.string(), parentId: z.string().nullable().optional(), x: z.number().optional(), y: z.number().optional() }),
      run: ({ component, parentId, x, y }) => ({ id: insertInstance(component, { parentId, at: x !== undefined && y !== undefined ? { x, y } : undefined }) }),
    }),
    defineTypedCommand({
      id: "component.resetOverrides",
      title: "Reset Overrides",
      category,
      args: z.object({ ids: z.array(z.string()).optional(), keys: z.array(z.string()).optional() }),
      run: ({ ids: only, keys }) => ({ changed: resetOverrides(only ?? ids(), keys) }),
    }),
    defineTypedCommand({ id: "component.detach", title: "Detach Instance", category, args: z.object({ ids: z.array(z.string()).optional() }), run: ({ ids: only }) => ({ changed: detachInstances(only ?? ids()) }) }),
    defineTypedCommand({
      id: "component.swap",
      title: "Swap Instance",
      category,
      args: z.object({ component: z.string(), id: z.string().optional() }),
      run: ({ component, id }) => ({ id: swapInstance(id ?? ids()[0] ?? "", component) }),
    }),
    defineTypedCommand({ id: "component.goToMain", title: "Go to Main Component", category, args: z.object({ id: z.string().optional() }), run: ({ id }) => ({ id: goToMain(id ?? ids()[0] ?? "") }) }),
    defineTypedCommand({ id: "component.rename", title: "Rename Component", category, args: z.object({ component: z.string(), name: z.string().min(1).max(120) }), run: ({ component, name }) => ({ ok: renameComponent(component, name) }) }),
    defineTypedCommand({ id: "component.delete", title: "Delete Component", category, args: z.object({ component: z.string() }), run: ({ component }) => ({ ok: deleteComponent(component) }) }),
  ];
  return () => offs.forEach((off) => off());
}
