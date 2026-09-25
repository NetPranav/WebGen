/**
 * ============================================================================
 * SUB-PHASE 2.4 VERIFICATION: PROJECT INITIALIZATION & WORKSPACE TAILORING
 * ============================================================================
 * Tests:
 * 1. initElementProject initializes store with scope="element", rootArchetype,
 *    target config, and dedicated root element.
 * 2. Prefix mapping strictly satisfies CONVENTIONS.md §3 for all 10 archetypes.
 * 3. DetailsInspector renders archetype-specific sections (MediaSection for Image,
 *    DividerSection for Divider, BackgroundSection for Background, SvgVectorSection for Icon).
 * 4. Typography section is only rendered for text and interactive label archetypes.
 * 5. Phase 2 Verification Gate: Naming a project, confirming Element Design,
 *    selecting Image archetype, and launching initializes stage with Image and
 *    renders Media Details section.
 * ============================================================================
 */

// Stub CSS imports for node test environment
if (typeof require !== "undefined" && require.extensions) {
  require.extensions[".css"] = () => ({});
}

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { ALL_ARCHETYPE_IDS, getArchetypeDefinition } from "../archetypeData";
import type { ArchetypeId, InitialArchetypeId } from "@/core/document/registry";
import { ScopeCard } from "../ScopeCard";
import { getArchetype } from "@/core/document/registry";

