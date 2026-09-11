"use client";

/**
 * ============================================================================
 * EDITOR SHELL ROOT COMPONENT
 * ============================================================================
 * UI Element: Master IDE Studio Layout Shell & Dock Manager
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Coordinates 4 dock zones (left, center, right, bottom), splitters, and status bar.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-layout`)
 * 
 * ARCHITECTURE & ISOLATION NOTE:
 * Governed strictly by `.dock-layout`. Panel sizes are managed reactively via state
 * and passed as bounded numbers. No cross-component class leaks.
 * Matches UI.md §5 and PANELS.md.
 * ============================================================================
 */

import React, { useState, useCallback } from "react";
import "@/editor/styles/dock.css";
import { DockZone } from "./DockZone";
import { DockSplitter } from "./DockSplitter";
import { DockCornerSplitter } from "./DockCornerSplitter";
import { DockTabBar } from "./DockTabBar";
import { StatusBar } from "./StatusBar";
import { StudioHeader } from "./StudioHeader";
import { WhiteboardCanvas } from "@/editor/canvas/WhiteboardCanvas";
import { OutlinerTree } from "@/editor/panels/outliner/OutlinerTree";
import { DetailsInspector } from "@/editor/panels/details/DetailsInspector";
import { ContentBrowser } from "@/editor/panels/content-browser/ContentBrowser";
import { OutputConsole } from "@/editor/panels/console/OutputConsole";
import { ProjectSettings } from "@/editor/panels/settings/ProjectSettings";
import { BlueprintCanvas } from "@/editor/panels/blueprint/BlueprintCanvas";
import { TimelineSequencer } from "@/editor/panels/sequencer/TimelineSequencer";
import { FullPageDock } from "./FullPageDock";
import { TearOffDragOverlay } from "./TearOffDragOverlay";
import { AssetDetailsInspector } from "@/editor/panels/details/AssetDetailsInspector";
import { AssetFileEditor } from "@/editor/panels/content-browser/AssetFileEditor";
import { StateMatrixViewer } from "@/editor/panels/state/StateMatrixViewer";
import { DatabaseDesigner } from "@/editor/panels/database/DatabaseDesigner";
import { DatabaseStudio } from "@/editor/panels/database/DatabaseStudio";
import { ContentBlockShelf } from "@/editor/panels/content-browser/ContentBlockShelf";
import { useTearOff, TearOffDragSource } from "@/core/events/useTearOff";
import { useTearOffChannel } from "@/core/events/useTearOffChannel";
import {
  Save,
  Undo2,
  Redo2,
  Terminal,
  X,
  Database,
  Settings,
  Monitor,
  Network,
  Sparkles,
} from "lucide-react";
import { PanelTab } from "@/core/types/workspace";

interface EditorShellProps {
  headerSlot?: React.ReactNode;
  leftPanels?: Record<string, React.ReactNode>;
  rightPanels?: Record<string, React.ReactNode>;
  bottomPanels?: Record<string, React.ReactNode>;
  centerPanels?: Record<string, React.ReactNode>;
  initialPage?: "editor" | "database";
}

