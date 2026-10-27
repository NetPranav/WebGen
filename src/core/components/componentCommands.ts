/** Component commands (ROADMAP Phase 46, Law 20): Ctrl+Alt+K makes a component; the typed ones are what the panels and agents call. */

import { z } from "zod";
import { defineCommand, defineTypedCommand, type ContextKeys } from "../commands";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { useToolStore } from "../store/useToolStore";
import { addVariantProperty, exposeProperty, fillSlot, markSlot, removeProperty, setProperty, setVariant } from "./variantOps";
import { combineAsVariants, pushChanges, setComponentDescription } from "./componentExtras";
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
      args: z.object({ component: z.string(), parentId: z.string().nullable().optional(), x: z.number().optional(), y: z.number().optional(), variant: z.record(z.string(), z.string()).optional() }),
      run: ({ component, parentId, x, y, variant }) => ({ id: insertInstance(component, { parentId, at: x !== undefined && y !== undefined ? { x, y } : undefined, variant }) }),
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
    defineTypedCommand({
      id: "component.addVariantProperty",
      title: "Add Variant Property",
      category,
      args: z.object({ component: z.string(), name: z.string().min(1).max(60), values: z.array(z.string().min(1).max(60)).min(1).max(12) }),
      run: ({ component, name, values }) => ({ ok: addVariantProperty(component, name, values) }),
    }),
    defineTypedCommand({
      id: "component.setVariant",
      title: "Change Variant",
      category,
      args: z.object({ values: z.record(z.string(), z.string()), ids: z.array(z.string()).optional() }),
      run: ({ values, ids: only }) => ({ changed: setVariant(only ?? ids(), values) }),
    }),
    defineTypedCommand({
      id: "component.exposeProperty",
      title: "Expose Property",
      category,
      args: z.object({ kind: z.enum(["text", "image", "boolean", "instance"]), name: z.string().min(1).max(60).optional(), layer: z.string().optional() }),
      run: ({ kind, name, layer }) => ({ id: exposeProperty(layer ?? ids()[0] ?? "", kind, name) }),
    }),
    defineTypedCommand({ id: "component.removeProperty", title: "Remove Property", category, args: z.object({ component: z.string(), property: z.string() }), run: ({ component, property }) => ({ ok: removeProperty(component, property) }) }),
    defineTypedCommand({
      id: "component.setProperty",
      title: "Set Component Property",
      category,
      args: z.object({ property: z.string(), value: z.union([z.string().max(10000), z.boolean()]), id: z.string().optional() }),
      run: ({ property, value, id }) => ({ ok: setProperty(id ?? ids()[0] ?? "", property, value) }),
    }),
    defineTypedCommand({ id: "component.markSlot", title: "Make Slot", category, args: z.object({ on: z.boolean(), layer: z.string().optional() }), run: ({ on, layer }) => ({ ok: markSlot(layer ?? ids()[0] ?? "", on) }) }),
    defineTypedCommand({ id: "component.fillSlot", title: "Fill Slot", category, args: z.object({ slot: z.string(), ids: z.array(z.string()).optional() }), run: ({ slot, ids: only }) => ({ moved: fillSlot(slot, only ?? ids()) }) }),
    // FigCraft port F9
    defineTypedCommand({ id: "component.pushChanges", title: "Push Changes to Main Component", category, args: z.object({ ids: z.array(z.string()).optional() }).default({}), run: ({ ids: only }) => ({ pushed: pushChanges(only ?? ids()) }) }),
    defineTypedCommand({ id: "component.combineAsVariants", title: "Combine as Variants", category, args: z.object({ ids: z.array(z.string()).optional() }).default({}), run: ({ ids: only }) => ({ component: combineAsVariants(only ?? ids()) }) }),
    defineTypedCommand({ id: "component.setDescription", title: "Set Component Description", category, args: z.object({ component: z.string(), description: z.string().max(2000) }), run: ({ component, description }) => ({ ok: setComponentDescription(component, description) }) }),
    defineTypedCommand({ id: "component.delete", title: "Delete Component", category, args: z.object({ component: z.string() }), run: ({ component }) => ({ ok: deleteComponent(component) }) }),
  ];
  return () => offs.forEach((off) => off());
}
