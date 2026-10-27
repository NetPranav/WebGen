/**
 * Dev Mode inspection (FigCraft port F13): a layer's properties grouped for handoff (layout, auto layout, typography,
 * fills, strokes, effects), each with the style or variable behind it when there is one, colours in the format asked
 * for (hex, RGB, CSS, HSL, HSB), lengths in px or rem; and the layer's CSS, where a property bound to a variable is
 * written with the variable's code syntax and its value as the fallback (`var(--space-xs, 4px)`).
 *
 * Behaviour translated from FigCraft (`crates/engine/src/devinspect.rs`, `inspect.rs`, the code syntax of
 * `variables_behaviour_tests.rs`), commit 6ea44e9. MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Layer, MotionDocument } from "../document/schema";
import { colorToHsb, colorToHsl, parseCss, toCssHex, type Color } from "../paint/color";
import { effectiveFills, parseShadows } from "../paint/paints";
import { parseEffects } from "../paint/effects";
import { codeSyntaxOf, type StyleDef, type Variable } from "../tokens/tokens";
import { RenderTree } from "../render/RenderLayer";

export type ColorFormat = "hex" | "rgb" | "css" | "hsl" | "hsb";
export const COLOR_FORMATS: readonly ColorFormat[] = ["hex", "rgb", "css", "hsl", "hsb"];

export interface InspectOptions {
  colorFormat?: ColorFormat;
  /** Lengths in px (the default) or rem. */
  unit?: "px" | "rem";
  /** How many px a rem is (16). */
  remBase?: number;
}

export interface Prop {
  label: string;
  value: string;
  /** A swatch: the colour as CSS. */
  color?: string;
  /** The style or variable the value comes from. */
  token?: string;
}
export interface Section {
  title: string;
  rows: Prop[];
}

/** A number as a designer reads it: at most two decimals, no trailing zeros. */
export function num(v: number): string {
  if (!Number.isFinite(v)) return "0";
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
}

/** A colour in a format; a translucent one gets its opacity after it as " · 50%" (CSS puts it in `rgba`). */
export function formatColor(css: string, fmt: ColorFormat = "hex"): string {
  const c: Color | null = parseCss(css);
  if (!c) return css;
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const alpha = c.a < 0.999;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  let body: string;
  if (fmt === "css") return alpha ? `rgba(${r}, ${g}, ${b}, ${num(c.a)})` : `rgb(${r}, ${g}, ${b})`;
  if (fmt === "rgb") body = `${r}, ${g}, ${b}`;
  else if (fmt === "hsl") {
    const x = colorToHsl(c);
    body = `${Math.round(x.h)}, ${pct(x.s)}, ${pct(x.l)}`;
  } else if (fmt === "hsb") {
    const x = colorToHsb(c);
    body = `${Math.round(x.h)}, ${pct(x.s)}, ${pct(x.b)}`;
  } else body = toCssHex({ ...c, a: 1 }).toUpperCase();
  return alpha ? `${body} · ${pct(c.a)}` : body;
}

type Doc = Pick<MotionDocument, "variables" | "styles">;

/** The variable a property follows (bound, not detached), if any. */
function variableOf(doc: Doc, l: Layer, path: string): Variable | undefined {
  const b = l.tokens?.[path];
  return b && !b.detached ? (doc.variables?.[b.variable] as Variable | undefined) : undefined;
}
const styleName = (doc: Doc, l: Layer, slot: string): string | undefined => {
  const id = (l.styleRefs as Record<string, string> | undefined)?.[slot];
  return id ? (doc.styles?.[id] as StyleDef | undefined)?.name : undefined;
};

/**
 * The layer's properties for handoff, from `resolved` (the layer as drawn: tokens and the breakpoint applied) and `own`
 * (the layer as stored, for its bindings and style links). `size` is its size on the page when known.
 */
