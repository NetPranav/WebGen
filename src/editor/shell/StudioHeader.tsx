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
  Sparkles,
  Hash,
  Copy,
  Check,
  X,
} from "lucide-react";
import { FileMenu } from "@/editor/menus/FileMenu";
import { EditMenu } from "@/editor/menus/EditMenu";
import { ViewMenu } from "@/editor/menus/ViewMenu";
import { WindowMenu } from "@/editor/menus/WindowMenu";
import { HelpMenu } from "@/editor/menus/HelpMenu";
import { LazyLayoutLogo } from "@/editor/panels/launcher/LazyLayoutLogo";
import { useProjectStore } from "@/core/store/useProjectStore";
import { useLayers } from "@/core/store/useDocumentStore";

type OpenMenuId = "file" | "edit" | "view" | "window" | "help" | null;

interface StudioHeaderProps {
  projectId?: string;
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
  /** Downloads the project as a `.lazy.json` file. */
  onExportProjectFile?: () => void;
  /** Opens a `.lazy.json` file as a new project. */
  onImportProjectFile?: () => void;
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
  onCloseSettings?: () => void;
  onToggleSettings?: () => void;
  isSettingsOpen?: boolean;
  onStartDragAI?: () => void;
  onToggleAI?: () => void;
  isAIOpen?: boolean;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  projectId,
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
  onExportProjectFile,
  onImportProjectFile,
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
  onCloseSettings,
  onToggleSettings,
  isSettingsOpen = false,
  onStartDragAI,
  onToggleAI,
  isAIOpen = false,
}) => {
  const [openMenu, setOpenMenu] = useState<OpenMenuId>(null);
  const [copiedId, setCopiedId] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const elements = useLayers();
  const mountDemoProject = useProjectStore((s) => s.mountDemoProject);
  const clearToBlankCanvas = useProjectStore((s) => s.clearToBlankCanvas);
  const isDemoMounted = Boolean(elements["el_hero_heading"] && elements["el_buy_button"]);

  const handleCopyProjectLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && projectId) {
      const url = new URL(window.location.href);
      url.searchParams.set("projectId", projectId);
      navigator.clipboard.writeText(url.toString()).catch(() => {});
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

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
        <div className="studio-header__brand" title="LazyLayout Studio">
          <LazyLayoutLogo size={18} />
          <span className="studio-header__title">LazyLayout</span>
        </div>

        <div className="studio-header__project-tag" title="Active Project File">
          {isDirty && <span className="studio-header__project-dirty" title="Unsaved changes" />}
          <span>{projectName}</span>
        </div>

        {projectId && (
          <button
            type="button"
            className="studio-header__project-id-chip"
            onClick={handleCopyProjectLink}
            title={`Project ID: ${projectId} (Click to copy project link)`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10.5,
              fontFamily: "var(--font-mono, monospace)",
              padding: "3px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              color: "#818CF8",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Hash size={10} style={{ opacity: 0.8 }} />
            <span>{projectId}</span>
            {copiedId ? (
              <Check size={10} style={{ color: "#34D399" }} />
            ) : (
              <Copy size={10} style={{ opacity: 0.7 }} />
            )}
          </button>
        )}

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
              onOpen={onImportProjectFile}
              onExportProjectFile={onExportProjectFile}
              onImportProjectFile={onImportProjectFile}
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
              onStartDragAI={onStartDragAI}
              onToggleAI={onToggleAI}
              isAIOpen={isAIOpen}
              onSelectWorkspace={onSelectWorkspace}
              activeWorkspace={activeWorkspace}
              onResetLayout={onResetLayout}
              onOpenPanel={onOpenPanel}
            />
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

        {/* Demo Stash / Canvas State Switcher */}
        <button
          type="button"
          className="studio-header__badge"
          id="header-toggle-demo-btn"
          title={isDemoMounted ? "Clear canvas to blank for AI creation" : "Mount Showcase Demo to present features"}
          onClick={() => {
            if (isDemoMounted) {
              clearToBlankCanvas();
            } else {
              mountDemoProject();
            }
          }}
          style={{
            cursor: "pointer",
            backgroundColor: isDemoMounted ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
            border: isDemoMounted ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
            color: isDemoMounted ? "#10b981" : "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
        >
          <Sparkles size={12} style={{ color: isDemoMounted ? "#10b981" : "#94a3b8" }} />
          <span>{isDemoMounted ? "Showcase Active (Click to Clear)" : "Mount Showcase Demo"}</span>
        </button>

        <button
          type="button"
          className="studio-header__icon-btn"
          title="Engine Documentation (F1)"
          onClick={() => handleMenuTriggerClick("help")}
        >
          <HelpCircle size={14} />
        </button>

        {isSettingsOpen ? (
          <button
            type="button"
            className="studio-header__icon-btn studio-header__icon-btn--close-settings"
            title="Close Settings & Return to Viewport (Esc)"
            onClick={onCloseSettings || onToggleSettings || onOpenSettings}
            id="studio-header-close-settings-btn"
            style={{
              color: "#F59E0B",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="studio-header__icon-btn"
            title="Project Settings & Preferences (Ctrl+,)"
            onClick={onToggleSettings || onOpenSettings}
            id="studio-header-settings-btn"
          >
            <Settings size={14} />
          </button>
        )}
      </div>
    </header>
  );
};
