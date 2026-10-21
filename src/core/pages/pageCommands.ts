/** Page, section, link and Preview-navigation commands (ROADMAP Phase 48, Law 20). */

import { z } from "zod";
import { defineTypedCommand, defineCommand, type ContextKeys } from "../commands";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { usePreviewStore } from "../store/usePreviewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { addSection, createPage, makePage, makeSections, removePage, setAnchor, setHome, setLink, setPageTitle, setRoute, shareSection, unshareSection } from "./pageOps";
import { previewGoTo, previewOpenRoute } from "./previewOps";
import { resolveLink } from "./pages";
import { getDocument } from "../store/documentState";

const sel = () => useSelectionStore.getState().selectedIds;
const inPreview = (ctx: ContextKeys) => !ctx.textEditing && useCanvasViewStore.getState().mode === "preview";

export function registerPageCommands(): () => void {
  const category = "Pages";
  const offs = [
    defineTypedCommand({ id: "page.create", title: "Add Page", category, args: z.object({ name: z.string().min(1).max(120).optional(), route: z.string().max(200).optional() }), run: ({ name, route }) => ({ id: createPage({ name, route }) }) }),
    defineTypedCommand({ id: "page.make", title: "Make Frame a Page", category, args: z.object({ frame: z.string().optional(), route: z.string().max(200).optional() }), run: ({ frame, route }) => ({ ok: makePage(frame ?? sel()[0] ?? "", route) }) }),
    defineTypedCommand({ id: "page.remove", title: "Remove Page", category, args: z.object({ frame: z.string() }), run: ({ frame }) => ({ ok: removePage(frame) }) }),
    defineTypedCommand({ id: "page.setRoute", title: "Set Route", category, args: z.object({ frame: z.string(), route: z.string().min(1).max(200) }), run: ({ frame, route }) => ({ ok: setRoute(frame, route) }) }),
    defineTypedCommand({ id: "page.setTitle", title: "Set Page Title", category, args: z.object({ frame: z.string(), title: z.string().max(200) }), run: ({ frame, title }) => ({ ok: setPageTitle(frame, title) }) }),
    defineTypedCommand({ id: "page.setHome", title: "Set Home Page", category, args: z.object({ frame: z.string() }), run: ({ frame }) => ({ ok: setHome(frame) }) }),
    defineTypedCommand({ id: "section.add", title: "Add Section", category, args: z.object({ page: z.string(), name: z.string().min(1).max(120).optional(), height: z.number().min(40).max(5000).optional() }), run: ({ page, name, height }) => ({ id: addSection(page, { name, height }) }) }),
    defineTypedCommand({ id: "section.make", title: "Make Sections", category, args: z.object({ page: z.string() }), run: ({ page }) => ({ changed: makeSections(page) }) }),
    defineTypedCommand({ id: "section.setAnchor", title: "Name Anchor", category, args: z.object({ section: z.string(), name: z.string().min(1).max(80) }), run: ({ section, name }) => ({ anchor: setAnchor(section, name) }) }),
    defineTypedCommand({ id: "section.share", title: "Share Section", category, args: z.object({ section: z.string(), kind: z.enum(["header", "footer"]) }), run: ({ section, kind }) => ({ component: shareSection(section, kind) }) }),
    defineTypedCommand({ id: "section.unshare", title: "Stop Sharing Section", category, args: z.object({ component: z.string() }), run: ({ component }) => ({ ok: unshareSection(component) }) }),
    defineTypedCommand({
      id: "link.set",
      title: "Set Link",
      category,
      args: z.object({ kind: z.enum(["page", "anchor", "url", "frame"]).nullable(), target: z.string().max(2000).optional(), ids: z.array(z.string()).optional() }),
      run: ({ kind, target, ids }) => ({ changed: setLink(ids ?? sel(), kind && target ? { kind, target } : null) }),
    }),
    defineTypedCommand({
      id: "preview.go",
      title: "Preview: Go To",
      category,
      args: z.object({ route: z.string().optional(), anchor: z.string().optional(), link: z.object({ kind: z.enum(["page", "anchor", "url", "frame"]), target: z.string() }).optional() }),
      run: ({ route, anchor, link }) => ({ ok: link ? previewGoTo(resolveLink(getDocument(), link)) : route ? previewOpenRoute(route, anchor) : false }),
    }),
    defineCommand({ id: "preview.back", title: "Preview: Back", category, keybinding: "Alt+ArrowLeft", when: inPreview, run: () => void usePreviewStore.getState().back() }),
    defineCommand({ id: "preview.forward", title: "Preview: Forward", category, keybinding: "Alt+ArrowRight", when: inPreview, run: () => void usePreviewStore.getState().forward() }),
  ];
  return () => offs.forEach((off) => off());
}
