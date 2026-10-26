/**
 * Effects beyond shadows (FigCraft port F7): layer and background blurs that can be progressive (the radius ramps
 * between two points), noise (mono, duo, multi), texture (roughened edges) and glass, as one list per layer
 * (`paint.effects`). Shadows stay where Phase 35 put them (`paint.shadows`), and so do the plain blurs (`filter.blur`,
 * `paint.backgroundBlur`); a blur in this list wins over the plain one.
 *
 * This file is the data and what the browser is asked to draw: the effect model with FigCraft's defaults and limits,
 * parsing (FigCraft's camel-case and snake-case names, old files, hostile values), how far each effect reaches, and
 * the drawing as SVG filters (noise, texture), backdrop layers with stepped masks (progressive blur) and CSS (glass,
 * an approximation: FigCraft draws it on the GPU, which our roadmap leaves to its compositor phase).
 *
 * Behaviour translated from FigCraft (`crates/doc/src/props.rs`, `blur_tests.rs`, `effects_tests.rs`), commit 6ea44e9.
 * MIT, Copyright (c) 2026 ArtCraft Team and the FigCraft contributors. See THIRD_PARTY_NOTICES.md.
 */

import { BLEND_MODES, blendCss, blendFromName, parseCss, toCss, type BlendMode } from "./color";

export type BlurType = "uniform" | "progressive";
export type Point = [number, number];

export interface Blur {
  /** The radius (progressive: at `end` and past it). */
  radius: number;
  blurType: BlurType;
  /** Progressive: the radius at `start` and before it. */
  startRadius: number;
  /** Progressive: where the ramp starts and ends, in the layer's unit box (0..1 across and down). */
  start: Point;
  end: Point;
}

export type NoiseMode = "mono" | "duo" | "multi";
export interface Noise {
  mode: NoiseMode;
  /** Grain size across (px); also down unless `sizeY` is set. */
  size: number;
  sizeY?: number;
  /** Share of grains drawn (0–1). */
  density: number;
  /** Mono and duo: the grains' colour. */
  color: string;
  /** Duo: the other grains' colour. */
  secondary: string;
  /** Multi: the grains' opacity (0–1). */
  opacity: number;
  blend: BlendMode;
}

export interface Texture {
  size: number;
  sizeY?: number;
  /** How far pixels scatter (px). */
  radius: number;
  /** Keep the texture inside the layer's own pixels. */
  clipToShape: boolean;
}

export interface Glass {
  /** Where the light comes from, in degrees clockwise from the top. */
  lightAngle: number;
  lightIntensity: number;
  refraction: number;
  /** How far the curved edge reaches in from the border (px, at least 1). */
  depth: number;
  dispersion: number;
  /** Blur of the backdrop (px). */
  frost: number;
  splay: number;
}

export type Effect =
  | ({ type: "layerBlur"; visible: boolean } & Blur)
  | ({ type: "backgroundBlur"; visible: boolean } & Blur)
  | ({ type: "noise"; visible: boolean } & Noise)
  | ({ type: "texture"; visible: boolean } & Texture)
  | ({ type: "glass"; visible: boolean } & Glass);
export type EffectType = Effect["type"];

/** The largest blur radius drawn (px); larger ones look the same anyway. */
export const MAX_BLUR_RADIUS = 10_000;
export const MAX_EFFECTS = 16;
const MAX_JSON = 50_000;

export const DEFAULT_BLUR: Blur = { radius: 4, blurType: "uniform", startRadius: 0, start: [0.5, 0], end: [0.5, 1] };
export const DEFAULT_NOISE: Noise = { mode: "mono", size: 0.5, density: 0.5, color: "rgba(0, 0, 0, 0.25)", secondary: "rgba(255, 255, 255, 0.25)", opacity: 0.25, blend: "normal" };
export const DEFAULT_TEXTURE: Texture = { size: 0.5, radius: 4, clipToShape: false };
export const DEFAULT_GLASS: Glass = { lightAngle: -45, lightIntensity: 0.8, refraction: 0.8, depth: 20, dispersion: 0.5, frost: 4, splay: 0 };

/** Effect types in the order the panel lists them: label and type (FigCraft `Effect::TYPES`, shadows excepted). */
export const EFFECT_TYPES: readonly (readonly [string, EffectType])[] = [
  ["Layer blur", "layerBlur"],
  ["Background blur", "backgroundBlur"],
  ["Noise", "noise"],
  ["Texture", "texture"],
  ["Glass", "glass"],
];

export const effectLabel = (e: Pick<Effect, "type">): string => EFFECT_TYPES.find(([, t]) => t === e.type)?.[0] ?? e.type;

