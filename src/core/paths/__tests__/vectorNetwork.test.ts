/**
 * FigCraft port F4: vector networks. The cases of FigCraft's `crates/doc/src/vector_regions_tests.rs`, the tests in
 * `vector_faces.rs`, and the network cases of `crates/doc/src/tests.rs` (commit 6ea44e9), translated one to one.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BezPath, ellipsePath, pt } from "../../geometry/bezpath";
import { roundedRect } from "../../geometry/shapes";
import {
  emptyNetwork, faceAt, faces, fillContains, fillPath, fromPath, fromPoints, interiorPointOf, lineSeg, loopWalk, mirroring, paint, parseNetwork, regionAt,
  regionContains, regionPath, regionPoints, regionWinding, rounded, sanitizeNetwork, serializeNetwork, strokePath, strokeRuns, topologyKey, translateNetwork, vertex,
  type Region, type VectorNetwork, type WindingRule,
} from "../vectorNetwork";

const p = (x: number, y: number) => pt(x, y);
const region = (loops: number[][], winding: WindingRule): Region => ({ loops, winding });

/** Four vertices and four straight segments of a square, clockwise on screen, appended to `n`; returns the segment indexes. */
function square(n: VectorNetwork, x0: number, y0: number, size: number): number[] {
  const v0 = n.vertices.length;
  for (const [x, y] of [[x0, y0], [x0 + size, y0], [x0 + size, y0 + size], [x0, y0 + size]]) n.vertices.push(vertex(x, y));
  const s0 = n.segments.length;
  for (let k = 0; k < 4; k++) n.segments.push(lineSeg(v0 + k, v0 + ((k + 1) % 4)));
  return [s0, s0 + 1, s0 + 2, s0 + 3];
}

/** A 200 square with an 80 square inside it, both wound the same way, no regions. */
function nested(): VectorNetwork {
  const n = emptyNetwork();
  square(n, 0, 0, 200);
  square(n, 60, 60, 80);
  return n;
}

