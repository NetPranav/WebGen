/**
 * ============================================================================
 * SUB-PHASE 3.2 VERIFICATION: MEDIA FAMILY ARCHETYPE TEST SUITE
 * ============================================================================
 * Tests:
 * 1. createDefaultImage satisfies schema and CONVENTIONS.md ID prefix elem_img_
 * 2. Full media.* surface (src, objectFit, focalPoint, filter.*, clipPath, overlay.*)
 * 3. createDefaultIcon satisfies schema and CONVENTIONS.md ID prefix elem_icon_
 * 4. Full svg.* surface (path, stroke, dasharray, dashoffset)
 * 5. validateMediaConfig enforces strict property contracts
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultImage,
  createDefaultIcon,
  validateMediaConfig,
} from "../archetypes/media";

describe("Sub-Phase 3.2: Media Family (Image, Icon)", () => {
  describe("1. Image Archetype Contract (CONVENTIONS.md §4.3)", () => {
    it("creates default image with elem_img_ ID prefix and media family", () => {
      const img = createDefaultImage("Product Showcase");
      assert.ok(img.id.startsWith("elem_img_"), `Expected elem_img_ prefix, got ${img.id}`);
      assert.strictEqual(img.name, "Product Showcase");
      assert.strictEqual(img.family, "media");
      assert.strictEqual(img.archetype, "image");
      assert.strictEqual(img.tag, "img");

      // Verify full media.* surface
      assert.ok(img.properties.src.length > 0);
      assert.strictEqual(img.properties.objectFit, "cover");
      assert.strictEqual(img.properties.aspectRatio, "16:9");
      assert.deepStrictEqual(img.properties.focalPoint, { x: 50, y: 50 });

      // Filters
      assert.strictEqual(img.properties.filter.grayscale, 0);
      assert.strictEqual(img.properties.filter.blur, 0);
      assert.strictEqual(img.properties.filter.brightness, 1);
      assert.strictEqual(img.properties.filter.contrast, 1);
      assert.strictEqual(img.properties.filter.saturate, 1);

      // Clip path & overlay
      assert.strictEqual(img.properties.clipPath, "none");
      assert.strictEqual(img.properties.overlay.color, "#000000");
      assert.strictEqual(img.properties.overlay.opacity, 0);
      assert.strictEqual(img.properties.overlay.blendMode, "normal");

      // Attached parallax animation
      assert.ok(img.animationStack.length > 0);
      assert.strictEqual(img.animationStack[0].trigger, "onScroll");
    });
  });

  describe("2. Icon (SVG) Archetype Contract", () => {
    it("creates default icon with elem_icon_ ID prefix and media family", () => {
      const icon = createDefaultIcon("Feature Star");
      assert.ok(icon.id.startsWith("elem_icon_"), `Expected elem_icon_ prefix, got ${icon.id}`);
      assert.strictEqual(icon.name, "Feature Star");
      assert.strictEqual(icon.family, "media");
      assert.strictEqual(icon.archetype, "icon");
      assert.strictEqual(icon.tag, "svg");

      // Verify svg.* surface
      assert.strictEqual(icon.properties.stroke, "#206859");
      assert.strictEqual(icon.properties.strokeWidth, 2);
      assert.strictEqual(icon.properties.strokeDashoffset, 0);
      assert.ok(icon.properties.path.length > 0);

      // Attached draw-in animation
      assert.ok(icon.animationStack.length > 0);
      assert.strictEqual(icon.animationStack[0].type, "entrance");
    });
  });

  describe("3. Validation Logic", () => {
    it("validates correct image configs and catches invalid objectFit", () => {
      const validImg = validateMediaConfig("image", {
        src: "https://example.com/photo.jpg",
        alt: "A scenic lake",
        objectFit: "cover",
        filter: { grayscale: 0, blur: 0 },
      });
      assert.strictEqual(validImg.valid, true);

      const invalidImg = validateMediaConfig("image", {
        src: "",
        alt: "Broken image",
        objectFit: "distort-to-hell",
        filter: null,
      });
      assert.strictEqual(invalidImg.valid, false);
      assert.ok(invalidImg.errors.length >= 3);
    });

    it("validates correct icon configs and catches missing path or bad strokeWidth", () => {
      const validIcon = validateMediaConfig("icon", {
        strokeWidth: 2,
        path: "M0 0h24v24H0z",
      });
      assert.strictEqual(validIcon.valid, true);

      const invalidIcon = validateMediaConfig("icon", {
        strokeWidth: "bold",
        path: 42,
      });
      assert.strictEqual(invalidIcon.valid, false);
      assert.strictEqual(invalidIcon.errors.length, 2);
    });
  });
});
