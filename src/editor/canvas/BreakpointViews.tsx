"use client";

/**
 * The breakpoint canvas (ROADMAP Phase 44): every breakpoint of a responsive page drawn at once. The breakpoint being
 * edited is the real frame; the others are previews in a row beneath it, each at its own width and updating live as
 * anything changes. A preview is linked to the real frame: clicking a layer in it selects that layer (the same one, in
 * every breakpoint: each view outlines the selection) and makes that breakpoint the one being edited. The right edge
 * of every view can be dragged to change the breakpoint's width, and the page reflows live as you drag.
 */

import React, { useEffect, useMemo, useState } from "react";
import { appliedBreakpoints, breakpointsOf, isBase, isResponsiveFrame, resolveDocumentAt, type Breakpoint } from "@/core/breakpoints/breakpoints";
import { setActiveBreakpoint, updateBreakpoint } from "@/core/breakpoints/breakpointOps";
import { documentStore } from "@/core/store/documentState";
import { documentCommands } from "@/core/store/useDocumentStore";
import { useBreakpointStore } from "@/core/store/useBreakpointStore";
import { useBreakpointViewStore } from "@/core/store/useBreakpointViewStore";
import { useCameraStore } from "@/core/store/useCameraStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { StageHost } from "@/editor/stage/StageHost";
import type { CanvasFrame } from "./useFrames";

const GAP = 120;
const MIN_WIDTH = 100;
const MAX_WIDTH = 10000;

/** Drags a right edge: calls `set` with the new width as the pointer moves, all in one undo step. */
function useEdgeDrag(startWidth: number, set: (width: number) => boolean | void) {
  return (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const tx = documentCommands.begin("Resize breakpoint");
    let moved = false;
    const move = (ev: PointerEvent) => {
      const zoom = useCameraStore.getState().camera.zoom || 1;
      const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(startWidth + (ev.clientX - x0) / zoom)));
      moved = true;
      set(width);
    };
    const up = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      if (moved) tx.commit();
      else tx.cancel();
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
  };
}

const edgeStyle: React.CSSProperties = { position: "absolute", top: 0, right: "calc(-6px / var(--canvas-zoom, 1))", width: "calc(12px / var(--canvas-zoom, 1))", height: "100%", cursor: "ew-resize", zIndex: 5, touchAction: "none" };

const Edge: React.FC<{ id: string; width: number; set: (width: number) => boolean | void }> = ({ id, width, set }) => {
  const down = useEdgeDrag(width, set);
  return <div data-testid={`edge-${id}`} role="separator" aria-orientation="vertical" aria-label={`Resize ${id}`} style={edgeStyle} onPointerDown={down} />;
};

