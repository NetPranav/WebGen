import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveGrammarElementType,
  convertTracksToGrammarBindings,
  getPropertyRenderingTier,
  getCategoryPriorityInfo,
} from "../grammarHelpers";

describe("Grammar UI & Runtime Helpers", () => {
  describe("resolveGrammarElementType", () => {
    it("resolves tag-based types accurately", () => {
      assert.equal(resolveGrammarElementType("any", "any", "BTN"), "Button");
      assert.equal(resolveGrammarElementType("any", "any", "TXT"), "Text");
      assert.equal(resolveGrammarElementType("any", "any", "BADGE"), "Badge");
      assert.equal(resolveGrammarElementType("any", "any", "IMG"), "Image");
      assert.equal(resolveGrammarElementType("any", "any", "CARD"), "Card");
      assert.equal(resolveGrammarElementType("any", "any", "GRID"), "Grid");
      assert.equal(resolveGrammarElementType("any", "any", "NAV"), "Navbar");
      assert.equal(resolveGrammarElementType("any", "any", "HERO"), "Section");
    });

    it("resolves name and semantic label heuristics", () => {
      assert.equal(resolveGrammarElementType("comp_1", "Primary CTA Button"), "Button");
      assert.equal(resolveGrammarElementType("comp_2", "H1 Engine Headline"), "Text");
      assert.equal(resolveGrammarElementType("comp_3", "Release Pill Badge"), "Badge");
      assert.equal(resolveGrammarElementType("comp_4", "BrandLogo (SVG)"), "Image");
      assert.equal(resolveGrammarElementType("comp_5", "Feature Grid"), "Grid");
      assert.equal(resolveGrammarElementType("comp_6", "Wasm Cable Physics Card"), "Card");
    });
  });

  describe("convertTracksToGrammarBindings", () => {
    it("maps animation tracks to valid AnimationBinding tuples with priority", () => {
      const tracks = [
        {
          id: "trk_1",
          trigger: "hover",
          duration: 0.4,
          delay: 0,
          easing: "easeOut",
          properties: [{ property: "transform.scale" }, { property: "transform.y" }],
        },
        {
          id: "trk_2",
          trigger: "click",
          properties: [{ property: "transform.scale" }],
        },
      ];

      const bindings = convertTracksToGrammarBindings("el_btn", tracks);
      assert.equal(bindings.length, 2);
      assert.equal(bindings[0].category, "Hover");
      assert.equal(bindings[0].trigger, "OnHoverEnter");
      assert.deepEqual(bindings[0].properties, ["transform.scale", "transform.y"]);
      assert.equal(bindings[0].priority, 2); // Hover is index 2 (Focus=0, Press=1, Hover=2)

      assert.equal(bindings[1].category, "Press");
      assert.equal(bindings[1].trigger, "OnPress");
      assert.equal(bindings[1].priority, 1);
    });
  });

  describe("getPropertyRenderingTier", () => {
    it("classifies GPU compositor tier 1 properties (120 FPS)", () => {
      assert.equal(getPropertyRenderingTier("transform.y").tier, 1);
      assert.equal(getPropertyRenderingTier("transform.scale").tier, 1);
      assert.equal(getPropertyRenderingTier("appearance.opacity").tier, 1);
      assert.equal(getPropertyRenderingTier("filter.blur").tier, 1);
    });

    it("classifies Paint tier 2 properties", () => {
      assert.equal(getPropertyRenderingTier("appearance.background.color").tier, 2);
      assert.equal(getPropertyRenderingTier("typography.color").tier, 2);
      assert.equal(getPropertyRenderingTier("appearance.border.color").tier, 2);
    });

    it("classifies Layout reflow tier 3 properties", () => {
      assert.equal(getPropertyRenderingTier("layout.width").tier, 3);
      assert.equal(getPropertyRenderingTier("layout.height").tier, 3);
      assert.equal(getPropertyRenderingTier("margin.top").tier, 3);
    });
  });

  describe("getCategoryPriorityInfo", () => {
    it("returns correct priority number and badge for categories", () => {
      const focus = getCategoryPriorityInfo("Focus");
      assert.equal(focus.priority, 1);
      assert.equal(focus.badge, "P#1");

      const press = getCategoryPriorityInfo("Press");
      assert.equal(press.priority, 2);
      assert.equal(press.badge, "P#2");

      const hover = getCategoryPriorityInfo("Hover");
      assert.equal(hover.priority, 3);
      assert.equal(hover.badge, "P#3");

      const entrance = getCategoryPriorityInfo("Entrance");
      assert.equal(entrance.priority, 6);
      assert.equal(entrance.badge, "P#6");
    });
  });
});
