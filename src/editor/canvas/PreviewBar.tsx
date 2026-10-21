"use client";

import React, { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { invokeCommand } from "@/core/commands";
import { anchorOf, sectionsOf } from "@/core/pages/pages";
import { previewAddress, previewStart } from "@/core/pages/previewOps";
import { documentStore } from "@/core/store/documentState";
import { useCanvasViewStore } from "@/core/store/useCanvasViewStore";
import { usePreviewStore } from "@/core/store/usePreviewStore";

/**
 * The Preview bar (ROADMAP Phase 48): back, forward and the address of the page being shown, like a browser's. It also
 * keeps Preview in step: starting it picks the frame to show, and each visit centres that frame and scrolls to the
 * section a link named.
 */
export const PreviewBar: React.FC = () => {
  const mode = useCanvasViewStore((s) => s.mode);
  const index = usePreviewStore((s) => s.index);
  const count = usePreviewStore((s) => s.entries.length);
  const nonce = usePreviewStore((s) => s.nonce);
  const doc = documentStore((s) => s.document);

  useEffect(() => {
    if (mode === "preview") previewStart();
  }, [mode]);

  useEffect(() => {
    if (mode !== "preview") return undefined;
    const cur = usePreviewStore.getState().current();
    if (!cur) return undefined;
    void invokeCommand("frame.focus", { frameId: cur.frameId, camera: true });
    if (!cur.anchor) return undefined;
    // the frame's own scroll: to the section the link named, once the frame is drawn
    const scroll = () => {
      const layers = documentStore.getState().document.layers;
      const section = sectionsOf(layers, cur.frameId).find((s) => anchorOf(s) === cur.anchor);
      const iframe = document.querySelector<HTMLIFrameElement>(`.canvas-frame[data-frame-id="${cur.frameId}"] iframe`);
      iframe?.contentDocument?.querySelector(`[data-element-id="${section?.id}"]`)?.scrollIntoView({ block: "start" });
    };
    const t1 = window.setTimeout(scroll, 60);
    const t2 = window.setTimeout(scroll, 300); // the layout of a page that has just been shown settles a moment later
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [mode, nonce]);

  if (mode !== "preview") return null;
  void doc;
  return (
    <div className="preview-bar" role="toolbar" aria-label="Preview navigation" onPointerDown={(e) => e.stopPropagation()} style={{ position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)", width: "max-content", display: "flex", gap: 4, alignItems: "center", padding: 4, borderRadius: 10, background: "var(--panel-bg, #fff)", boxShadow: "0 1px 6px rgba(0,0,0,0.18)", zIndex: 45, fontSize: 12 }}>
      <button type="button" className="panel-icon-btn" aria-label="Back" title="Back (Alt+Left)" disabled={index <= 0} onClick={() => void usePreviewStore.getState().back()}>
        <ArrowLeft size={14} />
      </button>
      <button type="button" className="panel-icon-btn" aria-label="Forward" title="Forward (Alt+Right)" disabled={index >= count - 1} onClick={() => void usePreviewStore.getState().forward()}>
        <ArrowRight size={14} />
      </button>
      <span role="status" aria-label="Address" data-testid="preview-address" style={{ padding: "2px 10px", minWidth: 120, background: "rgba(128,128,128,0.12)", borderRadius: 6 }}>
        {previewAddress()}
      </span>
    </div>
  );
};
