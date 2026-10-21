import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STACK, computeStack, hugSize, inferStack, insertionIndex, insertionLine, uniformPadding, type StackChild, type StackSpec } from "../stack";

const fixed = (w: number, h: number): StackChild => ({ w, h, sizingH: "fixed", sizingV: "fixed" });
const spec = (over: Partial<StackSpec> = {}): StackSpec => ({ ...DEFAULT_STACK, ...over });

describe("Phase 41: computing a stack", () => {
  it("a column places children one under another with the gap and padding", () => {
    const r = computeStack(spec({ gap: 10, padding: { top: 5, right: 5, bottom: 5, left: 20 } }), { w: 300, h: 400 }, [fixed(100, 40), fixed(80, 60)]);
    assert.deepEqual(r, [{ x: 20, y: 5, w: 100, h: 40 }, { x: 20, y: 55, w: 80, h: 60 }]);
  });

  it("a row places them side by side", () => {
    const r = computeStack(spec({ direction: "row", gap: 8 }), { w: 400, h: 100 }, [fixed(50, 30), fixed(70, 40)]);
    assert.deepEqual(r, [{ x: 0, y: 0, w: 50, h: 30 }, { x: 58, y: 0, w: 70, h: 40 }]);
  });

  it("centre, end and space-between on the main axis", () => {
    const kids = [fixed(40, 10), fixed(40, 10)];
    assert.equal(computeStack(spec({ direction: "row", justify: "center" }), { w: 200, h: 10 }, kids)[0].x, 60);
    assert.equal(computeStack(spec({ direction: "row", justify: "flex-end" }), { w: 200, h: 10 }, kids)[0].x, 120);
    const between = computeStack(spec({ direction: "row", justify: "space-between" }), { w: 200, h: 10 }, kids);
    assert.equal(between[0].x, 0);
    assert.equal(between[1].x, 160);
  });

  it("alignment across the axis: centre, end, and stretch", () => {
    const kids = [fixed(40, 20), fixed(40, 60)];
    const r = (align: StackSpec["align"]) => computeStack(spec({ direction: "row", align }), { w: 200, h: 100 }, kids).map((k) => [k.y, k.h]);
    assert.deepEqual(r("flex-start"), [[0, 20], [0, 60]]);
    assert.deepEqual(r("center"), [[40, 20], [20, 60]]);
    assert.deepEqual(r("flex-end"), [[80, 20], [40, 60]]);
    // stretch grows only the ones that hug across
    const hug: StackChild = { w: 40, h: 10, sizingH: "fixed", sizingV: "hug" };
    assert.deepEqual(computeStack(spec({ direction: "row", align: "stretch" }), { w: 200, h: 100 }, [hug, fixed(40, 20)]).map((k) => [k.y, k.h]), [[0, 100], [0, 20]]);
  });

  it("fill children share what is left, equally, after fixed ones and gaps", () => {
    const fill: StackChild = { w: 0, h: 20, sizingH: "fill", sizingV: "fixed" };
    const r = computeStack(spec({ direction: "row", gap: 10 }), { w: 310, h: 20 }, [fixed(50, 20), fill, fill]);
    assert.deepEqual(r.map((k) => [k.x, k.w]), [[0, 50], [60, 120], [190, 120]]);
  });

  it("a fill child across the axis takes the full cross size", () => {
    const across: StackChild = { w: 10, h: 10, sizingH: "fixed", sizingV: "fill" };
    assert.deepEqual(computeStack(spec({ direction: "row", padding: uniformPadding(10) }), { w: 100, h: 80 }, [across])[0], { x: 10, y: 10, w: 10, h: 60 });
  });

  it("wrap breaks to a new line when the next child doesn't fit", () => {
    const r = computeStack(spec({ direction: "row", gap: 10, wrap: true }), { w: 150, h: 200 }, [fixed(60, 20), fixed(60, 30), fixed(60, 20)]);
    // two fit (60 + 10 + 60 = 130); the third is on the next line below the tallest of the first
    assert.deepEqual(r.map((k) => [k.x, k.y]), [[0, 0], [70, 0], [0, 40]]);
  });

  it("hug size is the content plus gaps and padding", () => {
    const s = spec({ direction: "row", gap: 10, padding: uniformPadding(8) });
    assert.deepEqual(hugSize(s, [fixed(50, 20), fixed(30, 40)]), { w: 50 + 10 + 30 + 16, h: 40 + 16 });
    assert.deepEqual(hugSize(spec({ padding: uniformPadding(4) }), []), { w: 8, h: 8 });
  });

  it("nested stacks: a hug column inside a row lays out from its own hug size", () => {
    const inner = spec({ gap: 4, padding: uniformPadding(6) });
    const size = hugSize(inner, [fixed(40, 10), fixed(30, 10)]);
    assert.deepEqual(size, { w: 52, h: 36 });
    const outer = computeStack(spec({ direction: "row", gap: 12 }), { w: 300, h: 100 }, [{ w: size.w, h: size.h, sizingH: "hug", sizingV: "hug" }, fixed(20, 20)]);
    assert.deepEqual(outer.map((r) => [r.x, r.w]), [[0, 52], [64, 20]]);
  });
});

