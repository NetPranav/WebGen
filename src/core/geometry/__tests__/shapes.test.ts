/**
 * FigCraft port F1: shape geometry. Every case of FigCraft's `crates/geom/src/tests.rs` (commit 6ea44e9), translated
 * one to one, plus checks of the curve core the port is written on (MIT, Copyright (c) 2026 ArtCraft Team and the
 * FigCraft contributors).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BezPath, arcToCubics, ellipsePath, hypot, normalize, pt, segmentArclen, segmentEval, segmentNearest, sub, dot, type Pt } from "../bezpath";
import { ellipse, polygonPoints, roundedPolygon, roundedRect, smoothedPolygon, starPoints } from "../shapes";
import { FLIP_X, FLIP_Y, apply, fromPositionRotation, isFlipped, mul, rotationDegrees, setRotationAboutCenter, translation } from "../affine";

const area = (p: BezPath) => Math.abs(p.area());
const PI = Math.PI;
const TAU = PI * 2;

describe("FigCraft geom: rectangles", () => {
  it("plain rect area", () => {
    assert.ok(Math.abs(area(roundedRect(100, 50, [0, 0, 0, 0], 0)) - 5000) < 1e-6);
  });

  it("rounded rect area matches circle corners", () => {
    const r = 10;
    const expected = 5000 - 4 * r * r + PI * r * r;
    const a = area(roundedRect(100, 50, [r, r, r, r], 0));
    assert.ok(Math.abs(a - expected) < 0.5, `${a} vs ${expected}`);
  });

  it("full radius is a capsule and the bounds hold", () => {
    const b = roundedRect(100, 40, [1000, 1000, 1000, 1000], 0).boundingBox();
    assert.ok(Math.abs(b.x1 - b.x0 - 100) < 1e-6 && Math.abs(b.y1 - b.y0 - 40) < 1e-6);
  });

  it("smoothing stays in bounds and removes more area the more it smooths", () => {
    for (const s of [0, 0.3, 0.6, 1]) {
      const p = roundedRect(200, 120, [24, 0, 40, 8], s);
      const b = p.boundingBox();
      assert.ok(b.x0 >= -1e-6 && b.y0 >= -1e-6 && b.x1 <= 200 + 1e-6 && b.y1 <= 120 + 1e-6, `s=${s} ${JSON.stringify(b)}`);
      assert.ok(area(p) < 200 * 120);
    }
    const a0 = area(roundedRect(200, 200, [40, 40, 40, 40], 0));
    const a1 = area(roundedRect(200, 200, [40, 40, 40, 40], 1));
    assert.ok(a1 < a0);
  });

  it("degenerate inputs don't throw", () => {
    roundedRect(NaN, -1, [Infinity, Infinity, Infinity, Infinity], NaN);
    roundedRect(0, 0, [5, 5, 5, 5], 0.5);
    polygonPoints(0, 0, 0);
    starPoints(10, 10, 1, -3);
    roundedPolygon([], 4);
    roundedPolygon([pt(0, 0), pt(0, 0), pt(0, 0)], 4);
    smoothedPolygon([pt(0, 0), pt(0, 0), pt(0, 0)], 4, 0.6);
    smoothedPolygon([pt(0, 0), pt(10, 0), pt(20, 0)], 4, 1);
    smoothedPolygon(polygonPoints(10, 10, 5), Infinity, NaN);
    smoothedPolygon(polygonPoints(10, 10, 5), 3, Infinity);
    ellipse(NaN, 10, NaN, 100, 2);
  });
});

describe("FigCraft geom: polygons and stars", () => {
  it("the polygon's first vertex is at the top centre", () => {
    const pts = polygonPoints(100, 100, 3);
    assert.equal(pts.length, 3);
    assert.ok(Math.abs(pts[0].x - 50) < 1e-9 && Math.abs(pts[0].y) < 1e-9);
  });

  it("a star has twice the points", () => {
    assert.equal(starPoints(100, 100, 5, 0.38).length, 10);
  });

  it("rounding a polygon shrinks its area, a little", () => {
    const pts = polygonPoints(100, 100, 6);
    const sharp = area(roundedPolygon(pts, 0));
    const round = area(roundedPolygon(pts, 10));
    assert.ok(round < sharp && round > sharp * 0.8);
  });

  it("a smoothed polygon matches the rectangle corner", () => {
    // a four-sided polygon is a square turned 45°: smoothed, it has the rounded rectangle's area
    const side = 50 * Math.SQRT2;
    const pts = polygonPoints(100, 100, 4);
    for (const [r, s] of [[10, 0], [10, 0.6], [12, 1], [30, 0.6], [1000, 0.6]]) {
      const poly = area(smoothedPolygon(pts, r, s));
      const rect = area(roundedRect(side, side, [r, r, r, r], s));
      assert.ok(Math.abs(poly - rect) < 0.05, `r=${r} s=${s}: ${poly} vs ${rect}`);
    }
  });

  it("a smoothed polygon smooths every corner", () => {
    const near = (p: BezPath, at: Pt) => Math.min(...p.segments().map((seg) => segmentNearest(seg, at).distanceSq));
    const shapes: [Pt[], boolean][] = [
      [polygonPoints(100, 100, 3), true],
      [polygonPoints(120, 80, 6), true],
      [starPoints(100, 100, 5, 0.38), false],
    ];
    for (const [pts, convex] of shapes) {
      const plain = smoothedPolygon(pts, 8, 0);
      assert.deepEqual(plain.els, roundedPolygon(pts, 8).els, "no smoothing draws the plain rounded corners");
      const sharp = area(roundedPolygon(pts, 0));
      let last = area(plain);
      for (const s of [0.3, 0.6, 1]) {
        const p = smoothedPolygon(pts, 8, s);
        const a = area(p);
        assert.ok(convex ? a < last : Math.abs(a - last) > 1e-3, `s=${s}: more smoothing changes the area (${a} after ${last})`);
        assert.ok(Math.abs(a - sharp) < sharp * 0.2, `s=${s}: the shape stays close to its points`);
        last = a;
        // the outline has no kinks: each piece leaves in the direction the one before arrives
        const segs = p.segments().filter((seg) => segmentArclen(seg) > 1e-6);
        segs.forEach((seg, i) => {
          const next = segs[(i + 1) % segs.length];
          const out = normalize(sub(segmentEval(seg, 1), segmentEval(seg, 1 - 1e-6)));
          const into = normalize(sub(segmentEval(next, 1e-6), segmentEval(next, 0)));
          assert.ok(dot(out, into) > 0.999, `s=${s}: piece ${i} joins the next smoothly`);
        });
        const b = p.boundingBox();
        assert.ok(b.x0 >= -1e-6 && b.y0 >= -1e-6 && b.x1 <= 120 + 1e-6 && b.y1 <= 100 + 1e-6, `s=${s} ${JSON.stringify(b)}`);
        // every vertex is cut off, and the middle of every edge is still on the outline
        pts.forEach((v, i) => {
          const nx = pts[(i + 1) % pts.length];
          const mid = pt((v.x + nx.x) / 2, (v.y + nx.y) / 2);
          assert.ok(near(p, mid) < 1e-6, `s=${s}: edge ${i} keeps its middle`);
          assert.ok(near(p, v) > 0.25, `s=${s}: vertex ${i} is rounded`);
        });
      }
    }
  });
});

describe("FigCraft geom: ellipses, arcs and rings", () => {
  it("ring area", () => {
    const full = area(ellipse(100, 100, 0, TAU, 0));
    assert.ok(Math.abs(full - PI * 2500) < 2);
    // winding area of a ring with a reversed inner contour: outer - inner
    const a = Math.abs(ellipse(100, 100, 0, TAU, 0.5).area());
    assert.ok(Math.abs(a - PI * (2500 - 625)) < 5, `${a}`);
    const half = area(ellipse(100, 100, 0, PI, 0));
    assert.ok(Math.abs(half - PI * 1250) < 2);
  });

  it("a pie, an arc with an inner ratio, stays inside its box", () => {
    const p = ellipse(200, 100, -PI / 2, PI * 1.5, 0.4);
    const b = p.boundingBox();
    // cubics approximate the arc to kurbo's 0.01 tolerance, so they may bulge out by that much
    assert.ok(b.x0 >= -0.02 && b.y0 >= -0.02 && b.x1 <= 200.02 && b.y1 <= 100.02, JSON.stringify(b));
    const expected = PI * 100 * 50 * 0.75 * (1 - 0.4 * 0.4);
    assert.ok(Math.abs(area(p) - expected) < 3, `${area(p)} vs ${expected}`);
  });
});

describe("FigCraft geom: transforms", () => {
  it("rotation round trip", () => {
    for (const deg of [0, 30, -45, 90, 179]) {
      const m = fromPositionRotation(10, 20, deg);
      assert.ok(Math.abs(rotationDegrees(m) - deg) < 1e-9, `${deg}`);
      assert.deepEqual(translation(m), { x: 10, y: 20 });
    }
  });

  it("setting a rotation keeps the centre, and keeps a flip", () => {
    const m = fromPositionRotation(10, 20, 0);
    const r = setRotationAboutCenter(m, 100, 50, 90);
    assert.ok(hypot(sub(apply(m, pt(50, 25)), apply(r, pt(50, 25)))) < 1e-9);
    assert.ok(Math.abs(rotationDegrees(r) - 90) < 1e-9);
    for (const flip of [FLIP_X, FLIP_Y]) {
      for (const deg of [0, 30, -120]) {
        const r2 = setRotationAboutCenter(mul(m, flip), 100, 50, deg);
        assert.ok(isFlipped(r2) && Math.abs(rotationDegrees(r2) - deg) < 1e-9, `${deg}`);
        assert.ok(hypot(sub(apply(mul(m, flip), pt(50, 25)), apply(r2, pt(50, 25)))) < 1e-9);
      }
    }
  });
});

describe("FigCraft geom: the curve core", () => {
  it("reversing subpaths keeps open paths open and closed paths closed", () => {
    const open = new BezPath().moveTo(pt(0, 0)).lineTo(pt(10, 0)).lineTo(pt(10, 10));
    assert.ok(!open.reverseSubpaths().els.some((e) => e.t === "Z"));
    const closed = BezPath.from(open.els).closePath();
    assert.equal(closed.reverseSubpaths().els.at(-1)?.t, "Z");
    // and reversing flips the sign of the area
    assert.ok(Math.abs(closed.area() + closed.reverseSubpaths().area()) < 1e-9);
  });

  it("an ellipse built from cubics has the ellipse's area and bounds", () => {
    const e = ellipsePath(pt(0, 0), pt(80, 30));
    assert.ok(Math.abs(Math.abs(e.area()) - PI * 80 * 30) < 1);
    const b = e.boundingBox();
    for (const [got, want] of [[b.x0, -80], [b.x1, 80], [b.y0, -30], [b.y1, 30]]) assert.ok(Math.abs(got - want) < 0.02, JSON.stringify(b));
  });

  it("arcs are split into more pieces for bigger radii (kurbo's tolerance rule)", () => {
    const count = (r: number) => {
      let n = 0;
      arcToCubics(pt(0, 0), pt(r, r), 0, TAU, 0, 0.01, () => n++);
      return n;
    };
    assert.ok(count(10) >= 4);
    assert.ok(count(10_000) > count(10));
  });

  it("SVG output is plain path data", () => {
    assert.equal(roundedRect(10, 5, [0, 0, 0, 0], 0).toSvg(), "M0 0L10 0L10 5L0 5Z");
  });
});
