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
  // Parametric shapes (Phase 7.6): what the O/R/L tools and shape recognition create
  "rectangle",
  "ellipse",
  "line",
  "polygon",
  "star",
  "arrow",
  // Effect layers (Phase 7.5 types): host a Surface (engine spec §7); runtime in Track X
  "effectSurface",
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

/** Details sections for parametric shapes: the same surface as an SVG path. */
const SHAPE_SECTIONS: readonly DetailSectionId[] = ["identity", "appearance", "attachments", "variables", "events", "layout"];

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
      "content.label": "Primary Action",
      "appearance.variant": "primary",
      "appearance.background.color": "#206859",
      "typography.color": "#ffffff",
      "appearance.radius": 8,
      "layout.paddingX": 20,
      "layout.paddingY": 10,
      "typography.fontSize": 14,
      "typography.fontWeight": "600",
      "interaction.disabled": false,
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
    defaultProps: {
      "toggle.checked": false,
      "toggle.activeColor": "#206859",
      "toggle.inactiveColor": "#e2e8f0",
      "toggle.size": "md",
      "interaction.disabled": false,
    },
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
      "content.label": "Status Badge",
      "appearance.variant": "filled",
      "appearance.background.color": "#e6f4f1",
      "typography.color": "#206859",
      "appearance.radius": 16,
      "layout.paddingX": 12,
      "layout.paddingY": 4,
      "typography.fontSize": 12,
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
    defaultProps: {
      "content.icon": "plus",
      "appearance.background.color": "#206859",
      "typography.color": "#ffffff",
      "button.size": 56,
      "appearance.elevation": "lg",
    },
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
      "media.src": `${IMAGE_SRC}?w=800&q=80`,
      "media.fallbackSrc": `${IMAGE_SRC}?w=400&q=50`,
      "media.alt": "Hero Image",
      "media.objectFit": "cover",
      "media.objectPosition": "center",
      "media.aspectRatio": "16:9",
      "frame.width": 600,
      "frame.height": 338,
      "media.loadingMode": "lazy",
      "media.placeholder": "blur",
      "appearance.radius": 12,
      "appearance.opacity": 1,
      "media.filter.grayscale": 0,
      "media.filter.blur": 0,
      "media.filter.brightness": 1,
      "media.filter.contrast": 1,
      "media.filter.saturate": 1,
      "media.overlay.color": "#000000",
      "media.overlay.opacity": 0,
      "media.overlay.blendMode": "normal",
      "media.clipPath": "none",
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
      "content.iconName": "Sparkles",
      "svg.size": 24,
      "svg.stroke": "currentColor",
      "svg.strokeWidth": 2,
      "svg.fill": "none",
      "svg.strokeDasharray": "none",
      "svg.strokeDashoffset": 0,
      "svg.path": "M12 2L2 7l10 5 10-5-10-5z",
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
      "divider.orientation": "horizontal",
      "divider.length": 100,
      "divider.thickness": 1,
      "divider.style": "solid",
      "divider.color": "#e2e8f0",
      "divider.capStyle": "round",
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
      "background.type": "gradient",
      "background.color": "#0f172a",
      "background.gradient.stops": [{ color: "#0f172a", offset: 0 }, { color: "#1e293b", offset: 100 }],
      "background.gradient.angle": 135,
      "background.parallax.speed": 0.2,
      "background.blendMode": "normal",
      "background.noise.opacity": 0.05,
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
      "layout.display": "flex",
      "layout.flexDirection": "column",
      "layout.gap": 16,
      "layout.padding": 24,
      "appearance.radius": 8,
      "appearance.background.color": "transparent",
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
      "content.text": "Dynamic Typography",
      "typography.fontSize": 24,
      "typography.fontWeight": "600",
      "typography.fontFamily": "Inter",
      "typography.color": "#0f172a",
      "typography.textAlign": "left",
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
    defaultProps: {
      "input.type": "text",
      "input.placeholder": "Enter a value",
      "input.required": false,
      "interaction.disabled": false,
    },
  },
  form: {
    kind: "element",
    family: "structural",
    label: "Form",
    idPrefix: "elem_form",
    exportTag: "form",
    grammarType: "Form",
    sections: ["identity", "input_validation", "container_layout", "attachments", "variables", "events", "layout"],
    defaultProps: {
      "layout.display": "flex",
      "layout.flexDirection": "column",
      "layout.gap": 12,
    },
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
    defaultProps: {
      "svg.path": "M0 0 L100 100",
      "svg.stroke": "#0f172a",
      "svg.strokeWidth": 2,
      "svg.fill": "none",
    },
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
    defaultProps: {
      "svg.href": "",
    },
  },
  svgText: {
    kind: "vector",
    family: null,
    label: "SVG Text",
    idPrefix: "vec_text",
    exportTag: "text",
    grammarType: "SVG",
    sections: ["identity", "typography", "appearance", "attachments", "variables", "events", "layout"],
    defaultProps: {
      "content.text": "Text",
      "svg.fill": "#0f172a",
    },
  },
  rectangle: {
    kind: "vector",
    family: null,
    label: "Rectangle",
    idPrefix: "shp_rect",
    exportTag: "rect",
    grammarType: "SVG",
    sections: SHAPE_SECTIONS,
    defaultProps: {
      "frame.width": 160,
      "frame.height": 120,
      "svg.fill": "#cbd5e1",
      "svg.stroke": "none",
      "svg.strokeWidth": 0,
      "shape.cornerRadius": 0,
    },
  },
  ellipse: {
    kind: "vector",
    family: null,
    label: "Ellipse",
    idPrefix: "shp_ellipse",
    exportTag: "ellipse",
    grammarType: "SVG",
    sections: SHAPE_SECTIONS,
    defaultProps: {
      "frame.width": 120,
      "frame.height": 120,
      "svg.fill": "#cbd5e1",
      "svg.stroke": "none",
      "svg.strokeWidth": 0,
    },
  },
  line: {
    kind: "vector",
    family: null,
    label: "Line",
    idPrefix: "shp_line",
    exportTag: "line",
    grammarType: "SVG",
    sections: SHAPE_SECTIONS,
    defaultProps: {
      "frame.width": 160,
      "frame.height": 2,
      "svg.stroke": "#0f172a",
      "svg.strokeWidth": 2,
      "svg.strokeLinecap": "round",
    },
  },
  polygon: {
    kind: "vector",
    family: null,
    label: "Polygon",
    idPrefix: "shp_poly",
    exportTag: "polygon",
    grammarType: "SVG",
    sections: SHAPE_SECTIONS,
    defaultProps: {
      "frame.width": 120,
      "frame.height": 120,
      "svg.fill": "#cbd5e1",
      "svg.stroke": "none",
      "svg.strokeWidth": 0,
      "shape.sides": 6,
    },
  },
  star: {
    kind: "vector",
    family: null,
    label: "Star",
    idPrefix: "shp_star",
    exportTag: "polygon",
    grammarType: "SVG",
    sections: SHAPE_SECTIONS,
    defaultProps: {
      "frame.width": 120,
      "frame.height": 120,
      "svg.fill": "#cbd5e1",
      "svg.stroke": "none",
      "svg.strokeWidth": 0,
      "shape.points": 5,
      "shape.innerRadius": 0.5,
    },
  },
  arrow: {
    kind: "vector",
    family: null,
    label: "Arrow",
    idPrefix: "shp_arrow",
    exportTag: "path",
    grammarType: "SVG",
    sections: SHAPE_SECTIONS,
    defaultProps: {
      "frame.width": 160,
      "frame.height": 32,
      "svg.fill": "#cbd5e1",
      "svg.stroke": "none",
      "svg.strokeWidth": 0,
      "shape.headLength": 16,
      "shape.headWidth": 24,
      "shape.shaftWidth": 6,
    },
  },
  effectSurface: {
    kind: "effect",
    family: null,
    label: "Effect Surface",
    idPrefix: "fx_surf",
    exportTag: "canvas",
    // TODO(P8): grammar §13.3 defines 3.F types (Effect Surface, Shader Layer, Particle
    // System, Simulation Layer, Cursor Layer, Texture Source). Phase 8 compiles them into
    // the rule table; until then the surface's role/program says which one it is.
    grammarType: "Canvas",
    sections: ["identity", "attachments", "variables", "events", "layout"],
    defaultProps: {
      "appearance.pointerEvents": "none",
    },
  },
  object3D: {
    kind: "scene3d",
    family: null,
    label: "3D Object",
    idPrefix: "s3d_obj",
    exportTag: "mesh",
    grammarType: "Canvas",
    sections: ["identity", "scene3d_transform", "pbr_material", "attachments", "variables", "events"],
    defaultProps: {
      "scene3d.position": [0, 0, 0],
      "scene3d.rotation": [0, 0, 0, 1],
      "scene3d.scale": [1, 1, 1],
      "scene3d.geometry": {
        type: "box",
        dimensions: [1, 1, 1],
      },
      "scene3d.material.color": "#4f46e5",
      "scene3d.material.roughness": 0.4,
      "scene3d.material.metalness": 0.2,
      "scene3d.material.emissive": "#000000",
      "scene3d.material.emissiveIntensity": 0,
      "scene3d.material.wireframe": false,
      "scene3d.material.transparent": false,
      "scene3d.material.opacity": 1,
      "scene3d.visible": true,
      "scene3d.castShadow": true,
      "scene3d.receiveShadow": true,
    },
  },
  camera3D: {
    kind: "scene3d",
    family: null,
    label: "3D Camera",
    idPrefix: "s3d_cam",
    exportTag: "perspectiveCamera",
    grammarType: "Canvas",
    sections: ["identity", "scene3d_transform", "camera_settings", "attachments", "variables", "events"],
    defaultProps: {
      "scene3d.camera.projection": "perspective",
      "scene3d.camera.fov": 60,
      "scene3d.camera.near": 0.1,
      "scene3d.camera.far": 1000,
      "scene3d.camera.aspect": 16 / 9,
      "scene3d.camera.lookAt": [0, 0, 0],
    },
  },
  light3D: {
    kind: "scene3d",
    family: null,
    label: "3D Light",
    idPrefix: "s3d_light",
    exportTag: "light",
    grammarType: "Canvas",
    sections: ["identity", "scene3d_transform", "light_settings", "attachments", "variables", "events"],
    defaultProps: {
      "scene3d.light.type": "directional",
      "scene3d.light.color": "#ffffff",
      "scene3d.light.intensity": 1,
      "scene3d.light.castShadow": true,
      "scene3d.light.distance": 0,
      "scene3d.light.decay": 1,
    },
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