describe("Phase 41: reading a stack from loose layers", () => {
  const parent = { x: 0, y: 0, w: 400, h: 300 };

  it("layers side by side are a row, with their usual gap and the space around them as padding", () => {
    const { spec: s, order } = inferStack(parent, [{ x: 20, y: 30, w: 50, h: 40 }, { x: 90, y: 30, w: 60, h: 40 }, { x: 170, y: 30, w: 40, h: 40 }]);
    assert.equal(s.direction, "row");
    assert.equal(s.gap, 20);
    assert.deepEqual(s.padding, { top: 30, left: 20, right: 190, bottom: 230 });
    assert.deepEqual(order, [0, 1, 2]);
  });

  it("layers one under another are a column, in reading order", () => {
    const { spec: s, order } = inferStack(parent, [{ x: 10, y: 120, w: 80, h: 30 }, { x: 10, y: 10, w: 80, h: 30 }, { x: 10, y: 60, w: 80, h: 30 }]);
    assert.equal(s.direction, "column");
    assert.equal(s.gap, 20);
    assert.deepEqual(order, [1, 2, 0]);
  });

  it("centres that agree across the axis make centre alignment; a shared top is start", () => {
    const centred = inferStack(parent, [{ x: 0, y: 10, w: 50, h: 20 }, { x: 70, y: 0, w: 50, h: 40 }]);
    assert.equal(centred.spec.align, "center");
    const top = inferStack(parent, [{ x: 0, y: 10, w: 50, h: 20 }, { x: 70, y: 10, w: 50, h: 40 }]);
    assert.equal(top.spec.align, "flex-start");
  });

  it("an empty list gives the default", () => {
    assert.deepEqual(inferStack(parent, []).spec, DEFAULT_STACK);
  });
});

describe("Phase 41: where a dragged child would land", () => {
  const col = [{ x: 0, y: 0, w: 100, h: 40 }, { x: 0, y: 50, w: 100, h: 40 }, { x: 0, y: 100, w: 100, h: 40 }];
  it("the index comes from the pointer against each child's middle", () => {
    assert.equal(insertionIndex("column", col, { x: 10, y: 5 }), 0);
    assert.equal(insertionIndex("column", col, { x: 10, y: 45 }), 1);
    assert.equal(insertionIndex("column", col, { x: 10, y: 80 }), 2);
    assert.equal(insertionIndex("column", col, { x: 10, y: 500 }), 3);
    assert.equal(insertionIndex("row", [{ x: 0, y: 0, w: 40, h: 10 }, { x: 50, y: 0, w: 40, h: 10 }], { x: 60, y: 0 }), 2 - 1);
  });

  it("the line sits between the neighbours, across the stack", () => {
    assert.deepEqual(insertionLine("column", col, 1), { x1: 0, y1: 45, x2: 100, y2: 45 });
    assert.deepEqual(insertionLine("column", col, 0, 10), { x1: 0, y1: -5, x2: 100, y2: -5 });
    assert.equal(insertionLine("column", [], 0), null);
  });
});
