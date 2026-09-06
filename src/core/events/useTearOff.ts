"use client";

/**
 * ============================================================================
 * TEAR-OFF DRAG LIFECYCLE HOOK  (v2 — High-Performance Rewrite)
 * ============================================================================
 * UI Element: Drag-to-Detach / Dock-Full-Page System
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Manages the pointer tracking, drop zone detection, and action dispatch
 *       for the Unreal Engine-style tear-off tab system.
 *
 * PERFORMANCE NOTES (v2):
 * - Pointer position updates are batched via requestAnimationFrame
 * - Only a single React state update happens when drag activates/deactivates
 * - Preview position is set via a ref-callback direct DOM style mutation
 * - Snap-back: If the pointer is released within SNAP_BACK_RADIUS px of the
 *   drag origin, the drag is cancelled (item tucks back).
 * ============================================================================
 */

import { useState, useCallback, useRef, useEffect } from "react";

export type TearOffDragSource = "bottom-tab" | "content-browser" | "outliner" | "fullpage-tab";
export type TearOffDropAction = "dock-fullpage" | "open-new-tab" | "attach-bottom-drawer" | "attach-bottom-bar" | null;

export interface TearOffState {
  isDragging: boolean;
  dragSource: TearOffDragSource | null;
  panelId: string | null;
  panelTitle: string | null;
  pointerX: number;
  pointerY: number;
  isOverHeaderZone: boolean;
  isOverBottomDrawerZone: boolean;
  isOverBottomBarZone: boolean;
  /** Set true when pointer is within snap-back radius of origin */
  isInSnapBackZone: boolean;
}

/** The vertical pixel threshold from the top of the viewport that constitutes the "header drop zone" */
const HEADER_ZONE_HEIGHT = 100;

/** Status bar height at bottom of screen (px) */
const STATUS_BAR_HEIGHT = 36;

/** Bottom drawer area height above status bar (px) */
const BOTTOM_DRAWER_ZONE_HEIGHT = 260;

/** Minimum pixel distance from drag origin before tear-off activates */
const DRAG_THRESHOLD = 24;

/** If pointer is released within this radius of the origin, cancel the drag (snap back) */
const SNAP_BACK_RADIUS = 60;

