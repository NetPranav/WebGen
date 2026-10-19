/**
 * ============================================================================
 * SHAPE DRAW TOOLS (Sub-Phase 43.2, Tier A)
 * ============================================================================
 * Frame/Rectangle/Ellipse/Line are mechanically identical: drag a box on the
 * canvas, create an archetype sized to it. One config per tool plus one
 * shared drag-mechanics hook (`useShapeDrawing.ts`), not seven near-duplicate
 * pointer-event handlers.
 *
 * This canvas is flow-placed, not an absolute-position Figma-style canvas
 * (`SandboxHost.tsx` gives every element `position: relative` and places it
 * by its parent's flex layout — see the Phase 43.2 ROADMAP note). A drawn
 * shape's *size* comes from the drag distance; its position comes from
 * wherever its parent's layout puts it, not from where it was dropped.
 * ============================================================================
 */

import type { ArchetypeId } from "@/core/document/registry";

export type ShapeToolId = "frame" | "rectangle" | "ellipse" | "line";

export interface ShapeToolDefinition {
  id: ShapeToolId;
  archetype: ArchetypeId;
  label: string;
  cursor: string;
  /** Holding Shift while dragging makes width and height equal (square/circle) — meaningless for `line`, which always renders horizontal in this box model regardless of aspect ratio (see `SandboxHost.tsx`'s `case "line"`). */
  shiftConstrainsSquare: boolean;
  /** Below this drag distance (px, at 100% zoom), treat it as a click: insert the archetype at its registry default size instead of a computed one. */
  clickThreshold: number;
}
