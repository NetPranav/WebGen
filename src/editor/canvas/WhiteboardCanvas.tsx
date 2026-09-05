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
  Database,
  Workflow,
  Zap,
  Layers,
  Smartphone,
  Tablet,
  Monitor,
} from "lucide-react";

interface WhiteboardCanvasProps {
  deviceMode?: "desktop" | "tablet" | "mobile";
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  className?: string;
  style?: React.CSSProperties;
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
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const device = DEVICE_CONFIGS[deviceMode] || DEVICE_CONFIGS.desktop;

  /* --------------------------------------------------------------------------
   * Initial Centering of the Device Frame on Mount or Resize
   * -------------------------------------------------------------------------- */
  const centerDeviceFrame = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const padding = 60;
    const availW = Math.max(clientWidth - padding, 200);
    const availH = Math.max(clientHeight - padding - 40, 200);

    const scaleW = availW / device.width;
    const scaleH = availH / device.height;
    const fitScale = Math.min(scaleW, scaleH, 1.0);
    const targetZoom = Math.max(Math.round(fitScale * 100), 20);

    onZoomChange(targetZoom);

    const scale = targetZoom / 100;
    const frameW = device.width * scale;
    const frameH = device.height * scale;

    const initialX = Math.max((clientWidth - frameW) / 2, 20);
    const initialY = Math.max((clientHeight - frameH) / 2 - 20, 20);

