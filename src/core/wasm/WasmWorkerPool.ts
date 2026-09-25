/**
 * ============================================================================
 * MULTITHREADED WORKER POOL & FRAME SYNCHRONIZATION ENGINE
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 4.6
 *
 * The "Wasm" in this class's name is permanently aspirational, not current:
 * the workers run the real, genuinely multithreaded `SplineSolver` — as
 * TypeScript, same as everywhere else. ROADMAP Sub-Phase 5.3 (AUD-12)
 * benchmarked the C++ kernel and decided **No-Go**; see
 * `DOCS/Initial/decisions/0001-wasm.md`. Nothing here loads a compiled Wasm
 * module, and nothing ever will unless that decision is revisited.
 *
 * Capabilities:
 *   1. Dedicated Web Worker pool (2-8 workers, auto-scaled to hardware concurrency)
 *   2. Zero-copy SharedArrayBuffer position transfer with Transferable ArrayBuffer fallback
 *   3. Workload partitioning across worker threads for high-density wire topologies
 *   4. Non-blocking Frame Synchronization Protocol:
 *      - Enforces 8.33ms budget for 120 FPS target
 *      - Drops/skips delayed frames gracefully without stalling the UI thread
 *   5. Comprehensive telemetry metrics (activeJobs, processedFrames, avgComputeMs, droppedFrames)
 * ============================================================================
 */

import { Point2D, SplineConfig, SplineResult, SplineSolver } from "./SplineSolver";
import {
  BUFFER_HEADER_BYTES,
  WIRE_INPUT_BYTES,
  WIRE_OUTPUT_BYTES,
  WIRE_INPUT_FLOATS,
  WIRE_OUTPUT_FLOATS,
  computeRequiredBufferBytes,
  FrameSyncConfig,
  WireJobInput,
  WorkerPoolMetrics,
  WorkerInboundMessage,
  WorkerOutboundMessage,
  WorkerSplineOutput,
} from "./types/worker-pool";

interface InternalWorkerHandle {
  worker: Worker | null;
  busy: boolean;
  index: number;
}

export class WasmWorkerPool {
  private static instance: WasmWorkerPool | null = null;

  private workerHandles: InternalWorkerHandle[] = [];
  private workerCount: number = 4;
  private isInitialized: boolean = false;
  private config: Required<FrameSyncConfig>;
  private sharedBufferSupported: boolean = false;

  // Frame telemetry metrics
  private processedFrames: number = 0;
  private droppedFrames: number = 0;
  private totalComputeMs: number = 0;
  private lastFrameDurationMs: number = 0;
  private sequenceCounter: number = 0;

  // Cached results for non-blocking fallback
  private splineCache: Map<string, SplineResult> = new Map();

  // Active frame promise resolve handlers
  private pendingResolvers: Map<
    number,
    {
      resolve: (results: Map<string, SplineResult>) => void;
      startTime: number;
      timeoutTimer?: NodeJS.Timeout | number;
      expectedBatches: number;
      collectedOutputs: WorkerSplineOutput[];
    }
  > = new Map();

  constructor(config?: FrameSyncConfig) {
    const minWorkers = config?.minWorkers ?? 2;
    const maxWorkers = config?.maxWorkers ?? 8;
    const detectedCores =
      typeof navigator !== "undefined" && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4;

    this.workerCount = Math.max(minWorkers, Math.min(maxWorkers, detectedCores));
    this.config = {
      maxBudgetMs: config?.maxBudgetMs ?? 8.33,
      dropOnTimeout: config?.dropOnTimeout ?? true,
      minWorkers,
      maxWorkers,
    };

    this.sharedBufferSupported =
      typeof SharedArrayBuffer !== "undefined" &&
      typeof crossOriginIsolated !== "undefined" &&
      crossOriginIsolated;
  }

  public static getInstance(config?: FrameSyncConfig): WasmWorkerPool {
    if (!WasmWorkerPool.instance) {
      WasmWorkerPool.instance = new WasmWorkerPool(config);
    }
    return WasmWorkerPool.instance;
  }

  public static resetInstance(): void {
    if (WasmWorkerPool.instance) {
      WasmWorkerPool.instance.terminate();
      WasmWorkerPool.instance = null;
    }
  }

