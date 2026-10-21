/**
 * Token operations (ROADMAP Phase 45): create, change and delete variables, modes and styles; bind properties to
 * variables, detach and re-link them; apply and detach styles. Each is one undo step. A variable or style that is
 * deleted first copies its current value into every layer that followed it, so nothing changes look.
 */

import { getPropertyDefinition } from "../document/properties";
import type { PropValue } from "../document/registry";
import type { Layer, MotionDocument } from "../document/schema";
import { getResolvedDocument, documentCommands } from "../store/useDocumentStore";
import { getDocument } from "../store/documentState";
import { useModeStore } from "../store/useModeStore";
import { markOverridden } from "../components/instances";
import { MAX_MODES, MAX_STYLES, MAX_VARIABLES, STYLE_PROPS, defaultModeOf, modesOf, valueIn, variableTypeFor, type StyleDef, type StyleKind, type Variable, type VariableType } from "./tokens";

const rid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const activeMode = () => useModeStore.getState().activeModeId;

const okValue = (type: VariableType, v: unknown): v is string | number => (type === "color" ? typeof v === "string" && v.length > 0 && v.length <= 200 : typeof v === "number" && Number.isFinite(v));

// --- variables --------------------------------------------------------------------

/** Makes a variable. `values` gives modes their values; a mode without one starts with the first mode's. Returns its id, or null. */
export function createVariable(name: string, type: VariableType, values: Record<string, string | number>): string | null {
  const doc = getDocument();
  const trimmed = name.trim().slice(0, 120);
  if (!trimmed || Object.keys(doc.variables ?? {}).length >= MAX_VARIABLES) return null;
  const modes = modesOf(doc);
  const first = values[modes[0].id] ?? Object.values(values)[0];
  if (!okValue(type, first)) return null;
  const all: Record<string, string | number> = {};
  for (const m of modes) {
    const v = values[m.id];
    all[m.id] = okValue(type, v) ? v : first;
  }
  const id = rid("var");
  documentCommands.mutate("Create variable", (d) => {
    (d.variables ??= {})[id] = { id, name: trimmed, type, values: all };
  });
  return id;
}

export function updateVariable(id: string, patch: { name?: string; values?: Record<string, string | number> }): boolean {
  const v = getDocument().variables?.[id];
  if (!v) return false;
  const modes = new Set(modesOf(getDocument()).map((m) => m.id));
  const values = Object.entries(patch.values ?? {}).filter(([m, x]) => modes.has(m) && okValue(v.type, x));
  if (!patch.name?.trim() && values.length === 0) return false;
  documentCommands.mutate("Change variable", (d) => {
    const t = d.variables![id];
    if (patch.name?.trim()) t.name = patch.name.trim().slice(0, 120);
    for (const [m, x] of values) t.values[m] = x;
  });
  return true;
}

/** The literal a binding shows now: what the layer would look like if it let go. */
function currentValue(doc: MotionDocument, layer: Layer, path: string): PropValue | undefined {
  const variable = doc.variables?.[layer.tokens?.[path]?.variable ?? ""];
  if (!variable) return layer.properties[path];
  const v = valueIn(variable, activeMode(), modesOf(doc));
  return v === undefined ? layer.properties[path] : v;
}

/** Deletes a variable. Layers bound to it keep what they show in the mode being viewed. */
export function deleteVariable(id: string): boolean {
  if (!getDocument().variables?.[id]) return false;
  documentCommands.mutate("Delete variable", (d) => {
    for (const layer of Object.values(d.layers)) {
      if (!layer.tokens) continue;
      for (const [path, b] of Object.entries(layer.tokens)) {
        if (b.variable !== id) continue;
        if (!b.detached) {
          const v = currentValue(d, layer as Layer, path);
          if (v !== undefined) layer.properties[path] = v;
        }
        delete layer.tokens[path];
      }
      if (Object.keys(layer.tokens).length === 0) delete layer.tokens;
    }
    delete d.variables![id];
  });
  return true;
}

