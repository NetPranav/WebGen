import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PerformanceProfiler } from "../PerformanceProfiler";
import { multiEngineAnimationRuntime } from "../../runtime/MultiEngineAnimationRuntime";
import { AnimationSample } from "../../types/animations";

describe("Sub-Phase 8.3: Performance & 60 FPS Guarantee with Zero Memory Leaks", () => {
  // ==========================================================================
  // 1. 60 FPS FRAME BUDGET BENCHMARK
  // ==========================================================================
  it("verifies 60 FPS execution frame budget (<= 16.67ms) under animation simulation", () => {
    const result = PerformanceProfiler.profileFrameRate(
      "Universal Transform Animation",
      (frame) => {
        // Simulate real-time matrix synthesis for 60 frames
        const t = frame / 60;
        const x = Math.sin(t * Math.PI * 2) * 100;
        const y = Math.cos(t * Math.PI * 2) * 50;
        const scale = 1 + Math.sin(t * Math.PI) * 0.2;
        const rotate = t * 360;
        const matrix = `matrix3d(${scale}, 0, 0, 0, 0, ${scale}, 0, 0, 0, 0, 1, 0, ${x.toFixed(2)}, ${y.toFixed(2)}, 0, 1)`;
        assert.ok(matrix.startsWith("matrix3d"));
      },
      60
    );

    assert.equal(result.frameCount, 60);
    assert.ok(result.averageFrameTimeMs <= PerformanceProfiler.TARGET_FRAME_BUDGET_MS,
      `Average frame time ${result.averageFrameTimeMs}ms must be <= 16.67ms`
    );
    assert.equal(result.droppedFrames, 0);
    assert.ok(result.meets60FpsBudget);
    assert.equal(result.fps, 60);
  });

  // ==========================================================================
  // 2. IMAGE MULTI-FILTER STACK STRESS TEST
  // ==========================================================================
  it("verifies Image multi-filter transitions maintain 60 FPS budget under heavy filter stack", () => {
    const filterConfig = {
      blur: 16,
      grayscale: 0.8,
      brightness: 1.4,
      contrast: 1.3,
      saturate: 1.6,
    };

    const result = PerformanceProfiler.profileImageFilterStack(filterConfig, 60);

    assert.equal(result.frameCount, 60);
    assert.ok(result.averageFrameTimeMs <= PerformanceProfiler.TARGET_FRAME_BUDGET_MS,
      `Image filter frame time ${result.averageFrameTimeMs}ms must be <= 16.67ms`
    );
    assert.ok(result.meets60FpsBudget);
    assert.ok(result.fps >= 59.0);
  });

  // ==========================================================================
  // 3. BACKGROUND NOISE & MULTI-GRADIENT DRIFT BENCHMARK
  // ==========================================================================
  it("verifies Background noise and gradient drift maintain 60 FPS budget", () => {
    const result = PerformanceProfiler.profileBackgroundNoiseLayer(60);

    assert.equal(result.frameCount, 60);
    assert.ok(result.averageFrameTimeMs <= PerformanceProfiler.TARGET_FRAME_BUDGET_MS,
      `Background frame time ${result.averageFrameTimeMs}ms must be <= 16.67ms`
    );
    assert.ok(result.meets60FpsBudget);
    assert.ok(result.fps >= 59.0);
  });

  // ==========================================================================
  // 4. ZERO MEMORY LEAK LIFECYCLE VERIFICATION
  // ==========================================================================
  it("verifies zero memory leaks across 100 timeline generation and disposal cycles", () => {
    const sample: AnimationSample = {
      id: "perf-element-1",
      name: "Perf Float",
      duration: 1000,
      easing: "power2.out",
      iterations: 1,
      direction: "normal",
      fillMode: "forwards",
      tracks: [
        {
          trackId: "translateY",
          keyframes: [
            { offset: 0, value: 0, easing: "power2.out" },
            { offset: 50, value: -20, easing: "power2.inOut" },
            { offset: 100, value: 0, easing: "power2.out" },
          ],
        },
        {
          trackId: "opacity",
          keyframes: [
            { offset: 0, value: 0, easing: "linear" },
            { offset: 100, value: 1, easing: "linear" },
          ],
        },
      ],
    };

    const memoryResult = PerformanceProfiler.profileMemoryLifecycle(() => {
      // Create and compile timeline
      let compiled: string | null = multiEngineAnimationRuntime.compileGsapTimeline(sample, {
        componentSelector: "#test-perf-el",
      });

      // Return cleanup handle
      return {
        dispose: () => {
          // Dispose and clear references
          compiled = null;
        },
      };
    }, 100);

    assert.equal(memoryResult.iterations, 100);
    assert.equal(memoryResult.activeTimelinesCleaned, 100);
    assert.ok(memoryResult.zeroMemoryLeak, "Must guarantee zero unbounded memory growth across iterations");
  });

  // ==========================================================================
  // 5. MOTION PERFORMANCE DIAGNOSTICS & HARDWARE ACCELERATION CHECKS
  // ==========================================================================
  it("flags layout-triggering properties and recommends GPU-composited alternatives", () => {
    const recommendations = PerformanceProfiler.analyzeMotionPerformance({
      top: 100,
      width: 200,
      filter: "blur(10px)",
    });

    const warnings = recommendations.filter((r) => r.type === "warning");
    const optimizations = recommendations.filter((r) => r.type === "optimization");

    assert.ok(warnings.some((w) => w.property === "top"));
    assert.ok(warnings.some((w) => w.property === "width"));
    assert.ok(optimizations.some((o) => o.property === "filter"));
    assert.ok(optimizations[0].autoFix?.willChange.includes("filter"));
  });

  it("passes cleanly when all properties are hardware-accelerated transforms", () => {
    const recommendations = PerformanceProfiler.analyzeMotionPerformance({
      transform: "scale(1.1)",
      opacity: 0.8,
    });

    assert.equal(recommendations.length, 1);
    assert.equal(recommendations[0].type, "pass");
  });
});
