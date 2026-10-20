import { createStore } from "zustand/vanilla";
import type { MotionDocument } from "../../document/schema";
import { evaluate } from "../../kernel/evaluate";
import type { FrameScheduler } from "../../time/scheduler";
import { styleWrites } from "./styleWrites";
import type { RunningLayer } from "./WaapiAdapter";

/**
 * ============================================================================
 * PARITY MONITOR (ROADMAP Phase 60)
 * ============================================================================
 * Every N frames while playing, compares what each running engine is showing with what `evaluate()` says it should
 * show at the engine's own clock, and raises `[PARITY_DRIFT]` when they differ by more than a tolerance. The kernel is
 * the oracle (Law 8); an engine that disagrees with it is a bug, and this is where it shows up.
 *
 * (The comparison allows the engine's clock and its reported style to differ by a frame or two: see `SKEW_FRAMES`.) It also checks that an engine's clock stays near the transport's. Colours and `%` lengths aren't compared yet (the
 * browser reports them in another form); numbers, lengths and the transform are.
 * ============================================================================
 */

export interface ParityDrift {
  layerId: string;
  /** The CSS property, or `clock` for an engine whose own time has wandered from the transport's. */
  property: string;
  expected: string;
  actual: string;
}

export interface ParityState {
  /** `idle`: nothing is running on an engine of its own (paused, or only the kernel is drawing). */
  status: "idle" | "ok" | "drift";
  /** Layers compared in the last sample. */
  checked: number;
  samples: number;
  drifts: ParityDrift[];
}

export const parityStore = createStore<ParityState>(() => ({ status: "idle", checked: 0, samples: 0, drifts: [] }));

/** Dev builds, or a test or `?parity=1` session; the monitor and its badge are off in production. */
export function parityEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV !== "production") return true;
  if ((window as unknown as { __LL_TEST__?: boolean }).__LL_TEST__) return true;
  try {
    return new URLSearchParams(window.location.search).get("parity") === "1";
  } catch {
    return false;
  }
}

/** px for lengths, plain units for opacity; the transform has its own tolerances below. */
export const TOLERANCE = { length: 0.5, number: 0.01, translation: 0.5, matrix: 0.005 };
/** An engine whose clock is further than this from the transport's is reported (after two samples in a row). */
export const CLOCK_DRIFT_FRAMES = 6;
/**
 * The engine's own clock and the style the browser reports can differ by a frame or two (WebKit reports the value of
 * the last rendered frame while the animation's clock is live). An engine is in step if what it shows lies within
 * what the kernel says over this many frames either side of its clock.
 */
export const SKEW_FRAMES = 2;

export type MatrixParser = (css: string) => number[] | null;

export function domMatrix(css: string): number[] | null {
  if (typeof DOMMatrix === "undefined") return null;
  try {
    const m = new DOMMatrix(css === "none" ? "" : css);
    return [m.m11, m.m12, m.m13, m.m14, m.m21, m.m22, m.m23, m.m24, m.m31, m.m32, m.m33, m.m34, m.m41, m.m42, m.m43, m.m44];
  } catch {
    return null;
  }
}

/** True when `actual` is what `expected` says, for one CSS property. Values it can't compare count as equal. */
export function sameValue(property: string, expected: string, actual: string, parseMatrix: MatrixParser = domMatrix): boolean {
  if (property === "transform") {
    const a = parseMatrix(expected);
    const b = parseMatrix(actual);
    if (!a || !b) return true;
    return a.every((v, i) => Math.abs(v - b[i]) <= (i >= 12 && i <= 14 ? TOLERANCE.translation : TOLERANCE.matrix));
  }
  if (expected.trim().endsWith("%")) return true;
  const e = Number.parseFloat(expected);
  const a = Number.parseFloat(actual);
  if (!Number.isFinite(e) || !Number.isFinite(a)) return true;
  return Math.abs(e - a) <= (property === "opacity" ? TOLERANCE.number : TOLERANCE.length);
}

/**
 * True when `actual` lies within the band the kernel's values span (`candidates`, each a CSS value for the same
 * property, taken at nearby times), widened by the tolerance. One candidate is the plain comparison of `sameValue`.
 */
