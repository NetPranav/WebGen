import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WasmBridge, useWasmStore } from "../WasmBridge";
import { SplineSolver } from "../SplineSolver";
import { SimdBenchmark } from "../SimdBenchmark";
import { WasmWorkerPool } from "../WasmWorkerPool";
import { WireJobInput } from "../types/worker-pool";

describe("Sub-Phase 4.7: SIMD-Vectorized Batch Spline Solver & Phase 4 Completion Gate", () => {
  // --------------------------------------------------------------------------
  // 1. Feature Detection & Store Integration
  // --------------------------------------------------------------------------
  it("should feature-detect WebAssembly SIMD128 support at runtime", () => {
    const isSimdSupported = WasmBridge.checkSimdSupport();
    assert.strictEqual(typeof isSimdSupported, "boolean");

    const bridge = WasmBridge.getInstance();
    assert.strictEqual(bridge.isSimdSupported(), isSimdSupported);

    // Toggle SIMD enable/disable state
    bridge.setSimdEnabled(false);
    assert.strictEqual(bridge.isSimdActive(), false);
    assert.strictEqual(useWasmStore.getState().isSimdEnabled, false);

    bridge.setSimdEnabled(true);
    assert.strictEqual(bridge.isSimdActive(), isSimdSupported);
  });

  // --------------------------------------------------------------------------
  // 2. Vectorized 4-Lane Arc-Length Table Parity
  // --------------------------------------------------------------------------
  it("should generate vectorized arc-length tables matching scalar precision", () => {
    const p0 = { x: 10, y: 10 };
    const p1 = { x: 120, y: 30 };
    const p2 = { x: 180, y: 220 };
    const p3 = { x: 300, y: 250 };

    const scalarTable = SplineSolver.buildArcLengthTable(p0, p1, p2, p3, 64);
    const vectorTable = SplineSolver.buildArcLengthTableVectorized(p0, p1, p2, p3, 64);

    assert.strictEqual(vectorTable.tSamples.length, scalarTable.tSamples.length);
    assert.strictEqual(vectorTable.arcLengths.length, scalarTable.arcLengths.length);

    // Verify sub-pixel total length parity (<0.05px delta)
    const lengthDelta = Math.abs(vectorTable.totalLength - scalarTable.totalLength);
    assert.ok(
      lengthDelta < 0.05,
      `Length delta ${lengthDelta} exceeds sub-pixel threshold`
    );

    // Verify midpoint arc length sample parity
    const midIdx = Math.floor(scalarTable.arcLengths.length / 2);
    const midDelta = Math.abs(
      vectorTable.arcLengths[midIdx] - scalarTable.arcLengths[midIdx]
    );
    assert.ok(
      midDelta < 0.05,
      `Midpoint delta ${midDelta} exceeds sub-pixel threshold`
    );
  });

  // --------------------------------------------------------------------------
  // 3. 4-Lane Vectorized Batch Spline Solver
  // --------------------------------------------------------------------------
  it("should compute batch splines with exact control points to scalar solver", () => {
    const wires: WireJobInput[] = [
      { id: "v1", start: { x: 0, y: 0 }, end: { x: 200, y: 100 } }, // Forward
      { id: "v2", start: { x: 300, y: 150 }, end: { x: 100, y: 200 } }, // Reverse loop
      { id: "v3", start: { x: 50, y: 50 }, end: { x: 500, y: 500 }, config: { tension: 0.7 } },
      { id: "v4", start: { x: 80, y: 40 }, end: { x: 180, y: 40 } }, // Flat horizontal
      { id: "v5", start: { x: 20, y: 100 }, end: { x: 20, y: 300 } }, // Vertical
    ];

    const vectorizedResults = SplineSolver.calculateBatchVectorized(wires);
    assert.strictEqual(vectorizedResults.size, 5);

    for (const w of wires) {
      const vResult = vectorizedResults.get(w.id);
      assert.ok(vResult, `Missing result for wire ${w.id}`);

      const sResult = SplineSolver.calculateWireSpline(w.start, w.end, w.config);

      assert.strictEqual(vResult.p0.x, sResult.p0.x);
      assert.strictEqual(vResult.p0.y, sResult.p0.y);
      assert.strictEqual(vResult.p1.x, sResult.p1.x);
      assert.strictEqual(vResult.p1.y, sResult.p1.y);
      assert.strictEqual(vResult.p2.x, sResult.p2.x);
      assert.strictEqual(vResult.p2.y, sResult.p2.y);
      assert.strictEqual(vResult.p3.x, sResult.p3.x);
      assert.strictEqual(vResult.p3.y, sResult.p3.y);
      assert.strictEqual(vResult.path, sResult.path);
      assert.ok(Math.abs(vResult.approximateLength - sResult.approximateLength) < 0.05);
    }
  });

  // --------------------------------------------------------------------------
  // 4. WasmBridge calculateBatchSplines Integration
  // --------------------------------------------------------------------------
  it("should integrate calculateBatchSplines into WasmBridge solver", () => {
    const bridge = WasmBridge.getInstance();
    const solver = bridge.getSplineSolver();

    const sample = [
      { id: "b1", start: { x: 10, y: 20 }, end: { x: 210, y: 80 } },
      { id: "b2", start: { x: 400, y: 100 }, end: { x: 150, y: 250 } },
    ];

    const results = solver.calculateBatchSplines(sample, true);
    assert.strictEqual(results.size, 2);
    assert.ok(results.has("b1"));
    assert.ok(results.has("b2"));
  });

  // --------------------------------------------------------------------------
  // 5. Benchmark Harness Execution (100 / 500 / 1000 wires)
  // --------------------------------------------------------------------------
  it("should execute benchmark harness comparing throughput across 100, 500, and 1000 wires", async () => {
    const report = await SimdBenchmark.runBenchmark([100, 500, 1000], 3);

    assert.strictEqual(report.results.length, 3);
    assert.strictEqual(report.results[0].wireCount, 100);
    assert.strictEqual(report.results[1].wireCount, 500);
    assert.strictEqual(report.results[2].wireCount, 1000);

    for (const res of report.results) {
      assert.ok(res.scalarDurationMs >= 0);
      assert.ok(res.simdDurationMs >= 0);
      assert.ok(res.scalarThroughputWiresPerSec > 0);
      assert.ok(res.simdThroughputWiresPerSec > 0);
      assert.strictEqual(res.sampleParityVerified, true);
    }

    assert.ok(report.summary.includes("[100 Wires]"));
    assert.ok(report.summary.includes("[500 Wires]"));
    assert.ok(report.summary.includes("[1000 Wires]"));
  });

  // --------------------------------------------------------------------------
  // 6. PHASE 4 COMPLETION GATE: 500-Wire Combined Stress Test
  // --------------------------------------------------------------------------
  it("Phase 4 Completion Gate: should sustain 500-wire topology with worker pool and SIMD active", async () => {
    WasmWorkerPool.resetInstance();
    const pool = new WasmWorkerPool({
      minWorkers: 4,
      maxWorkers: 8,
      maxBudgetMs: 16.67,
      dropOnTimeout: true,
    });

    await pool.initialize();

    // 500 wires with diverse angles, tensions, and tangents
    const wires500: WireJobInput[] = [];
    for (let i = 0; i < 500; i++) {
      const isReverse = i % 5 === 0;
      const startX = (i % 30) * 45;
      const startY = Math.floor(i / 30) * 35;
      const endX = isReverse ? startX - 80 : startX + 160;
      const endY = startY + ((i % 7) - 3) * 25;

      wires500.push({
        id: `gate_wire_${i}`,
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        config: {
          tension: 0.4 + (i % 4) * 0.1,
          minTangent: 40 + (i % 3) * 10,
        },
      });
    }

    const startTime = performance.now();
    const results = await pool.requestFrame(wires500, 50.0);
    const frameDurationMs = performance.now() - startTime;

    assert.strictEqual(results.size, 500);

    // Verify all 500 results have valid control points
    for (let i = 0; i < 500; i++) {
      const spline = results.get(`gate_wire_${i}`);
      assert.ok(spline, `Missing spline for wire ${i}`);
      assert.ok(Number.isFinite(spline.p0.x));
      assert.ok(Number.isFinite(spline.p1.x));
      assert.ok(Number.isFinite(spline.p2.x));
      assert.ok(Number.isFinite(spline.p3.x));
      assert.ok(spline.approximateLength > 0);
    }

    const metrics = pool.getMetrics();
    assert.strictEqual(metrics.processedFrames, 1);
    assert.strictEqual(metrics.droppedFrames, 0);

    pool.terminate();
    WasmWorkerPool.resetInstance();
  });
});
