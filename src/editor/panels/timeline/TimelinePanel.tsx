"use client";

/**
 * ============================================================================
 * TIMELINE PANEL (ROADMAP Phase 61)
 * ============================================================================
 * An After Effects-style timeline under the canvas. Left: one row per layer, in the Layers panel's order, with the
 * switches (visible, solo, lock, shy, motion blur), the blend mode and the parent. Right: a time ruler (timecode or
 * frames), the work area, composition markers, each layer's time bar (drag an end to trim it, drag the middle to move
 * it) and the current-time indicator. Every edit is a command (Law 20) and one undo step; a drag shows a preview and
 * commits on release. The current-time indicator is painted by the frame scheduler, not by React (Law 12).
 * ============================================================================
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { invokeCommand, useOwnFocusScope } from "@/core/commands";
import { useDocument } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { useLayersUiStore } from "@/core/store/useLayersUiStore";
import { useTimelineUiStore } from "@/core/store/useTimelineUiStore";
import { frameScheduler } from "@/core/time/scheduler";
import { getTransport, snapToFrame, transport, transportStore } from "@/core/time/transport";
import { useTransportTime } from "@/core/time/useTransportTime";
import { formatTimecode } from "@/core/time/transport";
import { BLEND_MODES, buildTimelineItems, rulerLabel, slideBar, snapTime, stepZoom, tickStep, trimIn, trimOut, type TimelineItem, type TimelineRow } from "@/core/timeline/model";
import { RULER_HEIGHT, ROW_HEIGHT, drawLanes, hitKey, keysInBox, laneRows, visibleWindow, type BoxSelect } from "@/core/timeline/lanes";
import { breadcrumbs, compositionTabs, nestedRows, type NestedRow } from "@/core/timeline/tabs";
import { allKeyframeIds } from "@/core/timeline/keyframeOps";
import { evaluate } from "@/core/kernel/evaluate";
import { getDocument } from "@/core/store/documentState";
import { parentChoices } from "@/core/timeline/timelineOps";
import type { CompositionLayer } from "@/core/document/compositions";
import "@/editor/styles/timeline.css";

const HEAD_WIDTH = 500;

/** Runs `fn` once, in the next frame of the editor's frame loop (one loop for everything, Law 12). */
function nextFrame(fn: () => void): void {
  const off = frameScheduler.register("render", () => {
    off();
    fn();
  });
}

type BarDrag = { layerId: string; kind: "in" | "out" | "slide"; startX: number; origin: CompositionLayer; preview: CompositionLayer };
type AreaDrag = { edge: "start" | "end"; startX: number; origin: { start: number; end: number }; preview: { start: number; end: number } };

interface RowProps {
  row: TimelineRow;
  selected: boolean;
  flashing: boolean;
  propsOpen: boolean;
  bar: CompositionLayer;
  duration: number;
  pps: number;
  onSelect: (id: string, additive: boolean) => void;
  onBarPointerDown: (e: React.PointerEvent, row: TimelineRow, kind: BarDrag["kind"]) => void;
  onLanePointerDown: (e: React.PointerEvent) => void;
}

/** The parent picker lists its choices only when it opens (listing them for every row on every edit would be quadratic). */
const ParentSelect: React.FC<{ row: TimelineRow }> = ({ row }) => {
  const [choices, setChoices] = useState<Array<{ id: string; name: string }> | null>(null);
  const doc = useDocument((d) => d.layers[row.id]?.parentId ?? null);
  const options = choices ?? (row.parentId ? [{ id: row.parentId, name: row.parentName ?? row.parentId }] : []);
  return (
    <select
      className="timeline__select"
      aria-label={`Parent of ${row.name}`}
      value={doc ?? ""}
      onFocus={() => setChoices(parentChoices(row.id))}
      onMouseDown={() => setChoices(parentChoices(row.id))}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => void invokeCommand("layer.move", { ids: [row.id], parentId: e.target.value === "" ? null : e.target.value })}
    >
      <option value="">None</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
};

