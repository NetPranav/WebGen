/**
 * ============================================================================
 * THE SIMPLE FACE OF THE DESIGN INSPECTOR (ROADMAP Phase 33)
 * ============================================================================
 * Seven controls, in plain words: position, size, fill, stroke, radius, opacity and text. Which property each one
 * writes depends on what the layer is: a rectangle's fill is `svg.fill`, a frame's is its background colour, a
 * text's is its colour. This table is that mapping, so the inspector, the commands and the tests agree.
 * ============================================================================
 */

import { isPropertyLegalFor } from "../document/properties";
import type { ArchetypeId } from "../document/registry";

export type SimpleControl = "position" | "size" | "fill" | "stroke" | "radius" | "opacity" | "text";

/** The seven controls, in the order the face lists them. The face never shows more than these. */
export const SIMPLE_CONTROLS: readonly SimpleControl[] = ["position", "size", "fill", "stroke", "radius", "opacity", "text"];

export interface SimplePaths {
  fill?: string;
  strokeColor?: string;
  strokeWidth?: string;
  /** Set to `solid` while the width is above zero, `none` at zero (a frame draws no border without a style). */
  strokeStyle?: string;
  radius?: string;
  text?: string;
}

const SHAPE_STROKE = { strokeColor: "svg.stroke", strokeWidth: "svg.strokeWidth" } as const;
const BOX = { fill: "appearance.background.color", strokeColor: "appearance.border.color", strokeWidth: "appearance.border.width", strokeStyle: "appearance.border.style", radius: "appearance.radius" } as const;

const PATHS: Partial<Record<ArchetypeId, SimplePaths>> = {
  container: { ...BOX },
  form: { ...BOX },
  button: { fill: "appearance.background.color", radius: "appearance.radius", text: "content.label" },
  badge: { fill: "appearance.background.color", radius: "appearance.radius", text: "content.label" },
  toggle: { fill: "appearance.background.color", radius: "appearance.radius", text: "content.label" },
  fab: { fill: "appearance.background.color", radius: "appearance.radius", text: "content.label" },
  text: { fill: "typography.color", text: "content.text" },
  image: { radius: "appearance.radius" },
  rectangle: { fill: "svg.fill", ...SHAPE_STROKE, radius: "shape.cornerRadius" },
  ellipse: { fill: "svg.fill", ...SHAPE_STROKE },
  polygon: { fill: "svg.fill", ...SHAPE_STROKE, radius: "shape.vertexRadius" },
  star: { fill: "svg.fill", ...SHAPE_STROKE, radius: "shape.vertexRadius" },
  line: { ...SHAPE_STROKE },
  arrow: { ...SHAPE_STROKE },
  svgPath: { fill: "svg.fill", ...SHAPE_STROKE },
};

/** The properties the Simple controls write for a kind of layer (an empty object when it has none beyond position, size and opacity). */
export function simplePaths(archetype: string): SimplePaths {
  return PATHS[archetype as ArchetypeId] ?? {};
}

/** Whether the Simple face offers a control for this kind of layer. Position, size and opacity are for every layer that has a box. */
export function supportsControl(archetype: string, control: SimpleControl): boolean {
  const p = simplePaths(archetype);
  switch (control) {
    case "position":
    case "size":
      return isPropertyLegalFor("frame.x", archetype as ArchetypeId);
    case "opacity":
      return isPropertyLegalFor("appearance.opacity", archetype as ArchetypeId);
    case "fill":
      return p.fill !== undefined;
    case "stroke":
      return p.strokeColor !== undefined;
    case "radius":
      return p.radius !== undefined;
    case "text":
      return p.text !== undefined;
  }
}

/** Does any layer in the selection get this control? (The face shows a control when at least one selected layer supports it.) */
export function selectionSupports(archetypes: readonly string[], control: SimpleControl): boolean {
  return archetypes.some((a) => supportsControl(a, control));
}

/** The value every entry shares, or `null` ("Mixed") when they differ. An empty list has no value. */
export function sharedValue<T>(values: readonly T[]): T | null | undefined {
  if (values.length === 0) return undefined;
  return values.every((v) => v === values[0]) ? values[0] : null;
}
