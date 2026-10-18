/**
 * Sub-Phase 8.1: the MDM v4 `Clip` ↔ grammar `AnimationCategory` bridge, and
 * an explicit, checked audit trail for the categories the schema can't yet
 * express independently (`PHASE8_SCHEMA_GAPS`) — see decision 0005.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CLIP_TYPE_TO_CATEGORY, PHASE8_SCHEMA_GAPS, TRIGGER_TO_TRIGGER_TYPE, convertClipsToGrammarBindings } from "../clip-adapter";
import { CLIP_TYPES, TRIGGERS } from "../../document/motion";
import { CATEGORY_PRIORITY_ORDER } from "../../types/element-grammar";
import type { Clip } from "../../document/schema";

describe("Sub-Phase 8.1: Clip ↔ AnimationCategory adapter", () => {
  it("maps every ClipType to exactly one AnimationCategory", () => {
    for (const clipType of CLIP_TYPES) {
      assert.ok(CLIP_TYPE_TO_CATEGORY[clipType], `ClipType "${clipType}" is unmapped`);
    }
  });

  it("has no schema gaps left (Phase 53, AUD-59)", () => {
    assert.deepEqual(PHASE8_SCHEMA_GAPS, []);
  });

  it("every grammar category has a ClipType (Reactive is signal-driven, not a clip)", () => {
    const covered = new Set(Object.values(CLIP_TYPE_TO_CATEGORY));
    for (const category of CATEGORY_PRIORITY_ORDER.filter((c) => c !== "Reactive")) assert.ok(covered.has(category), `no ClipType for "${category}"`);
  });

  it("maps every Trigger to its own TriggerType (lossless)", () => {
    for (const trigger of TRIGGERS) assert.ok(TRIGGER_TO_TRIGGER_TYPE[trigger], `Trigger "${trigger}" is unmapped`);
    const mapped = TRIGGERS.map((t) => TRIGGER_TO_TRIGGER_TYPE[t]);
    assert.equal(new Set(mapped).size, TRIGGERS.length, "two triggers share a TriggerType");
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
