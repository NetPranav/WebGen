/**
 * ============================================================================
 * TECHNOLOGY & ENGINE CONFIGURATOR
 * ============================================================================
 * UI Element: Tech Stack Dropdowns & Language Toggle
 * Screen / Scope: Screen 00: Project Hub & Design Launcher (`/`)
 * Role: Allows users to configure target framework, styling system,
 *       animation engine, language, and starting template preset per Sub-Phase 2.3.
 * Styling Source: "@/editor/styles/launcher.css"
 * ============================================================================
 */

import React from "react";
import { Code2, Paintbrush, PlayCircle, FileCode, Sparkles } from "lucide-react";

export type TargetFramework =
  | "nextjs-app"
  | "nextjs-pages"
  | "react-vite"
  | "vue"
  | "svelte"
  | "vanilla";

export type StylingSystem =
  | "tailwind"
  | "vanilla-css"
  | "css-modules"
  | "styled-components";

export type AnimationEngine =
  | "gsap"
  | "framer-motion"
  | "svg-native"
  | "hybrid";

export type ProjectLanguage = "typescript" | "javascript";

export type StartingTemplate =
  | "blank"
  | "preset-hover"
  | "preset-reveal"
  | "preset-ambient";

export interface TechConfig {
  framework: TargetFramework;
  styling: StylingSystem;
  animation: AnimationEngine;
  language: ProjectLanguage;
  template: StartingTemplate;
}

export interface TechConfiguratorProps {
  config: TechConfig;
  onChange: (newConfig: TechConfig) => void;
}

export const FRAMEWORK_OPTIONS: { id: TargetFramework; label: string; badge: string }[] = [
  { id: "nextjs-app", label: "Next.js 15 (App Router)", badge: "Recommended" },
  { id: "nextjs-pages", label: "Next.js 15 (Pages Router)", badge: "Classic" },
  { id: "react-vite", label: "React 19 (Vite)", badge: "SPA" },
  { id: "vue", label: "Vue 3 (Composition API)", badge: "Vue" },
  { id: "svelte", label: "Svelte 5 (Runes)", badge: "Svelte" },
  { id: "vanilla", label: "Vanilla HTML5 / ES6", badge: "Zero-bundle" },
];

export const STYLING_OPTIONS: { id: StylingSystem; label: string; badge: string }[] = [
  { id: "tailwind", label: "Tailwind CSS v4", badge: "Utility" },
  { id: "vanilla-css", label: "Vanilla CSS & Modern Variables", badge: "Clean" },
  { id: "css-modules", label: "CSS Modules (*.module.css)", badge: "Scoped" },
  { id: "styled-components", label: "Styled Components / Emotion", badge: "CSS-in-JS" },
];

export const ANIMATION_OPTIONS: { id: AnimationEngine; label: string; badge: string }[] = [
  { id: "gsap", label: "GSAP 3.12 (Timeline & ScrollTrigger)", badge: "Pro" },
  { id: "framer-motion", label: "Framer Motion 11 (Springs & Gestures)", badge: "Physics" },
  { id: "svg-native", label: "SVG Vector & Native CSS Keyframes", badge: "0KB Extra" },
  { id: "hybrid", label: "Hybrid (GSAP Scroll + Framer Springs)", badge: "Full Power" },
];

export const TEMPLATE_OPTIONS: { id: StartingTemplate; label: string; description: string }[] = [
  { id: "blank", label: "Blank Canvas", description: "Clean slate with default archetype geometry" },
  { id: "preset-hover", label: "Interactive Hover / Tap", description: "Pre-wired spring bounce and magnetic hover pull" },
  { id: "preset-reveal", label: "Scroll Reveal & Parallax", description: "Pre-wired ScrollTrigger clip-path reveal and depth" },
  { id: "preset-ambient", label: "Ambient Infinite Loop", description: "Pre-wired infinite gradient angle drift and idle pulse" },
];

export const TechConfigurator: React.FC<TechConfiguratorProps> = ({
  config,
  onChange,
}) => {
  const updateField = <K extends keyof TechConfig>(field: K, value: TechConfig[K]) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <div className="tech-configurator">
      {/* 1. Target Framework */}
      <div className="tech-config-item">
        <label htmlFor="framework-select" className="tech-config-label">
          <Code2 size={14} className="tech-config-icon" />
          <span>Target Framework</span>
        </label>
        <div className="tech-select-wrapper">
          <select
            id="framework-select"
            className="tech-select"
            value={config.framework}
            onChange={(e) => updateField("framework", e.target.value as TargetFramework)}
          >
            {FRAMEWORK_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} ({f.badge})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Styling System */}
      <div className="tech-config-item">
        <label htmlFor="styling-select" className="tech-config-label">
          <Paintbrush size={14} className="tech-config-icon" />
          <span>Styling System</span>
        </label>
        <div className="tech-select-wrapper">
          <select
            id="styling-select"
            className="tech-select"
            value={config.styling}
            onChange={(e) => updateField("styling", e.target.value as StylingSystem)}
          >
            {STYLING_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.badge})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Animation Engine */}
      <div className="tech-config-item">
        <label htmlFor="animation-select" className="tech-config-label">
          <PlayCircle size={14} className="tech-config-icon" />
          <span>Animation Engine</span>
        </label>
        <div className="tech-select-wrapper">
          <select
            id="animation-select"
            className="tech-select"
            value={config.animation}
            onChange={(e) => updateField("animation", e.target.value as AnimationEngine)}
          >
            {ANIMATION_OPTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} ({a.badge})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Language Toggle */}
      <div className="tech-config-item">
        <label className="tech-config-label">
          <FileCode size={14} className="tech-config-icon" />
          <span>Language</span>
        </label>
        <div className="tech-lang-toggle-group" role="radiogroup" aria-label="Project Language">
          <button
            type="button"
            className={`tech-lang-btn ${config.language === "typescript" ? "tech-lang-btn--active" : ""}`}
            onClick={() => updateField("language", "typescript")}
            role="radio"
            aria-checked={config.language === "typescript"}
          >
            TypeScript (Strict)
          </button>
          <button
            type="button"
            className={`tech-lang-btn ${config.language === "javascript" ? "tech-lang-btn--active" : ""}`}
            onClick={() => updateField("language", "javascript")}
            role="radio"
            aria-checked={config.language === "javascript"}
          >
            JavaScript (ESM)
          </button>
        </div>
      </div>

      {/* 5. Starting Template Preset */}
      <div className="tech-config-item">
        <label htmlFor="template-select" className="tech-config-label">
          <Sparkles size={14} className="tech-config-icon" />
          <span>Starting Template</span>
        </label>
        <div className="tech-select-wrapper">
          <select
            id="template-select"
            className="tech-select"
            value={config.template}
            onChange={(e) => updateField("template", e.target.value as StartingTemplate)}
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — {t.description}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
