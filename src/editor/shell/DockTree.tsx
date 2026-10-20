"use client";

/**
 * The dock body (moved out of `EditorShell.tsx`, Phase 14): the stage, the
 * right dock, the bottom drawer, their splitters, the AI dock and the Output
 * Log drawer, drawn from the workspace layout. Panels come from `PanelHost`.
 * Two shapes: normal (stage + docks) and full-page (a tab strip takes the
 * stage and Details swaps to the open asset's details).
 */
import React, { useMemo, type RefObject } from "react";
import { DockZone } from "./DockZone";
import { DockSplitter } from "./DockSplitter";
import { DockCornerSplitter } from "./DockCornerSplitter";
import { FullPageDock } from "./FullPageDock";
import { TearOffDragOverlay } from "./TearOffDragOverlay";
import { AiDockColumn } from "./AiDockColumn";
import { OutputLogDrawer } from "./OutputLogDrawer";
import { PanelHost } from "./panels/PanelHost";
import { rightTabsFor } from "./dockTabs";
import { edition } from "@/core/flags";
import { LEFT_TABS, normalizeInspectorTab, normalizeLeftTab } from "@/core/workspace/layout";
import { ZONE_LIMITS } from "@/core/workspace/layout";
import type { PanelContext } from "./panels/context";
import type { Workspace } from "./hooks/useWorkspace";
import type { AiDock } from "./hooks/useAiDock";
import type { FullPageDock as FullPageDockState } from "./hooks/useFullPageDock";
import type { useDockLayers } from "./hooks/useDockLayers";

interface DockTreeProps {
  ws: Workspace;
  layers: ReturnType<typeof useDockLayers>;
  ai: AiDock;
  fp: FullPageDockState;
  context: PanelContext;
  /** Panels a caller of `EditorShell` supplied; they win over the registry. */
  overrides: { right: Record<string, React.ReactNode>; bottom: Record<string, React.ReactNode>; center: Record<string, React.ReactNode> };
  /** The floating controls drawn over the stage in the normal layout. */
  stageChrome: React.ReactNode;
  isDirty: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  rightZoneRef: RefObject<HTMLElement | null>;
  bottomZoneRef: RefObject<HTMLElement | null>;
  aiZoneRef: RefObject<HTMLDivElement | null>;
}

