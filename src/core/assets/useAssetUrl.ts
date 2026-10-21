"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getAssetStore } from "./AssetStore";

/** The prefix a layer's `media.src` has when it points at an imported file: `asset:<sha256>`. */
export const ASSET_SCHEME = "asset:";

export const isAssetSrc = (src: string): boolean => src.startsWith(ASSET_SCHEME);
export const assetSrc = (id: string): string => `${ASSET_SCHEME}${id}`;

/**
 * Where an export draws pictures from (ROADMAP Phase 49): a function from an asset source to the URL the exported site
 * uses, answered at once instead of from the asset store. Provided around a server render of the document.
 */
export const AssetUrlContext = createContext<((src: string) => string | null) | null>(null);

/**
 * The URL an image should load for `src`: itself, unless it names an imported file, in which case the file's
 * `blob:` URL once the store has it (null until then, and null when the file is missing).
 */
export function useAssetUrl(src: string | null): string | null {
  const override = useContext(AssetUrlContext);
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
  if (override) return override(src);
  if (!isAssetSrc(src)) return src;
  return resolved?.src === src ? resolved.url : null;
}

/**
 * Resolves several sources at once (a layer's image fills). Returns a function from a source to the URL to load:
 * the source itself unless it names an imported file, whose `blob:` URL arrives once the store has it (null until
 * then, and null when the file is missing).
 */
export function useAssetUrlMap(sources: readonly string[]): (src: string) => string | null {
  const override = useContext(AssetUrlContext);
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const key = sources.filter(isAssetSrc).sort().join("|");
  useEffect(() => {
    let cancelled = false;
    for (const src of key ? key.split("|") : []) {
      getAssetStore()
        .urlFor(src.slice(ASSET_SCHEME.length))
        .then((url) => !cancelled && setUrls((u) => (u[src] === url ? u : { ...u, [src]: url })))
        .catch(() => !cancelled && setUrls((u) => ({ ...u, [src]: null })));
    }
    return () => {
      cancelled = true;
    };
  }, [key]);
  if (override) return override;
  return (src) => (isAssetSrc(src) ? (urls[src] ?? null) : src);
}
