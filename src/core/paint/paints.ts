/**
 * ============================================================================
 * PAINTS AND EFFECTS (ROADMAP Phase 35)
 * ============================================================================
 * A layer's fills are a list of paints: solid colours and linear, radial and conic gradients, each with an opacity
 * and a visibility. Its shadows are a list of drop and inner shadows. Both are stored as JSON text in the layer's
 * properties (`paint.fills`, `paint.shadows`), first entry on top (the order CSS lists backgrounds and shadows).
 * Geometry is in fractions of the layer's box, so a gradient follows the layer when it is resized.
 *
 * This module parses and validates them (a hostile file can't make the renderer slow or inject style), and turns
 * them into CSS. Pure: no DOM, no store.
 * ============================================================================
 */

import { parseColor, toCss, withOpacity } from "./colorMath";

export interface Point {
  x: number;
  y: number;
}
export interface GradientStop {
  /** Where along the gradient, 0 to 1. */
  at: number;
  color: string;
}

interface PaintBase {
  /** 0 to 1. */
  opacity: number;
  visible: boolean;
}
export type SolidPaint = PaintBase & { type: "solid"; color: string };
export type LinearPaint = PaintBase & { type: "linear"; stops: GradientStop[]; from: Point; to: Point };
export type RadialPaint = PaintBase & { type: "radial"; stops: GradientStop[]; center: Point; radius: Point };
export type ConicPaint = PaintBase & { type: "conic"; stops: GradientStop[]; center: Point; angle: number };
export type Paint = SolidPaint | LinearPaint | RadialPaint | ConicPaint;
export type PaintType = Paint["type"];
export const PAINT_TYPES: readonly PaintType[] = ["solid", "linear", "radial", "conic"];

export const MAX_PAINTS = 16;
export const MAX_STOPS = 32;
export const MAX_SHADOWS = 16;
export const MAX_PAINT_JSON = 100_000;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (v: unknown, fallback: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : fallback);

/** A colour the renderer may put in a style: one we can read. */
const safeColor = (v: unknown): string | null => (typeof v === "string" && v.length <= 64 && parseColor(v) !== null ? v.trim() : null);

const point = (v: unknown, fallback: Point): Point => {
  const o = typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  return { x: num(o.x, fallback.x, -4, 5), y: num(o.y, fallback.y, -4, 5) };
};

export const DEFAULT_STOPS: readonly GradientStop[] = [
  { at: 0, color: "#ffffff" },
  { at: 1, color: "#000000" },
];

/** A fresh paint of a type, from a colour or the first stops of an existing one. */
export function newPaint(type: PaintType, color = "#cbd5e1"): Paint {
  const base = { opacity: 1, visible: true };
  const stops: GradientStop[] = [{ at: 0, color }, { at: 1, color: parseColor(color) && (parseColor(color)!.r + parseColor(color)!.g + parseColor(color)!.b) / 3 > 128 ? "#0f172a" : "#ffffff" }];
  switch (type) {
    case "solid": return { ...base, type, color };
    case "linear": return { ...base, type, stops, from: { x: 0.5, y: 0 }, to: { x: 0.5, y: 1 } };
    case "radial": return { ...base, type, stops, center: { x: 0.5, y: 0.5 }, radius: { x: 0.5, y: 0.5 } };
    case "conic": return { ...base, type, stops, center: { x: 0.5, y: 0.5 }, angle: 0 };
  }
}

function parseStops(v: unknown): GradientStop[] | null {
  if (!Array.isArray(v)) return null;
  const stops: GradientStop[] = [];
  for (const s of v.slice(0, MAX_STOPS)) {
    const o = typeof s === "object" && s !== null ? (s as Record<string, unknown>) : null;
    const color = o ? safeColor(o.color) : null;
    if (!o || !color) continue;
    stops.push({ at: num(o.at, 0, 0, 1), color });
  }
  if (stops.length < 2) return null;
  return stops.sort((a, b) => a.at - b.at);
}

