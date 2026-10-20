import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  boxShadowCss, effectiveFills, fillsBackground, newPaint, paintCss, parseFills, parseShadows, safeDashArray, serializeFills, serializeShadows, textShadowCss,
  MAX_PAINTS, MAX_STOPS, type Paint,
} from "../paints";

const linear = (from: { x: number; y: number }, to: { x: number; y: number }): Paint => ({ type: "linear", opacity: 1, visible: true, stops: [{ at: 0, color: "#ff0000" }, { at: 1, color: "#0000ff" }], from, to });

describe("Phase 35: fills round trip", () => {
  it("serialises compactly and reads back the same paints", () => {
    const fills: Paint[] = [
      { type: "solid", color: "#336699", opacity: 0.5, visible: true },
      linear({ x: 0, y: 0 }, { x: 1, y: 1 }),
      { type: "radial", opacity: 1, visible: false, stops: [{ at: 0, color: "#fff" }, { at: 0.5, color: "#f00" }, { at: 1, color: "#000" }], center: { x: 0.25, y: 0.75 }, radius: { x: 0.5, y: 0.3 } },
      { type: "conic", opacity: 1, visible: true, stops: [{ at: 0, color: "red" }, { at: 1, color: "blue" }], center: { x: 0.5, y: 0.5 }, angle: 45 },
    ];
    const json = serializeFills(fills);
    assert.ok(!json.includes('"opacity":1'), "defaults are left out");
    assert.deepEqual(parseFills(json), fills);
  });

  it("an empty list is a list (no fill), not a missing one", () => {
    assert.deepEqual(parseFills("[]"), []);
    assert.equal(parseFills(""), null);
    assert.equal(parseFills(undefined), null);
  });

  it("malformed, hostile and oversized input is ignored, never thrown", () => {
    for (const bad of ["not json", "{}", "null", "42", '[{"type":"solid"}', "x".repeat(200_000)]) assert.equal(parseFills(bad), null, bad.slice(0, 20));
    assert.deepEqual(parseFills('[{"type":"nope"},{"type":"solid","color":"url(javascript:alert(1))"},{"type":"solid","color":"red; position:fixed"}]'), []);
    assert.deepEqual(parseFills('[{"type":"solid","color":"red"},{"type":"bogus"}]'), [{ type: "solid", color: "red", opacity: 1, visible: true }]);
  });

  it("caps the number of paints and of stops, sorts stops and clamps values", () => {
    const many = JSON.stringify(Array.from({ length: MAX_PAINTS + 10 }, () => ({ type: "solid", color: "#000" })));
    assert.equal(parseFills(many)!.length, MAX_PAINTS);
    const stops = Array.from({ length: MAX_STOPS + 5 }, (_, i) => ({ at: i / 100, color: "#000" }));
    const p = parseFills(JSON.stringify([{ type: "linear", stops }]))![0] as Extract<Paint, { type: "linear" }>;
    assert.equal(p.stops.length, MAX_STOPS);
    const sorted = parseFills(JSON.stringify([{ type: "linear", opacity: 9, stops: [{ at: 2, color: "#fff" }, { at: -1, color: "#000" }], from: { x: 1e9, y: NaN } }]))![0] as Extract<Paint, { type: "linear" }>;
    assert.deepEqual(sorted.stops.map((s) => s.at), [0, 1]);
    assert.equal(sorted.opacity, 1);
    assert.deepEqual(sorted.from, { x: 5, y: 0 });
  });

  it("a gradient needs two readable stops", () => {
    assert.deepEqual(parseFills('[{"type":"linear","stops":[{"at":0,"color":"#000"}]}]'), []);
    assert.deepEqual(parseFills('[{"type":"linear","stops":[{"at":0,"color":"nope"},{"at":1,"color":"#fff"}]}]'), []);
  });

  it("effective fills: the stored list, or the plain colour as one fill, or none", () => {
    assert.deepEqual(effectiveFills(undefined, "#abc"), [{ type: "solid", color: "#abc", opacity: 1, visible: true }]);
    assert.deepEqual(effectiveFills(undefined, "none"), []);
    assert.deepEqual(effectiveFills(undefined, "transparent"), []);
    assert.deepEqual(effectiveFills("[]", "#abc"), [], "an empty stored list means no fill");
    assert.equal(effectiveFills(serializeFills([newPaint("radial")]), "#abc")[0].type, "radial");
  });
});

