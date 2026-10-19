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

export interface OverlayEnv {
  hitTester: CanvasHitTester;
  /** The pointer's place in canvas space, or null when it is off the canvas. */
  pointerWorld: () => Point | null;
  /** Cmd/Ctrl held: the hover shows the deep pick. */
  deep: () => boolean;
  hoverEnabled: () => boolean;
  selectedIds: () => readonly string[];
  layerName: (id: string) => string;
}

interface Box {
  root: HTMLDivElement;
  label: HTMLSpanElement | null;
}

export class OverlayController {
  private readonly hover: Box;
  private readonly selection: Box[] = [];
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
    this.selection.forEach((b) => b.root.remove());
    this.selection.length = 0;
  }
}
