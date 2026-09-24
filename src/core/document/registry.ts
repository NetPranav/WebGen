/**
 * ============================================================================
 * ARCHETYPE & LAYER-KIND REGISTRY (MDM v2)
 * ============================================================================
 * ROADMAP Phase 2.2. The single table that maps every archetype to its layer
 * kind, family, ID prefix, Details Inspector sections, legal grammar states,
 * default props and semantic export tag. It replaces `ElementType` (20 types),
 * the launcher's 10-type `ArchetypeId`, `ELEMENT_SECTION_REGISTRY` and the
 * hard-coded defaults in `initElementProject`.
 * ============================================================================
 */

import { TYPE_REGISTRY } from "../engine/ElementGrammarEngine";
import type { GrammarElementType, GrammarStateName } from "../types/element-grammar";
import type { DetailSectionId } from "../types/element-sections";
import {
  DEFAULT_CAMERA3D_PROPERTIES,
  DEFAULT_LIGHT3D_PROPERTIES,
  DEFAULT_OBJECT3D_PROPERTIES,
} from "../types/scene3d";

/** Layer kinds from PRD §4. Kinds with no archetype yet are reserved for later phases. */
export const LAYER_KINDS = [
  "element",
  "vector",
  "text",
  "image",
  "group",
  "mask",
  "scene3d",
  "shader",
  "effect",
] as const;
export type LayerKind = (typeof LAYER_KINDS)[number];

/** Element families from PRD §5.1. Vector and 3D archetypes belong to no family. */
export const FAMILY_IDS = ["interactive", "media", "structural", "text"] as const;
export type FamilyId = (typeof FAMILY_IDS)[number];

export const ARCHETYPE_IDS = [
  // Initial Phase element archetypes (PRD §5.1)
  "button",
  "toggle",
  "badge",
  "fab",
  "image",
  "icon",
  "divider",
  "background",
  "container",
  "text",
  // Additional element archetypes used by the editor
  "input",
  "form",
  "generic",
  // Vector (SVG) archetypes
  "svgPath",
  "svgGroup",
  "svgUse",
  "svgText",
  // 3D scene archetypes
  "object3D",
  "camera3D",
  "light3D",
] as const;
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

/** The 10 archetypes a project can be started from (PRD §5.1). */
export const INITIAL_ARCHETYPE_IDS = [
  "button",
  "toggle",
  "badge",
  "fab",
  "image",
  "icon",
  "divider",
  "background",
  "container",
  "text",
] as const satisfies readonly ArchetypeId[];
export type InitialArchetypeId = (typeof INITIAL_ARCHETYPE_IDS)[number];

export type PropValue = string | number | boolean | null | PropValue[] | { [key: string]: PropValue };
export type LayerProps = Record<string, PropValue>;

export interface ArchetypeEntry {
  id: ArchetypeId;
  kind: LayerKind;
  family: FamilyId | null;
  label: string;
  /** `createId` prefix; IDs look like `<idPrefix>_<8hex>` (CONVENTIONS §3). */
  idPrefix: string;
  /** Semantic tag emitted on export. */
  exportTag: string;
  /** The grammar type whose rules govern this archetype. */
  grammarType: GrammarElementType;
  sections: readonly DetailSectionId[];
  /** Props a new layer of this archetype starts with. Call `getDefaultProps` for a fresh copy. */
  defaultProps: LayerProps;
}

const IMAGE_SRC = "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119";

