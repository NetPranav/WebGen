"use client";

/**
 * ============================================================================
 * STUDIO HEADER COMPONENT
 * ============================================================================
 * UI Element: Master Top Navigation & Application Menu Bar
 * Screen / Scope: Screen 01: Master IDE Studio Shell (`/editor`)
 * Role: Hosts:
 *       - Brand Logo & Engine Title ("Visual Web Application Engine")
 *       - Project filename tag ("MyProject.uweb") with dirty state
 *       - Desktop Menu Bar (File, Edit, View, Window, Help)
 *       - Environment status indicators (Git branch, Wasm badge, Settings)
 * Styling Source: `@/editor/styles/menus.css` (`.studio-header`, `.menu-bar`)
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from "react";
import "@/editor/styles/menus.css";
import {
  GitBranch,
  Settings,
  HelpCircle,
  Activity,
  Monitor,
  Tablet,
  Smartphone,
  Database,
} from "lucide-react";
import { FileMenu } from "@/editor/menus/FileMenu";
import { EditMenu } from "@/editor/menus/EditMenu";
import { ViewMenu } from "@/editor/menus/ViewMenu";
import { WindowMenu } from "@/editor/menus/WindowMenu";
import { HelpMenu } from "@/editor/menus/HelpMenu";

type OpenMenuId = "file" | "edit" | "view" | "window" | "help" | null;

interface StudioHeaderProps {
  projectName?: string;
  isDirty?: boolean;
  branchName?: string;
  deviceMode?: "desktop" | "tablet" | "mobile";
  onSelectDeviceMode?: (mode: "desktop" | "tablet" | "mobile") => void;
  leftOpen?: boolean;
  rightOpen?: boolean;
  bottomOpen?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  onToggleBottom?: () => void;
  onSelectWorkspace?: (preset: string) => void;
  activeWorkspace?: string;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onFitToStage?: () => void;
  onResetLayout?: () => void;
  onOpenPanel?: (zone: "left" | "right" | "bottom" | "center", tabId: string) => void;
  onOpenSettings?: () => void;
  onOpenDatabase?: () => void;
  activePage?: "editor" | "database";
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  projectName = "MyProject.uweb",
  isDirty = false,
  branchName = "main",
  deviceMode = "desktop",
  onSelectDeviceMode,
  leftOpen = true,
  rightOpen = true,
  bottomOpen = true,
  onToggleLeft,
  onToggleRight,
  onToggleBottom,
  onSelectWorkspace,
  activeWorkspace = "full-studio",
  onSave,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToStage,
  onResetLayout,
  onOpenPanel,
  onOpenSettings,
  onOpenDatabase,
  activePage = "editor",
}) => {
  const [openMenu, setOpenMenu] = useState<OpenMenuId>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMenuTriggerClick = (menuId: OpenMenuId) => {
    setOpenMenu((current) => (current === menuId ? null : menuId));
  };

  const handleMenuTriggerMouseEnter = (menuId: OpenMenuId) => {
    // If a menu is already open, hovering over another menu trigger opens it immediately
    if (openMenu !== null && openMenu !== menuId) {
      setOpenMenu(menuId);
    }
  };

  return (
    <header className="studio-header" ref={headerRef} role="banner">
      {/* Left: Brand Logo + Project File Tag + Menu Bar */}
      <div className="studio-header__left">
        <div className="studio-header__brand" title="IDE Studio">
          <span className="studio-header__logo">⚡</span>
        </div>

        <div className="studio-header__project-tag" title="Active Project File">
          {isDirty && <span className="studio-header__project-dirty" title="Unsaved changes" />}
          <span>{projectName}</span>
        </div>

        {/* Desktop Menu Bar */}
        <nav className="menu-bar" aria-label="Engine Menus">
          {/* File Menu */}
          <div className="menu-bar__item-wrapper">
            <button
              type="button"
              className={`menu-bar__trigger ${openMenu === "file" ? "menu-bar__trigger--open" : ""}`}
              onClick={() => handleMenuTriggerClick("file")}
              onMouseEnter={() => handleMenuTriggerMouseEnter("file")}
              aria-expanded={openMenu === "file"}
            >
              File
            </button>
            <FileMenu
              isOpen={openMenu === "file"}
              onClose={() => setOpenMenu(null)}
              onSave={onSave}
            />
          </div>

          {/* Edit Menu */}
          <div className="menu-bar__item-wrapper">
            <button
              type="button"
              className={`menu-bar__trigger ${openMenu === "edit" ? "menu-bar__trigger--open" : ""}`}
              onClick={() => handleMenuTriggerClick("edit")}
              onMouseEnter={() => handleMenuTriggerMouseEnter("edit")}
              aria-expanded={openMenu === "edit"}
            >
              Edit
            </button>
            <EditMenu
              isOpen={openMenu === "edit"}
              onClose={() => setOpenMenu(null)}
              onUndo={onUndo}
              onRedo={onRedo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>

          {/* View Menu */}
          <div className="menu-bar__item-wrapper">
            <button
              type="button"
              className={`menu-bar__trigger ${openMenu === "view" ? "menu-bar__trigger--open" : ""}`}
              onClick={() => handleMenuTriggerClick("view")}
              onMouseEnter={() => handleMenuTriggerMouseEnter("view")}
              aria-expanded={openMenu === "view"}
            >
              View
            </button>
            <ViewMenu
              isOpen={openMenu === "view"}
              onClose={() => setOpenMenu(null)}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onZoomReset={onZoomReset}
              onFitToStage={onFitToStage}
            />
          </div>

          {/* Window Menu */}
          <div className="menu-bar__item-wrapper">
            <button
              type="button"
              className={`menu-bar__trigger ${openMenu === "window" ? "menu-bar__trigger--open" : ""}`}
              onClick={() => handleMenuTriggerClick("window")}
              onMouseEnter={() => handleMenuTriggerMouseEnter("window")}
              aria-expanded={openMenu === "window"}
            >
              Window
            </button>
            <WindowMenu
              isOpen={openMenu === "window"}
              onClose={() => setOpenMenu(null)}
              leftOpen={leftOpen}
              rightOpen={rightOpen}
              bottomOpen={bottomOpen}
              onToggleLeft={onToggleLeft}
              onToggleRight={onToggleRight}
              onToggleBottom={onToggleBottom}
              onSelectWorkspace={onSelectWorkspace}
              activeWorkspace={activeWorkspace}
              onResetLayout={onResetLayout}
              onOpenPanel={onOpenPanel}
            />
          </div>

          {/* DataBase Studio Page Navigation Button */}
          <div className="menu-bar__item-wrapper">
            <button
              type="button"
              className={`menu-bar__trigger menu-bar__trigger--database ${activePage === "database" ? "menu-bar__trigger--active" : ""}`}
              onClick={onOpenDatabase}
              title="Open Database Schema Studio"
              aria-label="Open Database Studio"
            >
              <Database size={12} />
              <span>DataBase</span>
            </button>
          </div>

          {/* Help Menu */}
          <div className="menu-bar__item-wrapper">
            <button
              type="button"
              className={`menu-bar__trigger ${openMenu === "help" ? "menu-bar__trigger--open" : ""}`}
              onClick={() => handleMenuTriggerClick("help")}
              onMouseEnter={() => handleMenuTriggerMouseEnter("help")}
              aria-expanded={openMenu === "help"}
            >
              Help
            </button>
            <HelpMenu
              isOpen={openMenu === "help"}
              onClose={() => setOpenMenu(null)}
            />
          </div>
        </nav>
      </div>

      {/* Center: Device Mode Segmented Control shifted from second top bar */}
      <div className="studio-header__center">
        <div className="toolbar-segmented" role="radiogroup" aria-label="Device Preview Target">
          <button
            type="button"
            className={`toolbar-segmented__btn ${deviceMode === "desktop" ? "toolbar-segmented__btn--active" : ""}`}
            onClick={() => onSelectDeviceMode && onSelectDeviceMode("desktop")}
            title="Desktop Canvas (1440px)"
          >
            <Monitor size={12} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            className={`toolbar-segmented__btn ${deviceMode === "tablet" ? "toolbar-segmented__btn--active" : ""}`}
            onClick={() => onSelectDeviceMode && onSelectDeviceMode("tablet")}
            title="Tablet Canvas (768px)"
          >
            <Tablet size={12} />
            <span>Tablet</span>
          </button>
          <button
            type="button"
            className={`toolbar-segmented__btn ${deviceMode === "mobile" ? "toolbar-segmented__btn--active" : ""}`}
            onClick={() => onSelectDeviceMode && onSelectDeviceMode("mobile")}
            title="Mobile Canvas (375px)"
          >
            <Smartphone size={12} />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Right: Git Branch, Engine Badge, Settings */}
      <div className="studio-header__right">
        <div className="studio-header__badge" title={`Working on branch ${branchName}`}>
          <GitBranch size={12} />
          <span>{branchName}</span>
        </div>

        <div className="studio-header__badge" title="C++ WebAssembly Engine linked">
          <Activity size={12} style={{ color: "var(--accent-success)" }} />
          <span>Wasm 120 FPS</span>
        </div>

        <button
          type="button"
          className="studio-header__icon-btn"
          title="Engine Documentation (F1)"
          onClick={() => handleMenuTriggerClick("help")}
        >
          <HelpCircle size={14} />
        </button>

        <button
          type="button"
          className="studio-header__icon-btn"
          title="Project Settings & Preferences (Ctrl+,)"
          onClick={onOpenSettings}
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
};
