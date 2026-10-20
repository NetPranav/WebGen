/**
 * ROADMAP Phase 3 gate (moved here when the old outliner was retired in Phase 32): each archetype lists the
 * inspector sections PANELS.md §3 gives it, no more and no fewer of the ones that matter.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ALL_ARCHETYPE_IDS } from "../../../editor/panels/launcher/archetypeData";
import { getArchetype } from "../registry";

describe("Phase 3 verification gate: PANELS.md §3 section registry", () => {
  it("every archetype has appearance and layout, and the right extras", () => {
    for (const archId of ALL_ARCHETYPE_IDS) {
      const sections = getArchetype(archId).sections;
      assert.ok(sections && sections.length > 0, `Archetype ${archId} must have registered sections`);
      assert.ok(sections.includes("appearance"), `${archId} must include appearance`);
      assert.ok(sections.includes("layout"), `${archId} must include layout`);
      if (archId === "image") {
        assert.ok(sections.includes("media_props"), "Image must include media_props");
        assert.ok(!sections.includes("typography"), "Image must NOT include typography");
      } else if (archId === "icon") {
        assert.ok(sections.includes("svg_vector"), "Icon must include svg_vector");
        assert.ok(!sections.includes("typography"), "Icon must NOT include typography");
      } else if (archId === "divider") {
        assert.ok(sections.includes("divider_props"), "Divider must include divider_props");
        assert.ok(!sections.includes("typography"), "Divider must NOT include typography");
      } else if (archId === "background") {
        assert.ok(sections.includes("background_props"), "Background must include background_props");
        assert.ok(!sections.includes("typography"), "Background must NOT include typography");
      } else if (archId === "text" || archId === "button" || archId === "badge") {
        assert.ok(sections.includes("typography"), `${archId} must include typography`);
      }
    }
  });
});