const ENTRIES: Record<ArchetypeId, Omit<ArchetypeEntry, "id">> = {
  button: {
    kind: "element",
    family: "interactive",
    label: "Button",
    idPrefix: "elem_btn",
    exportTag: "button",
    grammarType: "Button",
    sections: ["identity", "button_states", "attachments", "variables", "events", "appearance", "typography", "layout"],
    defaultProps: {
      label: "Primary Action",
      variant: "primary",
      backgroundColor: "#206859",
      color: "#ffffff",
      borderRadius: 8,
      paddingX: 20,
      paddingY: 10,
      fontSize: 14,
      fontWeight: "600",
      disabled: false,
    },
  },
  toggle: {
    kind: "element",
    family: "interactive",
    label: "Toggle",
    idPrefix: "elem_toggle",
    exportTag: "button",
    grammarType: "Switch",
    sections: ["identity", "toggle_states", "attachments", "variables", "events", "appearance", "layout"],
    defaultProps: { checked: false, activeColor: "#206859", inactiveColor: "#e2e8f0", size: "md", disabled: false },
  },
  badge: {
    kind: "element",
    family: "interactive",
    label: "Badge / Chip",
    idPrefix: "elem_badge",
    exportTag: "span",
    grammarType: "Badge",
    sections: ["identity", "attachments", "appearance", "typography", "layout"],
    defaultProps: {
      label: "Status Badge",
      variant: "filled",
      backgroundColor: "#e6f4f1",
      color: "#206859",
      borderRadius: 16,
      paddingX: 12,
      paddingY: 4,
      fontSize: 12,
    },
  },
  fab: {
    kind: "element",
    family: "interactive",
    label: "Floating Action Button",
    idPrefix: "elem_fab",
    exportTag: "button",
    grammarType: "Button",
    sections: ["identity", "button_states", "attachments", "appearance", "layout"],
    defaultProps: { icon: "plus", backgroundColor: "#206859", color: "#ffffff", size: 56, elevation: "lg" },
  },
  image: {
    kind: "element",
    family: "media",
    label: "Image",
    idPrefix: "elem_img",
    exportTag: "img",
    grammarType: "Image",
    sections: ["identity", "media_props", "image_props", "attachments", "variables", "appearance", "layout"],
    defaultProps: {
      src: `${IMAGE_SRC}?w=800&q=80`,
      fallbackSrc: `${IMAGE_SRC}?w=400&q=50`,
      alt: "Hero Image",
      objectFit: "cover",
      objectPosition: "center",
      aspectRatio: "16:9",
      width: 600,
      height: 338,
      loadingMode: "lazy",
      placeholder: "blur",
      borderRadius: 12,
      opacity: 100,
      filter: { grayscale: 0, blur: 0, brightness: 1, contrast: 1, saturate: 1 },
      overlay: { color: "#000000", opacity: 0, blendMode: "normal" },
      clipPath: "none",
    },
  },
  icon: {
    kind: "element",
    family: "media",
    label: "Icon (SVG)",
    idPrefix: "elem_icon",
    exportTag: "svg",
    grammarType: "Icon",
    sections: ["identity", "svg_vector", "attachments", "appearance", "layout"],
    defaultProps: {
      iconName: "Sparkles",
      size: 24,
      stroke: "currentColor",
      strokeWidth: 2,
      fill: "none",
      strokeDasharray: "none",
      strokeDashoffset: 0,
      path: "M12 2L2 7l10 5 10-5-10-5z",
    },
  },
  divider: {
    kind: "element",
    family: "structural",
    label: "Divider",
    idPrefix: "elem_divider",
    exportTag: "hr",
    grammarType: "Divider",
    sections: ["identity", "divider_props", "attachments", "appearance", "layout"],
    defaultProps: {
      orientation: "horizontal",
      length: 100,
      thickness: 1,
      style: "solid",
      color: "#e2e8f0",
      capStyle: "round",
    },
  },
  background: {
    kind: "element",
    family: "structural",
    label: "Background Layer",
    idPrefix: "elem_bg",
    exportTag: "div",
    grammarType: "Container",
    sections: ["identity", "background_props", "attachments", "appearance", "layout"],
    defaultProps: {
      type: "gradient",
      color: "#0f172a",
      gradientStops: [
        { color: "#0f172a", offset: 0 },
        { color: "#1e293b", offset: 100 },
      ],
      gradientAngle: 135,
      parallaxSpeed: 0.2,
      blendMode: "normal",
      noiseOpacity: 0.05,
    },
  },
  container: {
    kind: "element",
    family: "structural",
    label: "Container",
    idPrefix: "elem_container",
    exportTag: "div",
    grammarType: "Container",
    sections: ["identity", "container_layout", "attachments", "variables", "appearance", "layout"],
    defaultProps: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: 24,
      borderRadius: 8,
      backgroundColor: "transparent",
    },
  },
  text: {
    kind: "element",
    family: "text",
    label: "Text / Label",
    idPrefix: "elem_text",
    exportTag: "p",
    grammarType: "Text",
    sections: ["identity", "text_content", "attachments", "typography", "variables", "appearance", "layout"],
    defaultProps: {
      textContent: "Dynamic Typography",
      fontSize: 24,
      fontWeight: "600",
      fontFamily: "Inter",
      color: "#0f172a",
      textAlign: "left",
    },
  },
  input: {
    kind: "element",
    family: "interactive",
    label: "Input",
    idPrefix: "elem_input",
    exportTag: "input",
    grammarType: "Input",
    sections: ["identity", "input_validation", "attachments", "variables", "events", "typography", "appearance", "layout"],
    defaultProps: { inputType: "text", placeholder: "Enter a value", required: false, disabled: false },
  },
  form: {
    kind: "element",
    family: "structural",
    label: "Form",
    idPrefix: "elem_form",
    exportTag: "form",
    grammarType: "Form",
    sections: ["identity", "input_validation", "container_layout", "attachments", "variables", "events", "layout"],
    defaultProps: { display: "flex", flexDirection: "column", gap: 12 },
  },
  generic: {
    kind: "element",
    family: "structural",
    label: "Generic Element",
    idPrefix: "elem",
    exportTag: "div",
    grammarType: "Container",
    sections: ["identity", "attachments", "variables", "events", "appearance", "typography", "layout"],
    defaultProps: {},
  },
  svgPath: {
    kind: "vector",
    family: null,
    label: "SVG Path",
    idPrefix: "vec_path",
    exportTag: "path",
    grammarType: "SVG",
    sections: ["identity", "appearance", "attachments", "variables", "events", "layout"],
    defaultProps: { d: "M0 0 L100 100", stroke: "#0f172a", strokeWidth: 2, fill: "none" },
  },
  svgGroup: {
    kind: "vector",
    family: null,
    label: "SVG Group",
    idPrefix: "vec_group",
    exportTag: "g",
    grammarType: "SVG",
    sections: ["identity", "appearance", "container_layout", "attachments", "variables", "events", "layout"],
    defaultProps: {},
  },
  svgUse: {
    kind: "vector",
    family: null,
    label: "SVG Use",
    idPrefix: "vec_use",
    exportTag: "use",
    grammarType: "SVG",
    sections: ["identity", "appearance", "attachments", "variables", "events", "layout"],
    defaultProps: { href: "" },
  },
  svgText: {
    kind: "vector",
    family: null,
    label: "SVG Text",
    idPrefix: "vec_text",
    exportTag: "text",
    grammarType: "SVG",
    sections: ["identity", "typography", "appearance", "attachments", "variables", "events", "layout"],
    defaultProps: { text: "Text", fill: "#0f172a" },
  },
  object3D: {
    kind: "scene3d",
    family: null,
    label: "3D Object",
    idPrefix: "s3d_obj",
    exportTag: "mesh",
    grammarType: "Canvas",
    sections: ["identity", "scene3d_transform", "pbr_material", "attachments", "variables", "events"],
    defaultProps: toProps(DEFAULT_OBJECT3D_PROPERTIES),
  },
  camera3D: {
    kind: "scene3d",
    family: null,
    label: "3D Camera",
    idPrefix: "s3d_cam",
    exportTag: "perspectiveCamera",
    grammarType: "Canvas",
    sections: ["identity", "scene3d_transform", "camera_settings", "attachments", "variables", "events"],
    defaultProps: toProps(DEFAULT_CAMERA3D_PROPERTIES),
  },
  light3D: {
    kind: "scene3d",
    family: null,
    label: "3D Light",
    idPrefix: "s3d_light",
    exportTag: "light",
    grammarType: "Canvas",
    sections: ["identity", "scene3d_transform", "light_settings", "attachments", "variables", "events"],
    defaultProps: toProps(DEFAULT_LIGHT3D_PROPERTIES),
  },
};

