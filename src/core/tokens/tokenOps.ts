/**
 * Token operations (ROADMAP Phase 45): create, change and delete variables, modes and styles; bind properties to
 * variables, detach and re-link them; apply and detach styles. Each is one undo step. A variable or style that is
 * deleted first copies its current value into every layer that followed it, so nothing changes look.
 *
 * FigCraft port F10 (`crates/engine/src/cmd/variables.rs`, `cmd/styles.rs`, commit 6ea44e9; MIT, Copyright (c) 2026
 * ArtCraft Team and the FigCraft contributors): string and boolean variables, aliases (refused when they would make a
 * cycle), descriptions, scopes and code syntax; collections with their own modes, and a frame choosing a mode; paint
 * and grid styles in fill, stroke and grid slots; variables bound inside a style; style descriptions.
 */

import { getPropertyDefinition, isPropertyLegalFor } from "../document/properties";
import type { PropValue } from "../document/registry";
import type { Layer, MotionDocument } from "../document/schema";
import { getResolvedDocument, documentCommands } from "../store/useDocumentStore";
import { getDocument } from "../store/documentState";
import { useModeStore } from "../store/useModeStore";
import { markOverridden } from "../components/instances";
import { serializeFills } from "../paint/paints";
import { fillsOf, strokesOf } from "../paint/paintOps";
import { transaction } from "../editing/editOps";
import {
  CODE_PLATFORMS,
  DEFAULT_COLLECTION,
  MAX_COLLECTIONS,
  MAX_MODES,
  MAX_STYLES,
  MAX_VARIABLES,
  SLOT_KIND,
  STYLE_PROPS,
  STYLE_SLOTS,
  aliasRefused,
  choiceOf,
  collectionOf,
  collectionsOf,
  defaultModeOf,
  fitsType,
  inheritedModes,
  isAlias,
  modesOf,
  normalizeScopes,
  resolveVariable,
  scopeKnown,
  slotProps,
  slotsFor,
  variableTypeForPath,
  type CodePlatform,
  type Collection,
  type Mode,
  type StyleDef,
  type StyleKind,
  type StyleSlot,
  type Variable,
  type VariableType,
  type VariableValue,
} from "./tokens";

const rid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const activeMode = () => useModeStore.getState().activeModeId;
type Doc = MotionDocument & { collections?: Collection[] };
const doc = () => getDocument() as Doc;

/** Is `v` a value `variable` (of `type`, id `id`) may hold: a literal of its type, or an alias that makes no cycle. */
function okValue(d: Doc, type: VariableType, v: unknown, id?: string): v is VariableValue {
  if (isAlias(v)) {
    const target = d.variables?.[v.alias];
    return !!target && target.type === type && (!id || aliasRefused(d, id, v.alias) === null);
  }
  return fitsType(type, v) && (typeof v !== "string" || v.length <= (type === "color" ? 200 : 2000));
}

/** The modes a variable has values for: its collection's. */
const modesFor = (d: Doc, collection: string | undefined): Mode[] => collectionOf(d, { collection }).modes;

// --- variables --------------------------------------------------------------------

/** What a new variable holds when no value is given (FigCraft `VariableValue::default_for`). */
export const STARTING_VALUE: Record<VariableType, VariableValue> = { color: "#000000", number: 0, string: "", boolean: true };

/**
 * Makes a variable. `values` gives modes their values (a literal or `{ alias }`); a mode without one starts with the
 * first mode's. Returns its id, or null.
 */
