/**
 * ============================================================================
 * FRAME SCHEDULER: ONE requestAnimationFrame LOOP (ROADMAP Phase 55)
 * ============================================================================
 * Everything that has to happen once per frame registers a task in one of six
 * ordered phases, and a single `requestAnimationFrame` loop runs them:
 *
 *   input → evaluate → apply → render → overlay → stats
 *
 * `evaluate` is where the transport advances and the kernel samples; `apply`
 * writes values to the stage; `render` and `overlay` draw. Tasks in a phase run
 * in registration order; a throwing task is reported and skipped, never allowed
 * to stop the frame. The loop runs only while a task is registered.
 *
 * Deterministic mode (the Phase 4 test clock, the render queue in Phase 100)
 * stops the loop: time then advances only through `step(dt)`, one frame per
 * call, on a virtual clock. Same calls, same frames.
 *
 * Lint bans `requestAnimationFrame` outside `src/core/time/**` (see
 * `eslint.config.mjs`); this file is where a frame is requested.
 * ============================================================================
 */

export const FRAME_PHASES = ["input", "evaluate", "apply", "render", "overlay", "stats"] as const;
export type FramePhase = (typeof FRAME_PHASES)[number];

export interface FrameInfo {
  /** Timestamp of this frame, in milliseconds. Virtual in deterministic mode. */
  now: number;
  /** Seconds since the previous frame. 0 on the first frame, and never negative or past `MAX_FRAME_GAP`. */
  dt: number;
  /** Frames run so far, counting this one from 1. */
  frame: number;
}

export type FrameTask = (frame: FrameInfo) => void;

/** A tab that was hidden, or a clock that was swapped, must not make time jump by the whole gap. */
export const MAX_FRAME_GAP = 0.25;

export interface SchedulerEnvironment {
  now: () => number;
  request: (callback: (now: number) => void) => number;
  cancel: (handle: number) => void;
}

export interface SchedulerStats {
  frames: number;
  /** Smoothed frames per second, from the real gap between frames. 0 until two frames have run. */
  fps: number;
  taskErrors: number;
  running: boolean;
  deterministic: boolean;
}

const browserEnvironment = (): SchedulerEnvironment | null =>
  typeof window === "undefined" || typeof requestAnimationFrame !== "function"
    ? null
    : { now: () => performance.now(), request: (cb) => requestAnimationFrame(cb), cancel: (h) => cancelAnimationFrame(h) };

export class FrameScheduler {
  private readonly tasks: Record<FramePhase, FrameTask[]> = { input: [], evaluate: [], apply: [], render: [], overlay: [], stats: [] };
  private handle: number | null = null;
  private last: number | null = null;
  private frames = 0;
  private fps = 0;
  private taskErrors = 0;
  private deterministicOn = false;
  private virtualNow = 0;

  constructor(private readonly env: SchedulerEnvironment | null = browserEnvironment()) {}

  /** Runs `task` once per frame in `phase`. Returns the unregister function. Starts the loop if it was idle. */
  register(phase: FramePhase, task: FrameTask): () => void {
    this.tasks[phase] = [...this.tasks[phase], task];
    this.ensureRunning();
    return () => {
      const list = this.tasks[phase];
      const i = list.indexOf(task);
      if (i !== -1) this.tasks[phase] = list.filter((_, j) => j !== i);
      if (this.taskCount() === 0) this.halt();
    };
  }

  /**
   * Deterministic mode: the loop stops and frames run only through `step`.
   * Turning it off resumes real frames; the first one has `dt` 0.
   */
  setDeterministic(on: boolean, startNow = 0): void {
    if (on === this.deterministicOn) return;
    this.deterministicOn = on;
    this.last = null;
    if (on) {
      this.virtualNow = startNow;
      this.halt();
    } else {
      this.ensureRunning();
    }
  }

  /**
   * Drops any pending frame request and asks again. Cheap, and safe to call
   * whenever work starts (playback). It recovers a loop whose request was lost
   * when the page's frame source was replaced, as a test clock does mid-session.
   */
  wake(): void {
    this.halt();
    this.ensureRunning();
  }

  /** Runs exactly one frame, `dt` seconds after the previous one, on the virtual clock. Deterministic mode only. */
  step(dt: number): FrameInfo {
    if (!this.deterministicOn) throw new Error("FrameScheduler.step needs deterministic mode (setDeterministic(true)).");
    this.virtualNow += dt * 1000;
    return this.runFrame(this.virtualNow, dt);
  }

  get stats(): SchedulerStats {
    return { frames: this.frames, fps: this.fps, taskErrors: this.taskErrors, running: this.handle !== null, deterministic: this.deterministicOn };
  }

  private taskCount(): number {
    return FRAME_PHASES.reduce((n, phase) => n + this.tasks[phase].length, 0);
  }

  private ensureRunning(): void {
    if (this.deterministicOn || this.handle !== null || !this.env || this.taskCount() === 0) return;
    this.handle = this.env.request(this.onFrame);
  }

  private halt(): void {
    if (this.handle !== null) this.env?.cancel(this.handle);
    this.handle = null;
    this.last = null;
  }

  private readonly onFrame = (now: number): void => {
    this.handle = null;
    if (this.deterministicOn) return;
    // A clock that went backwards (a test clock replacing the real one) re-baselines instead of producing a negative dt.
    const dt = this.last === null ? 0 : Math.min(Math.max((now - this.last) / 1000, 0), MAX_FRAME_GAP);
    if (dt > 0) this.fps = this.fps === 0 ? 1 / dt : this.fps * 0.9 + (1 / dt) * 0.1;
    this.last = now;
    this.runFrame(now, dt);
    this.ensureRunning();
  };

  private runFrame(now: number, dt: number): FrameInfo {
    const info: FrameInfo = { now, dt, frame: ++this.frames };
    for (const phase of FRAME_PHASES) {
      // Tasks registered during this frame start next frame; ones removed during it still finish it.
      for (const task of this.tasks[phase]) {
        try {
          task(info);
        } catch (error) {
          this.taskErrors++;
          console.error(`[frame-scheduler] a ${phase} task threw:`, error);
        }
      }
    }
    return info;
  }
}

/** The studio's scheduler. Tests make their own with `new FrameScheduler(env)`. */
export const frameScheduler = new FrameScheduler();
