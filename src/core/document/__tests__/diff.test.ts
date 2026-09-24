import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { applyPatches, enablePatches } from "immer";
import { diffPatches } from "../diff";

enablePatches();

// JSON-like values without `__proto__` keys (the document validator rejects those).
const json = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: "small" },
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.array(tie("value"), { maxLength: 4 }),
    fc.dictionary(fc.string().filter((k) => k !== "__proto__"), tie("value"), { maxKeys: 4, noNullPrototype: true })
  ),
})).value;

describe("diffPatches (Phase 3.1)", () => {
  it("applyPatches(a, diffPatches(a, b)) equals b, for 500 random pairs", () => {
    fc.assert(
      fc.property(json, json, (a, b) => {
        assert.deepEqual(applyPatches(a as object, diffPatches(a, b)), b);
      }),
      { numRuns: 500 }
    );
  });

  it("is empty for equal values and skips shared subtrees", () => {
    const shared = { big: Array.from({ length: 1000 }, (_, i) => i) };
    assert.deepEqual(diffPatches({ shared, x: 1 }, { shared, x: 1 }), []);
    assert.deepEqual(diffPatches({ shared, x: 1 }, { shared, x: 2 }), [{ op: "replace", path: ["x"], value: 2 }]);
  });

  it("emits add and remove for changed keys", () => {
    assert.deepEqual(diffPatches({ a: 1 }, { b: 2 }), [
      { op: "remove", path: ["a"] },
      { op: "add", path: ["b"], value: 2 },
    ]);
  });
});
