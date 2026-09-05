"use client";

/**
 * ============================================================================
 * STATUS BAR COMPONENT WITH BOTTOM DRAWER TRIGGERS
 * ============================================================================
 * UI Element: Bottom Status Bar & Bottom Panel Controller
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Hosts bottom drawer triggers for all 4 panels:
 *       - Console
 *       - Logic Blueprint
 *       - Sequencer
 *       - AI Studio
 *       Plus the bring-up logo toggle, engine status, 120 FPS Wasm stats, and zoom controls.
 * Styling Source: `@/editor/styles/dock.css` (`.statusbar`)
 * ============================================================================
 */

import React from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Activity,
  Cpu,
  PanelBottom,
  ChevronUp,
  ChevronDown,
  Terminal,
  Network,
  Film,
  Sparkles,
} from "lucide-react";

interface StatusBarProps {
  status?: string;
  isDirty?: boolean;
  activeSelection?: string | null;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  fps?: number;
  memoryUsage?: string;
  isBottomOpen?: boolean;
  bottomActiveTab?: string;
  onToggleBottom?: (tabId?: string) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status = "Engine Ready",
  isDirty = false,
  activeSelection = "No selection",
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  fps = 120,
  memoryUsage = "38 MB",
  isBottomOpen = true,
  bottomActiveTab = "console",
  onToggleBottom,
}) => {
  const bottomTabs = [
    { id: "console", label: "Console", icon: <Terminal size={12} /> },
    { id: "blueprint", label: "Logic Blueprint", icon: <Network size={12} /> },
    { id: "timeline", label: "Sequencer", icon: <Film size={12} /> },
    { id: "ai-copilot", label: "AI Studio", icon: <Sparkles size={12} style={{ color: "#8B5CF6" }} /> },
  ];

  return (
    <footer className="statusbar" role="contentinfo" aria-label="Engine Status Bar">
      {/* Left section: Drawer trigger logo + 4 panel buttons + Status */}
      <div className="statusbar__left">
        {/* Bring-up toggle logo */}
        <div className="statusbar__drawer-group">
          <button
            type="button"
            className={`statusbar__drawer-trigger ${
              isBottomOpen ? "statusbar__drawer-trigger--active" : ""
            }`}
            onClick={() => onToggleBottom && onToggleBottom()}
            title={isBottomOpen ? "Collapse Bottom Panel" : "Bring Up Bottom Panel"}
          >
            <PanelBottom size={13} />
            {isBottomOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>

          {/* 4 Bottom Panel Buttons */}
          {bottomTabs.map((tab) => {
            const isActive = isBottomOpen && bottomActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`statusbar__tab-btn ${isActive ? "statusbar__tab-btn--active" : ""}`}
                onClick={() => onToggleBottom && onToggleBottom(tab.id)}
                title={`Open ${tab.label}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Engine status indicator */}
        <div className="statusbar__item">
          <span
            className={`statusbar__indicator ${
              isDirty ? "statusbar__indicator--dirty" : ""
            }`}
            title={isDirty ? "Unsaved changes" : "All changes saved"}
          />
          <span>{status}</span>
        </div>

        <div className="statusbar__item">
          <span className="statusbar__badge">AST v1.0</span>
        </div>

        {activeSelection && (
          <div className="statusbar__item">
            <span style={{ color: "var(--text-tertiary)" }}>Target:</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              {activeSelection}
            </span>
          </div>
        )}
      </div>

      {/* Center section: Performance & Diagnostics */}
      <div className="statusbar__center">
        <div className="statusbar__item">
          <Activity size={12} style={{ color: "var(--accent-success)" }} />
          <span>{fps} FPS (Wasm)</span>
        </div>
        <div className="statusbar__item">
          <Cpu size={12} style={{ color: "var(--text-tertiary)" }} />
          <span>{memoryUsage}</span>
        </div>
      </div>

      {/* Right section: Zoom controls */}
      <div className="statusbar__right">
        <div className="statusbar__item">
          <button
            type="button"
            className="statusbar__zoom-btn"
            onClick={onZoomOut}
            title="Zoom Out (Ctrl -)"
          >
            <ZoomOut size={12} />
          </button>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              minWidth: "40px",
              textAlign: "center",
              cursor: "pointer",
            }}
            onClick={onZoomReset}
            title="Reset Zoom (Ctrl 0)"
          >
            {zoomLevel}%
          </span>
          <button
            type="button"
            className="statusbar__zoom-btn"
            onClick={onZoomIn}
            title="Zoom In (Ctrl +)"
          >
            <ZoomIn size={12} />
          </button>
          <button
            type="button"
            className="statusbar__zoom-btn"
            onClick={onZoomReset}
            title="Fit to Stage"
          >
            <Maximize2 size={11} />
          </button>
        </div>
      </div>
    </footer>
  );
};
