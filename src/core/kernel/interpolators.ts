"use client";

/**
 * ============================================================================
 * PHASE 9, SUB-PHASE 9.2 — INTERPOLATORS
 * ============================================================================
 * One entry point, `interpolateValue`, dispatching on the `InterpolationMethod`
 * `PROPERTY_REGISTRY` (Phase 7.1) already computes for every canonical
 * property path: numeric, colour (OKLab, `color.ts`), path (`PathMorphSolver`,
 * reused), clipPath, vector (per-component lerp), slerp (`Scene3DEngine`,
 * reused), gradient (per-stop) and discrete (hold). No new classification is
 * invented here — `properties.ts` already declared it in Phase 7.
 * ============================================================================
 */

import type { InterpolationMethod } from "../document/properties";
import type { PropValue } from "../document/registry";
import { PathMorphSolver } from "../engine/PathMorphSolver";
import { Scene3DEngine } from "../engine/Scene3DEngine";
import { mixColorsOklab } from "./color";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function isNumberArray(value: PropValue, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every((v) => typeof v === "number");
}

interface GradientStop {
  offset: number;
  color: string;
  [key: string]: PropValue;
}
function isGradientStops(value: PropValue): value is GradientStop[] {
  return Array.isArray(value) && value.every((v) => v !== null && typeof v === "object" && !Array.isArray(v) && "offset" in v && "color" in v);
}

/**
 * Interpolates one property value between `from` and `to` at `t ∈ [0, 1]`,
 * per its declared `InterpolationMethod`. Falls back to a discrete hold
 * whenever the actual values don't fit the method's expected shape (e.g. a
 * colour string the parser doesn't recognise) — never throws, since a
 * malformed authored value should degrade, not crash the kernel.
 */
export function interpolateValue(method: InterpolationMethod, from: PropValue, to: PropValue, t: number): PropValue {
  const clamped = Math.max(0, Math.min(1, t));

  switch (method) {
    case "numeric": {
      if (typeof from === "number" && typeof to === "number") return lerp(from, to, clamped);
      return holdDiscrete(from, to, clamped);
    }

    case "color": {
      if (typeof from === "string" && typeof to === "string") {
        const mixed = mixColorsOklab(from, to, clamped);
        if (mixed !== null) return mixed;
      }
      return holdDiscrete(from, to, clamped);
    }

    case "path": {
      if (typeof from === "string" && typeof to === "string") return PathMorphSolver.morph(from, to, clamped);
      return holdDiscrete(from, to, clamped);
    }

    case "clipPath": {
      if (typeof from === "string" && typeof to === "string") {
        const mixed = mixClipPath(from, to, clamped);
        if (mixed !== null) return mixed;
      }
      return holdDiscrete(from, to, clamped);
    }

    case "vector": {
      if (isNumberArray(from, 3) && isNumberArray(to, 3)) {
        return [lerp(from[0], to[0], clamped), lerp(from[1], to[1], clamped), lerp(from[2], to[2], clamped)];
      }
      return holdDiscrete(from, to, clamped);
    }

    case "slerp": {
      if (isNumberArray(from, 4) && isNumberArray(to, 4)) {
        return [...Scene3DEngine.quaternionSlerp([from[0], from[1], from[2], from[3]], [to[0], to[1], to[2], to[3]], clamped)];
      }
      return holdDiscrete(from, to, clamped);
    }

    case "gradient": {
      if (isGradientStops(from) && isGradientStops(to) && from.length === to.length) {
        return from.map((stop, i) => ({
          offset: lerp(stop.offset, to[i].offset, clamped),
          color: mixColorsOklab(stop.color, to[i].color, clamped) ?? (clamped < 1 ? stop.color : to[i].color),
        }));
      }
      return holdDiscrete(from, to, clamped);
    }

    case "discrete":
    default:
      return holdDiscrete(from, to, clamped);
  }
}

/** Web Animations spec convention for non-animatable/discrete values: hold `from` until the very end, then jump to `to`. */
function holdDiscrete(from: PropValue, to: PropValue, t: number): PropValue {
  return t < 1 ? from : to;
}

/**
 * `clip-path` shapes "of the same kind" (grammar's own phrasing): interpolate
 * the numeric arguments of matching shape functions (`inset()`, `circle()`,
 * `ellipse()`, `polygon()` with the same point count). Falls back to `null`
 * (→ discrete hold) for anything else — full clip-path interpolation is a
 * CSS Houdini-level problem; this covers the shapes the registry actually
 * authors today.
 */
function mixClipPath(from: string, to: string, t: number): string | null {
  const fnA = /^(\w+)\((.*)\)$/.exec(from.trim());
  const fnB = /^(\w+)\((.*)\)$/.exec(to.trim());
  if (!fnA || !fnB || fnA[1] !== fnB[1]) return null;

  const numsA = fnA[2].match(/-?[\d.]+/g)?.map(Number) ?? [];
  const numsB = fnB[2].match(/-?[\d.]+/g)?.map(Number) ?? [];
  if (numsA.length === 0 || numsA.length !== numsB.length) return null;

  // Re-inject interpolated numbers into A's template, preserving its units/separators.
  let i = 0;
  const mixedArgs = fnA[2].replace(/-?[\d.]+/g, () => {
    const value = lerp(numsA[i], numsB[i], t);
    i++;
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  });
  return `${fnA[1]}(${mixedArgs})`;
}
