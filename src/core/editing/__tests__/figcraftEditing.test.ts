/**
 * FigCraft port F12: the rotation origin (`rotation_origin.rs`), measuring (`distance.rs` `between`, `to_guide`) and
 * duplicating at a step (`duplicate_spacing_tests.rs`), commit 6ea44e9, translated to our layers.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { worldBox, writeBoxes } from "../layerBoxes";
import { duplicateLayers, resetDuplicateMemory } from "../editOps";
import { boxPoints, dragRotationOrigin, editRotationOrigin, movedOrigin, originHandle, originPoint, setRotationOrigin, useRotationOriginStore } from "../rotationOrigin";
import { between, distanceLabel, toGuide } from "../../geometry/measureDistances";
import { rotateBoxes } from "../../geometry/transform";

const rect = (id: string, x: number, y: number, w = 100, h = 50): Layer =>
  createLayer({ id, archetype: "rectangle", parentId: "pg", name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h } }) as Layer;
const page = (layers: Layer[]) =>
  setDocument(createDocumentFromLayers([createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: layers.map((l) => l.id), properties: { "frame.x": 0, "frame.y": 0, "frame.width": 2000, "frame.height": 2000 } }) as Layer, ...layers]));
const r2 = (p: { x: number; y: number }) => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 });

describe("FigCraft rotation origin", () => {
  beforeEach(() => {
    page([rect("a", 0, 0)]);
    useRotationOriginStore.setState({ ids: [], at: null, editing: false });
  });

  it("is the centre unless moved; a moved origin follows its layer and is dropped when the selection changes", () => {
    const b = worldBox("a")!;
    assert.deepEqual(originPoint(["a"], b, b), { x: 50, y: 25 });
    setRotationOrigin(["a"], { x: 0, y: 0 }, b);
    assert.deepEqual(r2(movedOrigin(["a"], b)!), { x: 0, y: 0 });
    // the layer moves: the origin goes with it
    documentCommands.updateProps("a", { "frame.x": 10, "frame.y": 20 });
    const b2 = worldBox("a")!;
    assert.deepEqual(r2(originPoint(["a"], b2, b2)), { x: 10, y: 20 });
    // another selection: its own centre
    assert.equal(movedOrigin(["a", "x"], b2), null);
  });

  it("the handle shows while editing (Alt+R toggles it) and a drag snaps to the box's points, the centre putting it back", () => {
    const b = worldBox("a")!;
    assert.equal(originHandle(["a"], b, b), null);
    assert.equal(editRotationOrigin(["a"]), true);
    assert.deepEqual(originHandle(["a"], b, b), { x: 50, y: 25 });
    dragRotationOrigin(["a"], { x: 98, y: 2 }, b, b, 1);
    assert.deepEqual(r2(originPoint(["a"], b, b)), { x: 100, y: 0 }, "snapped to the top-right corner");
    dragRotationOrigin(["a"], { x: 70, y: 40 }, b, b, 1);
    assert.deepEqual(r2(originPoint(["a"], b, b)), { x: 70, y: 40 }, "free");
    dragRotationOrigin(["a"], { x: 51, y: 24 }, b, b, 1);
    assert.equal(useRotationOriginStore.getState().at, null, "the centre: unmoved");
    assert.equal(editRotationOrigin(["a"]), false);
    assert.equal(boxPoints(b).length, 9);
  });

  it("turning about a moved origin swings the layer around it", () => {
    const b = worldBox("a")!;
    setRotationOrigin(["a"], { x: 0, y: 0 }, b);
    writeBoxes(["a"], rotateBoxes([b], originPoint(["a"], b, b), 90));
    const after = worldBox("a")!;
    assert.deepEqual(r2({ x: after.cx, y: after.cy }), { x: -25, y: 50 });
    assert.equal(Math.round(after.rot), 90);
  });
});

describe("FigCraft measuring", () => {
  it("one box inside another: to each edge of the outer one, along the inner one's centre lines", () => {
    const m = between({ x0: 20, y0: 20, x1: 40, y1: 30 }, { x0: 0, y0: 0, x1: 100, y1: 50 });
    assert.deepEqual(m.map((x) => [x.axis, x.from, x.to, x.at, x.value]), [["x", 0, 20, 25, 20], ["x", 40, 100, 25, 60], ["y", 0, 20, 30, 20], ["y", 30, 50, 30, 20]]);
  });
  it("boxes apart: the gap along their shared rows; beside each other, from the middle with a dashed extension", () => {
    const shared = between({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 30, y0: 5, x1: 40, y1: 20 });
    assert.deepEqual(shared.map((x) => [x.axis, x.from, x.to, x.at, x.value, !!x.dashed]), [["x", 10, 30, 7.5, 20, false]]);
    const diag = between({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 30, y0: 40, x1: 40, y1: 50 });
    assert.equal(diag.filter((x) => !x.dashed).length, 2);
    assert.equal(diag.filter((x) => x.dashed).length, 2);
  });
  it("overlapping boxes: between their matching edges", () => {
    assert.equal(between({ x0: 0, y0: 0, x1: 20, y1: 20 }, { x0: 10, y0: 5, x1: 30, y1: 25 }).length, 4);
  });
  it("to a ruler guide: the nearer side, or both when it crosses; labels have two decimals at most", () => {
    assert.deepEqual(toGuide({ x0: 0, y0: 0, x1: 10, y1: 10 }, true, 25).map((x) => x.value), [15]);
    assert.deepEqual(toGuide({ x0: 0, y0: 0, x1: 10, y1: 10 }, true, 4).map((x) => x.value), [4, 6]);
    assert.equal(distanceLabel(12.345), "12.35");
    assert.equal(distanceLabel(12), "12");
    assert.deepEqual(between({ x0: NaN, y0: 0, x1: 1, y1: 1 }, { x0: 0, y0: 0, x1: 1, y1: 1 }), []);
  });
});

describe("FigCraft duplicating at a step", () => {
  beforeEach(() => {
    page([rect("a", 0, 0)]);
    resetDuplicateMemory();
    useSelectionStore.getState().clearSelection();
  });

  it("a copy made in place (an Alt-drag) and moved sets the step the next Duplicate repeats", () => {
    const [copy] = duplicateLayers(["a"], { inPlace: true });
    assert.deepEqual([getDocument().layers[copy].properties["frame.x"], getDocument().layers[copy].properties["frame.y"]], [0, 0], "in place");
    documentCommands.updateProps(copy, { "frame.x": 120 });
    const [next] = duplicateLayers([copy]);
    assert.deepEqual([getDocument().layers[next].properties["frame.x"], getDocument().layers[next].properties["frame.y"]], [240, 0], "the same step again");
    historyCommands.undo();
    assert.equal(getDocument().layers[next], undefined);
  });
});

describe("FigCraft arc handles", () => {
  it("an ellipse shows Sweep, then Start and Ratio once it has an arc; dragging them writes sweep, start and ratio", async () => {
    const { paramHandles, paramValue } = await import("../../geometry/transform");
    const box = { cx: 50, cy: 50, w: 100, h: 100, rot: 0 };
    const full = paramHandles("ellipse", box, {}, 14);
    assert.deepEqual(full.map((h) => h.kind), ["arcSweep"], "a whole ellipse: only Sweep");
    assert.equal(paramHandles("ellipse", { ...box, w: 20, h: 20 }, {}, 14).length, 0, "too small on screen: none");
    const arc = paramHandles("ellipse", box, { "shape.arcSweep": 90 }, 14);
    assert.deepEqual(arc.map((h) => h.kind), ["arcSweep", "arcStart", "arcRatio"]);
    // Sweep dragged to the bottom of the ellipse (90° clockwise from the right): a quarter
    const sweep = arc[0];
    assert.equal(paramValue(sweep, box, { x: 50, y: 100 }, 90, { x: 50, y: 100 }, 14), 90);
    assert.equal(paramValue(sweep, box, { x: 0, y: 50 }, 90, { x: 0, y: 50 }, 14), 180);
    // Start turned to the top (270°); Ratio pulled half way in
    assert.equal(paramValue(arc[1], box, { x: 50, y: 0 }, 0, { x: 50, y: 0 }, 14), 270);
    assert.equal(paramValue(arc[2], box, { x: 75, y: 50 }, 0, { x: 75, y: 50 }, 14), 0.5);
  });
});
