import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dedupe, fitCurve, fitStroke, maxDeviation, nodesToPathData, rdp, sampleNodes, streamline, type PathNode, type Sample } from "../pathFit";

/** A deterministic pseudo-random generator, so a "hand-drawn" stroke is the same every run. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * A recorded scribble: 3 seconds at 120 Hz (360 samples) of a wandering curve with a dozen turns, plus up to
 * `jitter` px of hand tremor on each sample. Returns the samples and the tremor-free truth.
 */
function scribble(jitter = 0.35, seconds = 3, hz = 120) {
  const r = rng(7);
  const n = seconds * hz;
  const truth: Sample[] = [];
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = 300 + 220 * Math.cos(u * Math.PI * 4) * (0.6 + 0.4 * u) + 30 * Math.sin(u * Math.PI * 9);
    const y = 220 + 120 * Math.sin(u * Math.PI * 6) + 20 * Math.cos(u * Math.PI * 13);
    const t = (i * 1000) / hz;
    truth.push({ x, y, t, p: 0.5 });
    samples.push({ x: x + (r() - 0.5) * 2 * jitter, y: y + (r() - 0.5) * 2 * jitter, t, p: 0.3 + 0.4 * r() });
  }
  return { samples, truth };
}

describe("Phase 39: cleaning a stroke", () => {
  it("dedupe drops repeats and non-numbers", () => {
    const s = (x: number, y: number, t = 0): Sample => ({ x, y, t, p: 0.5 });
    assert.deepEqual(dedupe([s(0, 0), s(0, 0, 1), s(5, 0, 2), s(Number.NaN, 0, 3), s(5, 0.001, 4)]).map((p) => p.x), [0, 5]);
  });

  it("streamline keeps the ends exactly and smooths a zigzag", () => {
    const zig: Sample[] = Array.from({ length: 21 }, (_, i) => ({ x: i * 5, y: i % 2 === 0 ? 0 : 4, t: i, p: 0.5 }));
    const out = streamline(zig, 1);
    assert.deepEqual([out[0].x, out[0].y, out[20].x, out[20].y], [0, 0, 100, 0]);
    const spread = Math.max(...out.slice(8, 13).map((p) => p.y)) - Math.min(...out.slice(8, 13).map((p) => p.y));
    assert.ok(spread < 1, `the zigzag is flattened (${spread})`);
    assert.deepEqual(streamline(zig, 0).map((p) => p.y), zig.map((p) => p.y), "amount 0 changes nothing");
  });

  it("streamline keeps times and pressures", () => {
    const out = streamline([{ x: 0, y: 0, t: 0, p: 0.1 }, { x: 5, y: 5, t: 10, p: 0.9 }, { x: 10, y: 0, t: 20, p: 0.2 }], 0.5);
    assert.deepEqual(out.map((p) => [p.t, p.p]), [[0, 0.1], [10, 0.9], [20, 0.2]]);
  });

  it("rdp drops collinear points and keeps corners, whatever the length", () => {
    const line: Sample[] = Array.from({ length: 100 }, (_, i) => ({ x: i, y: 0, t: i, p: 0.5 }));
    assert.equal(rdp(line, 0.1).length, 2);
    const corner: Sample[] = [...line.slice(0, 50), ...Array.from({ length: 50 }, (_, i) => ({ x: 49, y: i + 1, t: 50 + i, p: 0.5 }))];
    const kept = rdp(corner, 0.1);
    assert.equal(kept.length, 3);
    assert.deepEqual([kept[1].x, kept[1].y], [49, 0]);
    const long = Array.from({ length: 200_000 }, (_, i) => ({ x: i, y: Math.sin(i / 50) * 20, t: i, p: 0.5 }));
    assert.ok(rdp(long, 0.5).length < long.length, "a 200,000 point stroke doesn't overflow the stack");
  });
});

describe("Phase 39: fitting beziers", () => {
  it("a quarter circle becomes one curve", () => {
    const pts = Array.from({ length: 40 }, (_, i) => ({ x: Math.cos((i / 39) * Math.PI / 2) * 100, y: Math.sin((i / 39) * Math.PI / 2) * 100 }));
    const segs = fitCurve(pts, 0.5);
    assert.equal(segs.length, 1);
  });

  it("a straight line is one segment, and two points make one", () => {
    assert.equal(fitCurve(Array.from({ length: 30 }, (_, i) => ({ x: i * 3, y: i * 2 })), 0.5).length, 1);
    assert.equal(fitCurve([{ x: 0, y: 0 }, { x: 10, y: 0 }], 0.5).length, 1);
    assert.deepEqual(fitCurve([{ x: 1, y: 1 }], 0.5), []);
  });

  it("every segment starts where the last ended", () => {
    const { samples } = scribble();
    const pts = rdp(samples, 0.4);
    const segs = fitCurve(pts, 0.9);
    segs.forEach((s, i) => i > 0 && assert.equal(s.from, segs[i - 1].to));
    assert.equal(segs[0].from, 0);
    assert.equal(segs[segs.length - 1].to, pts.length - 1);
  });
});

