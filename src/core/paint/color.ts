/**
 * ============================================================================
 * COLOUR, BLEND MODES, PROFILES AND IMAGE ADJUSTMENTS (FigCraft port, F2)
 * ============================================================================
 * A colour as a design panel thinks of it: non-premultiplied sRGB, every channel 0..1, read from hex (with the
 * colour field's shorthands: `F` → `FFFFFF`, `AB` → `ABABAB`), `rgb()`, `hsl()`, every CSS colour name, and
 * written back as hex or CSS. HSB and HSL for the picker, WCAG luminance and contrast, the blend modes Figma's
 * menu lists (with their CSS keywords), sRGB ↔ Display P3 conversion with a gamut check, gradient sampling and the
 * square width handle of a linear gradient, the seven image adjustments with their presets (and the colour matrix
 * that draws them in SVG), image crop maths and pattern tiling cells. Pure functions, junk-proof.
 *
 * Our paints keep storing colours as CSS text (`core/paint/paints.ts`); this module is what reads, converts and
 * writes them.
 *
 * Translated from FigCraft (`crates/color/src/lib.rs`, `hsx.rs`, `blend.rs`, `named.rs`, `profile.rs`, and the
 * image adjustments of `crates/render/src/images.rs`), commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and
 * the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 * ============================================================================
 */

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp01 = (v: number): number => (Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)));

export const color = (r: number, g: number, b: number, a = 1): Color => ({ r: clamp01(r), g: clamp01(g), b: clamp01(b), a: clamp01(a) });

export const BLACK: Color = { r: 0, g: 0, b: 0, a: 1 };
export const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
export const TRANSPARENT: Color = { r: 0, g: 0, b: 0, a: 0 };

export const fromRgba8 = (r: number, g: number, b: number, a = 255): Color => ({ r: r / 255, g: g / 255, b: b / 255, a: a / 255 });
export const toRgba8 = (c: Color): [number, number, number, number] => {
  const q = (v: number) => Math.round(clamp01(v) * 255);
  return [q(c.r), q(c.g), q(c.b), q(c.a)];
};
export const withAlpha = (c: Color, a: number): Color => ({ ...c, a: clamp01(a) });

const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");

/** `RRGGBB` (upper case, no `#`), the way the design panel shows colours. */
export function toHex(c: Color): string {
  const [r, g, b] = toRgba8(c);
  return hex2(r) + hex2(g) + hex2(b);
}

/** `#RRGGBB`, or `#RRGGBBAA` when not opaque. */
export function toCssHex(c: Color): string {
  const [r, g, b, a] = toRgba8(c);
  return a === 255 ? `#${hex2(r)}${hex2(g)}${hex2(b)}` : `#${hex2(r)}${hex2(g)}${hex2(b)}${hex2(a)}`;
}

/** Hex the way the colour field reads it: `#` optional (at most one), 1, 2, 3, 4, 6 or 8 digits. */
export function fromHex(input: string): Color | null {
  let s = input.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (!/^[0-9a-fA-F]*$/.test(s)) return null;
  const d = s.split("").map((ch) => parseInt(ch, 16));
  const byte = (hi: number, lo: number) => hi * 16 + lo;
  switch (d.length) {
    case 1: return fromRgba8(byte(d[0], d[0]), byte(d[0], d[0]), byte(d[0], d[0]));
    case 2: return fromRgba8(byte(d[0], d[1]), byte(d[0], d[1]), byte(d[0], d[1]));
    case 3: return fromRgba8(byte(d[0], d[0]), byte(d[1], d[1]), byte(d[2], d[2]));
    case 4: return fromRgba8(byte(d[0], d[0]), byte(d[1], d[1]), byte(d[2], d[2]), byte(d[3], d[3]));
    case 6: return fromRgba8(byte(d[0], d[1]), byte(d[2], d[3]), byte(d[4], d[5]));
    case 8: return fromRgba8(byte(d[0], d[1]), byte(d[2], d[3]), byte(d[4], d[5]), byte(d[6], d[7]));
    default: return null;
  }
}

