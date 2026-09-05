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

import React, { useState } from "react";
import "@/editor/styles/dock.css";
import { DockZone } from "./DockZone";
import { DockSplitter } from "./DockSplitter";
import { DockTabBar } from "./DockTabBar";
import { StatusBar } from "./StatusBar";
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

  /* --------------------------------------------------------------------------
   * Active Tab State
   * -------------------------------------------------------------------------- */
  const [leftActiveTab, setLeftActiveTab] = useState("outliner");
  const [rightActiveTab, setRightActiveTab] = useState("details");
  const [bottomActiveTab, setBottomActiveTab] = useState("console");
  const [centerActiveTab, setCenterActiveTab] = useState("viewport");

  const [zoomLevel, setZoomLevel] = useState(100);

  /* --------------------------------------------------------------------------
   * Default Tab Configurations (From PANELS.md)
   * -------------------------------------------------------------------------- */
  const leftTabs: PanelTab[] = [
    { id: "outliner", title: "Outliner", closable: false },
    { id: "content-browser", title: "Content Browser", closable: true },
    { id: "my-blueprint", title: "My Blueprint", closable: true },
  ];

  const rightTabs: PanelTab[] = [
    { id: "details", title: "Details", closable: false },
    { id: "tokens", title: "Tokens", closable: true },
    { id: "validation", title: "Errors (0)", closable: true },
  ];

  const bottomTabs: PanelTab[] = [
    { id: "console", title: "Console", closable: false },
    { id: "blueprint", title: "Logic Blueprint", closable: true },
    { id: "timeline", title: "Sequencer", closable: true },
    { id: "ai-copilot", title: "AI Studio", closable: true },
  ];

  const centerTabs: PanelTab[] = [
    { id: "viewport", title: "Viewport (Desktop 1440px)", closable: false },
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
      {/* Top Header Slot (StudioHeader & Toolbar in Phase 1.4) */}
      <div className="dock-layout__header">
        {headerSlot || (
          <header
            style={{
              height: "var(--header-height)",
              background: "var(--surface-toolbar)",
              borderBottom: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 var(--space-lg)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
              <span style={{ fontWeight: "var(--font-bold)", fontSize: "var(--text-md)" }}>
                ⚡ Visual Web Application Engine
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                MyProject.uweb
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <span className="statusbar__badge">Phase 1.3 Active</span>
            </div>
          </header>
        )}
      </div>

      {/* Main Dock Body (Left, Center Column, Right) */}
      <div className="dock-layout__body">
        {/* Left Dock Zone */}
        <DockZone
          zoneId="left"
          size={leftWidth}
          isCollapsed={leftCollapsed}
          tabs={leftTabs}
          activeTabId={leftActiveTab}
          onSelectTab={setLeftActiveTab}
          onToggleCollapse={() => setLeftCollapsed((c) => !c)}
        >
          {leftPanels[leftActiveTab] || (
            <div style={{ padding: "var(--space-lg)", color: "var(--text-secondary)" }}>
              <h3 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-sm)" }}>
                {leftTabs.find((t) => t.id === leftActiveTab)?.title}
              </h3>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Docked panel placeholder. Full component tree will populate in Phase 1.6.
              </p>
            </div>
          )}
        </DockZone>

        {/* Left Vertical Splitter */}
        {!leftCollapsed && (
          <DockSplitter orientation="vertical" onResize={handleLeftResize} />
        )}

        {/* Center Column: Center Stage + Bottom Zone */}
        <div className="dock-center-col">
          {/* Center Tab Bar */}
          <DockTabBar
            zoneId="center"
            tabs={centerTabs}
            activeTabId={centerActiveTab}
            onSelectTab={setCenterActiveTab}
          />

          {/* Center Stage (Confluence Whiteboard Canvas) */}
          <div className="dock-zone dock-zone--center confluence-grid">
            {centerPanels[centerActiveTab] || (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "var(--space-md)",
                }}
              >
                <div
                  style={{
                    background: "var(--surface-panel-solid)",
                    padding: "var(--space-2xl)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: "var(--shadow-lg)",
                    border: "1px solid var(--border-default)",
                    textAlign: "center",
                    maxWidth: "520px",
                  }}
                  className="anim-scale-in"
                >
                  <h2 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-xs)" }}>
                    Confluence Canvas & Viewport Stage
                  </h2>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-lg)" }}>
                    Infinite dot-grid workspace with C++ cable physics ready.
                    Try dragging the splitters to resize the left, right, and bottom panels.
                  </p>
                  <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "center" }}>
                    <kbd>Drag Splitters</kbd>
                    <kbd>Click Collapse Arrows</kbd>
                    <kbd>Switch Tabs</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Vertical Splitter */}
        {!rightCollapsed && (
          <DockSplitter orientation="vertical" onResize={handleRightResize} />
        )}

        {/* Right Dock Zone */}
        <DockZone
          zoneId="right"
          size={rightWidth}
          isCollapsed={rightCollapsed}
          tabs={rightTabs}
          activeTabId={rightActiveTab}
          onSelectTab={setRightActiveTab}
          onToggleCollapse={() => setRightCollapsed((c) => !c)}
        >
          {rightPanels[rightActiveTab] || (
            <div style={{ padding: "var(--space-lg)", color: "var(--text-secondary)" }}>
              <h3 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-sm)" }}>
                {rightTabs.find((t) => t.id === rightActiveTab)?.title}
              </h3>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Details & Inspector panel placeholder. Property inputs will populate in Phase 1.6.
              </p>
            </div>
          )}
        </DockZone>
      </div>

      {/* Edge-to-Edge Bottom Horizontal Splitter */}
      {!bottomCollapsed && (
        <DockSplitter orientation="horizontal" onResize={handleBottomResize} />
      )}

      {/* Edge-to-Edge Bottom Drawer Zone */}
      <DockZone
        zoneId="bottom"
        size={bottomHeight}
        isCollapsed={bottomCollapsed}
        tabs={bottomTabs}
        activeTabId={bottomActiveTab}
        onSelectTab={setBottomActiveTab}
        onToggleCollapse={() => setBottomCollapsed((c) => !c)}
      >
        {bottomPanels[bottomActiveTab] || (
          <div style={{ padding: "var(--space-md)", color: "var(--text-secondary)" }}>
            <h4 style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-xs)" }}>
              {bottomTabs.find((t) => t.id === bottomActiveTab)?.title} Panel
            </h4>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              [Output Log] Engine initialized in 48ms • Wasm runtime linked • 0 errors
            </p>
          </div>
        )}
      </DockZone>

      {/* Bottom Status Bar with Drawer Controller */}
      <div className="dock-layout__statusbar">
        <StatusBar
          zoomLevel={zoomLevel}
          onZoomIn={() => setZoomLevel((z) => Math.min(z + 10, 250))}
          onZoomOut={() => setZoomLevel((z) => Math.max(z - 10, 25))}
          onZoomReset={() => setZoomLevel(100)}
          isBottomOpen={!bottomCollapsed}
          bottomActiveTab={bottomActiveTab}
          onToggleBottom={() => setBottomCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  );
};
