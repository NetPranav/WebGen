import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SHAPE_TOOLS, isShapeToolId, computeShapeProperties } from "../shapeTools";

describe("Sub-Phase 43.2: Shape Draw Tools", () => {
  it("isShapeToolId recognizes the four drag-to-create tools and rejects everything else", () => {
    assert.strictEqual(isShapeToolId("rectangle"), true);
    assert.strictEqual(isShapeToolId("ellipse"), true);
    assert.strictEqual(isShapeToolId("line"), true);
    assert.strictEqual(isShapeToolId("frame"), true);
    assert.strictEqual(isShapeToolId("select"), false);
    assert.strictEqual(isShapeToolId("pan"), false);
    assert.strictEqual(isShapeToolId("text"), false);
  });

  it("a drag below the click threshold returns undefined, so the caller falls back to the archetype's registry defaults", () => {
    assert.strictEqual(computeShapeProperties(SHAPE_TOOLS.rectangle, 1, 1, false), undefined);
    assert.strictEqual(computeShapeProperties(SHAPE_TOOLS.rectangle, 0, 0, false), undefined);
  });

  it("a plain drag (no Shift) sets frame.width/height from the drag distance, independent of sign", () => {
    assert.deepStrictEqual(computeShapeProperties(SHAPE_TOOLS.rectangle, 200, 100, false), {
      "frame.width": 200,
      "frame.height": 100,
    });
    // Dragging up-and-left (negative deltas) must size identically to down-and-right.
    assert.deepStrictEqual(computeShapeProperties(SHAPE_TOOLS.rectangle, -200, -100, false), {
      "frame.width": 200,
      "frame.height": 100,
    });
  });

  it("Shift constrains Rectangle/Ellipse to a square, but not Frame (not in the shiftConstrainsSquare set)", () => {
    assert.deepStrictEqual(computeShapeProperties(SHAPE_TOOLS.rectangle, 200, 50, true), {
      "frame.width": 200,
      "frame.height": 200,
    });
    assert.deepStrictEqual(computeShapeProperties(SHAPE_TOOLS.ellipse, 30, 90, true), {
      "frame.width": 90,
      "frame.height": 90,
    });
    // Frame is not in the "Shift makes it square" set (only Rectangle/Ellipse are, per the ROADMAP spec).
    assert.deepStrictEqual(computeShapeProperties(SHAPE_TOOLS.frame, 200, 50, true), {
      "frame.width": 200,
      "frame.height": 50,
    });
  });

  it("Line only ever sets frame.width, from the horizontal drag component — it always renders horizontal in this flow-placed box model regardless of the drag's vertical component or Shift", () => {
    assert.deepStrictEqual(computeShapeProperties(SHAPE_TOOLS.line, 150, 80, false), { "frame.width": 150 });
    assert.deepStrictEqual(computeShapeProperties(SHAPE_TOOLS.line, 150, 80, true), { "frame.width": 150 });
  });
});