/** Every CSS named colour except `transparent` (CSS Color 4 §6.1). */
const NAMED: Readonly<Record<string, readonly [number, number, number]>> = {
  aliceblue: [240, 248, 255], antiquewhite: [250, 235, 215], aqua: [0, 255, 255], aquamarine: [127, 255, 212],
  azure: [240, 255, 255], beige: [245, 245, 220], bisque: [255, 228, 196], black: [0, 0, 0],
  blanchedalmond: [255, 235, 205], blue: [0, 0, 255], blueviolet: [138, 43, 226], brown: [165, 42, 42],
  burlywood: [222, 184, 135], cadetblue: [95, 158, 160], chartreuse: [127, 255, 0], chocolate: [210, 105, 30],
  coral: [255, 127, 80], cornflowerblue: [100, 149, 237], cornsilk: [255, 248, 220], crimson: [220, 20, 60],
  cyan: [0, 255, 255], darkblue: [0, 0, 139], darkcyan: [0, 139, 139], darkgoldenrod: [184, 134, 11],
  darkgray: [169, 169, 169], darkgreen: [0, 100, 0], darkgrey: [169, 169, 169], darkkhaki: [189, 183, 107],
  darkmagenta: [139, 0, 139], darkolivegreen: [85, 107, 47], darkorange: [255, 140, 0],
  darkorchid: [153, 50, 204], darkred: [139, 0, 0], darksalmon: [233, 150, 122], darkseagreen: [143, 188, 143],
  darkslateblue: [72, 61, 139], darkslategray: [47, 79, 79], darkslategrey: [47, 79, 79],
  darkturquoise: [0, 206, 209], darkviolet: [148, 0, 211], deeppink: [255, 20, 147], deepskyblue: [0, 191, 255],
  dimgray: [105, 105, 105], dimgrey: [105, 105, 105], dodgerblue: [30, 144, 255], firebrick: [178, 34, 34],
  floralwhite: [255, 250, 240], forestgreen: [34, 139, 34], fuchsia: [255, 0, 255], gainsboro: [220, 220, 220],
  ghostwhite: [248, 248, 255], gold: [255, 215, 0], goldenrod: [218, 165, 32], gray: [128, 128, 128],
  green: [0, 128, 0], greenyellow: [173, 255, 47], grey: [128, 128, 128], honeydew: [240, 255, 240],
  hotpink: [255, 105, 180], indianred: [205, 92, 92], indigo: [75, 0, 130], ivory: [255, 255, 240],
  khaki: [240, 230, 140], lavender: [230, 230, 250], lavenderblush: [255, 240, 245], lawngreen: [124, 252, 0],
  lemonchiffon: [255, 250, 205], lightblue: [173, 216, 230], lightcoral: [240, 128, 128],
  lightcyan: [224, 255, 255], lightgoldenrodyellow: [250, 250, 210], lightgray: [211, 211, 211],
  lightgreen: [144, 238, 144], lightgrey: [211, 211, 211], lightpink: [255, 182, 193],
  lightsalmon: [255, 160, 122], lightseagreen: [32, 178, 170], lightskyblue: [135, 206, 250],
  lightslategray: [119, 136, 153], lightslategrey: [119, 136, 153], lightsteelblue: [176, 196, 222],
  lightyellow: [255, 255, 224], lime: [0, 255, 0], limegreen: [50, 205, 50], linen: [250, 240, 230],
  magenta: [255, 0, 255], maroon: [128, 0, 0], mediumaquamarine: [102, 205, 170], mediumblue: [0, 0, 205],
  mediumorchid: [186, 85, 211], mediumpurple: [147, 112, 219], mediumseagreen: [60, 179, 113],
  mediumslateblue: [123, 104, 238], mediumspringgreen: [0, 250, 154], mediumturquoise: [72, 209, 204],
  mediumvioletred: [199, 21, 133], midnightblue: [25, 25, 112], mintcream: [245, 255, 250],
  mistyrose: [255, 228, 225], moccasin: [255, 228, 181], navajowhite: [255, 222, 173], navy: [0, 0, 128],
  oldlace: [253, 245, 230], olive: [128, 128, 0], olivedrab: [107, 142, 35], orange: [255, 165, 0],
  orangered: [255, 69, 0], orchid: [218, 112, 214], palegoldenrod: [238, 232, 170], palegreen: [152, 251, 152],
  paleturquoise: [175, 238, 238], palevioletred: [219, 112, 147], papayawhip: [255, 239, 213],
  peachpuff: [255, 218, 185], peru: [205, 133, 63], pink: [255, 192, 203], plum: [221, 160, 221],
  powderblue: [176, 224, 230], purple: [128, 0, 128], rebeccapurple: [102, 51, 153], red: [255, 0, 0],
  rosybrown: [188, 143, 143], royalblue: [65, 105, 225], saddlebrown: [139, 69, 19], salmon: [250, 128, 114],
  sandybrown: [244, 164, 96], seagreen: [46, 139, 87], seashell: [255, 245, 238], sienna: [160, 82, 45],
  silver: [192, 192, 192], skyblue: [135, 206, 235], slateblue: [106, 90, 205], slategray: [112, 128, 144],
  slategrey: [112, 128, 144], snow: [255, 250, 250], springgreen: [0, 255, 127], steelblue: [70, 130, 180],
  tan: [210, 180, 140], teal: [0, 128, 128], thistle: [216, 191, 216], tomato: [255, 99, 71],
  turquoise: [64, 224, 208], violet: [238, 130, 238], wheat: [245, 222, 179], white: [255, 255, 255],
  whitesmoke: [245, 245, 245], yellow: [255, 255, 0], yellowgreen: [154, 205, 50],
};
const LONGEST_NAME = 20;

