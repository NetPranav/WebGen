/**
 * Token commands (ROADMAP Phase 45, Law 20): what the token manager, the inspector and agents call. FigCraft port F10
 * adds string and boolean variables, aliases, scopes, descriptions and code syntax, collections and per-frame modes,
 * and paint and grid styles in slots.
 */

import { z } from "zod";
import { defineTypedCommand } from "../commands";
import type { PropValue } from "../document/registry";
import { useSelectionStore } from "../store/useSelectionStore";
import {
  addMode,
  applyStyle,
  bindVariable,
  createCollection,
  createStyle,
  createVariable,
  deleteCollection,
  deleteStyle,
  deleteVariable,
  detachBinding,
  detachStyle,
  moveMode,
  moveVariable,
  removeMode,
  renameCollection,
  renameMode,
  setActiveMode,
  setAlias,
  setLayerMode,
  unbind,
  updateStyle,
  updateVariable,
} from "./tokenOps";
import { getDocument } from "../store/documentState";
import { collectionsOf } from "./tokens";
import { exportVariablesCss, exportVariablesJson, importVariablesJson } from "./variablesIO";

const sel = () => useSelectionStore.getState().selectedIds;
const Value = z.union([z.string().max(2000), z.number(), z.boolean(), z.object({ alias: z.string() })]);
const Values = z.record(z.string(), Value);
const Type = z.enum(["color", "number", "string", "boolean"]);
const Kind = z.enum(["text", "effect", "paint", "grid"]);
const Slot = z.enum(["text", "effect", "fill", "stroke", "grid"]);

