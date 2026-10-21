/**
 * ============================================================================
 * STYLES FROM RENDERED MARKUP (ROADMAP Phase 49)
 * ============================================================================
 * Each element of the base rendering (the widest breakpoint, the first mode) gets a class with its declarations.
 * Every other rendering of the same page (a narrower breakpoint, another mode) is compared with the one before it:
 * the declarations that differ become a rule inside the media query (`max-width`) or the mode selector, so the
 * cascade is the one the editor shows. An element that is not drawn at a breakpoint (hidden there) gets
 * `display: none`. Class names are readable (the layer's name and a short id).
 * ============================================================================
 */

import type { ENode } from "./markup";
import { walk } from "./markup";

export type Decl = [string, string];

/** A rendering of one page at one breakpoint in one mode, as a map from element key to its declarations and tag. */
export interface Rendering {
  /** Key to declarations (ordered), for every element in this rendering. */
  styles: Map<string, Decl[]>;
}

/** A stable key for every element of a tree: its layer id, or the layer's key with the path inside it (for the inside of a shape). */
export function keyElements(roots: readonly ENode[]): Map<ENode, string> {
  const keys = new Map<ENode, string>();
  const visit = (n: ENode, layerKey: string, path: string) => {
    const id = n.attrs["data-element-id"];
    let key: string;
    if (id) key = id;
    else key = `${layerKey}${path}`;
    keys.set(n, key);
    const nextLayer = id ?? layerKey;
    const base = id ? "" : path;
    const counts = new Map<string, number>();
    n.children.forEach((c) => {
      if (c.tag === "#text") return;
      const k = c.tag;
      const i = counts.get(k) ?? 0;
      counts.set(k, i + 1);
      visit(c, nextLayer, `${base}/${k}[${i}]`);
    });
  };
  const counts = new Map<string, number>();
  for (const r of roots) {
    const i = counts.get(r.tag) ?? 0;
    counts.set(r.tag, i + 1);
    visit(r, "", `/${r.tag}[${i}]`);
  }
  return keys;
}

/** SVG presentation attributes: what an attribute says, CSS can say too (a shape drawn with another stroke width at a breakpoint). */
export const PRESENTATION_ATTRS = new Set(["fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "opacity", "stop-color", "stop-opacity", "clip-rule", "vector-effect", "visibility"]);
const ATTR_MARK = "@attr:";

export const isAttrDecl = (d: Decl): boolean => d[0].startsWith(ATTR_MARK);
/** A declaration as CSS: an attribute carried as a declaration loses its mark. */
export const toCss = (d: Decl): Decl => (isAttrDecl(d) ? [d[0].slice(ATTR_MARK.length), d[1]] : d);

export function renderingOf(roots: readonly ENode[]): { rendering: Rendering; keys: Map<ENode, string>; byKey: Map<string, ENode> } {
  const keys = keyElements(roots);
  const styles = new Map<string, Decl[]>();
  const byKey = new Map<string, ENode>();
  walk(roots, (n) => {
    if (n.tag === "#text") return;
    const k = keys.get(n)!;
    const attrs: Decl[] = Object.entries(n.attrs).filter(([a]) => PRESENTATION_ATTRS.has(a)).map(([a, v]) => [`${ATTR_MARK}${a}`, v]);
    styles.set(k, attrs.length > 0 ? [...n.style, ...attrs] : n.style);
    byKey.set(k, n);
  });
  return { rendering: { styles }, keys, byKey };
}

const asMap = (d: readonly Decl[]): Map<string, string> => new Map(d);

/** The declarations of `next` that differ from `prev` (a property `prev` had and `next` doesn't is reset to its initial value). */
export function diffDecls(prev: readonly Decl[], next: readonly Decl[]): Decl[] {
  const a = asMap(prev);
  const out: Decl[] = [];
  for (const [k, v] of next) if (a.get(k) !== v) out.push([k, v]);
  const b = asMap(next);
  for (const [k] of prev) if (!b.has(k)) out.push([k, "initial"]);
  return out;
}

/** One rule: a selector and its declarations, inside optional wrappers (`@media …`). */
export interface Rule {
  selector: string;
  decls: Decl[];
}

export interface CssBlock {
  /** `@media (max-width: 768px)`, or null for rules at the top level. */
  wrapper: string | null;
  rules: Rule[];
}

export const declText = (decls: readonly Decl[], indent = "  "): string => decls.map(([k, v]) => `${indent}${k}: ${v};`).join("\n");

export function cssText(blocks: readonly CssBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    const body = b.rules.filter((r) => r.decls.length > 0).map((r) => `${b.wrapper ? "  " : ""}${r.selector} {\n${declText(r.decls, b.wrapper ? "    " : "  ")}\n${b.wrapper ? "  " : ""}}`);
    if (body.length === 0) continue;
    out.push(b.wrapper ? `${b.wrapper} {\n${body.join("\n")}\n}` : body.join("\n"));
  }
  return `${out.join("\n\n")}\n`;
}

/** A class name from a layer's name and id: `hero_ab12cd`. Always starts with a letter. */
export function classNameFor(name: string, id: string, used: Set<string>): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "el";
  const short = id.replace(/[^a-zA-Z0-9]/g, "").slice(-6);
  let cls = `${/^[a-z]/.test(slug) ? slug : `l_${slug}`}_${short}`;
  for (let n = 2; used.has(cls); n++) cls = `${cls.replace(/_\d+$/, "")}_${n}`;
  used.add(cls);
  return cls;
}

// --- Tailwind: one arbitrary-property utility for each declaration ---------------------

/** `[display:flex]`, `[grid-template-columns:repeat(2,minmax(0,1fr))]`: Tailwind's arbitrary property syntax (spaces become underscores). */
export function tailwindUtility(prop: string, value: string, variant = ""): string {
  const v = value.replace(/\s+/g, "_").replace(/\]/g, "\\]");
  return `${variant}[${prop}:${v}]`;
}