// --- modes ----------------------------------------------------------------------------

export function addMode(name: string): string | null {
  const doc = getDocument();
  const modes = modesOf(doc);
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed || modes.length >= MAX_MODES || modes.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) return null;
  let id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "mode";
  for (let n = 2; modes.some((m) => m.id === id); n++) id = `${id.replace(/-\d+$/, "")}-${n}`;
  documentCommands.mutate("Add mode", (d) => {
    d.modes = [...modesOf(d), { id, name: trimmed }];
    // the new mode starts as a copy of the first one
    const first = d.modes[0].id;
    for (const v of Object.values(d.variables ?? {})) if (v.values[first] !== undefined) v.values[id] = v.values[first];
  });
  return id;
}

export function removeMode(id: string): boolean {
  const modes = modesOf(getDocument());
  if (modes.length <= 1 || modes[0].id === id || !modes.some((m) => m.id === id)) return false;
  if (activeMode() === id) useModeStore.getState().setActive(null);
  documentCommands.mutate("Remove mode", (d) => {
    d.modes = modesOf(d).filter((m) => m.id !== id);
    for (const v of Object.values(d.variables ?? {})) delete v.values[id];
  });
  return true;
}

export function setActiveMode(id: string | null): boolean {
  const modes = modesOf(getDocument());
  if (id !== null && !modes.some((m) => m.id === id)) return false;
  useModeStore.getState().setActive(id === null || id === modes[0].id ? null : id);
  return true;
}

// --- bindings ---------------------------------------------------------------------------

/** Binds a property of layers to a variable of the same kind (a colour variable to a colour property, a number to a number). Returns how many layers changed. */
export function bindVariable(ids: readonly string[], path: string, variableId: string): number {
  const doc = getDocument();
  const variable = doc.variables?.[variableId];
  if (!variable) return 0;
  const targets = ids.filter((id) => {
    const l = doc.layers[id];
    if (!l || l.locked === true) return false;
    const def = getPropertyDefinition(path);
    return !!def && variableTypeFor(def.valueType) === variable.type;
  });
  if (targets.length === 0) return 0;
  documentCommands.mutate("Bind to variable", (d) => {
    for (const id of targets) {
      (d.layers[id].tokens ??= {})[path] = { variable: variableId };
      markOverridden(d.layers[id] as Layer, ["tokens"]);
    }
  });
  return targets.length;
}

/** Lets go of a binding but keeps the value it shows now, marked as detached from the variable (the inspector says so and can re-link it). */
export function detachBinding(ids: readonly string[], path: string): number {
  const targets = ids.filter((id) => getDocument().layers[id]?.tokens?.[path] && !getDocument().layers[id].tokens![path].detached);
  if (targets.length === 0) return 0;
  documentCommands.mutate("Detach from variable", (d) => {
    for (const id of targets) {
      const layer = d.layers[id];
      const v = currentValue(d, layer as Layer, path);
      if (v !== undefined) layer.properties[path] = v;
      layer.tokens![path].detached = true;
      markOverridden(layer as Layer, ["tokens"]);
    }
  });
  return targets.length;
}

/** Forgets that a property ever came from a variable (the value stays). Returns how many layers changed. */
export function unbind(ids: readonly string[], path: string): number {
  const targets = ids.filter((id) => getDocument().layers[id]?.tokens?.[path]);
  if (targets.length === 0) return 0;
  documentCommands.mutate("Remove binding", (d) => {
    for (const id of targets) {
      const layer = d.layers[id];
      if (!layer.tokens![path].detached) {
        const v = currentValue(d, layer as Layer, path);
        if (v !== undefined) layer.properties[path] = v;
      }
      delete layer.tokens![path];
      if (Object.keys(layer.tokens!).length === 0) delete layer.tokens;
      markOverridden(layer as Layer, ["tokens"]);
    }
  });
  return targets.length;
}

