/** Writing a markup tree as HTML and as JSX (ROADMAP Phase 49). */

import { decodeText, escapeAttr, isVoid, type ENode } from "./markup";

// --- HTML ----------------------------------------------------------------------------

export function toHtml(nodes: readonly ENode[], indent = ""): string {
  return nodes.map((n) => nodeHtml(n, indent)).join("");
}

function attrText(n: ENode): string {
  return Object.entries(n.attrs)
    .map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`))
    .join("");
}

function nodeHtml(n: ENode, indent: string): string {
  if (n.tag === "#text") return n.text ?? "";
  const open = `<${n.tag}${attrText(n)}`;
  if (isVoid(n.tag)) return `${indent}${open}>\n`;
  const onlyText = n.children.every((c) => c.tag === "#text");
  if (onlyText) return `${indent}${open}>${toHtml(n.children)}</${n.tag}>\n`;
  return `${indent}${open}>\n${toHtml(n.children, `${indent}  `)}${indent}</${n.tag}>\n`;
}

// --- JSX -----------------------------------------------------------------------------

/** HTML attribute names React wants spelled differently. */
const RENAME: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  autofocus: "autoFocus",
  autocomplete: "autoComplete",
  colspan: "colSpan",
  rowspan: "rowSpan",
  contenteditable: "contentEditable",
  crossorigin: "crossOrigin",
  srcset: "srcSet",
  "xlink:href": "xlinkHref",
  "xml:space": "xmlSpace",
  "accept-charset": "acceptCharset",
  "http-equiv": "httpEquiv",
};

/** `stroke-width` as `strokeWidth`; `data-*` and `aria-*` stay as they are. */
export function jsxAttrName(name: string): string {
  if (RENAME[name]) return RENAME[name];
  if (name.startsWith("data-") || name.startsWith("aria-")) return name;
  return name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

const BOOLEAN_ATTRS = new Set(["disabled", "checked", "readonly", "required", "autofocus", "multiple", "selected", "hidden", "controls", "autoplay", "loop", "muted", "open"]);

export interface JsxOptions {
  /** How a class name is written: a string (global CSS, Tailwind) or `styles.name` (CSS Modules). */
  classExpr: (cls: string) => string;
}

function jsxAttrs(n: ENode, opts: JsxOptions): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(n.attrs)) {
    if (k === "class") {
      // a module class is one name; a Tailwind list is a string
      parts.push(`className=${opts.classExpr(v)}`);
      continue;
    }
    const name = jsxAttrName(k);
    if (v === "" && (BOOLEAN_ATTRS.has(k) || k.startsWith("data-"))) {
      parts.push(name);
      continue;
    }
    parts.push(/["\n{}]/.test(v) ? `${name}={${JSON.stringify(v)}}` : `${name}="${v}"`);
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

function textJsx(raw: string): string {
  const t = decodeText(raw);
  // plain words can stay as they are; anything JSX would read differently is written as a string
  if (/^[^<>{}&"\n]*$/.test(t) && !/^\s|\s$|\s{2}/.test(t)) return t;
  return `{${JSON.stringify(t)}}`;
}

export function toJsx(nodes: readonly ENode[], opts: JsxOptions, indent = "      "): string {
  return nodes.map((n) => nodeJsx(n, opts, indent)).join("");
}

function nodeJsx(n: ENode, opts: JsxOptions, indent: string): string {
  if (n.tag === "#text") return `${indent}${textJsx(n.text ?? "")}\n`;
  const attrs = jsxAttrs(n, opts);
  if (isVoid(n.tag) || n.children.length === 0) return `${indent}<${n.tag}${attrs} />\n`;
  if (n.children.length === 1 && n.children[0].tag === "#text") {
    const inline = textJsx(n.children[0].text ?? "");
    return `${indent}<${n.tag}${attrs}>${inline}</${n.tag}>\n`;
  }
  return `${indent}<${n.tag}${attrs}>\n${toJsx(n.children, opts, `${indent}  `)}${indent}</${n.tag}>\n`;
}
