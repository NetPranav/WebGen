/**
 * Sub-Phase 8.3 (Stage 1): engine routing tries lightest-to-heaviest and
 * stops at the first capable backend, and never routes to GSAP by default
 * (Phase 14's licence gate, `LICENSES.md` GATE-01).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { routeAnimation } from "../routing";
import { ROUTE_BACKENDS } from "../types";

describe("Sub-Phase 8.3: engine routing", () => {
  it("routes ordinary transform/opacity properties to CSS", () => {
    const decision = routeAnimation({ properties: ["transform.y", "opacity"] });
    assert.equal(decision.backend, "css");
  });

  it("routes SVG-only properties to SVG", () => {
    const decision = routeAnimation({ properties: ["strokeDashoffset"] });
    assert.equal(decision.backend, "svg");
  });

  it("routes real-3D scene properties to three.js", () => {
    const decision = routeAnimation({ properties: ["rotation3D"] });
    assert.equal(decision.backend, "threejs");
  });

  it("never returns a GSAP backend — GSAP is export-only (Phase 14 licence gate)", () => {
    assert.ok(!(ROUTE_BACKENDS as readonly string[]).includes("gsap"));
  });

  it("a Pro override may not request a backend lighter than what the properties need", () => {
    const decision = routeAnimation({ properties: ["rotation3D"], requestedBackend: "css" });
    assert.equal(decision.backend, "threejs");
  });

  it("a Pro override to a heavier backend is honoured and flagged with its cost", () => {
    const decision = routeAnimation({ properties: ["opacity"], requestedBackend: "webgl2" });
    assert.equal(decision.backend, "webgl2");
    assert.equal(decision.isProOverride, true);
    assert.equal(decision.memoryAndBatteryCost, "high");
  });
});
