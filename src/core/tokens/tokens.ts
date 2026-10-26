/**
 * ============================================================================
 * DESIGN TOKENS: VARIABLES, STYLES AND MODES (ROADMAP Phase 45)
 * ============================================================================
 * A variable is a named colour or number with a value for each mode (Light and Dark to begin with); a layer binds a
 * property to it and shows the value of the mode being viewed. A style is a named bundle of properties, a text style
 * (font, size, weight, spacing) or an effect style (shadows and blur), which a layer follows as a whole. Editing a
 * bound property by hand detaches it: the value stays exactly as it was, no longer following the variable, and the
 * inspector shows that it came from one. This file is the rule as pure functions: which modes there are, the value a
 * variable has in a mode, and a layer as it looks with its tokens applied. Nothing here writes.
 *
 * FigCraft port F10 (`crates/doc/src/styles.rs`, `crates/engine/src/style_vars.rs`, commit 6ea44e9; MIT, Copyright
 * (c) 2026 ArtCraft Team and the FigCraft contributors) adds: string and boolean variables (text, font family,
 * visibility), aliases (a value that is another variable, followed at most 32 steps, a cycle resolving to nothing),
 * scopes (which properties a picker offers a variable for), descriptions and code syntax; collections, each with its
 * own modes, and a frame choosing a collection's mode for everything inside it; paint styles (a fill or a stroke) and
 * grid styles beside text and effect styles, a layer following one style per slot; and variables bound inside a style,
 * resolved in the modes of each layer that uses it.
 * ============================================================================
 */

import type { Layer, MotionDocument } from "../document/schema";
import type { PropValue } from "../document/registry";

export interface Mode {
  id: string;
  name: string;
}

export type VariableType = "color" | "number" | "string" | "boolean";

/** A value that is another variable's (FigCraft `VariableValue::Alias`). */
export interface Alias {
  alias: string;
}
export type Literal = string | number | boolean;
export type VariableValue = Literal | Alias;

export const CODE_PLATFORMS = ["WEB", "iOS", "ANDROID"] as const;
export type CodePlatform = (typeof CODE_PLATFORMS)[number];

export interface Variable {
  id: string;
  /** A name, with `/` to group (`brand/primary`). */
  name: string;
  type: VariableType;
  /** Mode id to value: a literal of the variable's type, or an alias. */
  values: Record<string, VariableValue>;
  /** The collection it belongs to; absent: the default one, whose modes are the document's `modes`. */
  collection?: string;
  description?: string;
  /** The scopes pickers offer it for (`SCOPES`); absent: every property of its type; empty: none. */
  scopes?: string[];
  /** The name code uses for it per platform (`var(--space-xs)`). */
  codeSyntax?: Partial<Record<CodePlatform, string>>;
  /** Left out when the file is published as a library. */
  hidden?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  modes: Mode[];
}

export type StyleKind = "text" | "effect" | "paint" | "grid";
/** Where a layer links a style: a paint style can be its fill or its stroke. */
export type StyleSlot = "text" | "effect" | "fill" | "stroke" | "grid";
export const STYLE_SLOTS: readonly StyleSlot[] = ["text", "effect", "fill", "stroke", "grid"];
export const SLOT_KIND: Record<StyleSlot, StyleKind> = { text: "text", effect: "effect", fill: "paint", stroke: "paint", grid: "grid" };

export interface StyleDef {
  id: string;
  name: string;
  kind: StyleKind;
  props: Record<string, PropValue>;
  description?: string;
  /** Variables bound to fields of the style, by key: a property path, or `paint.fills/<i>/color` for a paint's colour. */
  bound?: Record<string, string>;
}

/** The modes chosen per collection (collection id to mode id). */
export type ModeChoice = Record<string, string>;

/** What a layer says about one bound property. `detached` keeps the literal in the layer and ignores the variable. */
export interface Binding {
  variable: string;
  detached?: boolean;
}

export const DEFAULT_MODES: readonly Mode[] = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
];

export const MAX_MODES = 8;
export const MAX_VARIABLES = 500;
export const MAX_STYLES = 200;
export const MAX_COLLECTIONS = 20;
/** Aliases are followed at most this many steps (FigCraft `Variables::resolve`). */
export const MAX_ALIAS_DEPTH = 32;
export const DEFAULT_COLLECTION = "default";

/** The properties each kind of style carries. A layer following a style takes exactly these from it. */
export const STYLE_PROPS: Record<StyleKind, readonly string[]> = {
  text: ["typography.fontFamily", "typography.fontSize", "typography.fontWeight", "typography.fontStyle", "typography.lineHeight", "typography.letterSpacing", "typography.textTransform", "typography.textDecoration"],
  effect: ["paint.shadows", "filter.blur", "paint.backgroundBlur"],
  paint: ["paint.fills"],
  grid: ["frame.layoutGrids"],
};

