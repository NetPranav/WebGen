"use client";

/**
 * ============================================================================
 * FILE MENU DROPDOWN
 * ============================================================================
 * UI Element: Top Navigation File Menu Dropdown
 * Screen / Scope: Screen 01: Master IDE Studio Header
 * Role: Provides project lifecycle operations (New, Open, Save, Export, Recent).
 * Styling Source: `@/editor/styles/menus.css` (`.menu-dropdown`, `.menu-item`)
 * ============================================================================
 */

import React from "react";
import {
  FilePlus,
  FolderOpen,
  Save,
  FileCode,
  Clock,
  LogOut,
  Sparkles,
  Download,
  Upload,
} from "lucide-react";

interface FileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  onNew?: () => void;
  onOpen?: () => void;
  onExport?: () => void;
  onExportProjectFile?: () => void;
  onImportProjectFile?: () => void;
}

export const FileMenu: React.FC<FileMenuProps> = ({
  isOpen,
  onClose,
  onSave,
  onNew,
  onOpen,
  onExport,
  onExportProjectFile,
  onImportProjectFile,
}) => {
  if (!isOpen) return null;

  const handleAction = (action?: () => void) => {
    if (action) action();
    onClose();
  };

  return (
    <div className="menu-dropdown" role="menu" aria-label="File Options">
      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onNew)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><FilePlus size={13} /></span>
          <span>New Project...</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+N</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onOpen)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><FolderOpen size={13} /></span>
          <span>Open Project...</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+O</kbd>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onSave)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Save size={13} /></span>
          <span>Save Project</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+S</kbd>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onSave)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Sparkles size={13} /></span>
          <span>Save As Template...</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+Shift+S</kbd>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onExportProjectFile)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Download size={13} /></span>
          <span>Export Project File (.lazy.json)</span>
        </span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onImportProjectFile)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Upload size={13} /></span>
          <span>Import Project File...</span>
        </span>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onExport)}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><FileCode size={13} /></span>
          <span>Export Next.js + Prisma Code</span>
        </span>
        <kbd className="menu-item__shortcut">Ctrl+E</kbd>
      </button>

      <div className="menu-separator" />
      <span className="menu-header-label">Recent Projects</span>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Clock size={13} /></span>
          <span>E-Commerce-Store.uweb</span>
        </span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><Clock size={13} /></span>
          <span>SaaS-Analytics-Hub.uweb</span>
        </span>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction()}
      >
        <span className="menu-item__left">
          <span className="menu-item__icon"><LogOut size={13} /></span>
          <span>Close Project</span>
        </span>
      </button>
    </div>
  );
};
