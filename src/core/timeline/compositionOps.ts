import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { useTimelineUiStore } from "../store/useTimelineUiStore";
import { getTransport, transport } from "../time/transport";
import { breadcrumbs, trailAfterOpening } from "./tabs";

/**
 * Opening and closing compositions in the timeline (ROADMAP Phase 65). The transport's composition is what the
 * timeline shows, so opening one is pointing the transport at it; the UI store keeps the tabs and the breadcrumb trail.
 */

export interface OpenResult {
  opened: boolean;
  /** Why nothing opened, when nothing did. */
  reason?: string;
}

/**
 * Opens a composition in the timeline. `fromBar` is true when it was opened from a nested bar in the composition
 * showing (the trail then grows); from a tab the trail starts again at it. A precomp opened this way gets a tab.
 */
export function openComposition(compositionId: string, fromBar = false): OpenResult {
  const doc = getDocument();
  const comp = doc.compositions[compositionId];
  if (!comp) return { opened: false, reason: `No composition "${compositionId}".` };
  const ui = useTimelineUiStore.getState();
  const current = getTransport().compositionId;
  if (fromBar && !doc.compositions[current]?.nested.some((n) => n.compositionId === compositionId)) return { opened: false, reason: "That composition isn't placed in the one showing." };
  const trail = trailAfterOpening(ui.trail, current, compositionId, fromBar);
  if (comp.kind === "precomp") ui.openPrecomp(compositionId);
  ui.setTrail(trail);
  ui.clearKeys();
  transport.setComposition({ id: comp.id, fps: comp.fps, duration: comp.duration, workArea: comp.workArea });
  return { opened: true };
}

/** Goes to the breadcrumb at `index` of the current trail. */
export function openBreadcrumb(index: number): OpenResult {
  const doc = getDocument();
  const crumbs = breadcrumbs(doc, useTimelineUiStore.getState().trail, getTransport().compositionId);
  const crumb = crumbs[index];
  if (!crumb) return { opened: false, reason: "No such breadcrumb." };
  const comp = doc.compositions[crumb.id];
  useTimelineUiStore.getState().setTrail(crumbs.slice(0, index + 1).map((c) => c.id));
  useTimelineUiStore.getState().clearKeys();
  transport.setComposition({ id: comp.id, fps: comp.fps, duration: comp.duration, workArea: comp.workArea });
  return { opened: true };
}

/** Goes up one level: to the composition this one was opened from, or Main when it wasn't opened from a bar. */
export function goToParent(): OpenResult {
  const crumbs = breadcrumbs(getDocument(), useTimelineUiStore.getState().trail, getTransport().compositionId);
  if (crumbs.length > 1) return openBreadcrumb(crumbs.length - 2);
  const main = Object.values(getDocument().compositions).find((c) => c.kind === "main");
  return main && main.id !== getTransport().compositionId ? openComposition(main.id) : { opened: false, reason: "Already at the top." };
}

/** Closes a precomp's tab. If it was showing, the timeline goes up to where it was opened from. */
export function closeComposition(compositionId: string): boolean {
  const ui = useTimelineUiStore.getState();
  if (!ui.openPrecomps.includes(compositionId)) return false;
  const wasShowing = getTransport().compositionId === compositionId;
  const crumbs = breadcrumbs(getDocument(), ui.trail, getTransport().compositionId);
  ui.closePrecomp(compositionId);
  if (wasShowing) {
    const at = crumbs.findIndex((c) => c.id === compositionId);
    if (at > 0) openBreadcrumb(at - 1);
    else goToParent();
  } else {
    ui.setTrail(ui.trail.filter((id) => id !== compositionId));
  }
  return true;
}

/** Makes a precomp in the composition showing and returns its ids. It isn't opened; double-click its bar to do that. */
export function addPrecomp(name?: string, duration?: number, parentId = getTransport().compositionId) {
  return documentCommands.addPrecomp(parentId, { name, duration });
}
