"use client";

/**
 * ============================================================================
 * PHASE 9, SUB-PHASE 9.2 — COLOUR: OKLAB INTERPOLATION
 * ============================================================================
 * sRGB ⇄ OKLab conversion (Björn Ottosson's formulas — the same constants
 * behind the CSS Color 4 `oklab()`/`oklch()` functions) so mixing two colours
 * takes the perceptually-uniform path instead of naive channel-wise sRGB
 * lerp, which desaturates and muddies through the middle of the mix
 * (`PROPERTY_REGISTRY`'s own comment: "mixed in OKLab (Phase 9.2)").
 * ============================================================================
 */

export interface Rgba {
  r: number; // 0-1, linear? no — sRGB gamma-encoded, 0-1
  g: number;
  b: number;
  a: number; // 0-1
}

export interface Oklab {
  L: number;
  a: number;
  b: number;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

/** sRGB (0-1, gamma-encoded) → OKLab. */
export function rgbToOklab({ r, g, b }: Pick<Rgba, "r" | "g" | "b">): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/** OKLab → sRGB (0-1, gamma-encoded, unclamped — call `linearToSrgb`'s clamping via `oklabToRgb`'s callers if needed). */
export function oklabToRgb({ L, a, b }: Oklab): { r: number; g: number; b: number } {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return { r: linearToSrgb(lr), g: linearToSrgb(lg), b: linearToSrgb(lb) };
}

// ============================================================================
// CSS colour string parsing/formatting (hex + rgb()/rgba(); named keywords
// that aren't literal RGB — "transparent", "currentColor" — fall back to
// discrete stepping in `interpolators.ts`, since they carry no fixed RGB).
// ============================================================================

const HEX_RE = /^#([0-9a-fA-F]{3,8})$/;
const RGB_FN_RE = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/;

export function parseColor(input: string): Rgba | null {
  const text = input.trim();

  const hex = HEX_RE.exec(text);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const fn = RGB_FN_RE.exec(text);
  if (fn) {
    const [, r, g, b, a] = fn;
    return { r: Number(r) / 255, g: Number(g) / 255, b: Number(b) / 255, a: a !== undefined ? Number(a) : 1 };
  }

  if (text.toLowerCase() === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  return null;
}

export function formatColor({ r, g, b, a }: Rgba): string {
  const to255 = (c: number) => Math.round(Math.max(0, Math.min(1, c)) * 255);
  return a >= 1 ? `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})` : `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${Math.round(a * 1000) / 1000})`;
}

/** Mixes two CSS colour strings in OKLab at `t ∈ [0, 1]`; alpha lerps linearly (straight alpha). Returns `null` if either string isn't a parseable RGB colour. */
export function mixColorsOklab(fromStr: string, toStr: string, t: number): string | null {
  const from = parseColor(fromStr);
  const to = parseColor(toStr);
  if (!from || !to) return null;

  const clamped = Math.max(0, Math.min(1, t));
  const okA = rgbToOklab(from);
  const okB = rgbToOklab(to);

  const mixed: Oklab = {
    L: okA.L + (okB.L - okA.L) * clamped,
    a: okA.a + (okB.a - okA.a) * clamped,
    b: okA.b + (okB.b - okA.b) * clamped,
  };

  const { r, g, b } = oklabToRgb(mixed);
  const a = from.a + (to.a - from.a) * clamped;
  return formatColor({ r, g, b, a });
}
