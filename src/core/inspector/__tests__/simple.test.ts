import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { readSimple, setFill, setFrame, setOpacity, setRadius, setSimpleText, setStroke } from "../simpleOps";
import { SIMPLE_CONTROLS, selectionSupports, sharedValue, simplePaths, supportsControl } from "../simpleControls";
import { getPropertyDefinition, isPropertyLegalFor } from "../../document/properties";
import { ALL_ARCHETYPE_IDS } from "../../../editor/panels/launcher/archetypeData";
import type { ArchetypeId } from "../../document/registry";

const layer = (id: string, archetype: string, parentId: string, props: Record<string, unknown>, extra: Partial<Layer> = {}): Layer =>
  ({ ...(createLayer({ id, archetype: archetype as never, parentId, name: id, properties: { positioning: "absolute", "frame.x": 10, "frame.y": 20, "frame.width": 100, "frame.height": 50, ...props } as never }) as Layer), ...extra });
const p = (id: string, path: string) => getDocument().layers[id].properties[path];

beforeEach(() => {
  setDocument(createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["r", "r2", "c", "t", "b", "lk", "flow"], properties: { "frame.x": 100, "frame.y": 50, "frame.width": 800, "frame.height": 600 } }) as Layer,
    layer("r", "rectangle", "pg", {}),
    layer("r2", "rectangle", "pg", { "frame.x": 300 }),
    layer("c", "container", "pg", {}),
    layer("t", "text", "pg", { "content.text": "Hello" }),
    layer("b", "button", "pg", { "content.label": "Go" }),
    layer("lk", "rectangle", "pg", {}, { locked: true }),
    { ...(createLayer({ id: "flow", archetype: "rectangle", parentId: "pg", name: "flow", properties: { "frame.width": 60, "frame.height": 40 } as never }) as Layer) },
  ]));
});

describe("Phase 33: which property each Simple control writes", () => {
  it("the face has seven controls and no more", () => assert.equal(SIMPLE_CONTROLS.length, 7));

  it("every mapped path is a real, legal property of its archetype", () => {
    for (const id of ALL_ARCHETYPE_IDS) {
      for (const [key, path] of Object.entries(simplePaths(id))) {
        assert.ok(getPropertyDefinition(path), `${id}.${key}: ${path} is not in the property registry`);
        assert.ok(isPropertyLegalFor(path, id as ArchetypeId), `${id}.${key}: ${path} is not legal for ${id}`);
      }
    }
    for (const id of ["rectangle", "ellipse", "polygon", "star", "line", "arrow", "svgPath", "container", "form", "text", "button", "image"] as const) {
      for (const [key, path] of Object.entries(simplePaths(id))) assert.ok(isPropertyLegalFor(path, id), `${id}.${key}: ${path}`);
    }
  });

  it("which controls each kind of layer gets", () => {
    assert.deepEqual(SIMPLE_CONTROLS.filter((c) => supportsControl("rectangle", c)), ["position", "size", "fill", "stroke", "radius", "opacity"]);
    assert.deepEqual(SIMPLE_CONTROLS.filter((c) => supportsControl("text", c)), ["position", "size", "fill", "opacity", "text"]);
    assert.deepEqual(SIMPLE_CONTROLS.filter((c) => supportsControl("ellipse", c)), ["position", "size", "fill", "stroke", "opacity"]);
    assert.deepEqual(SIMPLE_CONTROLS.filter((c) => supportsControl("line", c)), ["position", "size", "stroke", "opacity"]);
    assert.equal(selectionSupports(["text", "rectangle"], "stroke"), true);
    assert.equal(selectionSupports(["text"], "stroke"), false);
  });

  it("shared values: equal is the value, different is Mixed (null), none is undefined", () => {
    assert.equal(sharedValue([1, 1, 1]), 1);
    assert.equal(sharedValue([1, 2]), null);
    assert.equal(sharedValue([]), undefined);
  });
});

