"use client";

import { useEffect, useMemo, useRef } from "react";
import { useDocument } from "@/core/store/useDocumentStore";
import { useFontsStore } from "@/core/store/useFontsStore";
import { getAssetStore } from "@/core/assets/AssetStore";
import { fontFaceCss, fontPlan, googleFontsUrl, planKey, type FontPlan } from "@/core/fonts/families";
import type { FontDisplay } from "@/core/fonts/catalog";

const GOOGLE_ATTR = "data-ll-fonts-google";
const FACES_ATTR = "data-ll-fonts-faces";

/** The font plan of the open document, as a stable value: a new object only when what has to be loaded changes. */
function usePlan(): { plan: FontPlan; display: FontDisplay; key: string } {
  const layers = useDocument((d) => d.layers);
  const assets = useDocument((d) => d.assets);
  const fontDisplay = useDocument((d) => d.fontDisplay) ?? "swap";
  const fresh = useMemo(() => fontPlan(layers, assets), [layers, assets]);
  const key = planKey(fresh, fontDisplay);
  // the same plan object while the key is the same: edits that don't change the fonts must not restart loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => fresh, [key]);
  return { plan, display: fontDisplay, key };
}

/**
 * Makes the fonts the document uses available in `doc` (ROADMAP Phase 38): a stylesheet link for the catalog fonts
 * and an `@font-face` style for imported files (from the asset store), each kept in step with the document. When a
 * font finishes loading, `onLoaded` runs (and the fonts store is bumped) so measurements taken with the fallback
 * font are taken again: selection boxes and hit areas follow the text instead of staying at the old size.
 */
export function useFontSync(doc: Document | null, onLoaded?: () => void): void {
  const { plan, display, key } = usePlan();
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  useEffect(() => {
    if (!doc) return undefined;
    const head = doc.head;
    // catalog fonts: one stylesheet link
    const url = googleFontsUrl(plan, display);
    let link = head.querySelector<HTMLLinkElement>(`link[${GOOGLE_ATTR}]`);
    if (!url) link?.remove();
    else if (!link) {
      link = doc.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute(GOOGLE_ATTR, "");
      link.href = url;
      head.appendChild(link);
    } else if (link.href !== url) link.href = url;

    // imported fonts: one style element, rebuilt when a file's URL arrives
    let cancelled = false;
    const style = head.querySelector<HTMLStyleElement>(`style[${FACES_ATTR}]`) ?? Object.assign(doc.createElement("style"), {});
    style.setAttribute(FACES_ATTR, "");
    if (!style.parentNode) head.appendChild(style);
    const urls = new Map<string, string | null>();
    const rebuild = () => {
      const css = fontFaceCss(plan.uploads, (id) => urls.get(id) ?? null, display);
      if (style.textContent !== css) style.textContent = css;
    };
    rebuild();
    for (const a of plan.uploads) {
      void getAssetStore()
        .urlFor(a.id)
        .then((u) => {
          if (cancelled) return;
          urls.set(a.id, u);
          rebuild();
        })
        .catch(() => undefined);
    }
    if (plan.uploads.length === 0) style.textContent = "";

    const done = () => {
      useFontsStore.getState().bump();
      onLoadedRef.current?.();
    };
    const fonts = doc.fonts;
    fonts?.addEventListener("loadingdone", done);
    void fonts?.ready.then(() => !cancelled && done());
    return () => {
      cancelled = true;
      fonts?.removeEventListener("loadingdone", done);
    };
    // `key` stands for the plan and the display: the effect restarts only when what has to load changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, key]);
}