export function createVariable(name: string, type: VariableType, values: Record<string, VariableValue>, options: { collection?: string; description?: string; /** With no value given, start at FigCraft's starting value instead of refusing (Phase 45 refuses). */ starting?: boolean } = {}): string | null {
  const d = doc();
  const trimmed = name.trim().slice(0, 120);
  if (!trimmed || Object.keys(d.variables ?? {}).length >= MAX_VARIABLES) return null;
  const collection = options.collection && options.collection !== DEFAULT_COLLECTION && collectionsOf(d).some((c) => c.id === options.collection) ? options.collection : undefined;
  const modes = modesFor(d, collection);
  // no value given: FigCraft's starting values (black, 0, empty and true) when asked for
  const first = values[modes[0].id] ?? Object.values(values)[0] ?? (options.starting ? STARTING_VALUE[type] : undefined);
  if (!okValue(d, type, first)) return null;
  const all: Record<string, VariableValue> = {};
  for (const m of modes) {
    const v = values[m.id];
    all[m.id] = okValue(d, type, v) ? v : first;
  }
  const id = rid("var");
  documentCommands.mutate("Create variable", (dd) => {
    (dd.variables ??= {})[id] = { id, name: trimmed, type, values: all, ...(collection ? { collection } : {}), ...(options.description?.trim() ? { description: options.description.trim().slice(0, 2000) } : {}) };
  });
  return id;
}

export interface VariablePatch {
  name?: string;
  values?: Record<string, VariableValue>;
  description?: string;
  /** Scope ids (`SCOPES`); `null` lifts the limit. */
  scopes?: string[] | null;
  codeSyntax?: Partial<Record<CodePlatform, string>>;
  hidden?: boolean;
}

export function updateVariable(id: string, patch: VariablePatch): boolean {
  const d = doc();
  const v = d.variables?.[id];
  if (!v) return false;
  const modes = new Set(modesFor(d, v.collection).map((m) => m.id));
  const values = Object.entries(patch.values ?? {}).filter(([m, x]) => modes.has(m) && okValue(d, v.type, x, id));
  // an unknown scope id is refused, not dropped (FigCraft `variable.update`)
  if (patch.scopes && patch.scopes.some((x) => !scopeKnown(v.type, x))) return false;
  const scopes = patch.scopes === undefined ? undefined : patch.scopes === null ? null : normalizeScopes(v.type, patch.scopes);
  const code = Object.entries(patch.codeSyntax ?? {}).filter(([k]) => (CODE_PLATFORMS as readonly string[]).includes(k));
  const anything = !!patch.name?.trim() || values.length > 0 || patch.description !== undefined || patch.scopes !== undefined || code.length > 0 || patch.hidden !== undefined;
  if (!anything) return false;
  documentCommands.mutate("Change variable", (dd) => {
    const t = dd.variables![id];
    if (patch.name?.trim()) t.name = patch.name.trim().slice(0, 120);
    for (const [m, x] of values) t.values[m] = structuredClone(x);
    if (patch.description !== undefined) {
      const text = patch.description.trim().slice(0, 2000);
      if (text) t.description = text;
      else delete t.description;
    }
    if (scopes === null || (patch.scopes !== undefined && scopes === undefined)) delete t.scopes;
    else if (scopes) t.scopes = scopes;
    if (code.length > 0) {
      const cs = (t.codeSyntax ??= {}) as Record<string, string>;
      for (const [k, x] of code) {
        const text = (x ?? "").trim().slice(0, 200);
        if (text) cs[k] = text;
        else delete cs[k];
      }
      if (Object.keys(cs).length === 0) delete t.codeSyntax;
    }
    if (patch.hidden !== undefined) {
      if (patch.hidden) t.hidden = true;
      else delete t.hidden;
    }
  });
  return true;
}

/** Points a variable's value in one mode at another variable. Refused for a cycle, a missing variable or another type. */
export function setAlias(id: string, modeId: string, aliasId: string): boolean {
  return updateVariable(id, { values: { [modeId]: { alias: aliasId } } });
}

/** The modes a layer sees: the view's for the default collection, and what the frames around it chose. */
function choiceFor(d: Doc, layerId: string) {
  return choiceOf(activeMode(), inheritedModes(d.layers as Record<string, Layer & { variableModes?: Record<string, string> }>).get(layerId));
}

/** The literal a binding shows now: what the layer would look like if it let go. */
function currentValue(d: Doc, layer: Layer, path: string): PropValue | undefined {
  const id = layer.tokens?.[path]?.variable ?? "";
  const own = path === "visible" ? layer.visible !== false : layer.properties[path];
  if (!d.variables?.[id]) return own;
  const v = resolveVariable(d, id, choiceFor(d, layer.id));
  return v === undefined ? own : v;
}

