"use client";

/**
 * ============================================================================
 * INTERACTIVE CUBIC BEZIER CURVE EDITOR MODAL
 * ============================================================================
 * Visual cubic-bezier curve editor with SVG control handles P1(x1, y1) and
 * P2(x2, y2), preset easing curves, and real-time motion preview ball.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.5 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import { X, Play, RotateCcw, Check, Sparkles } from "lucide-react";
import { CubicBezierHandle } from "@/core/types/animations";
import "@/editor/styles/forms.css";

interface BezierCurveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHandle?: CubicBezierHandle;
  onApply: (handle: CubicBezierHandle) => void;
}

const PRESETS: Record<string, CubicBezierHandle> = {
  "Ease Linear": [0.0, 0.0, 1.0, 1.0],
  "Ease In Out": [0.42, 0.0, 0.58, 1.0],
  "Ease Out Quart": [0.25, 1.0, 0.5, 1.0],
  "Bounce Back": [0.34, 1.56, 0.64, 1.0],
  "Spring Snap": [0.175, 0.885, 0.32, 1.275],
};

export const BezierCurveModal: React.FC<BezierCurveModalProps> = ({
  isOpen,
  onClose,
  initialHandle = [0.4, 0.0, 0.2, 1.0],
  onApply,
}) => {
  const [handle, setHandle] = useState<CubicBezierHandle>(initialHandle);
  const [activeDragPoint, setActiveDragPoint] = useState<"p1" | "p2" | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setHandle(initialHandle);
  }, [initialHandle, isOpen]);

  if (!isOpen) return null;

  const CANVAS_SIZE = 220;
  const PADDING = 20;
  const PLOT_SIZE = CANVAS_SIZE - PADDING * 2;

  const [x1, y1, x2, y2] = handle;

  // Convert normalized (0-1) to SVG coordinates (origin bottom-left)
  const normToSvg = (x: number, y: number) => {
    const svgX = PADDING + x * PLOT_SIZE;
    const svgY = PADDING + (1 - y) * PLOT_SIZE;
    return { x: svgX, y: svgY };
  };

  // Convert SVG coordinates to normalized (0-1)
  const svgToNorm = (svgX: number, svgY: number) => {
    const normX = Math.max(0, Math.min(1, (svgX - PADDING) / PLOT_SIZE));
    const normY = (PADDING + PLOT_SIZE - svgY) / PLOT_SIZE;
    return {
      x: Number(normX.toFixed(3)),
      y: Number(normY.toFixed(3)),
    };
  };

  const p0 = normToSvg(0, 0);
  const p1 = normToSvg(x1, y1);
  const p2 = normToSvg(x2, y2);
  const p3 = normToSvg(1, 1);

  const bezierPath = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
  const cssBezierStr = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;

  const handlePointerDown = (point: "p1" | "p2") => (e: React.PointerEvent) => {
    e.preventDefault();
    setActiveDragPoint(point);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragPoint || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const norm = svgToNorm(mouseX, mouseY);

    if (activeDragPoint === "p1") {
      setHandle([norm.x, norm.y, handle[2], handle[3]]);
    } else {
      setHandle([handle[0], handle[1], norm.x, norm.y]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDragPoint) {
      setActiveDragPoint(null);
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setPreviewKey((k) => k + 1);
    }
  };

  const triggerPreview = () => {
    setPreviewKey((k) => k + 1);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 380,
          backgroundColor: "var(--surface-panel-solid)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--surface-1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={13} style={{ color: "var(--accent-primary)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              Cubic-Bezier Motion Curve
            </span>
          </div>
          <button
            type="button"
            className="panel-icon-btn"
            onClick={onClose}
            style={{ width: 22, height: 22 }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Presets Row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {Object.entries(PRESETS).map(([name, curve]) => {
              const isMatch =
                handle[0] === curve[0] &&
                handle[1] === curve[1] &&
                handle[2] === curve[2] &&
                handle[3] === curve[3];
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setHandle(curve);
                    setPreviewKey((k) => k + 1);
                  }}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: isMatch ? "var(--accent-primary)" : "var(--surface-2)",
                    color: isMatch ? "#ffffff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Interactive SVG Canvas */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              backgroundColor: "var(--surface-2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              padding: 8,
            }}
          >
            <svg
              ref={svgRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{ touchAction: "none", cursor: activeDragPoint ? "grabbing" : "default" }}
            >
              {/* Grid Box */}
              <rect
                x={PADDING}
                y={PADDING}
                width={PLOT_SIZE}
                height={PLOT_SIZE}
                fill="rgba(0, 0, 0, 0.2)"
                stroke="var(--border-subtle)"
                strokeDasharray="2 2"
              />
              {/* Diagonal Reference */}
              <line
                x1={p0.x}
                y1={p0.y}
                x2={p3.x}
                y2={p3.y}
                stroke="var(--border-default)"
                strokeDasharray="3 3"
              />

              {/* Control Rod P0 -> P1 */}
              <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#38bdf8" strokeWidth="1.5" />
              {/* Control Rod P3 -> P2 */}
              <line x1={p3.x} y1={p3.y} x2={p2.x} y2={p2.y} stroke="#c084fc" strokeWidth="1.5" />

              {/* The Bezier Curve */}
              <path d={bezierPath} fill="none" stroke="var(--accent-primary)" strokeWidth="3" />

              {/* Control Handle P1 */}
              <circle
                cx={p1.x}
                cy={p1.y}
                r="7"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="2"
                style={{ cursor: "grab" }}
                onPointerDown={handlePointerDown("p1")}
              />

              {/* Control Handle P2 */}
              <circle
                cx={p2.x}
                cy={p2.y}
                r="7"
                fill="#c084fc"
                stroke="#ffffff"
                strokeWidth="2"
                style={{ cursor: "grab" }}
                onPointerDown={handlePointerDown("p2")}
              />
            </svg>
          </div>

          {/* CSS Definition Text Box */}
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "var(--surface-1)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--accent-primary)",
              textAlign: "center",
            }}
          >
            {cssBezierStr}
          </div>

          {/* Real-time Visual Motion Preview Track */}
          <div
            style={{
              padding: "8px 10px",
              backgroundColor: "var(--surface-1)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              type="button"
              className="panel-icon-btn"
              onClick={triggerPreview}
              title="Test Animation"
              style={{ width: 22, height: 22 }}
            >
              <Play size={11} />
            </button>

            <div
              style={{
                flex: 1,
                height: 18,
                backgroundColor: "var(--surface-2)",
                borderRadius: 9,
                position: "relative",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                key={previewKey}
                style={{
                  position: "absolute",
                  left: 2,
                  top: 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-primary)",
                  boxShadow: "0 0 6px var(--accent-primary)",
                  transform: "translateX(0)",
                  animation: `previewSlide 1.2s ${cssBezierStr} infinite alternate`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            backgroundColor: "var(--surface-1)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="details-add-button"
            onClick={() => {
              onApply(handle);
              onClose();
            }}
            style={{ height: 26, padding: "0 12px" }}
          >
            <Check size={12} strokeWidth={2.5} className="details-add-button__icon" />
            <span>Apply Curve</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes previewSlide {
          from { transform: translateX(0); }
          to { transform: translateX(270px); }
        }
      `}</style>
    </div>
  );
};