const Row = memo(function Row({ row, selected, flashing, propsOpen, bar, duration, pps, onSelect, onBarPointerDown, onLanePointerDown }: RowProps) {
  const dimmed = row.hidden || row.hiddenByAncestor;
  const locked = row.locked || row.lockedByAncestor;
  const set = (key: "solo" | "shy" | "motionBlur", on: boolean) => void invokeCommand("layer.setSwitch", { ids: [row.id], switch: key, on });
  const button = (label: string, pressed: boolean, onClick: () => void, glyph: string, title = label) => (
    <button type="button" className={`timeline__switch${pressed ? " timeline__switch--on" : ""}`} aria-label={label} title={title} aria-pressed={pressed} onPointerDown={(e) => e.stopPropagation()} onClick={onClick}>
      {glyph}
    </button>
  );
  return (
    <div
      className={`timeline__row${selected ? " timeline__row--selected" : ""}${dimmed ? " timeline__row--hidden" : ""}${flashing ? " timeline__row--flash" : ""}`}
      role="row"
      data-timeline-row={row.id}
      style={{ height: ROW_HEIGHT }}
    >
      <div className="timeline__head" role="rowheader" style={{ width: HEAD_WIDTH }} onPointerDown={(e) => onSelect(row.id, e.shiftKey || e.ctrlKey || e.metaKey)}>
        <span className="timeline__indent" style={{ width: row.depth * 12 }} aria-hidden />
        {row.hasChildren ? (
          <button
            type="button"
            className="timeline__chevron"
            aria-label={`${row.expanded ? "Hide" : "Show"} children of ${row.name}`}
            aria-expanded={row.expanded}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => useLayersUiStore.getState().setExpanded(row.id, !row.expanded)}
          >
            {row.expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="timeline__chevron" aria-hidden />
        )}
        <button
          type="button"
          className={`timeline__props-toggle${propsOpen ? " timeline__props-toggle--open" : ""}`}
          aria-label={`${propsOpen ? "Hide" : "Show"} properties of ${row.name}`}
          aria-expanded={propsOpen}
          title="Properties and stopwatches"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => useTimelineUiStore.getState().toggleOpen(row.id)}
        >
          {propsOpen ? "▾" : "▸"}P
        </button>
        {button(row.hidden ? `Show ${row.name}` : `Hide ${row.name}`, !row.hidden, () => void invokeCommand("layer.setVisible", { ids: [row.id], visible: row.hidden }), row.hidden ? "◌" : "●", row.hidden ? "Hidden" : "Visible")}
        {button(`Solo ${row.name}`, row.solo, () => set("solo", !row.solo), "S", "Solo: draw only this layer")}
        {button(row.locked ? `Unlock ${row.name}` : `Lock ${row.name}`, row.locked, () => void invokeCommand("layer.setLocked", { ids: [row.id], locked: !row.locked }), "🔒", "Lock")}
        {button(`Shy ${row.name}`, row.shy, () => set("shy", !row.shy), "~", "Shy: can be hidden from this list")}
        {button(`Motion blur ${row.name}`, row.motionBlur, () => set("motionBlur", !row.motionBlur), "≋", "Motion blur")}
        <span className={`timeline__name${locked ? " timeline__name--locked" : ""}`} title={row.name}>
          {row.name}
        </span>
        <select
          className="timeline__select timeline__select--blend"
          aria-label={`Blend mode of ${row.name}`}
          value={row.blendMode}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => void invokeCommand("layer.setProps", { ids: [row.id], props: { "appearance.blendMode": e.target.value }, label: "Set blend mode" })}
        >
          {BLEND_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <ParentSelect row={row} />
      </div>
      <div className="timeline__lane" role="gridcell" style={{ width: duration * pps }} onPointerDown={onLanePointerDown}>
        <div
          className={`timeline__bar${row.trimmed ? " timeline__bar--trimmed" : ""}${row.motion.clips > 0 ? " timeline__bar--animated" : ""}`}
          data-layer-bar={row.id}
          data-in={bar.in}
          data-out={bar.out}
          style={{ left: bar.in * pps, width: Math.max(2, (bar.out - bar.in) * pps) }}
          title={`${row.name}: ${bar.in.toFixed(3)} s to ${bar.out.toFixed(3)} s`}
          onPointerDown={(e) => onBarPointerDown(e, row, "slide")}
        >
          <span className="timeline__trim timeline__trim--in" role="slider" aria-label={`Trim in point of ${row.name}`} aria-valuenow={bar.in} onPointerDown={(e) => onBarPointerDown(e, row, "in")} />
          <span className="timeline__bar-label">{row.name}</span>
          <span className="timeline__trim timeline__trim--out" role="slider" aria-label={`Trim out point of ${row.name}`} aria-valuenow={bar.out} onPointerDown={(e) => onBarPointerDown(e, row, "out")} />
        </div>
      </div>
    </div>
  );
});


const SIDE = 28;

type PropertyItem = Extract<TimelineItem, { kind: "property" }>;

const formatValue = (value: unknown): string => {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (value === undefined || value === null) return "–";
  return String(value);
};