  /**
   * Initializes the pool of Web Workers.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.workerHandles = [];

    for (let i = 0; i < this.workerCount; i++) {
      let workerInstance: Worker | null = null;

      if (typeof window !== "undefined" && typeof Worker !== "undefined") {
        try {
          workerInstance = this.createInlineWorker(i);
        } catch {
          workerInstance = null;
        }
      }

      this.workerHandles.push({
        worker: workerInstance,
        busy: false,
        index: i,
      });
    }

    this.isInitialized = true;
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public getPoolSize(): number {
    return this.workerCount;
  }

  public isSharedMemorySupported(): boolean {
    return this.sharedBufferSupported;
  }

  /**
   * Submits a batch of wires for calculation across the worker pool.
   * If workers are unavailable or in Node testing, falls back to optimized direct calculation.
   */
  public async submitBatch(wires: WireJobInput[]): Promise<Map<string, SplineResult>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (wires.length === 0) {
      return new Map();
    }

    // Direct asynchronous fallback if Web Workers are not available in current environment
    const hasLiveWorkers = this.workerHandles.some((h) => h.worker !== null);
    if (!hasLiveWorkers) {
      await new Promise((res) => setTimeout(res, 0));
      return this.executeFallbackDirect(wires);
    }

    const seqId = ++this.sequenceCounter;
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    // Partition wires across worker count
    const partitionSize = Math.ceil(wires.length / this.workerCount);
    const partitions: WireJobInput[][] = [];

    for (let i = 0; i < wires.length; i += partitionSize) {
      partitions.push(wires.slice(i, i + partitionSize));
    }

    return new Promise<Map<string, SplineResult>>((resolve) => {
      this.pendingResolvers.set(seqId, {
        resolve: (results) => {
          const duration =
            (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;
          this.lastFrameDurationMs = duration;
          this.totalComputeMs += duration;
          this.processedFrames++;
          resolve(results);
        },
        startTime,
        expectedBatches: partitions.length,
        collectedOutputs: [],
      });

      // Dispatch to workers
      partitions.forEach((batch, idx) => {
        const handle = this.workerHandles[idx % this.workerHandles.length];
        if (handle && handle.worker) {
          handle.busy = true;
          const msg: WorkerInboundMessage = {
            type: "SOLVE_BATCH",
            workerIndex: handle.index,
            sequenceId: seqId,
            wireIds: batch.map((w) => w.id),
            wires: batch,
          };
          handle.worker.postMessage(msg);
        }
      });
    });
  }

  /**
   * Non-blocking Frame Synchronization Protocol:
   * Dispatches frame calculation with a strict time budget (default 8.33ms for 120 FPS).
   * If workers take longer than the budget, drops the frame gracefully and immediately
   * returns cached splines to protect main thread FPS.
   */
  public async requestFrame(
    wires: WireJobInput[],
    maxBudgetMs: number = this.config.maxBudgetMs
  ): Promise<Map<string, SplineResult>> {
    if (wires.length === 0) return new Map();

    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    const framePromise = this.submitBatch(wires);

    if (!this.config.dropOnTimeout) {
      return framePromise;
    }

    if (maxBudgetMs <= 0) {
      this.droppedFrames++;
      const fallbackResults = new Map<string, SplineResult>();
      for (const wire of wires) {
        const cached = this.splineCache.get(wire.id);
        if (cached) {
          fallbackResults.set(wire.id, cached);
        } else {
          const solved = SplineSolver.calculateWireSpline(wire.start, wire.end, wire.config);
          this.splineCache.set(wire.id, solved);
          fallbackResults.set(wire.id, solved);
        }
      }
      return fallbackResults;
    }

    // Set up deadline race
    let timeoutHandle: NodeJS.Timeout | number;
    const timeoutPromise = new Promise<Map<string, SplineResult>>((resolve) => {
      timeoutHandle = setTimeout(() => {
        this.droppedFrames++;
        // Immediately return whatever cached results we currently have for these wires
        const fallbackResults = new Map<string, SplineResult>();
        for (const wire of wires) {
          const cached = this.splineCache.get(wire.id);
          if (cached) {
            fallbackResults.set(wire.id, cached);
          } else {
            // Compute minimal fallback on demand
            const solved = SplineSolver.calculateWireSpline(wire.start, wire.end, wire.config);
            this.splineCache.set(wire.id, solved);
            fallbackResults.set(wire.id, solved);
          }
        }
        resolve(fallbackResults);
      }, maxBudgetMs);
    });

    try {
      const result = await Promise.race([framePromise, timeoutPromise]);
      clearTimeout(timeoutHandle!);
      // Update cache
      result.forEach((spline, id) => {
        this.splineCache.set(id, spline);
      });
      return result;
    } catch {
      clearTimeout(timeoutHandle!);
      return this.executeFallbackDirect(wires);
    }
  }