/** The opaque bytes of a CSS colour name. Case, spaces, `-` and `_` are ignored (`Light Blue` = `lightblue`). */
export function lookupNamed(s: string): readonly [number, number, number] | null {
  const key = Array.from(s).filter((ch) => !/\s/.test(ch) && ch !== "-" && ch !== "_").slice(0, LONGEST_NAME + 1).join("").toLowerCase();
  if (key.length === 0 || key.length > LONGEST_NAME) return null;
  return Object.prototype.hasOwnProperty.call(NAMED, key) ? NAMED[key] : null;
}

/** What a colour field accepts: hex as `fromHex` reads it, or a CSS colour name (opaque). Hex wins. */
export function fromHexOrName(s: string): Color | null {
  const hex = fromHex(s);
  if (hex) return hex;
  const n = lookupNamed(s);
  return n ? fromRgba8(n[0], n[1], n[2], 255) : null;
}

const cssArgs = (inner: string) => inner.replace(/\//g, ",").split(/[, ]/).map((p) => p.trim()).filter((p) => p.length > 0);
const parseNum = (p: string): number | null => (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(p) ? Number(p) : null);
const parseAlpha = (a: string): number | null => (a.endsWith("%") ? (parseNum(a.slice(0, -1).trim()) ?? NaN) / 100 : parseNum(a)) ?? null;

/** Parses a CSS colour: hex, `rgb()/rgba()`, `hsl()/hsla()`, a CSS name, `transparent`, or `color(display-p3 …)` / `color(srgb …)`. */
export function parseCss(input: string): Color | null {
  const t = input.trim().toLowerCase();
  if (t.startsWith("#")) return fromHex(t);
  let m = /^rgba?\((.*)\)$/.exec(t);
  if (m) {
    const parts = cssArgs(m[1]);
    if (parts.length < 3 || parts.length > 4) return null;
    const ch = (p: string) => (p.endsWith("%") ? (parseNum(p.slice(0, -1).trim()) ?? NaN) / 100 : (parseNum(p) ?? NaN) / 255);
    const alpha = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
    const [r, g, b] = [ch(parts[0]), ch(parts[1]), ch(parts[2])];
    if (alpha === null || Number.isNaN(alpha) || [r, g, b].some(Number.isNaN)) return null;
    return color(r, g, b, alpha);
  }
  m = /^hsla?\((.*)\)$/.exec(t);
  if (m) {
    const parts = cssArgs(m[1]);
    if (parts.length < 3 || parts.length > 4) return null;
    const h = parseNum(parts[0].replace(/deg$/, ""));
    const s = parseNum(parts[1].replace(/%$/, ""));
    const l = parseNum(parts[2].replace(/%$/, ""));
    const alpha = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
    if (h === null || s === null || l === null || alpha === null || Number.isNaN(alpha)) return null;
    return withAlpha(hslToColor({ h, s: s / 100, l: l / 100 }), alpha);
  }
  m = /^color\(\s*(display-p3|srgb)\s+(.*)\)$/.exec(t);
  if (m) {
    const parts = cssArgs(m[2]);
    if (parts.length < 3 || parts.length > 4) return null;
    const ch = (p: string) => (p.endsWith("%") ? (parseNum(p.slice(0, -1)) ?? NaN) / 100 : parseNum(p) ?? NaN);
    const alpha = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
    const v = [ch(parts[0]), ch(parts[1]), ch(parts[2])];
    if (alpha === null || Number.isNaN(alpha) || v.some(Number.isNaN)) return null;
    const c = color(v[0], v[1], v[2], alpha);
    return m[1] === "display-p3" ? convertProfile(c, "displayP3", "srgb") : c;
  }
  if (t === "transparent") return { ...TRANSPARENT };
  return fromHexOrName(t);
}

/** CSS text: hex when opaque, else `rgba()` with two decimals of alpha when they keep its 8-bit value, three otherwise. */
export function toCss(c: Color): string {
  const [r, g, b] = toRgba8(c);
  if (c.a >= 0.999) return toCssHex(c);
  const a8 = (a: number) => Math.round(clamp01(a) * 255);
  const short = c.a.toFixed(2);
  const alpha = a8(Number(short)) === a8(c.a) ? short : c.a.toFixed(3);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Linear interpolation in sRGB (how gradients render). */
export function lerpColor(a: Color, b: Color, t: number): Color {
  const k = clamp01(t);
  return color(a.r + (b.r - a.r) * k, a.g + (b.g - a.g) * k, a.b + (b.b - a.b) * k, a.a + (b.a - a.a) * k);
}

/** Relative luminance (WCAG). */
export function luminance(c: Color): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** WCAG contrast ratio between two opaque colours. */
export function contrast(a: Color, b: Color): number {
  const x = luminance(a) + 0.05;
  const y = luminance(b) + 0.05;
  return x > y ? x / y : y / x;
}

/** Whether black reads worse than white on this colour (a dark page: new text is white). */
export const isDark = (c: Color): boolean => contrast(c, WHITE) > contrast(c, BLACK);

// ---------------------------------------------------------------------------
// HSB and HSL
// ---------------------------------------------------------------------------

/** Hue 0..360; saturation and brightness 0..1. */
export interface Hsb {
  h: number;
  s: number;
  b: number;
}
/** Hue 0..360; saturation and lightness 0..1. */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const wrapHue = (h: number) => {
  if (!Number.isFinite(h)) return 0;
  const x = h % 360;
  return x < 0 ? x + 360 : x;
};
const c01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

function hueOf(r: number, g: number, b: number, max: number, d: number): number {
  if (d <= 0) return 0;
  let h: number;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return wrapHue(h);
}

function sector(h: number, c: number, x: number): [number, number, number] {
  switch (Math.floor(h / 60)) {
    case 0: return [c, x, 0];
    case 1: return [x, c, 0];
    case 2: return [0, c, x];
    case 3: return [0, x, c];
    case 4: return [x, 0, c];
    default: return [c, 0, x];
  }
}

export function colorToHsb(c: Color): Hsb {
  const max = Math.max(c.r, c.g, c.b);
  const d = max - Math.min(c.r, c.g, c.b);
  return { h: hueOf(c.r, c.g, c.b, max, d), s: max <= 0 ? 0 : d / max, b: max };
}

export function hsbToColor(v: Hsb): Color {
  const h = wrapHue(v.h);
  const s = c01(v.s);
  const b = c01(v.b);
  const c = b * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = b - c;
  const [r, g, bl] = sector(h, c, x);
  return color(r + m, g + m, bl + m, 1);
}

export function colorToHsl(c: Color): Hsl {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d <= 0 ? 0 : d / Math.max(1e-6, 1 - Math.abs(2 * l - 1));
  return { h: hueOf(c.r, c.g, c.b, max, d), s: c01(s), l };
}

export function hslToColor(v: Hsl): Color {
  const h = wrapHue(v.h);
  const s = c01(v.s);
  const l = c01(v.l);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = sector(h, c, x);
  return color(r + m, g + m, b + m, 1);
}

// ---------------------------------------------------------------------------
// Blend modes
// ---------------------------------------------------------------------------

/** Every blend mode in Figma's menu order. `passThrough` is for layers only. */
export const BLEND_MODES = [
  "passThrough", "normal", "darken", "multiply", "plusDarker", "colorBurn", "lighten", "screen", "plusLighter", "colorDodge",
  "overlay", "softLight", "hardLight", "difference", "exclusion", "hue", "saturation", "color", "luminosity",
] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

const BLEND_LABELS: Record<BlendMode, string> = {
  passThrough: "Pass through", normal: "Normal", darken: "Darken", multiply: "Multiply", plusDarker: "Plus darker", colorBurn: "Color burn",
  lighten: "Lighten", screen: "Screen", plusLighter: "Plus lighter", colorDodge: "Color dodge", overlay: "Overlay", softLight: "Soft light",
  hardLight: "Hard light", difference: "Difference", exclusion: "Exclusion", hue: "Hue", saturation: "Saturation", color: "Color", luminosity: "Luminosity",
};

export const blendLabel = (m: BlendMode): string => BLEND_LABELS[m];

/** The CSS `mix-blend-mode` / `background-blend-mode` keyword. `plus-darker` has no portable CSS form: it is drawn as `darken`. */
export function blendCss(m: BlendMode): string {
  switch (m) {
    case "passThrough":
    case "normal": return "normal";
    case "plusDarker": return "darken";
    default: return m.replace(/[A-Z]/g, (ch) => "-" + ch.toLowerCase());
  }
}

/** A mode by its label or CSS keyword, ignoring case, spaces, dashes and underscores. Labels first: "normal" is Normal. */
export function blendFromName(s: string): BlendMode | null {
  const key = s.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return (
    BLEND_MODES.find((m) => BLEND_LABELS[m].replace(/ /g, "").toLowerCase() === key) ??
    BLEND_MODES.find((m) => blendCss(m).replace(/-/g, "") === key) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Colour profiles: sRGB and Display P3
// ---------------------------------------------------------------------------

export type ColorProfile = "srgb" | "displayP3";
export const COLOR_PROFILES: readonly ColorProfile[] = ["srgb", "displayP3"];
export const profileLabel = (p: ColorProfile): string => (p === "srgb" ? "sRGB" : "Display P3");

/** An id or label, ignoring case, spaces, `-` and `_` (`Display P3`, `display-p3`, `p3`). */
export function parseProfile(s: string): ColorProfile | null {
  const k = s.replace(/[ \-_]/g, "").toLowerCase();
  if (k === "srgb") return "srgb";
  if (k === "displayp3" || k === "p3") return "displayP3";
  return null;
}

type Mat3 = [[number, number, number], [number, number, number], [number, number, number]];
const D65: [number, number] = [0.3127, 0.329];
const PRIMARIES: Record<ColorProfile, [number, number][]> = {
  srgb: [[0.64, 0.33], [0.3, 0.6], [0.15, 0.06]],
  displayP3: [[0.68, 0.32], [0.265, 0.69], [0.15, 0.06]],
};

const xyToXyz = ([x, y0]: [number, number]): [number, number, number] => {
  const y = Math.abs(y0) < 1e-12 ? 1e-12 : y0;
  return [x / y, 1, (1 - x - y) / y];
};
const matApply = (m: Mat3, v: [number, number, number]): [number, number, number] => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];
const matMul = (a: Mat3, b: Mat3): Mat3 =>
  [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j])) as Mat3;
function matInverse(m: Mat3): Mat3 | null {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const co = [e * i - f * h, f * g - d * i, d * h - e * g];
  const det = a * co[0] + b * co[1] + c * co[2];
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const k = 1 / det;
  return [
    [co[0] * k, (c * h - b * i) * k, (b * f - c * e) * k],
    [co[1] * k, (a * i - c * g) * k, (c * d - a * f) * k],
    [co[2] * k, (b * g - a * h) * k, (a * e - b * d) * k],
  ];
}
const IDENT: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

function rgbToXyz(profile: ColorProfile): Mat3 {
  const [r, g, b] = PRIMARIES[profile].map((p) => xyToXyz(p as [number, number]));
  const p: Mat3 = [[r[0], g[0], b[0]], [r[1], g[1], b[1]], [r[2], g[2], b[2]]];
  // scale each primary so that RGB (1, 1, 1) lands on the white point
  const s = matApply(matInverse(p) ?? IDENT, xyToXyz(D65));
  return p.map((row) => [row[0] * s[0], row[1] * s[1], row[2] * s[2]]) as Mat3;
}

const decodeSrgb = (v: number) => {
  const x = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const encodeSrgb = (l: number) => {
  const x = Number.isFinite(l) ? Math.min(1, Math.max(0, l)) : 0;
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
};

/** Linear RGB → linear RGB from one profile to another; `null` for the identity. */
export function profileMatrix(from: ColorProfile, to: ColorProfile): Mat3 | null {
  if (from === to) return null;
  return matMul(matInverse(rgbToXyz(to)) ?? IDENT, rgbToXyz(from));
}

/** The colour's values in another profile, keeping its appearance (alpha unchanged; out-of-gamut channels clip). */
export function convertProfile(c: Color, from: ColorProfile, to: ColorProfile): Color {
  const m = profileMatrix(from, to);
  if (!m) return { ...c };
  const [r, g, b] = matApply(m, [decodeSrgb(c.r), decodeSrgb(c.g), decodeSrgb(c.b)]);
  return color(encodeSrgb(r), encodeSrgb(g), encodeSrgb(b), clamp01(c.a));
}

/** Whether `c` falls outside the target space by more than two 8-bit steps (the picker's gamut warning). */
export function clipsInProfile(c: Color, from: ColorProfile, to: ColorProfile): boolean {
  const m = profileMatrix(from, to);
  if (!m) return false;
  const SLACK = 2 / 255;
  const enc = (x: number) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  return matApply(m, [decodeSrgb(c.r), decodeSrgb(c.g), decodeSrgb(c.b)]).some((l) => (l < 0 && enc(-l) > SLACK) || (l > 1 && enc(l) > 1 + SLACK));
}

/** CSS for a colour whose values are in `profile`: plain hex/rgba for sRGB, `color(display-p3 …)` for P3. */
export function toCssInProfile(c: Color, profile: ColorProfile): string {
  if (profile === "srgb") return toCss(c);
  const f = (v: number) => String(Number(clamp01(v).toFixed(4)));
  return c.a >= 0.999 ? `color(display-p3 ${f(c.r)} ${f(c.g)} ${f(c.b)})` : `color(display-p3 ${f(c.r)} ${f(c.g)} ${f(c.b)} / ${f(c.a)})`;
}

// ---------------------------------------------------------------------------
// Gradients
// ---------------------------------------------------------------------------

export interface ColorStop {
  position: number;
  color: Color;
}

/** Stops sorted by position with NaN removed and values clamped; at least one stop. */
export function sortedStops(stops: readonly ColorStop[]): ColorStop[] {
  const s = stops
    .filter((x) => Number.isFinite(x.position))
    .map((x) => ({ position: clamp01(x.position), color: color(x.color.r, x.color.g, x.color.b, x.color.a) }))
    .sort((a, b) => a.position - b.position);
  return s.length > 0 ? s : [{ position: 0, color: { ...BLACK } }];
}

/** The colour at `t` (0..1) along a gradient's stops. */
export function sampleStops(stops: readonly ColorStop[], t: number): Color {
  const s = sortedStops(stops);
  const k = clamp01(t);
  let prev = s[0];
  if (k <= prev.position) return prev.color;
  for (const stop of s.slice(1)) {
    if (k <= stop.position) {
      const span = stop.position - prev.position;
      return lerpColor(prev.color, stop.color, span > 1e-6 ? (k - prev.position) / span : 1);
    }
    prev = stop;
  }
  return prev.color;
}

type Handle = readonly [number, number];

/**
 * The width handle of a linear gradient, square to its axis on screen in a `w`×`h` box (handles are in the box's
 * unit square), so its colour bands cross the axis at right angles. A degenerate box is treated as a unit square.
 */
export function squareLinearWidth(from: Handle, to: Handle, w: number, h: number): [number, number] {
  const ok = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
  const W = ok ? w : 1;
  const H = ok ? h : 1;
  const dx = (to[0] - from[0]) * W;
  const dy = (to[1] - from[1]) * H;
  return [from[0] - dy / W, from[1] + dx / H];
}

// ---------------------------------------------------------------------------
// Image adjustments
// ---------------------------------------------------------------------------

/** The seven image adjustments, each -1..1 (0 is unchanged). */
export interface ImageAdjustments {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
}

export const NO_ADJUSTMENTS: ImageAdjustments = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 };
export const ADJUSTMENT_KEYS = Object.keys(NO_ADJUSTMENTS) as (keyof ImageAdjustments)[];

export const isIdentityAdjustment = (f: ImageAdjustments): boolean => ADJUSTMENT_KEYS.every((k) => f[k] === 0);

/** Every value clamped into -1..1 (non-numbers and NaN → 0). */
export function sanitizeAdjustments(f: Partial<Record<keyof ImageAdjustments, unknown>> | null | undefined): ImageAdjustments {
  const out = { ...NO_ADJUSTMENTS };
  for (const k of ADJUSTMENT_KEYS) {
    const v = f?.[k];
    out[k] = typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(-1, v)) : 0;
  }
  return out;
}