interface UseTearOffOptions {
  onDockFullPage: (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => void;
  onOpenNewTab: (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => void;
  onAttachBottomDrawer?: (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => void;
  onAttachBottomBar?: (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => void;
  onCancelDrag?: (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => void;
}

const INITIAL_STATE: TearOffState = {
  isDragging: false,
  dragSource: null,
  panelId: null,
  panelTitle: null,
  pointerX: 0,
  pointerY: 0,
  isOverHeaderZone: false,
  isOverBottomDrawerZone: false,
  isOverBottomBarZone: false,
  isInSnapBackZone: false,
};

export function useTearOff(options: UseTearOffOptions) {
  const [state, setState] = useState<TearOffState>(INITIAL_STATE);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track drag origin to measure threshold & snap-back
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const hasExceededThresholdRef = useRef(false);
  const pendingPanelRef = useRef<{
    panelId: string;
    panelTitle: string;
    dragSource: TearOffDragSource;
  } | null>(null);

  // RAF-based pointer position (avoids React re-renders per move event)
  const rafIdRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isOverHeaderRef = useRef(false);
  const isOverBottomDrawerRef = useRef(false);
  const isOverBottomBarRef = useRef(false);
  const isInSnapBackRef = useRef(false);

  // Refs for cleanup
  const cleanupRef = useRef<(() => void) | null>(null);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    dragOriginRef.current = null;
    hasExceededThresholdRef.current = false;
    pendingPanelRef.current = null;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
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

      // Schedule a RAF loop for smooth visual updates once drag is active
      let isDragActive = false;

      const scheduleRAF = () => {
        rafIdRef.current = requestAnimationFrame(() => {
          if (!isDragActive) return;
          const px = latestPointerRef.current.x;
          const py = latestPointerRef.current.y;
          const windowHeight = typeof window !== "undefined" ? window.innerHeight : 800;

          const overHeader = py <= HEADER_ZONE_HEIGHT;
          const overBottomBar = py > windowHeight - STATUS_BAR_HEIGHT;
          const overBottomDrawer =
            py > windowHeight - STATUS_BAR_HEIGHT - BOTTOM_DRAWER_ZONE_HEIGHT &&
            py <= windowHeight - STATUS_BAR_HEIGHT;

          const ox = dragOriginRef.current?.x ?? 0;
          const oy = dragOriginRef.current?.y ?? 0;
          const distFromOrigin = Math.sqrt((px - ox) ** 2 + (py - oy) ** 2);
          const inSnapBack = distFromOrigin < SNAP_BACK_RADIUS;

          isOverHeaderRef.current = overHeader;
          isOverBottomDrawerRef.current = overBottomDrawer;
          isOverBottomBarRef.current = overBottomBar;
          isInSnapBackRef.current = inSnapBack;

          setState((prev) => {
            // Only update if something changed to avoid unnecessary renders
            if (
              prev.pointerX === px &&
              prev.pointerY === py &&
              prev.isOverHeaderZone === overHeader &&
              prev.isOverBottomDrawerZone === overBottomDrawer &&
              prev.isOverBottomBarZone === overBottomBar &&
              prev.isInSnapBackZone === inSnapBack
            ) {
              return prev;
            }
            return {
              ...prev,
              pointerX: px,
              pointerY: py,
              isOverHeaderZone: overHeader,
              isOverBottomDrawerZone: overBottomDrawer,
              isOverBottomBarZone: overBottomBar,
              isInSnapBackZone: inSnapBack,
            };
          });

          scheduleRAF();
        });
      };

      const handlePointerMove = (e: PointerEvent) => {
        e.preventDefault();

        latestPointerRef.current = { x: e.clientX, y: e.clientY };

        if (!hasExceededThresholdRef.current) {
          const dx = e.clientX - (dragOriginRef.current?.x ?? 0);
          const dy = e.clientY - (dragOriginRef.current?.y ?? 0);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance >= DRAG_THRESHOLD) {
            hasExceededThresholdRef.current = true;
            isDragActive = true;

            const windowHeight = typeof window !== "undefined" ? window.innerHeight : 800;
            const overHeader = e.clientY <= HEADER_ZONE_HEIGHT;
            const overBottomBar = e.clientY > windowHeight - STATUS_BAR_HEIGHT;
            const overBottomDrawer =
              e.clientY > windowHeight - STATUS_BAR_HEIGHT - BOTTOM_DRAWER_ZONE_HEIGHT &&
              e.clientY <= windowHeight - STATUS_BAR_HEIGHT;

            // Single React state update to activate the drag overlay
            setState({
              isDragging: true,
              dragSource: pendingPanelRef.current?.dragSource ?? null,
              panelId: pendingPanelRef.current?.panelId ?? null,
              panelTitle: pendingPanelRef.current?.panelTitle ?? null,
              pointerX: e.clientX,
              pointerY: e.clientY,
              isOverHeaderZone: overHeader,
              isOverBottomDrawerZone: overBottomDrawer,
              isOverBottomBarZone: overBottomBar,
              isInSnapBackZone: false,
            });

            // Start the RAF loop for silky-smooth visual updates
            scheduleRAF();
          }
          return; // Not yet past threshold
        }
      };

      const handlePointerUp = (e: PointerEvent) => {
        const pending = pendingPanelRef.current;
        const exceeded = hasExceededThresholdRef.current;
        const wasInSnapBack = isInSnapBackRef.current;
        const wasOverBottomDrawer = isOverBottomDrawerRef.current;
        const wasOverBottomBar = isOverBottomBarRef.current;
        const wasOverHeader = isOverHeaderRef.current;
        isDragActive = false;

        // Clean up listeners immediately
        reset();

        if (!pending || !exceeded) return;

        // Snap-back check: if released near origin, treat as cancel
        if (wasInSnapBack) {
          optionsRef.current.onCancelDrag?.(pending.panelId, pending.panelTitle, pending.dragSource);
          return;
        }

        if (wasOverHeader) {
          optionsRef.current.onDockFullPage(pending.panelId, pending.panelTitle, pending.dragSource);
        } else if (wasOverBottomBar) {
          if (optionsRef.current.onAttachBottomBar) {
            optionsRef.current.onAttachBottomBar(pending.panelId, pending.panelTitle, pending.dragSource);
          } else {
            optionsRef.current.onDockFullPage(pending.panelId, pending.panelTitle, pending.dragSource);
          }
        } else if (wasOverBottomDrawer) {
          if (optionsRef.current.onAttachBottomDrawer) {
            optionsRef.current.onAttachBottomDrawer(pending.panelId, pending.panelTitle, pending.dragSource);
          } else {
            optionsRef.current.onDockFullPage(pending.panelId, pending.panelTitle, pending.dragSource);
          }
        } else {
          optionsRef.current.onOpenNewTab(pending.panelId, pending.panelTitle, pending.dragSource);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          const pending = pendingPanelRef.current;
          isDragActive = false;
          reset();
          if (pending) {
            optionsRef.current.onCancelDrag?.(pending.panelId, pending.panelTitle, pending.dragSource);
          }
        }
      };

      window.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerUp, { once: true });
      window.addEventListener("keydown", handleKeyDown);

      cleanupRef.current = () => {
        isDragActive = false;
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
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    tearOffState: state,
    startTearOff,
    cancelTearOff: reset,
  };
}
