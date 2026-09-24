import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SvgFilterGradientEngine } from "../SvgFilterGradientEngine";
import {
  FeColorMatrixEffect,
  FeGaussianBlurEffect,
  SvgFilterDefinition,
  SvgLinearGradientDefinition,
  SvgRadialGradientDefinition,
} from "../../types/svg-filters-gradients";
import { AnimationValidator } from "../AnimationValidator";
import { GSAPTimelineCompiler } from "../GSAPTimelineCompiler";
import { AnimationSample } from "../../types/animations";
import { DiagnosticBus } from "../DiagnosticBus";

describe("Sub-Phase 7.3: SvgFilterGradientEngine & Animation Pipeline", () => {
  beforeEach(() => {
    DiagnosticBus.clearHistory();
  });

  // ==========================================================================
  // 1. COLOR PARSING & INTERPOLATION
  // ==========================================================================
  describe("Color Parsing & Interpolation", () => {
    it("parses hex colors in 3, 6, and 8 digit formats", () => {
      const c3 = SvgFilterGradientEngine.parseColor("#f00");
      assert.deepEqual(c3, { r: 255, g: 0, b: 0, a: 1 });

      const c6 = SvgFilterGradientEngine.parseColor("#00ff00");
      assert.deepEqual(c6, { r: 0, g: 255, b: 0, a: 1 });

      const c8 = SvgFilterGradientEngine.parseColor("#0000ff80");
      assert.equal(c8.r, 0);
      assert.equal(c8.g, 0);
      assert.equal(c8.b, 255);
      assert.ok(Math.abs(c8.a - 0.502) < 0.01);
    });

    it("parses rgb and rgba strings and named colors", () => {
      const rgb = SvgFilterGradientEngine.parseColor("rgb(100, 150, 200)");
      assert.deepEqual(rgb, { r: 100, g: 150, b: 200, a: 1 });

      const rgba = SvgFilterGradientEngine.parseColor("rgba(50, 60, 70, 0.4)");
      assert.deepEqual(rgba, { r: 50, g: 60, b: 70, a: 0.4 });

      const named = SvgFilterGradientEngine.parseColor("white");
      assert.deepEqual(named, { r: 255, g: 255, b: 255, a: 1 });

      const transparent = SvgFilterGradientEngine.parseColor("transparent");
      assert.deepEqual(transparent, { r: 0, g: 0, b: 0, a: 0 });
    });

    it("interpolates colors smoothly across RGBA channels", () => {
      const start = "#ff0000"; // red
      const end = "#0000ff"; // blue

      const atZero = SvgFilterGradientEngine.interpolateColor(start, end, 0);
      assert.equal(atZero, "rgb(255, 0, 0)");

      const atHalf = SvgFilterGradientEngine.interpolateColor(start, end, 0.5);
      assert.equal(atHalf, "rgb(128, 0, 128)");

      const atOne = SvgFilterGradientEngine.interpolateColor(start, end, 1);
      assert.equal(atOne, "rgb(0, 0, 255)");
    });
  });

  // ==========================================================================
  // 2. FEGAUSSIANBLUR ANIMATION & SERIALIZATION
  // ==========================================================================
  describe("feGaussianBlur Animation & Serialization", () => {
    it("serializes feGaussianBlur with single and tuple stdDeviation", () => {
      const single = SvgFilterGradientEngine.serializeGaussianBlur({
        type: "feGaussianBlur",
        stdDeviation: 8.5,
        edgeMode: "duplicate",
        result: "blurOut",
      });
      assert.equal(
        single,
        '<feGaussianBlur stdDeviation="8.5" edgeMode="duplicate" result="blurOut" />'
      );

      const tuple = SvgFilterGradientEngine.serializeGaussianBlur({
        type: "feGaussianBlur",
        stdDeviation: [4, 12],
      });
      assert.equal(tuple, '<feGaussianBlur stdDeviation="4 12" />');
    });

    it("interpolates stdDeviation smoothly without popping", () => {
      const interp1 = SvgFilterGradientEngine.interpolateStdDeviation(20, 0, 0.25);
      assert.equal(interp1, 15);

      const interp2 = SvgFilterGradientEngine.interpolateStdDeviation(20, 0, 0.5);
      assert.equal(interp2, 10);

      const interp3 = SvgFilterGradientEngine.interpolateStdDeviation(20, 0, 0.75);
      assert.equal(interp3, 5);

      const interp4 = SvgFilterGradientEngine.interpolateStdDeviation(20, 0, 1.0);
      assert.equal(interp4, 0);
    });

    it("interpolates anisotropic (2D) stdDeviation tuples", () => {
      const interp = SvgFilterGradientEngine.interpolateStdDeviation([10, 20], [0, 4], 0.5);
      assert.deepEqual(interp, [5, 12]);
    });
  });

  // ==========================================================================
  // 3. FECOLORMATRIX ANIMATION & SERIALIZATION
  // ==========================================================================
  describe("feColorMatrix Animation & Serialization", () => {
    it("serializes matrix, saturate, and hueRotate effects", () => {
      const sat = SvgFilterGradientEngine.serializeColorMatrix({
        type: "feColorMatrix",
        matrixType: "saturate",
        values: 0.5,
      });
      assert.equal(sat, '<feColorMatrix type="saturate" values="0.5" />');

      const hue = SvgFilterGradientEngine.serializeColorMatrix({
        type: "feColorMatrix",
        matrixType: "hueRotate",
        values: 180,
      });
      assert.equal(hue, '<feColorMatrix type="hueRotate" values="180" />');
    });

    it("interpolates 20-element 4x5 color matrices smoothly across all elements", () => {
      // Grayscale matrix
      const grayMatrix =
        "0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0";
      // Identity matrix
      const identityMatrix =
        "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";

      const atMid = SvgFilterGradientEngine.interpolateColorMatrixValues(
        "matrix",
        grayMatrix,
        identityMatrix,
        0.5
      );
      assert.equal(typeof atMid, "string");
      const values = (atMid as string).split(" ").map(Number);
      assert.equal(values.length, 20);
      assert.ok(Math.abs(values[0] - 0.665) < 0.01);
      assert.equal(values[18], 1); // Alpha row remains identity 1
    });

    it("interpolates saturate and hueRotate values linearly", () => {
      const sat = SvgFilterGradientEngine.interpolateColorMatrixValues("saturate", 0, 2, 0.5);
      assert.equal(sat, 1);

      const hue = SvgFilterGradientEngine.interpolateColorMatrixValues("hueRotate", 0, 360, 0.25);
      assert.equal(hue, 90);
    });
  });

  // ==========================================================================
  // 4. FEDISPLACEMENTMAP ANIMATION & SERIALIZATION
  // ==========================================================================
  describe("feDisplacementMap Animation & Serialization", () => {
    it("serializes feDisplacementMap with channels and scale", () => {
      const xml = SvgFilterGradientEngine.serializeDisplacementMap({
        type: "feDisplacementMap",
        scale: 25,
        xChannelSelector: "R",
        yChannelSelector: "G",
        in: "SourceGraphic",
        in2: "noise",
      });
      assert.equal(
        xml,
        '<feDisplacementMap scale="25" xChannelSelector="R" yChannelSelector="G" in="SourceGraphic" in2="noise" />'
      );
    });

    it("interpolates displacement scale parameter smoothly", () => {
      const scale = SvgFilterGradientEngine.interpolateDisplacementScale(50, 0, 0.6);
      assert.equal(scale, 20);
    });
  });

  // ==========================================================================
  // 5. COMPOUND SVG FILTER INTERPOLATION & SERIALIZATION
  // ==========================================================================
  describe("Compound SVG Filter Interpolation", () => {
    it("interpolates a compound multi-effect filter without dropping effects", () => {
      const filterA: SvgFilterDefinition = {
        id: "glowFilterA",
        effects: [
          { type: "feGaussianBlur", stdDeviation: 16 },
          { type: "feColorMatrix", matrixType: "saturate", values: 0 },
        ],
      };

      const filterB: SvgFilterDefinition = {
        id: "glowFilterB",
        effects: [
          { type: "feGaussianBlur", stdDeviation: 4 },
          { type: "feColorMatrix", matrixType: "saturate", values: 2 },
        ],
      };

      const interpolated = SvgFilterGradientEngine.interpolateFilter(
        filterA,
        filterB,
        0.5,
        "interpFilter"
      );
      assert.equal(interpolated.id, "interpFilter");
      assert.equal(interpolated.effects.length, 2);

      const blur = interpolated.effects[0] as FeGaussianBlurEffect;
      assert.equal(blur.stdDeviation, 10);

      const colorMat = interpolated.effects[1] as FeColorMatrixEffect;
      assert.equal(colorMat.values, 1);

      const xml = SvgFilterGradientEngine.serializeFilter(interpolated);
      assert.ok(xml.includes('<feGaussianBlur stdDeviation="10" />'));
      assert.ok(xml.includes('<feColorMatrix type="saturate" values="1" />'));
    });
  });

  // ==========================================================================
  // 6. GRADIENT STOP KEYFRAMING (linearGradient & radialGradient)
  // ==========================================================================
  describe("Gradient Stop Keyframing", () => {
    it("serializes linear and radial gradients with stops", () => {
      const linear: SvgLinearGradientDefinition = {
        id: "heroGrad",
        type: "linearGradient",
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
        stops: [
          { id: "s1", offset: 0, stopColor: "#ff0000" },
          { id: "s2", offset: 1, stopColor: "#0000ff", stopOpacity: 0.8 },
        ],
      };

      const xml = SvgFilterGradientEngine.serializeLinearGradient(linear);
      assert.ok(xml.includes('<linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">'));
      assert.ok(xml.includes('<stop offset="0.0%" stop-color="#ff0000" />'));
      assert.ok(xml.includes('<stop offset="100.0%" stop-color="#0000ff" stop-opacity="0.8" />'));
    });

    it("interpolates gradient stops with identical stop counts", () => {
      const gradA: SvgLinearGradientDefinition = {
        id: "gradA",
        type: "linearGradient",
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 0,
        stops: [
          { id: "s1", offset: 0, stopColor: "#ff0000" },
          { id: "s2", offset: 1, stopColor: "#ffff00" },
        ],
      };

      const gradB: SvgLinearGradientDefinition = {
        id: "gradB",
        type: "linearGradient",
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
        stops: [
          { id: "s1", offset: 0.2, stopColor: "#0000ff" },
          { id: "s2", offset: 0.8, stopColor: "#00ff00" },
        ],
      };

      const result = SvgFilterGradientEngine.interpolateLinearGradient(gradA, gradB, 0.5);
      assert.equal(result.x2, 0.5);
      assert.equal(result.y2, 0.5);
      assert.equal(result.stops.length, 2);
      assert.ok(Math.abs(result.stops[0].offset - 0.1) < 0.01);
      assert.ok(Math.abs(result.stops[1].offset - 0.9) < 0.01);
    });

    it("resamples and morphs gradients with differing stop counts without visual popping", () => {
      const simpleGrad = [
        { id: "s1", offset: 0, stopColor: "#000000" },
        { id: "s2", offset: 1, stopColor: "#ffffff" },
      ];

      const tripleGrad = [
        { id: "t1", offset: 0, stopColor: "#ff0000" },
        { id: "t2", offset: 0.5, stopColor: "#00ff00" },
        { id: "t3", offset: 1, stopColor: "#0000ff" },
      ];

      const morphed = SvgFilterGradientEngine.interpolateGradientStops(
        simpleGrad,
        tripleGrad,
        0.5
      );
      assert.equal(morphed.length, 3);
      assert.equal(morphed[0].offset, 0);
      assert.equal(morphed[1].offset, 0.5);
      assert.equal(morphed[2].offset, 1);
    });

    it("interpolates radial gradients spatial geometry and radius", () => {
      const radA: SvgRadialGradientDefinition = {
        id: "radA",
        type: "radialGradient",
        cx: 0.5,
        cy: 0.5,
        r: 0.5,
        stops: [{ id: "s1", offset: 0, stopColor: "#ffffff" }],
      };

      const radB: SvgRadialGradientDefinition = {
        id: "radB",
        type: "radialGradient",
        cx: 0.2,
        cy: 0.8,
        r: 0.8,
        stops: [{ id: "s1", offset: 0, stopColor: "#000000" }],
      };

      const interp = SvgFilterGradientEngine.interpolateRadialGradient(radA, radB, 0.5);
      assert.equal(interp.cx, 0.35);
      assert.equal(interp.cy, 0.65);
      assert.equal(interp.r, 0.65);
    });
  });

  // ==========================================================================
  // 7. PLAY MODE VS PRODUCTION BUILD PARITY (Sub-Phase 7.3 verification)
  // ==========================================================================
  describe("Play Mode vs Exported Production Build Parity", () => {
    it("verifies blur-in filter animation renders identically at t=0, 0.25, 0.5, 0.75, 1.0", () => {
      const timeSteps = [0, 0.25, 0.5, 0.75, 1.0];
      const startStdDev = 24;
      const endStdDev = 0;

      timeSteps.forEach((t) => {
        const parity = SvgFilterGradientEngine.verifyBlurInFilterParity(
          startStdDev,
          endStdDev,
          t
        );
        assert.equal(parity.isParityMatch, true);
        assert.ok(parity.playModeCss.includes(`blur(${parity.deviationValue}px)`));
        assert.ok(
          parity.prodExportSvg.includes(
            `<feGaussianBlur stdDeviation="${parity.deviationValue}" />`
          )
        );
      });
    });

    it("generates a complete parity manifest with CSS and SVG equivalents", () => {
      const filter: SvgFilterDefinition = {
        id: "blurFilter1",
        effects: [{ type: "feGaussianBlur", stdDeviation: 12 }],
      };

      const gradient: SvgLinearGradientDefinition = {
        id: "linearGrad1",
        type: "linearGradient",
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 0,
        stops: [
          { id: "s1", offset: 0, stopColor: "#ff0000" },
          { id: "s2", offset: 1, stopColor: "#0000ff" },
        ],
      };

      const manifest = SvgFilterGradientEngine.generateParityManifest(
        "elem_123",
        filter,
        gradient
      );
      assert.equal(manifest.elementId, "elem_123");
      assert.equal(manifest.cssEquivalent.filter, "blur(12px)");
      assert.ok(manifest.cssEquivalent.background?.includes("linear-gradient"));
      assert.ok(manifest.svgDefXml.includes('<feGaussianBlur stdDeviation="12" />'));
      assert.ok(manifest.svgDefXml.includes('<linearGradient id="linearGrad1"'));
    });
  });

  // ==========================================================================
  // 8. ARCHETYPE COMPATIBILITY & TIMELINE COMPILER INTEGRATION
  // ==========================================================================
  describe("Animation Compatibility & Compiler Integration", () => {
    it("permits SVG filter and gradient tracks on svgPath elements", () => {
      const sample: AnimationSample = {
        id: "sample_svg_1",
        name: "SvgFilters",
        duration: 1000,
        easing: "ease-in-out",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "feGaussianBlur",
            keyframes: [
              { offset: 0, value: 20 },
              { offset: 100, value: 0 },
            ],
          },
          {
            trackId: "gradientStopColor",
            keyframes: [
              { offset: 0, value: "#ff0000" },
              { offset: 100, value: "#00ff00" },
            ],
          },
          {
            trackId: "strokeDashoffset",
            keyframes: [
              { offset: 0, value: 1000 },
              { offset: 100, value: 0 },
            ],
          },
        ],
      };

      const result = AnimationValidator.validateSampleForElement(sample, {
        elementId: "path_1",
        archetype: "svgPath",
      });

      assert.equal(result.isValid, true);
      assert.equal(result.allowedTracks.length, 3);
      assert.equal(result.rejectedTracks.length, 0);
    });

    it("traps pathMorph and strokeDashoffset tracks on text elements with [ANIM_COMPAT] diagnostic", () => {
      const sample: AnimationSample = {
        id: "sample_invalid",
        name: "InvalidForText",
        duration: 500,
        easing: "linear",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "pathMorph",
            keyframes: [{ offset: 0, value: "M0,0 L10,10 Z" }],
          },
          {
            trackId: "strokeDashoffset",
            keyframes: [{ offset: 0, value: 50 }],
          },
        ],
      };

      const result = AnimationValidator.validateSampleForElement(sample, {
        elementId: "text_elem_1",
        archetype: "text",
      });

      assert.equal(result.isValid, false);
      assert.equal(result.rejectedTracks.length, 2);
      assert.equal(result.sanitizedSample.tracks.length, 0);

      const diagnostics = DiagnosticBus.getHistoryByChannel("ANIM_COMPAT");
      assert.equal(diagnostics.length, 2);
      assert.ok(diagnostics[0].message.includes("cannot be attached to archetype 'text'"));
      assert.ok(diagnostics[1].message.includes("cannot be attached to archetype 'text'"));
    });

    it("compiles feGaussianBlur and strokeDashoffset tracks to CSS keyframes and GSAP parameters", () => {
      const sample: AnimationSample = {
        id: "sample_blur_in",
        name: "BlurInEffect",
        duration: 800,
        easing: "power2.out",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "feGaussianBlur",
            keyframes: [
              { offset: 0, value: 16 },
              { offset: 100, value: 0 },
            ],
          },
          {
            trackId: "strokeDashoffset",
            keyframes: [
              { offset: 0, value: 500 },
              { offset: 100, value: 0 },
            ],
          },
        ],
      };

      const compiled = GSAPTimelineCompiler.compile(sample);
      assert.ok(compiled.name.includes("anim_blurineffect_sample"));
      assert.ok(compiled.cssKeyframes.includes("filter: blur(16px);"));
      assert.ok(compiled.cssKeyframes.includes("filter: blur(0px);"));
      assert.ok(compiled.cssKeyframes.includes("stroke-dashoffset: 500;"));
      assert.ok(compiled.cssKeyframes.includes("stroke-dashoffset: 0;"));
      assert.equal(compiled.gsapConfig.duration, 0.8);
    });
  });
});