function parsePaint(v: unknown): Paint | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const base = { opacity: num(o.opacity, 1, 0, 1), visible: o.visible !== false };
  switch (o.type) {
    case "solid": {
      const color = safeColor(o.color);
      return color ? { ...base, type: "solid", color } : null;
    }
    case "linear": {
      const stops = parseStops(o.stops);
      return stops ? { ...base, type: "linear", stops, from: point(o.from, { x: 0.5, y: 0 }), to: point(o.to, { x: 0.5, y: 1 }) } : null;
    }
    case "radial": {
      const stops = parseStops(o.stops);
      const r = point(o.radius, { x: 0.5, y: 0.5 });
      return stops ? { ...base, type: "radial", stops, center: point(o.center, { x: 0.5, y: 0.5 }), radius: { x: Math.abs(r.x) || 0.01, y: Math.abs(r.y) || 0.01 } } : null;
    }
    case "conic": {
      const stops = parseStops(o.stops);
      return stops ? { ...base, type: "conic", stops, center: point(o.center, { x: 0.5, y: 0.5 }), angle: num(o.angle, 0, -720, 720) } : null;
    }
    default:
      return null;
  }
}

/** Reads `paint.fills`. Returns null when it is absent, empty, malformed or too big (the layer then uses its plain colour). Invalid paints inside a valid list are skipped. */
export function parseFills(json: unknown): Paint[] | null {
  if (typeof json !== "string" || json === "" || json.length > MAX_PAINT_JSON) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(raw)) return null;
  const paints = raw.slice(0, MAX_PAINTS).map(parsePaint).filter((p): p is Paint => p !== null);
  return raw.length === 0 ? [] : paints;
}

const r3 = (n: number) => Number(n.toFixed(4));
const pt = (p: Point) => ({ x: r3(p.x), y: r3(p.y) });

/** The JSON for `paint.fills`: compact, with defaults left out. */
export function serializeFills(fills: readonly Paint[]): string {
  return JSON.stringify(
    fills.slice(0, MAX_PAINTS).map((p) => {
      const base = { type: p.type, ...(p.opacity !== 1 ? { opacity: r3(p.opacity) } : {}), ...(p.visible ? {} : { visible: false }) };
      switch (p.type) {
        case "solid": return { ...base, color: p.color };
        case "linear": return { ...base, stops: p.stops.map((s) => ({ at: r3(s.at), color: s.color })), from: pt(p.from), to: pt(p.to) };
        case "radial": return { ...base, stops: p.stops.map((s) => ({ at: r3(s.at), color: s.color })), center: pt(p.center), radius: pt(p.radius) };
        case "conic": return { ...base, stops: p.stops.map((s) => ({ at: r3(s.at), color: s.color })), center: pt(p.center), angle: r3(p.angle) };
      }
    }),
  );
}

const isNoPaint = (c: string) => c.trim() === "" || ["none", "transparent"].includes(c.trim().toLowerCase());

/** The fills a layer draws: its `paint.fills` when it has them, else its plain colour as one solid fill (none for `none`). */
export function effectiveFills(fillsJson: unknown, plainColor: string | undefined): Paint[] {
  const list = parseFills(fillsJson);
  if (list !== null) return list;
  return plainColor && !isNoPaint(plainColor) ? [{ type: "solid", color: plainColor, opacity: 1, visible: true }] : [];
}

// --- CSS -----------------------------------------------------------------------

const f = (n: number) => Number(n.toFixed(3));

function stopList(stops: readonly GradientStop[], opacity: number, position: (s: GradientStop) => string): string {
  return stops.map((s) => `${withOpacity(s.color, opacity)} ${position(s)}`).join(", ");
}

/**
 * One paint as a CSS image for `background-image`. A gradient is mapped exactly onto the layer's box (`w` by `h`
 * px), so a linear gradient between any two points renders the same as the handles on the canvas show.
 */
export function paintCss(p: Paint, w: number, h: number): string | null {
  if (!p.visible) return null;
  const W = w > 0 ? w : 100;
  const H = h > 0 ? h : 100;
  switch (p.type) {
    case "solid": {
      const c = withOpacity(p.color, p.opacity);
      return `linear-gradient(${c}, ${c})`;
    }
    case "linear": {
      const fx = p.from.x * W, fy = p.from.y * H, tx = p.to.x * W, ty = p.to.y * H;
      const dx = tx - fx, dy = ty - fy;
      if (Math.hypot(dx, dy) < 1e-6) {
        const last = withOpacity(p.stops[p.stops.length - 1].color, p.opacity);
        return `linear-gradient(${last}, ${last})`;
      }
      const theta = Math.atan2(dx, -dy); // CSS: 0deg points up, clockwise
      const ux = Math.sin(theta), uy = -Math.cos(theta);
      const length = Math.abs(W * Math.sin(theta)) + Math.abs(H * Math.cos(theta));
      const along = (at: number) => (((fx + at * dx - W / 2) * ux + (fy + at * dy - H / 2) * uy) / length + 0.5) * 100;
      return `linear-gradient(${f((theta * 180) / Math.PI)}deg, ${stopList(p.stops, p.opacity, (s) => `${f(along(s.at))}%`)})`;
    }
    case "radial":
      return `radial-gradient(${f(p.radius.x * W)}px ${f(p.radius.y * H)}px at ${f(p.center.x * W)}px ${f(p.center.y * H)}px, ${stopList(p.stops, p.opacity, (s) => `${f(s.at * 100)}%`)})`;
    case "conic":
      return `conic-gradient(from ${f(p.angle)}deg at ${f(p.center.x * W)}px ${f(p.center.y * H)}px, ${stopList(p.stops, p.opacity, (s) => `${f(s.at * 360)}deg`)})`;
  }
}

