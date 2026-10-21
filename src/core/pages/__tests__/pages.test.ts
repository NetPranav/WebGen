import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { useCanvasViewStore } from "../../store/useCanvasViewStore";
import { usePreviewStore } from "../../store/usePreviewStore";
import { addressOf, anchorName, linkOf, normalizeRoute, pagesOf, resolveLink, safeUrl, sectionsOf, uniqueRoute } from "../pages";
import { addSection, createPage, makePage, makeSections, removePage, setAnchor, setHome, setLink, setPageTitle, setRoute, shareSection, unshareSection } from "../pageOps";
import { previewAddress, previewFollow, previewGoTo, previewOpenRoute, previewStart } from "../previewOps";
import { subtreeIds } from "../../components/instances";

const L = (id: string) => getDocument().layers[id];

describe("Phase 48: routes, anchors and addresses", () => {
  it("routes are lowercase words and dashes between slashes", () => {
    assert.equal(normalizeRoute("About Us"), "/about-us");
    assert.equal(normalizeRoute("/Blog//2026/My Post?x=1#top"), "/blog/2026/my-post");
    assert.equal(normalizeRoute(""), "/");
    assert.equal(normalizeRoute("/"), "/");
    assert.equal(anchorName("  Pricing & Plans! "), "pricing-plans");
  });

  it("only web addresses a link may take: http, https, mailto, tel", () => {
    assert.equal(safeUrl("https://example.com/a?b=1"), "https://example.com/a?b=1");
    assert.equal(safeUrl("mailto:hi@example.com"), "mailto:hi@example.com");
    assert.equal(safeUrl("tel:+15551234"), "tel:+15551234");
    for (const bad of ["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "ftp://x.y", "//evil.com", "not a url", "", "https://exa mple.com", " java\nscript:alert(1)"]) assert.equal(safeUrl(bad), null, bad);
  });

  it("unique routes get a number", () => {
    assert.equal(uniqueRoute(["/about"], "About"), "/about-2");
    assert.equal(uniqueRoute(["/about", "/about-2"], "about"), "/about-3");
    assert.equal(uniqueRoute([], "Contact"), "/contact");
  });

  it("the preview history walks like a browser: new visits cut off the forward part, back and forward stop at the ends", () => {
    const p = usePreviewStore.getState();
    p.reset({ frameId: "a" });
    p.go({ frameId: "b" });
    p.go({ frameId: "c" });
    assert.equal(usePreviewStore.getState().current()!.frameId, "c");
    assert.equal(p.back(), true);
    assert.equal(usePreviewStore.getState().current()!.frameId, "b");
    p.go({ frameId: "d" });
    assert.deepEqual(usePreviewStore.getState().entries.map((e) => e.frameId), ["a", "b", "d"]);
    assert.equal(p.forward(), false);
    p.back();
    p.back();
    assert.equal(p.back(), false);
    assert.equal(usePreviewStore.getState().current()!.frameId, "a");
    p.go({ frameId: "a" }); // the same place again changes nothing but the nonce
    assert.equal(usePreviewStore.getState().entries.length, 3);
  });
});

const frame = (id: string, name: string, x: number, extra: Partial<Layer> = {}, children: string[] = []): Layer =>
  ({ ...(createLayer({ id, archetype: "container", parentId: null, name, children, properties: { "frame.x": x, "frame.y": 0, "frame.width": 1440, "frame.height": 900, "layout.padding": 0 } }) as Layer), ...extra });
const box = (id: string, parentId: string, name: string, extra: Partial<Layer> = {}, y = 0): Layer =>
  ({ ...(createLayer({ id, archetype: "container", parentId, name, properties: { positioning: "absolute", "frame.x": 0, "frame.y": y, "frame.width": 1440, "frame.height": 200, "layout.padding": 0 } }) as Layer), ...extra });

describe("Phase 48: pages", () => {
  beforeEach(() => {
    setDocument(createDocumentFromLayers([frame("f1", "Home", 0), frame("f2", "About", 1560), frame("f3", "Scratch", 3120)]));
    useSelectionStore.getState().clearSelection();
    usePreviewStore.getState().reset(null);
  });

  it("the first page is Home at /; the next takes its route from its name, and is unique", () => {
    assert.equal(makePage("f1"), true);
    assert.equal(makePage("f2"), true);
    assert.deepEqual(pagesOf(getDocument()).map((p) => [p.name, p.route, p.home]), [["Home", "/", true], ["About", "/about", false]]);
    makePage("f3", "/about");
    assert.equal(L("f3").page!.route, "/about-2");
    assert.equal(makePage("nope"), false);
  });

  it("add page: a new frame to the right, as a column stack, with a route; one undo step; Remove makes it a frame again", () => {
    makePage("f1");
    const before = JSON.stringify(getDocument().layers);
    const id = createPage({ name: "Pricing" })!;
    assert.equal(L(id).page!.route, "/pricing");
    assert.equal(L(id).properties["layout.flexDirection"], "column");
    assert.ok((L(id).properties["frame.x"] as number) > 3120);
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
    const again = createPage()!;
    assert.equal(L(again).page!.route, "/page-2");
    assert.equal(removePage(again), true);
    assert.equal(L(again).page, undefined);
    assert.ok(L(again));
  });

  it("the first page added to a document with none is the home page", () => {
    const first = createPage()!;
    assert.equal(L(first).name, "Home");
    assert.equal(L(first).page!.route, "/");
  });

  it("route, title and home", () => {
    makePage("f1");
    makePage("f2");
    assert.equal(setRoute("f2", "Our Team"), true);
    assert.equal(L("f2").page!.route, "/our-team");
    assert.equal(setRoute("f2", "/"), false); // taken by home
    assert.equal(setPageTitle("f2", "About us | Site"), true);
    assert.equal(L("f2").page!.title, "About us | Site");
    assert.equal(setHome("f2"), true);
    assert.equal(L("f2").page!.route, "/");
    assert.equal(L("f1").page!.route, "/home"); // the old home keeps a route from its name
    assert.deepEqual(pagesOf(getDocument()).map((p) => p.name), ["About", "Home"]);
    assert.equal(setHome("f3"), false); // not a page
  });
});

describe("Phase 48: sections", () => {
  beforeEach(() => {
    setDocument(createDocumentFromLayers([frame("pg", "Home", 0, {}, ["hero", "features"]), box("hero", "pg", "Hero", {}, 0), box("features", "pg", "Features", {}, 400)]));
    makePage("pg");
    useSelectionStore.getState().clearSelection();
  });

  it("make sections stacks the page's containers top to bottom, full width, in the order they were", () => {
    documentCommands.mutate("swap", (d) => {
      d.layers.pg.children = ["features", "hero"];
    });
    assert.equal(makeSections("pg"), 2);
    assert.deepEqual(L("pg").children, ["hero", "features"]); // by their y
    for (const id of ["hero", "features"]) {
      assert.ok(L(id).section);
      assert.equal(L(id).properties["sizing.horizontal"], "fill");
      assert.equal(L(id).properties.positioning, "flow");
    }
    assert.equal(L("pg").properties["layout.flexDirection"], "column");
    assert.equal(L("pg").properties["layout.alignItems"], "stretch");
    assert.equal(makeSections("pg"), 0);
  });

  it("add section appends a full-width band, selected; on an empty page too", () => {
    makeSections("pg");
    const s = addSection("pg", { name: "Pricing", height: 500 })!;
    assert.deepEqual(L("pg").children.slice(-1), [s]);
    assert.equal(L(s).properties["frame.height"], 500);
    assert.ok(L(s).section);
    assert.deepEqual(useSelectionStore.getState().selectedIds, [s]);
    const e = createPage({ name: "Empty" })!;
    const s2 = addSection(e)!;
    assert.deepEqual(L(e).children, [s2]);
    assert.equal(sectionsOf(getDocument().layers, e).length, 1);
  });

  it("anchors: named, unique on the page, found by link resolution", () => {
    makeSections("pg");
    assert.equal(setAnchor("hero", "Top of page"), "top-of-page");
    assert.equal(setAnchor("features", "top of page"), null);
    assert.equal(setAnchor("features", "Features!"), "features");
    assert.deepEqual(resolveLink(getDocument(), { kind: "anchor", target: "features" }), { kind: "anchor", pageId: "pg", sectionId: "features", anchor: "features" });
    assert.equal(setAnchor("pg", "x"), null); // not a section
  });
});

describe("Phase 48: links", () => {
  beforeEach(() => {
    setDocument(createDocumentFromLayers([frame("home", "Home", 0, {}, ["nav", "card"]), box("nav", "home", "Nav", { link: undefined }), box("card", "home", "Card", {}, 300), frame("about", "About", 1560), frame("proto", "Screen", 3120)]));
    makePage("home");
    makePage("about");
    L("home");
    documentCommands.mutate("kid", (d) => {
      d.layers.card.children.push("label");
      d.layers.label = box("label", "card", "Label", {}, 0);
    });
  });

  it("links to a page, a section, a frame and a web address; bad ones are refused", () => {
    assert.equal(setLink(["nav"], { kind: "page", target: "about" }), 1);
    assert.deepEqual(L("nav").link, { kind: "page", target: "about" });
    assert.equal(setLink(["nav"], { kind: "page", target: "proto" }), 0); // a frame that isn't a page
    assert.equal(setLink(["nav"], { kind: "frame", target: "proto" }), 1);
    assert.equal(setLink(["nav"], { kind: "url", target: "javascript:alert(1)" }), 0);
    assert.equal(setLink(["nav"], { kind: "url", target: "https://example.com" }), 1);
    assert.equal(setLink(["nav"], { kind: "anchor", target: "card" }), 0); // not a section
    assert.equal(setLink(["nav"], null), 1);
    assert.equal(L("nav").link, undefined);
  });

  it("the link of a layer is its own or the nearest above it", () => {
    setLink(["card"], { kind: "page", target: "about" });
    assert.deepEqual(linkOf(getDocument().layers, "label"), { layerId: "card", link: { kind: "page", target: "about" } });
    assert.equal(linkOf(getDocument().layers, "nav"), null);
  });

  it("a link to a page that is later removed leads nowhere", () => {
    setLink(["nav"], { kind: "page", target: "about" });
    removePage("about");
    assert.equal(resolveLink(getDocument(), L("nav").link!), null);
  });

  it("addresses", () => {
    assert.equal(addressOf({ route: "/pricing" }, "plans"), "/pricing#plans");
    assert.equal(addressOf({ route: "/" }), "/");
  });
});

describe("Phase 48: shared header and footer", () => {
  beforeEach(() => {
    const pageFrame = (id: string, name: string, x: number, kids: string[]) => frame(id, name, x, {}, kids);
    setDocument(
      createDocumentFromLayers([
        pageFrame("p1", "Home", 0, ["nav", "body1", "foot"]),
        box("nav", "p1", "Nav", {}, 0),
        box("body1", "p1", "Body", {}, 200),
        box("foot", "p1", "Footer", {}, 600),
        pageFrame("p2", "About", 1560, ["body2"]),
        box("body2", "p2", "Body", {}, 0),
      ]),
    );
    makePage("p1");
    makePage("p2");
    makeSections("p1");
    makeSections("p2");
    useSelectionStore.getState().clearSelection();
  });

  it("a shared header becomes a component; every other page gets an instance at the top; edits of the main reach it", () => {
    const c = shareSection("nav", "header")!;
    assert.equal(getDocument().designComponents![c].shared, "header");
    assert.equal(L("nav").componentMain, c);
    const inst = L("p2").children[0];
    assert.equal(L(inst).instance!.component, c);
    assert.equal(L(inst).instance!.root, true);
    assert.equal(L(inst).properties.positioning, "flow");
    assert.ok(L(inst).section);
    documentCommands.updateProps("nav", { "appearance.background.color": "#123456" });
    assert.equal(L(inst).properties["appearance.background.color"], "#123456");
  });

  it("a footer goes to the bottom; a page added later gets both; a link in the shared nav reaches every page", () => {
    const h = shareSection("nav", "header")!;
    const f = shareSection("foot", "footer")!;
    const last = L("p2").children[L("p2").children.length - 1];
    assert.equal(L(last).instance!.component, f);
    const added = createPage({ name: "Contact" })!;
    const kids = L(added).children.map((k) => L(k).instance?.component);
    assert.deepEqual(kids, [h, f]);
    setLink(["nav"], { kind: "page", target: "p2" });
    const inst = L("p2").children[0];
    assert.deepEqual(L(inst).link, { kind: "page", target: "p2" });
    assert.deepEqual(L(L(added).children[0]).link, { kind: "page", target: "p2" });
  });

  it("only a section of a page can be shared; unshare keeps the instances", () => {
    assert.equal(shareSection("p1", "header"), null);
    const c = shareSection("nav", "header")!;
    assert.equal(unshareSection(c), true);
    assert.equal(getDocument().designComponents![c].shared, undefined);
    assert.equal(subtreeIds(getDocument().layers, "p2").some((id) => L(id).instance?.component === c), true);
    assert.equal(unshareSection(c), false);
  });

  it("sharing is one undo step", () => {
    const before = JSON.stringify(getDocument().layers);
    shareSection("nav", "header");
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
  });
});

describe("Phase 48: Preview navigation", () => {
  beforeEach(() => {
    setDocument(createDocumentFromLayers([frame("a", "Home", 0, {}, ["btn"]), box("btn", "a", "Button", {}, 0), frame("b", "About", 1560, {}, ["sec"]), box("sec", "b", "Pricing", { section: {} }, 0), frame("c", "Other", 3120)]));
    makePage("a");
    makePage("b");
    usePreviewStore.getState().reset(null);
  });

  it("starting shows the frame being worked in, else the home page, else the first frame", () => {
    useCanvasViewStore.setState({ activeFrameId: "c" });
    previewStart();
    assert.equal(usePreviewStore.getState().current()!.frameId, "c");
    useCanvasViewStore.setState({ activeFrameId: null });
    previewStart();
    assert.equal(usePreviewStore.getState().current()!.frameId, "a");
    assert.equal(previewAddress(), "/");
  });

  it("a click follows the link to a page, an anchor, a frame; a web address opens a tab; back and forward walk the history", () => {
    previewStart();
    setLink(["btn"], { kind: "page", target: "b" });
    assert.equal(previewFollow("btn"), true);
    assert.equal(usePreviewStore.getState().current()!.frameId, "b");
    assert.equal(previewAddress(), "/about");
    assert.equal(previewGoTo(resolveLink(getDocument(), { kind: "anchor", target: "sec" })), true);
    assert.deepEqual(usePreviewStore.getState().current(), { frameId: "b", anchor: "pricing" });
    assert.equal(previewAddress(), "/about#pricing");
    previewGoTo({ kind: "frame", frameId: "c" });
    assert.equal(previewAddress(), "Other");
    usePreviewStore.getState().back();
    assert.equal(previewAddress(), "/about#pricing");
    usePreviewStore.getState().back();
    usePreviewStore.getState().back();
    assert.equal(previewAddress(), "/");
    usePreviewStore.getState().forward();
    assert.equal(previewAddress(), "/about");
    const opened: string[] = [];
    (globalThis as unknown as { window: { open: (u: string) => void } }).window = { open: (u: string) => void opened.push(u) };
    assert.equal(previewGoTo({ kind: "url", url: "https://example.com/" }), true);
    assert.deepEqual(opened, ["https://example.com/"]);
    delete (globalThis as unknown as { window?: unknown }).window;
    assert.equal(previewGoTo(null), false);
  });

  it("a layer without a link goes nowhere; a route opens its page", () => {
    previewStart();
    assert.equal(previewFollow("btn"), false);
    assert.equal(previewOpenRoute("/about"), true);
    assert.equal(usePreviewStore.getState().current()!.frameId, "b");
    assert.equal(previewOpenRoute("/nope"), false);
  });
});
