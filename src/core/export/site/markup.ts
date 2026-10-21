/**
 * ============================================================================
 * MARKUP AS A TREE (ROADMAP Phase 49)
 * ============================================================================
 * The static export draws each page with the stage's own render definitions (so it looks the same) into markup, then
 * works on that markup as a tree: the inline styles of each element become classes and responsive rules, the tree
 * is written back as HTML or as JSX. The markup comes from React's `renderToStaticMarkup`, which is regular: tags
 * lower-case, attribute values in double quotes, text escaped, void tags without a closing tag. The parser here reads
 * exactly that, nothing more.
 * ============================================================================
 */

export interface ENode {
  /** The tag, or `#text` for text. */
  tag: string;
  attrs: Record<string, string>;
  /** Inline style declarations, in order. */
  style: [string, string][];
  children: ENode[];
  /** For text nodes: the text, as it appears in the markup (entities not decoded). */
  text?: string;
  /** The layer this element draws, once the markup has been planned (the plan removes `data-element-id`). */
  layerId?: string;
  /** A text node written as a JSX expression (`props.label ?? "Save"`) instead of text: a component's text property. */
  expr?: string;
  /** Attributes written as JSX expressions (`{ src: 'props.image ?? "a.png"' }`): a component's picture property. */
  attrExprs?: Record<string, string>;
  /** The root of a component: its `className` joins the caller's (`props.className`). */
  mergeClass?: boolean;
  /** The element only exists when this expression is not false (`props.showIcon`): a component's visibility property. */
  showIf?: string;
  /** This node is a use of a component: its name and the props it passes (`tag` is `#component`). */
  component?: { name: string; props: Record<string, string | number | boolean> };
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** Declarations of a `style="..."` attribute value (already unescaped), in order. */
export function parseStyle(value: string): [string, string][] {
  const out: [string, string][] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  const push = (end: number) => {
    const part = value.slice(start, end);
    const i = part.indexOf(":");
    if (i > 0) {
      const name = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      if (name && v) out.push([name, v]);
    }
  };
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quote) {
      if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === ";" && depth === 0) {
      push(i);
      start = i + 1;
    }
  }
  push(value.length);
  return out;
}

export function unescapeAttr(v: string): string {
  return v.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/** Reads markup into a forest. Throws on markup it can't read (an unclosed tag): the caller only ever feeds it React's output. */
export function parseMarkup(html: string): ENode[] {
  const root: ENode = { tag: "#root", attrs: {}, style: [], children: [] };
  const stack: ENode[] = [root];
  let i = 0;
  const n = html.length;
  while (i < n) {
    if (html[i] === "<") {
      if (html.startsWith("<!--", i)) {
        const end = html.indexOf("-->", i);
        i = end < 0 ? n : end + 3;
        continue;
      }
      if (html[i + 1] === "/") {
        const end = html.indexOf(">", i);
        const name = html.slice(i + 2, end).trim();
        const top = stack.pop();
        if (!top || top.tag !== name) throw new Error(`Unbalanced markup: </${name}> closes <${top?.tag}>`);
        i = end + 1;
        continue;
      }
      // an opening tag: name, attributes, maybe self-closing
      let j = i + 1;
      while (j < n && /[^\s/>]/.test(html[j])) j++;
      const tag = html.slice(i + 1, j);
      const attrs: Record<string, string> = {};
      let style: [string, string][] = [];
      for (;;) {
        while (j < n && /\s/.test(html[j])) j++;
        if (html[j] === ">" || (html[j] === "/" && html[j + 1] === ">") || j >= n) break;
        let k = j;
        while (k < n && /[^\s=/>]/.test(html[k])) k++;
        const name = html.slice(j, k);
        let value = "";
        if (html[k] === "=") {
          if (html[k + 1] === '"') {
            const end = html.indexOf('"', k + 2);
            value = html.slice(k + 2, end);
            j = end + 1;
          } else {
            let e = k + 1;
            while (e < n && /[^\s>]/.test(html[e])) e++;
            value = html.slice(k + 1, e);
            j = e;
          }
        } else j = k;
        if (name === "style") style = parseStyle(unescapeAttr(value));
        else if (name) attrs[name] = unescapeAttr(value);
      }
      const selfClose = html[j] === "/";
      const node: ENode = { tag, attrs, style, children: [] };
      stack[stack.length - 1].children.push(node);
      i = html.indexOf(">", j) + 1;
      if (!selfClose && !VOID.has(tag)) stack.push(node);
      else if (selfClose || VOID.has(tag)) {
        /* closed on the spot */
      }
      continue;
    }
    const next = html.indexOf("<", i);
    const end = next < 0 ? n : next;
    const text = html.slice(i, end);
    if (text) stack[stack.length - 1].children.push({ tag: "#text", attrs: {}, style: [], children: [], text });
    i = end;
  }
  if (stack.length !== 1) throw new Error(`Unclosed <${stack[stack.length - 1].tag}>`);
  return root.children;
}

export function decodeText(t: string): string {
  return t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d))).replace(/&amp;/g, "&");
}

export const escapeText = (t: string): string => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const escapeAttr = (v: string): string => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Walks a forest depth first. */
export function walk(nodes: readonly ENode[], fn: (n: ENode, parent: ENode | null) => void, parent: ENode | null = null): void {
  for (const n of nodes) {
    fn(n, parent);
    walk(n.children, fn, n);
  }
}

export const isVoid = (tag: string): boolean => VOID.has(tag);

/** The element's id in the document (`data-element-id`), or null for markup that isn't a layer (the inside of a shape's SVG). */
export const layerIdOf = (n: ENode): string | null => n.attrs["data-element-id"] ?? null;
