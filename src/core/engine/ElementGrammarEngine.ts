"use client";

/**
 * ============================================================================
 * LAZYLAYOUT ELEMENT & ANIMATION GRAMMAR ENGINE
 * ============================================================================
 * Implements the runtime grammar validator and the "+" (Continue Hierarchy)
 * decision algorithm.
 * Direct implementation of:
 * - DOCS/Initial/lazylayout_element_grammer.md (Sections 6, 7, 8, 9)
 * - DOCS/Initial/ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md (§8, §9)
 * ============================================================================
 */

import {
  AnimationBinding,
  AnimationCategory,
  ElementTypeContract,
  GrammarElementType,
  GrammarStateName,
  ReducedMotionPolicy,
  StateTransitionEdge,
  TriggerType,
  CATEGORY_PRIORITY_ORDER,
} from "../types/element-grammar";
import { DiagnosticBus } from "./DiagnosticBus";

// ============================================================================
// 1. AUTHORITATIVE 32 ELEMENT TYPE CONTRACT REGISTRY (Grammar §3 & §9)
// ============================================================================

export const TYPE_REGISTRY: Record<GrammarElementType, ElementTypeContract> = {
  // 3.A Atomic Types
  Text: {
    type: "Text",
    category: "Atomic",
    canHaveChildren: false,
    defaultStateSet: ["Default"],
    extendedStates: ["Selected"],
    allowedCategories: ["Entrance", "Exit", "ScrollLinked", "Ambient", "Stagger"],
    blockedCategories: ["Press", "Focus", "StateTransition", "Hover", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    transitionGraph: [],
  },
  Icon: {
    type: "Icon",
    category: "Atomic",
    canHaveChildren: false,
    defaultStateSet: ["Default"],
    extendedStates: ["Hover", "Active"],
    allowedCategories: ["Entrance", "Exit", "Hover", "Press", "Ambient", "ScrollLinked", "Stagger"],
    blockedCategories: ["Focus", "StateTransition", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    transitionGraph: [],
  },
  Image: {
    type: "Image",
    category: "Atomic",
    canHaveChildren: false,
    defaultStateSet: ["Default", "Loading", "Error"],
    allowedCategories: ["Entrance", "Exit", "Hover", "ScrollLinked", "Ambient", "StateTransition", "Stagger"],
    blockedCategories: ["Press", "Focus", "LayoutTransition"],
    maxSimultaneousTracks: 4,
    transitionGraph: [
      { from: "Loading", to: "Default", description: "Image load reveal" },
      { from: "Loading", to: "Error", description: "Image load failure" },
    ],
  },
  Button: {
    type: "Button",
    category: "Atomic",
    canHaveChildren: true,
    maxNestingDepth: 1,
    defaultStateSet: ["Default", "Hover", "Active", "Focus", "Disabled"],
    extendedStates: ["Loading"],
    allowedCategories: [
      "Entrance",
      "Exit",
      "Hover",
      "Press",
      "Focus",
      "StateTransition",
      "Ambient",
      "ScrollLinked",
      "Stagger",
      "LayoutTransition",
    ],
    blockedCategories: [],
    maxSimultaneousTracks: 6,
    transitionGraph: [
      { from: "Default", to: "Hover" },
      { from: "Hover", to: "Active" },
      { from: "Active", to: "Default" },
      { from: "Default", to: "Loading" },
      { from: "Loading", to: "Default" },
    ],
  },
  Input: {
    type: "Input",
    category: "Atomic",
    canHaveChildren: true,
    maxNestingDepth: 1,
    defaultStateSet: ["Default", "Focus", "Disabled", "Error", "Empty"],
    extendedStates: ["Success"],
    allowedCategories: ["Entrance", "Exit", "Focus", "StateTransition", "Ambient", "Stagger"],
    blockedCategories: ["Hover", "Press", "ScrollLinked", "LayoutTransition"],
    maxSimultaneousTracks: 4,
    transitionGraph: [
      { from: "Empty", to: "Default" },
      { from: "Default", to: "Empty" },
      { from: "Default", to: "Focus" },
      { from: "Focus", to: "Default" },
      { from: "Default", to: "Error" },
      { from: "Default", to: "Success" },
    ],
  },
  Badge: {
    type: "Badge",
    category: "Atomic",
    canHaveChildren: true,
    maxNestingDepth: 1,
    defaultStateSet: ["Default"],
    extendedStates: ["Selected"],
    allowedCategories: ["Entrance", "Exit", "StateTransition", "Ambient", "Stagger"],
    blockedCategories: ["Hover", "Press", "Focus", "ScrollLinked", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    transitionGraph: [
      { from: "Default", to: "Selected" },
      { from: "Selected", to: "Default" },
    ],
  },
  Divider: {
    type: "Divider",
    category: "Atomic",
    canHaveChildren: false,
    defaultStateSet: ["Default"],
    allowedCategories: ["Entrance", "ScrollLinked", "Ambient"],
    blockedCategories: ["Exit", "Hover", "Press", "Focus", "StateTransition", "Stagger", "LayoutTransition"],
    maxSimultaneousTracks: 2,
    transitionGraph: [],
  },
  Avatar: {
    type: "Avatar",
    category: "Atomic",
    canHaveChildren: true,
    maxNestingDepth: 1,
    defaultStateSet: ["Default", "Loading"],
    extendedStates: ["Selected"],
    allowedCategories: ["Entrance", "Exit", "Hover", "Press", "StateTransition", "Stagger"],
    blockedCategories: ["Focus", "ScrollLinked", "Ambient", "LayoutTransition"],
    maxSimultaneousTracks: 4,
    transitionGraph: [
      { from: "Loading", to: "Default" },
      { from: "Default", to: "Selected" },
    ],
  },
  Link: {
    type: "Link",
    category: "Atomic",
    canHaveChildren: true,
    maxNestingDepth: 1,
    defaultStateSet: ["Default", "Hover", "Active", "Focus"],
    allowedCategories: ["Entrance", "Exit", "Hover", "Press", "Focus", "Ambient", "Stagger"],
    blockedCategories: ["ScrollLinked", "StateTransition", "LayoutTransition"],
    maxSimultaneousTracks: 4,
    transitionGraph: [],
  },
  Spinner: {
    type: "Spinner",
    category: "Atomic",
    canHaveChildren: false,
    defaultStateSet: ["Default"],
    allowedCategories: ["Ambient"],
    blockedCategories: ["Entrance", "Exit", "Hover", "Press", "Focus", "ScrollLinked", "StateTransition", "Stagger", "LayoutTransition"],
    maxSimultaneousTracks: 1,
    transitionGraph: [],
  },

  // 3.B Container Types
  Section: {
    type: "Section",
    category: "Container",
    canHaveChildren: true,
    defaultStateSet: ["Default"],
    allowedCategories: ["Entrance", "Exit", "ScrollLinked", "Ambient", "Stagger"],
    blockedCategories: ["Hover", "Press", "Focus", "StateTransition", "LayoutTransition"],
    maxSimultaneousTracks: 5,
    transitionGraph: [],
  },
  Container: {
    type: "Container",
    category: "Container",
    canHaveChildren: true,
    defaultStateSet: ["Default"],
    extendedStates: ["Hover", "Active"],
    allowedCategories: ["Entrance", "Exit", "Hover", "Press", "ScrollLinked", "Ambient", "LayoutTransition", "Stagger", "StateTransition"],
    blockedCategories: ["Focus"],
    maxSimultaneousTracks: 5,
    transitionGraph: [
      { from: "Default", to: "Hover" },
      { from: "Hover", to: "Active" },
    ],
  },
  Card: {
    type: "Card",
    category: "Container",
    canHaveChildren: true,
    defaultStateSet: ["Default", "Hover"],
    extendedStates: ["Selected", "Active"],
    allowedCategories: ["Entrance", "Exit", "Hover", "Press", "ScrollLinked", "Ambient", "StateTransition", "LayoutTransition", "Stagger"],
    blockedCategories: ["Focus"],
    maxSimultaneousTracks: 6,
    transitionGraph: [
      { from: "Default", to: "Hover" },
      { from: "Hover", to: "Selected" },
      { from: "Selected", to: "Default" },
    ],
  },
  Stack: {
    type: "Stack",
    category: "Container",
    canHaveChildren: true,
    defaultStateSet: ["Default"],
    allowedCategories: ["Entrance", "Exit", "Stagger", "LayoutTransition", "Ambient"],
    blockedCategories: ["Hover", "Press", "Focus", "StateTransition", "ScrollLinked"],
    maxSimultaneousTracks: 3,
    transitionGraph: [],
  },
  Grid: {
    type: "Grid",
    category: "Container",
    canHaveChildren: true,
    defaultStateSet: ["Default"],
    allowedCategories: ["Entrance", "Exit", "Stagger", "LayoutTransition", "ScrollLinked", "Ambient"],
    blockedCategories: ["Hover", "Press", "Focus", "StateTransition"],
    maxSimultaneousTracks: 4,
    transitionGraph: [],
  },
  Modal: {
    type: "Modal",
    category: "Container",
    canHaveChildren: true,
    defaultStateSet: ["Closed", "Open"],
    extendedStates: ["Loading"],
    allowedCategories: ["StateTransition", "Ambient", "Stagger"],
    blockedCategories: ["Hover", "Press", "Focus", "ScrollLinked", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    isClosedDefault: true,
    transitionGraph: [
      { from: "Closed", to: "Open", description: "Modal entrance reveal" },
      { from: "Open", to: "Closed", description: "Modal exit dismiss" },
      { from: "Open", to: "Loading" },
      { from: "Loading", to: "Open" },
    ],
  },
  Tooltip: {
    type: "Tooltip",
    category: "Container",
    canHaveChildren: true,
    maxNestingDepth: 3,
    defaultStateSet: ["Closed", "Open"],
    allowedCategories: ["StateTransition", "Ambient"],
    blockedCategories: ["Entrance", "Exit", "Hover", "Press", "Focus", "ScrollLinked", "Stagger", "LayoutTransition"],
    maxSimultaneousTracks: 2,
    isClosedDefault: true,
    transitionGraph: [
      { from: "Closed", to: "Open" },
      { from: "Open", to: "Closed" },
    ],
  },
  Accordion: {
    type: "Accordion",
    category: "Container",
    canHaveChildren: true,
    defaultStateSet: ["Closed", "Open"],
    extendedStates: ["Disabled"],
    allowedCategories: ["StateTransition", "LayoutTransition", "Stagger"],
    blockedCategories: ["Hover", "Press", "Focus", "ScrollLinked", "Ambient"],
    maxSimultaneousTracks: 3,
    isClosedDefault: true,
    transitionGraph: [
      { from: "Closed", to: "Open", description: "Expand panel height" },
      { from: "Open", to: "Closed", description: "Collapse panel height" },
    ],
  },

  // 3.C Structural Types
  Page: {
    type: "Page",
    category: "Structural",
    canHaveChildren: true,
    defaultStateSet: ["Default", "Loading"],
    allowedCategories: ["Entrance", "Exit", "Ambient", "Stagger"],
    blockedCategories: ["Hover", "Press", "Focus", "StateTransition", "ScrollLinked", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    transitionGraph: [
      { from: "Loading", to: "Default" },
    ],
  },
  Navbar: {
    type: "Navbar",
    category: "Structural",
    canHaveChildren: true,
    defaultStateSet: ["Default"],
    extendedStates: ["Scrolled"],
    allowedCategories: ["Entrance", "StateTransition", "ScrollLinked", "Stagger"],
    blockedCategories: ["Exit", "Hover", "Press", "Focus", "Ambient", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    transitionGraph: [
      { from: "Default", to: "Scrolled", description: "Shrink navbar on scroll" },
      { from: "Scrolled", to: "Default", description: "Restore navbar at page top" },
    ],
  },
  Footer: {
    type: "Footer",
    category: "Structural",
    canHaveChildren: true,
    defaultStateSet: ["Default"],
    allowedCategories: ["Entrance", "ScrollLinked", "Stagger"],
    blockedCategories: ["Exit", "Hover", "Press", "Focus", "StateTransition", "Ambient", "LayoutTransition"],
    maxSimultaneousTracks: 2,
    transitionGraph: [],
  },
  Slot: {
    type: "Slot",
    category: "Structural",
    canHaveChildren: true,
    maxNestingDepth: 1,
    defaultStateSet: ["Empty", "Filled"],
    allowedCategories: ["StateTransition"],
    blockedCategories: ["Entrance", "Exit", "Hover", "Press", "Focus", "ScrollLinked", "Ambient", "Stagger", "LayoutTransition"],
    maxSimultaneousTracks: 1,
    transitionGraph: [
      { from: "Empty", to: "Filled" },
      { from: "Filled", to: "Empty" },
    ],
  },

  // 3.D Interactive / Compound Types
  Form: {
    type: "Form",
    category: "Interactive",
    canHaveChildren: true,
    defaultStateSet: ["Default", "Submitting", "Success", "Error"],
    allowedCategories: ["StateTransition", "Stagger", "Entrance", "Exit"],
    blockedCategories: ["Hover", "Press", "Focus", "ScrollLinked", "Ambient", "LayoutTransition"],
    maxSimultaneousTracks: 4,
    transitionGraph: [
      { from: "Default", to: "Submitting" },
      { from: "Submitting", to: "Success" },
      { from: "Submitting", to: "Error" },
      { from: "Success", to: "Default" },
      { from: "Error", to: "Default" },
    ],
  },
  Dropdown: {
    type: "Dropdown",
    category: "Interactive",
    canHaveChildren: true,
    defaultStateSet: ["Closed", "Open", "Disabled"],
    allowedCategories: ["StateTransition", "Stagger"],
    blockedCategories: ["Hover", "Press", "Focus", "ScrollLinked", "Ambient", "Entrance", "Exit", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    isClosedDefault: true,
    transitionGraph: [
      { from: "Closed", to: "Open" },
      { from: "Open", to: "Closed" },
    ],
  },
  Checkbox: {
    type: "Checkbox",
    category: "Interactive",
    canHaveChildren: true,
    maxNestingDepth: 1,
    defaultStateSet: ["Unchecked", "Checked", "Disabled"],
    extendedStates: ["Indeterminate"],
    allowedCategories: ["StateTransition", "Hover", "Focus", "Entrance", "Exit", "Stagger"],
    blockedCategories: ["Press", "ScrollLinked", "Ambient", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    pressMergesWithStateTransition: true,
    transitionGraph: [
      { from: "Unchecked", to: "Checked", description: "Checkmark reveal" },
      { from: "Checked", to: "Unchecked", description: "Checkmark hide" },
    ],
  },
  Radio: {
    type: "Radio",
    category: "Interactive",
    canHaveChildren: true,
    maxNestingDepth: 2,
    defaultStateSet: ["NoSelection", "HasSelection", "Disabled"],
    allowedCategories: ["StateTransition", "Stagger", "LayoutTransition"],
    blockedCategories: ["Hover", "Press", "Focus", "ScrollLinked", "Ambient", "Entrance", "Exit"],
    maxSimultaneousTracks: 3,
    transitionGraph: [
      { from: "NoSelection", to: "HasSelection" },
      { from: "HasSelection", to: "HasSelection", description: "Indicator slide between options" },
    ],
  },
  Switch: {
    type: "Switch",
    category: "Interactive",
    canHaveChildren: false,
    defaultStateSet: ["Off", "On", "Disabled"],
    allowedCategories: ["StateTransition", "Focus", "Stagger"],
    blockedCategories: ["Hover", "Press", "Entrance", "Exit", "ScrollLinked", "Ambient", "LayoutTransition"],
    maxSimultaneousTracks: 2,
    pressMergesWithStateTransition: true,
    transitionGraph: [
      { from: "Off", to: "On", description: "Glide thumb to right" },
      { from: "On", to: "Off", description: "Glide thumb to left" },
    ],
  },
  Slider: {
    type: "Slider",
    category: "Interactive",
    canHaveChildren: false,
    defaultStateSet: ["Default", "Dragging", "Focus", "Disabled"],
    allowedCategories: ["StateTransition", "Focus"],
    blockedCategories: ["Hover", "Press", "Entrance", "Exit", "ScrollLinked", "Ambient", "Stagger", "LayoutTransition"],
    maxSimultaneousTracks: 2,
    transitionGraph: [
      { from: "Default", to: "Dragging" },
      { from: "Dragging", to: "Default" },
    ],
  },
  Tabs: {
    type: "Tabs",
    category: "Interactive",
    canHaveChildren: true,
    defaultStateSet: ["ActiveIndex"],
    allowedCategories: ["StateTransition", "Stagger"],
    blockedCategories: ["Hover", "Press", "Focus", "ScrollLinked", "Ambient", "Entrance", "Exit", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    transitionGraph: [
      { from: "ActiveIndex", to: "ActiveIndex", description: "Indicator slide + panel cross-fade" },
    ],
  },

  // 3.E Media Types
  Video: {
    type: "Video",
    category: "Media",
    canHaveChildren: true,
    maxNestingDepth: 1,
    defaultStateSet: ["Paused", "Playing", "Loading", "Ended"],
    allowedCategories: ["Entrance", "Exit", "StateTransition", "ScrollLinked", "Ambient", "Stagger"],
    blockedCategories: ["Hover", "Press", "Focus", "LayoutTransition"],
    maxSimultaneousTracks: 4,
    transitionGraph: [
      { from: "Loading", to: "Paused" },
      { from: "Paused", to: "Playing" },
      { from: "Playing", to: "Paused" },
      { from: "Playing", to: "Ended" },
    ],
  },
  SVG: {
    type: "SVG",
    category: "Media",
    canHaveChildren: true,
    defaultStateSet: ["Default"],
    extendedStates: ["Hover", "Active"],
    allowedCategories: ["Entrance", "Exit", "Hover", "ScrollLinked", "Ambient", "StateTransition", "Stagger"],
    blockedCategories: ["Press", "Focus", "LayoutTransition"],
    maxSimultaneousTracks: 4,
    transitionGraph: [],
  },
  Canvas: {
    type: "Canvas",
    category: "Media",
    canHaveChildren: false,
    defaultStateSet: ["Default", "Loading"],
    allowedCategories: ["Entrance", "Exit", "ScrollLinked", "Ambient"],
    blockedCategories: ["Hover", "Press", "Focus", "StateTransition", "Stagger", "LayoutTransition"],
    maxSimultaneousTracks: 3,
    transitionGraph: [
      { from: "Loading", to: "Default" },
    ],
  },
};

// ============================================================================
// 2. THE "+" ICON DECISION EVALUATOR (Grammar Section 8)
// ============================================================================

export interface CandidateBindingOffer {
  category: AnimationCategory;
  defaultTrigger: TriggerType;
  suggestedProperties: string[];
  description: string;
  fromState?: GrammarStateName;
  toState?: GrammarStateName;
}

export type PlusIconDecision =
  | { visible: false; reason: string; candidates?: undefined }
  | { visible: true; candidates: CandidateBindingOffer[]; reason?: undefined };

export interface EvaluatedElement {
  id: string;
  type: GrammarElementType;
  bindings: AnimationBinding[];
  isPromotedInteractive?: boolean; // Grammar §7.3.1
  hasInFlightTransition?: boolean; // Grammar §6.7
}

export class ElementGrammarEngineService {
  /**
   * Evaluates whether the "+" (Add Animation) icon appears on an element
   * and builds the legal candidate list per Section 8 of lazylayout_element_grammer.md.
   */
  public evaluatePlusIcon(element: EvaluatedElement): PlusIconDecision {
    const contract = TYPE_REGISTRY[element.type];
    if (!contract) {
      return { visible: false, reason: `Unknown element type: ${element.type}` };
    }

    // Step 1 — Type-level hard gate
    if (contract.allowedCategories.length === 0) {
      return { visible: false, reason: "Element type allows no animation categories." };
    }

    // Step 2 — In-flight lock (Section 6.7)
    if (element.hasInFlightTransition) {
      return { visible: false, reason: "Element has an in-flight StateTransition actively playing." };
    }

    // Step 3 — Track capacity
    if (element.bindings.length >= contract.maxSimultaneousTracks) {
      return {
        visible: false,
        reason: `Maximum simultaneous track capacity (${contract.maxSimultaneousTracks}) reached.`,
      };
    }

    // Step 4 — Build candidates: enumerate valid categories that don't conflict
    const candidates: CandidateBindingOffer[] = [];

    for (const category of contract.allowedCategories) {
      const offers = this.enumerateCategoryOffers(category, contract, element);
      for (const offer of offers) {
        if (!this.conflictsWithExisting(offer, element.bindings)) {
          candidates.push(offer);
        }
      }
    }

    // Step 5 — Transition-bound category subsumption (Grammar §6.5)
    let filteredCandidates = candidates;
    if (contract.isClosedDefault) {
      // Subsume bare Entrance / Exit into Open/Closed transitions
      filteredCandidates = filteredCandidates.filter(
        (c) => c.category !== "Entrance" && c.category !== "Exit"
      );
    }

    // Step 6 — Physical-event merge (Grammar §6.3)
    if (contract.pressMergesWithStateTransition) {
      filteredCandidates = filteredCandidates.filter((c) => c.category !== "Press");
    }

    // Step 7 — Empty result check
    if (filteredCandidates.length === 0) {
      return { visible: false, reason: "All allowed categories or property slots are occupied." };
    }

    return {
      visible: true,
      candidates: filteredCandidates,
    };
  }

  /**
   * Enumerates template candidate offers for a category on a given type.
   */
  private enumerateCategoryOffers(
    category: AnimationCategory,
    contract: ElementTypeContract,
    element: EvaluatedElement
  ): CandidateBindingOffer[] {
    switch (category) {
      case "Entrance":
        return [
          {
            category: "Entrance",
            defaultTrigger: "OnLoad",
            suggestedProperties: ["transform.y", "appearance.opacity"],
            description: "Fade and slide into view on page load",
          },
          {
            category: "Entrance",
            defaultTrigger: "OnScrollEnter",
            suggestedProperties: ["transform.y", "appearance.opacity"],
            description: "Reveal element when scrolled into viewport",
          },
        ];
      case "Exit":
        return [
          {
            category: "Exit",
            defaultTrigger: "OnScrollExit",
            suggestedProperties: ["transform.y", "appearance.opacity"],
            description: "Animate out when leaving viewport",
          },
        ];
      case "Hover":
        return [
          {
            category: "Hover",
            defaultTrigger: "OnHoverEnter",
            suggestedProperties: ["transform.y", "transform.scale", "boxShadow"],
            description: "Lift and elevate on pointer hover",
          },
        ];
      case "Press":
        return [
          {
            category: "Press",
            defaultTrigger: "OnPress",
            suggestedProperties: ["transform.scale"],
            description: "Tactile spring scale-down on click/tap",
          },
        ];
      case "Focus":
        return [
          {
            category: "Focus",
            defaultTrigger: "OnFocus",
            suggestedProperties: ["boxShadow", "borderColor"],
            description: "High-contrast focus ring for keyboard navigation",
          },
        ];
      case "ScrollLinked":
        return [
          {
            category: "ScrollLinked",
            defaultTrigger: "OnScrollScrub",
            suggestedProperties: ["transform.y"],
            description: "Continuous parallax position scrubbed to scroll",
          },
        ];
      case "Ambient":
        return [
          {
            category: "Ambient",
            defaultTrigger: "Ambient",
            suggestedProperties: ["transform.y"],
            description: "Gentle continuous floating loop",
          },
        ];
      case "StateTransition":
        return contract.transitionGraph.map((edge) => ({
          category: "StateTransition",
          defaultTrigger: "OnStateChange",
          suggestedProperties: ["appearance.opacity", "transform.scale"],
          description: edge.description || `Transition from ${edge.from} to ${edge.to}`,
          fromState: edge.from,
          toState: edge.to,
        }));
      case "Stagger":
        return [
          {
            category: "Stagger",
            defaultTrigger: "OnScrollEnter",
            suggestedProperties: ["transform.y", "appearance.opacity"],
            description: "Orchestrate sequential delays across direct children",
          },
        ];
      case "LayoutTransition":
        return [
          {
            category: "LayoutTransition",
            defaultTrigger: "OnStateChange",
            suggestedProperties: ["transform.x", "transform.y"],
            description: "Smooth FLIP reflow when siblings change size or reorder",
          },
        ];
      default:
        return [];
    }
  }

  /**
   * Conflict Detection Algorithm per Grammar §6.1 & §6.8
   */
  public conflictsWithExisting(
    candidate: CandidateBindingOffer,
    existingBindings: AnimationBinding[]
  ): boolean {
    for (const existing of existingBindings) {
      // Rule 6.1: Same Trigger + Shared Property = HARD REJECTION
      if (existing.trigger === candidate.defaultTrigger) {
        const shared = candidate.suggestedProperties.some((p) =>
          existing.properties.includes(p)
        );
        if (shared) {
          // If all suggested properties are occupied by the same trigger, reject offer
          const allOccupied = candidate.suggestedProperties.every((p) =>
            existing.properties.includes(p)
          );
          if (allOccupied) return true;
        }
      }

      // Rule 6.8: Duplicate StateTransition on the same edge
      if (
        candidate.category === "StateTransition" &&
        existing.category === "StateTransition" &&
        candidate.fromState === existing.fromState &&
        candidate.toState === existing.toState
      ) {
        const sharedProp = candidate.suggestedProperties.some((p) =>
          existing.properties.includes(p)
        );
        if (sharedProp) return true;
      }

      // Rule 6.8: LayoutTransition + ScrollLinked on same property
      if (
        (candidate.category === "LayoutTransition" && existing.category === "ScrollLinked") ||
        (candidate.category === "ScrollLinked" && existing.category === "LayoutTransition")
      ) {
        const shared = candidate.suggestedProperties.some((p) =>
          existing.properties.includes(p)
        );
        if (shared) return true;
      }
    }

    return false;
  }

  /**
   * Resolves Cross-Category Priority Order (§6.2).
   * Determines which category's value wins at any instant two categories
   * target the same property.
   * Priority: Focus > Press > Hover > StateTransition > ScrollLinked > Entrance > Exit > Ambient
   */
  public resolveWinningBinding(bindings: AnimationBinding[]): AnimationBinding | null {
    if (bindings.length === 0) return null;
    if (bindings.length === 1) return bindings[0];

    // Sort by priority order index (lower index = higher priority)
    const sorted = [...bindings].sort((a, b) => {
      const idxA = CATEGORY_PRIORITY_ORDER.indexOf(a.category);
      const idxB = CATEGORY_PRIORITY_ORDER.indexOf(b.category);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    return sorted[0];
  }

  /**
   * Evaluates Universal Reduced Motion (§9).
   */
  public evaluateReducedMotion(
    policy: ReducedMotionPolicy,
    osPrefersReduced: boolean
  ): boolean {
    if (policy === "ignore-os") return false;
    if (policy === "reduce") return true;
    return osPrefersReduced;
  }

  /**
   * Applies graceful reduced-motion fallbacks per §9.3.
   */
  public applyReducedMotionFallback(binding: AnimationBinding): AnimationBinding {
    const strippedProps = binding.properties.filter(
      (p) => !p.startsWith("transform.") && p !== "scale" && p !== "rotate"
    );

    // If all properties were spatial transforms, replace with opacity
    const finalProps = strippedProps.length > 0 ? strippedProps : ["appearance.opacity"];

    return {
      ...binding,
      properties: finalProps,
      timing: {
        ...binding.timing,
        duration: Math.min(binding.timing?.duration || 200, 200),
        delay: 0,
      },
      stagger: binding.stagger
        ? { ...binding.stagger, delayStep: 0 }
        : undefined,
    };
  }
}

export const ElementGrammarEngine = new ElementGrammarEngineService();
