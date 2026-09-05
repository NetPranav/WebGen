"use client";

/**
 * ============================================================================
 * TEAR-OFF DRAG LIFECYCLE HOOK
 * ============================================================================
 * UI Element: Drag-to-Detach / Dock-Full-Page System
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Manages the pointer tracking, drop zone detection, and action dispatch
 *       for the Unreal Engine-style tear-off tab system.
 *
 * ARCHITECTURE NOTE:
 * This hook is consumed by EditorShell. It exposes `startTearOff()` which any
 * component (DockTabBar, ContentBrowser, OutlinerTree) can call on drag start.
 * The hook captures the pointer globally and tracks movement until pointerup,
 * then dispatches either DOCK_FULLPAGE or OPEN_NEW_TAB based on drop position.
 * ============================================================================
 */

import { useState, useCallback, useRef, useEffect } from "react";

export type TearOffDragSource = "bottom-tab" | "content-browser" | "outliner";
export type TearOffDropAction = "dock-fullpage" | "open-new-tab" | null;

export interface TearOffState {
  isDragging: boolean;
  dragSource: TearOffDragSource | null;
  panelId: string | null;
  panelTitle: string | null;
  pointerX: number;
  pointerY: number;
  isOverHeaderZone: boolean;
}

/** The vertical pixel threshold from the top of the viewport that constitutes the "header drop zone" */
const HEADER_ZONE_HEIGHT = 100;

/** Minimum vertical pixel distance from drag origin before tear-off activates */
const DRAG_THRESHOLD = 40;

interface UseTearOffOptions {
  onDockFullPage: (panelId: string, panelTitle: string) => void;
  onOpenNewTab: (panelId: string, panelTitle: string) => void;
}

const INITIAL_STATE: TearOffState = {
  isDragging: false,
  dragSource: null,
  panelId: null,
  panelTitle: null,
  pointerX: 0,
  pointerY: 0,
  isOverHeaderZone: false,
};

export function useTearOff(options: UseTearOffOptions) {
  const [state, setState] = useState<TearOffState>(INITIAL_STATE);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track drag origin to measure threshold
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const hasExceededThresholdRef = useRef(false);
  const pendingPanelRef = useRef<{
    panelId: string;
    panelTitle: string;
    dragSource: TearOffDragSource;
  } | null>(null);

  // Refs for cleanup
  const cleanupRef = useRef<(() => void) | null>(null);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    dragOriginRef.current = null;
    hasExceededThresholdRef.current = false;
    pendingPanelRef.current = null;
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  /**
   * Called by any draggable component (tab, file card, tree item) on pointerdown.
   * The hook begins tracking the pointer and will activate the tear-off overlay
   * once the drag threshold is exceeded.
   */
  const startTearOff = useCallback(
    (
      panelId: string,
      panelTitle: string,
      dragSource: TearOffDragSource,
      originX: number,
      originY: number
    ) => {
      dragOriginRef.current = { x: originX, y: originY };
      hasExceededThresholdRef.current = false;
      pendingPanelRef.current = { panelId, panelTitle, dragSource };

      const handlePointerMove = (e: PointerEvent) => {
        e.preventDefault();

        const dx = e.clientX - (dragOriginRef.current?.x ?? 0);
        const dy = e.clientY - (dragOriginRef.current?.y ?? 0);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (!hasExceededThresholdRef.current) {
          if (distance >= DRAG_THRESHOLD) {
            hasExceededThresholdRef.current = true;
          } else {
            return; // Not yet past threshold
          }
        }

        const isOverHeader = e.clientY <= HEADER_ZONE_HEIGHT;

        setState({
          isDragging: true,
          dragSource: pendingPanelRef.current?.dragSource ?? null,
          panelId: pendingPanelRef.current?.panelId ?? null,
          panelTitle: pendingPanelRef.current?.panelTitle ?? null,
          pointerX: e.clientX,
          pointerY: e.clientY,
          isOverHeaderZone: isOverHeader,
        });
      };

      const handlePointerUp = (e: PointerEvent) => {
        const pending = pendingPanelRef.current;
        const exceeded = hasExceededThresholdRef.current;

        // Clean up listeners immediately
        reset();

        if (!pending || !exceeded) return;

        const isOverHeader = e.clientY <= HEADER_ZONE_HEIGHT;

        if (isOverHeader) {
          optionsRef.current.onDockFullPage(pending.panelId, pending.panelTitle);
        } else {
          optionsRef.current.onOpenNewTab(pending.panelId, pending.panelTitle);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          reset();
        }
      };

      window.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerUp, { once: true });
      window.addEventListener("keydown", handleKeyDown);

      cleanupRef.current = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("keydown", handleKeyDown);
      };
    },
    [reset]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    tearOffState: state,
    startTearOff,
    cancelTearOff: reset,
  };
}
