/**
 * ============================================================================
 * DRAWING A SHAPE BY DRAGGING (ROADMAP Phase 25)
 * ============================================================================
 * The box a creation tool makes from a drag, as a pure function of the two
 * points and the modifiers. Boxes (frame, rectangle, ellipse, polygon, star,
 * text) and segments (line, arrow) behave differently:
 *
 *  - Box: the corners are the press and the pointer. Shift makes it square
 *    (the longer side wins, the box grows in the direction of the drag). Alt
 *    draws from the centre: the press is the centre.
 *  - Segment: the press and the pointer are the ends. Shift snaps the angle
 *    to 45 degrees. Alt draws from the centre: the press is the midpoint. The
 *    result is a box as long as the segment, `thickness` tall, rotated about
 *    its centre, so it is stored with the same `frame.*` as any layer.
 *  - A press that barely moves (under `clickSlop` document px) is a click: the
 *    tool's default size, its top-left at the press (centred with Alt).
 * ============================================================================
 */

import type { Point } from "../viewport/camera";

export type DragKind = "box" | "segment";

export interface DragModifiers {
  shift: boolean;
  alt: boolean;
}

export interface DragBox {
  /** Top-left of the unrotated box, in the space the points were given in. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise, about the box's centre. 0 for a box. */
  rotation: number;
  /** The drag was too short to be a drag: the default size was used. */
  click: boolean;
}

export interface DragDefaults {
  width: number;
  height: number;
}

/** A drag shorter than this (document px) is a click. */
export const CLICK_SLOP_DOC = 4;

const SNAP_STEP_DEG = 45;

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function dragBox(kind: DragKind, start: Point, current: Point, mods: DragModifiers, defaults: DragDefaults, clickSlop = CLICK_SLOP_DOC): DragBox {
  // A pointer that reports no position (NaN, Infinity) is a press that didn't move: the default-size click.
  if (![start.x, start.y, current.x, current.y].every(Number.isFinite)) current = start;
  if (!Number.isFinite(start.x) || !Number.isFinite(start.y)) start = current = { x: 0, y: 0 };
  const dx = current.x - start.x;
  const dy = current.y - start.y;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < clickSlop) {
    const { width, height } = defaults;
    return {
      x: round(mods.alt ? start.x - width / 2 : start.x),
      y: round(mods.alt ? start.y - height / 2 : kind === "segment" ? start.y - height / 2 : start.y),
      width,
      height,
      rotation: 0,
      click: true,
    };
  }

  if (kind === "box") {
    let w = Math.abs(dx);
    let h = Math.abs(dy);
    if (mods.shift) w = h = Math.max(w, h);
    const sx = dx < 0 ? -1 : 1;
    const sy = dy < 0 ? -1 : 1;
    if (mods.alt) {
      return { x: round(start.x - w), y: round(start.y - h), width: round(w * 2), height: round(h * 2), rotation: 0, click: false };
    }
    const x2 = start.x + sx * w;
    const y2 = start.y + sy * h;
    return { x: round(Math.min(start.x, x2)), y: round(Math.min(start.y, y2)), width: round(w), height: round(h), rotation: 0, click: false };
  }

  // Segment
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  let length = Math.hypot(dx, dy);
  if (mods.shift) {
    angle = Math.round(angle / SNAP_STEP_DEG) * SNAP_STEP_DEG;
    // keep the pointer's reach along the snapped direction
    const rad = (angle * Math.PI) / 180;
    length = Math.max(0, dx * Math.cos(rad) + dy * Math.sin(rad));
  }
  if (mods.alt) length *= 2;
  const rad = (angle * Math.PI) / 180;
  const mid = mods.alt
    ? { x: start.x, y: start.y }
    : { x: start.x + (Math.cos(rad) * length) / 2, y: start.y + (Math.sin(rad) * length) / 2 };
  const thickness = defaults.height;
  const norm = ((angle % 360) + 360) % 360;
  return {
    x: round(mid.x - length / 2),
    y: round(mid.y - thickness / 2),
    width: round(length),
    height: thickness,
    rotation: round(norm > 180 ? norm - 360 : norm),
    click: false,
  };
}
