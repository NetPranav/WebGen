"use client";

import { documentStore } from "../store/documentState";
import { getTransport, transport } from "./transport";

/** Pushes a composition's fps, duration and work area into the transport whenever the document changes them. */
function syncFromDocument(): void {
  const { compositions } = documentStore.getState().document;
  const comp = compositions[getTransport().compositionId] ?? compositions.comp_main;
  if (!comp) return;
  const s = getTransport();
  if (comp.id === s.compositionId && comp.fps === s.fps && comp.duration === s.duration && comp.workArea.start === s.workArea.start && comp.workArea.end === s.workArea.end) return;
  transport.setComposition({ id: comp.id, fps: comp.fps, duration: comp.duration, workArea: comp.workArea });
}

/** Keeps the transport's timebase equal to the document's active composition. Returns the unsubscribe. */
export function bindTransportToDocument(): () => void {
  syncFromDocument();
  return documentStore.subscribe(syncFromDocument);
}
