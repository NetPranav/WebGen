/**
 * ============================================================================
 * SVG SANITISER (ROADMAP Phase 36, decision record 0008 rule R5)
 * ============================================================================
 * An imported SVG is cleaned once, when it is imported, and the cleaned text is what gets stored and drawn. It is
 * never the original. The cleaner reads the file with a small tokenizer (no DOM, so it runs the same in a test and a
 * worker, and nothing is ever parsed as HTML) and writes a new file out of an allow-list of elements and
 * attributes. What isn't on the list is not copied. In particular it drops scripts, styles, `foreignObject`, event
 * handlers, animations that could set an attribute later, every `href` that isn't a `#fragment` (or, on an
 * `<image>`, a PNG, JPEG, GIF or WebP data URL), and every `url()` that points outside the document.
 * Because the output is built from tokens we chose to keep, with every value re-escaped, how a browser would
 * have read the original doesn't matter.
 * ============================================================================
 */

export class SvgRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SvgRejected";
  }
}

export const MAX_SVG_CHARS = 5_000_000;
const MAX_ELEMENTS = 20_000;
const MAX_DEPTH = 64;
const MAX_ATTR = 200_000;

const ELEMENTS = [
  "svg", "g", "defs", "symbol", "use", "title", "desc", "metadata",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "textPath", "image",
  "linearGradient", "radialGradient", "stop", "pattern", "clipPath", "mask", "marker",
  "filter", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap",
  "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode",
  "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence",
];
const ELEMENT_BY_LOWER = new Map(ELEMENTS.map((e) => [e.toLowerCase(), e]));

/** Elements dropped with everything inside them. Anything else not on the list is unwrapped: its children are kept. */
const DROP_SUBTREE = new Set([
  "script", "style", "foreignobject", "iframe", "object", "embed", "link", "meta", "set", "animate", "animatetransform", "animatemotion", "animatecolor",
  "handler", "listener", "audio", "video", "canvas", "html", "head", "body", "form", "input", "textarea", "button", "noscript", "template", "a", "switch", "cursor", "font", "font-face", "view",
]);

const ATTRIBUTES = [
  // identity and structure
  "id", "class", "xmlns", "viewBox", "preserveAspectRatio", "version", "x", "y", "width", "height", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "fx", "fy", "fr",
  "d", "points", "pathLength", "transform", "dx", "dy", "rotate", "textLength", "lengthAdjust", "startOffset", "method", "spacing", "refX", "refY", "markerWidth", "markerHeight", "markerUnits", "orient",
  // paint
  "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset",
  "opacity", "color", "stop-color", "stop-opacity", "offset", "visibility", "display", "overflow", "clip-path", "clip-rule", "mask", "filter", "marker-start", "marker-mid", "marker-end",
  "gradientUnits", "gradientTransform", "spreadMethod", "patternUnits", "patternContentUnits", "patternTransform", "clipPathUnits", "maskUnits", "maskContentUnits", "primitiveUnits", "filterUnits",
  "flood-color", "flood-opacity", "lighting-color", "mix-blend-mode", "isolation", "vector-effect", "shape-rendering", "color-interpolation", "color-interpolation-filters",
  // text
  "font-family", "font-size", "font-style", "font-weight", "font-variant", "text-anchor", "text-decoration", "letter-spacing", "word-spacing", "dominant-baseline", "alignment-baseline", "baseline-shift", "writing-mode", "direction", "xml:space",
  // filters
  "in", "in2", "result", "mode", "type", "values", "stdDeviation", "operator", "k1", "k2", "k3", "k4", "radius", "scale", "xChannelSelector", "yChannelSelector",
  "baseFrequency", "numOctaves", "seed", "stitchTiles", "tableValues", "slope", "intercept", "amplitude", "exponent", "order", "kernelMatrix", "divisor", "bias", "targetX", "targetY", "edgeMode",
  "surfaceScale", "diffuseConstant", "specularConstant", "specularExponent", "azimuth", "elevation", "z", "pointsAtX", "pointsAtY", "pointsAtZ", "limitingConeAngle", "flood", "preserveAlpha",
  // accessibility
  "role", "aria-label", "aria-hidden", "aria-labelledby", "aria-describedby", "focusable",
  // references, checked below
  "href", "xlink:href", "style",
];
const ATTRIBUTE_BY_LOWER = new Map(ATTRIBUTES.map((a) => [a.toLowerCase(), a]));

