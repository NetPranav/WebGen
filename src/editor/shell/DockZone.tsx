"use client";

/**
 * ============================================================================
 * DOCK ZONE CONTAINER
 * ============================================================================
 * UI Element: Dock Zone (Left, Right, Bottom, Center)
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Hosts tabbed panels with resizable dimensions, glassmorphism, and collapsed icon strip.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-zone`)
 * 
 * CSS ISOLATION NOTE:
 * Governed strictly by `.dock-zone` and modifier `.dock-zone--[zoneId]`.
 * Size is controlled via CSS custom property `--zone-size` on the root element.
 * ============================================================================
 */

import React from "react";
import { DockZoneId, PanelTab } from "@/core/types/workspace";
import { DockTabBar } from "./DockTabBar";
import { PanelLeft, PanelRight, PanelBottom } from "lucide-react";

interface DockZoneProps {
  zoneId: DockZoneId;
  size: number;
  isCollapsed: boolean;
  collapsedSize?: number;
  tabs: PanelTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab?: (tabId: string) => void;
  onAddTab?: () => void;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}

export const DockZone: React.FC<DockZoneProps> = ({
  zoneId,
  size,
  isCollapsed,
  collapsedSize = 38,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onToggleCollapse,
  children,
}) => {
  const currentSize = isCollapsed ? collapsedSize : size;
  const isHorizontalZone = zoneId === "left" || zoneId === "right";

  const sizeStyle: React.CSSProperties = isHorizontalZone
    ? { width: `${currentSize}px`, minWidth: `${currentSize}px` }
    : zoneId === "bottom"
    ? { height: `${currentSize}px`, minHeight: `${currentSize}px` }
    : {};

  const getCollapsedIcon = () => {
    if (zoneId === "left") return <PanelLeft size={16} />;
    if (zoneId === "right") return <PanelRight size={16} />;
    return <PanelBottom size={16} />;
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (isCollapsed && zoneId !== "center") {
    if (zoneId === "bottom") {
      return null;
    }
    return (
      <aside
        className={`dock-zone dock-zone--${zoneId} dock-zone--collapsed`}
        style={sizeStyle}
      >
        <div className="dock-collapsed-strip">
          <button
            type="button"
            className="dock-collapsed-strip__btn"
            onClick={onToggleCollapse}
            title={`Expand ${zoneId} panel (${activeTab?.title || "Panel"})`}
          >
            {getCollapsedIcon()}
          </button>
          <span className="dock-collapsed-strip__label">
            {activeTab?.title || zoneId.toUpperCase()}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <div
      className={`dock-zone dock-zone--${zoneId}`}
      style={sizeStyle}
    >
      {zoneId !== "center" && (
        <DockTabBar
          zoneId={zoneId}
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onAddTab={onAddTab}
          onToggleCollapse={onToggleCollapse}
          isCollapsed={isCollapsed}
        />
      )}
      <div className="dock-content">{children}</div>
    </div>
  );
};
