import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { createDocumentFromLayers, createLayer } from "../../../document/factories";
import type { Layer, MotionDocument } from "../../../document/schema";
import { GALLERY_CASES, buildGalleryLayers } from "../../../render/gallery";
import { documentCommands, getDocument } from "../../../store/useDocumentStore";
import { setDocument } from "../../../store/documentState";
import { useBreakpointStore } from "../../../store/useBreakpointStore";
import { parseMarkup, parseStyle, walk, toText } from "./helpers";
import { buildSiteExport, textOf } from "..";
import { buildPlan, hrefBetween } from "../plan";
import { cssText, diffDecls, tailwindUtility } from "../css";
import { toHtml, toJsx, jsxAttrName } from "../serialize";
import { assetFileName } from "../targets";

const page = (id: string, name: string, x: number, children: string[] = [], extra: Record<string, unknown> = {}): Layer =>
  ({ ...(createLayer({ id, archetype: "container", parentId: null, name, children, properties: { "frame.x": x, "frame.y": 0, "frame.width": 1440, "frame.height": 900, "appearance.background.color": "#ffffff", ...extra } }) as Layer), page: { route: x === 0 ? "/" : `/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` } });
const box = (id: string, parentId: string, name: string, extra: Record<string, unknown> = {}, archetype: "container" | "text" | "button" = "container"): Layer =>
  createLayer({ id, archetype, parentId, name, properties: { positioning: "absolute", "frame.x": 10, "frame.y": 10, "frame.width": 200, "frame.height": 80, ...extra } }) as Layer;

const files = async (doc: MotionDocument, target: "html" | "vite" | "next", styling: "css" | "modules" | "tailwind" = "css") => (await buildSiteExport(doc, { target, styling })).files;
/** Every `@media (max-width: Wpx)` block of a stylesheet, joined (each page has its own). */
const media = (css: string, width: number) => [...css.matchAll(new RegExp(`@media \\(max-width: ${width}px\\) \\{([\\s\\S]*?)\\n\\}`, "g"))].map((m) => m[1]).join("\n");
const text = (fs: { path: string; content: string | Uint8Array }[], path: string) => String(fs.find((f) => f.path === path)?.content);