describe("Phase 35: paints as CSS", () => {
  it("solid is a flat gradient image so it stacks with others, with opacity folded into the colour", () => {
    assert.equal(paintCss({ type: "solid", color: "#ff0000", opacity: 1, visible: true }, 100, 50), "linear-gradient(rgba(255, 0, 0, 1), rgba(255, 0, 0, 1))");
    assert.equal(paintCss({ type: "solid", color: "#ff0000", opacity: 0.5, visible: true }, 100, 50), "linear-gradient(rgba(255, 0, 0, 0.5), rgba(255, 0, 0, 0.5))");
    assert.equal(paintCss({ type: "solid", color: "#f00", opacity: 1, visible: false }, 100, 50), null);
  });

  it("a top-to-bottom linear gradient is 180deg with the stops at 0 and 100 percent", () => {
    assert.equal(paintCss(linear({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }), 200, 100), "linear-gradient(180deg, rgba(255, 0, 0, 1) 0%, rgba(0, 0, 255, 1) 100%)");
  });

  it("a left-to-right one is 90deg", () => {
    assert.equal(paintCss(linear({ x: 0, y: 0.5 }, { x: 1, y: 0.5 }), 200, 100), "linear-gradient(90deg, rgba(255, 0, 0, 1) 0%, rgba(0, 0, 255, 1) 100%)");
  });

  it("a gradient between two points inside the box puts the stops where the handles are, whatever the box's shape", () => {
    // from the left quarter to the right quarter of a 400 x 100 box, heading right
    const css = paintCss(linear({ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 }), 400, 100)!;
    assert.equal(css, "linear-gradient(90deg, rgba(255, 0, 0, 1) 25%, rgba(0, 0, 255, 1) 75%)");
  });

  it("a diagonal gradient corner to corner of a square is 135deg at 0 and 100 percent", () => {
    assert.equal(paintCss(linear({ x: 0, y: 0 }, { x: 1, y: 1 }), 100, 100), "linear-gradient(135deg, rgba(255, 0, 0, 1) 0%, rgba(0, 0, 255, 1) 100%)");
  });

  it("a gradient with both ends in one place is a flat colour", () => {
    assert.equal(paintCss(linear({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }), 100, 100), "linear-gradient(rgba(0, 0, 255, 1), rgba(0, 0, 255, 1))");
  });

  it("radial and conic use the box in pixels", () => {
    const radial: Paint = { type: "radial", opacity: 1, visible: true, stops: [{ at: 0, color: "#fff" }, { at: 1, color: "#000" }], center: { x: 0.5, y: 0.5 }, radius: { x: 0.5, y: 0.25 } };
    assert.equal(paintCss(radial, 200, 100), "radial-gradient(100px 25px at 100px 50px, rgba(255, 255, 255, 1) 0%, rgba(0, 0, 0, 1) 100%)");
    const conic: Paint = { type: "conic", opacity: 0.5, visible: true, stops: [{ at: 0, color: "#fff" }, { at: 1, color: "#000" }], center: { x: 0.5, y: 0.5 }, angle: 90 };
    assert.equal(paintCss(conic, 200, 100), "conic-gradient(from 90deg at 100px 50px, rgba(255, 255, 255, 0.5) 0deg, rgba(0, 0, 0, 0.5) 360deg)");
  });

  it("a box of unknown size is treated as a square rather than breaking", () => {
    assert.ok(paintCss(linear({ x: 0, y: 0 }, { x: 1, y: 1 }), 0, 0)!.startsWith("linear-gradient(135deg"));
  });

  it("fills stack top first, and invisible ones are left out", () => {
    const a: Paint = { type: "solid", color: "#f00", opacity: 1, visible: true };
    const b: Paint = { type: "solid", color: "#0f0", opacity: 1, visible: false };
    const c: Paint = { type: "solid", color: "#00f", opacity: 1, visible: true };
    assert.equal(fillsBackground([a, b, c], 10, 10), "linear-gradient(rgba(255, 0, 0, 1), rgba(255, 0, 0, 1)), linear-gradient(rgba(0, 0, 255, 1), rgba(0, 0, 255, 1))");
    assert.equal(fillsBackground([b], 10, 10), undefined);
    assert.equal(fillsBackground([], 10, 10), undefined);
  });
});

describe("Phase 35: shadows and dashes", () => {
  it("shadows round trip, drop and inner", () => {
    const json = serializeShadows([{ kind: "drop", x: 0, y: 4, blur: 8, spread: 1, color: "#000000", visible: true }, { kind: "inner", x: 1, y: 2, blur: 3, spread: 0, color: "rgba(255, 0, 0, 0.5)", visible: false }]);
    assert.deepEqual(parseShadows(json).map((s) => [s.kind, s.x, s.y, s.blur, s.spread, s.visible]), [["drop", 0, 4, 8, 1, true], ["inner", 1, 2, 3, 0, false]]);
    assert.equal(serializeShadows([]), "");
  });
  it("box-shadow CSS: inner is inset, hidden ones are left out", () => {
    const shadows = parseShadows(serializeShadows([{ kind: "drop", x: 0, y: 4, blur: 8, spread: 2, color: "#000000", visible: true }, { kind: "inner", x: 0, y: 1, blur: 2, spread: 0, color: "#ffffff", visible: true }, { kind: "drop", x: 9, y: 9, blur: 9, spread: 9, color: "#000", visible: false }]));
    assert.equal(boxShadowCss(shadows), "0px 4px 8px 2px rgba(0, 0, 0, 1), inset 0px 1px 2px 0px rgba(255, 255, 255, 1)");
    assert.equal(boxShadowCss([]), undefined);
  });
  it("text shadow keeps drop shadows only", () => {
    const shadows = parseShadows(serializeShadows([{ kind: "drop", x: 1, y: 2, blur: 3, spread: 9, color: "#000000", visible: true }, { kind: "inner", x: 1, y: 2, blur: 3, spread: 0, color: "#000", visible: true }]));
    assert.equal(textShadowCss(shadows), "1px 2px 3px rgba(0, 0, 0, 1)");
  });
  it("hostile shadows are dropped or clamped", () => {
    assert.deepEqual(parseShadows("garbage"), []);
    const s = parseShadows('[{"color":"red","blur":9999,"x":1e9,"spread":-1e9},{"color":"url(x)"}]');
    assert.equal(s.length, 1);
    assert.deepEqual([s[0].blur, s[0].x, s[0].spread], [200, 1000, -100]);
  });
  it("dash patterns: numbers only, at most eight values", () => {
    assert.equal(safeDashArray("4 2"), "4 2");
    assert.equal(safeDashArray("4,2, 1"), "4 2 1");
    for (const bad of ["", "none", "4 2; evil", "a b", "0 0", "-1 2", "1 2 3 4 5 6 7 8 9"]) assert.equal(safeDashArray(bad), undefined, bad);
  });
});
