"use client";

/**
 * The design stage (ROADMAP Phase 18, replacing `SandboxHost` on the canvas): the active page's
 * layers drawn by the render definitions (`src/core/render`, Law 11) into a live DOM frame. An edit
 * re-renders the affected elements in place; the frame's document is never reloaded and no HTML
 * string is built. Clicking an element reports its layer id to the editor.
 */
import React, { useCallback, useMemo } from "react";
import { useLayers } from "@/core/store/useDocumentStore";
import { useProjectStore } from "@/core/store/useProjectStore";
import { RenderTree } from "@/core/render";
import type { RenderContext } from "@/core/render";
import { StageFrame } from "./StageFrame";

export interface StageHostProps {
  width?: number | string;
  height?: number | string;
  /** Called with the layer id of a clicked element. */
  onElementClick?: (layerId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const StageHost: React.FC<StageHostProps> = ({ width = "100%", height = "100%", onElementClick, className, style }) => {
  const layers = useLayers();
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const stateVariables = useProjectStore((s) => s.stateVariables);

  const page = pages[activePageId] ?? Object.values(pages)[0];
  const rootIds = useMemo(() => (page?.rootElementId && layers[page.rootElementId] ? [page.rootElementId] : undefined), [page, layers]);

  // `{{name}}` in a text layer shows the state variable's value.
  const ctx = useMemo<RenderContext>(
    () => ({
      interpolate: (text) =>
        text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, name: string) => {
          const v = stateVariables[name];
          return v === undefined ? match : String(v.value ?? v.defaultValue ?? "");
        }),
    }),
    [stateVariables],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const el = (e.target as Element).closest?.("[data-element-id]");
      const id = el?.getAttribute("data-element-id");
      if (id) onElementClick?.(id);
    },
    [onElementClick],
  );

  return (
    <StageFrame title="Stage" width={width} height={height} className={className} style={style}>
      <div data-stage-content onClick={handleClick} style={{ position: "relative", minHeight: "100%" }}>
        <RenderTree layers={layers} rootIds={rootIds} ctx={ctx} />
      </div>
    </StageFrame>
  );
};