/** The built-in presets: id, label, adjustments. "Reset" is the identity. */
export const ADJUSTMENT_PRESETS: readonly { id: string; label: string; adjustments: ImageAdjustments }[] = [
  { id: "vivid", label: "Vivid", adjustments: { ...NO_ADJUSTMENTS, contrast: 0.2, saturation: 0.45, highlights: -0.1, shadows: 0.1 } },
  { id: "muted", label: "Muted", adjustments: { ...NO_ADJUSTMENTS, contrast: -0.15, saturation: -0.45 } },
  { id: "warm", label: "Warm", adjustments: { ...NO_ADJUSTMENTS, temperature: 0.5, tint: 0.1, saturation: 0.1 } },
  { id: "cool", label: "Cool", adjustments: { ...NO_ADJUSTMENTS, temperature: -0.5, tint: -0.05 } },
  { id: "blackAndWhite", label: "Black & white", adjustments: { ...NO_ADJUSTMENTS, saturation: -1, contrast: 0.15 } },
  { id: "fade", label: "Fade", adjustments: { ...NO_ADJUSTMENTS, contrast: -0.35, saturation: -0.2, shadows: 0.35, highlights: -0.1 } },
  { id: "reset", label: "Reset", adjustments: { ...NO_ADJUSTMENTS } },
];

