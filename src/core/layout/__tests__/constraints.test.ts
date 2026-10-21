import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { constrainBox, constrainSpan, readHorizontal, readVertical } from "../constraints";
import { cellAt, equalTracks, gridInsertion, inferGrid, parseTracks, trackSpans } from "../grid";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";

describe("Phase 42: constraints on one axis", () => {
  const span = { pos: 20, size: 100 };
  it("start stays; end keeps its distance from the far edge; both stretches; center keeps its distance from the middle", () => {
    assert.deepEqual(constrainSpan(span, "start", 400, 600), span);
    assert.deepEqual(constrainSpan(span, "end", 400, 600), { pos: 220, size: 100 });
    assert.deepEqual(constrainSpan(span, "both", 400, 600), { pos: 20, size: 300 });
    assert.deepEqual(constrainSpan(span, "center", 400, 600), { pos: 120, size: 100 });
  });
  it("scale keeps the proportions", () => {
    assert.deepEqual(constrainSpan(span, "scale", 400, 800), { pos: 40, size: 200 });
    assert.deepEqual(constrainSpan(span, "scale", 400, 200), { pos: 10, size: 50 });
  });
  it("both never goes below zero", () => {
    assert.equal(constrainSpan(span, "both", 400, 200).size, 0);
  });
  it("the two axes are independent", () => {
    const r = constrainBox({ x: 10, y: 10, width: 50, height: 50, horizontal: "end", vertical: "scale" }, { width: 100, height: 100 }, { width: 300, height: 200 });
    assert.deepEqual(r, { x: 210, y: 20, width: 50, height: 100 });
  });
  it("reads the names the document stores; anything else is the start", () => {
    assert.equal(readHorizontal("leftRight"), "both");
    assert.equal(readVertical("bottom"), "end");
    assert.equal(readHorizontal(undefined), "start");
    assert.equal(readVertical("nonsense"), "start");
  });
});

const rect = (id: string, parentId: string, x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}): Layer =>
  createLayer({ id, archetype: "rectangle", parentId, name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h, ...extra } }) as Layer;

describe("Phase 42: resizing a frame moves its pinned children, in one undo step", () => {
  beforeEach(() => {
    setDocument(
      createDocumentFromLayers([
        createLayer({ id: "f", archetype: "container", parentId: null, name: "F", children: ["l", "r", "b", "c", "s", "plain", "in"], properties: { "frame.x": 0, "frame.y": 0, "frame.width": 400, "frame.height": 300 } }) as Layer,
        rect("l", "f", 10, 10, 50, 50),
        rect("r", "f", 340, 10, 50, 50, { "constraints.horizontal": "right" }),
        rect("b", "f", 10, 10, 380, 50, { "constraints.horizontal": "leftRight", "constraints.vertical": "bottom" }),
        rect("c", "f", 175, 125, 50, 50, { "constraints.horizontal": "center", "constraints.vertical": "center" }),
        rect("s", "f", 100, 100, 200, 100, { "constraints.horizontal": "scale", "constraints.vertical": "scale" }),
        rect("plain", "f", 5, 5, 10, 10),
        createLayer({ id: "in", archetype: "container", parentId: "f", name: "In", children: ["inner"], properties: { positioning: "absolute", "frame.x": 20, "frame.y": 200, "frame.width": 360, "frame.height": 80, "constraints.horizontal": "leftRight" } }) as Layer,
        rect("inner", "in", 300, 10, 40, 40, { "constraints.horizontal": "right" }),
      ]),
    );
  });
  const p = (id: string) => getDocument().layers[id].properties as Record<string, number>;

  it("every constraint does what the pure function says when the width and height change", () => {
    documentCommands.updateProps("f", { "frame.width": 600, "frame.height": 450 });
    assert.equal(p("l")["frame.x"], 10); // left and top: untouched
    assert.equal(p("r")["frame.x"], 540);
    assert.deepEqual([p("b")["frame.x"], p("b")["frame.width"], p("b")["frame.y"]], [10, 580, 160]);
    assert.deepEqual([p("c")["frame.x"], p("c")["frame.y"]], [275, 200]);
    assert.deepEqual([p("s")["frame.x"], p("s")["frame.y"], p("s")["frame.width"], p("s")["frame.height"]], [150, 150, 300, 150]);
    assert.equal(p("plain")["frame.x"], 5);
  });

  it("a child that stretches passes the change on to its own children", () => {
    documentCommands.updateProps("f", { "frame.width": 600 });
    assert.equal(p("in")["frame.width"], 560);
    assert.equal(p("inner")["frame.x"], 500); // pinned right inside a frame that grew by 200
  });

  it("is one undo step with the resize", () => {
    const before = JSON.stringify(getDocument().layers);
    documentCommands.updateProps("f", { "frame.width": 700, "frame.height": 100 });
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
  });

  it("does nothing when the size doesn't change, or when the frame has no size to compare", () => {
    const before = JSON.stringify(getDocument().layers);
    documentCommands.updateProps("f", { "frame.x": 50 });
    documentCommands.updateProps("f", { "frame.width": 400 });
    assert.equal(JSON.stringify(getDocument().layers).replace(/"frame\.x":50/, '"frame.x":0'), before);
  });

  it("flow children are left alone", () => {
    documentCommands.updateProps("r", { positioning: "flow" });
    documentCommands.updateProps("f", { "frame.width": 800 });
    assert.equal(p("r")["frame.x"], 340);
  });
});

