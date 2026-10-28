import { createStore } from "zustand/vanilla";
import type { Clip } from "../document/motion";
import type { MotionDocument } from "../document/schema";
import { advanceTriggered, initialTriggered, pinOffset, resolveRange, scrubSmoothing, smoothProgress, triggeredTime, viewProgress, type ElementBox, type TriggeredState } from "./model";

/**
 * ============================================================================
 * SCROLL DRIVER (ROADMAP Phase 81)
 * ============================================================================
 * The scheduler-driven path: each frame it reads where the frame is scrolled and where each scroll-driven layer sits,
 * works out every such clip's time (scrubbed clips follow view progress, with smoothing; triggered clips play once
 * when entered) and hands the result to the kernel as `scrollClipTime`. It also pins layers. It holds no
 * animation of its own, so what it shows is always `evaluate()`.
 *
 * This is the fallback path that works in every browser. Native CSS scroll-driven animations (a `ViewTimeline`) are
 * not used yet.
 * ============================================================================
 */

/** What the driver needs from the stage: the frame's scroll, the layers' layout and a way to pin. Narrow, so it is tested without a browser. */
export interface ScrollHost {
  /** Scroll position and viewport height of the frame, in px; null when there is no frame to scroll. */
  metrics(): { scrollY: number; viewportHeight: number } | null;
  /** A layer's layout box in document px, ignoring transforms (so an animation of the layer can't move its own range); null when it isn't drawn. */
  box(layerId: string): ElementBox | null;
  /** Holds a layer `px` down from where it is laid out (cancelling scroll), or null to put it back. */
  setPin(layerId: string, px: number | null): void;
  getDocument(): MotionDocument;
}

/** Triggers that make a clip scroll-driven. */
const SCROLL_TRIGGERS = new Set<Clip["trigger"]>(["scrollProgress", "inView"]);

export const isScrollClip = (clip: Pick<Clip, "trigger" | "enabled">): boolean => clip.enabled && SCROLL_TRIGGERS.has(clip.trigger);

/** The scroll-driven clips of a document. */
export function scrollClips(doc: MotionDocument): Clip[] {
  return Object.values(doc.clips).filter(isScrollClip);
}

/** The view progress of each layer that has a scroll clip, and the page's scroll, for the timeline (Phase 82's scroll scrubber reads it). */
export interface ScrollState {
  scrollY: number;
  viewportHeight: number;
  /** Layer id → how far through its range the page is, 0 to 1. */
  progress: Record<string, number>;
}
export const scrollStore = createStore<ScrollState>(() => ({ scrollY: 0, viewportHeight: 0, progress: {} }));

export interface ScrollFrame {
  /** Frame clock, milliseconds. */
  now: number;
  /** Seconds since the previous frame. */
  dt: number;
}

export interface ScrollUpdate {
  /** Clip id → clip-local seconds. Empty when nothing is scroll-driven. */
  clipTime: Record<string, number>;
  /** Layers with a scroll clip (they must be drawn by the kernel, not handed to a Web Animation). */
  layers: ReadonlySet<string>;
  /** The times or the layers changed since the last update. */
  changed: boolean;
}

export class ScrollDriver {
  private readonly scrubbed = new Map<string, number>();
  private readonly triggered = new Map<string, TriggeredState>();
  private readonly pinned = new Map<string, number>();
  private last: Record<string, number> = {};
  private lastLayers = new Set<string>();
  private cachedFor: MotionDocument | null = null;
  private clips: Clip[] = [];

  constructor(private readonly host: ScrollHost) {}

  /** Looks at the page once. Call every frame while scroll is live. */
  update(frame: ScrollFrame): ScrollUpdate {
    const doc = this.host.getDocument();
    if (this.cachedFor !== doc) {
      this.clips = scrollClips(doc);
      this.cachedFor = doc;
    }
    const metrics = this.host.metrics();
    const clipTime: Record<string, number> = {};
    const layers = new Set<string>();
    const progressByLayer: Record<string, number> = {};
    const stillPinned = new Set<string>();

    for (const clip of this.clips) {
      layers.add(clip.layerId);
      if (!metrics) {
        clipTime[clip.id] = 0;
        continue;
      }
      const box = this.host.box(clip.layerId);
      if (!box) {
        clipTime[clip.id] = this.last[clip.id] ?? 0;
        continue;
      }
      const config = clip.scrollTrigger;
      const range = resolveRange(box, metrics.viewportHeight, config?.start, config?.end);
      const progress = viewProgress(metrics.scrollY, range);
      progressByLayer[clip.layerId] = progress;

      if (config?.scrub) {
        const shown = smoothProgress(this.scrubbed.get(clip.id) ?? progress, progress, frame.dt, scrubSmoothing(config.scrub));
        this.scrubbed.set(clip.id, shown);
        clipTime[clip.id] = shown * clip.duration;
      } else {
        const next = advanceTriggered(this.triggered.get(clip.id) ?? initialTriggered(), progress, frame.now, clip.duration * 1000);
        this.triggered.set(clip.id, next);
        clipTime[clip.id] = triggeredTime(next, frame.now, clip.duration, clip.delay ?? 0);
      }

      if (config?.pin) {
        const offset = pinOffset(metrics.scrollY, range);
        stillPinned.add(clip.layerId);
        if (this.pinned.get(clip.layerId) !== offset) {
          this.pinned.set(clip.layerId, offset);
          this.host.setPin(clip.layerId, offset);
        }
      }
    }

    for (const layerId of Array.from(this.pinned.keys())) {
      if (stillPinned.has(layerId)) continue;
      this.pinned.delete(layerId);
      this.host.setPin(layerId, null);
    }
    for (const id of Array.from(this.scrubbed.keys())) if (!this.clips.some((c) => c.id === id)) this.scrubbed.delete(id);
    for (const id of Array.from(this.triggered.keys())) if (!this.clips.some((c) => c.id === id)) this.triggered.delete(id);

    if (metrics) this.publish(metrics.scrollY, metrics.viewportHeight, progressByLayer);

    const changed = !sameTimes(this.last, clipTime) || !sameSet(this.lastLayers, layers);
    this.last = clipTime;
    this.lastLayers = layers;
    return { clipTime, layers, changed };
  }

  /** Forgets everything and puts pinned layers back (Preview was left, or the stage went away). */
  reset(): ScrollUpdate {
    for (const layerId of Array.from(this.pinned.keys())) this.host.setPin(layerId, null);
    this.pinned.clear();
    this.scrubbed.clear();
    this.triggered.clear();
    const changed = Object.keys(this.last).length > 0 || this.lastLayers.size > 0;
    this.last = {};
    this.lastLayers = new Set();
    this.cachedFor = null;
    scrollStore.setState({ scrollY: 0, viewportHeight: 0, progress: {} });
    return { clipTime: {}, layers: new Set(), changed };
  }

  private publish(scrollY: number, viewportHeight: number, progress: Record<string, number>): void {
    const old = scrollStore.getState();
    const same = old.scrollY === scrollY && old.viewportHeight === viewportHeight && sameTimes(old.progress, progress);
    if (!same) scrollStore.setState({ scrollY, viewportHeight, progress });
  }
}

function sameTimes(a: Record<string, number>, b: Record<string, number>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
