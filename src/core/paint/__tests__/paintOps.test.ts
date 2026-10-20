import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { fillSummary, fillsOf, hasFills, setBlur, setFills, setShadows, setStrokeStyle, shadowsOf, strokeStyleOf } from "../paintOps";
import { newPaint, serializeFills, type Paint } from "../paints";
import { readSimple, setFill } from "../../inspector/simpleOps";

const layer = (id: string, archetype: string, props: Record<string, unknown> = {}, extra: Partial<Layer> = {}): Layer =>
  ({ ...(createLayer({ id, archetype: archetype as never, parentId: "pg", name: id, properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 100, "frame.height": 50, ...props } as never }) as Layer), ...extra });
const p = (id: string, path: string) => getDocument().layers[id].properties[path];

beforeEach(() => {
  setDocument(createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "pg", children: ["r", "c", "t", "lk"], properties: { "frame.width": 800, "frame.height": 600 } }) as Layer,
    layer("r", "rectangle", {}),
    layer("c", "container", { "appearance.background.color": "#336699" }),
    layer("t", "text", { "content.text": "x" }),
    layer("lk", "rectangle", {}, { locked: true }),
  ]));
});

describe("Phase 35: fills on layers", () => {
  it("which layers can have a list of fills", () => {
    for (const a of ["container", "form", "button", "rectangle", "ellipse", "polygon", "star", "arrow", "badge", "fab", "generic"]) assert.equal(hasFills(a), true, a);
    for (const a of ["text", "image", "line", "icon", "divider"]) assert.equal(hasFills(a), false, a);
  });

  it("a layer with only a plain colour reads it as one solid fill, and a default fill too", () => {
    assert.deepEqual(fillsOf("c"), [{ type: "solid", color: "#336699", opacity: 1, visible: true }]);
    assert.equal(fillsOf("r")[0].type, "solid"); // the rectangle's default grey
    assert.deepEqual(fillsOf("t"), []);
  });

  it("setFills stores the list, one undo step, and the layer then reads it back", () => {
    const fills: Paint[] = [newPaint("linear", "#ff0000"), { type: "solid", color: "#00ff00", opacity: 0.5, visible: true }];
    assert.equal(setFills(["r", "c"], fills), 2);
    assert.equal(p("r", "paint.fills"), serializeFills(fills));
    assert.deepEqual(fillsOf("r"), fills);
    historyCommands.undo();
    assert.equal(p("r", "paint.fills"), undefined);
    assert.equal(p("c", "paint.fills"), undefined);
  });

  it("an empty list means no fill, not the plain colour again", () => {
    setFills(["c"], []);
    assert.deepEqual(fillsOf("c"), []);
    assert.equal(fillSummary("c"), "None");
  });

  it("layers that can't have fills, and locked layers, are skipped", () => {
    assert.equal(setFills(["t", "lk"], [newPaint("solid")]), 0);
    assert.equal(p("lk", "paint.fills"), undefined);
  });

  it("the summary: a colour, Gradient, Multiple fills, None", () => {
    assert.equal(fillSummary("c"), "#336699");
    setFills(["c"], [newPaint("conic")]);
    assert.equal(fillSummary("c"), "Gradient");
    setFills(["c"], [newPaint("solid", "#111111"), newPaint("solid", "#222222")]);
    assert.equal(fillSummary("c"), "Multiple fills");
    setFills(["c"], [{ ...newPaint("solid", "#111111"), visible: false }]);
    assert.equal(fillSummary("c"), "None");
  });
});

describe("Phase 35: the Simple face and the paint list agree", () => {
  it("the Simple face reads Gradient for a gradient fill, and a colour for a solid one", () => {
    setFills(["r"], [newPaint("linear")]);
    assert.equal(readSimple(["r"]).fill, "Gradient");
    setFills(["r"], [newPaint("solid", "#123456")]);
    assert.equal(readSimple(["r"]).fill, "#123456");
  });

  it("picking a colour in the Simple face makes the fill that one plain colour", () => {
    setFills(["r", "c"], [newPaint("linear"), newPaint("solid")]);
    assert.equal(setFill(["r", "c"], "#abcdef"), 2);
    assert.equal(p("r", "svg.fill"), "#abcdef");
    assert.equal(p("c", "appearance.background.color"), "#abcdef");
    assert.equal(p("r", "paint.fills"), undefined, "the stored list is gone");
    assert.deepEqual(fillsOf("r"), [{ type: "solid", color: "#abcdef", opacity: 1, visible: true }]);
  });
});

describe("Phase 35: shadows and blur", () => {
  it("shadows are stored and read back, and an empty list clears them", () => {
    const shadow = { kind: "drop" as const, x: 1, y: 2, blur: 3, spread: 0, color: "#000000", visible: true };
    assert.equal(setShadows(["r", "c", "t"], [shadow]), 3);
    assert.deepEqual(shadowsOf("t"), [shadow]);
    setShadows(["r"], []);
    assert.deepEqual(shadowsOf("r"), []);
    assert.equal(setShadows(["lk"], [shadow]), 0);
  });

  it("layer blur and background blur are clamped, and NaN is refused", () => {
    setBlur(["r"], { layer: 12, background: 999 });
    assert.deepEqual([p("r", "filter.blur"), p("r", "paint.backgroundBlur")], [12, 200]);
    setBlur(["r"], { layer: -5 });
    assert.equal(p("r", "filter.blur"), 0);
    assert.equal(setBlur(["r"], { layer: Number.NaN }), 0);
    assert.equal(setBlur(["r"], {}), 0);
  });
});

describe("Phase 35: stroke styles", () => {
  it("a shape's dash pattern scales with its stroke width; dotted uses round caps", () => {
    getDocument().layers.r.properties["svg.strokeWidth"] = 4;
    assert.equal(strokeStyleOf("r"), "solid");
    setStrokeStyle(["r"], "dashed");
    assert.equal(p("r", "svg.strokeDasharray"), "16 12");
    assert.equal(strokeStyleOf("r"), "dashed");
    setStrokeStyle(["r"], "dotted");
    assert.equal(p("r", "svg.strokeDasharray"), "4 8");
    assert.equal(p("r", "svg.strokeLinecap"), "round");
    assert.equal(strokeStyleOf("r"), "dotted");
    setStrokeStyle(["r"], "solid");
    assert.equal(p("r", "svg.strokeDasharray"), "none");
    assert.equal(strokeStyleOf("r"), "solid");
  });
  it("a frame gets a border style", () => {
    setStrokeStyle(["c"], "dashed");
    assert.equal(p("c", "appearance.border.style"), "dashed");
    assert.equal(strokeStyleOf("c"), "dashed");
  });
  it("text and locked layers are skipped", () => {
    assert.equal(setStrokeStyle(["t", "lk"], "dashed"), 0);
    assert.equal(strokeStyleOf("t"), null);
  });
});