/** A group row (Transform, Appearance, …) that opens to its properties. */
const GroupRow: React.FC<{ item: Extract<TimelineItem, { kind: "group" }>; duration: number; pps: number; onLanePointerDown: (e: React.PointerEvent) => void }> = ({ item, duration, pps, onLanePointerDown }) => (
  <div className="timeline__row timeline__row--group" role="row" data-timeline-group={`${item.layerId}|${item.group}`} style={{ height: ROW_HEIGHT }}>
    <div className="timeline__head" role="rowheader" style={{ width: HEAD_WIDTH, paddingLeft: SIDE + 6 }}>
      <button
        type="button"
        className="timeline__chevron"
        aria-label={`${item.open ? "Hide" : "Show"} ${item.label} of ${item.layerName}`}
        aria-expanded={item.open}
        onClick={() => useTimelineUiStore.getState().toggleOpen(`${item.layerId}|${item.group}`)}
      >
        {item.open ? "▾" : "▸"}
      </button>
      <span className="timeline__name">{item.label}</span>
      <span className="timeline__count">{item.count}</span>
    </div>
    <div className="timeline__lane" style={{ width: duration * pps }} onPointerDown={onLanePointerDown} />
  </div>
);

/**
 * A property row: its stopwatch, its value at the playhead and a button to key it. Its keyframes are painted on the
 * canvas over the lanes (Phase 64), so the lane carries them as data attributes for tests and screen readers.
 */
const PropertyRow: React.FC<{ item: PropertyItem; compositionId: string; duration: number; pps: number; onLanePointerDown: (e: React.PointerEvent, item: PropertyItem) => void }> = ({ item, compositionId, duration, pps, onLanePointerDown }) => {
  // Animated properties show their value at the playhead (ten times a second); the others show what the layer holds.
  const time = useTransportTime({ maxHz: 10 });
  const shown = item.animated ? (evaluate(getDocument(), compositionId, item.layerId, time)[item.path] ?? item.value) : item.value;
  return (
    <div className={`timeline__row timeline__row--property${item.animated ? " timeline__row--animated" : ""}`} role="row" data-timeline-property={`${item.layerId}|${item.path}`} style={{ height: ROW_HEIGHT }}>
      <div className="timeline__head" role="rowheader" style={{ width: HEAD_WIDTH, paddingLeft: SIDE * 2 + 6 }}>
        <button
          type="button"
          className={`timeline__stopwatch${item.animated ? " timeline__stopwatch--on" : ""}`}
          aria-label={`Animate ${item.label} of ${item.layerName}`}
          aria-pressed={item.animated}
          title={item.animated ? "Stopwatch on: click to remove its keyframes" : "Stopwatch off: click to start keyframing"}
          onClick={() => void invokeCommand("timeline.setStopwatch", { layerId: item.layerId, property: item.path, on: !item.animated })}
        >
          ◷
        </button>
        <button
          type="button"
          className="timeline__addkey"
          aria-label={`Add keyframe for ${item.label} of ${item.layerName} at the playhead`}
          title="Add a keyframe here at the playhead"
          onClick={() => void invokeCommand("timeline.addKeyframe", { layerId: item.layerId, property: item.path })}
        >
          ◆
        </button>
        <span className="timeline__name">{item.label}</span>
        <span className="timeline__value" aria-label={`${item.label} value`}>
          {formatValue(shown)}
        </span>
      </div>
      <div
        className="timeline__lane"
        style={{ width: duration * pps }}
        data-key-count={item.keys.length}
        data-key-times={item.keys.map((k) => k.time.toFixed(3)).join(",")}
        data-key-ids={item.keys.map((k) => k.id).join(",")}
        onPointerDown={(e) => onLanePointerDown(e, item)}
      />
    </div>
  );
};

/** Effects, States, Behaviours and Links list what the layer has. */
const InfoRow: React.FC<{ item: Extract<TimelineItem, { kind: "info" }>; duration: number; pps: number }> = ({ item, duration, pps }) => (
  <div className="timeline__row timeline__row--info" role="row" style={{ height: ROW_HEIGHT }}>
    <div className="timeline__head" role="rowheader" style={{ width: HEAD_WIDTH, paddingLeft: SIDE * 2 + 6 }}>
      <span className="timeline__name">{item.label}</span>
      <span className="timeline__value">{item.detail}</span>
    </div>
    <div className="timeline__lane" style={{ width: duration * pps }} />
  </div>
);

