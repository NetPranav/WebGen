"use client";

/**
 * 3D scene viewport placeholder.
 *
 * ROADMAP Phase 5.2 (AUD-11): this used to draw a hand-rolled software
 * wireframe projector on a plain 2D canvas (`getContext("2d")`) labelled as
 * "WebGL canvas rendering", with `webglcontextlost`/`webglcontextrestored`
 * listeners that can never fire on a 2D context. No real WebGL/GPU rendering
 * ever ran. That code is deleted, not relabelled.
 *
 * The `object3D`/`camera3D`/`light3D` archetypes it read have no creation
 * path anywhere in the editor today (`INITIAL_ARCHETYPE_IDS` and
 * `archetypeData.ts` never include them, and `addLayer` has zero call sites
 * outside tests), so there is nothing to gate behind a feature flag — the
 * 3D layer kind is already unreachable. This component itself is also
 * unmounted anywhere in the app.
 *
 * Real WebGL rendering is Phase 18 (Three.js / React-Three-Fiber Engine),
 * built on the `@react-three/fiber` + `three` dependencies Phase 5.1 added.
 */

import React from "react";
import { Box } from "lucide-react";

export interface Scene3DViewportProps {
  isPlaying?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Scene3DViewport: React.FC<Scene3DViewportProps> = ({ className = "", style }) => {
  return (
    <div
      className={`scene-3d-viewport ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 8,
        background: "#0c0d12",
        color: "#8b8f9c",
        ...style,
      }}
      data-testid="scene-3d-viewport"
    >
      <Box size={20} style={{ color: "#4f46e5" }} />
      <span style={{ fontSize: 12 }}>3D viewport — Phase 18 (React Three Fiber)</span>
    </div>
  );
};
