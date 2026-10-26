/**
 * ============================================================================
 * THE PRO FACE OF THE DESIGN INSPECTOR (ROADMAP Phase 34)
 * ============================================================================
 * Every property in the registry, for the selected layers, in groups. The model is generated from the registry,
 * so a property added there shows up with a control and the coverage test keeps it that way. Pure: no DOM, no
 * store. The component picks a control from `kind`.
 * ============================================================================
 */

import { PROPERTY_PATHS, PROPERTY_REGISTRY, type PropertyDefinition } from "../document/properties";
import type { ArchetypeId } from "../document/registry";

/** Which control edits a value. */
export type ControlKind =
  | "number" //   number, length and angle: a number you can scrub, with its unit
  | "color" //    a swatch and a text box
  | "select" //   an enum with a closed set of options
  | "text" //     a string, or an enum with open values
  | "longtext" // path data, clip paths and the layer's words: a text area
  | "toggle" //   a checkbox
  | "vector" //   three (position, scale) or four (rotation) numbers
  | "json"; //    gradient stops and objects: edited as JSON, checked before they are written

export type GroupId = "frame" | "layout" | "appearance" | "typography" | "content" | "vector" | "media" | "component" | "divider" | "background" | "scene3d" | "behaviour";

/** Groups in the order the face lists them. */
export const PRO_GROUPS: readonly { id: GroupId; title: string }[] = [
  { id: "frame", title: "Frame" },
  { id: "layout", title: "Layout" },
  { id: "appearance", title: "Appearance" },
  { id: "typography", title: "Typography" },
  { id: "content", title: "Content" },
  { id: "vector", title: "Vector" },
  { id: "media", title: "Media" },
  { id: "component", title: "Component" },
  { id: "divider", title: "Divider" },
  { id: "background", title: "Background" },
  { id: "scene3d", title: "3D" },
  { id: "behaviour", title: "Behaviour" },
];

/** The path's first segment decides its group. */
const GROUP_OF_PREFIX: Record<string, GroupId> = {
  frame: "frame", sizing: "frame", positioning: "frame", transform: "frame",
  layout: "layout",
  appearance: "appearance", render: "appearance", filter: "appearance", stroke: "appearance", paint: "appearance",
  typography: "typography", text: "typography",
  content: "content",
  svg: "vector", shape: "vector",
  media: "media",
  button: "component", toggle: "component", input: "component",
  divider: "divider",
  background: "background",
  scene3d: "scene3d",
  interaction: "behaviour", a11y: "behaviour", export: "behaviour", motion: "behaviour", logic: "behaviour",
};

export function groupOf(path: string): GroupId {
  return GROUP_OF_PREFIX[path.split(".")[0]] ?? "behaviour";
}

export function controlKind(path: string, def: PropertyDefinition): ControlKind {
  switch (def.valueType) {
    case "number":
    case "length":
    case "angle":
      return "number";
    case "color":
      return "color";
    case "boolean":
      return "toggle";
    case "vector3":
    case "quaternion":
      return "vector";
    case "gradientStops":
    case "object":
      return "json";
    case "pathData":
    case "clipPath":
      return "longtext";
    case "enum":
      return def.options && def.options.length > 0 ? "select" : "text";
    case "string":
      return path === "content.text" ? "longtext" : "text";
  }
}

