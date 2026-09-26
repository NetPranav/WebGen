"use client";

/**
 * ============================================================================
 * PHASE 8, SUB-PHASE 8.1/8.5 — CONDITIONAL (⚠️) & SUBSUMED (🔒) CATEGORY CELLS
 * ============================================================================
 * `ElementGrammarEngine.TYPE_REGISTRY` only ever recorded a category as
 * `allowed` or `blocked`. Grammar §9's compatibility matrix has two more
 * cell values it never modelled: ⚠️ conditional (promotion- or context-gated)
 * and 🔒 subsumed (merged into another category, never independently
 * bindable). That gap is exactly AUD-52 for the ⚠️/🔒 tier.
 *
 * This module is the single source of truth for those two tiers, transcribed
 * directly from grammar §9's matrix and §9.1's explanation of every ⚠️/🔒
 * cell. `getCategoryCompatibilityKind` is what `rules.canAdd` (index.ts)
 * consults instead of reading `TYPE_REGISTRY.allowedCategories` directly.
 * ============================================================================
 */

import { TYPE_REGISTRY } from "../engine/ElementGrammarEngine";
import type { AnimationCategory, GrammarElementType } from "../types/element-grammar";
import type { CategoryCompatibilityKind, ConditionalGateKind, PromotionContext } from "./types";

type Cell = [GrammarElementType, AnimationCategory];

/** Grammar §9.1's ⚠️ list, verbatim. */
const CONDITIONAL_CELLS: Array<{ cell: Cell; gate: ConditionalGateKind }> = [
  { cell: ["Icon", "Hover"], gate: "single-child-promotion" },
  { cell: ["Icon", "Press"], gate: "single-child-promotion" },
  { cell: ["Container", "Hover"], gate: "explicit-promotion" },
  { cell: ["Container", "Press"], gate: "explicit-promotion" },
  { cell: ["Container", "StateTransition"], gate: "explicit-promotion" },
  { cell: ["Card", "Press"], gate: "explicit-promotion" },
  { cell: ["Card", "Focus"], gate: "explicit-promotion" },
  { cell: ["Avatar", "Press"], gate: "single-child-promotion" },
  { cell: ["SVG", "Hover"], gate: "explicit-promotion" },
  { cell: ["SVG", "StateTransition"], gate: "explicit-promotion" },
  { cell: ["Checkbox", "Entrance"], gate: "stagger-context" },
  { cell: ["Checkbox", "Exit"], gate: "stagger-context" },
  { cell: ["Radio", "LayoutTransition"], gate: "group-indicator" },
];

/**
 * Grammar §9.1's one 🔒 cell that isn't already derivable from
 * `isClosedDefault` (6.5) or `pressMergesWithStateTransition` (6.3):
 * Slider's Hover is merged into its Dragging/Default StateTransition.
 */
const EXTRA_SUBSUMED_CELLS: Cell[] = [["Slider", "Hover"]];

function cellKey(type: GrammarElementType, category: AnimationCategory): string {
  return `${type}:${category}`;
}

const CONDITIONAL_BY_CELL = new Map<string, ConditionalGateKind>(
  CONDITIONAL_CELLS.map(({ cell, gate }) => [cellKey(...cell), gate])
);

const EXTRA_SUBSUMED = new Set<string>(EXTRA_SUBSUMED_CELLS.map((cell) => cellKey(...cell)));

/**
 * Resolves a cell's compatibility kind per grammar §9, layering the ⚠️/🔒
 * tiers on top of `TYPE_REGISTRY`'s allowed/blocked boolean split.
 */
export function getCategoryCompatibilityKind(
  type: GrammarElementType,
  category: AnimationCategory
): CategoryCompatibilityKind {
  const contract = TYPE_REGISTRY[type];
  if (!contract) return "blocked";

  const key = cellKey(type, category);

  // Subsumption (6.3, 6.5, and Slider's one-off) is checked before the
  // allowed/blocked split: a subsumed category is deliberately absent from
  // `allowedCategories` (it is never independently offered), which would
  // otherwise read as "blocked" rather than "merged into another category".
  if (EXTRA_SUBSUMED.has(key)) return "subsumed";

  if (contract.isClosedDefault && (category === "Entrance" || category === "Exit")) {
    return "subsumed";
  }

  if (contract.pressMergesWithStateTransition && category === "Press") {
    return "subsumed";
  }

  const conditionalGate = CONDITIONAL_BY_CELL.get(key);
  if (conditionalGate) return "conditional";

  const isAllowed = contract.allowedCategories.includes(category);
  return isAllowed ? "allowed" : "blocked";
}

export function getConditionalGate(
  type: GrammarElementType,
  category: AnimationCategory
): ConditionalGateKind | undefined {
  return CONDITIONAL_BY_CELL.get(cellKey(type, category));
}

/**
 * Evaluates whether a conditional (⚠️) cell's gate is satisfied for a given
 * authoring context. Cells that aren't conditional at all pass trivially
 * (there is nothing to gate); callers should still check
 * `getCategoryCompatibilityKind` first for `blocked`/`subsumed` cells.
 */
export function passesConditionalGate(
  type: GrammarElementType,
  category: AnimationCategory,
  context: PromotionContext = {}
): boolean {
  const gate = getConditionalGate(type, category);
  if (!gate) return true;

  switch (gate) {
    case "explicit-promotion":
      return Boolean(context.explicitPromotion);
    case "single-child-promotion":
      return Boolean(context.singleChildPromotion);
    case "stagger-context":
      // 7.2.4: legal only when this candidate would NOT inherit a parent Stagger.
      return !context.inheritsStagger;
    case "group-indicator":
      return Boolean(context.isGroupIndicatorBinding);
    default:
      return false;
  }
}
