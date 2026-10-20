/**
 * The Google Fonts the picker offers (ROADMAP Phase 38): a curated list of the families people reach for, with the
 * weights each has and, for variable fonts, the axes and their ranges. It is data only: the stylesheet that fetches
 * a family is built from it by `googleFontsUrl`, and nothing is requested until a layer uses the family.
 */

export type FontCategory = "sans-serif" | "serif" | "monospace" | "display" | "handwriting";

export interface FontAxis {
  /** The four-letter tag: `wdth`, `opsz`, `slnt`... (`wght` is the weight and has its own control). */
  tag: string;
  name: string;
  min: number;
  max: number;
  default: number;
}

export interface CatalogFont {
  family: string;
  category: FontCategory;
  /** The weights it comes in. For a variable font these are the ends of its `wght` range and every hundred between. */
  weights: readonly number[];
  /** True when one file covers the whole weight range. */
  variable: boolean;
  /** Axes other than weight (variable fonts only). */
  axes?: readonly FontAxis[];
}

const W = (...w: number[]) => w;
const range = (lo: number, hi: number) => Array.from({ length: (hi - lo) / 100 + 1 }, (_, i) => lo + i * 100);
const wdth = (min: number, max: number): FontAxis => ({ tag: "wdth", name: "Width", min, max, default: 100 });
const opsz = (min: number, max: number, d: number): FontAxis => ({ tag: "opsz", name: "Optical size", min, max, default: d });

const f = (family: string, category: FontCategory, weights: readonly number[], variable = false, axes?: readonly FontAxis[]): CatalogFont => ({ family, category, weights, variable, ...(axes ? { axes } : {}) });

export const GOOGLE_FONTS: readonly CatalogFont[] = [
  f("Inter", "sans-serif", range(100, 900), true, [opsz(14, 32, 14)]),
  f("Roboto", "sans-serif", W(100, 300, 400, 500, 700, 900)),
  f("Roboto Flex", "sans-serif", range(100, 1000), true, [wdth(25, 151), opsz(8, 144, 14), { tag: "slnt", name: "Slant", min: -10, max: 0, default: 0 }]),
  f("Open Sans", "sans-serif", range(300, 800), true, [wdth(75, 100)]),
  f("Lato", "sans-serif", W(100, 300, 400, 700, 900)),
  f("Montserrat", "sans-serif", range(100, 900), true),
  f("Poppins", "sans-serif", range(100, 900)),
  f("Source Sans 3", "sans-serif", range(200, 900), true),
  f("Noto Sans", "sans-serif", range(100, 900), true, [wdth(62.5, 100)]),
  f("Work Sans", "sans-serif", range(100, 900), true),
  f("DM Sans", "sans-serif", range(100, 1000), true, [opsz(9, 40, 14)]),
  f("Manrope", "sans-serif", range(200, 800), true),
  f("Space Grotesk", "sans-serif", range(300, 700), true),
  f("Nunito", "sans-serif", range(200, 1000), true),
  f("Raleway", "sans-serif", range(100, 900), true),
  f("Rubik", "sans-serif", range(300, 900), true),
  f("Fira Sans", "sans-serif", range(100, 900)),
  f("IBM Plex Sans", "sans-serif", W(100, 200, 300, 400, 500, 600, 700)),
  f("Barlow", "sans-serif", range(100, 900)),
  f("Karla", "sans-serif", range(200, 800), true),
  f("Cabin", "sans-serif", range(400, 700), true, [wdth(75, 100)]),
  f("Quicksand", "sans-serif", range(300, 700), true),
  f("Josefin Sans", "sans-serif", range(100, 700), true),
  f("Archivo", "sans-serif", range(100, 900), true, [wdth(62, 125)]),
  f("Oswald", "sans-serif", range(200, 700), true),
  f("Playfair Display", "serif", range(400, 900), true),
  f("Merriweather", "serif", W(300, 400, 700, 900)),
  f("Lora", "serif", range(400, 700), true),
  f("PT Serif", "serif", W(400, 700)),
  f("Noto Serif", "serif", range(100, 900), true, [wdth(62.5, 100)]),
  f("Libre Baskerville", "serif", W(400, 700)),
  f("Crimson Text", "serif", W(400, 600, 700)),
  f("EB Garamond", "serif", range(400, 800), true),
  f("Roboto Mono", "monospace", range(100, 700), true),
  f("JetBrains Mono", "monospace", range(100, 800), true),
  f("Fira Code", "monospace", range(300, 700), true),
  f("IBM Plex Mono", "monospace", W(100, 200, 300, 400, 500, 600, 700)),
  f("Bebas Neue", "display", W(400)),
  f("Lobster", "display", W(400)),
  f("Pacifico", "handwriting", W(400)),
  f("Dancing Script", "handwriting", range(400, 700), true),
  f("Caveat", "handwriting", range(400, 700), true),
];

const BY_NAME = new Map(GOOGLE_FONTS.map((x) => [x.family.toLowerCase(), x]));

/** The catalog entry for a family name (any case), or undefined. */
export function findCatalogFont(family: string): CatalogFont | undefined {
  return BY_NAME.get(family.trim().toLowerCase());
}

/** Web-safe families that need no loading. */
export const SYSTEM_FONTS: readonly { family: string; category: FontCategory }[] = [
  { family: "system-ui", category: "sans-serif" },
  { family: "Arial", category: "sans-serif" },
  { family: "Helvetica", category: "sans-serif" },
  { family: "Verdana", category: "sans-serif" },
  { family: "Georgia", category: "serif" },
  { family: "Times New Roman", category: "serif" },
  { family: "Courier New", category: "monospace" },
];

export type FontDisplay = "swap" | "block" | "fallback" | "optional" | "auto";
export const FONT_DISPLAYS: readonly FontDisplay[] = ["swap", "block", "fallback", "optional", "auto"];
