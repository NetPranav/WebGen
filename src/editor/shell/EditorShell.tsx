"use client";

/**
 * ============================================================================
 * EDITOR SHELL ROOT COMPONENT
 * ============================================================================
 * UI Element: Master IDE Studio Layout Shell & Dock Manager
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Coordinates 4 dock zones (left, center, right, bottom), splitters, and status bar.
 * Styling Source: `@/editor/styles/dock.css` (`.dock-layout`)
 * 
 * ARCHITECTURE & ISOLATION NOTE:
 * Governed strictly by `.dock-layout`. Panel sizes are managed reactively via state
 * and passed as bounded numbers. No cross-component class leaks.
 * Matches UI.md §5 and PANELS.md.
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import "@/editor/styles/dock.css";
import { DockZone } from "./DockZone";
import { DockSplitter } from "./DockSplitter";
import { DockCornerSplitter } from "./DockCornerSplitter";
import { DockTabBar } from "./DockTabBar";
import { StatusBar } from "./StatusBar";
import { StudioHeader } from "./StudioHeader";
import { WorkspaceTabStrip } from "./WorkspaceTabStrip";
import { WhiteboardCanvas } from "@/editor/canvas/WhiteboardCanvas";
import { OutlinerTree } from "@/editor/panels/outliner/OutlinerTree";
import { ElementOutliner } from "@/editor/panels/outliner/ElementOutliner";
import { DetailsInspector } from "@/editor/panels/details/DetailsInspector";
import { ContentBrowser } from "@/editor/panels/content-browser/ContentBrowser";
import { OutputConsole } from "@/editor/panels/console/OutputConsole";
import { ProjectSettings } from "@/editor/panels/settings/ProjectSettings";
import { TimelineSequencer } from "@/editor/panels/sequencer/TimelineSequencer";
import { CurveEditor } from "@/editor/panels/curves/CurveEditor";
import { AnimationExportPreview } from "@/editor/panels/sequencer/AnimationExportPreview";
import { FullPageDock } from "./FullPageDock";
import { TearOffDragOverlay } from "./TearOffDragOverlay";
import { AssetDetailsInspector } from "@/editor/panels/details/AssetDetailsInspector";
import { AssetFileEditor } from "@/editor/panels/content-browser/AssetFileEditor";
import { StateMatrixViewer } from "@/editor/panels/state/StateMatrixViewer";
import { ContentBlockShelf } from "@/editor/panels/content-browser/ContentBlockShelf";
import { LiveCodeInspector } from "@/editor/panels/code-view";
import { GlobalSearchPanel } from "@/editor/panels/global-search";
import { UndoHistoryPanel } from "@/editor/panels/history";
import { ReferenceViewerPanel } from "@/editor/panels/dependencies";
import {
  BlueprintCanvas,
  ExecutionTracePanel,
  PagesManager,
  DeploymentDashboard,
  PluginManager,
  VersionControlPanel,
} from "./afterTrackPanels";
import { CommandPalette } from "./CommandPalette";
import { ShortcutRegistry } from "@/runtime/ShortcutRegistry";
import { AiPromptBar } from "@/editor/panels/copilot/AiPromptBar";
import { useTearOff, TearOffDragSource } from "@/core/events/useTearOff";
import { useTearOffChannel } from "@/core/events/useTearOffChannel";
import { useProjectStore } from "@/core/store/useProjectStore";
import { useHistoryStore } from "@/core/store/useHistoryStore";
import { ProjectDatabase, generateProjectId, createDefaultBlankSnapshot } from "@/core/storage/ProjectDatabase";
import { projectSession, useSaveStatus, type PendingRecovery } from "@/core/storage/ProjectSession";
import { historyCommands, installGestureCoalescing } from "@/core/store/useDocumentStore";
import { LazyFileError, isLazyFileName, lazyFileName, parseLazyFile, serializeLazyFile } from "@/core/storage/lazyFile";
import { RecoveryPrompt, SaveErrorBanner, FileDropOverlay } from "./PersistenceUi";
import {
  Save,
  Undo2,
  Redo2,
  Terminal,
  X,
  Settings,
  Focus,
  Monitor,
  Network,
  Sparkles,
  Globe,
  SlidersHorizontal,
  ArrowUpRight,
  Eye,
} from "lucide-react";
import { PanelTab } from "@/core/types/workspace";
import { useLatestRef } from "@/core/hooks/useLatestRef";

interface EditorShellProps {
  headerSlot?: React.ReactNode;
  leftPanels?: Record<string, React.ReactNode>;
  rightPanels?: Record<string, React.ReactNode>;
  bottomPanels?: Record<string, React.ReactNode>;
  centerPanels?: Record<string, React.ReactNode>;
}

const ALL_BOTTOM_TABS: PanelTab[] = [
  { id: "content-browser", title: "Content Browser", closable: false },
  { id: "sequencer", title: "Motion Sequencer", closable: false },
  { id: "export-code", title: "Export Preview", closable: false },
];

export const EditorShell: React.FC<EditorShellProps> = ({
  headerSlot,
  leftPanels = {},
  rightPanels = {},
  bottomPanels = {},
  centerPanels = {},
}) => {
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  /* --------------------------------------------------------------------------
   * Dock Sizing State (with min/max boundaries)
   * -------------------------------------------------------------------------- */
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(320);
  const [bottomHeight, setBottomHeight] = useState(290);

  // DOM handles the splitters write live px values to while dragging (no
  // React re-render mid-drag — see DockSplitter/DockCornerSplitter).
  const rightZoneRef = useRef<HTMLElement | null>(null);
  const bottomZoneRef = useRef<HTMLElement | null>(null);
  const aiZoneRef = useRef<HTMLDivElement | null>(null);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  type DockLayer = "left" | "right" | "bottom" | "ai";
  const [activeLayer, setActiveLayer] = useState<DockLayer>("bottom");
  const activeLayerRef = useLatestRef<DockLayer>(activeLayer);
  const layerTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (layerTimerRef.current) {
        clearTimeout(layerTimerRef.current);
      }
    };
  }, []);

  const handleZoneMouseEnter = (targetLayer: DockLayer) => {
    if (layerTimerRef.current) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }
    // If this zone is already the active top layer, nothing to switch
    if (targetLayer === activeLayerRef.current) return;

    // Dwell timer: Must stay in this panel/drawer for ~2 seconds before overlapping
    // Until then, whichever panel/drawer was on top remains on top!
    layerTimerRef.current = setTimeout(() => {
      setActiveLayer(targetLayer);
      layerTimerRef.current = null;
    }, 2000);
  };

  const handleZoneMouseLeave = (zone: DockLayer) => {
    // If mouse leaves before the 2 seconds, cancel the dwell transition timer.
    // Whichever layer was active continues to be active!
    if (layerTimerRef.current) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }
  };

  const handleZoneClick = React.useCallback((targetLayer: DockLayer) => {
    // Immediate click bypasses dwell timer
    if (layerTimerRef.current) {
      clearTimeout(layerTimerRef.current);
      layerTimerRef.current = null;
    }
    setActiveLayer(targetLayer);
  }, []);

  /* --------------------------------------------------------------------------
   * Active Tab State
   * -------------------------------------------------------------------------- */
  const [leftActiveTab, setLeftActiveTab] = useState("outliner");
  const [rightActiveTab, setRightActiveTab] = useState("details");
  const [bottomActiveTab, setBottomActiveTab] = useState("content-browser");
  const [centerActiveTab, setCenterActiveTab] = useState("viewport");
  const [isOutputLogOpen, setIsOutputLogOpen] = useState(false);

  // World Environment & Viewport State
  const environment = useProjectStore((s) => s.environment);
  const updateEnvironment = useProjectStore((s) => s.updateEnvironment);
  const toggleInspectMode = useProjectStore((s) => s.toggleInspectMode);
  const [isWorldEnvPopoverOpen, setIsWorldEnvPopoverOpen] = useState(false);

  // Dismiss the World Quick Controls popover on outside click or Escape
  useEffect(() => {
    if (!isWorldEnvPopoverOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest("#world-env-quick-popover, #canvas-world-env-quick-btn")) return;
      setIsWorldEnvPopoverOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsWorldEnvPopoverOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWorldEnvPopoverOpen]);

  // Sub-Phase 5.4 & Phase 7: LazyLayout AI Assistant State
  const [isAiCoPilotOpen, setIsAiCoPilotOpen] = useState(false);
  const [aiDockMode, setAiDockMode] = useState<"replace" | "split-left">("split-left");
  const [aiPanelWidth, setAiPanelWidth] = useState(340);
  const [isDraggingAi, setIsDraggingAi] = useState(false);
  const [dragCursorPos, setDragCursorPos] = useState({ x: 0, y: 0 });
  const [aiDockSide, setAiDockSide] = useState<"left" | "right">("right");
  const [activeHoverDropSide, setActiveHoverDropSide] = useState<"left" | "right" | null>(null);
  /** Measured dock-body geometry while dragging LazyLayout AI, so the drop slots sit exactly
   * where the panel will land (flush left of the canvas, or tucked left of the Details dock). */
  const [dropSlotBounds, setDropSlotBounds] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

  // On a narrow (mobile/tablet-portrait) viewport, panels dock as overlays over the
  // canvas rather than squeezing it (see dock.css's <=860px media block), so default
  // them to closed — otherwise the first paint is a full-screen panel hiding the
  // canvas. Re-collapses whenever the viewport crosses into that range, but doesn't
  // keep fighting a panel the user manually reopens while still narrow.
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
  }, []);

  /** Window menu entry point: start the drag-to-dock gesture (or unplug if already open) */
  const handleStartDragAI = useCallback(() => {
    if (isAiCoPilotOpen) {
      setIsAiCoPilotOpen(false);
      setIsDraggingAi(false);
      setActiveHoverDropSide(null);
      return;
    }
    setIsDraggingAi(true);
    setDragCursorPos({
      x: typeof window !== "undefined" ? window.innerWidth / 2 : 600,
      y: typeof window !== "undefined" ? window.innerHeight / 3 : 250,
    });
    setActiveHoverDropSide(null);
  }, [isAiCoPilotOpen]);

  /** Start re-docking an already-docked LayoutAI panel (grip drag) */
  const handleStartRedockAI = useCallback(() => {
    setIsAiCoPilotOpen(false);
    setIsDraggingAi(true);
    setDragCursorPos({
      x: typeof window !== "undefined" ? window.innerWidth / 2 : 600,
      y: typeof window !== "undefined" ? window.innerHeight / 3 : 250,
    });
    setActiveHoverDropSide(null);
  }, []);

  const toggleAiCoPilot = useCallback(() => {
    setIsDraggingAi(false);
    setActiveHoverDropSide(null);
    if (!isAiCoPilotOpen) setActiveLayer("ai");
    setIsAiCoPilotOpen(!isAiCoPilotOpen);
  }, [isAiCoPilotOpen]);

  // Pointer tracking for dragging LayoutAI — proximity-based dual-side detection
  useEffect(() => {
    if (!isDraggingAi) return;

    // The slots cover the dock body (below the header + workspace strip, above the status
    // bar). The left slot is flush with the body's left edge — there is no left dock — and
    // the right slot ends where the Details dock begins.
    const measure = () => {
      const body = document.querySelector(".dock-layout__body")?.getBoundingClientRect();
      const top = body?.top ?? 0;
      // Full body height: a freshly docked column is focused, so it sits above the bottom drawer.
      const bottom = body?.bottom ?? window.innerHeight;
      const left = body?.left ?? 0;
      const rightDock = rightZoneRef.current?.getBoundingClientRect();
      const right = !rightCollapsed && rightDock && rightDock.width > 0 ? rightDock.left : body?.right ?? window.innerWidth;
      return { top, bottom, left, right };
    };
    let bounds = measure();
    setDropSlotBounds(bounds);

    const detectSide = (clientX: number, clientY: number): "left" | "right" | null => {
      if (clientY < bounds.top || clientY > bounds.bottom) return null;
      if (clientX <= bounds.left + aiPanelWidth + 40) return "left";
      if (clientX >= bounds.right - aiPanelWidth - 40) return "right";
      return null;
    };

    const handleResize = () => {
      bounds = measure();
      setDropSlotBounds(bounds);
    };

    const handlePointerMove = (e: PointerEvent) => {
      setDragCursorPos({ x: e.clientX, y: e.clientY });
      setActiveHoverDropSide(detectSide(e.clientX, e.clientY));
    };

    const handlePointerUp = (e: PointerEvent) => {
      const side = detectSide(e.clientX, e.clientY);
      if (side) {
        setAiDockSide(side);
        setAiDockMode("split-left");
        setIsAiCoPilotOpen(true);
        setActiveLayer("ai");
      }
      setIsDraggingAi(false);
      setActiveHoverDropSide(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDraggingAi(false);
        setActiveHoverDropSide(null);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDraggingAi, rightWidth, rightCollapsed, aiPanelWidth]);

  const [zoomLevel, setZoomLevel] = useState(100);
  const saveState = useSaveStatus((s) => s.state);
  const isDirty = saveState === "pending" || saveState === "saving" || saveState === "error";
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);
  const [recovery, setRecovery] = useState<PendingRecovery | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState("full-studio");
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const projectId = useProjectStore((s) => s.projectId) ?? "";

  const [selectedElement, setSelectedElement] = useState<{ id: string; name: string } | null>(null);
  const [focusedBlueprintNodeId, setFocusedBlueprintNodeId] = useState<string | null>(null);

  /* --------------------------------------------------------------------------
   * Sub-Phase 2.4: Workspace Tailoring & Project Initialization from query params
   * -------------------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const currentId = params.get("projectId") || params.get("id") || "";
    const archetype = params.get("archetype");
    const name = params.get("name") ? decodeURIComponent(params.get("name")!) : "";
    const settings = {
      archetype: archetype || "container",
      framework: params.get("framework") || "nextjs-app",
      styling: params.get("styling") || "tailwind",
      animation: params.get("animation") || "gsap",
      language: params.get("lang") || "typescript",
      template: params.get("template") || "blank",
    };

    let cancelled = false;
    void (async () => {
      const id = currentId || generateProjectId();
      if (!currentId) {
        // No project in the URL: start a new blank one and put its id in the URL.
        const updatedUrl = new URL(window.location.href);
        updatedUrl.searchParams.set("projectId", id);
        window.history.replaceState({}, "", updatedUrl.pathname + updatedUrl.search);
      }
      const result = await projectSession.open(id, {
        create: { name: name || "Blank Project", settings, snapshot: createDefaultBlankSnapshot(id, name || "Blank Project", settings) },
      });
      if (!cancelled && result.recovery) setRecovery(result.recovery);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave safety: save when the tab is hidden or the page goes away.
  useEffect(() => {
    const flush = () => void projectSession.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // A pointer press (drag, scrub, slider) is one undo step.
  useEffect(() => installGestureCoalescing(window), []);

  // Undo / redo: Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Ctrl+Y, and the command registry's events.
  // Text fields keep their own native undo.
  useEffect(() => {
    const isTextField = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || isTextField(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        historyCommands.undo();
      } else if ((key === "z" && e.shiftKey) || (key === "y" && e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        historyCommands.redo();
      }
    };
    const onUndo = () => historyCommands.undo();
    const onRedo = () => historyCommands.redo();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("antigravity:undo", onUndo);
    window.addEventListener("antigravity:redo", onRedo);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("antigravity:undo", onUndo);
      window.removeEventListener("antigravity:redo", onRedo);
    };
  }, []);

  /** Exports the open project as a `.lazy.json` file download. */
  const handleExportProjectFile = useCallback(async () => {
    const state = useProjectStore.getState();
    const record = state.projectId ? await ProjectDatabase.getProject(state.projectId) : null;
    const blob = new Blob([serializeLazyFile(state.getSnapshot(), record?.settings)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = lazyFileName(state.projectName || "project");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  /** Imports a `.lazy.json` file as a new project and opens it. */
  const handleImportProjectFile = useCallback(async (file: File) => {
    try {
      const parsed = parseLazyFile(await file.text());
      await projectSession.flush();
      const id = generateProjectId();
      await ProjectDatabase.registerProject({
        id,
        name: parsed.project.name,
        settings: parsed.project.settings,
        snapshot: { ...parsed.snapshot, projectId: id },
      });
      const result = await projectSession.open(id);
      setRecovery(result.recovery);
      const updatedUrl = new URL(window.location.href);
      for (const key of [...updatedUrl.searchParams.keys()]) updatedUrl.searchParams.delete(key);
      updatedUrl.searchParams.set("projectId", id);
      window.history.replaceState({}, "", updatedUrl.pathname + updatedUrl.search);
      setFileError(null);
    } catch (error) {
      setFileError(error instanceof LazyFileError ? error.message : `Could not open "${file.name}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  const handleOpenImportPicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void handleImportProjectFile(file);
    };
    input.click();
  }, [handleImportProjectFile]);

  // Drop a .lazy.json file anywhere on the window to open it.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setIsFileDragOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setIsFileDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setIsFileDragOver(false);
      const file = Array.from(e.dataTransfer?.files ?? []).find((f) => isLazyFileName(f.name));
      if (file) void handleImportProjectFile(file);
      else setFileError("Drop a LazyLayout project file (.lazy.json) to open it.");
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleImportProjectFile]);

  const handleSaveProject = useCallback(() => {
    void projectSession.flush();
  }, []);

  useEffect(() => {
    const handleGlobalSaveShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveProject();
      }
    };
    window.addEventListener("keydown", handleGlobalSaveShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSaveShortcut);
  }, [handleSaveProject]);

  /* --------------------------------------------------------------------------
   * Tear-Off & Full-Page Dock State
   * -------------------------------------------------------------------------- */
  const [detachedPanels, setDetachedPanels] = useState<Set<string>>(new Set());
  const [fullPagePanels, setFullPagePanels] = useState<
    Array<{ panelId: string; title: string; dragSource?: TearOffDragSource }>
  >([]);
  const [activeFullPageIndex, setActiveFullPageIndex] = useState<number>(0);
  const [activeFullPageTabId, setActiveFullPageTabId] = useState<string | null>(null);

  /** Store tab state during drag for snap-back cancellation */
  const draggedFullPageTabRef = React.useRef<{
    panelId: string;
    panelTitle: string;
    originalPanels: Array<{ panelId: string; title: string; dragSource?: TearOffDragSource }>;
    originalIndex: number;
  } | null>(null);

  const currentFullPagePanel =
    fullPagePanels[activeFullPageIndex] ?? fullPagePanels[0] ?? null;

  const currentTabId = activeFullPageTabId ?? currentFullPagePanel?.panelId ?? null;

  /** Store pre-full-page layout state for restoration on close */
  const preFullPageRef = React.useRef<{
    leftCollapsed: boolean;
    bottomCollapsed: boolean;
    bottomActiveTab: string;
  } | null>(null);

  /** All bottom-drawer panel definitions (before filtering) */
  /** Map panel IDs to titles for tear-off (includes console for output log) */
  const PANEL_TITLES: Record<string, string> = {
    "content-browser": "Content Browser",
    sequencer: "Motion Sequencer",
    "export-code": "Export Preview",
    trace: "Execution Trace",
    blueprint: "Logic Blueprint",
    curves: "Curve Editor",
    console: "Output Log",
  };

  const handleDockFullPage = useCallback(
    (panelId: string, panelTitle: string, dragSource?: TearOffDragSource) => {
      draggedFullPageTabRef.current = null;
      setActiveFullPageTabId(panelId);

      // Save current layout state before going full-page (only on first full-page tab)
      if (fullPagePanels.length === 0) {
        preFullPageRef.current = {
          leftCollapsed: leftCollapsed,
          bottomCollapsed: bottomCollapsed,
          bottomActiveTab: bottomActiveTab,
        };
      }

      setFullPagePanels((prev) => {
        const existingIdx = prev.findIndex((p) => p.panelId === panelId);
        if (existingIdx >= 0) {
          setActiveFullPageIndex(existingIdx);
          return prev;
        }
        const next = [...prev, { panelId, title: panelTitle, dragSource }];
        setActiveFullPageIndex(next.length - 1);
        return next;
      });

      // Auto-collapse left panel (outliner) and bottom drawer in full-page mode
      setLeftCollapsed(true);
      setBottomCollapsed(true);
      // Close output log if it was open
      if (panelId !== "console") {
        setIsOutputLogOpen(false);
      }
      // Remove from detached if it was there
      setDetachedPanels((prev) => {
        const next = new Set(prev);
        next.delete(panelId);
        return next;
      });
    },
    [fullPagePanels.length, leftCollapsed, bottomCollapsed, bottomActiveTab]
  );

  const handleCloseFullPageTab = useCallback((panelId: string) => {
    setFullPagePanels((prev) => {
      const closeIdx = prev.findIndex((p) => p.panelId === panelId);
      if (closeIdx === -1) return prev;
      const next = prev.filter((p) => p.panelId !== panelId);

      if (next.length === 0) {
        setActiveFullPageTabId(null);
        // All full-page tabs closed! Restore pre-full-page layout
        if (preFullPageRef.current) {
          setLeftCollapsed(preFullPageRef.current.leftCollapsed);
          setBottomCollapsed(preFullPageRef.current.bottomCollapsed);
          setBottomActiveTab(preFullPageRef.current.bottomActiveTab);
          preFullPageRef.current = null;
        } else {
          setBottomCollapsed(false);
          setBottomActiveTab("content-browser");
        }
        setActiveFullPageIndex(0);
      } else {
        setActiveFullPageIndex((curIdx) => {
          const newIdx = curIdx >= next.length ? next.length - 1 : curIdx === closeIdx ? Math.max(0, closeIdx - 1) : curIdx > closeIdx ? curIdx - 1 : curIdx;
          setActiveFullPageTabId(next[newIdx]?.panelId ?? "viewport");
          return newIdx;
        });
      }
      return next;
    });
  }, []);

  const handleCloseAllFullPage = useCallback(() => {
    setFullPagePanels([]);
    setActiveFullPageIndex(0);
    if (preFullPageRef.current) {
      setLeftCollapsed(preFullPageRef.current.leftCollapsed);
      setBottomCollapsed(preFullPageRef.current.bottomCollapsed);
      setBottomActiveTab(preFullPageRef.current.bottomActiveTab);
      preFullPageRef.current = null;
    } else {
      setBottomCollapsed(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Ctrl+P or Ctrl+K (without Shift)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key.toLowerCase() === "p" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        toggleAiCoPilot();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        handleDockFullPage("code", "Live Code Inspector");
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleDockFullPage("pages-manager", "Pages & Routing Manager");
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDockFullPage("deploy", "Deployment & Cloud Studio");
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        handleDockFullPage("plugins", "Plugin Manager");
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        handleDockFullPage("history", "Undo History");
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        handleDockFullPage("versioning", "Version Control & Snapshots");
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleDockFullPage("dependencies", "Reference Viewer & Dependency Graph");
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setBottomCollapsed(false);
        setBottomActiveTab("sequencer");
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBottomCollapsed(false);
        setBottomActiveTab("curves");
      }
    };

    const handleOpenCommandPalette = () => setIsCommandPaletteOpen(true);
    const handleOpenGlobalSearch = () => setIsGlobalSearchOpen(true);
    const handleOpenDeployment = () => handleDockFullPage("deploy", "Deployment & Cloud Studio");
    const handleOpenPagesManager = () => handleDockFullPage("pages-manager", "Pages & Routing Manager");
    const handleOpenCodeInspector = () => handleDockFullPage("code", "Live Code Inspector");
    const handleOpenCopilot = () => toggleAiCoPilot();
    const handleOpenPlugins = () => handleDockFullPage("plugins", "Plugin Manager");
    const handleOpenHistory = () => handleDockFullPage("history", "Undo History");
    const handleOpenVersioning = () => handleDockFullPage("versioning", "Version Control & Snapshots");
    const handleOpenDependencies = () => handleDockFullPage("dependencies", "Reference Viewer & Dependency Graph");

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("antigravity:open_command_palette", handleOpenCommandPalette);
    window.addEventListener("antigravity:open_global_search", handleOpenGlobalSearch);
    window.addEventListener("antigravity:open_deployment", handleOpenDeployment);
    window.addEventListener("antigravity:open_pages_manager", handleOpenPagesManager);
    window.addEventListener("antigravity:open_code_inspector", handleOpenCodeInspector);
    window.addEventListener("antigravity:open_copilot", handleOpenCopilot);
    window.addEventListener("antigravity:open_plugins", handleOpenPlugins);
    window.addEventListener("antigravity:open_history", handleOpenHistory);
    window.addEventListener("antigravity:open_versioning", handleOpenVersioning);
    window.addEventListener("antigravity:open_dependencies", handleOpenDependencies);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("antigravity:open_command_palette", handleOpenCommandPalette);
      window.removeEventListener("antigravity:open_global_search", handleOpenGlobalSearch);
      window.removeEventListener("antigravity:open_deployment", handleOpenDeployment);
      window.removeEventListener("antigravity:open_pages_manager", handleOpenPagesManager);
      window.removeEventListener("antigravity:open_code_inspector", handleOpenCodeInspector);
      window.removeEventListener("antigravity:open_copilot", handleOpenCopilot);
      window.removeEventListener("antigravity:open_plugins", handleOpenPlugins);
      window.removeEventListener("antigravity:open_history", handleOpenHistory);
      window.removeEventListener("antigravity:open_versioning", handleOpenVersioning);
      window.removeEventListener("antigravity:open_dependencies", handleOpenDependencies);
    };
  }, [toggleAiCoPilot, handleDockFullPage]);

  const startTearOffRef = React.useRef<
    (panelId: string, panelTitle: string, dragSource: TearOffDragSource, originX: number, originY: number) => void
  >(() => {});

  /** Starts tear-off from a full-page tab title */
  const handleFullPageTabDragStart = useCallback(
    (panelId: string, panelTitle: string, originX: number, originY: number) => {
      draggedFullPageTabRef.current = {
        panelId,
        panelTitle,
        originalPanels: [...fullPagePanels],
        originalIndex: activeFullPageIndex,
      };

      // Lift the tab out of fullPagePanels immediately so:
      // - If 2+ tabs, another tab displays in full-screen
      // - If 1 tab, full-screen closes and underlying screen shows!
      setFullPagePanels((prev) => {
        const idx = prev.findIndex((p) => p.panelId === panelId);
        const next = prev.filter((p) => p.panelId !== panelId);
        if (next.length === 0) {
          setActiveFullPageIndex(0);
        } else {
          setActiveFullPageIndex((cur) => {
            if (cur >= next.length) return next.length - 1;
            if (cur === idx) return Math.min(idx, next.length - 1);
            if (cur > idx) return cur - 1;
            return cur;
          });
        }
        return next;
      });

      startTearOffRef.current(panelId, panelTitle, "fullpage-tab", originX, originY);
    },
    [fullPagePanels, activeFullPageIndex]
  );

  /** Restores dragged tab back to full-page tabs on snap-back cancellation */
  const handleCancelDrag = useCallback(
    (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => {
      if (dragSource === "fullpage-tab" && draggedFullPageTabRef.current) {
        const saved = draggedFullPageTabRef.current;
        setFullPagePanels(saved.originalPanels);
        setActiveFullPageIndex(saved.originalIndex);
        draggedFullPageTabRef.current = null;
      }
    },
    []
  );

  /** Dropped in bottom drawer region: attach and OPEN bottom drawer */
  const handleAttachBottomDrawer = useCallback(
    (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => {
      draggedFullPageTabRef.current = null;
      setFullPagePanels((prev) => prev.filter((p) => p.panelId !== panelId));
      setDetachedPanels((prev) => {
        const next = new Set(prev);
        next.delete(panelId);
        return next;
      });

      if (panelId === "console") {
        setIsOutputLogOpen(true);
      } else {
        setBottomCollapsed(false);
        setBottomActiveTab(panelId);
        handleZoneClick("bottom");
      }
    },
    [handleZoneClick]
  );

  /** Dropped on bottom bar: attach to original place but KEEP DRAWER CLOSED */
  const handleAttachBottomBar = useCallback(
    (panelId: string, panelTitle: string, dragSource: TearOffDragSource) => {
      draggedFullPageTabRef.current = null;
      setFullPagePanels((prev) => prev.filter((p) => p.panelId !== panelId));
      setDetachedPanels((prev) => {
        const next = new Set(prev);
        next.delete(panelId);
        return next;
      });

      if (panelId === "console") {
        setIsOutputLogOpen(false);
      } else {
        setBottomActiveTab(panelId);
        setBottomCollapsed(true);
      }
    },
    []
  );

  const handleOpenNewTab = useCallback(
    (panelId: string, panelTitle: string, dragSource?: TearOffDragSource) => {
      draggedFullPageTabRef.current = null;
      setFullPagePanels((prev) => prev.filter((p) => p.panelId !== panelId));

      // Handle output log special case
      if (panelId === "console") {
        setIsOutputLogOpen(false);
      }

      // Only bottom-tab items (blueprint, sequencer, console) or fullpage tabs from bottom should vanish from their origin.
      // Content browser files and outliner items stay visible in their origin panels.
      const shouldVanishFromOrigin =
        dragSource === "bottom-tab" || dragSource === "fullpage-tab" || panelId === "console";

      if (shouldVanishFromOrigin) {
        setDetachedPanels((prev) => new Set(prev).add(panelId));
      }

      // Open in a new browser tab — must be synchronous from user gesture
      const url = `${window.location.origin}/editor/detach/${panelId}`;
      window.open(url, `detach-${panelId}`, "noopener");

      // If all bottom tabs are now detached or full-paged, collapse the drawer
      if (shouldVanishFromOrigin && panelId !== "console") {
        const remainingTabs = ALL_BOTTOM_TABS.filter(
          (t) =>
            t.id !== panelId &&
            !detachedPanels.has(t.id) &&
            !fullPagePanels.some((p) => p.panelId === t.id)
        );
        if (remainingTabs.length === 0) {
          setBottomCollapsed(true);
        } else {
          // Switch active tab to first remaining
          setBottomActiveTab(remainingTabs[0].id);
        }
      }
    },
    [detachedPanels, fullPagePanels]
  );

  // Tear-off drag hook
  const { tearOffState, startTearOff } = useTearOff({
    onDockFullPage: handleDockFullPage,
    onOpenNewTab: handleOpenNewTab,
    onAttachBottomDrawer: handleAttachBottomDrawer,
    onAttachBottomBar: handleAttachBottomBar,
    onCancelDrag: handleCancelDrag,
  });
  React.useLayoutEffect(() => {
    startTearOffRef.current = startTearOff;
  });

  // When in full-page mode, clicking outside the open bottom drawer / outliner auto-minimizes both
  React.useEffect(() => {
    if (fullPagePanels.length === 0) return;
    const isAnyDrawerOpen = !leftCollapsed || !bottomCollapsed || isOutputLogOpen;
    if (!isAnyDrawerOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If click is inside left drawer, bottom drawer, output log, status bar, or splitters, ignore
      if (
        target.closest(".dock-zone--left") ||
        target.closest(".dock-zone--bottom") ||
        target.closest(".output-log-drawer") ||
        target.closest(".dock-layout__statusbar") ||
        target.closest(".dock-splitter") ||
        target.closest(".dock-corner-splitter")
      ) {
        return;
      }

      // Clicked anywhere else in full-page mode (center canvas, fullpage dock, details panel, etc.)
      setLeftCollapsed(true);
      setBottomCollapsed(true);
      setIsOutputLogOpen(false);
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [fullPagePanels.length, leftCollapsed, bottomCollapsed, isOutputLogOpen]);

  // Cross-tab communication: listen for REATTACH from detached tabs
  useTearOffChannel({
    onReattach: (msg) => {
      setDetachedPanels((prev) => {
        const next = new Set(prev);
        next.delete(msg.panelId);
        return next;
      });
      // Re-expand bottom drawer and set reattached tab as active
      if (msg.panelId === "console") {
        // Output log reattaches to its own drawer
        setIsOutputLogOpen(true);
      } else {
        setBottomCollapsed(false);
        setBottomActiveTab(msg.panelId);
      }
    },
  });

  /** Bottom tabs filtered to exclude detached and full-page panels */
  const fullPagePanelIds = new Set(fullPagePanels.map((p) => p.panelId));
  const visibleBottomTabs = ALL_BOTTOM_TABS.filter(
    (t) => !detachedPanels.has(t.id) && !fullPagePanelIds.has(t.id)
  );

  const handleBottomTearOffStart = useCallback(
    (tabId: string, tabTitle: string, originX: number, originY: number) => {
      startTearOff(tabId, tabTitle, "bottom-tab", originX, originY);
    },
    [startTearOff]
  );

  /** Generic tear-off starter for content browser files, outliner items, output log, etc. */
  const handleGenericTearOffStart = useCallback(
    (panelId: string, panelTitle: string, originX: number, originY: number) => {
      startTearOff(panelId, panelTitle, "content-browser", originX, originY);
    },
    [startTearOff]
  );

  const handleOpenPanel = (zone: "left" | "right" | "bottom" | "center", tabId: string) => {
    if (zone === "left") {
      setLeftCollapsed(false);
      setLeftActiveTab(tabId);
      handleZoneClick("left");
    } else if (zone === "right") {
      setRightCollapsed(false);
      setRightActiveTab(tabId);
      handleZoneClick("right");
    } else if (zone === "bottom") {
      if (tabId === "blueprint") {
        handleDockFullPage("blueprint", "Logic Blueprint");
        return;
      }
      if (tabId === "console") {
        setIsOutputLogOpen(true);
        return;
      }
      setBottomCollapsed(false);
      setBottomActiveTab(tabId);
      handleZoneClick("bottom");
    } else if (zone === "center") {
      if (tabId === "blueprint") {
        handleDockFullPage("blueprint", "Logic Blueprint");
      } else if (tabId === "sequencer") {
        handleDockFullPage("sequencer", "Timeline Sequencer");
      } else if (tabId === "content-browser") {
        handleDockFullPage("content-browser", "Content Browser");
      } else if (tabId === "plugins" || tabId === "plugin-manager") {
        handleDockFullPage("plugins", "Plugin Manager");
      } else if (tabId === "history" || tabId === "undo-history") {
        handleDockFullPage("history", "Undo History");
      } else if (tabId === "code") {
        handleDockFullPage("code", "Live Code Inspector");
      } else if (tabId === "pages-manager") {
        handleDockFullPage("pages-manager", "Pages & Routing Manager");
      } else if (tabId === "deploy") {
        handleDockFullPage("deploy", "Deployment & Cloud Studio");
      } else if (tabId === "global-search" || tabId === "search") {
        setIsGlobalSearchOpen(true);
      } else if (tabId === "settings") {
        setCenterActiveTab("settings");
      } else {
        setCenterActiveTab("viewport");
      }
    }
  };

  const handleOpenSettings = () => {
    setCenterActiveTab("settings");
  };

  const handleCloseSettings = useCallback(() => {
    setCenterActiveTab("viewport");
  }, []);

  const handleToggleSettings = useCallback(() => {
    setCenterActiveTab((curr) => (curr === "settings" ? "viewport" : "settings"));
  }, []);

  const handleRecenterCanvas = useCallback(() => {
    if (centerActiveTab === "settings") {
      setCenterActiveTab("viewport");
    }
    window.dispatchEvent(new CustomEvent("antigravity:recenter_canvas"));
  }, [centerActiveTab]);

  useEffect(() => {
    const handleEscapeSettings = (e: KeyboardEvent) => {
      if (e.key === "Escape" && centerActiveTab === "settings") {
        handleCloseSettings();
      }
    };
    window.addEventListener("keydown", handleEscapeSettings);
    return () => window.removeEventListener("keydown", handleEscapeSettings);
  }, [centerActiveTab, handleCloseSettings]);

  /* --------------------------------------------------------------------------
   * Workspace Preset Switcher (UI.md §5.2)
   * -------------------------------------------------------------------------- */
  const handleSelectWorkspace = (preset: string) => {
    setActiveWorkspace(preset);
    if (preset === "full-studio") {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setBottomCollapsed(false);
      setLeftWidth(300);
      setRightWidth(320);
      setBottomHeight(240);
      setBottomActiveTab("content-browser");
      setCenterActiveTab("viewport");
    } else if (preset === "design") {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setBottomCollapsed(true);
      setLeftWidth(340);
      setRightWidth(360);
      setLeftActiveTab("outliner");
      setRightActiveTab("details");
      setCenterActiveTab("viewport");
    } else if (preset === "animate") {
      setLeftCollapsed(true);
      setRightCollapsed(false);
      setRightWidth(340);
      setRightActiveTab("details");
      setBottomCollapsed(false);
      setBottomHeight(420);
      setBottomActiveTab("sequencer");
      setCenterActiveTab("viewport");
      handleZoneClick("bottom");
    } else if (preset === "logic") {
      setLeftCollapsed(true);
      setRightCollapsed(false);
      setBottomCollapsed(true);
      handleDockFullPage("blueprint", "Logic Blueprint");
    } else if (preset === "data") {
      setLeftCollapsed(true);
      setRightCollapsed(false);
      setBottomCollapsed(false);
      setBottomActiveTab("content-browser");
      setBottomHeight(420);
      handleZoneClick("bottom");
    } else if (preset === "debug") {
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setIsOutputLogOpen(true);
    }
  };

  const handleResetLayout = () => {
    handleSelectWorkspace("full-studio");
  };

  /* --------------------------------------------------------------------------
   * Default Tab Configurations (From PANELS.md & User Design Directive)
   * -------------------------------------------------------------------------- */
  const leftTabs: PanelTab[] = [
    { id: "outliner", title: "Outliner", closable: false },
    { id: "state-matrix", title: "State Matrix", closable: false },
  ];

  const rightTabs: PanelTab[] = [
    { id: "details", title: "Details", closable: false },
    { id: "tokens", title: "Tokens", closable: true },
    { id: "validation", title: "Errors (0)", closable: true },
  ];

  // Bottom tabs now come from visibleBottomTabs with optional debug tab
  const bottomTabs = useMemo(() => {
    const tabs = [...visibleBottomTabs];
    if (bottomActiveTab === "trace" && !tabs.some((t) => t.id === "trace")) {
      tabs.push({ id: "trace", title: "Execution Trace (Debug)", closable: true });
    }
    return tabs;
  }, [visibleBottomTabs, bottomActiveTab]);

  const centerTabs: { id: string; title: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "viewport", title: "Viewport (Design)", icon: <Monitor size={13} /> },
    { id: "blueprint", title: "Logic Blueprint", icon: <Network size={13} />, badge: "Full Stage" },
    { id: "settings", title: "Project Settings", icon: <Settings size={13} /> },
  ];

  /* --------------------------------------------------------------------------
   * Splitter Resize Handlers — DockSplitter/DockCornerSplitter already clamp
   * to min/max and write live px directly to the zone's DOM node while
   * dragging, so these just commit the final value to state once on release.
   * -------------------------------------------------------------------------- */
  const commitRightWidth = useCallback((v: number) => setRightWidth(v), []);
  const commitBottomHeight = useCallback((v: number) => setBottomHeight(v), []);
  const commitRightAndBottom = useCallback(({ right, bottom }: { right: number; bottom: number }) => {
    setRightWidth(right);
    setBottomHeight(bottom);
  }, []);

  /** LazyLayout AI panel content — a single consolidated assistant (no more MotionAI/LayoutAI
   * mode switcher: one tool, one theme, matching the rest of the light shell). */
  const renderAiDockContent = () => (
    <AiPromptBar
      dockMode="split-left"
      onToggleDockMode={setAiDockMode}
      onClose={() => setIsAiCoPilotOpen(false)}
      onStartDrag={handleStartRedockAI}
    />
  );

  /** The LayoutAI dock column (panel + splitter) — same JSX regardless of which
   * of the 4 layout branches (full-page/normal × left/right) is currently active.
   * The splitter always sits on the edge facing the canvas: after the panel when
   * docked left (drag right = wider), before it when docked right (inverted). */
  const renderAiDockColumn = (side: "left" | "right") => {
    if (!isAiCoPilotOpen || aiDockSide !== side) return null;
    const splitter = (
      <DockSplitter
        orientation="vertical"
        targetRef={aiZoneRef}
        value={aiPanelWidth}
        min={260}
        max={600}
        invert={side === "right"}
        onCommit={setAiPanelWidth}
        style={{ zIndex: activeLayer === "ai" ? 36 : 28 }}
      />
    );
    return (
      <React.Fragment key={`ai-dock-${side}`}>
        {side === "right" && splitter}
        <div
          ref={aiZoneRef}
          className={`dock-zone ai-copilot-dock-col ai-copilot-dock-col--${side} ${side === "right" ? "anim-slide-right" : "anim-slide-left"} ${activeLayer === "ai" ? "dock-zone--elevated" : ""}`}
          onMouseEnter={() => handleZoneMouseEnter("ai")}
          onMouseLeave={() => handleZoneMouseLeave("ai")}
          onMouseDown={() => handleZoneClick("ai")}
          style={{
            width: aiPanelWidth,
            minWidth: aiPanelWidth,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: "var(--surface-panel-solid)",
            [side === "right" ? "borderLeft" : "borderRight"]: "1px solid var(--border-default)",
            position: "relative",
            // Same layering contract as the Details dock: under the bottom drawer until
            // focused (click, or 2s hover dwell), then full-height on top of it.
            zIndex: activeLayer === "ai" ? 35 : 20,
          }}
        >
          {renderAiDockContent()}
        </div>
        {side === "left" && splitter}
      </React.Fragment>
    );
  };

  return (
    <div className="dock-layout">
      {recovery && (
        <RecoveryPrompt
          recovery={recovery}
          onRestore={() => {
            setRecovery(null);
            void projectSession.restoreRecovery();
          }}
          onDiscard={() => {
            setRecovery(null);
            void projectSession.discardRecovery();
          }}
        />
      )}
      <SaveErrorBanner fileError={fileError} onDismissFileError={() => setFileError(null)} />
      <FileDropOverlay visible={isFileDragOver} />
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
            if (data.type === "asset") {
              handleDockFullPage(data.id, data.name);
            }
          } catch {}
        }}
      >
        {headerSlot || (
          <StudioHeader
            projectId={projectId}
            isDirty={isDirty}
            deviceMode={deviceMode}
            onSelectDeviceMode={(mode) => setDeviceMode(mode)}
            leftOpen={!leftCollapsed}
            rightOpen={!rightCollapsed}
            bottomOpen={!bottomCollapsed}
            onToggleLeft={() => setLeftCollapsed((c) => !c)}
            onToggleRight={() => setRightCollapsed((c) => !c)}
            onToggleBottom={() => setBottomCollapsed((c) => !c)}
            onSelectWorkspace={handleSelectWorkspace}
            activeWorkspace={activeWorkspace}
            onSave={handleSaveProject}
            onExportProjectFile={() => void handleExportProjectFile()}
            onImportProjectFile={handleOpenImportPicker}
            onUndo={historyCommands.undo}
            onRedo={historyCommands.redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onZoomIn={() => setZoomLevel((z) => Math.min(z + 10, 250))}
            onZoomOut={() => setZoomLevel((z) => Math.max(z - 10, 25))}
            onZoomReset={() => setZoomLevel(100)}
            onResetLayout={handleResetLayout}
            onOpenPanel={handleOpenPanel}
            onOpenSettings={handleOpenSettings}
            onCloseSettings={handleCloseSettings}
            onToggleSettings={handleToggleSettings}
            isSettingsOpen={centerActiveTab === "settings"}
            onStartDragAI={handleStartDragAI}
            onToggleAI={toggleAiCoPilot}
            isAIOpen={isAiCoPilotOpen}
          />
        )}
        <WorkspaceTabStrip
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={handleSelectWorkspace}
          onOpenBottomTab={(tabId) => handleOpenPanel("bottom", tabId)}
          activeBottomTab={bottomCollapsed ? null : bottomActiveTab}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      </div>

      {/* Main Dock Body (Left, Center Column, Right, and Overlapping Bottom Drawer) */}
      <div className="dock-layout__body">
        {/* Full-Page Dock Mode — takes over entire body, outliner minimizes on left, asset details on right */}
        {currentFullPagePanel ? (
          <>
            {/* Full-page mode without left dock */}

            {/* LayoutAI docked on LEFT (beside Outliner) — Full-Page Layout */}
            {renderAiDockColumn("left")}

            {/* Center fills wide workspace with browser-like multi-tab FullPageDock */}
            <div
              className="dock-center-col"
              style={{ paddingBottom: 0 }}
            >
              <FullPageDock
                tabs={fullPagePanels.map((p) => ({
                  panelId: p.panelId,
                  panelTitle: p.title,
                  dragSource: p.dragSource,
                  isDirty,
                }))}
                activeTabId={currentTabId || currentFullPagePanel.panelId}
                onSelectTab={(panelId) => {
                  setActiveFullPageTabId(panelId);
                  const idx = fullPagePanels.findIndex((p) => p.panelId === panelId);
                  if (idx >= 0) setActiveFullPageIndex(idx);
                }}
                onCloseTab={handleCloseFullPageTab}
                onTabDragStart={handleFullPageTabDragStart}
                isDirty={isDirty}
                onSave={handleSaveProject}
                onUndo={historyCommands.undo}
                onRedo={historyCommands.redo}
                onCloseAll={handleCloseAllFullPage}
                onOpenAsset={(id, title) => handleDockFullPage(id, title)}
              >
                {currentTabId === "viewport" ? (
                  <WhiteboardCanvas
                    deviceMode={deviceMode}
                    zoomLevel={zoomLevel}
                    onZoomChange={setZoomLevel}
                    onSelectElement={setSelectedElement}
                    onDropAsset={(asset) => {
                      setSelectedElement({ id: asset.id, name: asset.name });
                    }}
                    onOpenExecutionTrace={() => {
                      setBottomCollapsed(false);
                      setBottomActiveTab("trace");
                    }}
                  />
                ) : currentFullPagePanel.panelId === "content-browser" ? (
                  <ContentBrowser
                    selectedFolderId={selectedElement?.id || ""}
                    selectedFolderName={selectedElement?.name || ""}
                    onSelectFolder={(folderId, folderName) => setSelectedElement({ id: folderId, name: folderName })}
                    onOpenAsset={(id, title) => handleDockFullPage(id, title)}
                    onTearOffItem={handleGenericTearOffStart}
                    onOpenCurveEditor={() => {
                      setBottomCollapsed(false);
                      setBottomActiveTab("sequencer");
                    }}
                    onOpenExportPreview={() => {
                      setBottomCollapsed(false);
                      setBottomActiveTab("export-code");
                    }}
                  />
                ) : currentFullPagePanel.panelId === "blueprint" ||
                currentFullPagePanel.panelId.includes("bp") ||
                currentFullPagePanel.title.toLowerCase().includes(".bp") ? (
                  <BlueprintCanvas focusedNodeId={focusedBlueprintNodeId} />
                ) : currentFullPagePanel.panelId === "trace" ? (
                  <ExecutionTracePanel
                    onNavigateToNode={(nodeId) => {
                      setFocusedBlueprintNodeId(nodeId);
                      handleDockFullPage("blueprint", "Logic Blueprint");
                    }}
                  />
                ) : currentFullPagePanel.panelId === "copilot" ? (
                  <AiPromptBar />
                ) : currentFullPagePanel.panelId === "curves" ? (
                  <CurveEditor />
                ) : currentFullPagePanel.panelId === "sequencer" ||
                  currentFullPagePanel.panelId.includes("seq") ||
                  currentFullPagePanel.title.toLowerCase().includes(".seq") ? (
                  <TimelineSequencer />
                ) : currentFullPagePanel.panelId === "console" ? (
                  <OutputConsole />
                ) : currentFullPagePanel.panelId === "code" ||
                  currentFullPagePanel.panelId === "code-view" ||
                  currentFullPagePanel.title.toLowerCase().includes("code") ? (
                  <LiveCodeInspector />
                ) : currentFullPagePanel.panelId === "pages-manager" ||
                  currentFullPagePanel.panelId === "sitemap" ||
                  currentFullPagePanel.panelId === "pages" ||
                  currentFullPagePanel.title.toLowerCase().includes("pages") ? (
                  <PagesManager />
                ) : currentFullPagePanel.panelId === "deploy" ||
                  currentFullPagePanel.panelId === "deployment" ||
                  currentFullPagePanel.title.toLowerCase().includes("deploy") ? (
                  <DeploymentDashboard />
                ) : currentFullPagePanel.panelId === "search" ||
                  currentFullPagePanel.panelId === "global-search" ||
                  currentFullPagePanel.title.toLowerCase().includes("search") ? (
                  <GlobalSearchPanel onNavigate={(id, title) => handleDockFullPage(id, title || id)} />
                ) : currentFullPagePanel.panelId === "plugins" ||
                  currentFullPagePanel.panelId === "plugin-manager" ||
                  currentFullPagePanel.title.toLowerCase().includes("plugin") ? (
                  <PluginManager />
                ) : currentFullPagePanel.panelId === "history" ||
                  currentFullPagePanel.panelId === "undo-history" ||
                  currentFullPagePanel.title.toLowerCase().includes("history") ? (
                  <UndoHistoryPanel />
                ) : currentFullPagePanel.panelId === "versioning" ||
                  currentFullPagePanel.panelId === "version-control" ||
                  currentFullPagePanel.title.toLowerCase().includes("version") ? (
                  <VersionControlPanel />
                ) : currentFullPagePanel.panelId === "dependencies" ||
                  currentFullPagePanel.panelId === "reference-viewer" ||
                  currentFullPagePanel.title.toLowerCase().includes("depend") ||
                  currentFullPagePanel.title.toLowerCase().includes("reference") ? (
                  <ReferenceViewerPanel />
                ) : (
                  <AssetFileEditor
                    assetId={currentFullPagePanel.panelId}
                    assetTitle={currentFullPagePanel.title}
                    isDirty={isDirty}
                    onSave={handleSaveProject}
                    onSwitchToBlueprint={() =>
                      handleDockFullPage("blueprint", "Logic Blueprint")
                    }
                  />
                )}
              </FullPageDock>
            </div>

            {/* LayoutAI docked on RIGHT (beside Details) — Full-Page Layout */}
            {renderAiDockColumn("right")}

            {/* Right vertical splitter */}
            {!rightCollapsed && (
              <DockSplitter
                orientation="vertical"
                targetRef={rightZoneRef}
                value={rightWidth}
                min={240}
                max={550}
                invert
                onCommit={commitRightWidth}
                style={{ zIndex: activeLayer === "right" ? 29 : 28 }}
              />
            )}

            {/* Right Dock Zone displaying Details */}
            <DockZone
              ref={rightZoneRef}
              zoneId="right"
              size={rightWidth}
              isCollapsed={rightCollapsed}
              tabs={
                currentTabId === "viewport" || currentFullPagePanel.panelId === "content-browser"
                  ? rightTabs
                  : [
                      { id: "asset-details", title: `${currentFullPagePanel.title} Details`, closable: false },
                      { id: "tokens", title: "Tokens", closable: true },
                    ]
              }
              activeTabId={
                currentTabId === "viewport" || currentFullPagePanel.panelId === "content-browser"
                  ? rightActiveTab
                  : "asset-details"
              }
              onSelectTab={(tabId) => {
                setRightActiveTab(tabId);
                handleZoneClick("right");
              }}
              onToggleCollapse={() => setRightCollapsed((c) => !c)}
              onMouseEnter={() => handleZoneMouseEnter("right")}
              onMouseLeave={() => handleZoneMouseLeave("right")}
              onClick={() => handleZoneClick("right")}
              className={activeLayer === "right" ? "dock-zone--elevated" : ""}
            >
              {currentTabId === "viewport" || currentFullPagePanel.panelId === "content-browser" ? (
                rightPanels[rightActiveTab] || (
                  rightActiveTab === "details" ? (
                    <DetailsInspector
                      selectedElementId={selectedElement?.id || null}
                      selectedElementName={selectedElement?.name || ""}
                      onOpenBlueprint={() => handleDockFullPage("blueprint", "Logic Blueprint")}
                      onDeselect={() => setSelectedElement(null)}
                    />
                  ) : rightActiveTab === "tokens" ? (
                    <ProjectSettings />
                  ) : (
                    <OutputConsole />
                  )
                )
              ) : (
                <AssetDetailsInspector
                  panelId={currentFullPagePanel.panelId}
                  panelTitle={currentFullPagePanel.title}
                  onOpenBlueprint={(_fnId) =>
                    handleDockFullPage("blueprint", "Logic Blueprint")
                  }
                />
              )}
            </DockZone>
          </>
        ) : (
          <>
            {/* Center Column: Full-width Center Stage (Canvas begins from left edge) */}

            {/* LayoutAI docked on LEFT (beside Outliner) — Normal Layout */}
            {renderAiDockColumn("left")}

            {/* Center Column: Center Stage */}
            <div
              className="dock-center-col"
              style={{ paddingBottom: bottomCollapsed ? 0 : `${bottomHeight}px` }}
            >
              {/* Center Stage (Confluence Whiteboard Canvas or Active Document) */}
              <div className="dock-zone dock-zone--center confluence-grid" style={{ position: "relative", flex: 1, minHeight: 0 }}>
                {/* Viewport Floating Action Pill (Save, Undo, Redo) in Top-Left Corner (only in Viewport mode) */}
                {centerActiveTab === "viewport" && (
                  <div className="viewport-floating-actions" role="toolbar" aria-label="Viewport History Actions">
                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={handleSaveProject}
                      title="Save Project (Ctrl+S / Cmd+S)"
                    >
                      <Save size={14} style={{ color: isDirty ? "var(--accent-warning)" : "var(--text-secondary)" }} />
                      {isDirty && <span className="viewport-action-btn__dirty-dot" />}
                    </button>

                    <div className="viewport-action-divider" />

                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={historyCommands.undo}
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 size={14} />
                    </button>

                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={historyCommands.redo}
                      title="Redo (Ctrl+Shift+Z)"
                    >
                      <Redo2 size={14} />
                    </button>
                  </div>
                )}

                {/* Viewport Floating Actions in Top-Right Corner: Settings + Recenter (just below settings) */}
                <div
                  className="viewport-floating-actions viewport-floating-actions--top-right"
                  style={{ left: "auto", right: 12 }}
                  role="toolbar"
                  aria-label="Viewport Floating Actions"
                >
                  {centerActiveTab === "settings" ? (
                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={handleCloseSettings}
                      title="Close Settings & Return to Viewport (Esc)"
                      id="viewport-close-settings-btn"
                      style={{ color: "var(--accent-warning)" }}
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="viewport-action-btn"
                      onClick={handleOpenSettings}
                      title="Project Settings (Ctrl+,)"
                      id="viewport-open-settings-btn"
                    >
                      <Settings size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="viewport-action-btn"
                    onClick={handleRecenterCanvas}
                    title="Bring back to center (0, 0) [Ctrl+0]"
                    id="canvas-bring-back-to-center"
                    aria-label="Bring back to center"
                  >
                    <Focus size={14} />
                  </button>

                  <button
                    type="button"
                    className={`viewport-action-btn ${isWorldEnvPopoverOpen || environment.diagnostics.inspectMode ? "viewport-action-btn--active" : ""}`}
                    onClick={() => setIsWorldEnvPopoverOpen((prev) => !prev)}
                    title="World Environment & Viewport Settings"
                    id="canvas-world-env-quick-btn"
                    aria-label="World Environment Quick Settings"
                  >
                    <Globe size={14} />
                  </button>
                </div>

                {/* World Environment Quick Controls Popover */}
                {isWorldEnvPopoverOpen && (
                  <div
                    className="viewport-env-quick-popover"
                    id="world-env-quick-popover"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="viewport-env-popover-header">
                      <span className="viewport-env-popover-title">
                        <Globe size={13} style={{ color: "var(--accent-primary)" }} />
                        World Quick Controls
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsWorldEnvPopoverOpen(false)}
                        className="viewport-action-btn"
                        style={{ width: 20, height: 20 }}
                        title="Close popover"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* DevTools Inspect Mode */}
                    <div className="viewport-env-popover-row">
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Eye size={12} style={{ color: environment.diagnostics.inspectMode ? "var(--accent-primary)" : "var(--text-tertiary)" }} />
                        Inspect Mode
                      </span>
                      <button
                        type="button"
                        className={`viewport-env-popover-seg-btn ${environment.diagnostics.inspectMode ? "viewport-env-popover-seg-btn--active" : ""}`}
                        onClick={toggleInspectMode}
                        id="quick-toggle-inspect-mode"
                      >
                        {environment.diagnostics.inspectMode ? "ON" : "OFF"}
                      </button>
                    </div>

                    {/* Element Dragging */}
                    <div className="viewport-env-popover-row">
                      <span>Element Drag</span>
                      <button
                        type="button"
                        className={`viewport-env-popover-seg-btn ${environment.elements?.dragEnabled ? "viewport-env-popover-seg-btn--active" : ""}`}
                        onClick={() =>
                          updateEnvironment({
                            elements: {
                              ...environment.elements,
                              dragEnabled: !environment.elements?.dragEnabled,
                            },
                          })
                        }
                        id="quick-toggle-element-dragging"
                      >
                        {environment.elements?.dragEnabled ? "Enabled" : "Locked"}
                      </button>
                    </div>

                    {/* Grid Style */}
                    <div className="viewport-env-popover-row">
                      <span>Grid Style</span>
                      <div className="viewport-env-popover-segmented">
                        {(["dots", "lines", "none"] as const).map((style) => (
                          <button
                            key={style}
                            type="button"
                            className={`viewport-env-popover-seg-btn ${environment.viewport.grid.style === style ? "viewport-env-popover-seg-btn--active" : ""}`}
                            onClick={() =>
                              updateEnvironment({
                                viewport: {
                                  ...environment.viewport,
                                  grid: { ...environment.viewport.grid, style },
                                },
                              })
                            }
                            id={`quick-grid-${style}`}
                          >
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* World Axes */}
                    <div className="viewport-env-popover-row">
                      <span>World Axes</span>
                      <button
                        type="button"
                        className={`viewport-env-popover-seg-btn ${environment.viewport.axes.enabled ? "viewport-env-popover-seg-btn--active" : ""}`}
                        onClick={() =>
                          updateEnvironment({
                            viewport: {
                              ...environment.viewport,
                              axes: { ...environment.viewport.axes, enabled: !environment.viewport.axes.enabled },
                            },
                          })
                        }
                        id="quick-toggle-world-axes"
                      >
                        {environment.viewport.axes.enabled ? "Visible" : "Hidden"}
                      </button>
                    </div>

                    {/* Motion Speed */}
                    <div className="viewport-env-popover-row">
                      <span>Motion Speed</span>
                      <div className="viewport-env-popover-segmented">
                        {([0.5, 1, 1.5] as const).map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            className={`viewport-env-popover-seg-btn ${environment.motion?.timeScale === speed ? "viewport-env-popover-seg-btn--active" : ""}`}
                            onClick={() =>
                              updateEnvironment({
                                motion: { ...environment.motion, timeScale: speed },
                              })
                            }
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Button to open Full World Settings in Right Inspector */}
                    <button
                      type="button"
                      className="viewport-env-popover-btn"
                      id="open-full-world-inspector-btn"
                      onClick={() => {
                        if (rightCollapsed) setRightCollapsed(false);
                        setSelectedElement(null);
                        setRightActiveTab("details");
                        window.dispatchEvent(new CustomEvent("antigravity:open_world_env"));
                        setIsWorldEnvPopoverOpen(false);
                      }}
                    >
                      <SlidersHorizontal size={12} />
                      Full World Inspector
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                )}

                {centerPanels[centerActiveTab] || (
                  centerActiveTab === "settings" ? (
                    <ProjectSettings onClose={handleCloseSettings} />
                  ) : (
                    <WhiteboardCanvas
                      deviceMode={deviceMode}
                      zoomLevel={zoomLevel}
                      onZoomChange={setZoomLevel}
                      onSelectElement={setSelectedElement}
                      onDropAsset={(asset) => {
                        setSelectedElement({ id: asset.id, name: asset.name });
                      }}
                      onOpenExecutionTrace={() => {
                        setBottomCollapsed(false);
                        setBottomActiveTab("trace");
                      }}
                    />
                  )
                )}
              </div>
            </div>

            {/* LayoutAI docked on RIGHT (beside Details) — Normal Layout */}
            {renderAiDockColumn("right")}

            {/* Right Vertical Splitter */}
            {!rightCollapsed && (
              <DockSplitter
                orientation="vertical"
                targetRef={rightZoneRef}
                value={rightWidth}
                min={240}
                max={550}
                invert
                onCommit={commitRightWidth}
                style={{ zIndex: activeLayer === "right" ? 29 : 28 }}
              />
            )}

            {/* Right Dock Zone */}
            <DockZone
              ref={rightZoneRef}
              zoneId="right"
              size={rightWidth}
              isCollapsed={rightCollapsed}
              tabs={rightTabs}
              activeTabId={rightActiveTab}
              onSelectTab={(tabId) => {
                setRightActiveTab(tabId);
                handleZoneClick("right");
              }}
              onToggleCollapse={() => setRightCollapsed((c) => !c)}
              onMouseEnter={() => handleZoneMouseEnter("right")}
              onMouseLeave={() => handleZoneMouseLeave("right")}
              onClick={() => handleZoneClick("right")}
              className={activeLayer === "right" ? "dock-zone--elevated" : ""}
            >
              {rightPanels[rightActiveTab] || (
                rightActiveTab === "details" ? (
                  <DetailsInspector
                    selectedElementId={selectedElement?.id || null}
                    selectedElementName={selectedElement?.name || ""}
                    onOpenBlueprint={() => handleDockFullPage("blueprint", "Logic Blueprint")}
                    onDeselect={() => setSelectedElement(null)}
                  />
                ) : rightActiveTab === "tokens" ? (
                  <ProjectSettings />
                ) : (
                  <OutputConsole />
                )
              )}
            </DockZone>
          </>
        )}

        {/* Bottom Drawer Horizontal Alignment: Full-width edge-to-edge layout */}
        {(() => {
          return (
            <>
              {/* Bottom Horizontal Splitter */}
              {!bottomCollapsed && (
                <DockSplitter
                  orientation="horizontal"
                  targetRef={bottomZoneRef}
                  value={bottomHeight}
                  min={140}
                  max={480}
                  invert
                  onCommit={commitBottomHeight}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: `${bottomHeight}px`,
                    zIndex: activeLayer === "right" || activeLayer === "ai" ? 21 : 30,
                  }}
                />
              )}

              {/* Bottom Drawer Zone */}
              <DockZone
                ref={bottomZoneRef}
                zoneId="bottom"
                size={bottomHeight}
                isCollapsed={bottomCollapsed || visibleBottomTabs.length === 0}
                tabs={bottomTabs}
                activeTabId={bottomActiveTab}
                onSelectTab={(tabId) => {
                  setBottomActiveTab(tabId);
                  handleZoneClick("bottom");
                }}
                onToggleCollapse={() => {
                  setBottomCollapsed((c) => {
                    if (c) handleZoneClick("bottom");
                    return !c;
                  });
                }}
                onMouseEnter={() => handleZoneMouseEnter("bottom")}
                onMouseLeave={() => handleZoneMouseLeave("bottom")}
                onClick={() => handleZoneClick("bottom")}
                className={activeLayer === "bottom" ? "dock-zone--elevated" : ""}
                onTearOffStart={handleBottomTearOffStart}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100%",
                  height: `${bottomHeight}px`,
                  zIndex: activeLayer === "right" || activeLayer === "ai" ? 22 : 29,
                }}
              >
                {bottomPanels[bottomActiveTab] || (
                  bottomActiveTab === "content-browser" ? (
                    <ContentBrowser
                      selectedFolderId={selectedElement?.id || ""}
                      selectedFolderName={selectedElement?.name || ""}
                      onSelectFolder={(folderId, folderName) => setSelectedElement({ id: folderId, name: folderName })}
                      onOpenAsset={(id, title) => handleDockFullPage(id, title)}
                      onTearOffItem={handleGenericTearOffStart}
                      onSelectElement={setSelectedElement}
                      onOpenCurveEditor={() => {
                        setBottomActiveTab("sequencer");
                      }}
                      onOpenExportPreview={() => {
                        setBottomActiveTab("export-code");
                      }}
                    />
                  ) : bottomActiveTab === "export-code" ? (
                    <AnimationExportPreview
                      elementId={selectedElement?.id}
                      elementName={selectedElement?.name}
                    />
                  ) : bottomActiveTab === "trace" ? (
                    <ExecutionTracePanel
                      onNavigateToNode={(nodeId) => {
                        setFocusedBlueprintNodeId(nodeId);
                        handleDockFullPage("blueprint", "Logic Blueprint");
                      }}
                    />
                  ) : bottomActiveTab === "blueprint" ? (
                    <BlueprintCanvas
                      focusedNodeId={focusedBlueprintNodeId}
                      onBackToViewport={() => setBottomCollapsed(true)}
                    />
                  ) : bottomActiveTab === "curves" ? (
                    <CurveEditor />
                  ) : (
                    <TimelineSequencer />
                  )
                )}
              </DockZone>

              {/* 2D Corner Splitter (Bottom-Right only, left dock is removed) */}
              {!rightCollapsed && !bottomCollapsed && (
                <DockCornerSplitter
                  corner="bottom-right"
                  right={rightWidth}
                  bottom={bottomHeight}
                  rightRef={rightZoneRef}
                  bottomRef={bottomZoneRef}
                  rightMin={240}
                  rightMax={550}
                  bottomMin={140}
                  bottomMax={480}
                  onCommit={commitRightAndBottom}
                />
              )}
            </>
          );
        })()}

        {/* Unreal Engine-Style Slide-Up Output Log Drawer (draggable for tear-off) */}
        {isOutputLogOpen && (
          <div className="output-log-drawer" role="region" aria-label="Unreal Engine Output Log Console">
            <div
              className="output-log-drawer__header output-log-drawer__header--draggable"
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const originX = e.clientX;
                const originY = e.clientY;
                let activated = false;

                const onMove = (moveEvt: PointerEvent) => {
                  if (activated) return;
                  const dx = moveEvt.clientX - originX;
                  const dy = moveEvt.clientY - originY;
                  if (Math.sqrt(dx * dx + dy * dy) >= 24) {
                    activated = true;
                    setIsOutputLogOpen(false);
                    startTearOff("console", "Output Log", "bottom-tab", originX, originY);
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                  }
                };

                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                };

                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp, { once: true });
              }}
            >
              <div className="output-log-drawer__title">
                <Terminal size={13} style={{ color: "var(--accent-primary)" }} />
                <span>Output Log</span>
                <span className="panel-header__badge">Drag to detach</span>
              </div>
              <div className="output-log-drawer__actions">
                <button
                  type="button"
                  className="panel-icon-btn"
                  onClick={() => setIsOutputLogOpen(false)}
                  title="Close Output Log Drawer"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <OutputConsole />
            </div>
          </div>
        )}

        {/* Tear-Off Drag Overlay (floating preview during drag) */}
        <TearOffDragOverlay state={tearOffState} />
      </div>

      {/* Bottom Status Bar with Drawer Controller */}
      <div className="dock-layout__statusbar">
        <StatusBar
          status={isPlaying ? "Live Simulation Running (120 FPS Wasm)" : "Engine Ready"}
          isDirty={isDirty}
          activeSelection={selectedElement ? selectedElement.name : "World Environment"}
          zoomLevel={zoomLevel}
          onZoomIn={() => setZoomLevel((z) => Math.min(z + 10, 250))}
          onZoomOut={() => setZoomLevel((z) => Math.max(z - 10, 25))}
          onZoomReset={() => setZoomLevel(100)}
          isBottomOpen={!bottomCollapsed}
          bottomActiveTab={bottomActiveTab}
          onToggleBottom={() => {
            setBottomCollapsed((prev) => {
              if (prev) {
                handleZoneClick("bottom");
              }
              return !prev;
            });
          }}
          isExecutionTraceActive={!bottomCollapsed && bottomActiveTab === "trace"}
          onToggleExecutionTrace={() => {
            if (bottomCollapsed) {
              setBottomCollapsed(false);
              setBottomActiveTab("trace");
              handleZoneClick("bottom");
            } else if (bottomActiveTab === "trace") {
              setBottomCollapsed(true);
            } else {
              setBottomActiveTab("trace");
            }
          }}
          isOutputLogOpen={isOutputLogOpen}
          onToggleOutputLog={() => setIsOutputLogOpen((prev) => !prev)}
          onTearOffLog={(originX, originY) => {
            setIsOutputLogOpen(false);
            startTearOff("console", "Output Log", "bottom-tab", originX, originY);
          }}
        />
      </div>

      {/* LayoutAI Left Drop Slot Highlight (beside Outliner) — proximity-based */}
      {isDraggingAi && activeHoverDropSide === "left" && (
        <div
          className="layoutai-drop-slot-highlight"
          style={{
            top: dropSlotBounds.top,
            height: dropSlotBounds.bottom - dropSlotBounds.top,
            left: dropSlotBounds.left,
            width: aiPanelWidth,
          }}
          onClick={() => {
            setAiDockSide("left");
            setAiDockMode("split-left");
            setIsAiCoPilotOpen(true);
            setActiveLayer("ai");
            setIsDraggingAi(false);
            setActiveHoverDropSide(null);
          }}
        >
          <div className="layoutai-drop-slot-card">
            <div className="layoutai-drop-slot-badge">
              <Sparkles size={14} />
              <span>Release to Dock LazyLayout AI</span>
            </div>
            <span className="layoutai-drop-slot-target-tag">Dock on Left</span>
            <span className="layoutai-drop-slot-subtext">
              Release here to anchor panel on the left
            </span>
          </div>
        </div>
      )}

      {/* LayoutAI Right Drop Slot Highlight (beside Details) — proximity-based */}
      {isDraggingAi && activeHoverDropSide === "right" && (
        <div
          className="layoutai-drop-slot-highlight"
          style={{
            top: dropSlotBounds.top,
            height: dropSlotBounds.bottom - dropSlotBounds.top,
            left: dropSlotBounds.right - aiPanelWidth,
            width: aiPanelWidth,
          }}
          onClick={() => {
            setAiDockSide("right");
            setAiDockMode("split-left");
            setIsAiCoPilotOpen(true);
            setActiveLayer("ai");
            setIsDraggingAi(false);
            setActiveHoverDropSide(null);
          }}
        >
          <div className="layoutai-drop-slot-card">
            <div className="layoutai-drop-slot-badge">
              <Sparkles size={14} />
              <span>Release to Dock LazyLayout AI</span>
            </div>
            <span className="layoutai-drop-slot-target-tag">Dock Beside Details</span>
            <span className="layoutai-drop-slot-subtext">
              Release here to anchor panel beside Details
            </span>
          </div>
        </div>
      )}

      {/* Floating Drag Preview Thumbnail following the mouse cursor */}
      {isDraggingAi && (
        <div
          className="layoutai-drag-preview"
          style={{
            left: dragCursorPos.x,
            top: dragCursorPos.y,
          }}
        >
          <div className="layoutai-drag-preview__logo">
            <Sparkles size={14} color="#FFFFFF" />
          </div>
          <div className="layoutai-drag-preview__body">
            <span className="layoutai-drag-preview__title">LazyLayout AI</span>
            <span className="layoutai-drag-preview__hint">
              {activeHoverDropSide === "left"
                ? "Release to dock on the left"
                : activeHoverDropSide === "right"
                ? "Release to dock beside Details"
                : "Move left or right to choose dock location"}
            </span>
          </div>
        </div>
      )}

      {/* Global Search Modal Overlay (Ctrl+Shift+F) */}
      <GlobalSearchPanel
        isModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onNavigate={(id, title) => handleDockFullPage(id, title || id)}
      />

      {/* Command Palette Modal Overlay (Ctrl+P / Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};
