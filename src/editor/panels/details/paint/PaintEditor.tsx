"use client";

/**
 * The fills editor (ROADMAP Phase 35): the layer's list of fills, top first. Each fill has a visibility switch, a
 * type (solid, linear, radial, conic), a swatch that opens the colour picker, an opacity, and for a gradient a stop
 * bar to add, drag, recolour and remove stops. Choosing a gradient puts its handles on the canvas. Every change is
 * `paint.setFills`; a drag of a stop or a colour is one undo step.
 */

import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Minus, Plus, Trash2 } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { documentCommands, useLayers } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { useCanvasViewStore } from "@/core/store/useCanvasViewStore";
import { fillsOf, hasFills } from "@/core/paint/paintOps";
import { addPaint, addStop, changeType, movePaint, moveStop, removePaint, removeStop, reverseStops, setStopColor, updatePaint } from "@/core/paint/paintEdits";
import { paintCss, PAINT_TYPES, type GradientStop, type Paint, type PaintType } from "@/core/paint/paints";
import { ColorPicker } from "./ColorPicker";
import { SwatchPopover } from "./SwatchPopover";

const TYPE_LABEL: Record<PaintType, string> = { solid: "Solid", linear: "Linear", radial: "Radial", conic: "Conic" };

/** CSS for a small preview of a paint. */
function preview(p: Paint): string {
  const checker = "repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px";
  return `${paintCss({ ...p, visible: true }, 24, 24) ?? "none"}, ${checker}`;
}

/** Edits fills as one undo step per gesture: `begin` on the first change, `end` when the gesture is over. */
function useGesture() {
  const tx = useRef<{ commit: () => void } | null>(null);
  return {
    begin: () => {
      if (!tx.current) tx.current = documentCommands.begin("Edit fill");
    },
    end: () => {
      tx.current?.commit();
      tx.current = null;
    },
  };
}

const write = (fills: Paint[]) => void invokeCommand("paint.setFills", { fills });

const StopBar: React.FC<{ paint: Exclude<Paint, { type: "solid" }>; selected: number; onSelect: (i: number) => void; onChange: (stops: GradientStop[]) => void; gesture: ReturnType<typeof useGesture> }> = ({ paint, selected, onSelect, onChange, gesture }) => {
  const bar = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ index: number; moved: boolean } | null>(null);
  const preview = `linear-gradient(to right, ${paint.stops.map((s) => `${s.color} ${s.at * 100}%`).join(", ")}), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px`;
  const fraction = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };
  return (
    <div
      ref={bar}
      className="stop-bar"
      role="group"
      aria-label="Gradient stops"
      style={{ background: preview }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest(".stop-bar__stop")) return;
        // a press on the bar adds a stop there
        gesture.begin();
        const { stops, index } = addStop(paint.stops, fraction(e.clientX));
        if (index >= 0) {
          onChange(stops);
          onSelect(index);
        }
        gesture.end();
      }}
    >
      {paint.stops.map((s, i) => (
        <button
          key={i}
          type="button"
          className={`stop-bar__stop ${i === selected ? "stop-bar__stop--selected" : ""}`}
          aria-label={`Stop ${i + 1} at ${Math.round(s.at * 100)} percent`}
          aria-pressed={i === selected}
          style={{ left: `${s.at * 100}%`, background: s.color }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { index: i, moved: false };
            onSelect(i);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            gesture.begin();
            d.moved = true;
            const next = moveStop(paint.stops, d.index, fraction(e.clientX));
            d.index = next.index;
            onChange(next.stops);
            onSelect(next.index);
          }}
          onPointerUp={() => {
            drag.current = null;
            gesture.end();
          }}
          onPointerCancel={() => {
            drag.current = null;
            gesture.end();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              const next = moveStop(paint.stops, i, s.at + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 0.1 : 0.01));
              onChange(next.stops);
              onSelect(next.index);
            } else if ((e.key === "Delete" || e.key === "Backspace") && paint.stops.length > 2) {
              e.preventDefault();
              onChange(removeStop(paint.stops, i));
              onSelect(0);
            }
          }}
        />
      ))}
    </div>
  );
};