export const modesOf = (doc: Pick<MotionDocument, "modes">): Mode[] => (doc.modes && doc.modes.length > 0 ? doc.modes : [...DEFAULT_MODES]);
export const defaultModeOf = (doc: Pick<MotionDocument, "modes">): Mode => modesOf(doc)[0];

type TokenDoc = Pick<MotionDocument, "variables" | "styles" | "modes"> & { collections?: Collection[] };

/** Every collection: the default one (the document's modes) first, then the document's own. */
export function collectionsOf(doc: Pick<MotionDocument, "modes"> & { collections?: Collection[] }): Collection[] {
  return [{ id: DEFAULT_COLLECTION, name: "Tokens", modes: modesOf(doc) }, ...(doc.collections ?? []).filter((c) => c.id !== DEFAULT_COLLECTION && c.modes.length > 0)];
}

/** The collection a variable belongs to (the default one when its own is gone). */
export function collectionOf(doc: Pick<MotionDocument, "modes"> & { collections?: Collection[] }, variable: Pick<Variable, "collection">): Collection {
  const all = collectionsOf(doc);
  return all.find((c) => c.id === (variable.collection ?? DEFAULT_COLLECTION)) ?? all[0];
}

/** Does the document have anything to resolve? (Most documents have none: then nothing is copied.) */
export function hasTokens(doc: Pick<MotionDocument, "variables" | "styles">): boolean {
  return (!!doc.variables && Object.keys(doc.variables).length > 0) || (!!doc.styles && Object.keys(doc.styles).length > 0);
}

export const isAlias = (v: unknown): v is Alias => typeof v === "object" && v !== null && typeof (v as Alias).alias === "string";

/** A variable's value in a mode; a mode it has no value for shows the first mode's. (An alias comes back as it is.) */
export function valueIn(variable: Pick<Variable, "values">, modeId: string | null | undefined, modes: readonly Mode[]): VariableValue | undefined {
  if (modeId && variable.values[modeId] !== undefined) return variable.values[modeId];
  for (const m of modes) if (variable.values[m.id] !== undefined) return variable.values[m.id];
  return Object.values(variable.values)[0];
}

/** Does a literal fit a variable type? */
export const fitsType = (type: VariableType, v: unknown): v is Literal =>
  type === "color" ? typeof v === "string" && v.length > 0 : type === "number" ? typeof v === "number" && Number.isFinite(v) : type === "string" ? typeof v === "string" : typeof v === "boolean";

/** Turns a mode id for the default collection (what the view shows) into a choice. */
export const choiceOf = (modeId: string | null | undefined, extra?: ModeChoice): ModeChoice => ({ ...(modeId ? { [DEFAULT_COLLECTION]: modeId } : {}), ...extra });

/**
 * A variable's value in the modes chosen, following aliases (each in its own collection's chosen mode) at most
 * `MAX_ALIAS_DEPTH` steps; a cycle, a missing variable or a value of the wrong type resolves to nothing.
 */
export function resolveVariable(doc: TokenDoc, id: string, choice: ModeChoice | string | null | undefined): Literal | undefined {
  const modes = typeof choice === "string" || choice == null ? choiceOf(choice) : choice;
  const first = doc.variables?.[id] as Variable | undefined;
  if (!first) return undefined;
  let cur: Variable | undefined = first;
  for (let i = 0; i < MAX_ALIAS_DEPTH && cur; i++) {
    const coll = collectionOf(doc, cur);
    const v = valueIn(cur, modes[coll.id], coll.modes);
    if (!isAlias(v)) return fitsType(first.type, v) ? v : undefined;
    cur = doc.variables?.[v.alias] as Variable | undefined;
  }
  return undefined;
}

/** Would `aliasId` as a value of `id` make a cycle (or point at a missing variable or one of another type)? */
export function aliasRefused(doc: TokenDoc, id: string, aliasId: string): string | null {
  const self = doc.variables?.[id] as Variable | undefined;
  const target = doc.variables?.[aliasId] as Variable | undefined;
  if (!target) return "no such variable";
  if (self && target.type !== self.type) return "a variable of another type";
  // every variable reachable from the target, through any mode's alias
  const seen = new Set<string>();
  const queue = [aliasId];
  while (queue.length > 0 && seen.size < 10_000) {
    const cur = queue.pop()!;
    if (cur === id) return "a cycle";
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const v of Object.values((doc.variables?.[cur] as Variable | undefined)?.values ?? {})) if (isAlias(v)) queue.push(v.alias);
  }
  return null;
}

