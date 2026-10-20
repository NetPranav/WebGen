import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { ancestorsOf, buildRows, rangeBetween } from "../layerTree";
import { canReparent, moveLayers } from "../reparent";

const rect = (id: string, parentId: string, x: number, y: number, extra: Partial<Layer> = {}): Layer => ({
  ...(createLayer({ id, archetype: "rectangle", parentId, name: id.toUpperCase(), properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": 50, "frame.height": 50 } }) as Layer),
  ...extra,
});
const box = (id: string, parentId: string | null, children: string[], x: number, y: number, extra: Partial<Layer> = {}): Layer => ({
  ...(createLayer({ id, archetype: "container", parentId, children, name: id.toUpperCase(), properties: { positioning: parentId ? "absolute" : "flow", "frame.x": x, "frame.y": y, "frame.width": 400, "frame.height": 300 } }) as Layer),
  ...extra,
});
const doc = () =>
  createDocumentFromLayers([
    box("pg", null, ["a", "b", "grp", "t"], 0, 0),
    rect("a", "pg", 10, 10),
    rect("b", "pg", 80, 10),
    box("grp", "pg", ["c", "d"], 200, 100),
    rect("c", "grp", 5, 5),
    rect("d", "grp", 60, 5),
    { ...(createLayer({ id: "t", archetype: "text", parentId: "pg", name: "T", properties: { "content.text": "hi" } }) as Layer) },
    box("pg2", null, [], 1000, 0),
    rect("lk", "pg2", 0, 0, { locked: true }),
  ]);
const layers = () => getDocument().layers;
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

beforeEach(() => {
  setDocument(doc());
  // pg2 holds the locked layer
  const l = getDocument().layers;
  l.pg2.children = ["lk"];
});

describe("Phase 32: the layer tree as rows", () => {
  it("lists the front-most layer first and hides what is collapsed", () => {
    assert.deepEqual(ids(buildRows(layers(), new Set())), ["pg2", "pg"]);
    assert.deepEqual(ids(buildRows(layers(), new Set(["pg"]))), ["pg2", "pg", "t", "grp", "b", "a"]);
    assert.deepEqual(ids(buildRows(layers(), new Set(["pg", "grp"]))), ["pg2", "pg", "t", "grp", "d", "c", "b", "a"]);
  });

  it("rows carry depth, expansion and who is locked or hidden by an ancestor", () => {
    getDocument().layers.grp.locked = true;
    getDocument().layers.pg.visible = false;
    const rows = buildRows(layers(), new Set(["pg", "grp"]));
    const c = rows.find((r) => r.id === "c")!;
    assert.deepEqual([c.depth, c.lockedByAncestor, c.hiddenByAncestor, c.locked, c.hidden], [2, true, true, false, false]);
    const grp = rows.find((r) => r.id === "grp")!;
    assert.deepEqual([grp.hasChildren, grp.expanded, grp.locked, grp.lockedByAncestor], [true, true, true, false]);
  });

  it("a search lists matches with the layers above them, expanded, and marks those only there for context", () => {
    const rows = buildRows(layers(), new Set(), "d"); // matches the layer named D only (no kind has a "d")
    assert.deepEqual(ids(rows), ["pg", "grp", "d"]);
    assert.deepEqual(rows.map((r) => r.context), [true, true, false]);
    assert.deepEqual(ids(buildRows(layers(), new Set(), "TEXT")), ["pg", "t"]); // the kind of layer matches too
    assert.deepEqual(buildRows(layers(), new Set(), "nothing like this"), []);
  });

  it("ancestors and ranges", () => {
    assert.deepEqual(ancestorsOf(layers(), "c"), ["pg", "grp"]);
    assert.deepEqual(ancestorsOf(layers(), "pg"), []);
    const rows = buildRows(layers(), new Set(["pg"]));
    assert.deepEqual(rangeBetween(rows, "t", "b"), ["t", "grp", "b"]);
    assert.deepEqual(rangeBetween(rows, "b", "t"), ["t", "grp", "b"]);
    assert.deepEqual(rangeBetween(rows, "gone", "b"), ["b"]);
  });

  it("a layer whose parent is missing is not listed and cannot crash the panel", () => {
    getDocument().layers.a.parentId = "ghost";
    getDocument().layers.pg.children = ["b", "grp", "t"];
    assert.deepEqual(ids(buildRows(layers(), new Set(["pg"]))), ["pg2", "pg", "t", "grp", "b"]);
  });
});

describe("Phase 32: canReparent says no, with a reason", () => {
  it("allows a layer into a frame or a group", () => {
    assert.deepEqual(canReparent(layers(), ["a"], "grp"), { ok: true });
    assert.deepEqual(canReparent(layers(), ["a"], "pg2"), { ok: true });
  });
  it("refuses a parent that can't hold layers", () => {
    const r = canReparent(layers(), ["a"], "t");
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.reason : "", /"T" is a text; only frames and groups can hold other layers/);
    assert.equal(canReparent(layers(), ["a"], "b").ok, false);
  });
  it("refuses a layer inside itself or its own subtree", () => {
    const r = canReparent(layers(), ["grp"], "c");
    assert.match(!r.ok ? r.reason : "", /can't go inside itself/);
    assert.equal(canReparent(layers(), ["grp"], "grp").ok, false);
  });
  it("refuses locked layers and locked parents", () => {
    assert.match((canReparent(layers(), ["lk"], "pg") as { reason: string }).reason, /"LK" is locked/);
    getDocument().layers.grp.locked = true;
    assert.match((canReparent(layers(), ["a"], "grp") as { reason: string }).reason, /"GRP" is locked/);
    assert.match((canReparent(layers(), ["c"], "pg") as { reason: string }).reason, /"C" is locked/); // inside a locked group
  });
  it("only frames and groups may sit on the canvas by themselves", () => {
    const r = canReparent(layers(), ["a"], null);
    assert.match(!r.ok ? r.reason : "", /Only frames can sit on the canvas/);
    assert.equal(canReparent(layers(), ["grp"], null).ok, true);
  });
  it("nothing to move, and a place that is gone", () => {
    assert.equal(canReparent(layers(), [], "pg").ok, false);
    assert.equal(canReparent(layers(), ["ghost"], "pg").ok, false);
    assert.match((canReparent(layers(), ["a"], "ghost") as { reason: string }).reason, /no longer exists/);
  });
  it("refuses nesting beyond the depth limit", () => {
    let parent = "pg2";
    const ls: Layer[] = [];
    for (let i = 0; i < 63; i++) {
      ls.push(box(`n${i}`, parent, [], 0, 0));
      parent = `n${i}`;
    }
    setDocument(createDocumentFromLayers([box("pg2", null, ["n0"], 0, 0), ...ls.map((l, i) => ({ ...l, children: i < 62 ? [`n${i + 1}`] : [] })), box("pg", null, ["grp"], 0, 0), box("grp", "pg", ["a"], 0, 0), rect("a", "grp", 0, 0)]));
    const r = canReparent(layers(), ["grp"], "n62");
    assert.match(!r.ok ? r.reason : "", /nested 64 deep at most/);
  });
});

describe("Phase 32: moveLayers", () => {
  it("reorders inside a parent: index counts after the moved layer has left", () => {
    // pg.children = a, b, grp, t (back to front). Move "a" to the front (index 3 once it has left).
    assert.equal(moveLayers(["a"], "pg", 3).ok, true);
    assert.deepEqual(layers().pg.children, ["b", "grp", "t", "a"]);
    historyCommands.undo();
    assert.deepEqual(layers().pg.children, ["a", "b", "grp", "t"]);
  });

  it("moves several layers together and keeps their order", () => {
    assert.equal(moveLayers(["b", "a"], "pg2", 0).ok, true);
    assert.deepEqual(layers().pg2.children, ["a", "b", "lk"]);
    assert.equal(layers().a.parentId, "pg2");
    assert.deepEqual(layers().pg.children, ["grp", "t"]);
  });

  it("an absolute layer stays where it was on the canvas when it changes parent", () => {
    // "c" is at (5, 5) in grp, which is at (200, 100) in pg: on the canvas (205, 105). Into pg2 (at 1000, 0): (-795, 105).
    moveLayers(["c"], "pg2");
    assert.deepEqual([layers().c.properties["frame.x"], layers().c.properties["frame.y"]], [-795, 105]);
    // and back into pg (at 0, 0)
    moveLayers(["c"], "pg");
    assert.deepEqual([layers().c.properties["frame.x"], layers().c.properties["frame.y"]], [205, 105]);
  });

  it("a layer dropped on the canvas becomes a top-level frame at the same place", () => {
    assert.equal(moveLayers(["grp"], null).ok, true);
    assert.equal(layers().grp.parentId, null);
    assert.deepEqual([layers().grp.properties["frame.x"], layers().grp.properties["frame.y"]], [200, 100]);
    assert.deepEqual(layers().pg.children, ["a", "b", "t"]);
  });

  it("refuses with the reason and changes nothing", () => {
    const before = JSON.stringify(layers());
    const r = moveLayers(["a"], "t");
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.reason : "", /can hold other layers/);
    assert.equal(JSON.stringify(layers()), before);
    assert.equal(moveLayers(["pg"], null).ok, false); // moving within the top level
  });

  it("the whole move is one undo step", () => {
    const before = JSON.stringify(layers());
    moveLayers(["a", "b"], "grp", 1);
    historyCommands.undo();
    assert.equal(JSON.stringify(layers()), before);
  });
});
