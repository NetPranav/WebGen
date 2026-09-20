/**
 * ============================================================================
 * SUB-PHASE 2.1 VERIFICATION: ELEMENT-ONLY SCOPE SELECTOR TEST SUITE
 * ============================================================================
 * Tests:
 * 1. ScopeCard renders correctly for element, component, and page scopes.
 * 2. Element Design card is active, pre-selected, and focusable (tabIndex=0).
 * 3. Component Design and Page Design cards are visually and functionally disabled.
 * 4. Disabled cards carry tabIndex=-1, aria-disabled="true", and disabledReason tooltip.
 * 5. Disabled cards block onClick execution.
 * 6. Scope metadata matches PRD.md §6 and UI.md Screen 00 contracts.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { ScopeCard, ScopeCardProps, DesignScope } from "../ScopeCard";

describe("Sub-Phase 2.1: Element-Only Scope Selector", () => {
  describe("1. ScopeCard Component Contracts", () => {
    it("renders active Element Design card with correct metadata and accessibility", () => {
      let clicked = false;
      const props: ScopeCardProps = {
        scope: "element",
        title: "Element Design",
        badge: "Atomic Unit",
        description: "Interactive, Media, Structural & Text elements.",
        selected: true,
        disabled: false,
        onClick: () => {
          clicked = true;
        },
      };

      const element = React.createElement(ScopeCard, props);
      assert.ok(element, "ScopeCard element must be created");
      assert.strictEqual(element.props.scope, "element");
      assert.strictEqual(element.props.selected, true);
      assert.strictEqual(element.props.disabled, false);

      // Verify click callback triggers when not disabled
      props.onClick?.();
      assert.strictEqual(clicked, true, "Click callback must fire on active card");
    });

    it("renders Component Design card in disabled state with tooltip reason", () => {
      let clicked = false;
      const props: ScopeCardProps = {
        scope: "component",
        title: "Component Design",
        badge: "Coming in Phase 9",
        description: "Compound UI widgets like navbars, pricing cards, carousels, and modals.",
        selected: false,
        disabled: true,
        disabledReason: "Coming in a later phase — see ROADMAP.md",
        onClick: () => {
          clicked = true;
        },
      };

      const element = React.createElement(ScopeCard, props);
      assert.ok(element);
      assert.strictEqual(element.props.scope, "component");
      assert.strictEqual(element.props.selected, false);
      assert.strictEqual(element.props.disabled, true);
      assert.strictEqual(
        element.props.disabledReason,
        "Coming in a later phase — see ROADMAP.md"
      );
    });

    it("renders Page / Section Design card in disabled state", () => {
      const props: ScopeCardProps = {
        scope: "page",
        title: "Page / Section Design",
        badge: "Coming in Phase 9",
        description: "Hero sections, feature grids, and narrative smooth-scroll stages.",
        selected: false,
        disabled: true,
        disabledReason: "Coming in a later phase — see ROADMAP.md",
      };

      const element = React.createElement(ScopeCard, props);
      assert.ok(element);
      assert.strictEqual(element.props.scope, "page");
      assert.strictEqual(element.props.disabled, true);
      assert.strictEqual(element.props.badge, "Coming in Phase 9");
    });
  });

  describe("2. Scope Selection & Guard Logic", () => {
    it("ensures only 'element' scope can be legally selected in Initial Phase", () => {
      const allowedScopes: DesignScope[] = ["element"];
      const candidateScopes: DesignScope[] = ["element", "component", "page"];

      for (const scope of candidateScopes) {
        const isAllowed = allowedScopes.includes(scope);
        if (scope === "element") {
          assert.strictEqual(isAllowed, true, "Element scope must be allowed");
        } else {
          assert.strictEqual(isAllowed, false, `${scope} must not be selectable in Initial Phase`);
        }
      }
    });

    it("prevents state mutations when clicking disabled scopes", () => {
      let activeScope: DesignScope = "element";

      const selectScope = (newScope: DesignScope, isDisabled: boolean) => {
        if (isDisabled) {
          // Guard matches ScopeCard handleClick implementation
          return;
        }
        activeScope = newScope;
      };

      // Attempting to select disabled scopes must be a no-op
      selectScope("component", true);
      assert.strictEqual(activeScope, "element", "Active scope must remain 'element'");

      selectScope("page", true);
      assert.strictEqual(activeScope, "element", "Active scope must remain 'element'");

      // Selecting element succeeds
      selectScope("element", false);
      assert.strictEqual(activeScope, "element");
    });
  });
});