describe("FigCraft vector regions", () => {
  it("the inside test follows each region's own fill rule", () => {
    const n = nested();
    n.regions = [region([[0, 1, 2, 3], [4, 5, 6, 7]], "nonzero")];
    assert.equal(regionAt(n, p(100, 100)), 0);
    assert.equal(regionAt(n, p(300, 100)), null);
    n.regions[0].winding = "evenodd";
    assert.equal(regionAt(n, p(100, 100)), null);
    assert.equal(regionAt(n, p(20, 100)), 0);
    assert.equal(regionAt(n, p(300, 100)), null);
    // the inner ring wound the other way, non-zero: a hole
    const r = nested();
    for (const s of r.segments.slice(4, 8)) [s.a, s.b] = [s.b, s.a];
    r.regions = [region([[0, 1, 2, 3], [7, 6, 5, 4]], "nonzero")];
    assert.equal(regionAt(r, p(100, 100)), null);
    assert.equal(regionAt(r, p(20, 100)), 0);
    // regions of one path may use different rules
    const m = nested();
    m.regions = [region([[0, 1, 2, 3], [4, 5, 6, 7]], "nonzero"), region([[0, 1, 2, 3], [4, 5, 6, 7]], "evenodd")];
    assert.equal(regionAt(m, p(100, 100)), 0, "the even-odd region has a hole there, the non-zero one doesn't");
    assert.equal(regionAt(m, p(20, 100)), 1);
  });

  it("the last overlapping region wins", () => {
    const n = nested();
    n.regions = [region([[0, 1, 2, 3]], "nonzero"), region([[4, 5, 6, 7]], "nonzero")];
    assert.equal(regionAt(n, p(100, 100)), 1);
    assert.equal(regionAt(n, p(20, 100)), 0);
    n.regions.reverse();
    assert.equal(regionAt(n, p(100, 100)), 1);
    assert.deepEqual(regionPoints(n, 1), [0, 1, 2, 3], "index 1 is the outer square now");
    assert.equal(regionAt(n, p(20, 100)), 1);
  });

  it("curved edges count where the curve runs", () => {
    const n: VectorNetwork = {
      vertices: [vertex(0, 0), vertex(120, 0)],
      segments: [{ a: 0, b: 1, ta: [0, -80], tb: [0, -80] }, lineSeg(1, 0)],
      regions: [region([[0, 1]], "nonzero")],
    };
    assert.equal(regionAt(n, p(60, -40)), 0);
    assert.equal(regionAt(n, p(60, 20)), null);
    assert.equal(regionAt(n, p(60, -70)), null);
    assert.equal(regionAt(n, p(60, -58)), 0, "just under the top of the curve");
    n.segments.reverse();
    n.regions = [region([[0, 1]], "nonzero")];
    assert.equal(regionAt(n, p(60, -40)), 0);
    assert.equal(regionAt(n, p(60, -70)), null);
  });

  it("a single curved segment loop encloses its area", () => {
    const n: VectorNetwork = { vertices: [vertex(0, 0)], segments: [{ a: 0, b: 0, ta: [100, -100], tb: [-100, -100] }], regions: [region([[0]], "nonzero")] };
    assert.equal(regionAt(n, p(0, -40)), 0);
    assert.equal(regionAt(n, p(0, 40)), null);
  });

  it("segments stored backwards are walked the right way", () => {
    const n = emptyNetwork();
    square(n, 0, 0, 200);
    n.segments[1] = lineSeg(2, 1);
    n.segments[3] = lineSeg(0, 3);
    n.regions = [region([[0, 1, 2, 3]], "nonzero")];
    assert.equal(regionAt(n, p(100, 100)), 0);
    assert.equal(regionAt(n, p(300, 100)), null);
    assert.deepEqual(loopWalk(n, [0, 1, 2, 3]), [[0, false], [1, true], [2, false], [3, true]]);
    n.segments[0] = lineSeg(1, 0);
    assert.equal(regionAt(n, p(100, 100)), 0);
    assert.equal(regionAt(n, p(300, 100)), null);
    const consistent = emptyNetwork();
    square(consistent, 0, 0, 200);
    consistent.regions = n.regions;
    assert.ok(Math.abs(Math.abs(regionPath(n, 0)!.area()) - 40_000) < 1e-6 && Math.abs(Math.abs(regionPath(consistent, 0)!.area()) - 40_000) < 1e-6);
  });

  it("a loop that does not close is closed implicitly", () => {
    const n = emptyNetwork();
    square(n, 0, 0, 200);
    n.regions = [region([[0, 1, 2]], "nonzero")];
    assert.equal(regionAt(n, p(100, 100)), 0);
    assert.equal(regionAt(n, p(300, 100)), null);
  });

  it("missing segments are skipped wherever they sit in a loop", () => {
    const n = emptyNetwork();
    square(n, 0, 0, 200);
    n.regions = [region([[0, 1, 2]], "nonzero")];
    const control = regionPath(n, 0)!;
    const controlWalk = loopWalk(n, [0, 1, 2]);
    for (const lp of [[99, 0, 1, 2], [0, 99, 1, 2], [99, 98, 0, 1, 2]]) {
      n.regions = [region([lp], "nonzero")];
      assert.deepEqual(loopWalk(n, lp), controlWalk, JSON.stringify(lp));
      assert.equal(regionAt(n, p(100, 100)), 0);
      assert.ok(regionContains(n, 0, p(100, 100)));
      const path = regionPath(n, 0)!;
      assert.equal(path.els.length, control.els.length);
      assert.ok(Math.abs(Math.abs(path.area()) - Math.abs(control.area())) < 1e-6);
    }
    n.regions = [region([[99]], "nonzero")];
    assert.equal(regionPath(n, 0), null);
    assert.ok(!regionContains(n, 0, p(100, 100)));
  });

  it("a region's points are listed once", () => {
    const n = nested();
    n.regions = [region([[0, 1, 2, 3], [4, 5, 6, 7]], "nonzero")];
    assert.deepEqual(regionPoints(n, 0), [0, 1, 2, 3, 4, 5, 6, 7]);
    n.regions = [region([[0, 1, 2, 3]], "nonzero"), region([[4, 5, 6, 7]], "nonzero")];
    assert.deepEqual(regionPoints(n, 1), [4, 5, 6, 7]);
    assert.deepEqual(regionPoints(n, 9), []);
    n.regions = [region([[0, 1, 99, 2, 3]], "nonzero")];
    assert.deepEqual(regionPoints(n, 0), [0, 1, 2, 3]);
    assert.equal(regionAt(n, p(100, 100)), 0);
  });

  it("empty and damaged networks have no regions and never throw", () => {
    const n = nested();
    assert.equal(regionAt(n, p(100, 100)), null);
    const empty = emptyNetwork();
    assert.equal(regionAt(empty, p(0, 0)), null);
    assert.equal(regionPath(empty, 0), null);
    assert.deepEqual(regionPoints(empty, 0), []);
    assert.equal(regionWinding(empty, 0, p(0, 0)), null);
    n.regions = [region([[], [42, 43]], "evenodd"), region([[0, 1, 2, 3]], "nonzero")];
    n.segments.push(lineSeg(1, 500));
    n.regions.push(region([[8, 8, 8]], "nonzero"));
    assert.equal(regionAt(n, p(100, 100)), 1);
    assert.equal(regionPath(n, 0), null);
    assert.equal(regionPath(n, 2), null);
    for (const q of [p(NaN, 0), p(Infinity, 1), p(1e300, -1e300)]) regionAt(n, q);
  });

  it("region points leave out segment ends that do not exist", () => {
    const n = emptyNetwork();
    const ring = square(n, 0, 0, 100);
    n.regions = [region([ring], "nonzero")];
    assert.deepEqual(regionPoints(n, 0), [0, 1, 2, 3]);
    n.segments[3] = lineSeg(3, 9);
    assert.deepEqual(regionPoints(n, 0), [0, 1, 2, 3]);
    assert.ok(regionPath(n, 0));
    n.regions = [region([[99]], "nonzero")];
    assert.deepEqual(regionPoints(n, 0), []);
  });

  it("the topology key ignores moved points but not new segments", () => {
    let n = nested();
    n.regions = [region([[0, 1, 2, 3]], "nonzero")];
    const k = topologyKey(n);
    n = translateNetwork(n, 15, 25);
    n.segments[0].ta = [5, 5];
    assert.equal(topologyKey(n), k, "moving points and handles keeps it");
    n.regions.push(region([[4, 5, 6, 7]], "nonzero"));
    assert.notEqual(topologyKey(n), k);
    const k2 = topologyKey(n);
    n.regions.reverse();
    assert.notEqual(topologyKey(n), k2, "reordered regions");
    const k3 = topologyKey(n);
    n.segments.push(lineSeg(0, 2));
    assert.notEqual(topologyKey(n), k3);
  });
});

