import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hsbToRgb, oklchToRgb, parseColor, rgbToHsb, rgbToOklch, toCss, toHex, withOpacity } from "../colorMath";

const near = (a: number, b: number, tol = 0.002) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

describe("Phase 35: parsing colours", () => {
  it("hex in every length", () => {
    assert.deepEqual(parseColor("#f00"), { r: 255, g: 0, b: 0, a: 1 });
    assert.deepEqual(parseColor("#336699"), { r: 51, g: 102, b: 153, a: 1 });
    assert.deepEqual(parseColor("#33669980"), { r: 51, g: 102, b: 153, a: 128 / 255 });
    assert.deepEqual(parseColor("#f008"), { r: 255, g: 0, b: 0, a: 0x88 / 255 });
    assert.equal(parseColor("#12345"), null);
    assert.equal(parseColor("#gggggg"), null);
  });
  it("rgb(), hsl() and names", () => {
    assert.deepEqual(parseColor("rgb(10, 20, 30)"), { r: 10, g: 20, b: 30, a: 1 });
    assert.deepEqual(parseColor("rgba(10 20 30 / 50%)"), { r: 10, g: 20, b: 30, a: 0.5 });
    assert.deepEqual(parseColor("rgb(100%, 0%, 0%)"), { r: 255, g: 0, b: 0, a: 1 });
    assert.deepEqual(parseColor("hsl(120, 100%, 50%)"), { r: 0, g: 255, b: 0, a: 1 });
    assert.deepEqual(parseColor("hsl(0 0% 50%)"), { r: 128, g: 128, b: 128, a: 1 });
    assert.deepEqual(parseColor("tomato"), { r: 255, g: 99, b: 71, a: 1 });
    assert.deepEqual(parseColor("none"), { r: 0, g: 0, b: 0, a: 0 });
    assert.deepEqual(parseColor("TRANSPARENT"), { r: 0, g: 0, b: 0, a: 0 });
  });
  it("nonsense is null, never a throw", () => {
    for (const bad of ["", "not a colour", "rgb(1,2)", "rgb(a,b,c)", "currentColor", "url(x)", "#", "rgb(1,2,3,4,5)"]) assert.equal(parseColor(bad), null, bad);
  });
});

describe("Phase 35: writing colours", () => {
  it("hex is #rrggbb, with alpha only when needed", () => {
    assert.equal(toHex({ r: 255, g: 0, b: 128, a: 1 }), "#ff0080");
    assert.equal(toHex({ r: 255, g: 0, b: 128, a: 0.5 }), "#ff008080");
    assert.equal(toHex({ r: 300, g: -5, b: 0, a: 1 }), "#ff0000");
  });
  it("css rgba", () => assert.equal(toCss({ r: 1, g: 2, b: 3, a: 0.123456 }), "rgba(1, 2, 3, 0.123)"));
  it("withOpacity multiplies the alpha and leaves unreadable colours alone", () => {
    assert.equal(withOpacity("#ff0000", 0.5), "rgba(255, 0, 0, 0.5)");
    assert.equal(withOpacity("rgba(0, 0, 0, 0.5)", 0.5), "rgba(0, 0, 0, 0.25)");
    assert.equal(withOpacity("currentColor", 0.5), "currentColor");
    assert.equal(withOpacity("#fff", 7), "rgba(255, 255, 255, 1)");
  });
});

describe("Phase 35: HSB (the picker's square)", () => {
  it("the primaries", () => {
    assert.deepEqual(rgbToHsb({ r: 255, g: 0, b: 0, a: 1 }), { h: 0, s: 1, b: 1 });
    const green = rgbToHsb({ r: 0, g: 255, b: 0, a: 1 });
    assert.deepEqual([green.h, green.s, green.b], [120, 1, 1]);
    const blue = rgbToHsb({ r: 0, g: 0, b: 255, a: 1 });
    assert.deepEqual([blue.h, blue.s, blue.b], [240, 1, 1]);
    assert.deepEqual(rgbToHsb({ r: 0, g: 0, b: 0, a: 1 }), { h: 0, s: 0, b: 0 });
    assert.deepEqual(rgbToHsb({ r: 255, g: 255, b: 255, a: 1 }), { h: 0, s: 0, b: 1 });
  });
  it("round trips every colour on a grid to within one channel step", () => {
    for (let r = 0; r <= 255; r += 51) for (let g = 0; g <= 255; g += 51) for (let b = 0; b <= 255; b += 51) {
      const back = hsbToRgb(rgbToHsb({ r, g, b, a: 1 }));
      assert.deepEqual([back.r, back.g, back.b], [r, g, b]);
    }
  });
  it("hue wraps", () => assert.deepEqual(hsbToRgb({ h: 360, s: 1, b: 1 }), hsbToRgb({ h: 0, s: 1, b: 1 })));
});

describe("Phase 35: OKLCH", () => {
  it("known values: white, black, red", () => {
    const white = rgbToOklch({ r: 255, g: 255, b: 255, a: 1 });
    near(white.l, 1);
    near(white.c, 0);
    near(rgbToOklch({ r: 0, g: 0, b: 0, a: 1 }).l, 0);
    const red = rgbToOklch({ r: 255, g: 0, b: 0, a: 1 });
    near(red.l, 0.628);
    near(red.c, 0.2577);
    near(red.h, 29.23, 0.2);
  });
  it("round trips colours inside the gamut to within one channel step", () => {
    for (let r = 0; r <= 255; r += 51) for (let g = 0; g <= 255; g += 51) for (let b = 0; b <= 255; b += 51) {
      const back = oklchToRgb(rgbToOklch({ r, g, b, a: 1 }));
      assert.ok(Math.abs(back.r - r) <= 1 && Math.abs(back.g - g) <= 1 && Math.abs(back.b - b) <= 1, `${r},${g},${b} -> ${back.r},${back.g},${back.b}`);
    }
  });
  it("a colour outside sRGB keeps its lightness and hue and loses chroma until it fits", () => {
    const out = oklchToRgb({ l: 0.7, c: 0.4, h: 150 });
    for (const v of [out.r, out.g, out.b]) assert.ok(v >= 0 && v <= 255);
    const back = rgbToOklch(out);
    near(back.l, 0.7, 0.02);
    near(back.h, 150, 3);
    assert.ok(back.c < 0.4);
  });
  it("lightness is clamped", () => {
    assert.deepEqual(oklchToRgb({ l: 2, c: 0, h: 0 }), { r: 255, g: 255, b: 255, a: 1 });
    assert.deepEqual(oklchToRgb({ l: -1, c: 0, h: 0 }), { r: 0, g: 0, b: 0, a: 1 });
  });
});
