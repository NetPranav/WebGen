import test from "node:test";
import assert from "node:assert/strict";
import { SplineSolver } from "../SplineSolver";
import { WasmBridge } from "../WasmBridge";

test("Sub-Phase 7.4: SVG Path Arc-Length LUT & Uniform Path Sampler", async (t) => {
  await t.test("buildSvgPathArcLengthTable computes accurate totalLength for straight lines and rectangles", () => {
    // 1. Single straight line of 100px
    const linePath = "M 0 0 L 100 0";
    const lineTable = SplineSolver.buildSvgPathArcLengthTable(linePath);

    assert.equal(lineTable.segments.length, 1);
    assert.ok(Math.abs(lineTable.totalLength - 100) < 0.05, `Expected 100, got ${lineTable.totalLength}`);
    assert.equal(lineTable.isClosed, false);

    // 2. Closed square: 100 x 100 (total perimeter = 400)
    const squarePath = "M 0 0 L 100 0 L 100 100 L 0 100 Z";
    const squareTable = SplineSolver.buildSvgPathArcLengthTable(squarePath);

    assert.equal(squareTable.segments.length, 4);
    assert.ok(Math.abs(squareTable.totalLength - 400) < 0.2, `Expected 400, got ${squareTable.totalLength}`);
    assert.equal(squareTable.isClosed, true);
  });

  await t.test("Constant Perceived Speed: Arc length increments remain uniform regardless of path curvature", () => {
    // Complex hand-drawn style path: sharp line + curved bezier + loop
    const complexPath = "M 0 0 L 100 0 C 150 50, 200 -50, 250 0 C 300 50, 350 100, 400 0";
    const table = SplineSolver.buildSvgPathArcLengthTable(complexPath);
    assert.ok(table.totalLength > 400);

    const steps = 40;
    const deltaS = 1.0 / steps;
    const expectedSegmentDistance = table.totalLength * deltaS;

    let prevDistance = 0;
    let prevPoint = SplineSolver.sampleSvgPathUniform(complexPath, 0);

    for (let i = 1; i <= steps; i++) {
      const s = i * deltaS;
      const sample = SplineSolver.getSvgPathPointAndTangent(complexPath, s);
      const arcDelta = sample.distance - prevDistance;

      // 1. Verify exact arc length traveled matches expected step within 0.1%
      assert.ok(
        Math.abs(arcDelta - expectedSegmentDistance) < 0.05,
        `Step ${i} arc delta: expected ${expectedSegmentDistance}, got ${arcDelta}`
      );

      // 2. Verify chord distance is close to arc distance (within 15% for curved segments)
      const chordDist = Math.hypot(sample.point.x - prevPoint.x, sample.point.y - prevPoint.y);
      assert.ok(
        chordDist <= arcDelta * 1.05 && chordDist >= arcDelta * 0.80,
        `Step ${i} chord ${chordDist.toFixed(2)} vs arc ${arcDelta.toFixed(2)}`
      );

      prevDistance = sample.distance;
      prevPoint = sample.point;
    }
  });

  await t.test("Tangent, Normal and Angle computation along oriented paths", () => {
    // 1. Horizontal line moving East (0 degrees)
    const eastPath = "M 0 0 L 200 0";
    const eastSample = SplineSolver.getSvgPathPointAndTangent(eastPath, 0.5);
    assert.ok(Math.abs(eastSample.point.x - 100) < 0.05);
    assert.ok(Math.abs(eastSample.point.y - 0) < 0.05);
    assert.ok(Math.abs(eastSample.tangent.x - 1.0) < 0.001);
    assert.ok(Math.abs(eastSample.tangent.y - 0.0) < 0.001);
    assert.ok(Math.abs(eastSample.angleDeg - 0) < 0.01);

    // 2. Vertical line moving South (90 degrees)
    const southPath = "M 50 0 L 50 300";
    const southSample = SplineSolver.getSvgPathPointAndTangent(southPath, 0.5);
    assert.ok(Math.abs(southSample.point.x - 50) < 0.05);
    assert.ok(Math.abs(southSample.point.y - 150) < 0.05);
    assert.ok(Math.abs(southSample.tangent.x - 0.0) < 0.001);
    assert.ok(Math.abs(southSample.tangent.y - 1.0) < 0.001);
    assert.ok(Math.abs(southSample.angleDeg - 90) < 0.01);

    // 3. Normal is perpendicular to tangent (dot product === 0)
    const dotProduct =
      southSample.tangent.x * southSample.normal.x +
      southSample.tangent.y * southSample.normal.y;
    assert.ok(Math.abs(dotProduct) < 0.0001);
  });

  await t.test("sampleSvgPathUniformPoints produces N uniformly distributed points", () => {
    const sCurve = "M 0 0 C 0 100, 100 100, 100 0";
    const points = SplineSolver.sampleSvgPathUniformPoints(sCurve, 11);

    assert.equal(points.length, 11);
    assert.ok(Math.abs(points[0].x - 0) < 0.05 && Math.abs(points[0].y - 0) < 0.05);
    assert.ok(Math.abs(points[10].x - 100) < 0.05 && Math.abs(points[10].y - 0) < 0.05);

    // Point 5 should be exactly midway at s=0.5
    const midSample = SplineSolver.sampleSvgPathUniform(sCurve, 0.5);
    assert.ok(Math.abs(points[5].x - midSample.x) < 0.01);
    assert.ok(Math.abs(points[5].y - midSample.y) < 0.01);
  });

  await t.test("Boundary clamping and empty path edge cases", () => {
    const path = "M 10 20 L 110 20";

    // s < 0 clamped to start
    const underflow = SplineSolver.sampleSvgPathUniform(path, -0.5);
    assert.ok(Math.abs(underflow.x - 10) < 0.01);
    assert.ok(Math.abs(underflow.y - 20) < 0.01);

    // s > 1 clamped to end
    const overflow = SplineSolver.sampleSvgPathUniform(path, 1.5);
    assert.ok(Math.abs(overflow.x - 110) < 0.01);
    assert.ok(Math.abs(overflow.y - 20) < 0.01);

    // Empty path produces fallback point
    const emptySample = SplineSolver.getSvgPathPointAndTangent("", 0.5);
    assert.equal(emptySample.distance, 0);
    assert.equal(emptySample.angleDeg, 0);
  });

  await t.test("WasmBridge parity for SVG path sampling", () => {
    const bridge = WasmBridge.getInstance();
    const solver = bridge.getSplineSolver();

    const path = "M 0 0 C 50 100, 150 -50, 200 50";
    const directPoint = SplineSolver.sampleSvgPathUniform(path, 0.7);
    const bridgePoint = solver.sampleSvgPathUniform(path, 0.7);

    assert.equal(directPoint.x, bridgePoint.x);
    assert.equal(directPoint.y, bridgePoint.y);

    const directTangent = SplineSolver.getSvgPathPointAndTangent(path, 0.7);
    const bridgeTangent = solver.getSvgPathPointAndTangent(path, 0.7);

    assert.equal(directTangent.angleDeg, bridgeTangent.angleDeg);
    assert.equal(directTangent.distance, bridgeTangent.distance);
  });
});
