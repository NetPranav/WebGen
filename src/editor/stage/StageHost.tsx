"use client";

/**
 * The design stage (ROADMAP Phase 18, incremental since Phase 19): the active page's layers drawn by the
 * render definitions (`src/core/render`, Law 11) into a live DOM frame. Every layer subscribes to its own
 * object in the document store, so an edit re-renders the layer it touched and nothing else, and the
 * frame's document is never reloaded. The `StageRenderer` keeps each layer's element (for per-frame
 * writes without React, Law 9) and measures layers in document space. Clicking an element reports its
 * layer id to the editor.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useDocument } from "@/core/store/useDocumentStore";
import { documentStore, getDocument } from "@/core/store/documentState";
import { useProjectStore } from "@/core/store/useProjectStore";
import type { RenderContext } from "@/core/render";
import { createPlanStore } from "@/core/render/planStore";
import { StageContext, StoreRenderLayer, type StageContextValue } from "@/core/render/StoreRenderLayer";
import { StageRenderer, registerFrameRenderer, setStageRenderer } from "@/core/render/StageRenderer";
import { StageFrame, type FrameMount } from "./StageFrame";

export interface StageHostProps {
  width?: number | string;
  height?: number | string;
  /** A canvas frame (Phase 21): the top-level layer this stage draws, alone, at the origin of its own frame element. */
  frameId?: string;
  /** The frame element's title (for assistive technology and tests). */
  title?: string;
  /** Called with the layer id of a clicked element. */
  onElementClick?: (layerId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

/** Test seam: with `window.__LL_TEST__` set before load, the stage's renderer is reachable at `window.__LL_STAGE__`. */
declare global {
  interface Window {
    __LL_TEST__?: boolean;
    __LL_STAGE__?: StageRenderer;
  }
}

export const StageHost: React.FC<StageHostProps> = ({ width = "100%", height = "100%", frameId, title = "Stage", onElementClick, className, style }) => {
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const stateVariables = useProjectStore((s) => s.stateVariables);
  const page = pages[activePageId] ?? Object.values(pages)[0];

  // The ids drawn at the top: the page's root layer if it exists, otherwise every parentless layer. A string, so a
  // property edit (which can't change it) doesn't re-render the host.
  const rootKey = useDocument((d) => {
    if (frameId) return d.layers[frameId] ? frameId : "";
    const id = page?.rootElementId;
    if (id && d.layers[id]) return id;
    return Object.values(d.layers)
      .filter((l) => l.parentId === null)
      .map((l) => l.id)
      .join(",");
  });
  const rootIds = useMemo(() => (rootKey ? rootKey.split(",") : []), [rootKey]);

  const [plan] = useState(() => {
    const store = createPlanStore();
    store.refresh(getDocument().layers, rootIds); // the first paint already has its content
    return store;
  });
  const [renderer] = useState(() => new StageRenderer());

  // Keep the plan in step with the document: a structural change (ids, children, visibility, roots) updates it; a property edit doesn't.
  useLayoutEffect(() => {
    plan.refresh(getDocument().layers, rootIds);
    return documentStore.subscribe((state) => {
      plan.refresh(state.document.layers, rootIds);
    });
  }, [plan, rootIds]);

  const handleFrame = useCallback(
    (frame: FrameMount | null) => {
      if (frame) renderer.attach({ window: frame.window, root: frame.root });
      else renderer.detach();
    },
    [renderer],
  );

  useEffect(() => {
    const off = frameId ? registerFrameRenderer(frameId, renderer) : undefined;
    if (!frameId) setStageRenderer(renderer);
    if (window.__LL_TEST__) window.__LL_STAGE__ = renderer;
    return () => {
      off?.();
      if (!frameId) setStageRenderer(null);
      if (window.__LL_STAGE__ === renderer) delete window.__LL_STAGE__;
    };
  }, [renderer, frameId]);

  // `{{name}}` in a text layer shows the state variable's value.
  const ctx = useMemo<RenderContext>(
    () => ({
      frameAtOrigin: frameId !== undefined,
      interpolate: (text) =>
        text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, name: string) => {
          const v = stateVariables[name];
          return v === undefined ? match : String(v.value ?? v.defaultValue ?? "");
        }),
    }),
    [stateVariables, frameId],
  );
  const stage = useMemo<StageContextValue>(() => ({ plan, renderer, ctx }), [plan, renderer, ctx]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const el = (e.target as Element).closest?.("[data-element-id]");
      const id = el?.getAttribute("data-element-id");
      if (id) onElementClick?.(id);
    },
    [onElementClick],
  );

  return (
    <StageFrame title={title} frameId={frameId} width={width} height={height} className={className} style={style} focusScope="canvas" onFrame={handleFrame}>
      <StageContext.Provider value={stage}>
        <div data-stage-content onClick={handleClick} style={{ position: "relative", minHeight: "100%" }}>
          {rootIds.map((id) => (
            <StoreRenderLayer key={id} layerId={id} />
          ))}
        </div>
      </StageContext.Provider>
    </StageFrame>
  );
};
