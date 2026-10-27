/**
 * The canvas' overlay layer (ROADMAP Phase 23): one layer above the frames that draws what the editor puts on
 * top of the design: the outline of the layer under the pointer, the selection with its name and size.
 * (Handles come in Phase 27 and guides in Phase 28; they draw here too.)
 *
 * It writes straight to a handful of pooled DOM elements, not through React, and redraws on the studio's
 * frame scheduler: an event that could change the picture (the pointer moved, the selection or the document
 * changed) asks for a redraw, which runs in the next frame's `overlay` phase. So an outline appears within
 * one frame of the pointer event, however many layers the document has.
 */

import type { CanvasHitTester } from "@/core/hit/CanvasHitTester";
import { frameScheduler } from "@/core/time/scheduler";
import type { Point, Rect } from "@/core/viewport/camera";
import type { TransformModel } from "../transformModel";
import type { SnapLine, SpacingMark } from "@/core/geometry/snap";
import { distanceLabel } from "@/core/geometry/measureDistances";

export interface OverlayEnv {
  hitTester: CanvasHitTester;
  /** The pointer's place in canvas space, or null when it is off the canvas. */
  pointerWorld: () => Point | null;
  /** Cmd/Ctrl held: the hover shows the deep pick. */
  deep: () => boolean;
  hoverEnabled: () => boolean;
  selectedIds: () => readonly string[];
  layerName: (id: string) => string;
  /** The transform handles' target, or null when none should show (no selection, Preview mode, a drawing tool). */
  transformModel: () => TransformModel | null;
  /** The guide lines a gesture snapped to and the spacing marks it shows (from the snap store). */
  snapFeedback: () => { lines: readonly SnapLine[]; spacing: readonly SpacingMark[] };
  /** The distance HUD for the selection while Alt is held and nothing is being dragged. */
  /** The Alt distance HUD; `hovered` is the layer under the pointer (FigCraft port F12: measured from the selection). */
  hudMarks: (hovered: string | null) => readonly SpacingMark[];
  /** Every frame's ruler guides, in canvas space: a vertical guide is `axis: "x"`; `from` / `to` span the frame. */
  guides: () => readonly { axis: "x" | "y"; pos: number; from: number; to: number; id: string }[];
}

interface Box {
  root: HTMLDivElement;
  label: HTMLSpanElement | null;
}

export class OverlayController {
  private readonly hover: Box;
  private readonly selection: Box[] = [];
  private readonly transform: HTMLDivElement;
  private readonly params: HTMLDivElement[] = [];
  /** The rotation origin's handle (FigCraft port F12). */
  private readonly origin: HTMLDivElement;
  private readonly gapHandles: { root: HTMLDivElement; label: HTMLSpanElement }[] = [];
  private readonly gradientHandles: HTMLDivElement[] = [];
  private readonly gradientLines: HTMLDivElement[] = [];
  private readonly snapLines: HTMLDivElement[] = [];
  private readonly marks: { root: HTMLDivElement; label: HTMLSpanElement }[] = [];
  private readonly guideLines: HTMLDivElement[] = [];
  private queued = false;
  private extraPasses = 0;
  private disposed = false;
  /** The layer the hover outline is on (what a click would select). */
  hoveredId: string | null = null;
  /** Redraws done, for the tests. */
  draws = 0;
  onHover: ((id: string | null, rect: Rect | null) => void) | null = null;

  constructor(private readonly container: HTMLElement, private readonly env: OverlayEnv) {
    this.hover = this.makeBox("canvas-overlay__hover", false);
    this.hover.root.hidden = true;
    this.origin = document.createElement("div");
    this.origin.className = "canvas-overlay__origin";
    this.origin.hidden = true;
    this.container.appendChild(this.origin);
    // The transform frame: an outline that turns with the selection, with eight handles on it.
    this.transform = document.createElement("div");
    this.transform.className = "canvas-overlay__transform";
    this.transform.hidden = true;
    for (const [name, x, y] of [["nw", 0, 0], ["n", 50, 0], ["ne", 100, 0], ["e", 100, 50], ["se", 100, 100], ["s", 50, 100], ["sw", 0, 100], ["w", 0, 50]] as const) {
      const h = document.createElement("div");
      h.className = "canvas-overlay__handle";
      h.dataset.handle = name;
      h.style.left = `${x}%`;
      h.style.top = `${y}%`;
      this.transform.appendChild(h);
    }
    this.container.appendChild(this.transform);
  }

  private fill(pool: HTMLDivElement[], n: number, className: string): void {
    while (pool.length < n) {
      const el = document.createElement("div");
      el.className = className;
      this.container.appendChild(el);
      pool.push(el);
    }
  }

  private makeBox(className: string, withLabel: boolean): Box {
    const root = document.createElement("div");
    root.className = className;
    let label: HTMLSpanElement | null = null;
    if (withLabel) {
      label = document.createElement("span");
      label.className = "canvas-overlay__label";
      root.appendChild(label);
    }
    this.container.appendChild(root);
    return { root, label };
  }

