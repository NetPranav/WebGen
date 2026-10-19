"use client";

import { frameScheduler, type FrameScheduler } from "./scheduler";
import { subscribeTransport, transport } from "./transport";

/**
 * Advances the transport once per frame, in the scheduler's `evaluate` phase,
 * so the head moves before anything samples or draws. Starting playback wakes
 * the scheduler, so a frame request lost to a swapped-in test clock cannot
 * leave playback stuck. Returns the unregister function.
 */
export function installTransportDriver(scheduler: FrameScheduler = frameScheduler): () => void {
  const unregister = scheduler.register("evaluate", ({ dt }) => transport.tick(dt));
  const unsubscribe = subscribeTransport((state, prev) => {
    if (state.playing && !prev.playing) scheduler.wake();
  });
  return () => {
    unsubscribe();
    unregister();
  };
}
