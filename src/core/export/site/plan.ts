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

export function buildPlan(source: MotionDocument, options: PlanOptions): SitePlan {
  const warnings: string[] = [];
  const pagesList = exportedPages(source);
  // every exported page follows the breakpoints, whether or not the frame was marked responsive
  const doc: MotionDocument = {
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

  const pages: PagePlan[] = pagesList.map((page) => {
    const assets = new Set<string>();
    const ext = options.hrefs === "files" ? (id: string) => `{{asset:${id}}}` : (id: string) => `{{asset:${id}}}`;
    const render = (bpId: string | null, modeId: string | null) => {
      const view = resolveDocumentAt(doc, bpId, modeId === modes[0].id ? null : modeId);
      const html = renderLayerMarkup(view.layers, page.id, { assetUrl: (id) => (assets.add(id), siteAssets.add(id), ext(id)) });
      const roots = parseMarkup(html);
      normalizeRoot(roots[0]);
      return { roots, ...renderingOf(roots) };
    };

    // the base rendering (widest breakpoint, first mode) is the tree that is written
    const baseView = render(null, modeIds[0]);
    const keyOf = baseView.keys;
    const layers = doc.layers;
    const used = new Set<string>();
    const classOf = new Map<string, string>(); // element key to class name
    const blocks: CssBlock[] = [];
    const baseRules: Rule[] = [];
    walk(baseView.roots, (n) => {
      if (n.tag === "#text") return;
      const key = keyOf.get(n)!;
      const layerId = n.attrs["data-element-id"];
      if (n.style.length === 0) return;
      const cls = classNameFor(layerId ? (layers[layerId]?.name ?? "el") : "el", layerId ?? key.replace(/[^a-zA-Z0-9]/g, ""), used);
      classOf.set(key, cls);
      baseRules.push({ selector: `.${cls}`, decls: n.style });
    });
    blocks.push({ wrapper: null, rules: baseRules });

    // narrower breakpoints, then other modes: each compared with what the cascade already says
    const state = new Map<string, Decl[] | null>(); // the declarations in force now for each element key (null: not drawn)
    for (const [k, v] of baseView.rendering.styles) state.set(k, v);
    const bpStates: { bp: (typeof bps)[number]; rendering: ReturnType<typeof render> }[] = [];
    for (const bp of bps) {
      if (bp.id === base.id) continue;
      bpStates.push({ bp, rendering: render(bp.id, modeIds[0]) });
    }
    // an element with nothing to say at the base (an inner shape) gets its class when a breakpoint or mode first has something to say
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
        if (before === undefined) continue; // only in this rendering: cannot happen for layers, ignore
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
      // what the cascade can't carry: text, and attributes that are not presentation attributes (a shape's size)
      const baseByKey = baseView.byKey;
      const plain = (a: Record<string, string>) => JSON.stringify(Object.entries(a).filter(([k]) => !PRESENTATION_ATTRS.has(k)));
      for (const [key, node] of next.byKey) {
        const b = baseByKey.get(key);
        if (!b) continue;
        if (b.tag !== "#text" && node.tag !== "#text") {
          const same = plain(b.attrs) === plain(node.attrs) && JSON.stringify(b.children.filter((c) => c.tag === "#text").map((c) => c.text)) === JSON.stringify(node.children.filter((c) => c.tag === "#text").map((c) => c.text));
          if (!same && !warnings.includes(`${warnKey}: ${key}`)) warnings.push(`${warnKey}: ${key}`);
        }
      }
      return rules;
    };
    for (const { bp, rendering } of bpStates) {
      const rules = emitDiff("", state, rendering, `Text or attributes of an element differ at ${bp.name} and are exported as at ${base.name}`);
      blocks.push({ wrapper: `@media (max-width: ${bp.width}px)`, rules });
    }
    // modes: at the base breakpoint, then at each narrower one. A mode rule beats the breakpoint rules (it is more specific),
    // so at a narrower breakpoint it is compared with what the cascade gives in that mode: the breakpoint's styles with the
    // base mode rules laid over them.
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

    // the written tree: classes instead of styles, section ids, links
    const finalize = (nodes: ENode[]): ENode[] =>
      nodes.map((n) => {
        if (n.tag === "#text") return n;
        const key = keyOf.get(n)!;
        const attrs = { ...n.attrs };
        const layerId = attrs["data-element-id"];
        delete attrs["data-element-id"];
        delete attrs["data-archetype"];
        const cls = classOf.get(key);
        let out: ENode = { ...n, attrs, style: [], children: finalize(n.children) };
        if (cls) out.attrs.class = cls;
        const layer: Layer | undefined = layerId ? layers[layerId] : undefined;
        if (layer?.section) out.attrs.id = anchorOf(layer);
        if (layer?.link) {
          const dest = resolveLink(doc, layer.link);
          if (dest && dest.kind !== "frame") {
            let href: string | null = null;
            const a: Record<string, string> = { class: "lnk" };
            if (dest.kind === "url") {
              href = dest.url;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
            } else {
              const to = routeOf.get(dest.pageId);
              if (to) href = hrefBetween(page.route, to, options.hrefs, dest.kind === "anchor" ? dest.anchor : undefined);
            }
            if (href) out = { tag: "a", attrs: { class: "lnk", href, ...(a.target ? { target: a.target, rel: a.rel } : {}) }, style: [], children: [out] };
          }
        }
        return out;
      });
    const tree = finalize(baseView.roots);

    // Tailwind: the declarations become utilities on the element; modes and media become variants
    let outBlocks = blocks;
    if (options.styling === "tailwind") {
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
      walk(tree, (n) => {
        const c = n.attrs.class;
        if (c && utilities.has(c)) n.attrs.class = utilities.get(c)!.join(" ");
      });
      outBlocks = [];
    }
    return { id: page.id, name: page.name, route: page.route, title: page.title, tree, blocks: outBlocks, assets };
  });

  const uploads: { id: string; family: string; mime: string }[] = [];
  return finishFonts(doc, pages, doc.layers, uploads, siteAssets, warnings, modeIds.slice(1));
}

import { fontPlan, googleFontsUrl } from "../../fonts/families";

function finishFonts(doc: MotionDocument, pages: PagePlan[], layers: Record<string, Layer>, uploads: { id: string; family: string; mime: string }[], siteAssets: Set<string>, warnings: string[], extraModes: string[]): SitePlan {
  const display: FontDisplay = doc.fontDisplay ?? "swap";
  // only the layers of the exported pages: a frame that isn't exported doesn't bring its fonts
  const inPages: Record<string, Layer> = {};
  const roots = new Set(pages.map((p) => p.id));
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
  return { pages, fonts: { googleUrl: googleFontsUrl(plan, display), uploads, display }, assets: siteAssets, warnings, extraModes };
}

