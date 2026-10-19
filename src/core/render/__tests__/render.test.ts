import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ARCHETYPE_IDS } from "../../document/registry";
import { createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { RENDER_DEFINITIONS } from "../definitions";
import { RenderLayer, RenderTree } from "../RenderLayer";
import { layerBoxStyle } from "../geometry";
import { resolveProps } from "../resolve";
import { MAX_RENDERED_LAYERS, safeFragmentHref, safeImageSrc, safePathData } from "../limits";
import { GALLERY_CASES, archetypesMissingFromGallery, buildGalleryLayers } from "../gallery";

const html = (layers: Record<string, Layer>, id: string) => renderToStaticMarkup(createElement(RenderLayer, { layerId: id, layers }));
const layer = (archetype: Layer["archetype"], properties: Layer["properties"] = {}, extra: Partial<Layer> = {}) =>
  createLayer({ id: "l", archetype, properties, ...extra }) as Layer;

describe("Phase 17: render definitions", () => {
  it("every archetype has a render definition, and the gallery has a case for each", () => {
    for (const id of ARCHETYPE_IDS) assert.equal(typeof RENDER_DEFINITIONS[id], "function", id);
    assert.deepEqual(archetypesMissingFromGallery(), []);
  });

  it("every gallery case renders, tagged with its layer id and archetype", () => {
    const layers = buildGalleryLayers();
    for (const c of GALLERY_CASES) {
      const out = html(layers, `gallery_${c.id}`);
      assert.ok(out.includes(`data-element-id="gallery_${c.id}"`), `${c.id}: ${out.slice(0, 120)}`);
      assert.ok(out.includes(`data-archetype="${c.archetype}"`) || c.archetype === "svgGroup", c.id);
    }
  });

  it("the six parametric shapes render as SVG", () => {
    for (const a of ["rectangle", "ellipse", "line", "polygon", "star", "arrow"] as const) {
      assert.ok(html({ l: layer(a) }, "l").startsWith("<svg"), a);
    }
  });

  it("nothing in the gallery carries an inline event handler, a script, or a javascript: URL", () => {
    const layers = buildGalleryLayers();
    const all = Object.keys(layers)
      .filter((id) => layers[id].parentId === null)
      .map((id) => html(layers, id))
      .join("\n");
    assert.ok(!/<script/i.test(all), "no <script>");
    assert.ok(!/<[a-z][^>]*\son[a-z]+\s*=/i.test(all), "no inline on* handler attribute on any tag");
    assert.ok(!/javascript:/i.test(all), "no javascript: URL");
  });

  it("hostile text is rendered as text", () => {
    const out = html(buildGalleryLayers(), "gallery_text-hostile");
    assert.ok(out.includes("&lt;img src=x onerror="), out);
    assert.ok(!out.includes("<img"), out);
  });

  it("an image with a blocked source loads nothing and shows its alt text", () => {
    const out = html(buildGalleryLayers(), "gallery_image-blocked");
    assert.ok(!out.includes("<img"));
    assert.ok(out.includes("Blocked source"));
  });

  it("an icon or path with anything but path commands is dropped", () => {
    const out = html(buildGalleryLayers(), "gallery_icon-bad-path");
    assert.ok(!out.includes("script") && out.includes('d=""'), out);
  });

  it("an external svg `use` draws nothing", () => {
    assert.ok(!html(buildGalleryLayers(), "gallery_svg-use-external").includes("<use"));
  });
});

describe("Phase 17: geometry drives the box (Law 10)", () => {
  const box = (l: Layer, ctx = {}) => layerBoxStyle(l, resolveProps(l), ctx);

  it("a fixed frame is its width and height; a hug layer sets neither", () => {
    const fixed = box(layer("container", { "frame.width": 200, "frame.height": 50 }, { parentId: "p" }));
    assert.equal(fixed.width, "200px");
    assert.equal(fixed.height, "50px");
    const hug = box(layer("container", {}, { parentId: "p" }));
    assert.equal(hug.width, undefined);
    assert.equal(hug.height, undefined);
  });

  it("absolute layers sit at frame.x/y; flow layers are positioned boxes for their own children", () => {
    const abs = box(layer("rectangle", { positioning: "absolute", "frame.x": 12, "frame.y": 34 }, { parentId: "p" }));
    assert.deepEqual([abs.position, abs.left, abs.top], ["absolute", 12, 34]);
    assert.equal(box(layer("text", {}, { parentId: "p" })).position, "relative");
  });

  it("fill grows along the parent's main axis and stretches across the other", () => {
    const fill = layer("text", { "sizing.horizontal": "fill" }, { parentId: "p" });
    assert.equal(box(fill, { parentDirection: "row" }).flex, "1 1 0%");
    assert.equal(box(fill, { parentDirection: "column" }).alignSelf, "stretch");
  });

  it("rotation, opacity and CSS units come through", () => {
    const s = box(layer("rectangle", { "frame.rotation": 30, "appearance.opacity": 0.5, "frame.width": 50, "frame.widthUnit": "%" }, { parentId: "p" }));
    assert.equal(s.transform, "rotate(30deg)");
    assert.equal(s.opacity, 0.5);
    assert.equal(s.width, "50%");
  });

  it("an absurd frame is clamped, so one layer can't ask for a million pixels", () => {
    assert.equal(box(layer("container", { "frame.width": 9e9 }, { parentId: "p" })).width, "20000px");
    assert.ok(html({ l: layer("rectangle", { "frame.width": 9e9, "frame.height": 5 }) }, "l").includes('width="10000"'));
  });

  it("resolveProps lets a layer's own value win over the archetype's default", () => {
    const r = resolveProps(layer("button", { "content.label": "Mine" }));
    assert.equal(r.str("content.label", "x"), "Mine");
    assert.equal(r.str("appearance.background.color", "x"), "#206859", "default fills the gap");
  });
});

describe("Phase 17: limits (decision record 0008, R5–R7)", () => {
  it("image sources: http(s), blob, inline images, app paths and assets only", () => {
    for (const ok of ["https://a.com/x.png", "http://a.com/x.png", "blob:abc", "data:image/png;base64,AAAA", "/img/a.png", "asset:abc"]) assert.ok(safeImageSrc(ok), ok);
    for (const bad of ["javascript:alert(1)", "data:text/html,<script>", "//evil.com/x", "vbscript:x", "file:///etc/passwd", ""]) assert.equal(safeImageSrc(bad), null, bad);
  });

  it("path data keeps path commands and numbers; svg `use` keeps same-document fragments", () => {
    assert.equal(safePathData("M0 0 L10,10 C 1e2 2 3 4 5 6 Z"), "M0 0 L10,10 C 1e2 2 3 4 5 6 Z");
    assert.equal(safePathData("M0 0 <script>"), "");
    assert.equal(safePathData("M0 0 ".repeat(30_000)), "");
    assert.equal(safeFragmentHref("#shape-1"), "#shape-1");
    assert.equal(safeFragmentHref("https://x/y.svg#a"), null);
  });

  it("a polygon's side count is clamped", () => {
    const out = html({ l: layer("polygon", { "shape.sides": 500 }) }, "l");
    assert.equal(out.match(/points="([^"]*)"/)![1].split(" ").length, 64);
  });

  it("a document can't draw more than the layer budget, and a cycle or deep chain ends", () => {
    const layers: Record<string, Layer> = {};
    const ids: string[] = [];
    for (let i = 0; i < MAX_RENDERED_LAYERS + 500; i++) {
      const id = `n${i}`;
      layers[id] = createLayer({ id, archetype: "badge", parentId: null }) as Layer;
      ids.push(id);
    }
    const drawn = (renderToStaticMarkup(createElement(RenderTree, { layers })).match(/data-archetype="badge"/g) ?? []).length;
    assert.equal(drawn, MAX_RENDERED_LAYERS);

    const a = createLayer({ id: "a", archetype: "container", parentId: null, children: ["b"] }) as Layer;
    const b = createLayer({ id: "b", archetype: "container", parentId: "a", children: ["a"] }) as Layer;
    const cyc = renderToStaticMarkup(createElement(RenderTree, { layers: { a, b } }));
    assert.equal((cyc.match(/data-archetype="container"/g) ?? []).length, 2, "each layer once, then the cycle stops");
  });

  it("a hidden layer draws nothing", () => {
    assert.equal(html({ l: { ...layer("text"), visible: false } }, "l"), "");
  });
});

describe("Phase 17: rule R1 — the renderer builds no HTML strings", () => {
  const root = join(process.cwd(), "src", "core", "render");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((e) => {
      const full = join(dir, e);
      return statSync(full).isDirectory() ? (e === "__tests__" ? [] : files(full)) : /\.(ts|tsx)$/.test(e) ? [full] : [];
    });

  it("no innerHTML, outerHTML, insertAdjacentHTML, document.write, srcDoc or dangerouslySetInnerHTML under src/core/render", () => {
    const banned = /innerHTML|outerHTML|insertAdjacentHTML|document\.write|srcDoc|dangerouslySetInnerHTML|new Function\(|eval\(/;
    const offenders = files(root).filter((f) => banned.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")));
    assert.deepEqual(offenders.map((f) => f.slice(root.length + 1)), []);
  });
});
