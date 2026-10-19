"use client";

/**
 * ============================================================================
 * EDITOR SHELL ROOT COMPONENT
 * ============================================================================
 * UI Element: Master IDE Studio Layout Shell
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Composes the header, the dock body and the status bar from the saved
 * workspace layout (`@/core/workspace`). Phase 14 split this file (2,139
 * lines) into hooks (`./hooks`), `DockTree`, `PanelHost` and a panel registry.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-layout`)
 * ============================================================================
 */

import React, { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from "react";
import "@/editor/styles/dock.css";
import { useCameraStore, selectZoomPercent } from "@/core/store/useCameraStore";
import { StatusBar } from "./StatusBar";
import { StudioHeader } from "./StudioHeader";
import { WorkspaceTabStrip } from "./WorkspaceTabStrip";
import { DockTree } from "./DockTree";
import { CanvasChrome } from "./CanvasChrome";
import { AiDockOverlays } from "./AiDockOverlays";
import { RecoveryPrompt, SaveErrorBanner, FileDropOverlay } from "./PersistenceUi";
import { registerBuiltInPanels } from "./panels/builtins";
import type { PanelContext, SelectedElement } from "./panels/context";
import { useWorkspace } from "./hooks/useWorkspace";
import { useDockLayers } from "./hooks/useDockLayers";
import { useAiDock } from "./hooks/useAiDock";
import { useProjectFiles } from "./hooks/useProjectFiles";
import { useFullPageDock } from "./hooks/useFullPageDock";
import { useShellCommands } from "./hooks/useShellCommands";
import { useProjectMetaStore } from "@/core/store/useProjectMetaStore";
import { useHistoryStore } from "@/core/store/useHistoryStore";
import { projectSession, useSaveStatus } from "@/core/storage/ProjectSession";
import { installWorkspacePersistence, useWorkspaceStore } from "@/core/workspace/useWorkspaceStore";
import { loadedPanelIds, onPanelLoaded } from "./panels/registry";
import { invokeCommand } from "@/core/commands";

// Panels loaded only when shown: the global search overlay and the command palette.
const GlobalSearchPanel = lazy(async () => ({ default: (await import("@/editor/panels/global-search")).GlobalSearchPanel }));
const CommandPalette = lazy(async () => ({ default: (await import("./CommandPalette")).CommandPalette }));

registerBuiltInPanels();

interface EditorShellProps {
  headerSlot?: React.ReactNode;
  leftPanels?: Record<string, React.ReactNode>;
  rightPanels?: Record<string, React.ReactNode>;
  bottomPanels?: Record<string, React.ReactNode>;
  centerPanels?: Record<string, React.ReactNode>;
}

export const EditorShell: React.FC<EditorShellProps> = ({ headerSlot, rightPanels = {}, bottomPanels = {}, centerPanels = {} }) => {
  const ws = useWorkspace();
  const layers = useDockLayers();
  const { setActiveLayer, handleZoneClick } = layers;

  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const zoomLevel = useCameraStore(selectZoomPercent);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isPlaying] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [focusedBlueprintNodeId, setFocusedBlueprintNodeId] = useState<string | null>(null);

  // DOM handles the splitters write live px values to while dragging (no
  // React re-render mid-drag — see DockSplitter/DockCornerSplitter).
  const rightZoneRef = useRef<HTMLElement | null>(null);
  const bottomZoneRef = useRef<HTMLElement | null>(null);
  const aiZoneRef = useRef<HTMLDivElement | null>(null);

  const saveState = useSaveStatus((s) => s.state);
  const isDirty = saveState === "pending" || saveState === "saving" || saveState === "error";
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);
  const projectId = useProjectMetaStore((s) => s.projectId) ?? "";

  // Which panels' code has been fetched, as an attribute the bundle test reads (Phase 14 gate).
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const publish = () => rootRef.current?.setAttribute("data-loaded-panels", loadedPanelIds().join(" "));
    publish();
    return onPanelLoaded(publish);
  }, []);

  // Phase 14: restore the saved layout on the client, and save changes to it.
  useEffect(() => {
    useWorkspaceStore.getState().hydrate();
    return installWorkspacePersistence();
  }, []);

  const files = useProjectFiles();
  const ai = useAiDock({ rightZoneRef, rightWidth: ws.rightWidth, rightCollapsed: ws.rightCollapsed, setActiveLayer });
  const { setIsAiCoPilotOpen } = ai;
  const fp = useFullPageDock(ws, handleZoneClick);
  const { handleDockFullPage } = fp;

  // On a narrow (mobile/tablet-portrait) viewport, panels dock as overlays over the canvas rather than
  // squeezing it (dock.css's <=860px block), so start with them closed. Re-collapses when the viewport
  // crosses into that range, but doesn't keep fighting a panel the user reopens while still narrow.
  const { setRightCollapsed, setBottomCollapsed } = ws;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 860px)");
    const applyMobileDefaults = () => {
      setRightCollapsed(true);
      setBottomCollapsed(true);
      setIsAiCoPilotOpen(false);
    };
    if (mq.matches) applyMobileDefaults();
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) applyMobileDefaults();
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [setRightCollapsed, setBottomCollapsed, setIsAiCoPilotOpen]);

  const handleSaveProject = useCallback(() => void invokeCommand("file.save"), []);
  const handleUndo = useCallback(() => void invokeCommand("edit.undo"), []);
  const handleRedo = useCallback(() => void invokeCommand("edit.redo"), []);

  const showBottomTab = useCallback(
    (tabId: string) => {
      setBottomCollapsed(false);
      ws.setBottomActiveTab(tabId);
    },
    [setBottomCollapsed, ws],
  );

  const { setCenterActiveTab } = ws;
  const handleOpenSettings = useCallback(() => setCenterActiveTab("settings"), [setCenterActiveTab]);
  const handleCloseSettings = useCallback(() => setCenterActiveTab("viewport"), [setCenterActiveTab]);
  const handleToggleSettings = useCallback(() => setCenterActiveTab((curr) => (curr === "settings" ? "viewport" : "settings")), [setCenterActiveTab]);
  const handleRecenterCanvas = useCallback(() => {
    if (ws.centerActiveTab === "settings") setCenterActiveTab("viewport");
    window.dispatchEvent(new CustomEvent("antigravity:recenter_canvas"));
  }, [ws.centerActiveTab, setCenterActiveTab]);

  useEffect(() => {
    const handleEscapeSettings = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ws.centerActiveTab === "settings") handleCloseSettings();
    };
    window.addEventListener("keydown", handleEscapeSettings);
    return () => window.removeEventListener("keydown", handleEscapeSettings);
  }, [ws.centerActiveTab, handleCloseSettings]);

  /** Switches workspace preset (UI.md §5.2) and performs what the preset asks beyond layout. */
  const { selectPreset } = ws;
  // The header's Desktop / Tablet / Mobile switch focuses the frame of that size, creating it first if there is none (Phase 21).
  const handleSelectDeviceMode = useCallback((mode: "desktop" | "tablet" | "mobile") => {
    setDeviceMode(mode);
    invokeCommand("frame.focusPreset", { preset: mode });
  }, []);

  const handleSelectWorkspace = useCallback(
    (preset: string) => {
      for (const effect of selectPreset(preset)) {
        if (effect.type === "fullPage") handleDockFullPage(effect.panelId, effect.title);
        else handleZoneClick(effect.zone);
      }
    },
    [selectPreset, handleDockFullPage, handleZoneClick],
  );

  useShellCommands({
    toggleCommandPalette: () => setIsCommandPaletteOpen((prev) => !prev),
    toggleGlobalSearch: () => setIsGlobalSearchOpen((prev) => !prev),
    toggleAiCoPilot: ai.toggleAiCoPilot,
    dockFullPage: handleDockFullPage,
    showBottomTab,
    exportProjectFile: () => void files.handleExportProjectFile(),
    openImportPicker: files.handleOpenImportPicker,
    openSettings: handleOpenSettings,
    selectPreset: handleSelectWorkspace,
  });

  /** Opens a panel in a zone, or as a full-page tab (Window menu, workspace strip). */
  const handleOpenPanel = (zone: "left" | "right" | "bottom" | "center", tabId: string) => {
    const FULL_PAGE: Record<string, [string, string]> = {
      blueprint: ["blueprint", "Logic Blueprint"],
      sequencer: ["sequencer", "Timeline Sequencer"],
      "content-browser": ["content-browser", "Content Browser"],
      plugins: ["plugins", "Plugin Manager"],
      "plugin-manager": ["plugins", "Plugin Manager"],
      history: ["history", "Undo History"],
      "undo-history": ["history", "Undo History"],
      code: ["code", "Live Code Inspector"],
      "pages-manager": ["pages-manager", "Pages & Routing Manager"],
      deploy: ["deploy", "Deployment & Cloud Studio"],
    };
    if (zone === "left") {
      ws.setLeftCollapsed(false);
      ws.setLeftActiveTab(tabId);
      handleZoneClick("left");
    } else if (zone === "right") {
      ws.setRightCollapsed(false);
      ws.setRightActiveTab(tabId);
      handleZoneClick("right");
    } else if (zone === "bottom") {
      if (tabId === "blueprint") return handleDockFullPage("blueprint", "Logic Blueprint");
      if (tabId === "console") return ws.setIsOutputLogOpen(true);
      ws.setBottomCollapsed(false);
      ws.setBottomActiveTab(tabId);
      handleZoneClick("bottom");
    } else if (FULL_PAGE[tabId]) {
      handleDockFullPage(...FULL_PAGE[tabId]);
    } else if (tabId === "global-search" || tabId === "search") {
      setIsGlobalSearchOpen(true);
    } else {
      setCenterActiveTab(tabId === "settings" ? "settings" : "viewport");
    }
  };

  const panelContext = useMemo<PanelContext>(
    () => ({
      selectedElement,
      setSelectedElement,
      dockFullPage: handleDockFullPage,
      startGenericTearOff: fp.handleGenericTearOffStart,
      showBottomTab,
      setBottomTab: ws.setBottomActiveTab,
      collapseBottom: () => setBottomCollapsed(true),
      focusedBlueprintNodeId,
      focusBlueprintNode: setFocusedBlueprintNodeId,
      isDirty,
      save: handleSaveProject,
      deviceMode,
      closeSettings: handleCloseSettings,
    }),
    [selectedElement, handleDockFullPage, fp.handleGenericTearOffStart, showBottomTab, ws.setBottomActiveTab, setBottomCollapsed, focusedBlueprintNodeId, isDirty, handleSaveProject, deviceMode, handleCloseSettings],
  );

  return (
    <div className="dock-layout" ref={rootRef}>
      {files.recovery && (
        <RecoveryPrompt
          recovery={files.recovery}
          onRestore={() => {
            files.setRecovery(null);
            void projectSession.restoreRecovery();
          }}
          onDiscard={() => {
            files.setRecovery(null);
            void projectSession.discardRecovery();
          }}
        />
      )}
      <SaveErrorBanner fileError={files.fileError} onDismissFileError={() => files.setFileError(null)} />
      <FileDropOverlay visible={files.isFileDragOver} />

      {/* Top Header Slot: Single Streamlined StudioHeader */}
      <div
        className="dock-layout__header"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const rawData = e.dataTransfer.getData("application/json");
          if (!rawData) return;
          try {
            const data = JSON.parse(rawData);
            if (data.type === "asset") handleDockFullPage(data.id, data.name);
          } catch {}
        }}
      >
        {headerSlot || (
          <StudioHeader
            projectId={projectId}
            isDirty={isDirty}
            deviceMode={deviceMode}
            onSelectDeviceMode={handleSelectDeviceMode}
            leftOpen={!ws.leftCollapsed}
            rightOpen={!ws.rightCollapsed}
            bottomOpen={!ws.bottomCollapsed}
            onToggleLeft={() => ws.setLeftCollapsed((c) => !c)}
            onToggleRight={() => ws.setRightCollapsed((c) => !c)}
            onToggleBottom={() => ws.setBottomCollapsed((c) => !c)}
            onSelectWorkspace={handleSelectWorkspace}
            activeWorkspace={ws.activeWorkspace}
            canUndo={canUndo}
            canRedo={canRedo}
            onResetLayout={() => handleSelectWorkspace("design")}
            onOpenPanel={handleOpenPanel}
            onOpenSettings={handleOpenSettings}
            onCloseSettings={handleCloseSettings}
            onToggleSettings={handleToggleSettings}
            isSettingsOpen={ws.centerActiveTab === "settings"}
            onStartDragAI={ai.handleStartDragAI}
            onToggleAI={ai.toggleAiCoPilot}
            isAIOpen={ai.isAiCoPilotOpen}
          />
        )}
        <WorkspaceTabStrip
          activeWorkspace={ws.activeWorkspace}
          onSelectWorkspace={handleSelectWorkspace}
          onOpenBottomTab={(tabId) => handleOpenPanel("bottom", tabId)}
          activeBottomTab={ws.bottomCollapsed ? null : ws.bottomActiveTab}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      </div>

      <DockTree
        ws={ws}
        layers={layers}
        ai={ai}
        fp={fp}
        context={panelContext}
        overrides={{ right: rightPanels, bottom: bottomPanels, center: centerPanels }}
        stageChrome={
          <CanvasChrome
            centerActiveTab={ws.centerActiveTab}
            isDirty={isDirty}
            onSave={handleSaveProject}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onOpenSettings={handleOpenSettings}
            onCloseSettings={handleCloseSettings}
            onRecenter={handleRecenterCanvas}
            onOpenWorldInspector={() => {
              if (ws.rightCollapsed) ws.setRightCollapsed(false);
              setSelectedElement(null);
              ws.setRightActiveTab("design");
            }}
          />
        }
        isDirty={isDirty}
        onSave={handleSaveProject}
        onUndo={handleUndo}
        onRedo={handleRedo}
        rightZoneRef={rightZoneRef}
        bottomZoneRef={bottomZoneRef}
        aiZoneRef={aiZoneRef}
      />

      {/* Bottom Status Bar with Drawer Controller */}
      <div className="dock-layout__statusbar">
        <StatusBar
          status={isPlaying ? "Live Simulation Running (120 FPS Wasm)" : "Engine Ready"}
          isDirty={isDirty}
          activeSelection={selectedElement ? selectedElement.name : "World Environment"}
          zoomLevel={zoomLevel}
          onZoomIn={() => invokeCommand("view.zoomIn")}
          onZoomOut={() => invokeCommand("view.zoomOut")}
          onZoomReset={() => invokeCommand("view.zoomReset")}
          isBottomOpen={!ws.bottomCollapsed}
          bottomActiveTab={ws.bottomActiveTab}
          onToggleBottom={() => {
            ws.setBottomCollapsed((prev) => {
              if (prev) handleZoneClick("bottom");
              return !prev;
            });
          }}
          isExecutionTraceActive={!ws.bottomCollapsed && ws.bottomActiveTab === "trace"}
          onToggleExecutionTrace={() => {
            if (ws.bottomCollapsed) {
              showBottomTab("trace");
              handleZoneClick("bottom");
            } else if (ws.bottomActiveTab === "trace") {
              ws.setBottomCollapsed(true);
            } else {
              ws.setBottomActiveTab("trace");
            }
          }}
          isOutputLogOpen={ws.isOutputLogOpen}
          onToggleOutputLog={() => ws.setIsOutputLogOpen((prev) => !prev)}
          onTearOffLog={(originX, originY) => {
            ws.setIsOutputLogOpen(false);
            fp.startTearOff("console", "Output Log", "bottom-tab", originX, originY);
          }}
        />
      </div>

      <AiDockOverlays ai={ai} />

      <Suspense fallback={null}>
        {/* Global Search Modal Overlay (Ctrl+Shift+F) */}
        {isGlobalSearchOpen && (
          <GlobalSearchPanel
            isModal
            isOpen={isGlobalSearchOpen}
            onClose={() => setIsGlobalSearchOpen(false)}
            onNavigate={(id, title) => handleDockFullPage(id, title || id)}
          />
        )}
        {/* Command Palette Modal Overlay (Ctrl+P / Ctrl+K) */}
        {isCommandPaletteOpen && <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />}
      </Suspense>
    </div>
  );
};
