"use client";

/**
 * ============================================================================
 * EDIT MENU DROPDOWN
 * ============================================================================
 * UI Element: Top Navigation Edit Menu Dropdown
 * Screen / Scope: Screen 01: Master IDE Studio Header
 * Role: Provides clipboard, history, and configuration actions.
 * Styling Source: `@/editor/styles/menus.css` (`.menu-dropdown`, `.menu-item`)
 * ============================================================================
 */

import React from "react";
import {
  Undo2,
  Redo2,
  Scissors,
  Copy,
  ClipboardPaste,
  CopyPlus,
  Trash2,
  Settings,
} from "lucide-react";

interface EditMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onPreferences?: () => void;
}

export const EditMenu: React.FC<EditMenuProps> = ({
  isOpen,
  onClose,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  onPreferences,
}) => {
  if (!isOpen) return null;

  const handleAction = (action?: () => void) => {
    if (action) action();
    onClose();
  };

  return (
    <div className="menu-dropdown" role="menu" aria-label="Edit Options">
      <button
        type="button"
        className="menu-item"
        disabled={!canUndo}
        onClick={() => handleAction(onUndo)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Undo2 size={13} /></span>
          <span>Undo</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+Z</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        disabled={!canRedo}
        onClick={() => handleAction(onRedo)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Redo2 size={13} /></span>
          <span>Redo</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+Shift+Z</kbd>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Scissors size={13} /></span>
          <span>Cut</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+X</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Copy size={13} /></span>
          <span>Copy</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+C</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><ClipboardPaste size={13} /></span>
          <span>Paste</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+V</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><CopyPlus size={13} /></span>
          <span>Duplicate</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+D</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Trash2 size={13} /></span>
          <span>Delete</span>
        </span>
        <kbd className="menu-item__shortcut">Del</kbd>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onPreferences)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Settings size={13} /></span>
          <span>Preferences...</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+,</kbd>
      </button>
    </div>
  );
};
