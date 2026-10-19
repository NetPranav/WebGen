"use client";

/**
 * The LazyLayout AI dock column (moved out of `EditorShell.tsx`, Phase 14): the
 * panel plus its splitter, docked on the left or right of the stage. The
 * splitter sits on the edge facing the canvas: after the panel when docked
 * left (drag right = wider), before it when docked right (inverted). The AI
 * panel's code is fetched the first time the dock opens.
 */
import React, { Suspense, lazy, type RefObject } from "react";
import { DockSplitter } from "./DockSplitter";
import { ZONE_LIMITS } from "@/core/workspace/layout";
import type { AiDock } from "./hooks/useAiDock";
import type { useDockLayers } from "./hooks/useDockLayers";

const AiPromptBar = lazy(async () => ({ default: (await import("@/editor/panels/copilot/AiPromptBar")).AiPromptBar }));

interface AiDockColumnProps {
  side: "left" | "right";
  ai: AiDock;
  layers: ReturnType<typeof useDockLayers>;
  zoneRef: RefObject<HTMLDivElement | null>;
}

export const AiDockColumn: React.FC<AiDockColumnProps> = ({ side, ai, layers, zoneRef }) => {
  const { activeLayer, handleZoneMouseEnter, handleZoneMouseLeave, handleZoneClick } = layers;
  if (!ai.isAiCoPilotOpen || ai.aiDockSide !== side) return null;

  const splitter = (
    <DockSplitter
      orientation="vertical"
      targetRef={zoneRef}
      value={ai.aiPanelWidth}
      min={ZONE_LIMITS.ai.min}
      max={ZONE_LIMITS.ai.max}
      invert={side === "right"}
      onCommit={ai.setAiPanelWidth}
      style={{ zIndex: activeLayer === "ai" ? 36 : 28 }}
    />
  );
  return (
    <React.Fragment key={`ai-dock-${side}`}>
      {side === "right" && splitter}
      <div
        ref={zoneRef}
        className={`dock-zone ai-copilot-dock-col ai-copilot-dock-col--${side} ${side === "right" ? "anim-slide-right" : "anim-slide-left"} ${activeLayer === "ai" ? "dock-zone--elevated" : ""}`}
        onMouseEnter={() => handleZoneMouseEnter("ai")}
        onMouseLeave={() => handleZoneMouseLeave("ai")}
        onMouseDown={() => handleZoneClick("ai")}
        style={{
          width: ai.aiPanelWidth,
          minWidth: ai.aiPanelWidth,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          backgroundColor: "var(--surface-panel-solid)",
          [side === "right" ? "borderLeft" : "borderRight"]: "1px solid var(--border-default)",
          position: "relative",
          // Same layering contract as the Details dock: under the bottom drawer until
          // focused (click, or 2s hover dwell), then full-height on top of it.
          zIndex: activeLayer === "ai" ? 35 : 20,
        }}
      >
        <Suspense fallback={null}>
          <AiPromptBar
            dockMode="split-left"
            onToggleDockMode={ai.setAiDockMode}
            onClose={() => ai.setIsAiCoPilotOpen(false)}
            onStartDrag={ai.handleStartRedockAI}
          />
        </Suspense>
      </div>
      {side === "left" && splitter}
    </React.Fragment>
  );
};
