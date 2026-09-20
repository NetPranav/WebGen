import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { WasmWorkerPool } from "../WasmWorkerPool";
import { SplineSolver } from "../SplineSolver";
import {
  WireJobInput,
  computeRequiredBufferBytes,
  BUFFER_HEADER_BYTES,
  WIRE_INPUT_BYTES,
  WIRE_OUTPUT_BYTES,
} from "../types/worker-pool";

describe("Sub-Phase 4.6: Multithreaded Wasm Worker Pool & Frame Synchronization", () => {
  let pool: WasmWorkerPool;

  beforeEach(() => {
    WasmWorkerPool.resetInstance();
    pool = new WasmWorkerPool({
      minWorkers: 2,
      maxWorkers: 6,
      maxBudgetMs: 16.0,
      dropOnTimeout: true,
    });
  });

  afterEach(() => {
    pool.terminate();
    WasmWorkerPool.resetInstance();
  });

  // --------------------------------------------------------------------------
  // 1. Worker Pool Initialization & Auto-Scaling
  // --------------------------------------------------------------------------
  it("should initialize worker pool within configured worker bounds", async () => {
    await pool.initialize();

    assert.strictEqual(pool.isReady(), true);
    const size = pool.getPoolSize();
    assert.ok(size >= 2 && size <= 6, `Pool size ${size} should be between 2 and 6`);

    const metrics = pool.getMetrics();
    assert.strictEqual(metrics.workerCount, size);
    assert.strictEqual(metrics.activeJobs, 0);
    assert.strictEqual(metrics.processedFrames, 0);
    assert.strictEqual(metrics.droppedFrames, 0);
  });

  // --------------------------------------------------------------------------
  // 2. Batch Spline Calculation & Mathematical Parity
  // --------------------------------------------------------------------------
  it("should compute batch splines with exact mathematical parity to scalar SplineSolver", async () => {
    await pool.initialize();

    const sampleWires: WireJobInput[] = [
      { id: "w1", start: { x: 100, y: 100 }, end: { x: 300, y: 150 } }, // Forward wire
      { id: "w2", start: { x: 400, y: 200 }, end: { x: 200, y: 250 } }, // Loopback wire
      { id: "w3", start: { x: 50, y: 50 }, end: { x: 500, y: 500 }, config: { tension: 0.7 } },
    ];

    const results = await pool.submitBatch(sampleWires);

    assert.strictEqual(results.size, 3);
    for (const wire of sampleWires) {
      const computed = results.get(wire.id);
      assert.ok(computed, `Missing result for ${wire.id}`);

      const expected = SplineSolver.calculateWireSpline(wire.start, wire.end, wire.config);
      assert.strictEqual(computed.p0.x, expected.p0.x);
      assert.strictEqual(computed.p0.y, expected.p0.y);
      assert.strictEqual(computed.p1.x, expected.p1.x);
      assert.strictEqual(computed.p1.y, expected.p1.y);
      assert.strictEqual(computed.p2.x, expected.p2.x);
      assert.strictEqual(computed.p2.y, expected.p2.y);
      assert.strictEqual(computed.p3.x, expected.p3.x);
      assert.strictEqual(computed.p3.y, expected.p3.y);
      assert.ok(computed.approximateLength > 0);
      assert.ok(computed.path.startsWith("M"));
    }
  });

  // --------------------------------------------------------------------------
  // 3. Binary Buffer Layout Serialization & Deserialization
  // --------------------------------------------------------------------------
  it("should accurately encode and decode wire coordinates via binary buffers", () => {
    const wires: WireJobInput[] = [
      { id: "wire_a", start: { x: 10, y: 20 }, end: { x: 110, y: 120 } },
      { id: "wire_b", start: { x: 200, y: 150 }, end: { x: 350, y: 180 } },
    ];

    const totalBytes = computeRequiredBufferBytes(wires.length);
    assert.strictEqual(totalBytes, BUFFER_HEADER_BYTES + 2 * (WIRE_INPUT_BYTES + WIRE_OUTPUT_BYTES));

    const buffer = new ArrayBuffer(totalBytes);
    pool.encodeWiresToBuffer(wires, buffer, 42);

    // Verify header
    const uint32View = new Uint32Array(buffer, 0, 4);
    assert.strictEqual(uint32View[0], 2); // wireCount
    assert.strictEqual(uint32View[1], 42); // sequenceId

    // Verify input floats
    const float32View = new Float32Array(buffer, BUFFER_HEADER_BYTES);
    assert.strictEqual(float32View[0], 10);
    assert.strictEqual(float32View[1], 20);
    assert.strictEqual(float32View[2], 110);
    assert.strictEqual(float32View[3], 120);

    // Simulate worker output population
    const outputOffsetBytes = BUFFER_HEADER_BYTES + wires.length * WIRE_INPUT_BYTES;
    const outputFloatView = new Float32Array(buffer, outputOffsetBytes);
    // Wire A output
    outputFloatView[0] = 10;
    outputFloatView[1] = 20;
    outputFloatView[2] = 60;
    outputFloatView[3] = 20;
    outputFloatView[4] = 60;
    outputFloatView[5] = 120;
    outputFloatView[6] = 110;
    outputFloatView[7] = 120;
    outputFloatView[8] = 141.42;

    const decoded = pool.decodeSplinesFromBuffer(buffer, ["wire_a", "wire_b"]);
    assert.strictEqual(decoded.size, 2);

    const wireA = decoded.get("wire_a");
    assert.ok(wireA);
    assert.strictEqual(wireA.p0.x, 10);
    assert.strictEqual(wireA.p3.x, 110);
    assert.ok(Math.abs(wireA.approximateLength - 141.42) < 0.01);
  });

  // --------------------------------------------------------------------------
  // 4. Non-blocking Frame Synchronization Protocol
  // --------------------------------------------------------------------------
  it("should successfully fulfill frame within budget and update spline cache", async () => {
    await pool.initialize();

    const frameWires: WireJobInput[] = [
      { id: "frame_w1", start: { x: 50, y: 50 }, end: { x: 250, y: 100 } },
      { id: "frame_w2", start: { x: 100, y: 100 }, end: { x: 300, y: 200 } },
    ];

    const results = await pool.requestFrame(frameWires, 30.0);
    assert.strictEqual(results.size, 2);
    assert.ok(results.has("frame_w1"));
    assert.ok(results.has("frame_w2"));

    const metrics = pool.getMetrics();
    assert.strictEqual(metrics.processedFrames, 1);
    assert.strictEqual(metrics.droppedFrames, 0);
  });

  // --------------------------------------------------------------------------
  // 5. Deadline Protection & Graceful Frame Dropping
  // --------------------------------------------------------------------------
  it("should drop frame gracefully when budget deadline is exceeded without throwing", async () => {
    await pool.initialize();

    const frameWires: WireJobInput[] = [
      { id: "timeout_w1", start: { x: 10, y: 10 }, end: { x: 100, y: 100 } },
    ];

    // Request frame with 0ms budget to trigger timeout branch
    const results = await pool.requestFrame(frameWires, 0);
    assert.strictEqual(results.size, 1);
    assert.ok(results.has("timeout_w1"));

    const metrics = pool.getMetrics();
    assert.strictEqual(metrics.droppedFrames, 1);
  });

  // --------------------------------------------------------------------------
  // 5. 300-Wire High-Density Stress Test
  // --------------------------------------------------------------------------
  it("should process a 300-wire high-density topology without frame collapse", async () => {
    await pool.initialize();

    const denseWires: WireJobInput[] = [];
    for (let i = 0; i < 300; i++) {
      denseWires.push({
        id: `stress_wire_${i}`,
        start: { x: (i % 20) * 50, y: Math.floor(i / 20) * 40 },
        end: { x: ((i + 5) % 20) * 50 + 100, y: Math.floor((i + 5) / 20) * 40 + 60 },
        config: {
          tension: 0.4 + (i % 5) * 0.1,
          minTangent: 30 + (i % 4) * 10,
        },
      });
    }

    const startTime = performance.now();
    const results = await pool.requestFrame(denseWires, 100.0);
    const duration = performance.now() - startTime;

    assert.strictEqual(results.size, 300);
    // Spot check arbitrary indices across partitions
    assert.ok(results.get("stress_wire_0"));
    assert.ok(results.get("stress_wire_75"));
    assert.ok(results.get("stress_wire_150"));
    assert.ok(results.get("stress_wire_225"));
    assert.ok(results.get("stress_wire_299"));

    const metrics = pool.getMetrics();
    assert.strictEqual(metrics.processedFrames >= 1, true);
    assert.ok(metrics.lastFrameDurationMs >= 0);
    assert.ok(duration < 250, `300 wires should compute in under 250ms, took ${duration}ms`);
  });
});
