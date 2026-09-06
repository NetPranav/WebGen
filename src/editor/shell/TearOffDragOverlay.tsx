"use client";

/**
 * ============================================================================
 * TEAR-OFF DRAG OVERLAY (FLOATING PREVIEW)  — v2
 * ============================================================================
 * UI Element: Floating Glassmorphic Preview Rectangle During Tear-Off Drag
 * Screen / Scope: Entire IDE Studio Shell (`/editor`)
 * Role: Renders a portal at document.body showing a floating preview rectangle
 *       that follows the cursor during tear-off drag. Provides visual feedback
 *       for which drop zone (header = full-page, body = new tab, snap-back)
 *       is active.
 * Styling Source: `@/editor/styles/dock.css` (`.tearoff-*`)
 * ============================================================================
 */

import React from "react";
import ReactDOM from "react-dom";
import { Maximize2, ExternalLink, GripVertical, Undo2, PanelBottomOpen, ArrowDown } from "lucide-react";
import type { TearOffState } from "@/core/events/useTearOff";

interface TearOffDragOverlayProps {
  state: TearOffState;
}

export const TearOffDragOverlay: React.FC<TearOffDragOverlayProps> = ({ state }) => {
  if (!state.isDragging || typeof document === "undefined") return null;

  const getZoneClass = () => {
    if (state.isInSnapBackZone) return "tearoff-preview--snapback";
    if (state.isOverHeaderZone) return "tearoff-preview--header-zone";
    if (state.isOverBottomDrawerZone) return "tearoff-preview--bottom-drawer";
    if (state.isOverBottomBarZone) return "tearoff-preview--bottom-bar";
    return "";
  };

  const overlay = (
    <div className="tearoff-overlay" aria-hidden="true">
      {/* Header drop zone indicator — glowing bar across top */}
      <div
        className={`tearoff-header-dropzone ${
          state.isOverHeaderZone ? "tearoff-header-dropzone--active" : ""
        }`}
      />

      {/* Bottom Drawer drop zone — 50% opacity translucent connection preview */}
      {state.isOverBottomDrawerZone && (
        <div className="tearoff-bottom-drawer-dropzone">
          <div className="tearoff-bottom-drawer-dropzone__inner">
            <div className="tearoff-bottom-drawer-dropzone__icon">
              <PanelBottomOpen size={24} />
            </div>
            <div className="tearoff-bottom-drawer-dropzone__label">
              Attach &amp; Open Bottom Drawer
            </div>
            <div className="tearoff-bottom-drawer-dropzone__sub">
              Release to dock and expand the bottom drawer
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar drop zone — status bar highlight */}
      {state.isOverBottomBarZone && (
        <div className="tearoff-bottom-bar-dropzone">
          <span className="tearoff-bottom-bar-dropzone__label">
            Attach to Bottom Bar (Keep Closed)
          </span>
        </div>
      )}

      {/* Floating preview rectangle following cursor */}
      <div
        className={`tearoff-preview ${getZoneClass()}`}
        style={{
          transform: `translate3d(${state.pointerX - 140}px, ${state.pointerY - 30}px, 0)`,
        }}
      >
        <div className="tearoff-preview__grip">
          <GripVertical size={14} />
        </div>
        <div className="tearoff-preview__body">
          <span className="tearoff-preview__title">{state.panelTitle || "Panel"}</span>
          <div className="tearoff-preview__hint">
            {state.isInSnapBackZone ? (
              <>
                <Undo2 size={11} />
                <span>Release to Cancel</span>
              </>
            ) : state.isOverHeaderZone ? (
              <>
                <Maximize2 size={11} />
                <span>Dock Full Page</span>
              </>
            ) : state.isOverBottomDrawerZone ? (
              <>
                <PanelBottomOpen size={11} />
                <span>Attach &amp; Open Drawer</span>
              </>
            ) : state.isOverBottomBarZone ? (
              <>
                <ArrowDown size={11} />
                <span>Attach to Bottom Bar</span>
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
