"use client";

/**
 * ============================================================================
 * 120 FPS WEBASSEMBLY CABLE & WIRE CANVAS RENDERER
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 4.4 & Detailed Roadmap.md §Sub-Phase 4.4
 *
 * High-performance Canvas2D hardware-accelerated wire renderer:
 *   1. Hardware-accelerated Canvas2D overlay calling WasmBridge / SplineSolver
 *   2. Strict wire color taxonomy per UI.md §2.2
 *   3. Interactive wire hover highlight & selection glow
 *   4. Telemetry execution pulse streams with arc-length synchronized particle flow
 *   5. Real-time frame delta performance monitor capable of sustaining 120 FPS with 100+ wires
 * ============================================================================
 */

import React, { useRef, useEffect, useCallback, useMemo } from "react";
import { WasmBridge } from "@/core/wasm/WasmBridge";
import { Point2D, SplineResult, SplineSolver } from "@/core/wasm/SplineSolver";
import { WasmWorkerPool } from "@/core/wasm/WasmWorkerPool";
import { PinDataType, getPinColor } from "@/core/types/node-registry";

export interface CanvasWire {
  id: string;
  sourceNodeId: string;
  sourcePinId: string;
  targetNodeId: string;
  targetPinId: string;
  pinType: PinDataType | string;
  start: Point2D;
  end: Point2D;
  isActive?: boolean;
  isHovered?: boolean;
  isSelected?: boolean;
  hasPulse?: boolean;
  pulseSpeed?: number;
}

export interface DraggingWire {
  start: Point2D;
  current: Point2D;
  pinType: PinDataType | string;
}

export interface WasmCableCanvasProps {
  wires: CanvasWire[];
  draggingWire?: DraggingWire | null;
  pan?: { x: number; y: number };
  zoom?: number;
  width?: number;
  height?: number;
  className?: string;
  onWireHover?: (wireId: string | null) => void;
  onWireClick?: (wireId: string) => void;
  onWireContextMenu?: (wireId: string) => void;
  theme?: "light" | "dark";
  logFps?: boolean;
  onFpsUpdate?: (fps: number, frameDeltaMs: number) => void;
  useWorkerPool?: boolean;
}

/**
 * Color taxonomy mapping per UI.md §2.2 & node-registry.ts
 */
export const WIRE_COLOR_PALETTE: Record<string, string> = {
  exec: "#FFFFFF",
  string: "#EC4899",
  number: "#06B6D4",
  boolean: "#EA580C",
  object: "#F59E0B",
  array: "#EAB308",
  database: "#10B981",
  motion: "#8B5CF6",
  event: "#3B82F6",
  any: "#A855F7",
  default: "#94A3B8",
};

export function getWireColor(pinType: string): string {
  if (WIRE_COLOR_PALETTE[pinType]) {
    return WIRE_COLOR_PALETTE[pinType];
  }
  return getPinColor(pinType as PinDataType) || WIRE_COLOR_PALETTE.default;
}

function splineMatchesWire(spline: SplineResult, wire: { start: { x: number; y: number }; end: { x: number; y: number } }) {
  const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
  return near(spline.p0, wire.start) && near(spline.p3, wire.end);
}

