/**
 * Sub-Phase 8.5 (Source Reconciliation): asserts the 5 named contradictions
 * between the grammar and the engine spec's §7 per-type tables (AUD-52) are
 * resolved in the grammar's favour, per
 * `DOCS/Initial/decisions/0005-phase8-rule-table-and-reconciliation.md`.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TYPE_REGISTRY } from "../../engine/ElementGrammarEngine";
import { getCategoryCompatibilityKind } from "../conditional-gates";

describe("Sub-Phase 8.5: grammar-vs-engine-spec reconciliation", () => {
  it("Badge: Hover is blocked and StateTransition is allowed (spec had them swapped)", () => {
    assert.equal(getCategoryCompatibilityKind("Badge", "Hover"), "blocked");
    assert.equal(getCategoryCompatibilityKind("Badge", "StateTransition"), "allowed");
  });

  it("Spinner: Ambient-only, 1 track (spec wrongly added Entrance/Exit and a 2nd track)", () => {
    assert.deepEqual(TYPE_REGISTRY.Spinner.allowedCategories, ["Ambient"]);
    assert.equal(TYPE_REGISTRY.Spinner.maxSimultaneousTracks, 1);
    assert.equal(getCategoryCompatibilityKind("Spinner", "Entrance"), "blocked");
    assert.equal(getCategoryCompatibilityKind("Spinner", "Exit"), "blocked");
  });

  it("track caps: Link=4, Avatar=4, Container=5 (spec had 3, 3, 4)", () => {
    assert.equal(TYPE_REGISTRY.Link.maxSimultaneousTracks, 4);
    assert.equal(TYPE_REGISTRY.Avatar.maxSimultaneousTracks, 4);
    assert.equal(TYPE_REGISTRY.Container.maxSimultaneousTracks, 5);
  });

  it("Container's Press is conditional, promotion-gated — neither unconditionally allowed nor blocked (spec blocked it outright)", () => {
    assert.equal(getCategoryCompatibilityKind("Container", "Press"), "conditional");
  });

  it("Table/List/Chart are not element types — the grammar's v0.1 taxonomy (32 types) plus the v0.2 Effect Surfaces (7 types, §13.3) is exhaustive; the spec falsely claimed 3 more", () => {
    const types = Object.keys(TYPE_REGISTRY);
    assert.equal(types.length, 39);
    for (const phantom of ["Table", "List", "Chart"]) {
      assert.ok(!types.includes(phantom), `"${phantom}" must not be a registered grammar element type`);
    }
  });
});
