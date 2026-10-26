/**
 * ============================================================================
 * AFFINE TRANSFORMS (FigCraft port, F1)
 * ============================================================================
 * 2×3 affine transforms (kurbo's `Affine` coefficient order `[a, b, c, d, e, f]`: x' = a·x + c·y + e,
 * y' = b·x + d·y + f), and the decompose / compose helpers a design panel needs to show a transform as X, Y and a
 * rotation, including flipped boxes. Rotation degrees follow Figma: positive turns counter-clockwise on screen.
 * Our layers store a box (centre, size, clockwise rotation, `geometry/transform.ts`); these are for flips,
 * rotation origins and anything that composes transforms.
 *
 * Translated from FigCraft (`crates/geom/src/transform.rs`, kurbo `Affine`), commit 6ea44e9. MIT,
 * Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 * ============================================================================
 */

import type { Pt } from "./bezpath";

export type Affine = readonly [number, number, number, number, number, number];

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];
export const FLIP_X: Affine = [-1, 0, 0, 1, 0, 0];
export const FLIP_Y: Affine = [1, 0, 0, -1, 0, 0];

export const translate = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];
/** A rotation by `th` radians (positive is clockwise on a y-down screen). */
export const rotate = (th: number): Affine => [Math.cos(th), Math.sin(th), -Math.sin(th), Math.cos(th), 0, 0];

/** `a * b`: apply `b`, then `a`. */
export function mul(a: Affine, b: Affine): Affine {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export const apply = (m: Affine, p: Pt): Pt => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
export const determinant = (m: Affine): number => m[0] * m[3] - m[1] * m[2];

/** Rotation in degrees (counter-clockwise on screen, as Figma's rotation field shows it). */
export function rotationDegrees(m: Affine): number {
  const deg = (-Math.atan2(m[1], m[0]) * 180) / Math.PI;
  const d = Math.abs(deg) < 1e-9 ? 0 : deg;
  return d <= -180 ? d + 360 : d;
}

export const translation = (m: Affine): Pt => ({ x: m[4], y: m[5] });
export const withTranslation = (m: Affine, p: Pt): Affine => [m[0], m[1], m[2], m[3], p.x, p.y];
/** Whether the linear part is a mirror (negative determinant). */
export const isFlipped = (m: Affine): boolean => determinant(m) < 0;

/** A transform with the given translation and rotation (degrees, Figma convention). */
export const fromPositionRotation = (x: number, y: number, degrees: number): Affine => mul(translate(x, y), rotate((-degrees * Math.PI) / 180));

/**
 * Change the rotation of `m` to `degrees` about the centre of a `w`×`h` box in its local space, keeping that centre
 * in place and keeping any flip. A flip is kept as a vertical one, the form `rotationDegrees` reads (a horizontal
 * flip reads as 180°), so the rotation that was set reads back.
 */
export function setRotationAboutCenter(m: Affine, w: number, h: number, degrees: number): Affine {
  const local = { x: w / 2, y: h / 2 };
  const center = apply(m, local);
  const lin = mul(rotate((-degrees * Math.PI) / 180), isFlipped(m) ? FLIP_Y : IDENTITY);
  const mapped = apply(lin, local);
  return [lin[0], lin[1], lin[2], lin[3], center.x - mapped.x, center.y - mapped.y];
}

/** Rotate `m` by `degrees` (Figma convention) about `pivot` (parent space). */
export function rotateAbout(m: Affine, pivot: Pt, degrees: number): Affine {
  return mul(mul(mul(translate(pivot.x, pivot.y), rotate((-degrees * Math.PI) / 180)), translate(-pivot.x, -pivot.y)), m);
}

/** Round to `digits` decimals for display (no `-0`, no float noise). */
export function roundTo(v: number, digits: number): number {
  const f = 10 ** digits;
  const r = Math.round(v * f) / f;
  return r === 0 ? 0 : r;
}

/** The axis-aligned bounds of a rect after `m`. */
export function transformRectBBox(m: Affine, r: { x0: number; y0: number; x1: number; y1: number }): { x0: number; y0: number; x1: number; y1: number } {
  const pts = [
    { x: r.x0, y: r.y0 },
    { x: r.x1, y: r.y0 },
    { x: r.x1, y: r.y1 },
    { x: r.x0, y: r.y1 },
  ].map((p) => apply(m, p));
  return {
    x0: Math.min(...pts.map((p) => p.x)),
    y0: Math.min(...pts.map((p) => p.y)),
    x1: Math.max(...pts.map((p) => p.x)),
    y1: Math.max(...pts.map((p) => p.y)),
  };
}