/** Writes what a binding shows into the layer (a binding of `visible` into the flag). */
function keepValue(layer: Layer, path: string, v: PropValue | undefined) {
  if (v === undefined) return;
  if (path === "visible") {
    if (typeof v === "boolean") layer.visible = v;
  } else layer.properties[path] = v;
}

/** Deletes a variable. Layers bound to it keep what they show; variables that alias it keep its value. */
export function deleteVariable(id: string): boolean {
  if (!doc().variables?.[id]) return false;
  documentCommands.mutate("Delete variable", (d) => {
    const dd = d as Doc;
    for (const layer of Object.values(dd.layers)) {
      if (!layer.tokens) continue;
      for (const [path, b] of Object.entries(layer.tokens)) {
        if (b.variable !== id) continue;
        if (!b.detached) keepValue(layer as Layer, path, currentValue(dd, layer as Layer, path));
        delete layer.tokens[path];
      }
      if (Object.keys(layer.tokens).length === 0) delete layer.tokens;
    }
    // an alias of it becomes the value it showed, mode by mode
    for (const v of Object.values(dd.variables ?? {})) {
      if (v.id === id) continue;
      const coll = collectionOf(dd, v);
      for (const [m, x] of Object.entries(v.values)) {
        if (!isAlias(x) || x.alias !== id) continue;
        const lit = resolveVariable(dd, id, { [coll.id]: m });
        if (lit !== undefined) v.values[m] = lit;
        else delete v.values[m];
      }
    }
    // a style binding to it keeps the style's stored value
    for (const s of Object.values(dd.styles ?? {})) {
      if (!s.bound) continue;
      for (const [k, v] of Object.entries(s.bound)) if (v === id) delete s.bound[k];
      if (Object.keys(s.bound).length === 0) delete s.bound;
    }
    delete dd.variables![id];
  });
  return true;
}

// --- modes and collections -----------------------------------------------------------

const slugId = (name: string, taken: (id: string) => boolean, fallback: string) => {
  let id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || fallback;
  for (let n = 2; taken(id); n++) id = `${id.replace(/-\d+$/, "")}-${n}`;
  return id;
};

/**
 * Adds a mode to a collection (the default one when none is named). The new mode starts as a copy of the first, or of
 * mode `from` (a duplicate).
 */
export function addMode(name: string, collection: string = DEFAULT_COLLECTION, from?: string): string | null {
  const d = doc();
  const coll = collectionsOf(d).find((c) => c.id === collection);
  const trimmed = name.trim().slice(0, 40);
  if (!coll || !trimmed || coll.modes.length >= MAX_MODES || coll.modes.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) return null;
  const source = from === undefined ? coll.modes[0] : coll.modes.find((m) => m.id === from || m.name === from);
  if (!source) return null;
  const id = slugId(trimmed, (x) => coll.modes.some((m) => m.id === x), "mode");
  documentCommands.mutate("Add mode", (dd) => {
    const ddd = dd as Doc;
    const first = source.id;
    if (collection === DEFAULT_COLLECTION) ddd.modes = [...modesOf(ddd), { id, name: trimmed }];
    else ddd.collections!.find((x) => x.id === collection)!.modes.push({ id, name: trimmed });
    for (const v of Object.values(ddd.variables ?? {})) if ((v.collection ?? DEFAULT_COLLECTION) === collection && v.values[first] !== undefined) v.values[id] = structuredClone(v.values[first]);
  });
  return id;
}

export function removeMode(id: string, collection: string = DEFAULT_COLLECTION): boolean {
  const coll = collectionsOf(doc()).find((c) => c.id === collection);
  const modes = coll?.modes ?? [];
  if (modes.length <= 1 || modes[0].id === id || !modes.some((m) => m.id === id)) return false;
  if (collection === DEFAULT_COLLECTION && activeMode() === id) useModeStore.getState().setActive(null);
  documentCommands.mutate("Remove mode", (dd) => {
    const ddd = dd as Doc;
    if (collection === DEFAULT_COLLECTION) ddd.modes = modesOf(ddd).filter((m) => m.id !== id);
    else {
      const c = ddd.collections!.find((x) => x.id === collection)!;
      c.modes = c.modes.filter((m) => m.id !== id);
    }
    for (const v of Object.values(ddd.variables ?? {})) if ((v.collection ?? DEFAULT_COLLECTION) === collection) delete v.values[id];
    // frames that chose it go back to the default
    for (const l of Object.values(ddd.layers) as (Layer & { variableModes?: Record<string, string> })[]) {
      if (l.variableModes?.[collection] !== id) continue;
      delete l.variableModes[collection];
      if (Object.keys(l.variableModes).length === 0) delete l.variableModes;
    }
  });
  return true;
}

