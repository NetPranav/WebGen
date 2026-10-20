import React from "react";
import type { CSSProperties } from "react";
import type { Layer } from "../document/schema";
import { getLayerGeometry } from "../document/properties";
import { effectiveFills, fillLayers, imageFilterCss, imageLayout, paintCss, parseFills, type ImagePaint } from "../paint/paints";
import { useAssetUrlMap } from "../assets/useAssetUrl";
import type { ResolvedProps } from "./types";

/** The data attribute the filtered-image layer carries (the render gallery and the tests look for it). */
export const FILL_LAYER_ATTR = "data-fill-layer";

/**
 * The background of an HTML layer (Phase 35, 37). With no `paint.fills` it is the layer's plain colour, exactly as
 * before. With them, the fills stack as background images (first on top) and the plain colour steps aside. A picture
 * whose colours are changed (brightness, contrast, saturation) can't be a background image, so it is drawn by a
 * `<span>` of its own behind the layer's content, and `isolate` says the layer must make its own stacking context.
 */
export function useFillStyle(layer: Layer, resolved: ResolvedProps, plainColor: string): { style: CSSProperties; overlay: React.ReactNode } {
  const fills = parseFills(resolved.get("paint.fills"));
  const list = fills === null ? [] : effectiveFills(resolved.get("paint.fills"), undefined);
  const urlOf = useAssetUrlMap(list.filter((p): p is ImagePaint => p.type === "image").map((p) => p.src));
  if (fills === null) return { style: { backgroundColor: plainColor }, overlay: null };
  const g = getLayerGeometry(layer);
  const { layers, filtered } = fillLayers(list, g.frame.width, g.frame.height, urlOf);
  const style: CSSProperties = {
    backgroundColor: "transparent",
    ...(layers ? { backgroundImage: layers.image, backgroundSize: layers.size, backgroundPosition: layers.position, backgroundRepeat: layers.repeat } : {}),
    ...(filtered.length ? { isolation: "isolate" as const } : {}),
  };
  const overlay =
    filtered.length === 0 ? null : (
      <>
        {filtered.map((p, i) => {
          const url = urlOf(p.src);
          if (!url) return null;
          const l = imageLayout(p);
          return (
            <span
              key={i}
              {...{ [FILL_LAYER_ATTR]: "image" }}
              aria-hidden="true"
              style={{
                position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none", borderRadius: "inherit",
                backgroundImage: paintCss(p, g.frame.width, g.frame.height, urlOf) ?? undefined, backgroundSize: l.size, backgroundPosition: l.position, backgroundRepeat: l.repeat,
                filter: imageFilterCss(p), opacity: p.opacity,
              }}
            />
          );
        })}
      </>
    );
  return { style, overlay };
}
