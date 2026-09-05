"use client";

/**
 * ============================================================================
 * DOCK CORNER SPLITTER COMPONENT
 * ============================================================================
 * UI Element: 2D Corner Splitter Handle (Intersection of Vertical & Horizontal Edges)
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Allows simultaneous 2D resizing of two merging panels (e.g. Left + Bottom, Right + Bottom)
 *       when dragging at the intersection point where their edges meet.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-corner-splitter`)
 * ============================================================================
 */

import React, { useState, useCallback } from "react";

interface DockCornerSplitterProps {
  corner: "bottom-left" | "bottom-right";
  left?: number;
  right?: number;
  bottom: number;
  onResize: (deltaX: number, deltaY: number) => void;
  onResizeEnd?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DockCornerSplitter: React.FC<DockCornerSplitterProps> = ({
  corner,
  left,
  right,
  bottom,
  onResize,
  onResizeEnd,
  className,
  style,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const cursorType = corner === "bottom-left" ? "nesw-resize" : "nwse-resize";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      let lastX = e.clientX;
      let lastY = e.clientY;

      document.body.classList.add("is-resizing");
      document.body.style.cursor = cursorType;
      document.body.style.userSelect = "none";

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - lastX;
        const deltaY = moveEvent.clientY - lastY;
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        onResize(deltaX, deltaY);
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
    [cursorType, onResize, onResizeEnd]
  );

  const positionStyle: React.CSSProperties = {
    position: "absolute",
    bottom: `${bottom - 7}px`,
    ...(left !== undefined ? { left: `${left - 7}px` } : {}),
    ...(right !== undefined ? { right: `${right - 7}px` } : {}),
    width: "14px",
    height: "14px",
    cursor: cursorType,
    zIndex: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...style,
  };

  return (
    <div
      className={`dock-corner-splitter dock-corner-splitter--${corner} ${
        isDragging ? "dock-corner-splitter--active" : ""
      } ${className || ""}`}
      style={positionStyle}
      onMouseDown={handleMouseDown}
      title="Drag intersection to resize both panels simultaneously"
      role="separator"
      aria-label={`Resize intersection of ${corner.replace("-", " ")} panels`}
    >
      <div className="dock-corner-splitter__handle" />
    </div>
  );
};
