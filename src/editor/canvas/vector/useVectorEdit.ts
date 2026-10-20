"use client";

/**
 * Path edit mode and the vector commands (ROADMAP Phase 40). Enter or a double click on a path starts editing it:
 * drag a node to move it (Shift-click adds to the selection, Shift locks an axis), drag a handle to shape the curve
 * (Alt breaks the pair), press on a segment to add a node there, click an end node while the other end is selected to
 * close the path, double-click a node to make it smooth or sharp, Delete removes the selected nodes. Escape or Enter
 * leaves. Every change is written to the layer when the pointer comes up: one undo step. Also the boolean and
 * flatten commands, which work on the selected layers.
 */

import { useCallback, useEffect, type RefObject } from "react";
import { useCommand, type ContextKeys } from "@/core/commands";
import type { CanvasHitTester } from "@/core/hit/CanvasHitTester";
import { applyPathEdit, booleanLayers, editablePath, flattenLayers, isVectorSource, type LayerBox } from "@/core/editing/vectorOps";
import { deleteLayers } from "@/core/editing/editOps";
import { BOOLEAN_OPS, type BooleanOp } from "@/core/paths/booleans";
import { deleteNodes, hitHandle, hitNode, hitSegment, insertNode, moveHandle, moveNodes, setClosed, toggleSmooth, type EditPath, type HandleSide } from "@/core/paths/pathEdit";
import { getDocument } from "@/core/store/documentState";
import { subscribeToDocumentChanges } from "@/core/store/useDocumentStore";
import { useCameraStore } from "@/core/store/useCameraStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { useToolStore } from "@/core/store/useToolStore";
import { editablePathSelection, isEditingPath, useVectorEditStore } from "@/core/store/useVectorEditStore";
import { screenToDoc, type Point } from "@/core/viewport/camera";
import { layerBox } from "../transformModel";
import { penControls } from "../tools/pathTools";

const penActive = () => !!penControls()?.active();

const SNAP_TOLERANCE = 8; // screen px
const MOVE_SLOP = 2;

type Drag =
  | { kind: "nodes"; start: Point; base: EditPath; indices: number[]; moved: boolean }
  | { kind: "handle"; base: EditPath; index: number; side: HandleSide; moved: boolean };

/** Writes the nodes to the layer (one undo step), and moves the stored box with the layer's new frame. */
function commitEdit(path: EditPath) {
  const store = useVectorEditStore;
  const s = store.getState();
  if (!s.layerId || !s.box) return;
  const layer = getDocument().layers[s.layerId];
  if (!layer) return;
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const origin = { x: s.box.cx - s.box.w / 2 - num(layer.properties["frame.x"]), y: s.box.cy - s.box.h / 2 - num(layer.properties["frame.y"]) };
  if (!applyPathEdit(s.layerId, s.box, path.nodes, path.closed)) return;
  const next = getDocument().layers[s.layerId];
  if (!next) return;
  const w = num(next.properties["frame.width"]);
  const h = num(next.properties["frame.height"]);
  // the layer's new unrotated frame, in the parent's space: the box the next edit starts from
  const ucx = origin.x + num(next.properties["frame.x"]) + w / 2;
  const ucy = origin.y + num(next.properties["frame.y"]) + h / 2;
  store.getState().setBox({ cx: ucx, cy: ucy, w, h, rot: s.box.rot });
}

