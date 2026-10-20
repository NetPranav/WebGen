import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ZOOM, MIN_ZOOM, centerOn, clampZoom, docToScreen, fitRect, gridSpacing, isCamera, panBy,
  screenToDoc, stepZoom, visibleDocRect, wheelZoomFactor, zoomAt, zoomByAt,
  type Camera,
} from "../camera";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

describe("Phase 20: camera maths", () => {
  it("screen and document coordinates round-trip", () => {
    const cam: Camera = { x: 130, y: -40, zoom: 2.5 };
    for (const p of [{ x: 0, y: 0 }, { x: 321, y: 77 }, { x: -50, y: 900 }]) {
      const back = docToScreen(cam, screenToDoc(cam, p));
      near(back.x, p.x);
      near(back.y, p.y);
    }
  });

  it("zooming keeps the document point under the cursor fixed, at every zoom from 2% to 6,400%", () => {
    let cam: Camera = { x: 200, y: 120, zoom: 1 };
    const anchor = { x: 417, y: 233 };
    const docUnder = screenToDoc(cam, anchor);
    for (const factor of [1.1, 1.5, 3, 0.5, 0.1, 40, 0.01, 2000]) {
      cam = zoomByAt(cam, anchor, factor);
      const now = docToScreen(cam, docUnder);
      near(now.x, anchor.x, 1e-6);
      near(now.y, anchor.y, 1e-6);
    }
  });

  it("zoom is clamped to 2%..6,400% and a clamped zoom does not move the camera", () => {
    assert.equal(clampZoom(0.001), MIN_ZOOM);
    assert.equal(clampZoom(1000), MAX_ZOOM);
    assert.equal(MIN_ZOOM, 0.02);
    assert.equal(MAX_ZOOM, 64);
    const atMax: Camera = { x: 10, y: 20, zoom: MAX_ZOOM };
    assert.equal(zoomAt(atMax, { x: 5, y: 5 }, 100), atMax);
    assert.equal(clampZoom(Number.NaN), 1);
  });

  it("zoom steps are multiplicative, snap to 100% when they cross it, and stay in range", () => {
    assert.equal(stepZoom(1, 1), 1.25);
    assert.equal(stepZoom(0.9, 1), 1); // 0.9 * 1.25 = 1.125 crosses 100%
    assert.equal(stepZoom(1.1, -1), 1);
    let z = 1;
    for (let i = 0; i < 100; i++) z = stepZoom(z, 1);
    assert.equal(z, MAX_ZOOM);
    for (let i = 0; i < 200; i++) z = stepZoom(z, -1);
    assert.equal(z, MIN_ZOOM);
  });

  it("panning moves the camera without changing the zoom", () => {
    assert.deepEqual(panBy({ x: 1, y: 2, zoom: 3 }, 10, -5), { x: 11, y: -3, zoom: 3 });
  });

  it("fitRect centres the rectangle and never zooms past the cap", () => {
    const viewport = { width: 1000, height: 800 };
    const rect = { x: 100, y: 50, width: 400, height: 300 };
    const cam = fitRect(viewport, rect, { padding: 40 });
    const c = docToScreen(cam, { x: 300, y: 200 });
    near(c.x, 500);
    near(c.y, 400);
    // Fits inside the padding
    const tl = docToScreen(cam, rect);
    assert.ok(tl.x >= 40 - 1e-9 && tl.y >= 40 - 1e-9);
    assert.equal(fitRect(viewport, { x: 0, y: 0, width: 10, height: 10 }, { maxZoom: 1 }).zoom, 1);
  });

  it("centerOn puts the document point mid-viewport; visibleDocRect is the inverse of the viewport", () => {
    const cam = centerOn({ width: 800, height: 600 }, { x: 0, y: 0 }, 2);
    assert.deepEqual(docToScreen(cam, { x: 0, y: 0 }), { x: 400, y: 300 });
    const vis = visibleDocRect(cam, { width: 800, height: 600 });
    near(vis.width, 400);
    near(vis.x, -200);
  });

  it("the wheel factor is smooth for small deltas and bounded for large ones", () => {
    assert.ok(wheelZoomFactor(-2) > 1 && wheelZoomFactor(2) < 1);
    assert.equal(wheelZoomFactor(0), 1);
    assert.ok(wheelZoomFactor(-100000) <= 1.25 + 1e-12);
    assert.ok(wheelZoomFactor(100000) >= 0.75 - 1e-12);
  });

  it("the grid spacing stays between 18 and 36 px at every zoom", () => {
    for (let z = MIN_ZOOM; z <= MAX_ZOOM; z *= 1.07) {
      const s = gridSpacing(24, z);
      assert.ok(s >= 18 && s <= 36, `${z} -> ${s}`);
    }
  });

  it("isCamera rejects malformed values", () => {
    assert.equal(isCamera({ x: 1, y: 2, zoom: 1 }), true);
    for (const bad of [null, {}, { x: 1, y: 2 }, { x: 1, y: 2, zoom: 0 }, { x: "1", y: 2, zoom: 1 }, { x: NaN, y: 0, zoom: 1 }]) {
      assert.equal(isCamera(bad), false);
    }
  });
});
