"use client";

/**
 * ============================================================================
 * PHASE 8, SUB-PHASE 8.1 — PERFORMANCE RULES
 * ============================================================================
 * Layout-triggering paths and filter cost, per the goal statement's rule
 * families ("compatibility... conflicts... performance... accessibility").
 * Reuses `getPropertyRenderingTier` (grammarHelpers.ts) rather than
 * re-deriving the tier boundaries: Tier 3 (Layout Reflow) is what §6.8's
 * "no continuous binding on any layout-class property" rule (v0.2) and the
 * `[PERF_LAYOUT]` diagnostic both key off.
 * ============================================================================
 */

import { getPropertyRenderingTier } from "../engine/grammarHelpers";
import type { AnimationCategory } from "../types/element-grammar";

export function isLayoutTriggeringProperty(property: string): boolean {
  return getPropertyRenderingTier(property).tier === 3;
}

export function isFilterCostProperty(property: string): boolean {
  return property.toLowerCase().startsWith("filter") || property.toLowerCase().startsWith("backdrop");
}

/**
 * Categories that run every frame while active (continuous). Grammar §6.8's
 * v0.2 addition: a continuous binding on a layout-class property has no
 * acceptable frame cost, full stop — no priority order can make it legal.
 */
const CONTINUOUS_CATEGORIES: ReadonlySet<AnimationCategory> = new Set<AnimationCategory>([
  "ScrollLinked",
  "Ambient",
  "Reactive",
]);

export function isContinuousCategory(category: AnimationCategory): boolean {
  return CONTINUOUS_CATEGORIES.has(category);
}

/**
 * Grammar §6.8: a continuous (ScrollLinked/Ambient) binding may never target
 * a layout-triggering property. Returns the offending properties, if any.
 */
export function findLayoutPerformanceViolations(category: AnimationCategory, properties: string[]): string[] {
  if (!isContinuousCategory(category)) return [];
  return properties.filter(isLayoutTriggeringProperty);
}
