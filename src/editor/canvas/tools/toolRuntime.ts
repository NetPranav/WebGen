/**
 * ============================================================================
 * CANVAS TOOLS (ROADMAP Phase 24)
 * ============================================================================
 * A tool is `{ id, cursor, onPointerDown / Move / Up, onKey, drawOverlay }`. The canvas hands the pointer to
 * the *current* tool (the active one, or a held spring's: Space is the Hand, Cmd/Ctrl is deep select) and
 * captures it for the length of a gesture that a tool began, so a drag keeps going outside the canvas. Tools
 * hold their own gesture state and talk to the editor only through `ToolContext`.
 *
 * Tier A (Select, Hand, Frame, Rectangle, Ellipse, Line, Text) landed in Phase 43.2; this is the structure
 * they now live in, not a rewrite of what they do.
 * ============================================================================
 */

import type { Point } from "@/core/viewport/camera";
import type { ToolId } from "@/core/tools/toolDefs";
import { SHAPE_TOOLS, computeShapeProperties, isShapeToolId } from "./shapeTools";
import { documentCommands } from "@/core/store/useDocumentStore";

export interface ToolPointer {
  /** Canvas (document) space. */
  world: Point;
  /** Relative to the canvas element, in screen px. */
  screen: Point;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  /** The pointer is over bare canvas, not a frame or chrome. */
  onBlank: boolean;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PickedLayer {
  id: string;
  name: string;
}

export interface ToolContext {
  zoom: () => number;
  panBy: (dx: number, dy: number) => void;
  panEnabled: () => boolean;
  /** The World Environment's "any blank canvas drags the view" setting. */
  panOnBlank: () => boolean;
  pick: (world: Point, deep: boolean) => PickedLayer | null;
  /** Selects a layer, or clears the selection with null. */
  select: (layer: PickedLayer | null) => void;
  /** Where new layers go: the active frame. */
  parentId: () => string | null;
  /** Called after a tool created a layer: select it and go back to Select. */
  created: (layer: PickedLayer) => void;
  /** The drag is panning the view (the canvas shows the grabbing cursor). */
  setPanning: (on: boolean) => void;
  /** Asks the canvas to redraw the tool's overlay. */
  requestOverlay: () => void;
}

export interface Tool {
  id: ToolId;
  cursor: string;
  /** Returns true when a gesture began: the canvas then captures the pointer until it ends. */
  onPointerDown?: (p: ToolPointer, ctx: ToolContext) => boolean;
  onPointerMove?: (p: ToolPointer, ctx: ToolContext) => void;
  onPointerUp?: (p: ToolPointer, ctx: ToolContext) => void;
  onPointerCancel?: (ctx: ToolContext) => void;
  /** A key pressed while this tool is current; true when it used it. */
  onKey?: (e: KeyboardEvent, ctx: ToolContext) => boolean;
  /** What the tool draws on the overlay right now (a screen-space rectangle), or null. */
  drawOverlay?: () => ScreenRect | null;
}

/** Click-versus-drag threshold, in screen px. */
export const CLICK_SLOP = 4;

/** Drags the view. Returns the three handlers a pan gesture needs. */
function panGesture() {
  let last: Point | null = null;
  return {
    start(p: ToolPointer, ctx: ToolContext): boolean {
      if (!ctx.panEnabled()) return false;
      last = p.screen;
      ctx.setPanning(true);
      return true;
    },
    move(p: ToolPointer, ctx: ToolContext) {
      if (!last) return;
      ctx.panBy(p.screen.x - last.x, p.screen.y - last.y);
      last = p.screen;
    },
    end(ctx: ToolContext) {
      last = null;
      ctx.setPanning(false);
    },
  };
}

export function createHandTool(): Tool {
  const pan = panGesture();
  return {
    id: "pan",
    cursor: "grab",
    onPointerDown: (p, ctx) => pan.start(p, ctx),
    onPointerMove: (p, ctx) => pan.move(p, ctx),
    onPointerUp: (_p, ctx) => pan.end(ctx),
    onPointerCancel: (ctx) => pan.end(ctx),
  };
}

/** Select, and deep select (the same tool, picking the deepest layer). A click picks; a drag on bare canvas pans when the environment says so. */
export function createSelectTool(id: "select" | "deepSelect"): Tool {
  const pan = panGesture();
  let down: Point | null = null;
  let panning = false;
  return {
    id,
    cursor: "default",
    onPointerDown: (p, ctx) => {
      down = p.screen;
      panning = false;
      if (p.onBlank && ctx.panOnBlank()) panning = pan.start(p, ctx);
      return true;
    },
    onPointerMove: (p, ctx) => {
      if (panning) pan.move(p, ctx);
    },
    onPointerUp: (p, ctx) => {
      const start = down;
      down = null;
      if (panning) {
        pan.end(ctx);
        panning = false;
        if (start && Math.hypot(p.screen.x - start.x, p.screen.y - start.y) >= CLICK_SLOP) return;
      }
      if (!start || Math.hypot(p.screen.x - start.x, p.screen.y - start.y) >= CLICK_SLOP) return; // a drag: marquee comes in Phase 26
      ctx.select(ctx.pick(p.world, id === "deepSelect" || p.metaKey || p.ctrlKey));
    },
    onPointerCancel: (ctx) => {
      down = null;
      if (panning) pan.end(ctx);
      panning = false;
    },
  };
}

/** Frame, Rectangle, Ellipse, Line: drag a box, create the archetype sized to it. A click places the archetype at its default size. */
export function createShapeTool(id: "frame" | "rectangle" | "ellipse" | "line"): Tool {
  const def = SHAPE_TOOLS[id];
  let start: Point | null = null;
  let now: Point | null = null;
  let shift = false;
  return {
    id,
    cursor: def.cursor,
    onPointerDown: (p) => {
      start = p.screen;
      now = p.screen;
      shift = p.shiftKey;
      return true;
    },
    onPointerMove: (p, ctx) => {
      if (!start) return;
      now = p.screen;
      shift = p.shiftKey;
      ctx.requestOverlay();
    },
    onPointerUp: (p, ctx) => {
      const from = start;
      start = null;
      now = null;
      ctx.requestOverlay();
      const parentId = ctx.parentId();
      if (!from || !parentId) return;
      const scale = ctx.zoom() || 1;
      const properties = computeShapeProperties(def, (p.screen.x - from.x) / scale, (p.screen.y - from.y) / scale, p.shiftKey || shift);
      const layerId = documentCommands.addLayer({ archetype: def.archetype, parentId, ...(properties ? { properties } : {}) }, `Draw ${def.label}`);
      ctx.created({ id: layerId, name: def.label });
    },
    onPointerCancel: (ctx) => {
      start = null;
      now = null;
      ctx.requestOverlay();
    },
    drawOverlay: () =>
      start && now ? { x: Math.min(start.x, now.x), y: Math.min(start.y, now.y), width: Math.abs(now.x - start.x), height: Math.abs(now.y - start.y) } : null,
  };
}

/** Text: a click places a text layer in the active frame. */
export function createTextTool(): Tool {
  return {
    id: "text",
    cursor: "text",
    onPointerDown: (_p, ctx) => {
      const parentId = ctx.parentId();
      if (!parentId) return false;
      const layerId = documentCommands.addLayer({ archetype: "text", parentId }, "Add Text");
      ctx.created({ id: layerId, name: "Text" });
      return false;
    },
  };
}

/** The tools that have behaviour on the canvas, by id. */
export function createTools(): Partial<Record<ToolId, Tool>> {
  const tools: Partial<Record<ToolId, Tool>> = {
    select: createSelectTool("select"),
    deepSelect: createSelectTool("deepSelect"),
    pan: createHandTool(),
    text: createTextTool(),
  };
  for (const id of Object.keys(SHAPE_TOOLS)) if (isShapeToolId(id)) tools[id] = createShapeTool(id);
  return tools;
}