describe("Phase 49: markup, styles and serialising", () => {
  it("reads React's markup: nested tags, attributes with entities, void tags, svg, text", () => {
    const t = parseMarkup('<div data-x="a&amp;b" style="color:red;background:url(&quot;a;b&quot;)"><img src="x.png" alt=""/><svg viewBox="0 0 1 1"><rect x="0"></rect></svg>Hi &lt;b&gt;</div>');
    assert.equal(t.length, 1);
    assert.equal(t[0].attrs["data-x"], "a&b");
    assert.deepEqual(t[0].style, [["color", "red"], ["background", 'url("a;b")']]);
    assert.deepEqual(t[0].children.map((c) => c.tag), ["img", "svg", "#text"]);
    assert.equal(t[0].children[0].attrs.alt, "");
    assert.throws(() => parseMarkup("<div><span></div>"));
  });

  it("style declarations keep values with semicolons and commas inside parentheses and quotes", () => {
    assert.deepEqual(parseStyle("font-family:'A;B', serif;background:linear-gradient(to right, #fff 0%, #000 100%)"), [["font-family", "'A;B', serif"], ["background", "linear-gradient(to right, #fff 0%, #000 100%)"]]);
  });

  it("a diff keeps what changed and resets what went away", () => {
    assert.deepEqual(diffDecls([["a", "1"], ["b", "2"]], [["a", "1"], ["b", "3"], ["c", "4"]]), [["b", "3"], ["c", "4"]]);
    assert.deepEqual(diffDecls([["a", "1"], ["b", "2"]], [["a", "1"]]), [["b", "initial"]]);
  });

  it("css text: rules, media blocks, nothing for empty ones", () => {
    const css = cssText([{ wrapper: null, rules: [{ selector: ".a", decls: [["color", "red"]] }] }, { wrapper: "@media (max-width: 600px)", rules: [{ selector: ".a", decls: [["color", "blue"]] }] }, { wrapper: "@media (max-width: 300px)", rules: [] }]);
    assert.equal(css, ".a {\n  color: red;\n}\n\n@media (max-width: 600px) {\n  .a {\n    color: blue;\n  }\n}\n");
  });

  it("tailwind utilities are arbitrary properties with spaces as underscores, and variants for media and modes", () => {
    assert.equal(tailwindUtility("grid-template-columns", "repeat(2, minmax(0, 1fr))"), "[grid-template-columns:repeat(2,_minmax(0,_1fr))]");
    assert.equal(tailwindUtility("color", "#fff", "max-[768px]:"), "max-[768px]:[color:#fff]");
  });

  it("jsx attribute names, text that needs a string, void and self-closing elements", () => {
    assert.equal(jsxAttrName("stroke-width"), "strokeWidth");
    assert.equal(jsxAttrName("class"), "className");
    assert.equal(jsxAttrName("data-id"), "data-id");
    assert.equal(jsxAttrName("viewBox"), "viewBox");
    const tree = parseMarkup('<div class="a"><p>plain</p><p>a &lt; b {c}</p><img src="x"/><span> padded </span></div>');
    const jsx = toJsx(tree, { classExpr: (c) => `"${c}"`, classValue: (c) => `"${c}"` }, "");
    assert.match(jsx, /<p>plain<\/p>/);
    assert.match(jsx, /<p>\{"a < b \{c\}"\}<\/p>/);
    assert.match(jsx, /<img src="x" \/>/);
    assert.match(jsx, /<span>\{" padded "\}<\/span>/);
    assert.equal(toHtml(parseMarkup("<p>x</p>")).trim(), "<p>x</p>");
  });

  it("links between pages: relative files in a plain site, routes in an app", () => {
    assert.equal(hrefBetween("/", "/about", "files"), "./about/index.html");
    assert.equal(hrefBetween("/about", "/", "files"), "../index.html");
    assert.equal(hrefBetween("/a/b", "/c", "files", "x"), "../../c/index.html#x");
    assert.equal(hrefBetween("/about", "/", "routes", "top"), "/#top");
  });

  it("assets are named by the start of their hash and their type", () => {
    assert.equal(assetFileName("a".repeat(64), "image/png"), "aaaaaaaaaaaa.png");
    assert.equal(assetFileName("b".repeat(64), "font/woff2"), "bbbbbbbbbbbb.woff2");
  });
});

