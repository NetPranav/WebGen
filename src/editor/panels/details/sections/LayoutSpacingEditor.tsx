"use client";

/**
 * ============================================================================
 * DEEP LAYOUT & SPACING EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * UI Element: Complete Web Layout, Box Model & Spacing Inspector Sub-Panel
 * Screen / Scope: Details Panel -> Category: Layout & Spacing
 * Role: Provides visual Box Model Diagram (Margin, Border, Padding, Content),
 *       Dimensions/Sizing, Positioning, Flexbox & Grid, and Cursor/Interactions.
 * Architecture Ref: `DOCS/ROADMAP_2.md` §Phase 2.4
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Layout,
  Maximize2,
  Box,
  Move,
  MousePointer,
  ChevronRight,
  RotateCcw,
  Sliders,
  Grid,
  Sparkles,
} from "lucide-react";
import { AssetLayoutSchema, BoxEdgeValues } from "@/core/types/details";
import { BoxModelDiagram } from "../controls/BoxModelDiagram";

export interface LayoutSpacingEditorProps {
  layout: AssetLayoutSchema;
  borderWidth?: number;
  onChange: React.Dispatch<React.SetStateAction<AssetLayoutSchema>>;
  onResetToDefault?: () => void;
}

const DEFAULT_MARGIN: BoxEdgeValues = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  linked: true,
  unit: "px",
};

const DEFAULT_PADDING: BoxEdgeValues = {
  top: 8,
  right: 16,
  bottom: 8,
  left: 16,
  linked: false,
  unit: "px",
};

export const LayoutSpacingEditor: React.FC<LayoutSpacingEditorProps> = ({
  layout,
  borderWidth = 1,
  onChange,
  onResetToDefault,
}) => {
  // Collapsible sub-sections
  const [openSubgroups, setOpenSubgroups] = useState({
    boxModel: true,
    dimensions: true,
    positioning: true,
    flexGrid: true,
    interaction: false,
  });

  const toggleSubgroup = (key: keyof typeof openSubgroups) => {
    setOpenSubgroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProp = <K extends keyof AssetLayoutSchema>(key: K, val: AssetLayoutSchema[K]) => {
    onChange((prev) => ({ ...prev, [key]: val }));
  };

  const currentMargin = layout.margin || DEFAULT_MARGIN;
  const currentPadding = layout.padding || DEFAULTPaddingSafe();

  function DEFAULTPaddingSafe(): BoxEdgeValues {
    return DEFAULT_PADDING;
  }

  const isFlex = layout.display === "flex" || layout.display === "inline-flex";
  const isGrid = layout.display === "grid";
  const isPositioned = layout.position && layout.position !== "static";

  return (
    <div className="layout-spacing-editor">
      {/* Top Header Toolbar */}
      {onResetToDefault && (
        <div className="appearance-subgroup-toolbar">
          <span className="appearance-subgroup-desc">Geometry & Box Model Engine</span>
          <button
            type="button"
            className="appearance-reset-btn"
            onClick={onResetToDefault}
            title="Reset Layout to Engine Defaults"
          >
            <RotateCcw size={11} />
            <span>Reset Layout</span>
          </button>
        </div>
      )}

      {/* ====================================================================
       * SUBGROUP 1: VISUAL BOX MODEL DIAGRAM
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("boxModel")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.boxModel ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Box size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Box Model (Margin & Padding)</span>
        </button>

        {openSubgroups.boxModel && (
          <div className="appearance-subgroup__content" style={{ padding: "8px 10px 14px" }}>
            <BoxModelDiagram
              margin={currentMargin}
              padding={currentPadding}
              borderWidth={borderWidth}
              contentDimensions={{
                width: layout.widthUnit === "auto" ? "auto" : `${layout.width}${layout.widthUnit}`,
                height: layout.heightUnit === "auto" ? "auto" : `${layout.height}${layout.heightUnit}`,
              }}
              onMarginChange={(newMargin) => updateProp("margin", newMargin)}
              onPaddingChange={(newPadding) => updateProp("padding", newPadding)}
            />
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 2: DIMENSIONS & SIZING
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("dimensions")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.dimensions ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Maximize2 size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Dimensions & Sizing</span>
        </button>

        {openSubgroups.dimensions && (
          <div className="appearance-subgroup__content">
            {/* Width */}
            <div className="form-group-row">
              <label className="form-label">Width</label>
              <div className="input-with-unit-group">
                <input
                  type={layout.widthUnit === "auto" || layout.widthUnit === "fit-content" ? "text" : "number"}
                  className="form-input form-input--number"
                  value={layout.width}
                  disabled={layout.widthUnit === "auto" || layout.widthUnit === "fit-content"}
                  onChange={(e) =>
                    updateProp("width", e.target.type === "number" ? Number(e.target.value) : e.target.value)
                  }
                  placeholder={layout.widthUnit}
                />
                <select
                  className="form-select form-select--unit"
                  value={layout.widthUnit || "px"}
                  onChange={(e) => {
                    const unit = e.target.value as AssetLayoutSchema["widthUnit"];
                    updateProp("widthUnit", unit);
                    if (unit === "auto" || unit === "fit-content") {
                      updateProp("width", unit);
                    } else if (typeof layout.width === "string") {
                      updateProp("width", 100);
                    }
                  }}
                >
                  <option value="px">px</option>
                  <option value="%">%</option>
                  <option value="rem">rem</option>
                  <option value="vw">vw</option>
                  <option value="auto">auto</option>
                  <option value="fit-content">fit</option>
                </select>
              </div>
            </div>

            {/* Height */}
            <div className="form-group-row">
              <label className="form-label">Height</label>
              <div className="input-with-unit-group">
                <input
                  type={layout.heightUnit === "auto" || layout.heightUnit === "fit-content" ? "text" : "number"}
                  className="form-input form-input--number"
                  value={layout.height}
                  disabled={layout.heightUnit === "auto" || layout.heightUnit === "fit-content"}
                  onChange={(e) =>
                    updateProp("height", e.target.type === "number" ? Number(e.target.value) : e.target.value)
                  }
                  placeholder={layout.heightUnit}
                />
                <select
                  className="form-select form-select--unit"
                  value={layout.heightUnit || "px"}
                  onChange={(e) => {
                    const unit = e.target.value as AssetLayoutSchema["heightUnit"];
                    updateProp("heightUnit", unit);
                    if (unit === "auto" || unit === "fit-content") {
                      updateProp("height", unit);
                    } else if (typeof layout.height === "string") {
                      updateProp("height", 40);
                    }
                  }}
                >
                  <option value="px">px</option>
                  <option value="%">%</option>
                  <option value="rem">rem</option>
                  <option value="vh">vh</option>
                  <option value="auto">auto</option>
                  <option value="fit-content">fit</option>
                </select>
              </div>
            </div>

            {/* Min / Max Width */}
            <div className="form-grid-2" style={{ marginTop: 4 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 10 }}>Min Width</label>
                <input
                  type="text"
                  className="form-input"
                  value={layout.minWidth ?? ""}
                  onChange={(e) => updateProp("minWidth", e.target.value)}
                  placeholder="auto"
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 10 }}>Max Width</label>
                <input
                  type="text"
                  className="form-input"
                  value={layout.maxWidth ?? ""}
                  onChange={(e) => updateProp("maxWidth", e.target.value)}
                  placeholder="none"
                />
              </div>
            </div>

            {/* Min / Max Height */}
            <div className="form-grid-2" style={{ marginTop: 4 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 10 }}>Min Height</label>
                <input
                  type="text"
                  className="form-input"
                  value={layout.minHeight ?? ""}
                  onChange={(e) => updateProp("minHeight", e.target.value)}
                  placeholder="auto"
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 10 }}>Max Height</label>
                <input
                  type="text"
                  className="form-input"
                  value={layout.maxHeight ?? ""}
                  onChange={(e) => updateProp("maxHeight", e.target.value)}
                  placeholder="none"
                />
              </div>
            </div>

            {/* Box Sizing */}
            <div className="form-group-row">
              <label className="form-label">Box Sizing</label>
              <div className="form-mode-switch">
                <button
                  type="button"
                  className={`form-mode-btn ${
                    (layout.boxSizing || "border-box") === "border-box" ? "form-mode-btn--active" : ""
                  }`}
                  onClick={() => updateProp("boxSizing", "border-box")}
                >
                  border-box
                </button>
                <button
                  type="button"
                  className={`form-mode-btn ${
                    layout.boxSizing === "content-box" ? "form-mode-btn--active" : ""
                  }`}
                  onClick={() => updateProp("boxSizing", "content-box")}
                >
                  content-box
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 3: DISPLAY & POSITIONING
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("positioning")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.positioning ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Layout size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Display & Positioning</span>
        </button>

        {openSubgroups.positioning && (
          <div className="appearance-subgroup__content">
            {/* Display */}
            <div className="form-group-row">
              <label className="form-label">Display</label>
              <select
                className="form-select"
                value={layout.display || "block"}
                onChange={(e) => updateProp("display", e.target.value as AssetLayoutSchema["display"])}
              >
                <option value="flex">flex (Flexible Container)</option>
                <option value="inline-flex">inline-flex</option>
                <option value="grid">grid (CSS Grid Matrix)</option>
                <option value="block">block (Standard Block)</option>
                <option value="inline-block">inline-block</option>
                <option value="inline">inline</option>
                <option value="none">none (Hidden from DOM)</option>
              </select>
            </div>

            {/* Position */}
            <div className="form-group-row">
              <label className="form-label">Position</label>
              <select
                className="form-select"
                value={layout.position || "static"}
                onChange={(e) => updateProp("position", e.target.value as AssetLayoutSchema["position"])}
              >
                <option value="static">static (Standard Flow)</option>
                <option value="relative">relative (Relative Offset)</option>
                <option value="absolute">absolute (Pinned to Parent)</option>
                <option value="fixed">fixed (Pinned to Viewport)</option>
                <option value="sticky">sticky (Scroll Sticky)</option>
              </select>
            </div>

            {/* Offset Insets (when position != static) */}
            {isPositioned && (
              <div className="form-group">
                <div className="form-group-row-header">
                  <label className="form-label">Position Insets (px)</label>
                </div>
                <div className="quad-inputs-row">
                  <div className="quad-input-col">
                    <span className="quad-input-label">Top</span>
                    <input
                      type="number"
                      className="form-input form-input--number"
                      value={layout.top ?? 0}
                      onChange={(e) => updateProp("top", Number(e.target.value))}
                    />
                  </div>
                  <div className="quad-input-col">
                    <span className="quad-input-label">Right</span>
                    <input
                      type="number"
                      className="form-input form-input--number"
                      value={layout.right ?? 0}
                      onChange={(e) => updateProp("right", Number(e.target.value))}
                    />
                  </div>
                  <div className="quad-input-col">
                    <span className="quad-input-label">Bottom</span>
                    <input
                      type="number"
                      className="form-input form-input--number"
                      value={layout.bottom ?? 0}
                      onChange={(e) => updateProp("bottom", Number(e.target.value))}
                    />
                  </div>
                  <div className="quad-input-col">
                    <span className="quad-input-label">Left</span>
                    <input
                      type="number"
                      className="form-input form-input--number"
                      value={layout.left ?? 0}
                      onChange={(e) => updateProp("left", Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Z-Index */}
            <div className="form-group-row">
              <label className="form-label">Z-Index</label>
              <input
                type="number"
                className="form-input form-input--number"
                value={layout.zIndex ?? 1}
                onChange={(e) => updateProp("zIndex", Number(e.target.value))}
                style={{ width: 85 }}
              />
            </div>

            {/* Overflow X and Y */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 10 }}>Overflow X</label>
                <select
                  className="form-select"
                  value={layout.overflowX || "visible"}
                  onChange={(e) => updateProp("overflowX", e.target.value as AssetLayoutSchema["overflowX"])}
                >
                  <option value="visible">visible</option>
                  <option value="hidden">hidden</option>
                  <option value="scroll">scroll</option>
                  <option value="auto">auto</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 10 }}>Overflow Y</label>
                <select
                  className="form-select"
                  value={layout.overflowY || "visible"}
                  onChange={(e) => updateProp("overflowY", e.target.value as AssetLayoutSchema["overflowY"])}
                >
                  <option value="visible">visible</option>
                  <option value="hidden">hidden</option>
                  <option value="scroll">scroll</option>
                  <option value="auto">auto</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 4: FLEXBOX & GRID ADVANCED LAYOUT
       * ==================================================================== */}
      {(isFlex || isGrid) && (
        <div className="appearance-subgroup">
          <button
            type="button"
            className="appearance-subgroup__header"
            onClick={() => toggleSubgroup("flexGrid")}
          >
            <ChevronRight
              size={12}
              className={`appearance-subgroup__chevron ${
                openSubgroups.flexGrid ? "appearance-subgroup__chevron--open" : ""
              }`}
            />
            {isFlex ? <Move size={12} className="appearance-subgroup__icon" /> : <Grid size={12} className="appearance-subgroup__icon" />}
            <span className="appearance-subgroup__title">
              {isFlex ? "Flexbox Layout & Alignment" : "CSS Grid Matrix"}
            </span>
          </button>

          {openSubgroups.flexGrid && (
            <div className="appearance-subgroup__content">
              {/* FLEXBOX CONTROLS */}
              {isFlex && (
                <>
                  {/* Direction */}
                  <div className="form-group-row">
                    <label className="form-label">Direction</label>
                    <select
                      className="form-select"
                      value={layout.flexDirection || "row"}
                      onChange={(e) =>
                        updateProp("flexDirection", e.target.value as AssetLayoutSchema["flexDirection"])
                      }
                    >
                      <option value="row">Row (Horizontal →)</option>
                      <option value="column">Column (Vertical ↓)</option>
                      <option value="row-reverse">Row Reverse (←)</option>
                      <option value="column-reverse">Column Reverse (↑)</option>
                    </select>
                  </div>

                  {/* Wrap */}
                  <div className="form-group-row">
                    <label className="form-label">Flex Wrap</label>
                    <select
                      className="form-select"
                      value={layout.flexWrap || "nowrap"}
                      onChange={(e) => updateProp("flexWrap", e.target.value as AssetLayoutSchema["flexWrap"])}
                    >
                      <option value="nowrap">No Wrap (Single Line)</option>
                      <option value="wrap">Wrap (Multi-Line)</option>
                      <option value="wrap-reverse">Wrap Reverse</option>
                    </select>
                  </div>

                  {/* Justify Content */}
                  <div className="form-group-row">
                    <label className="form-label">Justify Content</label>
                    <select
                      className="form-select"
                      value={layout.justifyContent || "flex-start"}
                      onChange={(e) =>
                        updateProp("justifyContent", e.target.value as AssetLayoutSchema["justifyContent"])
                      }
                    >
                      <option value="flex-start">Start</option>
                      <option value="center">Center</option>
                      <option value="flex-end">End</option>
                      <option value="space-between">Space Between</option>
                      <option value="space-around">Space Around</option>
                      <option value="space-evenly">Space Evenly</option>
                    </select>
                  </div>

                  {/* Align Items */}
                  <div className="form-group-row">
                    <label className="form-label">Align Items</label>
                    <select
                      className="form-select"
                      value={layout.alignItems || "stretch"}
                      onChange={(e) =>
                        updateProp("alignItems", e.target.value as AssetLayoutSchema["alignItems"])
                      }
                    >
                      <option value="stretch">Stretch</option>
                      <option value="flex-start">Start</option>
                      <option value="center">Center</option>
                      <option value="flex-end">End</option>
                      <option value="baseline">Baseline</option>
                    </select>
                  </div>

                  {/* Gap */}
                  <div className="form-group-row">
                    <label className="form-label">Gap</label>
                    <div className="input-with-unit-group">
                      <input
                        type="number"
                        className="form-input form-input--number"
                        value={layout.gap ?? 0}
                        onChange={(e) => updateProp("gap", Number(e.target.value))}
                        min={0}
                      />
                      <select
                        className="form-select form-select--unit"
                        value={layout.gapUnit || "px"}
                        onChange={(e) => updateProp("gapUnit", e.target.value as "px" | "rem")}
                      >
                        <option value="px">px</option>
                        <option value="rem">rem</option>
                      </select>
                    </div>
                  </div>

                  {/* Child item props */}
                  <div className="form-grid-2" style={{ marginTop: 4 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 10 }}>Flex Grow</label>
                      <input
                        type="number"
                        className="form-input form-input--number"
                        value={layout.flexGrow ?? 0}
                        onChange={(e) => updateProp("flexGrow", Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 10 }}>Flex Shrink</label>
                      <input
                        type="number"
                        className="form-input form-input--number"
                        value={layout.flexShrink ?? 0}
                        onChange={(e) => updateProp("flexShrink", Number(e.target.value))}
                        min={0}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* GRID CONTROLS */}
              {isGrid && (
                <>
                  <div className="form-group">
                    <label className="form-label">Template Columns</label>
                    <input
                      type="text"
                      className="form-input form-input--code"
                      value={layout.gridTemplateColumns || "repeat(auto-fit, minmax(200px, 1fr))"}
                      onChange={(e) => updateProp("gridTemplateColumns", e.target.value)}
                      placeholder="e.g. 1fr 1fr or 200px 1fr"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Template Rows</label>
                    <input
                      type="text"
                      className="form-input form-input--code"
                      value={layout.gridTemplateRows || "auto"}
                      onChange={(e) => updateProp("gridTemplateRows", e.target.value)}
                      placeholder="e.g. auto 1fr auto"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 10 }}>Column Gap (px)</label>
                      <input
                        type="number"
                        className="form-input form-input--number"
                        value={layout.columnGap ?? 16}
                        onChange={(e) => updateProp("columnGap", Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 10 }}>Row Gap (px)</label>
                      <input
                        type="number"
                        className="form-input form-input--number"
                        value={layout.rowGap ?? 16}
                        onChange={(e) => updateProp("rowGap", Number(e.target.value))}
                        min={0}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
       * SUBGROUP 5: CURSOR & INTERACTION
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("interaction")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.interaction ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <MousePointer size={12} className="appearance-subgroup__icon" />
          <span className="appearance-subgroup__title">Cursor & Interaction</span>
        </button>

        {openSubgroups.interaction && (
          <div className="appearance-subgroup__content">
            {/* Cursor */}
            <div className="form-group-row">
              <label className="form-label">Cursor</label>
              <select
                className="form-select"
                value={layout.cursor || "default"}
                onChange={(e) => updateProp("cursor", e.target.value as AssetLayoutSchema["cursor"])}
                style={{ cursor: layout.cursor || "default" }}
              >
                <option value="default">default (Arrow)</option>
                <option value="pointer">pointer (Hand / Link)</option>
                <option value="grab">grab (Open Hand)</option>
                <option value="grabbing">grabbing (Closed Hand)</option>
                <option value="text">text (I-Beam)</option>
                <option value="move">move (4-Way Arrow)</option>
                <option value="crosshair">crosshair (+)</option>
                <option value="not-allowed">not-allowed (Prohibited 🚫)</option>
                <option value="zoom-in">zoom-in (Magnifier +)</option>
              </select>
            </div>

            {/* Pointer Events */}
            <div className="form-group-row">
              <label className="form-label">Pointer Events</label>
              <div className="form-mode-switch">
                <button
                  type="button"
                  className={`form-mode-btn ${
                    (layout.pointerEvents || "auto") === "auto" ? "form-mode-btn--active" : ""
                  }`}
                  onClick={() => updateProp("pointerEvents", "auto")}
                >
                  auto (Interactive)
                </button>
                <button
                  type="button"
                  className={`form-mode-btn ${
                    layout.pointerEvents === "none" ? "form-mode-btn--active" : ""
                  }`}
                  onClick={() => updateProp("pointerEvents", "none")}
                >
                  none (Click-Through)
                </button>
              </div>
            </div>

            {/* User Select */}
            <div className="form-group-row">
              <label className="form-label">User Select</label>
              <div className="form-mode-switch">
                {(["auto", "none", "text", "all"] as const).map((s) => {
                  const isActive = (layout.userSelect || "auto") === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`form-mode-btn ${isActive ? "form-mode-btn--active" : ""}`}
                      onClick={() => updateProp("userSelect", s)}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
