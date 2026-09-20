import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GSAPAnimationEmitter } from "../emitters/GSAPAnimationEmitter";
import { AnimationSample } from "../../core/types/animations";

describe("Sub-Phase 6.1: GSAPAnimationEmitter (GSAP 3 Timelines & Hooks)", () => {
  const samplePulse: AnimationSample = {
    id: "anim_pulse",
    name: "Heartbeat Pulse",
    duration: 1000,
    delay: 200,
    easing: "power2.out",
    iterations: "infinite",
    direction: "alternate",
    fillMode: "both",
    tracks: [
      {
        trackId: "scale",
        keyframes: [
          { offset: 0, value: 1 },
          { offset: 50, value: 1.15, easing: "power1.inOut" },
          { offset: 100, value: 1 },
        ],
      },
      {
        trackId: "opacity",
        keyframes: [
          { offset: 0, value: 0.8 },
          { offset: 100, value: 1 },
        ],
      },
      {
        trackId: "filterBlur",
        keyframes: [
          { offset: 0, value: 0 },
          { offset: 50, value: 4 },
          { offset: 100, value: 0 },
        ],
      },
    ],
  };

  // --------------------------------------------------------------------------
  // 1. Property & Value Mapping
  // --------------------------------------------------------------------------
  it("maps visual track IDs and formats values to GSAP 3 standards", () => {
    assert.equal(GSAPAnimationEmitter.mapTrackIdToGsapProp("translateX"), "x");
    assert.equal(GSAPAnimationEmitter.mapTrackIdToGsapProp("translateY"), "y");
    assert.equal(GSAPAnimationEmitter.mapTrackIdToGsapProp("rotate"), "rotation");
    assert.equal(GSAPAnimationEmitter.mapTrackIdToGsapProp("scale"), "scale");
    assert.equal(GSAPAnimationEmitter.mapTrackIdToGsapProp("filterBlur"), "filter");

    assert.equal(GSAPAnimationEmitter.formatGsapValue("filterBlur", 5), '"blur(5px)"');
    assert.equal(GSAPAnimationEmitter.formatGsapValue("scale", 1.2), "1.2");
  });

  // --------------------------------------------------------------------------
  // 2. Easing Translation
  // --------------------------------------------------------------------------
  it("translates CSS and engine easings to GSAP easing syntax", () => {
    assert.equal(GSAPAnimationEmitter.mapEasing("linear"), '"none"');
    assert.equal(GSAPAnimationEmitter.mapEasing("ease-out"), '"power1.out"');
    assert.equal(GSAPAnimationEmitter.mapEasing("bounce.out"), '"bounce.out"');
    assert.equal(GSAPAnimationEmitter.mapEasing("elastic.out"), '"elastic.out(1, 0.3)"');
  });

  // --------------------------------------------------------------------------
  // 3. Timeline Body Generation
  // --------------------------------------------------------------------------
  it("generates GSAP timeline calls with correct durations and offsets", () => {
    const body = GSAPAnimationEmitter.emitTimelineBody(samplePulse);

    // Timeline config
    assert.match(body, /const tl = gsap\.timeline\(\{ delay: 0\.2, repeat: -1, yoyo: true \}\);/);

    // Initial sets
    assert.match(body, /tl\.set\(target, \{ scale: 1 \}, 0\);/);
    assert.match(body, /tl\.set\(target, \{ opacity: 0\.8 \}, 0\);/);

    // Intermediate tweens
    assert.match(body, /tl\.to\(target, \{ scale: 1\.15, duration: 0\.500, ease: "power1\.inOut" \}, 0\.000\);/);
    assert.match(body, /tl\.to\(target, \{ filter: "blur\(4px\)", duration: 0\.500/);
  });

  // --------------------------------------------------------------------------
  // 4. React Lifecycle Hook Generation
  // --------------------------------------------------------------------------
  it("emits custom React hook with gsap.context and automatic cleanup", () => {
    const hookFile = GSAPAnimationEmitter.emitHook(samplePulse);

    assert.equal(hookFile.language, "typescript");
    assert.equal(hookFile.path, "animations/useHeartbeatPulseAnimation.ts");
    assert.match(hookFile.content, /"use client";/);
    assert.match(hookFile.content, /import \{ useEffect, useRef \} from "react";/);
    assert.match(hookFile.content, /import gsap from "gsap";/);
    assert.match(hookFile.content, /export function useHeartbeatPulseAnimation/);
    assert.match(hookFile.content, /const ctx = gsap\.context\(/);
    assert.match(hookFile.content, /ctx\.revert\(\);/); // Cleanup
  });

  // --------------------------------------------------------------------------
  // 5. Standalone Factory Function Generation
  // --------------------------------------------------------------------------
  it("emits standalone timeline factory function", () => {
    const funcFile = GSAPAnimationEmitter.emitFunction(samplePulse);

    assert.equal(funcFile.path, "animations/createHeartbeatPulseTimeline.ts");
    assert.match(funcFile.content, /export function createHeartbeatPulseTimeline\(target: gsap\.TweenTarget\)/);
    assert.match(funcFile.content, /return tl;/);
  });
});
