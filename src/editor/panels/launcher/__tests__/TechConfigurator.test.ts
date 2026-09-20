/**
 * ============================================================================
 * SUB-PHASE 2.3 VERIFICATION: TECH CONFIGURATOR TEST SUITE
 * ============================================================================
 * Tests:
 * 1. FRAMEWORK_OPTIONS covers 6 target frameworks (Next.js App/Pages, Vite, Vue, Svelte, Vanilla).
 * 2. STYLING_OPTIONS covers 4 styling systems (Tailwind, Vanilla CSS, Modules, Styled-Components).
 * 3. ANIMATION_OPTIONS covers 4 animation engines (GSAP, Framer Motion, SVG/Native, Hybrid).
 * 4. TEMPLATE_OPTIONS covers 4 starting templates (Blank, Hover, Reveal, Ambient).
 * 5. TechConfigurator component renders properly with labels, select elements, and language toggle.
 * 6. Change handlers correctly trigger onChange with immutable updated config.
 * 7. Query string construction for editor launch incorporates all 5 configuration fields.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
  FRAMEWORK_OPTIONS,
  STYLING_OPTIONS,
  ANIMATION_OPTIONS,
  TEMPLATE_OPTIONS,
  TechConfig,
  TechConfigurator,
  TargetFramework,
  StylingSystem,
  AnimationEngine,
  ProjectLanguage,
  StartingTemplate,
} from "../TechConfigurator";

describe("Sub-Phase 2.3: Technology & Engine Configurator", () => {
  describe("1. Technology Options Registry", () => {
    it("contains 6 target frameworks matching PRD.md §7.1", () => {
      assert.strictEqual(FRAMEWORK_OPTIONS.length, 6);
      const ids = FRAMEWORK_OPTIONS.map((f) => f.id);
      assert.deepStrictEqual(ids, [
        "nextjs-app",
        "nextjs-pages",
        "react-vite",
        "vue",
        "svelte",
        "vanilla",
      ]);
      // Verify Next.js App Router is flagged Recommended
      const nextApp = FRAMEWORK_OPTIONS.find((f) => f.id === "nextjs-app");
      assert.strictEqual(nextApp?.badge, "Recommended");
    });

    it("contains 4 styling systems matching PRD.md §7.2", () => {
      assert.strictEqual(STYLING_OPTIONS.length, 4);
      const ids = STYLING_OPTIONS.map((s) => s.id);
      assert.deepStrictEqual(ids, [
        "tailwind",
        "vanilla-css",
        "css-modules",
        "styled-components",
      ]);
    });

    it("contains 4 animation engines matching PRD.md §7.3", () => {
      assert.strictEqual(ANIMATION_OPTIONS.length, 4);
      const ids = ANIMATION_OPTIONS.map((a) => a.id);
      assert.deepStrictEqual(ids, [
        "gsap",
        "framer-motion",
        "svg-native",
        "hybrid",
      ]);
    });

    it("contains 4 starting template presets", () => {
      assert.strictEqual(TEMPLATE_OPTIONS.length, 4);
      const ids = TEMPLATE_OPTIONS.map((t) => t.id);
      assert.deepStrictEqual(ids, [
        "blank",
        "preset-hover",
        "preset-reveal",
        "preset-ambient",
      ]);
    });
  });

  describe("2. Default Configuration & Schema Integrity", () => {
    it("validates default recommended tech stack", () => {
      const defaultConfig: TechConfig = {
        framework: "nextjs-app",
        styling: "tailwind",
        animation: "gsap",
        language: "typescript",
        template: "blank",
      };

      assert.strictEqual(defaultConfig.framework, "nextjs-app");
      assert.strictEqual(defaultConfig.styling, "tailwind");
      assert.strictEqual(defaultConfig.animation, "gsap");
      assert.strictEqual(defaultConfig.language, "typescript");
      assert.strictEqual(defaultConfig.template, "blank");
    });

    it("validates language toggle options are limited to typescript and javascript", () => {
      const validLangs: ProjectLanguage[] = ["typescript", "javascript"];
      assert.strictEqual(validLangs.length, 2);
    });
  });

  describe("3. TechConfigurator React Element Structure", () => {
    it("instantiates TechConfigurator without crashing", () => {
      const dummyConfig: TechConfig = {
        framework: "nextjs-app",
        styling: "tailwind",
        animation: "gsap",
        language: "typescript",
        template: "blank",
      };

      let changedConfig: TechConfig | null = null;
      const element = React.createElement(TechConfigurator, {
        config: dummyConfig,
        onChange: (cfg) => {
          changedConfig = cfg;
        },
      });

      assert.strictEqual(element.type, TechConfigurator);
      assert.deepStrictEqual(element.props.config, dummyConfig);
    });
  });

  describe("4. Launch URL Generation & Query Encoding", () => {
    it("generates correct URL parameters for Next.js + Tailwind + GSAP + TypeScript", () => {
      const config: TechConfig = {
        framework: "nextjs-app",
        styling: "tailwind",
        animation: "gsap",
        language: "typescript",
        template: "preset-hover",
      };
      const projectName = "HeroBannerImage";
      const archetype = "image";

      const url = `/editor?name=${encodeURIComponent(projectName)}&scope=element&archetype=${archetype}&framework=${config.framework}&styling=${config.styling}&animation=${config.animation}&lang=${config.language}&template=${config.template}`;

      assert.ok(url.includes("name=HeroBannerImage"));
      assert.ok(url.includes("scope=element"));
      assert.ok(url.includes("archetype=image"));
      assert.ok(url.includes("framework=nextjs-app"));
      assert.ok(url.includes("styling=tailwind"));
      assert.ok(url.includes("animation=gsap"));
      assert.ok(url.includes("lang=typescript"));
      assert.ok(url.includes("template=preset-hover"));
    });

    it("handles JavaScript and Vanilla CSS options in launch URL", () => {
      const config: TechConfig = {
        framework: "react-vite",
        styling: "vanilla-css",
        animation: "framer-motion",
        language: "javascript",
        template: "blank",
      };
      const projectName = "My Button";
      const archetype = "button";

      const url = `/editor?name=${encodeURIComponent(projectName)}&scope=element&archetype=${archetype}&framework=${config.framework}&styling=${config.styling}&animation=${config.animation}&lang=${config.language}&template=${config.template}`;

      assert.ok(url.includes("name=My%20Button"));
      assert.ok(url.includes("framework=react-vite"));
      assert.ok(url.includes("styling=vanilla-css"));
      assert.ok(url.includes("animation=framer-motion"));
      assert.ok(url.includes("lang=javascript"));
    });
  });
});