/** A preset by id or label, ignoring case and anything that isn't a letter or digit. */
export function adjustmentPreset(name: string): ImageAdjustments | null {
  const key = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  const k = key(name);
  return ADJUSTMENT_PRESETS.find((p) => key(p.id) === k || key(p.label) === k)?.adjustments ?? null;
}

/**
 * Applies the adjustments to one colour, exactly as FigCraft's renderer does per pixel: exposure, contrast and
 * saturation, then temperature and tint, then highlights and shadows weighted by luminance.
 */
export function adjustColor(c: Color, adj: ImageAdjustments): Color {
  const f = sanitizeAdjustments(adj);
  const exposure = Math.pow(2, f.exposure * 2);
  const k = 1 + f.contrast;
  const sat = 1 + f.saturation;
  const temp = f.temperature * 0.15;
  const tint = f.tint * 0.15;
  const hi = f.highlights * 0.3;
  const sh = f.shadows * 0.3;
  let r = c.r * exposure;
  let g = c.g * exposure;
  let b = c.b * exposure;
  r = (r - 0.5) * k + 0.5;
  g = (g - 0.5) * k + 0.5;
  b = (b - 0.5) * k + 0.5;
  let l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r = l + (r - l) * sat;
  g = l + (g - l) * sat;
  b = l + (b - l) * sat;
  r += temp;
  b -= temp;
  g += tint;
  l = clamp01(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const add = hi * l * l + sh * (1 - l) * (1 - l);
  return color(r + add, g + add, b + add, c.a);
}

/**
 * The linear part of `adjustColor` (exposure, contrast, saturation, temperature, tint) as the 20 values of an SVG
 * `feColorMatrix`. It is exact; the highlights and shadows that follow depend on luminance and are drawn by
 * `adjustmentToneTable`.
 */
export function adjustmentMatrix(adj: ImageAdjustments): number[] {
  const f = sanitizeAdjustments(adj);
  const e = Math.pow(2, f.exposure * 2);
  const k = 1 + f.contrast;
  const s = 1 + f.saturation;
  const off = 0.5 * (1 - k);
  const L = [0.2126, 0.7152, 0.0722];
  // saturation matrix S = L·(1 - s) + I·s, applied to (k·e·x + off)
  const rows: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const row = [0, 1, 2].map((j) => (L[j] * (1 - s) + (i === j ? s : 0)) * k * e);
    const sumRow = [0, 1, 2].reduce((acc, j) => acc + (L[j] * (1 - s) + (i === j ? s : 0)), 0);
    const shift = i === 0 ? f.temperature * 0.15 : i === 1 ? f.tint * 0.15 : -f.temperature * 0.15;
    rows.push([...row, 0, sumRow * off + shift]);
  }
  rows.push([0, 0, 0, 1, 0]);
  return rows.flat().map((v) => Number(v.toFixed(6)));
}

