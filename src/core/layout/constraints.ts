/**
 * ============================================================================
 * CONSTRAINTS (ROADMAP Phase 42)
 * ============================================================================
 * How a layer that is placed freely (absolute) inside a frame follows when that frame changes size, the way Figma
 * does: pinned to the left or the top, to the right or the bottom, to both (it stretches), centred (it keeps its
 * distance from the middle) or scaled (it keeps its proportions). One axis at a time, as pure functions; the same
 * rule serves the horizontal axis (position x, size width) and the vertical one. The document store applies it in
 * the same undo step as the resize.
 * ============================================================================
 */

export type Constraint = "start" | "end" | "both" | "center" | "scale";
export const CONSTRAINTS: readonly Constraint[] = ["start", "end", "both", "center", "scale"];

/** The names the document uses: `left`/`top` are the start of their axis. */
export const HORIZONTAL_NAMES: Record<Constraint, string> = { start: "left", end: "right", both: "leftRight", center: "center", scale: "scale" };
export const VERTICAL_NAMES: Record<Constraint, string> = { start: "top", end: "bottom", both: "topBottom", center: "center", scale: "scale" };

const fromName = (names: Record<Constraint, string>, value: unknown): Constraint => {
  for (const c of CONSTRAINTS) if (names[c] === value) return c;
  return "start";
};
export const readHorizontal = (value: unknown): Constraint => fromName(HORIZONTAL_NAMES, value);
export const readVertical = (value: unknown): Constraint => fromName(VERTICAL_NAMES, value);

export interface Span {
  /** Where the layer starts along the axis, from the start of the frame. */
  pos: number;
  size: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Where a layer is after its frame goes from `oldSize` to `newSize` along one axis. `start` doesn't move; `end` keeps
 * its distance from the far edge; `both` keeps both distances (so it stretches, never below 0); `center` keeps its
 * distance from the middle; `scale` keeps its proportions of the frame.
 */
export function constrainSpan(span: Span, constraint: Constraint, oldSize: number, newSize: number): Span {
  const d = newSize - oldSize;
  switch (constraint) {
    case "start":
      return span;
    case "end":
      return { pos: r2(span.pos + d), size: span.size };
    case "both":
      return { pos: span.pos, size: r2(Math.max(0, span.size + d)) };
    case "center":
      return { pos: r2(span.pos + d / 2), size: span.size };
    case "scale": {
      if (oldSize <= 0) return span;
      const k = newSize / oldSize;
      return { pos: r2(span.pos * k), size: r2(span.size * k) };
    }
  }
}

export interface ConstrainedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  horizontal: Constraint;
  vertical: Constraint;
}

/** A free layer's box after its frame's size changed. */
export function constrainBox(box: ConstrainedBox, oldFrame: { width: number; height: number }, newFrame: { width: number; height: number }): { x: number; y: number; width: number; height: number } {
  const h = constrainSpan({ pos: box.x, size: box.width }, box.horizontal, oldFrame.width, newFrame.width);
  const v = constrainSpan({ pos: box.y, size: box.height }, box.vertical, oldFrame.height, newFrame.height);
  return { x: h.pos, y: v.pos, width: h.size, height: v.size };
}
