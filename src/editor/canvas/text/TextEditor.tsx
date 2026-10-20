"use client";

/**
 * In-place text editing on the canvas (ROADMAP Phase 31). A `contenteditable` element sits in canvas space exactly
 * over the text layer (so it scales and rotates with the camera and the layer), styled with the same typography the
 * renderer uses, while the stage's own copy of the text is hidden. Nothing is written to the document while
 * typing: leaving the editor (Escape, Cmd/Ctrl+Enter, or clicking away) writes `content.text` and `content.runs`
 * in one transaction, so a whole editing session is one undo step; inside the session Cmd/Ctrl+Z undoes typing.
 *
 *  - Cmd/Ctrl+B, I, U and Shift+X style the selection (bold, italic, underline, strike-through).
 *  - Enter types a newline; paste is always plain text; an IME composition is never interrupted.
 *  - Leaving an empty text layer deletes it.
 */

import React, { useEffect, useLayoutEffect, useRef } from "react";
import type { CanvasHitTester } from "@/core/hit/CanvasHitTester";
import { resolveProps } from "@/core/render/resolve";
import { textTypography } from "@/core/render/archetypes/textStyle";
import { getStageRendererForLayer } from "@/core/render/StageRenderer";
import { worldBox } from "@/core/editing/layerBoxes";
import { deleteLayers } from "@/core/editing/editOps";
import { getDocument } from "@/core/store/documentState";
import { documentCommands } from "@/core/store/useDocumentStore";
import { useCanvasViewStore } from "@/core/store/useCanvasViewStore";
import { MAX_TEXT_LENGTH } from "@/core/render/limits";
import { runsOf, runsText, serializeRuns, toggleFlag, type RunFlag, type TextRun } from "@/core/text/runs";
import { ensureSentinel, insertAtSelection, readRuns, renderRuns, selectionOffsets, setSelectionOffsets } from "./domText";

interface Props {
  hitTester: CanvasHitTester;
}

export const TextEditor: React.FC<Props> = ({ hitTester }) => {
  const id = useCanvasViewStore((s) => s.editingTextId);
  if (!id || !getDocument().layers[id]) return null;
  return <TextEditorBody key={id} id={id} hitTester={hitTester} />;
};

interface Snap {
  runs: TextRun[];
  start: number;
  end: number;
}

const FORMAT_KEYS: Record<string, RunFlag> = { b: "bold", i: "italic", u: "underline" };