/** The `background-image` for a list of fills (first is on top), or undefined when none is visible. */
export function fillsBackground(fills: readonly Paint[], w: number, h: number): string | undefined {
  const images = fills.map((p) => paintCss(p, w, h)).filter((c): c is string => c !== null);
  return images.length > 0 ? images.join(", ") : undefined;
}

// --- Shadows -------------------------------------------------------------------

export interface Shadow {
  kind: "drop" | "inner";
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  visible: boolean;
}

export const DEFAULT_SHADOW: Shadow = { kind: "drop", x: 0, y: 4, blur: 8, spread: 0, color: "rgba(0, 0, 0, 0.25)", visible: true };

export function parseShadows(json: unknown): Shadow[] {
  if (typeof json !== "string" || json === "" || json.length > MAX_PAINT_JSON) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out: Shadow[] = [];
  for (const s of raw.slice(0, MAX_SHADOWS)) {
    const o = typeof s === "object" && s !== null ? (s as Record<string, unknown>) : null;
    const color = o ? safeColor(o.color) : null;
    if (!o || !color) continue;
    out.push({
      kind: o.kind === "inner" ? "inner" : "drop",
      x: num(o.x, 0, -1000, 1000), y: num(o.y, 0, -1000, 1000), blur: num(o.blur, 0, 0, 200), spread: num(o.spread, 0, -100, 100),
      color, visible: o.visible !== false,
    });
  }
  return out;
}

export function serializeShadows(shadows: readonly Shadow[]): string {
  return shadows.length === 0 ? "" : JSON.stringify(shadows.slice(0, MAX_SHADOWS).map((s) => ({ kind: s.kind, x: s.x, y: s.y, blur: s.blur, spread: s.spread, color: s.color, ...(s.visible ? {} : { visible: false }) })));
}

/** CSS `box-shadow` for the visible shadows (inner ones are `inset`), or undefined. */
export function boxShadowCss(shadows: readonly Shadow[]): string | undefined {
  const parts = shadows.filter((s) => s.visible).map((s) => `${s.kind === "inner" ? "inset " : ""}${f(s.x)}px ${f(s.y)}px ${f(s.blur)}px ${f(s.spread)}px ${toCss(parseColor(s.color)!)}`);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

/** CSS `text-shadow`: text has drop shadows only (no spread, no inner). */
export function textShadowCss(shadows: readonly Shadow[]): string | undefined {
  const parts = shadows.filter((s) => s.visible && s.kind === "drop").map((s) => `${f(s.x)}px ${f(s.y)}px ${f(s.blur)}px ${toCss(parseColor(s.color)!)}`);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

// --- Strokes -------------------------------------------------------------------

/** A dash pattern the renderer may use: numbers and separators only, at most 8 values; anything else is no dash. */
export function safeDashArray(value: string): string | undefined {
  const v = value.trim();
  if (v === "" || v === "none" || !/^[0-9.]+(?:[ ,]+[0-9.]+){0,7}$/.test(v)) return undefined;
  const nums = v.split(/[ ,]+/).map(Number);
  return nums.every((n) => Number.isFinite(n) && n >= 0) && nums.some((n) => n > 0) ? nums.join(" ") : undefined;
}

/** The dash patterns the picker offers, scaled to the stroke's width. */
export const DASH_PRESETS: readonly { id: "solid" | "dashed" | "dotted"; label: string; array: (width: number) => string }[] = [
  { id: "solid", label: "Solid", array: () => "none" },
  { id: "dashed", label: "Dashed", array: (w) => `${Math.max(1, w) * 4} ${Math.max(1, w) * 3}` },
  { id: "dotted", label: "Dotted", array: (w) => `${Math.max(1, w)} ${Math.max(1, w) * 2}` },
];
