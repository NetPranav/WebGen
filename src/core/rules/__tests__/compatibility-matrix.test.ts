/**
 * Phase 8 Verification Gate (partial): grammar §9's full compatibility
 * matrix — all 32 Element Types × all 10 Animation Categories, 320 cells —
 * converted into a table-driven test, transcribed directly from
 * `DOCS/Initial/lazylayout_element_grammer.md` §9. Every cell is asserted;
 * none are inferred or skipped.
 *
 * Rows use single-letter codes rather than the doc's ✅❌⚠️🔒 glyphs: ⚠️ is
 * two Unicode code points (U+26A0 + the variation selector U+FE0F), which
 * would silently misalign a naive `Array.from(row)` split.
 *   A = allowed (✅) · B = blocked (❌) · C = conditional (⚠️) · S = subsumed (🔒)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCategoryCompatibilityKind } from "../conditional-gates";
import type { AnimationCategory, GrammarElementType } from "../../types/element-grammar";
import type { CategoryCompatibilityKind } from "../types";

// Column order matches grammar §9's table exactly.
const CATEGORY_COLUMNS: AnimationCategory[] = [
  "Entrance",
  "Exit",
  "Hover",
  "Press",
  "Focus",
  "ScrollLinked",
  "Ambient",
  "StateTransition",
  "Stagger",
  "LayoutTransition",
];

const CODE_TO_KIND: Record<string, CategoryCompatibilityKind> = {
  A: "allowed",
  B: "blocked",
  C: "conditional",
  S: "subsumed",
};

// Transcribed row-for-row from grammar §9's matrix (3.A.1 through 3.E.3).
const MATRIX: Array<[GrammarElementType, string]> = [
  ["Text", "AABBBAABAB"],
  ["Icon", "AACCBAABAB"],
  ["Image", "AAABBAAAAB"],
  ["Button", "AAAAAAAAAA"],
  ["Input", "AABBABAAAB"],
  ["Badge", "AABBBBAAAB"],
  ["Divider", "ABBBBAABBB"],
  ["Avatar", "AAACBBBAAB"],
  ["Link", "AAAAABABAB"],
  ["Spinner", "BBBBBBABBB"],
  ["Section", "AABBBAABAB"],
  ["Container", "AACCBAACAA"],
  ["Card", "AAACCAAAAA"],
  ["Stack", "AABBBBABAA"],
  ["Grid", "AABBBAABAA"],
  ["Modal", "SSBBBBAAAB"],
  ["Tooltip", "SSBBBBAABB"],
  ["Accordion", "SSBBBBBAAA"],
  ["Page", "AABBBBABAB"],
  ["Navbar", "ABBBBABAAB"],
  ["Footer", "ABBBBABBAB"],
  ["Slot", "BBBBBBBABB"],
  ["Form", "AABBBBBAAB"],
  ["Dropdown", "SSBBBBBAAB"],
  ["Checkbox", "CCASABBAAB"],
  ["Radio", "BBBBBBBAAC"],
  ["Switch", "BBBSABBAAB"],
  ["Slider", "BBSBABBABB"],
  ["Tabs", "BBBBBBBAAB"],
  ["Video", "AABBBAAAAB"],
  ["SVG", "AACBBAACAB"],
  ["Canvas", "AABBBAABBB"],
];

describe("Phase 8 Verification Gate: grammar §9 full compatibility matrix", () => {
  for (const [type, row] of MATRIX) {
    const codes = row.split("");
    assert.equal(codes.length, 10, `${type}'s transcribed row must have exactly 10 cells`);

    codes.forEach((code, i) => {
      const category = CATEGORY_COLUMNS[i];
      const expected = CODE_TO_KIND[code];
      it(`${type} × ${category} = ${expected}`, () => {
        assert.equal(getCategoryCompatibilityKind(type, category), expected);
      });
    });
  }

  it("covers all 32 element types", () => {
    assert.equal(MATRIX.length, 32);
  });
});

// ============================================================================
// v0.2 (Phase 8.1 growth): grammar §13.5's Reactive column for the v0.1 types,
// and §13.6's full 11-column matrix for the 7 new 3.F Effect Surface types.
// ============================================================================

// Transcribed from grammar §13.5, in the same row order as MATRIX above.
const REACTIVE_COLUMN: Array<[GrammarElementType, string]> = [
  ["Text", "A"],
  ["Icon", "A"],
  ["Image", "A"],
  ["Button", "A"],
  ["Input", "C"],
  ["Badge", "C"],
  ["Divider", "A"],
  ["Avatar", "A"],
  ["Link", "A"],
  ["Spinner", "B"],
  ["Section", "C"],
  ["Container", "C"],
  ["Card", "A"],
  ["Stack", "B"],
  ["Grid", "B"],
  ["Modal", "B"],
  ["Tooltip", "B"],
  ["Accordion", "B"],
  ["Page", "B"],
  ["Navbar", "B"],
  ["Footer", "B"],
  ["Slot", "B"],
  ["Form", "B"],
  ["Dropdown", "B"],
  ["Checkbox", "B"],
  ["Radio", "B"],
  ["Switch", "B"],
  ["Slider", "B"],
  ["Tabs", "C"],
  ["Video", "A"],
  ["SVG", "A"],
  ["Canvas", "C"],
];

describe("Phase 8 Verification Gate: grammar §13.5 Reactive column (v0.2)", () => {
  for (const [type, code] of REACTIVE_COLUMN) {
    const expected = CODE_TO_KIND[code];
    it(`${type} × Reactive = ${expected}`, () => {
      assert.equal(getCategoryCompatibilityKind(type, "Reactive"), expected);
    });
  }

  it("covers all 32 v0.1 element types", () => {
    assert.equal(REACTIVE_COLUMN.length, 32);
  });
});

// Column order matches grammar §13.6 exactly: the §9 columns, plus Reactive.
const EFFECT_CATEGORY_COLUMNS: AnimationCategory[] = [...CATEGORY_COLUMNS, "Reactive"];

// Transcribed row-for-row from grammar §13.6 (3.F.1 through 3.F.7).
const EFFECT_MATRIX: Array<[GrammarElementType, string]> = [
  ["EffectSurface", "AABBBAAABB"],
  ["ShaderLayer", "AACCBAAAAB"],
  ["ParticleSystem", "AABBBAAABB"],
  ["SimulationLayer", "AABBBAAABB"],
  ["CursorLayer", "BBBBBBAABB"],
  ["TextureSource", "BBBBBBBBBB"],
  ["CodeComponent", "AACCCAACAB"],
];

describe("Phase 8 Verification Gate: grammar §13.6 compatibility matrix for the 3.F types (v0.2)", () => {
  for (const [type, row] of EFFECT_MATRIX) {
    const codes = row.split("");
    assert.equal(codes.length, 10, `${type}'s transcribed row must have exactly 10 §9-column cells (Reactive is appended separately)`);

    codes.forEach((code, i) => {
      const category = CATEGORY_COLUMNS[i];
      const expected = CODE_TO_KIND[code];
      it(`${type} × ${category} = ${expected}`, () => {
        assert.equal(getCategoryCompatibilityKind(type, category), expected);
      });
    });
  }

  it("covers all 7 Effect Surface types", () => {
    assert.equal(EFFECT_MATRIX.length, 7);
    assert.equal(EFFECT_CATEGORY_COLUMNS.length, 11);
  });
});

// The Reactive cell for each 3.F type (the 11th column of §13.6, listed separately above each row's text there).
const EFFECT_REACTIVE_COLUMN: Array<[GrammarElementType, string]> = [
  ["EffectSurface", "A"],
  ["ShaderLayer", "A"],
  ["ParticleSystem", "A"],
  ["SimulationLayer", "A"],
  ["CursorLayer", "A"],
  ["TextureSource", "B"],
  ["CodeComponent", "A"],
];

describe("Phase 8 Verification Gate: grammar §13.6 Reactive column for the 3.F types (v0.2)", () => {
  for (const [type, code] of EFFECT_REACTIVE_COLUMN) {
    const expected = CODE_TO_KIND[code];
    it(`${type} × Reactive = ${expected}`, () => {
      assert.equal(getCategoryCompatibilityKind(type, "Reactive"), expected);
    });
  }
});
