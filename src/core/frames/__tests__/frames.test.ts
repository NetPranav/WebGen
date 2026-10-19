import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useCanvasViewStore } from "../../store/useCanvasViewStore";
import {
  FRAME_GAP, FRAME_PRESETS, clampFrameSize, findFrameOfSize, frameIdOf, listFrames, moveInOrder, nextFramePosition, reflowPositions, uniqueFrameName,
} from "../frames";
import { addFrame, deleteFrame, duplicateFrame, focusOrCreatePreset, moveFrame, renameFrame, resizeFrame } from "../frameCommands";

const layer = (id: string, parentId: string | null, props: Record<string, number | string> = {}, children: string[] = []): Layer =>
  createLayer({ id, archetype: id.startsWith("t") ? "text" : "container", parentId, children, properties: props, name: id });

const blank = () =>
  createDocumentFromLayers([
    layer("home", null, { "frame.width": 1440, "frame.height": 900 }, ["t1"]),
    layer("t1", "home", { "content.text": "Hello" }),
  ]);

describe("Phase 21: frames are top-level layers", () => {
  beforeEach(() => {
    setDocument(blank());
    useCanvasViewStore.setState({ activeFrameId: null });
  });

  it("lists top-level layers left to right and finds a layer's frame", () => {
    const layers = {
      b: layer("b", null, { "frame.x": 2000 }),
      a: layer("a", null, { "frame.x": 0 }),
      t_child: layer("t_child", "a"),
    };
    assert.deepEqual(listFrames(layers).map((f) => f.id), ["a", "b"]);
    assert.equal(frameIdOf(layers, "t_child"), "a");
    assert.equal(frameIdOf(layers, "b"), "b");
    assert.equal(frameIdOf(layers, "nope"), null);
  });

  it("a frame with no stored size takes the root default", () => {
    const [f] = listFrames({ r: layer("r", null) });
    assert.equal(f.width, 1440);
    assert.equal(f.height, 900);
  });

  it("places a new frame to the right of the rightmost with the gap", () => {
    const frames = listFrames({ a: layer("a", null, { "frame.x": 0, "frame.width": 400 }), b: layer("b", null, { "frame.x": 600, "frame.width": 300 }) });
    assert.deepEqual(nextFramePosition(frames), { x: 900 + FRAME_GAP, y: 0 });
    assert.deepEqual(nextFramePosition([]), { x: 0, y: 0 });
  });

  it("reordering keeps the row gap-spaced and never overlaps", () => {
    const frames = listFrames({
      a: layer("a", null, { "frame.x": 0, "frame.width": 400 }),
      b: layer("b", null, { "frame.x": 520, "frame.width": 800 }),
      c: layer("c", null, { "frame.x": 1440, "frame.width": 300 }),
    });
    const order = moveInOrder(["a", "b", "c"], "c", -1);
    assert.deepEqual(order, ["a", "c", "b"]);
    const pos = reflowPositions(frames, order);
    assert.deepEqual([pos.get("a"), pos.get("c"), pos.get("b")], [0, 400 + FRAME_GAP, 400 + FRAME_GAP + 300 + FRAME_GAP]);
    assert.deepEqual(moveInOrder(["a", "b"], "a", -1), ["a", "b"]); // at the end: unchanged
  });

  it("names stay unique and sizes stay in range", () => {
    const frames = listFrames({ a: layer("a", null) });
    assert.equal(uniqueFrameName(frames, "Mobile"), "Mobile");
    assert.equal(uniqueFrameName(listFrames({ a: { ...layer("a", null), name: "Mobile" }, b: { ...layer("b", null), name: "Mobile 2" } }), "Mobile"), "Mobile 3");
    assert.equal(clampFrameSize(1), 40);
    assert.equal(clampFrameSize(1e9), 20_000);
    assert.equal(clampFrameSize(Number.NaN), 40);
  });

  it("addFrame puts a frame of the preset's size beside the others, as one undo step", () => {
    const id = addFrame({ preset: "mobile" });
    const frames = listFrames(getDocument().layers);
    assert.equal(frames.length, 2);
    const mobile = frames.find((f) => f.id === id)!;
    assert.deepEqual([mobile.width, mobile.height, mobile.name], [375, 812, "Mobile"]);
    assert.ok(mobile.x >= 1440 + FRAME_GAP);
    historyCommands.undo();
    assert.equal(listFrames(getDocument().layers).length, 1);
    assert.throws(() => addFrame({ preset: "watch" }), /Unknown frame preset/);
  });

  it("the header's switch focuses an existing frame of that size and creates one only when missing", () => {
    const desktop = focusOrCreatePreset("desktop");
    assert.equal(desktop, "home"); // the 1440 x 900 frame already exists
    assert.equal(listFrames(getDocument().layers).length, 1);
    assert.equal(useCanvasViewStore.getState().activeFrameId, "home");
    const tablet = focusOrCreatePreset("tablet");
    const again = focusOrCreatePreset("tablet");
    assert.equal(tablet, again);
    assert.equal(listFrames(getDocument().layers).length, 2);
  });

  it("duplicating copies the frame's layers under new ids", () => {
    const copy = duplicateFrame("home");
    const layers = getDocument().layers;
    assert.notEqual(copy, "home");
    assert.equal(layers[copy].name, "home copy");
    assert.equal(layers[copy].children.length, 1);
    const childCopy = layers[layers[copy].children[0]];
    assert.equal(childCopy.parentId, copy);
    assert.notEqual(childCopy.id, "t1");
    assert.equal((childCopy.properties as Record<string, unknown>)["content.text"], "Hello");
    assert.equal(layers["t1"].parentId, "home"); // the original is untouched
    assert.equal(listFrames(layers).length, 2);
  });

  it("rename, resize, reorder and delete are each one undo step; the last frame can't be deleted", () => {
    renameFrame("home", "Landing");
    assert.equal(getDocument().layers.home.name, "Landing");
    assert.throws(() => renameFrame("home", "   "), /needs a title/);
    resizeFrame("home", { width: 1000 });
    assert.equal(listFrames(getDocument().layers)[0].width, 1000);

    const second = addFrame({ preset: "tablet" });
    moveFrame(second, -1);
    assert.deepEqual(listFrames(getDocument().layers).map((f) => f.id), [second, "home"]);
    historyCommands.undo(); // the reorder is one step
    assert.deepEqual(listFrames(getDocument().layers).map((f) => f.id), ["home", second]);

    deleteFrame(second);
    assert.equal(listFrames(getDocument().layers).length, 1);
    assert.throws(() => deleteFrame("home"), /at least one frame/);
  });

  it("finds a frame by size and exposes the presets", () => {
    const frames = listFrames(getDocument().layers);
    assert.equal(findFrameOfSize(frames, 1440, 900)?.id, "home");
    assert.equal(findFrameOfSize(frames, 1, 1), undefined);
    assert.deepEqual(FRAME_PRESETS.map((p) => p.id), ["desktop", "laptop", "tablet", "mobile"]);
    void documentCommands;
  });
});
