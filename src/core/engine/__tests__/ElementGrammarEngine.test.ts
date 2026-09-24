import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ElementGrammarEngine,
  TYPE_REGISTRY,
} from "../ElementGrammarEngine";
import { AnimationBinding } from "../../types/element-grammar";

describe("ElementGrammarEngine & Plus Icon Evaluator (lazylayout_element_grammer.md)", () => {
  it("should have all 32 Element Types registered in TYPE_REGISTRY", () => {
    const keys = Object.keys(TYPE_REGISTRY);
    assert.equal(keys.length, 32);
    assert.ok(TYPE_REGISTRY.Text);
    assert.ok(TYPE_REGISTRY.Button);
    assert.ok(TYPE_REGISTRY.Modal);
    assert.ok(TYPE_REGISTRY.Checkbox);
    assert.ok(TYPE_REGISTRY.Video);
  });

  describe("Plus Icon Decision Algorithm (Grammar Section 8)", () => {
    it("offers rich category set for clean Button element", () => {
      const decision = ElementGrammarEngine.evaluatePlusIcon({
        id: "btn_1",
        type: "Button",
        bindings: [],
      });

      assert.equal(decision.visible, true);
      if (decision.visible) {
        const categories = decision.candidates.map((c) => c.category);
        assert.ok(categories.includes("Hover"));
        assert.ok(categories.includes("Press"));
        assert.ok(categories.includes("Entrance"));
        assert.ok(categories.includes("StateTransition"));
      }
    });

    it("restricts Text to allowed categories (no Press, no Focus)", () => {
      const decision = ElementGrammarEngine.evaluatePlusIcon({
        id: "txt_1",
        type: "Text",
        bindings: [],
      });

      assert.equal(decision.visible, true);
      if (decision.visible) {
        const categories = decision.candidates.map((c) => c.category);
        assert.ok(categories.includes("Entrance"));
        assert.ok(categories.includes("Ambient"));
        assert.ok(!categories.includes("Press"), "Text cannot have Press");
        assert.ok(!categories.includes("Focus"), "Text cannot have Focus");
      }
    });

    it("hides Plus icon on Spinner once its single Ambient track is bound", () => {
      const existingAmbient: AnimationBinding = {
        id: "b_spin",
        targetElementId: "spin_1",
        category: "Ambient",
        trigger: "Ambient",
        properties: ["transform.rotate"],
        priority: 0,
      };

      const decision = ElementGrammarEngine.evaluatePlusIcon({
        id: "spin_1",
        type: "Spinner",
        bindings: [existingAmbient],
      });

      assert.equal(decision.visible, false);
      if (!decision.visible) {
        assert.match(decision.reason, /capacity/);
      }
    });

    it("enforces In-Flight Locking (Grammar Rule 6.7)", () => {
      const decision = ElementGrammarEngine.evaluatePlusIcon({
        id: "acc_1",
        type: "Accordion",
        bindings: [],
        hasInFlightTransition: true,
      });

      assert.equal(decision.visible, false);
      if (!decision.visible) {
        assert.match(decision.reason, /in-flight/i);
      }
    });

    it("enforces Closed-Default Subsumption on Modal (Grammar Rule 6.5)", () => {
      const decision = ElementGrammarEngine.evaluatePlusIcon({
        id: "modal_1",
        type: "Modal",
        bindings: [],
      });

      assert.equal(decision.visible, true);
      if (decision.visible) {
        const categories = decision.candidates.map((c) => c.category);
        // Subsumes bare Entrance / Exit
        assert.ok(!categories.includes("Entrance"), "Modal cannot have bare Entrance");
        assert.ok(!categories.includes("Exit"), "Modal cannot have bare Exit");
        assert.ok(categories.includes("StateTransition"), "Modal must offer StateTransition");
      }
    });

    it("enforces Physical-Event Merge on Checkbox (Grammar Rule 6.3)", () => {
      const decision = ElementGrammarEngine.evaluatePlusIcon({
        id: "chk_1",
        type: "Checkbox",
        bindings: [],
      });

      assert.equal(decision.visible, true);
      if (decision.visible) {
        const categories = decision.candidates.map((c) => c.category);
        assert.ok(!categories.includes("Press"), "Checkbox merges Press into StateTransition");
        assert.ok(categories.includes("StateTransition"));
      }
    });
  });

  describe("Conflict Resolution Grammar (§6)", () => {
    it("rejects duplicate binding on identical trigger and property (Rule 6.1)", () => {
      const existing: AnimationBinding[] = [
        {
          id: "b_hover_y",
          targetElementId: "card_1",
          category: "Hover",
          trigger: "OnHoverEnter",
          properties: ["transform.y", "transform.scale"],
          priority: 0,
        },
      ];

      const conflictingCandidate = {
        category: "Hover" as const,
        defaultTrigger: "OnHoverEnter" as const,
        suggestedProperties: ["transform.y", "transform.scale"],
        description: "Conflicting hover",
      };

      const hasConflict = ElementGrammarEngine.conflictsWithExisting(
        conflictingCandidate,
        existing
      );
      assert.equal(hasConflict, true);
    });

    it("allows different categories on different properties or triggers", () => {
      const existing: AnimationBinding[] = [
        {
          id: "b_load",
          targetElementId: "btn_1",
          category: "Entrance",
          trigger: "OnLoad",
          properties: ["opacity"],
          priority: 0,
        },
      ];

      const nonConflicting = {
        category: "Hover" as const,
        defaultTrigger: "OnHoverEnter" as const,
        suggestedProperties: ["transform.scale"],
        description: "Hover scale",
      };

      const hasConflict = ElementGrammarEngine.conflictsWithExisting(
        nonConflicting,
        existing
      );
      assert.equal(hasConflict, false);
    });

    it("resolves cross-category priority order: Focus > Press > Hover > Ambient (Rule 6.2)", () => {
      const ambientBinding: AnimationBinding = {
        id: "b_amb",
        targetElementId: "btn_1",
        category: "Ambient",
        trigger: "Ambient",
        properties: ["transform.y"],
        priority: 0,
      };

      const hoverBinding: AnimationBinding = {
        id: "b_hov",
        targetElementId: "btn_1",
        category: "Hover",
        trigger: "OnHoverEnter",
        properties: ["transform.y"],
        priority: 0,
      };

      const pressBinding: AnimationBinding = {
        id: "b_prs",
        targetElementId: "btn_1",
        category: "Press",
        trigger: "OnPress",
        properties: ["transform.y"],
        priority: 0,
      };

      // Hover outranks Ambient
      const winner1 = ElementGrammarEngine.resolveWinningBinding([ambientBinding, hoverBinding]);
      assert.equal(winner1?.category, "Hover");

      // Press outranks Hover
      const winner2 = ElementGrammarEngine.resolveWinningBinding([hoverBinding, pressBinding]);
      assert.equal(winner2?.category, "Press");
    });
  });

  describe("Universal Reduced Motion Protocol (§9)", () => {
    it("strips spatial translation and scales down duration on reduced motion", () => {
      const standardBinding: AnimationBinding = {
        id: "b_ent",
        targetElementId: "card_1",
        category: "Entrance",
        trigger: "OnLoad",
        properties: ["transform.y", "opacity"],
        priority: 0,
        timing: { duration: 600, delay: 200 },
        stagger: { delayStep: 80, orderMode: "row-major" },
      };

      const fallback = ElementGrammarEngine.applyReducedMotionFallback(standardBinding);
      assert.deepEqual(fallback.properties, ["opacity"]);
      assert.equal(fallback.timing?.delay, 0);
      assert.ok((fallback.timing?.duration || 0) <= 200);
      assert.equal(fallback.stagger?.delayStep, 0);
    });
  });
});
