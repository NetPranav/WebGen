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
