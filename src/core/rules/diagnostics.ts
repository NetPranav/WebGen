"use client";

/**
 * ============================================================================
 * PHASE 8, SUB-PHASE 8.2 — STABLE DIAGNOSTIC CODES
 * ============================================================================
 * `rules.explain(diagnostic)` and `rules.suggestFix(diagnostic)` (ROADMAP
 * §8.2) work off these four stable codes: `[ANIM_COMPAT]`, `[STA_CONFLICT]`,
 * `[PERF_LAYOUT]`, `[A11Y_FLASH]`. Each has a human message and a
 * machine-readable fix, and can be forwarded to `DiagnosticBus` (Panel 07)
 * unchanged.
 * ============================================================================
 */

import { DiagnosticBus } from "../engine/DiagnosticBus";
import type { DiagnosticEvent, DiagnosticSeverity } from "../types/diagnostics";
import type { RuleDiagnostic } from "./types";

export function animCompatDiagnostic(params: { layerId: string; layerName?: string; message: string; suggestion: string; clipId?: string }): RuleDiagnostic {
  return { code: "ANIM_COMPAT", layerId: params.layerId, message: params.message, suggestion: params.suggestion, clipId: params.clipId };
}

export function staConflictDiagnostic(params: { layerId: string; message: string; suggestion: string; clipId?: string }): RuleDiagnostic {
  return { code: "STA_CONFLICT", layerId: params.layerId, message: params.message, suggestion: params.suggestion, clipId: params.clipId };
}

export function perfLayoutDiagnostic(params: { layerId: string; message: string; suggestion: string; clipId?: string; trackId?: string }): RuleDiagnostic {
  return { code: "PERF_LAYOUT", layerId: params.layerId, message: params.message, suggestion: params.suggestion, clipId: params.clipId, trackId: params.trackId };
}

export function a11yFlashDiagnostic(params: { layerId: string; message: string; suggestion: string; clipId?: string }): RuleDiagnostic {
  return { code: "A11Y_FLASH", layerId: params.layerId, message: params.message, suggestion: params.suggestion, clipId: params.clipId };
}

export function signalCycleDiagnostic(params: { layerId: string; message: string; suggestion: string }): RuleDiagnostic {
  return { code: "SIGNAL_CYCLE", layerId: params.layerId, message: params.message, suggestion: params.suggestion };
}

export function inputTouchDiagnostic(params: { layerId: string; message: string; suggestion: string }): RuleDiagnostic {
  return { code: "INPUT_TOUCH", layerId: params.layerId, message: params.message, suggestion: params.suggestion };
}

export function explain(diagnostic: RuleDiagnostic): string {
  return `[${diagnostic.code}] ${diagnostic.message}`;
}

export function suggestFix(diagnostic: RuleDiagnostic): string | undefined {
  return diagnostic.suggestion;
}

const SEVERITY_BY_CODE: Record<RuleDiagnostic["code"], DiagnosticSeverity> = {
  ANIM_COMPAT: "error",
  STA_CONFLICT: "error",
  PERF_LAYOUT: "warning",
  A11Y_FLASH: "error",
  SIGNAL_CYCLE: "error",
  INPUT_TOUCH: "warning",
};

/** Forwards a rule diagnostic to Panel 07's Output Log via `DiagnosticBus`. */
export function emitRuleDiagnostic(diagnostic: RuleDiagnostic, layerName?: string): DiagnosticEvent {
  return DiagnosticBus.emit({
    channel: diagnostic.code,
    severity: SEVERITY_BY_CODE[diagnostic.code],
    source: { entityId: diagnostic.layerId, entityName: layerName },
    message: diagnostic.message,
    suggestion: diagnostic.suggestion,
    isFixable: Boolean(diagnostic.suggestion),
  });
}
