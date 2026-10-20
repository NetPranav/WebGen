/**
 * Ruler tick marks (ROADMAP Phase 28): which positions get a mark and a label for a given zoom, as a pure function.
 * Positions are in the ruler's own units (canvas px relative to the active frame's top-left).
 */

export interface Tick {
  /** Position in ruler units. */
  value: number;
  /** A labelled tick (longer), as opposed to a minor one. */
  major: boolean;
}

const NICE = [1, 2, 5];

/** The smallest "nice" step (1, 2, 5, 10, 20, 50, ...) that is at least `minScreenPx` wide on screen. */
export function niceStep(zoom: number, minScreenPx = 64): number {
  const target = minScreenPx / zoom;
  let mag = 1;
  while (mag * 5 < target) mag *= 10;
  while (mag > 1 && mag / 10 >= target) mag /= 10;
  for (const n of NICE) if (n * mag >= target) return n * mag;
  return 10 * mag;
}

/** The ticks visible between `from` and `to` (ruler units), five minor ticks to a major one. */
export function ticks(from: number, to: number, zoom: number): Tick[] {
  const major = niceStep(zoom);
  const minor = major / 5;
  const out: Tick[] = [];
  const first = Math.floor(from / minor) * minor;
  for (let v = first; v <= to + 1e-9; v += minor) {
    const value = Math.round(v * 1000) / 1000;
    out.push({ value, major: Math.abs(value / major - Math.round(value / major)) < 1e-6 });
  }
  return out;
}
