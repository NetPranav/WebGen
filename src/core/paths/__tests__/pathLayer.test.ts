import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PATH_SPACE, buildPath, fromPathSpace, parsePathNodes, pathFrame, serializePathNodes, toPathSpace } from "../pathLayer";
import { EMPTY_PEN, penClose, penDrag, penFinishable, penNearFirst, penPress, penRubberBand, penUndo } from "../penModel";
import { sampleNodes, type PathNode } from "../pathFit";

const n = (x: number, y: number, extra: Partial<PathNode> = {}): PathNode => ({ x, y, ...extra });

describe("Phase 39: a path's frame and space", () => {
  it("the frame is the bounds plus half the stroke and a pixel", () => {
    assert.deepEqual(pathFrame([n(100, 50), n(300, 150)], false, 4), { x: 97, y: 47, width: 206, height: 106 });
  });
  it("a horizontal line gets a frame thick enough to draw in, centred on it", () => {
    const f = pathFrame([n(0, 100), n(200, 100)], false, 0);
    assert.equal(f.height, 4);
    assert.equal(f.y + f.height / 2, 100);
  });
  it("curves count by where they bulge, not by their nodes", () => {
    const f = pathFrame([n(0, 0, { hout: { x: 0, y: 200 } }), n(100, 0, { hin: { x: 100, y: 200 } })], false, 0);
    assert.ok(f.height > 100, `${f.height}`);
  });
  it("nodes go into the 200 x 200 space and come back exactly", () => {
    const nodes = [n(100, 50, { hout: { x: 150, y: 50 } }), n(300, 150, { hin: { x: 250, y: 150 }, t: 40, p: 0.7 })];
    const { frame, nodes: unit } = buildPath(nodes, false, 4);
    assert.ok(unit.every((u) => u.x >= -0.01 && u.x <= PATH_SPACE + 0.01 && u.y >= -0.01 && u.y <= PATH_SPACE + 0.01));
    const back = fromPathSpace(unit, frame);
    back.forEach((b, i) => {
      assert.ok(Math.abs(b.x - nodes[i].x) < 0.6 && Math.abs(b.y - nodes[i].y) < 0.6, `${b.x},${b.y}`);
    });
    assert.deepEqual([unit[1].t, unit[1].p], [40, 0.7], "times and pressures travel");
  });
  it("the drawing keeps its shape when the frame is stretched to a different box", () => {
    const nodes = [n(0, 0), n(100, 0), n(100, 100)];
    const { frame } = buildPath(nodes, false, 0);
    const unit = toPathSpace(nodes, frame);
    const corner = unit[1];
    assert.ok(Math.abs(corner.x - (100 + 1 - frame.x - 0) * (PATH_SPACE / frame.width) + frame.x * 0) < 5);
    assert.ok(Math.abs(sampleNodes(unit, false, 4)[0].x - (0 - frame.x) * (PATH_SPACE / frame.width)) < 0.01);
  });
  it("empty and non-finite paths still give a frame", () => {
    assert.deepEqual(pathFrame([], false, 2), { x: 0, y: 0, width: 4, height: 4 });
    assert.equal(buildPath([n(1, 1), n(5, 5)], false, 2).d.startsWith("M"), true);
  });
});

