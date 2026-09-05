"use client";

/**
 * ============================================================================
 * DOCK TAB BAR COMPONENT
 * ============================================================================
 * UI Element: Dock Zone Tab Strip & Panel Controls
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Renders panel switcher tabs, close buttons, and collapse toggle.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-tabbar`)
 * ============================================================================
 */

import React from "react";
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
}

export const DockTabBar: React.FC<DockTabBarProps> = ({
  zoneId,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onToggleCollapse,
  isCollapsed = false,
}) => {
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
          return (
            <button
              key={tab.id}
              type="button"
              className={`dock-tabbar__tab ${isActive ? "dock-tabbar__tab--active" : ""}`}
              onClick={() => onSelectTab(tab.id)}
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
