"use client";

/**
 * The canvas lab (ROADMAP Phase 21): a developer page that puts five frames of 200 layers each on the real
 * canvas, so the pan and zoom gate ("60 fps with 5 frames × 200 layers") is measured in the real thing in
 * Chromium, Firefox and WebKit. Reachable at `/editor/canvas-lab`; nothing links to it.
 */
import React, { useCallback, useEffect, useState } from "react";
import { installCommandDispatcher } from "@/core/commands";
import { registerSelectionCommands } from "@/core/selection/selectionCommands";
import { createDocumentFromLayers, createLayer } from "@/core/document/factories";
import type { Layer } from "@/core/document/schema";
import { documentCommands } from "@/core/store/useDocumentStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { WhiteboardCanvas } from "@/editor/canvas/WhiteboardCanvas";

export const LAB_FRAMES = 5;
export const LAB_LAYERS_PER_FRAME = 200;

/** Five frames, each with 10 groups of 20 text layers (200 texts). Group g of frame f is `f{f}_g{g}`, its text i is `f{f}_g{g}_t{i}`. */
export const GROUPS_PER_FRAME = 10;
export const TEXTS_PER_GROUP = 20;

function labLayers(): Layer[] {
  const layers: Layer[] = [];
  for (let f = 0; f < LAB_FRAMES; f++) {
    const rootId = `frame_${f}`;
    const groupIds = Array.from({ length: GROUPS_PER_FRAME }, (_, g) => `f${f}_g${g}`);
    layers.push(
      createLayer({
        id: rootId,
        name: `Frame ${f + 1}`,
        archetype: "container",
        parentId: null,
        children: groupIds,
        properties: { "layout.gap": 4, "layout.padding": 8, "frame.x": f * 1000, "frame.y": 0, "frame.width": 880, "frame.height": 900 },
      }) as Layer,
    );
    groupIds.forEach((gid, g) => {
      const kids = Array.from({ length: TEXTS_PER_GROUP }, (_, i) => `${gid}_t${i}`);
      layers.push(createLayer({ id: gid, name: `Group ${g}`, archetype: "container", parentId: rootId, children: kids, properties: { "layout.gap": 0, "layout.padding": 0, "frame.width": 400 } }) as Layer);
      kids.forEach((id, i) =>
        layers.push(createLayer({ id, archetype: "text", parentId: gid, properties: { "content.text": `Frame ${f + 1} group ${g} text ${i}`, "typography.fontSize": 12, "frame.width": 400, "frame.height": 16 } }) as Layer),
      );
    });
  }
  return layers;
}

export const CanvasLab: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
  // The lab has no shell, so it brings the commands it exercises and the key dispatcher itself.
  useEffect(() => {
    const offKeys = installCommandDispatcher(window);
    const offSelection = registerSelectionCommands();
    return () => {
      offKeys();
      offSelection();
    };
  }, []);
  const selectedIds = useSelectionStore((st) => st.selectedIds);
  const load = useCallback(() => {
    documentCommands.replaceDocument(createDocumentFromLayers(labLayers()), "Load canvas lab");
    setLoaded(true);
  }, []);
  return (
    <main aria-label="Canvas lab" style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif", fontSize: 13 }}>
      <header style={{ padding: "8px 16px" }}>
        <strong>Canvas lab</strong> · {LAB_FRAMES} frames × {LAB_LAYERS_PER_FRAME} layers
        <button type="button" style={{ marginLeft: 12 }} onClick={load}>
          Load 5 frames × 200 layers
        </button>
        <button type="button" style={{ marginLeft: 12 }} onClick={() => documentCommands.setLayerFlags("f0_g1", { locked: true }, "Lock group")}>
          Lock f0_g1
        </button>
        <button type="button" style={{ marginLeft: 6 }} onClick={() => documentCommands.setLayerFlags("f0_g2", { visible: false }, "Hide group")}>
          Hide f0_g2
        </button>
        <span data-testid="selected" style={{ marginLeft: 12 }}>
          {selectedIds.length ? selectedIds.join(",") : "none"}
        </span>
        <span data-testid="lab-state" style={{ marginLeft: 12 }}>
          {loaded ? "loaded" : "empty"}
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <WhiteboardCanvas />
      </div>
    </main>
  );
};
