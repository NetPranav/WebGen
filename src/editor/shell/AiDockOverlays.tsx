"use client";

/**
 * The drop targets and drag preview shown while the LazyLayout AI panel is
 * being dragged to a dock side (moved out of `EditorShell.tsx`, Phase 14).
 */
import React from "react";
import { Sparkles } from "lucide-react";
import type { AiDock } from "./hooks/useAiDock";

export const AiDockOverlays: React.FC<{ ai: AiDock }> = ({ ai }) => (
  <>
      {/* LayoutAI Left Drop Slot Highlight (beside Outliner) — proximity-based */}
      {ai.isDraggingAi && ai.activeHoverDropSide === "left" && (
        <div
          className="layoutai-drop-slot-highlight"
          style={{
            top: ai.dropSlotBounds.top,
            height: ai.dropSlotBounds.bottom - ai.dropSlotBounds.top,
            left: ai.dropSlotBounds.left,
            width: ai.aiPanelWidth,
          }}
          onClick={() => ai.dockAiOn("left")}
        >
          <div className="layoutai-drop-slot-card">
            <div className="layoutai-drop-slot-badge">
              <Sparkles size={14} />
              <span>Release to Dock LazyLayout AI</span>
            </div>
            <span className="layoutai-drop-slot-target-tag">Dock on Left</span>
            <span className="layoutai-drop-slot-subtext">
              Release here to anchor panel on the left
            </span>
          </div>
        </div>
      )}

      {/* LayoutAI Right Drop Slot Highlight (beside Details) — proximity-based */}
      {ai.isDraggingAi && ai.activeHoverDropSide === "right" && (
        <div
          className="layoutai-drop-slot-highlight"
          style={{
            top: ai.dropSlotBounds.top,
            height: ai.dropSlotBounds.bottom - ai.dropSlotBounds.top,
            left: ai.dropSlotBounds.right - ai.aiPanelWidth,
            width: ai.aiPanelWidth,
          }}
          onClick={() => ai.dockAiOn("right")}
        >
          <div className="layoutai-drop-slot-card">
            <div className="layoutai-drop-slot-badge">
              <Sparkles size={14} />
              <span>Release to Dock LazyLayout AI</span>
            </div>
            <span className="layoutai-drop-slot-target-tag">Dock Beside Details</span>
            <span className="layoutai-drop-slot-subtext">
              Release here to anchor panel beside Details
            </span>
          </div>
        </div>
      )}

      {/* Floating Drag Preview Thumbnail following the mouse cursor */}
      {ai.isDraggingAi && (
        <div
          className="layoutai-drag-preview"
          style={{
            left: ai.dragCursorPos.x,
            top: ai.dragCursorPos.y,
          }}
        >
          <div className="layoutai-drag-preview__logo">
            <Sparkles size={14} color="#FFFFFF" />
          </div>
          <div className="layoutai-drag-preview__body">
            <span className="layoutai-drag-preview__title">LazyLayout AI</span>
            <span className="layoutai-drag-preview__hint">
              {ai.activeHoverDropSide === "left"
                ? "Release to dock on the left"
                : ai.activeHoverDropSide === "right"
                ? "Release to dock beside Details"
                : "Move left or right to choose dock location"}
            </span>
          </div>
        </div>
      )}
  </>
);
