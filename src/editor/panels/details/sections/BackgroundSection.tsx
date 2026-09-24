/**
 * ============================================================================
 * BACKGROUND LAYER DETAIL INSPECTOR SECTION
 * ============================================================================
 * UI Element: Details Inspector — Background Section
 * Screen / Scope: Screen 03: Properties & Details Inspector (`/editor`)
 * Role: Contextual inspector section for Background Layer archetype elements.
 *       Configures Type, Gradient stops, Angle, Parallax speed, and Noise grain.
 * Styling Source: "@/editor/styles/panels.css" & "@/editor/styles/forms.css"
 * Matches: PANELS.md (Panel 03: Background Section) & CONVENTIONS.md §4.4
 * ============================================================================
 */

import React from "react";
import { Sparkles, Layers } from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";

export interface BackgroundSectionProps {
  elementId: string;
  elementName: string;
}

// TODO(MDM-P2): typed view over the untyped `ProjectElement.properties` bag;
// MDM v2 gives each archetype a real props schema.
interface BackgroundProps {
  type?: string;
  color?: string;
  gradientAngle?: number;
  parallaxSpeed?: number;
  blendMode?: string;
  noiseOpacity?: number;
}

export const BackgroundSection: React.FC<BackgroundSectionProps> = ({
  elementId,
  elementName,
}) => {
  const { elements, setElementProperty } = useProjectStore();
  const currentElement = elements[elementId];
  const props = (currentElement?.properties || {}) as BackgroundProps;

  const updateProp = (key: string, val: unknown) => {
    setElementProperty(elementId, key, val, `Update background ${key}`);
  };

  const bgType = props.type || "gradient";
  const color = props.color || "#0f172a";
  const gradientAngle = props.gradientAngle ?? 135;
  const parallaxSpeed = props.parallaxSpeed ?? 0.2;
  const blendMode = props.blendMode || "normal";
  const noiseOpacity = props.noiseOpacity ?? 0.05;

  return (
    <div className="element-specific-editor background-section" data-testid="background-section">
      <div className="form-group-row">
        <label className="form-label">Background Type</label>
        <select
          className="form-select"
          value={bgType}
          onChange={(e) => updateProp("type", e.target.value)}
        >
          <option value="solid">Solid Color</option>
          <option value="gradient">Linear Gradient</option>
          <option value="radial">Radial Gradient</option>
          <option value="noise">Ambient Noise Grain</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Base Color</label>
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

      <div className="form-group">
        <div className="form-label">
          <span>Gradient Angle</span>
          <span className="form-label__hint">{gradientAngle}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="5"
          className="form-slider"
          value={gradientAngle}
          onChange={(e) => updateProp("gradientAngle", Number(e.target.value))}
        />
      </div>

      <div className="form-group">
        <div className="form-label">
          <span>Scroll Parallax Speed</span>
          <span className="form-label__hint">{parallaxSpeed}x</span>
        </div>
        <input
          type="range"
          min="-1"
          max="2"
          step="0.1"
          className="form-slider"
          value={parallaxSpeed}
          onChange={(e) => updateProp("parallaxSpeed", Number(e.target.value))}
        />
      </div>

      <div className="form-group-row">
        <label className="form-label">Blend Mode</label>
        <select
          className="form-select"
          value={blendMode}
          onChange={(e) => updateProp("blendMode", e.target.value)}
        >
          <option value="normal">normal</option>
          <option value="multiply">multiply</option>
          <option value="screen">screen</option>
          <option value="overlay">overlay</option>
          <option value="difference">difference</option>
        </select>
      </div>

      <div className="form-group">
        <div className="form-label">
          <span>Noise Grain Opacity</span>
          <span className="form-label__hint">{Math.round(noiseOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="0.5"
          step="0.01"
          className="form-slider"
          value={noiseOpacity}
          onChange={(e) => updateProp("noiseOpacity", Number(e.target.value))}
        />
      </div>
    </div>
  );
};
