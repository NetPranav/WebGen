/**
 * ============================================================================
 * MOTION SEQUENCER AUTOMATED TEST SUITE
 * ============================================================================
 * Architecture Ref: ROADMAP.md Sub-Phase 4.1, CONVENTIONS.md §4, PANELS.md §Panel 05
 * Validates:
 *   1. Family-specific animatable property gating (Universal, Media, Structural, Interactive, Text)
 *   2. Keyframe timecode formatting & frame snapping
 *   3. 120 FPS track value interpolation & CSS unit preservation
 *   4. Property family badge classification
 * ============================================================================
 */

if (typeof require !== "undefined" && require.extensions) {
  require.extensions[".css"] = () => ({});
}

import { describe, it } from "node:test";
import assert from "node:assert";
import { formatTimecode } from "../PlayheadControls";
import { getPropertyFamilyBadge } from "../TrackHeader";
import { AnimationTrack } from "@/core/elements/types";

describe("Phase 4.1: Motion Sequencer Timeline & Property Tracks", async () => {
  const { getValidPropertiesForArchetype, interpolateTrackValue } = await import("../MotionSequencer");

  describe("Family-Specific Property Path Gating (CONVENTIONS.md §4)", () => {
    it("should return universal property paths for any archetype", () => {
      const btnProps = getValidPropertiesForArchetype("button", "interactive");
      assert.ok(btnProps.includes("transform.x"));
      assert.ok(btnProps.includes("transform.y"));
      assert.ok(btnProps.includes("transform.scale"));
      assert.ok(btnProps.includes("transform.rotate"));
      assert.ok(btnProps.includes("appearance.opacity"));
      assert.ok(btnProps.includes("filter.blur"));
    });

    it("should allow media.* only for media archetypes", () => {
      const imgProps = getValidPropertiesForArchetype("image", "media");
      assert.ok(imgProps.includes("media.src"));
      assert.ok(imgProps.includes("media.objectFit"));
      assert.ok(imgProps.includes("media.filter.grayscale"));
      assert.ok(imgProps.includes("media.clipPath"));

      const btnProps = getValidPropertiesForArchetype("button", "interactive");
      assert.strictEqual(btnProps.includes("media.src"), false);
      assert.strictEqual(btnProps.includes("media.clipPath"), false);

      const divProps = getValidPropertiesForArchetype("divider", "structural");
      assert.strictEqual(divProps.includes("media.filter.grayscale"), false);
    });

    it("should allow divider.* and background.* only for structural archetypes", () => {
      const divProps = getValidPropertiesForArchetype("divider", "structural");
      assert.ok(divProps.includes("divider.length"));
      assert.ok(divProps.includes("divider.thickness"));
      assert.ok(divProps.includes("divider.strokeDashoffset"));

      const bgProps = getValidPropertiesForArchetype("background", "structural");
      assert.ok(bgProps.includes("background.color"));
      assert.ok(bgProps.includes("background.gradient.angle"));
      assert.ok(bgProps.includes("background.parallax.speed"));
      assert.ok(bgProps.includes("background.noise.opacity"));

      const textProps = getValidPropertiesForArchetype("text", "text");
      assert.strictEqual(textProps.includes("divider.length"), false);
      assert.strictEqual(textProps.includes("background.gradient.angle"), false);
    });

    it("should allow typography.* for interactive and text archetypes", () => {
      const textProps = getValidPropertiesForArchetype("text", "text");
      assert.ok(textProps.includes("typography.color"));
      assert.ok(textProps.includes("typography.fontSize"));
      assert.ok(textProps.includes("typography.letterSpacing"));

      const btnProps = getValidPropertiesForArchetype("button", "interactive");
      assert.ok(btnProps.includes("typography.fontSize"));

      const imgProps = getValidPropertiesForArchetype("image", "media");
      assert.strictEqual(imgProps.includes("typography.fontSize"), false);
    });
  });

  describe("Timecode Readout & Formatting", () => {
    it("should format zero seconds as 00:00.000", () => {
      assert.strictEqual(formatTimecode(0), "00:00.000");
    });

    it("should format fractional seconds with millisecond precision", () => {
      assert.strictEqual(formatTimecode(1.25), "00:01.250");
      assert.strictEqual(formatTimecode(65.5), "01:05.500");
    });
  });

  describe("Track Value Interpolation at 120 FPS", () => {
    const sampleTrack: AnimationTrack = {
      id: "tr_trans_y",
      property: "transform.y",
      keyframes: [
        { id: "kf_1", time: 0.0, value: "40px" },
        { id: "kf_2", time: 1.0, value: "0px" },
        { id: "kf_3", time: 2.0, value: "-20px" },
      ],
    };

    it("should return start value before initial keyframe", () => {
      const val = interpolateTrackValue(sampleTrack, -0.5);
      assert.strictEqual(val, "40px");
    });

    it("should return end value after final keyframe", () => {
      const val = interpolateTrackValue(sampleTrack, 2.5);
      assert.strictEqual(val, "-20px");
    });

    it("should interpolate linearly between keyframes with units preserved", () => {
      const mid = interpolateTrackValue(sampleTrack, 0.5);
      assert.strictEqual(mid, "20.00px");

      const quarter = interpolateTrackValue(sampleTrack, 0.25);
      assert.strictEqual(quarter, "30.00px");

      const threeQuarter = interpolateTrackValue(sampleTrack, 1.5);
      assert.strictEqual(threeQuarter, "-10.00px");
    });
  });

  describe("Property Family Badge Classification", () => {
    it("should classify properties into the correct family badge", () => {
      assert.strictEqual(getPropertyFamilyBadge("transform.y").label, "Universal");
      assert.strictEqual(getPropertyFamilyBadge("appearance.opacity").label, "Universal");
      assert.strictEqual(getPropertyFamilyBadge("media.filter.grayscale").label, "Media");
      assert.strictEqual(getPropertyFamilyBadge("svg.path").label, "Media");
      assert.strictEqual(getPropertyFamilyBadge("divider.length").label, "Structural");
      assert.strictEqual(getPropertyFamilyBadge("background.gradient.angle").label, "Structural");
      assert.strictEqual(getPropertyFamilyBadge("typography.fontSize").label, "Interactive/Text");
    });
  });
});
