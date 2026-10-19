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
import { documentCommands } from "@/core/store/useDocumentStore";
import { getDocument } from "@/core/store/documentState";
import { getDefaultProps, type ArchetypeId, type PropValue } from "@/core/document/registry";
import { dragBox, type DragBox, type DragKind } from "@/core/geometry/shapeDrag";
import { listFrames, uniqueFrameName } from "@/core/frames/frames";

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
  /** 0 for a frame, 1 for its children, and so on. */
  depth: number;
}

/** How a pick changes the selection: replace it, or toggle the layer in it (Shift). */
export type SelectMode = "replace" | "add" | "toggle";

export interface ToolContext {
  zoom: () => number;
  panBy: (dx: number, dy: number) => void;
  panEnabled: () => boolean;
  /** The World Environment's "any blank canvas drags the view" setting. */
  panOnBlank: () => boolean;
  pick: (world: Point, deep: boolean) => PickedLayer | null;
  /** The deepest container (frame) under a canvas point, with the origin its children are positioned from; null over bare canvas. */
  containerAt: (world: Point) => { id: string; origin: Point } | null;
  /** Selects a layer, or clears the selection with null. */
  select: (layer: PickedLayer | null, mode?: SelectMode) => void;
  /** A marquee from `start` to `end` (canvas space), begun inside frame `startFrameId` (null: on bare canvas). */
  marquee: (start: Point, end: Point, startFrameId: string | null, mode: SelectMode) => void;
  /** Where new layers go: the active frame. */
  parentId: () => string | null;
  /** Called after a tool created a layer: select it and go back to Select. */
  created: (layer: { id: string; name: string }) => void;
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

/**
 * Select, and deep select (the same tool, picking the deepest layer). A click picks the layer under the pointer;
 * Shift-click toggles it in the selection; a drag that starts on a frame's own background or on bare canvas is a
 * marquee; a drag on bare canvas pans when the environment says so. (A drag that starts on a layer is Phase 27's move.)
 */
export function createSelectTool(id: "select" | "deepSelect"): Tool {
  const pan = panGesture();
  let down: ToolPointer | null = null;
  let hit: PickedLayer | null = null;
  let panning = false;
  let marqueeing = false;
  let marqueeFrame: string | null = null;
  let cursor: ToolPointer | null = null;
  const moved = (p: ToolPointer) => down !== null && Math.hypot(p.screen.x - down.screen.x, p.screen.y - down.screen.y) >= CLICK_SLOP;
  const reset = () => {
    down = null;
    hit = null;
    panning = false;
    marqueeing = false;
    cursor = null;
  };
  return {
    id,
    cursor: "default",
    onPointerDown: (p, ctx) => {
      down = p;
      cursor = p;
      panning = false;
      marqueeing = false;
      hit = ctx.pick(p.world, id === "deepSelect" || p.metaKey || p.ctrlKey);
      // A drag that starts on a frame's background (depth 0) or on bare canvas can become a marquee.
      marqueeFrame = hit && hit.depth === 0 ? hit.id : null;
      if (p.onBlank && ctx.panOnBlank()) panning = pan.start(p, ctx);
      return true;
    },
    onPointerMove: (p, ctx) => {
      cursor = p;
      if (panning) {
        pan.move(p, ctx);
        return;
      }
      if (!marqueeing && moved(p) && (hit === null || hit.depth === 0)) marqueeing = true;
      if (marqueeing) ctx.requestOverlay();
    },
    onPointerUp: (p, ctx) => {
      const start = down;
      const picked = hit;
      const wasMarquee = marqueeing;
      const startFrame = marqueeFrame;
      const wasPanning = panning;
      if (wasPanning) pan.end(ctx);
      reset();
      ctx.requestOverlay();
      if (!start) return;
      if (wasMarquee) {
        ctx.marquee(start.world, p.world, startFrame, p.shiftKey ? "add" : "replace");
        return;
      }
      if (wasPanning || Math.hypot(p.screen.x - start.screen.x, p.screen.y - start.screen.y) >= CLICK_SLOP) return;
      if (picked) ctx.select(picked, p.shiftKey ? "toggle" : "replace");
      else if (!p.shiftKey) ctx.select(null);
    },
    onPointerCancel: (ctx) => {
      if (panning) pan.end(ctx);
      reset();
      ctx.requestOverlay();
    },
    drawOverlay: () =>
      marqueeing && down && cursor
        ? { x: Math.min(down.screen.x, cursor.screen.x), y: Math.min(down.screen.y, cursor.screen.y), width: Math.abs(cursor.screen.x - down.screen.x), height: Math.abs(cursor.screen.y - down.screen.y) }
        : null,
  };
}

/** What each creation tool makes. */
interface CreationSpec {
  archetype: ArchetypeId;
  label: string;
  kind: DragKind;
}

const CREATION: Partial<Record<ToolId, CreationSpec>> = {
  frame: { archetype: "container", label: "Frame", kind: "box" },
  rectangle: { archetype: "rectangle", label: "Rectangle", kind: "box" },
  ellipse: { archetype: "ellipse", label: "Ellipse", kind: "box" },
  polygon: { archetype: "polygon", label: "Polygon", kind: "box" },
  star: { archetype: "star", label: "Star", kind: "box" },
  line: { archetype: "line", label: "Line", kind: "segment" },
  arrow: { archetype: "arrow", label: "Arrow", kind: "segment" },
  text: { archetype: "text", label: "Text", kind: "box" },
};

export function isCreationTool(id: string): boolean {
  return id in CREATION;
}

/** The size a click gives the tool's layer (its archetype's defaults). */
function defaultsFor(spec: CreationSpec): { width: number; height: number } {
  const props = getDefaultProps(spec.archetype);
  const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);
  if (spec.archetype === "text") return { width: 240, height: 32 };
  if (spec.archetype === "container") return { width: 320, height: 240 };
  return { width: num(props["frame.width"], 120), height: num(props["frame.height"], 120) };
}

