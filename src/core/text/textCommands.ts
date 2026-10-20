/**
 * Text commands (ROADMAP Phase 31, Law 20): edit text in place (Enter, or double-click on the canvas), and a typed
 * `text.set` so an agent can write a text layer's words and styled runs without the editor.
 */

import { z } from "zod";
import { defineCommand, defineTypedCommand, type ContextKeys } from "../commands";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { worldBox } from "../editing/layerBoxes";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { useSelectionStore } from "../store/useSelectionStore";
import { useToolStore } from "../store/useToolStore";
import { runsText, serializeRuns, type TextRun } from "./runs";

/** The one selected text layer that can be edited (not locked, not hidden inside a locked parent), or null. */
export function editableTextSelection(): string | null {
  const ids = useSelectionStore.getState().selectedIds;
  if (ids.length !== 1) return null;
  const layers = getDocument().layers;
  let cur: (typeof layers)[string] | undefined = layers[ids[0]];
  if (!cur || cur.archetype !== "text") return null;
  const id = cur.id;
  let guard = 0;
  while (cur && guard++ < 10_000) {
    if (cur.locked === true) return null;
    cur = cur.parentId ? layers[cur.parentId] : undefined;
  }
  return id;
}

const canEdit = (ctx: ContextKeys) =>
  ctx.canvasFocus && !ctx.textEditing && !useToolStore.getState().gesturing && useCanvasViewStore.getState().mode === "design" && editableTextSelection() !== null;

export type TextSizing = "autoWidth" | "autoHeight" | "fixed";

/**
 * Changes how text layers size themselves. Leaving auto-width keeps the box the text had (its measured width, and
 * for fixed its height too), so the box doesn't collapse when it stops following its text.
 */
export function setTextSizing(ids: readonly string[], mode: TextSizing): number {
  const layers = getDocument().layers;
  const targets = ids.filter((id) => layers[id]?.archetype === "text" && layers[id].locked !== true);
  if (targets.length === 0) return 0;
  const tx = documentCommands.begin("Text sizing");
  try {
    for (const id of targets) {
      const box = worldBox(id);
      const patch: Record<string, string | number> = { "text.sizing": mode };
      if (box && mode !== "autoWidth") {
        patch["frame.width"] = Math.round(Math.max(1, box.w));
        if (mode === "fixed") patch["frame.height"] = Math.round(Math.max(1, box.h));
      }
      documentCommands.updateProps(id, patch);
    }
    tx.commit();
  } catch (error) {
    tx.cancel();
    throw error;
  }
  return targets.length;
}

export function registerTextCommands(): () => void {
  const category = "Text";
  const offs = [
    defineCommand({ id: "text.edit", title: "Edit Text", category, keybinding: "Enter", when: canEdit, run: () => { const id = editableTextSelection(); if (id) useCanvasViewStore.getState().startTextEdit(id); } }),
    defineTypedCommand({
      id: "text.setSizing",
      title: "Set Text Sizing",
      category,
      args: z.object({ mode: z.enum(["autoWidth", "autoHeight", "fixed"]), ids: z.array(z.string()).optional() }),
      run: ({ mode, ids }) => ({ changed: setTextSizing(ids ?? useSelectionStore.getState().selectedIds, mode) }),
    }),
    defineTypedCommand({
      id: "text.set",
      title: "Set Text",
      category,
      args: z.object({
        id: z.string(),
        text: z.string().max(20_000),
        runs: z.array(z.object({ text: z.string(), bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(), strike: z.boolean().optional(), color: z.string().optional() })).max(2_000).optional(),
      }),
      run: ({ id, text, runs }) => {
        const layer = getDocument().layers[id];
        if (!layer || layer.archetype !== "text") return { ok: false };
        const styled: TextRun[] | undefined = runs?.map((r) => ({ text: r.text, ...(r.bold ? { bold: true as const } : {}), ...(r.italic ? { italic: true as const } : {}), ...(r.underline ? { underline: true as const } : {}), ...(r.strike ? { strike: true as const } : {}), ...(r.color ? { color: r.color } : {}) }));
        documentCommands.updateProps(id, { "content.text": text, "content.runs": styled && runsText(styled) === text ? serializeRuns(styled) : "" }, "Set text");
        return { ok: true };
      },
    }),
  ];
  return () => offs.forEach((off) => off());
}
