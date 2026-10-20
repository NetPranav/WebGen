import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { alignBoxes, boundsOf, distributeBoxes, gapsBetween, setUniformGap, tidyBoxes, unionBounds, ALIGN_MODES } from "../align";
import type { Box } from "../transform";

/** A box from its top-left corner and size. */
const at = (x: number, y: number, w: number, h: number, rot = 0): Box => ({ cx: x + w / 2, cy: y + h / 2, w, h, rot });
const tl = (b: Box) => ({ x: b.cx - b.w / 2, y: b.cy - b.h / 2 });

describe("boundsOf", () => {
  it("is the box itself when upright", () => assert.deepEqual(boundsOf(at(10, 20, 30, 40)), { x: 10, y: 20, width: 30, height: 40 }));
  it("is the bounding square of a box turned 90 degrees", () => {
    const r = boundsOf({ cx: 50, cy: 50, w: 100, h: 20, rot: 90 });
    assert.ok(Math.abs(r.x - 40) < 1e-9 && Math.abs(r.y) < 1e-9 && Math.abs(r.width - 20) < 1e-9 && Math.abs(r.height - 100) < 1e-9);
  });
});

describe("alignBoxes (target is the selection's union)", () => {
  const boxes = [at(0, 0, 50, 20), at(100, 40, 30, 60), at(40, 200, 80, 10)];
  const target = unionBounds(boxes)!; // x 0..130, y 0..210
  it("left", () => assert.deepEqual(alignBoxes(boxes, "left", target).map((b) => tl(b).x), [0, 0, 0]));
  it("right", () => assert.deepEqual(alignBoxes(boxes, "right", target).map((b) => tl(b).x + b.w), [130, 130, 130]));
  it("horizontal centre", () => assert.deepEqual(alignBoxes(boxes, "hcenter", target).map((b) => b.cx), [65, 65, 65]));
  it("top", () => assert.deepEqual(alignBoxes(boxes, "top", target).map((b) => tl(b).y), [0, 0, 0]));
  it("bottom", () => assert.deepEqual(alignBoxes(boxes, "bottom", target).map((b) => tl(b).y + b.h), [210, 210, 210]));
  it("vertical centre", () => assert.deepEqual(alignBoxes(boxes, "vcenter", target).map((b) => b.cy), [105, 105, 105]));
  it("never changes a size or a rotation", () => {
    for (const mode of ALIGN_MODES) alignBoxes(boxes, mode, target).forEach((b, i) => assert.deepEqual([b.w, b.h, b.rot], [boxes[i].w, boxes[i].h, boxes[i].rot]));
  });
  it("aligns to a parent rectangle", () => {
    const [b] = alignBoxes([at(5, 5, 20, 20)], "hcenter", { x: 100, y: 0, width: 200, height: 100 });
    assert.equal(b.cx, 200);
    assert.equal(b.cy, 15); // only x moved
  });
  it("aligns a rotated box by its bounds", () => {
    const [b] = alignBoxes([{ cx: 50, cy: 50, w: 100, h: 20, rot: 90 }], "left", { x: 0, y: 0, width: 300, height: 300 });
    assert.ok(Math.abs(boundsOf(b).x) < 0.01);
    assert.equal(b.rot, 90);
  });
  it("ignores a NaN target and NaN boxes", () => {
    assert.deepEqual(alignBoxes(boxes, "left", { x: NaN, y: 0, width: 1, height: 1 }), boxes);
    const bad: Box = { cx: NaN, cy: 0, w: 1, h: 1, rot: 0 };
    assert.ok(Number.isNaN(alignBoxes([bad], "left", target)[0].cx));
  });
});

describe("distributeBoxes", () => {
  it("makes the horizontal gaps equal and keeps the ends", () => {
    const out = distributeBoxes([at(0, 0, 10, 10), at(15, 0, 20, 10), at(100, 0, 10, 10)], "h");
    assert.deepEqual(out.map((b) => tl(b).x), [0, 45, 100]);
    assert.deepEqual(gapsBetween(out, "h").map((g) => g.size), [35, 35]);
  });
  it("works on the vertical axis and on unsorted input, returning the input order", () => {
    const out = distributeBoxes([at(0, 90, 10, 10), at(0, 0, 10, 10), at(0, 20, 10, 10)], "v");
    assert.deepEqual(out.map((b) => tl(b).y), [90, 0, 45]);
  });
  it("leaves fewer than three boxes alone", () => {
    const two = [at(0, 0, 10, 10), at(500, 0, 10, 10)];
    assert.deepEqual(distributeBoxes(two, "h"), two);
  });
  it("closes overlaps into positive equal gaps when there is room", () => {
    const out = distributeBoxes([at(0, 0, 10, 10), at(5, 0, 10, 10), at(100, 0, 10, 10)], "h");
    assert.deepEqual(gapsBetween(out, "h").map((g) => g.size), [40, 40]);
  });
});

describe("setUniformGap (the canvas spacing handles)", () => {
  it("re-spaces every neighbour to the gap and keeps the first box", () => {
    const out = setUniformGap([at(0, 0, 10, 10), at(30, 0, 20, 10), at(200, 0, 10, 10)], "h", 5);
    assert.deepEqual(out.map((b) => tl(b).x), [0, 15, 40]);
  });
  it("accepts a negative gap and refuses NaN", () => {
    assert.deepEqual(setUniformGap([at(0, 0, 10, 10), at(20, 0, 10, 10)], "h", -4).map((b) => tl(b).x), [0, 6]);
    const same = [at(0, 0, 10, 10), at(20, 0, 10, 10)];
    assert.deepEqual(setUniformGap(same, "h", NaN), same);
  });
});

describe("tidyBoxes", () => {
  it("snaps a ragged 2 x 2 into a grid with the median column gap (13) and the row gap (37)", () => {
    const out = tidyBoxes([at(0, 0, 40, 30), at(52, 3, 40, 30), at(1, 70, 40, 30), at(55, 74, 40, 30)]);
    assert.deepEqual(out.map((b) => tl(b)), [{ x: 0, y: 0 }, { x: 53, y: 0 }, { x: 0, y: 67 }, { x: 53, y: 67 }]);
  });
  it("uses the widest box of each column and the tallest of each row", () => {
    const out = tidyBoxes([at(0, 0, 20, 10), at(30, 0, 20, 40), at(0, 60, 60, 10), at(80, 60, 10, 10)]);
    // gaps: columns 10 (row 1), 20 (row 2) -> median 15; rows 60 - 40 = 20
    assert.deepEqual(out.map((b) => tl(b)), [{ x: 0, y: 0 }, { x: 75, y: 0 }, { x: 0, y: 60 }, { x: 75, y: 60 }]);
  });
  it("falls back to 16 when nothing has a positive gap", () => {
    const out = tidyBoxes([at(0, 0, 10, 10), at(5, 0, 10, 10)]);
    assert.deepEqual(out.map((b) => tl(b).x), [0, 26]);
  });
  it("is stable: tidying a tidy grid changes nothing", () => {
    const once = tidyBoxes([at(0, 0, 40, 30), at(52, 3, 40, 30), at(1, 70, 40, 30), at(55, 74, 40, 30)]);
    assert.deepEqual(tidyBoxes(once), once);
  });
  it("keeps sizes and returns boxes in the input order", () => {
    const input = [at(200, 0, 10, 10), at(0, 0, 30, 5)];
    const out = tidyBoxes(input);
    assert.deepEqual(out.map((b) => [b.w, b.h]), [[10, 10], [30, 5]]);
    assert.ok(tl(out[1]).x < tl(out[0]).x);
  });
});