/**
 * Makes the layer a drag describes, positioned absolutely inside `parent` (its `frame.x` / `frame.y` are relative
 * to the parent's own top-left) or, with no parent, as a new top-level frame. One document command: one undo step.
 */
export function createLayerFromDrag(spec: CreationSpec, box: DragBox, parent: { id: string; origin: Point } | null): string {
  const props: Record<string, PropValue> = {
    ...getDefaultProps(spec.archetype),
    positioning: "absolute",
    "frame.x": Math.round((box.x - (parent?.origin.x ?? 0)) * 100) / 100,
    "frame.y": Math.round((box.y - (parent?.origin.y ?? 0)) * 100) / 100,
  };
  if (spec.archetype === "text") {
    // A click makes auto-width text; a drag makes a text box of the dragged size.
    if (!box.click) {
      props["frame.width"] = box.width;
      props["frame.height"] = box.height;
    }
  } else {
    props["frame.width"] = box.width;
    props["frame.height"] = box.height;
  }
  if (box.rotation !== 0) props["frame.rotation"] = box.rotation;
  if (spec.archetype === "container") {
    props["appearance.background.color"] = "#ffffff";
    if (parent) props["appearance.radius"] = 0;
  }
  const name = spec.archetype === "container" && !parent ? uniqueFrameName(listFrames(getDocument().layers), spec.label) : spec.label;
  return documentCommands.addLayer({ archetype: spec.archetype, parentId: parent?.id ?? null, name, properties: props }, `Draw ${spec.label}`);
}

/**
 * Frame, Rectangle, Ellipse, Polygon, Star, Line, Arrow and Text: drag to size, click for the default size.
 * Shift constrains (a square, a 45-degree angle), Alt draws from the centre. A layer drawn inside a frame is
 * parented to it; over bare canvas only the Frame tool does anything (it makes a new top-level frame).
 */
export function createCreationTool(id: ToolId): Tool {
  const spec = CREATION[id]!;
  const defaults = defaultsFor(spec);
  const segment = spec.kind === "segment";
  const dragDefaults = segment ? { width: defaults.width, height: spec.archetype === "arrow" ? 32 : 2 } : defaults;
  let start: ToolPointer | null = null;
  let now: ToolPointer | null = null;
  let parent: { id: string; origin: Point } | null = null;

  const box = (to: ToolPointer, ctx: ToolContext) =>
    dragBox(spec.kind, start!.world, to.world, { shift: to.shiftKey, alt: to.altKey }, dragDefaults, CLICK_SLOP / (ctx.zoom() || 1));

  return {
    id,
    cursor: "crosshair",
    onPointerDown: (p, ctx) => {
      const container = ctx.containerAt(p.world);
      parent = container ? { id: container.id, origin: container.origin } : null;
      // Only a frame can be drawn on bare canvas
      if (parent === null && spec.archetype !== "container") return false;
      start = p;
      now = p;
      return true;
    },
    onPointerMove: (p, ctx) => {
      if (!start) return;
      now = p;
      ctx.requestOverlay();
    },
    onPointerUp: (p, ctx) => {
      const from = start;
      const dragBoxNow = from ? box(p, ctx) : null;
      start = null;
      now = null;
      ctx.requestOverlay();
      if (!from || !dragBoxNow) return;
      const layerId = createLayerFromDrag(spec, dragBoxNow, parent);
      ctx.created({ id: layerId, name: spec.label });
    },
    onPointerCancel: (ctx) => {
      start = null;
      now = null;
      ctx.requestOverlay();
    },
    drawOverlay: () => {
      if (!start || !now) return null;
      // the preview is a screen-space box around the drag (a segment's, its bounding box)
      return { x: Math.min(start.screen.x, now.screen.x), y: Math.min(start.screen.y, now.screen.y), width: Math.abs(now.screen.x - start.screen.x), height: Math.abs(now.screen.y - start.screen.y) };
    },
  };
}

/** The tools that have behaviour on the canvas, by id. */
export function createTools(): Partial<Record<ToolId, Tool>> {
  const tools: Partial<Record<ToolId, Tool>> = {
    select: createSelectTool("select"),
    deepSelect: createSelectTool("deepSelect"),
    pan: createHandTool(),
  };
  for (const id of Object.keys(CREATION) as ToolId[]) tools[id] = createCreationTool(id);
  return tools;
}
