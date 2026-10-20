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
import { invokeCommand } from "@/core/commands";
import { useDocument } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { useLayersUiStore } from "@/core/store/useLayersUiStore";
import { useTimelineUiStore } from "@/core/store/useTimelineUiStore";
import { frameScheduler } from "@/core/time/scheduler";
import { getTransport, snapToFrame, transport, transportStore } from "@/core/time/transport";
import { useTransportTime } from "@/core/time/useTransportTime";
import { formatTimecode } from "@/core/time/transport";
import { BLEND_MODES, buildTimelineRows, rulerLabel, slideBar, tickStep, trimIn, trimOut, type TimelineRow } from "@/core/timeline/model";
import { parentChoices } from "@/core/timeline/timelineOps";
import type { CompositionLayer } from "@/core/document/compositions";
import "@/editor/styles/timeline.css";

const PIXELS_PER_SECOND = 120;
const ROW_HEIGHT = 26;
const HEAD_WIDTH = 440;

type BarDrag = { layerId: string; kind: "in" | "out" | "slide"; startX: number; origin: CompositionLayer; preview: CompositionLayer };
type AreaDrag = { edge: "start" | "end"; startX: number; origin: { start: number; end: number }; preview: { start: number; end: number } };

const seconds = (px: number) => px / PIXELS_PER_SECOND;

interface RowProps {
  row: TimelineRow;
  selected: boolean;
  flashing: boolean;
  bar: CompositionLayer;
  duration: number;
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

const Row = memo(function Row({ row, selected, flashing, bar, duration, onSelect, onBarPointerDown, onLanePointerDown }: RowProps) {
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
      <div className="timeline__lane" role="gridcell" style={{ width: duration * PIXELS_PER_SECOND }} onPointerDown={onLanePointerDown}>
        <div
          className={`timeline__bar${row.trimmed ? " timeline__bar--trimmed" : ""}${row.motion.clips > 0 ? " timeline__bar--animated" : ""}`}
          data-layer-bar={row.id}
          data-in={bar.in}
          data-out={bar.out}
          style={{ left: bar.in * PIXELS_PER_SECOND, width: Math.max(2, (bar.out - bar.in) * PIXELS_PER_SECOND) }}
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

export const TimelinePanel: React.FC = () => {
  const doc = useDocument((d) => d);
  const compositionId = useStore(transportStore, (t) => t.compositionId);
  const fps = useStore(transportStore, (t) => t.fps);
  const duration = useStore(transportStore, (t) => t.duration);
  const comp = doc.compositions[compositionId];
  const expanded = useLayersUiStore((s) => s.expanded);
  const hideShy = useTimelineUiStore((s) => s.hideShy);
  const rulerMode = useTimelineUiStore((s) => s.rulerMode);
  const focusLayerId = useTimelineUiStore((s) => s.focusLayerId);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const time = useTransportTime({ maxHz: 10 });
  const needleRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [barDrag, setBarDrag] = useState<BarDrag | null>(null);
  const [areaDrag, setAreaDrag] = useState<AreaDrag | null>(null);

  const rows = useMemo(() => buildTimelineRows(doc, compositionId, expanded, { hideShy }), [doc, compositionId, expanded, hideShy]);
  const shyCount = useMemo(() => Object.values(doc.layers).filter((l) => l.shy === true).length, [doc.layers]);

  // The current-time indicator: written to the DOM once per frame, in the scheduler's render phase.
  useEffect(() => {
    const paint = () => {
      const el = needleRef.current;
      if (el) el.style.transform = `translateX(${Math.min(getTransport().time, getTransport().duration) * PIXELS_PER_SECOND}px)`;
    };
    paint();
    return frameScheduler.register("render", paint);
  }, []);

  // A motion badge in the Layers panel asks for a layer: bring its row into view (the row flashes while the request lasts).
  useEffect(() => {
    if (!focusLayerId) return;
    scrollRef.current?.querySelector<HTMLElement>(`[data-timeline-row="${CSS.escape(focusLayerId)}"]`)?.scrollIntoView({ block: "nearest" });
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
  }, []);
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
    [comp],
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
  const step = tickStep(PIXELS_PER_SECOND);
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000);
  const width = duration * PIXELS_PER_SECOND;

  return (
    <div className="timeline" role="region" aria-label="Timeline">
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
      </div>
      <div className="timeline__scroll" ref={scrollRef}>
        <div className="timeline__grid" style={{ width: HEAD_WIDTH + width }}>
          <div className="timeline__row timeline__row--ruler" role="row" style={{ height: 34 }}>
            <div className="timeline__head timeline__head--ruler" role="columnheader" style={{ width: HEAD_WIDTH }}>
              <span className="timeline__ruler-title">{comp.name} · {rows.length} layer{rows.length === 1 ? "" : "s"}</span>
            </div>
            <div className="timeline__lane timeline__ruler" data-timeline-ruler style={{ width }} onPointerDown={startScrub}>
              <div className="timeline__workarea" data-work-area-start={area.start} data-work-area-end={area.end} style={{ left: area.start * PIXELS_PER_SECOND, width: (area.end - area.start) * PIXELS_PER_SECOND }}>
                <span className="timeline__wa-handle timeline__wa-handle--start" role="slider" aria-label="Work area start" aria-valuenow={area.start} onPointerDown={(e) => onAreaPointerDown(e, "start")} />
                <span className="timeline__wa-handle timeline__wa-handle--end" role="slider" aria-label="Work area end" aria-valuenow={area.end} onPointerDown={(e) => onAreaPointerDown(e, "end")} />
              </div>
              {ticks.map((t) => (
                <span key={t} className="timeline__tick" style={{ left: t * PIXELS_PER_SECOND }}>
                  {rulerLabel(t, fps, rulerMode)}
                </span>
              ))}
              {comp.markers.map((m) => (
                <span key={m.id} className="timeline__marker" data-marker={m.id} style={{ left: m.time * PIXELS_PER_SECOND }} onPointerDown={(e) => e.stopPropagation()}>
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
          {rows.length === 0 && <div className="timeline__empty">No layers yet. Draw a shape or mount the demo.</div>}
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              selected={selected.has(row.id)}
              flashing={focusLayerId === row.id}
              bar={barDrag && barDrag.layerId === row.id ? barDrag.preview : row.bar}
              duration={duration}
              onSelect={select}
              onBarPointerDown={onBarPointerDown}
              onLanePointerDown={startScrub}
            />
          ))}
          <div className="timeline__shade" style={{ left: HEAD_WIDTH, width: area.start * PIXELS_PER_SECOND }} aria-hidden />
          <div className="timeline__shade" style={{ left: HEAD_WIDTH + area.end * PIXELS_PER_SECOND, width: Math.max(0, (duration - area.end) * PIXELS_PER_SECOND) }} aria-hidden />
          <div className="timeline__needle-track" style={{ left: HEAD_WIDTH, width }} aria-hidden>
            <div className="timeline__needle" ref={needleRef} data-timeline-needle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
