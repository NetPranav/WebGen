"use client";

/**
 * ============================================================================
 * PHASE 8, SUB-PHASE 8.3 (STAGE 1) — ENGINE ROUTING
 * ============================================================================
 * ROADMAP §8.3: route by trying backends lightest-to-heaviest and stopping at
 * the first that can express the effect (v3.3 amendment, engine spec §7.8):
 *   1. CSS/DOM  2. SVG  3. Canvas 2D  4. WebGL2 (minimal 2D helper)  5. three.js
 * GSAP is never a runtime routing target — Phase 14's licence gate (checked
 * 2026-09-26, `LICENSES.md` GATE-01) keeps it an opt-in *export* target only,
 * which this module enforces by construction: `RouteBackend` has no `"gsap"`
 * member.
 *
 * This is Stage 1: it routes today's property catalogue (`AnimationTrackId`)
 * by which surface can express it. It does not yet know about device tiers,
 * GPU memory budgets or the Phase 61 compositor — that full decision tree
 * needs Track X (Phases 59–61), which land after Phase 8 in the execution
 * order (`DOCS/order.md`). Extending this module when that lands is the
 * intended seam, not a rewrite.
 * ============================================================================
 */

import type { RouteBackend, RouteDecision } from "./types";

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
  threejs: 4,
};

const BACKEND_COST: Record<RouteBackend, "low" | "medium" | "high"> = {
  css: "low",
  svg: "low",
  canvas2d: "medium",
  webgl2: "high",
  threejs: "high",
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
}

export function routeAnimation(input: RouteInput): RouteDecision {
  const { backend: minimalBackend, reason } = cheapestCapableBackend(input.properties);

  if (!input.requestedBackend || input.requestedBackend === minimalBackend) {
    return { backend: minimalBackend, reason };
  }

  if (BACKEND_WEIGHT[input.requestedBackend] < BACKEND_WEIGHT[minimalBackend]) {
    // A Pro override may not request a backend lighter than what the properties require.
    return { backend: minimalBackend, reason: `${reason} (requested "${input.requestedBackend}" cannot express these properties; using the minimum required backend instead.)` };
  }

  return {
    backend: input.requestedBackend,
    reason: `Pro override: ${reason.replace(/^Runs entirely on|^Targets an? /, "the minimum backend ")} was overridden to run on ${input.requestedBackend}.`,
    isProOverride: true,
    memoryAndBatteryCost: BACKEND_COST[input.requestedBackend],
  };
}
