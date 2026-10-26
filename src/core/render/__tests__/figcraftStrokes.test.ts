/**
 * FigCraft port F3 on the stage: several strokes, alignment, per-side weights, variable widths and arrowheads reach
 * the render definitions, and a layer that uses none of them draws exactly as before.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { RenderLayer } from "../RenderLayer";
import { readCap } from "../strokePaint";

const html = (archetype: Layer["archetype"], properties: Layer["properties"] = {}) =>
  renderToStaticMarkup(createElement(RenderLayer, { layerId: "l", layers: { l: createLayer({ id: "l", archetype, properties }) as Layer } }));

describe("FigCraft port F3: strokes on the stage", () => {
  it("a plain stroke draws as before: no mask", () => {
    const out = html("rectangle", { "svg.stroke": "#000", "svg.strokeWidth": 4 });
    assert.ok(!out.includes("<mask"), out);
    assert.ok(out.includes('stroke="#000000"') || out.includes("stroke=\"rgb"), out);
  });

  it("an inside stroke is clipped to the shape and drawn at twice the weight", () => {
    const out = html("rectangle", { "svg.stroke": "#000", "svg.strokeWidth": 4, "stroke.align": "inside" });
    assert.ok(out.includes("<mask") && out.includes("clip-path=\"url(#l__strokeclip)\""), out);
    assert.ok(out.includes('stroke-width="8"'), out);
  });

  it("an outside stroke masks the shape back out", () => {
    const out = html("ellipse", { "svg.stroke": "#000", "svg.strokeWidth": 3, "stroke.align": "outside" });
    assert.ok(out.includes("<mask") && out.includes('fill="#000"'), out);
  });

  it("several strokes each paint through the stroke's mask, gradients included", () => {
    const strokes = JSON.stringify([{ type: "solid", color: "#f00" }, { type: "linear", stops: [{ at: 0, color: "#000" }, { at: 1, color: "#fff" }], from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }]);
    const out = html("star", { "paint.strokes": strokes, "svg.strokeWidth": 2 });
    assert.ok(out.includes("<linearGradient") && out.includes("mask=\"url(#l__stroke)\""), out);
  });

  it("per-side weights draw a ring, filled even-odd", () => {
    const out = html("rectangle", { "svg.stroke": "#000", "svg.strokeWidth": 1, "stroke.sides": "0 0 4 0", "shape.cornerRadius": 8 });
    assert.ok(/<mask[^>]*>.*fill-rule="evenodd"/.test(out), out);
  });

  it("a line draws its arrowheads; a variable width draws an outline", () => {
    const out = html("line", { "shape.endCap": "triangleArrow", "svg.strokeWidth": 2 });
    assert.ok(out.includes("<mask") && (out.match(/<path/g) ?? []).length >= 1, out);
    const tapered = html("line", { "stroke.widthProfile": JSON.stringify([{ t: 0, scale: 1 }, { t: 1, scale: 0 }]), "svg.strokeWidth": 6 });
    assert.ok(/<mask[^>]*><path d="M/.test(tapered), tapered);
  });

  it("a pen path with a variable width is outlined in px and mapped into its 200 × 200 space", () => {
    const out = html("svgPath", { "svg.path": "M0 100 L200 100", "frame.width": 400, "frame.height": 40, "stroke.widthProfile": JSON.stringify([{ t: 0, scale: 0 }, { t: 0.5, scale: 1 }, { t: 1, scale: 0 }]), "svg.strokeWidth": 10 });
    const d = /<mask[^>]*><path d="([^"]+)"/.exec(out)?.[1];
    assert.ok(d, out);
    // half the 10 px width is 5 px; across a 40 px tall frame stretched to 200 that is 25 units either side of y = 100
    const ys = (d!.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 1);
    assert.ok(Math.abs(Math.max(...ys) - 125) < 0.5 && Math.abs(Math.min(...ys) - 75) < 0.5, `${Math.min(...ys)}..${Math.max(...ys)}`);
  });

  it("older cap names still read", () => {
    assert.equal(readCap("arrow"), "lineArrow");
    assert.equal(readCap("triangle"), "triangleArrow");
    assert.equal(readCap("circle"), "circleFilled");
    assert.equal(readCap("<x>"), "none");
  });

  it("a frame's centred and outside strokes are outlines; per-side weights are border widths", () => {
    const base = { "appearance.border.width": 4, "appearance.border.style": "solid", "appearance.border.color": "#000" };
    const outside = html("container", { ...base, "stroke.align": "outside" });
    assert.ok(outside.includes("outline-width:4px") && outside.includes("outline-offset:0px") && !outside.includes("border-style"), outside);
    assert.ok(html("container", { ...base, "stroke.align": "center" }).includes("outline-offset:-2px"));
    const sides = html("container", { ...base, "stroke.sides": "1 2 3 4" });
    assert.ok(sides.includes("border-top-width:1px") && sides.includes("border-left-width:4px"), sides);
  });
});
