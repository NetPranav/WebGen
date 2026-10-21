import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createDocumentFromLayers, createLayer } from "../../../document/factories";
import type { Layer, MotionDocument } from "../../../document/schema";
import { documentCommands, getDocument } from "../../../store/useDocumentStore";
import { setDocument } from "../../../store/documentState";
import { useBreakpointStore } from "../../../store/useBreakpointStore";
import { createComponent, insertInstance } from "../../../components/componentOps";
import { addVariantProperty, exposeProperty, setProperty, setVariant } from "../../../components/variantOps";
import { makePage, makeSections, setLink, shareSection } from "../../../pages/pageOps";
import { buildSiteExport, type SiteFile } from "..";
import { isPlainInstance } from "../components";
import { parseMarkup, walk, type ENode } from "../markup";

const L = (id: string) => getDocument().layers[id];
const frame = (id: string, name: string, x: number, children: string[] = []): Layer => createLayer({ id, archetype: "container", parentId: null, name, children, properties: { "frame.x": x, "frame.y": 0, "frame.width": 1000, "frame.height": 700, "appearance.background.color": "#ffffff" } }) as Layer;
const box = (id: string, parentId: string, name: string, extra: Record<string, unknown> = {}, archetype: "container" | "text" | "button" = "container", children: string[] = []): Layer =>
  createLayer({ id, archetype, parentId, name, children, properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 160, "frame.height": 48, ...extra } }) as Layer;
const text = (fs: SiteFile[], path: string) => String(fs.find((f) => f.path === path)?.content);

