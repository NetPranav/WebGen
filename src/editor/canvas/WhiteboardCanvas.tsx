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

import React, { useState, useRef, useEffect, useCallback } from "react";
import "@/editor/styles/whiteboard.css";
import { FloatingDock, CanvasTool } from "./FloatingDock";
import { ZoomControls } from "./ZoomControls";
import { CanvasOverlay, SelectionRect } from "./CanvasOverlay";
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
import { SandboxHost } from "@/editor/runtime/SandboxHost";
import { useProjectStore } from "@/core/store/useProjectStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { THEME_PALETTES } from "@/core/types/environment";
import { useLatestRef } from "@/core/hooks/useLatestRef";
import { useLayers } from "@/core/store/useDocumentStore";

interface WhiteboardCanvasProps {
  deviceMode?: "desktop" | "tablet" | "mobile";
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
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
  zoomLevel,
  onZoomChange,
  onDropAsset,
  isPlaying: isPlayingProp = false,
  onTogglePlay,
  onOpenExecutionTrace,
  className,
  style,
  onSelectElement,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

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
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");

  /* --------------------------------------------------------------------------
   * Component Selection & Interactive State
   * -------------------------------------------------------------------------- */
  const [selectedElement, setSelectedElement] = useState<SelectionRect | null>(null);
  const [ctaCount, setCtaCount] = useState(0);

  const environment = useProjectStore((state) => state.environment);
  const elements = useLayers();
  const pages = useProjectStore((state) => state.pages);
  const activePageId = useProjectStore((state) => state.activePageId);
  const selectEntity = useSelectionStore((state) => state.select);

  const activePage = pages[activePageId] || Object.values(pages)[0];
  const rootContainer = activePage ? elements[activePage.rootElementId] : null;
  const childCount = rootContainer?.children?.length || 0;

  const palette = THEME_PALETTES[environment?.theme?.palette] || THEME_PALETTES.clean_light;

  const device = DEVICE_CONFIGS[deviceMode] || DEVICE_CONFIGS.desktop;

