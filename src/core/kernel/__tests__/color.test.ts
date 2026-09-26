/**
 * Phase 9.2: sRGB ⇄ OKLab conversion and colour mixing. OKLab's own defining
 * invariants (white → L=1,a=0,b=0; black → L=0,a=0,b=0) and a round-trip
 * identity are exact, known reference points — the "golden values" a colour
 * space conversion has to hit, independent of any external oracle.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rgbToOklab, oklabToRgb, parseColor, formatColor, mixColorsOklab } from "../color";

function close(a: number, b: number, tol = 1e-4) {
  assert.ok(Math.abs(a - b) < tol, `${a} !~= ${b}`);
}

describe("Phase 9.2: OKLab conversion — defining invariants", () => {
  it("white (1,1,1) is L=1, a=0, b=0", () => {
    const ok = rgbToOklab({ r: 1, g: 1, b: 1 });
    close(ok.L, 1);
    close(ok.a, 0);
    close(ok.b, 0);
  });

  it("black (0,0,0) is L=0, a=0, b=0", () => {
    const ok = rgbToOklab({ r: 0, g: 0, b: 0 });
    close(ok.L, 0);
    close(ok.a, 0);
    close(ok.b, 0);
  });

  it("round-trips sRGB → OKLab → sRGB", () => {
    for (const rgb of [{ r: 0.8, g: 0.2, b: 0.1 }, { r: 0.1, g: 0.9, b: 0.5 }, { r: 0.5, g: 0.5, b: 0.5 }]) {
      const back = oklabToRgb(rgbToOklab(rgb));
      close(back.r, rgb.r, 1e-3);
      close(back.g, rgb.g, 1e-3);
      close(back.b, rgb.b, 1e-3);
    }
  });
});

describe("Phase 9.2: colour string parsing", () => {
  it("parses 3, 6 and 8-digit hex", () => {
    assert.deepEqual(parseColor("#fff"), { r: 1, g: 1, b: 1, a: 1 });
    assert.deepEqual(parseColor("#206859"), { r: 0x20 / 255, g: 0x68 / 255, b: 0x59 / 255, a: 1 });
    assert.deepEqual(parseColor("#20685980"), { r: 0x20 / 255, g: 0x68 / 255, b: 0x59 / 255, a: 0x80 / 255 });
  });

  it("parses rgb()/rgba()", () => {
    assert.deepEqual(parseColor("rgb(32, 104, 89)"), { r: 32 / 255, g: 104 / 255, b: 89 / 255, a: 1 });
    assert.deepEqual(parseColor("rgba(32, 104, 89, 0.5)"), { r: 32 / 255, g: 104 / 255, b: 89 / 255, a: 0.5 });
  });

  it("parses transparent as alpha 0", () => {
    assert.deepEqual(parseColor("transparent"), { r: 0, g: 0, b: 0, a: 0 });
  });

  it("returns null for an unparseable colour keyword", () => {
    assert.equal(parseColor("currentColor"), null);
    assert.equal(parseColor("rebeccapurple"), null);
  });

  it("formatColor round-trips through parseColor", () => {
    const original = { r: 0.2, g: 0.6, b: 0.4, a: 1 };
    const reparsed = parseColor(formatColor(original))!;
    close(reparsed.r, original.r, 1 / 255);
    close(reparsed.g, original.g, 1 / 255);
    close(reparsed.b, original.b, 1 / 255);
  });
});

describe("Phase 9.2: OKLab mixing", () => {
  it("is the identity at t=0 and t=1", () => {
    const a = "#206859";
    const b = "#dc2626";
    close(parseColor(mixColorsOklab(a, b, 0)!)!.r, parseColor(a)!.r, 1 / 255);
    close(parseColor(mixColorsOklab(a, b, 1)!)!.r, parseColor(b)!.r, 1 / 255);
  });

  it("stays perceptually closer to grey through the middle than a naive sRGB lerp would (red ↔ green)", () => {
    // The textbook case OKLab exists for: red↔green sRGB-lerps through a muddy
    // olive/brown; OKLab's midpoint keeps meaningfully more perceived lightness.
    const mid = parseColor(mixColorsOklab("#ff0000", "#00ff00", 0.5)!)!;
    const naiveMidLuma = (255 / 2 + 0 / 2) * 0.2126 + (0 / 2 + 255 / 2) * 0.7152; // rough sRGB-lerp perceived luma
    const oklabMidLuma = (mid.r * 255) * 0.2126 + (mid.g * 255) * 0.7152 + (mid.b * 255) * 0.0722;
    assert.ok(oklabMidLuma > naiveMidLuma, `OKLab mix should read brighter than a naive sRGB lerp (${oklabMidLuma} vs ${naiveMidLuma})`);
  });

  it("returns null for an unparseable endpoint", () => {
    assert.equal(mixColorsOklab("currentColor", "#fff", 0.5), null);
  });
});