/**
 * Highlights and shadows as an SVG `feComponentTransfer` table (the same curve on each channel, using the channel as
 * its own luminance: an approximation of FigCraft's luminance-weighted lift). Null when both are zero.
 */
export function adjustmentToneTable(adj: ImageAdjustments, steps = 16): number[] | null {
  const f = sanitizeAdjustments(adj);
  if (f.highlights === 0 && f.shadows === 0) return null;
  const hi = f.highlights * 0.3;
  const sh = f.shadows * 0.3;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const l = i / steps;
    return Number(clamp01(l + hi * l * l + sh * (1 - l) * (1 - l)).toFixed(4));
  });
}

// ---------------------------------------------------------------------------
// Image crop
// ---------------------------------------------------------------------------

/** A crop: the unit box → image uv mapping as a 2×3 matrix `[a, b, c, d, e, f]`. */
export type CropMatrix = [number, number, number, number, number, number];

/** The size of an image after a rotation by `quarterTurns` × 90°. */
export const rotatedSize = (iw: number, ih: number, quarterTurns: number): [number, number] => (((quarterTurns % 2) + 2) % 2 === 1 ? [ih, iw] : [iw, ih]);

/** The crop in effect: the stored one when usable, else the Fill placement (so switching to Crop keeps the picture where it was). */
export function effectiveCrop(stored: CropMatrix | null | undefined, iw: number, ih: number, w: number, h: number, quarterTurns = 0): CropMatrix {
  if (stored && stored.every(Number.isFinite) && Math.abs(stored[0]) > 1e-9 && Math.abs(stored[3]) > 1e-9) return stored;
  const [rw, rh] = rotatedSize(Math.max(1, iw), Math.max(1, ih), quarterTurns);
  const W = Math.max(1e-6, w);
  const H = Math.max(1e-6, h);
  const s = Math.max(W / rw, H / rh);
  const x0 = (W - rw * s) / 2;
  const y0 = (H - rh * s) / 2;
  return [W / (rw * s), 0, 0, H / (rh * s), -x0 / (rw * s), -y0 / (rh * s)];
}

