/**
 * ============================================================================
 * C++ WEBASSEMBLY CURVE EDITOR & SPRING DYNAMICS TEST SUITE
 * ============================================================================
 * Architecture Ref: ROADMAP.md Sub-Phase 4.2, PANELS.md §Panel 06
 * Validates:
 *   1. C++ Wasm SplineSolver cubic bezier evaluation & arc length parameterization
 *   2. Bezier preset mathematical definitions
 *   3. Framer Motion spring harmonic oscillation convergence
 * ============================================================================
 */

if (typeof require !== "undefined" && require.extensions) {
  require.extensions[".css"] = () => ({});
}

import { describe, it } from "node:test";
import assert from "node:assert";
import { SplineSolver } from "@/core/wasm/SplineSolver";
import { simulateSpringPoints } from "../SpringEditor";

describe("Phase 4.2: C++ WebAssembly Bezier Curve & Spring Editor", async () => {
  const { BEZIER_PRESETS } = await import("../CurveEditor");

  describe("SplineSolver Cubic Bezier Math Kernel", () => {
    it("should evaluate endpoints correctly at t=0 and t=1", () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 0.25, y: 1.0 };
      const p2 = { x: 0.5, y: 1.0 };
      const p3 = { x: 1, y: 1 };

      const startPt = SplineSolver.evaluateBezier(p0, p1, p2, p3, 0);
      assert.strictEqual(startPt.x, 0);
      assert.strictEqual(startPt.y, 0);

      const endPt = SplineSolver.evaluateBezier(p0, p1, p2, p3, 1);
      assert.strictEqual(endPt.x, 1);
      assert.strictEqual(endPt.y, 1);
    });

    it("should compute arc length table and strictly positive length", () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 0.25, y: 1.0 };
      const p2 = { x: 0.5, y: 1.0 };
      const p3 = { x: 1, y: 1 };

      const table = SplineSolver.buildArcLengthTable(p0, p1, p2, p3, 64);
      assert.ok(table.totalLength > 1.0, "Cubic bezier arc length should exceed straight-line distance");
      assert.strictEqual(table.tSamples.length, 65);
    });

    it("should format valid SVG path with cubic bezier command (C)", () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 25, y: 100 };
      const p2 = { x: 50, y: 100 };
      const p3 = { x: 100, y: 100 };

      const path = SplineSolver.formatSvgPath(p0, p1, p2, p3);
      assert.ok(path.startsWith("M 0.0 0.0 C 25.0 100.0, 50.0 100.0, 100.0 100.0"));
    });
  });

  describe("Bezier Presets Registry", () => {
    it("should provide valid control points for standard easing curves", () => {
      assert.ok(BEZIER_PRESETS.power2Out);
      assert.ok(BEZIER_PRESETS.power4InOut);
      assert.ok(BEZIER_PRESETS.elasticOut);
      assert.ok(BEZIER_PRESETS.bounceOut);
      assert.ok(BEZIER_PRESETS.anticipate);

      // Verify coordinate ranges
      for (const [key, preset] of Object.entries(BEZIER_PRESETS)) {
        assert.ok(preset.p1.x >= 0 && preset.p1.x <= 1, `${key} p1.x must be within [0, 1]`);
        assert.ok(preset.p2.x >= 0 && preset.p2.x <= 1, `${key} p2.x must be within [0, 1]`);
      }
    });
  });

  describe("Spring Dynamics Oscillation Simulation", () => {
    it("should start at 0 displacement and settle near target 1.0", () => {
      const points = simulateSpringPoints(120, 12, 1, 2.0, 120);
      assert.strictEqual(points[0].x, 0);

      const finalPt = points[points.length - 1];
      assert.ok(
        Math.abs(finalPt.x - 1.0) < 0.05,
        `Spring should settle near 1.0, got ${finalPt.x}`
      );
    });

    it("should exhibit overshoot in underdamped configuration", () => {
      const points = simulateSpringPoints(250, 6, 1, 2.0, 120);
      const maxDisplacement = Math.max(...points.map((p) => p.x));
      assert.ok(
        maxDisplacement > 1.1,
        `Underdamped spring should overshoot 1.0, peak was ${maxDisplacement}`
      );
    });
  });
});