export const WasmCableCanvas: React.FC<WasmCableCanvasProps> = ({
  wires,
  draggingWire = null,
  pan = { x: 0, y: 0 },
  zoom = 1,
  width,
  height,
  className = "",
  onWireHover,
  onWireClick,
  onWireContextMenu,
  theme = "light",
  logFps = false,
  onFpsUpdate,
  useWorkerPool = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const hoveredWireIdRef = useRef<string | null>(null);

  // Performance telemetry
  const lastFrameTimeRef = useRef<number>(0); // seeded when the render loop starts
  const frameDeltasRef = useRef<number[]>([]);
  const fpsReportTimeRef = useRef<number>(0);

  // Cached spline results to avoid per-frame allocations for stationary wires
  const splineCacheRef = useRef<Map<string, { spline: SplineResult; startKey: string; endKey: string }>>(
    new Map()
  );

  // Get active solver from WasmBridge
  const bridge = useMemo(() => WasmBridge.getInstance(), []);
  const solver = useMemo(() => bridge.getSplineSolver(), [bridge]);
  const workerPool = useMemo(
    () => (useWorkerPool ? WasmWorkerPool.getInstance() : null),
    [useWorkerPool]
  );

  // Asynchronously compute splines across worker pool for batch updates
  useEffect(() => {
    if (!useWorkerPool || !workerPool || wires.length === 0) return;

    const dirtyWires = wires
      .filter((w) => {
        const cached = splineCacheRef.current.get(w.id);
        const startKey = `${w.start.x},${w.start.y}`;
        const endKey = `${w.end.x},${w.end.y}`;
        return !cached || cached.startKey !== startKey || cached.endKey !== endKey;
      })
      .map((w) => ({ id: w.id, start: w.start, end: w.end }));

    if (dirtyWires.length > 0) {
      workerPool.requestFrame(dirtyWires, 8.33).then((results) => {
        results.forEach((spline, id) => {
          const wire = wires.find((w) => w.id === id);
          // On a missed frame budget the pool answers from its own cache, which can hold a spline
          // for older endpoints. Only cache a result that was solved for this wire's endpoints.
          if (wire && splineMatchesWire(spline, wire)) {
            splineCacheRef.current.set(id, {
              spline,
              startKey: `${wire.start.x},${wire.start.y}`,
              endKey: `${wire.end.x},${wire.end.y}`,
            });
          }
        });
      });
    }
  }, [wires, useWorkerPool, workerPool]);

  // Handle high-precision hit testing along cubic Bezier curves
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !onWireHover) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      let foundWireId: string | null = null;
      const hitRadius = 8 / zoom;

      for (const wire of wires) {
        const cached = splineCacheRef.current.get(wire.id);
        if (!cached) continue;

        const { p0, p1, p2, p3 } = cached.spline;

        // Quick AABB bounds check with padding
        const minX = Math.min(p0.x, p1.x, p2.x, p3.x) - hitRadius;
        const maxX = Math.max(p0.x, p1.x, p2.x, p3.x) + hitRadius;
        const minY = Math.min(p0.y, p1.y, p2.y, p3.y) - hitRadius;
        const maxY = Math.max(p0.y, p1.y, p2.y, p3.y) + hitRadius;

        if (mouseX < minX || mouseX > maxX || mouseY < minY || mouseY > maxY) {
          continue;
        }

        // Sample 16 test points along the curve for precise proximity check
        for (let i = 0; i <= 16; i++) {
          const t = i / 16;
          const pt = SplineSolver.evaluateBezier(p0, p1, p2, p3, t);
          const dx = pt.x - mouseX;
          const dy = pt.y - mouseY;
          if (dx * dx + dy * dy <= hitRadius * hitRadius) {
            foundWireId = wire.id;
            break;
          }
        }
        if (foundWireId) break;
      }

      if (hoveredWireIdRef.current !== foundWireId) {
        hoveredWireIdRef.current = foundWireId;
        onWireHover(foundWireId);
      }
    },
    [wires, pan, zoom, onWireHover]
  );

  const handleClick = useCallback(() => {
    if (hoveredWireIdRef.current && onWireClick) {
      onWireClick(hoveredWireIdRef.current);
    }
  }, [onWireClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredWireIdRef.current && onWireContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onWireContextMenu(hoveredWireIdRef.current);
    }
  }, [onWireContextMenu]);

  // Main 120 FPS Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let isRunning = true;
    const loopStart = performance.now();
    lastFrameTimeRef.current = loopStart;
    fpsReportTimeRef.current = loopStart;

    const render = (currentTime: number) => {
      if (!isRunning) return;

      // 1. Calculate FPS & Frame Deltas (Target: 120 FPS / ~8.33ms budget)
      const deltaMs = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      frameDeltasRef.current.push(deltaMs);
      if (frameDeltasRef.current.length > 60) {
        frameDeltasRef.current.shift();
      }

      if (currentTime - fpsReportTimeRef.current >= 1000) {
        const avgDelta =
          frameDeltasRef.current.reduce((a, b) => a + b, 0) /
          (frameDeltasRef.current.length || 1);
        const currentFps = Math.round(1000 / (avgDelta || 8.33));

        if (logFps) {
          console.debug(
            `[WasmCableCanvas] FPS: ${currentFps} | Avg Frame Delta: ${avgDelta.toFixed(2)}ms | Wires: ${wires.length}`
          );
        }
        if (onFpsUpdate) {
          onFpsUpdate(currentFps, avgDelta);
        }
        fpsReportTimeRef.current = currentTime;
      }

      // 2. Clear canvas viewport
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Handle High-DPI Scaling & Transform
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      ctx.scale(dpr, dpr);
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 3. Render all existing wires
      const activeWireIds = new Set<string>();

      for (const wire of wires) {
        // Skip uninitialized or zero-length wires
        if (
          (wire.start.x === 0 && wire.start.y === 0 && wire.end.x === 0 && wire.end.y === 0) ||
          Math.hypot(wire.end.x - wire.start.x, wire.end.y - wire.start.y) < 2
        ) {
          continue;
        }

        activeWireIds.add(wire.id);
        const startKey = `${wire.start.x},${wire.start.y}`;
        const endKey = `${wire.end.x},${wire.end.y}`;

        let splineResult: SplineResult;
        const cached = splineCacheRef.current.get(wire.id);

        if (cached && cached.startKey === startKey && cached.endKey === endKey) {
          splineResult = cached.spline;
        } else {
          splineResult = solver.calculateWireSpline(wire.start, wire.end);
          splineCacheRef.current.set(wire.id, { spline: splineResult, startKey, endKey });
        }

        const isHovered = wire.isHovered || hoveredWireIdRef.current === wire.id;
        const isSelected = wire.isSelected;
        const isExec = wire.pinType === "exec";
        // On light theme canvas (#F8FAFC), exec wire is Deep Slate Navy (#0F172A)
        const color = isExec
          ? theme === "dark"
            ? "#FFFFFF"
            : "#0F172A"
          : getWireColor(wire.pinType);

        const { p0, p1, p2, p3 } = splineResult;

        // A. Hover & Selection Glow Halo
        if (isHovered || isSelected) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
          ctx.strokeStyle = isSelected ? "rgba(32, 104, 89, 0.45)" : "rgba(148, 163, 184, 0.4)";
          ctx.lineWidth = isExec ? 10 : 8;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        // B. Main Cable Subtle Shadow
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y + 1.5);
        ctx.bezierCurveTo(p1.x, p1.y + 1.5, p2.x, p2.y + 1.5, p3.x, p3.y + 1.5);
        ctx.strokeStyle = "rgba(15, 23, 42, 0.12)";
        ctx.lineWidth = isExec ? 3.5 : 2.5;
        ctx.lineCap = "round";
        ctx.stroke();

        // C. Core Wire
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = isExec ? 3.2 : 2.2;
        ctx.lineCap = "round";
        ctx.setLineDash([]);
        ctx.stroke();

        // D. Execution Flow Pulse Streams (Telemetry Visual Hook)
        if (wire.hasPulse || wire.isActive) {
          const speed = wire.pulseSpeed || 0.0012;
          const pulseOffset = (currentTime * speed) % 1.0;
          const pulseCount = isExec ? 3 : 2;

          for (let p = 0; p < pulseCount; p++) {
            const normalizedT = (pulseOffset + p / pulseCount) % 1.0;
            const pt = SplineSolver.evaluateBezier(p0, p1, p2, p3, normalizedT);

            // Outer photon glow
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isExec ? 5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = isExec ? "rgba(59, 130, 246, 0.55)" : `${color}66`;
            ctx.fill();

            // Inner intense photon core
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isExec ? 2.5 : 2, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();
          }
        }
      }

      // Evict disconnected wires from spline cache
      for (const cachedId of splineCacheRef.current.keys()) {
        if (!activeWireIds.has(cachedId)) {
          splineCacheRef.current.delete(cachedId);
        }
      }

      // 4. Render Active Dragging Wire with Real-Time Tension
      if (draggingWire) {
        const dragSpline = solver.calculateWireSpline(
          draggingWire.start,
          draggingWire.current
        );
        const { p0, p1, p2, p3 } = dragSpline;
        const dragColor = getWireColor(draggingWire.pinType);

        // Drag wire glow
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.strokeStyle = `${dragColor}44`;
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.stroke();

        // Drag wire core
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.strokeStyle = dragColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
        ctx.lineDashOffset = -(currentTime * 0.02) % 9;
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated target search ring at drag tip
        ctx.beginPath();
        ctx.arc(draggingWire.current.x, draggingWire.current.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = dragColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [wires, draggingWire, pan, zoom, solver, logFps, onFpsUpdate, theme]);

  // Canvas size synchronization with high DPI and ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const cw = width ?? container.clientWidth;
      const ch = height ?? container.clientHeight;
      if (cw > 0 && ch > 0) {
        canvas.width = Math.max(Math.round(cw * dpr), 1);
        canvas.height = Math.max(Math.round(ch * dpr), 1);
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;
      }
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateSize());
      ro.observe(container);
    }

    return () => {
      if (ro) ro.disconnect();
    };
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "auto",
          touchAction: "none",
        }}
      />
    </div>
  );
};
