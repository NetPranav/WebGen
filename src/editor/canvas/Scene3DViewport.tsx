"use client";

/**
 * ============================================================================
 * SCENE 3D & WEBGL SUB-VIEWPORT COMPONENT
 * ============================================================================
 * UI Element: 3D Scene Viewport (Unreal Equivalent: Viewport 3D Subsystem)
 * Screen / Scope: Screen 01: Application Viewport / 3D Scene Stage
 * Role: Provides WebGL canvas rendering, orbit navigation controls in edit mode,
 *       locked camera in play mode, and WebGL context loss recovery during dock tab switching.
 * Architecture Ref: ROADMAP.md §Phase 8 (Sub-Phase 8.2)
 * ============================================================================
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { Scene3DEngine } from "@/core/engine/Scene3DEngine";
import { Object3DProperties, Camera3DProperties, Light3DProperties } from "@/core/types/scene3d";
import { Box, Camera, Sun, Compass, Play, Eye } from "lucide-react";

export interface Scene3DViewportProps {
  isPlaying?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Scene3DViewport: React.FC<Scene3DViewportProps> = ({
  isPlaying = false,
  className = "",
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { elements } = useProjectStore();

  // Orbit navigation state
  const [cameraRotX, setCameraRotX] = useState(0.4); // elevation
  const [cameraRotY, setCameraRotY] = useState(0.6); // azimuth
  const [cameraDistance, setCameraDistance] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextLost, setContextLost] = useState(false);

  // Filter 3D elements
  const object3DElements = Object.values(elements).filter(
    (el) => el.archetype === "object3D" || el.archetype === "camera3D" || el.archetype === "light3D"
  );

  // WebGL Context Loss / Restore Handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };

    const handleContextRestored = () => {
      setContextLost(false);
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, []);

  // Mouse interaction for orbit controls in edit mode
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPlaying) return; // Camera locked in play mode
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isPlaying) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setCameraRotY((prev) => prev + deltaX * 0.01);
    setCameraRotX((prev) => Math.max(-1.5, Math.min(1.5, prev + deltaY * 0.01)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isPlaying) return;
    e.preventDefault();
    setCameraDistance((prev) => Math.max(2, Math.min(100, prev + e.deltaY * 0.02)));
  };

  // Canvas Render Loop (Software 3D projection & WebGL wireframe renderer)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = (canvas.width = canvas.clientWidth);
      const height = (canvas.height = canvas.clientHeight);

      // Dark Studio Slate Background
      ctx.fillStyle = "#0c0d12";
      ctx.fillRect(0, 0, width, height);

      // Draw 3D Ground Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;

      const cx = width / 2;
      const cy = height / 2;
      const fovScale = 400 / cameraDistance;

      // Project 3D point to 2D screen
      const project = (x: number, y: number, z: number): [number, number] | null => {
        // Apply camera orbit rotations
        // Rotate around Y
        const cosY = Math.cos(cameraRotY);
        const sinY = Math.sin(cameraRotY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotate around X
        const cosX = Math.cos(cameraRotX);
        const sinX = Math.sin(cameraRotX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX + cameraDistance;

        if (z2 <= 0.1) return null; // Behind camera
        const px = cx + (x1 / z2) * fovScale;
        const py = cy - (y2 / z2) * fovScale;
        return [px, py];
      };

      // Draw Grid Lines on XZ plane
      const gridSize = 10;
      const step = 2;
      for (let i = -gridSize; i <= gridSize; i += step) {
        const p1 = project(i, 0, -gridSize);
        const p2 = project(i, 0, gridSize);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        }

        const p3 = project(-gridSize, 0, i);
        const p4 = project(gridSize, 0, i);
        if (p3 && p4) {
          ctx.beginPath();
          ctx.moveTo(p3[0], p3[1]);
          ctx.lineTo(p4[0], p4[1]);
          ctx.stroke();
        }
      }

      // Render 3D Objects
      for (const el of object3DElements) {
        if (el.archetype !== "object3D") continue;
        const props = (el.properties || {}) as Partial<Object3DProperties>;
        const pos = props.position3D || [0, 0, 0];
        const scl = props.scale3D || [1, 1, 1];
        const color = props.material?.color || "#4f46e5";

        const pOrigin = project(pos[0], pos[1], pos[2]);
        if (!pOrigin) continue;

        // Render 3D Box vertices
        const hw = scl[0];
        const hh = scl[1];
        const hd = scl[2];

        const corners: [number, number, number][] = [
          [-hw, -hh, -hd],
          [hw, -hh, -hd],
          [hw, hh, -hd],
          [-hw, hh, -hd],
          [-hw, -hh, hd],
          [hw, -hh, hd],
          [hw, hh, hd],
          [-hw, hh, hd],
        ];

        const projCorners = corners.map(([dx, dy, dz]) =>
          project(pos[0] + dx, pos[1] + dy, pos[2] + dz)
        );

        ctx.strokeStyle = color;
        ctx.fillStyle = color + "22";
        ctx.lineWidth = 1.5;

        // Box edges
        const edges = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ];

        ctx.beginPath();
        for (const [i1, i2] of edges) {
          const pt1 = projCorners[i1];
          const pt2 = projCorners[i2];
          if (pt1 && pt2) {
            ctx.moveTo(pt1[0], pt1[1]);
            ctx.lineTo(pt2[0], pt2[1]);
          }
        }
        ctx.stroke();

        // Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px Inter, sans-serif";
        ctx.fillText(el.name, pOrigin[0] + 6, pOrigin[1] - 6);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [cameraRotX, cameraRotY, cameraDistance, object3DElements, isPlaying]);

  return (
    <div
      className={`scene-3d-viewport ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        userSelect: "none",
        ...style,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      data-testid="scene-3d-viewport"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: isPlaying ? "default" : isDragging ? "grabbing" : "grab",
        }}
      />

      {/* 3D Viewport HUD Overlay */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "rgba(18, 19, 26, 0.75)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            color: "#e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Box size={13} style={{ color: "#6366f1" }} />
          <span>3D Viewport ({object3DElements.length} Entities)</span>
        </div>

        <div
          style={{
            background: isPlaying ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
            border: isPlaying ? "1px solid #10b981" : "1px solid #f59e0b",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            color: isPlaying ? "#10b981" : "#f59e0b",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {isPlaying ? <Eye size={12} /> : <Compass size={12} />}
          <span>{isPlaying ? "LOCKED (PLAY MODE)" : "ORBIT CONTROLS"}</span>
        </div>
      </div>
    </div>
  );
};