  /** Asks for a redraw in the next frame. `settle` adds a couple of follow-up passes, for edits whose layout lands a frame or two later. */
  invalidate(settle = false): void {
    if (settle) this.extraPasses = 2;
    if (this.queued || this.disposed) return;
    this.queued = true;
    const off = frameScheduler.register("overlay", () => {
      off();
      this.queued = false;
      this.draw();
      if (this.extraPasses > 0) {
        this.extraPasses--;
        this.invalidate();
      }
    });
  }

  private place(box: Box, rect: Rect): void {
    const s = box.root.style;
    s.left = `${rect.x}px`;
    s.top = `${rect.y}px`;
    s.width = `${rect.width}px`;
    s.height = `${rect.height}px`;
  }

  draw(): void {
    if (this.disposed) return;
    this.draws++;
    const index = this.env.hitTester.ensure();

    // Selection
    const ids = this.env.selectedIds();
    const shown: { id: string; rect: Rect }[] = [];
    for (const id of ids) {
      const hit = index.get(id);
      if (hit) shown.push({ id, rect: hit.rect });
    }
    while (this.selection.length < shown.length) this.selection.push(this.makeBox("canvas-overlay__selection", true));
    this.selection.forEach((box, i) => {
      const item = shown[i];
      box.root.hidden = !item;
      if (!item) return;
      this.place(box, item.rect);
      box.root.dataset.layerId = item.id;
      if (box.label) box.label.textContent = `${this.env.layerName(item.id)} · ${Math.round(item.rect.width)} × ${Math.round(item.rect.height)}`;
    });

    // Transform frame and parameter handles
    const model = this.env.transformModel();
    this.transform.hidden = model === null;
    if (model) {
      const f = model.frame;
      const s = this.transform.style;
      s.left = `${f.cx - f.w / 2}px`;
      s.top = `${f.cy - f.h / 2}px`;
      s.width = `${f.w}px`;
      s.height = `${f.h}px`;
      s.transform = f.rot ? `rotate(${f.rot}deg)` : "";
      this.transform.dataset.rotation = String(f.rot);
    }
    const oh = model?.originHandle ?? null;
    this.origin.hidden = !oh;
    if (oh) {
      this.origin.style.left = `${oh.x}px`;
      this.origin.style.top = `${oh.y}px`;
    }
    const params = model?.params ?? [];
    while (this.params.length < params.length) {
      const d = document.createElement("div");
      d.className = "canvas-overlay__param";
      this.container.appendChild(d);
      this.params.push(d);
    }
    this.params.forEach((d, i) => {
      const p = params[i];
      d.hidden = !p;
      if (!p) return;
      d.style.left = `${p.world.x}px`;
      d.style.top = `${p.world.y}px`;
      d.dataset.param = p.handle.kind;
    });

    // Spacing handles (Phase 30): a pill in the middle of each gap between neighbouring selected layers
    const gaps = model?.gaps ?? [];
    while (this.gapHandles.length < gaps.length) {
      const root = document.createElement("div");
      root.className = "canvas-overlay__gap";
      const label = document.createElement("span");
      root.appendChild(label);
      this.container.appendChild(root);
      this.gapHandles.push({ root, label });
    }
    this.gapHandles.forEach((g, i) => {
      const gap = gaps[i];
      g.root.hidden = !gap;
      if (!gap) return;
      g.root.style.left = `${gap.world.x}px`;
      g.root.style.top = `${gap.world.y}px`;
      g.root.dataset.axis = gap.axis;
      g.label.textContent = String(Math.round(gap.size));
    });

    // Gradient handles (Phase 35): the points and lines that shape the fill being edited
    const gm = model?.gradient ?? null;
    const gHandles = gm?.handles ?? [];
    this.fill(this.gradientHandles, gHandles.length, "canvas-overlay__ghandle");
    this.gradientHandles.forEach((el, i) => {
      const h = gHandles[i];
      el.hidden = !h;
      if (!h || !gm) return;
      el.style.left = `${h.world.x}px`;
      el.style.top = `${h.world.y}px`;
      el.dataset.kind = h.handle.kind;
      if (h.handle.stopIndex !== undefined && "stops" in gm.paint) {
        el.dataset.stopIndex = String(h.handle.stopIndex);
        el.style.background = gm.paint.stops[h.handle.stopIndex]?.color ?? "";
      } else {
        delete el.dataset.stopIndex;
        el.style.background = "";
      }
    });
    const links: [Point, Point][] = [];
    if (gm) {
      const at = (kind: string) => gHandles.find((h) => h.handle.kind === kind)?.world;
      const [from, to, center, rx, ry, angle] = [at("from"), at("to"), at("center"), at("radiusX"), at("radiusY"), at("angle")];
      if (from && to) links.push([from, to]);
      if (center && rx) links.push([center, rx]);
      if (center && ry) links.push([center, ry]);
      if (center && angle) links.push([center, angle]);
      const [nw, ne, se, sw] = [at("imgNW"), at("imgNE"), at("imgSE"), at("imgSW")];
      if (nw && ne && se && sw) links.push([nw, ne], [ne, se], [se, sw], [sw, nw]);
    }
    this.fill(this.gradientLines, links.length, "canvas-overlay__gline");
    this.gradientLines.forEach((el, i) => {
      const l = links[i];
      el.hidden = !l;
      if (!l) return;
      const dx = l[1].x - l[0].x;
      const dy = l[1].y - l[0].y;
      el.style.left = `${l[0].x}px`;
      el.style.top = `${l[0].y}px`;
      el.style.width = `${Math.hypot(dx, dy)}px`;
      el.style.transform = `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`;
    });

    // Snap lines, spacing marks and ruler guides
    const fb = this.env.snapFeedback();
    this.fill(this.snapLines, fb.lines.length, "canvas-overlay__snapline");
    this.snapLines.forEach((el, i) => {
      const l = fb.lines[i];
      el.hidden = !l;
      if (!l) return;
      const s = el.style;
      if (l.axis === "x") {
        s.left = `${l.pos}px`;
        s.top = `${l.from}px`;
        s.width = "0px";
        s.height = `${l.to - l.from}px`;
      } else {
        s.left = `${l.from}px`;
        s.top = `${l.pos}px`;
        s.width = `${l.to - l.from}px`;
        s.height = "0px";
      }
      el.dataset.kind = l.kind;
    });
    const spacing = [...fb.spacing, ...this.env.hudMarks(this.hoveredId)];
    while (this.marks.length < spacing.length) {
      const root = document.createElement("div");
      root.className = "canvas-overlay__spacing";
      const label = document.createElement("span");
      root.appendChild(label);
      this.container.appendChild(root);
      this.marks.push({ root, label });
    }
    this.marks.forEach((m, i) => {
      const mark = spacing[i];
      m.root.hidden = !mark;
      if (!mark) return;
      const s = m.root.style;
      if (mark.axis === "x") {
        s.left = `${mark.from}px`;
        s.top = `${mark.at}px`;
        s.width = `${mark.to - mark.from}px`;
        s.height = "0px";
      } else {
        s.left = `${mark.at}px`;
        s.top = `${mark.from}px`;
        s.width = "0px";
        s.height = `${mark.to - mark.from}px`;
      }
      m.root.dataset.axis = mark.axis;
      m.root.dataset.equal = mark.equal ? "true" : "false";
      m.root.dataset.dashed = mark.dashed ? "true" : "false";
      // up to two decimals, no trailing zeros (FigCraft port F12); an extension line has no label
      m.label.textContent = mark.dashed ? "" : distanceLabel(mark.value);
      m.label.hidden = !!mark.dashed;
    });
    const guides = this.env.guides();
    this.fill(this.guideLines, guides.length, "canvas-overlay__guide");
    this.guideLines.forEach((el, i) => {
      const g = guides[i];
      el.hidden = !g;
      if (!g) return;
      const s = el.style;
      if (g.axis === "x") {
        s.left = `${g.pos}px`;
        s.top = `${g.from}px`;
        s.width = "0px";
        s.height = `${g.to - g.from}px`;
      } else {
        s.left = `${g.from}px`;
        s.top = `${g.pos}px`;
        s.width = `${g.to - g.from}px`;
        s.height = "0px";
      }
      el.dataset.axis = g.axis;
      el.dataset.guideId = g.id;
    });

    // Hover: what a click at the pointer would select
    let hoveredId: string | null = null;
    let hoveredRect: Rect | null = null;
    const pointer = this.env.hoverEnabled() ? this.env.pointerWorld() : null;
    if (pointer) {
      const hit = index.pick(pointer, { deep: this.env.deep() });
      if (hit && !ids.includes(hit.id)) {
        hoveredId = hit.id;
        hoveredRect = hit.rect;
      }
    }
    this.hover.root.hidden = hoveredRect === null;
    if (hoveredRect) {
      this.place(this.hover, hoveredRect);
      this.hover.root.dataset.hoverId = hoveredId ?? "";
    } else {
      delete this.hover.root.dataset.hoverId;
    }
    if (hoveredId !== this.hoveredId) {
      this.hoveredId = hoveredId;
      this.onHover?.(hoveredId, hoveredRect);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.hover.root.remove();
    this.transform.remove();
    this.params.forEach((d) => d.remove());
    this.origin.remove();
    this.gapHandles.forEach((g) => g.root.remove());
    this.gradientHandles.forEach((d) => d.remove());
    this.gradientLines.forEach((d) => d.remove());
    this.snapLines.forEach((d) => d.remove());
    this.marks.forEach((m) => m.root.remove());
    this.guideLines.forEach((d) => d.remove());
    this.selection.forEach((b) => b.root.remove());
    this.selection.length = 0;
  }
}
