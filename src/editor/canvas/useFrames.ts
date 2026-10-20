"use client";

import { useMemo } from "react";
import { useDocument } from "@/core/store/useDocumentStore";
import { listFrames, type FrameInfo } from "@/core/frames/frames";

export interface CanvasFrame extends FrameInfo {
  /** How many layers sit directly inside the frame (an empty lone frame isn't drawn until it has some). */
  childCount: number;
}

/**
 * The document's frames, left to right. The selector returns a string, so a property edit that doesn't move,
 * resize, rename, add or remove a frame leaves the canvas where it is (no new array, no re-render).
 */
export function useFrames(): CanvasFrame[] {
  const key = useDocument((d) =>
    JSON.stringify(listFrames(d.layers).map((f) => ({ ...f, childCount: d.layers[f.id]?.children.length ?? 0 }))),
  );
  return useMemo(() => JSON.parse(key) as CanvasFrame[], [key]);
}
