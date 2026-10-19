"use client";

/**
 * Rulers (ROADMAP Phase 28): a ruler along the top and one down the left of the canvas, in px from the active
 * frame's top-left. Dragging out of a ruler makes a guide on the frame under the pointer; dropping it back on a
 * ruler deletes it (guides are moved by dragging them with the Select tool). Drawn on 2D canvases from the camera.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasHitTester } from "@/core/hit/CanvasHitTester";
import { documentStore, getDocument } from "@/core/store/documentState";
import { useCameraStore } from "@/core/store/useCameraStore";
import { useCanvasViewStore } from "@/core/store/useCanvasViewStore";
import { useSnapStore } from "@/core/store/useSnapStore";
import { frameIdOf, listFrames } from "@/core/frames/frames";
import { ticks } from "@/core/geometry/rulerTicks";
import { screenToDoc } from "@/core/viewport/camera";
import { addGuide } from "./guides";

export const RULER_SIZE = 20;

interface CanvasRulersProps {
  hitTester: CanvasHitTester;
  containerRef: React.RefObject<HTMLElement | null>;
}

/** The active frame's top-left in canvas space (the rulers' zero). */
function rulerOrigin(): { x: number; y: number } {
  const frames = listFrames(getDocument().layers);
  const active = frames.find((f) => f.id === useCanvasViewStore.getState().activeFrameId) ?? frames[0];
  return active ? { x: active.x, y: active.y } : { x: 0, y: 0 };
}

export const CanvasRulers: React.FC<CanvasRulersProps> = ({ hitTester, containerRef }) => {
  const visible = useSnapStore((s) => s.rulers);
  const topRef = useRef<HTMLCanvasElement | null>(null);
  const leftRef = useRef<HTMLCanvasElement | null>(null);
  // The guide being dragged out of a ruler, in screen px along its axis (null when none).
  const [ghost, setGhost] = useState<{ axis: "x" | "y"; at: number } | null>(null);

  const draw = useCallback(() => {
    const container = containerRef.current;
    const top = topRef.current;
    const left = leftRef.current;
    if (!container || !top || !left) return;
    const { camera } = useCameraStore.getState();
    const w = container.clientWidth;
    const h = container.clientHeight;
    const origin = rulerOrigin();
    const dpr = window.devicePixelRatio || 1;
    const paint = (canvas: HTMLCanvasElement, horizontal: boolean) => {
      const length = horizontal ? w : h;
      canvas.width = (horizontal ? length : RULER_SIZE) * dpr;
      canvas.height = (horizontal ? RULER_SIZE : length) * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(0, 0, horizontal ? length : RULER_SIZE, horizontal ? RULER_SIZE : length);
      ctx.strokeStyle = "rgba(100,116,139,0.8)";
      ctx.fillStyle = "rgba(71,85,105,1)";
      ctx.font = "9px system-ui, sans-serif";
      const o = horizontal ? origin.x : origin.y;
      const pan = horizontal ? camera.x : camera.y;
      const from = (0 - pan) / camera.zoom - o;
      const to = (length - pan) / camera.zoom - o;
      for (const t of ticks(from, to, camera.zoom)) {
        const p = (t.value + o) * camera.zoom + pan;
        ctx.beginPath();
        const len = t.major ? RULER_SIZE : 5;
        if (horizontal) {
          ctx.moveTo(Math.round(p) + 0.5, RULER_SIZE);
          ctx.lineTo(Math.round(p) + 0.5, RULER_SIZE - len);
        } else {
          ctx.moveTo(RULER_SIZE, Math.round(p) + 0.5);
          ctx.lineTo(RULER_SIZE - len, Math.round(p) + 0.5);
        }
        ctx.stroke();
        if (t.major) {
          if (horizontal) ctx.fillText(String(t.value), p + 3, 9);
          else {
            ctx.save();
            ctx.translate(9, p - 3);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(String(t.value), 0, 0);
            ctx.restore();
          }
        }
      }
    };
    paint(top, true);
    paint(left, false);
  }, [containerRef]);

  useEffect(() => {
    if (!visible) return undefined;
    draw();
    const offCamera = useCameraStore.subscribe((s, p) => {
      if (s.camera !== p.camera || s.viewport !== p.viewport) draw();
    });
    const offView = useCanvasViewStore.subscribe((s, p) => {
      if (s.activeFrameId !== p.activeFrameId) draw();
    });
    // Only a frame that moves changes what the rulers measure from; an edit to anything else leaves them as they are.
    let origin = rulerOrigin();
    const offDoc = documentStore.subscribe((s, p) => {
      if (s.document === p.document) return;
      const now = rulerOrigin();
      if (now.x === origin.x && now.y === origin.y) return;
      origin = now;
      draw();
    });
    return () => {
      offCamera();
      offView();
      offDoc();
    };
  }, [visible, draw]);

  const startGuide = (axis: "x" | "y") => (e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rect = container.getBoundingClientRect();
    const at = (ev: { clientX: number; clientY: number }) => (axis === "x" ? ev.clientX - rect.left : ev.clientY - rect.top);
    setGhost({ axis, at: at(e) });
    const move = (ev: PointerEvent) => setGhost({ axis, at: at(ev) });
    const up = (ev: PointerEvent) => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      setGhost(null);
      const pos = at(ev);
      if (pos < RULER_SIZE) return; // dropped back on the ruler: no guide
      const screen = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      const world = screenToDoc(useCameraStore.getState().camera, screen);
      // The guide goes on the frame under the pointer along the other axis too: a point on the frame's own box.
      const probe = axis === "x" ? { x: world.x, y: rulerOrigin().y + 1 } : { x: rulerOrigin().x + 1, y: world.y };
      const hit = hitTester.containerAt(probe) ?? hitTester.containerAt(world);
      const frameId = hit ? frameIdOf(getDocument().layers, hit.id) : null;
      const frameHit = frameId ? hitTester.ensure().get(frameId) : undefined;
      if (!frameId || !frameHit) return;
      addGuide(frameId, { axis, pos: Math.round(((axis === "x" ? world.x - frameHit.origin.x : world.y - frameHit.origin.y)) * 100) / 100 });
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  if (!visible) return null;
  return (
    <>
      <canvas ref={topRef} className="canvas-ruler canvas-ruler--top" data-ruler="top" aria-label="Top ruler" style={{ height: RULER_SIZE }} onPointerDown={startGuide("y")} />
      <canvas ref={leftRef} className="canvas-ruler canvas-ruler--left" data-ruler="left" aria-label="Left ruler" style={{ width: RULER_SIZE }} onPointerDown={startGuide("x")} />
      {ghost && <div className="canvas-ruler__ghost" data-axis={ghost.axis} style={ghost.axis === "x" ? { left: ghost.at, top: 0, bottom: 0, width: 0 } : { top: ghost.at, left: 0, right: 0, height: 0 }} />}
    </>
  );
};
