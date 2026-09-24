"use client";

/**
 * ============================================================================
 * VUE 3 SINGLE FILE COMPONENT (SFC) EMITTER
 * ============================================================================
 * Compiles visual AST element models and property tracks into clean, idiomatic
 * Vue 3 Single File Components (<template>, <script setup>, <style scoped>).
 * Architecture Ref: DOCS/Initial/ROADMAP.md §Sub-Phase 8.2 & PRD.md §3
 * ============================================================================
 */

import { AnimationSample } from "@/core/types/animations";
import type { Layer } from "@/core/document/schema";

export interface VueEmitterOptions {
  stylingSystem?: "tailwind" | "vanilla-css" | "scoped-css";
  componentName?: string;
  animationSample?: AnimationSample;
}

export interface EmittedVueComponent {
  componentName: string;
  sfcCode: string;
  requiredPackages: string[];
}

export class VueComponentEmitter {
  public static toPascalCase(name: string): string {
    const clean = name
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
    return clean || "AnimatedElement";
  }

  public static emit(
    element: Layer,
    options: VueEmitterOptions = {}
  ): EmittedVueComponent {
    const componentName = options.componentName || this.toPascalCase(element.name);
    const styling = options.stylingSystem || "tailwind";
    const props = element.properties || {};

    const requiredPackages = ["vue", "gsap"];

    // 1. Generate Template
    let templateMarkup = "";
    switch (element.archetype) {
      case "button": {
        const label = (props.label as string) || (props.textContent as string) || "Button";
        const btnClass = styling === "tailwind"
          ? "px-5 py-2.5 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
          : "btn-primary";
        templateMarkup = `  <button ref="rootRef" type="button" class="${btnClass}">\n    ${label}\n  </button>`;
        break;
      }
      case "toggle": {
        const label = (props.label as string) || "Toggle Switch";
        templateMarkup = `  <div ref="rootRef" role="switch" :aria-checked="isChecked" @click="toggle" class="toggle-container">\n    <span class="toggle-label">${label}</span>\n    <div :class="['toggle-track', isChecked ? 'active' : '']">\n      <div class="toggle-thumb" />\n    </div>\n  </div>`;
        break;
      }
      case "badge": {
        const label = (props.label as string) || "Active";
        const badgeClass = styling === "tailwind"
          ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"
          : "badge";
        templateMarkup = `  <span ref="rootRef" class="${badgeClass}">\n    ${label}\n  </span>`;
        break;
      }
      case "fab": {
        const fabClass = styling === "tailwind"
          ? "w-14 h-14 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          : "fab-button";
        templateMarkup = `  <button ref="rootRef" type="button" class="${fabClass}" aria-label="Floating Action">\n    <span class="fab-icon">+</span>\n  </button>`;
        break;
      }
      case "image": {
        const src = (props.src as string) || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe";
        const alt = (props.alt as string) || "Media image";
        const imgClass = styling === "tailwind"
          ? "w-full h-full object-cover rounded-xl shadow-lg"
          : "media-img";
        templateMarkup = `  <div ref="rootRef" class="image-wrapper">\n    <img src="${src}" alt="${alt}" loading="lazy" class="${imgClass}" />\n  </div>`;
        break;
      }
      case "icon": {
        const path = (props.path as string) || "M12 2L2 7l10 5 10-5-10-5z";
        templateMarkup = `  <svg ref="rootRef" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">\n    <path d="${path}" />\n  </svg>`;
        break;
      }
      case "divider": {
        const orientation = (props.orientation as string) || "horizontal";
        templateMarkup = `  <div ref="rootRef" class="divider-line ${orientation}" />`;
        break;
      }
      case "background": {
        templateMarkup = `  <div ref="rootRef" class="background-canvas" aria-hidden="true">\n    <div class="gradient-layer" />\n  </div>`;
        break;
      }
      case "text": {
        const text = (props.textContent as string) || (props.label as string) || "Heading Text";
        templateMarkup = `  <h2 ref="rootRef" class="animated-text">\n    ${text}\n  </h2>`;
        break;
      }
      default: {
        templateMarkup = `  <div ref="rootRef" class="container-root">\n    <slot />\n  </div>`;
        break;
      }
    }

    // 2. Generate Script
    const scriptLines: string[] = [];
    scriptLines.push('<script setup lang="ts">');
    scriptLines.push('import { ref, onMounted } from "vue";');
    scriptLines.push('import { gsap } from "gsap";');
    scriptLines.push("");
    scriptLines.push("const rootRef = ref<HTMLElement | null>(null);");

    if (element.archetype === "toggle") {
      scriptLines.push("const isChecked = ref(true);");
      scriptLines.push("const toggle = () => { isChecked.value = !isChecked.value; };");
    }

    scriptLines.push("");
    scriptLines.push("onMounted(() => {");
    scriptLines.push("  if (!rootRef.value) return;");
    scriptLines.push("  gsap.from(rootRef.value, {");
    scriptLines.push("    opacity: 0,");
    scriptLines.push("    y: 16,");
    scriptLines.push("    duration: 0.6,");
    scriptLines.push('    ease: "power2.out",');
    scriptLines.push("  });");
    scriptLines.push("});");
    scriptLines.push("</script>");

    // 3. Generate Style
    const styleLines: string[] = [];
    styleLines.push("<style scoped>");
    if (styling !== "tailwind") {
      styleLines.push(".btn-primary {");
      styleLines.push("  padding: 10px 20px;");
      styleLines.push("  background-color: #059669;");
      styleLines.push("  color: white;");
      styleLines.push("  border: none;");
      styleLines.push("  border-radius: 8px;");
      styleLines.push("  cursor: pointer;");
      styleLines.push("}");
      styleLines.push(".image-wrapper { position: relative; overflow: hidden; border-radius: 12px; }");
      styleLines.push(".divider-line { height: 1px; background: rgba(0,0,0,0.1); width: 100%; }");
      styleLines.push(".background-canvas { position: absolute; inset: 0; pointer-events: none; }");
    }
    styleLines.push("</style>");

    const sfcCode = [
      "<template>",
      templateMarkup,
      "</template>",
      "",
      scriptLines.join("\n"),
      "",
      styleLines.join("\n"),
    ].join("\n");

    return {
      componentName,
      sfcCode,
      requiredPackages,
    };
  }
}
