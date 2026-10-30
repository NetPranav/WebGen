/**
 * FigCraft port F3: brushes. The cases of FigCraft's `crates/pathops/src/brush_tests.rs` (commit 6ea44e9): stretch
 * shapes bend along the path, scatter copies are spaced, capped and repeatable, and a width profile scales them; then
 * a brush on a layer draws its stroke's area. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BezPath, splitSubpaths } from "../../geometry/bezpath";
import { winding } from "../../geometry/measure";
import { DEFAULT_BRUSH, MAX_COPIES, PRESETS, brushOutline, parseBrush, rand, type Brush } from "../brush";
import { createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { RenderLayer } from "../../render/RenderLayer";

const line = (len: number) => new BezPath().moveTo({ x: 0, y: 0 }).lineTo({ x: len, y: 0 });
const brush = (preset: string, more: Partial<Brush> = {}): Brush => ({ ...DEFAULT_BRUSH, preset, ...more });
const moves = (p: BezPath) => p.els.filter((e) => e.t === "M").length;

describe("FigCraft brushes", () => {
  it("every preset draws inside its reach; an unknown one draws nothing", () => {
    for (const p of PRESETS) {
      const out = brushOutline(line(200), 10, brush(p.id))!;
      const bb = out.boundingBox();
      assert.ok(out.els.length > 0, p.id);
      assert.ok(bb.y0 >= -5.5 && bb.y1 <= 5.5 && bb.x0 >= -5.5 && bb.x1 <= 205.5, `${p.id}: ${JSON.stringify(bb)}`);
    }
    assert.equal(brushOutline(line(10), 1, brush("nope")), null);
  });

  it("a stretch bends with the path: down a vertical line the taper is widest half way, pointed at the start", () => {
    const p = new BezPath().moveTo({ x: 0, y: 0 }).lineTo({ x: 0, y: 100 });
    const out = brushOutline(p, 20, brush("taper"))!;
    const bb = out.boundingBox();
    assert.ok(Math.abs(bb.y1 - bb.y0 - 100) < 1 && Math.abs(bb.x1 - bb.x0 - 15) < 1.5, JSON.stringify(bb));
    assert.notEqual(winding(out, { x: 0, y: 50 }), 0, "filled in the middle");
    assert.equal(winding(out, { x: 6, y: 2 }), 0, "pointed at the start");
  });

  it("scatter copies are spaced, capped and repeatable", () => {
    const b = brush("dots", { spacing: 2, sizeJitter: 0.5, rotationJitter: 1, scatter: 1, seed: 7 });
    const a = brushOutline(line(200), 10, b)!;
    assert.equal(a.toSvg(2), brushOutline(line(200), 10, b)!.toSvg(2), "the same seed, the same copies");
    assert.notEqual(a.toSvg(2), brushOutline(line(200), 10, { ...b, seed: 8 })!.toSvg(2));
    assert.equal(moves(a), 10, "200 long, a copy every 20");
    assert.ok(moves(brushOutline(line(1e6), 1, brush("dots", { spacing: 0 }))!) <= MAX_COPIES + 1, "capped");
    assert.ok(rand(7, 1, 0) >= 0 && rand(7, 1, 0) < 1);
  });

  it("a width profile scales the brush along the path", () => {
    const out = brushOutline(line(300), 10, brush("dots"), [{ t: 0, scale: 0.2, bias: 0 }, { t: 1, scale: 2, bias: 0 }])!;
    const parts = splitSubpaths(out);
    const [first, last] = [parts[0].boundingBox(), parts[parts.length - 1].boundingBox()];
    assert.ok(last.x1 - last.x0 > (first.x1 - first.x0) * 3, `${JSON.stringify(first)} ${JSON.stringify(last)}`);
  });

  it("a brush stored on a layer draws its stroke's area; junk is no brush", () => {
    assert.equal(parseBrush('{"preset":"sparkle"}'), null);
    assert.equal(parseBrush("junk"), null);
    assert.equal(parseBrush('{"preset":"dots","spacing":-3}')!.spacing, 0);
    const l = createLayer({ id: "ln", archetype: "line", parentId: null, name: "ln", properties: { "frame.width": 200, "frame.height": 20, "svg.stroke": "#000", "svg.strokeWidth": 8, "stroke.brush": JSON.stringify({ preset: "taper" }) } }) as Layer;
    const out = renderToStaticMarkup(createElement(RenderLayer, { layerId: "ln", layers: { ln: l } }));
    assert.match(out, /<mask[^>]*>.*fill-rule="nonzero"/, out.slice(0, 600));
  });
});
