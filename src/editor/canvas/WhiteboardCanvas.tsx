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
  Sparkles,
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
  Wand2,
  CornerDownLeft,
  X,
} from "lucide-react";
import { SandboxHost } from "@/editor/runtime/SandboxHost";
import { useProjectStore } from "@/core/store/useProjectStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { ComponentGenerator } from "@/ai/component/ComponentGenerator";
import { THEME_PALETTES } from "@/core/types/environment";
import { useLatestRef } from "@/core/hooks/useLatestRef";

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
  const elements = useProjectStore((state) => state.elements);
  const pages = useProjectStore((state) => state.pages);
  const activePageId = useProjectStore((state) => state.activePageId);
  const insertGeneratedComponent = useProjectStore((state) => state.insertGeneratedComponent);
  const mountDemoProject = useProjectStore((state) => state.mountDemoProject);
  const selectEntity = useSelectionStore((state) => state.select);

  const activePage = pages[activePageId] || Object.values(pages)[0];
  const rootContainer = activePage ? elements[activePage.rootElementId] : null;
  const childCount = rootContainer?.children?.length || 0;

  const [promptText, setPromptText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const handleGenerate = (customPrompt?: string) => {
    const text = (customPrompt || promptText).trim();
    if (!text) return;
    setIsGenerating(true);
    try {
      const result = ComponentGenerator.generateComponent(text);
      insertGeneratedComponent(result.elements, result.rootId, `Generate: ${result.name}`);
      selectEntity(result.rootId, "element");
      setPromptText("");
      setShowPromptModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

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
        ) : (
          /* Blank Canvas State: Prompt AI Card at Center */
          <div
            className="canvas-prompt-card"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "560px",
              maxWidth: "90vw",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(226, 232, 240, 0.9)",
              borderRadius: "20px",
              padding: "32px",
              boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  backgroundColor: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                }}
              >
                <Wand2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 600, color: "#0f172a" }}>
                  Prompt AI to Create Component
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
                  Describe a component in natural language, and the studio will generate the AST elements ready for animation.
                </p>
              </div>
            </div>

            {/* Prompt Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerate();
              }}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="e.g. Create a glassmorphic pricing card with badge, price, and button..."
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "14px 110px 14px 16px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    backgroundColor: "#f8fafc",
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  disabled={!promptText.trim() || isGenerating}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: promptText.trim() ? "#059669" : "#94a3b8",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: promptText.trim() ? "pointer" : "default",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Generate</span>
                  <CornerDownLeft size={13} />
                </button>
              </div>

              {/* Quick Prompt Pills */}
              <div>
                <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8" }}>
                  Quick Starts:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {[
                    { label: "💎 Pricing Tier Card", prompt: "Create a modern dark mode pricing card with badge and button" },
                    { label: "⭐ Testimonial Review", prompt: "Create a testimonial review card with avatar and quote" },
                    { label: "⚡ Dark Mode Toggle", prompt: "Create a dark mode toggle switch" },
                    { label: "🚀 Hero Banner", prompt: "Create a hero banner with headline and CTA" },
                    { label: "🖼️ Media Showcase", prompt: "Create a media showcase with image and caption" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleGenerate(item.prompt)}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        borderRadius: "9999px",
                        padding: "4px 10px",
                        fontSize: "12px",
                        color: "#334155",
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Or Load Stashed Demo */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Want to inspect the existing demo?</span>
                <button
                  type="button"
                  onClick={() => mountDemoProject()}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#059669",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Sparkles size={12} />
                  <span>Mount Showcase Demo</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Coordinate Crosshairs & Overlays when elements exist */}
        {childCount > 0 && !isPlayMode && (
          <>
            {environment.viewport.axes.enabled && (
              <div className="canvas-crosshair-axes" aria-hidden="true">
                <div className="canvas-axis-line canvas-axis-line--x" />
                <div className="canvas-axis-line canvas-axis-line--y" />
              </div>
            )}
            <CanvasOverlay selectedElement={selectedElement} />
          </>
        )}
      </div>

      {/* Floating Prompt AI Component Trigger when canvas is active */}
      {childCount > 0 && !isPlayMode && (
        <button
          type="button"
          onClick={() => setShowPromptModal(true)}
          title="Prompt AI to generate another component"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "#ffffff",
            border: "1.5px solid #059669",
            borderRadius: "9999px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#059669",
            boxShadow: "0 4px 14px rgba(5, 150, 105, 0.15)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 30,
            transition: "all 0.15s ease",
          }}
        >
          <Wand2 size={14} />
          <span>+ Prompt Component</span>
        </button>
      )}

      {/* Floating Prompt Modal Dialog */}
      {showPromptModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowPromptModal(false)}
        >
          <div
            style={{
              width: "560px",
              maxWidth: "90vw",
              background: "#ffffff",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Wand2 size={18} style={{ color: "#059669" }} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Create New Component</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerate();
              }}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g. Create a dark mode testimonial card with avatar..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!promptText.trim() || isGenerating}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#059669",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Generate & Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        onFitToScreen={bringBackToCenter}
        onRecenter={bringBackToCenter}
      />
    </div>
  );
};