export function renameMode(id: string, name: string, collection: string = DEFAULT_COLLECTION): boolean {
  const trimmed = name.trim().slice(0, 40);
  const coll = collectionsOf(doc()).find((c) => c.id === collection);
  if (!coll || !trimmed || !coll.modes.some((m) => m.id === id) || coll.modes.some((m) => m.id !== id && m.name.toLowerCase() === trimmed.toLowerCase())) return false;
  documentCommands.mutate("Rename mode", (dd) => {
    const ddd = dd as Doc;
    if (collection === DEFAULT_COLLECTION) ddd.modes = modesOf(ddd).map((m) => (m.id === id ? { ...m, name: trimmed } : m));
    else ddd.collections!.find((x) => x.id === collection)!.modes.find((m) => m.id === id)!.name = trimmed;
  });
  return true;
}

/**
 * Moves a mode to place `to` in its collection (clamped). The first mode is the default: layers on Auto follow a new
 * default, frames set to a mode keep it.
 */
export function moveMode(id: string, to: number, collection: string = DEFAULT_COLLECTION): boolean {
  const coll = collectionsOf(doc()).find((c) => c.id === collection);
  const at = coll?.modes.findIndex((m) => m.id === id || m.name === id) ?? -1;
  if (!coll || at < 0 || !Number.isFinite(to)) return false;
  const dest = Math.max(0, Math.min(coll.modes.length - 1, Math.round(to)));
  if (dest === at) return false;
  const next = [...coll.modes];
  const [m] = next.splice(at, 1);
  next.splice(dest, 0, m);
  if (collection === DEFAULT_COLLECTION && activeMode() === next[0].id) useModeStore.getState().setActive(null);
  documentCommands.mutate("Move mode", (dd) => {
    const ddd = dd as Doc;
    if (collection === DEFAULT_COLLECTION) ddd.modes = next;
    else ddd.collections!.find((x) => x.id === collection)!.modes = next;
  });
  return true;
}

export function setActiveMode(id: string | null): boolean {
  const modes = modesOf(doc());
  if (id !== null && !modes.some((m) => m.id === id)) return false;
  useModeStore.getState().setActive(id === null || id === modes[0].id ? null : id);
  return true;
}

/**
 * Makes a collection with modes ("Mode 1" when none are named). A collection keeps at least one named mode, so an empty
 * list or a blank name is refused (FigCraft `variable.createCollection`). Returns its id.
 */
