"use client";

/**
 * ============================================================================
 * BUTTON STATE & INTERACTION EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * Element-specific Details sub-panel for Button widgets:
 * - Interaction States (Hover, Active, Focus Ring, Disabled Opacity)
 * - Loading States (Animated Spinner, Disabled While Loading, Loading Label)
 * - Ripple Effect (Material Ripple trigger, Duration, Color, Origin)
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Sparkles,
  ChevronRight,
  RotateCcw,
  MousePointer,
  Loader2,
  Waves,
  Eye,
} from "lucide-react";
import { ButtonSpecificConfig } from "@/core/types/element-sections";

export interface ButtonStateEditorProps {
  config: ButtonSpecificConfig;
  onChange: React.Dispatch<React.SetStateAction<ButtonSpecificConfig>>;
  onReset?: () => void;
}

export const ButtonStateEditor: React.FC<ButtonStateEditorProps> = ({
  config,
  onChange,
  onReset,
}) => {
  const [openSubgroups, setOpenSubgroups] = useState({
    states: true,
    loading: true,
    ripple: false,
  });

  const toggleSubgroup = (key: keyof typeof openSubgroups) => {
    setOpenSubgroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProp = <K extends keyof ButtonSpecificConfig>(key: K, val: ButtonSpecificConfig[K]) => {
    onChange((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="element-specific-editor button-state-editor">
      {/* ====================================================================
       * SUBGROUP 1: INTERACTION STATES
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("states")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.states ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <MousePointer size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Interaction States</span>
        </button>

        {openSubgroups.states && (
          <div className="appearance-subgroup__content">
            {/* Hover Background Color */}
            <div className="form-group-row">
              <label className="form-label">:hover Background</label>
              <div className="form-color-picker-wrap">
                <input
                  type="color"
                  className="form-color-swatch"
                  value={config.hoverBgColor}
                  onChange={(e) => updateProp("hoverBgColor", e.target.value)}
                />
                <input
                  type="text"
                  className="form-input form-input--code"
                  value={config.hoverBgColor}
                  onChange={(e) => updateProp("hoverBgColor", e.target.value)}
                  style={{ width: 85 }}
                />
              </div>
            </div>

            {/* Active Background Color */}
            <div className="form-group-row">
              <label className="form-label">:active (Pressed)</label>
              <div className="form-color-picker-wrap">
                <input
                  type="color"
                  className="form-color-swatch"
                  value={config.activeBgColor}
                  onChange={(e) => updateProp("activeBgColor", e.target.value)}
                />
                <input
                  type="text"
                  className="form-input form-input--code"
                  value={config.activeBgColor}
                  onChange={(e) => updateProp("activeBgColor", e.target.value)}
                  style={{ width: 85 }}
                />
              </div>
            </div>

            {/* Focus Ring Width & Color */}
            <div className="form-group-row">
              <label className="form-label">:focus Ring</label>
              <div style={{ display: "flex", gap: 6, width: "100%", justifyContent: "flex-end" }}>
                <input
                  type="number"
                  className="form-input form-input--number"
                  value={config.focusRingWidth}
                  onChange={(e) => updateProp("focusRingWidth", Number(e.target.value))}
                  min={0}
                  max={8}
                  style={{ width: 44 }}
                  title="Ring Width (px)"
                />
                <input
                  type="color"
                  className="form-color-swatch"
                  value={config.focusRingColor}
                  onChange={(e) => updateProp("focusRingColor", e.target.value)}
                  title="Ring Color"
                />
              </div>
            </div>

            {/* Disabled Opacity */}
            <div className="form-group">
              <div className="form-group-row-header">
                <label className="form-label">:disabled Opacity</label>
                <span className="form-value-pill">{config.disabledOpacity}%</span>
              </div>
              <input
                type="range"
                className="form-slider"
                min={10}
                max={100}
                value={config.disabledOpacity}
                onChange={(e) => updateProp("disabledOpacity", Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 2: LOADING STATE & SPINNER
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("loading")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.loading ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Loader2 size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Loading State</span>
        </button>

        {openSubgroups.loading && (
          <div className="appearance-subgroup__content">
            {/* Is Loading Toggle */}
            <div className="form-group-row">
              <label className="form-label">Active Loading</label>
              <input
                type="checkbox"
                className="form-checkbox"
                checked={config.isLoading}
                onChange={(e) => updateProp("isLoading", e.target.checked)}
              />
            </div>

            {/* Spinner Type */}
            <div className="form-group-row">
              <label className="form-label">Spinner Type</label>
              <div className="form-mode-switch">
                {(["circular", "dots", "pulse"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`form-mode-btn ${config.spinnerType === mode ? "form-mode-btn--active" : ""}`}
                    onClick={() => updateProp("spinnerType", mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Spinner Color */}
            <div className="form-group-row">
              <label className="form-label">Spinner Color</label>
              <div className="form-color-picker-wrap">
                <input
                  type="color"
                  className="form-color-swatch"
                  value={config.spinnerColor}
                  onChange={(e) => updateProp("spinnerColor", e.target.value)}
                />
                <input
                  type="text"
                  className="form-input form-input--code"
                  value={config.spinnerColor}
                  onChange={(e) => updateProp("spinnerColor", e.target.value)}
                  style={{ width: 85 }}
                />
              </div>
            </div>

            {/* Loading Label */}
            <div className="form-group-row">
              <label className="form-label">Loading Label</label>
              <input
                type="text"
                className="form-input"
                value={config.loadingLabel}
                onChange={(e) => updateProp("loadingLabel", e.target.value)}
                placeholder="Loading..."
              />
            </div>

            {/* Disable while loading */}
            <div className="form-group-row">
              <label className="form-label">Disable Input</label>
              <input
                type="checkbox"
                className="form-checkbox"
                checked={config.disableWhileLoading}
                onChange={(e) => updateProp("disableWhileLoading", e.target.checked)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 3: MATERIAL RIPPLE EFFECT
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("ripple")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.ripple ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Waves size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Click Ripple Effect</span>
        </button>

        {openSubgroups.ripple && (
          <div className="appearance-subgroup__content">
            {/* Enable Ripple */}
            <div className="form-group-row">
              <label className="form-label">Enable Ripple</label>
              <input
                type="checkbox"
                className="form-checkbox"
                checked={config.rippleEnabled}
                onChange={(e) => updateProp("rippleEnabled", e.target.checked)}
              />
            </div>

            {config.rippleEnabled && (
              <>
                {/* Ripple Origin */}
                <div className="form-group-row">
                  <label className="form-label">Origin</label>
                  <div className="form-mode-switch">
                    <button
                      type="button"
                      className={`form-mode-btn ${config.rippleOrigin === "pointer" ? "form-mode-btn--active" : ""}`}
                      onClick={() => updateProp("rippleOrigin", "pointer")}
                    >
                      Click Point
                    </button>
                    <button
                      type="button"
                      className={`form-mode-btn ${config.rippleOrigin === "center" ? "form-mode-btn--active" : ""}`}
                      onClick={() => updateProp("rippleOrigin", "center")}
                    >
                      Center
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div className="form-group">
                  <div className="form-group-row-header">
                    <label className="form-label">Duration</label>
                    <span className="form-value-pill">{config.rippleDuration} ms</span>
                  </div>
                  <input
                    type="range"
                    className="form-slider"
                    min={150}
                    max={800}
                    step={25}
                    value={config.rippleDuration}
                    onChange={(e) => updateProp("rippleDuration", Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