/** A precomp placed in the composition showing: a bar with what is inside it, opened by a double-click (Phase 65). */
const NestedBarRow: React.FC<{ row: NestedRow; duration: number; pps: number; onLanePointerDown: (e: React.PointerEvent) => void }> = ({ row, duration, pps, onLanePointerDown }) => {
  const open = () => void invokeCommand("timeline.openComposition", { compositionId: row.compositionId, fromBar: true });
  return (
    <div className="timeline__row timeline__row--nested" role="row" data-timeline-nested={row.id} style={{ height: ROW_HEIGHT }}>
      <div className="timeline__head" role="rowheader" style={{ width: HEAD_WIDTH, paddingLeft: 8 }}>
        <span className="timeline__nested-tag" aria-hidden>
          precomp
        </span>
        <span className="timeline__name" title={row.layers.length > 0 ? `Animates: ${row.layers.join(", ")}` : "Nothing animated yet"}>
          {row.name}
        </span>
        <span className="timeline__value">{row.keyTimes.length === 0 ? "empty" : `${row.keyTimes.length} key time${row.keyTimes.length === 1 ? "" : "s"}`}</span>
        <button type="button" className="timeline__tool" aria-label={`Open ${row.name}`} onPointerDown={(e) => e.stopPropagation()} onClick={open}>
          Open
        </button>
        <button type="button" className="timeline__tool" aria-label={`Remove ${row.name} from this composition`} onPointerDown={(e) => e.stopPropagation()} onClick={() => void invokeCommand("timeline.removeNested", { nestedId: row.id })}>
          ×
        </button>
      </div>
      <div className="timeline__lane" role="gridcell" style={{ width: duration * pps }} onPointerDown={onLanePointerDown}>
        <div
          className="timeline__bar timeline__bar--nested"
          data-nested-bar={row.id}
          data-in={row.in}
          data-out={row.out}
          style={{ left: row.in * pps, width: Math.max(2, (row.out - row.in) * pps) }}
          title={`${row.name}: ${row.in.toFixed(3)} s to ${row.out.toFixed(3)} s. Double-click to open.`}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={open}
        >
          <span className="timeline__bar-label">{row.name}</span>
          {row.keyTimes.map((t) => (
            <span key={t} className="timeline__nested-key" style={{ left: (t - row.in) * pps }} aria-hidden />
          ))}
        </div>
      </div>
    </div>
  );
};