export function inspectLayer(doc: Doc, own: Layer, resolved: Layer, size?: { w: number; h: number }, options: InspectOptions = {}): Section[] {
  const fmt = options.colorFormat ?? "hex";
  const base = options.remBase && options.remBase > 0 ? options.remBase : 16;
  const len = (v: unknown) => (typeof v === "number" ? (options.unit === "rem" ? `${num(v / base)}rem` : num(v)) : "");
  const p = resolved.properties;
  const tok = (path: string) => variableOf(doc, own, path)?.name;
  const row = (label: string, value: string, extra: Partial<Prop> = {}): Prop => ({ label, value, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined)) });
  const out: Section[] = [];

  const layout: Prop[] = [
    row("Width", len(size?.w ?? p["frame.width"]), { token: tok("frame.width") }),
    row("Height", len(size?.h ?? p["frame.height"]), { token: tok("frame.height") }),
  ];
  if (p.positioning === "absolute") layout.push(row("X", len(p["frame.x"])), row("Y", len(p["frame.y"])));
  if (typeof p["frame.rotation"] === "number" && p["frame.rotation"] !== 0) layout.push(row("Rotation", `${num(p["frame.rotation"])}°`));
  if (typeof p["appearance.opacity"] === "number" && p["appearance.opacity"] < 1) layout.push(row("Opacity", `${Math.round(p["appearance.opacity"] * 100)}%`, { token: tok("appearance.opacity") }));
  const radius = p["appearance.radius"] ?? p["shape.cornerRadius"];
  if (typeof radius === "number" && radius > 0) layout.push(row("Radius", len(radius), { token: tok("appearance.radius") ?? tok("shape.cornerRadius") }));
  out.push({ title: "Layout", rows: layout });

  if (p["layout.auto"] === true) {
    const pad = ["layout.paddingTop", "layout.paddingRight", "layout.paddingBottom", "layout.paddingLeft"].map((k) => p[k] ?? p["layout.padding"] ?? 0);
    out.push({
      title: "Auto layout",
      rows: [
        row("Direction", p["layout.flexDirection"] === "row" ? "horizontal" : "vertical"),
        row("Gap", String(p["layout.justifyContent"]).startsWith("space") ? "auto" : len(p["layout.gap"] ?? 0), { token: tok("layout.gap") }),
        row("Padding", pad.every((v) => v === pad[0]) ? len(pad[0]) : pad.map(len).join(" "), { token: tok("layout.padding") }),
        ...(p["layout.flexWrap"] === "wrap" ? [row("Wrap", "on")] : []),
      ],
    });
  }

  if (resolved.archetype === "text" || resolved.archetype === "button" || resolved.archetype === "badge") {
    const lh = p["typography.lineHeight"];
    const lhUnit = p["typography.lineHeightUnit"];
    out.push({
      title: "Typography",
      rows: [
        row("Font", [p["typography.fontFamily"] ?? "Inter", p["typography.fontWeight"] ?? "400", p["typography.fontStyle"] === "italic" ? "italic" : ""].filter(Boolean).join(" "), { token: styleName(doc, own, "text") ?? tok("typography.fontFamily") }),
        row("Size", len(p["typography.fontSize"] ?? 16), { token: tok("typography.fontSize") }),
        row("Line height", typeof lh === "number" ? (lhUnit === "px" ? len(lh) : lhUnit === "%" ? `${num(lh)}%` : `${num(lh * 100)}%`) : "auto"),
        ...(typeof p["typography.letterSpacing"] === "number" && p["typography.letterSpacing"] !== 0 ? [row("Letter spacing", len(p["typography.letterSpacing"]))] : []),
        ...(p["typography.textAlign"] && p["typography.textAlign"] !== "left" ? [row("Align", String(p["typography.textAlign"]))] : []),
      ],
    });
  }

  // fills: the list, else the plain colour; the fill style or the colour's variable on the first row
  const plainFill = resolved.archetype === "text" ? undefined : String(p["appearance.background.color"] ?? p["svg.fill"] ?? "");
  const fills = resolved.archetype === "text" ? (typeof p["typography.color"] === "string" ? [{ type: "solid" as const, color: p["typography.color"] as string, opacity: 1, visible: true }] : []) : effectiveFills(p["paint.fills"], plainFill && plainFill !== "transparent" ? plainFill : undefined);
  const paintRows = (list: typeof fills) =>
    list
      .filter((x) => x.visible !== false)
      .map((x) => {
        if (x.type === "solid") return row("Solid", formatColor(x.color, fmt), { color: x.color });
        if (x.type === "image") return row("Image", `${Math.round((x.opacity ?? 1) * 100)}%`);
        const kind = x.type[0].toUpperCase() + x.type.slice(1);
        return row(kind, x.stops.map((s) => `${formatColor(s.color, fmt)} ${Math.round(s.at * 100)}%`).join(", "), { color: x.stops[0]?.color });
      });
  const fillRows = paintRows(fills);
  if (fillRows.length > 0) {
    fillRows[0].token = styleName(doc, own, "fill") ?? tok(resolved.archetype === "text" ? "typography.color" : own.properties["svg.fill"] !== undefined ? "svg.fill" : "appearance.background.color") ?? fillRows[0].token;
    if (!fillRows[0].token) delete fillRows[0].token;
    out.push({ title: "Fills", rows: fillRows });
  }
  const strokeColor = p["svg.stroke"] ?? (Number(p["appearance.border.width"]) > 0 ? p["appearance.border.color"] : undefined);
  const strokes = paintRows(effectiveFills(p["paint.strokes"], typeof strokeColor === "string" && strokeColor !== "none" ? strokeColor : undefined));
  if (strokes.length > 0) {
    const weight = p["svg.strokeWidth"] ?? p["appearance.border.width"] ?? 1;
    strokes.push(row("Weight", `${len(weight)} ${p["stroke.align"] ?? (resolved.archetype === "container" ? "inside" : "center")}`, { token: tok("svg.strokeWidth") ?? tok("appearance.border.width") }));
    if (styleName(doc, own, "stroke")) strokes[0].token = styleName(doc, own, "stroke");
    out.push({ title: "Strokes", rows: strokes });
  }

  const effects: Prop[] = [];
  for (const s of parseShadows(p["paint.shadows"])) if (s.visible) effects.push(row(s.kind === "inner" ? "Inner shadow" : "Drop shadow", `${num(s.x)} ${num(s.y)} ${num(s.blur)} ${num(s.spread)} ${formatColor(s.color, fmt)}`, { color: s.color }));
  if (typeof p["filter.blur"] === "number" && p["filter.blur"] > 0) effects.push(row("Layer blur", num(p["filter.blur"])));
  if (typeof p["paint.backgroundBlur"] === "number" && p["paint.backgroundBlur"] > 0) effects.push(row("Background blur", num(p["paint.backgroundBlur"])));
  const pct = (v: number) => Math.round(v * 100);
  for (const e of parseEffects(p["paint.effects"])) {
    if (!e.visible) continue;
    if (e.type === "layerBlur" || e.type === "backgroundBlur") {
      const label = e.type === "layerBlur" ? "Layer blur" : "Background blur";
      effects.push(row(label, e.blurType === "progressive" ? `Progressive ${num(e.startRadius)} → ${num(e.radius)} from ${pct(e.start[0])}% ${pct(e.start[1])}% to ${pct(e.end[0])}% ${pct(e.end[1])}%` : num(e.radius)));
    } else if (e.type === "noise") {
      const grain = e.sizeY !== undefined && e.sizeY !== e.size ? `${num(e.size)}×${num(e.sizeY)}` : num(e.size);
      const colors = e.mode === "mono" ? formatColor(e.color, fmt) : e.mode === "duo" ? `${formatColor(e.color, fmt)} ${formatColor(e.secondary, fmt)}` : `${pct(e.opacity)}%`;
      effects.push(row("Noise", `${e.mode[0].toUpperCase()}${e.mode.slice(1)} ${grain} ${pct(e.density)}% ${colors}`, e.mode === "multi" ? {} : { color: e.color }));
    } else if (e.type === "texture") effects.push(row("Texture", `${num(e.size)} ${num(e.radius)}${e.clipToShape ? " clipped" : ""}`));
    else effects.push(row("Glass", `${num(e.lightAngle)}° ${pct(e.lightIntensity)}% refraction ${pct(e.refraction)}% depth ${num(e.depth)} dispersion ${pct(e.dispersion)}% frost ${num(e.frost)} splay ${pct(e.splay)}%`));
  }
  if (effects.length > 0) {
    const s = styleName(doc, own, "effect");
    if (s) effects[0].token = s;
    out.push({ title: "Effects", rows: effects });
  }
  return out;
}

