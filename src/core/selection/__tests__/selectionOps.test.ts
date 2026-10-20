import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { combineSelection, isSelectable, marqueeCandidates, selectAll, selectChildren, selectInverse, selectParents } from "../selectionOps";

const L = (id: string, parentId: string | null, children: string[] = [], extra: Partial<Layer> = {}): Layer => ({
  ...(createLayer({ id, archetype: id.startsWith("t") ? "text" : "container", parentId, children, name: id }) as Layer),
  ...extra,
});

// page ─┬ a ─┬ t1, t2
//       ├ b ─── t3
//       ├ c (locked) ── t4
//       └ d (hidden)
// other (second frame)
const doc = () =>
  createDocumentFromLayers([
    L("page", null, ["a", "b", "c", "d"]),
    L("a", "page", ["t1", "t2"]),
    L("t1", "a"),
    L("t2", "a"),
    L("b", "page", ["t3"]),
    L("t3", "b"),
    L("c", "page", ["t4"], { locked: true }),
    L("t4", "c"),
    L("d", "page", [], { visible: false }),
    L("other", null, []),
  ]).layers;

describe("Phase 26: selection operations", () => {
  it("hidden and locked layers, and everything inside them, are not selectable", () => {
    const l = doc();
    assert.equal(isSelectable(l, "a"), true);
    assert.equal(isSelectable(l, "c"), false);
    assert.equal(isSelectable(l, "t4"), false);
    assert.equal(isSelectable(l, "d"), false);
    assert.equal(isSelectable(l, "nope"), false);
  });

  it("select all takes the selection's siblings, in document order, skipping locked and hidden", () => {
    const l = doc();
    assert.deepEqual(selectAll(l, ["t2"], null), ["t1", "t2"]);
    assert.deepEqual(selectAll(l, ["b"], null), ["a", "b"]);
    assert.deepEqual(selectAll(l, ["page"], null), ["page", "other"]); // a top-level layer's siblings are the frames
  });

  it("with nothing selected, select all takes the active frame's children", () => {
    const l = doc();
    assert.deepEqual(selectAll(l, [], "page"), ["a", "b"]);
    assert.deepEqual(selectAll(l, [], null), ["a", "b"], "no active frame: the first frame");
  });

  it("inverse selects the rest of the scope", () => {
    const l = doc();
    assert.deepEqual(selectInverse(l, ["t1"], null), ["t2"]);
    assert.deepEqual(selectInverse(l, ["a"], null), ["b"]);
    assert.deepEqual(selectInverse(l, ["a", "b"], null), []);
    assert.deepEqual(selectInverse(l, [], "page"), ["a", "b"]);
  });

  it("children go down a level; a selection with none stays; parents go up and a top-level layer stays", () => {
    const l = doc();
    assert.deepEqual(selectChildren(l, ["a"]), ["t1", "t2"]);
    assert.deepEqual(selectChildren(l, ["a", "b"]), ["t1", "t2", "t3"]);
    assert.deepEqual(selectChildren(l, ["t1"]), ["t1"]);
    assert.deepEqual(selectChildren(l, ["c"]), ["c"], "a locked layer's children can't be selected");
    assert.deepEqual(selectParents(l, ["t1", "t2", "t3"]), ["a", "b"]);
    assert.deepEqual(selectParents(l, ["page"]), ["page"]);
    assert.deepEqual(selectParents(l, ["t1", "page"]), ["page", "a"]);
  });

  it("combining a pick with the selection: replace, add, toggle", () => {
    assert.deepEqual(combineSelection(["a"], ["b"], "replace"), ["b"]);
    assert.deepEqual(combineSelection(["a"], ["b", "a"], "add"), ["a", "b"]);
    assert.deepEqual(combineSelection(["a", "b"], ["b"], "toggle"), ["a"]);
    assert.deepEqual(combineSelection(["a"], ["b"], "toggle"), ["a", "b"]);
  });

  it("a marquee inside a frame takes that frame's direct children it touches; on bare canvas, the frames", () => {
    const l = doc();
    const boxes = new Map([
      ["a", { x: 0, y: 0, width: 100, height: 100 }],
      ["b", { x: 0, y: 120, width: 100, height: 100 }],
      ["c", { x: 0, y: 240, width: 100, height: 100 }],
      ["d", { x: 0, y: 360, width: 100, height: 100 }],
      ["t1", { x: 10, y: 10, width: 20, height: 20 }],
      ["page", { x: 0, y: 0, width: 400, height: 500 }],
      ["other", { x: 1000, y: 0, width: 400, height: 500 }],
    ]);
    assert.deepEqual(marqueeCandidates(l, boxes, { x: 50, y: 50, width: 40, height: 100 }, "page"), ["a", "b"]);
    assert.deepEqual(marqueeCandidates(l, boxes, { x: 0, y: 0, width: 500, height: 500 }, "page"), ["a", "b"], "locked c and hidden d are skipped; deep t1 isn't a direct child");
    assert.deepEqual(marqueeCandidates(l, boxes, { x: -50, y: -50, width: 1600, height: 100 }, null), ["page", "other"]);
    assert.deepEqual(marqueeCandidates(l, boxes, { x: 600, y: 0, width: 10, height: 10 }, null), []);
  });
});