export const TimelinePanel: React.FC = () => {
  const doc = useDocument((d) => d);
  const compositionId = useStore(transportStore, (t) => t.compositionId);
  const fps = useStore(transportStore, (t) => t.fps);
  const duration = useStore(transportStore, (t) => t.duration);
  const comp = doc.compositions[compositionId];
  const expanded = useLayersUiStore((s) => s.expanded);
  const hideShy = useTimelineUiStore((s) => s.hideShy);
  const pps = useTimelineUiStore((s) => s.pixelsPerSecond);
  const scrollRequest = useTimelineUiStore((s) => s.scrollRequest);
  const seconds = useCallback((px: number) => px / pps, [pps]);
  const open = useTimelineUiStore((s) => s.open);
  const reveal = useTimelineUiStore((s) => s.reveal);
  const rulerMode = useTimelineUiStore((s) => s.rulerMode);
  const focusLayerId = useTimelineUiStore((s) => s.focusLayerId);
  const selectedKeys = useTimelineUiStore((s) => s.selectedKeys);
  const recordMode = useTimelineUiStore((s) => s.recordMode);
  const trail = useTimelineUiStore((s) => s.trail);
  const openPrecomps = useTimelineUiStore((s) => s.openPrecomps);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const time = useTransportTime({ maxHz: 10 });
  const rootRef = useOwnFocusScope<HTMLDivElement>("timeline"); // U, J, K, L, Space and the arrows work while the pointer is over the timeline
  const needleRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const [barDrag, setBarDrag] = useState<BarDrag | null>(null);
  const [areaDrag, setAreaDrag] = useState<AreaDrag | null>(null);
  // Phase 64: the rows in view (scrollTop in whole rows) and the height of the view.
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(600);
  // Phase 66: a keyframe drag in progress (seconds the selected keys are shown moved by) and a box being dragged.
  const [keyDrag, setKeyDrag] = useState<{ delta: number } | null>(null);
  const [box, setBox] = useState<BoxSelect | null>(null);

  const items = useMemo(() => buildTimelineItems(doc, compositionId, expanded, { open, reveal }, { hideShy }), [doc, compositionId, expanded, open, reveal, hideShy]);
  const itemsLive = useRef(items);
  useEffect(() => {
    itemsLive.current = items; // declared before the effects that paint from it
  }, [items]);
  const layerCount = useMemo(() => items.filter((i) => i.kind === "layer").length, [items]);
  const shyCount = useMemo(() => Object.values(doc.layers).filter((l) => l.shy === true).length, [doc.layers]);
  const win = useMemo(() => visibleWindow(items.length, scrollTop, viewHeight), [items.length, scrollTop, viewHeight]);
  const tabs = useMemo(() => compositionTabs(doc, openPrecomps, compositionId), [doc, openPrecomps, compositionId]);
  const crumbs = useMemo(() => breadcrumbs(doc, trail, compositionId), [doc, trail, compositionId]);
  const nested = useMemo(() => nestedRows(doc, compositionId), [doc, compositionId]);

  // Keyframes that no longer exist (undone, deleted, another composition) drop out of the selection.
  useEffect(() => {
    const picked = useTimelineUiStore.getState().selectedKeys;
    if (picked.size === 0) return;
    const alive = new Set(allKeyframeIds(doc, compositionId));
    const keep = [...picked].filter((id) => alive.has(id));
    if (keep.length !== picked.size) useTimelineUiStore.getState().selectKeys(keep);
  }, [doc, compositionId]);

  // The current-time indicator: written to the DOM once per frame, in the scheduler's render phase.
  useEffect(() => {
    const paint = () => {
      const el = needleRef.current;
      if (el) el.style.transform = `translateX(${Math.min(getTransport().time, getTransport().duration) * pps}px)`;
    };
    paint();
    return frameScheduler.register("render", paint);
  }, [pps]);

  // The keyframe canvas (Phase 64): one canvas the size of the view, repainted for what is in it.
  const paintLanes = useCallback(() => {
    const canvas = canvasRef.current;
    const scroller = scrollRef.current;
    if (!canvas || !scroller) return;
    const width = Math.max(0, scroller.clientWidth - HEAD_WIDTH);
    const height = Math.max(0, scroller.clientHeight - RULER_HEIGHT);
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const shift = keyDrag?.delta ?? 0;
    const rows = laneRows(itemsLive.current, visibleWindow(itemsLive.current.length, scroller.scrollTop, scroller.clientHeight, ROW_HEIGHT, 2)).map((row) => (shift === 0 || row.kind !== "property" ? row : { ...row, keys: row.keys.map((k) => (selectedKeys.has(k.id) ? { ...k, time: Math.max(0, k.time + shift) } : k)) }));
    drawLanes(ctx, rows, { pixelsPerSecond: pps, scrollLeft: scroller.scrollLeft, scrollTop: scroller.scrollTop, width, height, selected: selectedKeys });
  }, [pps, selectedKeys, keyDrag]);
  useEffect(() => paintLanes(), [paintLanes, items, win.start, win.end, viewHeight]);

  // Scrolling moves the window of built rows by whole rows and repaints the canvas, once per frame.
  const scrollPending = useRef(false);
  const onScroll = useCallback(() => {
    if (scrollPending.current) return;
    scrollPending.current = true;
    nextFrame(() => {
      scrollPending.current = false;
      const el = scrollRef.current;
      if (!el) return;
      setScrollTop(Math.floor(el.scrollTop / ROW_HEIGHT) * ROW_HEIGHT);
      paintLanes();
    });
  }, [paintLanes]);

  // Zoom (Phase 63): keep the store told how wide the lanes' view is, apply a scroll a zoom command asked for, and
  // Ctrl + wheel zooms around the pointer.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const report = () => {
      useTimelineUiStore.getState().setViewportWidth(Math.max(0, el.clientWidth - HEAD_WIDTH));
      setViewHeight(el.clientHeight || 600);
      paintLanes();
    };
    report();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(report);
    observer?.observe(el);
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const ui = useTimelineUiStore.getState();
      const next = stepZoom(ui.pixelsPerSecond, e.deltaY < 0 ? 1 : -1);
      const anchor = Math.max(0, e.clientX - el.getBoundingClientRect().left - HEAD_WIDTH + el.scrollLeft);
      ui.setZoom(next, Math.max(0, (anchor / ui.pixelsPerSecond) * next - (e.clientX - el.getBoundingClientRect().left - HEAD_WIDTH)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer?.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [paintLanes]);
  useEffect(() => {
    if (scrollRequest === null) return;
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRequest;
    useTimelineUiStore.getState().clearScrollRequest();
    paintLanes();
  }, [scrollRequest, pps, paintLanes]);

  // A motion badge in the Layers panel asks for a layer: bring its row into view (the row flashes while the request lasts).
  // With the rows built only for the view (Phase 64), the list is scrolled to the row first.
  useEffect(() => {
    if (!focusLayerId) return;
    const el = scrollRef.current;
    if (!el) return;
    const index = itemsLive.current.findIndex((i) => i.kind === "layer" && i.row.id === focusLayerId);
    if (index >= 0) {
      const top = index * ROW_HEIGHT;
      if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - RULER_HEIGHT - ROW_HEIGHT) el.scrollTop = top;
    }
    nextFrame(() => el.querySelector<HTMLElement>(`[data-timeline-row="${CSS.escape(focusLayerId)}"]`)?.scrollIntoView({ block: "nearest" }));
  }, [focusLayerId]);

  const select = useCallback((id: string, additive: boolean) => {
    const store = useSelectionStore.getState();
    if (additive) store.toggleSelection(id, "element");
    else store.selectMultiple([id], "element");
  }, []);

  // ---- seeking: press on the ruler or an empty part of a lane, drag to scrub
  const seekFrom = useCallback((clientX: number, el: HTMLElement) => {
    const left = el.getBoundingClientRect().left;
    transport.seek(snapToFrame(Math.max(0, Math.min(getTransport().duration, seconds(clientX - left))), getTransport().fps));
  }, [seconds]);
  const startScrub = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      seekFrom(e.clientX, el);
      const move = (ev: PointerEvent) => seekFrom(ev.clientX, el);
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [seekFrom],
  );

  // ---- keyframes on a property row (Phase 66): press one to select it (Shift adds), drag to move the selection, or
  // Shift-drag on empty lane to box-select. A press on empty lane scrubs, as everywhere else.
  const onKeyLanePointerDown = useCallback(
    (e: React.PointerEvent, item: PropertyItem) => {
      if (e.button !== 0) return;
      const lane = e.currentTarget as HTMLElement;
      const hit = hitKey(item.keys, e.clientX - lane.getBoundingClientRect().left, pps);
      const ui = useTimelineUiStore.getState();
      if (hit) {
        e.stopPropagation();
        e.preventDefault();
        const additive = e.shiftKey || e.ctrlKey || e.metaKey;
        if (additive) ui.selectKeys([hit], "toggle");
        else if (!ui.selectedKeys.has(hit)) ui.selectKeys([hit]);
        const startX = e.clientX;
        const frameFps = getTransport().fps;
        let moved = false;
        let delta = 0;
        const move = (ev: PointerEvent) => {
          if (!moved && Math.abs(ev.clientX - startX) < 3) return;
          moved = true;
          delta = snapTime((ev.clientX - startX) / pps, frameFps);
          setKeyDrag({ delta });
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          setKeyDrag(null);
          if (moved && delta !== 0) void invokeCommand("timeline.moveKeyframes", { delta });
          else if (!moved && !additive) transport.seek(item.keys.find((k) => k.id === hit)?.time ?? getTransport().time);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return;
      }
      if (e.shiftKey) {
        e.stopPropagation();
        e.preventDefault();
        const itemsEl = itemsRef.current;
        if (!itemsEl) return;
        const laneLeft = lane.getBoundingClientRect().left;
        const x0 = e.clientX - laneLeft;
        const y0 = e.clientY - itemsEl.getBoundingClientRect().top;
        let last: BoxSelect = { x0, y0, x1: x0, y1: y0 };
        const move = (ev: PointerEvent) => {
          last = { x0, y0, x1: ev.clientX - laneLeft, y1: ev.clientY - itemsEl.getBoundingClientRect().top };
          setBox(last);
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          setBox(null);
          void invokeCommand("timeline.selectKeyframes", { ids: keysInBox(itemsLive.current, last, pps), mode: "replace" });
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return;
      }
      ui.clearKeys();
      startScrub(e);
    },
    [pps, startScrub],
  );
  const onLanePress = useCallback(
    (e: React.PointerEvent) => {
      useTimelineUiStore.getState().clearKeys();
      startScrub(e);
    },
    [startScrub],
  );

  // ---- trimming and moving a bar
  const onBarPointerDown = useCallback(
    (e: React.PointerEvent, row: TimelineRow, kind: BarDrag["kind"]) => {
      if (e.button !== 0 || !comp) return;
      e.stopPropagation();
      e.preventDefault();
      const drag: BarDrag = { layerId: row.id, kind, startX: e.clientX, origin: row.bar, preview: row.bar };
      setBarDrag(drag);
      const move = (ev: PointerEvent) => {
        const dt = seconds(ev.clientX - drag.startX);
        const preview = kind === "slide" ? slideBar(drag.origin, dt, comp) : kind === "in" ? trimIn(drag.origin, drag.origin.in + dt, comp) : trimOut(drag.origin, drag.origin.out + dt, comp);
        drag.preview = preview;
        setBarDrag({ ...drag });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setBarDrag(null);
        const { preview, origin } = drag;
        if (preview.in !== origin.in || preview.out !== origin.out || preview.start !== origin.start) {
          void invokeCommand("timeline.setLayerBar", { layerId: row.id, in: preview.in, out: preview.out, start: preview.start });
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [comp, seconds],
  );

  // ---- the work area's ends on the ruler
  const onAreaPointerDown = (e: React.PointerEvent, edge: AreaDrag["edge"]) => {
    if (e.button !== 0 || !comp) return;
    e.stopPropagation();
    e.preventDefault();
    const drag: AreaDrag = { edge, startX: e.clientX, origin: comp.workArea, preview: comp.workArea };
    setAreaDrag(drag);
    const frame = 1 / comp.fps;
    const move = (ev: PointerEvent) => {
      const t = snapToFrame(Math.max(0, Math.min(comp.duration, (edge === "start" ? drag.origin.start : drag.origin.end) + seconds(ev.clientX - drag.startX))), comp.fps);
      drag.preview = edge === "start" ? { start: Math.min(t, drag.origin.end - frame), end: drag.origin.end } : { start: drag.origin.start, end: Math.max(t, drag.origin.start + frame) };
      setAreaDrag({ ...drag });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setAreaDrag(null);
      if (drag.preview.start !== drag.origin.start || drag.preview.end !== drag.origin.end) void invokeCommand("timeline.setWorkArea", drag.preview);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!comp) return <div className="timeline timeline--empty" role="region" aria-label="Timeline">No composition to show.</div>;

  const area = areaDrag?.preview ?? comp.workArea;
  const step = tickStep(pps);
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000);
  const width = duration * pps;
  const keyCount = selectedKeys.size;
  const keyTool = (label: string, command: string, args: Record<string, unknown>, title?: string) => (
    <button type="button" className="timeline__tool" disabled={keyCount === 0} title={title ?? label} onClick={() => void invokeCommand(command, args)}>
      {label}
    </button>
  );

  return (
    <div className="timeline" role="region" aria-label="Timeline" ref={rootRef}>
      <div className="timeline__tabs" role="tablist" aria-label="Compositions">
        {tabs.map((t) => (
          <div key={t.id} className={`timeline__tab${t.active ? " timeline__tab--active" : ""}`} data-composition-tab={t.id}>
            <button type="button" role="tab" aria-selected={t.active} className="timeline__tab-button" title={t.trigger || t.name} onClick={() => void invokeCommand("timeline.openComposition", { compositionId: t.id })}>
              {t.name}
              {t.trigger && <span className="timeline__tab-trigger">{t.trigger}</span>}
            </button>
            {t.closable && (
              <button type="button" className="timeline__tab-close" aria-label={`Close ${t.name}`} onClick={() => void invokeCommand("timeline.closeComposition", { compositionId: t.id })}>
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" className="timeline__tool timeline__tab-add" title="Make a precomp in this composition" onClick={() => void invokeCommand("timeline.addPrecomp", {})}>
          + Precomp
        </button>
      </div>
      {crumbs.length > 1 && (
        <nav className="timeline__crumbs" aria-label="Breadcrumbs">
          {crumbs.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && <span aria-hidden> › </span>}
              <button type="button" className="timeline__crumb" aria-current={i === crumbs.length - 1 ? "page" : undefined} disabled={i === crumbs.length - 1} onClick={() => void invokeCommand("timeline.openBreadcrumb", { index: i })}>
                {c.name}
              </button>
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="timeline__toolbar">
        <span className="timeline__timecode" aria-label="Current time" title={`${fps} fps`}>
          {rulerMode === "frames" ? `Frame ${Math.round(time * fps)}` : formatTimecode(time, fps)}
        </span>
        <button type="button" className="timeline__tool" onClick={() => void invokeCommand("timeline.setWorkAreaStart", {})}>
          Work area start
        </button>
        <button type="button" className="timeline__tool" onClick={() => void invokeCommand("timeline.setWorkAreaEnd", {})}>
          Work area end
        </button>
        <button type="button" className="timeline__tool" onClick={() => void invokeCommand("timeline.setWorkArea", { start: 0, end: comp.duration })}>
          Reset work area
        </button>
        <button type="button" className="timeline__tool" onClick={() => void invokeCommand("timeline.addMarker", {})}>
          Add marker
        </button>
        <button type="button" className={`timeline__tool${hideShy ? " timeline__tool--on" : ""}`} aria-pressed={hideShy} onClick={() => useTimelineUiStore.getState().setHideShy(!hideShy)} title={`${shyCount} shy layer${shyCount === 1 ? "" : "s"}`}>
          Hide shy layers
        </button>
        <button type="button" className="timeline__tool" onClick={() => useTimelineUiStore.getState().setRulerMode(rulerMode === "timecode" ? "frames" : "timecode")}>
          {rulerMode === "timecode" ? "Show frames" : "Show timecode"}
        </button>
        <span className="timeline__sep" aria-hidden />
        <button
          type="button"
          className={`timeline__tool timeline__record${recordMode ? " timeline__tool--on timeline__record--on" : ""}`}
          aria-pressed={recordMode}
          title="Auto-key: while on, changing a property (inspector or canvas) puts a keyframe at the playhead"
          onClick={() => void invokeCommand("timeline.setRecord", { on: !recordMode })}
        >
          ● Auto-key
        </button>
        <span className="timeline__keycount" aria-live="polite">
          {keyCount === 0 ? "No keyframes selected" : `${keyCount} keyframe${keyCount === 1 ? "" : "s"} selected`}
        </span>
        {keyTool("Copy keys", "timeline.copyKeyframes", {})}
        <button type="button" className="timeline__tool" title="Paste at the playhead onto the selected layers" onClick={() => void invokeCommand("timeline.pasteKeyframes", {})}>
          Paste keys
        </button>
        {keyTool("Align to playhead", "timeline.alignKeyframes", { to: "playhead" })}
        {keyTool("Distribute", "timeline.distributeKeyframes", {}, "Space three or more keyframes evenly in time")}
        {keyTool("Slower", "timeline.scaleKeyframeTime", { factor: 1.25 }, "Stretch the time between the selected keyframes")}
        {keyTool("Faster", "timeline.scaleKeyframeTime", { factor: 0.8 }, "Squeeze the time between the selected keyframes")}
        {keyTool("Delete keys", "timeline.deleteKeyframes", {})}
      </div>
      <div className="timeline__scroll" ref={scrollRef} onScroll={onScroll}>
        <div className="timeline__grid" style={{ width: HEAD_WIDTH + width }}>
          <div className="timeline__row timeline__row--ruler" role="row" style={{ height: RULER_HEIGHT }}>
            <div className="timeline__head timeline__head--ruler" role="columnheader" style={{ width: HEAD_WIDTH }}>
              <span className="timeline__ruler-title">{comp.name} · {layerCount} layer{layerCount === 1 ? "" : "s"}</span>
            </div>
            <div className="timeline__lane timeline__ruler" data-timeline-ruler style={{ width }} onPointerDown={startScrub}>
              <div className="timeline__workarea" data-work-area-start={area.start} data-work-area-end={area.end} style={{ left: area.start * pps, width: (area.end - area.start) * pps }}>
                <span className="timeline__wa-handle timeline__wa-handle--start" role="slider" aria-label="Work area start" aria-valuenow={area.start} onPointerDown={(e) => onAreaPointerDown(e, "start")} />
                <span className="timeline__wa-handle timeline__wa-handle--end" role="slider" aria-label="Work area end" aria-valuenow={area.end} onPointerDown={(e) => onAreaPointerDown(e, "end")} />
              </div>
              {ticks.map((t) => (
                <span key={t} className="timeline__tick" style={{ left: t * pps }}>
                  {rulerLabel(t, fps, rulerMode)}
                </span>
              ))}
              {comp.markers.map((m) => (
                <span key={m.id} className="timeline__marker" data-marker={m.id} style={{ left: m.time * pps }} onPointerDown={(e) => e.stopPropagation()}>
                  <button type="button" className="timeline__marker-flag" aria-label={`Marker ${m.label} at ${m.time.toFixed(3)} seconds`} onClick={() => transport.seek(m.time)}>
                    {m.label}
                  </button>
                  <button type="button" className="timeline__marker-remove" aria-label={`Delete marker ${m.label}`} onClick={() => void invokeCommand("timeline.removeMarker", { id: m.id })}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="timeline__canvas-layer" aria-hidden style={{ top: RULER_HEIGHT, left: HEAD_WIDTH }}>
            <canvas ref={canvasRef} className="timeline__canvas" data-timeline-canvas />
          </div>
          {layerCount === 0 && <div className="timeline__empty">No layers yet. Draw a shape or mount the demo.</div>}
          <div className="timeline__items" ref={itemsRef} data-rows-built={win.end - win.start} data-rows-total={items.length}>
            <div style={{ height: win.before }} aria-hidden />
            {items.slice(win.start, win.end).map((item) => {
              if (item.kind === "layer") {
                const row = item.row;
                return (
                  <Row
                    key={row.id}
                    row={row}
                    selected={selected.has(row.id)}
                    flashing={focusLayerId === row.id}
                    propsOpen={item.propsOpen}
                    bar={barDrag && barDrag.layerId === row.id ? barDrag.preview : row.bar}
                    duration={duration}
                    pps={pps}
                    onSelect={select}
                    onBarPointerDown={onBarPointerDown}
                    onLanePointerDown={onLanePress}
                  />
                );
              }
              if (item.kind === "group") return <GroupRow key={`${item.layerId}|${item.group}`} item={item} duration={duration} pps={pps} onLanePointerDown={onLanePress} />;
              if (item.kind === "property") return <PropertyRow key={`${item.layerId}|${item.path}`} item={item} compositionId={compositionId} duration={duration} pps={pps} onLanePointerDown={onKeyLanePointerDown} />;
              return <InfoRow key={`${item.layerId}|${item.group}|${item.label}`} item={item} duration={duration} pps={pps} />;
            })}
            <div style={{ height: win.after }} aria-hidden />
            {nested.map((n) => (
              <NestedBarRow key={n.id} row={n} duration={duration} pps={pps} onLanePointerDown={onLanePress} />
            ))}
            {box && <div className="timeline__box" aria-hidden style={{ left: HEAD_WIDTH + Math.min(box.x0, box.x1), top: Math.min(box.y0, box.y1), width: Math.abs(box.x1 - box.x0), height: Math.abs(box.y1 - box.y0) }} />}
          </div>
          <div className="timeline__shade" style={{ left: HEAD_WIDTH, width: area.start * pps }} aria-hidden />
          <div className="timeline__shade" style={{ left: HEAD_WIDTH + area.end * pps, width: Math.max(0, (duration - area.end) * pps) }} aria-hidden />
          <div className="timeline__needle-track" style={{ left: HEAD_WIDTH, width }} aria-hidden>
            <div className="timeline__needle" ref={needleRef} data-timeline-needle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
