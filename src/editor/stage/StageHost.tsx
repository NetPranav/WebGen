"use client";

/**
 * The design stage (ROADMAP Phase 18, incremental since Phase 19): the active page's layers drawn by the
 * render definitions (`src/core/render`, Law 11) into a live DOM frame. Every layer subscribes to its own
 * object in the document store, so an edit re-renders the layer it touched and nothing else, and the
 * frame's document is never reloaded. The animation engine (Phase 57) puts the transport's time on the stage. The `StageRenderer` keeps each layer's element (for per-frame
 * writes without React, Law 9) and measures layers in document space. Clicking an element reports its
 * layer id to the editor.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getResolvedDocument, useDocumentAt } from "@/core/store/useDocumentStore";
import { resolveDocumentAt } from "@/core/breakpoints/breakpoints";
import { useBreakpointStore } from "@/core/store/useBreakpointStore";
import { useModeStore } from "@/core/store/useModeStore";
import { documentStore, getDocument } from "@/core/store/documentState";
import { useProjectStore } from "@/core/store/useProjectStore";
import type { RenderContext } from "@/core/render";
import { createPlanStore } from "@/core/render/planStore";
import { StageContext, StoreRenderLayer, type StageContextValue } from "@/core/render/StoreRenderLayer";
import { StageRenderer, registerFrameRenderer, setStageRenderer } from "@/core/render/StageRenderer";
import { installStageEngine } from "@/core/engine/stage/StageEngine";
import { evaluate } from "@/core/kernel/evaluate";
import { getTransport, transport } from "@/core/time/transport";
import { parityStore } from "@/core/engine/stage/parity";
import { StageFrame, type FrameMount } from "./StageFrame";
import { useFontSync } from "../fonts/useFontSync";
import { useFontsStore } from "@/core/store/useFontsStore";

export interface StageHostProps {
  width?: number | string;
  height?: number | string;
  /** A canvas frame (Phase 21): the top-level layer this stage draws, alone, at the origin of its own frame element. */
  frameId?: string;
  /** The breakpoint this stage draws (Phase 44), whatever the one being edited is; absent: the one being edited. */
  breakpointId?: string | null;
  /** A preview of a breakpoint beside the real frame: it registers no renderer of its own and runs no engine. */
  ghost?: boolean;
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
    __LL_ENGINE__?: { kernel(layerId: string, time: number): Record<string, unknown>; seek(time: number): void; play(): void; pause(): void; time(): number; parity(): { status: string; drifts: unknown[] }; document(): unknown; loop(on: boolean): void };
  }
}

export const StageHost: React.FC<StageHostProps> = ({ width = "100%", height = "100%", frameId, title = "Stage", onElementClick, className, style, breakpointId, ghost = false }) => {
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const stateVariables = useProjectStore((s) => s.stateVariables);
  const page = pages[activePageId] ?? Object.values(pages)[0];

  // The ids drawn at the top: the page's root layer if it exists, otherwise every parentless layer. A string, so a
  // property edit (which can't change it) doesn't re-render the host.
  const rootKey = useDocumentAt((d) => {
    if (frameId) return d.layers[frameId] ? frameId : "";
    const id = page?.rootElementId;
    if (id && d.layers[id]) return id;
    return Object.values(d.layers)
      .filter((l) => l.parentId === null)
      .map((l) => l.id)
      .join(",");
  }, breakpointId);
  const rootIds = useMemo(() => (rootKey ? rootKey.split(",") : []), [rootKey]);

  // the document as this stage draws it: at its own breakpoint, or at the one being edited
  const seen = useCallback(() => (breakpointId === undefined ? getResolvedDocument() : resolveDocumentAt(getDocument(), breakpointId, useModeStore.getState().activeModeId)), [breakpointId]);
  const [plan] = useState(() => {
    const store = createPlanStore();
    store.refresh(seen().layers, rootIds); // the first paint already has its content
    return store;
  });
  const [renderer] = useState(() => new StageRenderer());

  // Keep the plan in step with the document: a structural change (ids, children, visibility, roots) updates it; a property edit doesn't.
  useLayoutEffect(() => {
    plan.refresh(seen().layers, rootIds);
    // the document changed, or another breakpoint is being viewed (a layer hidden there, a frame at its width)
    const offDoc = documentStore.subscribe(() => plan.refresh(seen().layers, rootIds));
    const offBp = useBreakpointStore.subscribe(() => plan.refresh(seen().layers, rootIds));
    const offMode = useModeStore.subscribe(() => plan.refresh(seen().layers, rootIds));
    return () => {
      offDoc();
      offBp();
      offMode();
    };
  }, [plan, rootIds, seen]);

  const [frameDoc, setFrameDoc] = useState<Document | null>(null);
  const handleFrame = useCallback(
    (frame: FrameMount | null) => {
      if (frame) renderer.attach({ window: frame.window, root: frame.root });
      else renderer.detach();
      setFrameDoc(frame ? frame.document : null);
    },
    [renderer],
  );
  // the document's fonts, in this frame's document; a loaded font makes the renderer measure again (Phase 38)
  useFontSync(frameDoc, () => renderer.invalidate());
  // a layer changing size (a font arriving, typing) makes the overlay measure again; engines differ in whether they say "font loaded"
  useEffect(() => renderer.onLayout(() => useFontsStore.getState().bump()), [renderer]);

  useEffect(() => {
    if (ghost) return undefined; // a preview of another breakpoint is not the frame's renderer
    const off = frameId ? registerFrameRenderer(frameId, renderer) : undefined;
    if (!frameId) setStageRenderer(renderer);
    if (window.__LL_TEST__) window.__LL_STAGE__ = renderer;
    return () => {
      off?.();
      if (!frameId) setStageRenderer(null);
      if (window.__LL_STAGE__ === renderer) delete window.__LL_STAGE__;
    };
  }, [renderer, frameId, ghost]);

  // The animation engine: shows the transport's time on the stage by writing to the layers' elements (Phase 57).
  useEffect(() => {
    if (ghost) return undefined;
    const uninstall = installStageEngine(renderer);
    // Test seam: the kernel's answer for a layer, and the transport's seek, so a browser test can compare the stage with the oracle.
    if (window.__LL_TEST__) {
      window.__LL_ENGINE__ = { kernel: (layerId, time) => evaluate(getDocument(), getTransport().compositionId, layerId, time), seek: (time) => transport.seek(time), play: () => transport.play(), pause: () => transport.pause(), time: () => getTransport().time, parity: () => parityStore.getState(), document: () => getDocument(), loop: (on) => transport.setLoop(on ? "loop" : "off") };
    }
    return () => {
      uninstall();
      delete window.__LL_ENGINE__;
    };
  }, [renderer, ghost]);

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
  const stage = useMemo<StageContextValue>(() => ({ plan, renderer, ctx, breakpointId }), [plan, renderer, ctx, breakpointId]);

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
