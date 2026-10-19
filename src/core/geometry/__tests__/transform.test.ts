import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_SIZE, handlePoints, moveBoxes, paramHandles, paramHandleWorld, paramValue, resizeBoxes, resizeFrame, rotateBoxes, rotationDelta, snapAngle, unionBox, corners,
  type Box,
} from "../transform";

const box = (cx: number, cy: number, w: number, h: number, rot = 0): Box => ({ cx, cy, w, h, rot });
const sq = box(100, 100, 100, 100); // x 50..150, y 50..150

/** The 30 standard manipulations (ROADMAP Phase 27 gate): exact geometry for each. */
describe("Phase 27: 30 standard manipulations give exact geometry", () => {
  it("moves (1-4): by a delta, negative, diagonal, a group together", () => {
    assert.deepEqual(moveBoxes([sq], 20, 0), [box(120, 100, 100, 100)]);
    assert.deepEqual(moveBoxes([sq], -35.5, 0), [box(64.5, 100, 100, 100)]);
    assert.deepEqual(moveBoxes([sq], 7, -13), [box(107, 87, 100, 100)]);
    assert.deepEqual(moveBoxes([sq, box(300, 300, 20, 20, 30)], 10, 10), [box(110, 110, 100, 100), box(310, 310, 20, 20, 30)]);
  });

  it("corner resizes (5-8): the opposite corner stays", () => {
    assert.deepEqual(resizeFrame(sq, "se", { x: 20, y: 10 }), box(110, 105, 120, 110));
    assert.deepEqual(resizeFrame(sq, "nw", { x: -20, y: -10 }), box(90, 95, 120, 110));
    assert.deepEqual(resizeFrame(sq, "ne", { x: 30, y: -20 }), box(115, 90, 130, 120));
    assert.deepEqual(resizeFrame(sq, "sw", { x: -30, y: 20 }), box(85, 110, 130, 120));
  });

  it("edge resizes (9-12): one axis only", () => {
    assert.deepEqual(resizeFrame(sq, "e", { x: 40, y: 99 }), box(120, 100, 140, 100));
    assert.deepEqual(resizeFrame(sq, "w", { x: -40, y: 99 }), box(80, 100, 140, 100));
    assert.deepEqual(resizeFrame(sq, "s", { x: 99, y: 25 }), box(100, 112.5, 100, 125));
    assert.deepEqual(resizeFrame(sq, "n", { x: 99, y: -25 }), box(100, 87.5, 100, 125));
  });

  it("aspect lock (13-15): a corner follows the larger change, an edge drives the other side", () => {
    assert.deepEqual(resizeFrame(box(100, 50, 200, 100), "se", { x: 40, y: 5 }, { aspect: true }), box(120, 60, 240, 120));
    assert.deepEqual(resizeFrame(box(100, 50, 200, 100), "se", { x: 4, y: 30 }, { aspect: true }), box(130, 65, 260, 130));
    assert.deepEqual(resizeFrame(box(100, 50, 200, 100), "e", { x: 40, y: 0 }, { aspect: true }), box(120, 50, 240, 120));
  });

  it("from the centre (16-17): both sides grow", () => {
    assert.deepEqual(resizeFrame(sq, "se", { x: 20, y: 10 }, { fromCenter: true }), box(100, 100, 140, 120));
    assert.deepEqual(resizeFrame(sq, "e", { x: 10, y: 0 }, { fromCenter: true, aspect: true }), box(100, 100, 120, 120));
  });

  it("a drag past the opposite edge stops at the minimum instead of flipping (18-19)", () => {
    assert.equal(resizeFrame(sq, "e", { x: -500, y: 0 }).w, MIN_SIZE);
    assert.equal(resizeFrame(sq, "nw", { x: 500, y: 500 }).h, MIN_SIZE);
  });

  it("a rotated box grows along its own edges (20-21)", () => {
    // 90 degrees: the box's own x axis points down the screen
    const r = resizeFrame(box(100, 100, 100, 40, 90), "e", { x: 0, y: 20 });
    assert.equal(r.w, 120);
    assert.equal(r.cx, 100);
    assert.equal(r.cy, 110);
    assert.equal(r.rot, 90);
    const r2 = resizeFrame(box(100, 100, 100, 100, 180), "nw", { x: 10, y: 0 });
    assert.deepEqual([r2.w, r2.h, r2.cx, r2.cy], [110, 100, 105, 100]); // turned half way round, its "nw" corner is the world's bottom-right: the top-left stays
  });

  it("a group resize scales every member with the frame (22-24)", () => {
    const a = box(60, 60, 20, 20);
    const b = box(140, 140, 20, 20);
    const frame = unionBox([a, b])!;
    assert.deepEqual(frame, box(100, 100, 100, 100));
    const out = resizeBoxes([a, b], frame, "se", { x: 100, y: 100 });
    assert.deepEqual(out, [box(70, 70, 40, 40), box(230, 230, 40, 40)]);
    assert.deepEqual(resizeBoxes([a, b], frame, "e", { x: 50, y: 0 }), [box(65, 60, 30, 20), box(185, 140, 30, 20)]);
    // a single selection's frame is its own box
    assert.deepEqual(resizeBoxes([sq], sq, "se", { x: 10, y: 10 }), [box(105, 105, 110, 110)]);
  });

  it("rotations (25-29): by a drag angle, snapped to 15 degrees, a group about its centre", () => {
    assert.equal(rotationDelta({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }), 90);
    assert.ok(Math.abs(rotationDelta({ x: 0, y: 0 }, { x: -10, y: 1 }, { x: -10, y: -1 })) < 20, "the short way round, across the 180 degree seam");
    assert.deepEqual(rotateBoxes([sq], { x: 100, y: 100 }, 20), [box(100, 100, 100, 100, 20)]);
    assert.deepEqual(rotateBoxes([sq], { x: 100, y: 100 }, 22, true), [box(100, 100, 100, 100, 15)]);
    assert.deepEqual(rotateBoxes([box(100, 100, 40, 40, 10)], { x: 100, y: 100 }, 100, true), [box(100, 100, 40, 40, 105)]);
    const group = rotateBoxes([box(0, 0, 10, 10), box(100, 0, 10, 10)], { x: 50, y: 0 }, 180);
    assert.deepEqual(group, [box(100, 0, 10, 10, 180), box(0, 0, 10, 10, 180)]);
  });

  it("the union box is the axis-aligned bounds of rotated members, and handles sit on the corners and edge midpoints (30)", () => {
    const u = unionBox([box(0, 0, 100, 10, 90), box(0, 0, 10, 10)])!;
    assert.deepEqual([u.cx, u.cy, Math.round(u.w), Math.round(u.h)], [0, 0, 10, 100]);
    const h = handlePoints(box(100, 100, 100, 60, 90));
    assert.deepEqual(Object.fromEntries(Object.entries(h).map(([k, p]) => [k, [Math.round(p.x), Math.round(p.y)]])), {
      nw: [130, 50], n: [130, 100], ne: [130, 150], e: [100, 150], se: [70, 150], s: [70, 100], sw: [70, 50], w: [100, 50],
    });
    assert.equal(corners(sq).length, 4);
    assert.equal(snapAngle(52), 45);
    assert.equal(snapAngle(-52), -45);
  });
});

