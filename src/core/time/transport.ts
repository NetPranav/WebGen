/**
 * ============================================================================
 * TRANSPORT: ONE CLOCK FOR THE WHOLE STUDIO (ROADMAP Phase 54)
 * ============================================================================
 * The single source of "what time is it" for the stage, the timeline and the
 * overlays: time, playing, rate, loop mode, work area, fps and the active
 * composition. An observable store outside React (`subscribeTransport`), so a
 * 60 Hz clock never re-renders a panel; text reads it through
 * `useTransportTime({ maxHz })`.
 *
 * Frame maths is integer-based: a frame is `Math.round(time × fps)` and a
 * frame time is `frame / fps`, so stepping at 24, 30 or 60 fps lands on exact
 * frame times with no accumulated drift. Playback advances through `tick(dt)`
 * (called by the frame scheduler, Phase 55); nothing here owns a timer.
 * ============================================================================
 */

import { createStore } from "zustand/vanilla";

export const LOOP_MODES = ["off", "loop", "ping-pong"] as const;
export type LoopMode = (typeof LOOP_MODES)[number];

/** Playback speeds the J / L keys step through (NLE-style shuttle ladder). */
export const SHUTTLE_RATES = [-8, -4, -2, -1, 1, 2, 4, 8] as const;

export interface WorkArea {
  start: number;
  end: number;
}

export interface TransportState {
  /** The composition being played (`comp_main` unless the timeline opens another). */
  compositionId: string;
  fps: number;
  /** Seconds. */
  duration: number;
  workArea: WorkArea;
  /** Seconds, within [0, duration]. */
  time: number;
  playing: boolean;
  /** Signed speed multiplier; negative plays backwards. */
  rate: number;
  loop: LoopMode;
  /** Ping-pong only: which way the head is currently travelling (1 forward, -1 back). */
  direction: 1 | -1;
}

export const DEFAULT_TRANSPORT: TransportState = {
  compositionId: "comp_main",
  fps: 60,
  duration: 5,
  workArea: { start: 0, end: 5 },
  time: 0,
  playing: false,
  rate: 1,
  loop: "off",
  direction: 1,
};

// ---------------------------------------------------------------------------
// Pure frame and time maths
// ---------------------------------------------------------------------------

export const timeToFrame = (time: number, fps: number): number => Math.round(time * fps);
export const frameToTime = (frame: number, fps: number): number => frame / fps;
export const snapToFrame = (time: number, fps: number): number => frameToTime(timeToFrame(time, fps), fps);

/** Clamps into [lo, hi]. A non-finite `n` (NaN, +-Infinity) becomes `fallback`: NaN would otherwise pass straight through Math.min / Math.max and poison the playhead. */
const clamp = (n: number, lo: number, hi: number, fallback = lo) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : Math.min(hi, Math.max(lo, fallback)));

/** The fastest speed `setRate` accepts, either way. */
export const MAX_RATE = 16;

