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

test("Sub-Phase 7.5: Traps SVG-only tracks on non-SVG elements (button, container) with [ANIM_COMPAT]", () => {
  DiagnosticBus.clearHistory();
  const captured: DiagnosticEvent[] = [];
  const unsubscribe = DiagnosticBus.subscribeChannel("ANIM_COMPAT", (ev) => {
    captured.push(ev);
  });

  const svgTrackSample: AnimationSample = {
    id: "sample_svg_tracks",
    name: "SvgTracksOnButton",
    duration: 500,
    easing: "ease-out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "opacity",
        keyframes: [{ offset: 0, value: 0 }, { offset: 100, value: 1 }],
      },
      {
        trackId: "pathMorph",
        keyframes: [{ offset: 0, value: "M 0 0 L 10 0" }],
      },
      {
        trackId: "strokeDashoffset",
        keyframes: [{ offset: 0, value: 100 }, { offset: 100, value: 0 }],
      },
      {
        trackId: "gradientStopColor",
        keyframes: [{ offset: 0, value: "#ff0000" }, { offset: 100, value: "#0000ff" }],
      },
    ],
  };

  const btnRes = AnimationValidator.validateSampleForElement(svgTrackSample, {
    elementId: "btn_test",
    elementName: "SubmitButton",
    archetype: "button",
  });

  assert.equal(btnRes.isValid, false);
  assert.equal(btnRes.allowedTracks.length, 1);
  assert.equal(btnRes.allowedTracks[0].trackId, "opacity");
  assert.equal(btnRes.rejectedTracks.length, 3);
  assert.equal(captured.length, 3);
  assert.match(captured[0].message, /cannot be attached to archetype 'button'/);

  // Container test
  const containerRes = AnimationValidator.validateSampleForElement(svgTrackSample, {
    elementId: "cont_test",
    elementName: "FlexContainer",
    archetype: "container",
  });

  assert.equal(containerRes.isValid, false);
  assert.equal(containerRes.allowedTracks.length, 1);
  assert.equal(containerRes.rejectedTracks.length, 3);

  unsubscribe();
});

test("Sub-Phase 7.5: Traps CSS-only tracks on svgPath element with [ANIM_COMPAT]", () => {
  DiagnosticBus.clearHistory();
  const captured: DiagnosticEvent[] = [];
  const unsubscribe = DiagnosticBus.subscribeChannel("ANIM_COMPAT", (ev) => {
    captured.push(ev);
  });

  const typographySample: AnimationSample = {
    id: "sample_typo_on_svg",
    name: "TypographyOnSvgPath",
    duration: 400,
    easing: "ease-in-out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "pathMorph",
        keyframes: [{ offset: 0, value: "M 0 0 L 50 50" }],
      },
      {
        trackId: "letterSpacing",
        keyframes: [{ offset: 0, value: 2 }, { offset: 100, value: 0 }],
      },
      {
        trackId: "lineHeight",
        keyframes: [{ offset: 0, value: 1.5 }],
      },
    ],
  };

  const res = AnimationValidator.validateSampleForElement(typographySample, {
    elementId: "path_star",
    elementName: "StarIconPath",
    archetype: "svgPath",
  });

  unsubscribe();

  assert.equal(res.isValid, false);
  assert.equal(res.allowedTracks.length, 1);
  assert.equal(res.allowedTracks[0].trackId, "pathMorph");
  assert.equal(res.rejectedTracks.length, 2);
  assert.equal(captured.length, 2);
  assert.match(captured[0].message, /cannot be attached to archetype 'svgPath'/);
});

