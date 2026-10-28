"use client";

/**
 * ============================================================================
 * GRAPH EDITOR (ROADMAP Phase 67)
 * ============================================================================
 * The curves of the selected keyframes (or the selected layers' numeric tracks), as value or speed graphs. A
 * keyframe's easing is the feel of the segment that ends at it: pick one from the preset strip (Snappy, Smooth, Bouncy,
 * Lazy first), bend a bezier segment by its handles, or set a spring by Bounce and Time. The Simple face never shows
 * stiffness or damping (Law 17); the Pro face adds them as read-only numbers. Every edit is a command, so it is one
 * undo step and the kernel plays exactly what the graph shows.
 * ============================================================================
 */

import React, { useMemo, useState } from "react";
import { invokeCommand, useOwnFocusScope } from "@/core/commands";
import { useDocument } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { useTimelineUiStore } from "@/core/store/useTimelineUiStore";
import { useInspectorFaceStore } from "@/core/store/useInspectorFaceStore";
import { useTransportTime } from "@/core/time/useTransportTime";
import { transportStore } from "@/core/time/transport";
import { useStore } from "zustand";
import {
  EASE_PRESETS, bezierEase, bezierHandles, boundsOf, curvePoints, easeKind, graphCurves, handleFromPoint, handlePoint, physicalSpring, speedPoints, springControlLabels, springParams,
  type GraphCurve, type Handles,
} from "@/core/timeline/graph";
import "@/editor/styles/graph-editor.css";

const COLOURS = ["#38bdf8", "#f472b6", "#a3e635", "#fb923c", "#c084fc", "#2dd4bf"];
const W = 640;
const H = 220;
const PAD = 14;

type HandleDrag = { keyId: string; which: 1 | 2; preview: Handles };

