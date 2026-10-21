/** Token commands (ROADMAP Phase 45, Law 20): what the token manager, the inspector and agents call. */

import { z } from "zod";
import { defineTypedCommand } from "../commands";
import type { PropValue } from "../document/registry";
import { useSelectionStore } from "../store/useSelectionStore";
import { addMode, applyStyle, bindVariable, createStyle, createVariable, deleteStyle, deleteVariable, detachBinding, detachStyle, removeMode, setActiveMode, unbind, updateStyle, updateVariable } from "./tokenOps";

const sel = () => useSelectionStore.getState().selectedIds;
const Value = z.union([z.string().max(200), z.number()]);
const Values = z.record(z.string(), Value);

export function registerTokenCommands(): () => void {
  const category = "Tokens";
  const offs = [
    defineTypedCommand({ id: "token.setMode", title: "View Mode", category, args: z.object({ id: z.string().nullable() }), run: ({ id }) => ({ ok: setActiveMode(id) }) }),
    defineTypedCommand({ id: "token.addMode", title: "Add Mode", category, args: z.object({ name: z.string().min(1).max(40) }), run: ({ name }) => ({ id: addMode(name) }) }),
    defineTypedCommand({ id: "token.removeMode", title: "Remove Mode", category, args: z.object({ id: z.string() }), run: ({ id }) => ({ ok: removeMode(id) }) }),
    defineTypedCommand({
      id: "token.createVariable",
      title: "Create Variable",
      category,
      args: z.object({ name: z.string().min(1).max(120), type: z.enum(["color", "number"]), values: Values }),
      run: ({ name, type, values }) => ({ id: createVariable(name, type, values) }),
    }),
    defineTypedCommand({
      id: "token.updateVariable",
      title: "Change Variable",
      category,
      args: z.object({ id: z.string(), name: z.string().min(1).max(120).optional(), values: Values.optional() }),
      run: ({ id, ...patch }) => ({ ok: updateVariable(id, patch) }),
    }),
    defineTypedCommand({ id: "token.deleteVariable", title: "Delete Variable", category, args: z.object({ id: z.string() }), run: ({ id }) => ({ ok: deleteVariable(id) }) }),
    defineTypedCommand({
      id: "token.bind",
      title: "Bind to Variable",
      category,
      args: z.object({ path: z.string().min(1).max(120), variable: z.string(), ids: z.array(z.string()).optional() }),
      run: ({ path, variable, ids }) => ({ changed: bindVariable(ids ?? sel(), path, variable) }),
    }),
    defineTypedCommand({
      id: "token.detach",
      title: "Detach from Variable",
      category,
      args: z.object({ path: z.string().min(1).max(120), ids: z.array(z.string()).optional() }),
      run: ({ path, ids }) => ({ changed: detachBinding(ids ?? sel(), path) }),
    }),
    defineTypedCommand({
      id: "token.unbind",
      title: "Remove Binding",
      category,
      args: z.object({ path: z.string().min(1).max(120), ids: z.array(z.string()).optional() }),
      run: ({ path, ids }) => ({ changed: unbind(ids ?? sel(), path) }),
    }),
    defineTypedCommand({
      id: "style.create",
      title: "Create Style",
      category,
      args: z.object({ kind: z.enum(["text", "effect"]), name: z.string().min(1).max(120), from: z.string().optional() }),
      run: ({ kind, name, from }) => ({ id: createStyle(kind, name, from ?? sel()[0] ?? "") }),
    }),
    defineTypedCommand({
      id: "style.update",
      title: "Change Style",
      category,
      args: z.object({ id: z.string(), name: z.string().min(1).max(120).optional(), props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() }),
      run: ({ id, name, props }) => ({ ok: updateStyle(id, { name, props: props as Record<string, PropValue> | undefined }) }),
    }),
    defineTypedCommand({
      id: "style.apply",
      title: "Apply Style",
      category,
      args: z.object({ id: z.string(), ids: z.array(z.string()).optional() }),
      run: ({ id, ids }) => ({ changed: applyStyle(ids ?? sel(), id) }),
    }),
    defineTypedCommand({
      id: "style.detach",
      title: "Detach Style",
      category,
      args: z.object({ kind: z.enum(["text", "effect"]), ids: z.array(z.string()).optional() }),
      run: ({ kind, ids }) => ({ changed: detachStyle(ids ?? sel(), kind) }),
    }),
    defineTypedCommand({ id: "style.delete", title: "Delete Style", category, args: z.object({ id: z.string() }), run: ({ id }) => ({ ok: deleteStyle(id) }) }),
  ];
  return () => offs.forEach((off) => off());
}
