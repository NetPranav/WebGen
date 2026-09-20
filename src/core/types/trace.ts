"use client";

/**
 * ============================================================================
 * VISUAL EXECUTION TRACE & WIRE PULSE TELEMETRY CONTRACTS
 * ============================================================================
 * Defines pure TypeScript contracts for node-by-node runtime execution logging,
 * pin data snapshots, wire pulse animation telemetry, and playback scrubbing.
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.3 & PANELS.md (Panel 20)
 * ============================================================================
 */

import { PinDataType } from "./node-registry";

export type TraceStepStatus = "success" | "error" | "pending" | "skipped";

export interface TracePinSnapshot {
  pinId: string;
  name: string;
  type: PinDataType | string;
  direction: "input" | "output";
  value: unknown;
  wireId?: string;
}

export interface TraceStep {
  stepIndex: number;
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
  category: string;
  headerColor: string;
  inputs: Record<string, TracePinSnapshot>;
  outputs: Record<string, TracePinSnapshot>;
  durationMs: number;
  status: TraceStepStatus;
  errorMessage?: string;
  timestamp: number;
  nextTraversedWireIds?: string[];
  breakpointId?: string; // Links this step to the breakpoint that caused a pause
}

export interface ExecutionRun {
  runId: string;
  graphId: string;
  graphName: string;
  trigger: string; // e.g. "onClick (btn_checkout)" or "Manual Simulation"
  startTime: number;
  endTime?: number;
  totalDurationMs: number;
  status: "running" | "completed" | "failed" | "paused";
  steps: TraceStep[];
  isPaused?: boolean; // Signals the run is frozen at a breakpoint
  pausedAtNodeId?: string; // The node ID where execution is currently paused
}

export interface WirePulseTelemetry {
  wireId: string;
  sourceNodeId: string;
  targetNodeId: string;
  pinType: PinDataType | string;
  speed: number;
  durationMs: number;
  startedAt: number;
  expiresAt: number;
}

export type ExecutionTraceListener = (
  run: ExecutionRun,
  activeStep?: TraceStep
) => void;

export type PulseTelemetryListener = (pulses: WirePulseTelemetry[]) => void;
