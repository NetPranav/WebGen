/**
 * Editing commands (ROADMAP Phase 29, Law 20): every operation in `editOps.ts` is a command, with the Figma
 * keyboard workflow bound to it while the canvas has focus. Copy, cut and paste keys are the browser's own clipboard
 * events (so they reach the system clipboard and other tabs); the same operations are also commands for the menus,
 * the context menu and agents.
 */

import { z } from "zod";
import { registerTextCommands } from "../text/textCommands";
import { moveLayers } from "../layers/reparent";
import { importAndPlace } from "../assets/assetImport";
import { setFills, setShadows, setBlur, setStrokeStyle } from "../paint/paintOps";
import { setFill, setFrame, setOpacity, setRadius, setSimpleText, setStroke } from "../inspector/simpleOps";
import { ALIGN_MODES, type AlignMode } from "../geometry/align";
import { defineCommand, defineTypedCommand, getContextKeys, type ContextKeys } from "../commands";
import { getDocument } from "../store/documentState";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { useToolStore } from "../store/useToolStore";
import { mirrorRead, mirrorWrite, parseClip } from "./clipboard";
import {
  alignLayers, setLayerProps, setLocked, setVisible, copyText, deleteLayers, distributeLayers, tidyLayers, showAll, unlockAll, duplicateLayers, groupLayers, nudgeLayers, pasteText, renameLayer, reorderLayers, selectionRoots, toggleHidden, toggleLock, ungroupLayers, type ZOrderOp,
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

  // Phase 30: align, distribute and tidy. Alt+letter is Figma's alignment set; Ctrl+Alt+H / V distribute, Ctrl+Alt+T tidies.
  const align = (mode: AlignMode) => () => void alignLayers(ids(), mode);
  add(defineCommand({ id: "align.left", title: "Align Left", category: "Arrange", keybinding: "Alt+A", when: onSelection, run: align("left") }));
  add(defineCommand({ id: "align.hcenter", title: "Align Horizontal Centers", category: "Arrange", keybinding: "Alt+H", when: onSelection, run: align("hcenter") }));
  add(defineCommand({ id: "align.right", title: "Align Right", category: "Arrange", keybinding: "Alt+D", when: onSelection, run: align("right") }));
  add(defineCommand({ id: "align.top", title: "Align Top", category: "Arrange", keybinding: "Alt+W", when: onSelection, run: align("top") }));
  add(defineCommand({ id: "align.vcenter", title: "Align Vertical Centers", category: "Arrange", keybinding: "Alt+V", when: onSelection, run: align("vcenter") }));
  add(defineCommand({ id: "align.bottom", title: "Align Bottom", category: "Arrange", keybinding: "Alt+S", when: onSelection, run: align("bottom") }));
  add(defineTypedCommand({
    id: "layer.align", title: "Align Layers", category: "Arrange",
    args: z.object({ mode: z.enum(ALIGN_MODES as unknown as [AlignMode, ...AlignMode[]]), to: z.enum(["auto", "selection", "parent"]).default("auto") }),
    run: ({ mode, to }) => ({ changed: alignLayers(ids(), mode, to) }),
  }));
  add(defineCommand({ id: "distribute.horizontal", title: "Distribute Horizontal Spacing", category: "Arrange", keybinding: "Ctrl+Alt+H", when: onSelection, run: () => void distributeLayers(ids(), "h") }));
  add(defineCommand({ id: "distribute.vertical", title: "Distribute Vertical Spacing", category: "Arrange", keybinding: "Ctrl+Alt+V", when: onSelection, run: () => void distributeLayers(ids(), "v") }));
  add(defineTypedCommand({ id: "layer.distribute", title: "Distribute Layers", category: "Arrange", args: z.object({ axis: z.enum(["h", "v"]) }), run: ({ axis }) => ({ changed: distributeLayers(ids(), axis) }) }));
  add(defineCommand({ id: "layer.tidy", title: "Tidy Up", category: "Arrange", keybinding: "Ctrl+Alt+T", when: onSelection, run: () => void tidyLayers(ids()) }));

  // The one writer every inspector control and every agent uses to change properties (Phase 31; the Simple and Pro faces build on it).
  add(defineTypedCommand({
    id: "layer.setProps", title: "Set Layer Properties", category: "Layer",
    args: z.object({ ids: z.array(z.string()).optional(), props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])), label: z.string().optional() }),
    run: ({ ids: target, props, label }) => ({ changed: setLayerProps(target ?? ids(), props, label) }),
  }));
  // Phase 32: the Layers panel's writers. Each takes ids (default: the selection) so a row's buttons act on that row.
  add(defineTypedCommand({ id: "layer.setLocked", title: "Lock or Unlock Layers", category: "Layer", args: z.object({ ids: z.array(z.string()).optional(), locked: z.boolean() }), run: ({ ids: target, locked }) => ({ changed: setLocked(target ?? ids(), locked) }) }));
  add(defineTypedCommand({ id: "layer.setVisible", title: "Show or Hide Layers", category: "Layer", args: z.object({ ids: z.array(z.string()).optional(), visible: z.boolean() }), run: ({ ids: target, visible }) => ({ changed: setVisible(target ?? ids(), visible) }) }));
  add(defineTypedCommand({
    id: "layer.move", title: "Move Layers", category: "Layer",
    args: z.object({ ids: z.array(z.string()).optional(), parentId: z.string().nullable(), index: z.number().int().min(0).optional() }),
    run: ({ ids: target, parentId, index }) => moveLayers(target ?? ids(), parentId, index),
  }));
  // Phase 33: the Simple face's seven controls, as intent-level commands (each takes ids, default the selection).
  const targets = z.array(z.string()).optional();
  add(defineTypedCommand({ id: "layer.setFill", title: "Set Fill", category: "Layer", args: z.object({ ids: targets, color: z.string() }), run: ({ ids: t, color }) => ({ changed: setFill(t ?? ids(), color) }) }));
  add(defineTypedCommand({ id: "layer.setStroke", title: "Set Stroke", category: "Layer", args: z.object({ ids: targets, color: z.string().optional(), width: z.number().optional() }), run: ({ ids: t, color, width }) => ({ changed: setStroke(t ?? ids(), { color, width }) }) }));
  add(defineTypedCommand({ id: "layer.setRadius", title: "Set Corner Radius", category: "Layer", args: z.object({ ids: targets, radius: z.number() }), run: ({ ids: t, radius }) => ({ changed: setRadius(t ?? ids(), radius) }) }));
  add(defineTypedCommand({ id: "layer.setOpacity", title: "Set Opacity", category: "Layer", args: z.object({ ids: targets, opacity: z.number() }), run: ({ ids: t, opacity }) => ({ changed: setOpacity(t ?? ids(), opacity) }) }));
  add(defineTypedCommand({ id: "layer.setText", title: "Set Words", category: "Layer", args: z.object({ ids: targets, text: z.string() }), run: ({ ids: t, text }) => ({ changed: setSimpleText(t ?? ids(), text) }) }));
  add(defineTypedCommand({ id: "layer.setFrame", title: "Set Position and Size", category: "Layer", args: z.object({ ids: targets, x: z.number().optional(), y: z.number().optional(), width: z.number().optional(), height: z.number().optional() }), run: ({ ids: t, ...patch }) => ({ changed: setFrame(t ?? ids(), patch) }) }));
  // Phase 35: paint and effects as typed commands (agents get the same list the panels edit).
  const stop = z.object({ at: z.number(), color: z.string() });
  const pt = z.object({ x: z.number(), y: z.number() });
  const paintBase = { opacity: z.number().min(0).max(1).default(1), visible: z.boolean().default(true) };
  const paintSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("solid"), color: z.string(), ...paintBase }),
    z.object({ type: z.literal("linear"), stops: z.array(stop).min(2).max(32), from: pt, to: pt, ...paintBase }),
    z.object({ type: z.literal("radial"), stops: z.array(stop).min(2).max(32), center: pt, radius: pt, ...paintBase }),
    z.object({ type: z.literal("conic"), stops: z.array(stop).min(2).max(32), center: pt, angle: z.number(), ...paintBase }),
  ]);
  add(defineTypedCommand({ id: "paint.setFills", title: "Set Fills", category: "Layer", args: z.object({ ids: targets, fills: z.array(paintSchema).max(16) }), run: ({ ids: t, fills }) => ({ changed: setFills(t ?? ids(), fills) }) }));
  const shadowSchema = z.object({ kind: z.enum(["drop", "inner"]), x: z.number(), y: z.number(), blur: z.number().min(0), spread: z.number(), color: z.string(), visible: z.boolean().default(true) });
  add(defineTypedCommand({ id: "paint.setShadows", title: "Set Shadows", category: "Layer", args: z.object({ ids: targets, shadows: z.array(shadowSchema).max(16) }), run: ({ ids: t, shadows }) => ({ changed: setShadows(t ?? ids(), shadows) }) }));
  add(defineTypedCommand({ id: "paint.setStrokeStyle", title: "Set Stroke Style", category: "Layer", args: z.object({ ids: targets, style: z.enum(["solid", "dashed", "dotted"]) }), run: ({ ids: t, style }) => ({ changed: setStrokeStyle(t ?? ids(), style) }) }));
  add(defineTypedCommand({ id: "paint.setBlur", title: "Set Blur", category: "Layer", args: z.object({ ids: targets, layer: z.number().optional(), background: z.number().optional() }), run: ({ ids: t, layer, background }) => ({ changed: setBlur(t ?? ids(), { layer, background }) }) }));
  add(registerTextCommands());
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
    // a picture copied from elsewhere pastes as an image layer (Phase 36)
    const pictures = Array.from(ev.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (pictures.length > 0) {
      ev.preventDefault();
      void importAndPlace(pictures);
      return;
    }
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
