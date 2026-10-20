"use client";

import React, { useEffect, useRef } from "react";
import type { CanvasHitTester } from "@/core/hit/CanvasHitTester";
import { documentStore, getDocument } from "@/core/store/documentState";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { useCanvasViewStore } from "@/core/store/useCanvasViewStore";
import { useCameraStore } from "@/core/store/useCameraStore";
import { useToolStore } from "@/core/store/useToolStore";
import { screenToDoc, type Point } from "@/core/viewport/camera";
import { OverlayController, type OverlayEnv } from "./OverlayController";
import { useSnapStore } from "@/core/store/useSnapStore";
import { useFontsStore } from "@/core/store/useFontsStore";
import { useDraftPathStore } from "@/core/store/useDraftPathStore";
import { nodesToPathData } from "@/core/paths/pathFit";
import { penRubberBand } from "@/core/paths/penModel";
import { VectorEditLayer } from "../vector/VectorEditLayer";
import type { TransformModel } from "../transformModel";

/** The path being drawn (Phase 39): the pencil's stroke so far, or the pen's nodes with the rubber band to the pointer. */
const DraftPath: React.FC = () => {
  const { kind, points, nodes, closed, cursor } = useDraftPathStore();
  const zoom = useCameraStore((s) => s.camera.zoom) || 1;
  if (!kind) return null;
  const px = 1 / zoom;
  const d =
    kind === "pencil"
      ? points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ")
      : nodesToPathData(cursor && !closed ? penRubberBand({ nodes, closed }, cursor) : nodes, closed);
  return (
    <svg data-testid="draft-path" style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, overflow: "visible", pointerEvents: "none" }}>
      <path d={d} fill="none" stroke="#2563eb" strokeWidth={1.5 * px} strokeLinecap="round" strokeLinejoin="round" />
      {kind === "pen" &&
        nodes.map((n, i) => (
          <rect key={i} x={n.x - 3 * px} y={n.y - 3 * px} width={6 * px} height={6 * px} fill={i === 0 ? "#2563eb" : "#fff"} stroke="#2563eb" strokeWidth={px} />
        ))}
    </svg>
  );
};

interface OverlayLayerProps {
  hitTester: CanvasHitTester;
  /** The canvas element, whose pointer the overlay follows. */
  canvasRef: React.RefObject<HTMLElement | null>;
  /** The transform handles' target for the current selection, or null. */
  transformModel: () => TransformModel | null;
  guides: OverlayEnv["guides"];
  hudMarks: OverlayEnv["hudMarks"];
  /** Called when the hovered layer changes (the canvas keeps it for tests and for the status line). */
  onController?: (controller: OverlayController | null) => void;
}

/**
 * The overlay layer: a world-space container above the frames (`pointer-events: none`) that the
 * `OverlayController` draws into. It listens to the pointer on the canvas element and to selection, document
 * and mode changes, and asks the controller for a redraw; the controller draws on the next frame.
 */
export const OverlayLayer: React.FC<OverlayLayerProps> = ({ hitTester, canvasRef, transformModel, guides, hudMarks, onController }) => {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef(hudMarks);
  const guidesRef = useRef(guides);
  useEffect(() => {
    hudRef.current = hudMarks;
    guidesRef.current = guides;
  }, [hudMarks, guides]);
  const transformModelRef = useRef(transformModel);
  useEffect(() => {
    transformModelRef.current = transformModel;
  }, [transformModel]);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    if (!layer || !canvas) return undefined;

    let pointer: Point | null = null; // client coordinates relative to the canvas
    let deep = false;
    const controller = new OverlayController(layer, {
      hitTester,
      pointerWorld: () => (pointer ? screenToDoc(useCameraStore.getState().camera, pointer) : null),
      // Cmd/Ctrl held without moving the pointer counts too: the tool store knows (its deep-select spring), the mouse event only on the next move
      deep: () => deep || useToolStore.getState().current === "deepSelect",
      hoverEnabled: () => useCanvasViewStore.getState().mode === "design",
      selectedIds: () => (useCanvasViewStore.getState().mode === "design" ? useSelectionStore.getState().selectedIds : []),
      layerName: (id) => getDocument().layers[id]?.name ?? id,
      transformModel: () => transformModelRef.current(),
      snapFeedback: () => ({ lines: useSnapStore.getState().lines, spacing: useSnapStore.getState().spacing }),
      hudMarks: () => hudRef.current(),
      guides: () => guidesRef.current(),
    });
    onController?.(controller);

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      deep = e.metaKey || e.ctrlKey;
      controller.invalidate();
    };
    const onLeave = () => {
      pointer = null;
      controller.invalidate();
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    const offSelection = useSelectionStore.subscribe((s, p) => {
      if (s.selectedIds !== p.selectedIds) controller.invalidate(true);
    });
    const offDocument = documentStore.subscribe((s, p) => {
      if (s.document !== p.document) controller.invalidate(true);
    });
    const offView = useCanvasViewStore.subscribe((s, p) => {
      if (s.mode !== p.mode || s.editingPaint !== p.editingPaint) controller.invalidate(true);
    });
    const offCamera = useCameraStore.subscribe((s, p) => {
      // the pointer's place in canvas space moves when the camera does under a still pointer
      if (pointer && s.camera !== p.camera) controller.invalidate();
    });
    const offSnap = useSnapStore.subscribe(() => controller.invalidate());
    const offFonts = useFontsStore.subscribe(() => controller.invalidate(true)); // a font loaded: text changed size

    const offTool = useToolStore.subscribe((s, p) => {
      if (s.current !== p.current) controller.invalidate();
    });
    controller.invalidate(true);

    return () => {
      offTool();
      offSnap();
      offFonts();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      offSelection();
      offDocument();
      offView();
      offCamera();
      controller.dispose();
      onController?.(null);
    };
  }, [hitTester, canvasRef, onController]);

  return (
    <>
      <div ref={layerRef} className="canvas-overlay" aria-hidden="true" />
      <DraftPath />
      <VectorEditLayer />
    </>
  );
};
