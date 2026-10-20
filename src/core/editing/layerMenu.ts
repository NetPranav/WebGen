/**
 * The layer context menu as data (ROADMAP Phase 29): what the right-click menu on the canvas lists, and what the
 * Layers panel's will list (Phase 32). Every item is a command (Law 20); an item says why it's disabled instead of
 * silently not running.
 */

import { getDocument } from "../store/documentState";
import { selectionRoots } from "./editOps";

export interface LayerMenuItem {
  kind: "item";
  label: string;
  command: string;
  shortcut?: string;
  disabled?: boolean;
}
export type LayerMenuEntry = LayerMenuItem | { kind: "separator" };

const sep: LayerMenuEntry = { kind: "separator" };

/** The menu for a selection. `canPaste`: a layer clip is on the clipboard. */
export function layerMenu(selectedIds: readonly string[], canPaste: boolean): LayerMenuEntry[] {
  const layers = getDocument().layers;
  const roots = selectionRoots(selectedIds);
  const some = roots.length > 0;
  const nonFrames = roots.filter((id) => layers[id].parentId !== null);
  const canGroup = nonFrames.length > 0 && nonFrames.length === roots.length;
  const canUngroup = roots.some((id) => layers[id].parentId !== null && layers[id].archetype === "container" && layers[id].children.length > 0);
  const lockAll = some && roots.every((id) => layers[id].locked === true);
  const hideAll = some && roots.every((id) => layers[id].visible === false);
  const item = (label: string, command: string, shortcut: string | undefined, enabled: boolean): LayerMenuEntry => ({ kind: "item", label, command, ...(shortcut ? { shortcut } : {}), disabled: !enabled });
  return [
    item("Copy", "edit.copy", "Ctrl+C", some),
    item("Cut", "edit.cut", "Ctrl+X", some),
    item("Paste", "edit.paste", "Ctrl+V", canPaste),
    item("Paste in Place", "edit.pasteInPlace", undefined, canPaste),
    item("Duplicate", "edit.duplicate", "Ctrl+D", some),
    item("Delete", "edit.delete", "Del", some),
    sep,
    item("Group Selection", "edit.group", "Ctrl+G", canGroup),
    item("Ungroup", "edit.ungroup", "Ctrl+Shift+G", canUngroup),
    item("Frame Selection", "edit.frameSelection", "Ctrl+Alt+G", canGroup),
    sep,
    item("Bring to Front", "layer.bringToFront", "Ctrl+Shift+]", nonFrames.length > 0),
    item("Bring Forward", "layer.bringForward", "Ctrl+]", nonFrames.length > 0),
    item("Send Backward", "layer.sendBackward", "Ctrl+[", nonFrames.length > 0),
    item("Send to Back", "layer.sendToBack", "Ctrl+Shift+[", nonFrames.length > 0),
    sep,
    item("Align Left", "align.left", "Alt+A", roots.length > 0),
    item("Align Horizontal Centers", "align.hcenter", "Alt+H", roots.length > 0),
    item("Align Right", "align.right", "Alt+D", roots.length > 0),
    item("Align Top", "align.top", "Alt+W", roots.length > 0),
    item("Align Vertical Centers", "align.vcenter", "Alt+V", roots.length > 0),
    item("Align Bottom", "align.bottom", "Alt+S", roots.length > 0),
    item("Distribute Horizontal Spacing", "distribute.horizontal", "Ctrl+Alt+H", roots.length >= 3),
    item("Distribute Vertical Spacing", "distribute.vertical", "Ctrl+Alt+V", roots.length >= 3),
    item("Tidy Up", "layer.tidy", "Ctrl+Alt+T", roots.length >= 2),
    sep,
    item(lockAll ? "Unlock" : "Lock", "layer.toggleLock", "Ctrl+Shift+L", some),
    item("Unlock All", "layer.unlockAll", undefined, Object.values(layers).some((l) => l.locked === true)),
    item("Show All", "layer.showAll", undefined, Object.values(layers).some((l) => l.visible === false)),
    item(hideAll ? "Show" : "Hide", "layer.toggleHidden", "Ctrl+Shift+H", some),
    item("Rename", "layer.rename", "F2", roots.length === 1),
    sep,
    item("Select All", "selection.all", "Ctrl+A", true),
  ];
}
