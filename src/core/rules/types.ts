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
  | "group-indicator"; // 7.4 — legal only for the group-level indicator-slide binding

export interface PromotionContext {
  /** 7.3.1: this instance opted into Hover/Active/StateTransition via `interactive: true`. */
  explicitPromotion?: boolean;
  /** 7.3.2: this element is the sole interactive-relevant child of its Button/Link parent. */
  singleChildPromotion?: boolean;
  /** 7.2.4: the candidate binding would participate in an inherited parent Stagger. */
  inheritsStagger?: boolean;
  /** 7.4: the candidate is the group-level indicator-slide binding, not a per-child one. */
  isGroupIndicatorBinding?: boolean;
}

export const RULE_DIAGNOSTIC_CODES = ["ANIM_COMPAT", "STA_CONFLICT", "PERF_LAYOUT", "A11Y_FLASH"] as const;
export type RuleDiagnosticCode = (typeof RULE_DIAGNOSTIC_CODES)[number];

export interface RuleDiagnostic {
  code: RuleDiagnosticCode;
  layerId: string;
  message: string;
  suggestion?: string;
  clipId?: string;
  trackId?: string;
}

/** PRD §7 / engine spec §7.2: the backend a routed animation should run on. */
export const ROUTE_BACKENDS = ["css", "svg", "canvas2d", "webgl2", "threejs"] as const;
export type RouteBackend = (typeof ROUTE_BACKENDS)[number];

export interface RouteDecision {
  backend: RouteBackend;
  reason: string;
  /** True when this decision only exists because a Pro override forced a heavier backend. */
  isProOverride?: boolean;
  /** Present when `requestedBackend` is heavier than needed and was honoured anyway. */
  memoryAndBatteryCost?: "low" | "medium" | "high";
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
