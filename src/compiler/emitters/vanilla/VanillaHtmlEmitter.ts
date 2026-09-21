"use client";

/**
 * ============================================================================
 * VANILLA HTML5 / CSS3 / MODERN JS EMITTER
 * ============================================================================
 * Compiles visual AST element models into zero-framework, drop-in HTML5 markup,
 * paired with standard CSS and native Web Animations API / GSAP script.
 * Architecture Ref: DOCS/Initial/ROADMAP.md §Sub-Phase 8.2 & PRD.md §3
 * ============================================================================
 */

import { ProjectElement } from "@/core/store/useProjectStore";

export interface VanillaEmitterOptions {
  componentName?: string;
  useWebAnimationsApi?: boolean; // native WAAPI vs GSAP
}

export interface EmittedVanillaPackage {
  componentName: string;
  htmlMarkup: string;
  cssStyles: string;
  jsScript: string;
}

export class VanillaHtmlEmitter {
  public static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  }

  public static emit(
    element: ProjectElement,
    options: VanillaEmitterOptions = {}
  ): EmittedVanillaPackage {
    const name = options.componentName || element.name || "element";
    const cssClass = this.toKebabCase(name);
    const props = element.properties || {};

    let htmlMarkup = "";
    let cssStyles = "";
    let jsScript = "";

    switch (element.archetype) {
      case "button": {
        const label = (props.label as string) || (props.textContent as string) || "Button";
        htmlMarkup = `<button type="button" class="btn-${cssClass}" id="${element.id}">\n  ${label}\n</button>`;
        cssStyles = `.btn-${cssClass} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 22px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background-color: #059669;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s;
}
.btn-${cssClass}:hover {
  background-color: #10b981;
  transform: translateY(-1px);
}
.btn-${cssClass}:active {
  transform: translateY(1px) scale(0.98);
}`;
        break;
      }
      case "toggle": {
        const label = (props.label as string) || "Toggle Switch";
        htmlMarkup = `<button type="button" role="switch" aria-checked="true" class="toggle-${cssClass}" id="${element.id}">\n  <span class="toggle-track"><span class="toggle-thumb"></span></span>\n  <span class="toggle-label">${label}</span>\n</button>`;
        cssStyles = `.toggle-${cssClass} {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
}
.toggle-${cssClass} .toggle-track {
  width: 44px;
  height: 24px;
  background: #059669;
  border-radius: 9999px;
  position: relative;
  transition: background-color 0.2s ease;
}
.toggle-${cssClass} .toggle-thumb {
  position: absolute;
  top: 2px;
  left: 22px;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 9999px;
  transition: transform 0.2s ease;
}`;
        break;
      }
      case "badge": {
        const label = (props.label as string) || "Badge";
        htmlMarkup = `<span class="badge-${cssClass}" id="${element.id}">\n  ${label}\n</span>`;
        cssStyles = `.badge-${cssClass} {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 9999px;
  background-color: rgba(5, 150, 105, 0.1);
  color: #059669;
}`;
        break;
      }
      case "fab": {
        htmlMarkup = `<button type="button" class="fab-${cssClass}" id="${element.id}" aria-label="Action">\n  <span class="fab-icon">+</span>\n</button>`;
        cssStyles = `.fab-${cssClass} {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #059669;
  color: #ffffff;
  border: none;
  font-size: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px rgba(5, 150, 105, 0.4);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.fab-${cssClass}:hover {
  transform: scale(1.08);
}`;
        break;
      }
      case "image": {
        const src = (props.src as string) || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe";
        const alt = (props.alt as string) || "Media";
        htmlMarkup = `<div class="img-wrapper-${cssClass}" id="${element.id}">\n  <img src="${src}" alt="${alt}" loading="lazy" class="img-content" />\n</div>`;
        cssStyles = `.img-wrapper-${cssClass} {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 380px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}
.img-wrapper-${cssClass} .img-content {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.img-wrapper-${cssClass}:hover .img-content {
  transform: scale(1.05);
}`;
        break;
      }
      case "icon": {
        const path = (props.path as string) || (props.d as string) || "M12 2L2 7l10 5 10-5-10-5z";
        htmlMarkup = `<svg class="icon-${cssClass}" id="${element.id}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n  <path d="${path}" />\n</svg>`;
        cssStyles = `.icon-${cssClass} {
  display: inline-block;
  color: #059669;
  transition: transform 0.2s ease;
}
.icon-${cssClass}:hover {
  transform: scale(1.15) rotate(5deg);
}`;
        break;
      }
      case "divider": {
        htmlMarkup = `<hr class="divider-${cssClass}" id="${element.id}" />`;
        cssStyles = `.divider-${cssClass} {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.2), transparent);
  margin: 24px 0;
  width: 100%;
}`;
        break;
      }
      case "background": {
        htmlMarkup = `<div class="bg-canvas-${cssClass}" id="${element.id}" aria-hidden="true">\n  <div class="bg-gradient-drift"></div>\n</div>`;
        cssStyles = `.bg-canvas-${cssClass} {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
}
.bg-gradient-drift {
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background: radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0%, transparent 60%);
  animation: drift 12s infinite alternate ease-in-out;
}
@keyframes drift {
  0% { transform: translate(0, 0); }
  100% { transform: translate(5%, 5%); }
}`;
        break;
      }
      case "text": {
        const text = (props.textContent as string) || "Visual Typography";
        htmlMarkup = `<h2 class="text-${cssClass}" id="${element.id}">\n  ${text}\n</h2>`;
        cssStyles = `.text-${cssClass} {
  font-family: inherit;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
  letter-spacing: -0.02em;
}`;
        break;
      }
      default: {
        htmlMarkup = `<div class="container-${cssClass}" id="${element.id}">\n  <!-- Child content -->\n</div>`;
        cssStyles = `.container-${cssClass} { display: flex; flex-direction: column; gap: 16px; }`;
        break;
      }
    }

    // Native Web Animations API script
    jsScript = `// Drop-in Animation Controller for ${name}
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("${element.id}");
  if (!el) return;

  // Keyframe Entrance
  el.animate([
    { opacity: 0, transform: "translateY(16px)" },
    { opacity: 1, transform: "translateY(0)" }
  ], {
    duration: 600,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "forwards"
  });
});`;

    return {
      componentName: name,
      htmlMarkup,
      cssStyles,
      jsScript,
    };
  }
}
