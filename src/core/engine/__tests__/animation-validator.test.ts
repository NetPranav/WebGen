import test from "node:test";
import assert from "node:assert/strict";
import { AnimationValidator } from "../AnimationValidator";
import { GSAPTimelineCompiler } from "../GSAPTimelineCompiler";
import { DiagnosticBus } from "../DiagnosticBus";
import { AnimationSample } from "../../types/animations";
import { DiagnosticEvent } from "../../types/diagnostics";

test("AnimationValidator: All valid tracks on Button element pass without diagnostics", () => {
  DiagnosticBus.clearHistory();

  const buttonSample: AnimationSample = {
    id: "sample_btn_hover",
    name: "ButtonHoverPulse",
    duration: 300,
    easing: "ease-out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "opacity",
        keyframes: [
          { offset: 0, value: 0.8 },
          { offset: 100, value: 1.0 },
        ],
      },
      {
        trackId: "scale",
        keyframes: [
          { offset: 0, value: 1.0 },
          { offset: 50, value: 1.05 },
          { offset: 100, value: 1.0 },
        ],
      },
      {
        trackId: "backgroundColor",
        keyframes: [
          { offset: 0, value: "#2563eb" },
          { offset: 100, value: "#1d4ed8" },
        ],
      },
    ],
  };

  const res = AnimationValidator.validateSampleForElement(buttonSample, {
    elementId: "btn_cta",
    elementName: "CTAButton",
    archetype: "button",
  });

  assert.equal(res.isValid, true);
  assert.equal(res.allowedTracks.length, 3);
  assert.equal(res.rejectedTracks.length, 0);
  assert.equal(DiagnosticBus.getHistoryByChannel("ANIM_COMPAT").length, 0);
});

test("AnimationValidator: Traps letterSpacing track on Image element with [ANIM_COMPAT] diagnostic", () => {
  DiagnosticBus.clearHistory();
  const captured: DiagnosticEvent[] = [];
  const unsubscribe = DiagnosticBus.subscribeChannel("ANIM_COMPAT", (ev) => {
    captured.push(ev);
  });

  const mixedSample: AnimationSample = {
    id: "sample_hero_entrance",
    name: "HeroEntrance",
    duration: 600,
    easing: "power2.out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "opacity",
        keyframes: [
          { offset: 0, value: 0 },
          { offset: 100, value: 1 },
        ],
      },
      {
        trackId: "translateY",
        keyframes: [
          { offset: 0, value: 40 },
          { offset: 100, value: 0 },
        ],
      },
      // Incompatible with image!
      {
        trackId: "letterSpacing",
        keyframes: [
          { offset: 0, value: 6 },
          { offset: 100, value: 0 },
        ],
      },
    ],
  };

  const res = AnimationValidator.validateSampleForElement(mixedSample, {
    elementId: "img_hero",
    elementName: "HeroBanner",
    archetype: "image",
  });

  unsubscribe();

  // Evaluation results
  assert.equal(res.isValid, false);
  assert.equal(res.allowedTracks.length, 2);
  assert.equal(res.rejectedTracks.length, 1);
  assert.equal(res.rejectedTracks[0].track.trackId, "letterSpacing");
  assert.match(res.rejectedTracks[0].reason, /text rendering/);

  // Sanitized sample only contains the 2 legal tracks
  assert.equal(res.sanitizedSample.tracks.length, 2);
  assert.equal(res.sanitizedSample.tracks[0].trackId, "opacity");
  assert.equal(res.sanitizedSample.tracks[1].trackId, "translateY");

  // Diagnostic captured on bus
  assert.equal(captured.length, 1);
  assert.equal(captured[0].channel, "ANIM_COMPAT");
  assert.equal(captured[0].source.entityName, "HeroBanner");
  assert.equal(captured[0].source.propertyKey, "letterSpacing");
  assert.match(captured[0].message, /cannot be attached to archetype 'image'/);
});

test("GSAPTimelineCompiler: Compiles validated sample into valid CSS keyframes and GSAP parameters", () => {
  const sample: AnimationSample = {
    id: "sample_fade_up",
    name: "FadeUp",
    duration: 500,
    delay: 100,
    easing: "ease-out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "opacity",
        keyframes: [
          { offset: 0, value: 0 },
          { offset: 100, value: 1 },
        ],
      },
      {
        trackId: "translateY",
        keyframes: [
          { offset: 0, value: 20 },
          { offset: 100, value: 0 },
        ],
      },
    ],
  };

  const compiled = GSAPTimelineCompiler.compile(sample);

  // CSS Keyframes check
  assert.match(compiled.name, /^anim_fadeup_/);
  assert.match(compiled.cssKeyframes, /@keyframes anim_fadeup_/);
  assert.match(compiled.cssKeyframes, /opacity: 0;/);
  assert.match(compiled.cssKeyframes, /transform: translateY\(20px\);/);
  assert.match(compiled.cssKeyframes, /opacity: 1;/);
  assert.match(compiled.cssKeyframes, /transform: translateY\(0px\);/);

  // CSS Class rule check
  assert.match(compiled.cssRule, /animation-duration: 500ms;/);
  assert.match(compiled.cssRule, /animation-fill-mode: forwards;/);

  // GSAP config check
  assert.equal(compiled.gsapConfig.duration, 0.5);
  assert.equal(compiled.gsapConfig.delay, 0.1);
  assert.equal(compiled.gsapConfig.ease, "ease-out");
});
