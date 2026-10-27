/**
 * The canvas' tools as data (ROADMAP Phase 24). Each says what it is called, its shortcut and cursor, and whether
 * the feature behind it exists yet. The dock lists the tools that exist and hides the rest until their phase;
 * a spring-only tool (deep select) has no button.
 */

export const TOOL_IDS = ["select", "deepSelect", "pan", "frame", "rectangle", "ellipse", "line", "arrow", "polygon", "star", "text", "pen", "pencil", "paintBucket", "shapeBuilder", "scale", "comment"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export interface ToolDef {
  id: ToolId;
  label: string;
  /** The key that picks it ("" for none). */
  shortcut: string;
  cursor: string;
  /** False until the phase that builds the feature; such a tool is hidden and can't be chosen. */
  available: boolean;
  /** Spring-only: only held, never chosen (no dock button, no shortcut that makes it the active tool). */
  springOnly?: boolean;
  /** For a tool that isn't available yet: the phase that builds it. */
  phase?: number;
}

export const TOOL_DEFS: Record<ToolId, ToolDef> = {
  select: { id: "select", label: "Select Tool", shortcut: "V", cursor: "default", available: true },
  deepSelect: { id: "deepSelect", label: "Deep Select", shortcut: "", cursor: "default", available: true, springOnly: true },
  pan: { id: "pan", label: "Hand Tool (Pan)", shortcut: "H", cursor: "grab", available: true },
  frame: { id: "frame", label: "Frame Tool", shortcut: "F", cursor: "crosshair", available: true },
  rectangle: { id: "rectangle", label: "Rectangle Tool", shortcut: "R", cursor: "crosshair", available: true },
  ellipse: { id: "ellipse", label: "Ellipse Tool", shortcut: "O", cursor: "crosshair", available: true },
  line: { id: "line", label: "Line Tool", shortcut: "L", cursor: "crosshair", available: true },
  arrow: { id: "arrow", label: "Arrow Tool", shortcut: "Shift+L", cursor: "crosshair", available: true },
  polygon: { id: "polygon", label: "Polygon Tool", shortcut: "Y", cursor: "crosshair", available: true },
  star: { id: "star", label: "Star Tool", shortcut: "Shift+Y", cursor: "crosshair", available: true },
  text: { id: "text", label: "Text Tool", shortcut: "T", cursor: "text", available: true },
  pen: { id: "pen", label: "Pen Tool", shortcut: "P", cursor: "crosshair", available: true },
  pencil: { id: "pencil", label: "Pencil Tool", shortcut: "Shift+P", cursor: "crosshair", available: true },
  /** FigCraft port F4: fill or unfill the closed area of a path under the pointer (a vector network's faces). */
  paintBucket: { id: "paintBucket", label: "Paint Bucket", shortcut: "B", cursor: "cell", available: true },
  /** FigCraft port F5: click or drag across the regions where selected shapes overlap to merge them; Alt removes them. */
  shapeBuilder: { id: "shapeBuilder", label: "Shape Builder", shortcut: "Shift+M", cursor: "crosshair", available: true },
  /** FigCraft port F12: the handles scale everything by one factor about an anchor (Alt: the centre); clicks select and move as the Select tool does. */
  scale: { id: "scale", label: "Scale Tool", shortcut: "K", cursor: "default", available: true },
  comment: { id: "comment", label: "Comment", shortcut: "C", cursor: "crosshair", available: false, phase: 193 },
};

export function isToolId(id: string): id is ToolId {
  return (TOOL_IDS as readonly string[]).includes(id);
}

export function isToolAvailable(id: string): boolean {
  return isToolId(id) && TOOL_DEFS[id].available;
}

/** The tools the dock shows, in order: those that exist and aren't spring-only. */
export function dockTools(): ToolDef[] {
  return TOOL_IDS.map((id) => TOOL_DEFS[id]).filter((t) => t.available && !t.springOnly);
}
