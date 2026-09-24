/**
 * ============================================================================
 * DIVIDER PROPERTIES & DETAIL INSPECTOR SECTION
 * ============================================================================
 * UI Element: Details Inspector — Divider Section
 * Screen / Scope: Screen 03: Properties & Details Inspector (`/editor`)
 * Role: Contextual inspector section for Divider archetype elements.
 *       Configures Orientation, Length (draw-in), Thickness, Style, and Colors.
 * Styling Source: "@/editor/styles/panels.css" & "@/editor/styles/forms.css"
 * Matches: PANELS.md (Panel 03: Divider Section) & CONVENTIONS.md §4.4
 * ============================================================================
 */

import React from "react";
import { Minus, ChevronRight } from "lucide-react";
import { documentCommands, useLayers } from "@/core/store/useDocumentStore";
import type { PropValue } from "@/core/document/registry";
import { readProps } from "@/core/document/props";

export interface DividerSectionProps {
  elementId: string;
  elementName: string;
}

export const DividerSection: React.FC<DividerSectionProps> = ({
  elementId,
  elementName,
}) => {
  const elements = useLayers();
  const currentElement = elements[elementId];
  const props = readProps(currentElement, "divider");

  const updateProp = (key: string, val: PropValue) => {
    documentCommands.updateProps(elementId, { [key]: val }, `Update divider ${key}`);
  };

  const orientation = props.orientation || "horizontal";
  const length = props.length ?? 100;
  const thickness = props.thickness ?? 1;
  const style = props.style || "solid";
  const color = props.color || "#e2e8f0";
  const capStyle = props.capStyle || "round";

  return (
    <div className="element-specific-editor divider-section" data-testid="divider-section">
      <div className="form-group-row">
        <label className="form-label">Orientation</label>
        <div className="form-mode-switch">
          <button
            type="button"
            className={`form-mode-btn ${orientation === "horizontal" ? "form-mode-btn--active" : ""}`}
            onClick={() => updateProp("orientation", "horizontal")}
          >
            Horizontal
          </button>
          <button
            type="button"
            className={`form-mode-btn ${orientation === "vertical" ? "form-mode-btn--active" : ""}`}
            onClick={() => updateProp("orientation", "vertical")}
          >
            Vertical
          </button>
        </div>
      </div>

      <div className="form-group">
        <div className="form-label">
          <span>Length (Draw-in)</span>
          <span className="form-label__hint">{length}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          className="form-slider"
          value={length}
          onChange={(e) => updateProp("length", Number(e.target.value))}
        />
      </div>

      <div className="form-row--2col">
        <div className="form-group">
          <label className="form-label">Thickness</label>
          <div className="form-number-scrub">
            <span className="form-number-scrub__badge form-number-scrub__badge--neutral">px</span>
            <input
              type="number"
              min="1"
              max="40"
              className="form-number-scrub__input"
              value={thickness}
              onChange={(e) => updateProp("thickness", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Style</label>
          <select
            className="form-select"
            value={style}
            onChange={(e) => updateProp("style", e.target.value)}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
            <option value="gradient">Gradient</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Stroke Color</label>
        <div className="form-row">
          <div className="form-color-picker">
            <div className="form-color-picker__swatch" style={{ backgroundColor: color }} />
            <span className="form-color-picker__label">{color}</span>
          </div>
          <input
            type="text"
            className="form-input"
            value={color}
            onChange={(e) => updateProp("color", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
