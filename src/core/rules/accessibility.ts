"use client";

/**
 * ============================================================================
 * PHASE 8, SUB-PHASE 8.1 — ACCESSIBILITY RULES
 * ============================================================================
 * Reduced-motion requirements (grammar §9) and the flashing limit of
 * ≤ 3 flashes/second (WCAG 2.3.1, named explicitly in the Phase 8 goal
 * statement). Reduced-motion evaluation is a thin re-export of the already-
 * correct `ElementGrammarEngine` implementation (§9.2/§9.3); flash detection
 * is new, since nothing in the codebase measured it before this phase.
 * ============================================================================
 */

import { ElementGrammarEngine } from "../engine/ElementGrammarEngine";
import type { Clip, Keyframe } from "../document/motion";
import type { ReducedMotionPolicy } from "../types/element-grammar";

export const MAX_FLASHES_PER_SECOND = 3;

export const resolveReducedMotion = ElementGrammarEngine.evaluateReducedMotion.bind(ElementGrammarEngine);
export const applyReducedMotionFallback = ElementGrammarEngine.applyReducedMotionFallback.bind(ElementGrammarEngine);

/** Property paths whose rapid oscillation reads as a "flash" (WCAG 2.3.1). */
const FLASHABLE_PROPERTY_PREFIXES = ["appearance.opacity", "opacity", "appearance.background", "background", "filter.brightness"];

export function isFlashableProperty(property: string): boolean {
  const p = property.toLowerCase();
  return FLASHABLE_PROPERTY_PREFIXES.some((prefix) => p.startsWith(prefix));
}

/** Counts local direction reversals in a keyframe track — one reversal pair is one flash. */
function countOscillations(keyframes: Keyframe[]): number {
  const numeric = keyframes
    .map((kf) => (typeof kf.value === "number" ? kf.value : null))
    .filter((v): v is number => v !== null);
  if (numeric.length < 3) return 0;

  let reversals = 0;
  let lastDirection: 1 | -1 | 0 = 0;
  for (let i = 1; i < numeric.length; i++) {
    const delta = numeric[i] - numeric[i - 1];
    if (delta === 0) continue;
    const direction: 1 | -1 = delta > 0 ? 1 : -1;
    if (lastDirection !== 0 && direction !== lastDirection) reversals++;
    lastDirection = direction;
  }
  // Each reversal pair (down-then-up, or up-then-down) is roughly one flash cycle.
  return Math.floor(reversals / 2);
}

/**
 * Estimates flashes/second for a clip's flashable tracks. A `loop`/`scroll`
 * clip with `repeat: -1` is continuous, so the single-play rate already is
 * the sustained rate; a one-shot clip's rate is reported for completeness
 * but is not itself a violation (WCAG concerns *repeated* flashing).
 */
export function estimateFlashesPerSecond(clip: Clip): number {
  if (clip.duration <= 0) return 0;
  let maxRate = 0;
  for (const track of clip.tracks) {
    if (!isFlashableProperty(track.property)) continue;
    const oscillations = countOscillations(track.keyframes);
    const rate = oscillations / clip.duration;
    if (rate > maxRate) maxRate = rate;
  }
  return maxRate;
}

export function exceedsFlashLimit(clip: Clip): boolean {
  const isSustained = clip.repeat === -1 || clip.repeat === undefined ? clip.type === "loop" : clip.repeat > 0;
  if (!isSustained) return false;
  return estimateFlashesPerSecond(clip) > MAX_FLASHES_PER_SECOND;
}

export type { ReducedMotionPolicy };
