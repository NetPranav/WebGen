/**
 * FigCraft port F5: live boolean groups and the Shape Builder, on real documents. The logic cases of FigCraft's
 * `crates/engine/src/booleans_tests.rs` and `shapebuilder_tests.rs` (commit 6ea44e9), translated to our layers: two
 * overlapping squares, operations per operand, flatten, merge and remove, one undo step each. (FigCraft's pointer
 * gestures are covered in the browser.) MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { documentCommands, getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { useSelectionStore } from "../../store/useSelectionStore";
import { RenderLayer } from "../../render/RenderLayer";
import { booleanGroupResult, layerOutline, toParent } from "../layerOutline";
import { flattenBooleanGroups, makeBooleanGroup, operandOp, setBooleanOperation, shownOp } from "../booleanGroups";
import { arrangement, buildShapes, regionAt } from "../shapeBuilder";

const rect = (id: string, x: number, y: number, w: number, h: number, fill: string): Layer =>
  createLayer({ id, archetype: "rectangle", parentId: "pg", name: id, properties: { positioning: "absolute", "frame.x": x, "frame.y": y, "frame.width": w, "frame.height": h, "svg.fill": fill } }) as Layer;

const doc = (layers: Layer[]) =>
  createDocumentFromLayers([
    createLayer({ id: "pg", archetype: "container", parentId: null, name: "Page", children: layers.map((l) => l.id), properties: { "frame.x": 0, "frame.y": 0, "frame.width": 800, "frame.height": 600 } }) as Layer,
    ...layers,
  ]);

const L = () => getDocument().layers;
/** A layer's filled area on the page. */
const area = (id: string) => {
  const l = L()[id];
  if (l.properties["boolean.operation"]) return Math.abs(booleanGroupResult(l, L())?.area() ?? 0);
  return Math.abs(toParent(layerOutline(l, L())!.path, l).area());
};

