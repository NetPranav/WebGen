/**
 * ============================================================================
 * SUB-PHASE 3.1 VERIFICATION: INTERACTIVE FAMILY ARCHETYPE TEST SUITE
 * ============================================================================
 * Tests:
 * 1. createDefaultButton satisfies schema and CONVENTIONS.md ID prefix elem_btn_
 * 2. createDefaultToggle satisfies schema and CONVENTIONS.md ID prefix elem_toggle_
 * 3. createDefaultBadge satisfies schema and CONVENTIONS.md ID prefix elem_badge_
 * 4. createDefaultFab satisfies schema and CONVENTIONS.md ID prefix elem_fab_
 * 5. validateInteractiveConfig enforces strict property contracts
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultButton,
  createDefaultToggle,
  createDefaultBadge,
  createDefaultFab,
  validateInteractiveConfig,
} from "../archetypes/interactive";

describe("Sub-Phase 3.1: Interactive Family (Button, Toggle, Badge, FAB)", () => {
  describe("1. Button Archetype Contract", () => {
    it("creates default button with elem_btn_ ID prefix and interactive family", () => {
      const btn = createDefaultButton("Checkout Now");
      assert.ok(btn.id.startsWith("elem_btn_"), `Expected elem_btn_ prefix, got ${btn.id}`);
      assert.strictEqual(btn.name, "Checkout Now");
      assert.strictEqual(btn.family, "interactive");
      assert.strictEqual(btn.archetype, "button");
      assert.strictEqual(btn.tag, "button");
      assert.strictEqual(btn.properties.label, "Checkout Now");
      assert.strictEqual(btn.properties.variant, "primary");
      assert.strictEqual(btn.properties.disabled, false);
      assert.ok(btn.animationStack.length > 0);
      assert.strictEqual(btn.animationStack[0].type, "hover");
    });
  });

  describe("2. Toggle Switch Archetype Contract", () => {
    it("creates default toggle with elem_toggle_ ID prefix and interactive family", () => {
      const toggle = createDefaultToggle("DarkModeToggle");
      assert.ok(toggle.id.startsWith("elem_toggle_"), `Expected elem_toggle_ prefix, got ${toggle.id}`);
      assert.strictEqual(toggle.name, "DarkModeToggle");
      assert.strictEqual(toggle.family, "interactive");
      assert.strictEqual(toggle.archetype, "toggle");
      assert.strictEqual(toggle.tag, "button");
      assert.strictEqual(toggle.properties.checked, false);
      assert.strictEqual(toggle.properties.activeColor, "#206859");
      assert.ok(toggle.animationStack.length > 0);
      assert.strictEqual(toggle.animationStack[0].type, "tap");
    });
  });

  describe("3. Badge / Chip Archetype Contract", () => {
    it("creates default badge with elem_badge_ ID prefix and interactive family", () => {
      const badge = createDefaultBadge("Beta Release");
      assert.ok(badge.id.startsWith("elem_badge_"), `Expected elem_badge_ prefix, got ${badge.id}`);
      assert.strictEqual(badge.name, "Beta Release");
      assert.strictEqual(badge.family, "interactive");
      assert.strictEqual(badge.archetype, "badge");
      assert.strictEqual(badge.tag, "span");
      assert.strictEqual(badge.properties.label, "Beta Release");
      assert.strictEqual(badge.properties.pillShape, true);
      assert.ok(badge.animationStack.length > 0);
      assert.strictEqual(badge.animationStack[0].type, "entrance");
    });
  });

  describe("4. Floating Action Button (FAB) Archetype Contract", () => {
    it("creates default FAB with elem_fab_ ID prefix and interactive family", () => {
      const fab = createDefaultFab("Add Note");
      assert.ok(fab.id.startsWith("elem_fab_"), `Expected elem_fab_ prefix, got ${fab.id}`);
      assert.strictEqual(fab.name, "Add Note");
      assert.strictEqual(fab.family, "interactive");
      assert.strictEqual(fab.archetype, "fab");
      assert.strictEqual(fab.tag, "button");
      assert.strictEqual(fab.properties.icon, "Plus");
      assert.strictEqual(fab.properties.elevation, "lg");
      assert.ok(fab.animationStack.length > 0);
      assert.strictEqual(fab.animationStack[0].type, "hover");
    });
  });

  describe("5. Validation Logic", () => {
    it("validates correct configs and catches invalid variants or missing fields", () => {
      const validBtn = validateInteractiveConfig("button", {
        label: "Submit",
        variant: "primary",
      });
      assert.strictEqual(validBtn.valid, true);

      const invalidBtn = validateInteractiveConfig("button", {
        label: 123,
        variant: "super-fancy-invalid",
      });
      assert.strictEqual(invalidBtn.valid, false);
      assert.ok(invalidBtn.errors.length >= 2);

      const validToggle = validateInteractiveConfig("toggle", {
        checked: true,
        activeColor: "#206859",
      });
      assert.strictEqual(validToggle.valid, true);
    });
  });
});
