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
import { FloatingDock } from "./FloatingDock";
import { LiveZoomControls } from "./ZoomControls";
import { OverlayLayer } from "./overlay/OverlayLayer";
import { CanvasFrames, FrameBar, visibleFrames } from "./CanvasFrames";
import { CanvasHitTester, type FrameSurface } from "@/core/hit/CanvasHitTester";
import { screenToDoc } from "@/core/viewport/camera";
import { useFrames } from "./useFrames";
import { useCanvasViewStore, restoreBackdrop } from "@/core/store/useCanvasViewStore";
import { frameIdOf } from "@/core/frames/frames";
import { combineSelection, marqueeCandidates, rootIds } from "@/core/selection/selectionOps";
import { buildTransformModel, handleAtScreen, layerBox } from "./transformModel";
import { TextEditor } from "./text/TextEditor";
import { fillsOf } from "@/core/paint/paintOps";
import { serializeFills, type Paint } from "@/core/paint/paints";
import { snapEnvironment, guideLines } from "./snapEnv";
import { moveGuide, removeGuide } from "./guides";
import { CanvasRulers, RULER_SIZE } from "./CanvasRulers";
import { CanvasContextMenu, RenameBox, type ContextMenuState } from "./CanvasContextMenu";
import { layerMenu } from "@/core/editing/layerMenu";
import { CLIP_MARK, mirrorRead } from "@/core/editing/clipboard";
import { distanceMarks, snapEdges, snapMove } from "@/core/geometry/snap";
import { useSnapStore, restoreSnapSettings } from "@/core/store/useSnapStore";
import { unionBox } from "@/core/geometry/transform";
import type { DocumentTransaction } from "@/core/store/useDocumentStore";
import { docToScreen, type Rect } from "@/core/viewport/camera";
import { setActiveStageFrame } from "@/core/render/StageRenderer";
import { getDocument } from "@/core/store/documentState";
import {
  Crosshair,
} from "lucide-react";
import { SandboxHost } from "@/editor/shell/afterTrackPanels";
import { edition } from "@/core/flags";
import { useProjectStore } from "@/core/store/useProjectStore";
import { useEnvironmentStore } from "@/core/store/useEnvironmentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { THEME_PALETTES } from "@/core/types/environment";
import { useLatestRef } from "@/core/hooks/useLatestRef";
import { useLayers, documentCommands } from "@/core/store/useDocumentStore";
import { useFocusScope, useCommand, type ContextKeys } from "@/core/commands";
import { useCameraStore } from "@/core/store/useCameraStore";
import { gridSpacing, wheelZoomFactor } from "@/core/viewport/camera";
import { projectSession } from "@/core/storage/ProjectSession";
import { getStageRendererForLayer, getFrameRenderers } from "@/core/render/StageRenderer";
import { createTools, type ScreenRect, type Tool, type ToolContext, type ToolPointer } from "./tools/toolRuntime";
import { useToolKeys } from "./tools/useToolKeys";
import { useToolStore } from "@/core/store/useToolStore";
import { TOOL_DEFS, dockTools, type ToolId } from "@/core/tools/toolDefs";
import { defineCommand, defineTypedCommand, invokeCommand } from "@/core/commands";
import { z } from "zod";

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
  // The tool acting now: the active tool, or a held spring's (Space is the Hand, Cmd/Ctrl is deep select).
  const currentTool = useToolStore((state) => state.current);
  const activeTool = useToolStore((state) => state.active);
  const [isPanning, setIsPanning] = useState(false);
  const [toolOverlay, setToolOverlay] = useState<ScreenRect | null>(null);

  /* --------------------------------------------------------------------------
   * Component Selection & Interactive State
   * -------------------------------------------------------------------------- */

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
  /** A click on a layer in a frame selects it and makes its frame the active one. */
  const handleStageClick = useCallback(
    (layerId: string) => {
      selectEntity(layerId, "element");
      const frameId = frameIdOf(getDocument().layers, layerId);
      if (frameId) useCanvasViewStore.getState().setActiveFrame(frameId);
    },
    [selectEntity]
  );

  // Tools (Phase 24). The canvas hands the pointer to the current tool and captures it for a gesture the tool began.
  // New layers go into the active frame (the canvas is flow-placed, so the parent is the only place a shape lands).
  const environmentRef = useLatestRef(environment);
  const parentIdRef = useLatestRef(activeFrame?.id ?? rootContainer?.id ?? null);

  /** The handles' target for the overlay: the selection's box, in Design mode with a selecting tool. */
  // the gradient handles belong to one selection: they go when it changes
  useEffect(
    () =>
      useSelectionStore.subscribe((s, p) => {
        if (s.selectedIds !== p.selectedIds && useCanvasViewStore.getState().editingPaint) useCanvasViewStore.getState().setEditingPaint(null);
      }),
    [],
  );

  /** The gradient fill being edited in the inspector, if the canvas should show its handles. */
  const activeGradient = (): { layerId: string; index: number; paint: Paint } | null => {
    const e = useCanvasViewStore.getState().editingPaint;
    if (!e) return null;
    const paint = fillsOf(e.layerId)[e.index];
    return paint ? { ...e, paint } : null;
  };

  const overlayTransformModel = useCallback(() => {
    if (useCanvasViewStore.getState().mode !== "design") return null;
    const tool = useToolStore.getState().current;
    if (tool !== "select" && tool !== "deepSelect") return null;
    const zoom = useCameraStore.getState().camera.zoom;
    return buildTransformModel(hitTester.ensure(), getDocument().layers, useSelectionStore.getState().selectedIds, 14 / zoom, activeGradient());
  }, [hitTester]);
  /** Every frame's ruler guides as lines in canvas space. */
  const overlayGuides = useCallback(() => guideLines(hitTester.ensure(), getDocument().layers), [hitTester]);
  /** The distance HUD for the selection while Alt is held and no gesture is running. */
  const overlayHud = useCallback(() => {
    if (!useSnapStore.getState().alt || useToolStore.getState().gesturing || useCanvasViewStore.getState().mode !== "design") return [];
    const ids = useSelectionStore.getState().selectedIds;
    const index = hitTester.ensure();
    const layers = getDocument().layers;
    const model = buildTransformModel(index, layers, ids, 0);
    const env = model ? snapEnvironment(index, layers, model.ids) : null;
    if (!model || !env) return [];
    const u = unionBox(model.boxes)!;
    return distanceMarks({ x: u.cx - u.w / 2, y: u.cy - u.h / 2, width: u.w, height: u.h }, env.others, env.parent);
  }, [hitTester]);
  useEffect(() => restoreSnapSettings(), []);
  const tools = useMemo(() => createTools(), []);
  const gestureToolRef = useRef<Tool | null>(null);
  const transformTxRef = useRef<DocumentTransaction | null>(null);
  const toolCtx = useMemo<ToolContext>(
    () => ({
      zoom: () => useCameraStore.getState().camera.zoom,
      panBy: (dx, dy) => useCameraStore.getState().panBy(dx, dy),
      panEnabled: () => environmentRef.current.viewport.pan.enabled,
      panOnBlank: () => environmentRef.current.viewport.pan.enabled && environmentRef.current.viewport.pan.trigger === "any_blank",
      pick: (world, deep) => {
        const hit = hitTester.pickAt(world, { deep });
        return hit ? { id: hit.id, name: getDocument().layers[hit.id]?.name ?? hit.id, depth: hit.depth } : null;
      },
      containerAt: (world) => {
        const hit = hitTester.containerAt(world);
        return hit ? { id: hit.id, origin: hit.origin } : null;
      },
      transformModel: () => {
        const camera = useCameraStore.getState().camera;
        return buildTransformModel(hitTester.ensure(), getDocument().layers, useSelectionStore.getState().selectedIds, 14 / camera.zoom, activeGradient());
      },
      handleAt: (screen) => {
        const camera = useCameraStore.getState().camera;
        const model = buildTransformModel(hitTester.ensure(), getDocument().layers, useSelectionStore.getState().selectedIds, 14 / camera.zoom, activeGradient());
        return model ? handleAtScreen(model, camera, screen) : null;
      },
      isSelected: (id) => useSelectionStore.getState().selectedIds.includes(id),
      beginTransform: (label) => {
        transformTxRef.current = documentCommands.begin(label);
      },
      applyBoxes: (ids, boxes) => {
        const index = hitTester.ensure();
        const layers = getDocument().layers;
        const round = (n: number) => Math.round(n * 100) / 100;
        ids.forEach((id, i) => {
          const layer = layers[id];
          const box = boxes[i];
          if (!layer || !box) return;
          // Positions are relative to the parent's own top-left (a top-level frame's parent is the canvas).
          const parentOrigin = layer.parentId ? index.get(layer.parentId)?.origin : undefined;
          const patch: Record<string, number | string> = {
            positioning: "absolute",
            "frame.x": round(box.cx - box.w / 2 - (parentOrigin?.x ?? 0)),
            "frame.y": round(box.cy - box.h / 2 - (parentOrigin?.y ?? 0)),
          };
          // Only a resize writes a size: a move must not turn a layer that sizes itself to its content into a fixed one.
          const hit = index.get(id);
          const was = hit ? layerBox(layer, hit.bounds) : null;
          if (!was || Math.abs(was.w - box.w) > 0.01 || Math.abs(was.h - box.h) > 0.01) {
            patch["frame.width"] = round(box.w);
            patch["frame.height"] = round(box.h);
          }
          if (box.rot !== 0 || typeof layer.properties["frame.rotation"] === "number") patch["frame.rotation"] = round(box.rot);
          documentCommands.updateProps(id, patch);
        });
      },
      snapMove: (ids, rect, off = false) => {
        const settings = useSnapStore.getState();
        const env = snapEnvironment(hitTester.ensure(), getDocument().layers, ids);
        const threshold = 6 / useCameraStore.getState().camera.zoom;
        if (!env) return { dx: 0, dy: 0 };
        const result = off
          ? { dx: 0, dy: 0, lines: [], spacing: [] }
          : snapMove(rect, env.others, env.parent, env.guides, threshold, settings);
        const final = { x: rect.x + result.dx, y: rect.y + result.dy, width: rect.width, height: rect.height };
        const hud = settings.alt ? distanceMarks(final, env.others, env.parent) : [];
        settings.setFeedback(result.lines, [...result.spacing, ...hud]);
        return { dx: result.dx, dy: result.dy };
      },
      snapEdges: (ids, rect, edges, off = false) => {
        const settings = useSnapStore.getState();
        const env = snapEnvironment(hitTester.ensure(), getDocument().layers, ids);
        const threshold = 6 / useCameraStore.getState().camera.zoom;
        if (!env || off) {
          settings.clearFeedback();
          return { left: 0, right: 0, top: 0, bottom: 0 };
        }
        const r = snapEdges(rect, edges, env.others, env.parent, env.guides, threshold, settings);
        settings.setFeedback(r.lines, settings.alt ? distanceMarks(rect, env.others, env.parent) : []);
        return r;
      },
      clearSnap: () => useSnapStore.getState().clearFeedback(),
      guideAt: (screen) => {
        const camera = useCameraStore.getState().camera;
        for (const g of guideLines(hitTester.ensure(), getDocument().layers)) {
          const s = docToScreen(camera, g.axis === "x" ? { x: g.pos, y: g.from } : { x: g.from, y: g.pos });
          const e = docToScreen(camera, g.axis === "x" ? { x: g.pos, y: g.to } : { x: g.to, y: g.pos });
          const near = g.axis === "x" ? Math.abs(s.x - screen.x) <= 4 && screen.y >= s.y && screen.y <= e.y : Math.abs(s.y - screen.y) <= 4 && screen.x >= s.x && screen.x <= e.x;
          if (near) {
            const [frameId, index] = g.id.split(":");
            return { frameId, index: Number(index), axis: g.axis };
          }
        }
        return null;
      },
      moveGuide: (ref, world) => {
        const hit = hitTester.ensure().get(ref.frameId);
        if (!hit) return;
        moveGuide(ref.frameId, ref.index, Math.round((ref.axis === "x" ? world.x - hit.origin.x : world.y - hit.origin.y) * 100) / 100);
      },
      removeGuide: (ref) => removeGuide(ref.frameId, ref.index),
      overRuler: (screen) => useSnapStore.getState().rulers && (screen.x < RULER_SIZE || screen.y < RULER_SIZE),
      setParam: (layerId, prop, value) => documentCommands.updateProps(layerId, { [prop]: value }),
      setPaint: (layerId, index, paint) => {
        const next = fillsOf(layerId).map((p, i) => (i === index ? paint : p));
        documentCommands.updateProps(layerId, { "paint.fills": serializeFills(next) });
      },
      commitTransform: () => {
        transformTxRef.current?.commit();
        transformTxRef.current = null;
      },
      cancelTransform: () => {
        transformTxRef.current?.cancel();
        transformTxRef.current = null;
      },
      // The selection lives in one store (`useSelectionStore`), shared by the canvas, the Layers panel and the inspector.
      select: (layer, mode = "replace") => {
        const store = useSelectionStore.getState();
        if (!layer) {
          store.clearSelection();
          return;
        }
        store.selectMultiple(combineSelection(store.selectedIds, [layer.id], mode), "element");
        const frameId = frameIdOf(getDocument().layers, layer.id);
        if (frameId) useCanvasViewStore.getState().setActiveFrame(frameId);
      },
      marquee: (start, end, startFrameId, mode) => {
        const rect = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
        const layers = getDocument().layers;
        const index = hitTester.ensure();
        const boxes = new Map<string, Rect>();
        const pool = startFrameId && layers[startFrameId] ? layers[startFrameId].children : rootIds(layers);
        for (const id of pool) {
          const hit = index.get(id);
          if (hit) boxes.set(id, hit.rect);
        }
        const picked = marqueeCandidates(layers, boxes, rect, startFrameId);
        const store = useSelectionStore.getState();
        store.selectMultiple(combineSelection(store.selectedIds, picked, mode === "add" ? "add" : "replace"), "element");
        if (startFrameId) useCanvasViewStore.getState().setActiveFrame(startFrameId);
      },
      parentId: () => parentIdRef.current,
      created: (layer) => {
        useSelectionStore.getState().select(layer.id, "element");
        const frameId = frameIdOf(getDocument().layers, layer.id);
        if (frameId) useCanvasViewStore.getState().setActiveFrame(frameId);
        useToolStore.getState().setActive("select");
        // A text layer just drawn is typed into straight away.
        if (getDocument().layers[layer.id]?.archetype === "text") useCanvasViewStore.getState().startTextEdit(layer.id);
      },
      setPanning: setIsPanning,
      requestOverlay: () => setToolOverlay(gestureToolRef.current?.drawOverlay?.() ?? null),
    }),
    [hitTester, environmentRef, parentIdRef]
  );
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

  /**
   * What the canvas fits: every frame that is drawn, as one rectangle (or the sandbox's device frame in full-edition
   * Play mode). Keyed on the numbers, not on the frames array: adding a layer inside a frame changes that array (its
   * child count) but must not make an untouched camera re-fit itself.
   */
  const contentRectKey = useMemo(() => {
    if (isPlayMode && edition === "full") return `${-device.width / 2},${-device.height / 2},${device.width},${device.height}`;
    if (shownFrames.length === 0) return "";
    const minX = Math.min(...shownFrames.map((f) => f.x));
    const minY = Math.min(...shownFrames.map((f) => f.y));
    const maxX = Math.max(...shownFrames.map((f) => f.x + f.width));
    const maxY = Math.max(...shownFrames.map((f) => f.y + f.height));
    return `${minX},${minY},${maxX - minX},${maxY - minY}`;
  }, [isPlayMode, device.width, device.height, shownFrames]);
  const contentRect = useMemo(() => {
    if (!contentRectKey) return null;
    const [x, y, width, height] = contentRectKey.split(",").map(Number);
    return { x, y, width, height };
  }, [contentRectKey]);

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
  // One command per tool that exists, with its shortcut (Phase 24); a tool whose feature isn't built has no command.
  useEffect(() => {
    const offs = dockTools().map((def) =>
      defineCommand({
        id: `canvas.tool.${def.id}`,
        title: def.label,
        category: "Canvas",
        keybinding: def.shortcut,
        when: canvasCommandWhen,
        run: () => void useToolStore.getState().setActive(def.id),
      }),
    );
    // What the dock and an agent call: choose a tool by id.
    offs.push(
      defineTypedCommand({
        id: "tool.set",
        title: "Choose Tool",
        category: "Canvas",
        args: z.object({ tool: z.enum(dockTools().map((t) => t.id) as [ToolId, ...ToolId[]]) }),
        run: ({ tool }) => ({ ok: useToolStore.getState().setActive(tool), tool }),
      }),
    );
    return () => offs.forEach((off) => off());
  }, [canvasCommandWhen]);
  useToolKeys();

  // Escape during a gesture lets the tool undo it (a move, a resize, a rotation).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && gestureToolRef.current?.onKey?.(e, toolCtx)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toolCtx]);

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
  /** The pointer, for a tool: its place on screen and in canvas space, and which modifiers are down. */
  const toToolPointer = (e: React.PointerEvent): ToolPointer => {
    const rect = containerRef.current!.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const target = e.target as HTMLElement;
    return {
      screen,
      world: screenToDoc(useCameraStore.getState().camera, screen),
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      onBlank: target === containerRef.current || target.classList.contains("whiteboard-grid"),
    };
  };

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  /** Right-click: the layer under the pointer joins the selection if it isn't in it, then the layer menu opens. */
  const handleContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".floating-dock-wrapper, .zoom-controls, .frame-bar, .canvas-frame__title, .canvas-ruler, .canvas-context-menu")) return;
    e.preventDefault();
    if (isPlayMode || mode === "preview") return;
    const rect = containerRef.current!.getBoundingClientRect();
    const world = screenToDoc(useCameraStore.getState().camera, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    const hit = hitTester.pickAt(world, { deep: e.metaKey || e.ctrlKey });
    const store = useSelectionStore.getState();
    if (hit && !store.selectedIds.includes(hit.id)) store.select(hit.id, "element");
    const canPaste = (mirrorRead() ?? "").startsWith(CLIP_MARK);
    setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, entries: layerMenu(useSelectionStore.getState().selectedIds, canPaste) });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // The dock, the zoom controls, the frame bar and the frame titles are children of this div and their presses
    // bubble up here; they are not canvas gestures.
    if ((e.target as HTMLElement).closest(".floating-dock-wrapper, .zoom-controls, .frame-bar, .canvas-frame__title, .canvas-ruler, .canvas-context-menu, .canvas-rename")) return;
    if (isPlayMode) return;
    // The middle button always pans, whatever tool is active: a drawing tool must never trap you in "can only
    // draw, can't pan to get somewhere else first". (Space does the same through its spring.)
    const tool = e.button === 1 ? tools.pan : tools[currentTool];
    if (!tool?.onPointerDown) return;
    // In Preview the pointer belongs to the page; only the Hand (Space, the middle button) still works.
    if (mode === "preview" && tool.id !== "pan") return;
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    if (tool.onPointerDown(toToolPointer(e), toolCtx)) {
      gestureToolRef.current = tool;
      useToolStore.getState().setGesturing(true);
      containerRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    gestureToolRef.current?.onPointerMove?.(toToolPointer(e), toolCtx);
  };

  /** Ends whatever gesture is running as a cancel: the window lost focus, or the browser took the pointer away. */
  const abortGesture = useCallback(() => {
    const tool = gestureToolRef.current;
    if (!tool) return;
    gestureToolRef.current = null;
    useToolStore.getState().setGesturing(false);
    tool.onPointerCancel?.(toolCtx);
    setToolOverlay(null);
  }, [toolCtx]);
  useEffect(() => {
    window.addEventListener("blur", abortGesture);
    return () => window.removeEventListener("blur", abortGesture);
  }, [abortGesture]);

  const endGesture = (e: React.PointerEvent, cancel: boolean) => {
    const tool = gestureToolRef.current;
    if (!tool) return;
    gestureToolRef.current = null;
    useToolStore.getState().setGesturing(false);
    if (containerRef.current?.hasPointerCapture(e.pointerId)) containerRef.current.releasePointerCapture(e.pointerId);
    if (cancel) tool.onPointerCancel?.(toolCtx);
    else tool.onPointerUp?.(toToolPointer(e), toolCtx);
    setToolOverlay(null);
  };

  /* --------------------------------------------------------------------------
   * Component Selection Handler inside Device Frame
   * -------------------------------------------------------------------------- */

  // Double-click on a text layer edits it in place (Phase 31).
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (mode !== "design" || (currentTool !== "select" && currentTool !== "deepSelect")) return;
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const world = screenToDoc(useCameraStore.getState().camera, { x: e.clientX - r.left, y: e.clientY - r.top });
    const hit = hitTester.pickAt(world, { deep: true });
    const layer = hit ? getDocument().layers[hit.id] : undefined;
    if (!hit || !layer || layer.archetype !== "text" || layer.locked === true) return;
    useSelectionStore.getState().select(hit.id, "element");
    useCanvasViewStore.getState().startTextEdit(hit.id);
  };

  const canvasStyle: React.CSSProperties = {
    "--canvas-dot-color": palette.gridDot,
    backgroundColor: palette.bg,
    cursor: mode === "design" ? TOOL_DEFS[currentTool].cursor : undefined,
    ...style,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`whiteboard-stage ${currentTool === "pan" ? "whiteboard-stage--panning" : ""
        } ${isPanning ? "whiteboard-stage--is-dragging-pan" : ""} whiteboard-stage--tool-${currentTool} ${className || ""
        }`}
      style={canvasStyle}
      data-backdrop={backdrop}
      data-tool={currentTool}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endGesture(e, false)}
      onPointerCancel={(e) => endGesture(e, true)}
      onLostPointerCapture={() => abortGesture()}
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
                style={{ pointerEvents: "none" }}
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
        <OverlayLayer hitTester={hitTester} canvasRef={containerRef} transformModel={overlayTransformModel} guides={overlayGuides} hudMarks={overlayHud} />
        <TextEditor hitTester={hitTester} />
      </div>

      {/* Sub-Phase 43.2: live dashed-rect preview while dragging a shape tool.
          A sibling of .whiteboard-world, not a child — .whiteboard-world has
          its own pan/zoom CSS transform, but useShapeDrawing measures drag
          coordinates against the untransformed .whiteboard-stage container
          (containerRef), same as FloatingDock/ZoomControls below. Nesting
          this inside .whiteboard-world would double-apply the transform. */}
      {toolOverlay && (
        <div
          className="canvas-shape-draw-overlay"
          style={{ position: "absolute", left: toolOverlay.x, top: toolOverlay.y, width: toolOverlay.width, height: toolOverlay.height, border: "1.5px dashed #6366F1", background: "rgba(99, 102, 241, 0.08)", pointerEvents: "none", zIndex: 40 }}
        />
      )}

      <CanvasRulers hitTester={hitTester} containerRef={containerRef} />
      <CanvasContextMenu menu={contextMenu} onClose={closeContextMenu} />
      <RenameBox currentName={(id) => getDocument().layers[id]?.name ?? id} />
      <FrameBar />

      {/* Floating Atlassian-Style Bottom Dock */}
      <FloatingDock
        activeTool={activeTool}
        onSelectTool={(tool) => invokeCommand("tool.set", { tool })}
        // Quick Insert (search-and-place components/assets) has no real
        // implementation yet — it only ever set decorative tool state before
        // this phase too (the "components" tool did nothing on its own).
        // Left unwired rather than pointed at a tool id that no longer
        // exists; a real modal is future work, not a 43.2 regression.
        onOpenQuickInsert={undefined}
      />

      {/* Floating Zoom Controls Widget (Bottom-Right) */}
      <LiveZoomControls
        onZoomIn={() => useCameraStore.getState().stepZoom(1)}
        onZoomOut={() => useCameraStore.getState().stepZoom(-1)}
        onResetZoom={() => useCameraStore.getState().zoomTo100()}
        onFitToScreen={() => fitToFrame()}
        onRecenter={() => bringBackToCenter()}
      />
    </div>
  );
};
