/**
 * Sub-Phase 8.2: the `rules` query API (`canAdd`, `validate`, `explain`,
 * `suggestFix`) against real `MotionDocument` fixtures built with the same
 * `DocBuilder` the Phase 7 gate uses — not the legacy, document-disconnected
 * `AnimationBinding`/`EvaluatedElement` shape.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DocBuilder } from "../../document/__tests__/fixtures/builder";
import { rules } from "../index";

describe("Sub-Phase 8.2: rules.canAdd", () => {
  it("is visible for a Hover clip on an Image with no existing clips (Image allows Hover unconditionally)", () => {
    const b = new DocBuilder();
    const imageId = b.layer("image", "Photo", null);
    const doc = b.build();

    const result = rules.canAdd(doc, imageId, { category: "Hover" });
    assert.equal(result.visible, true);
  });

  it("hides Container's Press without explicit promotion, and shows it once the layer is tagged interactive", () => {
    const b = new DocBuilder();
    const containerId = b.layer("container", "Box", null);
    const doc = b.build();

    const gated = rules.canAdd(doc, containerId, { category: "Press" });
    assert.equal(gated.visible, false);

    const promoted = rules.canAdd(doc, containerId, { category: "Press" }, { explicitPromotion: true });
    assert.equal(promoted.visible, true);
  });

  it("hides a category the element type blocks outright (Icon has no Focus)", () => {
    const b = new DocBuilder();
    const iconId = b.layer("icon", "Loader", null);
    const doc = b.build();

    const result = rules.canAdd(doc, iconId, { category: "Focus" });
    assert.equal(result.visible, false);
  });

  it("hides everything once the type's track capacity is reached", () => {
    const b = new DocBuilder();
    const badgeId = b.layer("badge", "Status", null);
    b.clip(badgeId, { name: "In", type: "entrance", trigger: "mount", duration: 0.2, easing: "ease-out", tracks: [] });
    b.clip(badgeId, { name: "Out", type: "entrance", trigger: "mount", duration: 0.2, easing: "ease-out", tracks: [] });
    b.clip(badgeId, { name: "Pulse", type: "loop", trigger: "time", duration: 1, easing: "linear", repeat: -1, tracks: [] });
    const doc = b.build();

    const result = rules.canAdd(doc, badgeId);
    assert.equal(result.visible, false);
  });

  it("returns a reason for an unknown layer id", () => {
    const b = new DocBuilder();
    const doc = b.build();
    const result = rules.canAdd(doc, "nope");
    assert.equal(result.visible, false);
  });
});

describe("Sub-Phase 8.2: rules.validate / explain / suggestFix", () => {
  it("flags a duplicate StateTransition edge as [STA_CONFLICT]", () => {
    const b = new DocBuilder();
    const modalId = b.layer("container", "Panel", null);
    b.transition(modalId, { from: "closed", to: "open", motion: { type: "tween", duration: 0.2, easing: "ease-out" } });
    b.transition(modalId, { from: "closed", to: "open", motion: { type: "tween", duration: 0.2, easing: "ease-out" } });
    const doc = b.build();

    const diagnostics = rules.validate(doc);
    const conflict = diagnostics.find((d) => d.code === "STA_CONFLICT");
    assert.ok(conflict, "expected a STA_CONFLICT diagnostic");
    assert.match(rules.explain(conflict!), /^\[STA_CONFLICT\]/);
    assert.ok(rules.suggestFix(conflict!));
  });

  it("flags a continuous binding on a layout-triggering property as [PERF_LAYOUT]", () => {
    const b = new DocBuilder();
    const cardId = b.layer("container", "Panel", null);
    b.clip(cardId, {
      name: "BadAmbient",
      type: "loop",
      trigger: "time",
      duration: 1,
      easing: "linear",
      repeat: -1,
      tracks: [{ id: "t1", property: "layout.width", keyframes: [{ id: "k1", time: 0, value: 100 }] }],
    });
    const doc = b.build();

    const diagnostics = rules.validate(doc);
    assert.ok(diagnostics.some((d) => d.code === "PERF_LAYOUT"));
  });
});
