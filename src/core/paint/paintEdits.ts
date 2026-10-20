/**
 * Pure edits of a paint list, used by the fills editor and the canvas handles (ROADMAP Phase 35). Each takes a list
 * and returns a new one; nothing here touches the document.
 */

import { parseColor, toHex } from "./colorMath";
import { newPaint, type GradientStop, type Paint, type PaintType, MAX_PAINTS, MAX_STOPS } from "./paints";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The colour a paint is best summed up by: its colour, or its first stop's. */
export function paintColor(p: Paint): string {
  return p.type === "solid" ? p.color : p.stops[0].color;
}

/** Adds a paint on top of the list. */
export function addPaint(fills: readonly Paint[], type: PaintType, color?: string): Paint[] {
  if (fills.length >= MAX_PAINTS) return [...fills];
  return [newPaint(type, color ?? (fills.length ? paintColor(fills[0]) : "#cbd5e1")), ...fills];
}

export function removePaint(fills: readonly Paint[], index: number): Paint[] {
  return fills.filter((_, i) => i !== index);
}

/** Moves a paint up (towards the top of the stack) or down. */
export function movePaint(fills: readonly Paint[], index: number, direction: -1 | 1): Paint[] {
  const to = index + direction;
  if (to < 0 || to >= fills.length) return [...fills];
  const next = [...fills];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** Changes one paint's type, keeping what carries over: its colour or stops, opacity and visibility. */
export function changeType(p: Paint, type: PaintType): Paint {
  if (p.type === type) return p;
  const fresh = newPaint(type, paintColor(p));
  const keep = { opacity: p.opacity, visible: p.visible };
  if (fresh.type === "solid") return { ...fresh, ...keep };
  return { ...fresh, ...keep, stops: p.type === "solid" ? fresh.stops : p.stops } as Paint;
}

export function updatePaint(fills: readonly Paint[], index: number, change: (p: Paint) => Paint): Paint[] {
  return fills.map((p, i) => (i === index ? change(p) : p));
}

/** Interpolates a colour between two stops (in sRGB, which is what the browsers' gradients do). */
function mix(a: string, b: string, t: number): string {
  const x = parseColor(a);
  const y = parseColor(b);
  if (!x || !y) return a;
  const l = (u: number, v: number) => u + (v - u) * t;
  return toHex({ r: l(x.r, y.r), g: l(x.g, y.g), b: l(x.b, y.b), a: l(x.a, y.a) });
}

/** The gradient's colour at position `at` (0-1). */
export function colorAt(stops: readonly GradientStop[], at: number): string {
  const sorted = [...stops].sort((a, b) => a.at - b.at);
  if (at <= sorted[0].at) return sorted[0].color;
  const last = sorted[sorted.length - 1];
  if (at >= last.at) return last.color;
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (at >= a.at && at <= b.at) return mix(a.color, b.color, b.at === a.at ? 0 : (at - a.at) / (b.at - a.at));
  }
  return last.color;
}

/** Adds a stop at `at`, coloured as the gradient is there. Returns the new list and the new stop's index. */
export function addStop(stops: readonly GradientStop[], at: number): { stops: GradientStop[]; index: number } {
  if (stops.length >= MAX_STOPS) return { stops: [...stops], index: -1 };
  const position = Number(clamp(at, 0, 1).toFixed(4));
  const next = [...stops, { at: position, color: colorAt(stops, position) }].sort((a, b) => a.at - b.at);
  return { stops: next, index: next.findIndex((s) => s.at === position) };
}

/** Removes a stop (a gradient keeps at least two). */
export function removeStop(stops: readonly GradientStop[], index: number): GradientStop[] {
  return stops.length <= 2 ? [...stops] : stops.filter((_, i) => i !== index);
}

/** Moves a stop to `at`; the list stays sorted and the returned index follows the stop. */
export function moveStop(stops: readonly GradientStop[], index: number, at: number): { stops: GradientStop[]; index: number } {
  const target = stops[index];
  if (!target) return { stops: [...stops], index };
  const position = Number(clamp(at, 0, 1).toFixed(4));
  const next = stops.map((s, i) => (i === index ? { ...s, at: position } : s));
  // among stops at the same place the one being dragged goes first when it came from the right, last when it came from the left
  const first = position < target.at ? -1 : 1;
  const marked = next.map((s, i) => ({ s, i })).sort((a, b) => a.s.at - b.s.at || (a.i === index ? first : b.i === index ? -first : 0));
  return { stops: marked.map((m) => m.s), index: marked.findIndex((m) => m.i === index) };
}

export function setStopColor(stops: readonly GradientStop[], index: number, color: string): GradientStop[] {
  return stops.map((s, i) => (i === index ? { ...s, color } : s));
}

/** Reverses the gradient: the first stop becomes the last. */
export function reverseStops(stops: readonly GradientStop[]): GradientStop[] {
  return [...stops].reverse().map((s) => ({ ...s, at: Number((1 - s.at).toFixed(4)) }));
}