/** The CSS property a bound layer property is written as (for `var()` with the variable's code syntax). */
const CSS_OF: Record<string, string> = {
  "appearance.background.color": "background-color",
  "typography.color": "color",
  "appearance.border.color": "border-color",
  "appearance.radius": "border-radius",
  "layout.gap": "gap",
  "layout.padding": "padding",
  "typography.fontSize": "font-size",
  "typography.fontFamily": "font-family",
  "typography.letterSpacing": "letter-spacing",
  "appearance.opacity": "opacity",
  "frame.width": "width",
  "frame.height": "height",
  "appearance.border.width": "border-width",
};

/**
 * The layer's CSS as the stage draws it (its own element's declarations, its place in the parent left out), with each
 * property bound to a variable written as `var(<web code syntax>, <value>)`.
 */
export function layerCss(doc: Doc, own: Layer, layers: Record<string, Layer>): string {
  const l = layers[own.id];
  if (!l) return "";
  const alone = { ...layers, [own.id]: { ...l, parentId: null, children: [], properties: { ...l.properties, positioning: "absolute", "frame.x": 0, "frame.y": 0 } } };
  const html = renderToStaticMarkup(React.createElement(RenderTree, { layers: alone, rootIds: [own.id], ctx: { frameAtOrigin: true } }));
  const style = /style="([^"]*)"/.exec(html)?.[1]?.replace(/&quot;/g, '"').replace(/&amp;/g, "&") ?? "";
  const decls = new Map<string, string>();
  for (const part of style.split(/;(?![^(]*\))/)) {
    const i = part.indexOf(":");
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    if (["position", "left", "top", "box-sizing", "flex-shrink"].includes(k)) continue;
    decls.set(k, part.slice(i + 1).trim());
  }
  for (const [path, css] of Object.entries(CSS_OF)) {
    const v = variableOf(doc, own, path);
    if (v && decls.has(css)) decls.set(css, `var(${codeSyntaxOf(v).replace(/^var\((.*)\)$/, "$1")}, ${decls.get(css)})`);
  }
  return [...decls].map(([k, v]) => `${k}: ${v};`).join("\n");
}
