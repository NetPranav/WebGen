"use client";

/**
 * ROADMAP Phase 19: a layer drawn from the document store, one subscription per layer.
 *
 * `useLayer(id)` selects that layer's own object (Immer's structural sharing keeps every untouched
 * layer's reference identical across an edit), and the layer's drawn children come from the plan store,
 * which hands out the same array while a layer's children are unchanged. Wrapped in `memo`, so a property
 * edit re-renders the layer it touched and nothing else; adding or removing a layer re-renders its parent.
 */
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useLayer } from "@/core/store/useDocumentStore";
import { RENDER_DEFINITIONS } from "./definitions";
import { resolveProps } from "./resolve";
import { recordRender } from "./renderStats";
import type { PlanStore } from "./planStore";
import type { StageRenderer } from "./StageRenderer";
import type { RenderContext } from "./types";

/** What every layer of one stage shares. Stable for the life of the stage, except `ctx` (state variables). */
export interface StageContextValue {
  plan: PlanStore;
  renderer: StageRenderer;
  ctx: RenderContext;
}

export const StageContext = createContext<StageContextValue | null>(null);

interface StoreRenderLayerProps {
  layerId: string;
  /** The parent's main axis; decides what `fill` means for this layer. */
  parentDirection?: "row" | "column" | "grid";
}

function StoreRenderLayerImpl({ layerId, parentDirection }: StoreRenderLayerProps) {
  const stage = useContext(StageContext);
  if (!stage) throw new Error("StoreRenderLayer must be rendered inside a StageContext");
  const { plan, renderer, ctx: stageCtx } = stage;

  const layer = useLayer(layerId);
  const childIds = useSyncExternalStore(plan.subscribe, () => plan.get(layerId), () => plan.get(layerId));
  const resolved = useMemo(() => (layer ? resolveProps(layer) : null), [layer]);
  const ctx = useMemo<RenderContext>(() => ({ ...stageCtx, parentDirection }), [stageCtx, parentDirection]);

  // The registry always holds the element this layer is currently drawn into.
  const lastElement = useRef<Element | null>(null);
  const nodeRef = useCallback(
    (element: Element | null) => {
      if (element) {
        lastElement.current = element;
        renderer.registry.register(layerId, element);
      } else if (lastElement.current) {
        renderer.registry.unregister(layerId, lastElement.current);
        lastElement.current = null;
      }
    },
    [renderer, layerId],
  );

  useEffect(() => recordRender(layerId));

  if (!layer || !resolved || !childIds) return null;
  const Definition = RENDER_DEFINITIONS[layer.archetype];
  const isFlexContainer = layer.archetype === "container" || layer.archetype === "form";
  const childDirection = isFlexContainer && resolved.str("layout.display", "flex") === "grid" ? "grid" : isFlexContainer && resolved.str("layout.flexDirection", "column") === "row" ? "row" : "column";

  return (
    <Definition layer={layer} resolved={resolved} ctx={ctx} nodeRef={nodeRef}>
      {childIds.map((childId) => (
        <StoreRenderLayer key={childId} layerId={childId} parentDirection={childDirection} />
      ))}
    </Definition>
  );
}

export const StoreRenderLayer = memo(StoreRenderLayerImpl);
