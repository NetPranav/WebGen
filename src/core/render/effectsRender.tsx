/**
 * Drawing FigCraft's effects (port F7) in the browser, the same on the stage and in the export (Law 11):
 *
 * - noise and texture are one SVG filter per layer (`effectFilter`), applied by the layer's CSS `filter: url(#…)`;
 *   the filters of a frame are defined once, in a hidden `<svg>` that is the frame's last child (on the stage and in
 *   the export alike);
 * - a progressive blur is a few stacked backdrop layers with stepped masks (`blurBands`), drawn inside a frame.
 */

import React from "react";
import type { Layer } from "../document/schema";
import { useDocumentAt } from "../store/useDocumentStore";
import { blurBands, blurOf, effectFilter, needsFilter, parseEffects, type Blur, type FilterPrimitive } from "../paint/effects";

/** React's names for the SVG attributes the filters use. */
const ATTR: Record<string, string> = { "flood-color": "floodColor" };

function primitive(p: FilterPrimitive, key: React.Key): React.ReactElement {
  const props: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(p.attrs)) props[ATTR[k] ?? k] = v;
  return React.createElement(p.tag, { key, ...props }, p.children?.map((c, i) => primitive(c, i)));
}

/** The `<filter>` of one layer's noise and texture, or null. */
export function EffectFilter({ layerId, effects }: { layerId: string; effects: string }) {
  const f = effectFilter(layerId, parseEffects(effects));
  if (!f) return null;
  // the region reaches past the layer by the largest texture scatter (as a share of a 100 px box, generously)
  const pad = Math.min(400, 10 + f.region);
  return (
    <filter id={f.id} x={`-${pad}%`} y={`-${pad}%`} width={`${100 + 2 * pad}%`} height={`${100 + 2 * pad}%`} colorInterpolationFilters="sRGB">
      {f.primitives.map((p, i) => primitive(p, i))}
    </filter>
  );
}

const DEFS_STYLE: React.CSSProperties = { position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" };

/** A hidden `<svg>` defining the effect filters of the given layers (`[id, paint.effects]`), or nothing when none need one. */
export function EffectDefs({ entries }: { entries: readonly (readonly [string, string])[] }) {
  if (entries.length === 0) return null;
  return (
    <svg aria-hidden="true" data-effect-defs="" width={0} height={0} style={DEFS_STYLE}>
      <defs>
        {entries.map(([id, json]) => (
          <EffectFilter key={id} layerId={id} effects={json} />
        ))}
      </defs>
    </svg>
  );
}

/** The layers under `rootIds` (in `plan`, or all of `layers`) whose effects need a filter, with their effect lists. */
export function effectEntries(layers: Record<string, Layer>, ids: Iterable<string>): [string, string][] {
  const out: [string, string][] = [];
  for (const id of ids) {
    const json = layers[id]?.properties["paint.effects"];
    if (typeof json === "string" && json && needsFilter(parseEffects(json))) out.push([id, json]);
  }
  return out;
}

/**
 * The effect filters of a frame the stage draws (`rootId` and everything under it), at its breakpoint, as the frame's
 * last child (where the export puts them); re-renders only when an effect list under it changes.
 */
export function StageEffectDefs({ rootId, breakpointId }: { rootId: string; breakpointId?: string | null }) {
  const key = useDocumentAt((d) => {
    let s = "";
    const stack = [rootId];
    for (let guard = 0; stack.length > 0 && guard < 100_000; guard++) {
      const l = d.layers[stack.pop()!];
      if (!l) continue;
      const json = l.properties["paint.effects"];
      if (typeof json === "string" && json && (json.includes('"noise"') || json.includes('"texture"'))) s += `${l.id}\u0000${json}\u0001`;
      for (const k of l.children) stack.push(k);
    }
    return s;
  }, breakpointId);
  if (!key) return null;
  const entries = key
    .split("\u0001")
    .filter(Boolean)
    .map((e) => e.split("\u0000") as [string, string])
    .filter(([, json]) => needsFilter(parseEffects(json)))
    .reverse();
  return <EffectDefs entries={entries} />;
}

const BAND_STYLE: React.CSSProperties = { position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none" };

/** The backdrop layers of a progressive blur (`kind` says which), or nothing for none or a uniform one (CSS draws that). */
export function BlurBands({ effects, kind }: { effects: string | undefined; kind: "layerBlur" | "backgroundBlur" }) {
  const blur: Blur | null = effects ? blurOf(parseEffects(effects), kind) : null;
  if (!blur || blur.blurType !== "progressive") return null;
  return (
    <>
      {blurBands(blur).map((b, i) => (
        <div
          key={i}
          aria-hidden="true"
          data-effect-band={kind}
          style={{ ...BAND_STYLE, backdropFilter: `blur(${b.radius}px)`, WebkitBackdropFilter: `blur(${b.radius}px)`, ...(b.mask !== "none" ? { maskImage: b.mask, WebkitMaskImage: b.mask } : {}) } as React.CSSProperties}
        />
      ))}
    </>
  );
}
