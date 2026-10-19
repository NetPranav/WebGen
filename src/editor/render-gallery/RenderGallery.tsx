"use client";

/**
 * The render gallery (Phase 17): every archetype drawn by its render definition, with default and
 * edge-case props. It draws through the same `StageFrame` as the editor's stage (Phase 18), so a
 * case looks here exactly as it does on the canvas: same document, same fonts, same viewport rules.
 * Reachable at `/editor/render-gallery`; nothing links to it.
 */
import React, { useMemo } from "react";
import { GALLERY_CASES, buildGalleryLayers } from "@/core/render/gallery";
import { RenderLayer } from "@/core/render/RenderLayer";
import { StageFrame } from "@/editor/stage/StageFrame";

export const RenderGallery: React.FC = () => {
  const layers = useMemo(() => buildGalleryLayers(), []);
  return (
    <main aria-label="Render gallery" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ padding: "16px 24px 8px" }}>
        <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>Render gallery</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{GALLERY_CASES.length} cases, every archetype drawn by its render definition inside a stage frame (Phases 17 and 18).</p>
      </header>
      <StageFrame title="Render gallery frame" height="100%" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, 400px)", gap: 16, fontFamily: "Inter, system-ui, sans-serif", color: "#0f172a" }}>
          {GALLERY_CASES.map((c) => (
            <section
              key={c.id}
              data-gallery-case={c.id}
              data-archetype={c.archetype}
              data-expect-width={c.expectSize?.width}
              data-expect-height={c.expectSize?.height}
              style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff", padding: 12 }}
            >
              <h2 style={{ fontSize: 12, fontWeight: 600, margin: "0 0 8px", color: "#475569" }}>
                {c.label} <code style={{ color: "#94a3b8" }}>{c.archetype}</code>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minHeight: 40, position: "relative" }}>
                <RenderLayer layerId={`gallery_${c.id}`} layers={layers} />
              </div>
            </section>
          ))}
        </div>
      </StageFrame>
    </main>
  );
};
