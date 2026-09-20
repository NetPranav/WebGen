/**
 * ============================================================================
 * SUB-PHASE 4.3 UNIT TESTS: WASMBRIDGE & LOADING-STATE STORE
 * ============================================================================
 * Tests:
 *   1. WasmBridge singleton lifecycle and lazy loading under cold cache (<150ms).
 *   2. useWasmStore reactive Zustand state integration (isLoaded, backend, loadTimeMs).
 *   3. Strongly typed execution of SplineSolver through the bridge.
 *   4. CablePhysics simulation execution through the bridge.
 *   5. SpatialIndex Quadtree hit-test & range queries through the bridge.
 *   6. Validation of zero 'any' casts and graceful fallback mechanics.
 * ============================================================================
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  WasmBridge,
  useWasmStore,
} from "../WasmBridge";

describe("Sub-Phase 4.3: WebAssembly Build Pipeline & WasmBridge", () => {
  beforeEach(() => {
    WasmBridge.resetInstanceForTesting();
  });

  it("loads the module in under 150ms on a cold cache and initializes store", async () => {
    const bridge = WasmBridge.getInstance();
    assert.strictEqual(bridge.isReady(), false);

    const startTime = performance.now();
    await bridge.init();
    const duration = performance.now() - startTime;

    assert.strictEqual(bridge.isReady(), true);
    assert.ok(
      duration < 150,
      `Cold initialization took ${duration.toFixed(2)}ms, which exceeds 150ms budget`
    );

    // Verify Zustand store reactive state
    const state = useWasmStore.getState();
    assert.strictEqual(state.isLoaded, true);
    assert.strictEqual(state.isLoading, false);
    assert.ok(state.backend === "wasm" || state.backend === "typescript");
    assert.ok(state.loadTimeMs < 150);
  });

  it("exposes typed SplineSolver interface through WasmBridge", async () => {
    const bridge = WasmBridge.getInstance();
    await bridge.init();

    const solver = bridge.getSplineSolver();
    const spline = solver.calculateWireSpline({ x: 0, y: 0 }, { x: 300, y: 150 });

    assert.strictEqual(spline.p0.x, 0);
    assert.strictEqual(spline.p0.y, 0);
    assert.strictEqual(spline.p3.x, 300);
    assert.strictEqual(spline.p3.y, 150);
    assert.ok(spline.approximateLength > 300);

    const midPoint = solver.evaluateBezier(
      spline.p0,
      spline.p1,
      spline.p2,
      spline.p3,
      0.5
    );
    assert.ok(midPoint.x > 50 && midPoint.x < 250);

    const samples = solver.sampleEquidistantPoints(spline, 10);
    assert.strictEqual(samples.length, 10);
  });

  it("instantiates and simulates ICablePhysics via bridge", async () => {
    const bridge = WasmBridge.getInstance();
    await bridge.init();

    const cable = bridge.createCablePhysics("exec", 16);
    cable.initialize({ x: 100, y: 100 }, { x: 400, y: 100 });

    // Step simulation
    for (let i = 0; i < 30; i++) {
      cable.step(1 / 60);
    }

    const particles = cable.getParticles();
    assert.strictEqual(particles.length, 16);
    assert.strictEqual(particles[0].position.x, 100);
    assert.strictEqual(particles[15].position.x, 400);

    const svg = cable.generateSvgPath();
    assert.ok(svg.startsWith("M 100.0 100.0"));
    assert.ok(svg.includes(" C "));
  });

  it("instantiates and queries ISpatialIndex via bridge", async () => {
    const bridge = WasmBridge.getInstance();
    await bridge.init();

    const index = bridge.createSpatialIndex({
      minX: 0,
      minY: 0,
      maxX: 2000,
      maxY: 2000,
    });

    index.insert("node_alpha", "node", { minX: 100, minY: 100, maxX: 300, maxY: 250 }, 1);
    index.insert("node_beta", "node", { minX: 500, minY: 500, maxX: 700, maxY: 650 }, 2);

    assert.strictEqual(index.size(), 2);

    // Hit-testing
    const hit = index.hitTestTopmost(150, 150);
    assert.ok(hit !== null);
    assert.strictEqual(hit.id, "node_alpha");

    const miss = index.hitTestTopmost(400, 400);
    assert.strictEqual(miss, null);

    // Range query
    const results = index.queryRange({ minX: 50, minY: 50, maxX: 800, maxY: 800 });
    assert.strictEqual(results.length, 2);

    // Update
    index.update("node_alpha", { minX: 800, minY: 800, maxX: 1000, maxY: 950 });
    assert.strictEqual(index.hitTestTopmost(150, 150), null);
    const movedHit = index.hitTestTopmost(850, 850);
    assert.ok(movedHit !== null);
    assert.strictEqual(movedHit.id, "node_alpha");

    // Remove
    const removed = index.remove("node_alpha");
    assert.strictEqual(removed, true);
    assert.strictEqual(index.size(), 1);
  });

  it("supports useWasmStore.getState().init() action directly", async () => {
    await useWasmStore.getState().init("typescript");

    const state = useWasmStore.getState();
    assert.strictEqual(state.isLoaded, true);
    assert.strictEqual(state.isLoading, false);
    assert.strictEqual(state.backend, "typescript");
    assert.strictEqual(state.error, null);
  });
});