const PaintRow: React.FC<{ fills: Paint[]; index: number; count: number; active: boolean; onActivate: () => void }> = ({ fills, index, count, active, onActivate }) => {
  const paint = fills[index];
  const [stop, setStop] = useState(0);
  const gesture = useGesture();
  const label = `Fill ${index + 1}`;
  const selectedStop = paint.type === "solid" ? 0 : Math.min(stop, paint.stops.length - 1);
  const change = (fn: (p: Paint) => Paint) => write(updatePaint(fills, index, fn));
  const setStops = (stops: GradientStop[]) => change((p) => (p.type === "solid" ? p : { ...p, stops }));
  const color = paint.type === "solid" ? paint.color : paint.stops[selectedStop].color;

  return (
    <div className={`paint-row ${active ? "paint-row--active" : ""}`} role="group" aria-label={label} data-paint-type={paint.type} onFocusCapture={onActivate} onPointerDownCapture={onActivate}>
      <div className="paint-row__main">
        <button type="button" className="paint-row__btn" aria-label={paint.visible ? `Hide ${label}` : `Show ${label}`} aria-pressed={!paint.visible} onClick={() => change((p) => ({ ...p, visible: !p.visible }))}>
          {paint.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <select className="paint-row__type" aria-label={`${label} type`} value={paint.type} onChange={(e) => change((p) => changeType(p, e.target.value as PaintType))}>
          {PAINT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <SwatchPopover label={`${label} colour`} swatch={preview(paint)}>
          <ColorPicker
            value={color}
            onBegin={gesture.begin}
            onEnd={gesture.end}
            onChange={(c) => change((p) => (p.type === "solid" ? { ...p, color: c } : { ...p, stops: setStopColor(p.stops, selectedStop, c) }))}
          />
        </SwatchPopover>
        <label className="paint-row__opacity">
          <input
            type="number"
            aria-label={`${label} opacity`}
            min={0}
            max={100}
            value={Math.round(paint.opacity * 100)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) change((p) => ({ ...p, opacity: Math.min(1, Math.max(0, n / 100)) }));
            }}
          />
          <span aria-hidden>%</span>
        </label>
        <button type="button" className="paint-row__btn" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => write(movePaint(fills, index, -1))}><ArrowUp size={12} /></button>
        <button type="button" className="paint-row__btn" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => write(movePaint(fills, index, 1))}><ArrowDown size={12} /></button>
        <button type="button" className="paint-row__btn" aria-label={`Remove ${label}`} onClick={() => write(removePaint(fills, index))}><Trash2 size={12} /></button>
      </div>
      {paint.type !== "solid" && (
        <div className="paint-row__stops">
          <StopBar paint={paint} selected={selectedStop} onSelect={setStop} onChange={setStops} gesture={gesture} />
          <div className="paint-row__stopline">
            <label>
              <span>Stop</span>
              <input
                type="number"
                aria-label={`${label} stop position`}
                min={0}
                max={100}
                value={Math.round(paint.stops[selectedStop].at * 100)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  const next = moveStop(paint.stops, selectedStop, n / 100);
                  setStops(next.stops);
                  setStop(next.index);
                }}
              />
              <span aria-hidden>%</span>
            </label>
            {paint.type === "conic" && (
              <label>
                <span>Angle</span>
                <input type="number" aria-label={`${label} angle`} value={Math.round(paint.angle)} onChange={(e) => Number.isFinite(Number(e.target.value)) && change((p) => (p.type === "conic" ? { ...p, angle: Number(e.target.value) } : p))} />
              </label>
            )}
            <button type="button" className="paint-row__btn" aria-label={`Remove stop of ${label}`} disabled={paint.stops.length <= 2} onClick={() => { setStops(removeStop(paint.stops, selectedStop)); setStop(0); }}><Minus size={12} /></button>
            <button type="button" className="paint-row__btn paint-row__btn--text" aria-label={`Reverse ${label}`} onClick={() => setStops(reverseStops(paint.stops))}>Reverse</button>
          </div>
        </div>
      )}
    </div>
  );
};

export const PaintEditor: React.FC = () => {
  const layers = useLayers();
  const ids = useSelectionStore((s) => s.selectedIds);
  const sourceId = ids.find((id) => layers[id] && hasFills(layers[id].archetype)) ?? null;
  const fills = sourceId ? fillsOf(sourceId) : [];
  const [active, setActive] = useState(0);
  const sourceKey = sourceId ?? "";

  // the active gradient's handles show on the canvas
  const activeIndex = Math.min(active, Math.max(0, fills.length - 1));
  const activeIsGradient = fills[activeIndex] !== undefined && fills[activeIndex].type !== "solid";
  useEffect(() => {
    const store = useCanvasViewStore.getState();
    if (sourceKey && activeIsGradient) store.setEditingPaint({ layerId: sourceKey, index: activeIndex });
    else if (store.editingPaint) store.setEditingPaint(null);
    // The handles stay when the editor closes (its popover shuts on a press on the canvas, which is where you drag them);
    // the canvas clears them when the selection changes.
  }, [sourceKey, activeIndex, activeIsGradient]);

  if (!sourceId) return null;
  return (
    <div className="paint-editor" role="group" aria-label="Fills">
      <div className="paint-editor__head">
        <span>Fills</span>
        <button type="button" className="paint-row__btn" aria-label="Add fill" onClick={() => { write(addPaint(fills, "solid")); setActive(0); }}><Plus size={13} /></button>
      </div>
      {fills.length === 0 && <div className="paint-editor__empty">No fill</div>}
      {fills.map((_, i) => (
        <PaintRow key={i} fills={fills} index={i} count={fills.length} active={i === activeIndex} onActivate={() => setActive(i)} />
      ))}
    </div>
  );
};

