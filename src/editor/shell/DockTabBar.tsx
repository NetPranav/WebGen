"use client";

/**
 * ============================================================================
 * DOCK TAB BAR COMPONENT
 * ============================================================================
 * UI Element: Dock Zone Tab Strip & Panel Controls
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Renders panel switcher tabs, close buttons, collapse toggle, and
 *       drag-to-tear-off functionality for the Unreal Engine-style tab system.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-tabbar`)
 * ============================================================================
 */

import React, { useRef, useCallback, useState } from "react";
import { X, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { PanelTab, DockZoneId } from "@/core/types/workspace";

interface DockTabBarProps {
  zoneId: DockZoneId;
  tabs: PanelTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab?: (tabId: string) => void;
  onAddTab?: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  /** Called when a tab is dragged past the tear-off threshold */
  onTearOffStart?: (tabId: string, tabTitle: string, originX: number, originY: number) => void;
}

/** Minimum distance (px) pointer must move before tear-off activates */
const TEAR_OFF_THRESHOLD = 40;

export const DockTabBar: React.FC<DockTabBarProps> = ({
  zoneId,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onToggleCollapse,
  isCollapsed = false,
  onTearOffStart,
}) => {
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleTabMouseEnter = (tabId: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (tabId === activeTabId) return;
    hoverTimerRef.current = setTimeout(() => {
      onSelectTab(tabId);
    }, 2000);
  };

  const handleTabMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleTabClick = (tabId: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    onSelectTab(tabId);
  };

  /**
   * Drag-to-tear-off: On pointerdown, start tracking. If the pointer moves
   * more than TEAR_OFF_THRESHOLD px (Euclidean), activate tear-off mode.
   */
  const handleTabPointerDown = useCallback(
    (tabId: string, tabTitle: string, e: React.PointerEvent) => {
      if (!onTearOffStart) return;
      // Only respond to primary button
      if (e.button !== 0) return;

      const originX = e.clientX;
      const originY = e.clientY;
      let activated = false;

      const onMove = (moveEvt: PointerEvent) => {
        if (activated) return;
        const dx = moveEvt.clientX - originX;
        const dy = moveEvt.clientY - originY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= TEAR_OFF_THRESHOLD) {
          activated = true;
          setDraggingTabId(tabId);
          onTearOffStart(tabId, tabTitle, originX, originY);
          // Cleanup our local listeners — useTearOff takes over from here
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);

          // Clear dragging state when the global drag ends
          const clearDrag = () => {
            setDraggingTabId(null);
            window.removeEventListener("pointerup", clearDrag);
          };
          window.addEventListener("pointerup", clearDrag, { once: true });
        }
      };

      const onUp = () => {
        // Released before threshold — just a normal click
        window.removeEventListener("pointermove", onMove);
        setDraggingTabId(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    },
    [onTearOffStart]
  );

  const getCollapseIcon = () => {
    if (zoneId === "left") {
      return isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />;
    }
    if (zoneId === "right") {
      return isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />;
    }
    if (zoneId === "bottom") {
      return isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    }
    return null;
  };

  return (
    <div className="dock-tabbar">
      <div className="dock-tabbar__tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDragging = tab.id === draggingTabId;
          return (
            <button
              key={tab.id}
              type="button"
              className={`dock-tabbar__tab ${isActive ? "dock-tabbar__tab--active" : ""} ${
                isDragging ? "dock-tabbar__tab--dragging" : ""
              }`}
              onClick={() => handleTabClick(tab.id)}
              onMouseEnter={() => handleTabMouseEnter(tab.id)}
              onMouseLeave={handleTabMouseLeave}
              onPointerDown={(e) => handleTabPointerDown(tab.id, tab.title, e)}
            >
              <span>{tab.title}</span>
              {tab.closable && onCloseTab && (
                <span
                  className="dock-tabbar__close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  title="Close Tab"
                >
                  <X size={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="dock-tabbar__controls">
        {onAddTab && (
          <button
            type="button"
            className="dock-tabbar__btn"
            onClick={onAddTab}
            title="Add Panel Tab"
          >
            <Plus size={14} />
          </button>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            className="dock-tabbar__btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
          >
            {getCollapseIcon()}
          </button>
        )}
      </div>
    </div>
  );
};
