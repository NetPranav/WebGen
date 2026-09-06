"use client";

/**
 * ============================================================================
 * TRANSFORM ORIGIN 9-POINT GRID PICKER (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * UI Element: 3x3 Anchor Matrix Origin Selector
 * Screen / Scope: Details Panel -> Appearance -> Transform
 * Role: Provides an intuitive 9-point visual anchor grid for setting
 *       CSS transform-origin (rotational and scale pivot point).
 * Architecture Ref: `DOCS/ROADMAP_2.md` §Phase 2.3
 * ============================================================================
 */

import React from "react";
import { TransformConfig } from "@/core/types/details";

export interface TransformOriginPickerProps {
  origin: TransformConfig["origin"];
  onChange: (origin: TransformConfig["origin"]) => void;
}

const MATRIX: Array<Array<{ key: TransformConfig["origin"]; label: string }>> = [
  [
    { key: "top-left", label: "Top Left (0% 0%)" },
    { key: "top", label: "Top Center (50% 0%)" },
    { key: "top-right", label: "Top Right (100% 0%)" },
  ],
  [
    { key: "left", label: "Center Left (0% 50%)" },
    { key: "center", label: "Center (50% 50%)" },
    { key: "right", label: "Center Right (100% 50%)" },
  ],
  [
    { key: "bottom-left", label: "Bottom Left (0% 100%)" },
    { key: "bottom", label: "Bottom Center (50% 100%)" },
    { key: "bottom-right", label: "Bottom Right (100% 100%)" },
  ],
];

export const TransformOriginPicker: React.FC<TransformOriginPickerProps> = ({
  origin,
  onChange,
}) => {
  return (
    <div className="transform-origin-picker">
      <div className="transform-origin-grid">
        {MATRIX.map((row, rIdx) => (
          <div key={rIdx} className="transform-origin-grid__row">
            {row.map((cell) => {
              const isSelected = origin === cell.key;
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={`transform-origin-dot ${
                    isSelected ? "transform-origin-dot--active" : ""
                  }`}
                  onClick={() => onChange(cell.key)}
                  title={`Pivot: ${cell.label}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <span className="transform-origin-label">
        {origin.replace("-", " ").toUpperCase()}
      </span>
    </div>
  );
};
