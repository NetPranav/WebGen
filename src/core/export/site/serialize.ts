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
  // text mixed with elements (styled runs, a list marker before its words) is written as it is: an added line break
  // or indent would show in text that keeps its white space
  if (n.children.length === 0 || n.children.some((c) => c.tag === "#text")) return `${indent}${open}>${n.children.map(inlineHtml).join("")}</${n.tag}>\n`;
  return `${indent}${open}>\n${toHtml(n.children, `${indent}  `)}${indent}</${n.tag}>\n`;
}

/** A node with nothing added around it or inside it. */
function inlineHtml(n: ENode): string {
  if (n.tag === "#text") return n.text ?? "";
  const open = `<${n.tag}${attrText(n)}>`;
  return isVoid(n.tag) ? open : `${open}${n.children.map(inlineHtml).join("")}</${n.tag}>`;
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
  /** How a class name is written as a JSX attribute value: `"name"`, or `{styles["name"]}` (CSS Modules). */
  classExpr: (cls: string) => string;
  /** The same as an expression: `"name"` or `styles["name"]`. */
  classValue: (cls: string) => string;
}

function jsxAttrs(n: ENode, opts: JsxOptions): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(n.attrs)) {
    if (n.attrExprs?.[k]) {
      parts.push(`${jsxAttrName(k)}={${n.attrExprs[k]}}`);
      continue;
    }
    if (k === "class") {
      // a module class is one name; a Tailwind list is a string; the root of a component adds the caller's own
      parts.push(n.mergeClass ? `className={[${opts.classValue(v)}, props.className].filter(Boolean).join(" ")}` : `className=${opts.classExpr(v)}`);
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

function propJsx(v: string | number | boolean): string {
  return typeof v === "string" ? (/["\n{}]/.test(v) ? `{${JSON.stringify(v)}}` : `"${v}"`) : `{${JSON.stringify(v)}}`;
}

function nodeJsx(n: ENode, opts: JsxOptions, indent: string): string {
  if (n.showIf) {
    const inner = nodeJsx({ ...n, showIf: undefined }, opts, `${indent}  `);
    return `${indent}{${n.showIf} && (\n${inner}${indent})}\n`;
  }
  if (n.tag === "#text") return n.expr ? `${indent}{${n.expr}}\n` : `${indent}${textJsx(n.text ?? "")}\n`;
  if (n.tag === "#component" && n.component) {
    const props = Object.entries(n.component.props).map(([k, v]) => `${k}=${propJsx(v)}`);
    const cls = n.attrs.class ? [`className=${opts.classExpr(n.attrs.class)}`] : [];
    return `${indent}<${n.component.name}${[...cls, ...props].map((p) => ` ${p}`).join("")} />\n`;
  }
  const attrs = jsxAttrs(n, opts);
  if (isVoid(n.tag) || n.children.length === 0) return `${indent}<${n.tag}${attrs} />\n`;
  if (n.children.length === 1 && n.children[0].tag === "#text") {
    const child = n.children[0];
    const inline = child.expr ? `{${child.expr}}` : textJsx(child.text ?? "");
    return `${indent}<${n.tag}${attrs}>${inline}</${n.tag}>\n`;
  }
  return `${indent}<${n.tag}${attrs}>\n${toJsx(n.children, opts, `${indent}  `)}${indent}</${n.tag}>\n`;
}
