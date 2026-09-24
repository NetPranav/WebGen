"use client";

/**
 * ============================================================================
 * VISUAL BOX MODEL DIAGRAM (UNREAL ENGINE & DEVTOOLS STYLE)
 * ============================================================================
 * Interactive concentric box model editor displaying:
 * - MARGIN (outer amber zone)
 * - BORDER (slate separator zone)
 * - PADDING (emerald green zone)
 * - CONTENT (blue central dimension core)
 *
 * Allows clicking on any edge (top/right/bottom/left) to edit values inline,
 * with uniform linking and clear visual feedback.
 * ============================================================================
 */

import React, { useState } from "react";
import { Link, Unlink, RotateCcw } from "lucide-react";
import { BoxEdgeValues } from "@/core/types/details";

export interface BoxModelDiagramProps {
  margin: BoxEdgeValues;
  padding: BoxEdgeValues;
  borderWidth?: number;
  contentDimensions?: {
    width: number | string;
    height: number | string;
  };
  onMarginChange: (val: BoxEdgeValues) => void;
  onPaddingChange: (val: BoxEdgeValues) => void;
}

export const BoxModelDiagram: React.FC<BoxModelDiagramProps> = ({
  margin,
  padding,
  borderWidth = 1,
  contentDimensions = { width: "auto", height: "auto" },
  onMarginChange,
  onPaddingChange,
}) => {
  const [activeEdge, setActiveEdge] = useState<string | null>(null);

  // Update margin edge with uniform support
  const handleMarginEdit = (edge: "top" | "right" | "bottom" | "left", rawVal: number) => {
    const val = isNaN(rawVal) ? 0 : Math.max(0, rawVal);
    if (margin.linked) {
      onMarginChange({
        ...margin,
        top: val,
        right: val,
        bottom: val,
        left: val,
      });
    } else {
      onMarginChange({
        ...margin,
        [edge]: val,
      });
    }
  };

  // Update padding edge with uniform support
  const handlePaddingEdit = (edge: "top" | "right" | "bottom" | "left", rawVal: number) => {
    const val = isNaN(rawVal) ? 0 : Math.max(0, rawVal);
    if (padding.linked) {
      onPaddingChange({
        ...padding,
        top: val,
        right: val,
        bottom: val,
        left: val,
      });
    } else {
      onPaddingChange({
        ...padding,
        [edge]: val,
      });
    }
  };

  return (
    <div className="box-model-container">
      {/* Box Model Header Bar */}
      <div className="box-model-header">
        <div className="box-model-legend">
          <span className="box-model-legend-dot box-model-legend-dot--margin" />
          <span className="box-model-legend-label">Margin</span>
          <span className="box-model-legend-dot box-model-legend-dot--padding" />
          <span className="box-model-legend-label">Padding</span>
          <span className="box-model-legend-dot box-model-legend-dot--content" />
          <span className="box-model-legend-label">Content</span>
        </div>

        <div className="box-model-actions">
          <button
            type="button"
            className={`box-model-link-btn ${margin.linked ? "box-model-link-btn--active" : ""}`}
            onClick={() => onMarginChange({ ...margin, linked: !margin.linked })}
            title={margin.linked ? "Margin is linked (Uniform)" : "Link Margin sides"}
          >
            {margin.linked ? <Link size={11} /> : <Unlink size={11} />}
            <span>M-Lock</span>
          </button>

          <button
            type="button"
            className={`box-model-link-btn ${padding.linked ? "box-model-link-btn--active" : ""}`}
            onClick={() => onPaddingChange({ ...padding, linked: !padding.linked })}
            title={padding.linked ? "Padding is linked (Uniform)" : "Link Padding sides"}
          >
            {padding.linked ? <Link size={11} /> : <Unlink size={11} />}
            <span>P-Lock</span>
          </button>
        </div>
      </div>

      {/* Box Model Concentric SVG/HTML Diagram */}
      <div className="box-model-diagram">
        {/* ================= MARGIN LAYER ================= */}
        <div className="box-model-zone box-model-zone--margin">
          <span className="box-model-zone-tag">MARGIN</span>

          {/* Margin Top */}
          <div className="box-model-edge box-model-edge--top">
            <input
              type="number"
              className="box-model-input"
              value={margin.top}
              onChange={(e) => handleMarginEdit("top", Number(e.target.value))}
              onFocus={() => setActiveEdge("margin-top")}
              onBlur={() => setActiveEdge(null)}
              title="Margin Top"
              min={0}
            />
          </div>

          <div className="box-model-middle-row">
            {/* Margin Left */}
            <div className="box-model-edge box-model-edge--left">
              <input
                type="number"
                className="box-model-input"
                value={margin.left}
                onChange={(e) => handleMarginEdit("left", Number(e.target.value))}
                onFocus={() => setActiveEdge("margin-left")}
                onBlur={() => setActiveEdge(null)}
                title="Margin Left"
                min={0}
              />
            </div>

            {/* ================= BORDER LAYER ================= */}
            <div className="box-model-zone box-model-zone--border">
              <span className="box-model-zone-tag box-model-zone-tag--border">
                BORDER ({borderWidth}px)
              </span>

              {/* ================= PADDING LAYER ================= */}
              <div className="box-model-zone box-model-zone--padding">
                <span className="box-model-zone-tag box-model-zone-tag--padding">PADDING</span>

                {/* Padding Top */}
                <div className="box-model-edge box-model-edge--top">
                  <input
                    type="number"
                    className="box-model-input"
                    value={padding.top}
                    onChange={(e) => handlePaddingEdit("top", Number(e.target.value))}
                    onFocus={() => setActiveEdge("padding-top")}
                    onBlur={() => setActiveEdge(null)}
                    title="Padding Top"
                    min={0}
                  />
                </div>

                <div className="box-model-middle-row">
                  {/* Padding Left */}
                  <div className="box-model-edge box-model-edge--left">
                    <input
                      type="number"
                      className="box-model-input"
                      value={padding.left}
                      onChange={(e) => handlePaddingEdit("left", Number(e.target.value))}
                      onFocus={() => setActiveEdge("padding-left")}
                      onBlur={() => setActiveEdge(null)}
                      title="Padding Left"
                      min={0}
                    />
                  </div>

                  {/* ================= CONTENT CORE ================= */}
                  <div className="box-model-zone box-model-zone--content">
                    <span className="box-model-zone-tag box-model-zone-tag--content">CONTENT</span>
                    <div className="box-model-content-dim">
                      {contentDimensions.width} × {contentDimensions.height}
                    </div>
                  </div>

                  {/* Padding Right */}
                  <div className="box-model-edge box-model-edge--right">
                    <input
                      type="number"
                      className="box-model-input"
                      value={padding.right}
                      onChange={(e) => handlePaddingEdit("right", Number(e.target.value))}
                      onFocus={() => setActiveEdge("padding-right")}
                      onBlur={() => setActiveEdge(null)}
                      title="Padding Right"
                      min={0}
                    />
                  </div>
                </div>

                {/* Padding Bottom */}
                <div className="box-model-edge box-model-edge--bottom">
                  <input
                    type="number"
                    className="box-model-input"
                    value={padding.bottom}
                    onChange={(e) => handlePaddingEdit("bottom", Number(e.target.value))}
                    onFocus={() => setActiveEdge("padding-bottom")}
                    onBlur={() => setActiveEdge(null)}
                    title="Padding Bottom"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Margin Right */}
            <div className="box-model-edge box-model-edge--right">
              <input
                type="number"
                className="box-model-input"
                value={margin.right}
                onChange={(e) => handleMarginEdit("right", Number(e.target.value))}
                onFocus={() => setActiveEdge("margin-right")}
                onBlur={() => setActiveEdge(null)}
                title="Margin Right"
                min={0}
              />
            </div>
          </div>

          {/* Margin Bottom */}
          <div className="box-model-edge box-model-edge--bottom">
            <input
              type="number"
              className="box-model-input"
              value={margin.bottom}
              onChange={(e) => handleMarginEdit("bottom", Number(e.target.value))}
              onFocus={() => setActiveEdge("margin-bottom")}
              onBlur={() => setActiveEdge(null)}
              title="Margin Bottom"
              min={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
