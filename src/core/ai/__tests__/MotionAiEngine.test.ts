import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { motionAiEngine } from "../MotionAiEngine";
import {
  ALL_PRESETS,
  INTERACTIVE_PRESETS,
  MEDIA_PRESETS,
  STRUCTURAL_PRESETS,
  TEXT_PRESETS,
  getPresetById,
  getPresetsByFamily,
  getPresetsForArchetype,
  instantiatePreset,
  filterPresets,
} from "../../motion/presets";
import { motionDiagnostics } from "../MotionDiagnostics";
import { hydrateClip, type ClipDraft } from "../../document/factories";
import type { Layer } from "../../document/schema";

/** A layer plus its animation stack, as the co-pilot sees it. */
type TestElement = Layer & { animationStack: ClipDraft[] };

describe("Phase 7: MotionAI Co-Pilot & Preset Ecosystem", () => {
  const dummyButton: TestElement = {
    id: "elem_btn_test",
    name: "Primary CTA Button",
    archetype: "button",
    parentId: null,
    properties: { "content.label": "Get Started" },
    children: [],
    animationStack: [],
  };

  const dummyImage: TestElement = {
    id: "elem_img_test",
    name: "Hero Showcase Image",
    archetype: "image",
    parentId: null,
    properties: { "media.src": "/images/hero.webp", "media.objectFit": "cover" },
    children: [],
    animationStack: [],
  };

  const dummyDivider: TestElement = {
    id: "elem_div_test",
    name: "Section Divider",
    archetype: "divider",
    parentId: null,
    properties: { "divider.orientation": "horizontal" },
    children: [],
    animationStack: [],
  };

  const dummyBackground: TestElement = {
    id: "elem_bg_test",
    name: "Ambient Gradient Backdrop",
    archetype: "background",
    parentId: null,
    properties: { "background.type": "linear-gradient" },
    children: [],
    animationStack: [],
  };

  const dummyText: TestElement = {
    id: "elem_text_test",
    name: "Hero Heading Title",
    archetype: "text",
    parentId: null,
    properties: { "content.text": "Build visually. Ship flawlessly." },
    children: [],
    animationStack: [],
  };

  describe("Sub-Phase 7.1: Natural Language Prompt-to-Motion", () => {
    it("synthesizes elastic bounce on tap for an Interactive button", () => {
      const res = motionAiEngine.generateMotion({
        prompt: "add an elastic bounce on tap",
        targetElement: dummyButton,
      });

      assert.equal(res.success, true);
      assert.equal(res.targetFamily, "interactive");
      assert.equal(res.targetArchetype, "button");
      assert.ok(res.ghostAnimation);
      assert.equal(res.ghostAnimation.trigger, "press");
      assert.equal(res.ghostAnimation.type, "tap");
      assert.ok(res.ghostAnimation.tracks && res.ghostAnimation.tracks.length > 0);
      assert.equal(res.ghostAnimation.tracks[0].property, "transform.scale");
      assert.ok(res.diffSummary.addedTracks.includes("transform.scale"));
    });

    it("synthesizes Ken Burns zoom for a Media image", () => {
      const res = motionAiEngine.generateMotion({
        prompt: "Add a slow Ken Burns zoom to this image",
        targetElement: dummyImage,
      });

      assert.equal(res.success, true);
      assert.equal(res.targetFamily, "media");
      assert.ok(res.ghostAnimation);
      assert.equal(res.ghostAnimation.trigger, "time");
      assert.equal(res.ghostAnimation.repeat, -1);
      assert.ok(res.ghostAnimation.tracks?.some((t) => t.property === "transform.scale"));
      assert.ok(res.ghostAnimation.tracks?.some((t) => t.property === "media.focalPoint.x"));
    });

    it("synthesizes sunrise gradient drift for a Structural background", () => {
      const res = motionAiEngine.generateMotion({
        prompt: "Give this background a slow sunrise gradient drift",
        targetElement: dummyBackground,
      });

      assert.equal(res.success, true);
      assert.equal(res.targetFamily, "structural");
      assert.ok(res.ghostAnimation);
      assert.equal(res.ghostAnimation.trigger, "time");
      assert.ok(res.ghostAnimation.tracks?.some((t) => t.property === "background.gradient.angle"));
    });

    it("synthesizes divider draw-in from center on scroll", () => {
      const res = motionAiEngine.generateMotion({
        prompt: "Make this divider draw in from the center on scroll",
        targetElement: dummyDivider,
      });

      assert.equal(res.success, true);
      assert.equal(res.targetFamily, "structural");
      assert.ok(res.ghostAnimation);
      assert.equal(res.ghostAnimation.trigger, "scrollProgress");
      assert.ok(res.ghostAnimation.scrollTrigger);
      assert.ok(res.ghostAnimation.tracks?.some((t) => t.property === "transform.scaleX"));
    });

    it("synthesizes word stagger cascade for a Text element", () => {
      const res = motionAiEngine.generateMotion({
        prompt: "Reveal text with word-by-word stagger cascade",
        targetElement: dummyText,
      });

      assert.equal(res.success, true);
      assert.equal(res.targetFamily, "text");
      assert.ok(res.ghostAnimation);
      assert.ok(res.ghostAnimation.stagger);
      assert.ok(res.ghostAnimation.tracks?.some((t) => t.property === "transform.y"));
    });

    it("strictly enforces Rule 6.1 (Category Hard Block) by intercepting tap on plain text", () => {
      const res = motionAiEngine.generateMotion({
        prompt: "add an elastic bounce on tap to this text",
        targetElement: dummyText,
      });

      assert.equal(res.success, false);
      assert.equal(res.ghostAnimation, null);
      assert.ok(res.ruleViolation);
      assert.match(res.ruleViolation.rule, /Rule 6.1/);
      assert.match(res.explanation, /Plain text elements cannot directly receive tap/);
      assert.ok(res.suggestedPromptAlternatives && res.suggestedPromptAlternatives.length > 0);
    });

    it("strictly enforces Rule 6.1 on structural dividers receiving hover gestures", () => {
      const res = motionAiEngine.generateMotion({
        prompt: "make this divider scale on hover",
        targetElement: dummyDivider,
      });

      assert.equal(res.success, false);
      assert.ok(res.ruleViolation);
      assert.match(res.ruleViolation.rule, /Rule 6.1/);
    });
  });

  describe("Sub-Phase 7.2: Visual Diff & Ghost Keyframes", () => {
    it("computes added tracks when element has no prior animations", () => {
      const res = motionAiEngine.generateMotion({
        prompt: "add an elastic bounce on tap",
        targetElement: dummyButton,
        existingAnimations: [],
      });

      assert.ok(res.diffSummary.addedTracks.includes("transform.scale"));
      assert.equal(res.diffSummary.modifiedTracks.length, 0);
    });

    it("computes modified tracks when element already animates the property", () => {
      const res = motionAiEngine.generateMotion({
        prompt: "add an elastic bounce on tap",
        targetElement: dummyButton,
        existingAnimations: [
          hydrateClip({
            id: "anim_existing",
            name: "Initial Scale",
            type: "hover",
            trigger: "hover",
            duration: 0.2,
            easing: "linear",
            enabled: true,
            tracks: [
              {
                property: "transform.scale",
                keyframes: [{ time: 0, value: 1 }],
              },
            ],
          }),
        ],
      });

      assert.ok(res.diffSummary.modifiedTracks.includes("transform.scale"));
    });
  });

  describe("Sub-Phase 7.3: Curated Preset Library (51 Presets)", () => {
    it("contains exactly 51 production-grade presets across all 4 families", () => {
      assert.equal(ALL_PRESETS.length, 51);
      assert.equal(INTERACTIVE_PRESETS.length, 13);
      assert.equal(MEDIA_PRESETS.length, 13);
      assert.equal(STRUCTURAL_PRESETS.length, 13);
      assert.equal(TEXT_PRESETS.length, 12);
    });

    it("correctly filters presets by family", () => {
      assert.equal(getPresetsByFamily("interactive").length, 13);
      assert.equal(getPresetsByFamily("media").length, 13);
      assert.equal(getPresetsByFamily("structural").length, 13);
      assert.equal(getPresetsByFamily("text").length, 12);
    });

    it("enforces Rule 6.1 category blocking in getPresetsForArchetype()", () => {
      const textPartition = getPresetsForArchetype("text");
      assert.ok(textPartition.available.length > 0);
      // All available presets for text must not be hover or tap
      for (const p of textPartition.available) {
        assert.notEqual(p.animation.type, "hover");
        assert.notEqual(p.animation.type, "tap");
      }
      // Blocked list contains explanatory reason
      for (const b of textPartition.blocked) {
        assert.match(b.reason, /Rule 6.1/);
      }
    });

    it("instantiates a preset with unique IDs and cloned tracks", () => {
      const instantiated = instantiatePreset("preset_interactive_magnetic_hover");
      assert.ok(instantiated);
      assert.match(instantiated.id, /^clip_[0-9a-f]{8}$/);
      assert.notEqual(instantiatePreset("preset_interactive_magnetic_hover")?.id, instantiated.id);
      assert.equal(instantiated.tracks.length, 2);
      assert.match(instantiated.tracks[0].keyframes[0].id, /^kf_[0-9a-f]{8}$/);
    });

    it("filters presets by search query and badge", () => {
      const results = filterPresets({ searchQuery: "ken burns" });
      assert.ok(results.length >= 2);
      assert.ok(results.every((p) => p.family === "media"));

      const springResults = filterPresets({ badge: "Spring" });
      assert.ok(springResults.length > 0);
      assert.ok(springResults.every((p) => p.badge === "Spring"));
    });
  });

  describe("Sub-Phase 7.4: Diagnostic Assistant", () => {
    it("flags layout reflow violations when animating layout.top / layout.left", () => {
      const elementWithReflow: TestElement = {
        ...dummyButton,
        animationStack: [
          {
            id: "anim_bad_reflow",
            name: "Bad Reflow Anim",
            type: "entrance",
            trigger: "mount",
            duration: 0.5,
            easing: "linear",
            enabled: true,
            tracks: [
              {
                property: "layout.top",
                keyframes: [{ time: 0, value: 10 }, { time: 0.5, value: 0 }],
              },
            ],
          },
        ],
      };

      const issues = motionDiagnostics.analyze(elementWithReflow, elementWithReflow.animationStack.map(hydrateClip));
      const reflowIssue = issues.find((i) => i.category === "reflow");

      assert.ok(reflowIssue);
      assert.equal(reflowIssue.severity, "error");
      assert.ok(reflowIssue.autoFixable);

      // Execute auto-fix
      const fixed = reflowIssue.fixAction!();
      assert.equal(fixed.updatedAnimations[0].tracks![0].property, "transform.y");
    });

    it("flags oversized unoptimized images > 2000px", () => {
      const hugeImage: TestElement = {
        ...dummyImage,
        properties: { "frame.width": 3840, "frame.height": 2160 },
      };

      const issues = motionDiagnostics.analyze(hugeImage, []);
      const imgIssue = issues.find((i) => i.category === "image-size");

      assert.ok(imgIssue);
      assert.equal(imgIssue.severity, "warning");
      assert.ok(imgIssue.autoFixable);

      const fixed = imgIssue.fixAction!();
      assert.equal(fixed.propsPatch["media.objectFit"], "cover");
      assert.equal(fixed.propsPatch["media.loadingMode"], "lazy");
    });

    it("flags heavy filter stacking with blur > 24px and noise texture", () => {
      const noisyHeavyElement: TestElement = {
        ...dummyBackground,
        properties: { "background.noise.opacity": 0.15 },
        animationStack: [
          {
            id: "anim_heavy_blur",
            name: "Extreme Blur",
            type: "entrance",
            trigger: "mount",
            duration: 1.0,
            easing: "linear",
            enabled: true,
            tracks: [
              {
                property: "filter.blur",
                keyframes: [{ time: 0, value: 40 }, { time: 1.0, value: 0 }],
              },
            ],
          },
        ],
      };

      const issues = motionDiagnostics.analyze(noisyHeavyElement, noisyHeavyElement.animationStack.map(hydrateClip));
      const filterIssue = issues.find((i) => i.category === "filter-stack");

      assert.ok(filterIssue);
      assert.equal(filterIssue.severity, "warning");
      assert.ok(filterIssue.autoFixable);

      const fixed = filterIssue.fixAction!();
      assert.equal(fixed.updatedAnimations[0].tracks![0].keyframes[0].value, 16);
    });
  });
});
