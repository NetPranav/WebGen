"use client";

/**
 * ============================================================================
 * PHASE 9, SUB-PHASE 9.1 (v3.2) — PERCEPTUAL SPRINGS & THE PHYSICS LIBRARY
 * ============================================================================
 * `motion.ts`'s `SpringSchema` already types both faces (Law 17): perceptual
 * `{ bounce, time }` (Simple mode) and physical `{ stiffness, damping, mass? }`
 * (Pro mode). This module is the 1:1 conversion the schema comment promises,
 * an analytic under/critically/over-damped integrator with velocity handoff
 * (for interrupting a spring mid-flight without a visible pop), and the
 * cross-engine converters 9.1 asks for.
 *
 * The perceptual→physical formula is ported from Motion's own spring
 * generator (`motion-dom/src/animation/generators/spring.mjs`,
 * `getSpringOptions`'s `visualDuration` branch) so a Motion export feels the
 * same as the in-editor preview, per the ROADMAP's explicit instruction to
 * check this against Motion's `bounce`/`visualDuration`.
 * ============================================================================
 */

import type { SpringConfig } from "../document/motion";
import { AnimationLoweringCompiler } from "../engine/AnimationLoweringCompiler";

export interface PhysicalSpring {
  stiffness: number;
  damping: number;
  mass: number;
}

/** Motion's default spring (`springDefaults` in spring.mjs): stiffness 100, damping 10, mass 1. */
export const DEFAULT_SPRING: PhysicalSpring = { stiffness: 100, damping: 10, mass: 1 };

/** The 4 named feels Simple mode offers (grammar/ROADMAP 9.1), as perceptual `{ bounce, time }` presets. */
export const SPRING_FEELS = {
  snappy: { bounce: 0.1, time: 0.25 },
  smooth: { bounce: 0, time: 0.35 },
  bouncy: { bounce: 0.45, time: 0.5 },
  lazy: { bounce: 0.15, time: 0.9 },
} as const satisfies Record<string, { bounce: number; time: number }>;
export type SpringFeel = keyof typeof SPRING_FEELS;

function isPerceptual(spring: SpringConfig): spring is { bounce: number; time: number } {
  return "bounce" in spring && "time" in spring;
}

/**
 * Perceptual → physical (Motion's `visualDuration` formula, mass fixed at 1):
 *   dampingRatio = clamp(0.05, 1, 1 − bounce)
 *   naturalFreq  = 2π / (time × 1.2)
 *   stiffness    = naturalFreq²
 *   damping      = 2 × dampingRatio × √stiffness
 */
export function perceptualToPhysical(bounce: number, time: number): PhysicalSpring {
  const dampingRatio = Math.max(0.05, Math.min(1, 1 - bounce));
  const naturalFreq = (2 * Math.PI) / (time * 1.2);
  const stiffness = naturalFreq * naturalFreq;
  const damping = 2 * dampingRatio * Math.sqrt(stiffness);
  return { stiffness, damping, mass: 1 };
}

/** Resolves a `SpringConfig` (perceptual or physical) — or `null` (a bare `spring()`) — to physical terms. */
export function resolveSpringConfig(spring: SpringConfig | null): PhysicalSpring {
  if (spring === null) return DEFAULT_SPRING;
  if (isPerceptual(spring)) return perceptualToPhysical(spring.bounce, spring.time);
  return { stiffness: spring.stiffness, damping: spring.damping, mass: spring.mass ?? 1 };
}

export function springFeel(feel: SpringFeel): PhysicalSpring {
  const { bounce, time } = SPRING_FEELS[feel];
  return perceptualToPhysical(bounce, time);
}

/** Damping ratio ζ = c / (2√(km)). ζ < 1 underdamped, = 1 critically damped, > 1 overdamped. */
export function dampingRatio(spring: PhysicalSpring): number {
  return spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
}

export interface SpringSample {
  value: number;
  velocity: number;
}

/**
 * Analytic damped harmonic oscillator, self-derived from the boundary
 * conditions x(0) = origin, x'(0) = initialVelocity (so an interrupted
 * spring's outgoing velocity becomes the next one's `initialVelocity` —
 * "velocity handoff", ROADMAP 9.1) — verified against Motion's own
 * `spring.mjs` `resolveSpring`/`resolveVelocity` (their `s.velocity` is the
 * negation of this module's `initialVelocity`, an artifact of their internal
 * sign convention; the value curves are identical).
 */
