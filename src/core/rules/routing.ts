"use client";

/**
 * ============================================================================
 * PHASE 8, SUB-PHASE 8.3 — ENGINE ROUTING
 * ============================================================================
 * ROADMAP §8.3: route by trying backends lightest-to-heaviest and stopping at
 * the first that can express the effect (v3.3 amendment, engine spec §7.8):
 *   1. CSS/DOM  2. SVG  3. Canvas 2D  4. WebGL2 (minimal 2D helper)  5. WebGPU  6. three.js
 * GSAP is never a runtime routing target — Phase 14's licence gate (checked
 * 2026-09-26, `LICENSES.md` GATE-01) keeps it an opt-in *export* target only,
 * which this module enforces by construction: `RouteBackend` has no `"gsap"`
 * member.
 *
 * `routeAnimation` is a pure function with two independent axes, both scored:
 *   1. What the properties need (`cheapestCapableBackend`) — the effect's own floor.
 *   2. What the device tier can afford (`MAX_BACKEND_BY_TIER`, FX-PERF-02) — a ceiling
 *      that can force a *downgrade* (with the fallback chain a Surface already
 *      declares, engine spec §7.2) below what the properties would otherwise use.
 * A Pro override can raise the choice above the floor, never below it, and never
 * above what a device tier allows unless the caller explicitly forces it.
 *
 * No device-tier telemetry exists yet — Phase 61's compositor and Phase 84's
 * device matrix are what will actually populate `deviceTier` at runtime. This
 * function is the decision tree those phases call into, not a stub: it is
 * fully scored and tested today against the property catalogue and tier caps
 * we do know (`DEVICE_TIERS`, `src/core/document/effects.ts`).
 * ============================================================================
 */

import type { DeviceTier, RouteBackend, RouteDecision } from "./types";

const SVG_ONLY_PROPERTIES = new Set([
  "svg.strokeDashoffset",
  "svg.pathMorph",
  "svg.motionPath",
  "svg.gradientStopOffset",
  "svg.gradientStopColor",
  "svg.feGaussianBlur",
  "svg.feColorMatrix",
  "svg.feDisplacementMap",
  "strokeDashoffset",
  "pathMorph",
  "motionPath",
  "gradientStopOffset",
  "gradientStopColor",
  "feGaussianBlur",
  "feColorMatrix",
  "feDisplacementMap",
]);

const REAL_3D_PROPERTIES = new Set([
  "scene3d.position",
  "scene3d.rotation",
  "scene3d.scale",
  "scene3d.cameraFov",
  "scene3d.lightIntensity",
  "scene3d.lightColor",
  "position3D",
  "rotation3D",
  "scale3D",
  "cameraFov",
  "lightIntensity",
  "lightColor",
]);

const BACKEND_WEIGHT: Record<RouteBackend, number> = {
  css: 0,
  svg: 1,
  canvas2d: 2,
  webgl2: 3,
  webgpu: 4,
  threejs: 5,
};

const BACKEND_COST: Record<RouteBackend, "low" | "medium" | "high"> = {
  css: "low",
  svg: "low",
  canvas2d: "medium",
  webgl2: "high",
  webgpu: "high",
  threejs: "high",
};

/** Engine spec §7.4/FX-PERF-02: the heaviest backend each device tier can sustain. */
const MAX_BACKEND_BY_TIER: Record<DeviceTier, RouteBackend> = {
  T0: "css",
  T1: "canvas2d",
  T2: "webgl2",
  T3: "threejs",
};

function cheapestCapableBackend(properties: string[]): { backend: RouteBackend; reason: string } {
  if (properties.some((p) => REAL_3D_PROPERTIES.has(p))) {
    return { backend: "threejs", reason: "Targets a real 3D scene property, so it runs in three.js (loaded lazily)." };
  }
  if (properties.some((p) => SVG_ONLY_PROPERTIES.has(p))) {
    return { backend: "svg", reason: "Targets an SVG-only property (stroke/path/filter primitive), so it runs on the SVG backend." };
  }
  return { backend: "css", reason: "Runs entirely on CSS transforms/opacity/filter or WAAPI, so it needs no GPU surface." };
}

export interface RouteInput {
  properties: string[];
  /** A Pro-mode override. Validated: it may only request a backend at or above what the properties actually need. */
  requestedBackend?: RouteBackend;
  /** FX-PERF-02: caps the choice to what this device tier can sustain, unless `forceRequestedBackend` overrides it. */
  deviceTier?: DeviceTier;
  /** An explicit acknowledgement that a Pro override should run even above the device tier's normal ceiling. */
  forceRequestedBackend?: boolean;
}

export function routeAnimation(input: RouteInput): RouteDecision {
  const { backend: minimalBackend, reason } = cheapestCapableBackend(input.properties);

  const tierCeiling = input.deviceTier ? MAX_BACKEND_BY_TIER[input.deviceTier] : undefined;
  const tierExceeded = tierCeiling !== undefined && BACKEND_WEIGHT[minimalBackend] > BACKEND_WEIGHT[tierCeiling];

  if (!input.requestedBackend || input.requestedBackend === minimalBackend) {
    if (tierExceeded) {
      return {
        backend: tierCeiling!,
        reason: `${reason} Device tier ${input.deviceTier} can't sustain that, so it's degraded to ${tierCeiling} (FX-PERF-02): a Surface's own fallback chain takes over from here.`,
        isTierDowngrade: true,
      };
    }
    return { backend: minimalBackend, reason };
  }

  if (BACKEND_WEIGHT[input.requestedBackend] < BACKEND_WEIGHT[minimalBackend]) {
    // A Pro override may not request a backend lighter than what the properties require.
    return { backend: minimalBackend, reason: `${reason} (requested "${input.requestedBackend}" cannot express these properties; using the minimum required backend instead.)` };
  }

  if (tierCeiling && BACKEND_WEIGHT[input.requestedBackend] > BACKEND_WEIGHT[tierCeiling] && !input.forceRequestedBackend) {
    return {
      backend: tierCeiling,
      reason: `Pro override "${input.requestedBackend}" exceeds device tier ${input.deviceTier}'s ceiling (${tierCeiling}); capped there. Pass forceRequestedBackend to override anyway, with its cost shown.`,
      isTierDowngrade: true,
    };
  }

  return {
    backend: input.requestedBackend,
    reason: `Pro override: ${reason.replace(/^Runs entirely on|^Targets an? /, "the minimum backend ")} was overridden to run on ${input.requestedBackend}.`,
    isProOverride: true,
    memoryAndBatteryCost: BACKEND_COST[input.requestedBackend],
  };
}
