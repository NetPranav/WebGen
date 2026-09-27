"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { documentCommands } from "@/core/store/useDocumentStore";
import { SHAPE_TOOLS, computeShapeProperties } from "./shapeTools";
import type { CanvasTool } from "../FloatingDock";

interface DragState {
  startX: number;
  startY: number;
  x: number;
  y: number;
  shiftKey: boolean;
}

interface UseShapeDrawingOptions {
  activeTool: CanvasTool;
  /** Percent, e.g. 100 for 100%. */
  zoom: number;
  containerRef: RefObject<HTMLElement | null>;
  /** Where a newly-created shape is added as a child — typically the active page's root. `null` disables drawing (e.g. no page loaded yet). */
  parentId: string | null;
  onCreated?: (layerId: string) => void;
}

/**
 * Drag-mechanics for the four Tier A "drag a box, create an archetype sized
 * to it" tools (Frame/Rectangle/Ellipse/Line). See `types.ts` for why this is
 * one shared hook instead of four near-duplicate handlers, and for why this
 * canvas is flow-placed rather than absolute-position.
 */
export function useShapeDrawing({ activeTool, zoom, containerRef, parentId, onCreated }: UseShapeDrawingOptions) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const toolDef = SHAPE_TOOLS[activeTool as keyof typeof SHAPE_TOOLS];

  // Mirrors `drag` for reading at mouseup time. Necessary because
  // `documentCommands.addLayer` is a real side effect (it mutates the
  // document store and pushes a history entry) — calling it from inside a
  // `setState` updater function is exactly the impure-updater anti-pattern
  // React's docs warn about, and in dev-mode Strict Mode, React deliberately
  // invokes state updater functions twice to catch that: the shape got
  // created twice per drag until this was pulled out into a ref read
  // alongside a plain, side-effect-free `setDrag(null)`. Caught by an actual
  // browser test, not just code review — see the Phase 43.2 progress log.
  const dragRef = useRef<DragState | null>(null);
  const setDragBoth = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.MouseEvent): boolean => {
      if (!toolDef || !containerRef.current) return false;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDragBoth({ startX: x, startY: y, x, y, shiftKey: e.shiftKey });
      return true;
    },
    [toolDef, containerRef, setDragBoth]
  );

  useEffect(() => {
    if (!drag) return;

    // Mouse events, not pointer events — matches the existing pan-drag
    // listener in WhiteboardCanvas.tsx's `handleMouseDown`; mixing the two
    // event models on the same container risks a drag being seen twice.
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDragBoth({ ...dragRef.current, x: e.clientX - rect.left, y: e.clientY - rect.top, shiftKey: e.shiftKey });
    };

    const handleUp = () => {
      const finished = dragRef.current;
      setDragBoth(null);
      if (finished && toolDef && parentId) {
        const scale = zoom / 100 || 1;
        const properties = computeShapeProperties(
          toolDef,
          (finished.x - finished.startX) / scale,
          (finished.y - finished.startY) / scale,
          finished.shiftKey
        );
        const id = documentCommands.addLayer(
          { archetype: toolDef.archetype, parentId, ...(properties ? { properties } : {}) },
          `Draw ${toolDef.label}`
        );
        onCreated?.(id);
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag, toolDef, parentId, zoom, containerRef, onCreated, setDragBoth]);

  const overlayStyle: React.CSSProperties | null = drag
    ? {
        position: "absolute",
        left: Math.min(drag.startX, drag.x),
        top: Math.min(drag.startY, drag.y),
        width: Math.abs(drag.x - drag.startX),
        height: Math.abs(drag.y - drag.startY),
        border: "1.5px dashed #6366F1",
        background: "rgba(99, 102, 241, 0.08)",
        pointerEvents: "none",
        zIndex: 40,
      }
    : null;

  return { handlePointerDown, isDrawing: !!drag, overlayStyle, activeShapeTool: toolDef };
}