const IMAGE_DATA = /^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i;

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (_m, e: string) => {
    if (e === "amp") return "&";
    if (e === "lt") return "<";
    if (e === "gt") return ">";
    if (e === "quot") return '"';
    if (e === "apos") return "'";
    const code = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });
}

const escapeAttr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeText = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Whether a value is safe anywhere an attribute or a style declaration can carry one. */
function safeValue(value: string): boolean {
  // look at it the way a browser would after decoding, ignoring whitespace and control characters people hide scripts behind
  const flat = value.replace(/[\x00-\x20\x7f-\x9f\u200b-\u200f\u2028\u2029\ufeff]+/g, "").toLowerCase();
  if (/javascript:|vbscript:|livescript:|data:|expression\(|behavior:|@import|-moz-binding|<script|\\00|\\u00/.test(flat)) return false;
  if (/\bon[a-z]+\s*=/i.test(value)) return false; // text that looks like a handler assignment is not a value
  for (const m of value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    if (!m[2].trim().startsWith("#")) return false; // only references inside the document
  }
  return true;
}

/** A `style` attribute reduced to declarations whose property is plain and whose value is safe. */
function safeStyle(value: string): string {
  return value
    .split(";")
    .map((d) => d.trim())
    .filter((d) => {
      const i = d.indexOf(":");
      if (i <= 0) return false;
      const prop = d.slice(0, i).trim();
      const val = d.slice(i + 1).trim();
      return /^[a-zA-Z-]+$/.test(prop) && !/^(behavior|-moz-binding)$/i.test(prop) && val.length > 0 && val.length < 2000 && safeValue(val);
    })
    .join("; ");
}

function cleanAttribute(element: string, name: string, raw: string): [string, string] | null {
  const canonical = ATTRIBUTE_BY_LOWER.get(name.toLowerCase());
  if (!canonical || raw.length > MAX_ATTR) return null;
  const value = decodeEntities(raw);
  if (canonical === "xmlns") return value === "http://www.w3.org/2000/svg" ? ["xmlns", value] : null;
  if (canonical === "href" || canonical === "xlink:href") {
    const v = value.trim();
    if (v.startsWith("#") && /^#[A-Za-z0-9_.:-]{1,200}$/.test(v)) return ["href", v];
    if (element === "image" && IMAGE_DATA.test(v)) return ["href", v];
    return null;
  }
  if (canonical === "style") {
    const s = safeStyle(value);
    return s ? ["style", s] : null;
  }
  return safeValue(value) ? [canonical, value] : null;
}

interface Tag {
  kind: "open" | "close" | "self";
  name: string;
  attrs: [string, string][];
}

type Token = { type: "tag"; tag: Tag } | { type: "text"; text: string };

/** Splits the text into tags and text. Comments, processing instructions, doctypes and CDATA wrappers are handled here; nothing else is interpreted. */
function* tokenize(input: string): Generator<Token> {
  let i = 0;
  const n = input.length;
  while (i < n) {
    const lt = input.indexOf("<", i);
    if (lt < 0) {
      yield { type: "text", text: input.slice(i) };
      return;
    }
    if (lt > i) yield { type: "text", text: input.slice(i, lt) };
    i = lt;
    if (input.startsWith("<!--", i)) {
      const end = input.indexOf("-->", i + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (input.startsWith("<![CDATA[", i)) {
      const end = input.indexOf("]]>", i + 9);
      yield { type: "text", text: input.slice(i + 9, end < 0 ? n : end) };
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (input.startsWith("<?", i)) {
      const end = input.indexOf("?>", i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (input.startsWith("<!", i)) {
      // a doctype, possibly with an internal subset in brackets: skip all of it
      let depth = 0;
      let j = i + 2;
      for (; j < n; j++) {
        const c = input[j];
        if (c === "[") depth++;
        else if (c === "]") depth = Math.max(0, depth - 1);
        else if (c === ">" && depth === 0) break;
      }
      i = j + 1;
      continue;
    }
    // a tag: find its end, respecting quotes
    let j = i + 1;
    let quote = "";
    for (; j < n; j++) {
      const c = input[j];
      if (quote) {
        if (c === quote) quote = "";
      } else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (j >= n) return; // an unterminated tag: nothing more can be trusted
    const body = input.slice(i + 1, j);
    i = j + 1;
    const closing = body.startsWith("/");
    const selfClosing = body.endsWith("/");
    const inner = body.slice(closing ? 1 : 0, selfClosing && !closing ? -1 : undefined).trim();
    const m = /^([A-Za-z_][A-Za-z0-9_.:-]*)/.exec(inner);
    if (!m) continue;
    const name = m[1];
    const attrs: [string, string][] = [];
    if (!closing) {
      const rest = inner.slice(name.length);
      const re = /([^\s=/"'<>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let a: RegExpExecArray | null;
      while ((a = re.exec(rest))) attrs.push([a[1], a[3] ?? a[4] ?? ""]);
    }
    yield { type: "tag", tag: { kind: closing ? "close" : selfClosing ? "self" : "open", name, attrs } };
  }
}

/** Cleans SVG text. Throws `SvgRejected` when it isn't an SVG, is too big, or nothing of it is left. */
export function sanitizeSvg(input: string): string {
  if (typeof input !== "string") throw new SvgRejected("Not text.");
  if (input.length > MAX_SVG_CHARS) throw new SvgRejected("This SVG is larger than the 5 MB an import accepts.");
  const out: string[] = [];
  const stack: string[] = []; // the elements we wrote and are still open
  let skipDepth = 0; // inside a dropped subtree
  let skipName = "";
  let unwrapped = 0;
  let count = 0;
  let sawRoot = false;
  let rootClosed = false;

  for (const token of tokenize(input)) {
    if (rootClosed) break;
    if (token.type === "text") {
      if (skipDepth === 0 && stack.length > 0) {
        const t = decodeEntities(token.text);
        if (stack[stack.length - 1] !== "svg" || t.trim()) out.push(escapeText(t));
      }
      continue;
    }
    const { kind, name, attrs } = token.tag;
    const lower = name.toLowerCase();
    if (skipDepth > 0) {
      if (lower === skipName) {
        if (kind === "open") skipDepth++;
        else if (kind === "close") skipDepth--;
      }
      continue;
    }
    if (kind === "close") {
      const canonical = ELEMENT_BY_LOWER.get(lower);
      if (!canonical) {
        if (unwrapped > 0) unwrapped--;
        continue;
      }
      // close back to the matching element; anything left open in between is closed for it
      const at = stack.lastIndexOf(canonical);
      if (at < 0) continue;
      while (stack.length > at) out.push(`</${stack.pop()}>`);
      if (stack.length === 0 && sawRoot) rootClosed = true;
      continue;
    }
    if (DROP_SUBTREE.has(lower)) {
      if (kind === "open") {
        skipDepth = 1;
        skipName = lower;
      }
      continue;
    }
    const canonical = ELEMENT_BY_LOWER.get(lower);
    if (!canonical) {
      if (kind === "open") unwrapped++;
      continue; // an element we don't know: its tags go, its children stay
    }
    if (!sawRoot && canonical !== "svg") continue; // nothing before the root `<svg>` is kept
    if (++count > MAX_ELEMENTS) throw new SvgRejected("This SVG has more than 20,000 elements.");
    if (kind === "open" && stack.length >= MAX_DEPTH) throw new SvgRejected("This SVG is nested more than 64 levels deep.");
    const kept = attrs.map(([a, v]) => cleanAttribute(canonical, a, v)).filter((x): x is [string, string] => x !== null);
    const seen = new Set<string>();
    const unique = kept.filter(([a]) => (seen.has(a) ? false : (seen.add(a), true)));
    if (canonical === "svg" && !sawRoot && !seen.has("xmlns")) unique.unshift(["xmlns", "http://www.w3.org/2000/svg"]);
    out.push(`<${canonical}${unique.map(([a, v]) => ` ${a}="${escapeAttr(v)}"`).join("")}${kind === "self" ? "/" : ""}>`);
    if (canonical === "svg") sawRoot = true;
    if (kind === "open") stack.push(canonical);
    else if (canonical === "svg") rootClosed = true;
  }
  while (stack.length > 0) out.push(`</${stack.pop()}>`);
  if (!sawRoot) throw new SvgRejected("This file has no <svg> element.");
  return out.join("");
}

/** Cleans SVG text, or returns null when it can't be an image at all. */
export function trySanitizeSvg(input: string): string | null {
  try {
    return sanitizeSvg(input);
  } catch {
    return null;
  }
}
