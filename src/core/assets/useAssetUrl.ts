"use client";

import { useEffect, useState } from "react";
import { getAssetStore } from "./AssetStore";

/** The prefix a layer's `media.src` has when it points at an imported file: `asset:<sha256>`. */
export const ASSET_SCHEME = "asset:";

export const isAssetSrc = (src: string): boolean => src.startsWith(ASSET_SCHEME);
export const assetSrc = (id: string): string => `${ASSET_SCHEME}${id}`;

/**
 * The URL an image should load for `src`: itself, unless it names an imported file, in which case the file's
 * `blob:` URL once the store has it (null until then, and null when the file is missing).
 */
export function useAssetUrl(src: string | null): string | null {
  const [resolved, setResolved] = useState<{ src: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!src || !isAssetSrc(src)) return undefined;
    let cancelled = false;
    getAssetStore()
      .urlFor(src.slice(ASSET_SCHEME.length))
      .then((url) => !cancelled && setResolved({ src, url }))
      .catch(() => !cancelled && setResolved({ src, url: null }));
    return () => {
      cancelled = true;
    };
  }, [src]);
  if (!src) return null;
  if (!isAssetSrc(src)) return src;
  return resolved?.src === src ? resolved.url : null;
}