// --- styles ----------------------------------------------------------------------------

/** Makes a style from a layer's current text or effect properties (as seen now); that layer follows it. Returns its id. */
export function createStyle(kind: StyleKind, name: string, fromLayerId: string): string | null {
  const resolved = getResolvedDocument().layers[fromLayerId];
  const doc = getDocument();
  const trimmed = name.trim().slice(0, 120);
  if (!resolved || !trimmed || Object.keys(doc.styles ?? {}).length >= MAX_STYLES) return null;
  const props: Record<string, PropValue> = {};
  for (const path of STYLE_PROPS[kind]) {
    const v = resolved.properties[path];
    if (v !== undefined) props[path] = v;
  }
  if (Object.keys(props).length === 0) return null;
  const id = rid("sty");
  documentCommands.mutate(kind === "text" ? "Create text style" : "Create effect style", (d) => {
    (d.styles ??= {})[id] = { id, name: trimmed, kind, props };
    // the layer it was made from follows it from then on
    const source = d.layers[fromLayerId];
    if (source && source.locked !== true) (source.styleRefs ??= {})[kind] = id;
  });
  return id;
}

export function updateStyle(id: string, patch: { name?: string; props?: Record<string, PropValue> }): boolean {
  const s = getDocument().styles?.[id];
  if (!s) return false;
  const props = Object.entries(patch.props ?? {}).filter(([k]) => (STYLE_PROPS[s.kind] as readonly string[]).includes(k));
  if (!patch.name?.trim() && props.length === 0) return false;
  documentCommands.mutate("Change style", (d) => {
    const t = d.styles![id];
    if (patch.name?.trim()) t.name = patch.name.trim().slice(0, 120);
    for (const [k, v] of props) t.props[k] = v;
  });
  return true;
}

/** Makes layers follow a style. They keep their own values for the properties the style doesn't carry. */
export function applyStyle(ids: readonly string[], styleId: string): number {
  const doc = getDocument();
  const style = doc.styles?.[styleId];
  if (!style) return 0;
  const targets = ids.filter((id) => {
    const l = doc.layers[id];
    return l && l.locked !== true && (style.kind === "effect" || l.archetype === "text" || l.archetype === "button" || l.archetype === "badge");
  });
  if (targets.length === 0) return 0;
  documentCommands.mutate("Apply style", (d) => {
    for (const id of targets) {
      (d.layers[id].styleRefs ??= {})[style.kind] = styleId;
      markOverridden(d.layers[id] as Layer, ["styleRefs"]);
    }
  });
  return targets.length;
}

function materialize(d: MotionDocument, layer: Layer, kind: StyleKind) {
  const style = d.styles?.[layer.styleRefs?.[kind] ?? ""];
  if (style) for (const path of STYLE_PROPS[kind]) if (style.props[path] !== undefined) layer.properties[path] = style.props[path];
  markOverridden(layer, ["styleRefs"]);
  if (layer.styleRefs) {
    delete layer.styleRefs[kind];
    if (!layer.styleRefs.text && !layer.styleRefs.effect) delete layer.styleRefs;
  }
}

/** Lets layers go of a style: they keep every value it gave them. */
export function detachStyle(ids: readonly string[], kind: StyleKind): number {
  const targets = ids.filter((id) => getDocument().layers[id]?.styleRefs?.[kind]);
  if (targets.length === 0) return 0;
  documentCommands.mutate("Detach style", (d) => {
    for (const id of targets) materialize(d, d.layers[id] as Layer, kind);
  });
  return targets.length;
}

export function deleteStyle(id: string): boolean {
  const s = getDocument().styles?.[id];
  if (!s) return false;
  documentCommands.mutate("Delete style", (d) => {
    for (const layer of Object.values(d.layers)) if (layer.styleRefs?.[s.kind] === id) materialize(d, layer as Layer, s.kind);
    delete d.styles![id];
  });
  return true;
}

export type { StyleDef, Variable };
export { defaultModeOf };
