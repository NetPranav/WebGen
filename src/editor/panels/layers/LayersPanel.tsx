"use client";

/**
 * ============================================================================
 * LAYERS PANEL (ROADMAP Phase 32)
 * ============================================================================
 * The layer tree beside the stage: click to select (Shift for a range, Cmd/Ctrl to add), double-click to rename,
 * eye and lock buttons, drag to reorder or move into another frame or group, search, and the same right-click menu
 * as the canvas. The list is virtualised: only the rows in view are in the DOM, so a document of thousands of
 * layers scrolls as smoothly as a small one. It replaces the old outliner.
 *
 * A drag asks `canReparent` before it drops and says why when the answer is no. Every change is a command.
 * ============================================================================
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Component, Diamond, ChevronDown, ChevronRight, Circle, Eye, EyeOff, Frame, Image as ImageIcon, Lock, LockOpen, Minus, MousePointerClick, Search, Square, Star, Hexagon, Type, X, MoveUpRight,
} from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { useOwnFocusScope } from "@/core/commands";
import { buildRows, ancestorsOf, rangeBetween, type LayerRow } from "@/core/layers/layerTree";
import { canReparent } from "@/core/layers/reparent";
import { layerMenu } from "@/core/editing/layerMenu";
import { selectionRoots } from "@/core/editing/editOps";
import { CLIP_MARK, mirrorRead } from "@/core/editing/clipboard";
import { frameIdOf } from "@/core/frames/frames";
import { useDocument, useLayers } from "@/core/store/useDocumentStore";
import { motionIndex, motionLabel, type MotionSummary } from "@/core/timeline/model";
import { useTimelineUiStore } from "@/core/store/useTimelineUiStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { useCanvasViewStore } from "@/core/store/useCanvasViewStore";
import { useLayersUiStore } from "@/core/store/useLayersUiStore";
import { CanvasContextMenu, type ContextMenuState } from "@/editor/canvas/CanvasContextMenu";
import "@/editor/styles/layers.css";

const ROW_HEIGHT = 28;
const OVERSCAN = 8;
const INDENT = 14;
const DRAG_SLOP = 4;

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  container: Frame, form: Frame, svgGroup: Frame, background: Frame,
  text: Type, svgText: Type, image: ImageIcon,
  rectangle: Square, ellipse: Circle, polygon: Hexagon, star: Star, line: Minus, arrow: MoveUpRight,
  button: MousePointerClick, toggle: MousePointerClick, fab: MousePointerClick,
};

type DropPlace = "before" | "inside" | "after";

interface Drop {
  rowId: string;
  place: DropPlace;
  parentId: string | null;
  index: number | undefined;
  ok: boolean;
  reason: string;
}

/** Where a drop at `place` on `row` puts the dragged layers, and whether that is allowed. */
function dropTarget(layers: ReturnType<typeof useLayers>, row: LayerRow, place: DropPlace, dragIds: readonly string[]): Drop {
  const moving = new Set(dragIds);
  let parentId: string | null;
  let index: number | undefined;
  if (place === "inside") {
    parentId = row.id;
    index = layers[row.id].children.filter((c) => !moving.has(c)).length; // the front
  } else {
    parentId = row.parentId;
    const siblings = parentId === null ? [] : layers[parentId].children.filter((c) => !moving.has(c));
    const at = siblings.indexOf(row.id);
    index = parentId === null ? undefined : place === "before" ? at + 1 : at; // rows run front to back, children back to front
  }
  if (parentId === null && place !== "inside") {
    return { rowId: row.id, place, parentId, index, ok: false, reason: "Frames are ordered by where they sit on the canvas." };
  }
  const verdict = canReparent(layers, dragIds, parentId);
  return { rowId: row.id, place, parentId, index, ok: verdict.ok, reason: verdict.ok ? "" : verdict.reason };
}

interface RowProps {
  row: LayerRow;
  top: number;
  selected: boolean;
  drop: Drop | null;
  renaming: boolean;
  dragging: boolean;
  query: string;
  /** What the layer animates (Phase 61), for the motion badge. */
  motion: MotionSummary | undefined;
  onPointerDown: (e: React.PointerEvent, row: LayerRow) => void;
  onToggle: (row: LayerRow) => void;
  onContextMenu: (e: React.MouseEvent, row: LayerRow) => void;
  onRename: (row: LayerRow | null) => void;
  onCommitName: (row: LayerRow, name: string) => void;
}

