import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dragHandle, handlesFor, normToWorld, worldToNorm } from "../gradientHandles";
import type { Paint } from "../paints";

const box = { w: 200, h: 100 };
const stops = [{ at: 0, color: "#000000" }, { at: 0.5, color: "#888888" }, { at: 1, color: "#ffffff" }];
const linear: Paint = { type: "linear", opacity: 1, visible: true, stops, from: { x: 0, y: 0.5 }, to: { x: 1, y: 0.5 } };
const radial: Paint = { type: "radial", opacity: 1, visible: true, stops, center: { x: 0.5, y: 0.5 }, radius: { x: 0.5, y: 0.4 } };
const conic: Paint = { type: "conic", opacity: 1, visible: true, stops, center: { x: 0.5, y: 0.5 }, angle: 90 };
const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const onStep = (deg: number) => assert.ok(Math.min(Math.abs(deg % 15), 15 - Math.abs(deg % 15)) < 1e-6, `${deg} is not a multiple of 15`);

describe("Phase 35: where the gradient handles are", () => {
  it("none for a solid", () => assert.deepEqual(handlesFor({ type: "solid", color: "#fff", opacity: 1, visible: true }, box), []));

  it("linear: both ends and each stop along the line", () => {
    const h = handlesFor(linear, box);
    assert.deepEqual(h.map((x) => x.kind), ["stop", "stop", "stop", "from", "to"]);
    assert.deepEqual(h[1].at, { x: 0.5, y: 0.5 });
    assert.equal(h[1].stopIndex, 1);
  });

  it("radial: the centre, both radii, and the stops along the horizontal radius", () => {
    const h = handlesFor(radial, box);
    assert.deepEqual(h.map((x) => x.kind), ["stop", "stop", "stop", "center", "radiusX", "radiusY"]);
    assert.deepEqual(h[4].at, { x: 1, y: 0.5 });
    assert.deepEqual(h[5].at, { x: 0.5, y: 0.9 });
    assert.deepEqual(h[1].at, { x: 0.75, y: 0.5 });
  });

  it("conic: the centre and an angle handle in the direction of the angle", () => {
    const h = handlesFor(conic, box); // 90 degrees: to the right
    assert.deepEqual(h.map((x) => x.kind), ["center", "angle"]);
    near(h[1].at.x, 0.5 + (0.35 * 100) / 200);
    near(h[1].at.y, 0.5);
  });
});

describe("Phase 35: dragging a handle changes the paint", () => {
  it("a linear end moves freely; Shift keeps 15 degree steps", () => {
    const moved = dragHandle(linear, { kind: "to" }, { x: 0.8, y: 0.9 }, box) as typeof linear;
    assert.deepEqual(moved.to, { x: 0.8, y: 0.9 });
    assert.deepEqual(moved.from, linear.from);
    const snapped = dragHandle(linear, { kind: "to" }, { x: 1, y: 0.62 }, box, { shift: true }) as typeof linear;
    near(snapped.to.y, 0.5, 0.01);
    const diag = dragHandle(linear, { kind: "to" }, { x: 0.9, y: 0.95 }, box, { shift: true }) as typeof linear;
    const a = Math.atan2((diag.to.y - 0.5) * box.h, (diag.to.x - 0) * box.w) * (180 / Math.PI);
    onStep(a);
  });

  it("a linear stop slides along the line and reorders past others", () => {
    const moved = dragHandle(linear, { kind: "stop", stopIndex: 1 }, { x: 0.25, y: 0.1 }, box) as typeof linear;
    near(moved.stops[1].at, 0.25);
    const past = dragHandle(linear, { kind: "stop", stopIndex: 0 }, { x: 0.75, y: 0.5 }, box) as typeof linear;
    assert.deepEqual(past.stops.map((s) => s.color), ["#888888", "#000000", "#ffffff"]);
  });

  it("a radial centre moves, radii follow the pointer, stops slide along the radius", () => {
    const c = dragHandle(radial, { kind: "center" }, { x: 0.3, y: 0.6 }, box) as typeof radial;
    assert.deepEqual([c.center, c.radius], [{ x: 0.3, y: 0.6 }, radial.radius]);
    const rx = dragHandle(radial, { kind: "radiusX" }, { x: 0.9, y: 0.5 }, box) as typeof radial;
    near(rx.radius.x, 0.4);
    near(rx.radius.y, 0.4);
    const ry = dragHandle(radial, { kind: "radiusY" }, { x: 0.5, y: 0.5 }, box) as typeof radial;
    near(ry.radius.y, 0.01, 1e-9);
    const s = dragHandle(radial, { kind: "stop", stopIndex: 1 }, { x: 0.75, y: 0.5 }, box) as typeof radial;
    near(s.stops[1].at, 0.5);
  });

  it("a conic angle handle sets the angle from the centre, in pixels; Shift snaps to 15", () => {
    const right = dragHandle(conic, { kind: "angle" }, { x: 0.9, y: 0.5 }, box) as typeof conic;
    near(right.angle, 90);
    const down = dragHandle(conic, { kind: "angle" }, { x: 0.5, y: 0.9 }, box) as typeof conic;
    near(down.angle, 180);
    const snapped = dragHandle(conic, { kind: "angle" }, { x: 0.7, y: 0.2 }, box, { shift: true }) as typeof conic;
    onStep(snapped.angle);
    assert.equal((dragHandle(conic, { kind: "angle" }, conic.center, box) as typeof conic).angle, 90, "on the centre: unchanged");
  });

  it("a drag far outside the box is clamped", () => {
    const moved = dragHandle(linear, { kind: "from" }, { x: 1e9, y: -1e9 }, box) as typeof linear;
    assert.deepEqual(moved.from, { x: 5, y: -4 });
  });
});

describe("Phase 35: the box on the canvas, turned or not", () => {
  const upright = { cx: 300, cy: 200, w: 200, h: 100, rot: 0 };
  it("an upright box", () => {
    assert.deepEqual(normToWorld(upright, { x: 0, y: 0 }), { x: 200, y: 150 });
    assert.deepEqual(normToWorld(upright, { x: 1, y: 1 }), { x: 400, y: 250 });
    assert.deepEqual(worldToNorm(upright, { x: 300, y: 200 }), { x: 0.5, y: 0.5 });
  });
  it("a turned box: the round trip is exact, and 90 degrees sends the top-left corner to the top-right", () => {
    const turned = { cx: 300, cy: 200, w: 200, h: 100, rot: 90 };
    const tl = normToWorld(turned, { x: 0, y: 0 });
    near(tl.x, 350);
    near(tl.y, 100);
    for (const p of [{ x: 0.2, y: 0.9 }, { x: -1, y: 2 }, { x: 0.5, y: 0.5 }]) {
      const back = worldToNorm({ ...turned, rot: 37 }, normToWorld({ ...turned, rot: 37 }, p));
      near(back.x, p.x);
      near(back.y, p.y);
    }
  });
});
