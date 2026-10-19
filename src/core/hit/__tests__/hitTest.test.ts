import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HitIndex, type HitLayer } from "../hitTest";
import { CanvasHitTester, buildHitLayers, type FrameSurface } from "../CanvasHitTester";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { listFrames } from "../../frames/frames";

const hl = (id: string, parentId: string | null, depth: number, order: number, x: number, y: number, w: number, h: number, locked = false): HitLayer => ({
  id, parentId, depth, order, locked, frameId: "f", rect: { x, y, width: w, height: h },
});

// frame f (0..400 x 0..400) > group g (0..200 x 0..200) > button b (20..120 x 20..60); sibling text t (250..350 x 250..300)
const layers = () => [
  hl("f", null, 0, 1, 0, 0, 400, 400),
  hl("g", "f", 1, 2, 0, 0, 200, 200),
  hl("b", "g", 2, 3, 20, 20, 100, 40),
  hl("t", "f", 1, 4, 250, 250, 100, 50),
];

describe("Phase 22: hit-testing rules", () => {
  it("lists candidates deepest first", () => {
    assert.deepEqual(new HitIndex(layers()).candidates({ x: 30, y: 30 }).map((l) => l.id), ["b", "g", "f"]);
  });

  it("a plain click picks the frame's direct child, Cmd/Ctrl deep select picks the deepest, empty space picks the frame", () => {
    const index = new HitIndex(layers());
    assert.equal(index.pick({ x: 30, y: 30 })?.id, "g");
    assert.equal(index.pick({ x: 30, y: 30 }, { deep: true })?.id, "b");
    assert.equal(index.pick({ x: 300, y: 270 })?.id, "t");
    assert.equal(index.pick({ x: 380, y: 100 })?.id, "f");
    assert.equal(index.pick({ x: 900, y: 900 }), null);
  });

  it("among overlapping siblings the later one (on top) wins", () => {
    const index = new HitIndex([hl("f", null, 0, 1, 0, 0, 400, 400), hl("a", "f", 1, 2, 0, 0, 200, 200), hl("c", "f", 1, 3, 100, 100, 200, 200)]);
    assert.equal(index.pick({ x: 150, y: 150 })?.id, "c");
    assert.equal(index.pick({ x: 50, y: 50 })?.id, "a");
  });

  it("a locked layer and everything in it is skipped; the click falls through", () => {
    const l = layers();
    l[1] = hl("g", "f", 1, 2, 0, 0, 200, 200, true);
    const index = new HitIndex(l);
    assert.deepEqual(index.candidates({ x: 30, y: 30 }).map((x) => x.id), ["f"]);
    assert.equal(index.pick({ x: 30, y: 30 }, { deep: true })?.id, "f");
  });

  it("hits are inclusive of the edges and exclusive of outside", () => {
    const index = new HitIndex(layers());
    assert.equal(index.pick({ x: 20, y: 20 }, { deep: true })?.id, "b");
    assert.equal(index.pick({ x: 19.5, y: 20 }, { deep: true })?.id, "g");
  });

  it("an empty index picks nothing", () => {
    assert.equal(new HitIndex([]).pick({ x: 0, y: 0 }), null);
  });

  it("hit-test p95 is under 1 ms with 1,000 layers", () => {
    const items: HitLayer[] = [hl("f", null, 0, 1, 0, 0, 2000, 2000)];
    let order = 2;
    for (let g = 0; g < 50; g++) {
      const gx = (g % 10) * 200;
      const gy = Math.floor(g / 10) * 400;
      items.push(hl(`g${g}`, "f", 1, order++, gx, gy, 190, 390));
      for (let i = 0; i < 19; i++) items.push(hl(`g${g}_${i}`, `g${g}`, 2, order++, gx + 5, gy + 5 + i * 20, 180, 18));
    }
    assert.equal(items.length, 1001);
    const index = new HitIndex(items);
    const times: number[] = [];
    for (let n = 0; n < 2000; n++) {
      const p = { x: (n * 37) % 2000, y: (n * 91) % 2000 };
      const t0 = performance.now();
      index.pick(p);
      index.pick(p, { deep: true });
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    assert.ok(p95 < 1, `p95 ${p95.toFixed(4)} ms for a plain and a deep pick`);
  });
});

describe("Phase 22: building the index from measured frames", () => {
  const doc = () =>
    createDocumentFromLayers([
      createLayer({ id: "home", archetype: "container", parentId: null, children: ["a", "hidden"], properties: { "frame.x": 1000, "frame.y": 50, "frame.width": 300, "frame.height": 200 } }) as Layer,
      createLayer({ id: "a", archetype: "text", parentId: "home" }) as Layer,
      createLayer({ id: "hidden", archetype: "text", parentId: "home" }) as Layer,
    ]);

  it("moves rectangles to canvas space, clips to the frame, and leaves out layers that aren't drawn", () => {
    const d = doc();
    const rects: Record<string, { x: number; y: number; width: number; height: number }> = {
      home: { x: 0, y: 0, width: 300, height: 200 },
      a: { x: 250, y: 10, width: 100, height: 20 }, // sticks out of the frame's right edge
    };
    const surface: FrameSurface = {
      frameId: "home", layoutVersion: 1,
      measureNow: (ids) => ids.map((id) => (rects[id] ? { id, ...rects[id] } : null)), // "hidden" isn't drawn
    };
    const out = buildHitLayers(d, listFrames(d.layers), () => surface);
    assert.deepEqual(out.map((l) => l.id), ["home", "a"]);
    assert.deepEqual(out[1].rect, { x: 1250, y: 60, width: 50, height: 20 });
  });

  it("the tester rebuilds only when the document or a layout version changed", () => {
    const d = doc();
    let version = 1;
    const surfaces = new Map<string, FrameSurface>([["home", { frameId: "home", get layoutVersion() { return version; }, measureNow: (ids) => ids.map((id) => ({ id, x: 0, y: 0, width: 300, height: 200 })) } as FrameSurface]]);
    const tester = new CanvasHitTester(() => d, () => surfaces);
    assert.equal(tester.pickAt({ x: 1100, y: 100 })?.id, "hidden"); // both overlap; the later one is on top
    tester.pickAt({ x: 1100, y: 100 });
    assert.equal(tester.builds, 1);
    version = 2;
    tester.pickAt({ x: 1100, y: 100 });
    assert.equal(tester.builds, 2);
  });
});
