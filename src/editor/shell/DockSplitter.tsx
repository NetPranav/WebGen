"use client";

/**
 * ============================================================================
 * DOCK SPLITTER COMPONENT
 * ============================================================================
 * UI Element: Draggable Splitter Handle (Vertical / Horizontal)
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Resizes the adjacent dock zone by writing directly to its DOM node
 * (rAF-batched, no React re-render) while dragging, then commits the final
 * size to state once on release.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-splitter`)
 *
 * CSS ISOLATION NOTE:
 * Governed strictly by `.dock-splitter` and its modifiers (`--vertical`, `--horizontal`).
 * No conflicting inline styles; position changes are dispatched via onCommit callback.
 * ============================================================================
 */

import React, { useState, useCallback } from "react";

interface DockSplitterProps {
  orientation: "vertical" | "horizontal";
  /** DOM node of the zone this splitter resizes. Its width/height (and matching min-width/min-height) are written to directly while dragging. */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Current committed size (px) of the target zone; used as the drag's starting value. */
  value: number;
  min: number;
  max: number;
  /** When true, dragging in the positive axis direction shrinks the zone instead of growing it (right/bottom-anchored zones). */
  invert?: boolean;
  /** Called once, on release, with the final clamped size. */
  onCommit: (value: number) => void;
  onResizeEnd?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DockSplitter: React.FC<DockSplitterProps> = ({
  orientation,
  targetRef,
  value,
  min,
  max,
  invert = false,
  onCommit,
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

      const startPos = orientation === "vertical" ? e.clientX : e.clientY;
      const startValue = value;
      let latestValue = startValue;
      let rafId: number | null = null;

      document.body.classList.add("is-resizing");
      document.body.style.cursor =
        orientation === "vertical" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      const applyLive = (v: number) => {
        const el = targetRef.current;
        if (!el) return;
        if (orientation === "vertical") {
          el.style.width = `${v}px`;
          el.style.minWidth = `${v}px`;
        } else {
          el.style.height = `${v}px`;
          el.style.minHeight = `${v}px`;
        }
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentPos =
          orientation === "vertical" ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - startPos;
        const raw = startValue + (invert ? -delta : delta);
        latestValue = Math.min(Math.max(raw, min), max);
        if (rafId == null) {
          rafId = requestAnimationFrame(() => {
            applyLive(latestValue);
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
        onCommit(latestValue);
        if (onResizeEnd) onResizeEnd();
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [orientation, targetRef, value, min, max, invert, onCommit, onResizeEnd]
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
