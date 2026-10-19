"use client";

/**
 * ============================================================================
 * CONFLUENCE WHITEBOARD CANVAS (CENTER VIEWPORT)
 * ============================================================================
 * UI Element: Infinite Dot-Grid Creative Stage & Responsive Application Viewport
 * Screen / Scope: Screen 01: Application Viewport & Screen 12: Whiteboard Canvas
 * Role: Provides infinite panning, smooth zooming, multi-device preview frames,
 *       component selection, floating tool dock, and zoom controls.
 * Styling Source: `@/editor/styles/whiteboard.css` (`.whiteboard-stage`)
 * ============================================================================
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import "@/editor/styles/whiteboard.css";
import { FloatingDock, CanvasTool } from "./FloatingDock";
import { ZoomControls } from "./ZoomControls";
import type { SelectionRect } from "./CanvasOverlay";
import { OverlayLayer } from "./overlay/OverlayLayer";
import { CanvasFrames, FrameBar, visibleFrames } from "./CanvasFrames";
import { CanvasHitTester, type FrameSurface } from "@/core/hit/CanvasHitTester";
import { screenToDoc } from "@/core/viewport/camera";
import { useFrames } from "./useFrames";
import { useCanvasViewStore, restoreBackdrop } from "@/core/store/useCanvasViewStore";
import { frameIdOf } from "@/core/frames/frames";
import { setActiveStageFrame } from "@/core/render/StageRenderer";
import { getDocument } from "@/core/store/documentState";
import {
  ArrowRight,
  Film,
  Workflow,
  Zap,
  Layers,
  Smartphone,
  Tablet,
  Monitor,
  Play,
  Square,
  Crosshair,
  Focus,
  ShieldAlert,
} from "lucide-react";
import { SandboxHost } from "@/editor/shell/afterTrackPanels";
import { edition } from "@/core/flags";
import { useProjectStore } from "@/core/store/useProjectStore";
import { useEnvironmentStore } from "@/core/store/useEnvironmentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { THEME_PALETTES } from "@/core/types/environment";
import { useLatestRef } from "@/core/hooks/useLatestRef";
import { useLayers, documentCommands } from "@/core/store/useDocumentStore";
import { useFocusScope, useCommand, getContextKeys, type ContextKeys } from "@/core/commands";
import { useCameraStore, selectZoomPercent } from "@/core/store/useCameraStore";
import { gridSpacing, wheelZoomFactor } from "@/core/viewport/camera";
import { projectSession } from "@/core/storage/ProjectSession";
import { getStageRendererForLayer, getFrameRenderers } from "@/core/render/StageRenderer";
import { useShapeDrawing } from "./tools/useShapeDrawing";
import { isShapeToolId } from "./tools/shapeTools";

interface WhiteboardCanvasProps {
  deviceMode?: "desktop" | "tablet" | "mobile";
  onDropAsset?: (asset: { id: string; name: string; category: string }) => void;
  isPlaying?: boolean;
  onTogglePlay?: (isPlaying: boolean) => void;
  onOpenExecutionTrace?: () => void;
  className?: string;
  style?: React.CSSProperties;
  onSelectElement?: (element: { id: string; name: string } | null) => void;
}

interface DeviceDimensions {
  width: number;
  height: number;
  label: string;
}

const DEVICE_CONFIGS: Record<"desktop" | "tablet" | "mobile", DeviceDimensions> = {
  desktop: { width: 1440, height: 900, label: "Desktop Viewport (1440 × 900)" },
  tablet: { width: 768, height: 1024, label: "Tablet Frame (768 × 1024)" },
  mobile: { width: 375, height: 812, label: "Mobile Frame (375 × 812)" },
};

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  deviceMode = "desktop",
  onDropAsset,
  isPlaying: isPlayingProp = false,
  onTogglePlay,
  onOpenExecutionTrace,
  className,
  style,
  onSelectElement,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Sub-Phase 43.3: the canvas is focused for shortcuts while the pointer is
  // over it — this is what lets Space pan the canvas without also affecting
  // the timeline when both are docked at once (see the Phase 43 progress log).
  useFocusScope("canvas", containerRef);

  /* --------------------------------------------------------------------------
   * Play Mode State (Sandbox Host)
   * -------------------------------------------------------------------------- */
  const [isPlayMode, setIsPlayMode] = useState(isPlayingProp);
  const [prevIsPlayingProp, setPrevIsPlayingProp] = useState(isPlayingProp);
  if (isPlayingProp !== prevIsPlayingProp) {
    setPrevIsPlayingProp(isPlayingProp);
    setIsPlayMode(isPlayingProp);
  }

  const handleTogglePlay = useCallback(
    (nextState?: boolean) => {
      const val = nextState !== undefined ? nextState : !isPlayMode;
      setIsPlayMode(val);
      if (onTogglePlay) onTogglePlay(val);
    },
    [isPlayMode, onTogglePlay]
  );

  /* --------------------------------------------------------------------------
   * Pan & Zoom Coordinates
   * -------------------------------------------------------------------------- */
  // The camera (pan + zoom) lives in `useCameraStore` and is written to this node's CSS variables by the effect
  // below, so moving the camera never re-renders the canvas. Only the zoom read-out subscribes.
  const zoomPercent = useCameraStore(selectZoomPercent);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");

  /* --------------------------------------------------------------------------
   * Component Selection & Interactive State
   * -------------------------------------------------------------------------- */
  const [selectedElement, setSelectedElement] = useState<SelectionRect | null>(null);
  const [ctaCount, setCtaCount] = useState(0);

  const environment = useEnvironmentStore((state) => state.environment);
  const elements = useLayers();
  const pages = useProjectStore((state) => state.pages);
  const activePageId = useProjectStore((state) => state.activePageId);
  const selectEntity = useSelectionStore((state) => state.select);

  const activePage = pages[activePageId] || Object.values(pages)[0];
  const rootContainer = activePage ? elements[activePage.rootElementId] : null;
  const frames = useFrames();
  const shownFrames = useMemo(() => visibleFrames(frames), [frames]);
  const activeFrameId = useCanvasViewStore((state) => state.activeFrameId);
  // The frame new shapes and text go into: the one last picked, else the first.
  const activeFrame = frames.find((f) => f.id === activeFrameId) ?? frames[0];
  // The backdrop is a remembered preference; read it once the canvas is on the client.
  useEffect(() => restoreBackdrop(), []);
  const backdrop = useCanvasViewStore((state) => state.backdrop);
  const mode = useCanvasViewStore((state) => state.mode);
  // `getStageRenderer()` answers for the active frame.
  useEffect(() => setActiveStageFrame(activeFrame?.id ?? null), [activeFrame?.id]);

  // Hit-testing (Phase 22). In Design mode the canvas captures every pointer event and the frames get none: the
  // pointer's place on the canvas is mapped to canvas space and looked up in a spatial index of the frames' layers.
  const hitTester = useMemo(
    () =>
      new CanvasHitTester(getDocument, () => {
        const surfaces = new Map<string, FrameSurface>();
        for (const [frameId, r] of getFrameRenderers()) {
          surfaces.set(frameId, { frameId, get layoutVersion() { return r.layoutVersion; }, measureNow: (ids) => r.measureNow(ids) });
        }
        return surfaces;
      }),
    []
  );
  // Test seam (with `window.__LL_TEST__` set before load): the hit-tester, for the hit-testing spec.
  useEffect(() => {
    const w = window as unknown as { __LL_TEST__?: boolean; __LL_HIT__?: CanvasHitTester };
    if (w.__LL_TEST__) w.__LL_HIT__ = hitTester;
  }, [hitTester]);
  const pointerWorld = (e: { clientX: number; clientY: number }) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return screenToDoc(useCameraStore.getState().camera, { x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  /** A click on a layer in a frame selects it and makes its frame the active one. */
  const handleStageClick = useCallback(
    (layerId: string) => {
      selectEntity(layerId, "element");
      const frameId = frameIdOf(getDocument().layers, layerId);
      if (frameId) useCanvasViewStore.getState().setActiveFrame(frameId);
    },
    [selectEntity]
  );

  // Sub-Phase 43.2 follow-up fix: a drawn shape used to appear correctly on
  // the canvas but the Details panel fell back to World Environment instead
  // of showing its properties. Two compounding bugs: `onCreated` only called
  // `selectEntity` (`useSelectionStore`), which `DetailsInspector.tsx` never
  // reads — it reads `selectedElementId`, prop-drilled from *this*
  // component's own `onSelectElement` callback (the same one
  // `handleSelectComponent` below already uses correctly). And even after
  // fixing that, the stage's own `onClick` (a few lines down) fires right
  // after the mouseup that finishes a drag — same target, so the browser
  // still synthesizes a click — and immediately cleared the selection back
  // to nothing. `justDrewShapeRef` tells that `onClick` to skip clearing
  // exactly once, right after a shape/text creation.
  const justDrewShapeRef = useRef(false);

  // Sub-Phase 43.2: Frame/Rectangle/Ellipse/Line drag-to-create. New shapes
  // are added as children of the active page's root — this canvas is
  // flow-placed (see `tools/types.ts`), so that's the only sensible parent
  // for a shape with no absolute canvas position to land at.
  const { handlePointerDown: handleShapeDrawPointerDown, overlayStyle: shapeDrawOverlay } = useShapeDrawing({
    activeTool,
    containerRef,
    parentId: activeFrame?.id ?? rootContainer?.id ?? null,
    onCreated: (layerId, label) => {
      justDrewShapeRef.current = true;
      selectEntity(layerId, "element");
      onSelectElement?.({ id: layerId, name: label });
      setActiveTool("select");
    },
  });

  // Single source of truth for "a shape/text tool owns pointer gestures on
  // the canvas right now" — used for routing in `handleMouseDown`, the
  // sandbox's `pointerEvents` toggle, and the crosshair cursor. Was three
  // hand-copied conditions before; drifted (the sandbox toggle didn't
  // exclude play mode, silently freezing a running app if a shape tool was
  // still selected when Play was pressed) until unified here.
  const toolCapturesPointer = !isPlayMode && (isShapeToolId(activeTool) || activeTool === "text");

  const palette = THEME_PALETTES[environment?.theme?.palette] || THEME_PALETTES.clean_light;

  const device = DEVICE_CONFIGS[deviceMode] || DEVICE_CONFIGS.desktop;

  /* --------------------------------------------------------------------------
   * Camera: size tracking, CSS variables, fit / 100% / selection
   * -------------------------------------------------------------------------- */
  const gridBase = environment.viewport.grid.size || 24;

  /** Writes the camera to the canvas node's CSS variables. No React render. */
  const applyCamera = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { x, y, zoom } = useCameraStore.getState().camera;
    const spacing = gridSpacing(gridBase, zoom);
    el.style.setProperty("--canvas-pan-x", String(x));
    el.style.setProperty("--canvas-pan-y", String(y));
    el.style.setProperty("--canvas-zoom", String(zoom));
    el.style.setProperty("--canvas-grid-size", `${spacing}px`);
    // Modulo pan offset keeps the dots locked to world coordinates
    el.style.setProperty("--canvas-grid-pos-x", `${((x % spacing) + spacing) % spacing}px`);
    el.style.setProperty("--canvas-grid-pos-y", `${((y % spacing) + spacing) % spacing}px`);
  }, [gridBase]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const syncSize = () => useCameraStore.getState().setViewport({ width: el.clientWidth, height: el.clientHeight });
    syncSize();
    applyCamera();
    const unsubscribe = useCameraStore.subscribe((state, prev) => {
      if (state.camera !== prev.camera) applyCamera();
    });
    const observer = new ResizeObserver(syncSize);
    observer.observe(el);
    return () => {
      unsubscribe();
      observer.disconnect();
    };
  }, [applyCamera]);

  const autoLayoutRef = useRef<() => void>(() => {});

  // The camera belongs to the open document: switch to its saved camera whenever a project opens. The key is the
  // session's project id (the stored document), not the snapshot's own id, which is content and can repeat.
  useLayoutEffect(() => {
    const load = (id: string | null) => {
      useCameraStore.getState().loadFor(id ?? undefined);
      applyCamera();
      if (!useCameraStore.getState().touched) autoLayoutRef.current();
    };
    load(projectSession.currentProjectId);
    return projectSession.onOpen(load);
  }, [applyCamera]);

  /** What the canvas fits: every frame that is drawn, as one rectangle (or the sandbox's device frame in full-edition Play mode). */
  const contentRect = useMemo(() => {
    if (isPlayMode && edition === "full") return { x: -device.width / 2, y: -device.height / 2, width: device.width, height: device.height };
    if (shownFrames.length === 0) return null;
    const minX = Math.min(...shownFrames.map((f) => f.x));
    const minY = Math.min(...shownFrames.map((f) => f.y));
    const maxX = Math.max(...shownFrames.map((f) => f.x + f.width));
    const maxY = Math.max(...shownFrames.map((f) => f.y + f.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [isPlayMode, device.width, device.height, shownFrames]);

  /** Bring back to center: 100% with the origin in the middle of the viewport. */
  const bringBackToCenter = useCallback((auto = false) => {
    useCameraStore.getState().centerOrigin(auto);
  }, []);

  /** Zoom so every frame fits the viewport (never above 100%), a little above the middle so the floating tool dock doesn't cover its bottom edge. */
  const fitToFrame = useCallback((auto = false) => {
    if (contentRect) useCameraStore.getState().fitToRect(contentRect, { padding: 48, maxZoom: 1, bottomInset: 56, auto });
  }, [contentRect]);

  /** Zoom so the selected layer fills the viewport (zoom to selection). */
  const zoomToSelection = useCallback(async () => {
    const id = useSelectionStore.getState().selectedId;
    if (!id) return;
    const layers = getDocument().layers;
    const frameId = frameIdOf(layers, id);
    const frame = frames.find((f) => f.id === frameId);
    const renderer = getStageRendererForLayer(id, layers);
    if (!frame || !renderer) return;
    const [rect] = await renderer.measure([id]);
    if (!rect) return;
    // measure() answers relative to the frame's own origin; the frame sits at (x, y) on the canvas
    useCameraStore.getState().fitToRect({ x: frame.x + rect.x, y: frame.y + rect.y, width: rect.width, height: rect.height }, { padding: 96 });
  }, [frames]);

  // The recenter event (View > recenter, Ctrl+0) is the person's own move.
  useEffect(() => {
    const handleRecenterEvent = () => bringBackToCenter();
    window.addEventListener("antigravity:recenter_canvas", handleRecenterEvent);
    return () => window.removeEventListener("antigravity:recenter_canvas", handleRecenterEvent);
  }, [bringBackToCenter]);

  // The canvas lays itself out until the person moves the view (or a saved view is restored): it centres when
  // empty and fits the frames when they appear; "Clear Showcase" returns it to 100%. Picking a device frame in the
  // header focuses it through the `frame.*` commands instead.
  const hasFrame = contentRect !== null;
  useEffect(() => {
    autoLayoutRef.current = () => (hasFrame ? fitToFrame(true) : bringBackToCenter(true));
  }, [hasFrame, fitToFrame, bringBackToCenter]);
  useEffect(() => {
    if (useCameraStore.getState().touched) return;
    if (hasFrame) fitToFrame(true);
    else bringBackToCenter(true);
  }, [hasFrame, fitToFrame, bringBackToCenter]);

  // Dynamically adapt selected element bounds when switching device dimensions
  const [prevDeviceWidth, setPrevDeviceWidth] = useState(device.width);
  if (device.width !== prevDeviceWidth) {
    setPrevDeviceWidth(device.width);
    setSelectedElement((prev) => {
      if (!prev) return null;
      if (prev.id === "comp_navbar" || prev.id === "comp_hero") {
        return { ...prev, width: device.width };
      }
      if (prev.id === "comp_grid") {
        const gridW = Math.min(device.width - 48, 1080);
        return { ...prev, width: gridW, x: (device.width - gridW) / 2 };
      }
      return prev;
    });
  }

  /* --------------------------------------------------------------------------
   * Spacebar hold-to-pan (Sub-Phase 43.3: focus-scoped)
   * -------------------------------------------------------------------------- */
  // Space is a "hold" gesture (press = pan on, release = pan off), which
  // doesn't fit the command bus's one-shot `run()` model — Sub-Phase 43.2
  // (a generalized spring-loaded-tool mechanism) is explicitly deferred, see
  // the Phase 43 progress log. This keeps that structure but gates *pressing*
  // Space on canvas focus, fixing the real bug where it also affected
  // whichever other panel (e.g. the timeline) was simultaneously mounted.
  // Releasing is never focus-gated, so a still-held Space can't get stuck on
  // if the pointer leaves the canvas mid-hold.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      if (e.code === "Space" && !e.repeat && getContextKeys().canvasFocus) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  /* --------------------------------------------------------------------------
   * Tool selection & zoom commands (Sub-Phase 43.1/43.3: focus-scoped)
   * -------------------------------------------------------------------------- */
  const canvasCommandWhen = useCallback((ctx: ContextKeys) => ctx.canvasFocus && !ctx.textEditing, []);
  // Sub-Phase 43.2 (2026-09-27): replaces the old select/pan/pencil/text/wire/
  // shapes/components/assets key set. Every one of those old bindings only
  // ever set decorative tool-select state — none had any drawing behavior
  // behind it (verified: this file had no pointer handling beyond pan/zoom
  // before this pass) — so this is a pure addition of real functionality,
  // not a regression of anything that worked. See the Phase 43.2 ROADMAP
  // section for the full key-assignment reasoning.
  useCommand({ id: "canvas.tool.select", title: "Select Tool", category: "Canvas", keybinding: "V", when: canvasCommandWhen, run: () => setActiveTool("select") }, [canvasCommandWhen]);
  useCommand({ id: "canvas.tool.pan", title: "Hand Tool (Pan)", category: "Canvas", keybinding: "H", when: canvasCommandWhen, run: () => setActiveTool("pan") }, [canvasCommandWhen]);
  useCommand({ id: "canvas.tool.frame", title: "Frame Tool", category: "Canvas", keybinding: "F", when: canvasCommandWhen, run: () => setActiveTool("frame") }, [canvasCommandWhen]);
  useCommand({ id: "canvas.tool.rectangle", title: "Rectangle Tool", category: "Canvas", keybinding: "R", when: canvasCommandWhen, run: () => setActiveTool("rectangle") }, [canvasCommandWhen]);
  useCommand({ id: "canvas.tool.ellipse", title: "Ellipse Tool", category: "Canvas", keybinding: "O", when: canvasCommandWhen, run: () => setActiveTool("ellipse") }, [canvasCommandWhen]);
  useCommand({ id: "canvas.tool.line", title: "Line Tool", category: "Canvas", keybinding: "L", when: canvasCommandWhen, run: () => setActiveTool("line") }, [canvasCommandWhen]);
  useCommand({ id: "canvas.tool.text", title: "Text Tool", category: "Canvas", keybinding: "T", when: canvasCommandWhen, run: () => setActiveTool("text") }, [canvasCommandWhen]);
  useCommand(
    {
      id: "canvas.zoomIn",
      title: "Zoom In",
      category: "Canvas",
      // Both forms bind: some browsers/keyboard layouts report the "="/"+"
      // key's shift state differently, and the old handler accepted either.
      keybinding: ["Ctrl+=", "Ctrl+Shift++"],
      when: canvasCommandWhen,
      run: () => useCameraStore.getState().stepZoom(1),
    },
    [canvasCommandWhen]
  );
  useCommand(
    { id: "canvas.zoomOut", title: "Zoom Out", category: "Canvas", keybinding: "Ctrl+-", when: canvasCommandWhen, run: () => useCameraStore.getState().stepZoom(-1) },
    [canvasCommandWhen]
  );
  useCommand({ id: "canvas.zoomTo100", title: "Zoom to 100%", category: "Canvas", keybinding: "Shift+0", when: canvasCommandWhen, run: () => useCameraStore.getState().zoomTo100() }, [canvasCommandWhen]);
  useCommand({ id: "canvas.zoomToFit", title: "Zoom to Fit", category: "Canvas", keybinding: "Shift+1", when: canvasCommandWhen, run: () => fitToFrame() }, [canvasCommandWhen, fitToFrame]);
  useCommand({ id: "canvas.zoomToSelection", title: "Zoom to Selection", category: "Canvas", keybinding: "Shift+2", when: canvasCommandWhen, run: () => void zoomToSelection() }, [canvasCommandWhen, zoomToSelection]);
  useCommand(
    { id: "canvas.zoomReset", title: "Reset Zoom & Recenter", category: "Canvas", keybinding: "Ctrl+0", when: canvasCommandWhen, run: () => bringBackToCenter() },
    [canvasCommandWhen, bringBackToCenter]
  );

  /* --------------------------------------------------------------------------
   * Native Non-Passive Wheel Listener: Viewport-Isolated Zoom & Pan
   * Prevents the browser from EVER zooming the entire website on trackpad
   * pinch or Ctrl+wheel. Only the Whiteboard Canvas zooms.
   * -------------------------------------------------------------------------- */
  const viewportRef = useLatestRef(environment.viewport);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Intercept wheel on canvas: prevent native document scrolling & page-level zoom
      e.preventDefault();
      e.stopPropagation();

      const isZoom = e.ctrlKey || e.metaKey;

      if (isZoom) {
        if (!viewportRef.current.zoom.enabled) return;
        const speed = viewportRef.current.zoom.speed === "fast" ? 2.0 : 1.0;
        const rect = container.getBoundingClientRect();
        useCameraStore
          .getState()
          .zoomByAt({ x: e.clientX - rect.left, y: e.clientY - rect.top }, wheelZoomFactor(e.deltaY, speed));
      } else {
        if (!viewportRef.current.pan.enabled) return;
        // Normal 2-finger scroll or wheel: pan the canvas only
        useCameraStore.getState().panBy(-e.deltaX, -e.deltaY);
      }
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    container.addEventListener("wheel", handleNativeWheel, { passive: false });
    container.addEventListener("gesturestart", preventGesture, { passive: false });
    container.addEventListener("gesturechange", preventGesture, { passive: false });
    container.addEventListener("gestureend", preventGesture, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleNativeWheel);
      container.removeEventListener("gesturestart", preventGesture);
      container.removeEventListener("gesturechange", preventGesture);
      container.removeEventListener("gestureend", preventGesture);
    };
  }, [viewportRef]);

  /* --------------------------------------------------------------------------
   * Canvas Drag / Panning Engine
   * -------------------------------------------------------------------------- */
  const handleMouseDown = (e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1;
    // FloatingDock and ZoomControls are children of this same div (they float
    // on top of the canvas, not outside it), so their own mousedown bubbles
    // up here — without this check, clicking the Ellipse dock button while
    // Rectangle was active created a stray default-sized rectangle, and any
    // dock click while Text was active placed a text layer. Confirmed by
    // testing exactly that click, not assumed.
    const targetIsChrome = (e.target as HTMLElement).closest(".floating-dock-wrapper, .zoom-controls");
    // Space-drag and middle-click must keep panning no matter which tool is
    // active — a shape tool being selected must never trap you in "can only
    // draw, can't pan to get somewhere else first" (this exact case wasn't
    // covered by keyboard-only tool switching in this pass's browser tests,
    // and the early `return` below used to skip the `canPan` check entirely
    // whenever a shape/text tool was active).
    const wantsPan = isMiddleClick || isSpacePressed;

    if (toolCapturesPointer && !targetIsChrome && !wantsPan) {
      e.preventDefault();
      if (isShapeToolId(activeTool)) {
        handleShapeDrawPointerDown(e);
      } else if (activeTool === "text" && (activeFrame?.id ?? rootContainer?.id)) {
        const id = documentCommands.addLayer({ archetype: "text", parentId: activeFrame?.id ?? rootContainer?.id }, "Add Text");
        justDrewShapeRef.current = true;
        selectEntity(id, "element");
        onSelectElement?.({ id, name: "Text" });
        setActiveTool("select");
      }
      return;
    }

    if (!environment.viewport.pan.enabled) return;

    const trigger = environment.viewport.pan.trigger;
    const isBlankTarget = e.target === containerRef.current || (e.target as HTMLElement).classList.contains("whiteboard-grid");
    const canPan =
      isMiddleClick ||
      isSpacePressed ||
      activeTool === "pan" ||
      (trigger === "any_blank" && isBlankTarget);

    if (canPan) {
      e.preventDefault();
      setIsPanning(true);

      let startX = e.clientX;
      let startY = e.clientY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        startX = moveEvent.clientX;
        startY = moveEvent.clientY;

        useCameraStore.getState().panBy(deltaX, deltaY);
      };

      const handleMouseUp = () => {
        setIsPanning(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
  };

  /* --------------------------------------------------------------------------
   * Component Selection Handler inside Device Frame
   * -------------------------------------------------------------------------- */
  const handleSelectComponent = (
    e: React.MouseEvent,
    id: string,
    label: string,
    box: { x: number; y: number; width: number; height: number }
  ) => {
    if (isSpacePressed || activeTool === "pan") return;
    e.stopPropagation();
    setSelectedElement({ id, label, ...box });
    onSelectElement?.({ id, name: label });
  };

  const canvasStyle: React.CSSProperties = {
    "--canvas-dot-color": palette.gridDot,
    backgroundColor: palette.bg,
    cursor: toolCapturesPointer && !isSpacePressed ? "crosshair" : undefined,
    ...style,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`whiteboard-stage ${isSpacePressed || activeTool === "pan" ? "whiteboard-stage--panning" : ""
        } ${isPanning ? "whiteboard-stage--is-dragging-pan" : ""} whiteboard-stage--tool-${activeTool} ${className || ""
        }`}
      style={canvasStyle}
      data-backdrop={backdrop}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".floating-dock-wrapper, .zoom-controls, .frame-bar, .canvas-frame__title")) return;
        // The browser still synthesizes a click after the mousedown+mouseup
        // that just finished drawing a shape/placing text (same target, no
        // native drag happened) — skip clearing the selection `onCreated`
        // above just set, exactly once.
        if (justDrewShapeRef.current) {
          justDrewShapeRef.current = false;
          return;
        }
        // Design mode: what is under the pointer is looked up in the hit index, never in the frames.
        if (activeTool === "select" && !isPlayMode && mode === "design") {
          const hit = hitTester.pickAt(pointerWorld(e), { deep: e.metaKey || e.ctrlKey });
          if (hit) {
            handleStageClick(hit.id);
            onSelectElement?.({ id: hit.id, name: getDocument().layers[hit.id]?.name ?? hit.id });
            return;
          }
        }
        if (mode === "preview") return; // a click in Preview belongs to the page
        setSelectedElement(null);
        onSelectElement?.(null);
      }}
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
          if (data.type === "asset" && onDropAsset) {
            onDropAsset(data);
          }
        } catch {
          // ignore
        }
      }}
      role="region"
      aria-label="Confluence Whiteboard Stage"
    >
      {/* Infinite Scalable Grid Matrix (Dots, Lines, or None) */}
      {environment.viewport.grid.style !== "none" && (
        <div
          className={`whiteboard-grid ${environment.viewport.grid.style === "lines" ? "whiteboard-grid--lines" : ""}`}
          aria-hidden="true"
        />
      )}

      {/* Hardware-Accelerated Transformed World Canvas (Infinite Blank Canvas) */}
      <div className="whiteboard-world">
        {/* The full edition's Play mode runs the logic sandbox in a single device frame. Everything else is the
            frames of the document, each its own live DOM stage (Phase 18, 21). A frame is a separate browsing
            context, so mouse events over it never reach this component: while a shape or text tool is active
            (and not in Play mode, see `toolCapturesPointer`) the frames ignore pointer events so a drag can
            start anywhere on the canvas. Select and Hand keep them, since click-to-pick-an-element needs real
            clicks inside a frame. */}
        {isPlayMode && edition === "full" ? (
          <div className={`device-frame-container device-frame--${deviceMode}`} style={{ width: `${device.width}px` }}>
            <div className="device-frame" style={{ width: `${device.width}px`, height: `${device.height}px` }}>
              <SandboxHost
                width="100%"
                height="100%"
                deviceMode={deviceMode}
                onStopPlay={() => handleTogglePlay(false)}
                onOpenExecutionTrace={onOpenExecutionTrace}
                style={{ pointerEvents: toolCapturesPointer ? "none" : undefined }}
                onElementClick={(elId) => {
                  selectEntity(elId, "element");
                }}
              />
            </div>
          </div>
        ) : (
          <CanvasFrames frames={frames} toolCapturesPointer={!isPlayMode && mode === "design"} onElementClick={mode === "design" ? handleStageClick : undefined} />
        )}

        {/* World-space Origin Marker — a fixed point of reference (Blender's 3D-cursor
            equivalent) so "where is center" has an answer even on an empty canvas.
            Pinned to world (0,0) via .whiteboard-world's pan/zoom transform, same as
            the crosshair lines below, so it stays put as you pan and zoom. */}
        {!isPlayMode && environment.viewport.axes.enabled && (
          <>
            <div className="canvas-crosshair-axes" aria-hidden="true">
              <div className="canvas-axis-line canvas-axis-line--x" />
              <div className="canvas-axis-line canvas-axis-line--y" />
            </div>
            <div className="canvas-center-origin" title="World origin (0, 0)">
              <div className="canvas-origin-reticle">
                <Crosshair size={12} className="canvas-origin-icon" />
              </div>
            </div>
          </>
        )}

        {/* Overlays when elements exist */}
        <OverlayLayer hitTester={hitTester} canvasRef={containerRef} />
      </div>

      {/* Sub-Phase 43.2: live dashed-rect preview while dragging a shape tool.
          A sibling of .whiteboard-world, not a child — .whiteboard-world has
          its own pan/zoom CSS transform, but useShapeDrawing measures drag
          coordinates against the untransformed .whiteboard-stage container
          (containerRef), same as FloatingDock/ZoomControls below. Nesting
          this inside .whiteboard-world would double-apply the transform. */}
      {shapeDrawOverlay && <div className="canvas-shape-draw-overlay" style={shapeDrawOverlay} />}

      <FrameBar />

      {/* Floating Atlassian-Style Bottom Dock */}
      <FloatingDock
        activeTool={activeTool}
        onSelectTool={(tool) => setActiveTool(tool)}
        // Quick Insert (search-and-place components/assets) has no real
        // implementation yet — it only ever set decorative tool state before
        // this phase too (the "components" tool did nothing on its own).
        // Left unwired rather than pointed at a tool id that no longer
        // exists; a real modal is future work, not a 43.2 regression.
        onOpenQuickInsert={undefined}
      />

      {/* Floating Zoom Controls Widget (Bottom-Right) */}
      <ZoomControls
        zoomLevel={zoomPercent}
        onZoomIn={() => useCameraStore.getState().stepZoom(1)}
        onZoomOut={() => useCameraStore.getState().stepZoom(-1)}
        onResetZoom={() => useCameraStore.getState().zoomTo100()}
        onFitToScreen={() => fitToFrame()}
        onRecenter={() => bringBackToCenter()}
      />
    </div>
  );
};
