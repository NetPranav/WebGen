/**
 * ============================================================================
 * SVG VECTOR & ICON DETAIL INSPECTOR SECTION
 * ============================================================================
 * UI Element: Details Inspector — SVG Vector Section
 * Screen / Scope: Screen 03: Properties & Details Inspector (`/editor`)
 * Role: Contextual inspector section for Icon archetype elements.
 *       Configures Stroke, Fill, Stroke Width, Dasharray, and Dashoffset.
 * Styling Source: "@/editor/styles/panels.css" & "@/editor/styles/forms.css"
 * Matches: PANELS.md (Panel 03: SVG Vector Section) & CONVENTIONS.md §4.3
 * ============================================================================
 */

import React from "react";
import { Feather } from "lucide-react";
import { documentCommands, useLayers } from "@/core/store/useDocumentStore";
import type { PropValue } from "@/core/document/registry";
import { readProps } from "@/core/document/props";
import type { PropertyPath } from "@/core/document/properties";

export interface SvgVectorSectionProps {
  elementId: string;
  elementName: string;
}

export const SvgVectorSection: React.FC<SvgVectorSectionProps> = ({
  elementId,
  elementName,
}) => {
  const elements = useLayers();
  const currentElement = elements[elementId];
  const props = readProps(currentElement, "icon");

  const updateProp = (key: PropertyPath, val: PropValue) => {
    documentCommands.updateProps(elementId, { [key]: val }, `Update svg ${key}`);
  };

  const stroke = props.stroke || "currentColor";
  const strokeWidth = props.strokeWidth ?? 2;
  const fill = props.fill || "none";
  const strokeDashoffset = props.strokeDashoffset ?? 0;
  const path = props.path || "M12 2L2 7l10 5 10-5-10-5z";

  return (
    <div className="element-specific-editor svg-vector-section" data-testid="svg-vector-section">
      <div className="form-group">
        <label className="form-label">Stroke Color</label>
        <div className="form-row">
          <div className="form-color-picker">
            <div className="form-color-picker__swatch" style={{ backgroundColor: stroke }} />
            <span className="form-color-picker__label">{stroke}</span>
          </div>
          <input
            type="text"
            className="form-input"
            value={stroke}
            onChange={(e) => updateProp("svg.stroke", e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <div className="form-label">
          <span>Stroke Width</span>
          <span className="form-label__hint">{strokeWidth}px</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="12"
          step="0.5"
          className="form-slider"
          value={strokeWidth}
          onChange={(e) => updateProp("svg.strokeWidth", Number(e.target.value))}
        />
      </div>

      <div className="form-group">
        <div className="form-label">
          <span>Stroke Dashoffset (Draw-in)</span>
          <span className="form-label__hint">{strokeDashoffset}</span>
        </div>
        <input
          type="range"
          min="0"
          max="500"
          step="5"
          className="form-slider"
          value={strokeDashoffset}
          onChange={(e) => updateProp("svg.strokeDashoffset", Number(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Fill Color</label>
        <div className="form-row">
          <div className="form-color-picker">
            <div className="form-color-picker__swatch" style={{ backgroundColor: fill === "none" ? "transparent" : fill }} />
            <span className="form-color-picker__label">{fill}</span>
          </div>
          <input
            type="text"
            className="form-input"
            value={fill}
            onChange={(e) => updateProp("svg.fill", e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="svg-path-input">Vector Path Data (d)</label>
        <textarea
          id="svg-path-input"
          className="form-input form-input--code"
          rows={2}
          value={path}
          onChange={(e) => updateProp("svg.path", e.target.value)}
        />
      </div>
    </div>
  );
};