/** The image's rectangle in the unit box (x0, y0, x1, y1) for an axis-aligned crop. */
export function cropRect(c: CropMatrix): [number, number, number, number] {
  const [a, , , d, e, f] = c;
  return [-e / a, -f / d, (1 - e) / a, (1 - f) / d];
}

/** The crop that places the image at (x0, y0, x1, y1) in the unit box. */
export function cropFromRect(x0: number, y0: number, x1: number, y1: number): CropMatrix {
  const a = 1 / Math.max(1e-6, Math.abs(x1 - x0));
  const d = 1 / Math.max(1e-6, Math.abs(y1 - y0));
  const lx = Math.min(x0, x1);
  const ly = Math.min(y0, y1);
  return [a, 0, 0, d, -lx * a, -ly * d];
}

// ---------------------------------------------------------------------------
// Pattern tiling
// ---------------------------------------------------------------------------

export type PatternTile = "grid" | "horizontalHex" | "verticalHex";
export type PatternAlign = "start" | "center" | "end";

export interface PatternSettings {
  tile: PatternTile;
  /** Tile scale, 1 = the source's own size. */
  scale: number;
  /** Gap between tiles (horizontal, vertical), in px. */
  spacing: [number, number];
  align: PatternAlign;
}

export const PATTERN_SCALE_RANGE: [number, number] = [0.01, 100];
export const PATTERN_MAX_SPACING = 10_000;
export const defaultPattern = (): PatternSettings => ({ tile: "grid", scale: 1, spacing: [0, 0], align: "start" });