  /* --------------------------------------------------------------------------
   * Bring Back to Center: centers (0, 0) world coordinates in the viewport
   * -------------------------------------------------------------------------- */
  const bringBackToCenter = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    onZoomChange(100);
    setPan({
      x: clientWidth / 2,
      y: clientHeight / 2,
    });
  }, [onZoomChange]);

  /** Zoom so the whole device frame fits the viewport (never above 100%), centered
   * slightly above the middle so the floating tool dock doesn't cover its bottom edge. */
  const fitToFrame = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const scale = Math.min((clientWidth - 96) / device.width, (clientHeight - 160) / device.height, 1);
    onZoomChange(Math.max(10, Math.floor(scale * 100)));
    setPan({ x: clientWidth / 2, y: clientHeight / 2 - 28 });
  }, [device.width, device.height, onZoomChange]);

  // Center on mount and listen for recenter event
  useEffect(() => {
    bringBackToCenter();

    const handleRecenterEvent = () => {
      bringBackToCenter();
    };
    window.addEventListener("antigravity:recenter_canvas", handleRecenterEvent);
    return () => {
      window.removeEventListener("antigravity:recenter_canvas", handleRecenterEvent);
    };
  }, [bringBackToCenter]);

  // Auto-fit whenever the page preview appears or the device target changes, and
  // return to 100% when it goes away (e.g. "Clear Showcase"). Declared after the
  // mount-time recenter so it wins when a project loads with content.
  const hasFrame = isPlayMode || childCount > 0;
  useEffect(() => {
    if (hasFrame) fitToFrame();
    else bringBackToCenter();
  }, [hasFrame, deviceMode, fitToFrame, bringBackToCenter]);

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
   * Spacebar & Keyboard Hotkeys
   * -------------------------------------------------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in input or editable elements
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      // Tool selection shortcuts
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      if (e.key === "h" || e.key === "H") setActiveTool("pan");
      if (e.key === "p" || e.key === "P") setActiveTool("pencil");
      if (e.key === "t" || e.key === "T") setActiveTool("text");
      if (e.key === "w" || e.key === "W") setActiveTool("wire");
      if (e.key === "s" || e.key === "S") setActiveTool("shapes");
      if (e.key === "c" || e.key === "C") setActiveTool("components");
      if (e.key === "a" || e.key === "A") setActiveTool("assets");

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        onZoomChange(Math.min(zoomLevel + 10, 400));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        onZoomChange(Math.max(zoomLevel - 10, 10));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        bringBackToCenter();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [zoomLevel, onZoomChange, bringBackToCenter]);

  /* --------------------------------------------------------------------------
   * Native Non-Passive Wheel Listener: Viewport-Isolated Zoom & Pan
   * Prevents the browser from EVER zooming the entire website on trackpad
   * pinch or Ctrl+wheel. Only the Whiteboard Canvas zooms.
   * -------------------------------------------------------------------------- */
  const zoomLevelRef = useLatestRef(zoomLevel);
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

        // macOS trackpad pinch uses fractional deltaY; standard mouse wheel uses larger steps
        const isSmallDelta = Math.abs(e.deltaY) < 50;
        const speedMult = viewportRef.current.zoom.speed === "fast" ? 2.0 : 1.0;
        const zoomDelta = -e.deltaY * (isSmallDelta ? 0.015 : 0.0015) * speedMult;
        const currentScale = zoomLevelRef.current / 100;
        const zoomFactor = 1 + Math.max(Math.min(zoomDelta, 0.25), -0.25);
        const minScale = (viewportRef.current.zoom.min || 10) / 100;
        const maxScale = (viewportRef.current.zoom.max || 400) / 100;
        const newScale = Math.min(Math.max(currentScale * zoomFactor, minScale), maxScale);
        const newZoom = Math.round(newScale * 100);

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setPan((prev) => {
          const newPanX = mouseX - (mouseX - prev.x) * (newScale / currentScale);
          const newPanY = mouseY - (mouseY - prev.y) * (newScale / currentScale);
          return { x: newPanX, y: newPanY };
        });

        onZoomChange(newZoom);
      } else {
        if (!viewportRef.current.pan.enabled) return;
        // Normal 2-finger scroll or wheel: pan the canvas only
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
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
  }, [onZoomChange, zoomLevelRef, viewportRef]);

  /* --------------------------------------------------------------------------
   * Canvas Drag / Panning Engine
   * -------------------------------------------------------------------------- */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!environment.viewport.pan.enabled) return;

    const isMiddleClick = e.button === 1;
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

        setPan((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
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

  /* --------------------------------------------------------------------------
   * Dynamic Level-of-Detail (LOD) Grid Calculation
   * Prevents dots from ever merging into a solid grey soup or scattering into oblivion.
   * Modulo octave folding keeps dot spacing strictly between 18px and 36px on screen.
   * -------------------------------------------------------------------------- */
  const currentScale = zoomLevel / 100;
  const gridBase = environment.viewport.grid.size || 24;
  let visualSpacing = gridBase * currentScale;

  while (visualSpacing < 18) {
    visualSpacing *= 2;
  }
  while (visualSpacing > 36) {
    visualSpacing /= 2;
  }

  // Modulo pan offset to keep dots locked to world coordinates
  const gridPosX = ((pan.x % visualSpacing) + visualSpacing) % visualSpacing;
  const gridPosY = ((pan.y % visualSpacing) + visualSpacing) % visualSpacing;

  const canvasStyle: React.CSSProperties = {
    "--canvas-pan-x": pan.x,
    "--canvas-pan-y": pan.y,
    "--canvas-zoom": currentScale,
    "--canvas-grid-size": `${visualSpacing}px`,
    "--canvas-grid-pos-x": `${gridPosX}px`,
    "--canvas-grid-pos-y": `${gridPosY}px`,
    "--canvas-dot-color": palette.gridDot,
    backgroundColor: palette.bg,
    ...style,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`whiteboard-stage ${isSpacePressed || activeTool === "pan" ? "whiteboard-stage--panning" : ""
        } ${isPanning ? "whiteboard-stage--is-dragging-pan" : ""} whiteboard-stage--tool-${activeTool} ${className || ""
        }`}
      style={canvasStyle}
      onMouseDown={handleMouseDown}
      onClick={() => {
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
        {/* Play Sandbox Mode or Elements Present: render live device viewport */}
        {isPlayMode || childCount > 0 ? (
          <div
            className={`device-frame-container device-frame--${deviceMode}`}
            style={{ width: `${device.width}px` }}
          >
            <div className="device-frame" style={{ width: `${device.width}px`, height: `${device.height}px` }}>
              <SandboxHost
                width="100%"
                height="100%"
                deviceMode={deviceMode}
                onStopPlay={() => handleTogglePlay(false)}
                onOpenExecutionTrace={onOpenExecutionTrace}
                onElementClick={(elId) => {
                  selectEntity(elId, "element");
                }}
              />
            </div>
          </div>
        ) : null}

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
        {childCount > 0 && !isPlayMode && <CanvasOverlay selectedElement={selectedElement} />}
      </div>

      {/* Floating Atlassian-Style Bottom Dock */}
      <FloatingDock
        activeTool={activeTool}
        onSelectTool={(tool) => setActiveTool(tool)}
        onOpenQuickInsert={() => setActiveTool("components")}
      />

      {/* Floating Zoom Controls Widget (Bottom-Right) */}
      <ZoomControls
        zoomLevel={zoomLevel}
        onZoomIn={() => onZoomChange(Math.min(zoomLevel + 10, 400))}
        onZoomOut={() => onZoomChange(Math.max(zoomLevel - 10, 10))}
        onResetZoom={bringBackToCenter}
        onFitToScreen={fitToFrame}
        onRecenter={bringBackToCenter}
      />
    </div>
  );
};
