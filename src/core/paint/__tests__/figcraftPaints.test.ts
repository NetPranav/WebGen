/**
 * FigCraft port F2 in our paints: blend modes per paint, the diamond gradient (checked point by point against the
 * formula FigCraft's renderer uses, t = |x| + |y| in the handle frame) and the seven image adjustments.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { diamondCss, fillLayers, hasAdjustFilter, imageFilterCss, newPaint, parseFills, serializeFills, type DiamondPaint, type Paint } from "../paints";
import { NO_ADJUSTMENTS } from "../color";
import { createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { RenderLayer } from "../../render/RenderLayer";

/** The value a CSS `linear-gradient(<angle>deg, …)` takes at (x, y) inside a w×h tile, as a fraction of its line. */
function cssLinearAt(angleDeg: number, w: number, h: number, x: number, y: number): number {
  const th = (angleDeg * Math.PI) / 180;
  const ux = Math.sin(th);
  const uy = -Math.cos(th);
  const len = Math.abs(w * Math.sin(th)) + Math.abs(h * Math.cos(th));
  return ((x - w / 2) * ux + (y - h / 2) * uy) / len + 0.5;
}

describe("FigCraft port F2: the diamond gradient", () => {
  it("each quadrant's CSS gradient puts every stop where |dx|/rx + |dy|/ry says", () => {
    const W = 200;
    const H = 120;
    const p: DiamondPaint = { type: "diamond", opacity: 1, visible: true, stops: [{ at: 0, color: "#000" }, { at: 1, color: "#fff" }], center: { x: 0.4, y: 0.6 }, radius: { x: 0.3, y: 0.5 } };
    const layers = diamondCss(p, W, H);
    assert.equal(layers.length, 4);
    const cx = p.center.x * W;
    const cy = p.center.y * H;
    const rx = p.radius.x * W;
    const ry = p.radius.y * H;
    for (const l of layers) {
      const [x0, y0] = l.position.split(" ").map((v) => parseFloat(v));
      const [w, h] = l.size.split(" ").map((v) => parseFloat(v));
      const angle = parseFloat(/linear-gradient\(([-\d.]+)deg/.exec(l.image)![1]);
      // the stop at 1 sits at this fraction of the gradient line; with stop 0 at its own fraction, t is linear between
      const at = [...l.image.matchAll(/ ([-\d.]+)%/g)].map((m) => parseFloat(m[1]) / 100);
      for (const [fx, fy] of [[0.1, 0.2], [0.5, 0.5], [0.9, 0.7], [0.3, 0.95]]) {
        const x = x0 + fx * w;
        const y = y0 + fy * h;
        const g = cssLinearAt(angle, w, h, x - x0, y - y0);
        const t = (g - at[0]) / (at[1] - at[0]);
        const want = Math.abs(x - cx) / rx + Math.abs(y - cy) / ry;
        assert.ok(Math.abs(t - want) < 2e-3, `${l.position}: t=${t} want=${want}`);
      }
    }
  });

  it("a diamond paint parses, serialises and becomes background layers", () => {
    const d = newPaint("diamond");
    const back = parseFills(serializeFills([d]))!;
    assert.equal(back[0].type, "diamond");
    const { layers } = fillLayers(back, 100, 100);
    assert.equal(layers!.image.split("linear-gradient").length - 1, 4);
    assert.equal(layers!.repeat, "no-repeat, no-repeat, no-repeat, no-repeat");
  });
});

describe("FigCraft port F2: blend modes per paint", () => {
  it("a blend mode is kept, normal and junk are dropped", () => {
    const fills = parseFills(JSON.stringify([
      { type: "solid", color: "#f00", blend: "multiply" },
      { type: "solid", color: "#0f0", blend: "normal" },
      { type: "solid", color: "#00f", blend: "<script>" },
    ]))!;
    assert.deepEqual(fills.map((f) => f.blend), ["multiply", undefined, undefined]);
    assert.ok(serializeFills(fills).includes('"blend":"multiply"'));
    assert.ok(!serializeFills(fills).includes("normal"));
  });

  it("boxes get background-blend-mode, one per layer; shapes wrap the fill in a blended group", () => {
    const fills: Paint[] = [{ type: "solid", color: "#f00", opacity: 1, visible: true, blend: "colorDodge" }, { type: "solid", color: "#00f", opacity: 1, visible: true }];
    assert.equal(fillLayers(fills, 10, 10).layers!.blend, "color-dodge, normal");
    assert.equal(fillLayers([fills[1]], 10, 10).layers!.blend, undefined);
    const out = renderToStaticMarkup(createElement(RenderLayer, { layerId: "l", layers: { l: createLayer({ id: "l", archetype: "rectangle", properties: { "paint.fills": serializeFills(fills) } }) as Layer } }));
    assert.ok(out.includes("mix-blend-mode:color-dodge"), out);
  });
});

describe("FigCraft port F2: image adjustments", () => {
  const img = (adjust?: object) => parseFills(JSON.stringify([{ type: "image", src: "asset:" + "a".repeat(64), mode: "fill", ...(adjust ? { adjust } : {}) }]))![0];

  it("adjustments are sanitised, and all-zero is none", () => {
    assert.deepEqual(img({ exposure: 5, tint: "x", shadows: -0.25 }).type === "image" && (img({ exposure: 5, tint: "x", shadows: -0.25 }) as { adjust?: object }).adjust, { ...NO_ADJUSTMENTS, exposure: 1, shadows: -0.25 });
    assert.equal((img({ exposure: 0 }) as { adjust?: object }).adjust, undefined);
    assert.equal(hasAdjustFilter(img()), false);
  });

  it("an adjusted image references its SVG filter", () => {
    const p = img({ temperature: 0.4 });
    assert.ok(hasAdjustFilter(p));
    assert.equal(imageFilterCss(p, "f1"), "url(#f1)");
  });
});
