import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dragBox } from "../shapeDrag";

const none = { shift: false, alt: false };
const rect = { width: 160, height: 120 };
const seg = { width: 160, height: 2 };

describe("Phase 25: dragging out a box", () => {
  it("the corners are the press and the pointer, whichever way you drag", () => {
    assert.deepEqual(dragBox("box", { x: 10, y: 20 }, { x: 110, y: 90 }, none, rect), { x: 10, y: 20, width: 100, height: 70, rotation: 0, click: false });
    assert.deepEqual(dragBox("box", { x: 110, y: 90 }, { x: 10, y: 20 }, none, rect), { x: 10, y: 20, width: 100, height: 70, rotation: 0, click: false });
    assert.deepEqual(dragBox("box", { x: 10, y: 90 }, { x: 110, y: 20 }, none, rect), { x: 10, y: 20, width: 100, height: 70, rotation: 0, click: false });
  });

  it("Shift makes it square, growing in the direction of the drag, the longer side wins", () => {
    assert.deepEqual(dragBox("box", { x: 0, y: 0 }, { x: 100, y: 40 }, { shift: true, alt: false }, rect), { x: 0, y: 0, width: 100, height: 100, rotation: 0, click: false });
    assert.deepEqual(dragBox("box", { x: 0, y: 0 }, { x: -30, y: -80 }, { shift: true, alt: false }, rect), { x: -80, y: -80, width: 80, height: 80, rotation: 0, click: false });
  });

  it("Alt draws from the centre; Shift+Alt a centred square", () => {
    assert.deepEqual(dragBox("box", { x: 100, y: 100 }, { x: 130, y: 120 }, { shift: false, alt: true }, rect), { x: 70, y: 80, width: 60, height: 40, rotation: 0, click: false });
    assert.deepEqual(dragBox("box", { x: 100, y: 100 }, { x: 130, y: 120 }, { shift: true, alt: true }, rect), { x: 70, y: 70, width: 60, height: 60, rotation: 0, click: false });
  });

  it("a press that barely moves is a click: the default size at the press, centred with Alt", () => {
    assert.deepEqual(dragBox("box", { x: 50, y: 60 }, { x: 51, y: 61 }, none, rect), { x: 50, y: 60, width: 160, height: 120, rotation: 0, click: true });
    assert.deepEqual(dragBox("box", { x: 50, y: 60 }, { x: 50, y: 60 }, { shift: false, alt: true }, rect), { x: -30, y: 0, width: 160, height: 120, rotation: 0, click: true });
  });
});

describe("Phase 25: dragging out a line or arrow", () => {
  it("a horizontal drag is a horizontal box, as long as the drag, centred on its line", () => {
    assert.deepEqual(dragBox("segment", { x: 0, y: 50 }, { x: 100, y: 50 }, none, seg), { x: 0, y: 49, width: 100, height: 2, rotation: 0, click: false });
  });

  it("a diagonal drag is a rotated box about its centre", () => {
    const b = dragBox("segment", { x: 0, y: 0 }, { x: 30, y: 40 }, none, seg);
    assert.equal(b.width, 50);
    assert.equal(b.rotation, 53.13);
    // the box's centre is the midpoint of the drag
    assert.equal(b.x + b.width / 2, 15);
    assert.equal(b.y + b.height / 2, 20);
  });

  it("Shift snaps the angle to 45 degrees", () => {
    const b = dragBox("segment", { x: 0, y: 0 }, { x: 100, y: 12 }, { shift: true, alt: false }, seg);
    assert.equal(b.rotation, 0);
    assert.ok(Math.abs(b.width - 100) < 1);
    const d = dragBox("segment", { x: 0, y: 0 }, { x: 60, y: 70 }, { shift: true, alt: false }, seg);
    assert.equal(d.rotation, 45);
  });

  it("Alt draws from the middle", () => {
    const b = dragBox("segment", { x: 100, y: 100 }, { x: 150, y: 100 }, { shift: false, alt: true }, seg);
    assert.equal(b.width, 100);
    assert.equal(b.x + b.width / 2, 100);
  });

  it("pointing left gives a half-turn rotation, and a click gives the default horizontal segment", () => {
    assert.equal(dragBox("segment", { x: 100, y: 0 }, { x: 0, y: 0 }, none, seg).rotation, 180);
    assert.deepEqual(dragBox("segment", { x: 10, y: 10 }, { x: 10, y: 10 }, none, seg), { x: 10, y: 9, width: 160, height: 2, rotation: 0, click: true });
  });
});
