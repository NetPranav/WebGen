/**
 * Page operations (ROADMAP Phase 48): make frames pages and give them routes, stack a page's sections, name their
 * anchors, share a header or footer section with every page, and set what clicking a layer does. Each is one undo step.
 * A shared section is a component (Phase 46): the section stays on its own page as the main, and every other page gets
 * an instance at the top or the bottom, so editing it once updates the whole site.
 */

import type { Layer } from "../document/schema";
import { createComponent, insertInstance } from "../components/componentOps";
import { markOverridden } from "../components/instances";
import { addAutoLayout, isAutoLayout, setStack } from "../editing/layoutOps";
import { stackProps } from "../editing/layoutOps";
import { transaction } from "../editing/editOps";
import { DEFAULT_STACK } from "../layout/stack";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { anchorName, anchorOf, normalizeRoute, pagesOf, resolveLink, safeUrl, sectionsOf, uniqueRoute, type Link } from "./pages";

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

const PAGE_STACK = { ...DEFAULT_STACK, direction: "column" as const, align: "stretch" as const };

/** Makes a top-level frame a page with `route` (a free one from its name when none is given). Returns false if it isn't a top-level frame. */
export function makePage(frameId: string, route?: string): boolean {
  const doc = getDocument();
  const frame = doc.layers[frameId];
  if (!frame || frame.parentId !== null || frame.archetype !== "container") return false;
  const taken = pagesOf(doc).filter((p) => p.id !== frameId).map((p) => p.route);
  const first = taken.length === 0;
  const wish = route ?? (first ? "/" : `/${frame.name}`);
  documentCommands.mutate("Make page", (d) => {
    d.layers[frameId].page = { route: uniqueRoute(taken, wish) };
  });
  return true;
}

/** Adds a new page: a frame beside the others, with the document's shared header and footer already in it. Returns its id. */
export function createPage(options: { name?: string; route?: string } = {}): string | null {
  const doc = getDocument();
  const pages = pagesOf(doc);
  const frames = Object.values(doc.layers).filter((l) => l.parentId === null);
  const right = Math.max(0, ...frames.map((f) => num(f.properties["frame.x"]) + num(f.properties["frame.width"], 1440)));
  const name = (options.name ?? (pages.length === 0 ? "Home" : `Page ${pages.length + 1}`)).trim().slice(0, 120) || "Page";
  let id: string | null = null;
  transaction("Add page", () => {
    id = documentCommands.addLayer(
      {
        archetype: "container",
        parentId: null,
        name,
        properties: { positioning: "absolute", "frame.x": frames.length === 0 ? 0 : right + 120, "frame.y": 0, "frame.width": 1440, "frame.height": 900, "sizing.horizontal": "fixed", "sizing.vertical": "fixed", "appearance.background.color": "#ffffff", ...stackProps(PAGE_STACK), "layout.paddingTop": 0, "layout.paddingRight": 0, "layout.paddingBottom": 0, "layout.paddingLeft": 0 },
      },
      "Add page",
    );
    makePage(id, options.route ?? (pages.length === 0 ? "/" : `/${name}`));
    // the shared sections: the header at the top, the footer at the bottom
    for (const c of Object.values(getDocument().designComponents ?? {})) {
      if (c.shared === "header") insertInstance(c.id, { parentId: id, index: 0, flow: true });
      else if (c.shared === "footer") insertInstance(c.id, { parentId: id, flow: true });
    }
    useSelectionStore.getState().selectMultiple([id], "element");
  });
  return id;
}

/** A frame stops being a page (it stays a frame). */
export function removePage(frameId: string): boolean {
  if (!getDocument().layers[frameId]?.page) return false;
  documentCommands.mutate("Remove page", (d) => {
    delete d.layers[frameId].page;
  });
  return true;
}