/** The selected layers' boxes inside a preview, measured in its own frame. */
function useSelectionBoxes(host: React.RefObject<HTMLDivElement | null>, key: string) {
  const ids = useSelectionStore((s) => s.selectedIds);
  const [boxes, setBoxes] = useState<{ id: string; x: number; y: number; w: number; h: number }[]>([]);
  useEffect(() => {
    const measure = () => {
      const d = host.current?.querySelector("iframe")?.contentDocument;
      if (!d) return;
      const out: typeof boxes = [];
      for (const id of ids) {
        const el = d.querySelector<HTMLElement>(`[data-element-id="${id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        out.push({ id, x: r.left, y: r.top, w: r.width, h: r.height });
      }
      setBoxes((prev) => (JSON.stringify(prev) === JSON.stringify(out) ? prev : out));
    };
    measure();
    const t = window.setTimeout(measure, 60); // a layout that settles a moment after the change
    return () => window.clearTimeout(t);
  }, [host, ids, key]);
  return boxes;
}

const Ghost: React.FC<{ frame: CanvasFrame; bp: Breakpoint; x: number; y: number; width: number; height: number; onWidth: (width: number) => boolean | void }> = ({ frame, bp, x, y, width, height, onWidth }) => {
  const host = React.useRef<HTMLDivElement | null>(null);
  const boxes = useSelectionBoxes(host, `${width}x${height}`);
  const pick = (e: React.PointerEvent) => {
    e.stopPropagation();
    const wrapper = host.current;
    const d = wrapper?.querySelector("iframe")?.contentDocument;
    if (!wrapper || !d) return;
    const r = wrapper.getBoundingClientRect();
    const scale = r.width / width || 1;
    const el = d.elementFromPoint((e.clientX - r.left) / scale, (e.clientY - r.top) / scale)?.closest("[data-element-id]");
    const id = el?.getAttribute("data-element-id");
    setActiveBreakpoint(bp.id);
    if (id && id !== frame.id) useSelectionStore.getState().select(id, "element");
  };
  return (
    <div className="canvas-frame canvas-frame--ghost" data-testid={`view-${bp.id}`} data-frame-id={frame.id} data-breakpoint={bp.id} style={{ left: x, top: y, width, height }}>
      <div className="canvas-frame__title" style={{ width: `max(calc(${width}px * var(--canvas-zoom)), 168px)` }}>
        <span className="canvas-frame__name">{bp.name}</span>
        <span className="canvas-frame__dims">{width} × {Math.round(height)}</span>
      </div>
      <div ref={host} className="canvas-frame__surface" style={{ position: "relative" }}>
        <StageHost frameId={frame.id} breakpointId={bp.id} ghost title={`View: ${bp.name}`} width="100%" height="100%" style={{ pointerEvents: "none" }} />
        {/* the preview takes the clicks itself: they pick a layer here and make this the breakpoint being edited */}
        <div data-testid={`view-hit-${bp.id}`} style={{ position: "absolute", inset: 0 }} onPointerDown={pick} />
        {boxes.map((b) => (
          <div key={b.id} data-testid={`view-selection-${bp.id}`} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, outline: "calc(1.5px / var(--canvas-zoom, 1)) solid #2563eb", pointerEvents: "none" }} />
        ))}
      </div>
      <Edge id={bp.id} width={width} set={onWidth} />
    </div>
  );
};

export const BreakpointViews: React.FC<{ frames: CanvasFrame[] }> = ({ frames }) => {
  const showAll = useBreakpointViewStore((s) => s.showAll);
  const activeId = useBreakpointStore((s) => s.activeId);
  const doc = documentStore((s) => s.document);
  const list = breakpointsOf(doc);
  const base = list[0];
  const viewed = isBase(list, activeId) ? base.id : activeId!;
  const pages = useMemo(() => frames.filter((f) => doc.layers[f.id] && isResponsiveFrame(doc.layers[f.id])), [frames, doc]);
  void appliedBreakpoints;
  if (!showAll || pages.length === 0) return null;
  return (
    <>
      {pages.map((frame) => {
        let x = frame.x;
        const bottom = frame.y + frame.height + GAP;
        return (
          <React.Fragment key={frame.id}>
            {/* the right edge of the frame being edited */}
            <div style={{ position: "absolute", left: frame.x + frame.width, top: frame.y, width: 0, height: frame.height }}>
              <Edge
                id={viewed}
                width={frame.width}
                set={(width) => (viewed === base.id ? (documentCommands.updateProps(frame.id, { "frame.width": width }), true) : updateBreakpoint(viewed, { width }))}
              />
            </div>
            {list
              .filter((b) => b.id !== viewed)
              .map((b) => {
                const seen = resolveDocumentAt(doc, b.id === base.id ? null : b.id).layers[frame.id];
                const width = typeof seen?.properties["frame.width"] === "number" ? (seen.properties["frame.width"] as number) : b.width;
                const height = typeof seen?.properties["frame.height"] === "number" ? (seen.properties["frame.height"] as number) : frame.height;
                const left = x;
                x += width + GAP;
                return (
                  <Ghost
                    key={b.id}
                    frame={frame}
                    bp={b}
                    x={left}
                    y={bottom}
                    width={width}
                    height={height}
                    onWidth={(w) => (b.id === base.id ? (documentCommands.updateProps(frame.id, { "frame.width": w }), true) : updateBreakpoint(b.id, { width: w }))}
                  />
                );
              })}
          </React.Fragment>
        );
      })}
    </>
  );
};
