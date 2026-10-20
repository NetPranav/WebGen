import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { alignLayers, distributeLayers, tidyLayers } from "../editOps";

const rect = (id: string, parentId: string, x: number, y: number, w: number, h: number, extra: Partial<Layer> = {}): Layer => ({
  ...(createLayer({ id, archetype: "rectangle", parentId, name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h } }) as Layer),
  ...extra,
});
const at = (id: string) => ({ x: getDocument().layers[id].properties["frame.x"], y: getDocument().layers[id].properties["frame.y"] });

beforeEach(() => {
  setDocument(createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["a", "b", "c", "lk"], properties: { "frame.x": 0, "frame.y": 0, "frame.width": 800, "frame.height": 600 } }) as Layer,
    rect("a", "pg", 10, 10, 100, 50),
    rect("b", "pg", 200, 60, 80, 80),
    rect("c", "pg", 500, 30, 60, 60),
    rect("lk", "pg", 700, 500, 20, 20, { locked: true }),
  ]));
  useSelectionStore.getState().clearSelection();
});

describe("Phase 30: align, distribute and tidy as document operations", () => {
  it("several layers align to each other, one undo step", () => {
    assert.equal(alignLayers(["a", "b", "c"], "left"), true);
    assert.deepEqual([at("a").x, at("b").x, at("c").x], [10, 10, 10]);
    historyCommands.undo();
    assert.deepEqual([at("a").x, at("b").x, at("c").x], [10, 200, 500]);
  });

  it("one layer aligns to its parent", () => {
    assert.equal(alignLayers(["a"], "hcenter"), true);
    assert.equal(at("a").x, 350); // (800 - 100) / 2
    assert.equal(alignLayers(["a"], "bottom"), true);
    assert.equal(at("a").y, 550);
  });

  it("an explicit target overrides the default", () => {
    assert.equal(alignLayers(["a", "b"], "right", "parent"), true);
    assert.deepEqual([at("a").x, at("b").x], [700, 720]);
  });

  it("a top-level frame has no parent to align to", () => {
    assert.equal(alignLayers(["pg"], "left"), false);
  });

  it("locked layers are left where they are", () => {
    assert.equal(alignLayers(["a", "lk"], "left"), false); // only one editable layer: nothing to align to
    assert.deepEqual(at("lk"), { x: 700, y: 500 });
    alignLayers(["a", "b", "lk"], "left");
    assert.deepEqual(at("lk"), { x: 700, y: 500 });
    assert.equal(at("b").x, 10);
  });

  it("an alignment that changes nothing is not an undo step and returns false", () => {
    alignLayers(["a", "b", "c"], "left");
    assert.equal(alignLayers(["a", "b", "c"], "left"), false);
  });

  it("distribute needs three layers and keeps the outer two", () => {
    assert.equal(distributeLayers(["a", "b"], "h"), false);
    assert.equal(distributeLayers(["a", "b", "c"], "h"), true);
    // span 10..560, widths 100 + 80 + 60 = 240, gap = (550 - 240) / 2 = 155
    assert.deepEqual([at("a").x, at("b").x, at("c").x], [10, 265, 500]);
  });

  it("tidy puts layers on a grid and a second tidy changes nothing", () => {
    assert.equal(tidyLayers(["a", "b", "c"]), true);
    assert.equal(tidyLayers(["a", "b", "c"]), false);
  });

  it("nothing selected, nothing happens", () => {
    assert.equal(alignLayers([], "left"), false);
    assert.equal(distributeLayers([], "v"), false);
    assert.equal(tidyLayers([]), false);
  });
});
