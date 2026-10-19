"use client";

/**
 * The canvas lab (ROADMAP Phase 21): a developer page that puts five frames of 200 layers each on the real
 * canvas, so the pan and zoom gate ("60 fps with 5 frames × 200 layers") is measured in the real thing in
 * Chromium, Firefox and WebKit. Reachable at `/editor/canvas-lab`; nothing links to it.
 */
import React, { useCallback, useState } from "react";
import { createDocumentFromLayers, createLayer } from "@/core/document/factories";
import type { Layer } from "@/core/document/schema";
import { documentCommands } from "@/core/store/useDocumentStore";
import { WhiteboardCanvas } from "@/editor/canvas/WhiteboardCanvas";

export const LAB_FRAMES = 5;
export const LAB_LAYERS_PER_FRAME = 200;

function labLayers(): Layer[] {
  const layers: Layer[] = [];
  for (let f = 0; f < LAB_FRAMES; f++) {
    const rootId = `frame_${f}`;
    const kids = Array.from({ length: LAB_LAYERS_PER_FRAME }, (_, i) => `f${f}_l${i}`);
    layers.push(
      createLayer({
        id: rootId,
        name: `Frame ${f + 1}`,
        archetype: "container",
        parentId: null,
        children: kids,
        properties: { "layout.gap": 2, "layout.padding": 8, "frame.x": f * 1000, "frame.y": 0, "frame.width": 880, "frame.height": 900 },
      }) as Layer,
    );
    kids.forEach((id, i) =>
      layers.push(
        createLayer({ id, archetype: "text", parentId: rootId, properties: { "content.text": `Frame ${f + 1} layer ${i}`, "typography.fontSize": 14, "frame.width": 400, "frame.height": 24 } }) as Layer,
      ),
    );
  }
  return layers;
}

export const CanvasLab: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
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