// --- styles per slot --------------------------------------------------------------

/** The layer property a slot's style writes, for each property of the style: a stroke slot puts the paints in `paint.strokes`; text takes a paint style's first solid colour. */
export function slotTargets(slot: StyleSlot, archetype: string): Record<string, string> {
  if (slot === "fill") return archetype === "text" ? { "paint.fills": "typography.color" } : { "paint.fills": "paint.fills" };
  if (slot === "stroke") return { "paint.fills": "paint.strokes" };
  return Object.fromEntries(STYLE_PROPS[SLOT_KIND[slot]].map((p) => [p, p]));
}

/** The properties whose edit lets go of a slot's style: what it writes, and the plain colour it stands in for. */
export function slotTriggers(slot: StyleSlot, archetype: string): string[] {
  const own = Object.values(slotTargets(slot, archetype));
  if (slot === "fill") return [...own, "appearance.background.color", "svg.fill"];
  if (slot === "stroke") return [...own, "svg.stroke"];
  return own;
}

/** The slots a style of a kind can sit in. */
export const slotsFor = (kind: StyleKind): StyleSlot[] => STYLE_SLOTS.filter((s) => SLOT_KIND[s] === kind);

/** A style's value with its bound variables resolved in `choice` (FigCraft `style_vars::resolved`). */
export function resolvedStyleProps(doc: TokenDoc, style: StyleDef, choice: ModeChoice): Record<string, PropValue> {
  if (!style.bound || Object.keys(style.bound).length === 0) return style.props;
  const props: Record<string, PropValue> = { ...style.props };
  for (const [key, varId] of Object.entries(style.bound)) {
    const v = resolveVariable(doc, varId, choice);
    if (v === undefined) continue;
    const m = /^(paint\.fills)\/(\d+)\/color$/.exec(key);
    if (m) {
      try {
        const list = JSON.parse(String(props[m[1]] ?? "[]")) as { type?: string; color?: string }[];
        const p = list[Number(m[2])];
        if (p && p.type === "solid" && typeof v === "string") {
          p.color = v;
          props[m[1]] = JSON.stringify(list);
        }
      } catch {
        /* junk stays as it is */
      }
    } else if ((STYLE_PROPS[style.kind] as readonly string[]).includes(key) && typeof v !== "boolean") props[key] = v;
  }
  return props;
}

/** The first solid colour of a paint list (what a text layer shows of a paint style). */
function firstSolid(json: PropValue | undefined): string | undefined {
  try {
    const list = JSON.parse(String(json ?? "[]")) as { type?: string; color?: string; visible?: boolean }[];
    return list.find((p) => p.type === "solid" && p.visible !== false && typeof p.color === "string")?.color;
  } catch {
    return undefined;
  }
}

/** What the style in a layer's slot gives it: layer property to value. Empty when the slot is empty or its style is gone. */
export function slotProps(doc: TokenDoc, layer: Pick<Layer, "archetype" | "styleRefs">, slot: StyleSlot, choice: ModeChoice = {}): Record<string, PropValue> {
  const refs = layer.styleRefs as Partial<Record<StyleSlot, string>> | undefined;
  const style = doc.styles?.[refs?.[slot] ?? ""] as StyleDef | undefined;
  if (!style || style.kind !== SLOT_KIND[slot]) return {};
  const props = resolvedStyleProps(doc, style, choice);
  const out: Record<string, PropValue> = {};
  for (const [from, to] of Object.entries(slotTargets(slot, layer.archetype))) {
    if (props[from] === undefined) continue;
    const v = to === "typography.color" ? firstSolid(props[from]) : props[from];
    if (v !== undefined) out[to] = v;
  }
  return out;
}

/**
 * A layer as it looks with its tokens applied in a mode: its styles' properties, then every property bound to a
 * variable (not detached) at that variable's value. A binding to a variable that no longer exists, or whose value
 * is the wrong kind, leaves the layer's own value. A boolean bound to `visible` shows or hides the layer. `choice`
 * gives other collections' modes (and wins over `modeId`): the modes the frames around the layer chose.
 */
