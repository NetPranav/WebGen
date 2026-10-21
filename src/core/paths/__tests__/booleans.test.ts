import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { booleanShapes, flatten, resultArea, ringsToPathData, type ShapeRings } from "../booleans";
import { ellipseSubPath, rectSubPath } from "../pathData";

const rect = (x: number, y: number, w: number, h: number): ShapeRings => ({ rings: [flatten(rectSubPath(x, y, w, h).nodes)] });
const circle = (cx: number, cy: number, r: number): ShapeRings => ({ rings: [flatten(ellipseSubPath(cx, cy, r, r).nodes)] });
const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not ${b}`);

// Two 100 x 100 squares, the second shifted by 50 in each direction: overlap 50 x 50.
const A = rect(0, 0, 100, 100);
const B = rect(50, 50, 100, 100);

describe("Phase 40: boolean golden tests", () => {
  it("union of overlapping squares: 10000 + 10000 - 2500", () => {
    const r = booleanShapes("union", [A, B]);
    assert.equal(r.length, 1);
    close(resultArea(r), 17500);
  });

  it("subtract takes the second out of the first: an L of 7500", () => {
    const r = booleanShapes("subtract", [A, B]);
    close(resultArea(r), 7500);
    assert.equal(r[0][0].length, 6);
  });

  it("subtract in the other order is a different L", () => {
    const r = booleanShapes("subtract", [B, A]);
    close(resultArea(r), 7500);
    assert.ok(r[0][0].some((p) => p.x === 150 && p.y === 150));
  });

  it("intersect is the 50 x 50 overlap", () => {
    const r = booleanShapes("intersect", [A, B]);
    close(resultArea(r), 2500);
    assert.deepEqual(r[0][0].map((p) => [p.x, p.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), [[50, 50], [50, 100], [100, 50], [100, 100]]);
  });

  it("exclude is everything but the overlap: two L shapes", () => {
    close(resultArea(booleanShapes("exclude", [A, B])), 15000);
  });

  it("disjoint shapes: union keeps both, intersect is empty", () => {
    const far = rect(500, 500, 10, 10);
    assert.equal(booleanShapes("union", [A, far]).length, 2);
    assert.deepEqual(booleanShapes("intersect", [A, far]), []);
  });

  it("a circle cut out of a square leaves a hole", () => {
    const r = booleanShapes("subtract", [rect(0, 0, 100, 100), circle(50, 50, 30)]);
    assert.equal(r.length, 1);
    assert.equal(r[0].length, 2); // an outline and one hole
    close(resultArea(r), 10000 - Math.PI * 900, 2);
  });

  it("a circle and a square overlapping: union area by inclusion-exclusion (circle over a corner)", () => {
    // circle radius 20 centred on the square's corner: a quarter of it is inside the square
    const u = resultArea(booleanShapes("union", [rect(0, 0, 100, 100), circle(0, 0, 20)]));
    close(u, 10000 + Math.PI * 400 * 0.75, 2);
  });

  it("three shapes: subtract removes every later one", () => {
    const r = booleanShapes("subtract", [rect(0, 0, 100, 100), rect(0, 0, 50, 100), rect(50, 0, 50, 50)]);
    close(resultArea(r), 2500);
  });

  it("a shape with two rings is even-odd: the inner ring is a hole", () => {
    const donut: ShapeRings = { rings: [flatten(rectSubPath(0, 0, 100, 100).nodes), flatten(rectSubPath(25, 25, 50, 50).nodes)] };
    close(resultArea(booleanShapes("union", [donut, rect(500, 0, 10, 10)])), 7500 + 100);
  });

  it("one shape on its own is returned as is; subtract with nothing to cut leaves the first", () => {
    close(resultArea(booleanShapes("union", [A])), 10000);
    close(resultArea(booleanShapes("subtract", [A, { rings: [] }])), 10000);
  });

  it("writes one M…Z for each ring", () => {
    const d = ringsToPathData(booleanShapes("subtract", [rect(0, 0, 100, 100), rect(25, 25, 50, 50)]));
    assert.equal((d.match(/M/g) ?? []).length, 2);
    assert.equal((d.match(/Z/g) ?? []).length, 2);
  });
});
