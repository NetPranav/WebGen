"use client";

/**
 * The stage lab (ROADMAP Phase 19): a developer page that loads a 500-layer document into the real
 * stage and edits it through the real document commands, so the incremental-update gates are measured
 * in Chromium, Firefox and WebKit: how long 500 layers take to appear, that an edit re-renders only the
 * layer it touched, and that `renderer.measure()` agrees with the DOM. Reachable at
 * `/editor/stage-lab`; nothing links to it.
 */
import React, { useCallback, useState } from "react";
import { createDocumentFromLayers, createLayer } from "@/core/document/factories";
import type { Layer } from "@/core/document/schema";
import { documentCommands } from "@/core/store/useDocumentStore";
import { StageHost } from "@/editor/stage/StageHost";

export const LAB_ROOT = "el_root_container";
export const LAB_COUNT = 500;
export const labId = (i: number) => `lab_${String(i).padStart(3, "0")}`;

function labLayers(): Layer[] {
  const children = Array.from({ length: LAB_COUNT }, (_, i) => labId(i));
  const kids = children.map(
    (id, i) =>
      createLayer({ id, archetype: "text", parentId: LAB_ROOT, properties: { "content.text": `Layer ${i}`, "typography.fontSize": 14, "frame.width": 400, "frame.height": 24 } }) as Layer,
  );
  const root = createLayer({ id: LAB_ROOT, archetype: "container", parentId: null, children, properties: { "layout.gap": 2, "layout.padding": 8, "frame.width": 800 } }) as Layer;
  return [root, ...kids];
}

const button: React.CSSProperties = { padding: "4px 10px", marginRight: 6, border: "1px solid #94a3b8", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12 };

export const StageLab: React.FC = () => {
  const [mountMs, setMountMs] = useState<number | null>(null);
  const [edits, setEdits] = useState(0);

  const frameDocument = () => document.querySelector<HTMLIFrameElement>('iframe[title="Stage"]')?.contentDocument ?? null;

  /** Loads the 500 layers and times how long until all of them are in the frame's DOM. */
  const load = useCallback(() => {
    const doc = frameDocument();
    if (!doc) return;
    const count = () => doc.querySelectorAll('[data-element-id^="lab_"]').length;
    const t0 = performance.now();
    const done = () => setMountMs(performance.now() - t0);
    const observer = new MutationObserver(() => {
      if (count() >= LAB_COUNT) {
        observer.disconnect();
        doc.body.getBoundingClientRect(); // layout
        done();
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    documentCommands.replaceDocument(createDocumentFromLayers(labLayers()), "Load stage lab");
  }, []);

  const editOne = useCallback(() => {
    setEdits((n) => n + 1);
    documentCommands.updateProps(labId(250), { "content.text": `Edited ${Date.now()}` }, "Edit one layer");
  }, []);
  const addOne = useCallback(() => {
    documentCommands.insertLayers([createLayer({ id: "lab_new", archetype: "text", parentId: LAB_ROOT, properties: { "content.text": "New layer", "frame.width": 400, "frame.height": 24 } }) as Layer], [], "Add one layer");
  }, []);
  const removeOne = useCallback(() => documentCommands.removeLayer(labId(100), "Remove one layer"), []);
  const reset = useCallback(() => {
    (globalThis as { __LL_RENDER_STATS__?: Record<string, number> }).__LL_RENDER_STATS__ = {};
  }, []);

  return (
    <main aria-label="Stage lab" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", fontSize: 13 }}>
      <header style={{ padding: "12px 16px" }}>
        <strong>Stage lab</strong> · {LAB_COUNT} text layers in the real stage
        <div style={{ marginTop: 8 }}>
          <button type="button" style={button} onClick={load}>Load 500 layers</button>
          <button type="button" style={button} onClick={editOne}>Edit one layer</button>
          <button type="button" style={button} onClick={addOne}>Add one layer</button>
          <button type="button" style={button} onClick={removeOne}>Remove one layer</button>
          <button type="button" style={button} onClick={reset}>Reset render counts</button>
          <span data-testid="mount-ms">{mountMs === null ? "not loaded" : `mounted in ${mountMs.toFixed(1)} ms`}</span>
          <span data-testid="edit-count" style={{ marginLeft: 12 }}>edits: {edits}</span>
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0, margin: "0 16px 16px" }}>
        <StageHost width={880} height="100%" />
      </div>
    </main>
  );
};
