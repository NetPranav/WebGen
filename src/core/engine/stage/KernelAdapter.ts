import type { MotionDocument } from "../../document/schema";
import { evaluate, type EvaluateInputs } from "../../kernel/evaluate";
import type { AdapterHost, EngineAdapter, EngineCapabilities, StyledElement } from "./types";
import { animatedLayers, styleWrites } from "./styleWrites";

/**
 * ROADMAP Phase 57: applies `evaluate()` straight to the layers' elements. It is the universal fallback (it can
 * show any layer, any property) and the scrub engine: `seek(t)` is the exact value at `t`, whatever came before.
 *
 * It writes only what a layer animates, and only what changed since its last write. The first write to a style
 * remembers what React had drawn, so `dispose()` (or a layer stopping being animated) puts that back.
 */
export class KernelAdapter implements EngineAdapter {
  readonly id = "kernel";
  readonly capabilities: EngineCapabilities = { scrub: true, deterministic: true, offMainThread: false };

  private host: AdapterHost | null = null;
  private inputs: EvaluateInputs = {};
  private lastTime = 0;
  /** The animated layers of `plannedFor`, recomputed when the document changes. */
  private plan = new Map<string, Set<string>>();
  private plannedFor: MotionDocument | null = null;
  /** What this adapter last wrote, per layer and CSS property. */
  private readonly written = new Map<string, Map<string, string>>();
  /** What the element held before the first write, per layer and CSS property. */
  private readonly originals = new Map<string, Map<string, string>>();
  private readonly elements = new Map<string, StyledElement>();

  /** Counts of work done, for tests. */
  stats = { evaluations: 0, writes: 0 };

  mount(host: AdapterHost): void {
    this.host = host;
    this.invalidate();
  }

  play(time: number): void {
    this.lastTime = time;
  }

  pause(time: number): void {
    this.lastTime = time;
  }

  setInputs(inputs: EvaluateInputs): void {
    this.inputs = inputs;
    this.invalidate();
  }

  invalidate(): void {
    this.plannedFor = null;
    this.written.clear(); // React may have redrawn an element since; write everything again
  }

  seek(time: number): void {
    const host = this.host;
    if (!host) return;
    this.lastTime = time;
    const doc = host.getDocument();
    if (this.plannedFor !== doc) {
      this.plan = animatedLayers(doc);
      this.plannedFor = doc;
      this.restoreStale();
    }
    const compositionId = host.compositionId();
    for (const [layerId, paths] of this.plan) {
      const element = host.node(layerId) as unknown as StyledElement | undefined;
      if (!element?.style) continue;
      if (this.elements.get(layerId) !== element) {
        this.restore(layerId); // the layer was drawn into a new element
        this.elements.set(layerId, element);
      }
      this.stats.evaluations++;
      this.apply(layerId, element, styleWrites(paths, evaluate(doc, compositionId, layerId, time, this.inputs)));
    }
  }

  dispose(): void {
    for (const layerId of Array.from(this.elements.keys())) this.restore(layerId);
    this.host = null;
    this.plan = new Map();
    this.plannedFor = null;
  }

  private apply(layerId: string, element: StyledElement, writes: Record<string, string>): void {
    let written = this.written.get(layerId);
    if (!written) this.written.set(layerId, (written = new Map()));
    let originals = this.originals.get(layerId);
    if (!originals) this.originals.set(layerId, (originals = new Map()));
    // A property this layer stopped animating (a track was removed) gets its drawn value back.
    for (const [property, original] of originals) {
      if (property in writes) continue;
      if (original) element.style.setProperty(property, original);
      else element.style.removeProperty(property);
      originals.delete(property);
      written.delete(property);
    }
    for (const [property, value] of Object.entries(writes)) {
      if (written.get(property) === value) continue;
      if (!originals.has(property)) originals.set(property, element.style.getPropertyValue(property));
      element.style.setProperty(property, value);
      written.set(property, value);
      this.stats.writes++;
    }
  }

  /** Puts back what React drew on a layer's element and forgets it. */
  private restore(layerId: string): void {
    const element = this.elements.get(layerId);
    const originals = this.originals.get(layerId);
    if (element && originals) {
      for (const [property, original] of originals) {
        if (original) element.style.setProperty(property, original);
        else element.style.removeProperty(property);
      }
    }
    this.elements.delete(layerId);
    this.originals.delete(layerId);
    this.written.delete(layerId);
  }

  /** After a document change: layers that no longer animate anything give their elements back. */
  private restoreStale(): void {
    for (const layerId of Array.from(this.elements.keys())) if (!this.plan.has(layerId)) this.restore(layerId);
  }
}
