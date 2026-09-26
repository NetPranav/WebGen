"use client";

/**
 * ============================================================================
 * PHASE 9, SUB-PHASE 9.1 — EASING LIBRARY
 * ============================================================================
 * `motion.ts`'s `parseEasing` turns an easing string into structure; this
 * module is the numeric evaluator that structure was always waiting for:
 * `sampleEasing(easing, t)` sames a normalized `t ∈ [0, 1]` and returns the
 * eased progress. Named-family formulas are ported line-for-line from GSAP's
 * own source (`gsap-core.js`, `_insertEase`/`_configBack`/`_configElastic`) —
 * golden-value tests compare against the real, installed `gsap` package
 * directly rather than a hand-derived approximation. `cubic-bezier` uses the
 * standard Newton-Raphson/bisection solver every browser uses for CSS
 * `cubic-bezier()`. `steps()` follows the CSS Easing Level 1 algorithm.
 * Springs are `springs.ts`'s job; see `sampleEasing`'s `spring` case.
 * ============================================================================
 */

import type { Easing, EasingFamily } from "../document/motion";
import { evaluateSpring, springSettlingTime, resolveSpringConfig } from "./springs";

// ============================================================================
// Named families (ported from GSAP's gsap-core.js)
// ============================================================================

type EaseFn = (p: number) => number;

const POWER_BY_FAMILY: Partial<Record<EasingFamily, number>> = {
  power0: 1,
  power1: 2,
  power2: 3,
  power3: 4,
  power4: 5,
  quad: 2,
  cubic: 3,
  quart: 4,
  quint: 5,
  strong: 5,
};

function powerIn(power: number): EaseFn {
  return power === 1 ? (p) => p : (p) => Math.pow(p, power);
}
function powerOut(power: number): EaseFn {
  return (p) => 1 - Math.pow(1 - p, power);
}
function powerInOut(power: number): EaseFn {
  return (p) => (p < 0.5 ? Math.pow(p * 2, power) / 2 : 1 - Math.pow((1 - p) * 2, power) / 2);
}

// gsap-core.js: Sine.
function sineIn(p: number): number {
  return p === 1 ? 1 : -Math.cos(p * (Math.PI / 2)) + 1;
}
// gsap-core.js: Circ.
function circIn(p: number): number {
  return -(Math.sqrt(1 - p * p) - 1);
}
// gsap-core.js: Expo.
function expoIn(p: number): number {
  return Math.pow(2, 10 * (p - 1)) * p + p * p * p * p * p * p * (1 - p);
}
// gsap-core.js's default derivation for a family that only defines easeIn.
function easeOutFromIn(easeIn: EaseFn): EaseFn {
  return (p) => 1 - easeIn(1 - p);
}
function easeInOutFromIn(easeIn: EaseFn): EaseFn {
  return (p) => (p < 0.5 ? easeIn(p * 2) / 2 : 1 - easeIn((1 - p) * 2) / 2);
}
// gsap-core.js: _easeInOutFromOut (used by Back/Elastic, which define easeOut first).
function easeInOutFromOut(easeOut: EaseFn): EaseFn {
  return (p) => (p < 0.5 ? (1 - easeOut(1 - p * 2)) / 2 : 0.5 + easeOut((p - 0.5) * 2) / 2);
}

// gsap-core.js: _configBack. Default overshoot 1.70158.
function backOut(overshoot = 1.70158): EaseFn {
  return (p) => {
    if (!p) return 0;
    const q = p - 1;
    return q * q * ((overshoot + 1) * q + overshoot) + 1;
  };
}
function backIn(overshoot = 1.70158): EaseFn {
  const out = backOut(overshoot);
  return (p) => 1 - out(1 - p);
}
function backInOut(overshoot = 1.70158): EaseFn {
  return easeInOutFromOut(backOut(overshoot));
}

// gsap-core.js: _configElastic. type "in" | "out" | undefined (inOut).
function configElastic(type: "in" | "out" | "inOut", amplitude = 1, period?: number): EaseFn {
  const p1 = amplitude >= 1 ? amplitude : 1;
  const p2initial = (period ?? (type !== "inOut" ? 0.3 : 0.45)) / (amplitude < 1 ? amplitude : 1);
  const p3 = (p2initial / (2 * Math.PI)) * (Math.asin(1 / p1) || 0);
  const p2 = (2 * Math.PI) / p2initial;
  const out: EaseFn = (p) => (p === 1 ? 1 : p1 * Math.pow(2, -10 * p) * Math.sin((p - p3) * p2) + 1);
  if (type === "out") return out;
  if (type === "in") return (p) => 1 - out(1 - p);
  return easeInOutFromOut(out);
}

