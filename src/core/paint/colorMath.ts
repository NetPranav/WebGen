/**
 * ============================================================================
 * COLOUR MATHS (ROADMAP Phase 35)
 * ============================================================================
 * Parsing and converting colours for the picker and the renderer: hex, `rgb()`, `hsl()`, HSB (the picker's
 * square) and OKLCH (perceptual: lightness, chroma, hue). Pure functions. RGB channels are 0-255, alpha 0-1.
 * ============================================================================
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}
export interface Hsb {
  /** 0-360. */
  h: number;
  /** 0-1. */
  s: number;
  /** 0-1. */
  b: number;
}
export interface Oklch {
  /** 0-1. */
  l: number;
  /** About 0-0.4. */
  c: number;
  /** 0-360. */
  h: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const clamp255 = (n: number) => clamp(Math.round(n), 0, 255);

const NAMED: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00", orange: "#ffa500", purple: "#800080",
  pink: "#ffc0cb", gray: "#808080", grey: "#808080", silver: "#c0c0c0", maroon: "#800000", olive: "#808000", lime: "#00ff00", aqua: "#00ffff",
  cyan: "#00ffff", teal: "#008080", navy: "#000080", fuchsia: "#ff00ff", magenta: "#ff00ff", brown: "#a52a2a", gold: "#ffd700", indigo: "#4b0082",
  violet: "#ee82ee", coral: "#ff7f50", salmon: "#fa8072", crimson: "#dc143c", turquoise: "#40e0d0", tomato: "#ff6347",
};

/** Parses a colour. `none` and `transparent` are fully transparent black. Anything unknown is null. */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  if (s === "none" || s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (s === "currentcolor") return null;
  if (NAMED[s]) return parseColor(NAMED[s]);
  const hex = /^#([0-9a-f]{3,8})$/.exec(s);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) {
      const [r, g, b, a] = h.split("").map((c) => parseInt(c + c, 16));
      return { r, g, b, a: h.length === 4 ? a / 255 : 1 };
    }
    if (h.length === 6 || h.length === 8) {
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
    }
    return null;
  }
  const fn = /^(rgba?|hsla?)\(\s*([^)]+)\)$/.exec(s);
  if (fn) {
    const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const num = (p: string, scale: number) => (p.endsWith("%") ? (parseFloat(p) / 100) * scale : parseFloat(p));
    const alpha = parts[3] === undefined ? 1 : clamp(num(parts[3], 1), 0, 1);
    if (parts.some((p) => Number.isNaN(parseFloat(p)))) return null;
    if (fn[1].startsWith("rgb")) return { r: clamp255(num(parts[0], 255)), g: clamp255(num(parts[1], 255)), b: clamp255(num(parts[2], 255)), a: alpha };
    const rgb = hslToRgb(parseFloat(parts[0]), clamp(num(parts[1], 1) / (parts[1].endsWith("%") ? 1 : 100), 0, 1), clamp(num(parts[2], 1) / (parts[2].endsWith("%") ? 1 : 100), 0, 1));
    return { ...rgb, a: alpha };
  }
  return null;
}

function hslToRgb(h: number, s: number, l: number): Omit<Rgba, "a"> {
  const hh = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    const x = (t + 1) % 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return s === 0 ? { r: clamp255(l * 255), g: clamp255(l * 255), b: clamp255(l * 255) } : { r: clamp255(f(hh + 1 / 3) * 255), g: clamp255(f(hh) * 255), b: clamp255(f(hh - 1 / 3) * 255) };
}

const hex2 = (n: number) => clamp255(n).toString(16).padStart(2, "0");

/** `#rrggbb`, or `#rrggbbaa` when the colour is not fully opaque. */
export function toHex(c: Rgba): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${c.a < 1 ? hex2(c.a * 255) : ""}`;
}

/** `rgba(r, g, b, a)` for a style attribute (alpha to three places). */
export function toCss(c: Rgba): string {
  return `rgba(${clamp255(c.r)}, ${clamp255(c.g)}, ${clamp255(c.b)}, ${Number(clamp(c.a, 0, 1).toFixed(3))})`;
}

/** The colour with its alpha multiplied by `factor` (0-1). A colour that can't be read is returned unchanged. */
export function withOpacity(color: string, factor: number): string {
  const c = parseColor(color);
  if (!c) return color;
  return toCss({ ...c, a: c.a * clamp(factor, 0, 1) });
}

export function rgbToHsb({ r, g, b }: Rgba): Hsb {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, b: max };
}

export function hsbToRgb({ h, s, b }: Hsb, a = 1): Rgba {
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = b * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = b - c;
  const [r, g, bl] = hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  return { r: clamp255((r + m) * 255), g: clamp255((g + m) * 255), b: clamp255((bl + m) * 255), a };
}

// --- OKLCH -------------------------------------------------------------------

const toLinear = (u: number) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
const fromLinear = (u: number) => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);

export function rgbToOklch({ r, g, b }: Rgba): Oklch {
  const R = toLinear(r / 255), G = toLinear(g / 255), B = toLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, Bb);
  let h = (Math.atan2(Bb, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c: C < 1e-6 ? 0 : C, h: C < 1e-6 ? 0 : h };
}

function oklchToLinear({ l: L, c: C, h }: Oklch): [number, number, number] {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

const inGamut = (rgb: [number, number, number]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH to sRGB. A colour outside the sRGB gamut keeps its lightness and hue and loses chroma until it fits. */
export function oklchToRgb(color: Oklch, a = 1): Rgba {
  let c = { ...color, l: clamp(color.l, 0, 1), c: Math.max(0, color.c) };
  let lin = oklchToLinear(c);
  if (!inGamut(lin)) {
    let lo = 0;
    let hi = c.c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ ...c, c: mid }))) lo = mid;
      else hi = mid;
    }
    c = { ...c, c: lo };
    lin = oklchToLinear(c);
  }
  const [r, g, b] = lin.map((v) => clamp255(fromLinear(clamp(v, 0, 1)) * 255));
  return { r, g, b, a };
}
