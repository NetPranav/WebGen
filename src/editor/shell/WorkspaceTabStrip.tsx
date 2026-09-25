"use client";

/**
 * ============================================================================
 * WORKSPACE TAB STRIP
 * ============================================================================
 * UI Element: Persistent Workspace Preset Tabs (Blender workspace-tabs equivalent)
 * Screen / Scope: Entire IDE Studio Shell (`/editor`), directly under StudioHeader
 * Role: Surfaces the same workspace presets as Window > Workspace Presets as an
 * always-visible row, so switching layouts doesn't require opening a menu.
 * Styling Source: `@/editor/styles/menus.css` (`.studio-header-workspaces`)
 * ============================================================================
 */

import React from "react";
import { LayoutTemplate, PenTool, Film, Network, Database, Bug } from "lucide-react";

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

interface WorkspaceTabStripProps {
  activeWorkspace: string;
  onSelectWorkspace: (preset: string) => void;
}

export const WorkspaceTabStrip: React.FC<WorkspaceTabStripProps> = ({
  activeWorkspace,
  onSelectWorkspace,
}) => (
  <div className="studio-header-workspaces" role="tablist" aria-label="Workspace presets">
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
      >
        {preset.icon}
        <span>{preset.label}</span>
      </button>
    ))}
  </div>
);