describe("Phase 27: parameter handles", () => {
  const rectBox = box(100, 100, 200, 100);

  it("a rectangle has a corner-radius handle that moves with the radius and clamps to half the short side", () => {
    const [h] = paramHandles("rectangle", rectBox, { "shape.cornerRadius": 8 });
    assert.deepEqual(h.at, { x: 20, y: 12 });
    assert.equal(paramValue(h, rectBox, { x: 100 - 100 + 40, y: 52 }, 8, { x: 0, y: 0 }), 28); // local x 40 - 12
    assert.equal(paramValue(h, rectBox, { x: 0, y: 0 }, 8, { x: 0, y: 0 }), 0);
    assert.equal(paramValue(h, rectBox, { x: 400, y: 52 }, 8, { x: 0, y: 0 }), 50);
  });

  it("a star has an inner-radius handle on its vertical axis and a points handle; a polygon a sides handle", () => {
    const starBox = box(100, 100, 100, 100);
    const [inner, count] = paramHandles("star", starBox, { "shape.innerRadius": 0.5, "shape.points": 5 });
    assert.deepEqual(inner.at, { x: 50, y: 25 });
    assert.equal(paramValue(inner, starBox, { x: 100, y: 75 }, 0.5, { x: 0, y: 0 }), 0.5);
    assert.equal(paramValue(inner, starBox, { x: 100, y: 55 }, 0.5, { x: 0, y: 0 }), 0.9);
    assert.equal(paramValue(inner, starBox, { x: 100, y: 500 }, 0.5, { x: 0, y: 0 }), 0.05);
    assert.equal(paramValue(count, starBox, { x: 100 + 48, y: 0 }, 5, { x: 100, y: 0 }), 7);
    assert.equal(paramValue(count, starBox, { x: 100 - 400, y: 0 }, 5, { x: 100, y: 0 }), 3);
    const [sides] = paramHandles("polygon", starBox, { "shape.sides": 6 });
    assert.equal(paramValue(sides, starBox, { x: 100 + 24, y: 0 }, 6, { x: 100, y: 0 }), 7);
    assert.equal(paramValue(sides, starBox, { x: 100 + 2000, y: 0 }, 6, { x: 100, y: 0 }), 64);
    assert.deepEqual(paramHandles("text", starBox, {}), []);
  });

  it("handle positions follow the box's rotation", () => {
    const rotated = box(100, 100, 100, 100, 90);
    const [h] = paramHandles("polygon", rotated, { "shape.sides": 6 });
    const w = paramHandleWorld(rotated, h);
    assert.ok(Math.abs(w.x - 162) < 0.01 && Math.abs(w.y - 100) < 0.01, JSON.stringify(w)); // the top edge points right after a quarter turn; the handle is 12 past it
  });
});