const Row = memo(function Row({ row, top, selected, drop, renaming, dragging, query, motion, onPointerDown, onToggle, onContextMenu, onRename, onCommitName }: RowProps) {
  const Icon = row.component === "main" ? Component : row.component === "instance" ? Diamond : (ICONS[row.archetype] ?? Box);
  const dimmed = row.hidden || row.hiddenByAncestor;
  const locked = row.locked || row.lockedByAncestor;
  const cls = [
    "layers-row",
    selected && "layers-row--selected",
    dimmed && "layers-row--hidden",
    locked && "layers-row--locked",
    row.context && "layers-row--context",
    dragging && "layers-row--dragging",
    drop && drop.place === "inside" && (drop.ok ? "layers-row--drop-inside" : "layers-row--drop-refused"),
    drop && drop.place === "before" && (drop.ok ? "layers-row--drop-before" : "layers-row--drop-refused-before"),
    drop && drop.place === "after" && (drop.ok ? "layers-row--drop-after" : "layers-row--drop-refused-after"),
  ].filter(Boolean).join(" ");
  const [draft, setDraft] = useState(row.name);
  const q = query.trim();
  const at = q ? row.name.toLowerCase().indexOf(q.toLowerCase()) : -1;
  return (
    <div
      role="treeitem"
      aria-level={row.depth + 1}
      aria-selected={selected}
      aria-expanded={row.hasChildren ? row.expanded : undefined}
      className={cls}
      data-layer-row={row.id}
      data-depth={row.depth}
      style={{ transform: `translateY(${top}px)`, height: ROW_HEIGHT, paddingLeft: 6 + row.depth * INDENT }}
      onPointerDown={(e) => onPointerDown(e, row)}
      onContextMenu={(e) => onContextMenu(e, row)}
    >
      {row.hasChildren ? (
        <button type="button" className="layers-row__chevron" aria-label={row.expanded ? `Collapse ${row.name}` : `Expand ${row.name}`} onClick={() => onToggle(row)} onPointerDown={(e) => e.stopPropagation()}>
          {row.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      ) : (
        <span className="layers-row__chevron" aria-hidden />
      )}
      <span className="layers-row__icon" aria-hidden><Icon size={13} /></span>
      {renaming ? (
        <input
          className="layers-row__rename"
          aria-label="Layer name"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") onCommitName(row, draft);
            else if (e.key === "Escape") onRename(null);
          }}
          onBlur={() => onCommitName(row, draft)}
        />
      ) : (
        <span className="layers-row__name" onDoubleClick={() => { setDraft(row.name); onRename(row); }}>
          {at >= 0 ? (
            <>
              {row.name.slice(0, at)}
              <mark>{row.name.slice(at, at + q.length)}</mark>
              {row.name.slice(at + q.length)}
            </>
          ) : (
            row.name
          )}
        </span>
      )}
      <span className="layers-row__spacer" />
      {motion && (motion.clips > 0 || motion.states > 0) && (
        <button
          type="button"
          className="layers-row__motion"
          aria-label={`${row.name}: ${motionLabel(motion)}. Open in the timeline`}
          title={`${motionLabel(motion)}. Click to open in the timeline.`}
          data-motion-badge={row.id}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            useSelectionStore.getState().selectMultiple([row.id], "element");
            useTimelineUiStore.getState().focusLayer(row.id);
            void invokeCommand("view.timeline");
          }}
        >
          {motion.clips > 0 ? motion.clips : "·"}
          {motion.states > 0 ? ` +${motion.states}` : ""}
        </button>
      )}
      <button type="button" className={`layers-row__btn ${row.locked ? "layers-row__btn--on" : ""}`} aria-label={row.locked ? `Unlock ${row.name}` : `Lock ${row.name}`} aria-pressed={row.locked} onPointerDown={(e) => e.stopPropagation()} onClick={() => void invokeCommand("layer.setLocked", { ids: [row.id], locked: !row.locked })}>
        {row.locked ? <Lock size={12} /> : <LockOpen size={12} />}
      </button>
      <button type="button" className={`layers-row__btn ${row.hidden ? "layers-row__btn--on" : ""}`} aria-label={row.hidden ? `Show ${row.name}` : `Hide ${row.name}`} aria-pressed={row.hidden} onPointerDown={(e) => e.stopPropagation()} onClick={() => void invokeCommand("layer.setVisible", { ids: [row.id], visible: row.hidden })}>
        {row.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
});

