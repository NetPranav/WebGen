import type { MotionDocument } from "../../document/schema";
import { evaluate, type EvaluateInputs } from "../../kernel/evaluate";
import type { AdapterHost, EngineAdapter, EngineCapabilities, LayerFilter } from "./types";
import { animatedLayers, styleWrites } from "./styleWrites";

/**
 * ROADMAP Phase 58: runs a layer's animation as a Web Animation, so transforms and opacity keep going on the
 * compositor thread while the main thread is busy.
 *
 * The curve is the kernel's, not the browser's: the layer's animation is baked by sampling `evaluate()` once per
 * frame (at most 600 intervals) into linear keyframes. The browser only interpolates between neighbouring frames, so
 * every easing, spring-free curve and clip priority the kernel knows comes out the same (Law 8, one oracle).
 * `seek(t)` maps to `currentTime`; `play` runs at the transport's rate.
 */
export interface WaapiAnimation {
  currentTime: number | string | null | { valueOf(): number };
  playbackRate: number;
  play(): void;
  pause(): void;
  cancel(): void;
  id: string;
}

export interface WaapiElement {
  animate(keyframes: Array<Record<string, string | number>>, options: { duration: number; fill: "both"; easing: "linear"; id?: string }): WaapiAnimation;
}

/** More than this many frames from the transport and a running animation is moved back (a seek, a loop, a rate change). */
const DRIFT_FRAMES = 2;
const MAX_INTERVALS = 600;

const camel = (cssProperty: string) => cssProperty.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

interface Baked {
  element: WaapiElement;
  animation: WaapiAnimation;
}

export class WaapiAdapter implements EngineAdapter {
  readonly id = "waapi";
  readonly capabilities: EngineCapabilities = { scrub: true, deterministic: false, offMainThread: true };

  private host: AdapterHost | null = null;
  private inputs: EvaluateInputs = {};
  private dirty = true;
  private playing = false;
  private rate = 1;
  private time = 0;
  private plannedFor: MotionDocument | null = null;
  private readonly baked = new Map<string, Baked>();

  /** Counts of work done, for tests. */
  stats = { bakes: 0, seeks: 0 };

  /** @param accepts the layers this adapter runs; the default is every animated layer. */
  constructor(private readonly accepts: LayerFilter = () => true) {}

  mount(host: AdapterHost): void {
    this.host = host;
    this.invalidate();
  }

  invalidate(): void {
    this.dirty = true;
  }

  setInputs(inputs: EvaluateInputs): void {
    this.inputs = inputs;
    this.invalidate();
  }

  currentTime(): number | null {
    for (const { animation } of this.baked.values()) {
      const t = Number(animation.currentTime);
      if (Number.isFinite(t)) return t / 1000;
    }
    return null;
  }

  play(time: number, rate: number): void {
    this.playing = true;
    this.rate = rate;
    this.time = time;
    this.rebuildIfNeeded();
    for (const { animation } of this.baked.values()) {
      animation.playbackRate = rate;
      animation.currentTime = time * 1000;
      animation.play();
    }
  }

  pause(time: number): void {
    this.playing = false;
    this.time = time;
    this.rebuildIfNeeded();
    for (const { animation } of this.baked.values()) {
      animation.pause();
      animation.currentTime = time * 1000;
    }
  }

  seek(time: number): void {
    if (!this.host) return;
    this.time = time;
    this.rebuildIfNeeded();
    if (this.playing) {
      // Running on its own clock: only step in when it has wandered from the transport.
      const own = this.currentTime();
      const tolerance = DRIFT_FRAMES / this.host.fps();
      if (own === null || Math.abs(own - time) <= tolerance) return;
      for (const { animation } of this.baked.values()) animation.currentTime = time * 1000;
      this.stats.seeks++;
      return;
    }
    for (const { animation } of this.baked.values()) animation.currentTime = time * 1000;
    this.stats.seeks++;
  }

  dispose(): void {
    this.cancelAll();
    this.host = null;
    this.plannedFor = null;
  }

  private cancelAll(): void {
    for (const { animation } of this.baked.values()) animation.cancel();
    this.baked.clear();
  }

  private rebuildIfNeeded(): void {
    const host = this.host;
    if (!host) return;
    const doc = host.getDocument();
    if (!this.dirty && this.plannedFor === doc) return;
    this.dirty = false;
    this.plannedFor = doc;
    this.cancelAll();
    const duration = host.duration();
    const fps = host.fps();
    if (!(duration > 0) || !(fps > 0)) return;
    const intervals = Math.max(1, Math.min(MAX_INTERVALS, Math.ceil(duration * fps)));
    const compositionId = host.compositionId();
    for (const [layerId, paths] of animatedLayers(doc)) {
      if (!this.accepts(layerId, paths)) continue;
      const element = host.node(layerId) as unknown as WaapiElement | undefined;
      if (!element || typeof element.animate !== "function") continue;
      const keyframes: Array<Record<string, string | number>> = [];
      for (let i = 0; i <= intervals; i++) {
        const writes = styleWrites(paths, evaluate(doc, compositionId, layerId, (i / intervals) * duration, this.inputs));
        const frame: Record<string, string | number> = { offset: i / intervals };
        for (const [property, value] of Object.entries(writes)) frame[camel(property)] = value;
        keyframes.push(frame);
      }
      const animation = element.animate(keyframes, { duration: duration * 1000, fill: "both", easing: "linear", id: `ll:${layerId}` });
      animation.pause();
      animation.currentTime = this.time * 1000;
      if (this.playing) {
        animation.playbackRate = this.rate;
        animation.play();
      }
      this.baked.set(layerId, { element, animation });
      this.stats.bakes++;
    }
  }
}
