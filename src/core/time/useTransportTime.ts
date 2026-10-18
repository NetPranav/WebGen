"use client";

import { useEffect, useState } from "react";
import { getTransport, subscribeTransport } from "./transport";

export interface UseTransportTimeOptions {
  /** Most renders per second. Text readouts need far less than the 60 Hz the clock runs at. Default 10. */
  maxHz?: number;
}

/**
 * The transport's time for a component that only displays it. Re-renders at
 * most `maxHz` times a second (with a trailing update, so a paused head always
 * shows its final value); anything that needs every frame subscribes with
 * `subscribeTransport` instead and writes to the DOM directly.
 */
export function useTransportTime({ maxHz = 10 }: UseTransportTimeOptions = {}): number {
  const [time, setTime] = useState(() => getTransport().time);

  useEffect(() => {
    const interval = 1000 / maxHz;
    let last = 0;
    let trailing: ReturnType<typeof setTimeout> | undefined;
    const publish = () => {
      last = performance.now();
      trailing = undefined;
      setTime(getTransport().time);
    };
    publish();
    const unsubscribe = subscribeTransport((state, prev) => {
      if (state.time === prev.time) return;
      const elapsed = performance.now() - last;
      // A clock that went backwards (a test clock replacing the real one) publishes at once instead of waiting out a phantom gap.
      const wait = elapsed < 0 ? 0 : interval - elapsed;
      if (wait <= 0) publish();
      else trailing ??= setTimeout(publish, wait);
    });
    return () => {
      unsubscribe();
      if (trailing !== undefined) clearTimeout(trailing);
    };
  }, [maxHz]);

  return time;
}
