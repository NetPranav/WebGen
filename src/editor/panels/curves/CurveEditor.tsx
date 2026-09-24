"use client";

/**
 * ============================================================================
 * C++ WEBASSEMBLY CUBIC BEZIER & SPRING CURVE EDITOR
 * ============================================================================
 * UI Element: CurveEditor (Unreal Equivalent: Curve Editor)
 * Screen / Scope: Screen 05: Motion Sequencer & Bezier Curve Editor (`/editor`)
 * Role: Visual easing curve workstation powered by C++ WebAssembly (SplineSolver.ts)
 *       for smooth 120 FPS interpolation, interactive tangent handles, and presets.
 * Styling Source: `@/editor/styles/sequencer.css`
 * Matches: ROADMAP.md Sub-Phase 4.2 & PANELS.md (Panel 06)
 * ============================================================================
 */

import React, { useState, useRef, useMemo, useCallback } from "react";
import "@/editor/styles/sequencer.css";
import { Point2D, SplineSolver } from "@/core/wasm/SplineSolver";
import { SpringEditor, SpringConfig } from "./SpringEditor";
import { Play, RotateCcw, Check, Sparkles, Layers, Sliders } from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { getLayerClips } from "@/core/document/factories";
import { documentCommands, getDocument, useLayers } from "@/core/store/useDocumentStore";

export interface BezierControlPoints {
  p1: Point2D; // (x1, y1)
  p2: Point2D; // (x2, y2)
}

export const BEZIER_PRESETS: Record<string, { label: string; p1: Point2D; p2: Point2D; gsap: string }> = {
  power2Out: {
    label: "Power2.out",
    p1: { x: 0.25, y: 1.0 },
    p2: { x: 0.5, y: 1.0 },
    gsap: "power2.out",
  },
  power4InOut: {
    label: "Power4.inOut",
    p1: { x: 0.77, y: 0.0 },
    p2: { x: 0.175, y: 1.0 },
    gsap: "power4.inOut",
  },
  elasticOut: {
    label: "Elastic.out",
    p1: { x: 0.175, y: 0.885 },
    p2: { x: 0.32, y: 1.275 },
    gsap: "elastic.out(1, 0.3)",
  },
  bounceOut: {
    label: "Bounce.out",
    p1: { x: 0.34, y: 1.56 },
    p2: { x: 0.64, y: 1.0 },
    gsap: "bounce.out",
  },
  anticipate: {
    label: "Anticipate (Back)",
    p1: { x: 0.36, y: 0.0 },
    p2: { x: 0.66, y: -0.56 },
    gsap: "back.inOut(1.7)",
  },
};

