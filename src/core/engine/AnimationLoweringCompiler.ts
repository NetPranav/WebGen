"use client";

/**
 * ============================================================================
 * LAZYLAYOUT ANIMATION LOWERING & EXPORT COMPILER
 * ============================================================================
 * Implements the Two-Tier Architecture from Section 10 of
 * ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md.
 * Lowers abstract grammar bindings into:
 * - Target A: Zero-Dependency Web (Pure CSS @keyframes, CSS linear() spring curves, WAAPI)
 * - Target B: Framework-Native React (Framer Motion / Motion)
 * - Target C: High-Fidelity Studio (GSAP & ScrollTrigger)
 * ============================================================================
 */

import {
  AnimationBinding,
  CompilationTarget,
  ReducedMotionPolicy,
} from "../types/element-grammar";
import { ElementGrammarEngine } from "./ElementGrammarEngine";

export interface CompiledExportResult {
  target: CompilationTarget;
  bundleSizeEstimatedBytes: number;
  externalDependencies: string[];
  cssOutput: string;
  jsOutput: string;
  componentJsx?: string;
}

export class AnimationLoweringCompilerService {
  /**
   * Numerically samples an analytical damped harmonic oscillator spring
   * (stiffness, damping, mass) into a standard CSS Easing Level 2 `linear(...)` string.
   * Enables true physics-based spring feel in 100% pure CSS with 0kb runtime!
   */
  public generateCssLinearSpring(
    stiffness = 300,
    damping = 20,
    mass = 1,
    points = 24
  ): string {
    const w0 = Math.sqrt(stiffness / mass); // undamped angular frequency
    const gamma = damping / (2 * mass); // damping ratio * w0
    const wd = Math.sqrt(Math.max(0.001, w0 * w0 - gamma * gamma)); // damped frequency

    // Duration until oscillation drops below 0.5% (rest delta)
    const settlingTime = Math.min(2.0, Math.max(0.3, 4.5 / gamma));
    const samples: string[] = [];

    for (let i = 0; i <= points; i++) {
      const t = (i / points) * settlingTime;
      // Damped harmonic oscillator displacement:
      // x(t) = 1 - e^(-gamma * t) * (cos(wd * t) + (gamma / wd) * sin(wd * t))
      const envelope = Math.exp(-gamma * t);
      const val = 1 - envelope * (Math.cos(wd * t) + (gamma / wd) * Math.sin(wd * t));
      samples.push(val.toFixed(3));
    }

    return `linear(${samples.join(", ")})`;
  }

  /**
   * Compiles abstract AnimationBinding[] into the requested target output.
   */
  public compile(
    bindings: AnimationBinding[],
    target: CompilationTarget,
    options: {
      componentName?: string;
      reducedMotionPolicy?: ReducedMotionPolicy;
    } = {}
  ): CompiledExportResult {
    const componentName = options.componentName || "LazyComponent";
    const policy = options.reducedMotionPolicy || "respect-os";

    // Pre-process bindings with reduced motion if requested
    const effectiveBindings = bindings.map((b) =>
      policy === "reduce" ? ElementGrammarEngine.applyReducedMotionFallback(b) : b
    );

    switch (target) {
      case "zero-dependency-web":
        return this.compileZeroDependencyWeb(effectiveBindings, componentName, policy);
      case "framer-motion":
        return this.compileFramerMotion(effectiveBindings, componentName);
      case "gsap":
        return this.compileGsap(effectiveBindings, componentName);
      default:
        return this.compileZeroDependencyWeb(effectiveBindings, componentName, policy);
    }
  }

  /**
   * TARGET A: Zero-Dependency Web (HTML + Pure CSS + WAAPI)
   * 0 external npm packages. Drops into any site.
   */
  private compileZeroDependencyWeb(
    bindings: AnimationBinding[],
    componentName: string,
    policy: ReducedMotionPolicy
  ): CompiledExportResult {
    let cssRules = `/* LazyLayout Zero-Dependency Motion: ${componentName} */\n`;
    let keyframesDef = "";
    const className = `ll-${componentName.toLowerCase()}`;

    // Base element class
    cssRules += `.${className} {\n  will-change: transform, opacity;\n`;

    for (const binding of bindings) {
      if (binding.category === "Ambient") {
        const animName = `ll-anim-ambient-${binding.id}`;
        const dur = (binding.timing?.duration || 3000) / 1000;
        cssRules += `  animation: ${animName} ${dur}s infinite ease-in-out alternate;\n`;
        keyframesDef += `@keyframes ${animName} {\n  from { transform: translateY(0px); }\n  to { transform: translateY(-8px); }\n}\n`;
      } else if (binding.category === "Hover") {
        const springCurve = this.generateCssLinearSpring(
          binding.timing?.springConfig?.stiffness || 350,
          binding.timing?.springConfig?.damping || 22,
          binding.timing?.springConfig?.mass || 1
        );
        cssRules += `  transition: transform 0.4s ${springCurve}, box-shadow 0.4s ease;\n`;
      }
    }
    cssRules += `}\n\n`;

    // Hover pseudo-class
    const hasHover = bindings.some((b) => b.category === "Hover");
    if (hasHover) {
      cssRules += `.${className}:hover {\n  transform: translateY(-4px) scale(1.02);\n  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);\n}\n\n`;
    }

    // Active (Press) pseudo-class
    const hasPress = bindings.some((b) => b.category === "Press");
    if (hasPress) {
      cssRules += `.${className}:active {\n  transform: translateY(0px) scale(0.97);\n  transition-duration: 0.1s;\n}\n\n`;
    }

    // Universal Reduced Motion Media Query (§9)
    if (policy !== "ignore-os") {
      cssRules += `@media (prefers-reduced-motion: reduce) {\n`;
      cssRules += `  .${className} {\n`;
      cssRules += `    animation: none !important;\n`;
      cssRules += `    transition: opacity 0.15s ease !important;\n`;
      cssRules += `    transform: none !important;\n`;
      cssRules += `  }\n`;
      cssRules += `  .${className}:hover,\n  .${className}:active {\n`;
      cssRules += `    transform: none !important;\n`;
      cssRules += `  }\n`;
      cssRules += `}\n`;
    }

    const fullCss = `${keyframesDef}\n${cssRules}`.trim();
    const fullJs = `// Zero-Dependency Vanilla Web Runner\n// No external libraries required.\nconsole.log("[LazyLayout] Initialized ${componentName} with 0 dependencies.");\n`;

    return {
      target: "zero-dependency-web",
      bundleSizeEstimatedBytes: fullCss.length + fullJs.length,
      externalDependencies: [],
      cssOutput: fullCss,
      jsOutput: fullJs,
      componentJsx: `<div className="${className}">\n  {/* Component content */}\n</div>`,
    };
  }