export function inBand(property: string, candidates: readonly string[], actual: string, parseMatrix: MatrixParser = domMatrix): boolean {
  if (candidates.length === 0) return true;
  if (property === "transform") {
    const matrices = candidates.map((c) => parseMatrix(c));
    const b = parseMatrix(actual);
    if (!b || matrices.some((m) => !m)) return true;
    return b.every((v, i) => {
      const values = matrices.map((m) => m![i]);
      const tol = i >= 12 && i <= 14 ? TOLERANCE.translation : TOLERANCE.matrix;
      return v >= Math.min(...values) - tol && v <= Math.max(...values) + tol;
    });
  }
  if (candidates[0].trim().endsWith("%")) return true;
  const numbers = candidates.map((c) => Number.parseFloat(c));
  const a = Number.parseFloat(actual);
  if (!Number.isFinite(a) || numbers.some((n) => !Number.isFinite(n))) return true;
  const tol = property === "opacity" ? TOLERANCE.number : TOLERANCE.length;
  return a >= Math.min(...numbers) - tol && a <= Math.max(...numbers) + tol;
}

export interface ParityEnv {
  scheduler: FrameScheduler;
  getDocument(): MotionDocument;
  compositionId(): string;
  fps(): number;
  transportTime(): number;
  isPlaying(): boolean;
  running(): RunningLayer[];
  /** The value the browser reports for `property` on `element`. */
  read(element: Element, property: string): string;
  /** Sample once every this many frames. */
  every?: number;
  parseMatrix?: MatrixParser;
  warn?(message: string): void;
}

export class ParityMonitor {
  private frames = 0;
  private readonly reported = new Set<string>();
  private clockLate = new Set<string>();

  constructor(private readonly env: ParityEnv) {}

  install(): () => void {
    const every = this.env.every ?? 30;
    const off = this.env.scheduler.register("stats", () => {
      if (++this.frames % every === 0) this.sample();
    });
    return () => {
      off();
      parityStore.setState({ status: "idle", checked: 0, samples: 0, drifts: [] });
    };
  }

  /** One comparison of every running layer with the kernel. Public so a test can drive it. */
  sample(): ParityState {
    const { env } = this;
    const previous = parityStore.getState();
    const running = env.isPlaying() ? env.running() : [];
    if (running.length === 0) {
      this.reported.clear();
      this.clockLate.clear();
      const idle: ParityState = { status: "idle", checked: 0, samples: previous.samples + 1, drifts: [] };
      parityStore.setState(idle);
      return idle;
    }
    const doc = env.getDocument();
    const compositionId = env.compositionId();
    const drifts: ParityDrift[] = [];
    const clockLimit = CLOCK_DRIFT_FRAMES / env.fps();
    const stillLate = new Set<string>();
    for (const layer of running) {
      const skew = SKEW_FRAMES / env.fps();
      const at = (t: number) => styleWrites(layer.paths, evaluate(doc, compositionId, layer.layerId, Math.max(0, t)));
      const [expected, before, after] = [at(layer.time), at(layer.time - skew), at(layer.time + skew)];
      for (const [property, want] of Object.entries(expected)) {
        const got = env.read(layer.element, property);
        const band = [want, before[property], after[property]].filter((v): v is string => v !== undefined);
        if (!inBand(property, band, got, env.parseMatrix)) drifts.push({ layerId: layer.layerId, property, expected: want, actual: got });
      }
      const behind = Math.abs(layer.time - env.transportTime());
      if (behind > clockLimit) {
        stillLate.add(layer.layerId);
        if (this.clockLate.has(layer.layerId)) {
          drifts.push({ layerId: layer.layerId, property: "clock", expected: `${env.transportTime().toFixed(3)}s (transport)`, actual: `${layer.time.toFixed(3)}s (engine)` });
        }
      }
    }
    this.clockLate = stillLate;
    const keys = new Set(drifts.map((d) => `${d.layerId}:${d.property}`));
    for (const key of Array.from(this.reported)) if (!keys.has(key)) this.reported.delete(key);
    for (const d of drifts) {
      const key = `${d.layerId}:${d.property}`;
      if (this.reported.has(key)) continue;
      this.reported.add(key);
      (env.warn ?? ((m: string) => console.warn(m)))(`[PARITY_DRIFT] layer ${d.layerId}, ${d.property}: the engine shows ${d.actual}, evaluate() says ${d.expected}`);
    }
    const next: ParityState = { status: drifts.length > 0 ? "drift" : "ok", checked: running.length, samples: previous.samples + 1, drifts };
    parityStore.setState(next);
    return next;
  }
}