export function registerTokenCommands(): () => void {
  const category = "Tokens";
  const offs = [
    defineTypedCommand({ id: "token.setMode", title: "View Mode", category, args: z.object({ id: z.string().nullable() }), run: ({ id }) => ({ ok: setActiveMode(id) }) }),
    defineTypedCommand({ id: "token.addMode", title: "Add Mode", category, args: z.object({ name: z.string().min(1).max(40), collection: z.string().optional(), from: z.string().optional() }), run: ({ name, collection, from }) => ({ id: addMode(name, collection, from) }) }),
    defineTypedCommand({ id: "token.moveMode", title: "Move Mode", category, args: z.object({ id: z.string(), to: z.number().int(), collection: z.string().optional() }), run: ({ id, to, collection }) => ({ ok: moveMode(id, to, collection) }) }),
    defineTypedCommand({ id: "token.removeMode", title: "Remove Mode", category, args: z.object({ id: z.string(), collection: z.string().optional() }), run: ({ id, collection }) => ({ ok: removeMode(id, collection) }) }),
    defineTypedCommand({ id: "token.renameMode", title: "Rename Mode", category, args: z.object({ id: z.string(), name: z.string().min(1).max(40), collection: z.string().optional() }), run: ({ id, name, collection }) => ({ ok: renameMode(id, name, collection) }) }),
    defineTypedCommand({ id: "token.createCollection", title: "Create Variable Collection", category, args: z.object({ name: z.string().min(1).max(60), modes: z.array(z.string().max(40)).max(8).optional() }), run: ({ name, modes }) => ({ id: createCollection(name, modes) }) }),
    defineTypedCommand({ id: "token.renameCollection", title: "Rename Variable Collection", category, args: z.object({ id: z.string(), name: z.string().min(1).max(60) }), run: ({ id, name }) => ({ ok: renameCollection(id, name) }) }),
    defineTypedCommand({ id: "token.deleteCollection", title: "Delete Variable Collection", category, args: z.object({ id: z.string() }), run: ({ id }) => ({ ok: deleteCollection(id) }) }),
    defineTypedCommand({ id: "token.moveVariable", title: "Move Variable to Collection", category, args: z.object({ id: z.string(), collection: z.string() }), run: ({ id, collection }) => ({ ok: moveVariable(id, collection) }) }),
    defineTypedCommand({
      id: "token.setLayerMode",
      title: "Set Variable Mode on Frame",
      category,
      args: z.object({ collection: z.string(), mode: z.string().nullable(), ids: z.array(z.string()).optional() }),
      run: ({ collection, mode, ids }) => ({ changed: setLayerMode(ids ?? sel(), collection, mode) }),
    }),
    defineTypedCommand({
      id: "token.createVariable",
      title: "Create Variable",
      category,
      args: z.object({ name: z.string().min(1).max(120), type: Type, values: Values.default({}), collection: z.string().optional(), description: z.string().max(2000).optional() }),
      run: ({ name, type, values, collection, description }) => ({ id: createVariable(name, type, values, { collection, description, starting: true }) }),
    }),
    defineTypedCommand({
      id: "token.updateVariable",
      title: "Change Variable",
      category,
      args: z.object({
        id: z.string(),
        name: z.string().min(1).max(120).optional(),
        values: Values.optional(),
        description: z.string().max(2000).optional(),
        scopes: z.array(z.string().max(40)).max(20).nullable().optional(),
        codeSyntax: z.object({ WEB: z.string().max(200).optional(), iOS: z.string().max(200).optional(), ANDROID: z.string().max(200).optional() }).optional(),
        hidden: z.boolean().optional(),
      }),
      run: ({ id, ...patch }) => ({ ok: updateVariable(id, patch) }),
    }),
    defineTypedCommand({ id: "token.setAlias", title: "Alias Variable", category, args: z.object({ id: z.string(), mode: z.string(), alias: z.string() }), run: ({ id, mode, alias }) => ({ ok: setAlias(id, mode, alias) }) }),
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
      args: z.object({ kind: Kind, name: z.string().min(1).max(120), from: z.string().optional(), slot: Slot.optional() }),
      run: ({ kind, name, from, slot }) => ({ id: createStyle(kind, name, from ?? sel()[0] ?? "", slot) }),
    }),
    defineTypedCommand({
      id: "style.update",
      title: "Change Style",
      category,
      args: z.object({
        id: z.string(),
        name: z.string().min(1).max(120).optional(),
        props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        description: z.string().max(2000).optional(),
        bound: z.record(z.string().max(120), z.string().nullable()).optional(),
      }),
      run: ({ id, name, props, description, bound }) => ({ ok: updateStyle(id, { name, props: props as Record<string, PropValue> | undefined, description, bound }) }),
    }),
    defineTypedCommand({
      id: "style.apply",
      title: "Apply Style",
      category,
      args: z.object({ id: z.string(), ids: z.array(z.string()).optional(), slot: Slot.optional() }),
      run: ({ id, ids, slot }) => ({ changed: applyStyle(ids ?? sel(), id, slot) }),
    }),
    defineTypedCommand({
      id: "style.detach",
      title: "Detach Style",
      category,
      args: z.object({ kind: Slot, ids: z.array(z.string()).optional() }),
      run: ({ kind, ids }) => ({ changed: detachStyle(ids ?? sel(), kind) }),
    }),
    defineTypedCommand({ id: "style.delete", title: "Delete Style", category, args: z.object({ id: z.string() }), run: ({ id }) => ({ ok: deleteStyle(id) }) }),
    defineTypedCommand({
      id: "token.exportVariables",
      title: "Export Variables",
      category,
      args: z.object({ format: z.enum(["json", "css"]).default("json"), collections: z.array(z.string()).optional() }).default({ format: "json" }),
      run: ({ format, collections }) => {
        const doc = getDocument();
        const unknown = collections?.find((c) => !collectionsOf(doc).some((x) => x.id === c || x.name === c));
        if (unknown !== undefined) throw new Error(`There's no collection \`${unknown}\`.`);
        return { text: format === "css" ? exportVariablesCss(doc, collections) : JSON.stringify(exportVariablesJson(doc, collections), null, 2) };
      },
    }),
    defineTypedCommand({
      id: "token.importVariables",
      title: "Import Variables",
      category,
      args: z.object({ variables: z.union([z.string().max(5_000_000), z.record(z.string(), z.unknown())]) }),
      run: ({ variables }) => importVariablesJson(variables),
    }),
  ];
  return () => offs.forEach((off) => off());
}
