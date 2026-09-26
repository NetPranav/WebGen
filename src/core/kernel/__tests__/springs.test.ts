/**
 * Phase 9.1 (v3.2): perceptual springs, checked against Motion's own
 * `visualDuration`/`bounce` spring generator (the real, installed `motion`
 * package) — not a hand-derived approximation of it — per the ROADMAP's
 * explicit instruction: "checked against Motion's bounce/visualDuration so a
 * Motion export feels the same."
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spring as motionSpring } from "motion";
import {
  perceptualToPhysical,
  evaluateSpring,
  springSettlingTime,
  dampingRatio,
  resolveSpringConfig,
  springFeel,
  SPRING_FEELS,
  springToCssLinear,
  DEFAULT_SPRING,
} from "../springs";

describe("Phase 9.1: perceptual → physical matches Motion's own spring generator", () => {
  const cases: Array<[number, number]> = [
    [0.3, 0.6],
    [0, 0.4],
    [0.6, 0.8],
    [0.1, 0.25],
  ];

  for (const [bounce, time] of cases) {
    it(`bounce=${bounce}, time=${time}`, () => {
      const physical = perceptualToPhysical(bounce, time);
      const gen = motionSpring({ visualDuration: time, bounce, keyframes: [0, 1] });

      // Compare while the spring is still meaningfully in flight — Motion's
      // generator clips to the exact target once its own rest thresholds are
      // met, which this module's pure analytic curve only approaches.
      for (const t of [0, 0.1, 0.2, 0.3, 0.4, 0.5, time * 0.8]) {
        const mine = evaluateSpring(physical, t, 0, 1, 0).value;
        const theirs = gen.next(t * 1000).value;
        assert.ok(Math.abs(mine - theirs) < 0.02, `t=${t}: mine=${mine}, motion=${theirs}`);
      }
    });
  }
});

describe("Phase 9.1: damping ratio and regimes", () => {
  it("bounce=0 is critically damped (ζ=1, clamped by Motion's own minDamping/maxDamping)", () => {
    const physical = perceptualToPhysical(0, 0.4);
    assert.ok(Math.abs(dampingRatio(physical) - 1) < 1e-9);
  });

  it("a positive bounce is underdamped (ζ<1)", () => {
    const physical = perceptualToPhysical(0.5, 0.5);
    assert.ok(dampingRatio(physical) < 1);
  });
});

describe("Phase 9.1: the spring integrator's boundary conditions and velocity handoff", () => {
  it("starts exactly at origin with the given initial velocity", () => {
    const physical = { stiffness: 200, damping: 15, mass: 1 };
    const sample = evaluateSpring(physical, 0, 10, 50, 7);
    assert.equal(sample.value, 10);
    assert.equal(sample.velocity, 7);
  });

  it("settles at the target for all three damping regimes", () => {
    const under = { stiffness: 300, damping: 10, mass: 1 }; // ζ < 1
    const critical = { stiffness: 300, damping: 2 * Math.sqrt(300), mass: 1 }; // ζ = 1
    const over = { stiffness: 300, damping: 100, mass: 1 }; // ζ > 1
    for (const spring of [under, critical, over]) {
      const settleT = springSettlingTime(spring);
      const { value } = evaluateSpring(spring, settleT, 0, 1, 0);
      assert.ok(Math.abs(value - 1) < 0.02, `settled value should be ~1, got ${value}`);
    }
  });

  it("a bouncier spring (lower damping ratio) settles no faster than a calmer one, all else equal", () => {
    const calm = perceptualToPhysical(0.05, 0.5);
    const bouncy = perceptualToPhysical(0.7, 0.5);
    assert.ok(springSettlingTime(bouncy) >= springSettlingTime(calm) - 0.05);
  });

  it("velocity handoff: retargeting mid-flight with the outgoing velocity produces a continuous curve (no pop)", () => {
    const physical = perceptualToPhysical(0.3, 0.6);
    const midT = 0.15;
    const before = evaluateSpring(physical, midT, 0, 1, 0);
    // Immediately retargeted from `before.value` with `before.velocity`: at t=0 of the new spring, it must match exactly.
    const after = evaluateSpring(physical, 0, before.value, 0, before.velocity);
    assert.ok(Math.abs(after.value - before.value) < 1e-9);
    assert.ok(Math.abs(after.velocity - before.velocity) < 1e-9);
  });
});

describe("Phase 9.1: resolution, feels and converters", () => {
  it("a bare spring() resolves to Motion's own default (stiffness 100, damping 10, mass 1)", () => {
    assert.deepEqual(resolveSpringConfig(null), DEFAULT_SPRING);
  });

  it("a physical SpringConfig passes through with mass defaulted to 1", () => {
    const resolved = resolveSpringConfig({ stiffness: 500, damping: 30 });
    assert.deepEqual(resolved, { stiffness: 500, damping: 30, mass: 1 });
  });

  it("every named feel resolves to a valid, distinct physical spring", () => {
    const feels = Object.keys(SPRING_FEELS) as Array<keyof typeof SPRING_FEELS>;
    const resolved = feels.map(springFeel);
    for (const r of resolved) {
      assert.ok(r.stiffness > 0 && r.damping >= 0 && r.mass > 0);
    }
    const stiffnesses = new Set(resolved.map((r) => r.stiffness));
    assert.equal(stiffnesses.size, feels.length, "each feel should be a distinct spring");
  });

  it("springToCssLinear produces a CSS Easing Level 2 linear() string", () => {
    const css = springToCssLinear(perceptualToPhysical(0.3, 0.5));
    assert.match(css, /^linear\([\d.,\s-]+\)$/);
  });
});
