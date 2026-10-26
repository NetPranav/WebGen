/**
 * FigCraft port F6 on documents: arrow keys move a child through its auto-layout stack (FigCraft `al_keys`), a child
 * set to fill an axis its parent hugs turns the parent fixed there (`al_behaviour_tests`), and the new settings reach
 * the stage's CSS (first child on top, strokes out of the layout, wrapped lines aligned, grid cell alignment).
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { RenderLayer } from "../../render/RenderLayer";
import { nudgeLayers } from "../editOps";
import { setChildSizing } from "../layoutOps";

const L = () => getDocument().layers;
const kid = (id: string, parentId = "stack"): Layer => createLayer({ id, archetype: "rectangle", parentId, name: id, properties: { "frame.width": 40, "frame.height": 20 } }) as Layer;

const doc = (stackProps: Record<string, unknown> = {}) =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["stack", "loose"], properties: { "frame.width": 800, "frame.height": 600 } }) as Layer,
    createLayer({
      id: "stack",
      archetype: "container",
      parentId: "pg",
      name: "Stack",
      children: ["a", "b", "c"],
      properties: { positioning: "absolute", "frame.x": 10, "frame.y": 10, "layout.auto": true, "layout.display": "flex", "layout.flexDirection": "row", "layout.gap": 8, ...stackProps } as Layer["properties"],
    }) as Layer,
    kid("a"),
    kid("b"),
    kid("c"),
    createLayer({ id: "loose", archetype: "rectangle", parentId: "pg", name: "loose", properties: { positioning: "absolute", "frame.x": 300, "frame.y": 300, "frame.width": 10, "frame.height": 10 } }) as Layer,
  ]);

describe("FigCraft port F6: editing in auto layout", () => {
  beforeEach(() => setDocument(doc()));

  it("arrows along a row move a child one place; across the row they do nothing; one undo step", () => {
    nudgeLayers(["a"], 1, 0);
    assert.deepEqual(L().stack.children, ["b", "a", "c"]);
    nudgeLayers(["a"], 10, 0);
    assert.deepEqual(L().stack.children, ["b", "c", "a"]);
    nudgeLayers(["a"], 1, 0);
    assert.deepEqual(L().stack.children, ["b", "c", "a"], "already last");
    nudgeLayers(["a"], 0, 1);
    assert.deepEqual(L().stack.children, ["b", "c", "a"], "across the flow: nothing");
    assert.equal(L().a.properties.positioning, undefined, "it stays in the flow");
    historyCommands.undo();
    assert.deepEqual(L().stack.children, ["b", "a", "c"]);
  });

  it("an absolute layer still nudges by pixels", () => {
    nudgeLayers(["loose"], 5, 0);
    assert.equal(L().loose.properties["frame.x"], 305);
  });

  it("a child set to fill the axis its parent hugs makes the parent fixed there", () => {
    setChildSizing(["a"], { horizontal: "fill" });
    assert.equal(L().a.properties["sizing.horizontal"], "fill");
    assert.equal(L().stack.properties["sizing.horizontal"], "fixed");
    assert.equal(typeof L().stack.properties["frame.width"], "number");
    assert.notEqual(L().stack.properties["sizing.vertical"], "fixed", "the other axis is untouched");
  });
});

describe("FigCraft port F6: the new settings on the stage", () => {
  const html = (stackProps: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
    setDocument(doc(stackProps));
    if (Object.keys(extra).length) Object.assign(L().a.properties, extra);
    return renderToStaticMarkup(createElement(RenderLayer, { layerId: "stack", layers: L() }));
  };

  it("first child on top: each child gets a z-index, the first the highest", () => {
    const out = html({ "layout.reverseZ": true });
    const z = [...out.matchAll(/data-element-id="(a|b|c)"[^>]*style="[^"]*z-index:(\d+)/g)].map((m) => [m[1], Number(m[2])]);
    assert.deepEqual(z, [["a", 3], ["b", 2], ["c", 1]], out);
    assert.ok(!html({}).includes("z-index"), "off by default");
  });

  it("an inside stroke left out of the layout is an outline inset by its width", () => {
    const out = html({ "layout.strokesIncluded": false, "appearance.border.width": 3, "appearance.border.style": "solid", "appearance.border.color": "#000" });
    assert.ok(out.includes("outline-offset:-3px") && !out.includes("border-style"), out.slice(0, 400));
    assert.ok(html({ "appearance.border.width": 3, "appearance.border.style": "solid" }).includes("border-style:solid"), "included by default: a border");
  });

  it("wrapped lines follow the cross alignment, or spread", () => {
    assert.ok(html({ "layout.flexWrap": "wrap", "layout.alignItems": "center" }).includes("align-content:center"));
    assert.ok(html({ "layout.flexWrap": "wrap", "layout.alignContent": "space-between" }).includes("align-content:space-between"));
    assert.ok(html({ "layout.justifyContent": "space-evenly" }).includes("justify-content:space-evenly"));
  });

  it("a grid child takes its own place in its cell", () => {
    const out = html({ "layout.display": "grid", "layout.auto": false }, { "layout.justifySelf": "end", "layout.alignSelf": "center" });
    assert.ok(/data-element-id="a"[^>]*justify-self:end/.test(out) && /data-element-id="a"[^>]*align-self:center/.test(out), out);
  });
});