describe("FigCraft port F5: live boolean groups", () => {
  beforeEach(() => {
    setDocument(doc([rect("a", 0, 0, 100, 100, "#ff0000"), rect("b", 50, 50, 100, 100, "#0000ff"), rect("c", 200, 0, 50, 50, "#00ff00")]));
    useSelectionStore.getState().clearSelection();
  });

  it("a subtract group draws A − B and keeps both as layers", () => {
    const g = makeBooleanGroup(["a", "b"], "subtract")!;
    assert.deepEqual(L()[g].children, ["a", "b"]);
    assert.ok(Math.abs(area(g) - 7500) < 1, `${area(g)}`);
    assert.equal(L()[g].name, "Subtract");
    assert.ok(String(L()[g].properties["paint.fills"]).includes("#ff0000"), "the group takes the bottom operand's fill");
    // one undo step brings the loose rectangles back
    historyCommands.undo();
    assert.equal(L().a.parentId, "pg");
    assert.equal(L()[g], undefined);
  });

  it("operations per operand, the group's operation, and what the controls show", () => {
    const g = makeBooleanGroup(["a", "b"], "subtract")!;
    // move c into the group (the group sits at a and b's bounds, at 0, 0, so c keeps its place on the page)
    const c = "c";
    documentCommands.moveLayer(c, g, 2);
    assert.ok(Math.abs(area(g) - 7500) < 1, "subtracting c, which is off to the side, changes nothing");
    setBooleanOperation([c], "union");
    assert.equal(operandOp(c), "union");
    assert.ok(Math.abs(area(g) - 10000) < 1, `${area(g)}`);
    assert.equal(L()[g].children.length, 3, "no new group");
    historyCommands.undo();
    assert.ok(Math.abs(area(g) - 7500) < 1);
    historyCommands.redo();
    setBooleanOperation([c], "subtract");
    assert.equal(L()[c].properties["boolean.operandOp"], "", "an operand set to its group's operation follows the group again");
    setBooleanOperation(["b"], "intersect");
    assert.equal(shownOp(["b"]), "intersect");
    assert.equal(shownOp(["b", c]), null, "mixed");
    assert.equal(shownOp([g]), "subtract");
    // (A ∩ B) − C: the 2,500 overlap
    assert.ok(Math.abs(area(g) - 2500) < 1, `${area(g)}`);
    // one boolean group selected: its operation changes and every operand follows it
    setBooleanOperation([g], "union");
    assert.equal(L()[g].properties["boolean.operation"], "union");
    assert.ok(["a", "b", c].every((i) => !L()[i].properties["boolean.operandOp"]));
    assert.ok(Math.abs(area(g) - 20000) < 1, `${area(g)}`);
  });

  it("flatten bakes the result into one path layer", () => {
    const g = makeBooleanGroup(["a", "b"], "union")!;
    const before = area(g);
    const [flat] = flattenBooleanGroups([g]);
    assert.ok(flat);
    assert.equal(L()[g], undefined);
    assert.equal(L()[flat].archetype, "svgPath");
    assert.ok(Math.abs(area(flat) - before) < 2, `${area(flat)} vs ${before}`);
  });

  it("the stage draws a boolean group as one shape, its operands hidden but present", () => {
    const g = makeBooleanGroup(["a", "b"], "exclude")!;
    const out = renderToStaticMarkup(createElement(RenderLayer, { layerId: g, layers: L() }));
    assert.ok(out.includes('data-boolean="exclude"'), out.slice(0, 300));
    assert.ok(out.includes("visibility:hidden"), "operands stay in the tree, hidden");
    assert.ok(out.includes('data-element-id="a"') && out.includes('data-element-id="b"'));
    assert.match(out, /<path[^>]* d="M/);
  });
});

describe("FigCraft port F5: the Shape Builder", () => {
  /** Two 10×10 squares overlapping in a 5×5 square: A (red) at the origin, B (blue) above it at 5,5. */
  beforeEach(() => {
    setDocument(doc([rect("a", 0, 0, 10, 10, "#ff0000"), rect("b", 5, 5, 10, 10, "#0000ff")]));
    useSelectionStore.getState().selectMultiple(["a", "b"], "element");
  });

  it("overlapping squares make three regions", () => {
    const arr = arrangement(["a", "b"]);
    assert.deepEqual(arr.sources, ["a", "b"]);
    assert.equal(arr.regions.length, 3);
    const onlyA = regionAt(arr, { x: 2, y: 2 })!;
    const both = regionAt(arr, { x: 7, y: 7 })!;
    const onlyB = regionAt(arr, { x: 12, y: 12 })!;
    assert.deepEqual(arr.regions[onlyA].sources, ["a"]);
    assert.deepEqual(arr.regions[both].sources, ["b", "a"], "top-most first");
    assert.deepEqual(arr.regions[onlyB].sources, ["b"]);
    assert.equal(regionAt(arr, { x: 20, y: 20 }), null);
    arr.regions.forEach((r, i) => assert.equal(regionAt(arr, r.point!), i, "every region reports a point inside itself"));
  });

  it("merging the overlap makes a new shape, styled like the top-most layer over it; the others lose it", () => {
    const r = buildShapes(["a", "b"], { points: [{ x: 7, y: 7 }] }, true)!;
    const m = r.created!;
    assert.ok(Math.abs(area(m) - 25) < 0.05, `${area(m)}`);
    assert.equal(L()[m].properties["svg.fill"], "#0000ff");
    // a and b became path layers holding what is left of them
    const [ha, hb] = r.changed;
    assert.ok(Math.abs(area(ha) - 75) < 0.05, `${area(ha)}`);
    assert.ok(Math.abs(area(hb) - 75) < 0.05, `${area(hb)}`);
    assert.equal(L()[ha].properties["svg.fill"], "#ff0000");
    const kids = L().pg.children;
    assert.equal(kids.indexOf(m), kids.indexOf(hb) + 1, "just above the layer it is styled like");
    const sel = useSelectionStore.getState().selectedIds;
    assert.ok(sel.includes(m) && sel.includes(ha) && sel.includes(hb), JSON.stringify(sel));
    // one undo step brings the rectangles back
    historyCommands.undo();
    assert.equal(L()[m], undefined);
    assert.equal(L().a.archetype, "rectangle");
    assert.ok(Math.abs(area("a") - 100) < 1e-6);
  });

  it("merging every region unites the shapes; a lone shape's only region is a no-op", () => {
    const r = buildShapes(["a", "b"], { regions: [0, 1, 2] }, true)!;
    assert.deepEqual(r.removed.sort(), ["a", "b"]);
    assert.ok(Math.abs(area(r.created!) - 175) < 0.05, `${area(r.created!)}`);
    assert.deepEqual(useSelectionStore.getState().selectedIds, [r.created]);
    setDocument(doc([rect("solo", 0, 0, 10, 10, "#ff0000")]));
    const none = buildShapes(["solo"], { regions: [0] }, true)!;
    assert.equal(none.created, null);
    assert.equal(L().solo.archetype, "rectangle");
  });

  it("removing regions deletes their area from every layer covering them", () => {
    const r = buildShapes(["a", "b"], { points: [{ x: 7, y: 7 }] }, false)!;
    assert.equal(r.created, null);
    assert.equal(r.changed.length, 2);
    for (const id of r.changed) assert.ok(Math.abs(area(id) - 75) < 0.05);
    // removing the rest of one square deletes it
    const after = buildShapes(r.changed, { points: [{ x: 2, y: 2 }] }, false)!;
    assert.equal(after.removed.length, 1);
  });

  it("nothing picked does nothing; junk points are ignored", () => {
    assert.equal(buildShapes(["a", "b"], { points: [{ x: 500, y: 500 }] }, true), null);
    assert.equal(buildShapes(["a", "b"], { points: [{ x: NaN, y: 1 }], regions: [99, -1] }, true), null);
  });
});