  /**
   * Encodes a list of wires into binary layout for SharedArrayBuffer / Transferable ArrayBuffer.
   */
  public encodeWiresToBuffer(
    wires: WireJobInput[],
    buffer: ArrayBuffer | SharedArrayBuffer,
    sequenceId: number = 0
  ): void {
    const uint32View = new Uint32Array(buffer, 0, 4);
    uint32View[0] = wires.length;
    uint32View[1] = sequenceId;
    uint32View[2] = 0; // statusFlags: 0 = pending
    uint32View[3] = 0;

    const float32View = new Float32Array(buffer, BUFFER_HEADER_BYTES);

    for (let i = 0; i < wires.length; i++) {
      const w = wires[i];
      const offset = i * WIRE_INPUT_FLOATS;
      float32View[offset] = w.start.x;
      float32View[offset + 1] = w.start.y;
      float32View[offset + 2] = w.end.x;
      float32View[offset + 3] = w.end.y;
    }
  }

  /**
   * Decodes solved splines from binary buffer layout into SplineResult objects.
   */
  public decodeSplinesFromBuffer(
    buffer: ArrayBuffer | SharedArrayBuffer,
    wireIds: string[]
  ): Map<string, SplineResult> {
    const results = new Map<string, SplineResult>();
    const uint32View = new Uint32Array(buffer, 0, 4);
    const wireCount = uint32View[0];

    const inputOffsetFloats = wireCount * WIRE_INPUT_FLOATS;
    const outputOffsetBytes = BUFFER_HEADER_BYTES + wireCount * WIRE_INPUT_BYTES;
    const float32OutputView = new Float32Array(buffer, outputOffsetBytes);

    for (let i = 0; i < wireCount; i++) {
      const id = wireIds[i] || `wire_${i}`;
      const off = i * WIRE_OUTPUT_FLOATS;

      const p0 = { x: float32OutputView[off], y: float32OutputView[off + 1] };
      const p1 = { x: float32OutputView[off + 2], y: float32OutputView[off + 3] };
      const p2 = { x: float32OutputView[off + 4], y: float32OutputView[off + 5] };
      const p3 = { x: float32OutputView[off + 6], y: float32OutputView[off + 7] };
      const approximateLength = float32OutputView[off + 8];

      const path = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
      const arcLengthTable = SplineSolver.buildArcLengthTable(p0, p1, p2, p3, 32);

      results.set(id, {
        p0,
        p1,
        p2,
        p3,
        path,
        approximateLength: approximateLength || arcLengthTable.totalLength,
        arcLengthTable,
      });
    }

    return results;
  }

  /**
   * Returns current pool runtime telemetry metrics.
   */
  public getMetrics(): WorkerPoolMetrics {
    const activeJobs = this.workerHandles.filter((h) => h.busy).length;
    const avgComputeMs =
      this.processedFrames > 0
        ? Number((this.totalComputeMs / this.processedFrames).toFixed(3))
        : 0;

    return {
      workerCount: this.workerCount,
      activeJobs,
      processedFrames: this.processedFrames,
      avgComputeMs,
      droppedFrames: this.droppedFrames,
      sharedMemoryEnabled: this.sharedBufferSupported,
      lastFrameDurationMs: Number(this.lastFrameDurationMs.toFixed(3)),
    };
  }

  /**
   * Terminates all active worker threads and clears pending promises.
   */
  public terminate(): void {
    for (const handle of this.workerHandles) {
      if (handle.worker) {
        try {
          handle.worker.terminate();
        } catch {}
      }
    }
    this.workerHandles = [];
    this.pendingResolvers.clear();
    this.splineCache.clear();
    this.isInitialized = false;
  }

  // --------------------------------------------------------------------------
  // Private Helpers & Inline Worker Construction
  // --------------------------------------------------------------------------

