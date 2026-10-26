/**
 * FigCraft port F1 on the stage: per-corner radii, corner smoothing, rounded vertices and arcs reach the render
 * definitions (and through them the exporter, which renders the same definitions).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { RenderLayer } from "../RenderLayer";
import { resolveProps } from "../resolve";
import { rectangleRadii } from "../archetypes/Shapes";
import { isPropertyLegalFor } from "../../document/properties";

const html = (archetype: Layer["archetype"], properties: Layer["properties"] = {}) =>
  renderToStaticMarkup(createElement(RenderLayer, { layerId: "l", layers: { l: createLayer({ id: "l", archetype, properties }) as Layer } }));
const pathOf = (out: string) => /<path[^>]* d="([^"]+)"/.exec(out)?.[1] ?? null;

describe("FigCraft port F1: shapes on the stage", () => {
  it("a plain rectangle stays a <rect>; smoothing or mixed corners draw a path", () => {
    assert.ok(html("rectangle", { "shape.cornerRadius": 12 }).includes("<rect"));
    const smooth = pathOf(html("rectangle", { "shape.cornerRadius": 12, "shape.cornerSmoothing": 0.6 }));
    assert.ok(smooth && smooth.startsWith("M") && smooth.endsWith("Z"), String(smooth));
    const mixed = pathOf(html("rectangle", { "shape.cornerRadius.topLeft": 20, "frame.width": 100, "frame.height": 60 }));
    assert.ok(mixed, "mixed corners draw a path");
  });

  it("each corner falls back to the shared radius", () => {
    assert.deepEqual(rectangleRadii(resolveProps({ archetype: "rectangle", properties: { "shape.cornerRadius": 8, "shape.cornerRadius.bottomRight": 30 } })), [8, 8, 30, 8]);
  });

  it("a rounded polygon and star draw a path; sharp ones keep their points", () => {
    assert.ok(html("polygon", { "shape.sides": 5 }).includes("<polygon"));
    assert.ok(pathOf(html("polygon", { "shape.sides": 5, "shape.vertexRadius": 10, "shape.cornerSmoothing": 0.5 })));
    assert.ok(pathOf(html("star", { "shape.vertexRadius": 4 })));
  });

  it("an arc, a pie or a ring draws a path filled even-odd; a whole ellipse stays an <ellipse>", () => {
    assert.ok(html("ellipse").includes("<ellipse"));
    const ring = html("ellipse", { "shape.arcInnerRatio": 0.5 });
    assert.ok(pathOf(ring) && ring.includes('fill-rule="evenodd"'));
    assert.ok(pathOf(html("ellipse", { "shape.arcSweep": 90 })));
  });

  it("junk values draw something sane, never NaN", () => {
    for (const out of [
      html("rectangle", { "shape.cornerRadius": -5, "shape.cornerSmoothing": 9 }),
      html("ellipse", { "shape.arcSweep": 1e9, "shape.arcInnerRatio": -3 }),
      html("star", { "shape.vertexRadius": 1e12, "shape.cornerSmoothing": -1 }),
    ]) assert.ok(!out.includes("NaN"), out.slice(0, 200));
  });

  it("the new properties apply only where they mean something", () => {
    assert.ok(isPropertyLegalFor("shape.cornerSmoothing", "rectangle"));
    assert.ok(!isPropertyLegalFor("shape.cornerSmoothing", "ellipse"));
    assert.ok(isPropertyLegalFor("shape.arcSweep", "ellipse"));
    assert.ok(!isPropertyLegalFor("shape.arcSweep", "rectangle"));
  });
});