describe("FigCraft vector faces and the paint bucket", () => {
  const sq = (x: number, y: number, s: number) => fromPoints([p(x, y), p(x + s, y), p(x + s, y + s), p(x, y + s)], true);
  const merge = (a: VectorNetwork, b: VectorNetwork): VectorNetwork => {
    const nv = a.vertices.length;
    const ns = a.segments.length;
    return {
      vertices: [...a.vertices, ...b.vertices],
      segments: [...a.segments, ...b.segments.map((s) => ({ ...s, a: s.a + nv, b: s.b + nv }))],
      regions: [...a.regions, ...b.regions.map((r) => ({ ...r, loops: r.loops.map((l) => l.map((i) => i + ns)) }))],
    };
  };

  it("a square has one face and the bucket toggles it", () => {
    let n = sq(0, 0, 100);
    n.regions = [];
    const f = faces(n);
    assert.equal(f.length, 1);
    assert.ok(Math.abs(f[0].area - 10000) < 1e-6);
    let r = paint(n, p(50, 50))!;
    assert.equal(r.filled, true);
    n = r.network;
    assert.ok(fillContains(n, p(50, 50)));
    r = paint(n, p(50, 50))!;
    assert.equal(r.filled, false);
    assert.equal(r.network.regions.length, 0);
    assert.equal(paint(n, p(150, 50)), null, "outside every face");
  });

  it("a diagonal splits the square into two faces", () => {
    const n = sq(0, 0, 100);
    n.regions = [];
    n.segments.push(lineSeg(0, 2));
    const f = faces(n);
    assert.equal(f.length, 2);
    assert.ok(f.every((x) => Math.abs(x.area - 5000) < 1e-6));
    const r = paint(n, p(75, 25))!;
    assert.equal(r.filled, true);
    assert.ok(fillContains(r.network, p(75, 25)));
    assert.ok(!fillContains(r.network, p(25, 75)));
  });

  it("unfilling part of a converted shape keeps the rest", () => {
    const n = sq(0, 0, 100);
    n.segments.push(lineSeg(0, 2));
    assert.ok(fillContains(n, p(75, 25)));
    const r = paint(n, p(75, 25))!;
    assert.equal(r.filled, false);
    assert.ok(!fillContains(r.network, p(75, 25)));
    assert.ok(fillContains(r.network, p(25, 75)));
  });

  it("nested pieces become holes", () => {
    const outer = sq(0, 0, 100);
    outer.regions = [];
    const inner = sq(25, 25, 50);
    inner.regions = [];
    let n = merge(outer, inner);
    const areas = faces(n).map((f) => f.area).sort((a, b) => a - b);
    assert.equal(areas.length, 2);
    assert.ok(Math.abs(areas[0] - 2500) < 1e-6 && Math.abs(areas[1] - 7500) < 1e-6, JSON.stringify(areas));
    let r = paint(n, p(10, 10))!;
    assert.equal(r.filled, true);
    n = r.network;
    assert.ok(fillContains(n, p(10, 10)));
    assert.ok(!fillContains(n, p(50, 50)), "the ring has a hole");
    r = paint(n, p(50, 50))!;
    assert.equal(r.filled, true);
    n = r.network;
    assert.ok(fillContains(n, p(50, 50)));
    const core = sq(45, 45, 10);
    core.regions = [];
    const n3 = merge(n, core);
    const ring = faceAt(n3, p(10, 10))!;
    assert.equal(ring.loops.length, 2);
    assert.ok(Math.abs(ring.area - 7500) < 1e-6);
    assert.ok(Math.abs(faceAt(n3, p(30, 30))!.area - 2400) < 1e-6);
  });

  it("dangling paths and bridges don't break faces", () => {
    const n = sq(0, 0, 100);
    n.regions = [];
    n.vertices.push(vertex(50, 50));
    n.segments.push(lineSeg(0, 4));
    const m = merge(n, sq(60, 60, 20));
    m.regions = [];
    m.segments.push(lineSeg(4, 5));
    const f = faceAt(m, p(10, 90))!;
    assert.ok(Math.abs(f.area - (10000 - 400)) < 1e-6, `${f.area}`);
    assert.equal(f.loops.length, 2);
    const r = paint(m, p(10, 90))!;
    assert.equal(r.filled, true);
    assert.ok(fillContains(r.network, p(10, 90)));
    assert.ok(!fillContains(r.network, p(70, 70)));
  });

  it("curves and junk networks", () => {
    const circle = ellipsePath(p(50, 50), p(50, 50));
    const n = fromPath(circle);
    const close = n.vertices.some((a, i) => n.vertices.slice(i + 1).some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-3));
    assert.ok(!close, "the closing point merges into the first");
    n.regions = [];
    const f = faces(n);
    assert.equal(f.length, 1);
    assert.ok(Math.abs(f[0].area - Math.PI * 2500) < 5, `${f[0].area}`);
    // without the ClosePath it's still one closed, filled loop
    const open = BezPath.from(circle.els.filter((e) => e.t !== "Z"));
    const o = fromPath(open);
    assert.equal(o.vertices.length, n.vertices.length);
    assert.equal(o.regions.length, 1);
    assert.ok(fillContains(o, p(50, 50)));
    assert.equal(paint(n, p(50, 50))!.filled, true);
    // junk: NaN coordinates, dangling indices, self-loops, coincident points
    const j = sq(0, 0, 10);
    j.vertices.push(vertex(NaN, 1));
    j.segments.push(lineSeg(0, 4), lineSeg(2, 99), lineSeg(1, 1), { a: 3, b: 3, ta: [5, 5], tb: [-5, 5] });
    j.vertices.push(vertex(0, 0));
    j.segments.push(lineSeg(0, 5));
    faces(j);
    paint(j, p(5, 5));
    paint(j, p(NaN, 5));
    assert.equal(interiorPointOf(new BezPath()), null);
  });

  it("the bucket unfills a face with duplicate regions in one click", () => {
    const c = p(50, 50);
    const n = sq(0, 0, 100);
    n.regions.push({ ...n.regions[0], loops: n.regions[0].loops.map((l) => [...l]) });
    let r = paint(n, c)!;
    assert.equal(r.filled, false);
    assert.ok(!fillContains(r.network, c));
    assert.equal(regionAt(r.network, c), null);
    r = paint(r.network, c)!;
    assert.equal(r.filled, true);
    assert.ok(fillContains(r.network, c));
    const e = sq(0, 0, 100);
    e.regions.push({ ...e.regions[0] });
    r = paint(e, c, false)!;
    assert.equal(r.filled, false);
    assert.ok(!fillContains(r.network, c));
  });
});

