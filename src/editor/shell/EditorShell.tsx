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
import { useTearOff } from "@/core/events/useTearOff";
import { useTearOffChannel } from "@/core/events/useTearOffChannel";
import { Save, Undo2, Redo2, Terminal, X } from "lucide-react";
import { PanelTab } from "@/core/types/workspace";

interface EditorShellProps {
  headerSlot?: React.ReactNode;
  leftPanels?: Record<string, React.ReactNode>;
  rightPanels?: Record<string, React.ReactNode>;
  bottomPanels?: Record<string, React.ReactNode>;
  centerPanels?: Record<string, React.ReactNode>;
}

export const EditorShell: React.FC<EditorShellProps> = ({
  headerSlot,
  leftPanels = {},
  rightPanels = {},
  bottomPanels = {},
  centerPanels = {},
}) => {
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
  const [bottomActiveTab, setBottomActiveTab] = useState("blueprint");
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
  const [fullPagePanel, setFullPagePanel] = useState<{
    panelId: string;
    title: string;
  } | null>(null);

  /** Store pre-full-page layout state for restoration on close */
  const preFullPageRef = React.useRef<{
    leftCollapsed: boolean;
    bottomCollapsed: boolean;
    bottomActiveTab: string;
  } | null>(null);

  /** All bottom-drawer panel definitions (before filtering) */
  const ALL_BOTTOM_TABS: PanelTab[] = [
    { id: "blueprint", title: "Logic Blueprint", closable: false },
    { id: "sequencer", title: "Timeline Sequencer", closable: false },
  ];

  /** Map panel IDs to titles for tear-off (includes console for output log) */
  const PANEL_TITLES: Record<string, string> = {
    blueprint: "Logic Blueprint",
    sequencer: "Timeline Sequencer",
    console: "Output Log",
  };

  const handleDockFullPage = useCallback(
    (panelId: string, panelTitle: string) => {
      // Save current layout state before going full-page
      preFullPageRef.current = {
        leftCollapsed: leftCollapsed,
        bottomCollapsed: bottomCollapsed,
        bottomActiveTab: bottomActiveTab,
      };
      setFullPagePanel({ panelId, title: panelTitle });
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
    [leftCollapsed, bottomCollapsed, bottomActiveTab]
  );

  const handleOpenNewTab = useCallback(
    (panelId: string, panelTitle: string) => {
      // Handle output log special case
      if (panelId === "console") {
        setIsOutputLogOpen(false);
      }
      setDetachedPanels((prev) => new Set(prev).add(panelId));
      // Open in a new browser tab — must be synchronous from user gesture
      const url = `${window.location.origin}/editor/detach/${panelId}`;
      window.open(url, `detach-${panelId}`, "noopener");
      // If all bottom tabs are now detached or full-paged, collapse the drawer
      const remainingTabs = ALL_BOTTOM_TABS.filter(
        (t) => t.id !== panelId && !detachedPanels.has(t.id) && fullPagePanel?.panelId !== t.id
      );
      if (remainingTabs.length === 0) {
        setBottomCollapsed(true);
      } else {
        // Switch active tab to first remaining
        setBottomActiveTab(remainingTabs[0].id);
      }
    },
    [detachedPanels, fullPagePanel]
  );

  const handleCloseFullPage = useCallback(() => {
    const panelId = fullPagePanel?.panelId;
    setFullPagePanel(null);
    // Restore pre-full-page layout state
    if (preFullPageRef.current) {
      setLeftCollapsed(preFullPageRef.current.leftCollapsed);
      setBottomCollapsed(preFullPageRef.current.bottomCollapsed);
      setBottomActiveTab(preFullPageRef.current.bottomActiveTab);
      preFullPageRef.current = null;
    } else if (panelId) {
      setBottomCollapsed(false);
      setBottomActiveTab(panelId);
    }
  }, [fullPagePanel]);

  // Tear-off drag hook
  const { tearOffState, startTearOff } = useTearOff({
    onDockFullPage: handleDockFullPage,
    onOpenNewTab: handleOpenNewTab,
  });

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
  const visibleBottomTabs = ALL_BOTTOM_TABS.filter(
    (t) => !detachedPanels.has(t.id) && fullPagePanel?.panelId !== t.id
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
      if (tabId === "console") {
        setIsOutputLogOpen(true);
        return;
      }
      setBottomCollapsed(false);
      setBottomActiveTab(tabId);
      handleZoneClick("bottom");
    } else if (zone === "center") {
      setCenterActiveTab(tabId);
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
      setBottomActiveTab("blueprint");
    } else if (preset === "design") {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setBottomCollapsed(true);
      setLeftWidth(340);
      setRightWidth(360);
      setLeftActiveTab("outliner");
      setRightActiveTab("details");
    } else if (preset === "logic") {
      setLeftCollapsed(true);
      setRightCollapsed(true);
      setBottomCollapsed(false);
      setBottomHeight(380);
      setBottomActiveTab("blueprint");
    } else if (preset === "data") {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setBottomCollapsed(false);
      setCenterActiveTab("er-modeler");
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
    { id: "content-browser", title: "Content Browser", closable: false },
  ];

  const rightTabs: PanelTab[] = [
    { id: "details", title: "Details", closable: false },
    { id: "tokens", title: "Tokens", closable: true },
    { id: "validation", title: "Errors (0)", closable: true },
  ];

  // Bottom tabs now come from visibleBottomTabs (filtered by tear-off state)
  const bottomTabs = visibleBottomTabs;

  const centerTabs: PanelTab[] = [
    { id: "viewport", title: "Viewport (Desktop 1440px)", closable: false },
    { id: "blueprint", title: "Logic Blueprint", closable: true },
    { id: "settings", title: "Project Settings", closable: true },
    { id: "whiteboard", title: "Whiteboard", closable: true },
    { id: "er-modeler", title: "Database Schema", closable: true },
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

  return (
    <div className="dock-layout">
      {/* Top Header Slot: Single Streamlined StudioHeader */}
      <div className="dock-layout__header">
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
          />
        )}
      </div>

      {/* Main Dock Body (Left, Center Column, Right, and Overlapping Bottom Drawer) */}
      <div className="dock-layout__body">
        {/* Full-Page Dock Mode — takes over entire body, outliner minimizes on left, asset details on right */}
        {fullPagePanel ? (
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
                  <ContentBrowser
                    onTearOffItem={handleGenericTearOffStart}
                    onOpenAsset={(id, title) => handleDockFullPage(id, title)}
                  />
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

            {/* Center fills wide workspace, right panel stays for context-specific asset details */}
            <div
              className="dock-center-col"
              style={{ paddingBottom: 0 }}
            >
              <FullPageDock
                panelId={fullPagePanel.panelId}
                panelTitle={fullPagePanel.title}
                isDirty={isDirty}
                onSave={() => setIsDirty(false)}
                onUndo={() => {}}
                onRedo={() => {}}
                onClose={handleCloseFullPage}
              >
                {fullPagePanel.panelId === "blueprint" ? (
                  <BlueprintCanvas />
                ) : fullPagePanel.panelId === "sequencer" ? (
                  <TimelineSequencer />
                ) : fullPagePanel.panelId === "console" ? (
                  <OutputConsole />
                ) : (
                  <AssetFileEditor
                    assetId={fullPagePanel.panelId}
                    assetTitle={fullPagePanel.title}
                    isDirty={isDirty}
                    onSave={() => setIsDirty(false)}
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

            {/* Right Dock Zone displaying the Details OF THE OPENED FILE/TAB (Unreal Engine style) */}
            <DockZone
              zoneId="right"
              size={rightWidth}
              isCollapsed={rightCollapsed}
              tabs={[
                { id: "asset-details", title: `${fullPagePanel.title} Details`, closable: false },
                { id: "tokens", title: "Tokens", closable: true },
              ]}
              activeTabId="asset-details"
              onSelectTab={() => {
                handleZoneClick("right");
              }}
              onToggleCollapse={() => setRightCollapsed((c) => !c)}
              onMouseEnter={() => handleZoneMouseEnter("right")}
              onMouseLeave={() => handleZoneMouseLeave("right")}
              onClick={() => handleZoneClick("right")}
              className={activeLayer === "right" ? "dock-zone--elevated" : ""}
            >
              <AssetDetailsInspector
                panelId={fullPagePanel.panelId}
                panelTitle={fullPagePanel.title}
              />
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
                  <ContentBrowser
                    onTearOffItem={handleGenericTearOffStart}
                    onOpenAsset={(id, title) => handleDockFullPage(id, title)}
                  />
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
              {/* Center Tab Bar */}
              <DockTabBar
                zoneId="center"
                tabs={centerTabs}
                activeTabId={centerActiveTab}
                onSelectTab={setCenterActiveTab}
              />

              {/* Center Stage (Confluence Whiteboard Canvas) */}
              <div className="dock-zone dock-zone--center confluence-grid" style={{ position: "relative" }}>
                {/* Viewport Floating Action Pill (Save, Undo, Redo) in Top-Left Corner */}
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
                {centerPanels[centerActiveTab] || (
                  centerActiveTab === "viewport" ? (
                    <WhiteboardCanvas
                      deviceMode={deviceMode}
                      zoomLevel={zoomLevel}
                      onZoomChange={setZoomLevel}
                    />
                  ) : centerActiveTab === "blueprint" ? (
                    <BlueprintCanvas />
                  ) : centerActiveTab === "settings" ? (
                    <ProjectSettings />
                  ) : (
                    <WhiteboardCanvas
                      deviceMode={deviceMode}
                      zoomLevel={zoomLevel}
                      onZoomChange={setZoomLevel}
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
                    onOpenBlueprint={() => handleOpenPanel("bottom", "blueprint")}
                  />
                ) : rightActiveTab === "tokens" ? (
                  <ProjectSettings />
                ) : (
                  <OutputConsole />
                )
              )}
            </DockZone>

        {/* Edge-to-Edge Bottom Horizontal Splitter */}
        {!bottomCollapsed && (
          <DockSplitter
            orientation="horizontal"
            onResize={handleBottomResize}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: `${bottomHeight}px`,
              zIndex: activeLayer === "left" || activeLayer === "right" ? 21 : 30,
            }}
          />
        )}

        {/* Edge-to-Edge Bottom Drawer Zone */}
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
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: `${bottomHeight}px`,
            zIndex: activeLayer === "left" || activeLayer === "right" ? 22 : 29,
          }}
        >
          {bottomPanels[bottomActiveTab] || (
            bottomActiveTab === "blueprint" ? (
              <BlueprintCanvas />
            ) : (
              <TimelineSequencer />
            )
          )}
        </DockZone>

        {/* 2D Corner Splitters (Intersection points where side panels meet bottom drawer) */}
        {!leftCollapsed && !bottomCollapsed && (
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
                  if (Math.sqrt(dx * dx + dy * dy) >= 40) {
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

          </>
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
