/**
 * Draws a document's layers to markup with the same render definitions the stage uses (ROADMAP Phase 49), so what is
 * exported is what is on the canvas. Pictures are given the URLs the exported site will have, and every asset a page
 * draws is noted so only those are packed.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssetUrlContext, ASSET_SCHEME, isAssetSrc } from "../../assets/useAssetUrl";
import type { Layer } from "../../document/schema";
import { RenderTree } from "../../render/RenderLayer";

export interface RenderOptions {
  /** The URL a picture has in the export, for an asset id; also called to note that the asset is used. */
  assetUrl: (assetId: string) => string | null;
}

/** The markup of a top-level layer (a page) with its children, drawn from `layers` (the document as seen at a breakpoint and in a mode). */
export function renderLayerMarkup(layers: Record<string, Layer>, rootId: string, options: RenderOptions, frameAtOrigin = true): string {
  const resolve = (src: string) => (isAssetSrc(src) ? options.assetUrl(src.slice(ASSET_SCHEME.length)) : src);
  return renderToStaticMarkup(
    <AssetUrlContext.Provider value={resolve}>
      <RenderTree layers={layers} rootIds={[rootId]} ctx={{ frameAtOrigin }} />
    </AssetUrlContext.Provider>,
  );
}
