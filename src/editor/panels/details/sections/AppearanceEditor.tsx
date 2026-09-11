"use client";

/**
 * ============================================================================
 * DEEP APPEARANCE & STYLING EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * UI Element: Exhaustive Visual Property & Rendering Inspector Sub-Panel
 * Screen / Scope: Details Panel -> Category: Appearance & Tokens
 * Role: Provides deep, collapsible micro-editors for Background, Borders,
 *       Shadows, Backdrop Filters, Transforms, and CSS Transitions.
 * Architecture Ref: `DOCS/ROADMAP_2.md` §Phase 2.3
 * ============================================================================
 */

import React, { useState } from "react";
import {
  ChevronRight,
  Link,
  Unlink,
  RotateCcw,
  Sparkles,
  Layers,
  Move,
  Clock,
  Shield,
  Palette,
  Image as ImageIcon,
} from "lucide-react";
import {
  AssetAppearanceSchema,
  BorderWidthConfig,
  BorderRadiusConfig,
  GradientConfig,
  BackgroundImageConfig,
  BoxShadowLayer,
  TransformConfig,
  TransitionConfig,
} from "@/core/types/details";
import { GradientEditor } from "../controls/GradientEditor";
import { ShadowEditor } from "../controls/ShadowEditor";
import { TransformOriginPicker } from "../controls/TransformOriginPicker";
import { EasingCurveSelector } from "../controls/EasingCurveSelector";

export interface AppearanceEditorProps {
  appearance: AssetAppearanceSchema;
  onChange: React.Dispatch<React.SetStateAction<AssetAppearanceSchema>>;
  onResetToDefault?: () => void;
}

