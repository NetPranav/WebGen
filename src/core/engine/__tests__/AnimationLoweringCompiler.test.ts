import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AnimationLoweringCompiler } from "../AnimationLoweringCompiler";
import { AnimationBinding } from "../../types/element-grammar";

describe("AnimationLoweringCompiler (Two-Tier Export Lowering Pipeline)", () => {
  it("mathematically samples analytical spring into CSS linear() timing curve", () => {
    const springCss = AnimationLoweringCompiler.generateCssLinearSpring(350, 22, 1);
    assert.ok(springCss.startsWith("linear("));
    assert.ok(springCss.endsWith(")"));
    // Verify it contains multiple floating-point interpolation points
    const points = springCss.slice(7, -1).split(", ");
    assert.ok(points.length >= 20);
    // Final point should settle near 1.0
    const finalVal = parseFloat(points[points.length - 1]);
    assert.ok(Math.abs(finalVal - 1.0) < 0.05);
  });

  it("compiles to Target A (Zero-Dependency Web) with 0 external dependencies", () => {
    const bindings: AnimationBinding[] = [
      {
        id: "b1",
        targetElementId: "cta_btn",
        category: "Hover",
        trigger: "OnHoverEnter",
        properties: ["transform.y", "transform.scale"],
        priority: 0,
        timing: {
          springConfig: { stiffness: 400, damping: 25, mass: 1 },
        },
      },
      {
        id: "b2",
        targetElementId: "cta_btn",
        category: "Ambient",
        trigger: "Ambient",
        properties: ["transform.y"],
        priority: 0,
        timing: { duration: 2500 },
      },
    ];

    const result = AnimationLoweringCompiler.compile(bindings, "zero-dependency-web", {
      componentName: "HeroCtaButton",
    });

    assert.equal(result.target, "zero-dependency-web");
    assert.equal(result.externalDependencies.length, 0, "Target A must have 0 external dependencies");
    assert.ok(result.cssOutput.includes("@keyframes ll-anim-ambient-b2"));
    assert.ok(result.cssOutput.includes(".ll-heroctabutton:hover"));
    assert.ok(result.cssOutput.includes("@media (prefers-reduced-motion: reduce)"));
  });

  it("compiles to Target B (Framer Motion React)", () => {
    const bindings: AnimationBinding[] = [
      {
        id: "b_ent",
        targetElementId: "card_1",
        category: "Entrance",
        trigger: "OnLoad",
        properties: ["opacity", "transform.y"],
        priority: 0,
      },
      {
        id: "b_hov",
        targetElementId: "card_1",
        category: "Hover",
        trigger: "OnHoverEnter",
        properties: ["transform.scale"],
        priority: 0,
      },
    ];

    const result = AnimationLoweringCompiler.compile(bindings, "framer-motion", {
      componentName: "FeatureCard",
    });

    assert.equal(result.target, "framer-motion");
    assert.ok(result.externalDependencies.includes("framer-motion"));
    assert.ok(result.componentJsx?.includes("<motion.div"));
    assert.ok(result.componentJsx?.includes("whileHover"));
    assert.ok(result.componentJsx?.includes("initial="));
  });

  it("compiles to Target C (GSAP + ScrollTrigger)", () => {
    const bindings: AnimationBinding[] = [
      {
        id: "b_scrub",
        targetElementId: "banner_1",
        category: "ScrollLinked",
        trigger: "OnScrollScrub",
        properties: ["transform.y"],
        priority: 0,
        scrollLinked: {
          subMode: "curve-mapped",
          startThreshold: "top 80%",
          endThreshold: "bottom 20%",
        },
      },
    ];

    const result = AnimationLoweringCompiler.compile(bindings, "gsap", {
      componentName: "ParallaxBanner",
    });

    assert.equal(result.target, "gsap");
    assert.ok(result.externalDependencies.includes("gsap"));
    assert.ok(result.externalDependencies.includes("@gsap/scrolltrigger"));
    assert.ok(result.jsOutput.includes("ScrollTrigger.create") || result.jsOutput.includes("scrollTrigger:"));
  });
});
