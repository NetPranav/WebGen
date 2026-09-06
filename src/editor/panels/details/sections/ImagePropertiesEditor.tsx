"use client";

/**
 * ============================================================================
 * IMAGE PROPERTIES & FIT EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * Element-specific Details sub-panel for Image widgets:
 * - Source & Fallbacks (URL input, asset binding, fallback URL)
 * - Fit & Crop (object-fit modes, object-position origin)
 * - Aspect Ratio Presets (16:9, 1:1, 4:3, 21:9, auto)
 * - Accessibility & Performance (Alt text, Lazy Loading, Placeholders)
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Image as ImageIcon,
  ChevronRight,
  RotateCcw,
  Crop,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { ImageSpecificConfig } from "@/core/types/element-sections";

export interface ImagePropertiesEditorProps {
  config: ImageSpecificConfig;
  onChange: React.Dispatch<React.SetStateAction<ImageSpecificConfig>>;
  onReset?: () => void;
}

export const ImagePropertiesEditor: React.FC<ImagePropertiesEditorProps> = ({
  config,
  onChange,
  onReset,
}) => {
  const [openSubgroups, setOpenSubgroups] = useState({
    source: true,
    fit: true,
    performance: false,
  });

  const toggleSubgroup = (key: keyof typeof openSubgroups) => {
    setOpenSubgroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProp = <K extends keyof ImageSpecificConfig>(key: K, val: ImageSpecificConfig[K]) => {
    onChange((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="element-specific-editor image-properties-editor">
      {/* ====================================================================
       * SUBGROUP 1: SOURCE & ACCESSIBILITY
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("source")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.source ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <ImageIcon size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Source & Asset</span>
        </button>

        {openSubgroups.source && (
          <div className="appearance-subgroup__content">
            {/* Image URL */}
            <div className="form-group">
              <label className="form-label">Image Source URL</label>
              <input
                type="text"
                className="form-input form-input--code"
                placeholder="https://... or /assets/image.png"
                value={config.src}
                onChange={(e) => updateProp("src", e.target.value)}
              />
            </div>

            {/* Fallback Image */}
            <div className="form-group">
              <label className="form-label">Fallback Placeholder URL</label>
              <input
                type="text"
                className="form-input form-input--code"
                placeholder="Fallback on 404/error"
                value={config.fallbackSrc}
                onChange={(e) => updateProp("fallbackSrc", e.target.value)}
              />
            </div>

            {/* Alt Text */}
            <div className="form-group">
              <label className="form-label">Alt Text (Accessibility)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Descriptive image label for screen readers"
                value={config.alt}
                onChange={(e) => updateProp("alt", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 2: FIT, CROP & ASPECT RATIO
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("fit")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.fit ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Crop size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Fit & Aspect Ratio</span>
        </button>

        {openSubgroups.fit && (
          <div className="appearance-subgroup__content">
            {/* Object Fit */}
            <div className="form-group-row">
              <label className="form-label">Object Fit</label>
              <select
                className="form-select"
                value={config.objectFit}
                onChange={(e) => updateProp("objectFit", e.target.value as any)}
              >
                <option value="cover">cover (Crop to fill)</option>
                <option value="contain">contain (Letterbox / preserve aspect)</option>
                <option value="fill">fill (Stretch)</option>
                <option value="scale-down">scale-down (Smaller of none/contain)</option>
                <option value="none">none (Original native size)</option>
              </select>
            </div>

            {/* Aspect Ratio Presets */}
            <div className="form-group">
              <label className="form-label">Aspect Ratio</label>
              <div className="form-mode-switch" style={{ flexWrap: "wrap" }}>
                {(["auto", "16:9", "1:1", "4:3", "21:9"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    className={`form-mode-btn ${config.aspectRatio === ratio ? "form-mode-btn--active" : ""}`}
                    onClick={() => updateProp("aspectRatio", ratio)}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Object Position */}
            <div className="form-group-row">
              <label className="form-label">Object Position</label>
              <select
                className="form-select"
                value={config.objectPosition}
                onChange={(e) => updateProp("objectPosition", e.target.value)}
              >
                <option value="center">center</option>
                <option value="top">top</option>
                <option value="bottom">bottom</option>
                <option value="left">left</option>
                <option value="right">right</option>
                <option value="top left">top left</option>
                <option value="top right">top right</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 3: PERFORMANCE & LAZY LOADING
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("performance")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.performance ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Zap size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Loading & Placeholders</span>
        </button>

        {openSubgroups.performance && (
          <div className="appearance-subgroup__content">
            {/* Loading Strategy */}
            <div className="form-group-row">
              <label className="form-label">Loading Strategy</label>
              <div className="form-mode-switch">
                <button
                  type="button"
                  className={`form-mode-btn ${config.loadingMode === "lazy" ? "form-mode-btn--active" : ""}`}
                  onClick={() => updateProp("loadingMode", "lazy")}
                >
                  Lazy (Viewport)
                </button>
                <button
                  type="button"
                  className={`form-mode-btn ${config.loadingMode === "eager" ? "form-mode-btn--active" : ""}`}
                  onClick={() => updateProp("loadingMode", "eager")}
                >
                  Eager (Priority)
                </button>
              </div>
            </div>

            {/* Placeholder Type */}
            <div className="form-group-row">
              <label className="form-label">Placeholder</label>
              <div className="form-mode-switch">
                {(["blur", "skeleton", "none"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`form-mode-btn ${config.placeholder === p ? "form-mode-btn--active" : ""}`}
                    onClick={() => updateProp("placeholder", p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
