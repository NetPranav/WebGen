/**
 * ============================================================================
 * THE EXPORT PLAN (ROADMAP Phase 49)
 * ============================================================================
 * Turns a document into what every target writes: for each page, markup with classes (no inline styles), the CSS that
 * those classes need (base rules, one block for every narrower breakpoint, one for every other mode), the pictures and
 * fonts it uses, and the links as hrefs. The page is drawn with the stage's own render definitions at every
 * breakpoint and mode, so the CSS is what the stage shows; a target decides only how files are laid out.
 * ============================================================================
 */

import type { Layer, MotionDocument } from "../../document/schema";
import { assetFamily } from "../../fonts/families";
import type { FontDisplay } from "../../fonts/catalog";
import { baseBreakpoint, breakpointsOf, resolveDocumentAt } from "../../breakpoints/breakpoints";
import { anchorOf, pagesOf, resolveLink } from "../../pages/pages";
import { modesOf, hasTokens } from "../../tokens/tokens";
import { PRESENTATION_ATTRS, classNameFor, diffDecls, renderingOf, tailwindUtility, toCss, type CssBlock, type Decl, type Rule } from "./css";
import { parseMarkup, walk, type ENode } from "./markup";
import { renderLayerMarkup } from "./render";
import { componentize, type ComponentDef } from "./components";

export type Styling = "css" | "modules" | "tailwind";

export interface PlanOptions {
  styling: Styling;
  /** Hrefs of links between pages: relative file paths (a plain HTML site) or routes (`/about`, for an app router). */
  hrefs: "files" | "routes";
}

export interface PagePlan {
  id: string;
  name: string;
  route: string;
  title: string;
  /** The final markup: classes in place of styles, ids on sections, links wrapped. */
  tree: ENode[];
  /** Base rules, then a block for each narrower breakpoint, then for each other mode. Empty with Tailwind (the classes are the styles). */
  blocks: CssBlock[];
  /** The asset ids this page draws. */
  assets: Set<string>;
}

export interface SitePlan {
  pages: PagePlan[];
  /** Fonts: the Google Fonts stylesheet to link, and the imported font assets to pack with their @font-face rules. */
  fonts: { googleUrl: string | null; uploads: { id: string; family: string; mime: string }[]; display: FontDisplay };
  /** Every asset the whole site draws (pictures and fonts). */
  assets: Set<string>;
  /** Things the export could not carry exactly, said plainly. */
  warnings: string[];
  /** The mode ids besides the first, for `data-mode`. */
  extraModes: string[];
  /** The component files (React targets). */
  components: ComponentPlan[];
}

const ROOT_DROP = new Set(["position", "left", "top", "right", "bottom", "margin"]);

/** The page root: fluid between breakpoints instead of a fixed canvas frame. */
function normalizeRoot(n: ENode): void {
  const out: Decl[] = [];
  let width: string | null = null;
  for (const [k, v] of n.style) {
    if (ROOT_DROP.has(k)) continue;
    if (k === "width") {
      width = v;
      continue;
    }
    if (k === "height") {
      out.push(["min-height", v]);
      continue;
    }
    out.push([k, v]);
  }
  n.style = [["position", "relative"], ["margin", "0 auto"], ["width", "100%"], ...(width ? ([["max-width", width]] as Decl[]) : []), ...out];
}

/** A component's root: it has no place of its own (an instance says where it sits). */
function normalizeComponentRoot(n: ENode): void {
  // (its `position` goes too: the instance always says absolute or relative, which is what its children are placed against)
  n.style = n.style.filter(([k]) => !PLACEMENT_CSS.has(k));
}

/** `over` laid on `under`: its declarations win; a property reset to `initial` is gone. */
function overlay(under: readonly Decl[], over: readonly Decl[]): Decl[] {
  const m = new Map(under);
  for (const [k, v] of over) {
    if (v === "initial") m.delete(k);
    else m.set(k, v);
  }
  return [...m];
}

const slugRoute = (route: string): string => route.replace(/^\/+|\/+$/g, "") || "index";

