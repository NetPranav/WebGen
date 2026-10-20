/**
 * Applies constraints to a frame's free children (ROADMAP Phase 42), on a document draft inside the same change that
 * resized the frame, so a resize and the children's follow-up are one undo step. Layers that are placed by a layout
 * (flow), have the default constraints (left and top), or sit in an auto-layout frame are left alone, so a document
 * that never sets a constraint behaves exactly as before. A child that is itself resized by a constraint passes the
 * change on to its own children.
 */

import type { MotionDocument } from "../document/schema";
import { constrainSpan, readHorizontal, readVertical } from "./constraints";

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export function applyConstraintsToChildren(doc: MotionDocument, parentId: string, oldSize: { width: number; height: number }, newSize: { width: number; height: number }, depth = 0): void {
  if (depth > 64) return;
  const parent = doc.layers[parentId];
  if (!parent || parent.properties["layout.auto"] === true) return;
  if (oldSize.width === newSize.width && oldSize.height === newSize.height) return;
  for (const childId of parent.children) {
    const child = doc.layers[childId];
    if (!child) continue;
    const p = child.properties;
    if (p.positioning !== "absolute") continue;
    const h = readHorizontal(p["constraints.horizontal"]);
    const v = readVertical(p["constraints.vertical"]);
    if (h === "start" && v === "start") continue;
    const x = num(p["frame.x"]) ?? 0;
    const y = num(p["frame.y"]) ?? 0;
    const w = num(p["frame.width"]);
    const ht = num(p["frame.height"]);
    const nh = constrainSpan({ pos: x, size: w ?? 0 }, h, oldSize.width, newSize.width);
    const nv = constrainSpan({ pos: y, size: ht ?? 0 }, v, oldSize.height, newSize.height);
    p["frame.x"] = nh.pos;
    p["frame.y"] = nv.pos;
    let resized = false;
    if (w !== undefined && nh.size !== w) {
      p["frame.width"] = nh.size;
      resized = true;
    }
    if (ht !== undefined && nv.size !== ht) {
      p["frame.height"] = nv.size;
      resized = true;
    }
    if (resized && child.children.length > 0) {
      applyConstraintsToChildren(doc, childId, { width: w ?? 0, height: ht ?? 0 }, { width: num(p["frame.width"]) ?? 0, height: num(p["frame.height"]) ?? 0 }, depth + 1);
    }
  }
}
