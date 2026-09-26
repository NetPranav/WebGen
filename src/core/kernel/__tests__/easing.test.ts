/**
 * Phase 9 Verification Gate: "Golden-value tests for every easing... against
 * reference implementations (GSAP's easing functions, the CSS spec for
 * cubic-bezier()/linear())."
 *
 * Named-family values are checked against the real, installed `gsap`
 * package's own `gsap.parseEase(...)` — not a hand-derived approximation of
 * it — at a battery of sample points per family/direction.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gsap } from "gsap";
import { sampleEasing, sampleCubicBezier, sampleSteps } from "../easing";
import { parseEasing } from "../../document/motion";
import type { EasingFamily } from "../../document/motion";

const SAMPLE_TS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

function assertMatchesGsap(easingString: string, tolerance = 1e-6) {
  const parsed = parseEasing(easingString);
  assert.ok(parsed, `"${easingString}" must parse`);
  const gsapFn = gsap.parseEase(easingString);
  for (const t of SAMPLE_TS) {
    const mine = sampleEasing(parsed!, t);
    const theirs = gsapFn(t);
    assert.ok(
      Math.abs(mine - theirs) < tolerance,
      `${easingString} at t=${t}: got ${mine}, gsap gives ${theirs}`
    );
  }
}

describe("Phase 9.1: named easing families match GSAP exactly", () => {
  const families: EasingFamily[] = ["power0", "power1", "power2", "power3", "power4", "quad", "cubic", "quart", "quint", "strong", "sine", "circ", "expo", "bounce"];
  for (const family of families) {
    for (const direction of ["in", "out", "inOut"] as const) {
      it(`${family}.${direction}`, () => assertMatchesGsap(`${family}.${direction}`));
    }
  }

  it("back.in/out/inOut with the default overshoot", () => {
    assertMatchesGsap("back.in");
    assertMatchesGsap("back.out");
    assertMatchesGsap("back.inOut");
  });
  it("back.out(1.7) (an explicit overshoot parameter)", () => assertMatchesGsap("back.out(1.7)"));
  it("elastic.out/in with default amplitude/period", () => {
    assertMatchesGsap("elastic.out");
    assertMatchesGsap("elastic.in");
  });
  it("elastic.out(1,0.3) (explicit amplitude/period)", () => assertMatchesGsap("elastic.out(1,0.3)"));
});

describe("Phase 9.1: cubic-bezier() — the standard CSS solver", () => {
  it("is the identity at the endpoints for every curve", () => {
    for (const [x1, y1, x2, y2] of [[0.25, 0.1, 0.25, 1], [0.42, 0, 1, 1], [0.68, -0.55, 0.27, 1.55]] as const) {
      assert.equal(sampleCubicBezier(x1, y1, x2, y2, 0), 0);
      assert.ok(Math.abs(sampleCubicBezier(x1, y1, x2, y2, 1) - 1) < 1e-6);
    }
  });

  it("bisects a symmetric curve exactly at its midpoint", () => {
    // cubic-bezier(0.5, 0, 0.5, 1) is point-symmetric about (0.5, 0.5).
    assert.ok(Math.abs(sampleCubicBezier(0.5, 0, 0.5, 1, 0.5) - 0.5) < 1e-6);
  });

  it("CSS's own named aliases match this solver (ease, ease-in, ease-out, ease-in-out)", () => {
    const aliases: Record<string, [number, number, number, number]> = {
      ease: [0.25, 0.1, 0.25, 1],
      "ease-in": [0.42, 0, 1, 1],
      "ease-out": [0, 0, 0.58, 1],
      "ease-in-out": [0.42, 0, 0.58, 1],
    };
    for (const [name, [x1, y1, x2, y2]] of Object.entries(aliases)) {
      const parsed = parseEasing(name)!;
      for (const t of SAMPLE_TS) {
        assert.ok(Math.abs(sampleEasing(parsed, t) - sampleCubicBezier(x1, y1, x2, y2, t)) < 1e-9);
      }
    }
  });

  it("matches a slow, always-correct bisection oracle for an asymmetric curve", () => {
    // An independent, brute-force reference: sample x(t') finely and invert by nearest match.
    const [x1, y1, x2, y2] = [0.68, -0.55, 0.27, 1.55];
    const bezier = (a1: number, a2: number, t: number) => {
      const u = 1 - t;
      return 3 * u * u * t * a1 + 3 * u * t * t * a2 + t * t * t;
    };
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      let bestT = 0;
      let bestDiff = Infinity;
      for (let i = 0; i <= 100000; i++) {
        const t = i / 100000;
        const diff = Math.abs(bezier(x1, x2, t) - x);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestT = t;
        }
      }
      const oracleY = bezier(y1, y2, bestT);
      const mineY = sampleCubicBezier(x1, y1, x2, y2, x);
      assert.ok(Math.abs(oracleY - mineY) < 1e-4, `x=${x}: oracle ${oracleY}, mine ${mineY}`);
    }
  });
});

describe("Phase 9.1: steps() — CSS Easing Level 1 §4", () => {
  it("jump-end (the CSS/GSAP default): holds at each step's start, reaching 1 only at t=1", () => {
    assert.equal(sampleSteps(4, "end", 0), 0);
    assert.equal(sampleSteps(4, "end", 0.24), 0);
    assert.equal(sampleSteps(4, "end", 0.26), 0.25);
    assert.equal(sampleSteps(4, "end", 0.74), 0.5);
    assert.equal(sampleSteps(4, "end", 0.76), 0.75);
    assert.equal(sampleSteps(4, "end", 0.99), 0.75);
    assert.equal(sampleSteps(4, "end", 1), 1);
  });

  it("jump-start: steps up immediately, so t=0 is already at the first step", () => {
    assert.equal(sampleSteps(4, "start", 0), 0.25);
    assert.equal(sampleSteps(4, "start", 0.24), 0.25);
    assert.equal(sampleSteps(4, "start", 0.26), 0.5);
    assert.equal(sampleSteps(4, "start", 1), 1);
  });

  it("jump-none: n-1 jumps, 0 at t=0 and 1 at t=1 exactly (no jump at either end)", () => {
    assert.equal(sampleSteps(4, "none", 0), 0);
    assert.equal(sampleSteps(4, "none", 1), 1);
    // 3 interior jumps over [0,1): thirds.
    assert.ok(Math.abs(sampleSteps(4, "none", 0.4) - 1 / 3) < 1e-9);
  });

  it("jump-both: n+1 jumps — one at each end plus the interior ones", () => {
    assert.ok(sampleSteps(4, "both", 0) > 0, "jump-both must not start at exactly 0");
    assert.equal(sampleSteps(4, "both", 1), 1);
  });

  it("matches sampleEasing's steps() dispatch", () => {
    const parsed = parseEasing("steps(4)")!;
    assert.equal(sampleEasing(parsed, 0.3), sampleSteps(4, "end", 0.3));
  });
});

describe("Phase 9.1: sampleEasing boundary conditions", () => {
  it("every easing kind starts at 0 and ends at 1 (aside from springs, which settle at 1)", () => {
    for (const str of ["linear", "power2.out", "back.out(1.7)", "elastic.out", "bounce.out", "steps(4)", "cubic-bezier(0.25,0.1,0.25,1)"]) {
      const easing = parseEasing(str)!;
      assert.equal(sampleEasing(easing, 0), 0, `${str} at t=0`);
      assert.ok(Math.abs(sampleEasing(easing, 1) - 1) < 1e-6, `${str} at t=1`);
    }
  });

  it("a spring easing settles at 1", () => {
    const easing = parseEasing("spring(bounce: 0.3, time: 0.6)")!;
    assert.equal(sampleEasing(easing, 0), 0);
    assert.ok(Math.abs(sampleEasing(easing, 1) - 1) < 0.02);
  });

  it("clamps t outside [0, 1]", () => {
    const easing = parseEasing("power2.out")!;
    assert.equal(sampleEasing(easing, -0.5), sampleEasing(easing, 0));
    assert.equal(sampleEasing(easing, 1.5), sampleEasing(easing, 1));
  });
});
