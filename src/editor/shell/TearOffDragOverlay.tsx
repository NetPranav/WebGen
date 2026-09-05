"use client";

/**
 * ============================================================================
 * TEAR-OFF DRAG OVERLAY (FLOATING PREVIEW)
 * ============================================================================
 * UI Element: Floating Glassmorphic Preview Rectangle During Tear-Off Drag
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Renders a portal at document.body showing a floating preview rectangle
 *       that follows the cursor during tear-off drag. Provides visual feedback
 *       for which drop zone (header = full-page, body = new tab) is active.
 * Styling Source: `@/editor/styles/dock.css` (`.tearoff-*`)
 * ============================================================================
 */

import React from "react";
import ReactDOM from "react-dom";
import { Maximize2, ExternalLink, GripVertical } from "lucide-react";
import type { TearOffState } from "@/core/events/useTearOff";

interface TearOffDragOverlayProps {
  state: TearOffState;
}

export const TearOffDragOverlay: React.FC<TearOffDragOverlayProps> = ({ state }) => {
  if (!state.isDragging || typeof document === "undefined") return null;

  const overlay = (
    <div className="tearoff-overlay" aria-hidden="true">
      {/* Header drop zone indicator — glowing bar across top */}
      <div
        className={`tearoff-header-dropzone ${
          state.isOverHeaderZone ? "tearoff-header-dropzone--active" : ""
        }`}
      />

      {/* Floating preview rectangle following cursor */}
      <div
        className={`tearoff-preview ${
          state.isOverHeaderZone ? "tearoff-preview--header-zone" : ""
        }`}
        style={{
          transform: `translate(${state.pointerX - 140}px, ${state.pointerY - 30}px)`,
        }}
      >
        <div className="tearoff-preview__grip">
          <GripVertical size={14} />
        </div>
        <div className="tearoff-preview__body">
          <span className="tearoff-preview__title">{state.panelTitle || "Panel"}</span>
          <div className="tearoff-preview__hint">
            {state.isOverHeaderZone ? (
              <>
                <Maximize2 size={11} />
                <span>Dock Full Page</span>
              </>
            ) : (
              <>
                <ExternalLink size={11} />
                <span>Open in New Tab</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
};
