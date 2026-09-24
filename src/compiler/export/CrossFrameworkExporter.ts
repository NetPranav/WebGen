"use client";

/**
 * ============================================================================
 * CROSS-FRAMEWORK EXPORT COORDINATOR
 * ============================================================================
 * Coordinates code emission across Next.js 15, React 19 Vite, Vue 3,
 * and Vanilla HTML/CSS/JS with zero engine lock-in.
 * Architecture Ref: DOCS/Initial/ROADMAP.md §Sub-Phase 8.2 & PRD.md §3
 * ============================================================================
 */

import { ProjectElement } from "@/core/store/useProjectStore";
import { TargetFramework, StylingSystem } from "@/editor/panels/launcher/TechConfigurator";
import { InteractiveEmitter } from "../emitters/react/InteractiveEmitter";
import { MediaEmitter } from "../emitters/react/MediaEmitter";
import { StructuralEmitter } from "../emitters/react/StructuralEmitter";
import { TextEmitter } from "../emitters/react/TextEmitter";
import { VueComponentEmitter } from "../emitters/vue/VueComponentEmitter";
import { VanillaHtmlEmitter } from "../emitters/vanilla/VanillaHtmlEmitter";

export interface CrossFrameworkExportResult {
  framework: TargetFramework;
  archetype: string;
  files: {
    filename: string;
    content: string;
    language: string;
  }[];
  dependencies: string[];
}

export class CrossFrameworkExporter {
  public static exportElement(
    element: ProjectElement,
    framework: TargetFramework = "nextjs-app",
    styling: StylingSystem = "tailwind"
  ): CrossFrameworkExportResult {
    const files: { filename: string; content: string; language: string }[] = [];
    const dependencies: string[] = [];

    if (framework === "vue") {
      const vueRes = VueComponentEmitter.emit(element, {
        stylingSystem: styling === "tailwind" ? "tailwind" : "vanilla-css",
      });
      files.push({
        filename: `${vueRes.componentName}.vue`,
        content: vueRes.sfcCode,
        language: "vue",
      });
      dependencies.push(...vueRes.requiredPackages);
    } else if (framework === "vanilla") {
      const vanillaRes = VanillaHtmlEmitter.emit(element);
      files.push(
        {
          filename: "index.html",
          content: vanillaRes.htmlMarkup,
          language: "html",
        },
        {
          filename: "style.css",
          content: vanillaRes.cssStyles,
          language: "css",
        },
        {
          filename: "main.js",
          content: vanillaRes.jsScript,
          language: "javascript",
        }
      );
    } else {
      // React 19 Vite or Next.js 15
      const isNext = framework === "nextjs-app" || framework === "nextjs-pages";
      const styleSystem = styling === "tailwind" ? "tailwind" : "css-modules";

      let emitted: { componentName: string; tsxCode: string; cssCode?: string; requiredPackages: string[] };
      if (
        element.archetype === "button" ||
        element.archetype === "toggle" ||
        element.archetype === "badge" ||
        element.archetype === "fab"
      ) {
        emitted = InteractiveEmitter.emit(element, {
          framework: isNext ? "nextjs" : "react",
          stylingSystem: styleSystem,
        });
      } else if (element.archetype === "image" || element.archetype === "icon") {
        emitted = MediaEmitter.emit(element, {
          framework: isNext ? "nextjs" : "react",
          stylingSystem: styleSystem,
        });
      } else if (
        element.archetype === "divider" ||
        element.archetype === "background" ||
        element.archetype === "container"
      ) {
        emitted = StructuralEmitter.emit(element, {
          framework: isNext ? "nextjs" : "react",
          stylingSystem: styleSystem,
        });
      } else {
        emitted = TextEmitter.emit(element, {
          stylingSystem: styleSystem,
        });
      }

      files.push({
        filename: `${emitted.componentName}.tsx`,
        content: emitted.tsxCode,
        language: "typescript",
      });

      if (emitted.cssCode) {
        files.push({
          filename: `${emitted.componentName}.module.css`,
          content: emitted.cssCode,
          language: "css",
        });
      }

      dependencies.push(...emitted.requiredPackages);
    }

    return {
      framework,
      archetype: element.archetype,
      files,
      dependencies: Array.from(new Set(dependencies)),
    };
  }
}
