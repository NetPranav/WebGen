/**
 * FigCraft port F12: working on a whole selection. The cases of FigCraft's batch rename table
 * (`panels_behaviour_tests.rs`), `selection_spacing_tests.rs` and `selection_reorder_tests.rs` (commit 6ea44e9),
 * translated to our layers, and selection colours (grouping, changing every slot, selecting by colour).
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { worldBox } from "../layerBoxes";
import { batchRename, renameLayers, reorderSelection, selectionColors, selectionSpacing, selectWithColor, setSelectionPaint, setSelectionSpacing } from "../selectionTools";

let n = 0;
/** A page holding rectangles; returns their ids. */
function page(rects: [number, number, number, number][], extra: Layer[] = []): string[] {
  n = 0;
  const ids = rects.map(() => `r${n++}`);
  setDocument(
    createDocumentFromLayers([
      createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: [...ids, ...extra.filter((l) => l.parentId === "pg").map((l) => l.id)], properties: { "frame.x": 0, "frame.y": 0, "frame.width": 2000, "frame.height": 2000 } }) as Layer,
      ...rects.map(([x, y, w, h], i) => createLayer({ id: ids[i], archetype: "rectangle", parentId: "pg", name: ids[i], properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h, "svg.fill": "#ff0000" } }) as Layer),
      ...extra,
    ]),
  );
  return ids;
}
const xy = (id: string) => {
  const b = worldBox(id)!;
  return [b.cx - b.w / 2, b.cy - b.h / 2];
};

describe("FigCraft batch rename", () => {
  const rows: [string[], Parameters<typeof renameLayers>[1], string[], string][] = [
    [["A", "B", "C"], { pattern: "Item $n" }, ["Item 1", "Item 2", "Item 3"], "numbers count up in stacking order, bottom first"],
    [["A", "B", "C"], { pattern: "$nnn" }, ["001", "002", "003"], "repeated n pads"],
    [["A", "B", "C"], { pattern: "$N", start: 0 }, ["2", "1", "0"], "down numbers stop at the value given"],
    [["Old A", "Old B", "Old C"], { find: "Old", replace: "New" }, ["New A", "New B", "New C"], "a match replaces only the matched part"],
    [["A", "B", "C"], { find: "zz", replace: "y" }, ["A", "B", "C"], "layers without the match keep their names"],
    [["a_a", "b", "c"], { find: "a", replace: "<$&>" }, ["<a>_<a>", "b", "c"], "every occurrence; the current-name code is the matched text"],
    [["Icon_003", "Logo_7", "x"], { find: "([a-zA-Z]+)_(\\d+)", regex: true, replace: "$2_$1" }, ["003_Icon", "7_Logo", "x"], "groups swap parts"],
    [["ab", "b", "c"], { find: "b", regex: true, replace: "[$`|$']" }, ["a[a|]", "[|]", "c"], "the text around the match"],
    [["A", "B", "C"], { find: "B", replace: "$n" }, ["A", "2", "C"], "numbers count every layer, matched or not"],
    [["A", "B", "C"], { pattern: "$$$n" }, ["$1", "$2", "$3"], "two dollar signs make one"],
    [["A", "B", "C"], { pattern: "$x $1" }, ["$x $1", "$x $1", "$x $1"], "unknown codes stay as typed"],
  ];
  for (const [names, settings, after, why] of rows) {
    it(why, () => {
      const ids = page(names.map((_, k) => [k * 50, 0, 40, 40]));
      documentCommands.mutate("names", (d) => names.forEach((nm, i) => (d.layers[ids[i]].name = nm)));
      // given top first, as a range picked in the panel: numbering still follows the stacking order
      renameLayers([...ids].reverse(), settings);
      assert.deepEqual(ids.map((id) => getDocument().layers[id].name), after);
    });
  }
  it("one undo step; a bad regular expression changes nothing; odd input stays bounded", () => {
    const [a] = page([[0, 0, 10, 10]]);
    renameLayers([a], { pattern: "$n" });
    assert.equal(getDocument().layers[a].name, "1");
    historyCommands.undo();
    assert.equal(getDocument().layers[a].name, "r0");
    assert.ok("error" in renameLayers([a], { find: "(", regex: true, replace: "x" }));
    const r = (find: string | undefined, to: string, start: number | undefined, name: string) => {
      const b = batchRename({ find, replace: to, pattern: find === undefined ? to : undefined, start });
      return "error" in b ? b.error : b.apply(name, 0, 1);
    };
    assert.equal(r(undefined, "x$", undefined, "a"), "x$");
    assert.equal(r(undefined, `$${"n".repeat(40)}`, undefined, "a"), "000000000001");
    assert.equal(r(undefined, "$n", 1e30, "a"), "1000000000000");
    assert.equal(r(undefined, "$n", NaN, "a"), "1");
    assert.equal(r("é", "e", undefined, "café é"), "cafe e");
  });
});