export function useVectorEdit(containerRef: RefObject<HTMLElement | null>, hitTester: CanvasHitTester, canvasWhen: (ctx: ContextKeys) => boolean) {
  const layerId = useVectorEditStore((s) => s.layerId);

  const boxOf = useCallback(
    (id: string): LayerBox | null => {
      const hit = hitTester.ensure().get(id);
      const layer = getDocument().layers[id];
      return hit && layer ? layerBox(layer, hit.bounds) : null;
    },
    [hitTester],
  );

  /** Starts editing a path layer. False when it can't be edited (a compound path, a locked layer, nothing there). */
  const enterEdit = useCallback(
    (id: string): boolean => {
      const layer = getDocument().layers[id];
      const box = boxOf(id);
      if (!layer || !box || layer.locked === true) return false;
      const sub = editablePath(layer, box);
      if (!sub) return false;
      useSelectionStore.getState().select(id, "element");
      useVectorEditStore.getState().enter(id, sub.nodes, sub.closed, box);
      return true;
    },
    [boxOf],
  );

  /** `enterEdit`, trying again for a moment when the layer was only just made and the stage hasn't measured it yet. */
  const enterEditSoon = useCallback(
    (id: string) => {
      if (enterEdit(id)) return;
      let tries = 0;
      const again = () => {
        if (!getDocument().layers[id] || useSelectionStore.getState().selectedIds[0] !== id || isEditingPath()) return;
        if (!enterEdit(id) && ++tries < 20) window.setTimeout(again, 50);
      };
      window.setTimeout(again, 50);
    },
    [enterEdit],
  );

  // --- the editing gestures ---------------------------------------------------------
  useEffect(() => {
    if (!layerId) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;
    const store = useVectorEditStore;
    const worldOf = (e: { clientX: number; clientY: number }): Point => {
      const r = el.getBoundingClientRect();
      return screenToDoc(useCameraStore.getState().camera, { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    const tol = () => SNAP_TOLERANCE / (useCameraStore.getState().camera.zoom || 1);
    const current = (): EditPath => ({ nodes: store.getState().nodes, closed: store.getState().closed });

    let drag: Drag | null = null;

    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const w = worldOf(e);
      if (drag.kind === "nodes") {
        let dx = w.x - drag.start.x;
        let dy = w.y - drag.start.y;
        if (!drag.moved && Math.hypot(dx, dy) * (useCameraStore.getState().camera.zoom || 1) < MOVE_SLOP) return;
        drag.moved = true;
        if (e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        const next = moveNodes(drag.base, drag.indices, dx, dy);
        store.getState().set(next.nodes, next.closed);
      } else {
        drag.moved = true;
        const next = moveHandle(drag.base, drag.index, drag.side, w, e.altKey);
        store.getState().set(next.nodes, next.closed);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      const d = drag;
      drag = null;
      if (d?.moved) commitEdit(current());
    };
    const begin = (d: Drag) => {
      drag = d;
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    };

    const onDown = (e: PointerEvent) => {
      // the middle button and a held Space still pan the canvas
      if (e.button !== 0 || useToolStore.getState().current === "pan") return;
      e.stopPropagation();
      e.preventDefault();
      const st = store.getState();
      const path = current();
      const w = worldOf(e);
      const handle = hitHandle(path, w, tol(), st.selected);
      if (handle) {
        begin({ kind: "handle", base: path, index: handle.index, side: handle.side, moved: false });
        return;
      }
      const node = hitNode(path, w, tol());
      if (node !== null) {
        const last = path.nodes.length - 1;
        // an end node clicked while the other end is the selection closes the path
        if (!path.closed && path.nodes.length > 2 && st.selected.length === 1 && ((node === 0 && st.selected[0] === last) || (node === last && st.selected[0] === 0))) {
          const closed = setClosed(path, true);
          store.getState().set(closed.nodes, true, [node]);
          commitEdit(closed);
          return;
        }
        let selected = st.selected;
        if (e.shiftKey) selected = selected.includes(node) ? selected.filter((i) => i !== node) : [...selected, node];
        else if (!selected.includes(node)) selected = [node];
        store.getState().select(selected);
        if (selected.includes(node)) begin({ kind: "nodes", start: w, base: path, indices: selected, moved: false });
        return;
      }
      const seg = hitSegment(path, w, tol() * 0.75);
      if (seg) {
        const inserted = insertNode(path, seg.seg, seg.t);
        if (inserted.index >= 0) {
          store.getState().set(inserted.path.nodes, inserted.path.closed, [inserted.index]);
          commitEdit(inserted.path);
          begin({ kind: "nodes", start: w, base: inserted.path, indices: [inserted.index], moved: false });
        }
        return;
      }
      store.getState().select([]);
    };

    const onDouble = (e: MouseEvent) => {
      if (useToolStore.getState().current === "pan") return;
      e.stopPropagation();
      e.preventDefault();
      const path = current();
      const node = hitNode(path, worldOf(e), tol());
      if (node === null) {
        store.getState().exit();
        return;
      }
      const next = toggleSmooth(path, node);
      store.getState().set(next.nodes, next.closed, [node]);
      commitEdit(next);
    };

    el.addEventListener("pointerdown", onDown, true);
    el.addEventListener("dblclick", onDouble, true);
    // the selection moved to something else: leave
    const offSel = useSelectionStore.subscribe((s) => {
      if (s.selectedIds.length !== 1 || s.selectedIds[0] !== layerId) store.getState().exit();
    });
    // the layer is gone, or undo and redo changed it under the draft: leave
    const offDoc = subscribeToDocumentChanges((change) => {
      if (change.source === "undo" || change.source === "redo" || change.source === "history" || !getDocument().layers[layerId]) store.getState().exit();
    });
    return () => {
      el.removeEventListener("pointerdown", onDown, true);
      el.removeEventListener("dblclick", onDouble, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      offSel();
      offDoc();
    };
  }, [layerId, containerRef]);

  // --- commands ---------------------------------------------------------------------
  const selection = () => useSelectionStore.getState().selectedIds;
  useCommand(
    {
      id: "path.edit",
      title: "Edit Path",
      category: "Vector",
      keybinding: "Enter",
      when: (ctx) => canvasWhen(ctx) && !penActive() && (isEditingPath() || editablePathSelection() !== null),
      run: () => {
        if (isEditingPath()) useVectorEditStore.getState().exit();
        else {
          const id = editablePathSelection();
          if (id) enterEditSoon(id);
        }
      },
    },
    [canvasWhen, enterEditSoon],
  );
  useCommand(
    {
      id: "path.exitEdit",
      title: "Leave Path Editing",
      category: "Vector",
      keybinding: "Escape",
      when: (ctx) => canvasWhen(ctx) && isEditingPath(),
      run: () => useVectorEditStore.getState().exit(),
    },
    [canvasWhen],
  );
  useCommand(
    {
      id: "path.deleteNodes",
      title: "Delete Selected Nodes",
      category: "Vector",
      keybinding: ["Delete", "Backspace"],
      when: (ctx) => canvasWhen(ctx) && isEditingPath() && useVectorEditStore.getState().selected.length > 0,
      run: () => {
        const st = useVectorEditStore.getState();
        const next = deleteNodes({ nodes: st.nodes, closed: st.closed }, st.selected);
        if (next.nodes.length < 2) {
          const id = st.layerId;
          st.exit();
          if (id) deleteLayers([id]);
          return;
        }
        st.set(next.nodes, next.closed, []);
        if (st.box && st.layerId) {
          commitEdit(next);
        }
      },
    },
    [canvasWhen],
  );
  useCommand(
    {
      id: "path.toggleSmooth",
      title: "Make Node Smooth or Sharp",
      category: "Vector",
      when: (ctx) => canvasWhen(ctx) && isEditingPath() && useVectorEditStore.getState().selected.length > 0,
      run: () => {
        const st = useVectorEditStore.getState();
        let path: EditPath = { nodes: st.nodes, closed: st.closed };
        for (const i of st.selected) path = toggleSmooth(path, i);
        st.set(path.nodes, path.closed);
        commitEdit(path);
      },
    },
    [canvasWhen],
  );
  const combine = (op: BooleanOp) => () => {
    const id = booleanLayers(op, selection(), boxOf);
    if (id) useSelectionStore.getState().select(id, "element");
  };
  const canCombine = (ctx: ContextKeys) => canvasWhen(ctx) && !isEditingPath() && selection().filter((id) => isVectorSource(getDocument().layers[id])).length >= 2;
  for (const op of BOOLEAN_OPS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- BOOLEAN_OPS is a constant list: the same hooks run in the same order every render
    useCommand({ id: `boolean.${op}`, title: `${op[0].toUpperCase()}${op.slice(1)} Selection`, category: "Vector", when: canCombine, run: combine(op) }, [canvasWhen, boxOf]);
  }
  useCommand(
    {
      id: "vector.flatten",
      title: "Flatten to Path",
      category: "Vector",
      when: (ctx) => canvasWhen(ctx) && !isEditingPath() && selection().some((id) => isVectorSource(getDocument().layers[id]) && getDocument().layers[id].archetype !== "svgPath"),
      run: () => {
        const ids = flattenLayers(selection(), boxOf);
        if (ids.length > 0) useSelectionStore.getState().selectMultiple(ids, "element");
      },
    },
    [canvasWhen, boxOf],
  );

  return { enterEdit };
}
