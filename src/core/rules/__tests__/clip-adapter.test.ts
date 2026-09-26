/**
 * Sub-Phase 8.1: the MDM v4 `Clip` ↔ grammar `AnimationCategory` bridge, and
 * an explicit, checked audit trail for the categories the schema can't yet
 * express independently (`PHASE8_SCHEMA_GAPS`) — see decision 0005.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CLIP_TYPE_TO_CATEGORY, PHASE8_SCHEMA_GAPS, convertClipsToGrammarBindings } from "../clip-adapter";
import { CLIP_TYPES } from "../../document/motion";
import type { Clip } from "../../document/schema";

describe("Sub-Phase 8.1: Clip ↔ AnimationCategory adapter", () => {
  it("maps every ClipType to exactly one AnimationCategory", () => {
    for (const clipType of CLIP_TYPES) {
      assert.ok(CLIP_TYPE_TO_CATEGORY[clipType], `ClipType "${clipType}" is unmapped`);
    }
  });

  it("documents every category/trigger the current schema cannot express independently", () => {
    const documented = PHASE8_SCHEMA_GAPS.map((g) => g.category);
    for (const gap of ["Exit", "Focus", "Stagger", "LayoutTransition"]) {
      assert.ok(documented.includes(gap as never), `expected a documented schema gap for "${gap}"`);
    }
  });

  it("converts clips into grammar bindings with the right category/properties", () => {
    const clip: Clip = {
      id: "clip_1",
      layerId: "layer_1",
      name: "Lift",
      type: "hover",
      trigger: "hover",
      duration: 0.2,
      easing: "ease-out",
      enabled: true,
      tracks: [{ id: "track_1", property: "transform.y", keyframes: [{ id: "k1", time: 0, value: 0 }] }],
    };

    const [binding] = convertClipsToGrammarBindings([clip]);
    assert.equal(binding.category, "Hover");
    assert.equal(binding.trigger, "OnHoverEnter");
    assert.deepEqual(binding.properties, ["transform.y"]);
  });
});