export function hrefBetween(from: string, to: string, mode: PlanOptions["hrefs"], anchor?: string): string {
  const hash = anchor ? `#${anchor}` : "";
  if (mode === "routes") return `${to}${hash}`;
  // relative file paths: a page `/about` is `about/index.html`, the home page `index.html`
  const depth = (r: string) => (r === "/" ? 0 : r.replace(/^\/+|\/+$/g, "").split("/").length);
  const up = "../".repeat(depth(from));
  const file = to === "/" ? "index.html" : `${slugRoute(to)}/index.html`;
  return `${up || "./"}${file}${hash}`;
}

/** The exported pages: the document's pages, or, when it has none, every top-level frame (the first is the home page). */
export function exportedPages(doc: MotionDocument): { id: string; name: string; route: string; title: string }[] {
  const pages = pagesOf(doc);
  if (pages.length > 0) return pages.map((p) => ({ id: p.id, name: p.name, route: p.route, title: p.title ?? p.name }));
  const frames = Object.values(doc.layers).filter((l) => l.parentId === null && l.archetype === "container").sort((a, b) => (Number(a.properties["frame.x"]) || 0) - (Number(b.properties["frame.x"]) || 0));
  return frames.map((f, i) => ({ id: f.id, name: f.name, route: i === 0 ? "/" : `/${f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `frame-${i + 1}`}`, title: f.name }));
}

/** The properties that say where an element sits in its parent, as CSS: an instance of a component keeps these of its own. */
export const PLACEMENT_CSS = new Set(["position", "left", "top", "right", "bottom", "z-index", "margin", "margin-left", "margin-right", "margin-top", "margin-bottom", "flex", "flex-grow", "flex-shrink", "flex-basis", "align-self", "justify-self", "order", "grid-column", "grid-row", "transform", "rotate"]);

/** What an instance root may change by itself and still be a plain use of its component: where it sits. */
const PLACEMENT_PROPS = new Set(["frame.x", "frame.y", "positioning", "frame.rotation", "breakpoints.responsive", "layout.gridColumnStart", "layout.gridColumnSpan", "layout.gridRowStart", "layout.gridRowSpan", "constraints.horizontal", "constraints.vertical"]);

export interface ComponentProp {
  /** The prop's name in the component (camelCase). */
  name: string;
  type: "text" | "image" | "boolean";
  /** The id of the component property it comes from. */
  id: string;
  /** What the component shows when the prop is left out. */
  fallback: string | boolean;
}

export interface ComponentVariant {
  /** The main layer this variant is drawn from. */
  mainId: string;
  values: Record<string, string>;
  tree: ENode[];
  blocks: CssBlock[];
}

export interface ComponentPlan {
  id: string;
  /** The component's name in PascalCase. */
  name: string;
  variantProps: { name: string; prop: string; values: string[] }[];
  props: ComponentProp[];
  variants: ComponentVariant[];
  /** How many times pages use it. */
  uses: number;
}

const camel = (s: string): string => {
  const w = s.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  const out = w.map((x, i) => (i === 0 ? x[0].toLowerCase() + x.slice(1) : x[0].toUpperCase() + x.slice(1))).join("");
  return /^[a-z]/.test(out) ? out : `p${out}`;
};
const pascal = (s: string): string => {
  const out = s.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join("");
  return /^[A-Z]/.test(out) ? out : `C${out}`;
};

/** Makes a root's markup, class names and CSS from the document drawn at every breakpoint and mode. */
interface RootPlan {
  tree: ENode[];
  blocks: CssBlock[];
  /** The element key of each class, and the class of each key. */
  classOf: Map<string, string>;
  /** The key of the root's markup nodes by layer id (the first node that draws it). */
  nodeOfLayer: Map<string, ENode>;
}

