"use client";

/**
 * The render gallery (Phase 17): every archetype drawn by its render definition, with default and
 * edge-case props. It is how a change to a definition is reviewed by eye, and the browser test
 * measures it in Chromium, Firefox and WebKit. Reachable at `/editor/render-gallery`; nothing links to it.
 */
import React, { useMemo } from "react";
import { GALLERY_CASES, buildGalleryLayers } from "@/core/render/gallery";
import { RenderLayer } from "@/core/render/RenderLayer";

export const RenderGallery: React.FC = () => {
  const layers = useMemo(() => buildGalleryLayers(), []);
  return (
    <main aria-label="Render gallery" style={{ height: "100%", overflow: "auto", background: "#f8fafc", color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>Render gallery</h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>{GALLERY_CASES.length} cases, every archetype drawn by its render definition (Phase 17).</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 400px)", gap: 16 }}>
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
    </main>
  );
};
