"use client";

/**
 * ============================================================================
 * VIEW MENU DROPDOWN
 * ============================================================================
 * UI Element: Top Navigation View Menu Dropdown
 * Screen / Scope: Screen 01: Master IDE Studio Header
 * Role: Manages viewport scaling, dot-grid rendering, snapping, and fullscreen.
 * Styling Source: `@/editor/styles/menus.css` (`.menu-dropdown`, `.menu-item`)
 * ============================================================================
 */

import React, { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Magnet,
  Activity,
  Check,
  Expand,
} from "lucide-react";

interface ViewMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onFitToStage?: () => void;
  onToggleFullscreen?: () => void;
}

export const ViewMenu: React.FC<ViewMenuProps> = ({
  isOpen,
  onClose,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToStage,
  onToggleFullscreen,
}) => {
  const [showDotGrid, setShowDotGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [cablePhysics, setCablePhysics] = useState(true);

  if (!isOpen) return null;

  const handleAction = (action?: () => void) => {
    if (action) action();
    onClose();
  };

  return (
    <div className="menu-dropdown" role="menu" aria-label="View Options">
      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onZoomIn)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><ZoomIn size={13} /></span>
          <span>Zoom In</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl++</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onZoomOut)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><ZoomOut size={13} /></span>
          <span>Zoom Out</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+-</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onZoomReset)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Maximize2 size={13} /></span>
          <span>Reset Zoom (100%)</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+0</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onFitToStage)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Maximize2 size={13} /></span>
          <span>Fit to Stage</span>
        </span>
        <kbd className="menu-item__shortcut">Shift+1</kbd>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => setShowDotGrid((prev) => !prev)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Grid size={13} /></span>
          <span>Show Dot Grid</span>
        </span>
        {showDotGrid && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => setSnapToGrid((prev) => !prev)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Magnet size={13} /></span>
          <span>Snap to Grid</span>
        </span>
        {snapToGrid && <Check size={13} className="menu-item__check" />}
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => setCablePhysics((prev) => !prev)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Activity size={13} /></span>
          <span>120 FPS Cable Physics</span>
        </span>
        {cablePhysics && <Check size={13} className="menu-item__check" />}
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onToggleFullscreen)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Expand size={13} /></span>
          <span>Toggle Fullscreen</span>
        </span>
        <kbd className="menu-item__shortcut">F11</kbd>
      </button>
    </div>
  );
};