export function buildPlan(source: MotionDocument, options: PlanOptions & { components?: boolean; /** Plan this layer alone, as a component-like root (the Code tab). */ only?: string }): SitePlan {
  const warnings: string[] = [];
  const pagesList = options.only && source.layers[options.only] ? [{ id: options.only, name: source.layers[options.only].name, route: "/", title: source.layers[options.only].name }] : exportedPages(source);
  // every exported page follows the breakpoints, whether or not the frame was marked responsive
  const doc: MotionDocument = options.only
    ? source
    : {
        ...source,
        layers: {
          ...source.layers,
          ...Object.fromEntries(pagesList.map((p) => [p.id, { ...source.layers[p.id], properties: { ...source.layers[p.id].properties, "breakpoints.responsive": true } }])),
        },
      };
  const bps = breakpointsOf(doc);
  const base = baseBreakpoint(bps);
  const modes = modesOf(doc);
  const useModes = hasTokens(doc) && Object.keys(doc.variables ?? {}).length > 0 && modes.length > 1;
  const modeIds = useModes ? modes.map((m) => m.id) : [modes[0].id];
  const siteAssets = new Set<string>();
  const routeOf = new Map(pagesList.map((p) => [p.id, p.route]));
  const used = new Set<string>(); // class names, across the whole site
  const layers = doc.layers;

  /**
   * Draws `rootId` at every breakpoint and mode and turns it into a tree with classes and the rules for them. A page root is
   * fluid; a component root loses its place (the instance has its own).
   */
  const planRoot = (rootId: string, kind: "page" | "component", fromRoute: string, hrefs: PlanOptions["hrefs"], assets: Set<string>): RootPlan => {
    const render = (bpId: string | null, modeId: string | null) => {
      const view = resolveDocumentAt(doc, bpId, modeId === modes[0].id ? null : modeId);
      const html = renderLayerMarkup(view.layers, rootId, { assetUrl: (id) => (assets.add(id), siteAssets.add(id), `{{asset:${id}}}`) }, kind === "page");
      const roots = parseMarkup(html);
      // (a layer that is hidden at a breakpoint draws nothing there)
      if (roots[0]) {
        if (kind === "page") normalizeRoot(roots[0]);
        else normalizeComponentRoot(roots[0]);
      }
      return { roots, ...renderingOf(roots) };
    };
    const baseView = render(null, modeIds[0]);
    const keyOf = baseView.keys;
    const classOf = new Map<string, string>();
    const blocks: CssBlock[] = [];
    const baseRules: Rule[] = [];
    walk(baseView.roots, (n) => {
      if (n.tag === "#text" || n.style.length === 0) return;
      const key = keyOf.get(n)!;
      const layerId = n.attrs["data-element-id"];
      const cls = classNameFor(layerId ? (layers[layerId]?.name ?? "el") : "el", layerId ?? key.replace(/[^a-zA-Z0-9]/g, ""), used);
      classOf.set(key, cls);
      baseRules.push({ selector: `.${cls}`, decls: n.style });
    });
    blocks.push({ wrapper: null, rules: baseRules });

    const state = new Map<string, Decl[] | null>();
    for (const [k, v] of baseView.rendering.styles) state.set(k, v);
    const bpStates: { bp: (typeof bps)[number]; rendering: ReturnType<typeof render> }[] = [];
    for (const bp of bps) if (bp.id !== base.id) bpStates.push({ bp, rendering: render(bp.id, modeIds[0]) });
    const classFor = (key: string): string => {
      let cls = classOf.get(key);
      if (!cls) {
        cls = classNameFor("el", key.replace(/[^a-zA-Z0-9]/g, ""), used);
        classOf.set(key, cls);
      }
      return cls;
    };
    const emitDiff = (selectorPrefix: string, prev: Map<string, Decl[] | null>, next: ReturnType<typeof render>, warnKey: string): Rule[] => {
      const rules: Rule[] = [];
      const seen = new Set<string>();
      for (const [key, decls] of next.rendering.styles) {
        seen.add(key);
        const before = prev.get(key);
        if (before === undefined) continue;
        if (before === null) {
          const display = decls.find(([k]) => k === "display")?.[1] ?? "revert";
          rules.push({ selector: `${selectorPrefix}.${classFor(key)}`, decls: [...decls.filter(([k]) => k !== "display").map(toCss), ["display", display]] });
        } else {
          const d = diffDecls(before, decls);
          if (d.length > 0) rules.push({ selector: `${selectorPrefix}.${classFor(key)}`, decls: d.map(toCss) });
        }
        prev.set(key, decls);
      }
      for (const [key, before] of prev) {
        if (seen.has(key) || before === null) continue;
        rules.push({ selector: `${selectorPrefix}.${classFor(key)}`, decls: [["display", "none"]] });
        prev.set(key, null);
      }
      const baseByKey = baseView.byKey;
      const plain = (a: Record<string, string>) => JSON.stringify(Object.entries(a).filter(([k]) => !PRESENTATION_ATTRS.has(k)));
      for (const [key, node] of next.byKey) {
        const b = baseByKey.get(key);
        if (!b || b.tag === "#text" || node.tag === "#text") continue;
        const same = plain(b.attrs) === plain(node.attrs) && JSON.stringify(b.children.filter((c) => c.tag === "#text").map((c) => c.text)) === JSON.stringify(node.children.filter((c) => c.tag === "#text").map((c) => c.text));
        if (!same && !warnings.includes(`${warnKey}: ${key}`)) warnings.push(`${warnKey}: ${key}`);
      }
      return rules;
    };
    for (const { bp, rendering } of bpStates) {
      blocks.push({ wrapper: `@media (max-width: ${bp.width}px)`, rules: emitDiff("", state, rendering, `Text or attributes of an element differ at ${bp.name} and are exported as at ${base.name}`) });
    }
    if (modeIds.length > 1) {
      for (const modeId of modeIds.slice(1)) {
        const prev = new Map<string, Decl[] | null>(baseView.rendering.styles);
        const ms = render(null, modeId);
        const baseRules2 = emitDiff(`[data-mode="${modeId}"] `, prev, ms, `Mode ${modeId}`);
        blocks.push({ wrapper: null, rules: baseRules2 });
        const baseModeDecls = new Map<string, Decl[]>();
        for (const r of baseRules2) {
          const key = [...classOf].find(([, c]) => `[data-mode="${modeId}"] .${c}` === r.selector)?.[0];
          if (key) baseModeDecls.set(key, r.decls);
        }
        for (const { bp, rendering } of bpStates) {
          const at = new Map<string, Decl[] | null>();
          for (const [k, d] of rendering.rendering.styles) at.set(k, overlay(d, baseModeDecls.get(k) ?? []));
          const r2 = render(bp.id, modeId);
          blocks.push({ wrapper: `@media (max-width: ${bp.width}px)`, rules: emitDiff(`[data-mode="${modeId}"] `, at, r2, `Mode ${modeId} at ${bp.name}`) });
        }
      }
    }

    const nodeOfLayer = new Map<string, ENode>();
    const finalize = (nodes: ENode[]): ENode[] =>
      nodes.map((n) => {
        if (n.tag === "#text") return n;
        const key = keyOf.get(n)!;
        const attrs = { ...n.attrs };
        const layerId = attrs["data-element-id"];
        delete attrs["data-element-id"];
        delete attrs["data-archetype"];
        const cls = classOf.get(key);
        let out: ENode = { ...n, attrs, style: [], children: finalize(n.children), ...(layerId ? { layerId } : {}) };
        if (cls) out.attrs.class = cls;
        if (layerId) nodeOfLayer.set(layerId, out);
        const layer: Layer | undefined = layerId ? layers[layerId] : undefined;
        if (layer?.section) out.attrs.id = anchorOf(layer);
        if (layer?.link) {
          const dest = resolveLink(doc, layer.link);
          if (dest && dest.kind !== "frame") {
            let href: string | null = null;
            let blank = false;
            if (dest.kind === "url") {
              href = dest.url;
              blank = true;
            } else {
              const to = routeOf.get(dest.pageId);
              if (to) href = hrefBetween(fromRoute, to, hrefs, dest.kind === "anchor" ? dest.anchor : undefined);
            }
            if (href) {
              const wrap: ENode = { tag: "a", attrs: { class: "lnk", href, ...(blank ? { target: "_blank", rel: "noopener noreferrer" } : {}) }, style: [], children: [out] };
              nodeOfLayer.set(layerId!, out);
              out = wrap;
            }
          }
        }
        return out;
      });
    return { tree: finalize(baseView.roots), blocks, classOf, nodeOfLayer };
  };

  const pageAssets = new Map<string, Set<string>>();
  const roots = pagesList.map((p) => {
    const assets = new Set<string>();
    pageAssets.set(p.id, assets);
    return { page: p, plan: planRoot(p.id, options.only ? "component" : "page", p.route, options.hrefs, assets) };
  });

  // components: React targets use a component file for every component an instance (or a main) on a page can call
  const components = new Map<string, ComponentPlan>();
  if (options.components) {
    const defs = new Map<string, ComponentDef>();
    for (const { page, plan } of roots) componentize(doc, plan, page.id, defs, components, planRoot, siteAssets, warnings);
  }

  const pages: PagePlan[] = roots.map(({ page, plan }) => {
    let blocks = plan.blocks;
    if (options.styling === "tailwind") {
      applyTailwind([plan.tree], blocks);
      blocks = [];
    }
    return { id: page.id, name: page.name, route: page.route, title: page.title, tree: plan.tree, blocks, assets: pageAssets.get(page.id)! };
  });
  const comps = [...components.values()];
  if (options.styling === "tailwind") {
    for (const c of comps) for (const v of c.variants) {
      applyTailwind(v.tree, v.blocks);
      v.blocks = [];
    }
  }
  const uploads: { id: string; family: string; mime: string }[] = [];
  return finishFonts(doc, pages, doc.layers, uploads, siteAssets, warnings, modeIds.slice(1), comps);
}

