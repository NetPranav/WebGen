"use client";

/**
 * Full-page tabs, torn-off panels and the tear-off drag (moved out of
 * `EditorShell.tsx`, Phase 14). A full-page tab takes over the stage and
 * folds the drawers away; closing the last one restores the layout it found.
 */
import React, { useState, useCallback } from "react";
import { useTearOff, type TearOffDragSource } from "@/core/events/useTearOff";
import { useTearOffChannel } from "@/core/events/useTearOffChannel";
import { ALL_BOTTOM_TABS } from "../dockTabs";
import type { Workspace } from "./useWorkspace";

export function useFullPageDock(ws: Workspace, handleZoneClick: (zone: "left" | "right" | "bottom" | "ai") => void) {
  const {
    leftCollapsed,
    bottomCollapsed,
    bottomActiveTab,
    isOutputLogOpen,
    setLeftCollapsed,
    setBottomCollapsed,
    setBottomActiveTab,
    setIsOutputLogOpen,
  } = ws;

  /* --------------------------------------------------------------------------
   * Tear-Off & Full-Page Dock State
   * -------------------------------------------------------------------------- */
  const [detachedPanels, setDetachedPanels] = useState<Set<string>>(new Set());
  const [fullPagePanels, setFullPagePanels] = useState<
    Array<{ panelId: string; title: string; dragSource?: TearOffDragSource }>
  >([]);
  const [activeFullPageIndex, setActiveFullPageIndex] = useState<number>(0);
  const [activeFullPageTabId, setActiveFullPageTabId] = useState<string | null>(null);

  /** Store tab state during drag for snap-back cancellation */
  const draggedFullPageTabRef = React.useRef<{
    panelId: string;
    panelTitle: string;
    originalPanels: Array<{ panelId: string; title: string; dragSource?: TearOffDragSource }>;
    originalIndex: number;
  } | null>(null);

  const currentFullPagePanel =
    fullPagePanels[activeFullPageIndex] ?? fullPagePanels[0] ?? null;

  const currentTabId = activeFullPageTabId ?? currentFullPagePanel?.panelId ?? null;

  /** Store pre-full-page layout state for restoration on close */
  const preFullPageRef = React.useRef<{
    leftCollapsed: boolean;
    bottomCollapsed: boolean;
    bottomActiveTab: string;
  } | null>(null);

  const handleDockFullPage = useCallback(
    (panelId: string, panelTitle: string, dragSource?: TearOffDragSource) => {
      draggedFullPageTabRef.current = null;
      setActiveFullPageTabId(panelId);

      // Save current layout state before going full-page (only on first full-page tab)
      if (fullPagePanels.length === 0) {
        preFullPageRef.current = {
          leftCollapsed: leftCollapsed,
          bottomCollapsed: bottomCollapsed,
          bottomActiveTab: bottomActiveTab,
        };
      }

      setFullPagePanels((prev) => {
        const existingIdx = prev.findIndex((p) => p.panelId === panelId);
        if (existingIdx >= 0) {
          setActiveFullPageIndex(existingIdx);
          return prev;
        }
        const next = [...prev, { panelId, title: panelTitle, dragSource }];
        setActiveFullPageIndex(next.length - 1);
        return next;
      });

      // Auto-collapse left panel (outliner) and bottom drawer in full-page mode
      setLeftCollapsed(true);
      setBottomCollapsed(true);
      // Close output log if it was open
      if (panelId !== "console") {
        setIsOutputLogOpen(false);
      }
      // Remove from detached if it was there
      setDetachedPanels((prev) => {
        const next = new Set(prev);
        next.delete(panelId);
        return next;
      });
    },
    [fullPagePanels.length, leftCollapsed, bottomCollapsed, bottomActiveTab, setLeftCollapsed, setBottomCollapsed, setIsOutputLogOpen]
  );

  const handleCloseFullPageTab = useCallback((panelId: string) => {
    setFullPagePanels((prev) => {
      const closeIdx = prev.findIndex((p) => p.panelId === panelId);
      if (closeIdx === -1) return prev;
      const next = prev.filter((p) => p.panelId !== panelId);

      if (next.length === 0) {
        setActiveFullPageTabId(null);
        // All full-page tabs closed! Restore pre-full-page layout
        if (preFullPageRef.current) {
          setLeftCollapsed(preFullPageRef.current.leftCollapsed);
          setBottomCollapsed(preFullPageRef.current.bottomCollapsed);
          setBottomActiveTab(preFullPageRef.current.bottomActiveTab);
          preFullPageRef.current = null;
        } else {
          setBottomCollapsed(false);
          setBottomActiveTab("content-browser");
        }
        setActiveFullPageIndex(0);
      } else {
        setActiveFullPageIndex((curIdx) => {
          const newIdx = curIdx >= next.length ? next.length - 1 : curIdx === closeIdx ? Math.max(0, closeIdx - 1) : curIdx > closeIdx ? curIdx - 1 : curIdx;
          setActiveFullPageTabId(next[newIdx]?.panelId ?? "viewport");
          return newIdx;
        });
      }
      return next;
    });
  }, [setLeftCollapsed, setBottomCollapsed, setBottomActiveTab]);

  const handleCloseAllFullPage = useCallback(() => {
    setFullPagePanels([]);
    setActiveFullPageIndex(0);
    if (preFullPageRef.current) {
      setLeftCollapsed(preFullPageRef.current.leftCollapsed);
      setBottomCollapsed(preFullPageRef.current.bottomCollapsed);
      setBottomActiveTab(preFullPageRef.current.bottomActiveTab);
      preFullPageRef.current = null;
    } else {
      setBottomCollapsed(false);
    }
  }, [setLeftCollapsed, setBottomCollapsed, setBottomActiveTab]);


  const startTearOffRef = React.useRef<
    (panelId: string, panelTitle: string, dragSource: TearOffDragSource, originX: number, originY: number) => void
  >(() => {});

  /** Starts tear-off from a full-page tab title */
  const handleFullPageTabDragStart = useCallback(
    (panelId: string, panelTitle: string, originX: number, originY: number) => {
      draggedFullPageTabRef.current = {
        panelId,
        panelTitle,
        originalPanels: [...fullPagePanels],
        originalIndex: activeFullPageIndex,
      };

      // Lift the tab out of fullPagePanels immediately so:
      // - If 2+ tabs, another tab displays in full-screen
      // - If 1 tab, full-screen closes and underlying screen shows!
      setFullPagePanels((prev) => {
        const idx = prev.findIndex((p) => p.panelId === panelId);
        const next = prev.filter((p) => p.panelId !== panelId);
        if (next.length === 0) {
          setActiveFullPageIndex(0);
        } else {
          setActiveFullPageIndex((cur) => {
            if (cur >= next.length) return next.length - 1;
            if (cur === idx) return Math.min(idx, next.length - 1);
            if (cur > idx) return cur - 1;
            return cur;
          });
        }
        return next;
      });

      startTearOffRef.current(panelId, panelTitle, "fullpage-tab", originX, originY);
    },
    [fullPagePanels, activeFullPageIndex]
  );

  /** Restores dragged tab back to full-page tabs on snap-back cancellation */
  const handleCancelDrag = useCallback(
    (_panelId: string, _panelTitle: string, dragSource: TearOffDragSource) => {
      if (dragSource === "fullpage-tab" && draggedFullPageTabRef.current) {
        const saved = draggedFullPageTabRef.current;
        setFullPagePanels(saved.originalPanels);
        setActiveFullPageIndex(saved.originalIndex);
        draggedFullPageTabRef.current = null;
      }
    },
    []
  );

  /** Dropped in bottom drawer region: attach and OPEN bottom drawer */
  const handleAttachBottomDrawer = useCallback(
    (panelId: string) => {
      draggedFullPageTabRef.current = null;
      setFullPagePanels((prev) => prev.filter((p) => p.panelId !== panelId));
      setDetachedPanels((prev) => {
        const next = new Set(prev);
        next.delete(panelId);
        return next;
      });

      if (panelId === "console") {
        setIsOutputLogOpen(true);
      } else {
        setBottomCollapsed(false);
        setBottomActiveTab(panelId);
        handleZoneClick("bottom");
      }
    },
    [handleZoneClick, setBottomCollapsed, setBottomActiveTab, setIsOutputLogOpen]
  );

  /** Dropped on bottom bar: attach to original place but KEEP DRAWER CLOSED */
  const handleAttachBottomBar = useCallback(
    (panelId: string) => {
      draggedFullPageTabRef.current = null;
      setFullPagePanels((prev) => prev.filter((p) => p.panelId !== panelId));
      setDetachedPanels((prev) => {
        const next = new Set(prev);
        next.delete(panelId);
        return next;
      });

      if (panelId === "console") {
        setIsOutputLogOpen(false);
      } else {
        setBottomActiveTab(panelId);
        setBottomCollapsed(true);
      }
    },
    [setBottomActiveTab, setBottomCollapsed, setIsOutputLogOpen]
  );

  const handleOpenNewTab = useCallback(
    (panelId: string, _panelTitle: string, dragSource?: TearOffDragSource) => {
      draggedFullPageTabRef.current = null;
      setFullPagePanels((prev) => prev.filter((p) => p.panelId !== panelId));

      // Handle output log special case
      if (panelId === "console") {
        setIsOutputLogOpen(false);
      }

      // Only bottom-tab items (blueprint, sequencer, console) or fullpage tabs from bottom should vanish from their origin.
      // Content browser files and outliner items stay visible in their origin panels.
      const shouldVanishFromOrigin =
        dragSource === "bottom-tab" || dragSource === "fullpage-tab" || panelId === "console";

      if (shouldVanishFromOrigin) {
        setDetachedPanels((prev) => new Set(prev).add(panelId));
      }

      // Open in a new browser tab — must be synchronous from user gesture
      const url = `${window.location.origin}/editor/detach/${panelId}`;
      window.open(url, `detach-${panelId}`, "noopener");

      // If all bottom tabs are now detached or full-paged, collapse the drawer
      if (shouldVanishFromOrigin && panelId !== "console") {
        const remainingTabs = ALL_BOTTOM_TABS.filter(
          (t) =>
            t.id !== panelId &&
            !detachedPanels.has(t.id) &&
            !fullPagePanels.some((p) => p.panelId === t.id)
        );
        if (remainingTabs.length === 0) {
          setBottomCollapsed(true);
        } else {
          // Switch active tab to first remaining
          setBottomActiveTab(remainingTabs[0].id);
        }
      }
    },
    [detachedPanels, fullPagePanels, setBottomActiveTab, setBottomCollapsed, setIsOutputLogOpen]
  );

  // Tear-off drag hook
  const { tearOffState, startTearOff } = useTearOff({
    onDockFullPage: handleDockFullPage,
    onOpenNewTab: handleOpenNewTab,
    onAttachBottomDrawer: handleAttachBottomDrawer,
    onAttachBottomBar: handleAttachBottomBar,
    onCancelDrag: handleCancelDrag,
  });
  React.useLayoutEffect(() => {
    startTearOffRef.current = startTearOff;
  });

  // When in full-page mode, clicking outside the open bottom drawer / outliner auto-minimizes both
  React.useEffect(() => {
    if (fullPagePanels.length === 0) return;
    const isAnyDrawerOpen = !leftCollapsed || !bottomCollapsed || isOutputLogOpen;
    if (!isAnyDrawerOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If click is inside left drawer, bottom drawer, output log, status bar, or splitters, ignore
      if (
        target.closest(".dock-zone--left") ||
        target.closest(".dock-zone--bottom") ||
        target.closest(".output-log-drawer") ||
        target.closest(".dock-layout__statusbar") ||
        target.closest(".dock-splitter") ||
        target.closest(".dock-corner-splitter")
      ) {
        return;
      }

      // Clicked anywhere else in full-page mode (center canvas, fullpage dock, details panel, etc.)
      setLeftCollapsed(true);
      setBottomCollapsed(true);
      setIsOutputLogOpen(false);
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [fullPagePanels.length, leftCollapsed, bottomCollapsed, isOutputLogOpen, setLeftCollapsed, setBottomCollapsed, setIsOutputLogOpen]);

  // Cross-tab communication: listen for REATTACH from detached tabs
  useTearOffChannel({
    onReattach: (msg) => {
      setDetachedPanels((prev) => {
        const next = new Set(prev);
        next.delete(msg.panelId);
        return next;
      });
      // Re-expand bottom drawer and set reattached tab as active
      if (msg.panelId === "console") {
        // Output log reattaches to its own drawer
        setIsOutputLogOpen(true);
      } else {
        setBottomCollapsed(false);
        setBottomActiveTab(msg.panelId);
      }
    },
  });

  /** Bottom tabs filtered to exclude detached and full-page panels */
  const fullPagePanelIds = new Set(fullPagePanels.map((p) => p.panelId));
  const visibleBottomTabs = ALL_BOTTOM_TABS.filter(
    (t) => !detachedPanels.has(t.id) && !fullPagePanelIds.has(t.id)
  );

  const handleBottomTearOffStart = useCallback(
    (tabId: string, tabTitle: string, originX: number, originY: number) => {
      startTearOff(tabId, tabTitle, "bottom-tab", originX, originY);
    },
    [startTearOff]
  );

  /** Generic tear-off starter for content browser files, outliner items, output log, etc. */
  const handleGenericTearOffStart = useCallback(
    (panelId: string, panelTitle: string, originX: number, originY: number) => {
      startTearOff(panelId, panelTitle, "content-browser", originX, originY);
    },
    [startTearOff]
  );

  return {
    detachedPanels,
    fullPagePanels,
    activeFullPageIndex,
    setActiveFullPageIndex,
    activeFullPageTabId,
    setActiveFullPageTabId,
    currentFullPagePanel,
    currentTabId,
    visibleBottomTabs,
    tearOffState,
    startTearOff,
    handleDockFullPage,
    handleCloseFullPageTab,
    handleCloseAllFullPage,
    handleFullPageTabDragStart,
    handleBottomTearOffStart,
    handleGenericTearOffStart,
  };
}

export type FullPageDock = ReturnType<typeof useFullPageDock>;
