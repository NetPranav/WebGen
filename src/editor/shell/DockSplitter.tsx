"use client";

/**
 * ============================================================================
 * DOCK SPLITTER COMPONENT
 * ============================================================================
 * UI Element: Draggable Splitter Handle (Vertical / Horizontal)
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Provides responsive mouse-drag resizing between dock zones with hover highlight.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-splitter`)
 * 
 * CSS ISOLATION NOTE:
 * Governed strictly by `.dock-splitter` and its modifiers (`--vertical`, `--horizontal`).
 * No conflicting inline styles; position changes are dispatched via onResize callback.
 * ============================================================================
 */

import React, { useState, useCallback, useEffect } from "react";

interface DockSplitterProps {
  orientation: "vertical" | "horizontal";
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DockSplitter: React.FC<DockSplitterProps> = ({
  orientation,
  onResize,
  onResizeEnd,
  className,
  style,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      let lastPos = orientation === "vertical" ? e.clientX : e.clientY;

      document.body.classList.add("is-resizing");
      document.body.style.cursor =
        orientation === "vertical" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentPos =
          orientation === "vertical" ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - lastPos;
        lastPos = currentPos;
        onResize(delta);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.body.classList.remove("is-resizing");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (onResizeEnd) onResizeEnd();
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [orientation, onResize, onResizeEnd]
  );

  return (
    <div
      className={`dock-splitter dock-splitter--${orientation} ${
        isDragging ? "dock-splitter--active" : ""
      } ${className || ""}`}
      style={style}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation={orientation}
    />
  );
};