export const EditorShell: React.FC<EditorShellProps> = ({
  headerSlot,
  leftPanels = {},
  rightPanels = {},
  bottomPanels = {},
  centerPanels = {},
  initialPage = "editor",
}) => {
  const [isDatabaseStudioOpen, setIsDatabaseStudioOpen] = useState(initialPage === "database");
  /* --------------------------------------------------------------------------
   * Dock Sizing State (with min/max boundaries)
   * -------------------------------------------------------------------------- */
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(320);
  const [bottomHeight, setBottomHeight] = useState(240);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  type DockLayer = "left" | "right" | "bottom";
  const [activeLayer, setActiveLayer] = useState<DockLayer>("bottom");
  const activeLayerRef = React.useRef<DockLayer>("bottom");
  activeLayerRef.current = activeLayer;
  const layerTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (layerTimerRef.current) {
        clearTimeout(layerTimerRef.current);
      }
    };
  }, []);

  const handleZoneMouseEnter = (targetLayer: DockLayer) => {
    if (layerTimerRef.current) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }
    // If this zone is already the active top layer, nothing to switch
    if (targetLayer === activeLayerRef.current) return;

    // Dwell timer: Must stay in this panel/drawer for ~2 seconds before overlapping
    // Until then, whichever panel/drawer was on top remains on top!
    layerTimerRef.current = setTimeout(() => {
      setActiveLayer(targetLayer);
      layerTimerRef.current = null;
    }, 2000);
  };

  const handleZoneMouseLeave = (zone: DockLayer) => {
    // If mouse leaves before the 2 seconds, cancel the dwell transition timer.
    // Whichever layer was active continues to be active!
    if (layerTimerRef.current) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }
  };

  const handleZoneClick = (targetLayer: DockLayer) => {
    // Immediate click bypasses dwell timer
    if (layerTimerRef.current) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }
    setActiveLayer(targetLayer);
  };

  /* --------------------------------------------------------------------------
   * Active Tab State
   * -------------------------------------------------------------------------- */
  const [leftActiveTab, setLeftActiveTab] = useState("outliner");
  const [rightActiveTab, setRightActiveTab] = useState("details");
  const [bottomActiveTab, setBottomActiveTab] = useState("content-browser");
  const [centerActiveTab, setCenterActiveTab] = useState("viewport");
  const [isOutputLogOpen, setIsOutputLogOpen] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDirty, setIsDirty] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState("full-studio");
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const [selectedElement, setSelectedElement] = useState<{ id: string; name: string }>({
    id: "comp_hero",
    name: "Hero Section",
  });

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

  /** All bottom-drawer panel definitions (before filtering) */
  const ALL_BOTTOM_TABS: PanelTab[] = [
    { id: "content-browser", title: "Content Browser", closable: false },
    { id: "blocks", title: "Section Blocks", closable: false },
    { id: "sequencer", title: "Timeline Sequencer", closable: false },
  ];

  /** Map panel IDs to titles for tear-off (includes console for output log) */
  const PANEL_TITLES: Record<string, string> = {
    "content-browser": "Content Browser",
    blocks: "Section Blocks",
    blueprint: "Logic Blueprint",
    sequencer: "Timeline Sequencer",
    console: "Output Log",
    "er-modeler": "Database Schema",
  };

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
    [fullPagePanels.length, leftCollapsed, bottomCollapsed, bottomActiveTab]
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
  }, []);

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
  }, []);

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
    (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => {
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
    (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => {
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
    []
  );

  /** Dropped on bottom bar: attach to original place but KEEP DRAWER CLOSED */
  const handleAttachBottomBar = useCallback(
    (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => {
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
    []
  );

  const handleOpenNewTab = useCallback(
    (panelId: string, panelTitle: string, dragSource?: TearOffDragSource) => {
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
    [detachedPanels, fullPagePanels]
  );

  // Tear-off drag hook
  const { tearOffState, startTearOff } = useTearOff({
    onDockFullPage: handleDockFullPage,
    onOpenNewTab: handleOpenNewTab,
    onAttachBottomDrawer: handleAttachBottomDrawer,
    onAttachBottomBar: handleAttachBottomBar,
    onCancelDrag: handleCancelDrag,
  });
  startTearOffRef.current = startTearOff;

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
  }, [fullPagePanels.length, leftCollapsed, bottomCollapsed, isOutputLogOpen]);

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

  const handleOpenPanel = (zone: "left" | "right" | "bottom" | "center", tabId: string) => {
    if (zone === "left") {
      setLeftCollapsed(false);
      setLeftActiveTab(tabId);
      handleZoneClick("left");
    } else if (zone === "right") {
      setRightCollapsed(false);
      setRightActiveTab(tabId);
      handleZoneClick("right");
    } else if (zone === "bottom") {
      if (tabId === "blueprint") {
        handleDockFullPage("blueprint", "Logic Blueprint");
        return;
      }
      if (tabId === "console") {
        setIsOutputLogOpen(true);
        return;
      }
      setBottomCollapsed(false);
      setBottomActiveTab(tabId);
      handleZoneClick("bottom");
    } else if (zone === "center") {
      if (tabId === "blueprint") {
        handleDockFullPage("blueprint", "Logic Blueprint");
      } else if (tabId === "er-modeler") {
        handleDockFullPage("er-modeler", "Database Schema");
      } else if (tabId === "sequencer") {
        handleDockFullPage("sequencer", "Timeline Sequencer");
      } else if (tabId === "content-browser") {
        handleDockFullPage("content-browser", "Content Browser");
      } else if (tabId === "settings") {
        setCenterActiveTab("settings");
      } else {
        setCenterActiveTab("viewport");
      }
    }
  };

  const handleOpenSettings = () => {
    setCenterActiveTab("settings");
  };

  /* --------------------------------------------------------------------------
   * Workspace Preset Switcher (UI.md §5.2)
   * -------------------------------------------------------------------------- */
  const handleSelectWorkspace = (preset: string) => {
    setActiveWorkspace(preset);
    if (preset === "full-studio") {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setBottomCollapsed(false);
      setLeftWidth(300);
      setRightWidth(320);
      setBottomHeight(240);
      setBottomActiveTab("content-browser");
      setCenterActiveTab("viewport");
    } else if (preset === "design") {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setBottomCollapsed(true);
      setLeftWidth(340);
      setRightWidth(360);
      setLeftActiveTab("outliner");
      setRightActiveTab("details");
      setCenterActiveTab("viewport");
    } else if (preset === "logic") {
      setLeftCollapsed(true);
      setRightCollapsed(false);
      setBottomCollapsed(true);
      handleDockFullPage("blueprint", "Logic Blueprint");
    } else if (preset === "data") {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setBottomCollapsed(false);
      handleDockFullPage("er-modeler", "Database Schema");
    } else if (preset === "debug") {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setIsOutputLogOpen(true);
    }
  };

  const handleResetLayout = () => {
    handleSelectWorkspace("full-studio");
  };

  /* --------------------------------------------------------------------------
   * Default Tab Configurations (From PANELS.md & User Design Directive)
   * -------------------------------------------------------------------------- */
  const leftTabs: PanelTab[] = [
    { id: "outliner", title: "Outliner", closable: false },
    { id: "state-matrix", title: "State Matrix", closable: false },
  ];

  const rightTabs: PanelTab[] = [
    { id: "details", title: "Details", closable: false },
    { id: "tokens", title: "Tokens", closable: true },
    { id: "validation", title: "Errors (0)", closable: true },
  ];

  // Bottom tabs now come from visibleBottomTabs (filtered by tear-off state)
  const bottomTabs = visibleBottomTabs;

  const centerTabs: { id: string; title: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "viewport", title: "Viewport (Design)", icon: <Monitor size={13} /> },
    { id: "blueprint", title: "Logic Blueprint", icon: <Network size={13} />, badge: "Full Stage" },
    { id: "er-modeler", title: "Database Studio", icon: <Database size={13} /> },
    { id: "settings", title: "Project Settings", icon: <Settings size={13} /> },
  ];

  /* --------------------------------------------------------------------------
   * Splitter Resize Handlers
   * -------------------------------------------------------------------------- */
  const handleLeftResize = (delta: number) => {
    if (leftCollapsed) setLeftCollapsed(false);
    setLeftWidth((prev) => Math.min(Math.max(prev + delta, 220), 550));
  };

  const handleRightResize = (delta: number) => {
    if (rightCollapsed) setRightCollapsed(false);
    setRightWidth((prev) => Math.min(Math.max(prev - delta, 240), 550));
  };

  const handleBottomResize = (delta: number) => {
    if (bottomCollapsed) setBottomCollapsed(false);
    setBottomHeight((prev) => Math.min(Math.max(prev - delta, 140), 480));
  };

  if (isDatabaseStudioOpen) {
    return <DatabaseStudio onBackToEditor={() => setIsDatabaseStudioOpen(false)} />;
  }

  return (
    <div className="dock-layout">
      {/* Top Header Slot: Single Streamlined StudioHeader */}
      <div
        className="dock-layout__header"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const rawData = e.dataTransfer.getData("application/json");
          if (!rawData) return;
          try {
            const data = JSON.parse(rawData);
            if (data.type === "asset") {
              handleDockFullPage(data.id, data.name);
            }
          } catch {}
        }}
      >
        {headerSlot || (
          <StudioHeader
            isDirty={isDirty}
            deviceMode={deviceMode}
            onSelectDeviceMode={(mode) => setDeviceMode(mode)}
            leftOpen={!leftCollapsed}
            rightOpen={!rightCollapsed}
            bottomOpen={!bottomCollapsed}
            onToggleLeft={() => setLeftCollapsed((c) => !c)}
            onToggleRight={() => setRightCollapsed((c) => !c)}
            onToggleBottom={() => setBottomCollapsed((c) => !c)}
            onSelectWorkspace={handleSelectWorkspace}
            activeWorkspace={activeWorkspace}
            onSave={() => setIsDirty(false)}
            onUndo={() => {}}
            onRedo={() => {}}
            onZoomIn={() => setZoomLevel((z) => Math.min(z + 10, 250))}
            onZoomOut={() => setZoomLevel((z) => Math.max(z - 10, 25))}
            onZoomReset={() => setZoomLevel(100)}
            onResetLayout={handleResetLayout}
            onOpenPanel={handleOpenPanel}
            onOpenSettings={handleOpenSettings}
            onOpenDatabase={() => setIsDatabaseStudioOpen(true)}
            activePage={isDatabaseStudioOpen ? "database" : "editor"}
          />
        )}
      </div>

      {/* Main Dock Body (Left, Center Column, Right, and Overlapping Bottom Drawer) */}
      <div className="dock-layout__body">
        {/* Full-Page Dock Mode — takes over entire body, outliner minimizes on left, asset details on right */}
        {currentFullPagePanel ? (
          <>
            {/* Minimized Left Outliner DockZone */}
            <DockZone
              zoneId="left"
              size={leftWidth}
              isCollapsed={leftCollapsed}
              tabs={leftTabs}
              activeTabId={leftActiveTab}
              onSelectTab={(tabId) => {
                setLeftActiveTab(tabId);
                handleZoneClick("left");
              }}
              onToggleCollapse={() => setLeftCollapsed((c) => !c)}
              onMouseEnter={() => handleZoneMouseEnter("left")}
              onMouseLeave={() => handleZoneMouseLeave("left")}
              onClick={() => handleZoneClick("left")}
              className={activeLayer === "left" ? "dock-zone--elevated" : ""}
              onTearOffStart={(tabId, tabTitle, ox, oy) =>
                startTearOff(tabId, tabTitle, "outliner", ox, oy)
              }
            >
              {leftPanels[leftActiveTab] || (
                leftActiveTab === "outliner" ? (
                  <OutlinerTree
                    selectedId={selectedElement.id}
                    onSelectElement={(id, name) => setSelectedElement({ id, name })}
                    onTearOffItem={handleGenericTearOffStart}
                    onOpenItem={(id, title) => handleDockFullPage(id, title)}
                  />
                ) : (
                  <StateMatrixViewer />
                )
              )}
            </DockZone>

            {!leftCollapsed && (
              <DockSplitter
                orientation="vertical"
                onResize={handleLeftResize}
                style={{ zIndex: activeLayer === "left" ? 29 : 28 }}
              />
            )}

            {/* Center fills wide workspace with browser-like multi-tab FullPageDock */}
            <div
              className="dock-center-col"
              style={{ paddingBottom: 0 }}
            >
              <FullPageDock
                tabs={fullPagePanels.map((p) => ({
                  panelId: p.panelId,
                  panelTitle: p.title,
                  dragSource: p.dragSource,
                  isDirty,
                }))}
                activeTabId={currentTabId || currentFullPagePanel.panelId}
                onSelectTab={(panelId) => {
                  setActiveFullPageTabId(panelId);
                  const idx = fullPagePanels.findIndex((p) => p.panelId === panelId);
                  if (idx >= 0) setActiveFullPageIndex(idx);
                }}
                onCloseTab={handleCloseFullPageTab}
                onTabDragStart={handleFullPageTabDragStart}
                isDirty={isDirty}
                onSave={() => setIsDirty(false)}
                onUndo={() => {}}
                onRedo={() => {}}
                onCloseAll={handleCloseAllFullPage}
                onOpenAsset={(id, title) => handleDockFullPage(id, title)}
              >
                {currentTabId === "viewport" ? (
                  <WhiteboardCanvas
                    deviceMode={deviceMode}
                    zoomLevel={zoomLevel}
                    onZoomChange={setZoomLevel}
                    onDropAsset={(asset) => {
                      setSelectedElement({ id: asset.id, name: asset.name });
                    }}
                  />
                ) : currentFullPagePanel.panelId === "content-browser" ? (
                  <ContentBrowser
                    selectedFolderId={selectedElement.id}
                    selectedFolderName={selectedElement.name}
                    onSelectFolder={(folderId, folderName) => setSelectedElement({ id: folderId, name: folderName })}
                    onOpenAsset={(id, title) => handleDockFullPage(id, title)}
                    onTearOffItem={handleGenericTearOffStart}
                  />
                ) : currentFullPagePanel.panelId === "blueprint" ||
                currentFullPagePanel.panelId.includes("bp") ||
                currentFullPagePanel.title.toLowerCase().includes(".bp") ? (
                  <BlueprintCanvas />
                ) : currentFullPagePanel.panelId === "sequencer" ||
                  currentFullPagePanel.panelId.includes("seq") ||
                  currentFullPagePanel.title.toLowerCase().includes(".seq") ? (
                  <TimelineSequencer />
                ) : currentFullPagePanel.panelId === "console" ? (
                  <OutputConsole />
                ) : currentFullPagePanel.panelId === "er-modeler" ||
                  currentFullPagePanel.panelId.includes("db") ||
                  currentFullPagePanel.title.toLowerCase().includes(".db") ? (
                  <DatabaseDesigner onClose={() => handleCloseFullPageTab(currentFullPagePanel.panelId)} />
                ) : (
                  <AssetFileEditor
                    assetId={currentFullPagePanel.panelId}
                    assetTitle={currentFullPagePanel.title}
                    isDirty={isDirty}
                    onSave={() => setIsDirty(false)}
                    onSwitchToBlueprint={() =>
                      handleDockFullPage("blueprint", "Logic Blueprint")
                    }
                  />
                )}
              </FullPageDock>
            </div>

            {/* Right vertical splitter */}
            {!rightCollapsed && (
              <DockSplitter
                orientation="vertical"
                onResize={handleRightResize}
                style={{ zIndex: activeLayer === "right" ? 29 : 28 }}
              />
            )}

            {/* Right Dock Zone displaying Details */}
            <DockZone
              zoneId="right"
              size={rightWidth}
              isCollapsed={rightCollapsed}
              tabs={
                currentTabId === "viewport" || currentFullPagePanel.panelId === "content-browser"
                  ? rightTabs
                  : [
                      { id: "asset-details", title: `${currentFullPagePanel.title} Details`, closable: false },
                      { id: "tokens", title: "Tokens", closable: true },
                    ]
              }
              activeTabId={
                currentTabId === "viewport" || currentFullPagePanel.panelId === "content-browser"
                  ? rightActiveTab
                  : "asset-details"
              }
              onSelectTab={(tabId) => {
                setRightActiveTab(tabId);
                handleZoneClick("right");
              }}
              onToggleCollapse={() => setRightCollapsed((c) => !c)}
              onMouseEnter={() => handleZoneMouseEnter("right")}
              onMouseLeave={() => handleZoneMouseLeave("right")}
              onClick={() => handleZoneClick("right")}
              className={activeLayer === "right" ? "dock-zone--elevated" : ""}
            >
              {currentTabId === "viewport" || currentFullPagePanel.panelId === "content-browser" ? (
                rightPanels[rightActiveTab] || (
                  rightActiveTab === "details" ? (
                    <DetailsInspector
                      selectedElementId={selectedElement.id}
                      selectedElementName={selectedElement.name}
                      onOpenBlueprint={() => handleDockFullPage("blueprint", "Logic Blueprint")}
                    />
                  ) : rightActiveTab === "tokens" ? (
                    <ProjectSettings />
                  ) : (
                    <OutputConsole />
                  )
                )
              ) : (
                <AssetDetailsInspector
                  panelId={currentFullPagePanel.panelId}
                  panelTitle={currentFullPagePanel.title}
                  onOpenBlueprint={(_fnId) =>
                    handleDockFullPage("blueprint", "Logic Blueprint")
                  }
                />
              )}
            </DockZone>
          </>
        ) : (
          <>
            {/* Normal Layout: Left, Center, Right */}
            {/* Left Dock Zone */}
            <DockZone
              zoneId="left"
              size={leftWidth}
              isCollapsed={leftCollapsed}
              tabs={leftTabs}
              activeTabId={leftActiveTab}
              onSelectTab={(tabId) => {
                setLeftActiveTab(tabId);
                handleZoneClick("left");
              }}
              onToggleCollapse={() => setLeftCollapsed((c) => !c)}
              onMouseEnter={() => handleZoneMouseEnter("left")}
              onMouseLeave={() => handleZoneMouseLeave("left")}
              onClick={() => handleZoneClick("left")}
              className={activeLayer === "left" ? "dock-zone--elevated" : ""}
              onTearOffStart={(tabId, tabTitle, ox, oy) =>
                startTearOff(tabId, tabTitle, "outliner", ox, oy)
              }
            >
              {leftPanels[leftActiveTab] || (
                leftActiveTab === "outliner" ? (
                  <OutlinerTree
                    selectedId={selectedElement.id}
                    onSelectElement={(id, name) => setSelectedElement({ id, name })}
                    onTearOffItem={handleGenericTearOffStart}
                    onOpenItem={(id, title) => handleDockFullPage(id, title)}
                  />
                ) : (
                  <StateMatrixViewer />
                )
              )}
            </DockZone>

            {/* Left Vertical Splitter */}
            {!leftCollapsed && (
              <DockSplitter
                orientation="vertical"
                onResize={handleLeftResize}
                style={{ zIndex: activeLayer === "left" ? 29 : 28 }}
              />
            )}

            {/* Center Column: Center Stage */}
            <div
              className="dock-center-col"
              style={{ paddingBottom: bottomCollapsed ? 0 : `${bottomHeight}px` }}
            >
              {/* Center Stage (Confluence Whiteboard Canvas or Active Document) */}
              <div className="dock-zone dock-zone--center confluence-grid" style={{ position: "relative", flex: 1, minHeight: 0 }}>
                {/* Viewport Floating Action Pill (Save, Undo, Redo) in Top-Left Corner (only in Viewport mode) */}
                {centerActiveTab === "viewport" && (
                  <div className="viewport-floating-actions" role="toolbar" aria-label="Viewport History Actions">
                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={() => setIsDirty(false)}
                      title="Save Project (Ctrl+S)"
                    >
                      <Save size={14} style={{ color: isDirty ? "var(--accent-warning)" : "var(--text-secondary)" }} />
                      {isDirty && <span className="viewport-action-btn__dirty-dot" />}
                    </button>

                    <div className="viewport-action-divider" />

                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={() => {}}
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 size={14} />
                    </button>

                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={() => {}}
                      title="Redo (Ctrl+Shift+Z)"
                    >
                      <Redo2 size={14} />
                    </button>
                  </div>
                )}

                {/* Viewport Floating Action Pill (Project Settings) in Top-Right Corner */}
                {centerActiveTab === "viewport" && (
                  <div
                    className="viewport-floating-actions"
                    style={{ left: "auto", right: 12 }}
                    role="toolbar"
                    aria-label="Viewport Settings Action"
                  >
                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={() => {
                        setCenterActiveTab((prev) => (prev === "settings" ? "viewport" : "settings"));
                      }}
                      title="Project Settings"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                )}
                {centerPanels[centerActiveTab] || (
                  centerActiveTab === "settings" ? (
                    <ProjectSettings />
                  ) : (
                    <WhiteboardCanvas
                      deviceMode={deviceMode}
                      zoomLevel={zoomLevel}
                      onZoomChange={setZoomLevel}
                      onDropAsset={(asset) => {
                        setSelectedElement({ id: asset.id, name: asset.name });
                      }}
                    />
                  )
                )}
              </div>
            </div>

            {/* Right Vertical Splitter */}
            {!rightCollapsed && (
              <DockSplitter
                orientation="vertical"
                onResize={handleRightResize}
                style={{ zIndex: activeLayer === "right" ? 29 : 28 }}
              />
            )}

            {/* Right Dock Zone */}
            <DockZone
              zoneId="right"
              size={rightWidth}
              isCollapsed={rightCollapsed}
              tabs={rightTabs}
              activeTabId={rightActiveTab}
              onSelectTab={(tabId) => {
                setRightActiveTab(tabId);
                handleZoneClick("right");
              }}
              onToggleCollapse={() => setRightCollapsed((c) => !c)}
              onMouseEnter={() => handleZoneMouseEnter("right")}
              onMouseLeave={() => handleZoneMouseLeave("right")}
              onClick={() => handleZoneClick("right")}
              className={activeLayer === "right" ? "dock-zone--elevated" : ""}
            >
              {rightPanels[rightActiveTab] || (
                rightActiveTab === "details" ? (
                  <DetailsInspector
                    selectedElementId={selectedElement.id}
                    selectedElementName={selectedElement.name}
                    onOpenBlueprint={() => handleDockFullPage("blueprint", "Logic Blueprint")}
                  />
                ) : rightActiveTab === "tokens" ? (
                  <ProjectSettings />
                ) : (
                  <OutputConsole />
                )
              )}
            </DockZone>
          </>
        )}

        {/* Bottom Drawer Horizontal Alignment:
         * When Content Browser is selected in the bottom drawer, shift the drawer
         * to start at `leftWidth` so the Outliner on the left remains 100% visible
         * and accessible without obstruction.
         */}
        {(() => {
          const isBottomShifted = bottomActiveTab === "content-browser" && !leftCollapsed;
          const bottomShiftLeft = isBottomShifted ? leftWidth : 0;

          return (
            <>
              {/* Bottom Horizontal Splitter */}
              {!bottomCollapsed && (
                <DockSplitter
                  orientation="horizontal"
                  onResize={handleBottomResize}
                  style={{
                    position: "absolute",
                    left: `${bottomShiftLeft}px`,
                    right: 0,
                    bottom: `${bottomHeight}px`,
                    zIndex: activeLayer === "left" || activeLayer === "right" ? 21 : 30,
                  }}
                />
              )}

              {/* Bottom Drawer Zone */}
              <DockZone
                zoneId="bottom"
                size={bottomHeight}
                isCollapsed={bottomCollapsed || visibleBottomTabs.length === 0}
                tabs={bottomTabs}
                activeTabId={bottomActiveTab}
                onSelectTab={(tabId) => {
                  setBottomActiveTab(tabId);
                  handleZoneClick("bottom");
                }}
                onToggleCollapse={() => {
                  setBottomCollapsed((c) => {
                    if (c) handleZoneClick("bottom");
                    return !c;
                  });
                }}
                onMouseEnter={() => handleZoneMouseEnter("bottom")}
                onMouseLeave={() => handleZoneMouseLeave("bottom")}
                onClick={() => handleZoneClick("bottom")}
                className={activeLayer === "bottom" ? "dock-zone--elevated" : ""}
                onTearOffStart={handleBottomTearOffStart}
                style={{
                  position: "absolute",
                  left: `${bottomShiftLeft}px`,
                  right: 0,
                  bottom: 0,
                  width: isBottomShifted ? `calc(100% - ${bottomShiftLeft}px)` : "100%",
                  height: `${bottomHeight}px`,
                  zIndex: activeLayer === "left" || activeLayer === "right" ? 22 : 29,
                }}
              >
                {bottomPanels[bottomActiveTab] || (
                  bottomActiveTab === "content-browser" ? (
                    <ContentBrowser
                      selectedFolderId={selectedElement.id}
                      selectedFolderName={selectedElement.name}
                      onSelectFolder={(folderId, folderName) => setSelectedElement({ id: folderId, name: folderName })}
                      onOpenAsset={(id, title) => handleDockFullPage(id, title)}
                      onTearOffItem={handleGenericTearOffStart}
                    />
                  ) : bottomActiveTab === "blocks" ? (
                    <ContentBlockShelf />
                  ) : bottomActiveTab === "blueprint" ? (
                    <BlueprintCanvas onBackToViewport={() => setBottomCollapsed(true)} />
                  ) : (
                    <TimelineSequencer />
                  )
                )}
              </DockZone>

              {/* 2D Corner Splitters */}
              {!leftCollapsed && !bottomCollapsed && !isBottomShifted && (
                <DockCornerSplitter
                  corner="bottom-left"
                  left={leftWidth}
                  bottom={bottomHeight}
                  onResize={(deltaX, deltaY) => {
                    handleLeftResize(deltaX);
                    handleBottomResize(deltaY);
                  }}
                />
              )}

              {!rightCollapsed && !bottomCollapsed && (
                <DockCornerSplitter
                  corner="bottom-right"
                  right={rightWidth}
                  bottom={bottomHeight}
                  onResize={(deltaX, deltaY) => {
                    handleRightResize(deltaX);
                    handleBottomResize(deltaY);
                  }}
                />
              )}
            </>
          );
        })()}

        {/* Unreal Engine-Style Slide-Up Output Log Drawer (draggable for tear-off) */}
        {isOutputLogOpen && (
          <div className="output-log-drawer" role="region" aria-label="Unreal Engine Output Log Console">
            <div
              className="output-log-drawer__header output-log-drawer__header--draggable"
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const originX = e.clientX;
                const originY = e.clientY;
                let activated = false;

                const onMove = (moveEvt: PointerEvent) => {
                  if (activated) return;
                  const dx = moveEvt.clientX - originX;
                  const dy = moveEvt.clientY - originY;
                  if (Math.sqrt(dx * dx + dy * dy) >= 24) {
                    activated = true;
                    setIsOutputLogOpen(false);
                    startTearOff("console", "Output Log", "bottom-tab", originX, originY);
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                  }
                };

                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                };

                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp, { once: true });
              }}
            >
              <div className="output-log-drawer__title">
                <Terminal size={13} style={{ color: "var(--accent-primary)" }} />
                <span>Output Log</span>
                <span className="panel-header__badge">Drag to detach</span>
              </div>
              <div className="output-log-drawer__actions">
                <button
                  type="button"
                  className="panel-icon-btn"
                  onClick={() => setIsOutputLogOpen(false)}
                  title="Close Output Log Drawer"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <OutputConsole />
            </div>
          </div>
        )}

        {/* Tear-Off Drag Overlay (floating preview during drag) */}
        <TearOffDragOverlay state={tearOffState} />
      </div>

      {/* Bottom Status Bar with Drawer Controller */}
      <div className="dock-layout__statusbar">
        <StatusBar
          status={isPlaying ? "Live Simulation Running (120 FPS Wasm)" : "Engine Ready"}
          isDirty={isDirty}
          activeSelection={selectedElement.name}
          zoomLevel={zoomLevel}
          onZoomIn={() => setZoomLevel((z) => Math.min(z + 10, 250))}
          onZoomOut={() => setZoomLevel((z) => Math.max(z - 10, 25))}
          onZoomReset={() => setZoomLevel(100)}
          isBottomOpen={!bottomCollapsed}
          bottomActiveTab={bottomActiveTab}
          onToggleBottom={() => {
            setBottomCollapsed((prev) => {
              if (prev) {
                handleZoneClick("bottom");
              }
              return !prev;
            });
          }}
          isOutputLogOpen={isOutputLogOpen}
          onToggleOutputLog={() => setIsOutputLogOpen((prev) => !prev)}
          onTearOffLog={(originX, originY) => {
            setIsOutputLogOpen(false);
            startTearOff("console", "Output Log", "bottom-tab", originX, originY);
          }}
        />
      </div>
    </div>
  );
};
