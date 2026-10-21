/**
 * ============================================================================
 * PAGES, SECTIONS AND LINKS AS PURE RULES (ROADMAP Phase 48)
 * ============================================================================
 * A page is a top-level frame with a route. A section is a full-width band of a page, which can have an anchor name.
 * A link says where clicking a layer goes: another page, a section (anchor) of a page, a web address, or another frame
 * (a prototype link). This file holds what can be said without the document store: routes and anchors, which pages a
 * document has, whether a link is allowed and where it leads.
 * ============================================================================
 */

import type { Layer, MotionDocument } from "../document/schema";

export type LinkKind = "page" | "anchor" | "url" | "frame";
export interface Link {
  kind: LinkKind;
  target: string;
}

export const LINK_KINDS: readonly LinkKind[] = ["page", "anchor", "url", "frame"];

/** A route as written in the address bar: lowercase words and dashes between slashes, `/` for home. */
export function normalizeRoute(input: string): string {
  const parts = input
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, "")
    .split("/")
    .map((p) => p.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean);
  return `/${parts.join("/")}`;
}

/** `Pricing & Plans` as an anchor name: `pricing-plans`. */
export function anchorName(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** A web address a link may take: http, https, mailto or tel. Anything else (javascript:, data:, a file) is refused. */
export function safeUrl(input: string): string | null {
  const text = input.trim();
  if (text.length === 0 || text.length > 2000 || /[\u0000-\u001f\u007f\s]/.test(text)) return null;
  try {
    const u = new URL(text);
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

export interface PageInfo {
  id: string;
  name: string;
  route: string;
  title?: string;
  home: boolean;
}

/** The document's pages: the home page first, then left to right. */
export function pagesOf(doc: Pick<MotionDocument, "layers">): PageInfo[] {
  const list = Object.values(doc.layers)
    .filter((l) => l.parentId === null && l.page)
    .map((l) => ({ id: l.id, name: l.name, route: l.page!.route, title: l.page!.title, home: l.page!.route === "/", x: typeof l.properties["frame.x"] === "number" ? (l.properties["frame.x"] as number) : 0 }));
  list.sort((a, b) => Number(b.home) - Number(a.home) || a.x - b.x || (a.id < b.id ? -1 : 1));
  return list.map(({ x: _x, ...p }) => (void _x, p));
}

/** A route no page has yet, from a wish (`/about`, then `/about-2`). */
export function uniqueRoute(taken: readonly string[], wish: string): string {
  const base = normalizeRoute(wish);
  if (!taken.includes(base)) return base;
  for (let n = 2; n < 10_000; n++) if (!taken.includes(`${base}-${n}`)) return `${base}-${n}`;
  return base;
}

/** The sections of a page frame, in order (its children that are sections). */
export function sectionsOf(layers: Record<string, Layer>, pageId: string): Layer[] {
  return (layers[pageId]?.children ?? []).map((id) => layers[id]).filter((l): l is Layer => !!l && !!l.section);
}

/** The anchor a section answers to (its anchor name, else its name as an anchor). */
export const anchorOf = (section: Layer): string => section.section?.anchor || anchorName(section.name);

export type Destination =
  | { kind: "page"; pageId: string }
  | { kind: "anchor"; pageId: string; sectionId: string; anchor: string }
  | { kind: "frame"; frameId: string }
  | { kind: "url"; url: string }
  | null;

/** The top-level frame a layer is in, or null. */
function topFrame(layers: Record<string, Layer>, id: string): string | null {
  let cur = layers[id];
  let guard = 0;
  while (cur && guard++ < 10_000) {
    if (cur.parentId === null) return cur.id;
    cur = layers[cur.parentId];
  }
  return null;
}

/** Where a link leads in this document, or null when it points at something that isn't there (a deleted page, a bad address). */
export function resolveLink(doc: Pick<MotionDocument, "layers">, link: Link): Destination {
  const layers = doc.layers;
  switch (link.kind) {
    case "page": {
      const l = layers[link.target];
      return l && l.parentId === null && l.page ? { kind: "page", pageId: l.id } : null;
    }
    case "anchor": {
      const section = layers[link.target];
      const page = section?.section ? topFrame(layers, section.id) : null;
      return section && page ? { kind: "anchor", pageId: page, sectionId: section.id, anchor: anchorOf(section) } : null;
    }
    case "frame": {
      const l = layers[link.target];
      return l && l.parentId === null ? { kind: "frame", frameId: l.id } : null;
    }
    case "url": {
      const url = safeUrl(link.target);
      return url ? { kind: "url", url } : null;
    }
  }
}

/** The link in force for a layer: its own, or the nearest ancestor's (a link on a card covers the text inside it). Returns the layer that has it. */
export function linkOf(layers: Record<string, Layer>, id: string): { layerId: string; link: Link } | null {
  let cur = layers[id];
  let guard = 0;
  while (cur && guard++ < 10_000) {
    if (cur.link) return { layerId: cur.id, link: cur.link };
    cur = cur.parentId ? layers[cur.parentId] : (undefined as unknown as Layer);
  }
  return null;
}

/** A page's address with a section: `/pricing#plans`. */
export const addressOf = (page: Pick<PageInfo, "route">, anchor?: string): string => (anchor ? `${page.route}#${anchor}` : page.route);