const TextEditorBody: React.FC<{ id: string; hitTester: CanvasHitTester }> = ({ id }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const done = useRef(false);
  const composing = useRef(false);
  const history = useRef<{ stack: Snap[]; index: number }>({ stack: [], index: 0 });
  const layer = getDocument().layers[id];
  const resolved = resolveProps(layer);
  const sizing = resolved.str("text.sizing", "fixed");
  const box = worldBox(id);
  const initialText = String(layer.properties["content.text"] ?? "");

  const snapshot = (): Snap | null => {
    const el = ref.current;
    if (!el) return null;
    const sel = selectionOffsets(el) ?? { start: 0, end: 0 };
    return { runs: readRuns(el), ...sel };
  };
  const record = () => {
    if (composing.current) return;
    const snap = snapshot();
    if (!snap) return;
    const h = history.current;
    const top = h.stack[h.index];
    if (top && JSON.stringify(top.runs) === JSON.stringify(snap.runs)) {
      top.start = snap.start;
      top.end = snap.end;
      return;
    }
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(snap);
    h.index = h.stack.length - 1;
  };
  const apply = (snap: Snap) => {
    const el = ref.current;
    if (!el) return;
    renderRuns(el, snap.runs);
    setSelectionOffsets(el, snap.start, snap.end);
  };

  // Mount: fill, focus, select everything (an empty new layer just gets the caret), hide the stage's copy.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    renderRuns(el, runsOf(initialText, layer.properties["content.runs"]));
    el.focus({ preventScroll: true });
    setSelectionOffsets(el, 0, initialText.length);
    const first = snapshot();
    if (first) history.current = { stack: [first], index: 0 };
    const node = getStageRendererForLayer(id, getDocument().layers)?.registry.get(id) as HTMLElement | undefined;
    if (node) node.style.visibility = "hidden";
    return () => {
      if (node) node.style.visibility = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the editor is keyed by layer id: it mounts once per edit session
  }, []);

  const finish = () => useCanvasViewStore.getState().stopTextEdit();
  const commit = () => {
    if (done.current) return;
    done.current = true;
    const el = ref.current;
    const current = getDocument().layers[id];
    if (!el || !current) return finish();
    const runs = readRuns(el);
    const text = runsText(runs).slice(0, MAX_TEXT_LENGTH);
    if (text.trim() === "") {
      deleteLayers([id]);
      return finish();
    }
    const json = serializeRuns(runs);
    const oldText = String(current.properties["content.text"] ?? "");
    const oldJson = String(current.properties["content.runs"] ?? "");
    if (text !== oldText || json !== oldJson) documentCommands.updateProps(id, { "content.text": text, "content.runs": json }, "Edit text");
    finish();
  };

  const insertText = (text: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (insertAtSelection(el, text)) record();
  };

  const format = (flag: RunFlag) => {
    const el = ref.current;
    const sel = el ? selectionOffsets(el) : null;
    if (!el || !sel || sel.start === sel.end) return;
    renderRuns(el, toggleFlag(readRuns(el), sel.start, sel.end, flag));
    setSelectionOffsets(el, sel.start, sel.end);
    record();
  };

  const undo = (redo: boolean) => {
    const h = history.current;
    const next = redo ? h.index + 1 : h.index - 1;
    if (next < 0 || next >= h.stack.length) return;
    h.index = next;
    apply(h.stack[next]);
  };

  // `beforeinput` is not part of React's synthetic events in a useful form: listen natively.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onBefore = (e: Event) => {
      const type = (e as InputEvent).inputType;
      if (type === "insertParagraph" || type === "insertLineBreak") {
        e.preventDefault();
        insertText("\n");
      } else if (type === "insertFromDrop" || type === "insertFromPaste" || type === "historyUndo" || type === "historyRedo") {
        e.preventDefault(); // paste is handled below as plain text; undo and redo by the editor's own history
      }
    };
    el.addEventListener("beforeinput", onBefore);
    return () => el.removeEventListener("beforeinput", onBefore);
  }, []);

  const left = box ? box.cx - box.w / 2 : 0;
  const top = box ? box.cy - box.h / 2 : 0;
  const style: React.CSSProperties = {
    position: "absolute",
    left,
    top,
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
    ...textTypography(resolved),
    ...(sizing === "autoWidth" ? { width: "max-content", minWidth: 4, whiteSpace: "pre" } : { width: box?.w ?? 200, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }),
    minHeight: box?.h ?? 24,
    ...(box && box.rot ? { transform: `rotate(${box.rot}deg)` } : {}),
  };

  return (
    <div
      ref={ref}
      className="canvas-text-editor"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-multiline="true"
      aria-label="Edit text"
      data-layer-id={id}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={() => {
        composing.current = false;
        ensureSentinel(ref.current!);
        record();
      }}
      onInput={() => {
        if (ref.current) ensureSentinel(ref.current);
        record();
      }}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
        if (text) insertText(text);
      }}
      onBlur={() => {
        if (!composing.current) commit();
      }}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        e.stopPropagation(); // typing is not a shortcut
        const mod = e.metaKey || e.ctrlKey;
        const key = e.key.toLowerCase();
        if (e.key === "Escape" || (mod && e.key === "Enter")) {
          e.preventDefault();
          commit();
        } else if (e.key === "Enter") {
          e.preventDefault();
          insertText("\n");
        } else if (mod && !e.shiftKey && FORMAT_KEYS[key]) {
          e.preventDefault();
          format(FORMAT_KEYS[key]);
        } else if (mod && e.shiftKey && key === "x") {
          e.preventDefault();
          format("strike");
        } else if (mod && key === "z") {
          e.preventDefault();
          undo(e.shiftKey);
        } else if (mod && key === "y") {
          e.preventDefault();
          undo(true);
        }
      }}
    />
  );
};
