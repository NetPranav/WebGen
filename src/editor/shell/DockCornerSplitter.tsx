"use client";

/**
 * ============================================================================
 * DOCK CORNER SPLITTER COMPONENT
 * ============================================================================
 * UI Element: 2D Corner Splitter Handle (Intersection of Vertical & Horizontal Edges)
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Allows simultaneous 2D resizing of two merging panels (Right + Bottom)
 *       when dragging at the intersection point where their edges meet. Writes
 *       directly to both zones' DOM nodes while dragging (rAF-batched), then
 *       commits both final sizes to state once on release.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-corner-splitter`)
 * ============================================================================
 */

import React, { useState, useCallback } from "react";

interface DockCornerSplitterProps {
  corner: "bottom-left" | "bottom-right";
  /** Positioning anchor for the handle itself (current committed widths/height). */
  left?: number;
  right?: number;
  bottom: number;
  rightRef: React.RefObject<HTMLElement | null>;
  bottomRef: React.RefObject<HTMLElement | null>;
  rightMin: number;
  rightMax: number;
  bottomMin: number;
  bottomMax: number;
  onCommit: (values: { right: number; bottom: number }) => void;
  onResizeEnd?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DockCornerSplitter: React.FC<DockCornerSplitterProps> = ({
  corner,
  left,
  right,
  bottom,
  rightRef,
  bottomRef,
  rightMin,
  rightMax,
  bottomMin,
  bottomMax,
  onCommit,
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

      const startX = e.clientX;
      const startY = e.clientY;
      const startRight = right ?? 0;
      const startBottom = bottom;
      let latestRight = startRight;
      let latestBottom = startBottom;
      let rafId: number | null = null;

      document.body.classList.add("is-resizing");
      document.body.style.cursor = cursorType;
      document.body.style.userSelect = "none";

      const applyLive = () => {
        const rightEl = rightRef.current;
        if (rightEl) {
          rightEl.style.width = `${latestRight}px`;
          rightEl.style.minWidth = `${latestRight}px`;
        }
        const bottomEl = bottomRef.current;
        if (bottomEl) {
          bottomEl.style.height = `${latestBottom}px`;
          bottomEl.style.minHeight = `${latestBottom}px`;
        }
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        // Right zone shrinks as the corner moves right; bottom zone shrinks as it moves down.
        latestRight = Math.min(Math.max(startRight - deltaX, rightMin), rightMax);
        latestBottom = Math.min(Math.max(startBottom - deltaY, bottomMin), bottomMax);
        if (rafId == null) {
          rafId = requestAnimationFrame(() => {
            applyLive();
            rafId = null;
          });
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.body.classList.remove("is-resizing");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (rafId != null) cancelAnimationFrame(rafId);
        onCommit({ right: latestRight, bottom: latestBottom });
        if (onResizeEnd) onResizeEnd();
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [cursorType, right, bottom, rightRef, bottomRef, rightMin, rightMax, bottomMin, bottomMax, onCommit, onResizeEnd]
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
