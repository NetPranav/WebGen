/**
 * Frames, groups and sections (FigCraft port F11), each change one undo step:
 *
 * - **Resize to fit**: a frame, group or section takes the box of the layers in it; they stay where they are on the page.
 * - **Convert to group**: the same layer becomes a group around its layers: what only a frame has goes (fills,
 *   stroke, corner radius, clipping, auto layout, whose positions and sizes are kept), and its box becomes its layers'.
 * - **Convert to frame**: a group or section becomes a plain frame of its box (a section keeps its fill), not clipping.
 * - **Convert to section**: a frame on the canvas (or in a section) becomes a section, a canvas organiser: same name,
 *   layers and fill, no auto layout or clipping, nothing moves. A section draws its name at its top.
 *
 * Behaviour translated from FigCraft (`crates/engine/src/convert_container_tests.rs`, `section_tests.rs`), commit
 * 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import type { Layer } from "../document/schema";
import type { PropValue } from "../document/registry";
import { getDocument } from "../store/documentState";
import { documentCommands } from "../store/useDocumentStore";
import { transaction } from "../editing/editOps";
import { worldBox, writeBoxes } from "../editing/layerBoxes";
import { corners, type Box } from "../geometry/transform";

export type ContainerKind = "frame" | "group" | "section";
const layers = () => getDocument().layers;

/** What a container is. */
export const kindOf = (l: Layer | undefined): ContainerKind | null =>
  !l || (l.archetype !== "container" && l.archetype !== "form") ? null : l.properties["frame.kind"] === "group" ? "group" : l.properties["frame.kind"] === "section" ? "section" : "frame";

const placesChildren = (l: Layer) => l.properties["layout.auto"] === true || l.properties["layout.display"] === "grid";

/** The page box around boxes (their rotated corners' bounds). */
function around(boxes: readonly Box[]): Box | null {
  const pts = boxes.flatMap((b) => corners(b));
  if (pts.length === 0) return null;
  const x0 = Math.min(...pts.map((p) => p.x));
  const y0 = Math.min(...pts.map((p) => p.y));
  const x1 = Math.max(...pts.map((p) => p.x));
  const y1 = Math.max(...pts.map((p) => p.y));
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, rot: 0 };
}

/** Pins a container's children where they are on the page (absolute, fixed size), so its layout can go. */
function pinChildren(id: string) {
  const kids = layers()[id].children.filter((k) => layers()[k]);
  const boxes = kids.map((k) => worldBox(k));
  kids.forEach((k, i) => {
    const b = boxes[i];
    if (!b) return;
    writeBoxes([k], [b], undefined, { size: true });
    documentCommands.updateProps(k, { "sizing.horizontal": "fixed", "sizing.vertical": "fixed" });
  });
}

/** Moves a container to `box` on the page, its children staying where they are. */
function refit(id: string, box: Box) {
  const kids = layers()[id].children.filter((k) => layers()[k]);
  const kidBoxes = kids.map((k) => worldBox(k));
  writeBoxes([id], [box], undefined, { size: true });
  kids.forEach((k, i) => kidBoxes[i] && writeBoxes([k], [kidBoxes[i]!]));
}

/** Fits frames, groups and sections to their layers (auto-layout frames hug by themselves; empty ones and shapes stay). Returns how many changed. */
export function resizeToFit(ids: readonly string[]): number {
  const targets = ids.filter((id) => {
    const l = layers()[id];
    return !!kindOf(l) && l.locked !== true && l.children.some((k) => layers()[k]) && !placesChildren(l);
  });
  if (targets.length === 0) return 0;
  transaction("Resize to fit", () => {
    for (const id of targets) {
      const box = around(layers()[id].children.map((k) => worldBox(k)).filter((b): b is Box => !!b));
      if (box) refit(id, box);
    }
  });
  return targets.length;
}

/** What only a frame has, cleared. */
const FRAME_ONLY: Record<string, PropValue | undefined> = {
  "paint.fills": undefined,
  "appearance.background.color": "transparent",
  "appearance.border.width": 0,
  "appearance.radius": 0,
  "layout.overflowX": undefined,
  "layout.overflowY": undefined,
  "layout.auto": undefined,
  "layout.display": undefined,
  "layout.padding": 0,
  "layout.gap": 0,
};

/** Turns frames (and sections) into groups around their layers. Returns the ids converted. */
export function convertToGroup(ids: readonly string[]): string[] {
  const targets = ids.filter((id) => {
    const l = layers()[id];
    return kindOf(l) !== null && kindOf(l) !== "group" && l.parentId !== null && l.locked !== true && l.children.some((k) => layers()[k]);
  });
  if (targets.length === 0) return [];
  transaction("Convert to group", () => {
    for (const id of targets) {
      pinChildren(id);
      documentCommands.updateProps(id, { ...FRAME_ONLY, "frame.kind": "group" });
      const box = around(layers()[id].children.map((k) => worldBox(k)).filter((b): b is Box => !!b));
      if (box) refit(id, box);
    }
  });
  return targets;
}

/** Turns groups and sections into plain frames of their box (a section keeps its fill; nothing is clipped). Refuses a section that holds sections. */
export function convertToFrame(ids: readonly string[]): { ids: string[] } | { error: string } {
  const L = layers();
  const targets = ids.filter((id) => kindOf(L[id]) === "group" || kindOf(L[id]) === "section");
  const holdsSections = targets.find((id) => kindOf(L[id]) === "section" && L[id].children.some((k) => kindOf(L[k]) === "section"));
  if (holdsSections) return { error: `"${L[holdsSections].name}" holds sections: it can't become a frame` };
  if (targets.length === 0) return { ids: [] };
  transaction("Convert to frame", () => {
    for (const id of targets) documentCommands.updateProps(id, { "frame.kind": undefined, "layout.overflowX": "visible", "layout.overflowY": "visible" });
  });
  return { ids: targets };
}

/** Turns frames on the canvas (or in a section) into sections. Refuses a frame inside a frame, and anything that isn't a frame. */
export function convertToSection(ids: readonly string[]): { ids: string[] } | { error: string } {
  const L = layers();
  for (const id of ids) {
    const l = L[id];
    if (!l) continue;
    if (kindOf(l) === null) return { error: `"${l.name}" isn't a frame` };
    const parent = l.parentId ? L[l.parentId] : undefined;
    if (parent && kindOf(parent) !== "section") return { error: `"${l.name}" is inside a frame: only frames on the canvas or in a section become sections` };
  }
  const targets = ids.filter((id) => L[id] && kindOf(L[id]) !== "section" && L[id].locked !== true);
  if (targets.length === 0) return { ids: [] };
  transaction("Convert to section", () => {
    for (const id of targets) {
      pinChildren(id);
      documentCommands.updateProps(id, { "frame.kind": "section", "layout.auto": undefined, "layout.display": undefined, "layout.overflowX": "visible", "layout.overflowY": "visible" });
    }
  });
  return { ids: targets };
}
