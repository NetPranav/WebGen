/**
 * Ruler guides (ROADMAP Phase 28): a frame's guides live on the frame layer as `frame.guides` (JSON text), so they
 * are saved with the document, undone with it and exported with it. Each change is one document command.
 */

import { documentCommands } from "@/core/store/useDocumentStore";
import { getDocument } from "@/core/store/documentState";
import { MAX_GUIDES, parseGuides, serializeGuides, type Guide } from "@/core/geometry/snap";

export function getGuides(frameId: string): Guide[] {
  return parseGuides(getDocument().layers[frameId]?.properties["frame.guides"]);
}

export function setGuides(frameId: string, guides: readonly Guide[], label = "Change guides"): void {
  documentCommands.updateProps(frameId, { "frame.guides": serializeGuides(guides) }, label);
}

export function addGuide(frameId: string, guide: Guide): void {
  if (getGuides(frameId).length >= MAX_GUIDES) return;
  setGuides(frameId, [...getGuides(frameId), guide], "Add guide");
}

export function removeGuide(frameId: string, index: number): void {
  setGuides(frameId, getGuides(frameId).filter((_, i) => i !== index), "Delete guide");
}

export function moveGuide(frameId: string, index: number, pos: number): void {
  setGuides(frameId, getGuides(frameId).map((g, i) => (i === index ? { ...g, pos } : g)), "Move guide");
}
