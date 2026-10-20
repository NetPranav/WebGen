/**
 * The Pencil and the Pen (ROADMAP Phase 39). The pencil records the stroke (every coalesced pointer sample, with
 * its time and pressure), shows it as it is drawn, and on release fits it to a few bezier nodes. The pen places
 * nodes by click, pulls handles by click and drag, closes on the first node, and finishes with Enter or Escape.
 * Both make an `svgPath` layer inside the frame under the pointer.
 */

import { fitStroke, type PathNode, type Sample } from "@/core/paths/pathFit";
import { createPathLayer, PENCIL_STYLE, PEN_STYLE } from "@/core/paths/createPath";
import { EMPTY_PEN, penClose, penDrag, penFinishable, penNearFirst, penPress, penUndo, type PenState } from "@/core/paths/penModel";
import { useDraftPathStore } from "@/core/store/useDraftPathStore";
import type { Point } from "@/core/viewport/camera";
import { CLICK_SLOP, type Tool, type ToolContext, type ToolPointer } from "./toolRuntime";

const MAX_SAMPLES = 50_000;

type Parent = { id: string; origin: Point } | null;

const parentAt = (ctx: ToolContext, world: Point): Parent => {
  const c = ctx.containerAt(world);
  return c ? { id: c.id, origin: c.origin } : null;
};

/** The samples a move carries: the coalesced ones when the browser has them, else the move itself. */
function samplesOf(p: ToolPointer, t0: number): Sample[] {
  const list = p.coalesced && p.coalesced.length > 0 ? p.coalesced : [{ world: p.world, time: p.time ?? t0, pressure: p.pressure ?? 0.5 }];
  return list.map((c) => ({ x: c.world.x, y: c.world.y, t: Math.max(0, c.time - t0), p: Math.min(1, Math.max(0, c.pressure)) }));
}

export function createPencilTool(): Tool {
  let samples: Sample[] = [];
  let t0 = 0;
  let parent: Parent = null;
  let cancelled = false;

  const reset = () => {
    samples = [];
    useDraftPathStore.getState().clear();
  };

  return {
    id: "pencil",
    cursor: "crosshair",
    onPointerDown: (p, ctx) => {
      parent = parentAt(ctx, p.world);
      if (!parent) return false; // only inside a frame
      cancelled = false;
      t0 = p.time ?? 0;
      samples = samplesOf({ ...p, coalesced: undefined }, t0);
      useDraftPathStore.getState().setPencil(samples.map((s) => ({ x: s.x, y: s.y })));
      return true;
    },
    onPointerMove: (p, ctx) => {
      if (samples.length === 0 || cancelled) return;
      for (const s of samplesOf(p, t0)) if (samples.length < MAX_SAMPLES) samples.push(s);
      useDraftPathStore.getState().setPencil(samples.map((s) => ({ x: s.x, y: s.y })));
      ctx.requestOverlay();
    },
    onKey: (e) => {
      if (e.key !== "Escape" || samples.length === 0) return false;
      cancelled = true;
      reset();
      return true;
    },
    onPointerUp: (_p, ctx) => {
      const mine = samples;
      const where = parent;
      const wasCancelled = cancelled;
      reset();
      cancelled = false;
      if (wasCancelled || mine.length < 2 || !where) return;
      const zoom = ctx.zoom() || 1;
      // a loop is closed when the end comes back within a few screen pixels of the start
      const { nodes, closed } = fitStroke(mine, {}, 8 / zoom);
      const id = createPathLayer(nodes, closed, where, PENCIL_STYLE, "Pencil");
      if (id) ctx.created({ id, name: "Pencil" });
    },
    onPointerCancel: () => reset(),
  };
}

export function createPenTool(): Tool {
  let state: PenState = EMPTY_PEN;
  let parent: Parent = null;
  let t0 = 0;
  let down: ToolPointer | null = null;
  let dragged = false;
  let lastCtx: ToolContext | null = null;

  const show = (cursor: Point | null) => useDraftPathStore.getState().setPen(state.nodes, state.closed, cursor);
  const reset = () => {
    state = EMPTY_PEN;
    parent = null;
    down = null;
    dragged = false;
    useDraftPathStore.getState().clear();
    lastCtx?.requestOverlay();
  };

  /** Makes the layer from what has been drawn and starts over. */
  const finish = (ctx: ToolContext) => {
    const nodes: PathNode[] = state.nodes;
    const where = parent;
    const closed = state.closed;
    const ok = penFinishable(state) && where !== null;
    reset();
    if (!ok) return;
    const id = createPathLayer(nodes, closed, where, PEN_STYLE, "Path");
    if (id) ctx.created({ id, name: "Path" });
  };

  currentPen = {
    finish: () => lastCtx && finish(lastCtx),
    undo: () => {
      state = penUndo(state);
      if (state.nodes.length === 0) reset();
      else show(null);
      lastCtx?.requestOverlay();
    },
    cancel: reset,
    active: () => state.nodes.length > 0,
  };

  return {
    id: "pen",
    cursor: "crosshair",
    onPointerDown: (p, ctx) => {
      lastCtx = ctx;
      if (state.nodes.length === 0) {
        parent = parentAt(ctx, p.world);
        if (!parent) return false;
        t0 = p.time ?? 0;
      }
      const zoom = ctx.zoom() || 1;
      // a click on the first node closes the path
      if (penNearFirst(state, p.world, 8 / zoom)) {
        state = penClose(state);
        finish(ctx);
        return false;
      }
      state = penPress(state, p.world, (p.time ?? t0) - t0, p.pressure ?? 0.5);
      down = p;
      dragged = false;
      show(p.world);
      ctx.requestOverlay();
      return true;
    },
    onPointerMove: (p, ctx) => {
      if (!down) return;
      if (!dragged && Math.hypot(p.screen.x - down.screen.x, p.screen.y - down.screen.y) < CLICK_SLOP) return;
      dragged = true;
      state = penDrag(state, p.world, p.altKey);
      show(p.world);
      ctx.requestOverlay();
    },
    onHover: (p, ctx) => {
      lastCtx = ctx;
      if (state.nodes.length > 0) {
        show(p.world);
        ctx.requestOverlay();
      }
    },
    onPointerUp: () => {
      down = null;
      dragged = false;
    },
    onPointerCancel: () => {
      down = null;
      dragged = false;
    },
    onKey: (e, ctx) => {
      if (e.key === "Escape" && state.nodes.length > 0) {
        finish(ctx);
        return true;
      }
      return false;
    },
    drawOverlay: () => null,
  };
}

export function createPathTools(): { pen: Tool; pencil: Tool } {
  return { pen: createPenTool(), pencil: createPencilTool() };
}

export interface PenControls {
  finish: () => void;
  undo: () => void;
  cancel: () => void;
  active: () => boolean;
}

let currentPen: PenControls | null = null;

/** The pen being drawn with, for the commands: whether it has nodes, and finishing, undoing or dropping them. */
export function penControls(): PenControls | null {
  return currentPen;
}
