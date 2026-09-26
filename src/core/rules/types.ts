"use client";

/**
 * ============================================================================
 * PHASE 8 — EXECUTABLE MOTION RULES ENGINE: SHARED TYPES
 * ============================================================================
 * ROADMAP Phase 8. Data-driven contracts consumed by every rule family
 * (compatibility, conflicts, performance, accessibility, routing). See
 * `DOCS/Initial/decisions/0005-phase8-rule-table-and-reconciliation.md` for
 * the source reconciliation (Sub-Phase 8.5) this module implements.
 * ============================================================================
 */

import type { AnimationCategory, GrammarElementType } from "../types/element-grammar";

/**
 * The Compatibility Matrix (grammar §9) has four cell values, not two.
 * `allowed`/`blocked` come straight from `TYPE_REGISTRY`. `conditional` (⚠️)
 * and `subsumed` (🔒) are the two the legacy `allowedCategories` boolean
 * split could not express — see `conditional-gates.ts`.
 */
export type CategoryCompatibilityKind = "allowed" | "blocked" | "conditional" | "subsumed";

/**
 * Why a ⚠️ cell is conditional (grammar §9.1). Each kind names the context
 * `passesConditionalGate` needs to resolve it.
 */
export type ConditionalGateKind =
  | "explicit-promotion" // 7.3.1 — an authoring-time `interactive: true` flag
  | "single-child-promotion" // 7.3.2 — sole interactive-relevant child of a Button/Link
  | "stagger-context" // 7.2.4 — legal only outside an inherited-stagger relationship
  | "group-indicator" // 7.4 — legal only for the group-level indicator-slide binding
  | "non-spatial-reactive" // §13.5 (v0.2) — Reactive is legal only on non-spatial properties (colour, filter, box-shadow — never transform.*)
  | "component-declared"; // §13.3 (v0.2), 3.F.7 — legal only when the Code Component's own declared controls expose that interaction/state

export interface PromotionContext {
  /** 7.3.1: this instance opted into Hover/Active/StateTransition via `interactive: true`. */
  explicitPromotion?: boolean;
  /** 7.3.2: this element is the sole interactive-relevant child of its Button/Link parent. */
  singleChildPromotion?: boolean;
  /** 7.2.4: the candidate binding would participate in an inherited parent Stagger. */
  inheritsStagger?: boolean;
  /** 7.4: the candidate is the group-level indicator-slide binding, not a per-child one. */
  isGroupIndicatorBinding?: boolean;
  /** §13.5 (v0.2): the candidate Reactive binding's target properties, checked against the non-spatial-reactive gate. */
  candidateProperties?: string[];
  /** §13.3 (v0.2), 3.F.7: the Code Component's own props/controls declare this interaction or state. */
  componentDeclaresInteraction?: boolean;
}

export const RULE_DIAGNOSTIC_CODES = ["ANIM_COMPAT", "STA_CONFLICT", "PERF_LAYOUT", "A11Y_FLASH", "SIGNAL_CYCLE", "INPUT_TOUCH"] as const;
export type RuleDiagnosticCode = (typeof RULE_DIAGNOSTIC_CODES)[number];

export interface RuleDiagnostic {
  code: RuleDiagnosticCode;
  layerId: string;
  message: string;
  suggestion?: string;
  clipId?: string;
  trackId?: string;
}

/**
 * PRD §7 / engine spec §7.2: the backend a routed animation should run on.
 * Aligned with `SURFACE_BACKENDS` (`src/core/document/effects.ts`) plus
 * `threejs`, which the v3.3 amendment calls out as its own tier above
 * `webgl2` — real 3D only, loaded lazily (engine spec §7.8).
 */
export const ROUTE_BACKENDS = ["css", "svg", "canvas2d", "webgl2", "webgpu", "threejs"] as const;
export type RouteBackend = (typeof ROUTE_BACKENDS)[number];

/** Engine spec §7.4: device tiers, lightest to heaviest capability. */
export const DEVICE_TIERS = ["T0", "T1", "T2", "T3"] as const;
export type DeviceTier = (typeof DEVICE_TIERS)[number];

export interface RouteDecision {
  backend: RouteBackend;
  reason: string;
  /** True when this decision only exists because a Pro override forced a heavier backend. */
  isProOverride?: boolean;
  /** Present when `requestedBackend` is heavier than needed and was honoured anyway. */
  memoryAndBatteryCost?: "low" | "medium" | "high";
  /** True when a device-tier or GPU-budget constraint forced a lighter backend than the properties alone would need (FX-PERF-02). */
  isTierDowngrade?: boolean;
}

export interface CanAddCandidate {
  category: AnimationCategory;
  trigger: string;
  properties: string[];
  description: string;
}

export type CanAddResult =
  | { visible: false; reason: string; candidates?: undefined }
  | { visible: true; candidates: CanAddCandidate[]; reason?: undefined };

export interface ElementCategoryCell {
  type: GrammarElementType;
  category: AnimationCategory;
  kind: CategoryCompatibilityKind;
  gate?: ConditionalGateKind;
}