describe("Phase 42: reading and measuring grids", () => {
  it("reads px and fr tracks, repeat() and minmax(0, 1fr)", () => {
    assert.deepEqual(parseTracks("200px 1fr 2fr"), [{ kind: "px", value: 200 }, { kind: "fr", value: 1 }, { kind: "fr", value: 2 }]);
    assert.equal(parseTracks("repeat(3, 1fr)")!.length, 3);
    assert.equal(parseTracks(equalTracks(4))!.length, 4);
    assert.equal(parseTracks("repeat(2, 100px) 1fr")!.length, 3);
    assert.equal(parseTracks("auto 1fr"), null);
    assert.equal(parseTracks(""), null);
  });

  it("places fr tracks in what is left after px tracks, gaps and padding", () => {
    const spans = trackSpans(parseTracks("100px 1fr 2fr")!, 700, 10, 20, 20);
    assert.deepEqual(spans, [{ pos: 20, len: 100 }, { pos: 130, len: 180 }, { pos: 320, len: 360 }]);
  });

  it("finds the cell under a point, or the nearest", () => {
    const cols = trackSpans(parseTracks("1fr 1fr")!, 210, 10, 0, 0);
    const rows = [{ pos: 0, len: 50 }, { pos: 60, len: 50 }];
    assert.deepEqual(cellAt(cols, rows, 150, 70), { col: 1, row: 1 });
    assert.deepEqual(cellAt(cols, rows, -30, 500), { col: 0, row: 1 });
  });

  it("infers columns, rows and gaps from loose layers", () => {
    const cells = [
      { x: 10, y: 10, w: 100, h: 50 }, { x: 130, y: 10, w: 100, h: 50 }, { x: 250, y: 11, w: 100, h: 50 },
      { x: 10, y: 80, w: 100, h: 50 }, { x: 130, y: 80, w: 100, h: 50 }, { x: 250, y: 80, w: 100, h: 50 },
    ];
    assert.deepEqual(inferGrid(cells), { columns: 3, rows: 2, columnGap: 20, rowGap: 20 });
  });

  it("a drop goes next to the nearest cell: before on its left half, after on its right", () => {
    const rects = [{ x: 0, y: 0, w: 100, h: 50 }, { x: 110, y: 0, w: 100, h: 50 }, { x: 0, y: 60, w: 100, h: 50 }];
    assert.equal(gridInsertion(rects, { x: 20, y: 20 })!.index, 0);
    assert.equal(gridInsertion(rects, { x: 90, y: 20 })!.index, 1);
    assert.equal(gridInsertion(rects, { x: 20, y: 90 })!.index, 2);
    assert.deepEqual(gridInsertion(rects, { x: 150, y: 20 })!.line, { x1: 110, y1: 0, x2: 110, y2: 50 });
    assert.equal(gridInsertion([], { x: 0, y: 0 }), null);
  });
});
