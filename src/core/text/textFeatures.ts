/**
 * Text settings beyond Phase 31 (FigCraft port F8): lists (bulleted and numbered, nested up to eight levels, numbers
 * that start where asked), case (title case and small caps beside upper and lower), OpenType feature toggles,
 * paragraph spacing and indent, and text that follows a path. The browser shapes and lays out the text; this file is
 * the model and the rules: which marker each paragraph gets, how text reads in a case, the CSS for the features, and
 * the text path (its start, and the path reversed for the other side).
 *
 * Behaviour translated from FigCraft (`crates/doc/src/text.rs`, `crates/text/src/layout.rs` `list_markers`,
 * `tail_tests.rs`, `list_tests.rs`), commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft
 * contributors. See THIRD_PARTY_NOTICES.md.
 */

import { pathDataToBez } from "../paths/bezBridge";
import type { TextRun } from "./runs";

export type ListStyle = "none" | "bulleted" | "numbered";
export const LIST_STYLES: readonly ListStyle[] = ["none", "bulleted", "numbered"];

/** Deepest list nesting (levels 0..MAX_LIST_INDENT). */
export const MAX_LIST_INDENT = 8;

/** One paragraph's list settings. */
export interface ParaList {
  list: ListStyle;
  /** Nesting level (0 = outermost; plain paragraphs are always 0). */
  indent: number;
  /** A numbered list that starts counting at this paragraph counts from `startOffset + 1`. */
  startOffset?: number;
}

const BULLETS = ["•", "◦", "▪"];

/** a, b, … z, aa, ab, … */
export function alpha(n: number): string {
  let out = "";
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

/** Lower-case roman numerals (past 3999: the number). */
export function roman(n: number): string {
  if (n === 0 || n > 3999) return String(n);
  let out = "";
  for (const [v, r] of [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]] as const) {
    while (n >= v) {
      out += r;
      n -= v;
    }
  }
  return out;
}

/**
 * The markers of a text's paragraphs ("" for plain ones). Numbers count the items of one list at one level, restarting
 * after a plain paragraph, a shallower item or the other kind of list, from the first item's start number; levels go
 * 1. a. i. and • ◦ ▪, then round again (FigCraft `list_markers`).
 */
export function listMarkers(lists: readonly ParaList[]): string[] {
  const count: [ListStyle, number][] = Array.from({ length: MAX_LIST_INDENT + 1 }, () => ["none", 0]);
  return lists.map((pl) => {
    if (pl.list === "none") {
      for (const c of count) [c[0], c[1]] = ["none", 0];
      return "";
    }
    const d = Math.min(Math.max(0, Math.floor(pl.indent) || 0), count.length - 1);
    for (let i = d + 1; i < count.length; i++) count[i] = ["none", 0];
    const c = count[d];
    const start = Number.isFinite(pl.startOffset) ? Math.max(0, Math.floor(pl.startOffset!)) : 0;
    count[d] = c[0] === pl.list ? [pl.list, c[1] + 1] : [pl.list, start + 1];
    const n = count[d][1];
    if (pl.list === "numbered") return d % 3 === 1 ? `${alpha(n)}.` : d % 3 === 2 ? `${roman(n)}.` : `${n}.`;
    return BULLETS[d % 3];
  });
}

/** The paragraphs of a text (split at line breaks; an empty text is one empty paragraph). */
export const paragraphsOf = (text: string): string[] => text.split("\n");

/**
 * Each paragraph's list settings: its own from `stored` (a JSON list by paragraph index), else the text's `list` at
 * level 0. Junk is repaired: unknown styles are plain, levels clamp to 0..MAX_LIST_INDENT, plain paragraphs sit at 0.
 */
export function paragraphLists(stored: unknown, count: number, list: unknown): ParaList[] {
  const base: ListStyle = LIST_STYLES.includes(list as ListStyle) ? (list as ListStyle) : "none";
  let raw: unknown[] = [];
  if (typeof stored === "string" && stored && stored.length <= 200_000) {
    try {
      const v = JSON.parse(stored);
      if (Array.isArray(v)) raw = v;
    } catch {
      /* junk: every paragraph takes the base */
    }
  }
  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    const o = raw[i] && typeof raw[i] === "object" ? (raw[i] as Record<string, unknown>) : null;
    const style: ListStyle = o && LIST_STYLES.includes(o.list as ListStyle) ? (o.list as ListStyle) : base;
    if (style === "none") return { list: "none", indent: 0 };
    const indent = o && typeof o.indent === "number" && Number.isFinite(o.indent) ? Math.min(MAX_LIST_INDENT, Math.max(0, Math.floor(o.indent))) : 0;
    const startOffset = o && typeof o.startOffset === "number" && Number.isFinite(o.startOffset) && o.startOffset > 0 ? Math.min(4_294_967_295, Math.floor(o.startOffset)) : undefined;
    return { list: style, indent, ...(startOffset ? { startOffset } : {}) };
  });
}

