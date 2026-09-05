"use client";

/**
 * ============================================================================
 * WINDOW MENU DROPDOWN
 * ============================================================================
 * UI Element: Top Navigation Window Menu Dropdown
 * Screen / Scope: Screen 01: Master IDE Studio Header
 * Role: Toggles panel visibility and manages workspace layout presets.
 * Styling Source: `@/editor/styles/menus.css` (`.menu-dropdown`, `.menu-item`)
 * Matches: UI.md §5.2 (Workspace Layout Presets)
 * ============================================================================
 */

import React from "react";
import {
  Layers,
  Sliders,
  FolderTree,
  Terminal,
  Cpu,
  Film,
  Sparkles,
  LayoutTemplate,
  RotateCcw,
  Check,
} from "lucide-react";

interface WindowMenuProps {
  isOpen: boolean;
  onClose: () => void;
  leftOpen?: boolean;
  rightOpen?: boolean;
  bottomOpen?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  onToggleBottom?: () => void;
  onOpenPanel?: (zone: "left" | "right" | "bottom" | "center", tabId: string) => void;
  onSelectWorkspace?: (preset: string) => void;
  activeWorkspace?: string;
  onResetLayout?: () => void;
}

export const WindowMenu: React.FC<WindowMenuProps> = ({
  isOpen,
  onClose,
  leftOpen = true,
  rightOpen = true,
  bottomOpen = true,
  onToggleLeft,
  onToggleRight,
  onToggleBottom,
  onOpenPanel,
  onSelectWorkspace,
  activeWorkspace = "full-studio",
  onResetLayout,
}) => {
  if (!isOpen) return null;

  const handleAction = (action?: () => void) => {
    if (action) action();
    onClose();
  };

  return (
    <div className="menu-dropdown" role="menu" aria-label="Window Options">
      <span className="menu-header-label">Docked Panels</span>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("left", "outliner") : onToggleLeft?.())}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Layers size={13} /></span>
          <span>Outliner Panel</span>
        </span>
        {leftOpen && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("right", "details") : onToggleRight?.())}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Sliders size={13} /></span>
          <span>Details & Inspector</span>
        </span>
        {rightOpen && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("left", "content-browser") : onToggleLeft?.())}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><FolderTree size={13} /></span>
          <span>Content Browser</span>
        </span>
        {leftOpen && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("bottom", "console") : onToggleBottom?.())}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Terminal size={13} /></span>
          <span>Output Log & Console</span>
        </span>
        {bottomOpen && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("bottom", "blueprint") : onToggleBottom?.())}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Cpu size={13} /></span>
          <span>Logic Blueprint Canvas</span>
        </span>
        {bottomOpen && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("bottom", "sequencer") : onToggleBottom?.())}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Film size={13} /></span>
          <span>Timeline Sequencer</span>
        </span>
        {bottomOpen && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "settings") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><LayoutTemplate size={13} /></span>
          <span>Project Settings</span>
        </span>
      </button>

      <div className="menu-separator" />
      <span className="menu-header-label">Workspace Presets (UI.md §5.2)</span>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onSelectWorkspace && onSelectWorkspace("full-studio"))}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><LayoutTemplate size={13} /></span>
          <span>Full Studio (Default)</span>
        </span>
        {activeWorkspace === "full-studio" && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onSelectWorkspace && onSelectWorkspace("design"))}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><LayoutTemplate size={13} /></span>
          <span>Design Workspace</span>
        </span>
        {activeWorkspace === "design" && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onSelectWorkspace && onSelectWorkspace("logic"))}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><LayoutTemplate size={13} /></span>
          <span>Logic Workspace</span>
        </span>
        {activeWorkspace === "logic" && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onSelectWorkspace && onSelectWorkspace("data"))}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><LayoutTemplate size={13} /></span>
          <span>Data Workspace</span>
        </span>
        {activeWorkspace === "data" && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onSelectWorkspace && onSelectWorkspace("debug"))}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><LayoutTemplate size={13} /></span>
          <span>Debug Workspace</span>
        </span>
        {activeWorkspace === "debug" && <Check size={13} className="menu-item__check" />}
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onResetLayout)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><RotateCcw size={13} /></span>
          <span>Reset Layout to Default</span>
        </span>
      </button>
    </div>
  );
};
