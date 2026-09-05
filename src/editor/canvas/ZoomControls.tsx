"use client";

/**
 * ============================================================================
 * FLOATING ZOOM CONTROLS WIDGET
 * ============================================================================
 * UI Element: Floating Canvas Zoom Pill (Bottom-Right)
 * Screen / Scope: Screen 01: Application Viewport & Screen 12: Whiteboard Canvas
 * Role: Provides visual zoom percentage readout and precision zoom buttons.
 * Styling Source: `@/editor/styles/whiteboard.css` (`.zoom-controls`)
 * ============================================================================
 */

import React from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";

interface ZoomControlsProps {
  zoomLevel: number; // e.g. 100 for 100%
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen?: () => void;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  minZoom = 10,
  maxZoom = 400,
  className,
  style,
}) => {
  const isAtMin = zoomLevel <= minZoom;
  const isAtMax = zoomLevel >= maxZoom;

  return (
    <div
      className={`zoom-controls ${className || ""}`}
      style={style}
      role="group"
      aria-label="Canvas Zoom Controls"
    >
      <button
        type="button"
        className="zoom-controls__btn"
        onClick={onZoomOut}
        disabled={isAtMin}
        title="Zoom Out (Ctrl+Minus)"
        aria-label="Zoom Out"
      >
        <Minus size={13} />
      </button>

      <button
        type="button"
        className="zoom-controls__readout"
        onClick={onResetZoom}
        title="Reset Zoom to 100% (Ctrl+0)"
        aria-label={`Current Zoom ${Math.round(zoomLevel)}%. Click to reset.`}
      >
        {Math.round(zoomLevel)}%
      </button>

      <button
        type="button"
        className="zoom-controls__btn"
        onClick={onZoomIn}
        disabled={isAtMax}
        title="Zoom In (Ctrl+Plus)"
        aria-label="Zoom In"
      >
        <Plus size={13} />
      </button>

      {onFitToScreen && (
        <>
          <div className="zoom-controls__divider" />
          <button
            type="button"
            className="zoom-controls__btn"
            onClick={onFitToScreen}
            title="Fit to Screen (Shift+1)"
            aria-label="Fit Viewport to Screen"
          >
            <Maximize2 size={12} />
          </button>
        </>
      )}
    </div>
  );
};
