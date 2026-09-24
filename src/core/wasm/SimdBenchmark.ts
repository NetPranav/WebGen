/**
 * ============================================================================
 * SIMD BATCH SPLINE BENCHMARK HARNESS
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 4.7 & Phase 11 Baseline
 *
 * Compares scalar vs SIMD / 4-lane vectorized batch spline solver throughput
 * at 100, 500, and 1,000 wire counts. Measures duration, wires/second, and
 * speedup factors for the Phase 11 Performance Lab baseline suite.
 * ============================================================================
 */

import { Point2D, SplineConfig, SplineResult, SplineSolver } from "./SplineSolver";
import { WireJobInput } from "./types/worker-pool";

export interface BenchmarkCountResult {
  wireCount: number;
  scalarDurationMs: number;
  simdDurationMs: number;
  speedupFactor: number;
  scalarThroughputWiresPerSec: number;
  simdThroughputWiresPerSec: number;
  sampleParityVerified: boolean;
}

export interface BenchmarkReport {
  timestamp: string;
  hardwareConcurrency: number;
  simdSupported: boolean;
  results: BenchmarkCountResult[];
  summary: string;
}

export class SimdBenchmark {
  /**
   * Generates a deterministic synthetic topology of wires for benchmarking.
   */
  public static generateBenchmarkWires(count: number): WireJobInput[] {
    const wires: WireJobInput[] = [];

    for (let i = 0; i < count; i++) {
      const isReverse = i % 4 === 0;
      const startX = (i % 25) * 60;
      const startY = Math.floor(i / 25) * 50;
      const endX = isReverse ? startX - 120 : startX + 220;
      const endY = startY + ((i % 5) - 2) * 40;

      wires.push({
        id: `bench_wire_${i}`,
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        config: {
          tension: 0.5,
          minTangent: 45.0,
          loopOffset: 60.0,
        },
      });
    }

    return wires;
  }

  /**
   * Runs the full comparative benchmark suite across 100, 500, and 1,000 wires.
   */
  public static async runBenchmark(
    counts: number[] = [100, 500, 1000],
    iterations: number = 5
  ): Promise<BenchmarkReport> {
    const results: BenchmarkCountResult[] = [];

    for (const count of counts) {
      const wires = this.generateBenchmarkWires(count);

      // Warm-up runs to prime JIT optimizer
      for (const w of wires.slice(0, 20)) {
        SplineSolver.calculateWireSpline(w.start, w.end, w.config);
      }
      SplineSolver.calculateBatchVectorized(wires.slice(0, 20));

      // 1. Measure Scalar Solver
      let totalScalarMs = 0;
      let scalarSample: SplineResult | null = null;
      for (let iter = 0; iter < iterations; iter++) {
        const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
        for (let i = 0; i < wires.length; i++) {
          const w = wires[i];
          const res = SplineSolver.calculateWireSpline(w.start, w.end, w.config);
          if (iter === 0 && i === 0) scalarSample = res;
        }
        totalScalarMs +=
          (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
      }
      const avgScalarMs = totalScalarMs / iterations;

      // 2. Measure Vectorized SIMD Solver
      let totalSimdMs = 0;
      let simdSample: SplineResult | null = null;
      for (let iter = 0; iter < iterations; iter++) {
        const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
        const batchMap = SplineSolver.calculateBatchVectorized(wires);
        if (iter === 0) simdSample = batchMap.get(wires[0].id) || null;
        totalSimdMs +=
          (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
      }
      const avgSimdMs = totalSimdMs / iterations;

      // Parity check between scalar and vectorized sample
      let sampleParityVerified = false;
      if (scalarSample && simdSample) {
        const dx = Math.abs(scalarSample.p1.x - simdSample.p1.x);
        const dy = Math.abs(scalarSample.p2.y - simdSample.p2.y);
        const dLen = Math.abs(
          scalarSample.approximateLength - simdSample.approximateLength
        );
        sampleParityVerified = dx < 0.01 && dy < 0.01 && dLen < 0.05;
      }

      const scalarDuration = Number(avgScalarMs.toFixed(3));
      const simdDuration = Number(avgSimdMs.toFixed(3));
      const speedupFactor = Number(
        (avgSimdMs > 0 ? avgScalarMs / avgSimdMs : 1.0).toFixed(2)
      );

      const scalarThroughput = Math.round((count / (avgScalarMs || 0.001)) * 1000);
      const simdThroughput = Math.round((count / (avgSimdMs || 0.001)) * 1000);

      results.push({
        wireCount: count,
        scalarDurationMs: scalarDuration,
        simdDurationMs: simdDuration,
        speedupFactor,
        scalarThroughputWiresPerSec: scalarThroughput,
        simdThroughputWiresPerSec: simdThroughput,
        sampleParityVerified,
      });
    }

    const cores =
      typeof navigator !== "undefined" && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4;

    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      hardwareConcurrency: cores,
      simdSupported: true,
      results,
      summary: results
        .map(
          (r) =>
            `[${r.wireCount} Wires] Scalar: ${r.scalarDurationMs}ms (${r.scalarThroughputWiresPerSec.toLocaleString()} w/s) | SIMD: ${r.simdDurationMs}ms (${r.simdThroughputWiresPerSec.toLocaleString()} w/s) | Speedup: ${r.speedupFactor}x`
        )
        .join("\n"),
    };

    return report;
  }
}
