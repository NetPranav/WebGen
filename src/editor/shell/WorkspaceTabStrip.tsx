"use client";

/**
 * ============================================================================
 * WORKSPACE TAB STRIP
 * ============================================================================
 * UI Element: Persistent Workspace Preset Tabs (Blender workspace-tabs equivalent)
 *             + Motion tool shelf + command search
 * Screen / Scope: Entire IDE Studio Shell (`/editor`), directly under StudioHeader
 * Role: Left — the same workspace presets as Window > Workspace Presets as an
 * always-visible row. Right — one-click jumps into the animation helpers
 * (timeline, easing curves, preset library, stagger, export) and the command
 * palette, so building motion never needs a menu dive.
 * Styling Source: `@/editor/styles/menus.css` (`.studio-header-workspaces`)
 * ============================================================================
 */

import React from "react";
import {
  LayoutTemplate,
  PenTool,
  Film,
  Network,
  Database,
  Bug,
  GalleryHorizontalEnd,
  Spline,
  Clapperboard,
  FileCode2,
  Search,
} from "lucide-react";

export interface WorkspacePreset {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const PRESETS: WorkspacePreset[] = [
  { id: "full-studio", label: "Full Studio", icon: <LayoutTemplate size={13} /> },
  { id: "design", label: "Design", icon: <PenTool size={13} /> },
  { id: "animate", label: "Animate", icon: <Film size={13} /> },
  { id: "logic", label: "Logic", icon: <Network size={13} /> },
  { id: "data", label: "Data", icon: <Database size={13} /> },
  { id: "debug", label: "Debug", icon: <Bug size={13} /> },
];

/** Motion helpers — each opens a bottom-drawer tab. */
const MOTION_TOOLS: { tabId: string; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    tabId: "content-browser",
    label: "Presets",
    hint: "Animation preset library",
    icon: <GalleryHorizontalEnd size={13} />,
  },
  {
    tabId: "sequencer",
    label: "Timeline",
    hint: "Keyframe timeline, stagger & scroll-trigger tracks (Ctrl+Shift+M)",
    icon: <Clapperboard size={13} />,
  },
  {
    tabId: "curves",
    label: "Easing",
    hint: "Easing curve editor (Ctrl+Shift+K)",
    icon: <Spline size={13} />,
  },
  {
    tabId: "export-code",
    label: "Export",
    hint: "Export as CSS keyframes, WAAPI, Framer Motion or GSAP",
    icon: <FileCode2 size={13} />,
  },
];

interface WorkspaceTabStripProps {
  activeWorkspace: string;
  onSelectWorkspace: (preset: string) => void;
  /** Open a bottom-drawer tab (motion helpers). */
  onOpenBottomTab?: (tabId: string) => void;
  /** The bottom tab currently shown, or null when the drawer is collapsed. */
  activeBottomTab?: string | null;
  onOpenCommandPalette?: () => void;
}

export const WorkspaceTabStrip: React.FC<WorkspaceTabStripProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  onOpenBottomTab,
  activeBottomTab = null,
  onOpenCommandPalette,
}) => (
  <div className="studio-header-workspaces">
    <div className="studio-header-workspaces__tabs" role="tablist" aria-label="Workspace presets">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          role="tab"
          aria-selected={activeWorkspace === preset.id}
          className={`studio-header-workspaces__tab ${
            activeWorkspace === preset.id ? "studio-header-workspaces__tab--active" : ""
          }`}
          onClick={() => onSelectWorkspace(preset.id)}
          title={`${preset.label} workspace`}
        >
          {preset.icon}
          <span className="studio-header-workspaces__label">{preset.label}</span>
        </button>
      ))}
    </div>

    {onOpenBottomTab && (
      <div className="studio-header-workspaces__shelf" role="toolbar" aria-label="Motion tools">
        <span className="studio-header-workspaces__shelf-title">Motion</span>
        {MOTION_TOOLS.map((tool) => (
          <button
            key={tool.tabId}
            type="button"
            className={`studio-header-workspaces__tool ${
              activeBottomTab === tool.tabId ? "studio-header-workspaces__tool--active" : ""
            }`}
            onClick={() => onOpenBottomTab(tool.tabId)}
            title={tool.hint}
            aria-label={`${tool.label} tool`}
          >
            {tool.icon}
            <span className="studio-header-workspaces__label">{tool.label}</span>
          </button>
        ))}
      </div>
    )}

    {onOpenCommandPalette && (
      <button
        type="button"
        className="studio-header-workspaces__search"
        onClick={onOpenCommandPalette}
        title="Command palette (Ctrl+K)"
        aria-label="Open command palette"
      >
        <Search size={12} />
        <span className="studio-header-workspaces__search-text">Search commands…</span>
        <kbd className="studio-header-workspaces__kbd">Ctrl K</kbd>
      </button>
    )}
  </div>
);