export function resolveLayerTokens(layer: Layer, doc: TokenDoc, modeId: string | null | undefined, choice?: ModeChoice): Layer {
  const hasStyles = !!layer.styleRefs && !!doc.styles;
  const hasBindings = !!layer.tokens && !!doc.variables;
  if (!hasStyles && !hasBindings) return layer;
  const modes = choiceOf(modeId, choice);
  let props: Record<string, PropValue> | null = null;
  let visible: boolean | undefined;
  if (hasStyles) {
    for (const slot of STYLE_SLOTS) {
      const given = slotProps(doc, layer, slot, modes);
      for (const [path, v] of Object.entries(given)) {
        props ??= { ...layer.properties };
        props[path] = v;
      }
    }
  }
  if (hasBindings) {
    for (const [path, b] of Object.entries(layer.tokens!)) {
      if (b.detached) continue;
      const v = resolveVariable(doc, b.variable, modes);
      if (v === undefined) continue;
      if (path === "visible") {
        if (typeof v === "boolean") visible = v;
        continue;
      }
      if (typeof v === "boolean" && (doc.variables![b.variable] as Variable).type !== "boolean") continue;
      props ??= { ...layer.properties };
      props[path] = v;
    }
  }
  if (!props && visible === undefined) return layer;
  return { ...layer, ...(props ? { properties: props } : {}), ...(visible !== undefined ? { visible } : {}) };
}

/** The variables a property can be bound to: colours for a colour property, numbers for a number. */
export const variableTypeFor = (valueType: string): VariableType | null => (valueType === "color" ? "color" : valueType === "number" || valueType === "length" ? "number" : null);

/** The type of variable a property path takes (FigCraft port F10): `visible` takes a boolean, text properties a string. */
export function variableTypeForPath(path: string, valueType: string | undefined): VariableType | null {
  if (path === "visible") return "boolean";
  if (!valueType) return null;
  return variableTypeFor(valueType) ?? (valueType === "string" && (path === "content.text" || path.startsWith("typography.") || path === "button.label") ? "string" : valueType === "boolean" ? "boolean" : null);
}

// --- scopes (FigCraft `scopes_for`) ---------------------------------------------------------

export const ALL_SCOPES = "ALL_SCOPES";

/** The scopes a variable of each type can be limited to: id and label. */
export const SCOPES: Record<VariableType, readonly (readonly [string, string])[]> = {
  number: [
    ["CORNER_RADIUS", "Corner radius"],
    ["WIDTH_HEIGHT", "Width and height"],
    ["GAP", "Gap and padding"],
    ["OPACITY", "Layer opacity"],
    ["STROKE_FLOAT", "Stroke"],
    ["EFFECT_FLOAT", "Effects"],
    ["FONT_WEIGHT", "Font weight"],
    ["FONT_SIZE", "Font size"],
    ["LINE_HEIGHT", "Line height"],
    ["LETTER_SPACING", "Letter spacing"],
    ["PARAGRAPH_SPACING", "Paragraph spacing"],
    ["PARAGRAPH_INDENT", "Paragraph indent"],
    ["TEXT_CONTENT", "Text content"],
  ],
  color: [
    ["FRAME_FILL", "Frame fill"],
    ["SHAPE_FILL", "Shape fill"],
    ["TEXT_FILL", "Text fill"],
    ["STROKE_COLOR", "Stroke"],
    ["EFFECT_COLOR", "Effects"],
  ],
  string: [
    ["TEXT_CONTENT", "Text content"],
    ["FONT_FAMILY", "Font family"],
    ["FONT_STYLE", "Font style"],
  ],
  boolean: [],
};

/** Is `scope` one a variable of `type` can be limited to (or one of the "every property" ids)? */
export const scopeKnown = (type: VariableType, scope: string): boolean => scope === ALL_SCOPES || (scope === "ALL_FILLS" && type === "color") || SCOPES[type].some(([k]) => k === scope);

/** A scope list in canonical form: known ids for `type` only, no repeats, and undefined (no limit) when it names every scope. */
export function normalizeScopes(type: VariableType, scopes: readonly string[]): string[] | undefined {
  const list: string[] = [];
  for (const s of scopes) if (scopeKnown(type, s) && !list.includes(s)) list.push(s);
  const allowed = SCOPES[type];
  const all = list.includes(ALL_SCOPES) || (allowed.length > 0 && allowed.every(([k]) => list.includes(k)));
  return all ? undefined : list;
}

/** Does a picker offer `variable` for a property of `scope`? (No scope known for the property: every variable of its type.) */
export function inScope(variable: Pick<Variable, "scopes">, scope: string | null): boolean {
  if (!variable.scopes || scope === null) return true;
  return variable.scopes.some((s) => s === scope || s === ALL_SCOPES || (s === "ALL_FILLS" && scope.endsWith("_FILL")));
}

const FRAME_LIKE = new Set(["container", "section", "form", "generic", "button", "badge", "fab"]);

