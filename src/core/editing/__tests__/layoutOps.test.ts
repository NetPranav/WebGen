import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { addAutoLayout, isAutoLayout, readStack, removeAutoLayout, reorderInStack, setChildSizing, setStack } from "../layoutOps";

const rect = (id: string, parentId: string, x: number, y: number, w: number, h: number): Layer =>
  createLayer({ id, archetype: "rectangle", parentId, name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h } }) as Layer;

const doc = () =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["row", "loose1", "loose2"], properties: { "frame.x": 0, "frame.y": 0, "frame.width": 800, "frame.height": 600 } }) as Layer,
    createLayer({ id: "row", archetype: "container", parentId: "pg", name: "Row", children: ["c", "a", "b"], properties: { positioning: "absolute", "frame.x": 50, "frame.y": 50, "frame.width": 400, "frame.height": 100 } }) as Layer,
    rect("a", "row", 20, 30, 60, 40),
    rect("b", "row", 100, 30, 60, 40),
    rect("c", "row", 200, 30, 60, 40),
    rect("loose1", "pg", 500, 100, 80, 30),
    rect("loose2", "pg", 500, 150, 80, 30),
  ]);

const props = (id: string) => getDocument().layers[id].properties as Record<string, unknown>;
const children = (id: string) => getDocument().layers[id].children;

describe("Phase 41: add and remove auto layout", () => {
  beforeEach(() => {
    setDocument(doc());
    useSelectionStore.getState().clearSelection();
  });

  it("Shift+A on a container reads the row out of where its children are, in reading order, and the children flow", () => {
    const [id] = addAutoLayout(["row"]);
    assert.equal(id, "row");
    assert.equal(isAutoLayout(getDocument().layers.row), true);
    const s = readStack(getDocument().layers.row);
    assert.equal(s.direction, "row");
    assert.equal(s.gap, 20);
    assert.deepEqual(s.padding, { top: 30, left: 20, right: 140, bottom: 30 });
    assert.deepEqual(children("row"), ["a", "b", "c"]);
    for (const k of ["a", "b", "c"]) {
      assert.equal(props(k).positioning, "flow");
      assert.equal(props(k)["sizing.horizontal"], "fixed");
      assert.equal(props(k)["frame.width"], 60);
    }
    // an existing frame keeps its size
    assert.equal(props("row")["sizing.horizontal"], "fixed");
    assert.equal(props("row")["frame.width"], 400);
  });

  it("is one undo step", () => {
    const before = JSON.stringify(getDocument().layers);
    addAutoLayout(["row"]);
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
  });

  it("on loose layers it wraps them in a new auto-layout frame that hugs them", () => {
    const ids = addAutoLayout(["loose1", "loose2"]);
    assert.equal(ids.length, 1);
    const frame = getDocument().layers[ids[0]];
    assert.equal(frame.name, "Auto layout");
    assert.equal(isAutoLayout(frame), true);
    assert.equal(readStack(frame).direction, "column");
    assert.equal(readStack(frame).gap, 20);
    assert.equal(frame.properties["sizing.horizontal"], "hug");
    assert.deepEqual(frame.children, ["loose1", "loose2"]);
    assert.deepEqual(useSelectionStore.getState().selectedIds, [ids[0]]);
  });

  it("does nothing to a frame that already has it", () => {
    addAutoLayout(["row"]);
    assert.deepEqual(addAutoLayout(["row"]), ["row"]);
  });

  it("Shift+Alt+A pins every child where it is and drops the flag", () => {
    addAutoLayout(["row"]);
    removeAutoLayout(["row"]);
    assert.equal(isAutoLayout(getDocument().layers.row), false);
    for (const k of ["a", "b", "c"]) assert.equal(props(k).positioning, "absolute");
    assert.equal(props("row")["sizing.horizontal"], "fixed");
  });
});

describe("Phase 41: changing a stack and its children", () => {
  beforeEach(() => {
    setDocument(doc());
    useSelectionStore.getState().clearSelection();
    addAutoLayout(["row"]);
  });

  it("sets direction, gap, padding on every side or one, alignment and wrap", () => {
    assert.equal(setStack(["row"], { direction: "column", gap: 12, padding: 16, justify: "center", align: "stretch", wrap: true }), 1);
    const s = readStack(getDocument().layers.row);
    assert.deepEqual(s, { direction: "column", gap: 12, padding: { top: 16, right: 16, bottom: 16, left: 16 }, justify: "center", align: "stretch", wrap: true });
    setStack(["row"], { padding: { left: 4 } });
    assert.equal(readStack(getDocument().layers.row).padding.left, 4);
    assert.equal(readStack(getDocument().layers.row).padding.top, 16);
  });

  it("is one undo step, and ignores layers that aren't auto layout", () => {
    const before = JSON.stringify(getDocument().layers);
    setStack(["row"], { gap: 99, direction: "column" });
    historyCommands.undo();
    assert.equal(JSON.stringify(getDocument().layers), before);
    assert.equal(setStack(["a"], { gap: 5 }), 0);
  });

  it("sizing: a layer made fixed keeps the size it has; fill and hug just set the mode", () => {
    setChildSizing(["a"], { horizontal: "fill", vertical: "hug" });
    assert.equal(props("a")["sizing.horizontal"], "fill");
    assert.equal(props("a")["sizing.vertical"], "hug");
    setChildSizing(["a"], { horizontal: "fixed" });
    assert.equal(props("a")["sizing.horizontal"], "fixed");
    assert.equal(typeof props("a")["frame.width"], "number");
  });

  it("reordering moves a child within its stack", () => {
    assert.equal(reorderInStack("c", 0), true);
    assert.deepEqual(children("row"), ["c", "a", "b"]);
    assert.equal(reorderInStack("a", 5), true);
    assert.deepEqual(children("row"), ["c", "b", "a"]);
    assert.equal(reorderInStack("loose1", 0), false); // its parent isn't a stack
  });
});

describe("Phase 41: nested stacks", () => {
  it("a stack inside a stack: both are read and both keep their children in order", () => {
    setDocument(
      createDocumentFromLayers([
        createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: ["outer"], properties: { "frame.width": 800, "frame.height": 600 } }) as Layer,
        createLayer({ id: "outer", archetype: "container", parentId: "pg", name: "Outer", children: ["inner", "x"], properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 400, "frame.height": 200 } }) as Layer,
        createLayer({ id: "inner", archetype: "container", parentId: "outer", name: "Inner", children: ["i1", "i2"], properties: { positioning: "absolute", "frame.x": 10, "frame.y": 10, "frame.width": 100, "frame.height": 80 } }) as Layer,
        rect("i1", "inner", 0, 0, 100, 30),
        rect("i2", "inner", 0, 50, 100, 30),
        rect("x", "outer", 150, 10, 80, 80),
      ]),
    );
    addAutoLayout(["inner"]);
    addAutoLayout(["outer"]);
    assert.equal(readStack(getDocument().layers.inner).direction, "column");
    assert.equal(readStack(getDocument().layers.outer).direction, "row");
    assert.deepEqual(documentCommands && getDocument().layers.outer.children, ["inner", "x"]);
  });
});
