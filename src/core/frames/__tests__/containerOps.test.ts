/**
 * FigCraft port F11: frames, groups, sections and export settings. The cases of FigCraft's
 * `convert_container_tests.rs` and `section_tests.rs` (commit 6ea44e9), translated to our containers, plus the export
 * settings' rows (`next_after`) and the layer drawn as an SVG. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft
 * contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { worldBox } from "../../editing/layerBoxes";
import { RenderLayer } from "../../render/RenderLayer";
import { convertToFrame, convertToGroup, convertToSection, kindOf, resizeToFit } from "../containerOps";
import { fileNameOf, layerSvg, nextExportSetting, parseExportSettings } from "../../export/layerExport";

const L = () => getDocument().layers;
const box = (id: string) => {
  const b = worldBox(id)!;
  return [b.cx - b.w / 2, b.cy - b.h / 2, b.cx + b.w / 2, b.cy + b.h / 2].map((v) => Math.round(v * 100) / 100);
};
const rect = (id: string, parentId: string, x: number, y: number, w = 40, h = 20): Layer =>
  createLayer({ id, archetype: "rectangle", parentId, name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h } }) as Layer;
const frame = (id: string, parentId: string | null, x: number, y: number, w: number, h: number, children: string[], extra: Record<string, unknown> = {}): Layer =>
  createLayer({ id, archetype: "container", parentId, name: id, children, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h, "layout.padding": 0, ...extra } }) as Layer;

describe("FigCraft convert containers", () => {
  beforeEach(() =>
    setDocument(
      createDocumentFromLayers([
        frame("pg", null, 0, 0, 2000, 2000, ["card", "flow"]),
        frame("card", "pg", 100, 50, 300, 200, ["a", "b"], { "appearance.background.color": "#ff0000", "appearance.radius": 8, "appearance.opacity": 0.5 }),
        rect("a", "card", 20, 30),
        rect("b", "card", 120, 90),
        frame("flow", "pg", 600, 0, 200, 100, ["c", "d"], { "layout.auto": true, "layout.display": "flex", "layout.flexDirection": "row", "layout.padding": 10, "layout.gap": 10 }),
        createLayer({ id: "c", archetype: "rectangle", parentId: "flow", name: "c", properties: { "frame.width": 40, "frame.height": 20 } }) as Layer,
        createLayer({ id: "d", archetype: "rectangle", parentId: "flow", name: "d", properties: { "frame.width": 40, "frame.height": 20 } }) as Layer,
      ]),
    ),
  );

  it("a frame becomes a group around its layers: the same layer, what only a frame has gone, the layers in place; one undo step", () => {
    const before = [box("a"), box("b")];
    assert.deepEqual(convertToGroup(["card"]), ["card"]);
    const n = L().card;
    assert.equal(kindOf(n), "group");
    assert.deepEqual([n.name, n.properties["appearance.opacity"], n.children], ["card", 0.5, ["a", "b"]]);
    assert.equal(n.properties["appearance.background.color"], "transparent");
    assert.equal(n.properties["appearance.radius"], 0);
    assert.deepEqual([box("a"), box("b")], before, "the layers stay where they are");
    assert.deepEqual(box("card"), [120, 80, 260, 160], "a group's box is its layers'");
    historyCommands.undo();
    assert.equal(kindOf(L().card), "frame");
    assert.deepEqual(box("card"), [100, 50, 400, 250]);
  });

  it("auto layout is dropped with its positions and sizes kept; and back to a plain frame of the group's box", () => {
    const before = [box("c"), box("d")];
    convertToGroup(["flow"]);
    assert.equal(L().flow.properties["layout.auto"], undefined);
    assert.deepEqual([box("c"), box("d")], before);
    assert.equal(L().d.properties["sizing.horizontal"], "fixed");
    assert.deepEqual(convertToFrame(["flow"]), { ids: ["flow"] });
    assert.equal(kindOf(L().flow), "frame");
    assert.deepEqual([box("c"), box("d")], before);
  });

  it("a frame on the canvas becomes a section and back; nothing moves; the section shows its name", () => {
    setDocument(createDocumentFromLayers([frame("f", null, 100, 50, 300, 200, ["a"], { "appearance.background.color": "#ffeedd", "layout.auto": true, "layout.display": "flex" }), rect("a", "f", 20, 30)]));
    const before = [box("a"), box("f")];
    assert.deepEqual(convertToSection(["f"]), { ids: ["f"] });
    assert.equal(kindOf(L().f), "section");
    assert.equal(L().f.properties["appearance.background.color"], "#ffeedd", "same fill");
    assert.equal(L().f.properties["layout.auto"], undefined, "no auto layout");
    assert.deepEqual([box("a"), box("f")], before);
    assert.match(renderToStaticMarkup(createElement(RenderLayer, { layerId: "f", layers: L() })), /data-frame-kind="section".*data-section-label=""[^>]*>f</);
    convertToFrame(["f"]);
    assert.equal(kindOf(L().f), "frame");
    historyCommands.undo();
    historyCommands.undo();
    assert.equal(L().f.properties["layout.auto"], true, "the frame's auto layout is back");
  });

  it("only frames on the canvas or in a section become sections; a section holding sections can't become a frame", () => {
    const err = convertToSection(["card"]);
    assert.ok("error" in err && err.error.includes("inside a frame"));
    assert.ok("error" in convertToSection(["a"]), "a rectangle isn't a frame");
    setDocument(createDocumentFromLayers([frame("sec", null, 0, 0, 400, 400, ["inner"], { "frame.kind": "section" }), frame("inner", "sec", 20, 20, 100, 100, [])]));
    assert.deepEqual(convertToSection(["inner"]), { ids: ["inner"] });
    const r = convertToFrame(["sec"]);
    assert.ok("error" in r && r.error.includes("holds sections"));
    assert.equal(kindOf(L().sec), "section");
  });

  it("resize to fit: the frame takes its layers' box, which stay in place; empty frames and shapes are left alone", () => {
    const before = [box("a"), box("b")];
    assert.equal(resizeToFit(["card", "a"]), 1);
    assert.deepEqual(box("card"), [120, 80, 260, 160]);
    assert.deepEqual([box("a"), box("b")], before);
    historyCommands.undo();
    assert.deepEqual(box("card"), [100, 50, 400, 250]);
    assert.equal(resizeToFit(["flow"]), 0, "an auto-layout frame hugs by itself");
  });
});

describe("FigCraft export settings", () => {
  it("a new row steps the scale up with a matching suffix; stored rows are repaired", () => {
    assert.deepEqual(nextExportSetting(), { format: "png", scale: 1, suffix: "" });
    assert.deepEqual(nextExportSetting({ format: "svg", scale: 1, suffix: "" }), { format: "png", scale: 2, suffix: "@2x" });
    assert.deepEqual(nextExportSetting({ format: "png", scale: 4, suffix: "@4x" }).scale, 4);
    assert.deepEqual(parseExportSettings(JSON.stringify([{ format: "gif", scale: 99, suffix: "a/b" }, 3])), [{ format: "png", scale: 4, suffix: "ab" }]);
    assert.equal(fileNameOf("Card / Hero", { format: "svg", scale: 1, suffix: "@2x" }), "Card - Hero@2x.svg");
  });

  it("a layer as an SVG: drawn at its own origin, scaled, with the stage's markup inside", () => {
    setDocument(createDocumentFromLayers([frame("pg", null, 0, 0, 800, 600, ["r"]), rect("r", "pg", 300, 200, 100, 50)]));
    const svg = layerSvg(L(), "r", 100, 50, 2);
    assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="200" height="100" viewBox="0 0 100 50">/);
    assert.match(svg, /<foreignObject x="0" y="0" width="100" height="50">/);
    assert.match(svg, /data-element-id="r"[^>]*left:0;top:0/);
  });
});
