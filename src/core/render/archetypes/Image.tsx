import React from "react";
import { layerBoxStyle, px } from "../geometry";
import { clampNumber, safeImageSrc } from "../limits";
import type { ArchetypeRenderProps } from "../types";

const FITS = new Set(["cover", "contain", "fill", "none", "scale-down"]);

/** An `image`. A source that isn't a safe image URL is not loaded; the alt text shows instead. */
export const Image: React.FC<ArchetypeRenderProps> = ({ layer, resolved, ctx, nodeRef }) => {
  const src = safeImageSrc(resolved.str("media.src", ""));
  const alt = resolved.str("media.alt", layer.name);
  const fit = resolved.str("media.objectFit", "cover");
  const filters = [
    `grayscale(${clampNumber(resolved.num("media.filter.grayscale", 0), 0, 1, 0)})`,
    `blur(${clampNumber(resolved.num("media.filter.blur", 0), 0, 100, 0)}px)`,
    `brightness(${clampNumber(resolved.num("media.filter.brightness", 1), 0, 5, 1)})`,
    `contrast(${clampNumber(resolved.num("media.filter.contrast", 1), 0, 5, 1)})`,
    `saturate(${clampNumber(resolved.num("media.filter.saturate", 1), 0, 5, 1)})`,
  ].join(" ");
  const overlayOpacity = clampNumber(resolved.num("media.overlay.opacity", 0), 0, 1, 0);
  const box = layerBoxStyle(layer, resolved, ctx);
  return (
    <div
      ref={nodeRef}
      data-element-id={layer.id}
      data-archetype="image"
      style={{ ...box, overflow: "hidden", borderRadius: px(resolved.num("appearance.radius", 0)), display: "inline-block", lineHeight: 0 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: (FITS.has(fit) ? fit : "cover") as React.CSSProperties["objectFit"],
            objectPosition: resolved.str("media.objectPosition", "center"),
            filter: filters,
            display: "block",
          }}
        />
      ) : (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", minHeight: 24, background: "#f1f5f9", color: "#64748b", fontSize: 12, lineHeight: 1.4 }}>
          {alt}
        </span>
      )}
      {overlayOpacity > 0 && (
        <span style={{ position: "absolute", inset: 0, backgroundColor: resolved.str("media.overlay.color", "#000000"), opacity: overlayOpacity }} />
      )}
    </div>
  );
};
