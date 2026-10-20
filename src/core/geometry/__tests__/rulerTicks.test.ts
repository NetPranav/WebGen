import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { niceStep, ticks } from "../rulerTicks";

describe("Phase 28: ruler ticks", () => {
  it("the major step grows as you zoom out so labels stay about 64+ screen px apart", () => {
    assert.equal(niceStep(1), 100);
    assert.equal(niceStep(2), 50);
    assert.equal(niceStep(0.5), 200);
    assert.equal(niceStep(0.1), 1000);
    assert.equal(niceStep(10), 10);
    assert.equal(niceStep(64), 1);
    for (const z of [0.02, 0.07, 0.3, 1, 3, 8, 40]) assert.ok(niceStep(z) * z >= 64 - 1e-9, `zoom ${z}`);
  });

  it("five minor ticks to a major one, majors on multiples of the step", () => {
    const t = ticks(0, 200, 1); // major 100, minor 20
    assert.deepEqual(t.map((x) => x.value), [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]);
    assert.deepEqual(t.filter((x) => x.major).map((x) => x.value), [0, 100, 200]);
  });

  it("covers a range that starts mid-step and a negative range", () => {
    const t = ticks(-130, -10, 1);
    assert.equal(t[0].value, -140);
    assert.ok(t.some((x) => x.major && x.value === -100));
    assert.ok(t.every((x) => x.value <= -10 + 1e-9));
  });
});
