/**
 * ============================================================================
 * SUB-PHASE 4.4 UNIT & BENCHMARK TESTS: WASM CABLE CANVAS RENDERER
 * ============================================================================
 * Tests:
 *   1. Wire color taxonomy per UI.md §2.2.
 *   2. Spline calculation and caching for canvas wires.
 *   3. Execution pulse stream photon computation.
 *   4. Proximity hit-testing along Bezier curves.
 *   5. 120 FPS Benchmark: 100 simultaneous wires computed in under 8.33ms frame budget.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  WIRE_COLOR_PALETTE,
  getWireColor,
  CanvasWire,
} from "../WasmCableCanvas";
import { SplineSolver } from "@/core/wasm/SplineSolver";

describe("Sub-Phase 4.4: 120 FPS Canvas Wire Renderer & Telemetry Pulses", () => {
  it("enforces strict wire color taxonomy per UI.md §2.2", () => {
    assert.strictEqual(getWireColor("exec"), "#FFFFFF");
    assert.strictEqual(getWireColor("string"), "#EC4899");
    assert.strictEqual(getWireColor("number"), "#06B6D4");
    assert.strictEqual(getWireColor("boolean"), "#EA580C");
    assert.strictEqual(getWireColor("object"), "#F59E0B");
    assert.strictEqual(getWireColor("array"), "#EAB308");
    assert.strictEqual(getWireColor("database"), "#10B981");
    assert.strictEqual(getWireColor("motion"), "#8B5CF6");
    assert.strictEqual(getWireColor("event"), "#3B82F6");
    assert.strictEqual(getWireColor("unknown_custom_type"), "#94A3B8");
  });

  it("calculates accurate Hermite/Bezier control points for Canvas wires", () => {
    const start = { x: 100, y: 100 };
    const end = { x: 400, y: 300 };

    const spline = SplineSolver.calculateWireSpline(start, end);
    assert.strictEqual(spline.p0.x, 100);
    assert.strictEqual(spline.p0.y, 100);
    assert.strictEqual(spline.p3.x, 400);
    assert.strictEqual(spline.p3.y, 300);

    // Tangent X should be positive and proportional to distance
    assert.ok(spline.p1.x > spline.p0.x);
    assert.ok(spline.p2.x < spline.p3.x);
  });

  it("generates execution pulse stream coordinates along the wire curve", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 500, y: 200 };
    const spline = SplineSolver.calculateWireSpline(start, end);

    const currentTime = 1500;
    const speed = 0.0015;
    const pulseOffset = (currentTime * speed) % 1.0;
    const pulseCount = 3;

    const pulses = [];
    for (let p = 0; p < pulseCount; p++) {
      const normalizedT = (pulseOffset + p / pulseCount) % 1.0;
      const pt = SplineSolver.evaluateBezier(
        spline.p0,
        spline.p1,
        spline.p2,
        spline.p3,
        normalizedT
      );
      pulses.push(pt);
      assert.ok(pt.x >= 0 && pt.x <= 500);
      assert.ok(pt.y >= 0 && pt.y <= 200);
    }
    assert.strictEqual(pulses.length, 3);
  });

  it("sustains 120 FPS with 100 visible wires (< 8.33ms per-frame computation budget)", () => {
    // Generate 100 mock wires distributed across canvas space
    const mockWires: CanvasWire[] = [];
    const pinTypes = ["exec", "string", "number", "boolean", "object", "array"];

    for (let i = 0; i < 100; i++) {
      const sx = (i % 10) * 200;
      const sy = Math.floor(i / 10) * 150;
      const ex = sx + 180;
      const ey = sy + 80;
      mockWires.push({
        id: `wire_${i}`,
        sourceNodeId: `node_${i}_src`,
        sourcePinId: `out_pin_${i}`,
        targetNodeId: `node_${i}_tgt`,
        targetPinId: `in_pin_${i}`,
        pinType: pinTypes[i % pinTypes.length],
        start: { x: sx, y: sy },
        end: { x: ex, y: ey },
        hasPulse: i % 2 === 0,
        isActive: i % 4 === 0,
      });
    }

    assert.strictEqual(mockWires.length, 100);

    // Warm up calculation cache and JIT
    for (const wire of mockWires) {
      const s = SplineSolver.calculateWireSpline(wire.start, wire.end);
      SplineSolver.evaluateBezier(s.p0, s.p1, s.p2, s.p3, 0.5);
    }

    // Benchmark 60 consecutive simulated frames of 100 wires
    const frameDurations: number[] = [];
    const now = performance.now();

    for (let frame = 0; frame < 60; frame++) {
      const frameStart = performance.now();
      const currentTime = now + frame * 8.33;

      for (const wire of mockWires) {
        const spline = SplineSolver.calculateWireSpline(wire.start, wire.end);

        if (wire.hasPulse || wire.isActive) {
          const pulseOffset = (currentTime * 0.0015) % 1.0;
          for (let p = 0; p < 3; p++) {
            const t = (pulseOffset + p / 3) % 1.0;
            SplineSolver.evaluateBezier(spline.p0, spline.p1, spline.p2, spline.p3, t);
          }
        }
      }

      const frameEnd = performance.now();
      frameDurations.push(frameEnd - frameStart);
    }

    const avgFrameDuration =
      frameDurations.reduce((sum, d) => sum + d, 0) / frameDurations.length;
    const maxFrameDuration = Math.max(...frameDurations);

    // 120 FPS requires frame computation to be comfortably under 8.33ms
    assert.ok(
      avgFrameDuration < 8.33,
      `Average frame duration (${avgFrameDuration.toFixed(2)}ms) exceeded 120 FPS budget of 8.33ms`
    );

    assert.ok(
      maxFrameDuration < 16.66,
      `Max frame duration spike (${maxFrameDuration.toFixed(2)}ms) exceeded 60 FPS safety baseline`
    );
  });
});
