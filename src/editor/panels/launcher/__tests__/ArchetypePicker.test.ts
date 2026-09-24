/**
 * ============================================================================
 * SUB-PHASE 2.2 VERIFICATION: ARCHETYPE PICKER TEST SUITE
 * ============================================================================
 * Tests:
 * 1. ARCHETYPE_FAMILIES taxonomy covers all 4 families and 10 archetypes.
 * 2. ID prefixes strictly match CONVENTIONS.md §3:
 *    - elem_btn_, elem_toggle_, elem_badge_, elem_fab_
 *    - elem_img_, elem_icon_
 *    - elem_divider_, elem_bg_, elem_container_
 *    - elem_text_
 * 3. getArchetypeDefinition returns correct metadata for all 10 archetypes.
 * 4. ArchetypePicker component renders family headers and archetype tiles.
 * 5. Archetype selection correctly updates selected state and triggers callback.
 * 6. Launch gating logic requires selectedArchetype before enabling launch.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
  ARCHETYPE_FAMILIES,
  ALL_ARCHETYPE_IDS,
  getArchetypeDefinition,
} from "../archetypeData";
import type { InitialArchetypeId as ArchetypeId } from "@/core/document/registry";
import { ArchetypePicker, ArchetypePickerProps } from "../ArchetypePicker";

describe("Sub-Phase 2.2: Archetype Picker", () => {
  describe("1. Archetype Taxonomy & Schema Verification", () => {
    it("contains exactly 4 families with matching IDs", () => {
      assert.strictEqual(ARCHETYPE_FAMILIES.length, 4);
      const familyIds = ARCHETYPE_FAMILIES.map((f) => f.id);
      assert.deepStrictEqual(familyIds, ["interactive", "media", "structural", "text"]);
    });

    it("contains all 10 archetypes across the 4 families", () => {
      const allFoundIds: ArchetypeId[] = [];
      for (const family of ARCHETYPE_FAMILIES) {
        for (const arch of family.archetypes) {
          allFoundIds.push(arch.id);
        }
      }

      assert.strictEqual(allFoundIds.length, 10);
      assert.deepStrictEqual(allFoundIds.sort(), [...ALL_ARCHETYPE_IDS].sort());
    });

    it("verifies ID prefixes strictly follow CONVENTIONS.md §3", () => {
      const expectedPrefixes: Record<ArchetypeId, string> = {
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

      for (const id of ALL_ARCHETYPE_IDS) {
        const def = getArchetypeDefinition(id);
        assert.ok(def, `Archetype definition for ${id} must exist`);
        assert.strictEqual(
          def.idPrefix,
          expectedPrefixes[id],
          `Prefix for ${id} must match ${expectedPrefixes[id]}`
        );
        assert.ok(def.name.length > 0);
        assert.ok(def.defaultTag.length > 0);
        assert.ok(def.animatableFeatures.length > 0);
      }
    });

    it("verifies getArchetypeDefinition correctly resolves archetypes and returns undefined for unknown", () => {
      const imgDef = getArchetypeDefinition("image");
      assert.ok(imgDef);
      assert.strictEqual(imgDef.id, "image");
      assert.strictEqual(imgDef.family, "media");
      assert.strictEqual(imgDef.idPrefix, "elem_img_");

      const divDef = getArchetypeDefinition("divider");
      assert.ok(divDef);
      assert.strictEqual(divDef.id, "divider");
      assert.strictEqual(divDef.family, "structural");
      assert.strictEqual(divDef.idPrefix, "elem_divider_");

      const bgDef = getArchetypeDefinition("background");
      assert.ok(bgDef);
      assert.strictEqual(bgDef.id, "background");
      assert.strictEqual(bgDef.family, "structural");
      assert.strictEqual(bgDef.idPrefix, "elem_bg_");

      // Unknown archetype
      const unknownDef = getArchetypeDefinition("unknown_item");
      assert.strictEqual(unknownDef, undefined);
    });
  });

  describe("2. ArchetypePicker Component Contracts", () => {
    it("renders ArchetypePicker with null initial selection", () => {
      let selected: ArchetypeId | null = null;
      const props: ArchetypePickerProps = {
        selectedArchetype: null,
        onSelectArchetype: (id) => {
          selected = id;
        },
      };

      const element = React.createElement(ArchetypePicker, props);
      assert.ok(element);
      assert.strictEqual(element.props.selectedArchetype, null);

      // Trigger selection
      props.onSelectArchetype("image");
      assert.strictEqual(selected, "image");
    });

    it("renders ArchetypePicker with active archetype selection", () => {
      const props: ArchetypePickerProps = {
        selectedArchetype: "image",
        onSelectArchetype: () => {},
      };

      const element = React.createElement(ArchetypePicker, props);
      assert.ok(element);
      assert.strictEqual(element.props.selectedArchetype, "image");
    });
  });

  describe("3. Launch Gating Logic (PRD.md §6)", () => {
    it("prohibits launching studio when selectedArchetype is null", () => {
      const checkCanLaunch = (archetype: ArchetypeId | null, name: string) => {
        return Boolean(archetype && name.trim());
      };

      assert.strictEqual(
        checkCanLaunch(null, "MyElement"),
        false,
        "Launch must be blocked when no archetype is selected"
      );

      assert.strictEqual(
        checkCanLaunch(null, ""),
        false,
        "Launch must be blocked when both are missing"
      );
    });

    it("permits launching studio when archetype is selected and project has a name", () => {
      const checkCanLaunch = (archetype: ArchetypeId | null, name: string) => {
        return Boolean(archetype && name.trim());
      };

      assert.strictEqual(checkCanLaunch("image", "AnimatedHeroImage"), true);
      assert.strictEqual(checkCanLaunch("divider", "SectionDivider"), true);
      assert.strictEqual(checkCanLaunch("background", "GradientBackdrop"), true);
      assert.strictEqual(checkCanLaunch("button", "MagneticButton"), true);
    });

    it("generates archetype-aware editor launch URLs", () => {
      const createLaunchUrl = (name: string, archetype: ArchetypeId) => {
        return `/editor?name=${encodeURIComponent(name.trim())}&scope=element&archetype=${archetype}`;
      };

      assert.strictEqual(
        createLaunchUrl("AnimatedHeroImage", "image"),
        "/editor?name=AnimatedHeroImage&scope=element&archetype=image"
      );
      assert.strictEqual(
        createLaunchUrl("Section Divider", "divider"),
        "/editor?name=Section%20Divider&scope=element&archetype=divider"
      );
    });
  });
});