export const LayersPanel: React.FC = () => {
  const layers = useLayers();
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const expanded = useLayersUiStore((s) => s.expanded);
  const query = useLayersUiStore((s) => s.query);
  const rootRef = useOwnFocusScope<HTMLDivElement>("canvas"); // Delete, Duplicate, arrows and the rest work while the pointer is over the list
  const scroller = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(400);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [drag, setDrag] = useState<{ ids: string[]; drop: Drop | null } | null>(null);
  const [message, setMessage] = useState<string>("");
  const dragRef = useRef<{ id: string; x: number; y: number; ids: string[]; active: boolean } | null>(null);
  const revealRef = useRef<string | null>(null);
  const dragStateRef = useRef(drag);
  useEffect(() => {
    dragStateRef.current = drag;
  }, [drag]);

  const rows = useMemo(() => buildRows(layers, expanded, query), [layers, expanded, query]);
  // What each layer animates, for the motion badges (Phase 61). One pass over the clips and states, recomputed only when they change.
  const clips = useDocument((d) => d.clips);
  const states = useDocument((d) => d.states);
  const behaviours = useDocument((d) => d.behaviours);
  const motion = useMemo(() => motionIndex({ layers, clips, states, behaviours }), [layers, clips, states, behaviours]);
  const rowsRef = useRef(rows);
  const layersRef = useRef(layers);
  useEffect(() => {
    rowsRef.current = rows;
    layersRef.current = layers;
  }, [rows, layers]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  // viewport height
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    setHeight(el.clientHeight);
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A selection made elsewhere (the canvas) opens the layers above it and scrolls it into view.
  useEffect(() => {
    const id = selectedIds[selectedIds.length - 1];
    if (!id || !layers[id]) return;
    useLayersUiStore.getState().expandAll(ancestorsOf(layers, id));
    revealRef.current = id;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reveal on a change of selection, not on every document edit
  }, [selectedIds]);
  useEffect(() => {
    const id = revealRef.current;
    const el = scroller.current;
    if (!id || !el) return;
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) return;
    revealRef.current = null;
    const top = i * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_HEIGHT > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_HEIGHT - el.clientHeight;
  }, [rows]);

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN);

  const select = useCallback((ids: string[]) => {
    const store = useSelectionStore.getState();
    if (ids.length === 0) store.clearSelection();
    else store.selectMultiple(ids, "element");
    const frame = ids.length ? frameIdOf(layersRef.current, ids[ids.length - 1]) : null;
    if (frame) useCanvasViewStore.getState().setActiveFrame(frame);
  }, []);

  const place = (clientY: number): { row: LayerRow; where: DropPlace } | null => {
    const el = scroller.current;
    if (!el) return null;
    const y = clientY - el.getBoundingClientRect().top + el.scrollTop;
    const row = rowsRef.current[Math.floor(y / ROW_HEIGHT)];
    if (!row) return null;
    const f = (y - Math.floor(y / ROW_HEIGHT) * ROW_HEIGHT) / ROW_HEIGHT;
    return { row, where: f < 0.25 ? "before" : f > 0.75 ? "after" : "inside" };
  };

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent, row: LayerRow) => {
    if (e.button !== 0) return;
    const ui = useLayersUiStore.getState();
    const store = useSelectionStore.getState();
    if (e.shiftKey) {
      select(rangeBetween(rowsRef.current, ui.anchor ?? store.selectedIds[store.selectedIds.length - 1] ?? row.id, row.id));
    } else if (e.metaKey || e.ctrlKey) {
      select(store.selectedIds.includes(row.id) ? store.selectedIds.filter((x) => x !== row.id) : [...store.selectedIds, row.id]);
      ui.setAnchor(row.id);
    } else {
      if (!store.selectedIds.includes(row.id)) select([row.id]); // pressing on a selected row keeps the selection, so a drag moves it all
      ui.setAnchor(row.id);
    }
    const ids = useSelectionStore.getState().selectedIds.includes(row.id) ? selectionRoots(useSelectionStore.getState().selectedIds) : [row.id];
    dragRef.current = { id: row.id, x: e.clientX, y: e.clientY, ids, active: false };
    setMessage("");
  }, [select]);

  // The drag lives on window, so it keeps going when the pointer leaves the panel.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.active) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_SLOP) return;
        d.active = true;
      }
      const el = scroller.current;
      if (el) {
        const r = el.getBoundingClientRect();
        if (e.clientY < r.top + 24) el.scrollTop -= 12; // scroll when the pointer nears an edge
        else if (e.clientY > r.bottom - 24) el.scrollTop += 12;
      }
      const hit = place(e.clientY);
      const over = el ? e.clientX >= el.getBoundingClientRect().left && e.clientX <= el.getBoundingClientRect().right : false;
      const drop = hit && over ? dropTarget(layersRef.current, hit.row, hit.where, d.ids) : null;
      setDrag({ ids: d.ids, drop });
      setMessage(drop && !drop.ok ? drop.reason : "");
    };
    const up = () => {
      const d = dragRef.current;
      if (!d) return;
      const current = dragStateRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d.active || !current?.drop) return;
      if (!current.drop.ok) {
        setMessage(current.drop.reason);
        return;
      }
      void invokeCommand("layer.move", { ids: d.ids, parentId: current.drop.parentId, index: current.drop.index });
      if (current.drop.place === "inside") useLayersUiStore.getState().setExpanded(current.drop.rowId, true);
      setMessage("");
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragRef.current?.active) {
        endDrag();
        setMessage("");
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key, true);
    };
  }, [endDrag]);

  const onToggle = useCallback((row: LayerRow) => useLayersUiStore.getState().setExpanded(row.id, !row.expanded), []);
  const onContextMenu = useCallback((e: React.MouseEvent, row: LayerRow) => {
    e.preventDefault();
    const store = useSelectionStore.getState();
    if (!store.selectedIds.includes(row.id)) select([row.id]);
    const host = rootRef.current?.getBoundingClientRect();
    setMenu({ x: e.clientX - (host?.left ?? 0), y: e.clientY - (host?.top ?? 0), entries: layerMenu(useSelectionStore.getState().selectedIds, (mirrorRead() ?? "").startsWith(CLIP_MARK)) });
  }, [select, rootRef]);
  const onCommitName = useCallback((row: LayerRow, name: string) => {
    setRenamingId(null);
    if (name.trim() && name !== row.name) void invokeCommand("layer.setName", { id: row.id, name });
  }, []);
  const onRename = useCallback((row: LayerRow | null) => setRenamingId(row?.id ?? null), []);

  const dropFor = drag?.drop ?? null;
  const dragging = new Set(drag?.ids ?? []);

  return (
    <div ref={rootRef} className="layers-panel panel-shell" role="region" aria-label="Layers" style={{ position: "relative" }}>
      <div className="layers-panel__search">
        <Search size={12} aria-hidden />
        <input type="search" aria-label="Search layers" placeholder="Search layers" value={query} onChange={(e) => useLayersUiStore.getState().setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        {query && (
          <button type="button" className="layers-row__btn" aria-label="Clear search" onClick={() => useLayersUiStore.getState().setQuery("")}>
            <X size={12} />
          </button>
        )}
      </div>
      <div ref={scroller} className="layers-panel__scroll" role="tree" aria-label="Layer tree" aria-multiselectable="true" onScroll={(e) => setScrollTop((e.target as HTMLElement).scrollTop)}>
        <div style={{ height: rows.length * ROW_HEIGHT, position: "relative" }}>
          {rows.slice(first, last).map((row, k) => (
            <Row
              key={row.id}
              row={row}
              top={(first + k) * ROW_HEIGHT}
              selected={selected.has(row.id)}
              drop={dropFor && dropFor.rowId === row.id ? dropFor : null}
              renaming={renamingId === row.id}
              dragging={dragging.has(row.id) && drag !== null}
              query={query}
              motion={motion.get(row.id)}
              onPointerDown={onPointerDown}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
              onRename={onRename}
              onCommitName={onCommitName}
            />
          ))}
        </div>
        {rows.length === 0 && <div className="layers-panel__empty">{query ? "No layer matches." : "No layers yet. Draw a frame to start."}</div>}
      </div>
      <div className="layers-panel__status" role="status" aria-live="polite" data-refused={drag?.drop && !drag.drop.ok ? "true" : "false"}>
        {message}
      </div>
      <CanvasContextMenu menu={menu} onClose={() => setMenu(null)} />
    </div>
  );
};
