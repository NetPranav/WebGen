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
  Code,
  Compass,
  Rocket,
  Search,
  Boxes,
  History,
  GitBranch,
  Network,
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
  onStartDragAI?: () => void;
  onToggleAI?: () => void;
  isAIOpen?: boolean;
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
  onStartDragAI,
  onToggleAI,
  isAIOpen = false,
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
        onClick={() =>
          handleAction(() => {
            if (isAIOpen) {
              onToggleAI?.();
            } else {
              onStartDragAI ? onStartDragAI() : onToggleAI?.();
            }
          })
        }
        title={
          isAIOpen
            ? "LayoutAI is currently docked. Click to remove from workspace."
            : "Click to drag and attach LayoutAI into its designated right slot"
        }
      >
        <span className="menu-item__left">
          <span className="menu-item__icon" style={{ color: "#206859" }}>
            <Sparkles size={13} />
          </span>
          <span style={{ fontWeight: 600, color: "#206859" }}>LayoutAI Assistant</span>
        </span>
        {isAIOpen && <Check size={13} className="menu-item__check" style={{ color: "#206859" }} />}
      </button>

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
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("bottom", "blocks") : onToggleBottom?.())}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Sparkles size={13} /></span>
          <span>Content & Block Shelf</span>
        </span>
        {bottomOpen && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "blueprint") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Cpu size={13} /></span>
          <span>Logic Blueprint Canvas</span>
        </span>
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

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "code") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Code size={13} style={{ color: "#34D399" }} /></span>
          <span>Live Code Inspector</span>
        </span>
        <span className="menu-item__shortcut">Ctrl+Shift+G</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "pages-manager") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Compass size={13} style={{ color: "#38BDF8" }} /></span>
          <span>Pages & Routing Manager</span>
        </span>
        <span className="menu-item__shortcut">Ctrl+Shift+P</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "deploy") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Rocket size={13} style={{ color: "#818CF8" }} /></span>
          <span>Deployment & Cloud Studio</span>
        </span>
        <span className="menu-item__shortcut">Ctrl+Shift+D</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "global-search") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Search size={13} style={{ color: "#6366F1" }} /></span>
          <span>Global Search (Find in Blueprints)</span>
        </span>
        <span className="menu-item__shortcut">Ctrl+Shift+F</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "plugins") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Boxes size={13} style={{ color: "#F59E0B" }} /></span>
          <span>Plugin Manager</span>
        </span>
        <span className="menu-item__shortcut">Ctrl+Shift+X</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "history") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><History size={13} style={{ color: "#818CF8" }} /></span>
          <span>Undo History</span>
        </span>
        <span className="menu-item__shortcut">Ctrl+Shift+H</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "versioning") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><GitBranch size={13} style={{ color: "#A78BFA" }} /></span>
          <span>Version Control & Snapshots</span>
        </span>
        <span className="menu-item__shortcut">Ctrl+Shift+V</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => onOpenPanel ? onOpenPanel("center", "dependencies") : undefined)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Network size={13} style={{ color: "#38BDF8" }} /></span>
          <span>Reference Viewer & Dependency Graph</span>
        </span>
        <span className="menu-item__shortcut">Ctrl+Shift+R</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(() => window.dispatchEvent(new CustomEvent("antigravity:open_command_palette")))}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Terminal size={13} style={{ color: "#34D399" }} /></span>
          <span>Command Palette...</span>
        </span>
        <span className="menu-item__shortcut">Ctrl+P</span>
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
