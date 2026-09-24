"use client";

/**
 * ============================================================================
 * HELP MENU DROPDOWN
 * ============================================================================
 * UI Element: Top Navigation Help Menu Dropdown
 * Screen / Scope: Screen 01: Master IDE Studio Header
 * Role: Provides documentation, shortcuts modal trigger, and runtime diagnostics.
 * Styling Source: `@/editor/styles/menus.css` (`.menu-dropdown`, `.menu-item`)
 * ============================================================================
 */

import React from "react";
import {
  BookOpen,
  Keyboard,
  Activity,
  Bug,
  Info,
  ExternalLink,
} from "lucide-react";

interface HelpMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onShortcuts?: () => void;
  onAbout?: () => void;
  onDocs?: () => void;
}

export const HelpMenu: React.FC<HelpMenuProps> = ({
  isOpen,
  onClose,
  onShortcuts,
  onAbout,
  onDocs,
}) => {
  if (!isOpen) return null;

  const handleAction = (action?: () => void) => {
    if (action) action();
    onClose();
  };

  return (
    <div className="menu-dropdown" role="menu" aria-label="Help Options">
      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onDocs)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><BookOpen size={13} /></span>
          <span>Documentation</span>
        </span>
        <kbd className="menu-item__shortcut">F1</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onShortcuts)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Keyboard size={13} /></span>
          <span>Keyboard Shortcuts</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+/</kbd>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Activity size={13} /></span>
          <span>Wasm Kernel Diagnostics (120 FPS)</span>
        </span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Bug size={13} /></span>
          <span>Report Issue or Feedback</span>
        </span>
        <ExternalLink size={11} style={{ color: "var(--text-tertiary)" }} />
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onAbout)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Info size={13} /></span>
          <span>About Visual Web Application Engine</span>
        </span>
      </button>
    </div>
  );
};