/** A new effect of a type named like `layerBlur`, `layer blur` or `LAYER_BLUR` (`blur` is a layer blur), with its defaults. */
export function effectOfType(name: string): Effect | null {
  switch (name.toLowerCase().replace(/[_ -]/g, "")) {
    case "layerblur":
    case "blur":
      return { type: "layerBlur", visible: true, ...structuredClone(DEFAULT_BLUR) };
    case "backgroundblur":
      return { type: "backgroundBlur", visible: true, ...structuredClone(DEFAULT_BLUR) };
    case "noise":
      return { type: "noise", visible: true, ...structuredClone(DEFAULT_NOISE) };
    case "texture":
      return { type: "texture", visible: true, ...structuredClone(DEFAULT_TEXTURE) };
    case "glass":
      return { type: "glass", visible: true, ...structuredClone(DEFAULT_GLASS) };
    default:
      return null;
  }
}

// --- sanitising (FigCraft `sanitized`) --------------------------------------------------

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clampTo = (v: unknown, def: number, lo: number, hi: number) => (fin(v) ? Math.min(hi, Math.max(lo, v)) : def);

/** Radii finite in 0..MAX_BLUR_RADIUS, points finite (non-finite at their defaults) within a thousand boxes of the layer. */
export function sanitizeBlur(b: Partial<Blur>): Blur {
  const radius = (v: unknown) => (fin(v) ? Math.min(MAX_BLUR_RADIUS, Math.max(0, v)) : 0);
  const point = (p: unknown, def: Point): Point => {
    const a = Array.isArray(p) ? p : [];
    return [clampTo(a[0], def[0], -1000, 1000), clampTo(a[1], def[1], -1000, 1000)];
  };
  return { radius: radius(b.radius), blurType: b.blurType === "progressive" ? "progressive" : "uniform", startRadius: radius(b.startRadius), start: point(b.start, DEFAULT_BLUR.start), end: point(b.end, DEFAULT_BLUR.end) };
}

export function sanitizeGlass(g: Partial<Glass>): Glass {
  const d = DEFAULT_GLASS;
  return {
    lightAngle: clampTo(g.lightAngle, d.lightAngle, -3600, 3600),
    lightIntensity: clampTo(g.lightIntensity, d.lightIntensity, 0, 1),
    refraction: clampTo(g.refraction, d.refraction, 0, 1),
    depth: clampTo(g.depth, d.depth, 1, 1000),
    dispersion: clampTo(g.dispersion, d.dispersion, 0, 1),
    frost: clampTo(g.frost, d.frost, 0, 1000),
    splay: clampTo(g.splay, d.splay, 0, 1),
  };
}

/** A grain size on both axes (px), sanitised. */
export function grainOf(size: unknown, sizeY?: unknown): [number, number] {
  const ok = (v: unknown) => (fin(v) ? Math.min(1000, Math.max(0.01, v)) : 0.5);
  return [ok(size), ok(sizeY ?? size)];
}

/** The largest radius anywhere on the layer. */
export function maxRadius(b: Blur): number {
  const s = sanitizeBlur(b);
  return s.blurType === "progressive" ? Math.max(s.radius, s.startRadius) : s.radius;
}

/** The same blur scaled by `k` (radii; the unit-box points stay). */
export const scaledBlur = (b: Blur, k: number): Blur => ({ ...b, radius: b.radius * k, startRadius: b.startRadius * k });

/** Furthest the glass's curved edge moves the backdrop (px). */
export function maxBend(g: Glass): number {
  const s = sanitizeGlass(g);
  return s.refraction * s.depth * (1 + s.dispersion * 0.25);
}

/** How far outside the layer's bounds an effect can paint (px): a layer blur's 1.5 × radius, a texture's scatter. */
export function effectReach(e: Effect): number {
  if (!e.visible) return 0;
  if (e.type === "layerBlur") return maxRadius(e) * 1.5;
  if (e.type === "texture") return e.clipToShape ? 0 : Math.max(0, e.radius);
  return 0;
}

/** How far around the layer its backdrop is read (px): a background blur's radius, glass's frost and bend. */
export function backdropRadius(e: Effect): number {
  if (!e.visible) return 0;
  if (e.type === "backgroundBlur") return maxRadius(e);
  if (e.type === "glass") {
    const g = sanitizeGlass(e);
    return g.frost + maxBend(g) / 1.5;
  }
  return 0;
}

// --- parsing --------------------------------------------------------------------------------