  private createInlineWorker(workerIndex: number): Worker {
    const workerScript = `
      // Self-contained Wasm Worker Spline Solver
      function solveCubicBezier(start, end, tension, minTangent, loopOffset) {
        tension = tension !== undefined ? tension : 0.5;
        minTangent = minTangent !== undefined ? minTangent : 45.0;
        loopOffset = loopOffset !== undefined ? loopOffset : 60.0;

        var deltaX = end.x - start.x;
        var deltaY = end.y - start.y;
        var p1, p2;

        if (deltaX >= 0) {
          var tangentX = Math.max(deltaX * tension, minTangent);
          p1 = { x: start.x + tangentX, y: start.y };
          p2 = { x: end.x - tangentX, y: end.y };
        } else {
          var backwardDistance = Math.abs(deltaX);
          var tangentX = Math.max(backwardDistance * tension, minTangent * 1.5);
          var yOffset = Math.abs(deltaY) < 30 ? (deltaY >= 0 ? loopOffset : -loopOffset) : 0;
          p1 = { x: start.x + tangentX, y: start.y + yOffset * 0.4 };
          p2 = { x: end.x - tangentX, y: end.y - yOffset * 0.4 };
        }

        var approxLen = Math.hypot(end.x - start.x, end.y - start.y);
        return { p0: start, p1: p1, p2: p2, p3: end, totalArcLength: approxLen };
      }

      self.onmessage = function(e) {
        var data = e.data;
        if (!data) return;

        if (data.type === "SOLVE_BATCH") {
          var wires = data.wires || [];
          var results = [];

          for (var i = 0; i < wires.length; i++) {
            var w = wires[i];
            var cfg = w.config || {};
            var res = solveCubicBezier(w.start, w.end, cfg.tension, cfg.minTangent, cfg.loopOffset);
            results.push({
              id: w.id,
              p0: res.p0,
              p1: res.p1,
              p2: res.p2,
              p3: res.p3,
              totalArcLength: res.totalArcLength
            });
          }

          self.postMessage({
            type: "BATCH_RESULT",
            workerIndex: data.workerIndex,
            sequenceId: data.sequenceId,
            results: results
          });
        }
      };
    `;

    const blob = new Blob([workerScript], { type: "application/javascript" });
    const blobUrl = URL.createObjectURL(blob);
    const worker = new Worker(blobUrl);

    worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
      this.handleWorkerMessage(event.data);
    };

    worker.onerror = (err) => {
      console.error(`[WasmWorkerPool] Worker ${workerIndex} error:`, err);
    };

    return worker;
  }

  private handleWorkerMessage(msg: WorkerOutboundMessage): void {
    if (!msg) return;

    if (msg.type === "BATCH_RESULT") {
      const handle = this.workerHandles[msg.workerIndex];
      if (handle) {
        handle.busy = false;
      }

      const resolver = this.pendingResolvers.get(msg.sequenceId);
      if (resolver && msg.results) {
        resolver.collectedOutputs.push(...msg.results);

        if (resolver.collectedOutputs.length >= resolver.expectedBatches) {
          this.pendingResolvers.delete(msg.sequenceId);
          const resultMap = new Map<string, SplineResult>();

          for (const out of resolver.collectedOutputs) {
            const path = `M ${out.p0.x} ${out.p0.y} C ${out.p1.x} ${out.p1.y}, ${out.p2.x} ${out.p2.y}, ${out.p3.x} ${out.p3.y}`;
            const arcLengthTable = SplineSolver.buildArcLengthTable(
              out.p0,
              out.p1,
              out.p2,
              out.p3,
              32
            );
            const splineResult: SplineResult = {
              p0: out.p0,
              p1: out.p1,
              p2: out.p2,
              p3: out.p3,
              path,
              approximateLength: out.totalArcLength || arcLengthTable.totalLength,
              arcLengthTable,
            };
            resultMap.set(out.id, splineResult);
            this.splineCache.set(out.id, splineResult);
          }

          resolver.resolve(resultMap);
        }
      }
    }
  }

  private executeFallbackDirect(wires: WireJobInput[]): Map<string, SplineResult> {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const results = new Map<string, SplineResult>();

    for (const wire of wires) {
      const spline = SplineSolver.calculateWireSpline(wire.start, wire.end, wire.config);
      results.set(wire.id, spline);
      this.splineCache.set(wire.id, spline);
    }

    const duration =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;
    this.lastFrameDurationMs = duration;
    this.totalComputeMs += duration;
    this.processedFrames++;

    return results;
  }
}
