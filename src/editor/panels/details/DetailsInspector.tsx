"use client";

/**
 * ============================================================================
 * PROPERTIES & DETAILS INSPECTOR PANEL
 * ============================================================================
 * UI Element: Details Inspector (Unreal Equivalent: Details Panel)
 * Screen / Scope: Screen 03: Details Inspector (`/editor`)
 * Role: Context-aware properties editor for selected components.
 * Styling Source: `@/editor/styles/panels.css` & `@/editor/styles/forms.css`
 * Matches: PANELS.md (Panel 03) & UI.md §4.2
 * ============================================================================
 */

import React, { useState } from "react";
import {
  ChevronRight,
  Sparkles,
  Link,
  Sliders,
  RotateCw,
  Lock,
  Eye,
  Trash2,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ExternalLink,
} from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { DataBindingEditor } from "./sections/DataBindingEditor";
import { AnimationEditor } from "./sections/AnimationEditor";
import "@/editor/styles/panels.css";
import "@/editor/styles/forms.css";

interface DetailsInspectorProps {
  selectedElementId?: string;
  selectedElementName?: string;
  onOpenBlueprint?: () => void;
}

export const DetailsInspector: React.FC<DetailsInspectorProps> = ({
  selectedElementId = "comp_hero",
  selectedElementName = "Hero Section",
  onOpenBlueprint,
}) => {
  const { elements } = useProjectStore();
  const currentElement = elements[selectedElementId];
  const archetype = currentElement?.archetype || "button";

  // Collapsible accordion state
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    transform: true,
    layout: true,
    appearance: true,
    typography: true,
    bindings: true,
    motion: true,
  });

  const toggleSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Transform states
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(64);
  const [width, setWidth] = useState(1440);
  const [height, setHeight] = useState(380);
  const [rotation, setRotation] = useState(0);
  const [zIndex, setZIndex] = useState(1);
  const [aspectLock, setAspectLock] = useState(false);

  // Layout states
  const [displayMode, setDisplayMode] = useState<"flex" | "grid" | "block">("flex");
  const [flexDir, setFlexDir] = useState<"row" | "col">("col");
  const [justify, setJustify] = useState<"start" | "center" | "between">("center");
  const [align, setAlign] = useState<"start" | "center" | "stretch">("center");
  const [gap, setGap] = useState(16);
  const [padding, setPadding] = useState(32);

  // Appearance states
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [opacity, setOpacity] = useState(100);
  const [borderRadius, setBorderRadius] = useState(12);
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderColor, setBorderColor] = useState("#E2E8F0");
  const [shadowPreset, setShadowPreset] = useState("sm");

  // Typography states
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState(16);
  const [fontWeight, setFontWeight] = useState("500");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [textColor, setTextColor] = useState("#0F172A");

  // Data binding
  const [boundVariable, setBoundVariable] = useState("none");

  return (
    <div className="panel-shell" role="region" aria-label="Properties & Details Inspector">
      {/* Panel Top Header Bar */}
      <div className="panel-header">
        <div className="panel-header__title">
          <Sliders size={13} style={{ color: "var(--accent-primary)" }} />
          <span>{selectedElementName}</span>
        </div>

        <div className="panel-header__actions">
          <span className="panel-header__badge">{selectedElementId}</span>
          <button type="button" className="panel-icon-btn" title="Inspect Source Blueprint" onClick={onOpenBlueprint}>
            <ExternalLink size={12} />
          </button>
          <button type="button" className="panel-icon-btn" title="Delete Component">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="panel-content">
        {/* ====================================================================
         * SECTION 1: TRANSFORM
         * ==================================================================== */}
        <div className={`panel-section ${sectionsOpen.transform ? "panel-section--open" : ""}`}>
          <button
            type="button"
            className="panel-section__header"
            onClick={() => toggleSection("transform")}
          >
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" />
              <span>Transform</span>
            </div>
            <span className="panel-header__badge">px</span>
          </button>

          {sectionsOpen.transform && (
            <div className="panel-section__content">
              {/* Position X / Y */}
              <div className="form-group">
                <div className="form-label">
                  <span>Position</span>
                  <span className="form-label__hint">Offset from parent</span>
                </div>
                <div className="form-row--2col">
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--x">X</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={posX}
                      onChange={(e) => setPosX(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--y">Y</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={posY}
                      onChange={(e) => setPosY(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Dimensions W / H */}
              <div className="form-group">
                <div className="form-label">
                  <span>Dimensions</span>
                  <button
                    type="button"
                    className={`panel-icon-btn ${aspectLock ? "panel-icon-btn--active" : ""}`}
                    onClick={() => setAspectLock(!aspectLock)}
                    title={aspectLock ? "Aspect ratio locked" : "Lock aspect ratio"}
                  >
                    <Lock size={11} />
                  </button>
                </div>
                <div className="form-row--2col">
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--w">W</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--h">H</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Rotation & Z-Index */}
              <div className="form-row--2col">
                <div className="form-group">
                  <label className="form-label">Rotation</label>
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--neutral">°</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Z-Index</label>
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--neutral">Z</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={zIndex}
                      onChange={(e) => setZIndex(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 2: LAYOUT & FLEXBOX
         * ==================================================================== */}
        <div className={`panel-section ${sectionsOpen.layout ? "panel-section--open" : ""}`}>
          <button
            type="button"
            className="panel-section__header"
            onClick={() => toggleSection("layout")}
          >
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" />
              <span>Layout & Flexbox</span>
            </div>
          </button>

          {sectionsOpen.layout && (
            <div className="panel-section__content">
              {/* Display Mode */}
              <div className="form-group">
                <label className="form-label">Display Mode</label>
                <div className="form-segmented">
                  <button
                    type="button"
                    className={`form-segmented__btn ${displayMode === "flex" ? "form-segmented__btn--active" : ""}`}
                    onClick={() => setDisplayMode("flex")}
                  >
                    Flex
                  </button>
                  <button
                    type="button"
                    className={`form-segmented__btn ${displayMode === "grid" ? "form-segmented__btn--active" : ""}`}
                    onClick={() => setDisplayMode("grid")}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    className={`form-segmented__btn ${displayMode === "block" ? "form-segmented__btn--active" : ""}`}
                    onClick={() => setDisplayMode("block")}
                  >
                    Block
                  </button>
                </div>
              </div>

              {displayMode === "flex" && (
                <>
                  {/* Direction */}
                  <div className="form-group">
                    <label className="form-label">Flex Direction</label>
                    <div className="form-segmented">
                      <button
                        type="button"
                        className={`form-segmented__btn ${flexDir === "row" ? "form-segmented__btn--active" : ""}`}
                        onClick={() => setFlexDir("row")}
                      >
                        Horizontal (Row)
                      </button>
                      <button
                        type="button"
                        className={`form-segmented__btn ${flexDir === "col" ? "form-segmented__btn--active" : ""}`}
                        onClick={() => setFlexDir("col")}
                      >
                        Vertical (Column)
                      </button>
                    </div>
                  </div>

                  {/* Justify Content */}
                  <div className="form-group">
                    <label className="form-label">Justify Content</label>
                    <select
                      className="form-select"
                      value={justify}
                      onChange={(e) => setJustify(e.target.value as any)}
                    >
                      <option value="start">Flex Start</option>
                      <option value="center">Center</option>
                      <option value="between">Space Between</option>
                    </select>
                  </div>

                  {/* Align Items */}
                  <div className="form-group">
                    <label className="form-label">Align Items</label>
                    <select
                      className="form-select"
                      value={align}
                      onChange={(e) => setAlign(e.target.value as any)}
                    >
                      <option value="start">Flex Start</option>
                      <option value="center">Center</option>
                      <option value="stretch">Stretch</option>
                    </select>
                  </div>
                </>
              )}

              {/* Gap & Padding */}
              <div className="form-row--2col">
                <div className="form-group">
                  <label className="form-label">Item Gap</label>
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--neutral">G</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={gap}
                      onChange={(e) => setGap(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Padding</label>
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--neutral">P</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={padding}
                      onChange={(e) => setPadding(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 3: APPEARANCE & STYLING
         * ==================================================================== */}
        <div className={`panel-section ${sectionsOpen.appearance ? "panel-section--open" : ""}`}>
          <button
            type="button"
            className="panel-section__header"
            onClick={() => toggleSection("appearance")}
          >
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" />
              <span>Appearance</span>
            </div>
          </button>

          {sectionsOpen.appearance && (
            <div className="panel-section__content">
              {/* Background Color */}
              <div className="form-group">
                <label className="form-label">Background Color</label>
                <div className="form-row">
                  <div className="form-color-picker">
                    <div
                      className="form-color-picker__swatch"
                      style={{ backgroundColor: bgColor }}
                    />
                    <span className="form-color-picker__label">{bgColor}</span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                  />
                </div>
              </div>

              {/* Border Radius & Width */}
              <div className="form-row--2col">
                <div className="form-group">
                  <label className="form-label">Corner Radius</label>
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--neutral">R</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Border Width</label>
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--neutral">B</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={borderWidth}
                      onChange={(e) => setBorderWidth(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Shadow Preset */}
              <div className="form-group">
                <label className="form-label">Box Shadow Preset</label>
                <select
                  className="form-select"
                  value={shadowPreset}
                  onChange={(e) => setShadowPreset(e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="sm">Subtle (sm)</option>
                  <option value="md">Medium (md)</option>
                  <option value="lg">Floating (lg)</option>
                </select>
              </div>

              {/* Opacity Slider */}
              <div className="form-group">
                <div className="form-label">
                  <span>Opacity</span>
                  <span className="form-label__hint">{opacity}%</span>
                </div>
                <div className="form-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="form-slider"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                  />
                  <span className="form-slider-val">{opacity}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 4: TYPOGRAPHY
         * ==================================================================== */}
        <div className={`panel-section ${sectionsOpen.typography ? "panel-section--open" : ""}`}>
          <button
            type="button"
            className="panel-section__header"
            onClick={() => toggleSection("typography")}
          >
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" />
              <span>Typography</span>
            </div>
          </button>

          {sectionsOpen.typography && (
            <div className="panel-section__content">
              {/* Font Family */}
              <div className="form-group">
                <label className="form-label">Font Family</label>
                <select
                  className="form-select"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  <option value="Inter">Inter (System Sans)</option>
                  <option value="Roboto">Roboto</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Outfit">Outfit</option>
                </select>
              </div>

              {/* Size & Weight */}
              <div className="form-row--2col">
                <div className="form-group">
                  <label className="form-label">Font Size</label>
                  <div className="form-number-scrub">
                    <span className="form-number-scrub__badge form-number-scrub__badge--neutral">px</span>
                    <input
                      type="number"
                      className="form-number-scrub__input"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Weight</label>
                  <select
                    className="form-select"
                    value={fontWeight}
                    onChange={(e) => setFontWeight(e.target.value)}
                  >
                    <option value="400">Regular (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">SemiBold (600)</option>
                    <option value="700">Bold (700)</option>
                  </select>
                </div>
              </div>

              {/* Text Alignment */}
              <div className="form-group">
                <label className="form-label">Text Alignment</label>
                <div className="form-segmented">
                  <button
                    type="button"
                    className={`form-segmented__btn ${textAlign === "left" ? "form-segmented__btn--active" : ""}`}
                    onClick={() => setTextAlign("left")}
                    title="Align Left"
                  >
                    <AlignLeft size={12} />
                  </button>
                  <button
                    type="button"
                    className={`form-segmented__btn ${textAlign === "center" ? "form-segmented__btn--active" : ""}`}
                    onClick={() => setTextAlign("center")}
                    title="Align Center"
                  >
                    <AlignCenter size={12} />
                  </button>
                  <button
                    type="button"
                    className={`form-segmented__btn ${textAlign === "right" ? "form-segmented__btn--active" : ""}`}
                    onClick={() => setTextAlign("right")}
                    title="Align Right"
                  >
                    <AlignRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 5: DATA BINDINGS & BLUEPRINTS
         * ==================================================================== */}
        <div className={`panel-section ${sectionsOpen.bindings ? "panel-section--open" : ""}`}>
          <button
            type="button"
            className="panel-section__header"
            onClick={() => toggleSection("bindings")}
          >
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" />
              <span>Data Bindings</span>
            </div>
            <Link size={12} style={{ color: "var(--accent-info)" }} />
          </button>

          {sectionsOpen.bindings && (
            <div className="panel-section__content">
              <DataBindingEditor
                elementId={selectedElementId}
                elementName={selectedElementName}
                archetype={archetype}
              />
            </div>
          )}
        </div>

        {/* ====================================================================
         * SECTION 6: MOTION & ANIMATION
         * ==================================================================== */}
        <div className={`panel-section ${sectionsOpen.motion ? "panel-section--open" : ""}`}>
          <button
            type="button"
            className="panel-section__header"
            onClick={() => toggleSection("motion")}
          >
            <div className="panel-section__title-group">
              <ChevronRight size={13} className="panel-section__chevron" />
              <span>Motion & Animation</span>
            </div>
            <Sparkles size={12} style={{ color: "var(--accent-primary)" }} />
          </button>

          {sectionsOpen.motion && (
            <div className="panel-section__content">
              <AnimationEditor
                elementId={selectedElementId}
                elementName={selectedElementName}
                archetype={archetype}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
