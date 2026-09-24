"use client";

/**
 * ============================================================================
 * CANVAS OVERLAY (SELECTION & SNAP GUIDES)
 * ============================================================================
 * UI Element: Selection Bounding Box, Resize Handles & Snap Alignment Crosshairs
 * Screen / Scope: Screen 01: Application Viewport & Screen 12: Whiteboard Canvas
 * Role: Renders visual bounding rectangles, dimension labels, and 8 resize
 *       handles around selected components on the canvas.
 * Styling Source: `@/editor/styles/whiteboard.css` (`.canvas-selection-box`)
 * ============================================================================
 */

import React from "react";

export interface SelectionRect {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasOverlayProps {
  selectedElement?: SelectionRect | null;
  onHandleMouseDown?: (handle: string, e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  selectedElement,
  onHandleMouseDown,
  className,
  style,
}) => {
  if (!selectedElement) return null;

  const { x, y, width, height, label } = selectedElement;

  const handles = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"];

  return (
    <div
      className={`canvas-selection-box ${className || ""}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        ...style,
      }}
    >
      <div className="canvas-selection-box__label">
        {label} • {Math.round(width)} × {Math.round(height)}
      </div>

      {handles.map((h) => (
        <div
          key={h}
          className={`canvas-selection-handle canvas-selection-handle--${h}`}
          onMouseDown={(e) => onHandleMouseDown?.(h, e)}
          role="slider"
          aria-label={`Resize handle ${h}`}
        />
      ))}
    </div>
  );
};