/** Deep copy through JSON, which also asserts the defaults are plain data. */
function toProps(value: object): LayerProps {
  return JSON.parse(JSON.stringify(value)) as LayerProps;
}

export const ARCHETYPE_REGISTRY: Readonly<Record<ArchetypeId, ArchetypeEntry>> = Object.fromEntries(
  ARCHETYPE_IDS.map((id) => [id, { id, ...ENTRIES[id] }])
) as Record<ArchetypeId, ArchetypeEntry>;

export function isArchetypeId(value: unknown): value is ArchetypeId {
  return typeof value === "string" && (ARCHETYPE_IDS as readonly string[]).includes(value);
}

export function getArchetype(id: ArchetypeId): ArchetypeEntry {
  return ARCHETYPE_REGISTRY[id];
}

/** A fresh, mutable copy of an archetype's default props. */
export function getDefaultProps(id: ArchetypeId): LayerProps {
  return toProps(ARCHETYPE_REGISTRY[id].defaultProps);
}

/** Legal states for an archetype, taken from its grammar type (lazylayout_element_grammer.md §3). */
export function getLegalStates(id: ArchetypeId): readonly GrammarStateName[] {
  return TYPE_REGISTRY[ARCHETYPE_REGISTRY[id].grammarType]?.defaultStateSet ?? ["Default"];
}

export function archetypesOfFamily(family: FamilyId): ArchetypeId[] {
  return ARCHETYPE_IDS.filter((id) => ARCHETYPE_REGISTRY[id].family === family);
}

/**
 * Grammar types the Initial Phase has no archetype for. They stay defined in
 * `lazylayout_element_grammer.md` and `element-grammar.ts`; nothing creates them yet.
 */
export const RESERVED_GRAMMAR_TYPES: readonly GrammarElementType[] = (
  Object.keys(TYPE_REGISTRY) as GrammarElementType[]
).filter((type) => !ARCHETYPE_IDS.some((id) => ARCHETYPE_REGISTRY[id].grammarType === type));
