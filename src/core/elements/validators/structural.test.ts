/**
 * ============================================================================
 * SUB-PHASE 3.3 VERIFICATION: STRUCTURAL FAMILY ARCHETYPE TEST SUITE
 * ============================================================================
 * Tests:
 * 1. createDefaultDivider satisfies schema and CONVENTIONS.md ID prefix elem_divider_
 * 2. Full divider.* surface (orientation, length, thickness, style, strokeDashoffset)
 * 3. createDefaultBackground satisfies schema and CONVENTIONS.md ID prefix elem_bg_
 * 4. Full background.* surface (type, gradientAngle, parallaxSpeed, blendMode, noiseOpacity)
 * 5. Infinite loop convention (repeat: -1) on ambient background animation
 * 6. createDefaultContainer satisfies schema and CONVENTIONS.md ID prefix elem_container_
 * 7. validateStructuralConfig enforces strict property contracts
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultDivider,
  createDefaultBackground,
  createDefaultContainer,
  validateStructuralConfig,
} from "../archetypes/structural";

describe("Sub-Phase 3.3: Structural Family (Divider, Background Layer, Container)", () => {
  describe("1. Divider Archetype Contract (CONVENTIONS.md §4.4)", () => {
    it("creates default divider with elem_divider_ ID prefix and structural family", () => {
      const divider = createDefaultDivider("Section Separator");
      assert.ok(divider.id.startsWith("elem_divider_"), `Expected elem_divider_ prefix, got ${divider.id}`);
      assert.strictEqual(divider.name, "Section Separator");
      assert.strictEqual(divider.family, "structural");
      assert.strictEqual(divider.archetype, "divider");
      assert.strictEqual(divider.tag, "hr");

      // Verify full divider.* surface
      assert.strictEqual(divider.properties.orientation, "horizontal");
      assert.strictEqual(divider.properties.length, 100);
      assert.strictEqual(divider.properties.thickness, 2);
      assert.strictEqual(divider.properties.style, "solid");
      assert.strictEqual(divider.properties.strokeDashoffset, 0);

      // Attached draw-in reveal
      assert.ok(divider.animationStack.length > 0);
      assert.strictEqual(divider.animationStack[0].type, "entrance");
    });
  });

  describe("2. Background Layer Archetype Contract (CONVENTIONS.md §4.4)", () => {
    it("creates default background with elem_bg_ ID prefix and ambient loop", () => {
      const bg = createDefaultBackground("Deep Space Gradient");
      assert.ok(bg.id.startsWith("elem_bg_"), `Expected elem_bg_ prefix, got ${bg.id}`);
      assert.strictEqual(bg.name, "Deep Space Gradient");
      assert.strictEqual(bg.family, "structural");
      assert.strictEqual(bg.archetype, "background");
      assert.strictEqual(bg.tag, "div");

      // Verify full background.* surface
      assert.strictEqual(bg.properties.type, "gradient");
      assert.ok(bg.properties.gradientStops.length >= 2);
      assert.strictEqual(bg.properties.gradientAngle, 135);
      assert.strictEqual(bg.properties.parallaxSpeed, 0.2);
      assert.strictEqual(bg.properties.blendMode, "normal");
      assert.strictEqual(bg.properties.noiseOpacity, 0.05);

      // Verify infinite-loop ambient track (repeat: -1) per SCHEMA_REFERENCE.md §4.3
      assert.ok(bg.animationStack.length > 0);
      assert.strictEqual(bg.animationStack[0].trigger, "ambient");
      assert.strictEqual(bg.animationStack[0].repeat, -1);
    });
  });

  describe("3. Container Archetype Contract", () => {
    it("creates default container with elem_container_ ID prefix", () => {
      const container = createDefaultContainer("Slot Wrapper");
      assert.ok(container.id.startsWith("elem_container_"), `Expected elem_container_ prefix, got ${container.id}`);
      assert.strictEqual(container.name, "Slot Wrapper");
      assert.strictEqual(container.family, "structural");
      assert.strictEqual(container.archetype, "container");
      assert.strictEqual(container.tag, "div");
      assert.strictEqual(container.properties.display, "flex");
      assert.strictEqual(container.properties.gap, 16);
    });
  });

  describe("4. Validation Logic", () => {
    it("validates correct divider configs and rejects out-of-bounds length", () => {
      const valid = validateStructuralConfig("divider", {
        length: 80,
        thickness: 2,
        style: "solid",
      });
      assert.strictEqual(valid.valid, true);

      const invalid = validateStructuralConfig("divider", {
        length: 250, // out of 0-100 range
        thickness: "two",
        style: "zig-zag",
      });
      assert.strictEqual(invalid.valid, false);
      assert.ok(invalid.errors.length >= 3);
    });

    it("validates correct background configs and rejects invalid background type", () => {
      const valid = validateStructuralConfig("background", {
        type: "gradient",
        parallaxSpeed: 0.5,
        gradientAngle: 45,
      });
      assert.strictEqual(valid.valid, true);

      const invalid = validateStructuralConfig("background", {
        type: "unsupported-lava-lamp",
        parallaxSpeed: "fast",
        gradientAngle: "north",
      });
      assert.strictEqual(invalid.valid, false);
      assert.strictEqual(invalid.errors.length, 3);
    });
  });
});
