import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ellipseSubPath, parsePathData, parsePoints, rectSubPath } from "../pathData";
import { flatten, ringArea } from "../booleans";
import { nodesToPathData } from "../pathFit";

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not ${b}`);

describe("Phase 40: SVG path data", () => {
  it("reads lines, relative moves and Z", () => {
    const [s] = parsePathData("M10 10 L50 10 l0 40 H10 Z")!;
    assert.equal(s.nodes.length, 4);
    assert.equal(s.closed, true);
    assert.deepEqual(s.nodes.map((n) => [n.x, n.y]), [[10, 10], [50, 10], [50, 50], [10, 50]]);
  });

  it("a closing line back to the start doesn't make a duplicate node", () => {
    const [s] = parsePathData("M0 0 L10 0 L10 10 L0 0 Z")!;
    assert.equal(s.nodes.length, 3);
  });

  it("reads cubics, smooth cubics and quadratics as handles", () => {
    const [s] = parsePathData("M0 0 C10 0 20 10 30 10 S50 20 60 20 Q70 20 80 30")!;
    assert.equal(s.nodes.length, 4);
    assert.deepEqual(s.nodes[0].hout, { x: 10, y: 0 });
    assert.deepEqual(s.nodes[1].hin, { x: 20, y: 10 });
    // S reflects the previous second control point about the current point
    assert.deepEqual(s.nodes[1].hout, { x: 40, y: 10 });
    assert.ok(s.nodes[3].hin);
  });

  it("splits on every moveto and repeats implicit commands", () => {
    const subs = parsePathData("M0 0 10 0 10 10 M20 20 30 20")!;
    assert.equal(subs.length, 2);
    assert.equal(subs[0].nodes.length, 3);
    assert.equal(subs[1].nodes.length, 2);
  });

  it("reads numbers that run together: 1.5.5 and -1-2, and arc flags", () => {
    const t = parsePathData("M0 0l.5.5-1-2")!;
    assert.deepEqual(t[0].nodes.map((n) => [n.x, n.y]), [[0, 0], [0.5, 0.5], [-0.5, -1.5]]);
    assert.ok(parsePathData("M0 0a5 5 0 011 1")); // flags without a separator
  });

  it("refuses data that doesn't parse", () => {
    assert.equal(parsePathData("hello"), null);
    assert.equal(parsePathData("M 1"), null);
    assert.equal(parsePathData(""), null);
  });

  it("an arc becomes cubics that stay on the circle", () => {
    // half circle of radius 50 from (0,0) to (100,0)
    const [s] = parsePathData("M0 0 A50 50 0 0 1 100 0")!;
    const ring = flatten(s.nodes, false);
    for (const p of ring) close(Math.hypot(p.x - 50, p.y), 50, 0.05);
    close(ring[ring.length - 1].x, 100);
  });

  it("a full circle drawn with two arcs closes with the right area", () => {
    const [s] = parsePathData("M0 50 A50 50 0 1 1 100 50 A50 50 0 1 1 0 50 Z")!;
    close(ringArea(flatten(s.nodes, true)), Math.PI * 2500, 5);
  });

  it("writes back what it read", () => {
    const d = "M0 0C10 0 20 10 30 10L40 40L0 0Z";
    const [s] = parsePathData(d)!;
    assert.equal(nodesToPathData(s.nodes, s.closed), d);
  });
});

describe("Phase 40: basic shapes as nodes", () => {
  it("a rectangle is four corners; with a radius, eight nodes and the right area", () => {
    assert.equal(rectSubPath(0, 0, 100, 50).nodes.length, 4);
    const r = rectSubPath(0, 0, 100, 50, 10);
    assert.equal(r.nodes.length, 8);
    // a rounded corner takes (4 - pi) r^2 off the rectangle
    close(ringArea(flatten(r.nodes, true)), 5000 - (4 - Math.PI) * 100, 0.5);
  });

  it("an ellipse's area is pi a b within the flattening error", () => {
    close(ringArea(flatten(ellipseSubPath(0, 0, 40, 20).nodes, true)), Math.PI * 800, 1.5);
  });

  it("reads a points list", () => {
    assert.deepEqual(parsePoints("0,0 10,5 20 10"), [{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 10 }]);
  });
});