export const AppearanceEditor: React.FC<AppearanceEditorProps> = ({
  appearance,
  onChange,
  onResetToDefault,
}) => {
  // Collapsible sub-sections
  const [openSubgroups, setOpenSubgroups] = useState({
    background: true,
    borders: true,
    shadows: false,
    transform: false,
    transition: false,
  });

  const toggleSubgroup = (key: keyof typeof openSubgroups) => {
    setOpenSubgroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Safe defaults getters
  const bgMode = appearance.backgroundMode || "solid";
  const bgOpacity = appearance.backgroundOpacity ?? 100;
  const gradient: GradientConfig = appearance.gradient || {
    enabled: false,
    type: "linear",
    angle: 135,
    stops: [
      { id: "s1", color: appearance.backgroundColor || "#206859", position: 0 },
      { id: "s2", color: "#174f43", position: 100 },
    ],
  };

  const bgImage: BackgroundImageConfig = appearance.backgroundImage || {
    enabled: false,
    url: "",
    size: "cover",
    repeat: "no-repeat",
    position: "center",
  };

  const borderWidths: BorderWidthConfig = appearance.borderWidths || {
    top: appearance.borderWidth || 1,
    right: appearance.borderWidth || 1,
    bottom: appearance.borderWidth || 1,
    left: appearance.borderWidth || 1,
    linked: true,
  };

  const borderRadii: BorderRadiusConfig = appearance.borderRadii || {
    topLeft: appearance.borderRadius || 6,
    topRight: appearance.borderRadius || 6,
    bottomRight: appearance.borderRadius || 6,
    bottomLeft: appearance.borderRadius || 6,
    linked: true,
  };

  const shadows: BoxShadowLayer[] = appearance.boxShadows || [
    {
      id: "sh_default",
      x: 0,
      y: 2,
      blur: 8,
      spread: 0,
      color: "rgba(32, 104, 89, 0.25)",
      inset: false,
      enabled: true,
    },
  ];

  const transform: TransformConfig = appearance.transform || {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    scaleLinked: true,
    skewX: 0,
    skewY: 0,
    origin: "center",
  };

  const transition: TransitionConfig = appearance.transition || {
    properties: ["all"],
    duration: 200,
    easing: "ease",
    delay: 0,
  };

  // Border Width Change
  const handleBorderWidthChange = (
    side: "top" | "right" | "bottom" | "left",
    val: number
  ) => {
    const num = Math.max(0, val);
    if (borderWidths.linked) {
      onChange((prev) => ({
        ...prev,
        borderWidth: num,
        borderWidths: {
          top: num,
          right: num,
          bottom: num,
          left: num,
          linked: true,
        },
      }));
    } else {
      const newWidths = { ...borderWidths, [side]: num };
      onChange((prev) => ({
        ...prev,
        borderWidth: newWidths.top,
        borderWidths: newWidths,
      }));
    }
  };

  // Border Radius Change
  const handleBorderRadiusChange = (
    corner: "topLeft" | "topRight" | "bottomRight" | "bottomLeft",
    val: number
  ) => {
    const num = Math.max(0, val);
    if (borderRadii.linked) {
      onChange((prev) => ({
        ...prev,
        borderRadius: num,
        borderRadii: {
          topLeft: num,
          topRight: num,
          bottomRight: num,
          bottomLeft: num,
          linked: true,
        },
      }));
    } else {
      const newRadii = { ...borderRadii, [corner]: num };
      onChange((prev) => ({
        ...prev,
        borderRadius: newRadii.topLeft,
        borderRadii: newRadii,
      }));
    }
  };

  // Scale Change
  const handleScaleChange = (axis: "scaleX" | "scaleY", val: number) => {
    if (transform.scaleLinked) {
      onChange((prev) => ({
        ...prev,
        transform: {
          ...transform,
          scaleX: val,
          scaleY: val,
        },
      }));
    } else {
      onChange((prev) => ({
        ...prev,
        transform: {
          ...transform,
          [axis]: val,
        },
      }));
    }
  };

  // Transition property toggle
  const handleToggleTransitionProperty = (prop: string) => {
    let nextProps: string[];
    if (prop === "all") {
      nextProps = ["all"];
    } else {
      const filtered = transition.properties.filter((p) => p !== "all");
      if (filtered.includes(prop)) {
        nextProps = filtered.filter((p) => p !== prop);
        if (nextProps.length === 0) nextProps = ["all"];
      } else {
        nextProps = [...filtered, prop];
      }
    }
    onChange((prev) => ({
      ...prev,
      transition: { ...transition, properties: nextProps },
    }));
  };

  return (
    <div className="appearance-editor">
      {/* ====================================================================
       * SUB-GROUP 1: BACKGROUND
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("background")}
        >
          <ChevronRight
            size={11}
            className={`appearance-subgroup__chevron ${
              openSubgroups.background ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <span className="appearance-subgroup__title">Background</span>
          <span className="appearance-subgroup__badge">{bgMode.toUpperCase()}</span>
        </button>

        {openSubgroups.background && (
          <div className="appearance-subgroup__body">
            {/* Mode Switcher */}
            <div className="form-mode-switch">
              <button
                type="button"
                className={`form-mode-btn ${
                  bgMode === "solid" ? "form-mode-btn--active" : ""
                }`}
                onClick={() =>
                  onChange((prev) => ({ ...prev, backgroundMode: "solid" }))
                }
              >
                Solid
              </button>
              <button
                type="button"
                className={`form-mode-btn ${
                  bgMode === "gradient" ? "form-mode-btn--active" : ""
                }`}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    backgroundMode: "gradient",
                    gradient: { ...gradient, enabled: true },
                  }))
                }
              >
                Gradient
              </button>
              <button
                type="button"
                className={`form-mode-btn ${
                  bgMode === "image" ? "form-mode-btn--active" : ""
                }`}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    backgroundMode: "image",
                    backgroundImage: { ...bgImage, enabled: true },
                  }))
                }
              >
                Image
              </button>
            </div>

            {/* Mode: Solid Color */}
            {bgMode === "solid" && (
              <>
                <div className="form-group-row">
                  <span className="form-label">Fill Color</span>
                  <label className="form-color-picker">
                    <div
                      className="form-color-picker__swatch"
                      style={{ backgroundColor: appearance.backgroundColor }}
                    />
                    <input
                      type="color"
                      style={{
                        width: 0,
                        height: 0,
                        padding: 0,
                        border: "none",
                        position: "absolute",
                        opacity: 0,
                      }}
                      value={appearance.backgroundColor}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          backgroundColor: e.target.value,
                        }))
                      }
                    />
                    <span className="form-color-picker__label">
                      {appearance.backgroundColor}
                    </span>
                  </label>
                </div>

                <div className="form-group-row">
                  <span className="form-label">Fill Opacity</span>
                  <div className="form-slider-row">
                    <input
                      type="range"
                      className="form-slider"
                      min="0"
                      max="100"
                      value={bgOpacity}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          backgroundOpacity: Number(e.target.value),
                        }))
                      }
                    />
                    <span className="form-slider-val">{bgOpacity}%</span>
                  </div>
                </div>
              </>
            )}

            {/* Mode: Gradient */}
            {bgMode === "gradient" && (
              <GradientEditor
                gradient={gradient}
                onChange={(g) => onChange((prev) => ({ ...prev, gradient: g }))}
              />
            )}

            {/* Mode: Background Image */}
            {bgMode === "image" && (
              <div className="bg-image-controls">
                <div className="form-group-row">
                  <span className="form-label">Image URL</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://... or /assets/..."
                    value={bgImage.url}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        backgroundImage: { ...bgImage, url: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="form-group-row">
                  <span className="form-label">Size</span>
                  <select
                    className="form-select"
                    value={bgImage.size}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        backgroundImage: {
                          ...bgImage,
                          size: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="cover">Cover (Aspect Fill)</option>
                    <option value="contain">Contain (Aspect Fit)</option>
                    <option value="auto">Original Auto</option>
                  </select>
                </div>

                <div className="form-group-row">
                  <span className="form-label">Repeat</span>
                  <select
                    className="form-select"
                    value={bgImage.repeat}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        backgroundImage: {
                          ...bgImage,
                          repeat: e.target.value as any,
                        },
                      }))
                    }
                  >
                    <option value="no-repeat">No Repeat</option>
                    <option value="repeat">Repeat All</option>
                    <option value="repeat-x">Repeat X Only</option>
                    <option value="repeat-y">Repeat Y Only</option>
                  </select>
                </div>
              </div>
            )}

            {/* Background Blend Mode */}
            <div className="form-group-row">
              <span className="form-label">Blend Mode</span>
              <select
                className="form-select"
                value={appearance.backgroundBlendMode || "normal"}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    backgroundBlendMode: e.target.value as any,
                  }))
                }
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUB-GROUP 2: BORDER & RADIUS
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("borders")}
        >
          <ChevronRight
            size={11}
            className={`appearance-subgroup__chevron ${
              openSubgroups.borders ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <span className="appearance-subgroup__title">Border & Radius</span>
          <span className="appearance-subgroup__badge">
            {borderWidths.top}px • {borderRadii.topLeft}px R
          </span>
        </button>

        {openSubgroups.borders && (
          <div className="appearance-subgroup__body">
            {/* Border Width (4-Sided + Linked Toggle) */}
            <div className="form-group-row" style={{ alignItems: "flex-start" }}>
              <div className="form-label-with-action">
                <span className="form-label">Width</span>
                <button
                  type="button"
                  className="btn-icon-subtle"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      borderWidths: {
                        ...borderWidths,
                        linked: !borderWidths.linked,
                      },
                    }))
                  }
                  title={borderWidths.linked ? "Unlink sides" : "Link all sides uniform"}
                >
                  {borderWidths.linked ? (
                    <Link size={11} style={{ color: "var(--accent-primary)" }} />
                  ) : (
                    <Unlink size={11} style={{ color: "var(--text-tertiary)" }} />
                  )}
                </button>
              </div>

              <div className="quad-inputs-row">
                <div className="quad-input-box" title="Top border">
                  <span className="quad-input-tag">T</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    min="0"
                    value={borderWidths.top}
                    onChange={(e) =>
                      handleBorderWidthChange("top", Number(e.target.value))
                    }
                  />
                </div>
                <div className="quad-input-box" title="Right border">
                  <span className="quad-input-tag">R</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    min="0"
                    value={borderWidths.right}
                    onChange={(e) =>
                      handleBorderWidthChange("right", Number(e.target.value))
                    }
                  />
                </div>
                <div className="quad-input-box" title="Bottom border">
                  <span className="quad-input-tag">B</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    min="0"
                    value={borderWidths.bottom}
                    onChange={(e) =>
                      handleBorderWidthChange("bottom", Number(e.target.value))
                    }
                  />
                </div>
                <div className="quad-input-box" title="Left border">
                  <span className="quad-input-tag">L</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    min="0"
                    value={borderWidths.left}
                    onChange={(e) =>
                      handleBorderWidthChange("left", Number(e.target.value))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Border Color */}
            <div className="form-group-row">
              <span className="form-label">Border Color</span>
              <label className="form-color-picker">
                <div
                  className="form-color-picker__swatch"
                  style={{ backgroundColor: appearance.borderColor }}
                />
                <input
                  type="color"
                  style={{
                    width: 0,
                    height: 0,
                    padding: 0,
                    border: "none",
                    position: "absolute",
                    opacity: 0,
                  }}
                  value={appearance.borderColor}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, borderColor: e.target.value }))
                  }
                />
                <span className="form-color-picker__label">
                  {appearance.borderColor}
                </span>
              </label>
            </div>

            {/* Border Style */}
            <div className="form-group-row">
              <span className="form-label">Border Style</span>
              <select
                className="form-select"
                value={appearance.borderStyle || "solid"}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    borderStyle: e.target.value as any,
                  }))
                }
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="double">Double</option>
                <option value="none">None</option>
              </select>
            </div>

            {/* Border Radius (4 Corners + Linked Toggle) */}
            <div className="form-group-row" style={{ alignItems: "flex-start" }}>
              <div className="form-label-with-action">
                <span className="form-label">Radius</span>
                <button
                  type="button"
                  className="btn-icon-subtle"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      borderRadii: {
                        ...borderRadii,
                        linked: !borderRadii.linked,
                      },
                    }))
                  }
                  title={borderRadii.linked ? "Unlink corners" : "Link all corners uniform"}
                >
                  {borderRadii.linked ? (
                    <Link size={11} style={{ color: "var(--accent-primary)" }} />
                  ) : (
                    <Unlink size={11} style={{ color: "var(--text-tertiary)" }} />
                  )}
                </button>
              </div>

              <div className="quad-inputs-row">
                <div className="quad-input-box" title="Top-left radius">
                  <span className="quad-input-tag">TL</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    min="0"
                    value={borderRadii.topLeft}
                    onChange={(e) =>
                      handleBorderRadiusChange("topLeft", Number(e.target.value))
                    }
                  />
                </div>
                <div className="quad-input-box" title="Top-right radius">
                  <span className="quad-input-tag">TR</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    min="0"
                    value={borderRadii.topRight}
                    onChange={(e) =>
                      handleBorderRadiusChange("topRight", Number(e.target.value))
                    }
                  />
                </div>
                <div className="quad-input-box" title="Bottom-right radius">
                  <span className="quad-input-tag">BR</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    min="0"
                    value={borderRadii.bottomRight}
                    onChange={(e) =>
                      handleBorderRadiusChange("bottomRight", Number(e.target.value))
                    }
                  />
                </div>
                <div className="quad-input-box" title="Bottom-left radius">
                  <span className="quad-input-tag">BL</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    min="0"
                    value={borderRadii.bottomLeft}
                    onChange={(e) =>
                      handleBorderRadiusChange("bottomLeft", Number(e.target.value))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUB-GROUP 3: SHADOWS & EFFECTS
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("shadows")}
        >
          <ChevronRight
            size={11}
            className={`appearance-subgroup__chevron ${
              openSubgroups.shadows ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <span className="appearance-subgroup__title">Shadows & Effects</span>
          <span className="appearance-subgroup__badge">
            {shadows.filter((s) => s.enabled).length} Active
          </span>
        </button>

        {openSubgroups.shadows && (
          <div className="appearance-subgroup__body">
            {/* Box Shadow Multi-Stack */}
            <ShadowEditor
              shadows={shadows}
              onChange={(sh) =>
                onChange((prev) => ({
                  ...prev,
                  boxShadows: sh,
                  // Synchronize top-level string representation for compatibility
                  boxShadow: sh
                    .filter((s) => s.enabled)
                    .map(
                      (s) =>
                        `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`
                    )
                    .join(", ") || "none",
                }))
              }
            />

            {/* Global Opacity */}
            <div className="form-group-row">
              <span className="form-label">Opacity</span>
              <div className="form-slider-row">
                <input
                  type="range"
                  className="form-slider"
                  min="0"
                  max="100"
                  value={Math.round((appearance.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      opacity: Number(e.target.value) / 100,
                    }))
                  }
                />
                <span className="form-slider-val">
                  {Math.round((appearance.opacity ?? 1) * 100)}%
                </span>
              </div>
            </div>

            {/* Backdrop Filter (Blur) */}
            <div className="form-group-row">
              <span className="form-label">Backdrop Blur</span>
              <div className="form-slider-row">
                <input
                  type="range"
                  className="form-slider"
                  min="0"
                  max="40"
                  value={appearance.backdropFilter?.blur || 0}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      backdropFilter: {
                        enabled: Number(e.target.value) > 0,
                        brightness: 100,
                        contrast: 100,
                        saturate: 100,
                        blur: Number(e.target.value),
                      },
                    }))
                  }
                />
                <span className="form-slider-val">
                  {appearance.backdropFilter?.blur || 0}px
                </span>
              </div>
            </div>

            {/* Mix Blend Mode */}
            <div className="form-group-row">
              <span className="form-label">Mix Blend</span>
              <select
                className="form-select"
                value={appearance.mixBlendMode || "normal"}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    mixBlendMode: e.target.value as any,
                  }))
                }
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="difference">Difference</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUB-GROUP 4: TRANSFORM & PIVOT
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("transform")}
        >
          <ChevronRight
            size={11}
            className={`appearance-subgroup__chevron ${
              openSubgroups.transform ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <span className="appearance-subgroup__title">Transform</span>
          <span className="appearance-subgroup__badge">
            {transform.rotate}° • {transform.scaleX}x
          </span>
        </button>

        {openSubgroups.transform && (
          <div className="appearance-subgroup__body">
            {/* Translate X & Y */}
            <div className="form-group-row">
              <span className="form-label">Translate</span>
              <div className="form-grid-2">
                <div className="form-mini-row">
                  <span className="form-mini-label">X</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    value={transform.translateX}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        transform: {
                          ...transform,
                          translateX: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <span className="form-unit">px</span>
                </div>
                <div className="form-mini-row">
                  <span className="form-mini-label">Y</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    value={transform.translateY}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        transform: {
                          ...transform,
                          translateY: Number(e.target.value),
                        },
                      }))
                    }
                  />
                  <span className="form-unit">px</span>
                </div>
              </div>
            </div>

            {/* Rotate (-180 to 180 deg) */}
            <div className="form-group-row">
              <span className="form-label">Rotate</span>
              <div className="form-slider-row">
                <input
                  type="range"
                  className="form-slider"
                  min="-180"
                  max="180"
                  value={transform.rotate}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      transform: {
                        ...transform,
                        rotate: Number(e.target.value),
                      },
                    }))
                  }
                />
                <span className="form-slider-val">{transform.rotate}°</span>
              </div>
            </div>

            {/* Scale X & Y */}
            <div className="form-group-row">
              <div className="form-label-with-action">
                <span className="form-label">Scale</span>
                <button
                  type="button"
                  className="btn-icon-subtle"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      transform: {
                        ...transform,
                        scaleLinked: !transform.scaleLinked,
                      },
                    }))
                  }
                  title={transform.scaleLinked ? "Unlink axes" : "Link scale uniform"}
                >
                  {transform.scaleLinked ? (
                    <Link size={11} style={{ color: "var(--accent-primary)" }} />
                  ) : (
                    <Unlink size={11} style={{ color: "var(--text-tertiary)" }} />
                  )}
                </button>
              </div>

              <div className="form-grid-2">
                <div className="form-mini-row">
                  <span className="form-mini-label">X</span>
                  <input
                    type="number"
                    step="0.05"
                    className="form-input form-mini-input"
                    value={transform.scaleX}
                    onChange={(e) =>
                      handleScaleChange("scaleX", Number(e.target.value))
                    }
                  />
                </div>
                <div className="form-mini-row">
                  <span className="form-mini-label">Y</span>
                  <input
                    type="number"
                    step="0.05"
                    className="form-input form-mini-input"
                    value={transform.scaleY}
                    onChange={(e) =>
                      handleScaleChange("scaleY", Number(e.target.value))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Skew X & Y */}
            <div className="form-group-row">
              <span className="form-label">Skew</span>
              <div className="form-grid-2">
                <div className="form-mini-row">
                  <span className="form-mini-label">X</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    value={transform.skewX}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        transform: { ...transform, skewX: Number(e.target.value) },
                      }))
                    }
                  />
                  <span className="form-unit">°</span>
                </div>
                <div className="form-mini-row">
                  <span className="form-mini-label">Y</span>
                  <input
                    type="number"
                    className="form-input form-mini-input"
                    value={transform.skewY}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        transform: { ...transform, skewY: Number(e.target.value) },
                      }))
                    }
                  />
                  <span className="form-unit">°</span>
                </div>
              </div>
            </div>

            {/* Transform Origin 9-Point Picker */}
            <div className="form-group-row" style={{ alignItems: "flex-start" }}>
              <span className="form-label">Pivot Origin</span>
              <TransformOriginPicker
                origin={transform.origin}
                onChange={(orig) =>
                  onChange((prev) => ({
                    ...prev,
                    transform: { ...transform, origin: orig },
                  }))
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUB-GROUP 5: TRANSITIONS & TIMING
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("transition")}
        >
          <ChevronRight
            size={11}
            className={`appearance-subgroup__chevron ${
              openSubgroups.transition ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <span className="appearance-subgroup__title">Transition & Timing</span>
          <span className="appearance-subgroup__badge">
            {transition.duration}ms • {transition.easing}
          </span>
        </button>

        {openSubgroups.transition && (
          <div className="appearance-subgroup__body">
            {/* Property Selector Chips */}
            <div className="form-group-row" style={{ alignItems: "flex-start" }}>
              <span className="form-label">Animate</span>
              <div className="transition-prop-chips">
                {["all", "opacity", "transform", "background-color", "box-shadow"].map(
                  (prop) => {
                    const isSelected = transition.properties.includes(prop);
                    return (
                      <button
                        key={prop}
                        type="button"
                        className={`transition-prop-chip ${
                          isSelected ? "transition-prop-chip--active" : ""
                        }`}
                        onClick={() => handleToggleTransitionProperty(prop)}
                      >
                        {prop}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Duration Slider */}
            <div className="form-group-row">
              <span className="form-label">Duration</span>
              <div className="form-slider-row">
                <input
                  type="range"
                  className="form-slider"
                  min="0"
                  max="1500"
                  step="50"
                  value={transition.duration}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      transition: {
                        ...transition,
                        duration: Number(e.target.value),
                      },
                    }))
                  }
                />
                <span className="form-slider-val">{transition.duration}ms</span>
              </div>
            </div>

            {/* Visual Easing Curve Selector */}
            <div className="form-group-row" style={{ alignItems: "flex-start" }}>
              <span className="form-label">Curve</span>
              <EasingCurveSelector
                easing={transition.easing}
                onChange={(curve) =>
                  onChange((prev) => ({
                    ...prev,
                    transition: { ...transition, easing: curve },
                  }))
                }
              />
            </div>

            {/* Delay Slider */}
            <div className="form-group-row">
              <span className="form-label">Delay</span>
              <div className="form-slider-row">
                <input
                  type="range"
                  className="form-slider"
                  min="0"
                  max="800"
                  step="25"
                  value={transition.delay}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      transition: {
                        ...transition,
                        delay: Number(e.target.value),
                      },
                    }))
                  }
                />
                <span className="form-slider-val">{transition.delay}ms</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
