import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deleteNodes, hitHandle, hitNode, hitSegment, insertNode, moveHandle, moveNodes, segmentCount, setClosed, toggleSmooth, type EditPath } from "../pathEdit";
import { maxDeviation, sampleNodes } from "../pathFit";

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not ${b}`);

const tri = (): EditPath => ({ nodes: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }], closed: true });
const smooth = (): EditPath => ({
  nodes: [
    { x: 0, y: 0, hout: { x: 20, y: 0 } },
    { x: 100, y: 50, hin: { x: 80, y: 50 }, hout: { x: 120, y: 50 } },
    { x: 200, y: 0, hin: { x: 180, y: 0 } },
  ],
  closed: false,
});

describe("Phase 40: editing nodes", () => {
  it("moving a node takes its handles with it and leaves the rest", () => {
    const p = moveNodes(smooth(), [1], 10, -5);
    assert.deepEqual(p.nodes[1], { x: 110, y: 45, hin: { x: 90, y: 45 }, hout: { x: 130, y: 45 } });
    assert.deepEqual(p.nodes[0], smooth().nodes[0]);
  });

  it("dragging a handle of a smooth node keeps the pair a straight line, with equal lengths when they were equal", () => {
    const p = moveHandle(smooth(), 1, "out", { x: 100, y: 90 });
    const n = p.nodes[1];
    assert.deepEqual(n.hout, { x: 100, y: 90 });
    close(n.hin!.x, 100);
    close(n.hin!.y, 10);
  });

  it("keeps the other handle's own length when the lengths differed", () => {
    const s = smooth();
    s.nodes[1].hin = { x: 70, y: 50 }; // 30 long, the out handle is 20
    const p = moveHandle(s, 1, "out", { x: 100 + 40, y: 50 });
    close(p.nodes[1].hin!.x, 70);
    close(p.nodes[1].hin!.y, 50);
  });

  it("Alt moves one handle only", () => {
    const p = moveHandle(smooth(), 1, "out", { x: 100, y: 90 }, true);
    assert.deepEqual(p.nodes[1].hin, { x: 80, y: 50 });
  });

  it("a handle of a corner node (not a straight pair) leaves the other alone", () => {
    const s = smooth();
    s.nodes[1].hin = { x: 100, y: 20 };
    const p = moveHandle(s, 1, "out", { x: 150, y: 60 });
    assert.deepEqual(p.nodes[1].hin, { x: 100, y: 20 });
  });

  it("inserting a node on a curve keeps the curve exactly", () => {
    const before = smooth();
    const { path, index } = insertNode(before, 0, 0.4);
    assert.equal(path.nodes.length, 4);
    assert.equal(index, 1);
    const a = sampleNodes(before.nodes, false, 64);
    assert.ok(maxDeviation(a, path.nodes, false) < 0.05);
  });

  it("inserting on a straight segment adds a corner at the point", () => {
    const { path, index } = insertNode(tri(), 0, 0.25);
    close(path.nodes[index].x, 25);
    close(path.nodes[index].y, 0);
    assert.equal(path.nodes[index].hin, undefined);
  });

  it("inserting on the closing segment puts the node last", () => {
    const { path, index } = insertNode(tri(), 2, 0.5);
    assert.equal(index, 3);
    assert.equal(path.nodes.length, 4);
    assert.equal(segmentCount(path), 4);
  });

  it("deleting nodes: a closed triangle opens when it has two left, and two nodes is a line", () => {
    const two = deleteNodes(tri(), [1]);
    assert.equal(two.nodes.length, 2);
    assert.equal(two.closed, false);
    assert.deepEqual(deleteNodes(two, [0]), { nodes: [], closed: false });
  });

  it("closing needs three nodes", () => {
    assert.equal(setClosed({ nodes: [{ x: 0, y: 0 }, { x: 1, y: 1 }], closed: false }, true).closed, false);
    assert.equal(setClosed({ ...tri(), closed: false }, true).closed, true);
  });

  it("a corner turns smooth and back", () => {
    const smoothed = toggleSmooth({ ...tri(), closed: false }, 1);
    assert.ok(smoothed.nodes[1].hin && smoothed.nodes[1].hout);
    // the handles lie along the line from the neighbour before to the one after
    const h = smoothed.nodes[1];
    close(h.hout!.y - h.hin!.y, ((80 - 0) / (50 - 0)) * (h.hout!.x - h.hin!.x), 1e-6);
    const sharp = toggleSmooth(smoothed, 1);
    assert.equal(sharp.nodes[1].hin, undefined);
    assert.equal(sharp.nodes[1].hout, undefined);
  });

  it("finds the node, the handle and the segment under a point", () => {
    const p = smooth();
    assert.equal(hitNode(p, { x: 101, y: 49 }, 4), 1);
    assert.equal(hitNode(p, { x: 150, y: 150 }, 4), null);
    assert.deepEqual(hitHandle(p, { x: 120, y: 51 }, 4, [1]), { index: 1, side: "out" });
    assert.equal(hitHandle(p, { x: 120, y: 51 }, 4, [0]), null); // only selected nodes show handles
    const seg = hitSegment(tri(), { x: 50, y: 1 }, 3)!;
    assert.equal(seg.seg, 0);
    close(seg.t, 0.5, 0.05);
  });
});
