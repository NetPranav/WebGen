"use client";

/**
 * ============================================================================
 * FULL-PAGE DOCK COMPONENT
 * ============================================================================
 * UI Element: Unreal Engine-Style Full-Page Panel Dock
 * Screen / Scope: Center Stage Area (`/editor`)
 * Role: When a panel is docked full-page (dragged to header zone), this component
 *       replaces the normal viewport with a full-height panel view and a UE-style
 *       file tab bar containing Save, Undo, Redo, panel name, and Close controls.
 * Styling Source: `@/editor/styles/fullpage-dock.css`
 *
 * ARCHITECTURE NOTE:
 * This component receives the panel component as `children` and renders it below
 * the file tab bar. The file tab bar sits directly below the two top navigation bars.
 * ============================================================================
 */

import React from "react";
import { Save, Undo2, Redo2, X, Workflow, Film, Terminal, FileCode, Database, Folder, Monitor } from "lucide-react";
import type { TearOffDragSource } from "@/core/events/useTearOff";
import "@/editor/styles/fullpage-dock.css";

export interface FullPageTabItem {
  panelId: string;
  panelTitle: string;
  dragSource?: TearOffDragSource;
  isDirty?: boolean;
}

interface FullPageDockProps {
  tabs: FullPageTabItem[];
  activeTabId: string;
  onSelectTab: (panelId: string) => void;
  onCloseTab: (panelId: string) => void;
  onOpenAsset?: (assetId: string, assetTitle: string) => void;
  onTabDragStart?: (panelId: string, panelTitle: string, originX: number, originY: number) => void;
  isDirty?: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCloseAll: () => void;
  children: React.ReactNode;
}

export const FullPageDock: React.FC<FullPageDockProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenAsset,
  onTabDragStart,
  isDirty = false,
  onSave,
  onUndo,
  onRedo,
  onCloseAll,
  children,
}) => {
  const getTabIcon = (panelId: string, title?: string) => {
    const check = (panelId + " " + (title || "")).toLowerCase();
    if (check.includes("content-browser") || check.includes("content browser")) return <Folder size={13} />;
    if (check.includes("viewport") || check.includes("design")) return <Monitor size={13} />;
    if (check.includes("blueprint") || check.includes(".bp")) return <Workflow size={13} />;
    if (check.includes("sequencer") || check.includes(".seq")) return <Film size={13} />;
    if (check.includes("console")) return <Terminal size={13} />;
    if (check.includes("er-modeler") || check.includes("database") || check.includes(".db")) return <Database size={13} />;
    return <FileCode size={13} />;
  };

  const handleTabPointerDown = (
    e: React.PointerEvent,
    tab: FullPageTabItem
  ) => {
    if (e.button !== 0) return;
    // Don't initiate drag if clicking the close 'X' button
    if ((e.target as HTMLElement).closest(".fullpage-dock__tab-close")) return;

    const originX = e.clientX;
    const originY = e.clientY;
    let activated = false;

    const onMove = (moveEvt: PointerEvent) => {
      if (activated) return;
      const dx = moveEvt.clientX - originX;
      const dy = moveEvt.clientY - originY;
      if (Math.sqrt(dx * dx + dy * dy) >= 24) {
        activated = true;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        onTabDragStart?.(tab.panelId, tab.panelTitle, originX, originY);
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const activeTab = tabs.find((t) => t.panelId === activeTabId) || tabs[0];

  return (
    <div
      className="fullpage-dock"
      role="region"
      aria-label={`Full Page Workspace: ${activeTab?.panelTitle || "Editor"}`}
    >
      {/* UE-Style Multi-Tab File Bar */}
      <div className="fullpage-dock__filebar">
        <div className="fullpage-dock__filebar-left">
          {/* Save Button */}
          <button
            type="button"
            className="fullpage-dock__filebar-btn"
            onClick={onSave}
            title="Save Project (Ctrl+S)"
          >
            <Save size={14} style={{ color: isDirty ? "var(--accent-warning)" : undefined }} />
            {isDirty && <span className="fullpage-dock__dirty-dot" />}
          </button>

          {/* Undo Button */}
          <button
            type="button"
            className="fullpage-dock__filebar-btn"
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>

          {/* Redo Button */}
          <button
            type="button"
            className="fullpage-dock__filebar-btn"
            onClick={onRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </button>

          {/* Divider */}
          <div className="fullpage-dock__filebar-divider" />

          {/* Browser-Style Multi-Tab Strip */}
          <div
            className="fullpage-dock__tabs"
            role="tablist"
            aria-label="Open Full-Screen Files"
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
                if (data.type === "asset" && onOpenAsset) {
                  onOpenAsset(data.id, data.name);
                }
              } catch {}
            }}
          >
            {/* Pinned Viewport (Website Design) Tab */}
            <div
              key="viewport"
              role="tab"
              aria-selected={activeTabId === "viewport"}
              tabIndex={0}
              className={`fullpage-dock__tab ${activeTabId === "viewport" ? "fullpage-dock__tab--active" : ""}`}
              onClick={() => onSelectTab("viewport")}
              title="Switch to Website Viewport"
            >
              <span className="fullpage-dock__tab-icon"><Monitor size={13} /></span>
              <span className="fullpage-dock__tab-title">Viewport</span>
            </div>

            {tabs.map((tab) => {
              if (tab.panelId === "viewport") return null;
              const isActive = tab.panelId === activeTabId;
              return (
                <div
                  key={tab.panelId}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={0}
                  className={`fullpage-dock__tab ${isActive ? "fullpage-dock__tab--active" : ""}`}
                  onClick={() => onSelectTab(tab.panelId)}
                  onPointerDown={(e) => handleTabPointerDown(e, tab)}
                  title={`${tab.panelTitle} (Drag tab title to detach)`}
                >
                  <span className="fullpage-dock__tab-icon">{getTabIcon(tab.panelId, tab.panelTitle)}</span>
                  <span className="fullpage-dock__tab-title">{tab.panelTitle}</span>
                  <button
                    type="button"
                    className="fullpage-dock__tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.panelId);
                    }}
                    title={`Close ${tab.panelTitle}`}
                    aria-label={`Close ${tab.panelTitle}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="fullpage-dock__filebar-right">
          {/* Close All / Return to Viewport */}
          <button
            type="button"
            className="fullpage-dock__filebar-close"
            onClick={onCloseAll}
            title="Close full-screen view and return to viewport"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Full-Page Panel Content */}
      <div className="fullpage-dock__content">
        {children}
      </div>
    </div>
  );
};
