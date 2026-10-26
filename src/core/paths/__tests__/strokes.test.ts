/**
 * FigCraft port F3: strokes and path operations. The cases of FigCraft's `crates/pathops/src/width_tests.rs`,
 * `sides_tests.rs`, `rounded_side_strokes_tests.rs`, the `lib.rs` tests (booleans, faces, alignment, arrows,
 * dashes) and `crates/geom/src/measure.rs`'s tests (commit 6ea44e9), translated one to one. Cases about vector
 * networks' per-point caps and joins move to F4. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 *
 * Where FigCraft's outlines are kurbo curves and ours are polygons within 0.05 px, tolerances that compared curved
 * areas exactly (1e-6) are widened to what flattening allows; each such case says so.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BezPath, ellipsePath, pt } from "../../geometry/bezpath";
import { MAX_SAMPLES, polylines, winding } from "../../geometry/measure";
import { roundedRect } from "../../geometry/shapes";
import {
  arrowhead, defaultStroke, insertWidthPoint, presetFromId, presetProfile, rectSideStrokes, roundedSideStrokes, sanitizeProfile, setWidthSide, sidesAt,
  strokeCenter, strokeOutline, variableOutline, widthPoint, widthPointFromSides, type StrokeProps,
} from "../strokes";
import { MAX_ARRANGEMENT_INPUTS, arrangementFaces, booleanPaths, unionFaces } from "../pathOps";

const line = (x1: number) => new BezPath().moveTo(pt(0, 0)).lineTo(pt(x1, 0));
const props = (weight: number, profile: StrokeProps["widthProfile"] = null, extra: Partial<StrokeProps> = {}): StrokeProps => ({ ...defaultStroke(), weight, align: "center", widthProfile: profile, ...extra });
const covers = (p: BezPath, x: number, y: number) => winding(p, pt(x, y)) !== 0;
const bbox = (p: BezPath) => p.boundingBox();
const sq = (x: number, y: number, s: number) => new BezPath().moveTo(pt(x, y)).lineTo(pt(x + s, y)).lineTo(pt(x + s, y + s)).lineTo(pt(x, y + s)).closePath();
const circle = (cx: number, cy: number, r: number) => ellipsePath(pt(cx, cy), pt(r, r), 0.01);
const near = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

describe("FigCraft measure: polylines", () => {
  it("normal open and closed paths are preserved", () => {
    const open = new BezPath().moveTo(pt(0, 0)).lineTo(pt(1, 0)).lineTo(pt(2, 0)).lineTo(pt(3, 0));
    const lines = polylines(open, 100)!;
    assert.equal(lines.length, 1);
    assert.equal(lines[0].points.length, 4);
    assert.ok(near(lines[0].length(), 3, 1e-9));
    assert.ok(!lines[0].closed);
    const closed = polylines(sq(0, 0, 10), 100)!;
    assert.ok(closed[0].closed);
    assert.ok(near(closed[0].length(), 40, 1e-9));
  });

  it("over-budget paths are refused", () => {
    const p = new BezPath().moveTo(pt(0, 0));
    for (let i = 1; i <= 50; i++) p.lineTo(pt(i, 0));
    assert.equal(polylines(p, 10), null);
    const curve = new BezPath().moveTo(pt(0, 0)).curveTo(pt(0, 1000), pt(1000, 1000), pt(1000, 0));
    assert.equal(polylines(curve, 8), null);
    assert.ok(polylines(curve));
  });

  it("curve end points and length still measure", () => {
    const l = polylines(new BezPath().moveTo(pt(0, 0)).curveTo(pt(0, 100), pt(100, 100), pt(100, 0)))![0];
    assert.deepEqual(l.points[0], pt(0, 0));
    assert.deepEqual(l.points[l.points.length - 1], pt(100, 0));
    assert.ok(l.length() > 100 && l.length() < 300);
  });

  it("measures paths by length", () => {
    const p = line(100).moveTo(pt(0, 50)).lineTo(pt(0, 150));
    const lines = polylines(p)!;
    assert.equal(lines.length, 2);
    assert.equal(lines[0].length(), 100);
    const at = lines[0].at(0.25)!;
    assert.deepEqual(at.point, pt(25, 0));
    assert.ok(Math.abs(at.normal.x) < 1e-12 && near(at.normal.y, 1, 1e-12));
    assert.deepEqual(lines[0].at(1)!.point, pt(100, 0));
    const n = lines[0].nearest(pt(30, 5))!;
    assert.ok(near(n.distance, 5, 1e-12) && near(n.t, 0.3, 1e-12));
    assert.ok(near(lines[1].nearest(pt(-3, 100))!.t, 0.5, 1e-12));
    // a closed circle ends where it starts
    const c = polylines(circle(0, 0, 10))![0];
    assert.ok(c.closed);
    assert.deepEqual(c.points[0], c.points[c.points.length - 1]);
    assert.ok(Math.abs(c.length() - Math.PI * 20) < 0.1, `${c.length()}`);
  });
});

describe("FigCraft width: variable width strokes", () => {
  it("width follows the profile", () => {
    // a wedge from 10 wide to a point: a triangle of area 500
    const s = strokeOutline(line(100), props(10, presetProfile("wedge")), false);
    assert.ok(Math.abs(Math.abs(s.area()) - 500) < 2, `${s.area()}`);
    assert.ok(covers(s, 5, 4) && !covers(s, 95, 4), "wide at the start, thin at the end");
    // a uniform profile matches the plain stroke, caps included
    for (const cap of ["none", "round", "square"] as const) {
      const uniform = props(10, [widthPoint(0, 1), widthPoint(1, 1)], { capStart: cap, capEnd: cap });
      const plain = { ...uniform, widthProfile: null };
      const a = strokeOutline(line(100), uniform, false);
      const b = strokeOutline(line(100), plain, false);
      assert.ok(Math.abs(Math.abs(a.area()) - Math.abs(b.area())) < 1, cap);
      const ba = bbox(a);
      const bb = bbox(b);
      assert.ok(near(ba.x0, bb.x0, 0.1) && near(ba.x1, bb.x1, 0.1) && near(ba.y1, bb.y1, 0.1), cap);
    }
    // scales above 1 widen the stroke past its weight
    const wide = strokeOutline(line(100), props(10, sanitizeProfile([widthPoint(0, 1), widthPoint(0.5, 3), widthPoint(1, 1)])), false);
    assert.ok(near(bbox(wide).y1, 15, 0.01), JSON.stringify(bbox(wide)));
  });

  it("closed paths make a ring per subpath", () => {
    const s = strokeOutline(circle(50, 50, 40), props(10, presetProfile("eye")), true);
    assert.ok(!covers(s, 50, 50), "the middle stays open");
    // the eye is widest halfway round (the circle starts at its right-hand point)
    assert.ok(covers(s, 14, 50) && covers(s, 6, 50));
    assert.ok(!covers(s, 94, 50) && !covers(s, 86, 50), "pointed at the start");
    // inside alignment stays inside the shape
    const inside = strokeOutline(sq(0, 0, 100), props(10, presetProfile("taper"), { align: "inside" }), true);
    const b = bbox(inside);
    assert.ok(b.x0 >= -0.01 && b.y0 >= -0.01 && b.x1 <= 100.01 && b.y1 <= 100.01, JSON.stringify(b));
    assert.ok(Math.abs(inside.area()) > 100);
  });

  it("joins and dashes", () => {
    const corner = new BezPath().moveTo(pt(0, 0)).lineTo(pt(100, 0)).lineTo(pt(100, 100));
    const at = (join: StrokeProps["join"]) => strokeOutline(corner, props(20, [widthPoint(0, 1), widthPoint(1, 1)], { join }), false);
    const miter = at("miter");
    const bevel = at("bevel");
    const round = at("round");
    // the outer corner is (110, -10): the miter reaches it, the others cut it
    assert.ok(covers(miter, 109, -9));
    assert.ok(!covers(bevel, 109, -9) && !covers(round, 109, -9));
    assert.ok(covers(round, 106, -6) && !covers(bevel, 106, -6), "round bulges past the bevel");
    assert.ok(covers(bevel, 95, 5) && covers(bevel, 91, 9), "the inner corner is filled");
    // dashes: half of a 100 long, 2 wide line
    let s = strokeOutline(line(100), props(2, [widthPoint(0, 1), widthPoint(1, 1)], { dashes: [10, 10] }), false);
    assert.ok(Math.abs(Math.abs(s.area()) - 100) < 1, `${s.area()}`);
    assert.ok(covers(s, 5, 0) && !covers(s, 15, 0));
    // dashes keep the width of where they are on the path
    s = strokeOutline(line(100), props(10, presetProfile("wedge"), { dashes: [10, 10] }), false);
    assert.ok(covers(s, 5, 4) && !covers(s, 85, 4));
    // zero-length dashes with round caps are dots
    s = strokeOutline(line(100), props(4, [widthPoint(0, 1), widthPoint(1, 1)], { dashes: [0, 10], capStart: "round", capEnd: "round" }), false);
    assert.ok(covers(s, 10, 1) && !covers(s, 5, 0));
  });

  it("hostile and huge input is bounded", () => {
    const bad = new BezPath().moveTo(pt(NaN, 0)).lineTo(pt(1, 1));
    assert.equal(polylines(bad), null);
    strokeOutline(bad, props(4, presetProfile("eye")), false);
    // a path too long to sample falls back to the uniform stroke
    const long = new BezPath().moveTo(pt(0, 0));
    for (let i = 0; i < MAX_SAMPLES + 10; i++) long.lineTo(pt(i, (i % 2) * 5));
    assert.equal(variableOutline(long, 2, props(2), [widthPoint(0, 1), widthPoint(1, 1)]), null);
    // zero width, empty paths, a single point and a dash pattern of zeros
    assert.equal(variableOutline(line(10), 0, props(0), [])!.isEmpty(), true);
    assert.equal(variableOutline(new BezPath(), 2, props(2), [])!.isEmpty(), true);
    strokeOutline(new BezPath().moveTo(pt(5, 5)).lineTo(pt(5, 5)), props(2, presetProfile("eye")), false);
    assert.ok(!strokeOutline(line(10), props(2, [widthPoint(0, 1), widthPoint(1, 1)], { dashes: [0, 0] }), false).isEmpty(), "solid when the pattern is empty");
    // a tiny dash pattern on a long path doesn't explode
    assert.ok(strokeOutline(line(1e6), props(2, [widthPoint(0, 1), widthPoint(1, 1)], { dashes: [0.01, 0.01] }), false).els.length < 1_000_000);
  });

  it("width profile editing: presets, inserted points, sides", () => {
    assert.equal(presetFromId("Taper both ends"), "taper");
    assert.equal(presetFromId("bulge"), "eye");
    assert.equal(presetProfile("uniform"), null);
    const ins = insertWidthPoint(presetProfile("wedge")!, 0.5, 2);
    assert.equal(ins.index, 1);
    assert.deepEqual(sidesAt(ins.points, 0.5), [2, 2]);
    const lop = setWidthSide([widthPoint(0, 1)], 0, "right", 3)!;
    assert.deepEqual(sidesAt(lop, 0.2), [1, 3]);
    assert.equal(sanitizeProfile([{ t: NaN, scale: 1 }, { t: 2, scale: -5, bias: 9 }]).length, 1);
  });
});

describe("FigCraft width: one-sided widths", () => {
  const lopsided = (pts: ReturnType<typeof widthPointFromSides>[], extra: Partial<StrokeProps> = {}) => props(10, sanitizeProfile(pts), extra);

  it("each side is offset by its own width", () => {
    let p = lopsided([widthPointFromSides(0, 0, 2), widthPointFromSides(1, 0, 2)]);
    let b = bbox(strokeOutline(line(100), p, false));
    assert.ok(Math.abs(b.y0) < 1e-6 && near(b.y1, 10, 1e-6) && Math.abs(b.x0) < 1e-6 && near(b.x1, 100, 1e-6), JSON.stringify(b));
    assert.ok(Math.abs(Math.abs(strokeOutline(line(100), p, false).area()) - 1000) < 1);
    p = lopsided([widthPointFromSides(0.5, 0.4, 1.6)]);
    b = bbox(strokeOutline(line(100), p, false));
    assert.ok(near(b.y0, -2, 1e-6) && near(b.y1, 8, 1e-6), JSON.stringify(b));
    p = lopsided([widthPoint(0, 1), widthPointFromSides(0.5, 1, 4), widthPoint(1, 1)]);
    b = bbox(strokeOutline(line(100), p, false));
    assert.ok(near(b.y0, -5, 1e-6) && near(b.y1, 20, 1e-6), JSON.stringify(b));
  });

  it("caps wrap the middle of a lopsided end", () => {
    let p = lopsided([widthPointFromSides(0, 0, 2), widthPointFromSides(1, 0, 2)], { capStart: "round", capEnd: "round" });
    let b = bbox(strokeOutline(line(100), p, false));
    assert.ok(near(b.x1, 105, 0.05) && near(b.x0, -5, 0.05), JSON.stringify(b));
    assert.ok(b.y0 > -0.05 && near(b.y1, 10, 0.05), JSON.stringify(b));
    p = { ...p, capEnd: "square" };
    b = bbox(strokeOutline(line(100), p, false));
    assert.ok(near(b.x1, 105, 1e-6) && b.y0 > -1e-6, JSON.stringify(b));
  });

  it("dashes and closed paths keep their sides", () => {
    const p = lopsided([widthPointFromSides(0, 0, 2), widthPointFromSides(1, 0, 2)], { dashes: [10, 10] });
    const s = strokeOutline(line(100), p, false);
    const b = bbox(s);
    assert.ok(Math.abs(b.y0) < 1e-6 && near(b.y1, 10, 1e-6), JSON.stringify(b));
    assert.ok(Math.abs(Math.abs(s.area()) - 500) < 5, `${s.area()}`);
    // a closed square drawn clockwise on screen: its right side is the inside
    const b2 = bbox(strokeOutline(sq(0, 0, 100), lopsided([widthPointFromSides(0, 0, 2), widthPointFromSides(1, 0, 2)]), true));
    assert.ok(b2.x0 > -1e-6 && b2.y0 > -1e-6 && b2.x1 < 100 + 1e-6 && b2.y1 < 100 + 1e-6, `all inside: ${JSON.stringify(b2)}`);
  });
});

describe("FigCraft pathops: per-side strokes on rounded rectangles", () => {
  const W = 120;
  const H = 60;
  const area = (p: BezPath) => Math.abs(p.area());
  const painted = (p: BezPath, x: number, y: number) => winding(p, pt(x, y)) % 2 !== 0;

  it("square corners paint what rect side strokes paints", () => {
    for (const align of ["inside", "center", "outside"] as const) {
      const sides = [1, 2, 3, 4];
      assert.ok(Math.abs(area(roundedSideStrokes(W, H, [0, 0, 0, 0], 0, sides, align)) - area(rectSideStrokes(W, H, sides, align))) < 1e-6, align);
    }
  });

  it("a left border on a right-rounded box is a straight bar", () => {
    const bar = roundedSideStrokes(W, H, [0, 8, 8, 0], 0, [0, 0, 0, 4], "inside");
    assert.ok(Math.abs(area(bar) - 4 * H) < 1e-6, `${area(bar)}`);
    assert.ok(painted(bar, 2, 30));
    for (const [x, y] of [[119.9, 30], [117, 1], [60, 0.1], [60, 59.9], [4.1, 30]]) assert.ok(!painted(bar, x, y), `(${x}, ${y})`);
  });

  it("one weight on every side is the uniform ring", () => {
    const ring = roundedSideStrokes(W, H, [8, 8, 8, 8], 0, [2, 2, 2, 2], "inside");
    const want = area(roundedRect(W, H, [8, 8, 8, 8], 0)) - area(roundedRect(W - 4, H - 4, [6, 6, 6, 6], 0));
    assert.ok(Math.abs(area(ring) - want) < 1e-6, `${area(ring)} vs ${want}`);
    assert.equal(winding(ring, pt(60, 30)), 0, "a hole under non-zero too");
  });

  it("centre and outside grow the box and its corners", () => {
    for (const [align, out, inset] of [["center", 1, 1], ["outside", 2, 0]] as const) {
      const a = area(roundedSideStrokes(W, H, [8, 8, 8, 8], 0, [2, 2, 2, 2], align));
      const outer = area(roundedRect(W + 2 * out, H + 2 * out, [8 + out, 8 + out, 8 + out, 8 + out], 0));
      const hole = area(roundedRect(W - 2 * inset, H - 2 * inset, [8 - inset, 8 - inset, 8 - inset, 8 - inset], 0));
      assert.ok(Math.abs(a - (outer - hole)) < 1e-6, `${align}: ${a} vs ${outer - hole}`);
    }
  });

  it("a bottom border tapers into the bottom corners", () => {
    const bottom = roundedSideStrokes(W, H, [8, 8, 8, 8], 0, [0, 0, 1, 0], "inside");
    assert.ok(painted(bottom, 60, 59.5) && painted(bottom, 8, 59.5) && painted(bottom, 112, 59.5));
    for (const [x, y] of [[60, 0.5], [0.5, 30], [0.5, 52], [119.5, 52], [4, 4]]) assert.ok(!painted(bottom, x, y), `(${x}, ${y})`);
  });

  it("a weight past the radius leaves square inner corners", () => {
    const top = roundedSideStrokes(W, H, [8, 8, 8, 8], 0, [10, 0, 0, 2], "inside");
    assert.ok(!painted(top, 2.2, 10.2) && !painted(top, 119.8, 10.2));
    assert.ok(painted(top, 60, 9.8) && painted(top, 1.8, 30));
  });

  it("inner corners shrink to fit a narrow inner box", () => {
    const wide = roundedSideStrokes(20, 20, [10, 10, 10, 10], 0, [0, 0, 0, 12], "inside");
    assert.ok(painted(wide, 6, 10) && !painted(wide, 16, 10));
    assert.ok(!painted(wide, 17.5, 3) && !painted(wide, 17.5, 17), "nothing past the outer edge");
    const tall = roundedSideStrokes(20, 20, [10, 10, 10, 10], 0, [12, 0, 0, 0], "inside");
    assert.ok(painted(tall, 10, 6) && !painted(tall, 10, 16));
    assert.ok(!painted(tall, 3, 17.5) && !painted(tall, 17, 17.5), "nothing past the outer edge");
    const pill = roundedSideStrokes(30, 20, [10, 10, 10, 10], 0, [0, 0, 0, 25], "inside");
    assert.ok(painted(pill, 12, 10) && !painted(pill, 27, 10));
    assert.ok(!painted(pill, 24, 0.5) && !painted(pill, 24, 19.5), "nothing past the outer edge");
  });

  it("smoothed corners keep the stroke inside the fill", () => {
    const smooth = roundedSideStrokes(W, H, [16, 16, 16, 16], 0.6, [0, 0, 2, 0], "inside");
    const fill = roundedRect(W, H, [16, 16, 16, 16], 0.6);
    let stray = 0;
    // FigCraft samples a 0.1 px grid; a 0.5 px grid finds the same strays (polygon edges sit within 0.05 px)
    for (let i = 0; i < 240; i++) {
      for (let j = 0; j < 120; j++) {
        const x = i * 0.5 + 0.25;
        const y = j * 0.5 + 0.25;
        if (painted(smooth, x, y) && (y < H / 2 || winding(fill, pt(x, y)) === 0)) stray++;
      }
    }
    assert.equal(stray, 0, "painted outside the fill or along the top");
    assert.ok(painted(smooth, 60, 59.5));
  });

  it("centre and outside strokes follow smoothed corners", () => {
    for (const [align, out, inset] of [["center", 1, 1], ["outside", 2, 0]] as const) {
      const a = area(roundedSideStrokes(W, H, [16, 16, 16, 16], 0.6, [2, 2, 2, 2], align));
      const r = (n: number) => [n, n, n, n] as const;
      const outer = area(roundedRect(W + 2 * out, H + 2 * out, r(16 + out), 0.6));
      const hole = area(roundedRect(W - 2 * inset, H - 2 * inset, r(16 - inset), 0.6));
      // the smoothed ring is cut by a polygon boolean here (FigCraft keeps curves): within 0.5 px² of 1,400
      assert.ok(Math.abs(a - (outer - hole)) < 0.5, `${align}: ${a} vs ${outer - hole}`);
    }
  });

  it("weights wider than the box leave the outer edge", () => {
    const full = roundedSideStrokes(20, 10, [4, 4, 4, 4], 0, [6, 6, 6, 6], "inside");
    assert.ok(Math.abs(area(full) - area(roundedRect(20, 10, [4, 4, 4, 4], 0))) < 1e-6);
  });

  it("no weight paints nothing", () => {
    assert.ok(roundedSideStrokes(W, H, [8, 8, 8, 8], 0, [0, 0, 0, 0], "inside").isEmpty());
    assert.ok(roundedSideStrokes(W, H, [8, 8, 8, 8], 0, [NaN, -4, Infinity, 0], "inside").isEmpty());
  });
});

describe("FigCraft pathops: booleans, faces, alignment, arrows, dashes", () => {
  it("union, intersect, subtract, exclude", () => {
    const a = sq(0, 0, 10);
    const b = sq(5, 5, 10);
    assert.ok(Math.abs(Math.abs(booleanPaths(a, b, "union").area()) - 175) < 0.5);
    assert.ok(Math.abs(Math.abs(booleanPaths(a, b, "intersect").area()) - 25) < 0.5);
    assert.ok(Math.abs(Math.abs(booleanPaths(a, b, "subtract").area()) - 75) < 0.5);
    const bb = bbox(booleanPaths(a, b, "exclude"));
    assert.deepEqual([bb.x0, bb.y0, bb.x1, bb.y1], [0, 0, 15, 15]);
  });

  it("arrangement faces", () => {
    const f = arrangementFaces([{ path: sq(0, 0, 10) }, { path: sq(5, 5, 10) }])!;
    const byKey = (a: (string | number)[], b: (string | number)[]) => (String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : Number(a[1]) - Number(b[1]));
    const got = f.map((x) => [x.cover.join(","), Math.round(Math.abs(x.path.area()))]).sort(byKey);
    assert.deepEqual(got, [["0", 75], ["0,1", 25], ["1", 75]]);
    // uniting faces dissolves their shared edges
    const u = unionFaces(f.map((x) => x.path));
    assert.ok(Math.abs(Math.abs(u.area()) - 175) < 1e-6);
    assert.equal(u.els.filter((e) => e.t === "M").length, 1);
    // a square inside a ring (even-odd): the ring, and the square under the ring's hole as a face of its own
    const ring = sq(0, 0, 30).extend(sq(10, 10, 10));
    const f2 = arrangementFaces([{ path: ring, evenOdd: true }, { path: sq(12, 12, 4) }])!;
    assert.deepEqual(f2.map((x) => [x.cover.join(","), Math.round(Math.abs(x.path.area()))]).sort(byKey), [["0", 800], ["1", 16]]);
    // two overlapping circles: three faces (polygons here; FigCraft's faces keep curves)
    assert.equal(arrangementFaces([{ path: circle(0, 0, 10) }, { path: circle(10, 0, 10) }])!.length, 3);
    // hostile and empty input
    assert.equal(arrangementFaces([{ path: new BezPath().moveTo(pt(NaN, 0)).lineTo(pt(1, 1)) }]), null);
    assert.deepEqual(arrangementFaces([]), []);
    assert.equal(arrangementFaces(Array.from({ length: MAX_ARRANGEMENT_INPUTS + 1 }, () => ({ path: sq(0, 0, 1) }))), null);
  });

  it("self-intersecting inputs make disjoint faces", () => {
    const star = new BezPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 100 : 40;
      const p = pt(150 + r * Math.cos(a), 150 + r * Math.sin(a));
      if (i === 0) star.moveTo(p);
      else star.lineTo(p);
    }
    star.closePath();
    const ring = strokeCenter(star, 8, defaultStroke());
    const f = arrangementFaces([{ path: star }, { path: ring }])!;
    assert.deepEqual(f.map((x) => x.cover.join(",")).filter((v, i, all) => all.indexOf(v) === i).sort(), ["0", "0,1", "1"], "the star's inside, its stroke's inner half, its outer half");
    const all = unionFaces(f.map((x) => x.path));
    const painted = booleanPaths(star, ring, "union");
    assert.ok(Math.abs(Math.abs(all.area()) - Math.abs(painted.area())) < 0.5);
  });

  it("stroke alignment bounds", () => {
    const r = sq(0, 0, 100);
    const p = { ...defaultStroke(), weight: 10, align: "inside" as const };
    let b = bbox(strokeOutline(r, p, true));
    assert.ok(b.x0 >= -0.01 && b.x1 <= 100.01, JSON.stringify(b));
    b = bbox(strokeOutline(r, { ...p, align: "outside" }, true));
    assert.ok(near(b.x0, -10, 0.01) && near(b.x1, 110, 0.01), JSON.stringify(b));
    b = bbox(strokeOutline(r, { ...p, align: "center" }, true));
    assert.ok(near(b.x0, -5, 0.01));
  });

  it("inside and outside strokes respect an even-odd hole", () => {
    const ring = sq(0, 0, 100).extend(sq(30, 30, 40));
    const material = pt(29, 50);
    const hole = pt(31, 50);
    const inside = { ...defaultStroke(), weight: 4, align: "inside" as const };
    let s = strokeOutline(ring, inside, true, true);
    assert.notEqual(winding(s, material), 0, "inside stroke misses the material");
    assert.equal(winding(s, hole), 0, "inside stroke leaks into the hole");
    s = strokeOutline(ring, { ...inside, align: "outside" }, true, true);
    assert.equal(winding(s, material), 0, "outside stroke covers the material");
    assert.notEqual(winding(s, hole), 0, "outside stroke misses the hole");
    // non-zero: the inner loop doesn't cut a hole, so its inside stroke covers both sides
    s = strokeOutline(ring, inside, true, false);
    assert.ok(winding(s, material) !== 0 && winding(s, hole) !== 0);
  });

  it("arrows on open paths", () => {
    const s = strokeOutline(line(100), { ...defaultStroke(), weight: 2, capEnd: "triangleArrow" }, false);
    assert.ok(bbox(s).y1 - bbox(s).y0 > 4);
    assert.equal(arrowhead(new BezPath(), "lineArrow", 1, true), null);
    for (const cap of ["lineArrow", "triangleArrow", "reversedTriangle", "circleFilled", "diamondFilled"] as const) assert.ok(arrowhead(line(50), cap, 2, true), cap);
  });

  it("an arrowhead skips zero-length end segments", () => {
    const p = line(100);
    assert.ok(arrowhead(p, "triangleArrow", 2, true));
    p.lineTo(pt(100, 0));
    const head = arrowhead(p, "diamondFilled", 2, true)!;
    const b = bbox(head);
    assert.ok(near((b.x0 + b.x1) / 2, 100, 1e-9) && near((b.y0 + b.y1) / 2, 0, 1e-9), "centred on the real end");
    const q = new BezPath().moveTo(pt(0, 0)).lineTo(pt(0, 0)).lineTo(pt(100, 0));
    assert.ok(arrowhead(q, "triangleArrow", 2, false));
  });

  it("dashes", () => {
    const s = strokeCenter(line(100), 2, { ...defaultStroke(), dashes: [10, 10] });
    assert.ok(Math.abs(Math.abs(s.area()) - 100) < 2, `${s.area()}`);
  });

  it("a dash pattern too fine for its path strokes solid", () => {
    const s = strokeCenter(line(10_000), 2, { ...defaultStroke(), dashes: [0.01, 0.01] });
    assert.ok(s.els.length < 1000, `${s.els.length} elements`);
    assert.ok(Math.abs(Math.abs(s.area()) - 20_000) < 10, `${s.area()}`);
  });

  it("hostile inputs", () => {
    assert.ok(booleanPaths(new BezPath().moveTo(pt(NaN, 0)).lineTo(pt(1, 1)), sq(0, 0, 1), "union"));
    strokeOutline(sq(0, 0, 10), { ...defaultStroke(), weight: Infinity }, true);
  });
});