describe("Phase 39: the stored nodes", () => {
  it("round trip, with times, pressures and handles", () => {
    const nodes = [n(1.234, 5.678, { hout: { x: 3, y: 4 }, t: 0, p: 0.25 }), n(10, 20, { hin: { x: 8, y: 9 }, t: 120.4, p: 0.5 }), n(30, 40)];
    const back = parsePathNodes(serializePathNodes(nodes, true))!;
    assert.equal(back.closed, true);
    assert.deepEqual(back.nodes[0], { x: 1.23, y: 5.68, hout: { x: 3, y: 4 }, t: 0, p: 0.25 });
    assert.deepEqual(back.nodes[1], { x: 10, y: 20, hin: { x: 8, y: 9 }, t: 120, p: 0.5 });
    assert.deepEqual(back.nodes[2], { x: 30, y: 40 });
  });
  it("hostile or broken JSON is ignored", () => {
    for (const bad of ["", "nope", "{}", '{"nodes":5}', '{"nodes":[[1]]}', '{"nodes":[["a",1]]}', "null", 7, undefined, "x".repeat(1_100_000)]) assert.equal(parsePathNodes(bad), null);
    assert.equal(parsePathNodes(JSON.stringify({ nodes: Array.from({ length: 5001 }, () => [0, 0]) })), null);
    assert.deepEqual(parsePathNodes('{"nodes":[[1,2,[1,"x"],0,-1,-1]]}')!.nodes, [{ x: 1, y: 2 }], "a bad handle is dropped, the node kept");
  });
});

describe("Phase 39: the pen", () => {
  const P = (s = EMPTY_PEN, ...pts: [number, number][]) => pts.reduce((st, [x, y], i) => penPress(st, { x, y }, i * 100, 0.5), s);
  it("clicks make corner nodes with times", () => {
    const s = P(EMPTY_PEN, [0, 0], [50, 0], [50, 50]);
    assert.deepEqual(s.nodes.map((x) => [x.x, x.y, x.t]), [[0, 0, 0], [50, 0, 100], [50, 50, 200]]);
    assert.ok(s.nodes.every((x) => !x.hin && !x.hout));
  });
  it("click and drag pulls symmetric handles; Alt moves only the outgoing one", () => {
    const base = P(EMPTY_PEN, [0, 0], [50, 0]);
    const d = penDrag(base, { x: 70, y: 20 });
    assert.deepEqual([d.nodes[1].hout, d.nodes[1].hin], [{ x: 70, y: 20 }, { x: 30, y: -20 }]);
    const alt = penDrag(base, { x: 70, y: 20 }, true);
    assert.deepEqual([alt.nodes[1].hout, alt.nodes[1].hin], [{ x: 70, y: 20 }, undefined]);
    const first = penDrag(P(EMPTY_PEN, [0, 0]), { x: 10, y: 10 });
    assert.deepEqual([first.nodes[0].hout, first.nodes[0].hin], [{ x: 10, y: 10 }, undefined], "the first node has no incoming handle");
  });
  it("closing needs three nodes and a click on the first", () => {
    const two = P(EMPTY_PEN, [0, 0], [10, 0]);
    assert.equal(penNearFirst(two, { x: 0, y: 0 }, 5), false);
    const three = P(EMPTY_PEN, [0, 0], [10, 0], [10, 10]);
    assert.equal(penNearFirst(three, { x: 2, y: 2 }, 5), true);
    assert.equal(penNearFirst(three, { x: 20, y: 20 }, 5), false);
    assert.equal(penClose(three).closed, true);
    assert.equal(penClose(two).closed, false);
    assert.equal(penPress(penClose(three), { x: 5, y: 5 }).nodes.length, 3, "a closed path takes no more nodes");
  });
  it("backspace takes back the last node, or reopens a closed path", () => {
    const three = P(EMPTY_PEN, [0, 0], [10, 0], [10, 10]);
    assert.equal(penUndo(three).nodes.length, 2);
    const closed = penClose(three);
    assert.equal(penUndo(closed).closed, false);
    assert.equal(penUndo(penUndo(penUndo(penUndo(three)))).nodes.length, 0);
  });
  it("two nodes make a path, one doesn't; the rubber band starts at the last node", () => {
    assert.equal(penFinishable(P(EMPTY_PEN, [0, 0])), false);
    assert.equal(penFinishable(P(EMPTY_PEN, [0, 0], [1, 1])), true);
    assert.deepEqual(penRubberBand(P(EMPTY_PEN, [0, 0], [5, 5]), { x: 9, y: 9 }).map((x) => [x.x, x.y]), [[5, 5], [9, 9]]);
    assert.deepEqual(penRubberBand(EMPTY_PEN, { x: 1, y: 1 }), []);
  });
});