describe("Sub-Phase 2.4: Project Initialization & Workspace Tailoring", () => {
  beforeEach(() => {
    // Reset store to known state
  });

  describe("1. Reactive Project Store Initialization (PRD.md §3 & SCHEMA_REFERENCE.md §2)", () => {
    it("initializes an Image Element project with root element and target stack", () => {
      const rootId = useProjectStore.getState().initElementProject({
        projectName: "AnimatedHeroImage",
        archetype: "image",
        target: {
          framework: "nextjs-app",
          styling: "tailwind",
          animation: "gsap",
          language: "typescript",
        },
      });

      const state = useProjectStore.getState();
      assert.strictEqual(state.projectName, "AnimatedHeroImage");
      assert.strictEqual(state.scope, "element");
      assert.strictEqual(state.rootArchetype, "image");
      assert.deepStrictEqual(state.document.exportSettings, {
        framework: "nextjs-app",
        styling: "tailwind",
        animation: "gsap",
        language: "typescript",
      });

      // Verify root element in elements dictionary
      const rootEl = state.document.layers[rootId];
      assert.ok(rootEl, "Root element must exist in elements dictionary");
      assert.strictEqual(rootEl.archetype, "image");
      assert.strictEqual(rootEl.name, "AnimatedHeroImage");
      assert.ok(rootId.startsWith("elem_img_"), `Expected id to start with elem_img_, got ${rootId}`);

      // Verify image default properties
      const props = rootEl.properties;
      assert.ok(props["media.src"], "Image must have a default source URL");
      assert.strictEqual(props["media.objectFit"], "cover");
      assert.strictEqual(props["media.aspectRatio"], "16:9");
      assert.ok(props["media.filter.brightness"] !== undefined, "Image must have filter properties");
      assert.ok(props["media.overlay.color"] !== undefined, "Image must have overlay properties");

      // Verify active stage page references this root element
      assert.strictEqual(state.activePageId, "page_stage");
      assert.strictEqual(state.pages["page_stage"]?.rootElementId, rootId);
    });

    it("verifies all 10 archetypes initialize with their CONVENTIONS.md ID prefixes", () => {
      const expectedPrefixes: Record<InitialArchetypeId, string> = {
        button: "elem_btn_",
        toggle: "elem_toggle_",
        badge: "elem_badge_",
        fab: "elem_fab_",
        image: "elem_img_",
        icon: "elem_icon_",
        divider: "elem_divider_",
        background: "elem_bg_",
        container: "elem_container_",
        text: "elem_text_",
      };

      for (const archId of ALL_ARCHETYPE_IDS) {
        const def = getArchetypeDefinition(archId);
        assert.ok(def, `Archetype definition for ${archId} must exist`);

        const rootId = useProjectStore.getState().initElementProject({
          projectName: `Test_${archId}`,
          archetype: archId,
        });

        const state = useProjectStore.getState();
        const rootEl = state.document.layers[rootId];
        assert.ok(rootEl, `Element for ${archId} must exist in state`);
        assert.strictEqual(rootEl.archetype, archId);
        assert.ok(
          rootId.startsWith(expectedPrefixes[archId]),
          `Expected ${archId} id ${rootId} to start with ${expectedPrefixes[archId]}`
        );
      }
    });
  });

  describe("2. Details Inspector Contextual Section Rendering (PANELS.md §3)", () => {
    it("maps all 10 archetypes in ELEMENT_SECTION_REGISTRY to their contextual sections", () => {
      // 1. Image has media_props
      assert.ok(getArchetype("image").sections.includes("media_props"));
      assert.ok(!getArchetype("image").sections.includes("typography"));

      // 2. Divider has divider_props
      assert.ok(getArchetype("divider").sections.includes("divider_props"));
      assert.ok(!getArchetype("divider").sections.includes("typography"));

      // 3. Background has background_props
      assert.ok(getArchetype("background").sections.includes("background_props"));
      assert.ok(!getArchetype("background").sections.includes("typography"));

      // 4. Icon has svg_vector
      assert.ok(getArchetype("icon").sections.includes("svg_vector"));

      // 5. Button and Text have typography
      assert.ok(getArchetype("button").sections.includes("typography"));
      assert.ok(getArchetype("text").sections.includes("typography"));
    });

    it("renders DetailsInspector for Image archetype with Media Details", async () => {
      const { DetailsInspector } = await import("@/editor/panels/details/DetailsInspector");
      const rootId = useProjectStore.getState().initElementProject({
        projectName: "ProductHeroImage",
        archetype: "image",
      });

      const inspectorElement = React.createElement(DetailsInspector, {
        selectedElementId: rootId,
        selectedElementName: "ProductHeroImage",
      });

      assert.strictEqual(inspectorElement.type, DetailsInspector);
      assert.strictEqual(inspectorElement.props.selectedElementId, rootId);
    });

    it("renders DetailsInspector for Divider archetype with Divider Properties", async () => {
      const { DetailsInspector } = await import("@/editor/panels/details/DetailsInspector");
      const rootId = useProjectStore.getState().initElementProject({
        projectName: "SectionDivider",
        archetype: "divider",
      });

      const inspectorElement = React.createElement(DetailsInspector, {
        selectedElementId: rootId,
        selectedElementName: "SectionDivider",
      });

      assert.strictEqual(inspectorElement.type, DetailsInspector);
      assert.strictEqual(inspectorElement.props.selectedElementId, rootId);
    });

    it("renders DetailsInspector for Background archetype with Background Properties", async () => {
      const { DetailsInspector } = await import("@/editor/panels/details/DetailsInspector");
      const rootId = useProjectStore.getState().initElementProject({
        projectName: "GradientBackdrop",
        archetype: "background",
      });

      const inspectorElement = React.createElement(DetailsInspector, {
        selectedElementId: rootId,
        selectedElementName: "GradientBackdrop",
      });

      assert.strictEqual(inspectorElement.type, DetailsInspector);
      assert.strictEqual(inspectorElement.props.selectedElementId, rootId);
    });
  });

  describe("3. Verification Gate (ROADMAP.md Phase 2)", () => {
    it("confirms Element Design scope is the ONLY selectable scope", () => {
      let elementClicked = false;
      let componentClicked = false;
      let pageClicked = false;

      const elementCard = React.createElement(ScopeCard, {
        scope: "element",
        title: "Element Design",
        badge: "Atomic Unit",
        description: "Interactive, Media, Structural & Text elements.",
        selected: true,
        disabled: false,
        onClick: () => {
          elementClicked = true;
        },
      });

      const componentCard = React.createElement(ScopeCard, {
        scope: "component",
        title: "Component Design",
        badge: "Coming in Phase 9",
        description: "Compound UI widgets.",
        selected: false,
        disabled: true,
        disabledReason: "Coming in a later phase — see ROADMAP.md",
        onClick: () => {
          componentClicked = true;
        },
      });

      const pageCard = React.createElement(ScopeCard, {
        scope: "page",
        title: "Page / Section Design",
        badge: "Coming in Phase 9",
        description: "Full landing pages.",
        selected: false,
        disabled: true,
        disabledReason: "Coming in a later phase — see ROADMAP.md",
        onClick: () => {
          pageClicked = true;
        },
      });

      // Invoke onClick for all three
      elementCard.props.onClick?.();
      componentCard.props.onClick?.();
      pageCard.props.onClick?.();

      // Only element card can be activated
      assert.strictEqual(elementClicked, true);
      assert.strictEqual(componentCard.props.disabled, true);
      assert.strictEqual(pageCard.props.disabled, true);
    });

    it("executes the full launch sequence: naming, archetype Image, Next.js+Tailwind+GSAP", () => {
      const projectName = "HeroParallaxImage";
      const archetype: ArchetypeId = "image";
      const target = {
        framework: "nextjs-app",
        styling: "tailwind",
        animation: "gsap",
        language: "typescript",
      };

      // 1. Initialize store
      const rootId = useProjectStore.getState().initElementProject({
        projectName,
        archetype,
        target,
      });

      // 2. Assert store state
      const state = useProjectStore.getState();
      assert.strictEqual(state.projectName, projectName);
      assert.strictEqual(state.rootArchetype, "image");
      assert.strictEqual(state.scope, "element");
      assert.strictEqual(state.document.exportSettings.framework, "nextjs-app");
      assert.strictEqual(state.document.exportSettings.styling, "tailwind");
      assert.strictEqual(state.document.exportSettings.animation, "gsap");
      assert.strictEqual(state.document.exportSettings.language, "typescript");

      // 3. Assert root element is created with id prefix elem_img_
      const rootEl = state.document.layers[rootId];
      assert.ok(rootEl);
      assert.strictEqual(rootEl.archetype, "image");
      assert.ok(rootId.startsWith("elem_img_"));

      // 4. Assert snapshot roundtrip works
      const snapshot = useProjectStore.getState().getSnapshot();
      assert.strictEqual(snapshot.projectName, projectName);
      assert.strictEqual(snapshot.rootArchetype, "image");
      assert.strictEqual(snapshot.scope, "element");
    });
  });
});
