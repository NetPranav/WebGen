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
import { setUniformGap } from "@/core/geometry/align";
import { dragHandle, worldToNorm } from "@/core/paint/gradientHandles";
import type { Paint } from "@/core/paint/paints";
import { moveBoxes, paramValue, resizeBoxes, rotateBoxes, rotationDelta, unionBox, type Box } from "@/core/geometry/transform";
import { frameContains, type HandleHit, type TransformModel } from "../transformModel";
import { createPathTools } from "./pathTools";

/** One of the samples a browser coalesced into a pointer move (a 120 Hz pen reports two or more per frame). */
export interface CoalescedSample {
  world: Point;
  /** `PointerEvent.timeStamp`, ms. */
  time: number;
  pressure: number;
}

export interface ToolPointer {
  /** `PointerEvent.timeStamp`, ms. */
  time?: number;
  /** 0 to 1; 0.5 for a mouse. */
  pressure?: number;
  /** The samples behind this move, oldest first (empty when the browser has none). */
  coalesced?: CoalescedSample[];
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
  /** The selection as boxes with its handles; null when nothing selected is drawn. */
  transformModel: () => TransformModel | null;
  /** Which transform handle is under a screen point. */
  handleAt: (screen: Point) => HandleHit | null;
  isSelected: (id: string) => boolean;
  /** Opens one transaction for a transform gesture: everything until `commitTransform` is one undo step, `cancelTransform` undoes it. */
  beginTransform: (label: string) => void;
  applyBoxes: (ids: readonly string[], boxes: readonly Box[]) => void;
  setParam: (layerId: string, prop: string, value: number) => void;
  /** Replaces one fill of a layer (a gradient being shaped with its handles). */
  setPaint: (layerId: string, index: number, paint: Paint) => void;
  commitTransform: () => void;
  cancelTransform: () => void;
  /** Snaps the selection's bounds `rect` while it moves; returns the nudge. `off` (a modifier) skips snapping but still shows the HUD. */
  snapMove: (ids: readonly string[], rect: { x: number; y: number; width: number; height: number }, off?: boolean) => { dx: number; dy: number };
  /** Snaps the edges being resized; each value is the adjustment to that edge. */
  snapEdges: (
    ids: readonly string[],
    rect: { x: number; y: number; width: number; height: number },
    edges: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean },
    off?: boolean,
  ) => { left: number; right: number; top: number; bottom: number };
  /** The ruler guide under a screen point, if any (within a few px). */
  guideAt: (screen: Point) => { frameId: string; index: number; axis: "x" | "y" } | null;
  /** Moves a guide to canvas-space `world` (along its axis); `remove` deletes it (dragged back onto a ruler). */
  moveGuide: (ref: { frameId: string; index: number; axis: "x" | "y" }, world: Point) => void;
  removeGuide: (ref: { frameId: string; index: number; axis: "x" | "y" }) => void;
  /** Is a screen point over a ruler (a guide dropped there is deleted)? */
  overRuler: (screen: Point) => boolean;
  /** Clears the snap lines, spacing marks and HUD a gesture was showing. */
  clearSnap: () => void;
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
  /** The pointer moved over the canvas with no gesture running (the pen's rubber band). */
  onHover?: (p: ToolPointer, ctx: ToolContext) => void;
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

/** Which edges a resize handle drags. */
const HANDLE_DIRS: Record<string, { sx: -1 | 0 | 1; sy: -1 | 0 | 1 }> = {
  nw: { sx: -1, sy: -1 }, n: { sx: 0, sy: -1 }, ne: { sx: 1, sy: -1 }, e: { sx: 1, sy: 0 },
  se: { sx: 1, sy: 1 }, s: { sx: 0, sy: 1 }, sw: { sx: -1, sy: 1 }, w: { sx: -1, sy: 0 },
};

