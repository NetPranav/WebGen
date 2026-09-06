"use client";

/**
 * ============================================================================
 * EASING CURVE SELECTOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * UI Element: Visual Cubic-Bezier Easing Curve Thumbnail Selector
 * Screen / Scope: Details Panel -> Appearance -> Transition & Timing
 * Role: Visualizes animation curves (ease, ease-in, ease-out, ease-in-out, linear,
 *       cubic-bezier) as interactive SVG mini-graphs.
 * Architecture Ref: `DOCS/ROADMAP_2.md` §Phase 2.3
 * ============================================================================
 */

import React from "react";

export interface EasingCurveSelectorProps {
  easing: string;
  onChange: (easing: string) => void;
}

interface EasingPreset {
  id: string;
  name: string;
  value: string;
  path: string; // SVG path inside a 40x26 viewport
}

const EASING_PRESETS: EasingPreset[] = [
  {
    id: "ease",
    name: "Ease",
    value: "ease",
    path: "M 4 22 C 12 22, 16 4, 36 4",
  },
  {
    id: "ease-in",
    name: "Ease In",
    value: "ease-in",
    path: "M 4 22 C 20 22, 28 14, 36 4",
  },
  {
    id: "ease-out",
    name: "Ease Out",
    value: "ease-out",
    path: "M 4 22 C 12 10, 20 4, 36 4",
  },
  {
    id: "ease-in-out",
    name: "In-Out",
    value: "ease-in-out",
    path: "M 4 22 C 16 22, 24 4, 36 4",
  },
  {
    id: "linear",
    name: "Linear",
    value: "linear",
    path: "M 4 22 L 36 4",
  },
  {
    id: "material",
    name: "Decel",
    value: "cubic-bezier(0.4, 0, 0.2, 1)",
    path: "M 4 22 C 14 22, 8 4, 36 4",
  },
];

export const EasingCurveSelector: React.FC<EasingCurveSelectorProps> = ({
  easing,
  onChange,
}) => {
  return (
    <div className="easing-curve-selector">
      <div className="easing-curve-grid">
        {EASING_PRESETS.map((preset) => {
          const isSelected = easing === preset.value;
          return (
            <button
              key={preset.id}
              type="button"
              className={`easing-curve-card ${
                isSelected ? "easing-curve-card--active" : ""
              }`}
              onClick={() => onChange(preset.value)}
              title={`${preset.name} (${preset.value})`}
            >
              <svg
                width="36"
                height="22"
                viewBox="0 0 40 26"
                className="easing-curve-svg"
              >
                {/* Diagonal reference line */}
                <line
                  x1="4"
                  y1="22"
                  x2="36"
                  y2="4"
                  stroke="rgba(15, 23, 42, 0.12)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                {/* Curve path */}
                <path
                  d={preset.path}
                  fill="none"
                  stroke={isSelected ? "var(--accent-primary)" : "var(--text-secondary)"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="easing-curve-card__name">{preset.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
