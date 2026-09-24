"use client";

/**
 * ============================================================================
 * HORIZONTAL SCRUB NUMBER INPUT (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * Visual number input supporting:
 * - Horizontal drag scrubbing (click + drag horizontally to increment/decrement)
 * - Shift (10x) and Alt (0.1x) modifier keys for scrub sensitivity
 * - Double-click for direct keyboard numeric typing
 * - Stepper buttons (+/-) on right edge
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import { Plus, Minus, MoveHorizontal } from "lucide-react";

export interface ScrubNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const ScrubNumberInput: React.FC<ScrubNumberInputProps> = ({
  value,
  onChange,
  step = 1,
  min,
  max,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  const startXRef = useRef(0);
  const startValRef = useRef(value);

  // Sync internal edit value when external value changes
  const syncKey = `${value}|${isEditing}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (!isEditing) {
      setEditValue(String(value));
    }
  }

  const clampValue = (val: number): number => {
    let result = val;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return Math.round(result * 1000) / 1000;
  };

  // Mouse drag scrubbing handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isEditing || e.button !== 0) return;

    // Check if clicking stepper buttons
    const target = e.target as HTMLElement;
    if (target.closest(".scrub-step-btn")) return;

    startXRef.current = e.clientX;
    startValRef.current = Number(value) || 0;
    setIsScrubbing(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      let multiplier = 1;
      if (moveEvent.shiftKey) multiplier = 10;
      if (moveEvent.altKey) multiplier = 0.1;

      const deltaVal = deltaX * step * multiplier * 0.2;
      const newVal = clampValue(startValRef.current + deltaVal);
      onChange(newVal);
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDoubleClick = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(String(value));
  };

  const handleEditSubmit = () => {
    setIsEditing(false);
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      onChange(clampValue(parsed));
    } else {
      setEditValue(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEditSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(String(value));
    }
  };

  const handleStep = (delta: number) => {
    if (disabled) return;
    onChange(clampValue((Number(value) || 0) + delta * step));
  };

  return (
    <div
      className={`scrub-number-input ${isScrubbing ? "scrub-number-input--scrubbing" : ""} ${
        isEditing ? "scrub-number-input--editing" : ""
      } ${disabled ? "scrub-number-input--disabled" : ""}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title="Click & drag horizontally to scrub value. Double-click to type directly."
    >
      <div className="scrub-drag-icon">
        <MoveHorizontal size={10} />
      </div>

      {isEditing ? (
        <input
          type="number"
          className="scrub-direct-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditSubmit}
          onKeyDown={handleKeyDown}
          autoFocus
          step={step}
          min={min}
          max={max}
        />
      ) : (
        <span className="scrub-display-val">{value}</span>
      )}

      {/* Inline Steppers */}
      <div className="scrub-steppers">
        <button
          type="button"
          className="scrub-step-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleStep(-1);
          }}
          title={`Decrease by ${step}`}
          disabled={disabled}
        >
          <Minus size={9} />
        </button>
        <button
          type="button"
          className="scrub-step-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleStep(1);
          }}
          title={`Increase by ${step}`}
          disabled={disabled}
        >
          <Plus size={9} />
        </button>
      </div>
    </div>
  );
};