/**
 * Select, and deep select (the same tool, picking the deepest layer).
 *
 *  - A click picks the layer under the pointer; Shift-click toggles it in the selection.
 *  - A drag that starts on a frame's own background or on bare canvas is a marquee (or a pan, when the environment
 *    says any blank canvas pans).
 *  - A drag that starts on a selected layer (anywhere in the selection's box) moves the selection; one that starts
 *    on an unselected layer selects it and moves it. Shift locks the move to an axis.
 *  - A drag that starts on a handle resizes (Shift keeps the aspect ratio, Alt resizes about the centre), rotates
 *    (Shift snaps to 15 degrees) or changes a parameter (corner radius, star points and inner radius, polygon sides).
 *  - Every gesture writes through one transaction: one undo step, and Escape puts everything back.
 */
export function createSelectTool(id: "select" | "deepSelect"): Tool {
  const pan = panGesture();
  type Mode = "idle" | "click" | "marquee" | "pan" | "pending-move" | "move" | "resize" | "rotate" | "param" | "gap" | "gradient" | "guide" | "cancelled";
  let guide: { frameId: string; index: number; axis: "x" | "y" } | null = null;
  let mode: Mode = "idle";
  let down: ToolPointer | null = null;
  let cursor: ToolPointer | null = null;
  let hit: PickedLayer | null = null;
  let marqueeFrame: string | null = null;
  let began = false;
  let start: { ids: string[]; boxes: Box[]; frame: Box; handle?: HandleHit; startValue?: number; gap?: { axis: "h" | "v"; size: number }; gradient?: { layerId: string; paintIndex: number; paint: Paint; box: Box; kind: string; stopIndex?: number } } | null = null;

  const moved = (p: ToolPointer, from: ToolPointer | null) => from !== null && Math.hypot(p.screen.x - from.screen.x, p.screen.y - from.screen.y) >= CLICK_SLOP;
  const reset = () => {
    mode = "idle";
    down = null;
    cursor = null;
    hit = null;
    began = false;
    start = null;
    guide = null;
  };
  const snapshot = (model: TransformModel, handle?: HandleHit) => {
    start = { ids: model.ids, boxes: model.boxes, frame: model.frame, handle };
    if (handle?.kind === "param") start.startValue = model.params[handle.index].value;
    if (handle?.kind === "gradient" && model.gradient) {
      const g = model.gradient;
      const h = g.handles[handle.index].handle;
      start.gradient = { layerId: g.layerId, paintIndex: g.paintIndex, paint: g.paint, box: g.box, kind: h.kind, stopIndex: h.stopIndex };
    }
    if (handle?.kind === "gap") start.gap = { axis: model.gaps[handle.index].axis, size: model.gaps[handle.index].size };
  };
  const begin = (ctx: ToolContext, label: string) => {
    if (began) return;
    began = true;
    ctx.beginTransform(label);
  };

  return {
    id,
    cursor: "default",
    onPointerDown: (p, ctx) => {
      down = p;
      cursor = p;
      began = false;
      start = null;
      hit = ctx.pick(p.world, id === "deepSelect" || p.metaKey || p.ctrlKey);
      marqueeFrame = hit && hit.depth === 0 ? hit.id : null;

      const grabbed = ctx.guideAt(p.screen);
      if (grabbed) {
        guide = grabbed;
        mode = "guide";
        return true;
      }
      const model = ctx.transformModel();
      const handle = model ? ctx.handleAt(p.screen) : null;
      if (model && handle) {
        snapshot(model, handle);
        mode = handle.kind;
        return true;
      }
      if (model && !p.shiftKey && frameContains(model.frame, p.world) && hit && hit.depth >= 1) {
        snapshot(model);
        mode = "pending-move";
        return true;
      }
      if (hit && hit.depth >= 1 && !p.shiftKey && !ctx.isSelected(hit.id)) {
        mode = "pending-move"; // select it, then move it, once the pointer has really dragged
        return true;
      }
      mode = "click";
      if (p.onBlank && ctx.panOnBlank() && pan.start(p, ctx)) mode = "pan";
      return true;
    },
    onPointerMove: (p, ctx) => {
      cursor = p;
      if (!down) return;
      if (mode === "pan") return pan.move(p, ctx);
      if (mode === "guide" && guide && moved(p, down)) {
        begin(ctx, "Move guide");
        ctx.moveGuide(guide, p.world);
        return;
      }
      if (mode === "pending-move" && moved(p, down)) {
        if (!start) {
          // select the layer under the pointer first, then move the new selection
          if (hit) ctx.select(hit, "replace");
          const model = ctx.transformModel();
          if (!model) return;
          snapshot(model);
        }
        mode = "move";
      }
      if (mode === "click" && moved(p, down) && (hit === null || hit.depth === 0)) mode = "marquee";
      if (mode === "marquee") ctx.requestOverlay();
      if (!start) return;
      const delta = { x: p.world.x - down.world.x, y: p.world.y - down.world.y };
      if (mode === "move") {
        begin(ctx, "Move");
        let { x, y } = delta;
        const lockY = p.shiftKey && Math.abs(x) >= Math.abs(y);
        const lockX = p.shiftKey && !lockY;
        if (lockY) y = 0;
        if (lockX) x = 0;
        const union = unionBox(moveBoxes(start.boxes, x, y))!;
        const snap = ctx.snapMove(start.ids, { x: union.cx - union.w / 2, y: union.cy - union.h / 2, width: union.w, height: union.h }, p.metaKey || p.ctrlKey);
        // a Shift-locked axis stays locked: its snap is ignored
        ctx.applyBoxes(start.ids, moveBoxes(start.boxes, x + (lockX ? 0 : snap.dx), y + (lockY ? 0 : snap.dy)));
      } else if (mode === "resize" && start.handle?.kind === "resize" && moved(p, down)) {
        begin(ctx, "Resize");
        const opts = { aspect: p.shiftKey, fromCenter: p.altKey };
        let d = delta;
        // Snap the edges the handle drags (an upright box with the ratio free: a rotated or ratio-locked resize doesn't snap).
        if (start.frame.rot === 0 && !p.shiftKey && !p.altKey) {
          const next = resizeBoxes(start.boxes, start.frame, start.handle.handle, delta, opts);
          const nf = unionBox(next)!;
          const dir = HANDLE_DIRS[start.handle.handle];
          const adj = ctx.snapEdges(
            start.ids,
            { x: nf.cx - nf.w / 2, y: nf.cy - nf.h / 2, width: nf.w, height: nf.h },
            { left: dir.sx === -1, right: dir.sx === 1, top: dir.sy === -1, bottom: dir.sy === 1 },
            p.metaKey || p.ctrlKey,
          );
          d = { x: delta.x + (dir.sx === 1 ? adj.right : dir.sx === -1 ? adj.left : 0), y: delta.y + (dir.sy === 1 ? adj.bottom : dir.sy === -1 ? adj.top : 0) };
        }
        ctx.applyBoxes(start.ids, resizeBoxes(start.boxes, start.frame, start.handle.handle, d, opts));
      } else if (mode === "rotate" && moved(p, down)) {
        begin(ctx, "Rotate");
        const pivot = { x: start.frame.cx, y: start.frame.cy };
        ctx.applyBoxes(start.ids, rotateBoxes(start.boxes, pivot, rotationDelta(pivot, down.world, p.world), p.shiftKey));
      } else if (mode === "gradient" && start.gradient && moved(p, down)) {
        // Dragging a gradient handle reshapes that fill (Shift keeps a linear angle or a conic angle to 15 degree steps).
        begin(ctx, "Edit gradient");
        const g = start.gradient;
        ctx.setPaint(g.layerId, g.paintIndex, dragHandle(g.paint, { kind: g.kind as never, stopIndex: g.stopIndex }, worldToNorm(g.box, p.world), { w: g.box.w, h: g.box.h }, { shift: p.shiftKey }));
      } else if (mode === "gap" && start.gap && moved(p, down)) {
        // Dragging a spacing handle gives every gap along its axis the same size: the first layer stays put.
        begin(ctx, "Change spacing");
        const along = start.gap.axis === "h" ? delta.x : delta.y;
        const gap = Math.round(start.gap.size + (p.shiftKey ? Math.round(along / 10) * 10 : along));
        ctx.applyBoxes(start.ids, setUniformGap(start.boxes, start.gap.axis, gap));
      } else if (mode === "param" && start.handle?.kind === "param" && moved(p, down)) {
        const model = ctx.transformModel();
        const info = model?.params[start.handle.index];
        if (!info) return;
        begin(ctx, "Change shape");
        ctx.setParam(info.layerId, info.handle.prop, paramValue(info.handle, start.boxes[0], p.world, start.startValue ?? 0, down.world));
      }
    },
    onPointerUp: (p, ctx) => {
      const from = down;
      const picked = hit;
      const was = mode;
      const frameBg = marqueeFrame;
      const didBegin = began;
      const grabbedGuide = guide;
      if (was === "pan") pan.end(ctx);
      reset();
      ctx.requestOverlay();
      if (!from || was === "cancelled") return;
      ctx.clearSnap();
      if (was === "guide" && grabbedGuide) {
        const g = grabbedGuide;
        if (didBegin) {
          if (ctx.overRuler(p.screen)) ctx.removeGuide(g);
          ctx.commitTransform();
        }
        return;
      }
      if (didBegin) {
        ctx.commitTransform();
        return;
      }
      if (was === "marquee") {
        ctx.marquee(from.world, p.world, frameBg, p.shiftKey ? "add" : "replace");
        return;
      }
      if (was === "pan" || moved(p, from)) return;
      // a click (or a press on a handle that never moved)
      if (picked) ctx.select(picked, p.shiftKey ? "toggle" : "replace");
      else if (!p.shiftKey) ctx.select(null);
    },
    onPointerCancel: (ctx) => {
      if (mode === "pan") pan.end(ctx);
      ctx.clearSnap();
      if (began) ctx.cancelTransform();
      reset();
      ctx.requestOverlay();
    },
    onKey: (e, ctx) => {
      if (e.key === "Escape" && began) {
        ctx.clearSnap();
        ctx.cancelTransform();
        began = false;
        mode = "cancelled";
        return true;
      }
      return false;
    },
    drawOverlay: () =>
      mode === "marquee" && down && cursor
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
    props["content.text"] = ""; // the editor opens on it at once; leaving it empty discards the layer
    props["text.sizing"] = box.click ? "autoWidth" : "fixed";
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
  let cancelled = false;

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
      cancelled = false;
      return true;
    },
    onPointerMove: (p, ctx) => {
      if (!start) return;
      now = p;
      ctx.requestOverlay();
    },
    onKey: (e, ctx) => {
      // Escape drops the drag: nothing is created when the button comes up
      if (e.key !== "Escape" || !start) return false;
      start = null;
      now = null;
      cancelled = true;
      ctx.requestOverlay();
      return true;
    },
    onPointerUp: (p, ctx) => {
      const from = start;
      const dragBoxNow = from ? box(p, ctx) : null;
      start = null;
      now = null;
      ctx.requestOverlay();
      if (cancelled) {
        cancelled = false;
        return;
      }
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
  // the pen and pencil live in their own module
  const paths = createPathTools();
  const tools: Partial<Record<ToolId, Tool>> = {
    select: createSelectTool("select"),
    deepSelect: createSelectTool("deepSelect"),
    pan: createHandTool(),
  };
  for (const id of Object.keys(CREATION) as ToolId[]) tools[id] = createCreationTool(id);
  tools.pen = paths.pen;
  tools.pencil = paths.pencil;
  return tools;
}