/** "typography.fontSize" -> "Font size"; "svg.strokeWidth" -> "Stroke width"; the first segment is the group's. */
export function propertyLabel(path: string): string {
  const rest = path.split(".").slice(1);
  const words = (rest.length > 0 ? rest : [path]).join(" ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The range a control keeps a value in: the registry's, and 0 to 1 for opacity (which the registry leaves open for old documents). */
function rangeOf(def: PropertyDefinition): { min?: number; max?: number; integer?: boolean } {
  return def.range ?? (def.css === "opacity" ? { min: 0, max: 1 } : {});
}

/** How many decimal places a number is written with (floating-point dust past the sixth is ignored). */
function decimalsOf(n: number): number {
  const fixed = Number(n.toFixed(6)).toString();
  const dot = fixed.indexOf(".");
  return dot < 0 ? 0 : fixed.length - dot - 1;
}

/** A sensible step for scrubbing and the arrow keys. */
export function stepFor(def: PropertyDefinition): number {
  const { min, max, integer } = rangeOf(def);
  if (integer) return 1;
  if (max !== undefined && min !== undefined && max - min <= 1) return 0.01;
  if (def.valueType === "number" && Number.isFinite(Number(def.default)) && !Number.isInteger(Number(def.default))) return 0.1;
  if (def.valueType === "number" && max !== undefined && max <= 10) return 0.1;
  return 1;
}

export interface ProProperty {
  path: string;
  label: string;
  group: GroupId;
  kind: ControlKind;
  def: PropertyDefinition;
  step: number;
  /** The companion property that holds this one's unit (`frame.width` -> `frame.widthUnit`), edited by a select next to the number. */
  unitPath?: string;
}

export interface ProGroup {
  id: GroupId;
  title: string;
  properties: ProProperty[];
}

const UNIT_SUFFIX = "Unit";

/** Is `path` a unit companion of another property (`frame.widthUnit`)? Returns the property it belongs to. */
export function unitOwner(path: string): string | null {
  if (!path.endsWith(UNIT_SUFFIX)) return null;
  const owner = path.slice(0, -UNIT_SUFFIX.length);
  return PROPERTY_REGISTRY[owner] ? owner : null;
}

/**
 * The groups of properties for a selection: every property that is legal for at least one of the archetypes, in
 * registry order inside each group. A unit companion has no row of its own; it rides on the property it measures.
 */
export function proGroupsFor(archetypes: readonly string[]): ProGroup[] {
  const wanted = new Set(archetypes as readonly ArchetypeId[]);
  const groups = new Map<GroupId, ProProperty[]>();
  for (const path of PROPERTY_PATHS) {
    const def = PROPERTY_REGISTRY[path];
    if (!def.archetypes.some((a) => wanted.has(a))) continue;
    if (unitOwner(path) !== null) continue;
    const unitPath = PROPERTY_REGISTRY[path + UNIT_SUFFIX] ? path + UNIT_SUFFIX : undefined;
    const group = groupOf(path);
    const list = groups.get(group) ?? [];
    list.push({ path, label: propertyLabel(path), group, kind: controlKind(path, def), def, step: stepFor(def), ...(unitPath ? { unitPath } : {}) });
    groups.set(group, list);
  }
  return PRO_GROUPS.filter((g) => groups.has(g.id)).map((g) => ({ ...g, properties: groups.get(g.id)! }));
}

/** Every path a group list has a control for, unit companions included. */
export function coveredPaths(groups: readonly ProGroup[]): Set<string> {
  const out = new Set<string>();
  for (const g of groups) for (const p of g.properties) {
    out.add(p.path);
    if (p.unitPath) out.add(p.unitPath);
  }
  return out;
}

/** The new value after a keyboard or scrub step: `steps` times the property's step (Shift is ten times, Alt a tenth, applied by the caller), clamped to its range and rounded to the step's precision. */
export function stepValue(def: PropertyDefinition, value: number, steps: number, step = stepFor(def)): number {
  // keep the precision the value already has (20.9 less 1 is 19.9, not 20)
  const decimals = Math.max(decimalsOf(step), Math.min(6, decimalsOf(value)));
  let next = value + steps * step;
  const { min, max } = rangeOf(def);
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return Number(next.toFixed(decimals));
}

/**
 * The value while a number is being scrubbed: the start value moved by the pointer's distance, four pixels to a
 * step. Shift makes the step ten times larger and Alt a tenth. Clamped to the range and rounded to the step used.
 */
export function scrubValue(def: PropertyDefinition, start: number, dx: number, mods: { shift?: boolean; alt?: boolean } = {}): number {
  const step = stepFor(def) * (mods.shift ? 10 : mods.alt ? 0.1 : 1);
  const raw = start + (dx / 4) * step;
  const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step))));
  let next = Number(raw.toFixed(decimals));
  const { min, max } = rangeOf(def);
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}
