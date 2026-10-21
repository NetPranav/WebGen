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
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround, LayoutGrid,
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
      { kind: "item", label: "New Project...", icon: FilePlus, command: "file.newProject" },
      { kind: "item", label: "Open Project...", icon: FolderOpen, shortcut: "Ctrl+O", command: "file.importProjectFile" },
      sep,
      { kind: "item", label: "Save Project", icon: Save, shortcut: "Ctrl+S", command: "file.save" },
      { kind: "item", label: "Save As Template...", icon: FileCode, shortcut: "Ctrl+Shift+S", pending: "Phase 51" },
      sep,
      { kind: "item", label: "Export Project File (.lazy.json)", icon: Download, command: "file.exportProjectFile" },
      { kind: "item", label: "Import Project File...", icon: Upload, command: "file.importProjectFile" },
      sep,
      { kind: "item", label: "Export Site...", icon: Sparkles, shortcut: "Ctrl+E", command: "file.exportSite" },
      sep,
      { kind: "item", label: "Close Project", icon: LogOut, command: "file.closeProject" },
    ],
  },
  edit: {
    label: "Edit Options",
    entries: [
      { kind: "item", label: "Undo", icon: Undo2, shortcut: "Ctrl+Z", command: "edit.undo" },
      { kind: "item", label: "Redo", icon: Redo2, shortcut: "Ctrl+Shift+Z", command: "edit.redo" },
      sep,
      { kind: "item", label: "Cut", icon: Scissors, shortcut: "Ctrl+X", command: "edit.cut" },
      { kind: "item", label: "Copy", icon: Copy, shortcut: "Ctrl+C", command: "edit.copy" },
      { kind: "item", label: "Paste", icon: ClipboardPaste, shortcut: "Ctrl+V", command: "edit.paste" },
      { kind: "item", label: "Paste in Place", icon: ClipboardPaste, command: "edit.pasteInPlace" },
      { kind: "item", label: "Duplicate", icon: CopyPlus, shortcut: "Ctrl+D", command: "edit.duplicate" },
      { kind: "item", label: "Delete", icon: Trash2, shortcut: "Del", command: "edit.delete" },
      sep,
      { kind: "item", label: "Select All", icon: Copy, shortcut: "Ctrl+A", command: "selection.all" },
      { kind: "item", label: "Group Selection", icon: CopyPlus, shortcut: "Ctrl+G", command: "edit.group" },
      { kind: "item", label: "Ungroup", icon: CopyPlus, shortcut: "Ctrl+Shift+G", command: "edit.ungroup" },
      { kind: "item", label: "Frame Selection", icon: CopyPlus, shortcut: "Ctrl+Alt+G", command: "edit.frameSelection" },
      sep,
      { kind: "item", label: "Align Left", icon: AlignStartVertical, shortcut: "Alt+A", command: "align.left" },
      { kind: "item", label: "Align Horizontal Centers", icon: AlignCenterVertical, shortcut: "Alt+H", command: "align.hcenter" },
      { kind: "item", label: "Align Right", icon: AlignEndVertical, shortcut: "Alt+D", command: "align.right" },
      { kind: "item", label: "Align Top", icon: AlignStartHorizontal, shortcut: "Alt+W", command: "align.top" },
      { kind: "item", label: "Align Vertical Centers", icon: AlignCenterHorizontal, shortcut: "Alt+V", command: "align.vcenter" },
      { kind: "item", label: "Align Bottom", icon: AlignEndHorizontal, shortcut: "Alt+S", command: "align.bottom" },
      { kind: "item", label: "Distribute Horizontal Spacing", icon: AlignHorizontalSpaceAround, shortcut: "Ctrl+Alt+H", command: "distribute.horizontal" },
      { kind: "item", label: "Distribute Vertical Spacing", icon: AlignVerticalSpaceAround, shortcut: "Ctrl+Alt+V", command: "distribute.vertical" },
      { kind: "item", label: "Tidy Up", icon: LayoutGrid, shortcut: "Ctrl+Alt+T", command: "layer.tidy" },
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
      { kind: "item", label: "Fit to Stage", icon: Maximize2, shortcut: "Shift+1", command: "canvas.zoomToFit" },
      { kind: "item", label: "Zoom to Selection", icon: Maximize2, shortcut: "Shift+2", command: "canvas.zoomToSelection" },
      sep,
      { kind: "item", label: "Show / Hide Rulers", icon: Grid, shortcut: "Shift+R", command: "view.toggleRulers" },
      { kind: "item", label: "Snap to Objects", icon: Magnet, command: "view.snapObjects" },
      { kind: "item", label: "Snap to Pixel Grid", icon: Magnet, command: "view.snapGrid" },
      { kind: "item", label: "Design Mode", icon: Grid, command: "view.designMode" },
      { kind: "item", label: "Preview Mode", icon: Grid, command: "view.previewMode" },
      { kind: "item", label: "120 FPS Cable Physics", icon: Activity, pending: "Phase 119" },
      sep,
      { kind: "item", label: "Toggle Fullscreen", icon: Expand, shortcut: "F11", command: "view.toggleFullscreen" },
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