export const DockTree: React.FC<DockTreeProps> = ({
  ws,
  layers,
  ai,
  fp,
  context,
  overrides,
  stageChrome,
  isDirty,
  onSave,
  onUndo,
  onRedo,
  rightZoneRef,
  bottomZoneRef,
  aiZoneRef,
}) => {
  const { rightWidth, bottomHeight, rightCollapsed, bottomCollapsed, rightActiveTab, bottomActiveTab, centerActiveTab } = ws;
  const { activeLayer, handleZoneMouseEnter, handleZoneMouseLeave, handleZoneClick } = layers;
  const { currentFullPagePanel, currentTabId } = fp;

  const commitRightWidth = ws.setRightWidth;
  const commitBottomHeight = ws.setBottomHeight;
  const commitRightAndBottom = React.useCallback(
    ({ right, bottom }: { right: number; bottom: number }) => {
      ws.setRightWidth(right);
      ws.setBottomHeight(bottom);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ws.setRightWidth, ws.setBottomHeight],
  );

  // Bottom tabs: those still attached, plus the debug trace tab while it is active.
  const bottomTabs = useMemo(() => {
    const tabs = [...fp.visibleBottomTabs];
    if (bottomActiveTab === "trace" && !tabs.some((t) => t.id === "trace")) {
      tabs.push({ id: "trace", title: "Execution Trace (Debug)", closable: true });
    }
    return tabs;
  }, [fp.visibleBottomTabs, bottomActiveTab]);

  const rightTabs = useMemo(() => rightTabsFor(edition), []);
  const leftZoneRef = React.useRef<HTMLElement | null>(null);
  const leftTabs = useMemo(() => LEFT_TABS.map((t) => ({ id: t.id, title: t.title, closable: false })), []);
  const leftId = normalizeLeftTab(ws.leftActiveTab);
  const rightId = normalizeInspectorTab(rightActiveTab, edition);
  const bottomIds = ["content-browser", "export-code", "trace", "blueprint", "curves", "timeline"];
  const bottomId = bottomIds.includes(bottomActiveTab) ? bottomActiveTab : "sequencer";
  const showingStageInFullPage = currentTabId === "viewport" || currentFullPagePanel?.panelId === "content-browser";

  const rightSplitter = !rightCollapsed && (
    <DockSplitter
      orientation="vertical"
      targetRef={rightZoneRef}
      value={rightWidth}
      min={ZONE_LIMITS.right.min}
      max={ZONE_LIMITS.right.max}
      invert
      onCommit={commitRightWidth}
      style={{ zIndex: activeLayer === "right" ? 29 : 28 }}
    />
  );

  const rightZone = (tabs: typeof rightTabs, activeTabId: string, content: React.ReactNode) => (
    <DockZone
      ref={rightZoneRef}
      zoneId="right"
      size={rightWidth}
      isCollapsed={rightCollapsed}
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={(tabId) => {
        ws.setRightActiveTab(tabId);
        handleZoneClick("right");
      }}
      onToggleCollapse={() => ws.setRightCollapsed((c) => !c)}
      onMouseEnter={() => handleZoneMouseEnter("right")}
      onMouseLeave={() => handleZoneMouseLeave("right")}
      onClick={() => handleZoneClick("right")}
      className={activeLayer === "right" ? "dock-zone--elevated" : ""}
    >
      {content}
    </DockZone>
  );

  return (
    <div className="dock-layout__body">
      {currentFullPagePanel ? (
        <>
          {/* LayoutAI docked on LEFT (beside Outliner) — Full-Page Layout */}
          <AiDockColumn side="left" ai={ai} layers={layers} zoneRef={aiZoneRef} />

          {/* Center fills the wide workspace with the browser-like multi-tab FullPageDock */}
          <div className="dock-center-col" style={{ paddingBottom: 0 }}>
            <FullPageDock
              tabs={fp.fullPagePanels.map((p) => ({ panelId: p.panelId, panelTitle: p.title, dragSource: p.dragSource, isDirty }))}
              activeTabId={currentTabId || currentFullPagePanel.panelId}
              onSelectTab={(panelId) => {
                fp.setActiveFullPageTabId(panelId);
                const idx = fp.fullPagePanels.findIndex((p) => p.panelId === panelId);
                if (idx >= 0) fp.setActiveFullPageIndex(idx);
              }}
              onCloseTab={fp.handleCloseFullPageTab}
              onTabDragStart={fp.handleFullPageTabDragStart}
              isDirty={isDirty}
              onSave={onSave}
              onUndo={onUndo}
              onRedo={onRedo}
              onCloseAll={fp.handleCloseAllFullPage}
              onOpenAsset={(id, title) => fp.handleDockFullPage(id, title)}
            >
              <PanelHost
                zone="fullpage"
                panelId={currentTabId === "viewport" ? "viewport" : currentFullPagePanel.panelId}
                title={currentFullPagePanel.title}
                context={context}
              />
            </FullPageDock>
          </div>

          {/* LayoutAI docked on RIGHT (beside Details) — Full-Page Layout */}
          <AiDockColumn side="right" ai={ai} layers={layers} zoneRef={aiZoneRef} />
          {rightSplitter}
          {rightZone(
            showingStageInFullPage
              ? rightTabs
              : [
                  { id: "asset-details", title: `${currentFullPagePanel.title} Details`, closable: false },
                  { id: "tokens", title: "Tokens", closable: true },
                ],
            showingStageInFullPage ? rightId : "asset-details",
            showingStageInFullPage ? (
              <PanelHost zone="right" panelId={rightId} context={context} override={overrides.right[rightActiveTab]} />
            ) : (
              <PanelHost zone="right" panelId="asset-details" title={currentFullPagePanel.title} context={context} />
            ),
          )}
        </>
      ) : (
        <>
          {/* Layers (Phase 32): the layer tree, left of the stage */}
          <DockZone
            ref={leftZoneRef}
            zoneId="left"
            size={ws.leftWidth}
            isCollapsed={ws.leftCollapsed}
            tabs={leftTabs}
            activeTabId={leftId}
            onSelectTab={(tabId) => {
              ws.setLeftActiveTab(tabId);
              handleZoneClick("left");
            }}
            onToggleCollapse={() => ws.setLeftCollapsed((c) => !c)}
            onMouseEnter={() => handleZoneMouseEnter("left")}
            onMouseLeave={() => handleZoneMouseLeave("left")}
            onClick={() => handleZoneClick("left")}
            className={activeLayer === "left" ? "dock-zone--elevated" : ""}
          >
            <PanelHost zone="left" panelId={leftId} context={context} />
          </DockZone>
          {!ws.leftCollapsed && (
            <DockSplitter
              orientation="vertical"
              targetRef={leftZoneRef}
              value={ws.leftWidth}
              min={ZONE_LIMITS.left.min}
              max={ZONE_LIMITS.left.max}
              onCommit={(v) => ws.setZoneSizeLeft(v)}
              style={{ zIndex: activeLayer === "left" ? 29 : 28 }}
            />
          )}

          {/* LayoutAI docked on LEFT (beside Layers) — Normal Layout */}
          <AiDockColumn side="left" ai={ai} layers={layers} zoneRef={aiZoneRef} />

          {/* Center Column: the stage */}
          <div className="dock-center-col" style={{ paddingBottom: bottomCollapsed ? 0 : `${bottomHeight}px` }}>
            <div className="dock-zone dock-zone--center confluence-grid" style={{ position: "relative", flex: 1, minHeight: 0 }}>
              {stageChrome}
              <PanelHost zone="center" panelId={centerActiveTab === "settings" ? "settings" : "viewport"} context={context} override={overrides.center[centerActiveTab]} />
            </div>
          </div>

          {/* LayoutAI docked on RIGHT (beside Details) — Normal Layout */}
          <AiDockColumn side="right" ai={ai} layers={layers} zoneRef={aiZoneRef} />
          {rightSplitter}
          {rightZone(
            rightTabs,
            rightId,
            <PanelHost zone="right" panelId={rightId} context={context} override={overrides.right[rightActiveTab]} />,
          )}
        </>
      )}

      {/* Bottom Horizontal Splitter */}
      {!bottomCollapsed && (
        <DockSplitter
          orientation="horizontal"
          targetRef={bottomZoneRef}
          value={bottomHeight}
          min={ZONE_LIMITS.bottom.min}
          max={ZONE_LIMITS.bottom.max}
          invert
          onCommit={commitBottomHeight}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `${bottomHeight}px`,
            zIndex: activeLayer === "right" || activeLayer === "ai" ? 21 : 30,
          }}
        />
      )}

      {/* Bottom Drawer Zone */}
      <DockZone
        ref={bottomZoneRef}
        zoneId="bottom"
        size={bottomHeight}
        isCollapsed={bottomCollapsed || fp.visibleBottomTabs.length === 0}
        tabs={bottomTabs}
        activeTabId={bottomActiveTab}
        onSelectTab={(tabId) => {
          ws.setBottomActiveTab(tabId);
          handleZoneClick("bottom");
        }}
        onToggleCollapse={() => {
          ws.setBottomCollapsed((c) => {
            if (c) handleZoneClick("bottom");
            return !c;
          });
        }}
        onMouseEnter={() => handleZoneMouseEnter("bottom")}
        onMouseLeave={() => handleZoneMouseLeave("bottom")}
        onClick={() => handleZoneClick("bottom")}
        className={activeLayer === "bottom" ? "dock-zone--elevated" : ""}
        onTearOffStart={fp.handleBottomTearOffStart}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: `${bottomHeight}px`,
          zIndex: activeLayer === "right" || activeLayer === "ai" ? 22 : 29,
        }}
      >
        <PanelHost zone="bottom" panelId={bottomId} context={context} override={overrides.bottom[bottomActiveTab]} />
      </DockZone>

      {/* 2D Corner Splitter (Bottom-Right only, left dock is removed) */}
      {!rightCollapsed && !bottomCollapsed && (
        <DockCornerSplitter
          corner="bottom-right"
          right={rightWidth}
          bottom={bottomHeight}
          rightRef={rightZoneRef}
          bottomRef={bottomZoneRef}
          rightMin={ZONE_LIMITS.right.min}
          rightMax={ZONE_LIMITS.right.max}
          bottomMin={ZONE_LIMITS.bottom.min}
          bottomMax={ZONE_LIMITS.bottom.max}
          onCommit={commitRightAndBottom}
        />
      )}

      {ws.isOutputLogOpen && (
        <OutputLogDrawer
          context={context}
          onClose={() => ws.setIsOutputLogOpen(false)}
          onTearOff={(x, y) => fp.startTearOff("console", "Output Log", "bottom-tab", x, y)}
        />
      )}

      {/* Tear-Off Drag Overlay (floating preview during drag) */}
      <TearOffDragOverlay state={fp.tearOffState} />
    </div>
  );
};