    setPan({ x: initialX, y: initialY });
  }, [device.width, device.height, onZoomChange]);

  // Center & auto-fit on mount and when deviceMode changes
  useEffect(() => {
    centerDeviceFrame();
  }, [deviceMode, centerDeviceFrame]);

  // Dynamically adapt selected element bounds when switching device dimensions
  useEffect(() => {
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
  }, [device.width]);

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
        onZoomChange(100);
        centerDeviceFrame();
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
  }, [zoomLevel, onZoomChange, centerDeviceFrame]);

  /* --------------------------------------------------------------------------
   * Native Non-Passive Wheel Listener: Viewport-Isolated Zoom & Pan
   * Prevents the browser from EVER zooming the entire website on trackpad
   * pinch or Ctrl+wheel. Only the Whiteboard Canvas zooms.
   * -------------------------------------------------------------------------- */
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Intercept wheel on canvas: prevent native document scrolling & page-level zoom
      e.preventDefault();
      e.stopPropagation();

      const isZoom = e.ctrlKey || e.metaKey;

      if (isZoom) {
        // macOS trackpad pinch uses fractional deltaY; standard mouse wheel uses larger steps
        const isSmallDelta = Math.abs(e.deltaY) < 50;
        const zoomDelta = -e.deltaY * (isSmallDelta ? 0.015 : 0.0015);
        const currentScale = zoomLevelRef.current / 100;
        const zoomFactor = 1 + Math.max(Math.min(zoomDelta, 0.25), -0.25);
        const newScale = Math.min(Math.max(currentScale * zoomFactor, 0.1), 4.0);
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
  }, [onZoomChange]);

  /* --------------------------------------------------------------------------
   * Canvas Drag / Panning Engine
   * -------------------------------------------------------------------------- */
  const handleMouseDown = (e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1;
    const canPan = isMiddleClick || isSpacePressed || activeTool === "pan";

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
  };

  /* --------------------------------------------------------------------------
   * Dynamic Level-of-Detail (LOD) Grid Calculation
   * Prevents dots from ever merging into a solid grey soup or scattering into oblivion.
   * Modulo octave folding keeps dot spacing strictly between 18px and 36px on screen.
   * -------------------------------------------------------------------------- */
  const currentScale = zoomLevel / 100;
  let visualSpacing = 24 * currentScale;

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
    ...style,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`whiteboard-stage ${
        isSpacePressed || activeTool === "pan" ? "whiteboard-stage--panning" : ""
      } ${isPanning ? "whiteboard-stage--is-dragging-pan" : ""} whiteboard-stage--tool-${activeTool} ${
        className || ""
      }`}
      style={canvasStyle}
      onMouseDown={handleMouseDown}
      onClick={() => setSelectedElement(null)}
      role="region"
      aria-label="Confluence Whiteboard Stage"
    >
      {/* Infinite Scalable Dot-Grid Matrix */}
      <div className="whiteboard-grid" aria-hidden="true" />

      {/* Hardware-Accelerated Transformed World Canvas */}
      <div className="whiteboard-world">
        {/* Multi-Device Responsive Frame */}
        <div
          className={`device-frame-container device-frame--${deviceMode}`}
          style={{ width: `${device.width}px` }}
        >
          {/* Frame Meta Header */}
          <div className="device-frame-meta">
            <div className="device-frame-meta__badge">
              {deviceMode === "desktop" && <Monitor size={11} />}
              {deviceMode === "tablet" && <Tablet size={11} />}
              {deviceMode === "mobile" && <Smartphone size={11} />}
              <span>{device.label}</span>
            </div>

            <div className="device-frame-meta__status">
              <span className="device-frame-meta__dot" />
              <span>Interactive Preview</span>
            </div>
          </div>

          {/* Device Screen Body */}
          <div
            className="device-frame"
            style={{
              width: `${device.width}px`,
              height: `${device.height}px`,
            }}
          >
            {/* Mobile Notch Indicator */}
            {deviceMode === "mobile" && <div className="device-frame__notch" />}

            {/* Application Live Interactive Stage */}
            <div className="device-frame__screen">
              <div className="app-preview">
                {/* Navbar Component */}
                <header
                  className="app-preview__navbar"
                  onClick={(e) =>
                    handleSelectComponent(e, "comp_navbar", "Navbar (Sticky Header)", {
                      x: 0,
                      y: deviceMode === "mobile" ? 32 : 0,
                      width: device.width,
                      height: 56,
                    })
                  }
                >
                  <div className="app-preview__logo">
                    <Zap size={18} style={{ color: "var(--accent-primary)" }} />
                    <span>NovaSaaS</span>
                  </div>

                  {deviceMode !== "mobile" && (
                    <nav className="app-preview__nav-links">
                      <span className="app-preview__nav-item">Features</span>
                      <span className="app-preview__nav-item">Architecture</span>
                      <span className="app-preview__nav-item">Pricing</span>
                      <span className="app-preview__nav-item">Documentation</span>
                    </nav>
                  )}

                  <button
                    type="button"
                    className="app-preview__btn-primary"
                    style={{ padding: "6px 14px", fontSize: "12px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCtaCount((c) => c + 1);
                    }}
                  >
                    <span>Get Started</span>
                    <ArrowRight size={12} />
                  </button>
                </header>

                {/* Hero Section Component */}
                <section
                  className="app-preview__hero"
                  onClick={(e) =>
                    handleSelectComponent(e, "comp_hero", "Hero Section", {
                      x: 0,
                      y: 56,
                      width: device.width,
                      height: 380,
                    })
                  }
                >
                  <div className="app-preview__tag">
                    <Sparkles size={12} />
                    <span>Engine v1.0 • Full-Stack Visual IDE</span>
                  </div>

                  <h1 className="app-preview__title">
                    Build Production Web Apps with Unreal Engine Precision
                  </h1>

                  <p className="app-preview__subtitle">
                    Construct UI components, wire visual logic blueprints, model databases,
                    and choreograph GSAP motion timelines without leaving the visual stage.
                  </p>

                  <div className="app-preview__cta-group">
                    <button
                      type="button"
                      className="app-preview__btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCtaCount((c) => c + 1);
                      }}
                    >
                      <Sparkles size={14} />
                      <span>Live Interaction Counter ({ctaCount})</span>
                    </button>

                    <button
                      type="button"
                      className="app-preview__btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert("Explore Architecture clicked!");
                      }}
                    >
                      <Workflow size={14} />
                      <span>Inspect Blueprints</span>
                    </button>
                  </div>
                </section>

                {/* Feature Grid Component */}
                <section
                  className="app-preview__grid"
                  onClick={(e) =>
                    handleSelectComponent(e, "comp_grid", "Feature Cards Grid", {
                      x: (device.width - Math.min(device.width - 48, 1080)) / 2,
                      y: 440,
                      width: Math.min(device.width - 48, 1080),
                      height: 240,
                    })
                  }
                >
                  <div className="app-preview__card">
                    <div className="app-preview__card-icon">
                      <Workflow size={18} />
                    </div>
                    <div className="app-preview__card-title">Logic Blueprints</div>
                    <div className="app-preview__card-desc">
                      Visual event graphs with typed pins, branching logic, and real-time wire pulse execution traces.
                    </div>
                  </div>

                  <div className="app-preview__card">
                    <div className="app-preview__card-icon">
                      <Database size={18} />
                    </div>
                    <div className="app-preview__card-title">Database ER Modeler</div>
                    <div className="app-preview__card-desc">
                      Visual relational and document schemas that compile directly to Prisma models and SQL migrations.
                    </div>
                  </div>

                  <div className="app-preview__card">
                    <div className="app-preview__card-icon">
                      <Layers size={18} />
                    </div>
                    <div className="app-preview__card-title">120 FPS Wasm Physics</div>
                    <div className="app-preview__card-desc">
                      High-performance C++ WebAssembly kernel rendering Hermite splines and Verlet cable tension dynamics.
                    </div>
                  </div>
                </section>
              </div>

              {/* Selection Bounding Box Overlay */}
              <CanvasOverlay selectedElement={selectedElement} />
            </div>
          </div>
        </div>
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
        onResetZoom={() => {
          onZoomChange(100);
          centerDeviceFrame();
        }}
        onFitToScreen={centerDeviceFrame}
      />
    </div>
  );
};