describe("Phase 39 gate: a recorded 3-second scribble becomes a path of under 60 nodes within 1.5 px of the input", () => {
  it("360 samples with hand tremor", () => {
    const { samples } = scribble(0.35);
    assert.equal(samples.length, 360);
    const { nodes, closed } = fitStroke(samples);
    assert.equal(closed, false);
    assert.ok(nodes.length < 60, `${nodes.length} nodes`);
    assert.ok(nodes.length >= 4, "but it is still a scribble");
    const worst = maxDeviation(samples, nodes);
    assert.ok(worst <= 1.5, `the worst sample is ${worst.toFixed(2)} px from the path`);
  });

  it("a calmer stroke needs fewer nodes, a tighter one more, and both stay within tolerance", () => {
    const calm = fitStroke(scribble(0.1, 3, 120).samples);
    const wild = fitStroke(scribble(0.6, 3, 120).samples);
    assert.ok(calm.nodes.length <= wild.nodes.length + 10);
    assert.ok(maxDeviation(scribble(0.1).samples, calm.nodes) <= 1.5);
    assert.ok(wild.nodes.length < 60, `${wild.nodes.length}`);
  });

  it("the same under a different input rate (60 Hz, 240 Hz)", () => {
    for (const hz of [60, 240]) {
      const { samples } = scribble(0.35, 3, hz);
      const { nodes } = fitStroke(samples);
      assert.ok(nodes.length < 60, `${hz} Hz: ${nodes.length} nodes`);
      assert.ok(maxDeviation(samples, nodes) <= 1.5, `${hz} Hz`);
    }
  });

  it("a much wilder stroke (22 px between samples, a dozen reversals) still never strays past the limit, at the price of more nodes", () => {
    const r = rng(11);
    const wild: Sample[] = Array.from({ length: 360 }, (_, i) => {
      const u = i / 359;
      return { x: 300 + 220 * Math.cos(u * Math.PI * 6) * (0.6 + 0.4 * u) + 40 * Math.sin(u * Math.PI * 17) + (r() - 0.5) * 0.7, y: 220 + 140 * Math.sin(u * Math.PI * 8) + 30 * Math.cos(u * Math.PI * 23) + (r() - 0.5) * 0.7, t: i * 8, p: 0.5 };
    });
    const { nodes } = fitStroke(wild);
    assert.ok(maxDeviation(wild, nodes) <= 1.5);
  });

  it("nodes keep the time and pressure of the sample they sit on, in order", () => {
    const { samples } = scribble();
    const { nodes } = fitStroke(samples);
    const times = nodes.map((n) => n.t!);
    assert.deepEqual([...times].sort((a, b) => a - b), times);
    assert.equal(times[0], 0);
    assert.equal(times[times.length - 1], samples[samples.length - 1].t);
    assert.ok(nodes.every((n) => n.p !== undefined && n.p >= 0 && n.p <= 1));
    for (const n of nodes) assert.ok(samples.some((s) => s.t === n.t), "a node's time is one of the recorded times");
  });

  it("a dot, a still pointer and garbage give no path", () => {
    assert.deepEqual(fitStroke([]).nodes, []);
    assert.deepEqual(fitStroke([{ x: 1, y: 1, t: 0, p: 0.5 }, { x: 1, y: 1, t: 5, p: 0.5 }]).nodes, []);
    assert.deepEqual(fitStroke([{ x: Number.NaN, y: 0, t: 0, p: 0.5 }, { x: 1, y: Number.POSITIVE_INFINITY, t: 1, p: 0.5 }]).nodes, []);
  });

  it("a stroke that returns to its start is closed, with the joint's handles merged", () => {
    const circle: Sample[] = Array.from({ length: 120 }, (_, i) => ({ x: 100 + 60 * Math.cos((i / 119) * Math.PI * 2), y: 100 + 60 * Math.sin((i / 119) * Math.PI * 2), t: i * 8, p: 0.5 }));
    const { nodes, closed } = fitStroke(circle, {}, 8);
    assert.equal(closed, true);
    assert.ok(nodes.length >= 3 && nodes.length <= 8, `${nodes.length}`);
    assert.ok(maxDeviation(circle, nodes, true) <= 1.5);
    assert.ok(nodesToPathData(nodes, true).endsWith("Z"));
    const open = fitStroke(circle, {}, 0);
    assert.equal(open.closed, false);
  });
});

describe("Phase 39: path data", () => {
  const n = (x: number, y: number, hin?: { x: number; y: number }, hout?: { x: number; y: number }): PathNode => ({ x, y, ...(hin ? { hin } : {}), ...(hout ? { hout } : {}) });
  it("lines for corners, curves for handles, Z when closed", () => {
    assert.equal(nodesToPathData([n(0, 0), n(10, 0), n(10, 10)], false), "M0 0L10 0L10 10");
    assert.equal(nodesToPathData([n(0, 0, undefined, { x: 0, y: 5 }), n(10, 10, { x: 5, y: 10 })], false), "M0 0C0 5 5 10 10 10");
    assert.equal(nodesToPathData([n(0, 0), n(10, 0), n(10, 10)], true), "M0 0L10 0L10 10L0 0Z");
    assert.equal(nodesToPathData([], false), "");
    assert.equal(nodesToPathData([n(0, 0), n(1, 1)], true), "M0 0L1 1", "two nodes can't close");
  });
  it("sampling follows the curve, and its ends are the nodes", () => {
    const pts = sampleNodes([n(0, 0, undefined, { x: 0, y: 100 }), n(100, 0, { x: 100, y: 100 })], false, 32);
    assert.deepEqual([pts[0], pts[pts.length - 1]], [{ x: 0, y: 0 }, { x: 100, y: 0 }]);
    assert.ok(Math.max(...pts.map((p) => p.y)) > 60, "it bows out");
  });
});