/** One repeating cell: `size` repeats from `origin`, and the source is drawn at each of `tiles`, scaled by `scale`. */
export interface PatternCell {
  size: [number, number];
  origin: [number, number];
  tiles: [number, number][];
  scale: number;
}

/** The cell for a `tw`×`th` source filling a `w`×`h` box; null when the source has no size. */
export function patternCell(p: PatternSettings, tw: number, th: number, w: number, h: number): PatternCell | null {
  const [lo, hi] = PATTERN_SCALE_RANGE;
  const scale = Number.isFinite(p.scale) ? Math.min(hi, Math.max(lo, p.scale)) : 1;
  const gap = (v: number) => (Number.isFinite(v) ? Math.min(PATTERN_MAX_SPACING, Math.max(0, v)) : 0);
  const sw = tw * scale;
  const sh = th * scale;
  if (!(Number.isFinite(sw) && Number.isFinite(sh) && sw > 1e-6 && sh > 1e-6)) return null;
  const px = sw + gap(p.spacing[0]);
  const py = sh + gap(p.spacing[1]);
  let size: [number, number];
  let tiles: [number, number][];
  if (p.tile === "horizontalHex") {
    size = [px, py * 2];
    tiles = [[0, 0], [px / 2, py], [-px / 2, py]];
  } else if (p.tile === "verticalHex") {
    size = [px * 2, py];
    tiles = [[0, 0], [px, py / 2], [px, -py / 2]];
  } else {
    size = [px, py];
    tiles = [[0, 0]];
  }
  const k = p.align === "center" ? 0.5 : p.align === "end" ? 1 : 0;
  const fin = (v: number) => (Number.isFinite(v) ? v : 0);
  return { size, origin: [fin((w - sw) * k), fin((h - sh) * k)], tiles, scale };
}