/** A colour as CSS: a CSS string, or FigCraft's `{ r, g, b, a }` (0–1). */
function colorOf(v: unknown, def: string): string {
  if (typeof v === "string" && v.length <= 64 && parseCss(v)) return v.trim();
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (fin(o.r) && fin(o.g) && fin(o.b)) return toCss({ r: clampTo(o.r, 0, 0, 1), g: clampTo(o.g, 0, 0, 1), b: clampTo(o.b, 0, 0, 1), a: clampTo(o.a, 1, 0, 1) });
  }
  return def;
}

const pick = (o: Record<string, unknown>, ...names: string[]) => {
  for (const n of names) if (o[n] !== undefined) return o[n];
  return undefined;
};

/** One effect from FigCraft's JSON (camel-case or snake-case names, old forms) or ours; null for an unknown type. */
export function parseEffect(raw: unknown): Effect | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const base = effectOfType(String(o.type ?? ""));
  if (!base) return null;
  const visible = o.visible !== false;
  if (base.type === "layerBlur" || base.type === "backgroundBlur") {
    const bt = String(pick(o, "blurType", "blur_type") ?? "uniform").toLowerCase();
    const b = sanitizeBlur({
      radius: pick(o, "radius") as number,
      blurType: bt === "progressive" ? "progressive" : "uniform",
      startRadius: pick(o, "startRadius", "start_radius") as number,
      start: (pick(o, "start", "startOffset") as Point) ?? DEFAULT_BLUR.start,
      end: (pick(o, "end", "endOffset") as Point) ?? DEFAULT_BLUR.end,
    });
    return { type: base.type, visible, ...b };
  }
  if (base.type === "noise") {
    const mode = String(o.mode ?? "mono").toLowerCase();
    const [size, sizeY] = grainOf(o.size, pick(o, "sizeY", "size_y"));
    const hasY = pick(o, "sizeY", "size_y") !== undefined;
    return {
      type: "noise",
      visible,
      mode: mode === "duo" || mode === "multi" ? mode : "mono",
      size,
      ...(hasY ? { sizeY } : {}),
      density: clampTo(o.density, DEFAULT_NOISE.density, 0, 1),
      color: colorOf(o.color, DEFAULT_NOISE.color),
      secondary: colorOf(o.secondary, DEFAULT_NOISE.secondary),
      opacity: clampTo(o.opacity, DEFAULT_NOISE.opacity, 0, 1),
      blend: (typeof o.blend === "string" && ((BLEND_MODES as readonly string[]).includes(o.blend) ? (o.blend as BlendMode) : blendFromName(o.blend))) || "normal",
    };
  }
  if (base.type === "texture") {
    const [size, sizeY] = grainOf(o.size, pick(o, "sizeY", "size_y"));
    const hasY = pick(o, "sizeY", "size_y") !== undefined;
    return { type: "texture", visible, size, ...(hasY ? { sizeY } : {}), radius: clampTo(o.radius, DEFAULT_TEXTURE.radius, 0, 1000), clipToShape: pick(o, "clipToShape", "clip_to_shape") === true };
  }
  return {
    type: "glass",
    visible,
    ...sanitizeGlass({
      lightAngle: pick(o, "lightAngle", "light_angle") as number,
      lightIntensity: pick(o, "lightIntensity", "light_intensity") as number,
      refraction: o.refraction as number,
      depth: o.depth as number,
      dispersion: o.dispersion as number,
      frost: o.frost as number,
      splay: o.splay as number,
    }),
  };
}

/** The effect list stored on a layer (`paint.effects`): junk is dropped, at most `MAX_EFFECTS`. */
export function parseEffects(json: unknown): Effect[] {
  if (typeof json !== "string" || json === "" || json.length > MAX_JSON) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_EFFECTS).map(parseEffect).filter((e): e is Effect => e !== null);
}

export function serializeEffects(effects: readonly Effect[]): string {
  return effects.length === 0 ? "" : JSON.stringify(effects.slice(0, MAX_EFFECTS).map((e) => (e.visible ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== "visible")) : e)));
}

// --- drawing -------------------------------------------------------------------------------

/** A small stable number from a string (a filter's seed, so the same layer always has the same grain). */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 10_000;
}

/** The id of a layer's effect filter (noise and texture), safe in a CSS `url(#…)`. */
export const effectFilterId = (layerId: string): string => `fx-${layerId.replace(/[^A-Za-z0-9_-]/g, "_")}`;

/** Whether a layer's effects need an SVG filter (noise or texture). */
export const needsFilter = (effects: readonly Effect[]): boolean => effects.some((e) => e.visible && (e.type === "noise" || e.type === "texture"));

/** The grain frequency for a grain size: features about `size` px across. */
const frequency = (size: number) => Math.min(2, 1 / Math.max(0.5, size * 2));

