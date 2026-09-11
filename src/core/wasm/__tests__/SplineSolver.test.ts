import { describe, it } from "node:test";
import assert from "node:assert";
import { SplineSolver } from "../SplineSolver";

describe("Phase 4: C++ & TypeScript SplineSolver Wire Connection", () => {
  it("calculates forward cubic Bezier wire with Unreal Engine tangent scaling", () => {
    const start = { x: 100, y: 200 };
    const end = { x: 400, y: 250 };

    const result = SplineSolver.calculateWireSpline(start, end);

    assert.strictEqual(result.p0.x, 100);
    assert.strictEqual(result.p0.y, 200);
    assert.strictEqual(result.p3.x, 400);
    assert.strictEqual(result.p3.y, 250);

    // DeltaX = 300, tension = 0.5 => tangent = 150
    assert.strictEqual(result.p1.x, 250);
    assert.strictEqual(result.p1.y, 200);
    assert.strictEqual(result.p2.x, 250);
    assert.strictEqual(result.p2.y, 250);

    assert.ok(result.path.startsWith("M 100.0 200.0"));
    assert.ok(result.path.includes("C 250.0 200.0, 250.0 250.0, 400.0 250.0"));
    assert.ok(result.approximateLength > 300);
  });

  it("clamps to minTangent when pins are close together", () => {
    const start = { x: 100, y: 100 };
    const end = { x: 120, y: 100 }; // DeltaX = 20 < 45

    const result = SplineSolver.calculateWireSpline(start, end, { minTangent: 45 });

    assert.strictEqual(result.p1.x, 145);
    assert.strictEqual(result.p2.x, 75);
  });

  it("handles reverse loop connections gracefully without cutting through nodes", () => {
    const start = { x: 500, y: 200 };
    const end = { x: 200, y: 210 }; // Target is behind source

    const result = SplineSolver.calculateWireSpline(start, end);

    // Control point 1 pushes rightward out of source
    assert.ok(result.p1.x > start.x);
    // Control point 2 pulls leftward into target
    assert.ok(result.p2.x < end.x);
  });

  it("evaluates intermediate points along cubic Bezier accurately", () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 100, y: 0 };
    const p2 = { x: 100, y: 100 };
    const p3 = { x: 200, y: 100 };

    const mid = SplineSolver.evaluateBezier(p0, p1, p2, p3, 0.5);
    assert.strictEqual(mid.x, 100);
    assert.strictEqual(mid.y, 50);
  });

  it("builds monotonic ArcLengthTable and inverts parameter accurately", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 400, y: 300 };

    const result = SplineSolver.calculateWireSpline(start, end);
    const table = result.arcLengthTable;

    assert.strictEqual(table.tSamples.length, 65);
    assert.strictEqual(table.arcLengths.length, 65);
    assert.strictEqual(table.arcLengths[0], 0);
    assert.ok(table.totalLength > 500);

    for (let i = 1; i < table.arcLengths.length; i++) {
      assert.ok(table.arcLengths[i] > table.arcLengths[i - 1]);
    }

    const t0 = SplineSolver.getTForNormalizedArcLength(table, 0);
    const t1 = SplineSolver.getTForNormalizedArcLength(table, 1);
    assert.ok(Math.abs(t0 - 0) < 0.001);
    assert.ok(Math.abs(t1 - 1) < 0.001);

    const pt0 = SplineSolver.evaluateUniformAt(result.p0, result.p1, result.p2, result.p3, table, 0);
    const pt1 = SplineSolver.evaluateUniformAt(result.p0, result.p1, result.p2, result.p3, table, 1);
    assert.ok(Math.abs(pt0.x - start.x) < 0.01 && Math.abs(pt0.y - start.y) < 0.01);
    assert.ok(Math.abs(pt1.x - end.x) < 0.01 && Math.abs(pt1.y - end.y) < 0.01);
  });

  it("samples uniformly spaced points for wire pulses and Verlet physics", () => {
    const start = { x: 50, y: 50 };
    const end = { x: 500, y: 150 };

    const result = SplineSolver.calculateWireSpline(start, end);
    const sampleCount = 11;

    const points = SplineSolver.sampleUniformPoints(
      result.p0,
      result.p1,
      result.p2,
      result.p3,
      sampleCount,
      result.arcLengthTable
    );

    assert.strictEqual(points.length, sampleCount);
    assert.ok(Math.abs(points[0].x - start.x) < 0.01 && Math.abs(points[0].y - start.y) < 0.01);
    assert.ok(Math.abs(points[sampleCount - 1].x - end.x) < 0.01 && Math.abs(points[sampleCount - 1].y - end.y) < 0.01);

    const expectedSegment = result.approximateLength / (sampleCount - 1);
    for (let i = 1; i < points.length; i++) {
      const chord = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      assert.ok(chord > expectedSegment * 0.85 && chord <= expectedSegment * 1.05);
    }
  });
});
