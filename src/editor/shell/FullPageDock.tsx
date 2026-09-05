"use client";

/**
 * ============================================================================
 * FULL-PAGE DOCK COMPONENT
 * ============================================================================
 * UI Element: Unreal Engine-Style Full-Page Panel Dock
 * Screen / Scope: Center Stage Area (`/editor`)
 * Role: When a panel is docked full-page (dragged to header zone), this component
 *       replaces the normal viewport with a full-height panel view and a UE-style
 *       file tab bar containing Save, Undo, Redo, panel name, and Close controls.
 * Styling Source: `@/editor/styles/fullpage-dock.css`
 *
 * ARCHITECTURE NOTE:
 * This component receives the panel component as `children` and renders it below
 * the file tab bar. The file tab bar sits directly below the two top navigation bars.
 * ============================================================================
 */

import React from "react";
import { Save, Undo2, Redo2, X } from "lucide-react";
import "@/editor/styles/fullpage-dock.css";

interface FullPageDockProps {
  panelId: string;
  panelTitle: string;
  isDirty?: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const FullPageDock: React.FC<FullPageDockProps> = ({
  panelId,
  panelTitle,
  isDirty = false,
  onSave,
  onUndo,
  onRedo,
  onClose,
  children,
}) => {
  return (
    <div className="fullpage-dock" role="region" aria-label={`Full Page: ${panelTitle}`}>
      {/* UE-Style File Tab Bar */}
      <div className="fullpage-dock__filebar">
        <div className="fullpage-dock__filebar-left">
          {/* Save Button */}
          <button
            type="button"
            className="fullpage-dock__filebar-btn"
            onClick={onSave}
            title="Save (Ctrl+S)"
          >
            <Save size={14} style={{ color: isDirty ? "var(--accent-warning)" : undefined }} />
            {isDirty && <span className="fullpage-dock__dirty-dot" />}
          </button>

          {/* Undo Button */}
          <button
            type="button"
            className="fullpage-dock__filebar-btn"
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>

          {/* Redo Button */}
          <button
            type="button"
            className="fullpage-dock__filebar-btn"
            onClick={onRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </button>

          {/* Divider */}
          <div className="fullpage-dock__filebar-divider" />

          {/* Panel/File Name */}
          <span className="fullpage-dock__filebar-name">{panelTitle}</span>
        </div>

        <div className="fullpage-dock__filebar-right">
          {/* Close Button */}
          <button
            type="button"
            className="fullpage-dock__filebar-close"
            onClick={onClose}
            title="Close and return to viewport"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Full-Page Panel Content */}
      <div className="fullpage-dock__content">
        {children}
      </div>
    </div>
  );
};
