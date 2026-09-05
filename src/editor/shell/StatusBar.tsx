"use client";

/**
 * ============================================================================
 * STATUS BAR COMPONENT
 * ============================================================================
 * UI Element: Bottom Status Bar
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Displays engine readiness, active selection, zoom level, and performance metrics.
 * Styling Source: `@/editor/styles/dock.css` (`.statusbar`)
 * ============================================================================
 */

import React from "react";
import { ZoomIn, ZoomOut, Maximize2, Activity, Cpu } from "lucide-react";

interface StatusBarProps {
  status?: string;
  isDirty?: boolean;
  activeSelection?: string | null;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  fps?: number;
  memoryUsage?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status = "Engine Ready",
  isDirty = false,
  activeSelection = "No selection",
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  fps = 120,
  memoryUsage = "38 MB",
}) => {
  return (
    <footer className="statusbar" role="contentinfo" aria-label="Engine Status Bar">
      {/* Left section: Status and dirty state */}
      <div className="statusbar__left">
        <div className="statusbar__item">
          <span
            className={`statusbar__indicator ${
              isDirty ? "statusbar__indicator--dirty" : ""
            }`}
            title={isDirty ? "Unsaved changes" : "All changes saved"}
          />
          <span>{status}</span>
        </div>

        <div className="statusbar__item">
          <span className="statusbar__badge">AST v1.0</span>
        </div>

        {activeSelection && (
          <div className="statusbar__item">
            <span style={{ color: "var(--text-tertiary)" }}>Target:</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              {activeSelection}
            </span>
          </div>
        )}
      </div>

      {/* Center section: Performance & Diagnostics */}
      <div className="statusbar__center">
        <div className="statusbar__item">
          <Activity size={12} style={{ color: "var(--accent-success)" }} />
          <span>{fps} FPS (Wasm)</span>
        </div>
        <div className="statusbar__item">
          <Cpu size={12} style={{ color: "var(--text-tertiary)" }} />
          <span>{memoryUsage}</span>
        </div>
      </div>

      {/* Right section: Zoom controls */}
      <div className="statusbar__right">
        <div className="statusbar__item">
          <button
            type="button"
            className="statusbar__zoom-btn"
            onClick={onZoomOut}
            title="Zoom Out (Ctrl -)"
          >
            <ZoomOut size={12} />
          </button>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              minWidth: "40px",
              textAlign: "center",
              cursor: "pointer",
            }}
            onClick={onZoomReset}
            title="Reset Zoom (Ctrl 0)"
          >
            {zoomLevel}%
          </span>
          <button
            type="button"
            className="statusbar__zoom-btn"
            onClick={onZoomIn}
            title="Zoom In (Ctrl +)"
          >
            <ZoomIn size={12} />
          </button>
          <button
            type="button"
            className="statusbar__zoom-btn"
            onClick={onZoomReset}
            title="Fit to Stage"
          >
            <Maximize2 size={11} />
          </button>
        </div>
      </div>
    </footer>
  );
};