/** The scope of a property on a layer of an archetype, or null when no scope covers it. */
export function scopeOfPath(path: string, archetype: string): string | null {
  if (path === "content.text" || path === "button.label") return "TEXT_CONTENT";
  if (path === "typography.fontFamily") return "FONT_FAMILY";
  if (path === "typography.fontStyle") return "FONT_STYLE";
  if (path === "typography.fontSize") return "FONT_SIZE";
  if (path === "typography.fontWeight") return "FONT_WEIGHT";
  if (path === "typography.lineHeight") return "LINE_HEIGHT";
  if (path === "typography.letterSpacing") return "LETTER_SPACING";
  if (path === "typography.paragraphSpacing") return "PARAGRAPH_SPACING";
  if (path === "typography.paragraphIndent") return "PARAGRAPH_INDENT";
  if (path === "typography.color") return "TEXT_FILL";
  if (path === "appearance.background.color" || path === "paint.fills" || path === "svg.fill") return archetype === "text" ? "TEXT_FILL" : FRAME_LIKE.has(archetype) && path !== "svg.fill" ? "FRAME_FILL" : "SHAPE_FILL";
  if (path === "appearance.border.color" || path === "svg.stroke" || path === "paint.strokes") return "STROKE_COLOR";
  if (path === "appearance.border.width" || path === "svg.strokeWidth" || path.startsWith("stroke.")) return "STROKE_FLOAT";
  if (path === "appearance.radius" || path.startsWith("shape.corner") || path.startsWith("appearance.radius")) return "CORNER_RADIUS";
  if (/^frame\.(width|height)$|^sizing\.(min|max)/.test(path)) return "WIDTH_HEIGHT";
  if (path === "layout.gap" || path === "layout.rowGap" || path.startsWith("layout.padding")) return "GAP";
  if (path === "appearance.opacity") return "OPACITY";
  if (path === "filter.blur" || path === "paint.backgroundBlur" || path.startsWith("shadow.")) return "EFFECT_FLOAT";
  return null;
}

/** The variables a picker offers for a property of a layer: the right type, in scope. */
export function variablesFor(doc: Pick<MotionDocument, "variables">, path: string, archetype: string, valueType: string | undefined): Variable[] {
  const type = variableTypeForPath(path, valueType);
  if (!type) return [];
  const scope = scopeOfPath(path, archetype);
  return (Object.values(doc.variables ?? {}) as Variable[]).filter((v) => v.type === type && inScope(v, scope));
}

/** A variable's name in code on a platform: its own, else (for the web) a CSS custom property from its name. */
export function codeSyntaxOf(variable: Pick<Variable, "name" | "codeSyntax">, platform: CodePlatform = "WEB"): string {
  const own = variable.codeSyntax?.[platform];
  if (own) return own;
  const slug = variable.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "var";
  return platform === "WEB" ? `var(--${slug})` : slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

// --- modes chosen by frames -------------------------------------------------------------

/**
 * The modes each layer sees: what the frames around it chose (`variableModes`, the nearest frame winning for each
 * collection). Only layers under a frame that chose something are in the map.
 */
export function inheritedModes(layers: Record<string, Pick<Layer, "parentId"> & { variableModes?: ModeChoice }>): Map<string, ModeChoice> {
  const out = new Map<string, ModeChoice>();
  if (!Object.values(layers).some((l) => l.variableModes && Object.keys(l.variableModes).length > 0)) return out;
  const memo = new Map<string, ModeChoice | null>();
  const of = (id: string, depth = 0): ModeChoice | null => {
    if (memo.has(id)) return memo.get(id)!;
    const l = layers[id];
    if (!l || depth > 10_000) return null;
    const above = l.parentId ? of(l.parentId, depth + 1) : null;
    const own = l.variableModes && Object.keys(l.variableModes).length > 0 ? l.variableModes : null;
    const mine = own ? { ...(above ?? {}), ...own } : above;
    memo.set(id, mine);
    return mine;
  };
  for (const id of Object.keys(layers)) {
    const c = of(id);
    if (c) out.set(id, c);
  }
  return out;
}

/** Variables grouped by the first part of their name, for a list: `brand/primary` is in `brand`. */
export function groupVariables(variables: readonly Variable[]): { group: string; items: Variable[] }[] {
  const out = new Map<string, Variable[]>();
  for (const v of [...variables].sort((a, b) => a.name.localeCompare(b.name))) {
    const g = v.name.includes("/") ? v.name.slice(0, v.name.indexOf("/")) : "";
    (out.get(g) ?? out.set(g, []).get(g)!).push(v);
  }
  return [...out].map(([group, items]) => ({ group, items }));
}
