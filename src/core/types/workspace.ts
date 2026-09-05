/**
 * ============================================================================
 * WORKSPACE & DOCK LAYOUT TYPE DEFINITIONS
 * ============================================================================
 * UI Element: Workspace Layout & Dock Manager Types
 * Screen / Scope: Core Platform Layer -> Shell & Dock Infrastructure
 * Role: Provides strict TypeScript interfaces for dock zones, panels, tabs, and splitters.
 * 
 * CSS & ARCHITECTURE NOTE:
 * Matches PANELS.md §1 & §2 and UI.md §5.
 * State managed through these types directly drives CSS custom properties for zone sizes.
 * ============================================================================
 */

export type DockZoneId = "left" | "center" | "right" | "bottom";

export interface PanelTab {
  id: string;
  title: string;
  icon?: string;
  badge?: string | number;
  closable?: boolean;
}

export interface DockZoneConfig {
  id: DockZoneId;
  title?: string;
  size: number;              // width (for left/right) or height (for bottom) in px
  minSize: number;
  maxSize: number;
  isCollapsed: boolean;
  collapsedSize: number;     // e.g. 38px
  activeTabId: string;
  tabs: PanelTab[];
}

export interface WorkspaceState {
  leftZone: DockZoneConfig;
  rightZone: DockZoneConfig;
  bottomZone: DockZoneConfig;
  centerActiveTabId: string;
  centerTabs: PanelTab[];
  activeModal: string | null;
  activeFloatingPanel: string | null;
}
