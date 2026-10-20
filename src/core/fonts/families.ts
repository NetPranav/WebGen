/**
 * Font families in documents (ROADMAP Phase 38): reading the family a layer names, deciding where it comes from (a
 * font file imported into the project, the Google catalog, or the system), building the stylesheet URL and the
 * `@font-face` rules, and the variation settings of a variable font. Pure: no DOM, no network.
 */

import type { AssetEntry, Layer } from "../document/schema";
import { FONT_DISPLAYS, findCatalogFont, type CatalogFont, type FontAxis, type FontDisplay } from "./catalog";

/** A family name that is safe to put in a URL and a stylesheet: letters, digits, spaces, hyphens, at most 80. */
export function sanitizeFamily(name: string): string | null {
  const t = name.trim().replace(/\s+/g, " ");
  return /^[A-Za-z0-9][A-Za-z0-9 \-]{0,79}$/.test(t) ? t : null;
}

/** The first family of a CSS `font-family` value: `'Playfair Display', serif` is `Playfair Display`. */
export function primaryFamily(value: string): string | null {
  const first = value.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? "";
  return first === "" || first === "inherit" ? null : first;
}

/** The CSS value for a family with a fallback of its kind: `'Playfair Display', serif`. */
export function familyCss(family: string, category: string): string {
  const name = /^[A-Za-z0-9-]+$/.test(family) ? family : `'${family.replace(/['\\]/g, "")}'`;
  return `${name}, ${category === "display" || category === "handwriting" ? "cursive" : category}`;
}

/** The family name an imported font file answers to: its file name without the extension. */
export function assetFamily(entry: Pick<AssetEntry, "name">): string | null {
  return sanitizeFamily(entry.name.replace(/\.(woff2?|ttf|otf)$/i, "").replace(/[_]+/g, " "));
}

export interface FontPlan {
  /** Catalog families in use, with the weights the document asks of each. */
  google: { font: CatalogFont; weights: number[] }[];
  /** Imported font files in use. */
  uploads: AssetEntry[];
}

const textWeight = (layer: Layer): number => {
  const w = layer.properties["typography.fontWeight"];
  const n = typeof w === "number" ? w : Number(w);
  return Number.isFinite(n) && n >= 1 && n <= 1000 ? Math.round(n / 100) * 100 : layer.properties["typography.format.bold"] === true ? 700 : 400;
};

/** Which fonts the document needs: every family a layer names, sorted into imported files and catalog fonts. */
export function fontPlan(layers: Record<string, Layer>, assets: Record<string, AssetEntry> | undefined): FontPlan {
  const files = new Map<string, AssetEntry>();
  for (const a of Object.values(assets ?? {})) {
    if (a.kind !== "font") continue;
    const fam = assetFamily(a);
    if (fam) files.set(fam.toLowerCase(), a);
  }
  const usedUploads = new Map<string, AssetEntry>();
  const weights = new Map<CatalogFont, Set<number>>();
  for (const layer of Object.values(layers)) {
    const raw = layer.properties["typography.fontFamily"];
    if (typeof raw !== "string") continue;
    const family = primaryFamily(raw);
    if (!family) continue;
    const file = files.get(family.toLowerCase());
    if (file) {
      usedUploads.set(file.id, file);
      continue;
    }
    const font = findCatalogFont(family);
    if (!font) continue;
    const set = weights.get(font) ?? new Set<number>([400, 700]);
    set.add(textWeight(layer));
    // styled runs can be bold whatever the layer's weight is
    weights.set(font, set);
  }
  return {
    google: [...weights].map(([font, set]) => ({ font, weights: [...set].filter((w) => font.weights.includes(w) || font.variable).sort((a, b) => a - b) })).sort((a, b) => a.font.family.localeCompare(b.font.family)),
    uploads: [...usedUploads.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** A key that changes exactly when the stylesheets needed change. */
export function planKey(plan: FontPlan, display: FontDisplay): string {
  return `${display}|${plan.google.map((g) => `${g.font.family}:${g.weights.join(",")}`).join(";")}|${plan.uploads.map((u) => u.id).join(",")}`;
}

/** The Google Fonts stylesheet URL for a plan, or null when no catalog font is used. Axes are sorted as the service requires. */
export function googleFontsUrl(plan: FontPlan, display: FontDisplay): string | null {
  if (plan.google.length === 0) return null;
  const parts = plan.google.map(({ font, weights }) => {
    const name = encodeURIComponent(font.family).replace(/%20/g, "+");
    if (font.variable) {
      const lo = font.weights[0];
      const hi = font.weights[font.weights.length - 1];
      const axes = [...(font.axes ?? []).map((a) => ({ tag: a.tag, value: `${a.min}..${a.max}` })), { tag: "wght", value: `${lo}..${hi}` }].sort((a, b) => a.tag.localeCompare(b.tag));
      return `family=${name}:${axes.map((a) => a.tag).join(",")}@${axes.map((a) => a.value).join(",")}`;
    }
    return `family=${name}:wght@${(weights.length ? weights : [400]).join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=${FONT_DISPLAYS.includes(display) ? display : "swap"}`;
}

/** `@font-face` rules for imported fonts, loading from the given URLs (by asset id). A file with no URL yet is left out. */
export function fontFaceCss(uploads: readonly AssetEntry[], urlOf: (id: string) => string | null, display: FontDisplay): string {
  return uploads
    .map((a) => {
      const family = assetFamily(a);
      const url = urlOf(a.id);
      if (!family || !url || !/^(blob:|data:font\/)/.test(url)) return "";
      const format = a.mime === "font/woff2" ? "woff2" : a.mime === "font/woff" ? "woff" : a.mime === "font/otf" ? "opentype" : "truetype";
      return `@font-face{font-family:"${family}";src:url("${url}") format("${format}");font-weight:100 900;font-style:normal;font-display:${display}}`;
    })
    .filter(Boolean)
    .join("\n");
}

const TAG = /^[A-Za-z0-9 ]{4}$/;

/** `wdth 87, opsz 14` as stored on a layer, read into numbers. Anything that isn't `tag number` is dropped. */
export function parseVariations(value: string): { tag: string; value: number }[] {
  const out = new Map<string, number>();
  for (const part of value.split(",")) {
    const m = /^\s*"?([A-Za-z0-9 ]{4})"?\s+(-?\d+(?:\.\d+)?)\s*$/.exec(part);
    if (m && TAG.test(m[1])) out.set(m[1], Math.max(-1000, Math.min(10_000, Number(m[2]))));
  }
  return [...out].slice(0, 16).map(([tag, v]) => ({ tag, value: v }));
}

export function serializeVariations(values: readonly { tag: string; value: number }[]): string {
  return values.map((v) => `${v.tag} ${Number(v.value.toFixed(2))}`).join(", ");
}

/** CSS `font-variation-settings` for a stored value, or undefined when it is empty. */
export function variationCss(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = parseVariations(value);
  return v.length ? v.map((x) => `"${x.tag}" ${x.value}`).join(", ") : undefined;
}

/** The axes a family offers, other than weight. Imported fonts and static ones offer none. */
export function axesFor(family: string | null): readonly FontAxis[] {
  return (family && findCatalogFont(family)?.axes) || [];
}

/** The weights to offer for a family: the catalog's, every hundred for an imported font, the usual nine for anything else. */
export function weightsFor(family: string | null, uploaded: boolean): readonly number[] {
  if (family && !uploaded) {
    const font = findCatalogFont(family);
    if (font) return font.weights;
  }
  return [100, 200, 300, 400, 500, 600, 700, 800, 900];
}
