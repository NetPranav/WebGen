/**
 * ROADMAP Phase 13 (Law 20, Agent Parity): the File, Edit, View and Help menus
 * are data. Each item either runs a registered command through the command
 * bus, or is `pending` — shown disabled with the phase that builds it — so no
 * menu item is a button that looks live and does nothing.
 * `commandCoverage.test.ts` checks every `command` id below is registered.
 */
import {
  FilePlus, FolderOpen, Save, FileCode, LogOut, Sparkles, Download, Upload,
  Undo2, Redo2, Scissors, Copy, ClipboardPaste, CopyPlus, Trash2, Settings,
  ZoomIn, ZoomOut, Maximize2, Grid, Magnet, Activity, Expand,
  BookOpen, Keyboard, Bug, Info,
} from "lucide-react";
import type { ComponentType } from "react";

export type MenuId = "file" | "edit" | "view" | "help";

export type MenuEntry =
  | { kind: "separator" }
  | {
      kind: "item";
      label: string;
      icon: ComponentType<{ size?: number }>;
      shortcut?: string;
      /** Id of a command registered on the command bus. */
      command?: string;
      /** The phase that builds this item; the item shows disabled until then. */
      pending?: string;
    };

const sep: MenuEntry = { kind: "separator" };

export const MENU_MODEL: Record<MenuId, { label: string; entries: MenuEntry[] }> = {
  file: {
    label: "File Options",
    entries: [
      { kind: "item", label: "New Project...", icon: FilePlus, shortcut: "Ctrl+N", pending: "Phase 14" },
      { kind: "item", label: "Open Project...", icon: FolderOpen, shortcut: "Ctrl+O", command: "file.importProjectFile" },
      sep,
      { kind: "item", label: "Save Project", icon: Save, shortcut: "Ctrl+S", command: "file.save" },
      { kind: "item", label: "Save As Template...", icon: FileCode, shortcut: "Ctrl+Shift+S", pending: "Phase 51" },
      sep,
      { kind: "item", label: "Export Project File (.lazy.json)", icon: Download, command: "file.exportProjectFile" },
      { kind: "item", label: "Import Project File...", icon: Upload, command: "file.importProjectFile" },
      sep,
      { kind: "item", label: "Export Next.js + Prisma Code", icon: Sparkles, shortcut: "Ctrl+E", pending: "Phase 49" },
      sep,
      { kind: "item", label: "Close Project", icon: LogOut, pending: "Phase 14" },
    ],
  },
  edit: {
    label: "Edit Options",
    entries: [
      { kind: "item", label: "Undo", icon: Undo2, shortcut: "Ctrl+Z", command: "edit.undo" },
      { kind: "item", label: "Redo", icon: Redo2, shortcut: "Ctrl+Shift+Z", command: "edit.redo" },
      sep,
      { kind: "item", label: "Cut", icon: Scissors, shortcut: "Ctrl+X", pending: "Phase 29" },
      { kind: "item", label: "Copy", icon: Copy, shortcut: "Ctrl+C", pending: "Phase 29" },
      { kind: "item", label: "Paste", icon: ClipboardPaste, shortcut: "Ctrl+V", pending: "Phase 29" },
      { kind: "item", label: "Duplicate", icon: CopyPlus, shortcut: "Ctrl+D", pending: "Phase 29" },
      { kind: "item", label: "Delete", icon: Trash2, shortcut: "Del", pending: "Phase 29" },
      sep,
      { kind: "item", label: "Preferences...", icon: Settings, shortcut: "Ctrl+,", command: "app.preferences" },
    ],
  },
  view: {
    label: "View Options",
    entries: [
      { kind: "item", label: "Zoom In", icon: ZoomIn, shortcut: "Ctrl++", command: "view.zoomIn" },
      { kind: "item", label: "Zoom Out", icon: ZoomOut, shortcut: "Ctrl+-", command: "view.zoomOut" },
      { kind: "item", label: "Reset Zoom (100%)", icon: Maximize2, shortcut: "Ctrl+0", command: "view.zoomReset" },
      { kind: "item", label: "Fit to Stage", icon: Maximize2, shortcut: "Shift+1", pending: "Phase 20" },
      sep,
      { kind: "item", label: "Show Dot Grid", icon: Grid, pending: "Phase 20" },
      { kind: "item", label: "Snap to Grid", icon: Magnet, pending: "Phase 28" },
      { kind: "item", label: "120 FPS Cable Physics", icon: Activity, pending: "Phase 119" },
      sep,
      { kind: "item", label: "Toggle Fullscreen", icon: Expand, shortcut: "F11", pending: "Phase 14" },
    ],
  },
  help: {
    label: "Help Options",
    entries: [
      { kind: "item", label: "Documentation", icon: BookOpen, shortcut: "F1", pending: "Phase 183" },
      { kind: "item", label: "Keyboard Shortcuts", icon: Keyboard, shortcut: "Ctrl+/", command: "view.commandPalette" },
      sep,
      { kind: "item", label: "Report Issue or Feedback", icon: Bug, pending: "Phase 185" },
      sep,
      { kind: "item", label: "About Visual Web Application Engine", icon: Info, pending: "Phase 189" },
    ],
  },
};

/** Every command id the menus use, for the coverage test. */
export function menuCommandIds(): string[] {
  const ids = new Set<string>();
  for (const menu of Object.values(MENU_MODEL))
    for (const e of menu.entries) if (e.kind === "item" && e.command) ids.add(e.command);
  return [...ids];
}