/** Sets a page's route (normalised; made unique when another page has it). */
export function setRoute(frameId: string, route: string): boolean {
  const doc = getDocument();
  if (!doc.layers[frameId]?.page) return false;
  const taken = pagesOf(doc).filter((p) => p.id !== frameId).map((p) => p.route);
  const next = normalizeRoute(route);
  if (taken.includes(next)) return false;
  documentCommands.mutate("Change route", (d) => {
    d.layers[frameId].page!.route = next;
  });
  return true;
}

export function setPageTitle(frameId: string, title: string): boolean {
  if (!getDocument().layers[frameId]?.page) return false;
  documentCommands.mutate("Change page title", (d) => {
    const t = title.trim().slice(0, 200);
    if (t) d.layers[frameId].page!.title = t;
    else delete d.layers[frameId].page!.title;
  });
  return true;
}

/** Makes a page the home page (`/`); the one that was gets a route from its name. */
export function setHome(frameId: string): boolean {
  const doc = getDocument();
  if (!doc.layers[frameId]?.page) return false;
  const pages = pagesOf(doc);
  const old = pages.find((p) => p.home && p.id !== frameId);
  if (pages.find((p) => p.id === frameId)?.home) return true;
  documentCommands.mutate("Set home page", (d) => {
    const taken = pagesOf(d).map((p) => p.route);
    if (old) d.layers[old.id].page!.route = uniqueRoute(taken.filter((r) => r !== "/"), `/${d.layers[old.id].name}`);
    d.layers[frameId].page!.route = "/";
  });
  return true;
}

// --- sections ----------------------------------------------------------------------

function ensureStack(pageId: string) {
  if (isAutoLayout(getDocument().layers[pageId])) return;
  addAutoLayout([pageId]);
  setStack([pageId], { direction: "column", gap: 0, padding: 0, align: "stretch", justify: "flex-start", wrap: false });
}

/** Adds an empty full-width section to the end of a page (before the footer, when the page has one). Returns its id. */
export function addSection(pageId: string, options: { name?: string; height?: number } = {}): string | null {
  const doc = getDocument();
  const page = doc.layers[pageId];
  if (!page || page.parentId !== null) return null;
  let id: string | null = null;
  transaction("Add section", () => {
    if (page.children.length === 0) {
      documentCommands.updateProps(pageId, stackProps(PAGE_STACK));
      documentCommands.updateProps(pageId, { "layout.paddingTop": 0, "layout.paddingRight": 0, "layout.paddingBottom": 0, "layout.paddingLeft": 0 });
    } else ensureStack(pageId);
    const kids = getDocument().layers[pageId].children;
    const footer = kids.findIndex((k) => getDocument().layers[k]?.instance?.component && getDocument().designComponents?.[getDocument().layers[k].instance!.component]?.shared === "footer");
    const nth = sectionsOf(getDocument().layers, pageId).length + 1;
    id = documentCommands.addLayer(
      {
        archetype: "container",
        parentId: pageId,
        name: (options.name ?? `Section ${nth}`).slice(0, 120),
        properties: { positioning: "flow", "sizing.horizontal": "fill", "sizing.vertical": "fixed", "frame.height": Math.max(40, Math.min(5000, options.height ?? 320)), "appearance.background.color": nth % 2 ? "#f1f5f9" : "#ffffff", "layout.padding": 0 },
        ...(footer >= 0 ? { index: footer } : {}),
      },
      "Add section",
    );
    documentCommands.mutate("Mark section", (d) => {
      d.layers[id!].section = {};
    });
    useSelectionStore.getState().selectMultiple([id], "element");
  });
  return id;
}