describe("Phase 33: every Simple control writes to the document, one undo step each", () => {
  it("fill goes to the right property for each kind of layer", () => {
    assert.equal(setFill(["r", "c", "t", "b"], "#ff0000"), 4);
    assert.equal(p("r", "svg.fill"), "#ff0000");
    assert.equal(p("c", "appearance.background.color"), "#ff0000");
    assert.equal(p("t", "typography.color"), "#ff0000");
    assert.equal(p("b", "appearance.background.color"), "#ff0000");
    historyCommands.undo();
    assert.notEqual(p("r", "svg.fill"), "#ff0000");
    assert.notEqual(p("t", "typography.color"), "#ff0000");
  });

  it("an unsafe colour is refused", () => {
    assert.equal(setFill(["r"], "red; position: fixed"), 0);
    assert.equal(setFill(["r"], "url(javascript:alert(1))"), 0);
    assert.notEqual(p("r", "svg.fill"), "red; position: fixed");
  });

  it("stroke: a shape gets svg.stroke, a frame a border with a solid style; width and colour help each other", () => {
    assert.equal(setStroke(["r", "c"], { width: 3 }), 2);
    assert.equal(p("r", "svg.strokeWidth"), 3);
    assert.equal(p("r", "svg.stroke"), "#0f172a", "width on a stroke with no colour gives it a colour");
    assert.deepEqual([p("c", "appearance.border.width"), p("c", "appearance.border.style"), p("c", "appearance.border.color")], [3, "solid", "#0f172a"]);
    setStroke(["r", "c"], { width: 0 });
    assert.equal(p("c", "appearance.border.style"), "none");
    setStroke(["r"], { color: "#00ff00" });
    assert.equal(p("r", "svg.stroke"), "#00ff00");
    assert.equal(p("r", "svg.strokeWidth"), 1, "a colour on a stroke of no width gives it one pixel");
    assert.equal(setStroke(["t"], { width: 2 }), 0, "text has no stroke");
    assert.equal(setStroke(["r"], { width: 9999 }), 1);
    assert.equal(p("r", "svg.strokeWidth"), 200, "capped");
    assert.equal(setStroke(["r"], { width: Number.NaN }), 0);
  });

  it("radius: the rectangle's corner radius, a frame's and a button's radius; never negative", () => {
    assert.equal(setRadius(["r", "c", "b", "t"], 12), 3);
    assert.deepEqual([p("r", "shape.cornerRadius"), p("c", "appearance.radius"), p("b", "appearance.radius")], [12, 12, 12]);
    setRadius(["r"], -5);
    assert.equal(p("r", "shape.cornerRadius"), 0);
    assert.equal(setRadius(["r"], Number.POSITIVE_INFINITY), 0);
  });

  it("opacity is 0 to 1 and clamps", () => {
    setOpacity(["r", "t"], 0.4);
    assert.equal(p("r", "appearance.opacity"), 0.4);
    assert.equal(p("t", "appearance.opacity"), 0.4);
    setOpacity(["r"], 7);
    assert.equal(p("r", "appearance.opacity"), 1);
    setOpacity(["r"], -1);
    assert.equal(p("r", "appearance.opacity"), 0);
  });

  it("text: a text's words (dropping styled runs) and a button's label", () => {
    getDocument().layers.t.properties["content.runs"] = '[{"t":"Hello","b":1}]';
    setSimpleText(["t", "b"], "New words");
    assert.equal(p("t", "content.text"), "New words");
    assert.equal(p("t", "content.runs"), "");
    assert.equal(p("b", "content.label"), "New words");
    assert.equal(setSimpleText(["r"], "x"), 0);
  });

  it("position and size: absolute layers write frame.*; only the coordinate you change moves", () => {
    setFrame(["r"], { x: 55 });
    assert.deepEqual([p("r", "frame.x"), p("r", "frame.y"), p("r", "frame.width")], [55, 20, 100]);
    setFrame(["r"], { width: 250, height: 90 });
    assert.deepEqual([p("r", "frame.width"), p("r", "frame.height"), p("r", "frame.x")], [250, 90, 55]);
    setFrame(["r"], { width: 0 });
    assert.equal(p("r", "frame.width"), 1, "a size is at least one");
    assert.equal(setFrame(["r"], { x: Number.NaN }), 0);
  });

  it("a layer placed by its parent's layout becomes absolute at its place when you move it", () => {
    const before = readSimple(["flow"]);
    setFrame(["flow"], { x: 200 });
    assert.equal(p("flow", "positioning"), "absolute");
    assert.equal(p("flow", "frame.x"), 200);
    assert.equal(p("flow", "frame.y"), before.y, "y stayed at its measured place");
  });

  it("locked layers are left alone, in every control", () => {
    for (const run of [() => setFill(["lk"], "#123456"), () => setStroke(["lk"], { width: 4 }), () => setRadius(["lk"], 9), () => setOpacity(["lk"], 0.1), () => setFrame(["lk"], { x: 99 })]) assert.equal(run(), 0);
    assert.notEqual(p("lk", "svg.fill"), "#123456");
    assert.equal(p("lk", "frame.x"), 10);
  });

  it("each control is one undo step for the whole selection", () => {
    const before = JSON.stringify(getDocument().layers);
    setFill(["r", "r2", "c"], "#abcdef");
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
  });
});

describe("Phase 33: what the face reads", () => {
  it("one layer: its own values", () => {
    const r = readSimple(["r"]);
    assert.deepEqual([r.x, r.y, r.width, r.height], [10, 20, 100, 50]);
    assert.equal(r.fill, "#cbd5e1");
    assert.equal(r.opacity, 1);
    assert.deepEqual(r.has, { position: true, size: true, fill: true, stroke: true, radius: true, opacity: true, text: false });
  });

  it("several layers: equal values are shown, different ones are Mixed", () => {
    const r = readSimple(["r", "r2"]);
    assert.equal(r.y, 20);
    assert.equal(r.x, null);
    assert.equal(r.width, 100);
    setFill(["r"], "#111111");
    assert.equal(readSimple(["r", "r2"]).fill, null);
  });

  it("a control no selected layer has is undefined, and the face hides it", () => {
    const t = readSimple(["t"]);
    assert.equal(t.has.stroke, false);
    assert.equal(t.strokeColor, undefined);
    assert.equal(t.text, "Hello");
  });

  it("positions are measured from the parent, so a nested layer reads its own offset", () => {
    assert.equal(readSimple(["pg"]).x, 100); // a top-level frame: from the canvas origin
    assert.equal(readSimple(["r"]).x, 10); // a child: from its parent's top-left
  });

  it("nothing selected reads nothing", () => {
    const r = readSimple([]);
    assert.equal(r.x, undefined);
    assert.equal(Object.values(r.has).some(Boolean), false);
  });
});
