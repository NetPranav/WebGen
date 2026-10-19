/**
 * Editing commands (ROADMAP Phase 29, Law 20): every operation in `editOps.ts` is a command, with the Figma
 * keyboard workflow bound to it while the canvas has focus. Copy, cut and paste keys are the browser's own clipboard
 * events (so they reach the system clipboard and other tabs); the same operations are also commands for the menus,
 * the context menu and agents.
 */

import { z } from "zod";
import { defineCommand, defineTypedCommand, getContextKeys, type ContextKeys } from "../commands";
import { getDocument } from "../store/documentState";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { useToolStore } from "../store/useToolStore";
import { mirrorRead, mirrorWrite, parseClip } from "./clipboard";
import {
  copyText, deleteLayers, showAll, unlockAll, duplicateLayers, groupLayers, nudgeLayers, pasteText, renameLayer, reorderLayers, selectionRoots, toggleHidden, toggleLock, ungroupLayers, type ZOrderOp,
} from "./editOps";

const ids = () => useSelectionStore.getState().selectedIds;
const hasSelection = () => ids().length > 0;
/** Canvas shortcuts: the canvas has focus, no text field does, something is selected, and no drag is in progress. */
const onSelection = (ctx: ContextKeys) =>
  ctx.canvasFocus && !ctx.textEditing && hasSelection() && !useToolStore.getState().gesturing && useCanvasViewStore.getState().mode === "design";

/** The container a paste goes into when exactly one container is selected (and it isn't a top-level frame being copied elsewhere). */
function pasteTarget(): string | null {
  const roots = selectionRoots(ids());
  if (roots.length !== 1) return null;
  const l = getDocument().layers[roots[0]];
  return l && l.archetype === "container" ? l.id : null;
}

/** Copies the selection. Returns the text only if a copy was actually kept (the mirror took it), so a cut never deletes into nothing. */
function doCopy(): string | null {
  const text = copyText(ids());
  if (!text || !mirrorWrite(text)) return null;
  void navigator.clipboard?.writeText(text).catch(() => undefined);
  return text;
}

async function clipboardText(): Promise<string | null> {
  try {
    const text = await navigator.clipboard.readText();
    if (parseClip(text)) return text;
  } catch {
    // no permission: the mirror below is what tabs of this origin share
  }
  return mirrorRead();
}

const STEP: Record<string, { dx: number; dy: number }> = { Left: { dx: -1, dy: 0 }, Right: { dx: 1, dy: 0 }, Up: { dx: 0, dy: -1 }, Down: { dx: 0, dy: 1 } };

