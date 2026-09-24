/**
 * ============================================================================
 * WASM WORKER POOL TYPES & BINARY PROTOCOL CONTRACTS
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 4.6
 *
 * Defines data structures, binary buffer layouts, and communication messages
 * for multithreaded offscreen physics & spline calculation across Web Workers.
 * ============================================================================
 */

import { Point2D, SplineConfig } from "../SplineSolver";

export interface WireJobInput {
  id: string;
  start: Point2D;
  end: Point2D;
  config?: SplineConfig;
}

export interface WorkerSplineOutput {
  id: string;
  p0: Point2D;
  p1: Point2D;
  p2: Point2D;
  p3: Point2D;
  totalArcLength: number;
}

export interface WorkerPoolMetrics {
  workerCount: number;
  activeJobs: number;
  processedFrames: number;
  avgComputeMs: number;
  droppedFrames: number;
  sharedMemoryEnabled: boolean;
  lastFrameDurationMs: number;
}

export interface FrameSyncConfig {
  /** Maximum computation budget in milliseconds per frame before skipping (default 8.33ms for 120 FPS) */
  maxBudgetMs?: number;
  /** Whether to drop/skip frames exceeding maxBudgetMs to protect main-thread responsiveness */
  dropOnTimeout?: boolean;
  /** Min worker pool size (default 2) */
  minWorkers?: number;
  /** Max worker pool size (default 8) */
  maxWorkers?: number;
}

/**
 * Binary buffer layout for zero-copy SharedArrayBuffer / Transferable ArrayBuffer:
 *
 * Header:
 *   [0]: uint32 wireCount
 *   [1]: uint32 sequenceId
 *   [2]: uint32 statusFlags (0 = pending, 1 = completed, 2 = error)
 *   [3]: uint32 reserved
 *
 * Inputs (Starts at byte offset 16):
 *   Each wire: 4 floats (16 bytes): [startX, startY, endX, endY]
 *
 * Outputs (Starts at byte offset 16 + wireCount * 16):
 *   Each wire: 9 floats (36 bytes): [p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, totalArcLength]
 */
export const BUFFER_HEADER_BYTES = 16;
export const WIRE_INPUT_FLOATS = 4;
export const WIRE_INPUT_BYTES = WIRE_INPUT_FLOATS * 4; // 16 bytes
export const WIRE_OUTPUT_FLOATS = 9;
export const WIRE_OUTPUT_BYTES = WIRE_OUTPUT_FLOATS * 4; // 36 bytes

export function computeRequiredBufferBytes(wireCount: number): number {
  return BUFFER_HEADER_BYTES + wireCount * (WIRE_INPUT_BYTES + WIRE_OUTPUT_BYTES);
}

export type WorkerMessageType =
  | "INIT"
  | "INIT_OK"
  | "SOLVE_BATCH"
  | "BATCH_RESULT"
  | "TERMINATE";

export interface WorkerInboundMessage {
  type: WorkerMessageType;
  workerIndex: number;
  sequenceId: number;
  wireIds?: string[];
  wireCount?: number;
  sharedBuffer?: SharedArrayBuffer | ArrayBuffer;
  wires?: WireJobInput[];
}

export interface WorkerOutboundMessage {
  type: WorkerMessageType;
  workerIndex: number;
  sequenceId: number;
  wireIds?: string[];
  sharedBuffer?: SharedArrayBuffer | ArrayBuffer;
  results?: WorkerSplineOutput[];
  computeDurationMs?: number;
  error?: string;
}
