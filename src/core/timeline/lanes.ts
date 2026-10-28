import type { KeyframeMark, TimelineItem } from "./model";

/**
 * ============================================================================
 * KEYFRAME LANES, AT SCALE (ROADMAP Phase 64)
 * ============================================================================
 * The timeline draws its keyframes on one canvas instead of one DOM node each, and builds DOM rows only for the part
 * of the list in view. This file is the pure half: which rows are in view, what to paint on the canvas, and what a
 * pointer press landed on. No DOM, no store; the panel owns the canvas and calls these.
 * ============================================================================
 */

export const ROW_HEIGHT = 26;
export const RULER_HEIGHT = 34;

export interface RowWindow {
  /** First item index to build, inclusive. */
  start: number;
  /** One past the last item index to build. */
  end: number;
  /** Height in px of the spacer standing in for the rows above `start`. */
  before: number;
  /** Height in px of the spacer standing in for the rows from `end` on. */
  after: number;
}

/**
 * The rows to build for a list of `count` equal-height rows seen through a window `viewportHeight` tall scrolled
 * `scrollTop` px, with `overscan` extra rows each side so a fast scroll doesn't show blank rows.
 */
export function visibleWindow(count: number, scrollTop: number, viewportHeight: number, rowHeight = ROW_HEIGHT, overscan = 8): RowWindow {
  const total = Math.max(0, Math.floor(count));
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const last = Math.ceil((Math.max(0, scrollTop) + Math.max(0, viewportHeight)) / rowHeight);
  const start = Math.max(0, Math.min(total, first - overscan));
  const end = Math.max(start, Math.min(total, last + overscan));
  return { start, end, before: start * rowHeight, after: (total - end) * rowHeight };
}

/** What the canvas paints for one item. `index` is the item's position in the whole list (its row). */
export interface LaneRow {
  index: number;
  kind: "layer" | "property";
  /** Property rows: the keyframes. Layer rows: one stand-in per distinct time (id is the time as text). */
  keys: ReadonlyArray<Pick<KeyframeMark, "id" | "time">>;
}

/** The canvas rows for the items in view. Group and info rows have no keyframes and are skipped. */
export function laneRows(items: readonly TimelineItem[], window: Pick<RowWindow, "start" | "end">): LaneRow[] {
  const rows: LaneRow[] = [];
  const end = Math.min(items.length, window.end);
  for (let i = window.start; i < end; i++) {
    const item = items[i];
    if (item.kind === "property") {
      if (item.keys.length > 0) rows.push({ index: i, kind: "property", keys: item.keys });
    } else if (item.kind === "layer" && !item.propsOpen && item.keyTimes.length > 0) {
      rows.push({ index: i, kind: "layer", keys: item.keyTimes.map((time) => ({ id: `t${time}`, time })) });
    }
  }
  return rows;
}

/** The slice of the 2D canvas API the lanes use, so tests can pass a recorder. */
export interface LaneContext {
  clearRect(x: number, y: number, w: number, h: number): void;
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
}

export interface LaneView {
  /** Pixels per second. */
  pixelsPerSecond: number;
  /** Pixels scrolled right and down inside the lanes. */
  scrollLeft: number;
  scrollTop: number;
  /** Visible size of the lanes in px. */
  width: number;
  height: number;
  rowHeight?: number;
  selected?: ReadonlySet<string>;
}

export const LANE_COLOURS = { key: "#facc15", keyEdge: "#fde68a", selected: "#6366f1", selectedEdge: "#fff", summary: "#a3a3a3", summaryEdge: "#d4d4d4" } as const;

/** Half the width of a drawn diamond, in px (also the pointer's hit radius for property rows). */
export const KEY_RADIUS = 5;

/**
 * Paints the keyframes of `rows` into the visible part of the lanes. Only diamonds that fall inside the view are drawn,
 * so the cost follows what's on screen, not the size of the composition. Returns how many were drawn.
 */
export function drawLanes(ctx: LaneContext, rows: readonly LaneRow[], view: LaneView): number {
  const rowHeight = view.rowHeight ?? ROW_HEIGHT;
  const pps = view.pixelsPerSecond;
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.save();
  let drawn = 0;
  // Batched by style: one path and one fill per colour, not one per diamond.
  const batches = new Map<string, Array<[number, number, number]>>();
  const add = (style: string, x: number, y: number, r: number) => {
    let list = batches.get(style);
    if (!list) batches.set(style, (list = []));
    list.push([x, y, r]);
  };
  for (const row of rows) {
    const y = row.index * rowHeight - view.scrollTop + rowHeight / 2;
    if (y < -rowHeight || y > view.height + rowHeight) continue;
    const r = row.kind === "layer" ? KEY_RADIUS - 1 : KEY_RADIUS;
    for (const key of row.keys) {
      const x = key.time * pps - view.scrollLeft;
      if (x < -r || x > view.width + r) continue;
      const isSelected = view.selected?.has(key.id) === true;
      add(isSelected ? "selected" : row.kind === "layer" ? "summary" : "key", x, y, r);
      drawn++;
    }
  }
  for (const [style, list] of batches) {
    const fill = style === "selected" ? LANE_COLOURS.selected : style === "summary" ? LANE_COLOURS.summary : LANE_COLOURS.key;
    const edge = style === "selected" ? LANE_COLOURS.selectedEdge : style === "summary" ? LANE_COLOURS.summaryEdge : LANE_COLOURS.keyEdge;
    ctx.beginPath();
    for (const [x, y, r] of list) {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
  return drawn;
}

/**
 * The keyframe under a press, or null. `x` is the pointer's distance in px from the start of the lanes (time 0), so it
 * doesn't depend on scroll. Several keyframes close together: the nearest wins, the earlier one on a tie.
 */
export function hitKey(keys: ReadonlyArray<Pick<KeyframeMark, "id" | "time">>, x: number, pixelsPerSecond: number, radius = KEY_RADIUS + 2): string | null {
  let best: string | null = null;
  let bestDistance = radius + 1e-9;
  for (const key of keys) {
    const d = Math.abs(key.time * pixelsPerSecond - x);
    if (d < bestDistance) {
      best = key.id;
      bestDistance = d;
    }
  }
  return best;
}

/** A rectangle dragged in the lanes, in px from the start of the lanes (x) and the start of the list (y). */
export interface BoxSelect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The ids of the property-row keyframes inside the box. Layer summary dots are not selectable. */
export function keysInBox(items: readonly TimelineItem[], box: BoxSelect, pixelsPerSecond: number, rowHeight = ROW_HEIGHT): string[] {
  const left = Math.min(box.x0, box.x1);
  const right = Math.max(box.x0, box.x1);
  const top = Math.min(box.y0, box.y1);
  const bottom = Math.max(box.y0, box.y1);
  const firstRow = Math.max(0, Math.floor(top / rowHeight));
  const lastRow = Math.min(items.length - 1, Math.floor(bottom / rowHeight));
  const ids: string[] = [];
  for (let i = firstRow; i <= lastRow; i++) {
    const item = items[i];
    if (item.kind !== "property") continue;
    for (const key of item.keys) {
      const x = key.time * pixelsPerSecond;
      if (x >= left - KEY_RADIUS && x <= right + KEY_RADIUS) ids.push(key.id);
    }
  }
  return ids;
}
