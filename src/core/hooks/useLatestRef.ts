"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * A ref that always holds the latest `value`, for listeners and callbacks that must
 * not re-subscribe on every render. Updated after commit, never during render.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