/** Tailwind: the declarations become utilities on the element; modes and media become variants. */
function applyTailwind(trees: ENode[][] | ENode[], blocks: CssBlock[]): void {
  const utilities = new Map<string, string[]>();
  for (const b of blocks) {
    const variant = b.wrapper ? `max-[${b.wrapper.replace(/^@media \(max-width: /, "").replace(/px\)$/, "")}px]:` : "";
    for (const r of b.rules) {
      const m = /^(?:\[data-mode="([^"]+)"\] )?\.(.+)$/.exec(r.selector);
      if (!m) continue;
      const modeVariant = m[1] ? `[[data-mode=${m[1]}]_&]:` : "";
      const list = utilities.get(m[2]) ?? [];
      for (const [k, v] of r.decls) list.push(tailwindUtility(k, v, `${variant}${modeVariant}`));
      utilities.set(m[2], list);
    }
  }
  const forest = (Array.isArray(trees[0]) ? (trees as ENode[][]).flat() : (trees as ENode[]));
  walk(forest, (n) => {
    const c = n.attrs.class;
    if (c && utilities.has(c)) n.attrs.class = utilities.get(c)!.join(" ");
  });
}

import { fontPlan, googleFontsUrl } from "../../fonts/families";

function finishFonts(doc: MotionDocument, pages: PagePlan[], layers: Record<string, Layer>, uploads: { id: string; family: string; mime: string }[], siteAssets: Set<string>, warnings: string[], extraModes: string[], components: ComponentPlan[] = []): SitePlan {
  const display: FontDisplay = doc.fontDisplay ?? "swap";
  // only the layers of the exported pages and components: a frame that isn't exported doesn't bring its fonts
  const inPages: Record<string, Layer> = {};
  const roots = new Set([...pages.map((p) => p.id), ...components.flatMap((c) => c.variants.map((v) => v.mainId))]);
  for (const l of Object.values(layers)) {
    let cur: Layer | undefined = l;
    let guard = 0;
    while (cur && guard++ < 10_000) {
      if (roots.has(cur.id)) {
        inPages[l.id] = l;
        break;
      }
      cur = cur.parentId ? layers[cur.parentId] : undefined;
    }
  }
  const plan = fontPlan(inPages, doc.assets);
  for (const u of plan.uploads) {
    const family = assetFamily(u);
    if (family) {
      uploads.push({ id: u.id, family, mime: u.mime });
      siteAssets.add(u.id);
    }
  }
  return { pages, fonts: { googleUrl: googleFontsUrl(plan, display), uploads, display }, assets: siteAssets, warnings, extraModes, components };
}