/** One SVG filter primitive (tag and attributes), so the stage and the export draw the same markup. */
export interface FilterPrimitive {
  tag: "feTurbulence" | "feColorMatrix" | "feFlood" | "feComposite" | "feBlend" | "feDisplacementMap" | "feMerge" | "feMergeNode" | "feOffset";
  attrs: Record<string, string | number>;
  children?: FilterPrimitive[];
}

/**
 * The SVG filter a layer's noise and texture effects make, in list order: each texture scatters what came before by
 * its radius (clipped to the layer's own pixels when asked), each noise lays grains over it, clipped to the layer's
 * pixels and blended as asked. Null when there is neither.
 */
export function effectFilter(layerId: string, effects: readonly Effect[]): { id: string; region: number; primitives: FilterPrimitive[] } | null {
  const list = effects.filter((e) => e.visible && (e.type === "noise" || e.type === "texture"));
  if (list.length === 0) return null;
  const seed = seedOf(layerId);
  const prims: FilterPrimitive[] = [];
  let input = "SourceGraphic";
  let region = 0;
  list.forEach((e, i) => {
    const n = `e${i}`;
    if (e.type === "texture") {
      const [gx, gy] = grainOf(e.size, e.sizeY);
      const r = Math.min(1000, Math.max(0, e.radius));
      region = Math.max(region, e.clipToShape ? 0 : r);
      prims.push({ tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: `${frequency(gx)} ${frequency(gy)}`, numOctaves: 2, seed: seed + i, result: `${n}t` } });
      prims.push({ tag: "feDisplacementMap", attrs: { in: input, in2: `${n}t`, scale: r * 2, xChannelSelector: "R", yChannelSelector: "G", result: `${n}d` } });
      if (e.clipToShape) prims.push({ tag: "feComposite", attrs: { in: `${n}d`, in2: "SourceAlpha", operator: "in", result: `${n}c` } });
      input = e.clipToShape ? `${n}c` : `${n}d`;
      return;
    }
    if (e.type !== "noise") return;
    const [gx, gy] = grainOf(e.size, e.sizeY);
    // grains where the noise is above 1 − density: a steep alpha ramp around that threshold
    const k = 24;
    const cut = (1 - e.density) * k;
    prims.push({ tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: `${frequency(gx)} ${frequency(gy)}`, numOctaves: 1, seed: seed + 31 * (i + 1), stitchTiles: "stitch", result: `${n}t` } });
    const grains: string[] = [];
    if (e.mode === "multi") {
      // every colour: the noise's own channels, stretched, at the grains' opacity
      prims.push({ tag: "feColorMatrix", attrs: { in: `${n}t`, type: "matrix", values: `3 0 0 0 -1  0 3 0 0 -1  0 0 3 0 -1  0 0 0 ${k * e.opacity} ${-cut * e.opacity}`, result: `${n}g` } });
      grains.push(`${n}g`);
    } else {
      const layer = (channel: 0 | 1, color: string, tag: string) => {
        const row = channel === 0 ? `${k} 0 0 0 ${-cut}` : `0 ${k} 0 0 ${-cut}`;
        prims.push({ tag: "feColorMatrix", attrs: { in: `${n}t`, type: "matrix", values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${row}`, result: `${tag}a` } });
        prims.push({ tag: "feFlood", attrs: { "flood-color": color, result: `${tag}f` } });
        prims.push({ tag: "feComposite", attrs: { in: `${tag}f`, in2: `${tag}a`, operator: "in", result: tag } });
        grains.push(tag);
      };
      layer(0, e.color, `${n}p`);
      if (e.mode === "duo") layer(1, e.secondary, `${n}s`);
    }
    // the grains only where the layer has pixels, then blended over it
    const merged = grains.length > 1 ? `${n}m` : grains[0];
    if (grains.length > 1) prims.push({ tag: "feMerge", attrs: { result: merged }, children: grains.map((g) => ({ tag: "feMergeNode", attrs: { in: g } })) });
    prims.push({ tag: "feComposite", attrs: { in: merged, in2: "SourceAlpha", operator: "in", result: `${n}k` } });
    if (e.blend === "normal") prims.push({ tag: "feMerge", attrs: { result: `${n}o` }, children: [{ tag: "feMergeNode", attrs: { in: input } }, { tag: "feMergeNode", attrs: { in: `${n}k` } }] });
    else prims.push({ tag: "feBlend", attrs: { in: `${n}k`, in2: input, mode: blendCss(e.blend), result: `${n}o` } });
    input = `${n}o`;
  });
  return { id: effectFilterId(layerId), region, primitives: prims };
}

/** One backdrop layer of a progressive blur: its radius and the mask that shows it. */
export interface BlurBand {
  radius: number;
  mask: string;
}

/**
 * A progressive blur as `steps` stacked backdrop layers (the browser has no variable-radius blur): band k has the
 * radius at its place on the ramp and a mask that fades it in and out around that place along the line from `start`
 * to `end`; the last band holds to the end. Uniform blurs give one band, unmasked.
 */
export function blurBands(b: Blur, steps = 5): BlurBand[] {
  const s = sanitizeBlur(b);
  if (s.blurType !== "progressive") return s.radius > 0 ? [{ radius: s.radius, mask: "none" }] : [];
  const dx = s.end[0] - s.start[0];
  const dy = s.end[1] - s.start[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return s.radius > 0 ? [{ radius: s.radius, mask: "none" }] : [];
  // the CSS gradient line for that direction in a unit box, and where the two points fall on it
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const ux = dx / len;
  const uy = dy / len;
  const line = Math.abs(ux) + Math.abs(uy);
  const at = (p: Point) => (((p[0] - 0.5) * ux + (p[1] - 0.5) * uy) / line + 0.5) * 100;
  const t0 = at(s.start);
  const t1 = at(s.end);
  const pct = (v: number) => `${Math.round(v * 100) / 100}%`;
  const bands: BlurBand[] = [];
  for (let k = 1; k <= steps; k++) {
    const radius = s.startRadius + ((s.radius - s.startRadius) * k) / steps;
    if (radius <= 0) continue;
    const prev = t0 + ((t1 - t0) * (k - 1)) / steps;
    const here = t0 + ((t1 - t0) * k) / steps;
    const next = t0 + ((t1 - t0) * (k + 1)) / steps;
    const mask =
      k === steps
        ? `linear-gradient(${Math.round(angle * 100) / 100}deg, transparent ${pct(prev)}, black ${pct(here)})`
        : `linear-gradient(${Math.round(angle * 100) / 100}deg, transparent ${pct(prev)}, black ${pct(here)}, transparent ${pct(next)})`;
    bands.push({ radius: Math.min(radius, 200), mask });
  }
  // a ramp that falls (a bigger radius at the start) fills from the start instead
  if (s.startRadius > s.radius) {
    const before = Math.min(s.startRadius, 200);
    bands.push({ radius: before, mask: `linear-gradient(${Math.round(angle * 100) / 100}deg, black ${pct(t0)}, transparent ${pct(t0 + (t1 - t0) / steps)})` });
  }
  return bands;
}

/**
 * Glass, approximated with CSS: the backdrop frosted (blurred) and a little brighter, and the curved edge catching
 * the light from `lightAngle` as inset highlights, with colour fringes for dispersion.
 */
export function glassCss(g: Glass): { backdropFilter: string; boxShadow: string } {
  const s = sanitizeGlass(g);
  const rad = (s.lightAngle * Math.PI) / 180;
  const edge = Math.max(1, Math.min(12, s.depth * 0.15));
  const lx = Math.round(Math.sin(rad) * edge * 100) / 100;
  const ly = Math.round(-Math.cos(rad) * edge * 100) / 100;
  const soft = Math.round((2 + s.splay * 18) * 100) / 100;
  const shadows = [
    `inset ${-lx}px ${-ly}px ${soft}px rgba(255, 255, 255, ${Math.round(s.lightIntensity * 0.7 * 100) / 100})`,
    `inset ${lx}px ${ly}px ${soft}px rgba(0, 0, 0, ${Math.round(s.lightIntensity * 0.18 * 100) / 100})`,
  ];
  if (s.dispersion > 0) {
    const d = Math.round(s.dispersion * 2 * 100) / 100;
    shadows.push(`inset ${d}px 0 ${soft}px rgba(255, 0, 80, ${Math.round(s.dispersion * 0.12 * 100) / 100})`, `inset ${-d}px 0 ${soft}px rgba(0, 120, 255, ${Math.round(s.dispersion * 0.12 * 100) / 100})`);
  }
  const blur = Math.min(200, s.frost);
  return { backdropFilter: `blur(${blur}px) saturate(${Math.round((1 + s.refraction * 0.4) * 100) / 100})`, boxShadow: shadows.join(", ") };
}

/** The visible blur of a kind in the list (the largest, if there are several), or null. */
export function blurOf(effects: readonly Effect[], type: "layerBlur" | "backgroundBlur"): Blur | null {
  let best: Blur | null = null;
  for (const e of effects) if (e.visible && e.type === type && (!best || maxRadius(e) > maxRadius(best))) best = e;
  return best;
}