export function registerEditingCommands(): () => void {
  const category = "Edit";
  const offs: (() => void)[] = [];
  const add = (off: () => void) => offs.push(off);

  add(defineCommand({ id: "edit.copy", title: "Copy", category, run: () => void doCopy() }));
  // Cut is a key binding, not only the browser's `cut` event: WebKit fires that event only from an editable selection.
  add(defineCommand({ id: "edit.cut", title: "Cut", category, keybinding: "Ctrl+X", when: onSelection, run: () => { if (doCopy()) deleteLayers(ids()); } }));
  add(defineCommand({ id: "edit.paste", title: "Paste", category, run: () => void clipboardText().then((t) => pasteText(t, { into: pasteTarget() })) }));
  add(defineCommand({ id: "edit.pasteInPlace", title: "Paste in Place", category, run: () => void clipboardText().then((t) => pasteText(t, { into: pasteTarget(), inPlace: true })) }));
  add(defineCommand({ id: "edit.duplicate", title: "Duplicate", category, keybinding: "Ctrl+D", when: onSelection, run: () => void duplicateLayers(ids()) }));
  add(defineCommand({ id: "edit.delete", title: "Delete", category, keybinding: ["Delete", "Backspace"], when: onSelection, run: () => void deleteLayers(ids()) }));

  for (const [name, s] of Object.entries(STEP)) {
    add(defineCommand({ id: `edit.nudge${name}`, title: `Nudge ${name}`, category, keybinding: `Arrow${name}`, when: onSelection, run: () => nudgeLayers(ids(), s.dx, s.dy) }));
    add(defineCommand({ id: `edit.nudge${name}10`, title: `Nudge ${name} 10 px`, category, keybinding: `Shift+Arrow${name}`, when: onSelection, run: () => nudgeLayers(ids(), s.dx * 10, s.dy * 10) }));
  }
  add(defineTypedCommand({ id: "edit.nudgeBy", title: "Nudge By", category, args: z.object({ dx: z.number(), dy: z.number() }), run: ({ dx, dy }) => nudgeLayers(ids(), dx, dy) }));

  const order: [string, string, ZOrderOp, string][] = [
    ["layer.bringForward", "Bring Forward", "forward", "Ctrl+]"],
    ["layer.sendBackward", "Send Backward", "backward", "Ctrl+["],
    ["layer.bringToFront", "Bring to Front", "front", "Ctrl+Shift+]"],
    ["layer.sendToBack", "Send to Back", "back", "Ctrl+Shift+["],
  ];
  for (const [id, title, op, key] of order) add(defineCommand({ id, title, category: "Layer", keybinding: key, when: onSelection, run: () => void reorderLayers(ids(), op) }));
  add(defineTypedCommand({ id: "layer.reorder", title: "Arrange Layers", category: "Layer", args: z.object({ op: z.enum(["forward", "backward", "front", "back"]) }), run: ({ op }) => ({ changed: reorderLayers(ids(), op) }) }));

  add(defineCommand({ id: "edit.group", title: "Group Selection", category, keybinding: "Ctrl+G", when: onSelection, run: () => void groupLayers(ids(), "group") }));
  add(defineCommand({ id: "edit.ungroup", title: "Ungroup", category, keybinding: "Ctrl+Shift+G", when: onSelection, run: () => void ungroupLayers(ids()) }));
  add(defineCommand({ id: "edit.frameSelection", title: "Frame Selection", category, keybinding: "Ctrl+Alt+G", when: onSelection, run: () => void groupLayers(ids(), "frame") }));
  add(defineTypedCommand({ id: "edit.groupSelection", title: "Group or Frame the Selection", category, args: z.object({ kind: z.enum(["group", "frame"]).default("group") }), run: ({ kind }) => ({ id: groupLayers(ids(), kind) }) }));

  add(defineCommand({ id: "layer.toggleLock", title: "Lock / Unlock", category: "Layer", keybinding: "Ctrl+Shift+L", when: onSelection, run: () => void toggleLock(ids()) }));
  add(defineCommand({ id: "layer.unlockAll", title: "Unlock All", category: "Layer", run: () => void unlockAll() }));
  add(defineCommand({ id: "layer.showAll", title: "Show All", category: "Layer", run: () => void showAll() }));
  add(defineCommand({ id: "layer.toggleHidden", title: "Hide / Show", category: "Layer", keybinding: "Ctrl+Shift+H", when: onSelection, run: () => void toggleHidden(ids()) }));
  add(defineCommand({ id: "layer.rename", title: "Rename", category: "Layer", keybinding: "F2", when: (ctx) => onSelection(ctx) && ids().length === 1, run: () => useCanvasViewStore.getState().startRename(ids()[0]) }));
  add(defineTypedCommand({ id: "layer.setName", title: "Rename Layer", category: "Layer", args: z.object({ id: z.string(), name: z.string() }), run: ({ id, name }) => renameLayer(id, name) }));

  add(installClipboardEvents(window));
  return () => offs.forEach((off) => off());
}

/** The browser's own copy, cut and paste events: what Ctrl/Cmd+C, X and V fire. Only while the canvas has focus and a layer is selected (copy, cut) or a layer clip is on the clipboard (paste). */
export function installClipboardEvents(target: Window): () => void {
  const canvas = () => getContextKeys().canvasFocus && !getContextKeys().textEditing;
  const onCopy = (e: ClipboardEvent, cut: boolean) => {
    if (!canvas() || !hasSelection() || !e.clipboardData) return;
    const text = copyText(ids());
    if (!text) return;
    e.clipboardData.setData("text/plain", text); // the system clipboard has it now: a cut can go ahead
    mirrorWrite(text);
    e.preventDefault();
    if (cut) deleteLayers(ids());
  };
  const copy = (e: Event) => onCopy(e as ClipboardEvent, false);
  const cut = (e: Event) => onCopy(e as ClipboardEvent, true);
  const paste = (e: Event) => {
    const ev = e as ClipboardEvent;
    if (!canvas()) return;
    const system = ev.clipboardData?.getData("text/plain") ?? "";
    // our payload from the system clipboard; or, when the page was given none, the mirror every tab of this origin shares
    const text = parseClip(system) ? system : system === "" ? mirrorRead() : null;
    if (!text || !parseClip(text)) return;
    ev.preventDefault();
    pasteText(text, { into: pasteTarget() });
  };
  target.document.addEventListener("copy", copy);
  target.document.addEventListener("cut", cut);
  target.document.addEventListener("paste", paste);
  return () => {
    target.document.removeEventListener("copy", copy);
    target.document.removeEventListener("cut", cut);
    target.document.removeEventListener("paste", paste);
  };
}
