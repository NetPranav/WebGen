"use client";

import { getTransport, transport } from "./transport";

/** A tab that was hidden for a while must not make the head jump by the whole gap. */
const MAX_FRAME_GAP = 0.25;

/**
 * The transport's only driver until the frame scheduler lands (Phase 55): one
 * `requestAnimationFrame` loop that calls `transport.tick` while playing.
 * Phase 55 moves this onto the scheduler's `evaluate` phase and deletes it.
 * Returns the stop function.
 */
export function startTransportClock(): () => void {
  let frame = 0;
  let last: number | null = null;
  const loop = (now: number) => {
    if (getTransport().playing) {
      if (last !== null) transport.tick(Math.min((now - last) / 1000, MAX_FRAME_GAP));
      last = now;
    } else {
      last = null;
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
}
