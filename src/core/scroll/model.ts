/**
 * ============================================================================
 * SCROLL: THE MODEL (ROADMAP Phase 81)
 * ============================================================================
 * Pure functions, no DOM: where a layer's scroll range starts and ends, how far through it the page is (view
 * progress), the trigger crossings (enter, leave, enter-back, leave-back), scrub smoothing and pin. The runtime
 * driver (`ScrollDriver.ts`) feeds these with the frame's real scroll position and the layers' layout, and the
 * kernel plays the result (`EvaluateInputs.scrollClipTime`).
 *
 * A range is written the way GSAP and CSS view timelines write it: `"<element edge> <viewport edge>"`, such as
 * `"top 80%"` (the element's top reaches 80% of the way down the viewport). An edge is `top`, `center`, `bottom`, a
 * percentage of the element (or viewport) or a number of pixels.
 * ============================================================================
 */

/** One half of a range position: where on the element and where on the viewport. */
export interface ScrollPosition {
  /** Where on the element: a fraction of its height (0 top, 1 bottom) or pixels from its top. */
  element: { fraction: number } | { px: number };
  /** Where on the viewport: a fraction of its height (0 top, 1 bottom) or pixels from its top. */
  viewport: { fraction: number } | { px: number };
}

const WORDS: Record<string, number> = { top: 0, center: 0.5, centre: 0.5, middle: 0.5, bottom: 1 };

function parseEdge(token: string): { fraction: number } | { px: number } | null {
  const t = token.trim().toLowerCase();
  if (t in WORDS) return { fraction: WORDS[t] };
  const percent = /^(-?\d+(?:\.\d+)?)%$/.exec(t);
  if (percent) return { fraction: Number(percent[1]) / 100 };
  const px = /^(-?\d+(?:\.\d+)?)(?:px)?$/.exec(t);
  if (px) return { px: Number(px[1]) };
  return null;
}

/** Parses `"top 80%"`, `"bottom top"`, `"center center"`, `"top+=100 bottom"` is not supported. Null when it isn't a position. */
export function parseScrollPosition(text: string | undefined, fallback: string): ScrollPosition {
  const read = (source: string): ScrollPosition | null => {
    const parts = source.trim().split(/\s+/);
    if (parts.length !== 2) return null;
    const element = parseEdge(parts[0]);
    const viewport = parseEdge(parts[1]);
    return element && viewport ? { element, viewport } : null;
  };
  return (text !== undefined ? read(text) : null) ?? (read(fallback) as ScrollPosition);
}

/** The defaults: the range runs from the element's top meeting the viewport's bottom to its bottom leaving the top (a view timeline's cover range). */
export const DEFAULT_START = "top bottom";
export const DEFAULT_END = "bottom top";

export interface ElementBox {
  /** Layout position in document pixels (scroll included, transforms ignored) and height. */
  top: number;
  height: number;
}

export interface ScrollRange {
  /** Scroll positions (document px) where progress is 0 and 1. */
  startScroll: number;
  endScroll: number;
}

const along = (edge: { fraction: number } | { px: number }, size: number) => ("fraction" in edge ? edge.fraction * size : edge.px);

/** The scroll position at which `position` is met: the element's point lines up with the viewport's point. */
export function scrollAt(position: ScrollPosition, box: ElementBox, viewportHeight: number): number {
  return box.top + along(position.element, box.height) - along(position.viewport, viewportHeight);
}

/** A layer's scroll range for the given start and end (strings like `"top 80%"`). */
export function resolveRange(box: ElementBox, viewportHeight: number, start?: string, end?: string): ScrollRange {
  return {
    startScroll: scrollAt(parseScrollPosition(start, DEFAULT_START), box, viewportHeight),
    endScroll: scrollAt(parseScrollPosition(end, DEFAULT_END), box, viewportHeight),
  };
}

/** How far through its range the page is: 0 before it, 1 after it, linear between. A range with no length is a step at its start. */
export function viewProgress(scrollY: number, range: ScrollRange): number {
  const span = range.endScroll - range.startScroll;
  if (!(span > 0)) return scrollY >= range.startScroll ? 1 : 0;
  return Math.min(1, Math.max(0, (scrollY - range.startScroll) / span));
}

