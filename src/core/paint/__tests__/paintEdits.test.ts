import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addPaint, addStop, changeType, colorAt, movePaint, moveStop, paintColor, removePaint, removeStop, reverseStops, setStopColor, updatePaint } from "../paintEdits";
import { newPaint, MAX_PAINTS, MAX_STOPS, type Paint } from "../paints";

const two = [{ at: 0, color: "#000000" }, { at: 1, color: "#ffffff" }];

describe("Phase 35: editing a list of paints", () => {
  it("a new paint goes on top, in the colour of the one below", () => {
    const list = addPaint([newPaint("solid", "#336699")], "linear");
    assert.equal(list.length, 2);
    assert.equal(list[0].type, "linear");
    assert.equal(paintColor(list[0]), "#336699");
    assert.equal(addPaint([], "solid")[0].type, "solid");
    assert.equal(addPaint(Array.from({ length: MAX_PAINTS }, () => newPaint("solid")), "solid").length, MAX_PAINTS);
  });

  it("remove and move", () => {
    const a = newPaint("solid", "#111111");
    const b = newPaint("solid", "#222222");
    const c = newPaint("solid", "#333333");
    assert.deepEqual(removePaint([a, b, c], 1), [a, c]);
    assert.deepEqual(movePaint([a, b, c], 2, -1), [a, c, b]);
    assert.deepEqual(movePaint([a, b, c], 0, -1), [a, b, c]);
    assert.deepEqual(movePaint([a, b, c], 2, 1), [a, b, c]);
  });

  it("changing the type keeps the colour, the stops, the opacity and the visibility", () => {
    const solid: Paint = { type: "solid", color: "#ff0000", opacity: 0.4, visible: false };
    const linear = changeType(solid, "linear");
    assert.equal(linear.type, "linear");
    assert.equal(paintColor(linear), "#ff0000");
    assert.deepEqual([linear.opacity, linear.visible], [0.4, false]);
    const radial = changeType({ ...(newPaint("linear") as Extract<Paint, { type: "linear" }>), stops: [{ at: 0, color: "#aa0000" }, { at: 0.5, color: "#00aa00" }, { at: 1, color: "#0000aa" }] }, "radial");
    assert.equal(radial.type === "radial" && radial.stops.length, 3);
    const back = changeType(radial, "solid");
    assert.equal(back.type === "solid" && back.color, "#aa0000");
    assert.equal(changeType(solid, "solid"), solid);
  });

  it("updatePaint changes one entry", () => {
    const a = newPaint("solid", "#111111");
    const b = newPaint("solid", "#222222");
    assert.deepEqual(updatePaint([a, b], 1, (p) => ({ ...p, opacity: 0.5 }))[1].opacity, 0.5);
    assert.equal(updatePaint([a, b], 1, (p) => ({ ...p, opacity: 0.5 }))[0], a);
  });
});

describe("Phase 35: editing gradient stops", () => {
  it("colorAt interpolates, and holds the ends", () => {
    assert.equal(colorAt(two, 0.5), "#808080");
    assert.equal(colorAt(two, 0), "#000000");
    assert.equal(colorAt(two, 2), "#ffffff");
    assert.equal(colorAt([{ at: 0.4, color: "#ff0000" }, { at: 0.6, color: "#0000ff" }], 0.1), "#ff0000");
  });

  it("a new stop takes the colour the gradient has there and keeps the list sorted", () => {
    const { stops, index } = addStop(two, 0.5);
    assert.deepEqual(stops.map((s) => s.at), [0, 0.5, 1]);
    assert.equal(stops[index].color, "#808080");
    assert.equal(addStop(Array.from({ length: MAX_STOPS }, (_, i) => ({ at: i / MAX_STOPS, color: "#000" })), 0.5).index, -1);
    assert.equal(addStop(two, 7).stops[2].at, 1, "clamped");
  });

  it("a gradient keeps at least two stops", () => {
    assert.deepEqual(removeStop(two, 0), two);
    assert.deepEqual(removeStop([...two, { at: 0.5, color: "#888888" }], 2).map((s) => s.at), [0, 1]);
  });

  it("moving a stop past another reorders them and the index follows the stop", () => {
    const three = [{ at: 0, color: "#ff0000" }, { at: 0.5, color: "#00ff00" }, { at: 1, color: "#0000ff" }];
    const moved = moveStop(three, 0, 0.8);
    assert.deepEqual(moved.stops.map((s) => s.color), ["#00ff00", "#ff0000", "#0000ff"]);
    assert.equal(moved.index, 1);
    assert.equal(moveStop(three, 2, -5).stops[0].color, "#0000ff", "clamped to the start");
    assert.deepEqual(moveStop(three, 9, 0.5).stops, three);
  });

  it("set a stop's colour, reverse", () => {
    assert.deepEqual(setStopColor(two, 1, "#123456")[1], { at: 1, color: "#123456" });
    assert.deepEqual(reverseStops([{ at: 0, color: "#f00" }, { at: 0.25, color: "#0f0" }, { at: 1, color: "#00f" }]), [{ at: 0, color: "#00f" }, { at: 0.75, color: "#0f0" }, { at: 1, color: "#f00" }]);
  });
});
