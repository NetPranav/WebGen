"use client";

/**
 * ============================================================================
 * GRADIENT EDITOR CONTROL (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * UI Element: Interactive Color Stop & Angle Gradient Editor
 * Screen / Scope: Details Panel -> Appearance -> Background -> Gradient
 * Role: Provides a visual gradient bar with draggable color stops,
 *       type selector (linear/radial/conic), angle dial, and stop management.
 * Architecture Ref: `DOCS/ROADMAP_2.md` §Phase 2.3
 * ============================================================================
 */

import React, { useState, useRef } from "react";
import { Plus, Trash2, RotateCw } from "lucide-react";
import { GradientConfig, GradientStop } from "@/core/types/details";

export interface GradientEditorProps {
  gradient: GradientConfig;
  onChange: (gradient: GradientConfig) => void;
}

export const GradientEditor: React.FC<GradientEditorProps> = ({
  gradient,
  onChange,
}) => {
  const [selectedStopId, setSelectedStopId] = useState<string>(
    gradient.stops[0]?.id || ""
  );
  const barRef = useRef<HTMLDivElement>(null);

  const selectedStop =
    gradient.stops.find((s) => s.id === selectedStopId) || gradient.stops[0];

  // Helper to generate CSS gradient string for the preview bar
  const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
  const stopsCss = sortedStops
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");

  let previewCss = `linear-gradient(90deg, ${stopsCss})`;
  if (gradient.type === "radial") {
    previewCss = `radial-gradient(circle, ${stopsCss})`;
  } else if (gradient.type === "conic") {
    previewCss = `conic-gradient(from ${gradient.angle}deg, ${stopsCss})`;
  }

  // Handle clicking on the gradient bar to add or select a stop
  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const position = Math.round(
      Math.max(0, Math.min(100, (clickX / rect.width) * 100))
    );

    // Create a new stop at this position
    const newStop: GradientStop = {
      id: `stop_${Date.now()}`,
      color: selectedStop ? selectedStop.color : "#206859",
      position,
    };

    const newStops = [...gradient.stops, newStop];
    onChange({ ...gradient, stops: newStops });
    setSelectedStopId(newStop.id);
  };

  // Handle updating a single stop property
  const handleUpdateStop = (id: string, updates: Partial<GradientStop>) => {
    const newStops = gradient.stops.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    onChange({ ...gradient, stops: newStops });
  };

  // Handle removing the active stop
  const handleRemoveStop = (id: string) => {
    if (gradient.stops.length <= 2) return; // Keep at least 2 stops
    const newStops = gradient.stops.filter((s) => s.id !== id);
    onChange({ ...gradient, stops: newStops });
    if (selectedStopId === id) {
      setSelectedStopId(newStops[0]?.id || "");
    }
  };

  // Handle drag on stop marker
  const handleStopMouseDown = (e: React.MouseEvent, stopId: string) => {
    e.stopPropagation();
    setSelectedStopId(stopId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const moveX = moveEvent.clientX - rect.left;
      const pos = Math.round(
        Math.max(0, Math.min(100, (moveX / rect.width) * 100))
      );
      handleUpdateStop(stopId, { position: pos });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="gradient-editor">
      {/* Type Selector (Linear, Radial, Conic) */}
      <div className="gradient-type-row">
        <div className="gradient-type-toggle">
          <button
            type="button"
            className={`gradient-type-btn ${
              gradient.type === "linear" ? "gradient-type-btn--active" : ""
            }`}
            onClick={() => onChange({ ...gradient, type: "linear" })}
          >
            Linear
          </button>
          <button
            type="button"
            className={`gradient-type-btn ${
              gradient.type === "radial" ? "gradient-type-btn--active" : ""
            }`}
            onClick={() => onChange({ ...gradient, type: "radial" })}
          >
            Radial
          </button>
          <button
            type="button"
            className={`gradient-type-btn ${
              gradient.type === "conic" ? "gradient-type-btn--active" : ""
            }`}
            onClick={() => onChange({ ...gradient, type: "conic" })}
          >
            Conic
          </button>
        </div>

        {/* Angle Slider (for Linear & Conic) */}
        {gradient.type !== "radial" && (
          <div className="gradient-angle-box" title="Gradient Angle">
            <RotateCw size={11} className="gradient-angle-icon" />
            <input
              type="number"
              className="form-input gradient-angle-input"
              min="0"
              max="360"
              value={gradient.angle}
              onChange={(e) =>
                onChange({
                  ...gradient,
                  angle: Math.max(0, Math.min(360, Number(e.target.value))),
                })
              }
            />
            <span className="gradient-angle-unit">°</span>
          </div>
        )}
      </div>

      {/* Visual Gradient Bar with Color Stop Markers */}
      <div className="gradient-bar-wrapper">
        <div
          className="gradient-bar"
          ref={barRef}
          style={{ background: previewCss }}
          onClick={handleBarClick}
          title="Click anywhere to add a new color stop"
        >
          {gradient.stops.map((stop) => {
            const isSelected = stop.id === selectedStopId;
            return (
              <div
                key={stop.id}
                className={`gradient-stop-pin ${
                  isSelected ? "gradient-stop-pin--selected" : ""
                }`}
                style={{
                  left: `${stop.position}%`,
                  backgroundColor: stop.color,
                }}
                onMouseDown={(e) => handleStopMouseDown(e, stop.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStopId(stop.id);
                }}
                title={`Stop: ${stop.position}% (${stop.color})`}
              />
            );
          })}
        </div>
      </div>

      {/* Selected Color Stop Controls */}
      {selectedStop && (
        <div className="gradient-stop-controls">
          <div className="gradient-stop-prop">
            <span className="gradient-sublabel">Color</span>
            <label className="form-color-picker">
              <div
                className="form-color-picker__swatch"
                style={{ backgroundColor: selectedStop.color }}
              />
              <input
                type="color"
                style={{
                  width: 0,
                  height: 0,
                  padding: 0,
                  border: "none",
                  position: "absolute",
                  opacity: 0,
                }}
                value={selectedStop.color}
                onChange={(e) =>
                  handleUpdateStop(selectedStop.id, { color: e.target.value })
                }
              />
              <span className="form-color-picker__label">
                {selectedStop.color}
              </span>
            </label>
          </div>

          <div className="gradient-stop-prop">
            <span className="gradient-sublabel">Pos</span>
            <div className="form-slider-row" style={{ flex: 1 }}>
              <input
                type="range"
                className="form-slider"
                min="0"
                max="100"
                value={selectedStop.position}
                onChange={(e) =>
                  handleUpdateStop(selectedStop.id, {
                    position: Number(e.target.value),
                  })
                }
              />
              <span className="form-slider-val" style={{ minWidth: 28 }}>
                {selectedStop.position}%
              </span>
            </div>
          </div>

          {gradient.stops.length > 2 && (
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={() => handleRemoveStop(selectedStop.id)}
              title="Delete this color stop"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
