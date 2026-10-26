/**
 * FigCraft port F2: colour. The cases of FigCraft's `crates/color/src/tests.rs`, `gradient_tests.rs`,
 * `pattern_tests.rs`, `profile_tests.rs` (the colour-maths half; ICC bytes and pixel buffers are renderer-only) and
 * `named.rs`'s tests (commit 6ea44e9), translated one to one. MIT, Copyright (c) 2026 ArtCraft Team and the
 * FigCraft contributors.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BLACK, TRANSPARENT, WHITE, adjustColor, adjustmentMatrix, adjustmentPreset, adjustmentToneTable, blendCss, blendFromName, clipsInProfile, color,
  colorToHsb, colorToHsl, convertProfile, cropFromRect, cropRect, defaultPattern, effectiveCrop, fromHex, fromHexOrName, fromRgba8, hsbToColor,
  hslToColor, isDark, lookupNamed, parseCss, parseProfile, patternCell, sampleStops, squareLinearWidth, toCss, toCssHex, toCssInProfile, toHex, toRgba8,
  NO_ADJUSTMENTS, PATTERN_MAX_SPACING, PATTERN_SCALE_RANGE, type Color, type ImageAdjustments,
} from "../color";

const close = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

describe("FigCraft color: hex, CSS and names", () => {
  it("hex round trip and shorthands", () => {
    assert.equal(toHex(fromHex("#0D99FF")!), "0D99FF");
    assert.equal(toHex(fromHex("f")!), "FFFFFF");
    assert.equal(toHex(fromHex("ab")!), "ABABAB");
    assert.equal(toHex(fromHex("abc")!), "AABBCC");
    assert.deepEqual(toRgba8(fromHex("FF000080")!), [255, 0, 0, 128]);
    assert.equal(fromHex("xyz"), null);
    assert.equal(fromHex("12345"), null);
  });

  it("CSS parsing", () => {
    assert.equal(toHex(parseCss("rgb(255, 0, 0)")!), "FF0000");
    assert.deepEqual(toRgba8(parseCss("rgba(0 0 255 / 50%)")!), [0, 0, 255, 128]);
    assert.equal(toHex(parseCss("hsl(120, 100%, 50%)")!), "00FF00");
    assert.deepEqual(parseCss("white"), WHITE);
    assert.equal(toHex(parseCss("RebeccaPurple")!), "663399");
    assert.deepEqual(parseCss("transparent"), TRANSPARENT);
  });

  it("colour fields take names", () => {
    assert.equal(toCssHex(fromHexOrName("red")!), "#FF0000");
    assert.equal(toHex(fromHexOrName(" Cornflower Blue ")!), "6495ED");
    assert.deepEqual(toRgba8(fromHexOrName("darkblue")!), [0, 0, 139, 255]);
    // hex wins: every digit string still reads as hex
    assert.equal(toHex(fromHexOrName("abc")!), "AABBCC");
    assert.equal(toHex(fromHexOrName("#0D99FF")!), "0D99FF");
    // names are opaque; `transparent` is not a field colour
    assert.equal(fromHexOrName("transparent"), null);
    for (const junk of ["", "#", "redd", "re d d", "12345", "\u0000", "🟥", "x".repeat(100_000)]) assert.equal(fromHexOrName(junk), null, JSON.stringify(junk.slice(0, 10)));
  });

  it("the named table is complete and lookups normalise", () => {
    assert.deepEqual(lookupNamed("Red"), [255, 0, 0]);
    assert.deepEqual(lookupNamed("  CORNFLOWER blue "), [100, 149, 237]);
    assert.deepEqual(lookupNamed("light-goldenrod_yellow"), [250, 250, 210]);
    assert.equal(lookupNamed(""), null);
    assert.equal(lookupNamed("transparent"), null);
    assert.equal(lookupNamed("reddish"), null);
    assert.equal(lookupNamed("rédé"), null);
    assert.equal(lookupNamed("a".repeat(10_000)), null);
    assert.equal(lookupNamed("toString"), null, "no prototype keys");
  });

  it("HSB and HSL round trip", () => {
    for (const hex of ["0D99FF", "F24822", "14AE5C", "000000", "FFFFFF", "808080", "9747FF"]) {
      const c = fromHex(hex)!;
      assert.equal(toHex(hsbToColor(colorToHsb(c))), hex);
      assert.equal(toHex(hslToColor(colorToHsl(c))), hex);
    }
  });

  it("NaN inputs are sanitised; infinite channels clamp", () => {
    assert.deepEqual(toRgba8(color(NaN, 2, -1, Infinity)), [0, 255, 0, 255]);
    assert.equal(parseCss("rgb(1e40, 0, 0)")!.r, 1);
    const c = color(Infinity, -Infinity, NaN, Infinity);
    assert.deepEqual([c.r, c.g, c.b, c.a], [1, 0, 0, 1]);
  });

  it("hex allows at most one leading #", () => {
    assert.equal(fromHex("##ff0000"), null);
    assert.equal(fromHex("###fff"), null);
    assert.equal(fromHexOrName("##ff0000"), null);
    assert.equal(toHex(fromHex("#ff0000")!), "FF0000");
    assert.equal(toHex(fromHex("ff0000")!), "FF0000");
  });

  it("malformed alpha or extra arguments are rejected", () => {
    assert.equal(parseCss("rgba(0,0,0,abc)"), null);
    assert.equal(parseCss("hsla(0,0%,0%,abc)"), null);
    assert.equal(parseCss("rgb(1,2,3,4,5)"), null);
    assert.equal(parseCss("hsl(0,0%,0%,0.5,1)"), null);
    assert.equal(parseCss("rgb(1,2,3)")!.a, 1);
    assert.equal(parseCss("rgba(1,2,3,0.5)")!.a, 0.5);
  });

  it("toCss round trips every alpha", () => {
    for (let a = 0; a <= 255; a++) {
      const c = fromRgba8(10, 20, 30, a);
      assert.deepEqual(toRgba8(parseCss(toCss(c))!), toRgba8(c), `alpha ${a}: ${toCss(c)}`);
    }
  });

  it("dark colours want white text", () => {
    assert.ok(isDark(BLACK));
    assert.ok(!isDark(WHITE));
  });
});

describe("FigCraft color: gradients", () => {
  it("sampling, stops in any order", () => {
    const stops = [{ position: 1, color: WHITE }, { position: 0, color: BLACK }];
    assert.deepEqual(sampleStops(stops, 0), BLACK);
    assert.deepEqual(sampleStops(stops, 1), WHITE);
    assert.equal(toHex(sampleStops(stops, 0.5)), "808080");
  });

  it("the width handle of a linear gradient stays square to its axis on screen", () => {
    const square = (from: [number, number], to: [number, number], width: [number, number], w: number, h: number) => {
      const a = [(to[0] - from[0]) * w, (to[1] - from[1]) * h];
      const k = [(width[0] - from[0]) * w, (width[1] - from[1]) * h];
      return Math.abs(a[0] * k[0] + a[1] * k[1]) < 1e-9 && Math.abs(a[0] * k[1] - a[1] * k[0]) > 1e-9;
    };
    for (const [w, h] of [[120, 80], [80, 120], [1, 1]]) {
      assert.ok(square([0.5, 0], [0.5, 1], squareLinearWidth([0.5, 0], [0.5, 1], w, h), w, h), `${w}×${h}`);
    }
    assert.ok(square([0, 0.5], [1, 0.5], squareLinearWidth([0, 0.5], [1, 0.5], 120, 80), 120, 80));
    assert.ok(square([0, 0.5], [1, 1], squareLinearWidth([0, 0.5], [1, 1], 120, 80), 120, 80), "a diagonal on a wide box");
    const junk = squareLinearWidth([0, 0.5], [1, 1], 0, NaN);
    assert.ok(Number.isFinite(junk[0]) && Number.isFinite(junk[1]));
  });
});

describe("FigCraft color: blend modes", () => {
  it("names", () => {
    assert.equal(blendFromName("multiply"), "multiply");
    assert.equal(blendFromName("Color burn"), "colorBurn");
    assert.equal(blendFromName("PASS_THROUGH"), "passThrough");
    assert.equal(blendFromName("normal"), "normal", "labels first: normal is Normal, not pass-through");
    assert.equal(blendFromName("nope"), null);
  });

  it("CSS keywords", () => {
    assert.equal(blendCss("colorDodge"), "color-dodge");
    assert.equal(blendCss("passThrough"), "normal");
    assert.equal(blendCss("plusLighter"), "plus-lighter");
  });
});

describe("FigCraft color: profiles", () => {
  it("profile ids parse", () => {
    assert.equal(parseProfile("srgb"), "srgb");
    assert.equal(parseProfile("Display P3"), "displayP3");
    assert.equal(parseProfile("display-p3"), "displayP3");
    assert.equal(parseProfile("P3"), "displayP3");
    assert.equal(parseProfile("adobe rgb"), null);
  });

  it("sRGB red in Display P3", () => {
    // sRGB #FF0000 is color(display-p3 0.9175 0.2003 0.1386)
    const p3 = convertProfile(color(1, 0, 0, 0.5), "srgb", "displayP3");
    assert.ok(close(p3.r, 0.9175, 0.001) && close(p3.g, 0.2003, 0.001) && close(p3.b, 0.1386, 0.001), JSON.stringify(p3));
    assert.equal(p3.a, 0.5);
  });

  it("conversions round trip and keep neutrals", () => {
    for (const hex of ["0D99FF", "F24822", "14AE5C", "000000", "FFFFFF", "808080", "9747FF", "FF0000", "00FF00"]) {
      const c = fromHex(hex)!;
      assert.equal(toHex(convertProfile(convertProfile(c, "srgb", "displayP3"), "displayP3", "srgb")), hex);
    }
    const g = convertProfile(fromHex("808080")!, "srgb", "displayP3");
    assert.ok(close(g.r, g.g, 1e-4) && close(g.g, g.b, 1e-4));
    // Display P3's pure green is outside sRGB: it clips
    const c = convertProfile(color(0, 1, 0, 1), "displayP3", "srgb");
    // FigCraft compares 32-bit floats exactly; in 64-bit the clipped green lands within 1e-15 of 1 (both are 255)
    assert.ok(close(c.r, 0, 1e-9) && close(c.g, 1, 1e-9) && close(c.b, 0, 1e-9), JSON.stringify(c));
    assert.ok(clipsInProfile(color(0, 1, 0, 1), "displayP3", "srgb"));
    assert.ok(!clipsInProfile(color(0.5, 0.5, 0.5, 1), "displayP3", "srgb"));
  });

  it("conversion survives junk", () => {
    const c = convertProfile({ r: NaN, g: Infinity, b: -3, a: 2 } as Color, "displayP3", "srgb");
    for (const v of [c.r, c.g, c.b, c.a]) assert.ok(v >= 0 && v <= 1);
  });

  it("P3 colours read back from CSS", () => {
    const css = toCssInProfile(color(0.9175, 0.2003, 0.1386, 1), "displayP3");
    assert.equal(css, "color(display-p3 0.9175 0.2003 0.1386)");
    assert.equal(toHex(parseCss(css)!), "FF0000");
  });
});

describe("FigCraft color: image adjustments", () => {
  it("presets by id or label", () => {
    assert.deepEqual(adjustmentPreset("Black & white"), adjustmentPreset("blackAndWhite"));
    assert.deepEqual(adjustmentPreset("reset"), NO_ADJUSTMENTS);
    assert.equal(adjustmentPreset("sepia"), null);
  });

  it("the SVG colour matrix draws exactly the linear part of the renderer's maths", () => {
    const apply = (m: number[], c: Color) => ({
      r: m[0] * c.r + m[1] * c.g + m[2] * c.b + m[4],
      g: m[5] * c.r + m[6] * c.g + m[7] * c.b + m[9],
      b: m[10] * c.r + m[11] * c.g + m[12] * c.b + m[14],
    });
    const cases: ImageAdjustments[] = [
      { ...NO_ADJUSTMENTS, exposure: 0.3, contrast: -0.2, saturation: 0.5, temperature: 0.4, tint: -0.3 },
      { ...NO_ADJUSTMENTS, saturation: -1, contrast: 0.15 },
      NO_ADJUSTMENTS,
    ];
    for (const adj of cases) {
      const m = adjustmentMatrix(adj);
      for (const c of [color(0.2, 0.4, 0.6), color(0.9, 0.1, 0.5), color(0.5, 0.5, 0.5)]) {
        const want = adjustColor(c, adj);
        const got = apply(m, c);
        for (const k of ["r", "g", "b"] as const) assert.ok(close(Math.min(1, Math.max(0, got[k])), want[k], 1e-4), `${k}: ${got[k]} vs ${want[k]}`);
      }
    }
    assert.equal(adjustmentToneTable(NO_ADJUSTMENTS), null);
    assert.equal(adjustmentToneTable({ ...NO_ADJUSTMENTS, shadows: 0.5 })!.length, 17);
  });
});

describe("FigCraft color: image crop", () => {
  it("crop defaults to Fill and round trips", () => {
    // a 200×100 image in a 100×100 box: Fill scales to 100 tall, 200 wide, centred → x from -0.5 to 1.5
    const c = effectiveCrop(null, 200, 100, 100, 100);
    const [x0, y0, x1, y1] = cropRect(c);
    assert.ok(close(x0, -0.5, 1e-9) && close(x1, 1.5, 1e-9) && close(y0, 0, 1e-9) && close(y1, 1, 1e-9));
    cropFromRect(x0, y0, x1, y1).forEach((v, i) => assert.ok(close(v, c[i], 1e-9)));
  });
});

describe("FigCraft color: pattern cells", () => {
  it("cells tile grids and shifted rows", () => {
    const p = { ...defaultPattern(), spacing: [5, 10] as [number, number] };
    let c = patternCell(p, 20, 10, 100, 100)!;
    assert.deepEqual([c.size, c.origin, c.tiles.length], [[25, 20], [0, 0], 1]);
    c = patternCell({ ...p, tile: "horizontalHex" }, 20, 10, 100, 100)!;
    assert.deepEqual(c.size, [25, 40]);
    assert.deepEqual(c.tiles, [[0, 0], [12.5, 20], [-12.5, 20]]);
    assert.deepEqual(patternCell({ ...p, tile: "verticalHex" }, 20, 10, 100, 100)!.tiles, [[0, 0], [25, 10], [25, -10]]);
    // scale applies to the tile, not the gap; alignment puts a tile in the centre or the far corner
    c = patternCell({ ...p, scale: 2, align: "center" }, 20, 10, 100, 100)!;
    assert.deepEqual([c.size, c.origin, c.scale], [[45, 30], [30, 40], 2]);
    assert.deepEqual(patternCell({ ...p, scale: 2, align: "end" }, 20, 10, 100, 100)!.origin, [60, 80]);
  });

  it("cells sanitise their values", () => {
    assert.equal(patternCell(defaultPattern(), 0, 10, 10, 10), null, "a source without size");
    let c = patternCell({ ...defaultPattern(), scale: NaN, spacing: [Infinity, -5] }, 10, 10, 10, 10)!;
    assert.deepEqual([c.scale, c.size], [1, [10, 10]]);
    c = patternCell({ ...defaultPattern(), scale: 1e9, spacing: [1e9, 0] }, 10, 10, 10, 10)!;
    assert.deepEqual([c.scale, c.size[0]], [PATTERN_SCALE_RANGE[1], 1000 + PATTERN_MAX_SPACING]);
  });
});