describe("Phase 49: the exported pages", () => {
  let doc: MotionDocument;
  beforeEach(() => {
    doc = createDocumentFromLayers([
      page("home", "Home", 0, ["head", "btn", "pic"]),
      box("head", "home", "Heading", { "content.text": "Hello <World> & {friends}", "typography.fontSize": 32 }, "text"),
      box("btn", "home", "Cta", { "frame.y": 120, "content.label": "Go" }, "button"),
      box("pic", "home", "Hero", { "frame.y": 200 }),
      page("about", "About", 1560, ["abox"]),
      box("abox", "about", "AboutBox"),
    ]);
    setDocument(doc);
    useBreakpointStore.getState().setActive(null);
  });

  it("every page is a file, the home page is index.html, with its title, one stylesheet and no inline styles or ids", async () => {
    const f = await files(getDocument(), "html");
    assert.deepEqual(f.map((x) => x.path).sort(), ["README.md", "about/index.html", "index.html", "styles.css"]);
    const html = text(f, "index.html");
    assert.match(html, /<title>Home<\/title>/);
    assert.match(html, /href="\.\/styles\.css"/);
    assert.match(text(f, "about/index.html"), /href="\.\.\/styles\.css"/);
    assert.doesNotMatch(html, /style="/);
    assert.doesNotMatch(html, /data-element-id/);
    assert.match(html, /Hello &lt;World&gt; &amp; \{friends\}/);
    assert.match(text(f, "styles.css"), /\.heading_[a-z0-9]+ \{[^}]*font-size: 32px;/);
  });

  it("the page root is fluid: max-width and min-height instead of a canvas frame", async () => {
    const css = text(await files(getDocument(), "html"), "styles.css");
    const root = /\.home_[a-z0-9]+ \{([^}]*)\}/.exec(css)![1];
    assert.match(root, /position: relative/);
    assert.match(root, /width: 100%/);
    assert.match(root, /max-width: 1440px/);
    assert.match(root, /min-height: 900px/);
    assert.doesNotMatch(root, /\bleft:|\btop:/);
  });

  it("a layer that changes at a breakpoint gets a media rule with only what changed; hidden there, display none; cascade Tablet to Mobile", async () => {
    useBreakpointStore.getState().setActive("tablet");
    documentCommands.updateProps("abox", { "frame.x": 40 });
    documentCommands.updateProps("head", { "typography.fontSize": 24 });
    useBreakpointStore.getState().setActive("mobile");
    documentCommands.updateProps("head", { "typography.fontSize": 18 });
    documentCommands.setLayerFlags("btn", { visible: false });
    useBreakpointStore.getState().setActive(null);
    const css = text(await files(getDocument(), "html"), "styles.css");
    const tablet = media(css, 768);
    const mobile = media(css, 375);
    assert.match(tablet, /\.heading_[a-z0-9]+ \{\s*font-size: 24px;\s*\}/);
    assert.match(mobile, /\.heading_[a-z0-9]+ \{\s*font-size: 18px;\s*\}/);
    assert.match(mobile, /\.cta_[a-z0-9]+ \{\s*display: none;\s*\}/);
    assert.doesNotMatch(tablet, /display: none/);
    assert.match(tablet, /\.aboutbox_[a-z0-9]+ \{\s*left: 40px;\s*\}/);
    assert.doesNotMatch(mobile, /left: 40px/); // already in force from Tablet
    // the page root's width follows the breakpoints
    assert.match(tablet, /max-width: 768px/);
    assert.match(mobile, /max-width: 375px/);
  });

  it("a layer hidden at Tablet and shown again at Mobile is shown with its display back", async () => {
    useBreakpointStore.getState().setActive("tablet");
    documentCommands.setLayerFlags("btn", { visible: false });
    useBreakpointStore.getState().setActive("mobile");
    documentCommands.setLayerFlags("btn", { visible: true });
    useBreakpointStore.getState().setActive(null);
    const css = text(await files(getDocument(), "html"), "styles.css");
    const tablet = media(css, 768);
    assert.match(tablet, /\.cta_[a-z0-9]+ \{\s*display: none;/);
    const mobile = media(css, 375);
    assert.match(mobile, /\.cta_[a-z0-9]+ \{[^}]*display: inline-flex;/);
  });

  it("colour modes: the other mode's values are under [data-mode], at each breakpoint on top of that breakpoint", async () => {
    const { createVariable, bindVariable } = await import("../../../tokens/tokenOps");
    const v = createVariable("bg", "color", { light: "#ffffff", dark: "#101010" })!;
    bindVariable(["abox"], "appearance.background.color", v);
    const f = await files(getDocument(), "html");
    const css = text(f, "styles.css");
    assert.match(css, /\[data-mode="dark"\] \.aboutbox_[a-z0-9]+ \{\s*background-color: #101010;/);
    assert.match(text(f, "about/index.html"), /<html lang="en" data-mode="light">/);
  });

  it("links: a page link is an anchor around the element, an anchor link goes to the section's id, a web link opens a tab", async () => {
    const { setLink } = await import("../../../pages/pageOps");
    const { makeSections, setAnchor } = await import("../../../pages/pageOps");
    makeSections("about");
    setAnchor("abox", "box-section");
    setLink(["btn"], { kind: "page", target: "about" });
    setLink(["pic"], { kind: "anchor", target: "abox" });
    setLink(["head"], { kind: "url", target: "https://example.com/x" });
    const f = await files(getDocument(), "html");
    const html = text(f, "index.html");
    assert.match(html, /<a class="lnk" href="\.\/about\/index\.html">\s*<button/);
    assert.match(html, /<a class="lnk" href="\.\/about\/index\.html#box-section">/);
    assert.match(html, /<a class="lnk" href="https:\/\/example\.com\/x" target="_blank" rel="noopener noreferrer">/);
    assert.match(text(f, "about/index.html"), /id="box-section"/);
    const next = await files(getDocument(), "next");
    assert.match(text(next, "app/page.tsx"), /href="\/about#box-section"/);
  });

  it("with no pages marked, every top-level frame is a page: the first is home", async () => {
    const plain = createDocumentFromLayers([
      { ...page("a", "First", 0), page: undefined } as Layer,
      { ...page("b", "Second Page", 1560), page: undefined } as Layer,
    ]);
    const plan = buildPlan(plain, { styling: "css", hrefs: "files" });
    assert.deepEqual(plan.pages.map((p) => p.route), ["/", "/second-page"]);
  });
});

describe("Phase 49: the targets", () => {
  beforeEach(() => {
    setDocument(
      createDocumentFromLayers([page("home", "Home", 0, ["head"]), box("head", "home", "Heading", { "content.text": "Hi" }, "text"), page("about", "About us", 1560, ["abox"]), box("abox", "about", "AboutBox")]),
    );
    useBreakpointStore.getState().setActive(null);
  });

  it("Next: an App Router route for each page, metadata, layout, global CSS; modules give each page its own CSS file", async () => {
    const f = await files(getDocument(), "next", "modules");
    const paths = f.map((x) => x.path);
    for (const p of ["app/layout.tsx", "app/globals.css", "app/page.tsx", "app/page.module.css", "app/about-us/page.tsx", "app/about-us/page.module.css", "package.json", "tsconfig.json", "next.config.ts", "README.md"]) assert.ok(paths.includes(p), p);
    assert.match(text(f, "app/page.tsx"), /import styles from "\.\/page\.module\.css"/);
    assert.match(text(f, "app/page.tsx"), /export const metadata = \{ title: "Home" \}/);
    assert.match(text(f, "app/page.tsx"), /className=\{styles\["heading_[a-z0-9]+"\]\}/);
    assert.doesNotMatch(text(f, "app/globals.css"), /heading_/);
    assert.match(text(f, "app/about-us/page.module.css"), /aboutbox_/);
    const css = await files(getDocument(), "next", "css");
    assert.match(text(css, "app/globals.css"), /heading_/);
    assert.match(text(css, "app/page.tsx"), /className="heading_[a-z0-9]+"/);
  });

  it("Vite: components for each page, a router in App.tsx, a stylesheet; tailwind adds its config and puts utilities on elements", async () => {
    const f = await files(getDocument(), "vite", "tailwind");
    const paths = f.map((x) => x.path);
    for (const p of ["index.html", "src/main.tsx", "src/App.tsx", "src/pages/Home.tsx", "src/pages/AboutUs.tsx", "src/styles.css", "tailwind.config.js", "postcss.config.js", "vite.config.ts"]) assert.ok(paths.includes(p), p);
    assert.match(text(f, "src/App.tsx"), /path: "\/about-us"/);
    assert.match(text(f, "src/pages/Home.tsx"), /className="[^"]*\[font-size:24px\]/);
    assert.match(text(f, "src/styles.css"), /@tailwind utilities/);
    assert.doesNotMatch(text(f, "src/styles.css"), /\.heading_/);
    const pkg = JSON.parse(text(f, "package.json"));
    assert.ok(pkg.devDependencies.tailwindcss);
  });

  it("the generated React code is valid TSX (parsed by the TypeScript compiler)", async () => {
    for (const target of ["next", "vite"] as const) {
      for (const styling of ["css", "modules", "tailwind"] as const) {
        const f = await files(getDocument(), target, styling);
        for (const file of f.filter((x) => /\.tsx?$/.test(x.path))) {
          const out = ts.transpileModule(String(file.content), { reportDiagnostics: true, fileName: file.path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
          assert.deepEqual((out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")), [], `${target}/${styling}: ${file.path}`);
        }
      }
    }
  });

  it("plain HTML ignores modules and tailwind, with a note", async () => {
    const r = await buildSiteExport(getDocument(), { target: "html", styling: "tailwind" });
    assert.ok(r.files.some((f) => f.path === "styles.css"));
    assert.ok(r.warnings.some((w) => /one stylesheet/.test(w)));
  });
});

describe("Phase 49: pictures and fonts", () => {
  const ID = "ab".repeat(32);
  const IMAGE_ID = `${"cd".repeat(32)}`;
  it("only the pictures a page draws are packed, at their hashed names; a missing one is left out with a note", async () => {
    const d = createDocumentFromLayers([page("p", "Home", 0, ["img", "unused"]), box("img", "p", "Logo", { "media.src": `asset:${ID}`, "frame.width": 100, "frame.height": 40 }, "container"), box("unused", "p", "Plain")]);
    // an image layer: change the archetype
    d.layers.img = createLayer({ id: "img", archetype: "image", parentId: "p", name: "Logo", properties: { positioning: "absolute", "media.src": `asset:${ID}`, "frame.width": 100, "frame.height": 40 } }) as Layer;
    d.assets = { [ID]: { id: ID, name: "logo.png", kind: "image", mime: "image/png", bytes: 3, addedAt: 0 } as never, [IMAGE_ID]: { id: IMAGE_ID, name: "other.png", kind: "image", mime: "image/png", bytes: 3, addedAt: 0 } as never };
    const bytes = new Uint8Array([1, 2, 3]);
    const r = await buildSiteExport(d, { target: "html", styling: "css", readAsset: async (id) => (id === ID ? { bytes, mime: "image/png", name: "logo.png" } : null) });
    assert.ok(r.files.some((f) => f.path === `assets/${ID.slice(0, 12)}.png`));
    assert.ok(!r.files.some((f) => f.path.includes(IMAGE_ID.slice(0, 12))));
    assert.match(String(r.files.find((f) => f.path === "index.html")!.content), new RegExp(`src="\\./assets/${ID.slice(0, 12)}\\.png"`));
    const missing = await buildSiteExport(d, { target: "next", styling: "css" });
    assert.ok(missing.warnings.some((w) => /missing from this browser/.test(w)));
  });

  it("the fonts a page uses: a Google stylesheet link for catalog families, none for system ones", async () => {
    const d = createDocumentFromLayers([page("p", "Home", 0, ["t"]), box("t", "p", "T", { "typography.fontFamily": "Roboto", "content.text": "x" }, "text")]);
    const html = String((await buildSiteExport(d, { target: "html", styling: "css" })).files.find((f) => f.path === "index.html")!.content);
    assert.match(html, /fonts\.googleapis\.com\/css2\?family=Roboto/);
    const d2 = createDocumentFromLayers([page("p", "Home", 0, ["t"]), box("t", "p", "T", { "typography.fontFamily": "Georgia", "content.text": "x" }, "text")]);
    assert.doesNotMatch(String((await buildSiteExport(d2, { target: "html", styling: "css" })).files.find((f) => f.path === "index.html")!.content), /fonts\.googleapis/);
  });
});

describe("Phase 49: every archetype of the render gallery exports", () => {
  it("each gallery case draws to markup and out through all three targets; the React code is valid TSX", async () => {
    const layers = Object.values(buildGalleryLayers());
    // put every case on one page, in a grid
    const roots = layers.filter((l) => l.parentId === null);
    const doc = createDocumentFromLayers([
      page("gallery", "Gallery", 0, roots.map((r) => r.id)),
      ...layers.map((l, i) => (l.parentId === null ? { ...l, parentId: "gallery", properties: { ...l.properties, positioning: "absolute", "frame.x": (roots.indexOf(l) % 6) * 240, "frame.y": Math.floor(roots.indexOf(l) / 6) * 160 } } : l)),
    ]);
    assert.ok(GALLERY_CASES.length > 40);
    for (const target of ["html", "vite", "next"] as const) {
      const r = await buildSiteExport(doc, { target, styling: "css" });
      for (const file of r.files.filter((x) => /\.tsx$/.test(x.path))) {
        const out = ts.transpileModule(String(file.content), { reportDiagnostics: true, fileName: file.path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX } });
        assert.deepEqual((out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")), [], file.path);
      }
    }
    const html = text(await files(doc, "html"), "index.html");
    assert.doesNotMatch(html, /javascript:/); // the blocked sources stay blocked
    assert.doesNotMatch(html, /<script/);
    const tree = parseMarkup(html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>")));
    let count = 0;
    walk(tree, () => count++);
    assert.ok(count > 100, `${count} elements`);
    void toText;
  });
});

describe("FigCraft port F8: the HTML writer keeps text as it is", () => {
  it("text mixed with elements is written inline (a list marker before its words, styled runs); empty elements stay empty", async () => {
    const { parseMarkup } = await import("../markup");
    const { toHtml } = await import("../serialize");
    const html = toHtml(parseMarkup('<div style="white-space:pre-wrap"><div><span>1.</span>Plan</div><div><b>bold</b> and <i>it</i></div></div><div></div>'));
    assert.match(html, /<div><span>1\.<\/span>Plan<\/div>/);
    assert.match(html, /<div><b>bold<\/b> and <i>it<\/i><\/div>/);
    assert.match(html, /<div><\/div>\n$/, "no white space inside an empty element");
  });
});