/** `MM:SS:FF`, the timecode the transport bar shows (frames count from 0 within the second). */
export function formatTimecode(time: number, fps: number): string {
  // Frame numbers are whole, so a fractional rate (29.97, 23.976) counts frames within a second at its nominal whole rate
  // (30, 24), like drop-frame-free timecode does, instead of printing `0.030000000000001137`.
  const nominal = Math.max(1, Math.round(Number.isFinite(fps) ? fps : 1));
  const total = Math.max(0, Number.isFinite(time) ? timeToFrame(time, fps) : 0);
  const frames = total % nominal;
  const seconds = Math.floor(total / nominal) % 60;
  const minutes = Math.floor(total / nominal / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/**
 * Where the head is after `dt` seconds of wall time. Pure: the same state and
 * `dt` always give the same result. With loop off the head stops at the work
 * area's end (or start, playing backwards); with `loop` it wraps; with
 * `ping-pong` it reflects, however large `dt` is.
 */
export function advance(state: TransportState, dt: number): Pick<TransportState, "time" | "playing" | "direction"> {
  if (!state.playing) return { time: state.time, playing: false, direction: state.direction };
  if (!Number.isFinite(dt) || dt <= 0) return { time: state.time, playing: state.playing, direction: state.direction };
  const { start, end } = state.workArea;
  const length = end - start;
  const step = dt * state.rate;

  if (state.loop === "off" || length <= 0) {
    const next = state.time + step;
    if (next >= end && step > 0) return { time: end, playing: false, direction: state.direction };
    if (next <= start && step < 0) return { time: start, playing: false, direction: state.direction };
    return { time: next, playing: true, direction: state.direction };
  }

  if (state.loop === "loop") {
    const offset = state.time - start + step;
    return { time: start + (((offset % length) + length) % length), playing: true, direction: state.direction };
  }

  // Ping-pong: unfold the head onto a line of period 2 × length, move it, fold it back.
  const here = clamp(state.time - start, 0, length);
  const unfolded = (state.direction === 1 ? here : 2 * length - here) + step;
  const folded = ((unfolded % (2 * length)) + 2 * length) % (2 * length);
  return folded < length
    ? { time: start + folded, playing: true, direction: 1 }
    : { time: start + 2 * length - folded, playing: true, direction: -1 };
}

/** The next rate up (`dir` 1) or down (-1) the J / K / L ladder, or 0 for "stopped". */
export function shuttleRate(current: number, playing: boolean, dir: 1 | -1): number {
  if (!playing) return dir;
  const index = SHUTTLE_RATES.indexOf(current as (typeof SHUTTLE_RATES)[number]);
  if (index === -1) return dir;
  const next = index + dir;
  // Slowing past ±1 stops (the ladder has no 0 rung, so J at 1x pauses rather than jumping to -1x).
  if (SHUTTLE_RATES[index] === 1 && dir === -1) return 0;
  if (SHUTTLE_RATES[index] === -1 && dir === 1) return 0;
  return SHUTTLE_RATES[clamp(next, 0, SHUTTLE_RATES.length - 1)];
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

export const transportStore = createStore<TransportState>(() => ({ ...DEFAULT_TRANSPORT, workArea: { ...DEFAULT_TRANSPORT.workArea } }));

export const getTransport = (): TransportState => transportStore.getState();
export const subscribeTransport = (listener: (state: TransportState, prev: TransportState) => void): (() => void) => transportStore.subscribe(listener);
const patch = (next: Partial<TransportState>) => transportStore.setState(next);

export const transport = {
  /** Points the transport at a composition. Time, work area and rate are kept inside the new bounds. */
  setComposition(composition: { id: string; fps: number; duration: number; workArea?: WorkArea }): void {
    // A frame rate or length that isn't a positive finite number would divide by zero or poison the playhead: refuse it.
    if (!(Number.isFinite(composition.fps) && composition.fps > 0 && Number.isFinite(composition.duration) && composition.duration >= 0)) return;
    const { fps, duration } = composition;
    const workArea = composition.workArea ?? { start: 0, end: duration };
    // an inverted work area (start after end) is put the right way round; one frame is the shortest it can be
    const a = clamp(workArea.start, 0, duration);
    const b = clamp(workArea.end, 0, duration, duration);
    const wa = a <= b ? { start: a, end: b } : { start: b, end: a };
    const switching = composition.id !== getTransport().compositionId;
    patch({
      compositionId: composition.id,
      fps,
      duration,
      workArea: wa,
      time: switching ? 0 : clamp(getTransport().time, 0, duration),
      ...(switching ? { playing: false, direction: 1 as const } : {}),
    });
  },

  /** Plays from the head. At the end of a one-shot, replays from the start (or from the end when reversed). */
  play(): void {
    const s = getTransport();
    const rate = s.rate === 0 ? 1 : s.rate;
    let time = s.time;
    if (s.loop === "off") {
      if (rate > 0 && time >= s.workArea.end) time = s.workArea.start;
      if (rate < 0 && time <= s.workArea.start) time = s.workArea.end;
    }
    patch({ playing: true, rate, time });
  },

  pause(): void {
    patch({ playing: false });
  },

  togglePlay(): void {
    if (getTransport().playing) transport.pause();
    else transport.play();
  },

  /** Stops, returns to the work area's start and resets the rate (the "stop" button). */
  stop(): void {
    patch({ playing: false, time: getTransport().workArea.start, rate: 1, direction: 1 });
  },

  /** Moves the head to `time` seconds (clamped to the composition). Does not change play state. */
  seek(time: number): void {
    if (Number.isNaN(time)) return;
    const s = getTransport();
    patch({ time: clamp(time, 0, s.duration, time > 0 ? s.duration : 0) }); // +-Infinity go to the end / the start
  },

  /** Moves the head to an exact frame. */
  seekFrame(frame: number): void {
    transport.seek(frameToTime(frame, getTransport().fps));
  },

  /** Steps whole frames (negative steps back) from the nearest frame, pausing playback. */
  stepFrame(frames = 1): void {
    const s = getTransport();
    if (!Number.isFinite(frames)) return;
    const frame = timeToFrame(s.time, s.fps) + Math.trunc(frames);
    patch({ playing: false, time: clamp(frameToTime(frame, s.fps), 0, s.duration) });
  },

  /** J (reverse) and L (forward): each press moves one rung along the shuttle ladder; slowing past 1x stops. */
  shuttle(dir: "reverse" | "forward"): void {
    const s = getTransport();
    const d = dir === "forward" ? 1 : -1;
    const rate = shuttleRate(s.rate, s.playing, d);
    if (rate === 0) {
      patch({ playing: false, rate: 1 });
      return;
    }
    patch({ rate });
    transport.play();
  },

  /** K: stop shuttling and reset the speed to 1x. */
  stopShuttle(): void {
    patch({ playing: false, rate: 1 });
  },

  setRate(rate: number): void {
    if (Number.isFinite(rate) && rate !== 0) patch({ rate: Math.max(-MAX_RATE, Math.min(MAX_RATE, rate)) });
  },

  setLoop(loop: LoopMode): void {
    patch({ loop, direction: 1 });
  },

  cycleLoop(): void {
    const next = LOOP_MODES[(LOOP_MODES.indexOf(getTransport().loop) + 1) % LOOP_MODES.length];
    transport.setLoop(next);
  },

  /** Sets the loop / render range. Kept inside the composition and at least one frame long. */
  setWorkArea(workArea: WorkArea): void {
    const s = getTransport();
    if (Number.isNaN(workArea.start) || Number.isNaN(workArea.end)) return;
    const minLength = 1 / s.fps;
    const start = clamp(workArea.start, 0, Math.max(0, s.duration - minLength), workArea.start > 0 ? s.duration : 0);
    const end = clamp(workArea.end, start + minLength, s.duration, workArea.end > 0 ? s.duration : start + minLength);
    patch({ workArea: { start, end } });
  },

  /** Advances playback by `dt` wall-clock seconds. The frame scheduler (Phase 55) is the only caller. */
  tick(dt: number): void {
    const s = getTransport();
    if (!s.playing || !(dt > 0)) return;
    patch(advance(s, dt));
  },

  /** Back to defaults (tests, project close). */
  reset(): void {
    transportStore.setState({ ...DEFAULT_TRANSPORT, workArea: { ...DEFAULT_TRANSPORT.workArea } });
  },
};
