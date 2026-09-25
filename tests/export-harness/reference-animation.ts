/**
 * ROADMAP Phase 4.3 — the reference animation the pixel-parity harness
 * checks. Linear easing on purpose: the "oracle" render (`parity.mjs`)
 * computes `lerp(from, to, t)` directly in the test, independent of GSAP, so
 * a mismatch can only come from the exported code (or a corrupted oracle),
 * never from two implementations of the same easing curve disagreeing.
 */
import type { AnimationSample } from "@/core/types/animations";

export const referenceAnimation: AnimationSample = {
  id: "anim_export_harness_reveal",
  name: "ExportHarnessReveal",
  duration: 800,
  easing: "linear",
  iterations: 1,
  direction: "normal",
  fillMode: "forwards",
  tracks: [
    {
      trackId: "opacity",
      keyframes: [
        { offset: 0, value: 0 },
        { offset: 100, value: 1 },
      ],
    },
    {
      trackId: "translateX",
      keyframes: [
        { offset: 0, value: 0 },
        { offset: 100, value: 120 },
      ],
    },
  ],
};

/** Fractions of `duration` the parity harness samples, per the Phase 4.3 spec. */
export const SAMPLE_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;

/** The independent oracle: what track `trackId` should read at time fraction `t` (linear). */
export function oracleValueAt(trackId: "opacity" | "translateX", t: number): number {
  const track = referenceAnimation.tracks.find((tr) => tr.trackId === trackId)!;
  const from = Number(track.keyframes[0].value);
  const to = Number(track.keyframes[track.keyframes.length - 1].value);
  return from + (to - from) * Math.max(0, Math.min(1, t));
}
