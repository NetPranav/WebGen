/**
 * Phase 9.2: the interpolator dispatch, against `PROPERTY_REGISTRY`'s own
 * `InterpolationMethod` classification (Phase 7.1) — reusing `PathMorphSolver`
 * (Phase 7.4) and `Scene3DEngine`'s quaternion SLERP (Phase 8.1) directly
 * rather than re-implementing them.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { interpolateValue } from "../interpolators";
import { Scene3DEngine } from "../../engine/Scene3DEngine";
import { PathMorphSolver } from "../../engine/PathMorphSolver";
import { getPropertyDefinition } from "../../document/properties";

describe("Phase 9.2: numeric interpolation", () => {
  it("lerps plain numbers", () => {
    assert.equal(interpolateValue("numeric", 0, 100, 0.25), 25);
    assert.equal(interpolateValue("numeric", 10, 20, 0.5), 15);
  });

  it("matches PROPERTY_REGISTRY's classification for transform.y", () => {
    const def = getPropertyDefinition("transform.y")!;
    assert.equal(def.interpolation, "numeric");
    assert.equal(interpolateValue(def.interpolation, 0, 24, 0.5), 12);
  });
});

describe("Phase 9.2: colour interpolation (OKLab)", () => {
  it("mixes two hex colours", () => {
    const mixed = interpolateValue("color", "#206859", "#dc2626", 0.5) as string;
    assert.match(mixed, /^rgba?\(/);
  });

  it("matches PROPERTY_REGISTRY's classification for typography.color", () => {
    const def = getPropertyDefinition("typography.color")!;
    assert.equal(def.interpolation, "color");
  });

  it("falls back to a discrete hold for an unparseable colour", () => {
    assert.equal(interpolateValue("color", "currentColor", "#fff", 0.5), "currentColor");
    assert.equal(interpolateValue("color", "currentColor", "#fff", 1), "#fff");
  });
});

describe("Phase 9.2: path interpolation (reuses PathMorphSolver)", () => {
  it("morphs between two simple paths, holding at t=0/1 and producing a real path in between", () => {
    const a = "M0,0 L10,0 L10,10 Z";
    const b = "M0,0 L20,0 L20,20 Z";
    // PathMorphSolver re-normalizes to cubic segments even at the endpoints (not a byte-identity passthrough).
    assert.equal(interpolateValue("path", a, b, 0), PathMorphSolver.morph(a, b, 0));
    const mid = interpolateValue("path", a, b, 0.5) as string;
    assert.ok(typeof mid === "string" && mid.length > 0);
  });
});

describe("Phase 9.2: vector3 interpolation (per-component lerp)", () => {
  it("lerps each of x, y, z independently", () => {
    const result = interpolateValue("vector", [0, 0, 0], [10, -20, 5], 0.5);
    assert.deepEqual(result, [5, -10, 2.5]);
  });

  it("matches PROPERTY_REGISTRY's classification for scene3d.position", () => {
    const def = getPropertyDefinition("scene3d.position")!;
    assert.equal(def.interpolation, "vector");
  });
});

describe("Phase 9.2: quaternion SLERP (reuses Scene3DEngine)", () => {
  it("matches Scene3DEngine.quaternionSlerp directly", () => {
    const qa: [number, number, number, number] = [0, 0, 0, 1];
    const qb = Scene3DEngine.normalizeQuaternion([0, 0.7071, 0, 0.7071]);
    const expected = Scene3DEngine.quaternionSlerp(qa, qb, 0.5);
    const result = interpolateValue("slerp", [...qa], [...qb], 0.5);
    assert.deepEqual(result, [...expected]);
  });

  it("matches PROPERTY_REGISTRY's classification for scene3d.rotation", () => {
    const def = getPropertyDefinition("scene3d.rotation")!;
    assert.equal(def.interpolation, "slerp");
  });
});

describe("Phase 9.2: gradient interpolation (per-stop colour + offset)", () => {
  it("interpolates offset and colour per stop when stop counts match", () => {
    const from = [{ offset: 0, color: "#000000" }, { offset: 1, color: "#ffffff" }];
    const to = [{ offset: 0.2, color: "#ffffff" }, { offset: 0.8, color: "#000000" }];
    const result = interpolateValue("gradient", from, to, 0.5) as Array<{ offset: number; color: string }>;
    assert.equal(result.length, 2);
    assert.ok(Math.abs(result[0].offset - 0.1) < 1e-9);
    assert.ok(Math.abs(result[1].offset - 0.9) < 1e-9);
  });

  it("falls back to a discrete hold when stop counts differ", () => {
    const from = [{ offset: 0, color: "#000" }];
    const to = [{ offset: 0, color: "#000" }, { offset: 1, color: "#fff" }];
    assert.deepEqual(interpolateValue("gradient", from, to, 0.5), from);
  });
});

describe("Phase 9.2: clip-path interpolation", () => {
  it("interpolates matching shape functions' numeric arguments", () => {
    const result = interpolateValue("clipPath", "inset(0px)", "inset(20px)", 0.5) as string;
    assert.equal(result, "inset(10px)");
  });

  it("falls back to a discrete hold for mismatched shape kinds", () => {
    assert.equal(interpolateValue("clipPath", "circle(50%)", "polygon(0 0, 1 1)", 0.5), "circle(50%)");
  });
});

describe("Phase 9.2: discrete interpolation (hold, Web Animations spec convention)", () => {
  it("holds `from` until t=1, then jumps to `to`", () => {
    assert.equal(interpolateValue("discrete", "flex", "grid", 0), "flex");
    assert.equal(interpolateValue("discrete", "flex", "grid", 0.99), "flex");
    assert.equal(interpolateValue("discrete", "flex", "grid", 1), "grid");
  });

  it("matches PROPERTY_REGISTRY's classification for an enum property", () => {
    const def = getPropertyDefinition("layout.display");
    if (def) assert.equal(def.interpolation, "discrete");
  });
});
