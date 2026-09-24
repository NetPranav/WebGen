"use client";

/**
 * ============================================================================
 * DEEP TYPOGRAPHY & TEXT EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * UI Element: Complete Web Typography Inspector Sub-Panel
 * Screen / Scope: Details Panel -> Category: Typography & Text
 * Role: Provides deep, collapsible micro-editors for Font Family, Size/Weight,
 *       Live Typeface Preview, Alignments, Transforms, Spacing & Overflow.
 * Architecture Ref: `DOCS/ROADMAP_2.md` §Phase 2.4
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Type,
  AlignLeft,
  Sliders,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Italic,
  Underline,
  Strikethrough,
  Baseline,
} from "lucide-react";
import { AssetTypographySchema } from "@/core/types/details";
import { TextAlignToggle, TextAlignMode } from "../controls/TextAlignToggle";

export interface TypographyEditorProps {
  typography: AssetTypographySchema;
  onChange: React.Dispatch<React.SetStateAction<AssetTypographySchema>>;
  onResetToDefault?: () => void;
}

const FONT_OPTIONS = [
  { label: "Inter (Engine Default)", value: "Inter, sans-serif", category: "Sans-Serif" },
  { label: "Outfit (Modern Sans)", value: "'Outfit', sans-serif", category: "Sans-Serif" },
  { label: "Roboto (Clean Sans)", value: "'Roboto', sans-serif", category: "Sans-Serif" },
  { label: "Roboto Mono (Engine Code)", value: "'Roboto Mono', monospace", category: "Monospace" },
  { label: "JetBrains Mono (Developer)", value: "'JetBrains Mono', monospace", category: "Monospace" },
  { label: "Fira Code (Ligature Mono)", value: "'Fira Code', monospace", category: "Monospace" },
  { label: "Playfair Display (Editorial Serif)", value: "'Playfair Display', serif", category: "Serif" },
  { label: "Georgia (Classic Serif)", value: "Georgia, serif", category: "Serif" },
  { label: "System UI (Native OS)", value: "system-ui, -apple-system, sans-serif", category: "System" },
];

const WEIGHT_MAP: Record<string, string> = {
  "100": "Thin (100)",
  "200": "Extra Light (200)",
  "300": "Light (300)",
  "400": "Regular (400)",
  "500": "Medium (500)",
  "600": "SemiBold (600)",
  "700": "Bold (700)",
  "800": "ExtraBold (800)",
  "900": "Black (900)",
};

export const TypographyEditor: React.FC<TypographyEditorProps> = ({
  typography,
  onChange,
  onResetToDefault,
}) => {
  // Collapsible sub-sections
  const [openSubgroups, setOpenSubgroups] = useState({
    typeface: true,
    alignment: true,
    spacing: false,
    preview: true,
  });

  const toggleSubgroup = (key: keyof typeof openSubgroups) => {
    setOpenSubgroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProp = <K extends keyof AssetTypographySchema>(key: K, val: AssetTypographySchema[K]) => {
    onChange((prev) => ({ ...prev, [key]: val }));
  };

  const currentWeightLabel = WEIGHT_MAP[typography.fontWeight] || `Weight (${typography.fontWeight})`;

  return (
    <div className="typography-editor">
      {/* Top Header Actions */}
      {onResetToDefault && (
        <div className="appearance-subgroup-toolbar">
          <span className="appearance-subgroup-desc">Full Web Typography Engine</span>
          <button
            type="button"
            className="appearance-reset-btn"
            onClick={onResetToDefault}
            title="Reset Typography to Engine Defaults"
          >
            <RotateCcw size={11} />
            <span>Reset Typography</span>
          </button>
        </div>
      )}

      {/* ====================================================================
       * SUBGROUP 1: FONT & TYPEFACE
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("typeface")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.typeface ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Type size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Font & Typeface</span>
        </button>

        {openSubgroups.typeface && (
          <div className="appearance-subgroup__content">
            {/* Font Family */}
            <div className="form-group-row">
              <label className="form-label">Font Family</label>
              <select
                className="form-select"
                style={{ fontFamily: typography.fontFamily, fontSize: 11 }}
                value={typography.fontFamily}
                onChange={(e) => updateProp("fontFamily", e.target.value)}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size with Unit */}
            <div className="form-group-row">
              <label className="form-label">Font Size</label>
              <div className="input-with-unit-group">
                <input
                  type="number"
                  className="form-input form-input--number"
                  value={typography.fontSize}
                  onChange={(e) => updateProp("fontSize", Number(e.target.value))}
                  min={8}
                  max={120}
                  step={1}
                />
                <select
                  className="form-select form-select--unit"
                  value={typography.fontSizeUnit || "px"}
                  onChange={(e) => updateProp("fontSizeUnit", e.target.value as "px" | "rem" | "em" | "vw")}
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                  <option value="vw">vw</option>
                </select>
              </div>
            </div>

            {/* Font Weight Scrub Slider */}
            <div className="form-group">
              <div className="form-group-row-header">
                <label className="form-label">Font Weight</label>
                <span className="form-value-pill">{currentWeightLabel}</span>
              </div>
              <div className="font-weight-slider-row">
                <input
                  type="range"
                  min={100}
                  max={900}
                  step={100}
                  className="form-slider"
                  value={Number(typography.fontWeight) || 400}
                  onChange={(e) => updateProp("fontWeight", String(e.target.value))}
                />
                <div className="font-weight-ticks">
                  <span>100</span>
                  <span>400</span>
                  <span>600</span>
                  <span>900</span>
                </div>
              </div>
            </div>

            {/* Text Color */}
            <div className="form-group-row">
              <label className="form-label">Text Color</label>
              <div className="form-color-picker-wrap">
                <input
                  type="color"
                  className="form-color-swatch"
                  value={typography.color || "#ffffff"}
                  onChange={(e) => updateProp("color", e.target.value)}
                />
                <input
                  type="text"
                  className="form-input form-input--code"
                  value={typography.color || "#ffffff"}
                  onChange={(e) => updateProp("color", e.target.value)}
                  placeholder="#ffffff"
                  style={{ width: 85 }}
                />
              </div>
            </div>

            {/* Font Style Toggle (Normal / Italic) */}
            <div className="form-group-row">
              <label className="form-label">Font Style</label>
              <div className="form-mode-switch">
                <button
                  type="button"
                  className={`form-mode-btn ${
                    (typography.fontStyle || "normal") === "normal" ? "form-mode-btn--active" : ""
                  }`}
                  onClick={() => updateProp("fontStyle", "normal")}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`form-mode-btn ${
                    typography.fontStyle === "italic" ? "form-mode-btn--active" : ""
                  }`}
                  onClick={() => updateProp("fontStyle", "italic")}
                >
                  <Italic size={11} style={{ marginRight: 4 }} />
                  Italic
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 2: ALIGNMENT & FORMATTING
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("alignment")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.alignment ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <AlignLeft size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Alignment & Formatting</span>
        </button>

        {openSubgroups.alignment && (
          <div className="appearance-subgroup__content">
            {/* Text Alignment Visual Toggle */}
            <div className="form-group-row">
              <label className="form-label">Alignment</label>
              <TextAlignToggle
                value={typography.textAlign}
                onChange={(mode) => updateProp("textAlign", mode)}
              />
            </div>

            {/* Text Transform Pills */}
            <div className="form-group-row">
              <label className="form-label">Transform</label>
              <div className="form-mode-switch">
                {(["none", "uppercase", "lowercase", "capitalize"] as const).map((t) => {
                  const isActive = (typography.textTransform || "none") === t;
                  const labelMap = {
                    none: "None",
                    uppercase: "UPPER",
                    lowercase: "lower",
                    capitalize: "Capital",
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`form-mode-btn ${isActive ? "form-mode-btn--active" : ""}`}
                      onClick={() => updateProp("textTransform", t)}
                    >
                      {labelMap[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Decoration Pills */}
            <div className="form-group-row">
              <label className="form-label">Decoration</label>
              <div className="form-mode-switch">
                {(["none", "underline", "line-through", "overline"] as const).map((d) => {
                  const isActive = (typography.textDecoration || "none") === d;
                  const labelMap = {
                    none: "None",
                    underline: "Underline",
                    "line-through": "Strike",
                    overline: "Overline",
                  };
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`form-mode-btn ${isActive ? "form-mode-btn--active" : ""}`}
                      onClick={() => updateProp("textDecoration", d)}
                    >
                      {labelMap[d]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Decoration Color & Style (when decoration != none) */}
            {(typography.textDecoration && typography.textDecoration !== "none") && (
              <div className="form-group-row">
                <label className="form-label">Deco Style</label>
                <div style={{ display: "flex", gap: 6, width: "100%", justifyContent: "flex-end" }}>
                  <select
                    className="form-select"
                    style={{ width: 80, fontSize: 11 }}
                    value={typography.textDecorationStyle || "solid"}
                    onChange={(e) =>
                      updateProp(
                        "textDecorationStyle",
                        e.target.value as "solid" | "dashed" | "dotted" | "wavy" | "double"
                      )
                    }
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                    <option value="wavy">Wavy</option>
                    <option value="double">Double</option>
                  </select>
                  <input
                    type="color"
                    className="form-color-swatch"
                    value={typography.textDecorationColor || typography.color || "#ffffff"}
                    onChange={(e) => updateProp("textDecorationColor", e.target.value)}
                    title="Decoration Color"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 3: SPACING & OVERFLOW
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("spacing")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.spacing ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Sliders size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Spacing & Wrapping</span>
        </button>

        {openSubgroups.spacing && (
          <div className="appearance-subgroup__content">
            {/* Line Height */}
            <div className="form-group-row">
              <label className="form-label">Line Height</label>
              <div className="input-with-unit-group">
                <input
                  type="number"
                  className="form-input form-input--number"
                  value={typography.lineHeight}
                  onChange={(e) => updateProp("lineHeight", Number(e.target.value))}
                  min={0.5}
                  max={4}
                  step={0.1}
                />
                <select
                  className="form-select form-select--unit"
                  value={typography.lineHeightUnit || ""}
                  onChange={(e) => updateProp("lineHeightUnit", e.target.value as "px" | "rem" | "em" | "")}
                >
                  <option value="">rel</option>
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                </select>
              </div>
            </div>

            {/* Letter Spacing */}
            <div className="form-group-row">
              <label className="form-label">Letter Spacing</label>
              <div className="input-with-unit-group">
                <input
                  type="number"
                  className="form-input form-input--number"
                  value={typography.letterSpacing ?? 0}
                  onChange={(e) => updateProp("letterSpacing", Number(e.target.value))}
                  step={0.1}
                />
                <select
                  className="form-select form-select--unit"
                  value={typography.letterSpacingUnit || "px"}
                  onChange={(e) => updateProp("letterSpacingUnit", e.target.value as "px" | "em")}
                >
                  <option value="px">px</option>
                  <option value="em">em</option>
                </select>
              </div>
            </div>

            {/* Word Spacing */}
            <div className="form-group-row">
              <label className="form-label">Word Spacing</label>
              <div className="input-with-unit-group">
                <input
                  type="number"
                  className="form-input form-input--number"
                  value={typography.wordSpacing ?? 0}
                  onChange={(e) => updateProp("wordSpacing", Number(e.target.value))}
                  step={0.5}
                />
                <select
                  className="form-select form-select--unit"
                  value={typography.wordSpacingUnit || "px"}
                  onChange={(e) => updateProp("wordSpacingUnit", e.target.value as "px" | "em")}
                >
                  <option value="px">px</option>
                  <option value="em">em</option>
                </select>
              </div>
            </div>

            {/* White Space */}
            <div className="form-group-row">
              <label className="form-label">White Space</label>
              <select
                className="form-select"
                value={typography.whiteSpace || "normal"}
                onChange={(e) =>
                  updateProp("whiteSpace", e.target.value as "normal" | "nowrap" | "pre" | "pre-wrap")
                }
              >
                <option value="normal">Normal (Wrap)</option>
                <option value="nowrap">No Wrap (Single Line)</option>
                <option value="pre">Pre (Preserve Spaces)</option>
                <option value="pre-wrap">Pre-Wrap (Break & Preserve)</option>
              </select>
            </div>

            {/* Text Overflow */}
            <div className="form-group-row">
              <label className="form-label">Text Overflow</label>
              <select
                className="form-select"
                value={typography.textOverflow || "clip"}
                onChange={(e) => updateProp("textOverflow", e.target.value as "clip" | "ellipsis" | "fade")}
              >
                <option value="clip">Clip (Hard Cut)</option>
                <option value="ellipsis">Ellipsis (…)</option>
                <option value="fade">Fade</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 4: LIVE TYPEFACE PREVIEW STRIP
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("preview")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.preview ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Sparkles size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Typeface Render Preview</span>
        </button>

        {openSubgroups.preview && (
          <div className="appearance-subgroup__content">
            <div
              className="typography-preview-box"
              style={{
                fontFamily: typography.fontFamily,
                fontSize: `${typography.fontSize}${typography.fontSizeUnit || "px"}`,
                fontWeight: typography.fontWeight,
                lineHeight: typography.lineHeightUnit
                  ? `${typography.lineHeight}${typography.lineHeightUnit}`
                  : typography.lineHeight,
                textAlign: typography.textAlign,
                color: typography.color || "#ffffff",
                fontStyle: typography.fontStyle || "normal",
                textTransform: typography.textTransform || "none",
                textDecoration: typography.textDecoration || "none",
                textDecorationColor: typography.textDecorationColor || undefined,
                textDecorationStyle: typography.textDecorationStyle || undefined,
                letterSpacing: typography.letterSpacing
                  ? `${typography.letterSpacing}${typography.letterSpacingUnit || "px"}`
                  : undefined,
                wordSpacing: typography.wordSpacing
                  ? `${typography.wordSpacing}${typography.wordSpacingUnit || "px"}`
                  : undefined,
                whiteSpace: typography.whiteSpace || "normal",
              }}
            >
              The quick brown fox jumps over the lazy dog.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