describe("FigCraft vector networks: paths, rounding, runs, storage", () => {
  it("vector network paths", () => {
    const net = fromPoints([p(0, 0), p(10, 0), p(10, 10)], true);
    assert.ok(Math.abs(Math.abs(fillPath(net).area()) - 50) < 1e-9);
    const open = fromPoints([p(0, 0), p(10, 0), p(10, 10)], false);
    assert.ok(fillPath(open).isEmpty());
    assert.equal(strokePath(open).segments().length, 2);
    // round-trip a bezier path
    const rr = roundedRect(40, 20, [5, 5, 5, 5], 0);
    assert.ok(Math.abs(fillPath(fromPath(rr)).area() - rr.area()) < 1e-6);
    const bad: VectorNetwork = { vertices: [vertex(0, 0)], segments: [lineSeg(0, 5)], regions: [{ loops: [[0, 9]], winding: "evenodd" }] };
    const fixed = sanitizeNetwork(bad);
    assert.equal(fixed.segments.length, 0);
    fillPath(fixed);
  });

  it("big networks: many loops, long chains, a big rounded polygon", () => {
    const path = new BezPath();
    for (let i = 0; i < 3000; i++) {
      const x = i * 10;
      path.moveTo(p(x, 0)).lineTo(p(x + 5, 5)).lineTo(p(x, 0)).closePath();
    }
    // three vertices per triangle-ish loop in FigCraft's case; our version of the test keeps the counts it implies
    const tri = new BezPath();
    for (let i = 0; i < 3000; i++) {
      const x = i * 10;
      tri.moveTo(p(x, 0)).lineTo(p(x + 5, 0)).lineTo(p(x + 5, 5)).lineTo(p(x, 0)).closePath();
    }
    const net = fromPath(tri);
    assert.equal(net.vertices.length, 3 * 3000);
    assert.equal(net.regions[0].loops.length, 3000);
    assert.ok(net.segments.every((s) => s.a < net.vertices.length && s.b < net.vertices.length));
    assert.equal(strokeRuns(net).length, 3000);
    const chain = fromPoints(Array.from({ length: 20_000 }, (_, i) => p(i, i % 7)), false);
    const runs = strokeRuns(chain);
    assert.equal(runs.length, 1);
    assert.ok(!runs[0].closed);
    const ring = Array.from({ length: 4000 }, (_, i) => {
      const t = (i / 4000) * Math.PI * 2;
      return p(1000 * Math.cos(t), 1000 * Math.sin(t) * (i % 2 === 0 ? 1 : 0.9));
    });
    const poly = fromPoints(ring, true);
    for (const v of poly.vertices) v.radius = 0.5;
    const r = rounded(poly)!;
    assert.ok(r.regions[0].loops[0].length > poly.segments.length, "arcs are walked between the sides");
    assert.equal(r.regions[0].loops[0].length, r.segments.length);
  });

  it("a two-segment closed loop gets both rounded corners", () => {
    const net: VectorNetwork = {
      vertices: [{ x: 0, y: 0, radius: 2 }, { x: 10, y: 0, radius: 2 }],
      segments: [lineSeg(0, 1), { a: 1, b: 0, ta: [0, 5], tb: [0, -5] }],
      regions: [{ loops: [[0, 1]], winding: "nonzero" }],
    };
    assert.equal(rounded(net)!.regions[0].loops[0].length, 4, "both arcs are in the loop");
    assert.ok(!fillPath(net).isEmpty());
  });

  it("handle mirroring is inferred from the handles", () => {
    const smooth: VectorNetwork = { vertices: [vertex(0, 0), vertex(10, 0), vertex(20, 0)], segments: [{ a: 0, b: 1, ta: [0, 0], tb: [-3, 0] }, { a: 1, b: 2, ta: [3, 0], tb: [0, 0] }], regions: [] };
    assert.equal(mirroring(smooth, 1), "angleAndLength");
    smooth.segments[1].ta = [6, 0];
    assert.equal(mirroring(smooth, 1), "angle");
    smooth.segments[1].ta = [0, 6];
    assert.equal(mirroring(smooth, 1), "none");
  });

  it("networks store as JSON and repair what's damaged", () => {
    const net = fromPoints([p(0, 0), p(10, 0), p(10, 10)], true);
    net.vertices[1].radius = 2;
    net.vertices[2].cap = "triangleArrow";
    const back = parseNetwork(serializeNetwork(net))!;
    assert.deepEqual(back, net);
    assert.equal(parseNetwork("nope"), null);
    assert.equal(parseNetwork(JSON.stringify({ vertices: "x" })), null);
    const repaired = parseNetwork(JSON.stringify({ vertices: [{ x: 0, y: 0 }, { x: "a" }], segments: [{ a: 0, b: 7 }, { a: 0, b: 1 }], regions: [{ loops: [[0, 1]] }] }))!;
    assert.equal(repaired.segments.length, 1);
    assert.deepEqual(repaired.vertices[1], { x: 0, y: 0 });
  });
});