  /**
   * TARGET B: Framework-Native React (Framer Motion)
   */
  private compileFramerMotion(
    bindings: AnimationBinding[],
    componentName: string
  ): CompiledExportResult {
    const hasHover = bindings.some((b) => b.category === "Hover");
    const hasPress = bindings.some((b) => b.category === "Press");
    const hasEntrance = bindings.some((b) => b.category === "Entrance");

    let jsx = `import React from 'react';\nimport { motion } from 'framer-motion';\n\n`;
    jsx += `export const ${componentName}: React.FC = () => {\n`;
    jsx += `  return (\n    <motion.div\n`;

    if (hasEntrance) {
      jsx += `      initial={{ opacity: 0, y: 24 }}\n`;
      jsx += `      animate={{ opacity: 1, y: 0 }}\n`;
    }
    if (hasHover) {
      jsx += `      whileHover={{ y: -4, scale: 1.02 }}\n`;
    }
    if (hasPress) {
      jsx += `      whileTap={{ scale: 0.96 }}\n`;
    }

    jsx += `      transition={{\n        type: "spring",\n        stiffness: 350,\n        damping: 22,\n        mass: 1,\n      }}\n`;
    jsx += `      className="${componentName.toLowerCase()}-root"\n    >\n`;
    jsx += `      {/* Component content */}\n    </motion.div>\n  );\n};\n`;

    return {
      target: "framer-motion",
      bundleSizeEstimatedBytes: jsx.length + 32000, // Motion runtime footprint
      externalDependencies: ["framer-motion"],
      cssOutput: `/* Framer Motion manages styles dynamically via inline projection */`,
      jsOutput: jsx,
      componentJsx: jsx,
    };
  }

  /**
   * TARGET C: High-Fidelity Studio (GSAP & ScrollTrigger)
   */
  private compileGsap(
    bindings: AnimationBinding[],
    componentName: string
  ): CompiledExportResult {
    const hasScroll = bindings.some((b) => b.category === "ScrollLinked");

    let js = `import { gsap } from 'gsap';\n`;
    if (hasScroll) {
      js += `import { ScrollTrigger } from 'gsap/ScrollTrigger';\ngsap.registerPlugin(ScrollTrigger);\n\n`;
    }

    js += `export function init${componentName}Motion(elementSelector: string) {\n`;
    js += `  const el = document.querySelector(elementSelector);\n  if (!el) return;\n\n`;
    js += `  const tl = gsap.timeline({\n`;
    if (hasScroll) {
      js += `    scrollTrigger: {\n      trigger: el,\n      start: "top 80%",\n      end: "bottom 20%",\n      scrub: 0.5,\n    },\n`;
    }
    js += `  });\n\n`;

    for (const binding of bindings) {
      if (binding.category === "Entrance") {
        js += `  tl.from(el, { y: 30, opacity: 0, duration: 0.6, ease: "power2.out" });\n`;
      } else if (binding.category === "Ambient") {
        js += `  gsap.to(el, { y: -8, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut" });\n`;
      }
    }

    js += `  return tl;\n}\n`;

    return {
      target: "gsap",
      bundleSizeEstimatedBytes: js.length + 65000, // GSAP core footprint
      externalDependencies: hasScroll ? ["gsap", "@gsap/scrolltrigger"] : ["gsap"],
      cssOutput: `/* Ensure initial visibility state is handled */\n.${componentName.toLowerCase()}-root {\n  will-change: transform, opacity;\n}`,
      jsOutput: js,
      componentJsx: `<div className="${componentName.toLowerCase()}-root">\n  {/* Target for GSAP timeline */}\n</div>`,
    };
  }
}

export const AnimationLoweringCompiler = new AnimationLoweringCompilerService();
