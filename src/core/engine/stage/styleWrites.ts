import type { MotionDocument } from "../../document/schema";
import { getPropertyDefinition, type PropertyDefinition } from "../../document/properties";
import type { ResolvedProps } from "../../kernel/evaluate";

/**
 * ROADMAP Phase 57: the bridge from the kernel's output (property path → value) to CSS. Pure, so the mapping is
 * tested without a browser. Only properties a layer actually animates are written; everything else stays as React
 * drew it.
 */

const isTransformPath = (path: string) => (path.startsWith("transform.") && path !== "transform.motionPath") || path === "frame.rotation";

/** The property paths animated on a layer: its clips' tracks and its `loop` behaviours, in any composition. */
export function animatedPaths(doc: MotionDocument, layerId: string): Set<string> {
  const paths = new Set<string>();
  for (const clip of Object.values(doc.clips)) {
    if (clip.layerId !== layerId || !clip.enabled) continue;
    for (const track of clip.tracks) if (!track.muted) paths.add(track.property);
  }
  for (const behaviour of Object.values(doc.behaviours)) {
    if (behaviour.layerId === layerId && behaviour.enabled && behaviour.type === "loop") paths.add(behaviour.params.property);
  }
  return paths;
}

/** Layers that animate anything, with the paths they animate. */
export function animatedLayers(doc: MotionDocument): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const layerIds = new Set<string>();
  for (const clip of Object.values(doc.clips)) if (clip.enabled) layerIds.add(clip.layerId);
  for (const behaviour of Object.values(doc.behaviours)) if (behaviour.enabled && behaviour.type === "loop") layerIds.add(behaviour.layerId);
  for (const id of layerIds) {
    if (!doc.layers[id]) continue;
    const paths = animatedPaths(doc, id);
    if (paths.size > 0) out.set(id, paths);
  }
  return out;
}

function cssValue(def: PropertyDefinition, resolved: ResolvedProps, value: unknown): string | null {
  switch (def.valueType) {
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
    case "length": {
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      const unitOverride = resolved[`${def.path}Unit`];
      const unit = typeof unitOverride === "string" ? unitOverride : (def.unit ?? "px");
      const isSize = def.path === "frame.width" || def.path === "frame.height";
      return `${isSize ? Math.max(0, value) : value}${unit}`;
    }
    case "angle":
      return typeof value === "number" && Number.isFinite(value) ? `${value}deg` : null;
    case "color":
    case "string":
    case "enum":
    case "clipPath":
      return typeof value === "string" ? value : null;
    default:
      return null;
  }
}

/**
 * The inline styles that show `resolved` for the animated `paths`: `{ "opacity": "0.5", "transform": "…" }`.
 * Every `transform.*` and the frame's rotation become one `transform` (Single Transform Authority), the rotation
 * first, as the stage draws it.
 */
export function styleWrites(paths: Iterable<string>, resolved: ResolvedProps): Record<string, string> {
  const out: Record<string, string> = {};
  let transformTouched = false;
  for (const path of paths) {
    if (isTransformPath(path)) {
      transformTouched = true;
      continue;
    }
    const def = getPropertyDefinition(path);
    if (!def?.css || resolved[path] === undefined) continue;
    const css = cssValue(def, resolved, resolved[path]);
    if (css !== null) out[def.css] = css;
  }
  if (transformTouched) {
    const parts: string[] = [];
    const rotation = resolved["frame.rotation"];
    if (typeof rotation === "number" && rotation !== 0) parts.push(`rotate(${rotation}deg)`);
    const transform = resolved.transform;
    if (typeof transform === "string" && transform !== "none") parts.push(transform);
    out.transform = parts.length > 0 ? parts.join(" ") : "none";
  }
  return out;
}