test("Sub-Phase 7.5: All valid SVG tracks on svgPath archetype pass with isValid === true", () => {
  DiagnosticBus.clearHistory();

  const validSvgSample: AnimationSample = {
    id: "sample_full_svg",
    name: "FullSvgMotion",
    duration: 1000,
    easing: "power2.inOut",
    iterations: "infinite",
    direction: "alternate",
    fillMode: "both",
    tracks: [
      {
        trackId: "pathMorph",
        keyframes: [{ offset: 0, value: "M 0 0 L 10 0 Z" }, { offset: 100, value: "M 0 0 L 20 20 Z" }],
      },
      {
        trackId: "strokeDashoffset",
        keyframes: [{ offset: 0, value: 500 }, { offset: 100, value: 0 }],
      },
      {
        trackId: "motionPath",
        keyframes: [{ offset: 0, value: 0 }, { offset: 100, value: 1 }],
      },
      {
        trackId: "feGaussianBlur",
        keyframes: [{ offset: 0, value: 8 }, { offset: 100, value: 0 }],
      },
      {
        trackId: "gradientStopColor",
        keyframes: [{ offset: 0, value: "#10b981" }, { offset: 100, value: "#3b82f6" }],
      },
    ],
  };

  const res = AnimationValidator.validateSampleForElement(validSvgSample, {
    elementId: "path_ambient",
    elementName: "AmbientWave",
    archetype: "svgPath",
  });

  assert.equal(res.isValid, true);
  assert.equal(res.allowedTracks.length, 5);
  assert.equal(res.rejectedTracks.length, 0);
  assert.equal(DiagnosticBus.getHistoryByChannel("ANIM_COMPAT").length, 0);
});

test("Sub-Phase 8.6: Traps 3D-only tracks on standard 2D elements (button, container) with [ANIM_COMPAT]", () => {
  DiagnosticBus.clearHistory();
  const captured: DiagnosticEvent[] = [];
  const unsubscribe = DiagnosticBus.subscribeChannel("ANIM_COMPAT", (ev) => {
    captured.push(ev);
  });

  const sample3DOn2D: AnimationSample = {
    id: "sample_3d_on_2d",
    name: "3DTracksOn2DButton",
    duration: 600,
    easing: "power2.out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "opacity",
        keyframes: [{ offset: 0, value: 0 }, { offset: 100, value: 1 }],
      },
      {
        trackId: "position3D",
        keyframes: [{ offset: 0, value: [0, 0, 0] }, { offset: 100, value: [10, 5, 2] }],
      },
      {
        trackId: "rotation3D",
        keyframes: [{ offset: 0, value: [0, 0, 0, 1] }, { offset: 100, value: [0, 1, 0, 0] }],
      },
      {
        trackId: "cameraFov",
        keyframes: [{ offset: 0, value: 60 }, { offset: 100, value: 45 }],
      },
    ],
  };

  const btnRes = AnimationValidator.validateSampleForElement(sample3DOn2D, {
    elementId: "btn_action",
    elementName: "ActionButton",
    archetype: "button",
  });

  assert.equal(btnRes.isValid, false);
  assert.equal(btnRes.allowedTracks.length, 1);
  assert.equal(btnRes.allowedTracks[0].trackId, "opacity");
  assert.equal(btnRes.rejectedTracks.length, 3);
  assert.equal(captured.length, 3);
  assert.match(captured[0].message, /cannot be attached to archetype 'button'/);

  unsubscribe();
});