/** The list settings stored for paragraphs: empty when every paragraph is `base` at level 0 with no start. */
export function serializeParagraphLists(lists: readonly ParaList[], base: ListStyle): string {
  if (lists.every((l) => l.list === base && (l.list === "none" || l.indent === 0) && !l.startOffset)) return "";
  return JSON.stringify(lists.map((l) => (l.list === "none" ? { list: "none" } : { list: l.list, indent: l.indent, ...(l.startOffset ? { startOffset: l.startOffset } : {}) })));
}

/**
 * The width of one list level's gutter (px): room for the widest number plus half an em, at least one and a half
 * ems (0 without lists). The browser measures nothing here, so a digit counts as 0.6 em (FigCraft's fallback without a face).
 */
export function listGutter(lists: readonly ParaList[], markers: readonly string[], fontSize: number): number {
  if (lists.every((l) => l.list === "none")) return 0;
  const size = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 12;
  const widest = lists.reduce((w, l, i) => (l.list === "numbered" ? Math.max(w, size * 0.6 * [...markers[i]].length) : w), 0);
  return Math.max(widest + size * 0.5, size * 1.5);
}

// --- case -----------------------------------------------------------------------------------

export type TextCase = "original" | "upper" | "lower" | "title" | "smallCaps";

/** Letters, digits and apostrophes continue a word (so "don't" stays "Don't"). */
const isWordChar = (c: string) => /[\p{L}\p{N}'’]/u.test(c);

/** Text in a case, following `prev` (so title case only capitalises the first letter of each word across runs). */
export function applyCase(c: TextCase, s: string, prev?: string): string {
  if (c === "upper") return s.toUpperCase();
  if (c === "lower") return s.toLowerCase();
  if (c !== "title") return s;
  let out = "";
  let start = prev === undefined || !isWordChar(prev);
  for (const ch of s) {
    if (start && /[\p{L}\p{N}]/u.test(ch)) {
      out += ch.toUpperCase();
      start = false;
    } else {
      out += ch;
      start = !isWordChar(ch);
    }
  }
  return out;
}

// --- OpenType features --------------------------------------------------------------------------

/** The feature toggles the panel offers: tag and label. */
export const FEATURES: readonly (readonly [string, string])[] = [
  ["liga", "Ligatures"],
  ["calt", "Contextual alternates"],
  ["dlig", "Discretionary ligatures"],
  ["tnum", "Tabular numbers"],
  ["pnum", "Proportional numbers"],
  ["lnum", "Lining numbers"],
  ["onum", "Old-style numbers"],
  ["zero", "Slashed zero"],
  ["frac", "Fractions"],
  ["sups", "Superscript"],
  ["subs", "Subscript"],
  ["ss01", "Stylistic set 1"],
  ["ss02", "Stylistic set 2"],
  ["case", "Case-sensitive forms"],
];

/** Feature toggles from their stored JSON (`{"liga": false}`): four-character tags only. */
export function parseFeatures(json: unknown): Record<string, boolean> {
  if (typeof json !== "string" || !json || json.length > 2000) return {};
  try {
    const v = JSON.parse(json) as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, boolean> = {};
    for (const [k, on] of Object.entries(v)) if (/^[a-z0-9]{4}$/.test(k) && typeof on === "boolean" && Object.keys(out).length < 40) out[k] = on;
    return out;
  } catch {
    return {};
  }
}

/** The CSS `font-feature-settings` for toggles, or undefined for none. */
export function featureCss(features: Record<string, boolean>): string | undefined {
  const keys = Object.keys(features).sort();
  return keys.length === 0 ? undefined : keys.map((k) => `"${k}" ${features[k] ? 1 : 0}`).join(", ");
}

// --- text on a path ----------------------------------------------------------------------------

export interface TextPath {
  /** SVG path data in the layer's own space. */
  d: string;
  /** Where the text starts along the path, 0..1 by length. */
  start: number;
  /** On the other side of the path, running the other way. */
  flip: boolean;
}

/** A text path from its stored JSON, or null (no path, or path data that doesn't parse). */
export function parseTextPath(json: unknown): TextPath | null {
  if (typeof json !== "string" || !json || json.length > 100_000) return null;
  try {
    const v = JSON.parse(json) as Record<string, unknown>;
    if (!v || typeof v.d !== "string" || !pathDataToBez(v.d)) return null;
    return { d: v.d, start: typeof v.start === "number" && Number.isFinite(v.start) ? Math.min(1, Math.max(0, v.start)) : 0, flip: v.flip === true };
  } catch {
    return null;
  }
}

/** The path the text runs along: as drawn, or reversed (each subpath) for the other side. */
export function textPathD(tp: TextPath): string {
  if (!tp.flip) return tp.d;
  return pathDataToBez(tp.d)?.reverseSubpaths().toSvg() ?? tp.d;
}

// --- runs by paragraph ---------------------------------------------------------------------------

/** Styled runs cut into paragraphs at line breaks (a run that spans a break goes on in the next paragraph). */
export function runsByParagraph(runs: readonly TextRun[]): TextRun[][] {
  const out: TextRun[][] = [[]];
  for (const run of runs) {
    const parts = run.text.split("\n");
    parts.forEach((text, i) => {
      if (i > 0) out.push([]);
      if (text) out[out.length - 1].push({ ...run, text });
    });
  }
  return out;
}