// gsap-core.js: Bounce (n=7.5625, c=2.75).
const BOUNCE_N = 7.5625;
const BOUNCE_C = 2.75;
function bounceOut(p: number): number {
  const n1 = 1 / BOUNCE_C;
  const n2 = 2 * n1;
  const n3 = 2.5 * n1;
  if (p < n1) return BOUNCE_N * p * p;
  if (p < n2) {
    const q = p - 1.5 / BOUNCE_C;
    return BOUNCE_N * q * q + 0.75;
  }
  if (p < n3) {
    const q = p - 2.25 / BOUNCE_C;
    return BOUNCE_N * q * q + 0.9375;
  }
  const q = p - 2.625 / BOUNCE_C;
  return BOUNCE_N * q * q + 0.984375;
}
function bounceIn(p: number): number {
  return 1 - bounceOut(1 - p);
}

function namedEase(family: EasingFamily, direction: "in" | "out" | "inOut", params: number[]): EaseFn {
  const power = POWER_BY_FAMILY[family];
  if (power !== undefined) {
    return direction === "in" ? powerIn(power) : direction === "out" ? powerOut(power) : powerInOut(power);
  }
  switch (family) {
    case "sine":
      return direction === "in" ? sineIn : direction === "out" ? easeOutFromIn(sineIn) : easeInOutFromIn(sineIn);
    case "circ":
      return direction === "in" ? circIn : direction === "out" ? easeOutFromIn(circIn) : easeInOutFromIn(circIn);
    case "expo":
      return direction === "in" ? expoIn : direction === "out" ? easeOutFromIn(expoIn) : easeInOutFromIn(expoIn);
    case "back": {
      const overshoot = params[0];
      return direction === "in" ? backIn(overshoot) : direction === "out" ? backOut(overshoot) : backInOut(overshoot);
    }
    case "elastic":
      return configElastic(direction, params[0], params[1]);
    case "bounce":
      return direction === "in" ? bounceIn : direction === "out" ? bounceOut : easeInOutFromIn(bounceIn);
    default:
      return (p) => p;
  }
}

// ============================================================================
// cubic-bezier(x1, y1, x2, y2): the standard CSS timing-function solver.
// ============================================================================

function bezierComponent(a1: number, a2: number, t: number): number {
  // B(t) for a cubic with endpoints 0 and 1: 3(1-t)^2 t a1 + 3(1-t) t^2 a2 + t^3
  const u = 1 - t;
  return 3 * u * u * t * a1 + 3 * u * t * t * a2 + t * t * t;
}
function bezierComponentDerivative(a1: number, a2: number, t: number): number {
  const u = 1 - t;
  return 3 * u * u * a1 + 6 * u * t * (a2 - a1) + 3 * t * t * (1 - a2);
}

/** Solves x(t) = x for t, via Newton-Raphson with a bisection fallback (the standard CSS cubic-bezier algorithm). */
function solveCubicBezierT(x1: number, x2: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  let t = x; // a linear initial guess is a good enough starting point for Newton-Raphson here
  for (let i = 0; i < 8; i++) {
    const dx = bezierComponent(x1, x2, t) - x;
    if (Math.abs(dx) < 1e-7) return t;
    const d = bezierComponentDerivative(x1, x2, t);
    if (Math.abs(d) < 1e-7) break;
    t -= dx / d;
  }

  // Newton-Raphson didn't converge (a very flat derivative) — bisect instead.
  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 30; i++) {
    const cx = bezierComponent(x1, x2, t);
    if (Math.abs(cx - x) < 1e-7) return t;
    if (cx < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return t;
}

export function sampleCubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const solvedT = solveCubicBezierT(x1, x2, x);
  return bezierComponent(y1, y2, solvedT);
}

// ============================================================================
// steps(count, position): CSS Easing Level 1 §4 step algorithm.
// ============================================================================

export function sampleSteps(count: number, position: "start" | "end" | "none" | "both", t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const jumps = position === "none" ? count - 1 : position === "both" ? count + 1 : count;

  let currentStep = Math.floor(clamped * count);
  if (position === "start" || position === "both") currentStep += 1;
  if (clamped >= 1) currentStep = jumps;
  currentStep = Math.max(0, Math.min(jumps, currentStep));

  return jumps <= 0 ? (clamped >= 1 ? 1 : 0) : currentStep / jumps;
}

// ============================================================================
// The single entry point: sampleEasing(easing, t) → progress.
// ============================================================================

/**
 * Springs have no fixed [0, 1] duration of their own (they run until they
 * settle) — when a spring is used as a keyframe segment's easing, its
 * natural settling time (`springSettlingTime`) becomes the segment's
 * effective 100%, so `sampleEasing` can still answer "progress at t ∈ [0, 1]"
 * uniformly for every easing kind.
 */
export function sampleEasing(easing: Easing, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing.kind) {
    case "linear":
      return clamped;
    case "named":
      return namedEase(easing.family, easing.direction, easing.params)(clamped);
    case "cubicBezier":
      return sampleCubicBezier(easing.x1, easing.y1, easing.x2, easing.y2, clamped);
    case "steps":
      return sampleSteps(easing.count, easing.position, clamped);
    case "spring": {
      const spring = resolveSpringConfig(easing.spring);
      const settlingTime = springSettlingTime(spring);
      const { value } = evaluateSpring(spring, clamped * settlingTime, 0, 1, 0);
      return value;
    }
  }
}