export type ScrollEvent = "enter" | "leave" | "enterBack" | "leaveBack";

/**
 * The trigger crossings between two progress values. Scrolling forward through the range gives `enter` (progress
 * leaves 0) then `leave` (reaches 1); scrolling back gives `enterBack` (leaves 1) then `leaveBack` (reaches 0). A
 * jump over the whole range gives both, in order.
 */
export function scrollEvents(previous: number, next: number): ScrollEvent[] {
  const events: ScrollEvent[] = [];
  if (next > previous) {
    if (previous <= 0 && next > 0) events.push("enter");
    if (previous < 1 && next >= 1) events.push("leave");
  } else if (next < previous) {
    if (previous >= 1 && next < 1) events.push("enterBack");
    if (previous > 0 && next <= 0) events.push("leaveBack");
  }
  return events;
}

/**
 * Scrub smoothing: the displayed progress chases the real one, closing the gap by 1 - e^(-dt / smoothing) each frame, so
 * `smoothing` seconds is roughly how long it takes to catch up (GSAP's `scrub: 1`). Zero or less follows exactly.
 */
export function smoothProgress(displayed: number, target: number, dt: number, smoothing: number): number {
  if (!(smoothing > 0) || !(dt > 0)) return smoothing > 0 ? displayed : target;
  const step = 1 - Math.exp(-dt / smoothing);
  const next = displayed + (target - displayed) * step;
  return Math.abs(target - next) < 1e-4 ? target : next;
}

/** The scrub setting as seconds of smoothing: `true` and `0` follow exactly, a number smooths. */
export const scrubSmoothing = (scrub: boolean | number | undefined): number => (typeof scrub === "number" && scrub > 0 ? scrub : 0);

/**
 * Pin: while the page is inside the range the layer is held where it met the start, by a translation that cancels the
 * scroll. Zero before the range, held at the range's length after it (the layer then scrolls away normally).
 */
export function pinOffset(scrollY: number, range: ScrollRange): number {
  const span = Math.max(0, range.endScroll - range.startScroll);
  return Math.min(span, Math.max(0, scrollY - range.startScroll));
}

// ---------------------------------------------------------------------------
// A triggered (not scrubbed) clip: plays once when it is entered
// ---------------------------------------------------------------------------

export interface TriggeredState {
  /** The range has been entered (scrolling forward past its start). */
  entered: boolean;
  /** When it started playing, in milliseconds on the frame clock. */
  startedAt: number;
  /** The progress last seen, or null before the first look. */
  last: number | null;
}

export const initialTriggered = (): TriggeredState => ({ entered: false, startedAt: 0, last: null });

/**
 * Advances a triggered clip by one look at the page. `enter` starts it playing; `leaveBack` (scrolling back above the
 * range) rewinds it so it plays again next time; the first look at a page that already has the layer in view counts as
 * entered, and one already past it as finished. Returns the new state (the old one is not changed).
 */
export function advanceTriggered(state: TriggeredState, progress: number, now: number, durationMs: number): TriggeredState {
  if (state.last === null) {
    if (progress <= 0) return { entered: false, startedAt: 0, last: progress };
    return { entered: true, startedAt: progress >= 1 ? now - durationMs : now, last: progress };
  }
  let next = state;
  for (const event of scrollEvents(state.last, progress)) {
    if (event === "enter") next = { ...next, entered: true, startedAt: now };
    else if (event === "leaveBack") next = { ...next, entered: false, startedAt: 0 };
  }
  return next.last === progress ? next : { ...next, last: progress };
}

/** Seconds into the clip (its own time, before delay is taken off) for a triggered clip at frame time `now`. */
export function triggeredTime(state: TriggeredState, now: number, duration: number, delay = 0): number {
  if (!state.entered) return 0;
  const elapsed = Math.max(0, (now - state.startedAt) / 1000 - delay);
  return Math.min(duration, elapsed);
}

/** Whether `text` is a range position this model reads (`"top 80%"`, `"center center"`, `"bottom -100"`). */
export function isScrollPosition(text: string): boolean {
  const parts = text.trim().split(/\s+/);
  return parts.length === 2 && parseEdge(parts[0]) !== null && parseEdge(parts[1]) !== null;
}