describe("FigCraft selection spacing", () => {
  it("rows, columns and grids keep their tracks' contents and sizes", () => {
    const [a, b, c, d] = page([[100, 100, 50, 40], [180, 100, 80, 40], [100, 160, 30, 60], [180, 160, 40, 60]]);
    const ids = [a, b, c, d];
    const layout = selectionSpacing(ids);
    assert.equal(layout.horizontal!.value, 30);
    assert.equal(layout.vertical!.value, 20);
    assert.equal(setSelectionSpacing(ids, { horizontal: 12, vertical: 25 }), true);
    assert.deepEqual([xy(a), xy(b), xy(c), xy(d)], [[100, 100], [162, 100], [100, 165], [162, 165]]);
    assert.equal(getDocument().layers[d].properties["frame.width"], 40);
    historyCommands.undo();
    assert.deepEqual(xy(d), [180, 160]);
  });

  it("mixed gaps normalise; fractional and negative gaps work", () => {
    const [a, b, c] = page([[0, 0, 50, 40], [70, 0, 50, 40], [160, 0, 50, 40]]);
    assert.equal(selectionSpacing([a, b, c]).horizontal!.value, null);
    setSelectionSpacing([a, b, c], { horizontal: -5.5 });
    assert.deepEqual([xy(b), xy(c)], [[44.5, 0], [89, 0]]);
    assert.equal(selectionSpacing([a, b, c]).horizontal!.value, -5.5);
  });

  it("unsafe selections and missing axes are refused without changes", () => {
    const [a, b] = page([[0, 0, 50, 40], [70, 0, 50, 40]]);
    for (const flags of [{ locked: true }, { visible: false }]) {
      documentCommands.setLayerFlags(b, flags);
      assert.equal(setSelectionSpacing([a, b], { horizontal: 5 }), false);
      documentCommands.setLayerFlags(b, { locked: false, visible: true });
    }
    for (const gaps of [{ vertical: 5 }, { horizontal: 5, vertical: 5 }, { horizontal: 1e300 }, {}]) {
      assert.equal(setSelectionSpacing([a, b], gaps), false, JSON.stringify(gaps));
      assert.deepEqual(xy(b), [70, 0]);
    }
    // children of an auto-layout frame are placed by it
    page([], [
      createLayer({ id: "f", archetype: "container", parentId: "pg", name: "f", children: ["x", "y"], properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 300, "frame.height": 100, "layout.auto": true, "layout.display": "flex", "layout.flexDirection": "row" } }) as Layer,
      createLayer({ id: "x", archetype: "rectangle", parentId: "f", name: "x", properties: { "frame.width": 50, "frame.height": 40 } }) as Layer,
      createLayer({ id: "y", archetype: "rectangle", parentId: "f", name: "y", properties: { "frame.width": 50, "frame.height": 40 } }) as Layer,
    ]);
    assert.equal(selectionSpacing(["x", "y"]).horizontal, null);
  });
});

