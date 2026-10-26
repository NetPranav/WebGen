/**
 * FigCraft port F6: auto layout behaviour. The cases of FigCraft's `crates/layout/src/behaviour_tests.rs` (gap rules),
 * `content_align_tests.rs` (wrapped lines) and the layout-grid tests of `tests.rs` (commit 6ea44e9), translated to our
 * stack model (`stack.ts`, the oracle the browser is checked against) and layout grids. Where our CSS-based model
 * differs from FigCraft's own solver the case says so. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeStack, mainOffsets, type AlignItems, type Justify, type StackChild, type StackSpec } from "../stack";
import { columnsGrid, gridLines, gridSnapLines, parseLayoutGrids, serializeLayoutGrids, type LayoutGrid } from "../layoutGrids";

const kid = (w: number, h: number): StackChild => ({ w, h, sizingH: "fixed", sizingV: "fixed" });
const spec = (over: Partial<StackSpec>): StackSpec => ({ direction: "row", gap: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 }, justify: "flex-start", align: "flex-start", wrap: false, ...over });
const rects = (s: StackSpec, size: { w: number; h: number }, kids: StackChild[]) => computeStack(s, size, kids).map((r) => [r.x, r.y, r.w, r.h].map((v) => Math.round(v * 1000) / 1000));
const three = [kid(20, 20), kid(20, 20), kid(20, 20)];

describe("FigCraft layout: gap rules", () => {
  it("auto gap between: as far apart as possible, no space at the edges", () => {
    assert.deepEqual(rects(spec({ justify: "space-between", gap: 10 }), { w: 200, h: 20 }, three), [[0, 0, 20, 20], [90, 0, 20, 20], [180, 0, 20, 20]]);
  });
  it("auto gap evenly: equal space in every gap and at both edges", () => {
    assert.deepEqual(rects(spec({ justify: "space-evenly" }), { w: 200, h: 20 }, three), [[35, 0, 20, 20], [90, 0, 20, 20], [145, 0, 20, 20]]);
  });
  it("auto gap around: gaps twice the edge space", () => {
    const r = rects(spec({ justify: "space-around" }), { w: 200, h: 20 }, three);
    assert.ok(Math.abs(r[0][0] - 70 / 3) < 1e-3 && r[1][0] === 90 && Math.abs(r[2][0] - 470 / 3) < 1e-3, JSON.stringify(r));
  });
  it("auto gaps stop at 0 when the children don't fit", () => {
    for (const justify of ["space-between", "space-evenly"] as Justify[]) {
      assert.deepEqual(rects(spec({ justify }), { w: 50, h: 20 }, [kid(30, 20), kid(30, 20)]), [[0, 0, 30, 20], [30, 0, 30, 20]], justify);
    }
  });
  it("a single child: between aligns to the start, evenly centres it", () => {
    assert.deepEqual(rects(spec({ justify: "space-between" }), { w: 200, h: 20 }, [kid(20, 20)]), [[0, 0, 20, 20]]);
    assert.deepEqual(rects(spec({ justify: "space-evenly" }), { w: 200, h: 20 }, [kid(20, 20)]), [[90, 0, 20, 20]]);
  });
  it("auto gap with fill children: they take the free space, leaving no gap", () => {
    const fill: StackChild = { w: 0, h: 20, sizingH: "fill", sizingV: "fixed" };
    assert.deepEqual(rects(spec({ justify: "space-between", gap: 0 }), { w: 200, h: 20 }, [kid(20, 20), fill, kid(20, 20)]), [[0, 0, 20, 20], [20, 0, 160, 20], [180, 0, 20, 20]]);
  });
  it("mainOffsets never goes negative for an auto gap", () => {
    assert.equal(mainOffsets("space-around", -50, 3, 0).step, 0);
    assert.equal(mainOffsets("space-evenly", -50, 3, 0).step, 0);
  });
});

describe("FigCraft layout: wrapped lines", () => {
  // three 40 × 20 children in a 100 × 100 frame wrap into rows of two and one, gap 10, rows 5 apart
  const base = (over: Partial<StackSpec> = {}) => spec({ wrap: true, gap: 10, crossGap: 5, ...over });
  const kids = [kid(40, 20), kid(40, 20), kid(40, 20)];
  const at = (align: AlignItems, over: Partial<StackSpec> = {}, size = { w: 100, h: 100 }, k = kids) => rects(base({ align, ...over }), size, k);

  it("packed at the start", () => assert.deepEqual(at("flex-start"), [[0, 0, 40, 20], [50, 0, 40, 20], [0, 25, 40, 20]]));
  it("packed in the centre: 55 / 2 above", () => assert.deepEqual(at("center"), [[0, 27.5, 40, 20], [50, 27.5, 40, 20], [0, 52.5, 40, 20]]));
  it("packed at the end: 55 above", () => assert.deepEqual(at("flex-end"), [[0, 55, 40, 20], [50, 55, 40, 20], [0, 80, 40, 20]]));
  it("space between: the gap gives way, 100 − 40 between two rows", () => assert.deepEqual(at("flex-start", { alignContent: "space-between" }), [[0, 0, 40, 20], [50, 0, 40, 20], [0, 80, 40, 20]]));
  it("space between three rows: (100 − 60) / 2 = 20 between", () => assert.deepEqual(at("flex-start", { alignContent: "space-between" }, { w: 50, h: 100 }), [[0, 0, 40, 20], [0, 40, 40, 20], [0, 80, 40, 20]]));
  it("space between, items still align in their row", () =>
    assert.deepEqual(at("center", { alignContent: "space-between" }, { w: 100, h: 100 }, [kid(40, 20), kid(40, 40), kid(40, 20)]), [[0, 10, 40, 20], [50, 0, 40, 40], [0, 80, 40, 20]]));
  it("space between inside padding: inner height 80, 40 between", () =>
    assert.deepEqual(at("flex-start", { alignContent: "space-between", padding: { top: 10, right: 0, bottom: 10, left: 0 } }), [[0, 10, 40, 20], [50, 10, 40, 20], [0, 70, 40, 20]]));
  it("space between with no free space: rows touch and sit where the alignment says", () =>
    assert.deepEqual(at("center", { alignContent: "space-between" }, { w: 100, h: 30 }), [[0, -5, 40, 20], [50, -5, 40, 20], [0, 15, 40, 20]]));
  it("space between with one row: like packed, the items align in the frame", () =>
    assert.deepEqual(at("flex-end", { alignContent: "space-between" }, { w: 200, h: 100 }), [[0, 80, 40, 20], [50, 80, 40, 20], [100, 80, 40, 20]]));
  it("stretched rows share the free space (FigCraft: rows of nothing but fill children; ours: the Stretch alignment)", () => {
    const fill = [0, 1, 2].map(() => ({ w: 40, h: 20, sizingH: "fixed" as const, sizingV: "fill" as const }));
    assert.deepEqual(at("stretch", {}, { w: 100, h: 100 }, fill), [[0, 0, 40, 47.5], [50, 0, 40, 47.5], [0, 52.5, 40, 47.5]]);
  });
  it("vertical wrap, columns packed in the centre", () =>
    assert.deepEqual(rects(base({ direction: "column", align: "center" }), { w: 100, h: 100 }, [kid(20, 40), kid(20, 40), kid(20, 40)]), [[27.5, 0, 20, 40], [27.5, 50, 20, 40], [52.5, 0, 20, 40]]));
  it("vertical wrap, space between columns: 100 − 40 between", () =>
    assert.deepEqual(rects(base({ direction: "column", alignContent: "space-between" }), { w: 100, h: 100 }, [kid(20, 40), kid(20, 40), kid(20, 40)]), [[0, 0, 20, 40], [0, 50, 20, 40], [80, 0, 20, 40]]));
  it("no children, nothing placed", () => assert.deepEqual(rects(base({ alignContent: "space-between" }), { w: 100, h: 100 }, []), []));
});

describe("FigCraft layout: layout grids", () => {
  it("stretched columns fill the frame between the offsets", () => {
    const g: LayoutGrid = { ...columnsGrid(4), gutter: 20, offset: 10 };
    const r = gridLines(g, 400, 100);
    assert.equal(r.length, 4);
    assert.equal(r[0].x0, 10);
    assert.ok(Math.abs(r[3].x1 - 390) < 1e-9);
  });
  it("fixed columns sit at the start, centre or end; a count of 0 fits as many as fit", () => {
    const fixed = (align: LayoutGrid["align"], count = 3) => gridLines({ ...columnsGrid(count), align, size: 60, gutter: 20, offset: 0 }, 400, 100);
    assert.equal(fixed("min")[0].x0, 0);
    assert.equal(fixed("center")[0].x0, (400 - 220) / 2);
    assert.equal(fixed("max")[2].x1, 400);
    assert.equal(fixed("min", 0).length, Math.floor((400 + 20) / 80));
  });
  it("a square grid draws a line every size px both ways; hostile values are bounded", () => {
    const r = gridLines({ ...columnsGrid(), kind: "grid", size: 10 }, 100, 50);
    assert.equal(r.length, 11 + 6);
    assert.ok(gridLines({ ...columnsGrid(), kind: "grid", size: 0 }, 1e9, 1e9).length <= 8000);
  });
  it("snap lines are the band edges of visible column and row grids", () => {
    const s = gridSnapLines([{ ...columnsGrid(2), gutter: 0, offset: 0 }], 100, 100);
    assert.deepEqual(s.xs, [0, 50, 50, 100]);
    assert.deepEqual(s.ys, []);
  });
  it("grids store as JSON and junk is repaired", () => {
    const g = [columnsGrid(12)];
    assert.deepEqual(parseLayoutGrids(serializeLayoutGrids(g)), g);
    assert.deepEqual(parseLayoutGrids("nope"), []);
    const fixed = parseLayoutGrids(JSON.stringify([{ kind: "weird", count: -5, color: "red;background:url(x)" }]))[0];
    assert.equal(fixed.kind, "grid");
    assert.equal(fixed.count, 0);
    assert.equal(fixed.color, "rgba(255, 0, 0, 0.1)");
  });
});
