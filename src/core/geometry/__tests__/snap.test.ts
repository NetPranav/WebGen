import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SNAP, distanceMarks, parseGuides, serializeGuides, snapEdges, snapMove, snapToGrid, type Guide, type SnapSettings } from "../snap";

const R = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const T = 6;
const off: SnapSettings = { objects: false, guides: false, grid: false, gridSize: 1 };

describe("Phase 28: snapping golden tests", () => {
  it("an edge within the threshold snaps to another box's edge and draws a line spanning both", () => {
    const r = snapMove(R(103, 50, 60, 40), [R(100, 200, 50, 50)], null, [], T, DEFAULT_SNAP);
    assert.equal(r.dx, -3);
    assert.equal(r.dy, 0);
    assert.deepEqual(r.lines, [{ axis: "x", pos: 100, from: 50, to: 250, kind: "object" }]);
  });

  it("outside the threshold nothing snaps", () => {
    const r = snapMove(R(110, 50, 50, 40), [R(100, 200, 50, 50)], null, [], T, DEFAULT_SNAP);
    assert.deepEqual([r.dx, r.dy, r.lines.length], [0, 0, 0]);
  });

  it("centres line up, and the closest of several candidates wins", () => {
    // every line is 1 away from a line of the first box; the box at 130 is further
    const r = snapMove(R(105, 0, 40, 10), [R(106, 100, 40, 10), R(130, 200, 10, 10)], null, [], T, DEFAULT_SNAP);
    assert.equal(r.dx, 1);
    assert.equal(r.lines[0].pos, 106); // the first of the equally close lines
  });

  it("both axes snap independently", () => {
    const r = snapMove(R(52, 98, 20, 20), [R(50, 200, 30, 30), R(300, 100, 30, 30)], null, [], T, DEFAULT_SNAP);
    assert.deepEqual([r.dx, r.dy], [-2, 2]);
  });

  it("the frame's edges and centre are targets", () => {
    const frame = R(0, 0, 400, 300);
    assert.equal(snapMove(R(3, 100, 50, 50), [], frame, [], T, DEFAULT_SNAP).dx, -3, "left edge");
    assert.equal(snapMove(R(348, 100, 50, 50), [], frame, [], T, DEFAULT_SNAP).dx, 2, "right edge");
    const centred = snapMove(R(176, 126, 50, 50), [], frame, [], T, DEFAULT_SNAP);
    assert.deepEqual([centred.dx, centred.dy], [-1, -1], "centred in the frame");
    assert.equal(centred.lines[0].kind, "frame");
  });

  it("a ruler guide is a target, and the object toggle doesn't turn it off", () => {
    const guides: Guide[] = [{ axis: "x", pos: 200 }, { axis: "y", pos: 80 }];
    const r = snapMove(R(197, 83, 30, 30), [], null, guides, T, { ...DEFAULT_SNAP, objects: false });
    assert.deepEqual([r.dx, r.dy], [3, -3]);
    assert.deepEqual(r.lines.map((l) => l.kind), ["guide", "guide"]);
    const none = snapMove(R(197, 83, 30, 30), [], null, guides, T, { ...DEFAULT_SNAP, guides: false });
    assert.deepEqual([none.dx, none.dy], [0, 0]);
  });

  it("with every toggle off nothing snaps", () => {
    const r = snapMove(R(103, 50, 40, 40), [R(100, 200, 50, 50)], R(0, 0, 400, 300), [{ axis: "x", pos: 104 }], T, off);
    assert.deepEqual([r.dx, r.dy], [0, 0]);
  });

  it("the pixel grid rounds the position", () => {
    const r = snapMove(R(10.4, 20.6, 30, 30), [], null, [], T, { ...off, grid: true, gridSize: 1 });
    assert.deepEqual([r.dx, r.dy], [-0.4, 0.4]);
    assert.equal(snapToGrid(13, 8), 16);
    assert.equal(snapMove(R(13, 20, 30, 30), [], null, [], T, { ...off, grid: true, gridSize: 8 }).dx, 3);
  });

  it("equal spacing: centred between two neighbours, with both gaps marked", () => {
    const r = snapMove(R(98, 0, 50, 50), [R(0, 0, 50, 50), R(200, 0, 50, 50)], null, [], 1, DEFAULT_SNAP);
    assert.equal(r.dx, 0, "gap 48 / 52: too far for a 1px threshold");
    const near = snapMove(R(98, 0, 50, 50), [R(0, 0, 50, 50), R(200, 0, 50, 50)], null, [], T, { ...DEFAULT_SNAP, guides: false });
    // 98 is 2 from centred (100) but also within reach of an edge line (the right neighbour's left edge is at 200,
    // 148 + 52): objects win, so check the equal-spacing case with lines that don't line up
    assert.ok(Math.abs(near.dx) <= 2);
    const spaced = snapMove(R(97, 0, 40, 50), [R(0, 0, 50, 50), R(200, 0, 50, 50)], null, [], T, DEFAULT_SNAP);
    // centred target: (50 + 200 - 40) / 2 = 105, 8 away: out of reach
    assert.equal(spaced.dx, 0);
    const reach = snapMove(R(102, 5, 40, 40), [R(0, 0, 50, 50), R(200, 0, 50, 50)], null, [], T, DEFAULT_SNAP);
    // centred: (250 - 40 - ... ) target x = (50 + 200 - 40)/2 = 105 -> dx 3
    assert.equal(reach.dx, 3);
    assert.deepEqual(reach.spacing.map((s) => [s.from, s.to, s.value]), [[50, 105, 55], [145, 200, 55]]);
  });

  it("equal spacing: repeating the gap two other boxes already have", () => {
    // A and B are 50 apart; the moving box is a hair off one gap beyond B
    const r = snapMove(R(197, 10, 30, 30), [R(0, 0, 50, 50), R(100, 0, 50, 50)], null, [], T, DEFAULT_SNAP);
    assert.equal(r.dx, 3);
    assert.equal(r.spacing.length, 2);
    assert.ok(r.spacing.every((s) => s.value === 50));
  });

  it("resize: only the dragged edges look for a target", () => {
    const e = snapEdges(R(0, 0, 98, 60), { right: true }, [R(100, 200, 50, 50)], null, [], T, DEFAULT_SNAP);
    assert.deepEqual([e.left, e.right, e.top, e.bottom], [0, 2, 0, 0]);
    assert.equal(e.lines[0].pos, 100);
    const none = snapEdges(R(0, 0, 90, 60), { right: true }, [R(100, 200, 50, 50)], null, [], T, DEFAULT_SNAP);
    assert.equal(none.right, 0);
    const bottom = snapEdges(R(0, 0, 40, 197), { bottom: true }, [], R(0, 0, 400, 200), [], T, DEFAULT_SNAP);
    assert.equal(bottom.bottom, 3);
  });

  it("the distance HUD measures to the nearest neighbour on each side and to the frame", () => {
    const marks = distanceMarks(R(100, 100, 50, 50), [R(0, 100, 40, 50), R(200, 120, 30, 10), R(110, 0, 20, 30)], R(0, 0, 400, 300));
    const by = (axis: string, from: number) => marks.find((m) => m.axis === axis && m.from === from);
    assert.equal(by("x", 40)?.value, 60); // left neighbour
    assert.equal(by("x", 150)?.value, 50); // right neighbour
    assert.equal(by("y", 30)?.value, 70); // the box above
    assert.equal(by("y", 150)?.value, 150); // down to the frame's bottom
  });

  it("guides round-trip through their stored text, and a malformed value is no guides", () => {
    const g: Guide[] = [{ axis: "x", pos: 120.456 }, { axis: "y", pos: 40 }];
    assert.deepEqual(parseGuides(serializeGuides(g)), [{ axis: "x", pos: 120.46 }, { axis: "y", pos: 40 }]);
    for (const bad of [undefined, null, 5, "", "nope", "{}", '[{"axis":"z","pos":1}]', '[{"axis":"x"}]']) assert.deepEqual(parseGuides(bad), []);
  });
});