describe("FigCraft selection reorder", () => {
  it("insertion reflows unequal sizes with the original gaps; selection order doesn't matter; one undo step", () => {
    for (const vertical of [false, true]) {
      const ids = page(([[0, 40], [50, 60], [120, 20]] as const).map(([at, size]) => (vertical ? [0, at, 30, size] : [at, 0, size, 30])));
      assert.equal(reorderSelection([ids[2], ids[0], ids[1]], ids[0], ids[2]), true);
      for (const [id, at] of [[ids[1], 0], [ids[2], 70], [ids[0], 100]] as const) assert.deepEqual(xy(id), vertical ? [0, at] : [at, 0], `${vertical}`);
      historyCommands.undo();
      assert.deepEqual(xy(ids[0]), [0, 0]);
    }
  });

  it("grids insert across rows, and swap exchanges only the two", () => {
    const ids = page([0, 1].flatMap((row) => [0, 1, 2].map((col) => [col * 70, row * 60, 50, 40] as [number, number, number, number])));
    reorderSelection(ids, ids[0], ids[4]);
    assert.deepEqual([xy(ids[0]), xy(ids[3]), xy(ids[5])], [[70, 60], [140, 0], [140, 60]]);
    historyCommands.undo();
    reorderSelection(ids, ids[0], ids[4], true);
    assert.deepEqual([xy(ids[0]), xy(ids[4])], [[70, 60], [0, 0]]);
    assert.deepEqual(xy(ids[1]), [70, 0]);
  });

  it("a grid reflow keeps the gaps with different sizes", () => {
    const [a, b, c, d] = page([[0, 0, 40, 30], [50, 0, 60, 30], [0, 50, 40, 50], [50, 50, 60, 50]]);
    reorderSelection([a, b, c, d], a, d);
    assert.deepEqual([xy(b), xy(c), xy(d), xy(a)], [[0, 0], [70, 0], [0, 70], [70, 70]]);
  });

  it("irregular selections are refused", () => {
    const [a, b, c] = page([[0, 0, 40, 30], [50, 0, 40, 30], [130, 0, 40, 30]]);
    assert.equal(reorderSelection([a, b, c], a, c), false, "mixed gaps");
  });
});

describe("FigCraft port F12: selection colours", () => {
  beforeEach(() => {
    page([], [
      createLayer({ id: "card", archetype: "container", parentId: "pg", name: "card", children: ["dot", "label"], properties: { positioning: "absolute", "frame.width": 200, "frame.height": 100, "appearance.background.color": "#FF0000" } }) as Layer,
      createLayer({ id: "dot", archetype: "ellipse", parentId: "card", name: "dot", properties: { "frame.width": 20, "frame.height": 20, "paint.fills": JSON.stringify([{ type: "solid", color: "#ff0000" }, { type: "linear", stops: [{ at: 0, color: "#000" }, { at: 1, color: "#fff" }], from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }]) } }) as Layer,
      createLayer({ id: "label", archetype: "text", parentId: "card", name: "label", properties: { "content.text": "Hello", "typography.color": "#0000ff", "content.runs": JSON.stringify([{ t: "He", c: "#ff0000" }, { t: "llo" }]) } }) as Layer,
    ]);
  });

  it("groups every slot by value, descendants and text runs included; gradients are their own colour", () => {
    const colors = selectionColors(["card"]);
    const red = colors.find((c) => c.key === "#ff0000")!;
    assert.deepEqual(red.targets.map((t) => `${t.id}:${t.prop}:${t.index ?? ""}`).sort(), ["card:appearance.background.color:", "dot:paint.fills:0", "label:content.runs:0"]);
    assert.ok(colors.some((c) => c.paint.type === "linear"));
    assert.ok(colors.some((c) => c.key === "#0000ff"));
  });

  it("changing a colour changes every slot that showed it, in one undo step; selecting by colour picks its layers", () => {
    const red = selectionColors(["card"]).find((c) => c.key === "#ff0000")!;
    assert.equal(setSelectionPaint(red.targets, { type: "solid", color: "#00aa00", opacity: 1, visible: true }), 3);
    const L = getDocument().layers;
    assert.equal(L.card.properties["appearance.background.color"], "#00aa00");
    assert.match(String(L.dot.properties["paint.fills"]), /#00aa00/);
    assert.match(String(L.label.properties["content.runs"]), /#00aa00/);
    assert.ok(!selectionColors(["card"]).some((c) => c.key === "#ff0000"));
    historyCommands.undo();
    assert.equal(getDocument().layers.card.properties["appearance.background.color"], "#FF0000");
    assert.deepEqual(selectWithColor(red.targets).sort(), ["card", "dot", "label"]);
    assert.deepEqual([...useSelectionStore.getState().selectedIds].sort(), ["card", "dot", "label"]);
  });
});
