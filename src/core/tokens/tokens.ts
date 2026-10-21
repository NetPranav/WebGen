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
 * ============================================================================
 */

import type { Layer, MotionDocument } from "../document/schema";
import type { PropValue } from "../document/registry";

export interface Mode {
  id: string;
  name: string;
}

export type VariableType = "color" | "number";

export interface Variable {
  id: string;
  /** A name, with `/` to group (`brand/primary`). */
  name: string;
  type: VariableType;
  /** Mode id to value: a colour string or a number. */
  values: Record<string, string | number>;
}

export type StyleKind = "text" | "effect";

export interface StyleDef {
  id: string;
  name: string;
  kind: StyleKind;
  props: Record<string, PropValue>;
}

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

/** The properties a text style carries, and an effect style. A layer following a style takes exactly these from it. */
export const STYLE_PROPS: Record<StyleKind, readonly string[]> = {
  text: ["typography.fontFamily", "typography.fontSize", "typography.fontWeight", "typography.fontStyle", "typography.lineHeight", "typography.letterSpacing", "typography.textTransform", "typography.textDecoration"],
  effect: ["paint.shadows", "filter.blur", "paint.backgroundBlur"],
};

export const modesOf = (doc: Pick<MotionDocument, "modes">): Mode[] => (doc.modes && doc.modes.length > 0 ? doc.modes : [...DEFAULT_MODES]);
export const defaultModeOf = (doc: Pick<MotionDocument, "modes">): Mode => modesOf(doc)[0];

/** Does the document have anything to resolve? (Most documents have none: then nothing is copied.) */
export function hasTokens(doc: Pick<MotionDocument, "variables" | "styles">): boolean {
  return (!!doc.variables && Object.keys(doc.variables).length > 0) || (!!doc.styles && Object.keys(doc.styles).length > 0);
}

/** A variable's value in a mode; a mode it has no value for shows the first mode's. */
export function valueIn(variable: Variable, modeId: string | null | undefined, modes: readonly Mode[]): string | number | undefined {
  if (modeId && variable.values[modeId] !== undefined) return variable.values[modeId];
  for (const m of modes) if (variable.values[m.id] !== undefined) return variable.values[m.id];
  return Object.values(variable.values)[0];
}

const matches = (type: VariableType, v: unknown): v is string | number => (type === "color" ? typeof v === "string" : typeof v === "number" && Number.isFinite(v));

/**
 * A layer as it looks with its tokens applied in a mode: its styles' properties, then every property bound to a
 * variable (not detached) at that variable's value. A binding to a variable that no longer exists, or whose value
 * is the wrong kind, leaves the layer's own value.
 */
export function resolveLayerTokens(layer: Layer, doc: Pick<MotionDocument, "variables" | "styles" | "modes">, modeId: string | null | undefined): Layer {
  const hasStyles = !!layer.styleRefs && !!doc.styles;
  const hasBindings = !!layer.tokens && !!doc.variables;
  if (!hasStyles && !hasBindings) return layer;
  const modes = modesOf(doc);
  let props: Record<string, PropValue> | null = null;
  if (hasStyles) {
    for (const kind of ["text", "effect"] as const) {
      const style = doc.styles![layer.styleRefs![kind] ?? ""];
      if (!style || style.kind !== kind) continue;
      for (const path of STYLE_PROPS[kind]) {
        if (style.props[path] === undefined) continue;
        props ??= { ...layer.properties };
        props[path] = style.props[path];
      }
    }
  }
  if (hasBindings) {
    for (const [path, b] of Object.entries(layer.tokens!)) {
      if (b.detached) continue;
      const variable = doc.variables![b.variable];
      if (!variable) continue;
      const v = valueIn(variable, modeId, modes);
      if (!matches(variable.type, v)) continue;
      props ??= { ...layer.properties };
      props[path] = v;
    }
  }
  return props ? { ...layer, properties: props } : layer;
}

/** The variables a property can be bound to: colours for a colour property, numbers for a number. */
export const variableTypeFor = (valueType: string): VariableType | null => (valueType === "color" ? "color" : valueType === "number" || valueType === "length" ? "number" : null);

/** Variables grouped by the first part of their name, for a list: `brand/primary` is in `brand`. */
export function groupVariables(variables: readonly Variable[]): { group: string; items: Variable[] }[] {
  const out = new Map<string, Variable[]>();
  for (const v of [...variables].sort((a, b) => a.name.localeCompare(b.name))) {
    const g = v.name.includes("/") ? v.name.slice(0, v.name.indexOf("/")) : "";
    (out.get(g) ?? out.set(g, []).get(g)!).push(v);
  }
  return [...out].map(([group, items]) => ({ group, items }));
}
