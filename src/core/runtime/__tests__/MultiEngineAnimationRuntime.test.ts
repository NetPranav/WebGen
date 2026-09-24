import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MultiEngineAnimationRuntimeService,
  multiEngineAnimationRuntime,
} from "../MultiEngineAnimationRuntime";
import { AnimationSample } from "../../types/animations";

describe("Phase 5: Multi-Engine Animation Runtime", () => {
  const runtime = new MultiEngineAnimationRuntimeService();

  // ==========================================================================
  // SUB-PHASE 5.1: GSAP 3.12 CORE INTEGRATION
  // ==========================================================================
  describe("Sub-Phase 5.1: GSAP 3.12 Core Integration", () => {
    it("maps property paths from all element families to canonical GSAP names", () => {
      // Universal
      assert.equal(runtime.mapPropertyToGsap("transform.x"), "x");
      assert.equal(runtime.mapPropertyToGsap("transform.y"), "y");
      assert.equal(runtime.mapPropertyToGsap("transform.rotate"), "rotation");
      assert.equal(runtime.mapPropertyToGsap("transform.scale"), "scale");
      assert.equal(runtime.mapPropertyToGsap("appearance.opacity"), "opacity");
      assert.equal(runtime.mapPropertyToGsap("appearance.border.color"), "borderColor");

      // Media
      assert.equal(runtime.mapPropertyToGsap("media.scale"), "scale");
      assert.equal(runtime.mapPropertyToGsap("media.clipPath"), "clipPath");
      assert.equal(runtime.mapPropertyToGsap("svg.path"), "morphSVG");
      assert.equal(runtime.mapPropertyToGsap("svg.strokeDashoffset"), "strokeDashoffset");

      // Structural (Divider & Background)
      assert.equal(runtime.mapPropertyToGsap("divider.length"), "scaleX");
      assert.equal(runtime.mapPropertyToGsap("divider.strokeDashoffset"), "strokeDashoffset");
      assert.equal(runtime.mapPropertyToGsap("background.gradient.angle"), "--gradient-angle");
      assert.equal(runtime.mapPropertyToGsap("background.blendMode"), "mixBlendMode");
    });

    it("compiles timeline tracks with ScrollTrigger configuration", () => {
      const sample: AnimationSample = {
        id: "hero-card-anim",
        name: "Hero Card",
        duration: 1000,
        easing: "power2.out",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "translateY",
            keyframes: [
              { offset: 0, value: 40 },
              { offset: 100, value: 0 },
            ],
          },
          {
            trackId: "opacity",
            keyframes: [
              { offset: 0, value: 0 },
              { offset: 100, value: 1 },
            ],
          },
        ],
      };

      const code = runtime.compileGsapTimeline(sample, {
        componentSelector: ".hero-card",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top 75%",
          end: "bottom 25%",
          scrub: 1,
          pin: true,
          markers: false,
        },
      });

      assert.ok(code.includes("const tl = gsap.timeline"));
      assert.ok(code.includes('trigger: ".hero-section"'));
      assert.ok(code.includes('start: "top 75%"'));
      assert.ok(code.includes('end: "bottom 25%"'));
      assert.ok(code.includes("scrub: 1"));
      assert.ok(code.includes("pin: true"));
      assert.ok(code.includes("y: 0"));
      assert.ok(code.includes("opacity: 1"));
    });

    it("exports React useGSAP hook when requested", () => {
      const sample: AnimationSample = {
        id: "btn-entrance",
        name: "Button Entrance",
        duration: 800,
        easing: "power3.out",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "scale",
            keyframes: [
              { offset: 0, value: 0.9 },
              { offset: 100, value: 1.0 },
            ],
          },
        ],
      };

      const code = runtime.compileGsapTimeline(sample, { useReactHook: true });
      assert.ok(code.includes('import { useGSAP } from "@gsap/react"'));
      assert.ok(code.includes("export function useBtnEntranceAnimation"));
      assert.ok(code.includes("useGSAP("));
    });
  });

  // ==========================================================================
  // SUB-PHASE 5.2: FRAMER MOTION 11 CORE INTEGRATION
  // ==========================================================================
  describe("Sub-Phase 5.2: Framer Motion 11 Core Integration", () => {
    it("solves spring physics with continuous initial velocity handoff", () => {
      const springConfig = { stiffness: 300, damping: 20, mass: 1, initialVelocity: 50 };

      // At t = 0, position starts from 0, velocity matches initial handoff v0
      const state0 = runtime.solveSpringPhysics(springConfig, 0, 100);
      assert.equal(Math.round(state0.position), 0);
      assert.equal(Math.round(state0.velocity), 50);

      // At t = 1.0s, spring has damped down close to target = 100
      const state1 = runtime.solveSpringPhysics(springConfig, 1.0, 100);
      assert.ok(Math.abs(state1.position - 100) < 5);
      assert.ok(Math.abs(state1.velocity) < 5);
    });

    it("compiles declarative Framer Motion Variants with spring physics", () => {
      const sample: AnimationSample = {
        id: "interactive-btn",
        name: "Interactive Button",
        duration: 600,
        easing: "spring",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "translateY",
            keyframes: [
              { offset: 0, value: 12 },
              { offset: 100, value: 0 },
            ],
          },
          {
            trackId: "opacity",
            keyframes: [
              { offset: 0, value: 0 },
              { offset: 100, value: 1 },
            ],
          },
        ],
      };

      const code = runtime.compileFramerMotionVariants(sample, {
        springConfig: { stiffness: 400, damping: 25, mass: 1 },
      });

      assert.ok(code.includes('import { motion, type Variants } from "framer-motion"'));
      assert.ok(code.includes("interactiveBtnVariants: Variants"));
      assert.ok(code.includes('type: "spring"'));
      assert.ok(code.includes("stiffness: 400"));
      assert.ok(code.includes("damping: 25"));
      assert.ok(code.includes("hover: {"));
      assert.ok(code.includes("tap: {"));
    });
  });

  // ==========================================================================
  // SUB-PHASE 5.3: SVG & DIVIDER STROKE-DRAW ENGINE
  // ==========================================================================
  describe("Sub-Phase 5.3: SVG & Divider Stroke-Draw Engine", () => {
    it("calculates stroke-dasharray and stroke-dashoffset for line drawing", () => {
      const result0 = runtime.solveSvgStrokeDraw(500, 0);
      assert.equal(result0.strokeDasharray, 500);
      assert.equal(result0.strokeDashoffset, 500); // completely hidden

      const result50 = runtime.solveSvgStrokeDraw(500, 0.5);
      assert.equal(result50.strokeDashoffset, 250); // half drawn

      const result100 = runtime.solveSvgStrokeDraw(500, 1);
      assert.equal(result100.strokeDashoffset, 0); // fully drawn
    });

    it("solves divider draw-in for both scaleX and stroke modes", () => {
      const scaleResult = runtime.solveDividerDrawIn(0.75, "horizontal", "scale");
      assert.equal(scaleResult.transform, "scaleX(0.7500)");
      assert.equal(scaleResult.lengthPercentage, 75);

      const strokeResult = runtime.solveDividerDrawIn(0.6, "horizontal", "stroke", 800);
      assert.equal(strokeResult.strokeDasharray, 800);
      assert.equal(strokeResult.strokeDashoffset, 320); // 800 * (1 - 0.6) = 320
    });

    it("interpolates matching SVG path coordinate strings", () => {
      const pathA = "M 0 0 L 100 0";
      const pathB = "M 0 50 L 100 50";

      const halfway = runtime.interpolateSvgPath(pathA, pathB, 0.5);
      assert.ok(halfway.includes("25.00")); // 0 -> 50 halfway is 25
    });
  });

  // ==========================================================================
  // SUB-PHASE 5.4: IMAGE MOTION ENGINE
  // ==========================================================================
  describe("Sub-Phase 5.4: Image Motion Engine", () => {
    it("evaluates Ken Burns slow zoom and drift pan", () => {
      const kb = runtime.evaluateKenBurns(1.0, 1.2, 30, -20, 0.5);
      assert.equal(kb.scale, 1.1);
      assert.equal(kb.x, 15);
      assert.equal(kb.y, -10);
      assert.ok(kb.transform.includes("translate3d(15.00px, -10.00px, 0px)"));
      assert.ok(kb.transform.includes("scale(1.100)"));
    });

    it("evaluates clip-path reveal wipes", () => {
      const inset = runtime.evaluateClipPathReveal("inset", 0.7, "left-to-right");
      assert.equal(inset, "inset(0% 30.0% 0% 0%)");

      const circle = runtime.evaluateClipPathReveal("circle", 0.8);
      assert.equal(circle, "circle(80.0% at 50% 50%)");
    });

    it("evaluates multi-property image filters", () => {
      const filterStr = runtime.evaluateImageFilter({
        blur: 4,
        grayscale: 0.8,
        brightness: 1.2,
        contrast: 1.1,
      });

      assert.ok(filterStr.includes("blur(4px)"));
      assert.ok(filterStr.includes("grayscale(0.8)"));
      assert.ok(filterStr.includes("brightness(1.2)"));
      assert.ok(filterStr.includes("contrast(1.1)"));
    });

    it("calculates scroll-linked image parallax offsets", () => {
      const p = runtime.evaluateScrollParallax(200, 0.4);
      assert.equal(p.yOffset, -80);
      assert.ok(p.transform.includes("-80.00px"));
    });
  });

  // ==========================================================================
  // SUB-PHASE 5.5: BACKGROUND MOTION ENGINE
  // ==========================================================================
  describe("Sub-Phase 5.5: Background Motion Engine", () => {
    it("evaluates animatable gradient angle drift", () => {
      const stops = [
        { color: "#206859", offset: 0 },
        { color: "#111827", offset: 100 },
      ];
      const grad = runtime.evaluateBackgroundGradient(stops, 135, 90, 0.5);
      assert.equal(grad.currentAngle, 180); // 135 + 90 * 0.5 = 180
      assert.ok(grad.background.includes("linear-gradient(180.0deg"));
    });

    it("evaluates background noise grain pulse", () => {
      const noise = runtime.evaluateBackgroundNoise(0.06, 0.02, 0.25);
      assert.ok(noise.noiseOpacity > 0.06);
      assert.equal(noise.filterId, "lazylayout-noise-filter");
    });
  });

  // ==========================================================================
  // SUB-PHASE 5.6: NATIVE CSS KEYFRAME & SPRING EMITTER
  // ==========================================================================
  describe("Sub-Phase 5.6: Native CSS Keyframe & Spring Emitter", () => {
    it("generates analytical CSS linear() spring curve", () => {
      const linearSpring = runtime.generateCssLinearSpring(350, 22, 1, 16);
      assert.ok(linearSpring.startsWith("linear("));
      assert.ok(linearSpring.endsWith(")"));
      assert.ok(linearSpring.includes("0.000"));
      assert.ok(linearSpring.includes("1.000"));
    });

    it("generates pure CSS @keyframes block", () => {
      const tracks = [
        {
          trackId: "opacity" as const,
          keyframes: [
            { offset: 0, value: 0 },
            { offset: 100, value: 1 },
          ],
        },
        {
          trackId: "translateY" as const,
          keyframes: [
            { offset: 0, value: "20px" },
            { offset: 100, value: "0px" },
          ],
        },
      ];

      const keyframes = runtime.generateCssKeyframes("fade-up", tracks);
      assert.ok(keyframes.includes("@keyframes fade-up"));
      assert.ok(keyframes.includes("0% {"));
      assert.ok(keyframes.includes("100% {"));
      assert.ok(keyframes.includes("opacity: 0;"));
      assert.ok(keyframes.includes("opacity: 1;"));
    });
  });

  // ==========================================================================
  // PHASE 5 VERIFICATION GATE: ALL 4 ELEMENT FAMILIES
  // ==========================================================================
  describe("Phase 5 Verification Gate: All 4 Element Families", () => {
    it("1. Interactive Button: Evaluates spring bounce with Single Transform Authority", () => {
      const buttonSample: AnimationSample = {
        id: "btn-bounce",
        name: "Button Bounce",
        duration: 500,
        easing: "spring",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "scale",
            keyframes: [
              { offset: 0, value: 0.95 },
              { offset: 50, value: 1.05 },
              { offset: 100, value: 1.0 },
            ],
          },
          {
            trackId: "translateY",
            keyframes: [
              { offset: 0, value: -2 },
              { offset: 100, value: 0 },
            ],
          },
        ],
      };

      const styleAt50 = runtime.evaluateElementStyles(buttonSample, 250);
      assert.ok(styleAt50.transform);
      assert.ok(styleAt50.transform.includes("scale(1.05"));
      assert.ok(styleAt50.transform.includes("translate3d"));
    });

    it("2. Media Image: Evaluates Ken Burns + filter combo cleanly", () => {
      const imageSample: AnimationSample = {
        id: "img-kenburns",
        name: "Image Ken Burns",
        duration: 2000,
        easing: "ease-out",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "scale",
            keyframes: [
              { offset: 0, value: 1.0 },
              { offset: 100, value: 1.15 },
            ],
          },
          {
            trackId: "filterBlur",
            keyframes: [
              { offset: 0, value: 8 },
              { offset: 100, value: 0 },
            ],
          },
        ],
      };

      const styleAt100 = runtime.evaluateElementStyles(imageSample, 2000);
      assert.ok(styleAt100.transform?.includes("scale(1.15"));
      assert.equal(styleAt100.filter, "blur(0px)");
    });

    it("3. Structural Divider: Evaluates stroke draw-in cleanly", () => {
      const dividerSample: AnimationSample = {
        id: "divider-draw",
        name: "Divider Draw",
        duration: 800,
        easing: "ease-in-out",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "strokeDashoffset",
            keyframes: [
              { offset: 0, value: 600 },
              { offset: 100, value: 0 },
            ],
          },
        ],
      };

      const styleAt50 = runtime.evaluateElementStyles(dividerSample, 400);
      assert.equal(styleAt50.strokeDashoffset, 300);
    });

    it("4. Structural Background: Evaluates color and blend-mode transitions", () => {
      const bgSample: AnimationSample = {
        id: "bg-ambient",
        name: "Background Ambient",
        duration: 1500,
        easing: "linear",
        iterations: "infinite",
        direction: "alternate",
        fillMode: "both",
        tracks: [
          {
            trackId: "opacity",
            keyframes: [
              { offset: 0, value: 0.4 },
              { offset: 100, value: 0.9 },
            ],
          },
          {
            trackId: "backgroundColor",
            keyframes: [
              { offset: 0, value: "#206859" },
              { offset: 100, value: "#0d2822" },
            ],
          },
        ],
      };

      const styleAt0 = runtime.evaluateElementStyles(bgSample, 0);
      assert.equal(styleAt0.opacity, "0.4");
      assert.equal(styleAt0.backgroundColor, "#206859");
    });
  });
});