test("Sub-Phase 8.6: Traps 2D typography and SVG tracks on object3D with [ANIM_COMPAT]", () => {
  DiagnosticBus.clearHistory();
  const captured: DiagnosticEvent[] = [];
  const unsubscribe = DiagnosticBus.subscribeChannel("ANIM_COMPAT", (ev) => {
    captured.push(ev);
  });

  const sample2DOn3D: AnimationSample = {
    id: "sample_2d_on_3d",
    name: "2DTracksOnObject3D",
    duration: 800,
    easing: "ease-in-out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "position3D",
        keyframes: [{ offset: 0, value: [0, 0, 0] }, { offset: 100, value: [5, 0, 0] }],
      },
      {
        trackId: "letterSpacing",
        keyframes: [{ offset: 0, value: 2 }, { offset: 100, value: 0 }],
      },
      {
        trackId: "borderRadius",
        keyframes: [{ offset: 0, value: 8 }, { offset: 100, value: 0 }],
      },
      {
        trackId: "pathMorph",
        keyframes: [{ offset: 0, value: "M 0 0 L 10 10" }],
      },
    ],
  };

  const res = AnimationValidator.validateSampleForElement(sample2DOn3D, {
    elementId: "mesh_cube",
    elementName: "HeroCubeMesh",
    archetype: "object3D",
  });

  unsubscribe();

  assert.equal(res.isValid, false);
  assert.equal(res.allowedTracks.length, 1);
  assert.equal(res.allowedTracks[0].trackId, "position3D");
  assert.equal(res.rejectedTracks.length, 3);
  assert.equal(captured.length, 3);
  assert.match(captured[0].message, /cannot be attached to archetype 'object3D'/);
});

test("Sub-Phase 8.6: Valid 3D tracks pass on object3D, camera3D, and light3D archetypes", () => {
  DiagnosticBus.clearHistory();

  const object3DSample: AnimationSample = {
    id: "sample_valid_obj3d",
    name: "Object3DSpinAndFly",
    duration: 1200,
    easing: "power2.out",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "position3D",
        keyframes: [{ offset: 0, value: [0, 0, 0] }, { offset: 100, value: [0, 10, -5] }],
      },
      {
        trackId: "rotation3D",
        keyframes: [{ offset: 0, value: [0, 0, 0, 1] }, { offset: 100, value: [0, 0.707, 0, 0.707] }],
      },
      {
        trackId: "scale3D",
        keyframes: [{ offset: 0, value: [1, 1, 1] }, { offset: 100, value: [2, 2, 2] }],
      },
    ],
  };

  const objRes = AnimationValidator.validateSampleForElement(object3DSample, {
    elementId: "mesh_torus",
    elementName: "FloatingTorus",
    archetype: "object3D",
  });

  assert.equal(objRes.isValid, true);
  assert.equal(objRes.allowedTracks.length, 3);
  assert.equal(objRes.rejectedTracks.length, 0);

  const cameraSample: AnimationSample = {
    id: "sample_valid_cam3d",
    name: "CameraDollyZoom",
    duration: 1500,
    easing: "power4.inOut",
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    tracks: [
      {
        trackId: "position3D",
        keyframes: [{ offset: 0, value: [0, 5, 20] }, { offset: 100, value: [0, 2, 8] }],
      },
      {
        trackId: "cameraFov",
        keyframes: [{ offset: 0, value: 75 }, { offset: 100, value: 40 }],
      },
    ],
  };

  const camRes = AnimationValidator.validateSampleForElement(cameraSample, {
    elementId: "cam_main",
    elementName: "MainPerspectiveCamera",
    archetype: "camera3D",
  });

  assert.equal(camRes.isValid, true);
  assert.equal(camRes.allowedTracks.length, 2);

  const lightSample: AnimationSample = {
    id: "sample_valid_light3d",
    name: "SunlightPulse",
    duration: 1000,
    easing: "power1.inOut",
    iterations: "infinite",
    direction: "alternate",
    fillMode: "both",
    tracks: [
      {
        trackId: "lightIntensity",
        keyframes: [{ offset: 0, value: 0.5 }, { offset: 100, value: 2.0 }],
      },
      {
        trackId: "lightColor",
        keyframes: [{ offset: 0, value: "#ffffff" }, { offset: 100, value: "#f59e0b" }],
      },
    ],
  };

  const lightRes = AnimationValidator.validateSampleForElement(lightSample, {
    elementId: "sun_dir",
    elementName: "SunLight",
    archetype: "light3D",
  });

  assert.equal(lightRes.isValid, true);
  assert.equal(lightRes.allowedTracks.length, 2);
  assert.equal(DiagnosticBus.getHistoryByChannel("ANIM_COMPAT").length, 0);
});

