import type { MotionDocument } from "../../document/schema";
import type { EvaluateInputs } from "../../kernel/evaluate";

/**
 * ROADMAP Phase 57: what an animation engine can do for the stage. The kernel adapter can do all of it;
 * later adapters (Web Animations in Phase 58) trade some for running off the main thread.
 */
export interface EngineCapabilities {
  /** Can show any time, in any order, on demand (scrubbing). */
  scrub: boolean;
  /** Same document, time and inputs always give the same pixels. */
  deterministic: boolean;
  /** Keeps running when the main thread is busy. */
  offMainThread: boolean;
}

/** What an adapter is given when it mounts: the drawn layers' elements and the document, never React or `postMessage` (Law 9). */
export interface AdapterHost {
  /** The element a layer is drawn into (the `LayerNodeRegistry`). */
  node(layerId: string): Element | undefined;
  getDocument(): MotionDocument;
  /** The composition being played. */
  compositionId(): string;
}

/** The elements an adapter writes to: a `style` it can set and clear. Narrow on purpose, so adapters test without a browser. */
export interface StyledElement {
  style: {
    setProperty(name: string, value: string): void;
    removeProperty(name: string): string;
    getPropertyValue(name: string): string;
  };
}

/**
 * An engine that puts animated values on the stage. The scheduler drives it (the `apply` phase), and it writes
 * through the `LayerNodeRegistry`'s elements. `time` is seconds in the active composition.
 */
export interface EngineAdapter {
  readonly id: string;
  readonly capabilities: EngineCapabilities;
  mount(host: AdapterHost): void;
  /** Playback started (or its speed changed) at `time`. */
  play(time: number, rate: number): void;
  pause(time: number): void;
  /** Show `time`. Called on every scrub, and every frame while playing for engines that need it. */
  seek(time: number): void;
  setInputs(inputs: EvaluateInputs): void;
  /** Something the adapter depends on changed (the document, or a layer's element); drop cached work. */
  invalidate(): void;
  /** Stop writing and put every element back the way React drew it. */
  dispose(): void;
}