export function evaluateSpring(
  spring: PhysicalSpring,
  t: number,
  origin = 0,
  target = 1,
  initialVelocity = 0
): SpringSample {
  if (t <= 0) return { value: origin, velocity: initialVelocity };

  const { stiffness: k, damping: c, mass: m } = spring;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  const delta = target - origin;
  const v0 = initialVelocity;
  const decay = zeta * w0;

  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const A = (decay * delta - v0) / wd;
    const env = Math.exp(-decay * t);
    const s = Math.sin(wd * t);
    const cst = Math.cos(wd * t);
    const value = target - env * (A * s + delta * cst);
    const velocity = decay * env * (A * s + delta * cst) - env * wd * (A * cst - delta * s);
    return { value, velocity };
  }

  if (zeta === 1) {
    const env = Math.exp(-w0 * t);
    const c1 = w0 * delta - v0;
    const value = target - env * (delta + c1 * t);
    const velocity = env * (w0 * (delta + c1 * t) - c1);
    return { value, velocity };
  }

  const wd = w0 * Math.sqrt(zeta * zeta - 1);
  const A = (decay * delta - v0) / wd;
  const env = Math.exp(-decay * t);
  const sh = Math.sinh(Math.min(wd * t, 300));
  const ch = Math.cosh(Math.min(wd * t, 300));
  const value = target - env * (A * sh + delta * ch);
  const velocity = decay * env * (A * sh + delta * ch) - env * wd * (A * ch + delta * sh);
  return { value, velocity };
}

/**
 * How long (seconds) this spring takes to visibly settle within `epsilon` of
 * its target and stay there — used to give a spring easing a concrete
 * duration when it sits on a fixed-length keyframe segment (`easing.ts`).
 * Numeric (mirrors Motion's own `calcGeneratorDuration` approach) rather than
 * a closed form, so it stays correct across all three damping regimes.
 */
export function springSettlingTime(spring: PhysicalSpring, epsilon = 0.01, maxSeconds = 10): number {
  const sampleRate = 240; // Hz; fine enough to catch the last oscillation peak
  const dt = 1 / sampleRate;
  let lastUnsettled = 0;
  for (let t = 0; t <= maxSeconds; t += dt) {
    const { value } = evaluateSpring(spring, t, 0, 1, 0);
    if (Math.abs(value - 1) > epsilon) lastUnsettled = t;
  }
  return Math.max(0.05, Math.min(maxSeconds, lastUnsettled + dt));
}

// ============================================================================
// Cross-engine converters (9.1)
// ============================================================================

/** spring → CSS Easing Level 2 `linear(...)`, reusing the existing compiler (Phase 2's `generateCssLinearSpring`). */
export function springToCssLinear(spring: PhysicalSpring, points = 24): string {
  return AnimationLoweringCompiler.generateCssLinearSpring(spring.stiffness, spring.damping, spring.mass, points);
}

/** spring → a Motion `Transition` config object. */
export function springToMotionConfig(spring: PhysicalSpring): { type: "spring"; stiffness: number; damping: number; mass: number } {
  return { type: "spring", stiffness: spring.stiffness, damping: spring.damping, mass: spring.mass };
}

/** ease (non-spring) → a GSAP ease string, e.g. `{kind:"named",family:"back",direction:"out",params:[1.7]}` → `"back.out(1.7)"`. */
export function easeToGsapString(easing: { kind: string; family?: string; direction?: string; params?: number[]; x1?: number; y1?: number; x2?: number; y2?: number; count?: number }): string {
  if (easing.kind === "linear") return "none";
  if (easing.kind === "named") {
    const paramStr = easing.params && easing.params.length > 0 ? `(${easing.params.join(",")})` : "";
    return `${easing.family}.${easing.direction}${paramStr}`;
  }
  if (easing.kind === "cubicBezier") return `cubic-bezier(${easing.x1},${easing.y1},${easing.x2},${easing.y2})`;
  if (easing.kind === "steps") return `steps(${easing.count})`;
  return "power2.out";
}

/** ease (non-spring) → a WAAPI `KeyframeAnimationOptions.easing` string. */
export function easeToWaapiEasing(easing: { kind: string; x1?: number; y1?: number; x2?: number; y2?: number; count?: number; position?: string }): string {
  if (easing.kind === "linear") return "linear";
  if (easing.kind === "cubicBezier") return `cubic-bezier(${easing.x1}, ${easing.y1}, ${easing.x2}, ${easing.y2})`;
  if (easing.kind === "steps") {
    const jumpterm = easing.position && easing.position !== "end" ? `, jump-${easing.position}` : "";
    return `steps(${easing.count}${jumpterm})`;
  }
  return "ease"; // named GSAP families have no WAAPI equivalent; fall back to the closest CSS keyword
}
