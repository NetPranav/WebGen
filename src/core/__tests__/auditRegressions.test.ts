/**
 * Regression tests for the Phase 0-29 audit: each case pins a bug that was found and fixed.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../document/factories";
import type { Layer } from "../document/schema";
import { documentCommands, getDocument, historyCommands, isTransactionOpen } from "../store/useDocumentStore";
import { setDocument } from "../store/documentState";
import { useHistoryStore } from "../store/useHistoryStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { useCameraStore } from "../store/useCameraStore";
import { copyText, deleteLayers, duplicateLayers, pasteText } from "../editing/editOps";
import { listFrames, nextFramePosition } from "../frames/frames";
import { addFrame, moveFrame } from "../frames/frameCommands";
import { snapMove, DEFAULT_SNAP, parseGuides } from "../geometry/snap";
import { dragBox } from "../geometry/shapeDrag";
import { unionBox } from "../geometry/transform";
import { zoomAt, MAX_ZOOM } from "../viewport/camera";
import { HitIndex } from "../hit/hitTest";
import { transport, getTransport, advance, DEFAULT_TRANSPORT } from "../time/transport";

const L = (id: string, parentId: string | null, children: string[] = [], props: Record<string, unknown> = {}, extra: Partial<Layer> = {}): Layer =>
  ({ ...(createLayer({ id, archetype: id.startsWith("r") ? "rectangle" : "container", parentId, children, name: id, properties: props as never }) as Layer), ...extra });

describe("audit regressions: editing and selection", () => {
  beforeEach(() => {
    setDocument(createDocumentFromLayers([
      L("pg", null, ["r1", "r2"], { "frame.x": 0, "frame.y": 0, "frame.width": 800, "frame.height": 600 }),
      L("r1", "pg", [], { positioning: "absolute", "frame.x": 10, "frame.y": 10, "frame.width": 100, "frame.height": 50 }),
      L("r2", "pg", [], { positioning: "absolute", "frame.x": 200, "frame.y": 10, "frame.width": 100, "frame.height": 50 }, { locked: true }),
    ]));
    useSelectionStore.getState().clearSelection();
  });

  it("the selection drops a layer that undo removed", () => {
    const id = documentCommands.addLayer({ archetype: "rectangle", parentId: "pg" }, "Add");
    useSelectionStore.getState().select(id, "element");
    historyCommands.undo();
    assert.equal(useSelectionStore.getState().selectedIds.includes(id), false);
  });

  it("delete and duplicate skip locked layers", () => {
    assert.equal(deleteLayers(["r2"]), 0);
    assert.ok(getDocument().layers.r2);
    assert.equal(duplicateLayers(["r2"]).length, 0);
  });

  it("copying more layers than a paste accepts refuses instead of storing a clipboard that pastes nothing", () => {
    const kids = Array.from({ length: 5200 }, (_, i) => L(`r_big_${i}`, "pg", [], { "frame.width": 1 }));
    setDocument(createDocumentFromLayers([L("pg", null, kids.map((k) => k.id), { "frame.width": 100, "frame.height": 100 }), ...kids]));
    assert.equal(copyText(["pg"]) ?? "", "");
    assert.equal(pasteText(null).length, 0);
  });
});

describe("audit regressions: numbers that are not numbers", () => {
  it("the camera ignores a NaN anchor and clamps a huge saved zoom", () => {
    assert.deepEqual(zoomAt({ x: 0, y: 0, zoom: 1 }, { x: Number.NaN, y: 0 }, 2), { x: 0, y: 0, zoom: 1 });
    useCameraStore.getState().setCamera({ x: Number.NaN, y: 0, zoom: 1 });
    assert.ok(Number.isFinite(useCameraStore.getState().camera.x));
    useCameraStore.getState().setCamera({ x: 0, y: 0, zoom: 1e9 });
    assert.ok(useCameraStore.getState().camera.zoom <= MAX_ZOOM);
  });

  it("geometry helpers return finite boxes for NaN input", () => {
    assert.equal(snapMove({ x: Number.NaN, y: 0, width: 10, height: 10 }, [], null, [], 6, DEFAULT_SNAP).dx, 0);
    const box = dragBox("box", { x: 0, y: 0 }, { x: Number.NaN, y: 5 }, { shift: false, alt: false }, { width: 10, height: 10 });
    assert.ok(Object.values(box).every((v) => typeof v !== "number" || Number.isFinite(v)));
    const u = unionBox([{ cx: Number.NaN, cy: 0, w: 1, h: 1, rot: 0 }, { cx: 0, cy: 0, w: 1, h: 1, rot: 0 }]);
    assert.ok(u === null || Object.values(u).every((v) => Number.isFinite(v)));
    const p = nextFramePosition([{ id: "a", name: "a", x: Number.NaN, y: 0, width: 10, height: 10 }]);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  });

  it("a hostile file cannot store 100,000 guides", () => {
    assert.ok(parseGuides(JSON.stringify(Array.from({ length: 100000 }, () => ({ axis: "x", pos: 1 })))).length <= 200);
  });

  it("the transport rejects NaN, Infinity, fps 0 and an inverted work area", () => {
    transport.reset(); transport.seek(Number.NaN);
    assert.equal(getTransport().time, 0);
    transport.reset(); transport.seekFrame(Number.NaN);
    assert.equal(getTransport().time, 0);
    transport.reset(); transport.setWorkArea({ start: Number.NaN, end: 3 });
    assert.ok(Number.isFinite(getTransport().workArea.start) && Number.isFinite(getTransport().workArea.end));
    transport.reset(); transport.setComposition({ id: "x", fps: 0, duration: 5 });
    assert.ok(getTransport().fps > 0);
    transport.reset(); transport.setComposition({ id: "comp_main", fps: 30, duration: 5, workArea: { start: 4, end: 2 } });
    assert.ok(getTransport().workArea.start <= getTransport().workArea.end);
    transport.reset(); transport.setComposition({ id: "comp_main", fps: 60, duration: 5 }); transport.play(); transport.tick(Number.POSITIVE_INFINITY);
    assert.ok(Number.isFinite(getTransport().time));
    assert.ok(Number.isFinite(advance({ ...DEFAULT_TRANSPORT, playing: true }, Number.NaN).time));
  });
});

describe("audit regressions: frames and hit-testing", () => {
  beforeEach(() => {
    setDocument(createDocumentFromLayers([
      L("pg", null, [], { "frame.x": 0, "frame.y": 0, "frame.width": 800, "frame.height": 600 }),
      L("pg2", null, [], { "frame.x": 1000, "frame.y": 0, "frame.width": 800, "frame.height": 600 }),
    ]));
  });

  it("moveFrame keeps the frames in one ordered row without NaN", () => {
    const a = addFrame({ preset: "mobile" });
    documentCommands.updateProps(a, { "frame.x": 1000 });
    moveFrame(a, -1);
    const xs = listFrames(getDocument().layers).map((f) => f.x);
    assert.ok(xs.every(Number.isFinite));
    assert.deepEqual([...xs].sort((p, q) => p - q), xs);
  });

  it("a click over overlapping frames picks the frame drawn on top", () => {
    const item = (id: string, parentId: string | null, frameId: string, depth: number, order: number, rect: { x: number; y: number; width: number; height: number }) =>
      ({ id, rect, parentId, frameId, depth, order, locked: false, archetype: "container" as const, origin: { x: rect.x, y: rect.y }, bounds: rect });
    const idx = new HitIndex([
      item("f1", null, "f1", 0, 1, { x: 0, y: 0, width: 500, height: 500 }),
      item("c1", "f1", "f1", 1, 2, { x: 10, y: 10, width: 100, height: 100 }),
      item("f2", null, "f2", 0, 3, { x: 0, y: 0, width: 500, height: 500 }),
    ]);
    assert.equal(idx.pick({ x: 20, y: 20 })?.id, "f2");
  });
});

describe("audit regressions: transactions", () => {
  it("undo during an open drag transaction leaves history and the document consistent", () => {
    useHistoryStore.getState().clearHistory();
    setDocument(createDocumentFromLayers([createLayer({ id: "r", archetype: "rectangle", parentId: null, properties: { "frame.x": 0 } as never }) as Layer]));
    const x = () => getDocument().layers.r.properties["frame.x"];
    documentCommands.updateProps("r", { "frame.x": 10 }, "first");
    const tx = documentCommands.begin("drag");
    documentCommands.updateProps("r", { "frame.x": 50 });
    historyCommands.undo();
    assert.equal(isTransactionOpen(), false);
    assert.equal(x(), 10);
    tx.commit();
    assert.equal(x(), 10);
    historyCommands.undo();
    assert.equal(x(), 0);
    historyCommands.redo();
    assert.equal(x(), 10);
  });
});