export const GraphEditorPanel: React.FC = () => {
  const doc = useDocument((d) => d);
  const compositionId = useStore(transportStore, (t) => t.compositionId);
  const duration = useStore(transportStore, (t) => t.duration);
  const selectedKeys = useTimelineUiStore((s) => s.selectedKeys);
  const mode = useTimelineUiStore((s) => s.graphMode);
  const selectedLayers = useSelectionStore((s) => s.selectedIds);
  const face = useInspectorFaceStore((s) => s.face);
  const time = useTransportTime({ maxHz: 20 });
  const rootRef = useOwnFocusScope<HTMLDivElement>("timeline");
  const [drag, setDrag] = useState<HandleDrag | null>(null);

  const curves = useMemo(() => graphCurves(doc, compositionId, selectedKeys, selectedLayers), [doc, compositionId, selectedKeys, selectedLayers]);
  // The first selected keyframe and the curve it is on (cheap enough to find on every render).
  const focusId = selectedKeys.values().next().value as string | undefined;
  let focus: { curve: GraphCurve; at: number } | null = null;
  for (const curve of curves) {
    const at = focusId === undefined ? -1 : curve.keys.findIndex((k) => k.id === focusId);
    if (at >= 0) {
      focus = { curve, at };
      break;
    }
  }

  // The selected keyframe's incoming segment (the one its easing describes) and the easing the strip edits.
  const segment = focus && focus.at > 0 ? { from: focus.curve.keys[focus.at - 1], to: focus.curve.keys[focus.at] } : null;
  const ease = segment ? (drag && drag.keyId === segment.to.id ? bezierEase(drag.preview) : segment.to.ease) : undefined;
  const selectedCount = selectedKeys.size;

  const t1 = Math.max(duration, 0.001);
  const shownCurves: Array<{ curve: GraphCurve; colour: string; points: Array<[number, number]>; v0: number; v1: number }> = curves.map((curve, i) => {
    const keys = drag ? curve.keys.map((k) => (k.id === drag.keyId ? { ...k, ease: bezierEase(drag.preview) } : k)) : curve.keys;
    const points = mode === "value" ? curvePoints({ keys }) : speedPoints({ keys });
    const b = boundsOf(points);
    return { curve: { ...curve, keys }, colour: COLOURS[i % COLOURS.length], points, v0: b.v0, v1: b.v1 };
  });
  const x = (t: number) => PAD + (Math.min(t, t1) / t1) * (W - 2 * PAD);
  const yOf = (v: number, v0: number, v1: number) => H - PAD - ((v - v0) / (v1 - v0)) * (H - 2 * PAD);

  const startHandleDrag = (e: React.PointerEvent, owner: (typeof shownCurves)[number], which: 1 | 2) => {
    if (!segment || !focus) return;
    e.preventDefault();
    e.stopPropagation();
    const start = bezierHandles(segment.to.ease) as Handles;
    const seg = { fromTime: segment.from.time, toTime: segment.to.time, fromValue: segment.from.value, toValue: segment.to.value };
    let current: Handles = start;
    setDrag({ keyId: segment.to.id, which, preview: start });
    const svg = (e.currentTarget as SVGElement).ownerSVGElement as SVGSVGElement;
    const move = (ev: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * W;
      const py = ((ev.clientY - rect.top) / rect.height) * H;
      const time = ((px - PAD) / (W - 2 * PAD)) * t1;
      const value = owner.v0 + ((H - PAD - py) / (H - 2 * PAD)) * (owner.v1 - owner.v0);
      const frac = handleFromPoint(seg, time, value);
      if (!frac) return;
      current = which === 1 ? { ...current, x1: frac.x, y1: frac.y } : { ...current, x2: frac.x, y2: frac.y };
      setDrag({ keyId: segment.to.id, which, preview: current });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      void invokeCommand("timeline.setKeyframeEase", { ids: [segment.to.id], ease: bezierEase(current) });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const spring = springParams(ease);
  const kind = segment ? easeKind(ease) : null;
  const labels = springControlLabels(face);
  const physical = face === "pro" ? physicalSpring(ease) : null;

  return (
    <div className="graph" role="region" aria-label="Graph editor" ref={rootRef}>
      <div className="graph__bar">
        <strong className="graph__title">Graph editor</strong>
        <div className="graph__modes" role="group" aria-label="Graph type">
          {(["value", "speed"] as const).map((m) => (
            <button key={m} type="button" className={`graph__mode${mode === m ? " graph__mode--on" : ""}`} aria-pressed={mode === m} onClick={() => void invokeCommand("timeline.setGraphMode", { mode: m })}>
              {m === "value" ? "Value graph" : "Speed graph"}
            </button>
          ))}
        </div>
        <span className="graph__hint">{selectedCount === 0 ? "Select keyframes in the timeline" : `${selectedCount} keyframe${selectedCount === 1 ? "" : "s"} selected`}</span>
      </div>

      {shownCurves.length === 0 ? (
        <div className="graph__empty">Select keyframes (or a layer that has them) to see their curves here. Colours, text and other non-number properties have no curve.</div>
      ) : (
        <div className="graph__body">
          <svg className="graph__plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={mode === "value" ? "Value graph" : "Speed graph"} data-graph-mode={mode}>
            <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} className="graph__frame" />
            {shownCurves.map(({ curve, colour, points, v0, v1 }) => (
              <g key={curve.trackId} data-graph-curve={`${curve.layerId}|${curve.property}`}>
                <polyline fill="none" stroke={colour} strokeWidth={2} points={points.map(([t, v]) => `${x(t)},${yOf(v, v0, v1)}`).join(" ")} />
                {mode === "value" &&
                  curve.keys.map((k) => (
                    <circle
                      key={k.id}
                      cx={x(k.time)}
                      cy={yOf(k.value, v0, v1)}
                      r={selectedKeys.has(k.id) ? 6 : 4.5}
                      className={`graph__key${selectedKeys.has(k.id) ? " graph__key--on" : ""}`}
                      stroke={colour}
                      data-graph-key={k.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        void invokeCommand("timeline.selectKeyframes", { ids: [k.id], mode: e.shiftKey ? "toggle" : "replace" });
                      }}
                    />
                  ))}
                {mode === "value" && segment && curve.trackId === focus?.curve.trackId && bezierHandles(segment.to.ease) && Math.abs(segment.to.value - segment.from.value) > 1e-9 && (() => {
                  const h = drag ? drag.preview : (bezierHandles(segment.to.ease) as Handles);
                  const seg = { fromTime: segment.from.time, toTime: segment.to.time, fromValue: segment.from.value, toValue: segment.to.value };
                  const p1 = handlePoint(seg, h.x1, h.y1);
                  const p2 = handlePoint(seg, h.x2, h.y2);
                  const owner = { curve, colour, points, v0, v1 };
                  return (
                    <g className="graph__handles">
                      <line x1={x(seg.fromTime)} y1={yOf(seg.fromValue, v0, v1)} x2={x(p1.time)} y2={yOf(p1.value, v0, v1)} />
                      <line x1={x(seg.toTime)} y1={yOf(seg.toValue, v0, v1)} x2={x(p2.time)} y2={yOf(p2.value, v0, v1)} />
                      <circle cx={x(p1.time)} cy={yOf(p1.value, v0, v1)} r={5} className="graph__handle" data-graph-handle="out" aria-label="Easing handle leaving the earlier keyframe" onPointerDown={(e) => startHandleDrag(e, owner, 1)} />
                      <circle cx={x(p2.time)} cy={yOf(p2.value, v0, v1)} r={5} className="graph__handle" data-graph-handle="in" aria-label="Easing handle arriving at the later keyframe" onPointerDown={(e) => startHandleDrag(e, owner, 2)} />
                    </g>
                  );
                })()}
              </g>
            ))}
            <line className="graph__playhead" x1={x(time)} x2={x(time)} y1={PAD} y2={H - PAD} />
          </svg>
          <ul className="graph__legend" aria-label="Curves">
            {shownCurves.map(({ curve, colour }) => (
              <li key={curve.trackId}>
                <span className="graph__swatch" style={{ background: colour }} aria-hidden />
                {curve.layerName} · {curve.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="graph__ease" aria-label="Easing">
        <div className="graph__ease-title">
          {segment ? "Easing into the selected keyframe" : selectedCount > 0 && focus ? "The first keyframe has no easing into it" : "Easing"}
          {kind && <span className="graph__kind" data-ease-kind={kind}>{kind === "bezier" ? "curve" : kind}</span>}
        </div>
        <div className="graph__presets" role="group" aria-label="Easing presets">
          {EASE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`graph__preset graph__preset--${p.group}${ease === p.value ? " graph__preset--on" : ""}`}
              title={p.hint}
              disabled={selectedCount === 0}
              data-ease-preset={p.id}
              onClick={() => void invokeCommand("timeline.setKeyframeEase", { ease: p.value })}
            >
              {p.label}
            </button>
          ))}
        </div>
        {spring && (
          <div className="graph__spring" role="group" aria-label="Spring">
            <label>
              <span>{labels[0]}</span>
              <input type="range" min={0} max={1} step={0.05} value={spring.bounce} aria-label={labels[0]} onChange={(e) => void invokeCommand("timeline.setKeyframeSpring", { bounce: Number(e.target.value), time: spring.time })} />
              <output>{spring.bounce.toFixed(2)}</output>
            </label>
            <label>
              <span>{labels[1]}</span>
              <input type="range" min={0.1} max={3} step={0.05} value={spring.time} aria-label={labels[1]} onChange={(e) => void invokeCommand("timeline.setKeyframeSpring", { bounce: spring.bounce, time: Number(e.target.value) })} />
              <output>{spring.time.toFixed(2)} s</output>
            </label>
            {physical && (
              <dl className="graph__physical" aria-label="Physical spring (Pro)">
                <dt>{labels[2]}</dt><dd>{physical.stiffness.toFixed(1)}</dd>
                <dt>{labels[3]}</dt><dd>{physical.damping.toFixed(2)}</dd>
                <dt>{labels[4]}</dt><dd>{physical.mass.toFixed(2)}</dd>
              </dl>
            )}
          </div>
        )}
        {kind === "physical spring" && <p className="graph__note">This spring was set with physical numbers. Pick Snappy, Smooth, Bouncy or Lazy to describe it as Bounce and Time.</p>}
        {segment && (kind === "steps" || kind === "named") && !bezierHandles(ease) && <p className="graph__note">This easing has no handles. Pick a preset to replace it.</p>}
      </div>
    </div>
  );
};

export default GraphEditorPanel;