export function createCollection(name: string, modeNames?: readonly string[]): string | null {
  const d = doc();
  const trimmed = name.trim().slice(0, 60);
  const all = collectionsOf(d);
  if (!trimmed || all.length - 1 >= MAX_COLLECTIONS || all.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return null;
  if (modeNames && (modeNames.length === 0 || modeNames.some((m) => typeof m !== "string" || !m.trim()))) return null;
  const names = [...new Set((modeNames ?? ["Mode 1"]).map((m) => m.trim().slice(0, 40)))].slice(0, MAX_MODES);
  const modes: Mode[] = [];
  for (const n of names) modes.push({ id: slugId(n, (x) => modes.some((m) => m.id === x), "mode"), name: n });
  const id = slugId(trimmed, (x) => x === DEFAULT_COLLECTION || all.some((c) => c.id === x), "collection");
  documentCommands.mutate("Create collection", (dd) => {
    ((dd as Doc).collections ??= []).push({ id, name: trimmed, modes });
  });
  return id;
}

export function renameCollection(id: string, name: string): boolean {
  const trimmed = name.trim().slice(0, 60);
  if (id === DEFAULT_COLLECTION || !trimmed || !doc().collections?.some((c) => c.id === id)) return false;
  documentCommands.mutate("Rename collection", (dd) => {
    (dd as Doc).collections!.find((c) => c.id === id)!.name = trimmed;
  });
  return true;
}

/** Deletes a collection and its variables (layers keep what they showed). The default collection can't go. */
export function deleteCollection(id: string): boolean {
  const d = doc();
  if (id === DEFAULT_COLLECTION || !d.collections?.some((c) => c.id === id)) return false;
  transaction("Delete collection", () => {
    for (const v of Object.values(doc().variables ?? {})) if (v.collection === id) deleteVariable(v.id);
    documentCommands.mutate("Delete collection", (dd) => {
      const ddd = dd as Doc;
      ddd.collections = ddd.collections!.filter((c) => c.id !== id);
      if (ddd.collections.length === 0) delete ddd.collections;
      for (const l of Object.values(ddd.layers) as (Layer & { variableModes?: Record<string, string> })[]) {
        if (!l.variableModes?.[id]) continue;
        delete l.variableModes[id];
        if (Object.keys(l.variableModes).length === 0) delete l.variableModes;
      }
    });
  });
  return true;
}

/** Moves a variable to another collection: each of the new collection's modes takes the old first mode's value. */
export function moveVariable(id: string, collection: string): boolean {
  const d = doc();
  const v = d.variables?.[id];
  const to = collectionsOf(d).find((c) => c.id === collection);
  if (!v || !to || (v.collection ?? DEFAULT_COLLECTION) === collection) return false;
  const from = collectionOf(d, v);
  const first = v.values[from.modes[0].id] ?? Object.values(v.values)[0];
  documentCommands.mutate("Move variable", (dd) => {
    const t = dd.variables![id];
    t.values = Object.fromEntries(to.modes.map((m) => [m.id, structuredClone(first)]));
    if (collection === DEFAULT_COLLECTION) delete t.collection;
    else t.collection = collection;
  });
  return true;
}

/**
 * Sets the mode a frame (and everything in it) shows for a collection; `null` goes back to what is around it. Returns
 * how many layers changed.
 */
export function setLayerMode(ids: readonly string[], collection: string, modeId: string | null): number {
  const d = doc();
  const coll = collectionsOf(d).find((c) => c.id === collection);
  if (!coll || (modeId !== null && !coll.modes.some((m) => m.id === modeId))) return 0;
  const targets = ids.filter((id) => d.layers[id] && d.layers[id].locked !== true);
  if (targets.length === 0) return 0;
  documentCommands.mutate("Variable mode", (dd) => {
    for (const id of targets) {
      const l = dd.layers[id] as Layer & { variableModes?: Record<string, string> };
      if (modeId === null) {
        if (l.variableModes) delete l.variableModes[collection];
        if (l.variableModes && Object.keys(l.variableModes).length === 0) delete l.variableModes;
      } else (l.variableModes ??= {})[collection] = modeId;
      // on a layer inside an instance, the choice is an override the main no longer overwrites
      if (l.instance && !l.instance.root) markOverridden(l, ["variableModes"]);
    }
  });
  return targets.length;
}

// --- bindings ---------------------------------------------------------------------------

/**
 * Binds a property of layers to a variable of the same kind (a colour variable to a colour property, a number to a
 * number, a string to text, a boolean to `visible`). Returns how many layers changed.
 */
export function bindVariable(ids: readonly string[], path: string, variableId: string): number {
  const d = doc();
  const variable = d.variables?.[variableId];
  if (!variable) return 0;
  const targets = ids.filter((id) => {
    const l = d.layers[id];
    if (!l || l.locked === true) return false;
    if (path === "visible") return variable.type === "boolean";
    const def = getPropertyDefinition(path);
    return !!def && isPropertyLegalFor(path, l.archetype as never) && variableTypeForPath(path, def.valueType) === variable.type;
  });
  if (targets.length === 0) return 0;
  documentCommands.mutate("Bind to variable", (dd) => {
    for (const id of targets) {
      (dd.layers[id].tokens ??= {})[path] = { variable: variableId };
      markOverridden(dd.layers[id] as Layer, ["tokens"]);
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
      const layer = d.layers[id] as Layer;
      keepValue(layer, path, currentValue(d as Doc, layer, path));
      layer.tokens![path].detached = true;
      markOverridden(layer, ["tokens"]);
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
      const layer = d.layers[id] as Layer;
      if (!layer.tokens![path].detached) keepValue(layer, path, currentValue(d as Doc, layer, path));
      delete layer.tokens![path];
      if (Object.keys(layer.tokens!).length === 0) delete layer.tokens;
      markOverridden(layer, ["tokens"]);
    }
  });
  return targets.length;
}

// --- styles ----------------------------------------------------------------------------

const LABEL: Record<StyleKind, string> = { text: "text style", effect: "effect style", paint: "paint style", grid: "grid style" };

/** Can a layer sit in a style slot? */
function slotFits(layer: Layer, slot: StyleSlot): boolean {
  if (slot === "text") return layer.archetype === "text" || layer.archetype === "button" || layer.archetype === "badge";
  if (slot === "fill") return layer.archetype === "text" || isPropertyLegalFor("paint.fills", layer.archetype as never);
  if (slot === "stroke") return isPropertyLegalFor("paint.strokes", layer.archetype as never);
  if (slot === "grid") return isPropertyLegalFor("frame.layoutGrids", layer.archetype as never);
  return true;
}

/** A layer's current value for a style of a kind (as seen now), taken from `slot`. */
function propsFromLayer(id: string, kind: StyleKind, slot: StyleSlot): Record<string, PropValue> {
  const resolved = getResolvedDocument().layers[id];
  if (!resolved) return {};
  const props: Record<string, PropValue> = {};
  if (kind === "paint") {
    const color = resolved.properties["typography.color"];
    const paints = slot === "stroke" ? strokesOf(id) : resolved.archetype === "text" ? (typeof color === "string" ? [{ type: "solid" as const, color, opacity: 1, visible: true }] : []) : fillsOf(id);
    if (paints.length > 0) props["paint.fills"] = serializeFills(paints);
    return props;
  }
  for (const path of STYLE_PROPS[kind]) {
    const v = resolved.properties[path];
    if (v !== undefined && v !== "") props[path] = v;
  }
  return props;
}

/**
 * Makes a style from a layer's current properties (as seen now); that layer follows it. A paint style is made from
 * the layer's fills (or, with `slot: "stroke"`, its strokes). Returns its id.
 */
export function createStyle(kind: StyleKind, name: string, fromLayerId: string, slot?: StyleSlot): string | null {
  const d = doc();
  const trimmed = name.trim().slice(0, 120);
  const source = d.layers[fromLayerId];
  const where = slot && SLOT_KIND[slot] === kind ? slot : slotsFor(kind)[0];
  if (!source || !trimmed || Object.keys(d.styles ?? {}).length >= MAX_STYLES) return null;
  const props = propsFromLayer(fromLayerId, kind, where);
  if (Object.keys(props).length === 0) return null;
  // the variables the layer had bound to what the style takes go with it (FigCraft `style_vars::from_layer`)
  const bound: Record<string, string> = {};
  for (const [path, b] of Object.entries(source.tokens ?? {})) if (!b.detached && (STYLE_PROPS[kind] as readonly string[]).includes(path)) bound[path] = b.variable;
  const id = rid("sty");
  documentCommands.mutate(`Create ${LABEL[kind]}`, (dd) => {
    (dd.styles ??= {})[id] = { id, name: trimmed, kind, props, ...(Object.keys(bound).length > 0 ? { bound } : {}) };
    const layer = dd.layers[fromLayerId] as Layer;
    if (layer && layer.locked !== true && slotFits(layer, where)) ((layer.styleRefs ??= {}) as Record<string, string>)[where] = id;
  });
  return id;
}

export interface StylePatch {
  name?: string;
  props?: Record<string, PropValue>;
  description?: string;
  /** Variables bound to fields of the style (`null` unbinds one). */
  bound?: Record<string, string | null>;
}

export function updateStyle(id: string, patch: StylePatch): boolean {
  const d = doc();
  const s = d.styles?.[id];
  if (!s) return false;
  const props = Object.entries(patch.props ?? {}).filter(([k]) => (STYLE_PROPS[s.kind] as readonly string[]).includes(k));
  const bound = Object.entries(patch.bound ?? {}).filter(([k, v]) => {
    if (v === null) return true;
    const variable = d.variables?.[v];
    if (!variable) return false;
    if (/^paint\.fills\/\d+\/color$/.test(k)) return s.kind === "paint" && variable.type === "color";
    if (!(STYLE_PROPS[s.kind] as readonly string[]).includes(k)) return false;
    const def = getPropertyDefinition(k);
    return !!def && variableTypeForPath(k, def.valueType) === variable.type;
  });
  if (!patch.name?.trim() && props.length === 0 && bound.length === 0 && patch.description === undefined) return false;
  documentCommands.mutate("Change style", (dd) => {
    const t = dd.styles![id];
    if (patch.name?.trim()) t.name = patch.name.trim().slice(0, 120);
    for (const [k, v] of props) t.props[k] = v;
    if (patch.description !== undefined) {
      const text = patch.description.trim().slice(0, 2000);
      if (text) t.description = text;
      else delete t.description;
    }
    for (const [k, v] of bound) {
      if (v === null) delete t.bound?.[k];
      else (t.bound ??= {})[k] = v;
    }
    if (t.bound && Object.keys(t.bound).length === 0) delete t.bound;
  });
  return true;
}

/**
 * Makes layers follow a style, in `slot` (a paint style goes in the fill slot unless told the stroke). They keep their
 * own values for the properties the style doesn't carry.
 */
export function applyStyle(ids: readonly string[], styleId: string, slot?: StyleSlot): number {
  const d = doc();
  const style = d.styles?.[styleId];
  if (!style) return 0;
  const where = slot && SLOT_KIND[slot] === style.kind ? slot : slotsFor(style.kind)[0];
  const targets = ids.filter((id) => {
    const l = d.layers[id] as Layer | undefined;
    return !!l && l.locked !== true && slotFits(l, where);
  });
  if (targets.length === 0) return 0;
  documentCommands.mutate("Apply style", (dd) => {
    for (const id of targets) {
      ((dd.layers[id].styleRefs ??= {}) as Record<string, string>)[where] = styleId;
      markOverridden(dd.layers[id] as Layer, ["styleRefs"]);
    }
  });
  return targets.length;
}

/** Copies what a slot's style gives a layer into its own properties and empties the slot. */
export function materializeSlot(d: Doc, layer: Layer, slot: StyleSlot) {
  const given = slotProps(d, layer, slot, choiceFor(d, layer.id));
  for (const [path, v] of Object.entries(given)) layer.properties[path] = v;
  markOverridden(layer, ["styleRefs"]);
  if (layer.styleRefs) {
    delete (layer.styleRefs as Record<string, string>)[slot];
    if (STYLE_SLOTS.every((s) => !(layer.styleRefs as Record<string, string | undefined>)[s])) delete layer.styleRefs;
  }
}

/** Lets layers go of the style in a slot: they keep every value it gave them. */
export function detachStyle(ids: readonly string[], slot: StyleSlot): number {
  const targets = ids.filter((id) => (getDocument().layers[id]?.styleRefs as Record<string, string> | undefined)?.[slot]);
  if (targets.length === 0) return 0;
  documentCommands.mutate("Detach style", (d) => {
    for (const id of targets) materializeSlot(d as Doc, d.layers[id] as Layer, slot);
  });
  return targets.length;
}

export function deleteStyle(id: string): boolean {
  const s = doc().styles?.[id];
  if (!s) return false;
  documentCommands.mutate("Delete style", (d) => {
    for (const layer of Object.values(d.layers)) for (const slot of slotsFor(s.kind)) if ((layer.styleRefs as Record<string, string> | undefined)?.[slot] === id) materializeSlot(d as Doc, layer as Layer, slot);
    delete d.styles![id];
  });
  return true;
}

export type { StyleDef, Variable };
export { defaultModeOf };