describe("Phase 49: components in the export", () => {
  let btn: string;
  let i1: string;
  let i2: string;
  let i3: string;
  beforeEach(() => {
    setDocument(
      createDocumentFromLayers([
        frame("home", "Home", 0, ["main", "label_box"]),
        box("main", "home", "Button", { "frame.x": 20, "frame.y": 20, "appearance.background.color": "#336699" }, "container", ["label", "icon"]),
        box("label", "main", "label", { "frame.x": 12, "frame.y": 12, "frame.width": 100, "frame.height": 24, "content.text": "Click me" }, "text"),
        box("icon", "main", "icon", { "frame.x": 130, "frame.y": 12, "frame.width": 24, "frame.height": 24, "appearance.background.color": "#ffcc00" }),
        box("label_box", "home", "Spare", { "frame.x": 600, "frame.y": 400 }),
        frame("about", "About", 1100, ["spare2"]),
        box("spare2", "about", "Spare2", {}),
      ]),
    );
    makePage("home");
    makePage("about");
    useBreakpointStore.getState().setActive(null);
    btn = createComponent(["main"])!;
    exposeProperty("label", "text", "Label");
    exposeProperty("icon", "boolean", "Show icon");
    addVariantProperty(btn, "Size", ["S", "M"]);
    const [, m] = getDocument().designComponents![btn].variants!.map((v) => v.mainId);
    documentCommands.updateProps(m, { "frame.width": 220 });
    i1 = insertInstance(btn, { parentId: "home", at: { x: 300, y: 20 } })!;
    i2 = insertInstance(btn, { parentId: "about", at: { x: 40, y: 40 }, variant: { Size: "M" } })!;
    setProperty(i2, getDocument().designComponents![btn].properties![0].id, "Save");
    i3 = insertInstance(btn, { parentId: "about", at: { x: 40, y: 200 } })!;
    documentCommands.updateProps(L(i3).children[1], { "appearance.background.color": "#ff0000" }); // an override that isn't a property
  });

  it("an instance is plain when it changed only exposed properties and its place; an override or a layer of its own makes it not", () => {
    assert.equal(isPlainInstance(getDocument(), i1), true);
    assert.equal(isPlainInstance(getDocument(), i2), true);
    assert.equal(isPlainInstance(getDocument(), i3), false);
    assert.equal(isPlainInstance(getDocument(), "home"), false);
  });

  it("Next: a component file with typed props; pages call it with the variant and the values; an instance with its own change is written out", async () => {
    const r = await buildSiteExport(getDocument(), { target: "next", styling: "css" });
    const comp = text(r.files, "components/Button.tsx");
    assert.match(comp, /export interface ButtonProps \{[\s\S]*?size\?: "S" \| "M";[\s\S]*?label\?: string;[\s\S]*?showIcon\?: boolean;[\s\S]*?className\?: string;/);
    assert.match(comp, /export default function Button\(props: ButtonProps\)/);
    assert.match(comp, /props\.label \?\? "Click me"/);
    assert.match(comp, /props\.showIcon !== false && \(/);
    assert.match(comp, /if \(size === "M"\)/);
    const home = text(r.files, "app/page.tsx");
    assert.match(home, /import Button from "\.\.\/components\/Button";/);
    assert.match(home, /<Button className="[a-z0-9_]+" \/>/); // the main on the page and the first instance, default variant
    const about = text(r.files, "app/about/page.tsx");
    assert.match(about, /<Button className="[a-z0-9_]+" size="M" label="Save" \/>/);
    assert.ok(r.warnings.some((w) => /has changes of its own and is written out in full/.test(w)));
    // the overridden instance is in the page in full: its red icon colour is a rule of the page, not of the component
    assert.match(text(r.files, "app/globals.css"), /background-color: #ff0000/);
  });

  it("the page's CSS keeps only where each call sits; the component's CSS has the look", async () => {
    const r = await buildSiteExport(getDocument(), { target: "next", styling: "css" });
    const css = text(r.files, "app/globals.css");
    const components = css.slice(css.indexOf("/* Button */"), css.indexOf("/* Home"));
    assert.match(components, /background-color: #336699/);
    const pagePart = css.slice(css.indexOf("/* Home"));
    assert.doesNotMatch(pagePart.slice(0, pagePart.indexOf("/* About")), /#336699/);
  });

  it("CSS Modules put the component's CSS in its own module; Tailwind puts utilities in the component", async () => {
    const m = await buildSiteExport(getDocument(), { target: "next", styling: "modules" });
    assert.ok(m.files.some((f) => f.path === "components/Button.module.css"));
    assert.match(text(m.files, "components/Button.tsx"), /import styles from "\.\/Button\.module\.css"/);
    assert.match(text(m.files, "components/Button.tsx"), /className=\{\[styles\["[a-z0-9_]+"\], props\.className\]\.filter\(Boolean\)\.join\(" "\)\}/);
    const t = await buildSiteExport(getDocument(), { target: "vite", styling: "tailwind" });
    assert.match(text(t.files, "src/components/Button.tsx"), /\[background-color:#336699\]/);
    assert.ok(t.files.some((f) => f.path === "src/components/Button.tsx"));
    assert.match(text(t.files, "src/pages/Home.tsx"), /import Button from "\.\.\/components\/Button"/);
  });

  it("plain HTML has no components: everything is written out", async () => {
    const r = await buildSiteExport(getDocument(), { target: "html", styling: "css" });
    assert.ok(!r.files.some((f) => /Button/.test(f.path)));
    assert.match(text(r.files, "about/index.html"), /Save/);
  });

  it("the React code is valid TSX in every target and styling", async () => {
    for (const target of ["next", "vite"] as const) {
      for (const styling of ["css", "modules", "tailwind"] as const) {
        const r = await buildSiteExport(getDocument(), { target, styling });
        for (const f of r.files.filter((x) => /\.tsx$/.test(x.path))) {
          const out = ts.transpileModule(String(f.content), { reportDiagnostics: true, fileName: f.path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX } });
          assert.deepEqual((out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")), [], `${target}/${styling}: ${f.path}`);
        }
      }
    }
  });

  it("a shared header is a component every page calls, with its links as routes", async () => {
    makeSections("home");
    makeSections("about");
    const nav = L("home").children.find((c) => L(c).section && L(c).name === "Spare")!;
    const c = shareSection(nav, "header")!;
    assert.ok(c);
    setLink([nav], { kind: "page", target: "about" });
    const r = await buildSiteExport(getDocument(), { target: "next", styling: "css" });
    const name = /export default function (\w+)\(/.exec(text(r.files, r.files.find((f) => f.path.startsWith("components/") && f.path !== "components/Button.tsx" && f.path.endsWith(".tsx"))!.path))![1];
    assert.match(text(r.files, "app/about/page.tsx"), new RegExp(`<${name} `));
    assert.match(text(r.files, "app/page.tsx"), new RegExp(`<${name} `));
    assert.match(text(r.files, `components/${name}.tsx`), /href="\/about"/);
  });
});

// --- the React code draws the same page as the plain HTML --------------------------------------------------------------

/** Loads an exported TSX file as a module: transpiled to CommonJS, with React, CSS Modules (class names back as names) and the other exported files. */
function loadModule(files: SiteFile[], path: string, cache = new Map<string, unknown>()): { default: React.ComponentType } {
  const hit = cache.get(path);
  if (hit) return hit as { default: React.ComponentType };
  const src = String(files.find((f) => f.path === path)!.content);
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  cache.set(path, mod.exports);
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const req = (name: string): unknown => {
    if (name === "react" || name === "react/jsx-runtime" || name === "react/jsx-dev-runtime") return require(name); // eslint-disable-line @typescript-eslint/no-require-imports
    if (name.endsWith(".module.css")) return { default: new Proxy({}, { get: (_t, k) => String(k) }), __esModule: true };
    if (name.startsWith(".")) {
      const parts = `${dir}/${name}`.split("/");
      const stack: string[] = [];
      for (const p of parts) {
        if (p === "..") stack.pop();
        else if (p && p !== ".") stack.push(p);
      }
      const target = `${stack.join("/")}.tsx`;
      return loadModule(files, target, cache);
    }
    throw new Error(`unexpected import ${name}`);
  };
  new Function("require", "module", "exports", out)(req, mod, mod.exports);
  return mod.exports as { default: React.ComponentType };
}

/** Tags, attributes without `class`, and text: what the page is made of, ignoring class names (a component's classes are its own). */
function shape(nodes: ENode[]): string {
  const out: string[] = [];
  const visit = (n: ENode) => {
    if (n.tag === "#text") {
      const t = (n.text ?? "").trim();
      if (t) out.push(`"${t}"`);
      return;
    }
    const attrs = Object.entries(n.attrs).filter(([k]) => k !== "class" && k !== "style").map(([k, v]) => `${k}=${v}`).sort().join(" ");
    out.push(`<${n.tag} ${attrs}>`);
    n.children.forEach(visit);
    out.push(`</${n.tag}>`);
  };
  nodes.forEach(visit);
  return out.join("");
}

describe("Phase 49: the React pages draw what the HTML page draws", () => {
  it("each page of the Next and Vite exports renders, with components called, to the same elements as the plain HTML page", async () => {
    setDocument(
      createDocumentFromLayers([
        frame("home", "Home", 0, ["main"]),
        box("main", "home", "Button", { "frame.x": 20, "frame.y": 20, "appearance.background.color": "#336699" }, "container", ["label", "icon"]),
        box("label", "main", "label", { "frame.x": 12, "frame.y": 12, "frame.width": 100, "frame.height": 24, "content.text": "Click me & <go>" }, "text"),
        box("icon", "main", "icon", { "frame.x": 130, "frame.width": 24, "frame.height": 24 }),
        frame("about", "About", 1100, []),
      ]),
    );
    makePage("home");
    makePage("about");
    const c = createComponent(["main"])!;
    const pl = exposeProperty("label", "text", "Label")!;
    exposeProperty("icon", "boolean", "Show icon");
    addVariantProperty(c, "Size", ["S", "M"]);
    const a = insertInstance(c, { parentId: "about", at: { x: 10, y: 10 }, variant: { Size: "M" } })!;
    setProperty(a, pl, "Hello");
    const b = insertInstance(c, { parentId: "about", at: { x: 10, y: 100 } })!;
    documentCommands.setLayerFlags(L(b).children[1], { visible: false });
    setVariant([b], { Size: "M" });
    const html = await buildSiteExport(getDocument(), { target: "html", styling: "css" });
    for (const target of ["next", "vite"] as const) {
      const r = await buildSiteExport(getDocument(), { target, styling: "modules" });
      const pages = target === "next" ? [["app/page.tsx", "index.html"], ["app/about/page.tsx", "about/index.html"]] : [["src/pages/Home.tsx", "index.html"], ["src/pages/About.tsx", "about/index.html"]];
      for (const [tsxPath, htmlPath] of pages) {
        const Page = loadModule(r.files, tsxPath).default;
        const rendered = renderToStaticMarkup(React.createElement(Page));
        const reactShape = shape(parseMarkup(rendered));
        const body = String(html.files.find((f) => f.path === htmlPath)!.content);
        const htmlShape = shape(parseMarkup(body.slice(body.indexOf("<body>") + 6, body.indexOf("</body>"))));
        assert.equal(reactShape, htmlShape, `${target}: ${tsxPath}`);
        if (tsxPath.includes("about") || tsxPath.includes("About")) assert.match(rendered, /Hello/);
      }
    }
    void walk;
    void (null as unknown as MotionDocument);
  });
});
