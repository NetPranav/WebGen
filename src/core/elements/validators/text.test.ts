/**
 * ============================================================================
 * SUB-PHASE 3.4 VERIFICATION: TEXT FAMILY ARCHETYPE TEST SUITE
 * ============================================================================
 * Tests:
 * 1. createDefaultText satisfies schema and CONVENTIONS.md ID prefix elem_text_
 * 2. Full typography.* surface and SplitText stagger authoring
 * 3. validateTextConfig enforces strict property contracts
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDefaultText, validateTextConfig } from "../archetypes/text";

describe("Sub-Phase 3.4: Text Family", () => {
  describe("1. Text / Label Archetype Contract (CONVENTIONS.md §4.2)", () => {
    it("creates default text with elem_text_ ID prefix and text family", () => {
      const text = createDefaultText("Hero Catchphrase");
      assert.ok(text.id.startsWith("elem_text_"), `Expected elem_text_ prefix, got ${text.id}`);
      assert.strictEqual(text.name, "Hero Catchphrase");
      assert.strictEqual(text.family, "text");
      assert.strictEqual(text.archetype, "text");
      assert.strictEqual(text.tag, "p");

      // Typography surface
      assert.ok(text.properties.textContent.length > 0);
      assert.strictEqual(text.properties.fontFamily, "Inter");
      assert.strictEqual(text.properties.fontSize, 32);
      assert.strictEqual(text.properties.fontWeight, "700");
      assert.strictEqual(text.properties.letterSpacing, -0.5);

      // GSAP SplitText Stagger
      assert.strictEqual(text.properties.splitText.enabled, true);
      assert.strictEqual(text.properties.splitText.mode, "chars");
      assert.strictEqual(text.properties.splitText.stagger, 0.03);
      assert.strictEqual(text.properties.splitText.staggerOrigin, "start");

      // Attached stagger reveal animation
      assert.ok(text.animationStack.length > 0);
      assert.strictEqual(text.animationStack[0].type, "entrance");
    });
  });

  describe("2. Validation Logic", () => {
    it("validates correct text configs and rejects bad split mode or font size", () => {
      const valid = validateTextConfig({
        textContent: "Hello World",
        fontSize: 16,
        splitText: { mode: "words" },
      });
      assert.strictEqual(valid.valid, true);

      const invalid = validateTextConfig({
        textContent: 12345,
        fontSize: -4,
        splitText: { mode: "paragraphs-not-supported" },
      });
      assert.strictEqual(invalid.valid, false);
      assert.strictEqual(invalid.errors.length, 3);
    });
  });
});
