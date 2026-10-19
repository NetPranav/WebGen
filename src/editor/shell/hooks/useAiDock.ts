"use client";

/**
 * The LazyLayout AI dock (moved out of `EditorShell.tsx`, Phase 14): whether it
 * is open, which side it is docked on and how wide it is live in the saved
 * workspace layout; dragging it to a new side is session state kept here.
 */
import { useState, useCallback, useEffect, type RefObject } from "react";
import { useWorkspaceStore } from "@/core/workspace/useWorkspaceStore";
import type { DockLayer } from "./useDockLayers";

export function useAiDock({
  rightZoneRef,
  rightWidth,
  rightCollapsed,
  setActiveLayer,
}: {
  rightZoneRef: RefObject<HTMLElement | null>;
  rightWidth: number;
  rightCollapsed: boolean;
  setActiveLayer: (layer: DockLayer) => void;
}) {
  const ai = useWorkspaceStore((s) => s.layout.ai);
  const setAi = useWorkspaceStore((s) => s.setAi);
  const isAiCoPilotOpen = ai.open;
  const aiDockSide = ai.side;
  const aiPanelWidth = ai.width;
  const setIsAiCoPilotOpen = useCallback((open: boolean) => setAi({ open }), [setAi]);
  const setAiDockSide = useCallback((side: "left" | "right") => setAi({ side }), [setAi]);
  const setAiPanelWidth = useCallback((width: number) => setAi({ width }), [setAi]);

  const [, setAiDockMode] = useState<"replace" | "split-left">("split-left");
  const [isDraggingAi, setIsDraggingAi] = useState(false);
  const [dragCursorPos, setDragCursorPos] = useState({ x: 0, y: 0 });
  const [activeHoverDropSide, setActiveHoverDropSide] = useState<"left" | "right" | null>(null);
  /** Measured dock-body geometry while dragging LazyLayout AI, so the drop slots sit exactly
   * where the panel will land (flush left of the canvas, or tucked left of the Details dock). */
  const [dropSlotBounds, setDropSlotBounds] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

  /** Window menu entry point: start the drag-to-dock gesture (or unplug if already open) */
  const handleStartDragAI = useCallback(() => {
    if (isAiCoPilotOpen) {
      setIsAiCoPilotOpen(false);
      setIsDraggingAi(false);
      setActiveHoverDropSide(null);
      return;
    }
    setIsDraggingAi(true);
    setDragCursorPos({
      x: typeof window !== "undefined" ? window.innerWidth / 2 : 600,
      y: typeof window !== "undefined" ? window.innerHeight / 3 : 250,
    });
    setActiveHoverDropSide(null);
  }, [isAiCoPilotOpen, setIsAiCoPilotOpen]);

  /** Start re-docking an already-docked LayoutAI panel (grip drag) */
  const handleStartRedockAI = useCallback(() => {
    setIsAiCoPilotOpen(false);
    setIsDraggingAi(true);
    setDragCursorPos({
      x: typeof window !== "undefined" ? window.innerWidth / 2 : 600,
      y: typeof window !== "undefined" ? window.innerHeight / 3 : 250,
    });
    setActiveHoverDropSide(null);
  }, [setIsAiCoPilotOpen]);

  const toggleAiCoPilot = useCallback(() => {
    setIsDraggingAi(false);
    setActiveHoverDropSide(null);
    if (!isAiCoPilotOpen) setActiveLayer("ai");
    setIsAiCoPilotOpen(!isAiCoPilotOpen);
  }, [isAiCoPilotOpen, setIsAiCoPilotOpen, setActiveLayer]);

  // Pointer tracking for dragging LayoutAI — proximity-based dual-side detection
  useEffect(() => {
    if (!isDraggingAi) return;

    // The slots cover the dock body (below the header + workspace strip, above the status
    // bar). The left slot is flush with the body's left edge — there is no left dock — and
    // the right slot ends where the Details dock begins.
    const measure = () => {
      const body = document.querySelector(".dock-layout__body")?.getBoundingClientRect();
      const top = body?.top ?? 0;
      // Full body height: a freshly docked column is focused, so it sits above the bottom drawer.
      const bottom = body?.bottom ?? window.innerHeight;
      const left = body?.left ?? 0;
      const rightDock = rightZoneRef.current?.getBoundingClientRect();
      const right = !rightCollapsed && rightDock && rightDock.width > 0 ? rightDock.left : body?.right ?? window.innerWidth;
      return { top, bottom, left, right };
    };
    let bounds = measure();
    setDropSlotBounds(bounds);

    const detectSide = (clientX: number, clientY: number): "left" | "right" | null => {
      if (clientY < bounds.top || clientY > bounds.bottom) return null;
      if (clientX <= bounds.left + aiPanelWidth + 40) return "left";
      if (clientX >= bounds.right - aiPanelWidth - 40) return "right";
      return null;
    };

    const handleResize = () => {
      bounds = measure();
      setDropSlotBounds(bounds);
    };

    const handlePointerMove = (e: PointerEvent) => {
      setDragCursorPos({ x: e.clientX, y: e.clientY });
      setActiveHoverDropSide(detectSide(e.clientX, e.clientY));
    };

    const handlePointerUp = (e: PointerEvent) => {
      const side = detectSide(e.clientX, e.clientY);
      if (side) {
        setAiDockSide(side);
        setAiDockMode("split-left");
        setIsAiCoPilotOpen(true);
        setActiveLayer("ai");
      }
      setIsDraggingAi(false);
      setActiveHoverDropSide(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDraggingAi(false);
        setActiveHoverDropSide(null);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDraggingAi, rightWidth, rightCollapsed, aiPanelWidth, rightZoneRef, setActiveLayer, setAiDockSide, setIsAiCoPilotOpen]);

  /** Docks the panel on a side (a click on a drop slot). */
  const dockAiOn = useCallback(
    (side: "left" | "right") => {
      setAiDockSide(side);
      setAiDockMode("split-left");
      setIsAiCoPilotOpen(true);
      setActiveLayer("ai");
      setIsDraggingAi(false);
      setActiveHoverDropSide(null);
    },
    [setAiDockSide, setIsAiCoPilotOpen, setActiveLayer],
  );

  return {
    isAiCoPilotOpen,
    setIsAiCoPilotOpen,
    aiDockSide,
    aiPanelWidth,
    setAiPanelWidth,
    setAiDockMode,
    isDraggingAi,
    dragCursorPos,
    activeHoverDropSide,
    dropSlotBounds,
    handleStartDragAI,
    handleStartRedockAI,
    toggleAiCoPilot,
    dockAiOn,
  };
}

export type AiDock = ReturnType<typeof useAiDock>;
