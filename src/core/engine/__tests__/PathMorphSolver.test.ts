import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PathMorphSolver,
  StrokeDrawEngine,
  normalizePathToCubics,
  balanceNormalizedPaths,
  subdivideCubicBezier,
  computeCubicArcLength,
  evaluateCubicBezier,
} from "../PathMorphSolver";

describe("Sub-Phase 7.2: Path Morphing & Stroke-Draw Engine", () => {
  // Helper to generate a 12-point star SVG path
  function generate12PointStar(cx = 100, cy = 100, rOuter = 100, rInner = 45): string {
    const points: string[] = [];
    const numPoints = 24; // 12 peaks + 12 valleys
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * Math.PI) / 12 - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      const x = Math.round((cx + r * Math.cos(angle)) * 100) / 100;
      const y = Math.round((cy + r * Math.sin(angle)) * 100) / 100;
      points.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    }
    points.push("Z");
    return points.join(" ");
  }

  // Helper to generate an exact SVG circle via 4 cubic bezier segments
  function generateCircle(cx = 100, cy = 100, r = 80): string {
    const c = 0.55228475 * r;
    return [
      `M ${cx} ${cy - r}`,
      `C ${cx + c} ${cy - r}, ${cx + r} ${cy - c}, ${cx + r} ${cy}`,
      `C ${cx + r} ${cy + c}, ${cx + c} ${cy + r}, ${cx} ${cy + r}`,
      `C ${cx - c} ${cy + r}, ${cx - r} ${cy + c}, ${cx - r} ${cy}`,
      `C ${cx - r} ${cy - c}, ${cx - c} ${cy - r}, ${cx} ${cy - r}`,
      "Z",
    ].join(" ");
  }

  describe("1. Cubic Bezier Math & Subdivision", () => {
    it("evaluates points on cubic bezier accurately", () => {
      const p0 = { x: 0, y: 0 };
      const cp1 = { x: 0, y: 100 };
      const cp2 = { x: 100, y: 100 };
      const p1 = { x: 100, y: 0 };

      const start = evaluateCubicBezier(p0, cp1, cp2, p1, 0);
      assert.deepStrictEqual(start, { x: 0, y: 0 });

      const mid = evaluateCubicBezier(p0, cp1, cp2, p1, 0.5);
      assert.strictEqual(mid.x, 50);
      assert.strictEqual(mid.y, 75);

      const end = evaluateCubicBezier(p0, cp1, cp2, p1, 1);
      assert.deepStrictEqual(end, { x: 100, y: 0 });
    });

    it("computes arc length of straight line represented as cubic bezier", () => {
      const p0 = { x: 0, y: 0 };
      const cp1 = { x: 33.333, y: 0 };
      const cp2 = { x: 66.666, y: 0 };
      const p1 = { x: 100, y: 0 };

      const length = computeCubicArcLength(p0, cp1, cp2, p1);
      assert.ok(Math.abs(length - 100) < 0.05);
    });

    it("subdivides cubic curve via de Casteljau without changing total shape", () => {
      const p0 = { x: 0, y: 0 };
      const cp1 = { x: 20, y: 80 };
      const cp2 = { x: 80, y: 80 };
      const p1 = { x: 100, y: 0 };

      const [left, right] = subdivideCubicBezier(p0, cp1, cp2, p1, 0.5);

      assert.deepStrictEqual(left.p0, p0);
      assert.deepStrictEqual(left.p1, right.p0);
      assert.deepStrictEqual(right.p1, p1);

      // Midpoint on split curves matches original curve midpoint
      const origMid = evaluateCubicBezier(p0, cp1, cp2, p1, 0.5);
      assert.ok(Math.abs(left.p1.x - origMid.x) < 1e-4);
      assert.ok(Math.abs(left.p1.y - origMid.y) < 1e-4);
    });
  });

  describe("2. Path Normalization & Balancing", () => {
    it("normalizes polygon lines, horiz, vert, and quad curves to cubic segments", () => {
      const d = "M 0 0 L 100 0 V 50 H 50 Q 25 100 0 50 Z";
      const normalized = normalizePathToCubics(d);

      assert.strictEqual(normalized.segments.length, 5);
      assert.strictEqual(normalized.isClosed, true);
      assert.ok(normalized.totalLength > 200);
    });

    it("balances segment counts between paths of differing point counts", () => {
      const simpleLine = "M 0 0 L 100 100"; // 1 segment
      const quadCurve = "M 0 0 Q 50 100 100 100 Q 150 0 200 0"; // 2 segments

      const normA = normalizePathToCubics(simpleLine);
      const normB = normalizePathToCubics(quadCurve);

      const [segsA, segsB] = balanceNormalizedPaths(normA, normB);
      assert.strictEqual(segsA.length, segsB.length);
      assert.strictEqual(segsA.length, 2);
    });
  });

  describe("3. Visual-Popping-Free Path Morphing (12-Point Star to Circle)", () => {
    const starD = generate12PointStar(100, 100, 100, 45);
    const circleD = generateCircle(100, 100, 80);

    it("matches source path geometry at t=0 and target geometry at t=1", () => {
      const morph0 = PathMorphSolver.morph(starD, circleD, 0);
      const morph1 = PathMorphSolver.morph(starD, circleD, 1);

      const normStar = normalizePathToCubics(starD);
      const normCircle = normalizePathToCubics(circleD);
      const norm0 = normalizePathToCubics(morph0);
      const norm1 = normalizePathToCubics(morph1);

      assert.ok(Math.abs(norm0.totalLength - normStar.totalLength) < 1.0);
      assert.ok(Math.abs(norm1.totalLength - normCircle.totalLength) < 1.0);
      assert.strictEqual(norm0.segments.length, norm1.segments.length);
    });

    it("produces valid SVG path data at spot-check steps t=0.25, t=0.5, t=0.75 without NaN", () => {
      const steps = [0.25, 0.5, 0.75];

      for (const t of steps) {
        const morphed = PathMorphSolver.morph(starD, circleD, t);

        assert.ok(typeof morphed === "string", `Output at t=${t} must be a string`);
        assert.ok(morphed.startsWith("M "), `Output at t=${t} must begin with M command`);
        assert.ok(morphed.includes("C "), `Output at t=${t} must contain cubic Bezier C commands`);
        assert.ok(morphed.endsWith("Z"), `Output at t=${t} must preserve closed path Z`);
        assert.strictEqual(morphed.includes("NaN"), false, `Output at t=${t} must not contain NaN`);
        assert.strictEqual(morphed.includes("undefined"), false, `Output at t=${t} must not contain undefined`);

        // Check that path can be re-normalized cleanly
        const parsed = normalizePathToCubics(morphed);
        assert.ok(parsed.segments.length >= 24, "Morphed path preserves normalized 24+ segment density");
      }
    });

    it("verifies smooth coordinate progression with zero visual popping or discontinuities", () => {
      // Sample fine steps from t=0 to t=1 in 0.05 increments
      const samples: string[] = [];
      for (let t = 0; t <= 1.001; t += 0.05) {
        samples.push(PathMorphSolver.morph(starD, circleD, t));
      }

      // Verify that every step parses and has identical segment counts
      const parsedSamples = samples.map((d) => normalizePathToCubics(d));
      const targetSegCount = parsedSamples[0].segments.length;

      for (let i = 0; i < parsedSamples.length; i++) {
        assert.strictEqual(
          parsedSamples[i].segments.length,
          targetSegCount,
          `Segment count at sample ${i} should be consistent`
        );
      }

      // Verify maximum vertex coordinate jump between consecutive 0.05 steps is small and continuous
      for (let i = 1; i < parsedSamples.length; i++) {
        const prev = parsedSamples[i - 1];
        const curr = parsedSamples[i];

        for (let s = 0; s < targetSegCount; s++) {
          const dx = Math.abs(curr.segments[s].p1.x - prev.segments[s].p1.x);
          const dy = Math.abs(curr.segments[s].p1.y - prev.segments[s].p1.y);

          // With 100px radius and 0.05 step, max expected movement is under 15px
          assert.ok(
            dx < 15,
            `Step ${i} segment ${s} dx (${dx}) exceeded smooth threshold, indicates popping`
          );
          assert.ok(
            dy < 15,
            `Step ${i} segment ${s} dy (${dy}) exceeded smooth threshold, indicates popping`
          );
        }
      }
    });

    it("generates discrete morph animation samples", () => {
      const keyframes = PathMorphSolver.generateMorphSamples(starD, circleD, 4);
      assert.strictEqual(keyframes.length, 5);
      assert.strictEqual(keyframes[0].offset, 0);
      assert.strictEqual(keyframes[1].offset, 25);
      assert.strictEqual(keyframes[2].offset, 50);
      assert.strictEqual(keyframes[3].offset, 75);
      assert.strictEqual(keyframes[4].offset, 100);
    });
  });

  describe("4. Stroke-Draw Engine & Arc-Length Integration", () => {
    it("computes accurate path length for known geometric primitives", () => {
      // 100x100 square with perimeter 400
      const squareD = "M 0 0 H 100 V 100 H 0 Z";
      const squareLen = StrokeDrawEngine.computePathLength(squareD);
      assert.ok(
        Math.abs(squareLen - 400) < 1.0,
        `Expected square perimeter ~400, got ${squareLen}`
      );

      // Circle with radius 50 -> circumference 2 * pi * 50 = 314.159
      const circleD = generateCircle(50, 50, 50);
      const circleLen = StrokeDrawEngine.computePathLength(circleD);
      assert.ok(
        Math.abs(circleLen - 314.16) < 2.0,
        `Expected circle circumference ~314.16, got ${circleLen}`
      );
    });

    it("computes stroke-dashoffset transitions for line drawing on", () => {
      const pathLength = 500;

      // 0% progress -> completely hidden (offset = pathLength)
      assert.strictEqual(StrokeDrawEngine.computeStrokeDashoffset(pathLength, 0), 500);

      // 50% progress -> half drawn (offset = 250)
      assert.strictEqual(StrokeDrawEngine.computeStrokeDashoffset(pathLength, 0.5), 250);

      // 100% progress -> fully drawn (offset = 0)
      assert.strictEqual(StrokeDrawEngine.computeStrokeDashoffset(pathLength, 1.0), 0);
    });

    it("generates stroke-draw keyframe points", () => {
      const keyframes = StrokeDrawEngine.generateStrokeDrawKeyframes(450);
      assert.strictEqual(keyframes.length, 2);
      assert.strictEqual(keyframes[0].offset, 0);
      assert.strictEqual(keyframes[0].value, 450);
      assert.strictEqual(keyframes[1].offset, 100);
      assert.strictEqual(keyframes[1].value, 0);
    });

    it("generates strokeDasharray attribute string", () => {
      assert.strictEqual(StrokeDrawEngine.getStrokeDasharray(350), "350 350");
    });

    it("caches computed path lengths per elementId and supports invalidation", () => {
      const d = "M 0 0 L 100 100";
      const elemId = "svg_elem_99";

      const len1 = StrokeDrawEngine.getPathLength(d, elemId);
      assert.ok(len1 > 0);

      // Retrieve from cache
      const len2 = StrokeDrawEngine.getPathLength(d, elemId);
      assert.strictEqual(len1, len2);

      // Invalidate
      StrokeDrawEngine.invalidateCache(elemId);
      const len3 = StrokeDrawEngine.getPathLength(d, elemId);
      assert.strictEqual(len1, len3);
    });
  });
});