export const CurveEditor: React.FC = () => {
  const elements = useLayers();
  const { pages, activePageId } = useProjectStore();

  const [activeTab, setActiveTab] = useState<"bezier" | "spring">("bezier");
  const [activePreset, setActivePreset] = useState<string>("power2Out");

  // Control points normalized between [0, 1] for x, and [-0.5, 1.5] for y
  const [controlPoints, setControlPoints] = useState<BezierControlPoints>({
    p1: { x: 0.25, y: 1.0 },
    p2: { x: 0.5, y: 1.0 },
  });

  const [isPreviewRunning, setIsPreviewRunning] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  // Canvas coordinate math
  const canvasWidth = 280;
  const canvasHeight = 220;
  const padding = 36;
  const innerW = canvasWidth - padding * 2;
  const innerH = canvasHeight - padding * 2;

  const toSvgCoords = useCallback(
    (pt: Point2D): Point2D => ({
      x: padding + pt.x * innerW,
      y: padding + (1.0 - pt.y) * innerH,
    }),
    [innerW, innerH, padding]
  );

  const toUnitCoords = useCallback(
    (svgPt: Point2D): Point2D => ({
      x: Math.max(0, Math.min(1, (svgPt.x - padding) / innerW)),
      y: Math.max(-0.6, Math.min(1.6, 1.0 - (svgPt.y - padding) / innerH)),
    }),
    [innerW, innerH, padding]
  );

  // Solve cubic curve points at 120 FPS using SplineSolver
  const svgP0 = toSvgCoords({ x: 0, y: 0 });
  const svgP1 = toSvgCoords(controlPoints.p1);
  const svgP2 = toSvgCoords(controlPoints.p2);
  const svgP3 = toSvgCoords({ x: 1, y: 1 });

  const { pathD, arcLength } = useMemo(() => {
    const table = SplineSolver.buildArcLengthTable(svgP0, svgP1, svgP2, svgP3, 64);
    const path = SplineSolver.formatSvgPath(svgP0, svgP1, svgP2, svgP3);
    return {
      pathD: path,
      arcLength: table.totalLength,
    };
  }, [svgP0, svgP1, svgP2, svgP3]);

  // CSS cubic-bezier string
  const cssCubicBezier = useMemo(() => {
    const x1 = controlPoints.p1.x.toFixed(3);
    const y1 = controlPoints.p1.y.toFixed(3);
    const x2 = controlPoints.p2.x.toFixed(3);
    const y2 = controlPoints.p2.y.toFixed(3);
    return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  }, [controlPoints]);

  // Dragging handles logic
  const draggingHandleRef = useRef<"p1" | "p2" | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleMouseDownHandle = (handle: "p1" | "p2", e: React.MouseEvent) => {
    e.stopPropagation();
    draggingHandleRef.current = handle;
    setActivePreset("custom");

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!svgRef.current || !draggingHandleRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = moveEvent.clientX - rect.left;
      const svgY = moveEvent.clientY - rect.top;
      const unit = toUnitCoords({ x: svgX, y: svgY });

      setControlPoints((prev) => {
        if (draggingHandleRef.current === "p1") {
          return { ...prev, p1: unit };
        }
        return { ...prev, p2: unit };
      });
    };

    const handleMouseUp = () => {
      draggingHandleRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleSelectPreset = (key: string) => {
    const preset = BEZIER_PRESETS[key];
    if (!preset) return;
    setActivePreset(key);
    setControlPoints({ p1: { ...preset.p1 }, p2: { ...preset.p2 } });
  };

  const handleTriggerPreview = () => {
    setIsPreviewRunning(false);
    setTimeout(() => setIsPreviewRunning(true), 20);
  };

  // Apply easing to current active element in store
  const handleApplyToElement = () => {
    const activePage = pages[activePageId || "page_home"];
    const rootElementId = activePage?.rootElementId || Object.keys(elements)[0];
    const activeElement = elements[rootElementId];
    if (!activeElement) return;

    const [firstClip] = getLayerClips(getDocument(), activeElement.id);
    if (firstClip) {
      documentCommands.updateClip(firstClip.id, { easing: cssCubicBezier }, "Apply custom bezier easing");
      setAppliedFeedback(true);
      setTimeout(() => setAppliedFeedback(false), 1500);
    }
  };

  return (
    <div className="curve-editor-shell" role="region" aria-label="C++ Wasm Bezier Curve Editor">
      {/* Editor Toolbar */}
      <div className="curve-editor-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <button
            type="button"
            className={`cb-pill ${activeTab === "bezier" ? "cb-pill--active" : ""}`}
            onClick={() => setActiveTab("bezier")}
          >
            <Sparkles size={11} />
            <span>Cubic Bezier (C++ Wasm)</span>
          </button>
          <button
            type="button"
            className={`cb-pill ${activeTab === "spring" ? "cb-pill--active" : ""}`}
            onClick={() => setActiveTab("spring")}
          >
            <Sliders size={11} />
            <span>Spring Physics (Framer)</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          <button
            type="button"
            className="cb-pill"
            onClick={handleTriggerPreview}
            title="Preview motion curve in real-time"
          >
            <Play size={11} />
            <span>Test Motion</span>
          </button>

          <button
            type="button"
            className="cb-pill cb-pill--active"
            onClick={handleApplyToElement}
            title="Apply curve to active element animation stack"
          >
            {appliedFeedback ? <Check size={11} /> : <Sparkles size={11} />}
            <span>{appliedFeedback ? "Applied!" : "Apply to Element"}</span>
          </button>
        </div>
      </div>

      {activeTab === "spring" ? (
        <SpringEditor />
      ) : (
        <div className="curve-editor-main">
          {/* Main SVG Curve Workstation Canvas */}
          <div className="curve-canvas-box">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              style={{ width: "100%", height: "100%", overflow: "visible" }}
            >
              {/* Unit Square Reference Box */}
              <rect
                x={padding}
                y={padding}
                width={innerW}
                height={innerH}
                fill="rgba(241, 245, 249, 0.4)"
                stroke="var(--border-default)"
                strokeWidth="1"
              />

              {/* Diagonal Linear Reference Line */}
              <line
                x1={svgP0.x}
                y1={svgP0.y}
                x2={svgP3.x}
                y2={svgP3.y}
                stroke="var(--border-subtle)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Tangent Lines */}
              <line
                x1={svgP0.x}
                y1={svgP0.y}
                x2={svgP1.x}
                y2={svgP1.y}
                className="curve-tangent-line"
              />
              <line
                x1={svgP3.x}
                y1={svgP3.y}
                x2={svgP2.x}
                y2={svgP2.y}
                className="curve-tangent-line"
              />

              {/* Solved Cubic Spline Curve (120 FPS) */}
              <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="3" />

              {/* Anchor points P0 and P3 */}
              <circle cx={svgP0.x} cy={svgP0.y} r={4} fill="var(--text-tertiary)" />
              <circle cx={svgP3.x} cy={svgP3.y} r={4} fill="var(--text-tertiary)" />

              {/* Tangent Control Handles P1 & P2 */}
              <circle
                cx={svgP1.x}
                cy={svgP1.y}
                r={6}
                className="curve-handle-p1"
                onMouseDown={(e) => handleMouseDownHandle("p1", e)}
              >
                <title>{`Handle P1: (${controlPoints.p1.x.toFixed(2)}, ${controlPoints.p1.y.toFixed(2)})`}</title>
              </circle>
              <circle
                cx={svgP2.x}
                cy={svgP2.y}
                r={6}
                className="curve-handle-p2"
                onMouseDown={(e) => handleMouseDownHandle("p2", e)}
              >
                <title>{`Handle P2: (${controlPoints.p2.x.toFixed(2)}, ${controlPoints.p2.y.toFixed(2)})`}</title>
              </circle>
            </svg>
          </div>

          {/* Right Sidebar: Presets, Values, and Interactive Preview */}
          <div className="curve-sidebar">
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>
              Easing Presets:
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Object.entries(BEZIER_PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectPreset(key)}
                  className={`cb-pill ${activePreset === key ? "cb-pill--active" : ""}`}
                  style={{ justifyContent: "flex-start", height: 24, fontSize: 11 }}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Live Motion Test Bar */}
            <div style={{ marginTop: "var(--space-xs)" }}>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Live Motion Response:</span>
              <div
                style={{
                  height: 36,
                  background: "var(--canvas-bg)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  marginTop: 4,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  key={isPreviewRunning ? "anim-running" : "anim-idle"}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "var(--radius-xs)",
                    background: "var(--accent-primary)",
                    transform: isPreviewRunning ? "translateX(160px)" : "translateX(0px)",
                    transition: isPreviewRunning ? `transform 1.0s ${cssCubicBezier}` : "none",
                  }}
                />
              </div>
            </div>

            {/* Formula Readout */}
            <div style={{ marginTop: "auto" }}>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>CSS Timing Function:</span>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  padding: "6px 8px",
                  borderRadius: "var(--radius-xs)",
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-subtle)",
                  marginTop: 2,
                  wordBreak: "break-all",
                  color: "var(--accent-primary)",
                  fontWeight: 600,
                }}
              >
                {cssCubicBezier}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                Arc Length: {arcLength.toFixed(1)}px (Wasm Kernel)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
