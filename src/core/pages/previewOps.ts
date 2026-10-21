/**
 * Preview navigation (ROADMAP Phase 48): clicking a layer with a link in Preview goes where the link says: another
 * page or frame (the Preview shows that frame), a section (the frame scrolls to it), or a web address (a new tab).
 * Back and forward walk the history like a browser. The frame being shown, and the history, are in `usePreviewStore`.
 */

import { getDocument } from "../store/documentState";
import { useCanvasViewStore } from "../store/useCanvasViewStore";
import { usePreviewStore } from "../store/usePreviewStore";
import { addressOf, linkOf, pagesOf, resolveLink, type Destination } from "./pages";

/** Goes to a destination. Returns false when there is nowhere to go (a link to something that is gone). */
export function previewGoTo(dest: Destination): boolean {
  if (!dest) return false;
  const store = usePreviewStore.getState();
  switch (dest.kind) {
    case "page":
      store.go({ frameId: dest.pageId });
      return true;
    case "anchor":
      store.go({ frameId: dest.pageId, anchor: dest.anchor });
      return true;
    case "frame":
      store.go({ frameId: dest.frameId });
      return true;
    case "url":
      if (typeof window !== "undefined") window.open(dest.url, "_blank", "noopener,noreferrer");
      return true;
  }
}

/** A click on a layer in Preview: follows the link of the layer or the nearest one above it that has one. Returns whether it went anywhere. */
export function previewFollow(layerId: string): boolean {
  const doc = getDocument();
  const found = linkOf(doc.layers, layerId);
  return found ? previewGoTo(resolveLink(doc, found.link)) : false;
}

/** Opens a page by its route (`/pricing`), optionally at an anchor. */
export function previewOpenRoute(route: string, anchor?: string): boolean {
  const page = pagesOf(getDocument()).find((p) => p.route === route);
  if (!page) return false;
  usePreviewStore.getState().go({ frameId: page.id, ...(anchor ? { anchor } : {}) });
  return true;
}

/** Called when Preview starts: shows the frame being worked in (or the home page, or the first frame), with a fresh history. */
export function previewStart(): void {
  const doc = getDocument();
  const frames = Object.values(doc.layers).filter((l) => l.parentId === null);
  if (frames.length === 0) return usePreviewStore.getState().reset(null);
  const active = useCanvasViewStore.getState().activeFrameId;
  const home = pagesOf(doc).find((p) => p.home)?.id;
  const pick = (active && doc.layers[active]?.parentId === null ? active : undefined) ?? home ?? frames[0].id;
  usePreviewStore.getState().reset({ frameId: pick });
}

/** The address Preview shows: the page's route and anchor, or the frame's name when it isn't a page. */
export function previewAddress(): string {
  const doc = getDocument();
  const cur = usePreviewStore.getState().current();
  if (!cur) return "";
  const layer = doc.layers[cur.frameId];
  if (!layer) return "";
  return layer.page ? addressOf({ route: layer.page.route }, cur.anchor) : layer.name;
}