/** Turns the containers directly inside a page into sections, stacked top to bottom as they were. Returns how many. */
export function makeSections(pageId: string): number {
  const doc = getDocument();
  const page = doc.layers[pageId];
  if (!page || page.parentId !== null) return 0;
  const kids = page.children.filter((k) => doc.layers[k]?.archetype === "container" && !doc.layers[k].section);
  if (kids.length === 0) return 0;
  transaction("Make sections", () => {
    const order = [...page.children].sort((a, b) => num(doc.layers[a].properties["frame.y"]) - num(doc.layers[b].properties["frame.y"]));
    for (const k of kids) {
      const l = doc.layers[k];
      documentCommands.updateProps(k, { positioning: "flow", "sizing.horizontal": "fill", "sizing.vertical": "fixed", "frame.height": num(l.properties["frame.height"], 320) });
    }
    documentCommands.mutate("Mark sections", (d) => {
      for (const k of kids) d.layers[k].section = {};
      d.layers[pageId].children = order;
    });
    documentCommands.updateProps(pageId, stackProps(PAGE_STACK));
    documentCommands.updateProps(pageId, { "layout.paddingTop": 0, "layout.paddingRight": 0, "layout.paddingBottom": 0, "layout.paddingLeft": 0 });
  });
  return kids.length;
}

/** Names a section's anchor (`pricing` for links to `#pricing`); unique within its page. Returns the anchor, or null. */
export function setAnchor(sectionId: string, name: string): string | null {
  const doc = getDocument();
  const section = doc.layers[sectionId];
  if (!section?.section || !section.parentId) return null;
  const a = anchorName(name);
  if (!a) return null;
  const taken = sectionsOf(doc.layers, section.parentId).filter((s) => s.id !== sectionId).map(anchorOf);
  if (taken.includes(a)) return null;
  documentCommands.mutate("Name anchor", (d) => {
    d.layers[sectionId].section = { anchor: a };
  });
  return a;
}

// --- shared header and footer -------------------------------------------------------

/**
 * Shares a section of a page with every page as the header (the top) or the footer (the bottom): the section becomes a
 * component, and the other pages get instances. Returns the component's id.
 */
export function shareSection(sectionId: string, kind: "header" | "footer"): string | null {
  const doc = getDocument();
  const section = doc.layers[sectionId];
  const pageId = section?.parentId ? doc.layers[section.parentId]?.parentId === null ? section.parentId : null : null;
  if (!section?.section || !pageId || !doc.layers[pageId].page) return null;
  let cid: string | null = null;
  transaction(kind === "header" ? "Share header" : "Share footer", () => {
    cid = createComponent([sectionId], section.name);
    if (!cid) return;
    documentCommands.mutate("Mark shared", (d) => {
      d.designComponents![cid!].shared = kind;
    });
    for (const p of pagesOf(getDocument())) {
      if (p.id === pageId) continue;
      insertInstance(cid, { parentId: p.id, index: kind === "header" ? 0 : undefined, flow: true });
    }
  });
  return cid;
}

/** Stops sharing: the instances stay as ordinary component instances. */
export function unshareSection(componentId: string): boolean {
  if (!getDocument().designComponents?.[componentId]?.shared) return false;
  documentCommands.mutate("Stop sharing", (d) => {
    delete d.designComponents![componentId].shared;
  });
  return true;
}

// --- links ----------------------------------------------------------------------------

/** Sets where clicking layers goes, or clears it with null. A link that points at nothing, or a bad address, is refused. Returns how many layers changed. */
export function setLink(ids: readonly string[], link: Link | null): number {
  const doc = getDocument();
  let clean: Link | null = null;
  if (link) {
    const target = link.kind === "url" ? safeUrl(link.target) : link.target;
    clean = target ? { kind: link.kind, target } : null;
    if (!clean || !resolveLink(doc, clean)) return 0;
  }
  const targets = ids.filter((id) => doc.layers[id] && doc.layers[id].locked !== true);
  if (targets.length === 0) return 0;
  documentCommands.mutate(link ? "Set link" : "Remove link", (d) => {
    for (const id of targets) {
      const l = d.layers[id] as Layer;
      if (clean) l.link = clean;
      else delete l.link;
      markOverridden(l, ["link"]);
    }
  });
  return targets.length;
}
