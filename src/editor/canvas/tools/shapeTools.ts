import type { ShapeToolDefinition, ShapeToolId } from "./types";

export const SHAPE_TOOLS: Record<ShapeToolId, ShapeToolDefinition> = {
  frame: {
    id: "frame",
    archetype: "container",
    label: "Frame",
    cursor: "crosshair",
    shiftConstrainsSquare: false,
    clickThreshold: 4,
  },
  rectangle: {
    id: "rectangle",
    archetype: "rectangle",
    label: "Rectangle",
    cursor: "crosshair",
    shiftConstrainsSquare: true,
    clickThreshold: 4,
  },
  ellipse: {
    id: "ellipse",
    archetype: "ellipse",
    label: "Ellipse",
    cursor: "crosshair",
    shiftConstrainsSquare: true,
    clickThreshold: 4,
  },
  line: {
    id: "line",
    archetype: "line",
    label: "Line",
    cursor: "crosshair",
    shiftConstrainsSquare: false,
    clickThreshold: 4,
  },
};

export function isShapeToolId(id: string): id is ShapeToolId {
  return id in SHAPE_TOOLS;
}

/**
 * Pure size computation, split out from the drag hook so it's testable
 * without React/DOM: given a drag's raw pixel delta (already divided by the
 * current zoom factor, i.e. in document px) and whether Shift is held,
 * returns the properties to hand `documentCommands.addLayer`. `undefined`
 * properties means "below the click threshold — use the archetype's own
 * registry defaults" (a click, not a drag, places a default-sized shape).
 */
export function computeShapeProperties(
  tool: ShapeToolDefinition,
  deltaWidthPx: number,
  deltaHeightPx: number,
  shiftKey: boolean
): Record<string, number> | undefined {
  const width = Math.abs(deltaWidthPx);
  const height = Math.abs(deltaHeightPx);

  if (Math.max(width, height) < tool.clickThreshold) return undefined;

  if (tool.id === "line") {
    // Line always renders horizontal in this flow-placed box model — only
    // the horizontal drag component sets its length.
    return { "frame.width": Math.max(1, Math.round(width)) };
  }

  if (tool.shiftConstrainsSquare && shiftKey) {
    const side = Math.round(Math.max(width, height));
    return { "frame.width": Math.max(1, side), "frame.height": Math.max(1, side) };
  }

  return { "frame.width": Math.max(1, Math.round(width)), "frame.height": Math.max(1, Math.round(height)) };
}
