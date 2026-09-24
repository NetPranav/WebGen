"use client";

/**
 * ============================================================================
 * TEXT ALIGN TOGGLE CONTROL
 * ============================================================================
 * Visual icon segment row for switching between left, center, right, and justify
 * text alignments with Unreal Engine 5 styling.
 * ============================================================================
 */

import React from "react";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";

export type TextAlignMode = "left" | "center" | "right" | "justify";

export interface TextAlignToggleProps {
  value: TextAlignMode;
  onChange: (val: TextAlignMode) => void;
}

const ALIGN_OPTIONS: { mode: TextAlignMode; label: string; icon: React.ReactNode }[] = [
  { mode: "left", label: "Left", icon: <AlignLeft size={13} /> },
  { mode: "center", label: "Center", icon: <AlignCenter size={13} /> },
  { mode: "right", label: "Right", icon: <AlignRight size={13} /> },
  { mode: "justify", label: "Justify", icon: <AlignJustify size={13} /> },
];

export const TextAlignToggle: React.FC<TextAlignToggleProps> = ({ value, onChange }) => {
  return (
    <div className="text-align-toggle-group" role="radiogroup" aria-label="Text Alignment">
      {ALIGN_OPTIONS.map((opt) => {
        const isActive = value === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            className={`text-align-toggle-btn ${isActive ? "text-align-toggle-btn--active" : ""}`}
            onClick={() => onChange(opt.mode)}
            title={`Align ${opt.label}`}
            aria-checked={isActive}
            role="radio"
          >
            {opt.icon}
            <span className="text-align-toggle-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
