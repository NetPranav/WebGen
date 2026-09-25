/**
 * ============================================================================
 * CANONICAL PROPERTY REGISTRY (MDM, ROADMAP Phase 42.1)
 * ============================================================================
 * One name for every property a layer can carry: static props, state
 * snapshots, animation tracks, links and the inspector all address a property
 * by the canonical dot-path declared here (e.g. `transform.y`,
 * `appearance.background.color`, `typography.fontSize`).
 *
 * Canonical names follow CONVENTIONS §4 (the animatable-path catalogue the
 * runtime and presets already speak). Paths CONVENTIONS doesn't cover
 * (layout, content, interaction, 3D, geometry) extend the same grouping.
 * Decision record: DOCS/Initial/decisions/0003-geometry-vs-transform.md.
 *
 * Legacy names — the flat v2 prop keys (`backgroundColor`, `borderRadius`)
 * and the preset track dialect (`transform.translateY`) — resolve through
 * LEGACY_ALIASES. Some legacy keys mean different things on different
 * archetypes (`color` is text colour on a button but line colour on a
 * divider), so aliases can be archetype-specific. The v2 → v3 migration
 * (Phase 42.2) rewrites stored documents through `resolvePropertyPath`.
 * ============================================================================
 */

import { ARCHETYPE_IDS, ARCHETYPE_REGISTRY, type ArchetypeId, type PropValue } from "./registry";
import type { DetailSectionId } from "../types/element-sections";
import type { AnimationTrackId } from "../types/animations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PropertyValueType =
  | "number"
  | "length"
  | "angle"
  | "color"
  | "string"
  | "enum"
  | "boolean"
  | "pathData"
  | "clipPath"
  | "vector3"
  | "quaternion"
  | "gradientStops"
  | "object";

/**
 * What changing the property costs the browser. Drives the Phase 8 rules
 * (animating `layout` properties needs the rules to accept the cost).
 * `none` = does not affect rendering (metadata, accessibility, behaviour flags).
 */
export type CompositingClass = "gpu" | "paint" | "layout" | "none";

/** Which archetypes carry a property. */
type Scope =
  | { kind: "visual" }
  | { kind: "section"; sections: readonly DetailSectionId[]; extra?: readonly ArchetypeId[] }
  | { kind: "archetypes"; archetypes: readonly ArchetypeId[] };

export interface PropertyDefinition {
  path: string;
  valueType: PropertyValueType;
  /** Default unit for `length` / `angle` values. */
  unit?: "px" | "deg" | "%" | "s";
  default: PropValue;
  /** CSS property this maps to on the web renderer, or null when it has none. */
  css: string | null;
  compositing: CompositingClass;
  animatable: boolean;
  /** Allowed values for `enum` properties, when the set is closed. */
  options?: readonly string[];
  archetypes: readonly ArchetypeId[];
}

// ---------------------------------------------------------------------------
// Scopes
// ---------------------------------------------------------------------------

const VISUAL: Scope = { kind: "visual" };
const section = (...sections: DetailSectionId[]): Scope => ({ kind: "section", sections });
const sectionPlus = (sections: DetailSectionId[], extra: ArchetypeId[]): Scope => ({ kind: "section", sections, extra });
const only = (...archetypes: ArchetypeId[]): Scope => ({ kind: "archetypes", archetypes });

function resolveScope(scope: Scope): ArchetypeId[] {
  switch (scope.kind) {
    case "visual":
      return ARCHETYPE_IDS.filter((id) => ARCHETYPE_REGISTRY[id].kind !== "scene3d");
    case "section":
      return ARCHETYPE_IDS.filter(
        (id) => ARCHETYPE_REGISTRY[id].sections.some((s) => scope.sections.includes(s)) || scope.extra?.includes(id)
      );
    case "archetypes":
      return [...scope.archetypes];
  }
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

type Def = Omit<PropertyDefinition, "path" | "archetypes"> & { scope: Scope };

const num = (dflt: number, css: string | null, compositing: CompositingClass, scope: Scope, animatable = true): Def => ({
  valueType: "number", default: dflt, css, compositing, animatable, scope,
});
const px = (dflt: number, css: string | null, compositing: CompositingClass, scope: Scope, animatable = true): Def => ({
  valueType: "length", unit: "px", default: dflt, css, compositing, animatable, scope,
});
const deg = (dflt: number, css: string | null, compositing: CompositingClass, scope: Scope): Def => ({
  valueType: "angle", unit: "deg", default: dflt, css, compositing, animatable: true, scope,
});
const color = (dflt: string, css: string | null, compositing: CompositingClass, scope: Scope): Def => ({
  valueType: "color", default: dflt, css, compositing, animatable: true, scope,
});
const str = (dflt: string, css: string | null, compositing: CompositingClass, scope: Scope): Def => ({
  valueType: "string", default: dflt, css, compositing, animatable: false, scope,
});
const oneOf = (options: readonly string[] | null, dflt: string, css: string | null, compositing: CompositingClass, scope: Scope): Def => ({
  valueType: "enum", default: dflt, css, compositing, animatable: false, scope, ...(options ? { options } : {}),
});
const flag = (dflt: boolean, compositing: CompositingClass, scope: Scope): Def => ({
  valueType: "boolean", default: dflt, css: null, compositing, animatable: false, scope,
});
const unitOf = (scope: Scope): Def => oneOf(["px", "rem", "em", "%", "vw", "vh", "auto"], "px", null, "layout", scope);

const TYPOGRAPHY = section("typography", "text_content");
const LAYOUT = section("layout", "container_layout");
const FLEX = section("container_layout");
const BUTTON = only("button", "fab");
const IMAGE = only("image");
const SVG_STROKED = only("icon", "svgPath", "svgGroup", "svgUse", "svgText");
const INTERACTIVE = only("button", "toggle", "fab", "input", "form");
const OBJECT3D = only("object3D");
const CAMERA3D = only("camera3D");
const LIGHT3D = only("light3D");
const SCENE3D = only("object3D", "camera3D", "light3D");
const ALL = only(...ARCHETYPE_IDS);

const DEFS = {
  // --- Geometry (Phase 42.3): layout, what the canvas edits -----------------
  "frame.x": px(0, "left", "layout", VISUAL),
  "frame.y": px(0, "top", "layout", VISUAL),
  "frame.width": px(0, "width", "layout", VISUAL),
  "frame.height": px(0, "height", "layout", VISUAL),
  "frame.widthUnit": unitOf(VISUAL),
  "frame.heightUnit": unitOf(VISUAL),
  "frame.rotation": deg(0, "rotate", "layout", VISUAL),
  "sizing.horizontal": oneOf(["fixed", "hug", "fill"], "hug", null, "layout", VISUAL),
  "sizing.vertical": oneOf(["fixed", "hug", "fill"], "hug", null, "layout", VISUAL),
  positioning: oneOf(["absolute", "flow"], "flow", "position", "layout", VISUAL),

  // --- Transform: motion offset on top of frame, GPU-only (CONVENTIONS §4.1) -
  "transform.x": px(0, "transform", "gpu", VISUAL),
  "transform.y": px(0, "transform", "gpu", VISUAL),
  "transform.z": px(0, "transform", "gpu", VISUAL),
  "transform.scale": num(1, "transform", "gpu", VISUAL),
  "transform.scaleX": num(1, "transform", "gpu", VISUAL),
  "transform.scaleY": num(1, "transform", "gpu", VISUAL),
  "transform.rotate": deg(0, "transform", "gpu", VISUAL),
  "transform.rotateX": deg(0, "transform", "gpu", VISUAL),
  "transform.rotateY": deg(0, "transform", "gpu", VISUAL),
  "transform.skewX": deg(0, "transform", "gpu", VISUAL),
  "transform.skewY": deg(0, "transform", "gpu", VISUAL),
  /** CSS motion path (`offset-path`); the layer travels along it as `transform` does. */
  "transform.motionPath": { valueType: "pathData", default: "", css: "offset-path", compositing: "gpu", animatable: true, scope: VISUAL },

  // --- Appearance (CONVENTIONS §4.1 / §4.2) ---------------------------------
  "appearance.opacity": num(1, "opacity", "gpu", VISUAL),
  "appearance.radius": px(0, "border-radius", "paint", VISUAL),
  "appearance.background.color": color("transparent", "background-color", "paint", VISUAL),
  "appearance.border.color": color("transparent", "border-color", "paint", VISUAL),
  "appearance.border.width": px(0, "border-width", "layout", VISUAL),
  "appearance.border.style": oneOf(["none", "solid", "dashed", "dotted"], "none", "border-style", "paint", VISUAL),
  /** CSS `border` shorthand, e.g. `1px solid #e2e8f0`. */
  "appearance.border": str("none", "border", "paint", VISUAL),
  "appearance.border.bottom": str("none", "border-bottom", "paint", VISUAL),
  "appearance.backdropFilter": str("none", "backdrop-filter", "paint", VISUAL),
  "appearance.blendMode": oneOf(null, "normal", "mix-blend-mode", "paint", VISUAL),
  "appearance.variant": oneOf(null, "primary", null, "paint", only("button", "badge")),
  "appearance.elevation": oneOf(["none", "sm", "md", "lg", "xl"], "none", null, "paint", VISUAL),
  "appearance.shadow": str("none", "box-shadow", "paint", VISUAL),
  "appearance.cursor": oneOf(null, "auto", "cursor", "none", VISUAL),
  "appearance.pointerEvents": oneOf(["auto", "none"], "auto", "pointer-events", "none", VISUAL),
  "appearance.userSelect": oneOf(["auto", "none", "text", "all"], "auto", "user-select", "none", VISUAL),
  "appearance.willChange": oneOf(["auto", "transform", "opacity"], "auto", "will-change", "none", VISUAL),
  "filter.blur": px(0, "filter", "paint", VISUAL),

  // --- Typography (CONVENTIONS §4.2) ----------------------------------------
  // The FAB has no typography section but its `color` tints its icon glyph; containers
  // and forms set text colour/alignment for the text they contain (CSS inheritance).
  "typography.color": color("#0f172a", "color", "paint", sectionPlus(["typography", "text_content"], ["fab", "container", "form"])),
  "typography.fontSize": px(16, "font-size", "layout", TYPOGRAPHY),
  "typography.fontSizeUnit": unitOf(TYPOGRAPHY),
  "typography.fontWeight": oneOf(null, "400", "font-weight", "layout", TYPOGRAPHY),
  "typography.fontFamily": str("Inter", "font-family", "layout", TYPOGRAPHY),
  "typography.fontStyle": oneOf(["normal", "italic"], "normal", "font-style", "layout", TYPOGRAPHY),
  "typography.letterSpacing": px(0, "letter-spacing", "layout", TYPOGRAPHY),
  "typography.letterSpacingUnit": unitOf(TYPOGRAPHY),
  "typography.lineHeight": num(1.4, "line-height", "layout", TYPOGRAPHY),
  "typography.lineHeightUnit": unitOf(TYPOGRAPHY),
  "typography.wordSpacing": px(0, "word-spacing", "layout", TYPOGRAPHY),
  "typography.wordSpacingUnit": unitOf(TYPOGRAPHY),
  "typography.textAlign": oneOf(["left", "center", "right", "justify"], "left", "text-align", "layout", sectionPlus(["typography", "text_content"], ["container", "form"])),
  "typography.textTransform": oneOf(["none", "uppercase", "lowercase", "capitalize"], "none", "text-transform", "layout", TYPOGRAPHY),
  "typography.textDecoration": oneOf(null, "none", "text-decoration-line", "paint", TYPOGRAPHY),
  "typography.textDecorationColor": color("currentColor", "text-decoration-color", "paint", TYPOGRAPHY),
  "typography.textOverflow": oneOf(["clip", "ellipsis"], "clip", "text-overflow", "paint", TYPOGRAPHY),
  "typography.whiteSpace": oneOf(null, "normal", "white-space", "layout", TYPOGRAPHY),
  "typography.format.bold": flag(false, "layout", TYPOGRAPHY),
  "typography.format.italic": flag(false, "layout", TYPOGRAPHY),
  "typography.format.underline": flag(false, "paint", TYPOGRAPHY),
  "typography.format.strike": flag(false, "paint", TYPOGRAPHY),
  "typography.format.code": flag(false, "layout", TYPOGRAPHY),
  "typography.split": oneOf(["none", "chars", "words", "lines"], "none", null, "layout", TYPOGRAPHY),

  // --- Content ---------------------------------------------------------------
  "content.text": str("", null, "layout", only("text", "svgText", "generic")),
  // The FAB's label shows when it expands on hover (`button.expandOnHover`).
  "content.label": str("", null, "layout", only("button", "badge", "toggle", "fab")),
  "content.isRichText": flag(false, "layout", only("text")),
  "content.icon": str("plus", null, "layout", only("fab")),
  "content.iconName": str("Sparkles", null, "layout", only("icon")),

  // --- Layout (flow and container) -------------------------------------------
  "layout.display": oneOf(["block", "flex", "grid", "inline", "inline-flex", "none"], "block", "display", "layout", LAYOUT),
  "layout.mode": oneOf(null, "stack", null, "layout", FLEX),
  "layout.flexDirection": oneOf(["row", "column", "row-reverse", "column-reverse"], "column", "flex-direction", "layout", FLEX),
  "layout.flexWrap": oneOf(["nowrap", "wrap", "wrap-reverse"], "nowrap", "flex-wrap", "layout", FLEX),
  "layout.justifyContent": oneOf(null, "flex-start", "justify-content", "layout", FLEX),
  "layout.alignItems": oneOf(null, "stretch", "align-items", "layout", FLEX),
  "layout.gap": px(0, "gap", "layout", FLEX),
  "layout.gapUnit": unitOf(FLEX),
  "layout.rowGap": px(0, "row-gap", "layout", FLEX),
  "layout.columnGap": px(0, "column-gap", "layout", FLEX),
  "layout.gridColumns": num(2, null, "layout", FLEX, false),
  "layout.gridRows": num(1, null, "layout", FLEX, false),
  "layout.gridTemplateColumns": str("", "grid-template-columns", "layout", FLEX),
  "layout.gridTemplateRows": str("", "grid-template-rows", "layout", FLEX),
  "layout.padding": px(0, "padding", "layout", LAYOUT),
  "layout.paddingX": px(0, "padding-inline", "layout", LAYOUT),
  "layout.paddingY": px(0, "padding-block", "layout", LAYOUT),
  "layout.margin": px(0, "margin", "layout", LAYOUT),
  "layout.marginTop": px(0, "margin-top", "layout", LAYOUT),
  "layout.marginBottom": px(0, "margin-bottom", "layout", LAYOUT),
  "layout.alignSelf": oneOf(null, "auto", "align-self", "layout", LAYOUT),
  "layout.flex": str("", "flex", "layout", LAYOUT),
  "layout.flexGrow": num(0, "flex-grow", "layout", LAYOUT, false),
  "layout.flexShrink": num(1, "flex-shrink", "layout", LAYOUT, false),
  "layout.position": oneOf(["static", "relative", "absolute", "fixed", "sticky"], "static", "position", "layout", LAYOUT),
  "layout.top": px(0, "top", "layout", LAYOUT),
  "layout.right": px(0, "right", "layout", LAYOUT),
  "layout.bottom": px(0, "bottom", "layout", LAYOUT),
  "layout.left": px(0, "left", "layout", LAYOUT),
  "layout.zIndex": num(0, "z-index", "paint", LAYOUT, false),
  "layout.minWidth": px(0, "min-width", "layout", LAYOUT),
  "layout.maxWidth": px(0, "max-width", "layout", LAYOUT),
  "layout.minHeight": px(0, "min-height", "layout", LAYOUT),
  "layout.maxHeight": px(0, "max-height", "layout", LAYOUT),
  "layout.overflowX": oneOf(["visible", "hidden", "scroll", "auto"], "visible", "overflow-x", "paint", LAYOUT),
  "layout.overflowY": oneOf(["visible", "hidden", "scroll", "auto"], "visible", "overflow-y", "paint", LAYOUT),
  "layout.boxSizing": oneOf(["border-box", "content-box"], "border-box", "box-sizing", "layout", LAYOUT),

  // --- Interaction & accessibility -------------------------------------------
  "interaction.disabled": flag(false, "paint", INTERACTIVE),
  "a11y.label": str("", null, "none", ALL),
  "a11y.role": str("", null, "none", ALL),
  /** Explicit semantic tag for export (overrides the archetype's inferred tag). */
  "export.tag": str("", null, "none", ALL),

  // --- Button & FAB states (button_states) -----------------------------------
  "button.type": oneOf(["button", "submit", "reset"], "button", null, "none", only("button")),
  "button.size": px(56, "width", "layout", BUTTON),
  "button.hoverBgColor": color("#174f43", "background-color", "paint", BUTTON),
  "button.activeBgColor": color("#123f36", "background-color", "paint", BUTTON),
  "button.focusRingColor": color("#2dd4bf", "outline-color", "paint", BUTTON),
  "button.focusRingWidth": px(2, "outline-width", "paint", BUTTON),
  "button.disabledOpacity": num(0.5, "opacity", "gpu", BUTTON),
  "button.rippleEnabled": flag(false, "none", BUTTON),
  "button.rippleDuration": { valueType: "number", unit: "s", default: 0.6, css: null, compositing: "none", animatable: false, scope: BUTTON },
  "button.rippleOrigin": oneOf(["pointer", "center"], "pointer", null, "none", BUTTON),
  "button.isLoading": flag(false, "layout", BUTTON),
  "button.loadingLabel": str("Loading…", null, "layout", BUTTON),
  "button.spinnerType": oneOf(null, "ring", null, "paint", BUTTON),
  "button.spinnerColor": color("currentColor", null, "paint", BUTTON),
  "button.disableWhileLoading": flag(true, "none", BUTTON),
  "button.expandOnHover": flag(false, "layout", BUTTON),

  // --- Toggle (toggle_states) -------------------------------------------------
  "toggle.checked": flag(false, "paint", only("toggle")),
  "toggle.activeColor": color("#206859", "background-color", "paint", only("toggle")),
  "toggle.inactiveColor": color("#e2e8f0", "background-color", "paint", only("toggle")),
  "toggle.size": oneOf(["sm", "md", "lg"], "md", null, "layout", only("toggle")),

  // --- Input & form (input_validation) ---------------------------------------
  "input.type": oneOf(null, "text", null, "none", only("input")),
  "input.placeholder": str("", null, "paint", only("input")),
  "input.value": str("", null, "paint", only("input")),
  "input.required": flag(false, "none", only("input", "form")),
  "input.readOnly": flag(false, "none", only("input")),
  "input.pattern": str("", null, "none", only("input")),
  "input.errorMessage": str("", null, "layout", only("input", "form")),

  // --- Media: image (CONVENTIONS §4.3) ----------------------------------------
  "media.src": str("", null, "paint", IMAGE),
  "media.fallbackSrc": str("", null, "none", IMAGE),
  "media.alt": str("", null, "none", IMAGE),
  "media.objectFit": oneOf(["cover", "contain", "fill", "none", "scale-down"], "cover", "object-fit", "paint", IMAGE),
  "media.objectPosition": str("center", "object-position", "paint", IMAGE),
  "media.aspectRatio": str("auto", "aspect-ratio", "layout", IMAGE),
  "media.loadingMode": oneOf(["lazy", "eager"], "lazy", null, "none", IMAGE),
  "media.placeholder": oneOf(["none", "blur", "color"], "none", null, "paint", IMAGE),
  "media.focalPoint.x": num(50, "object-position", "paint", IMAGE),
  "media.focalPoint.y": num(50, "object-position", "paint", IMAGE),
  "media.filter.grayscale": num(0, "filter", "paint", IMAGE),
  "media.filter.blur": px(0, "filter", "paint", IMAGE),
  "media.filter.brightness": num(1, "filter", "paint", IMAGE),
  "media.filter.contrast": num(1, "filter", "paint", IMAGE),
  "media.filter.saturate": num(1, "filter", "paint", IMAGE),
  "media.clipPath": { valueType: "clipPath", default: "none", css: "clip-path", compositing: "paint", animatable: true, scope: IMAGE },
  "media.overlay.color": color("#000000", "background-color", "paint", IMAGE),
  "media.overlay.opacity": num(0, "opacity", "gpu", IMAGE),
  "media.overlay.blendMode": oneOf(null, "normal", "mix-blend-mode", "paint", IMAGE),

  // --- SVG / icon (CONVENTIONS §4.3) ------------------------------------------
  "svg.path": { valueType: "pathData", default: "", css: "d", compositing: "paint", animatable: true, scope: only("icon", "svgPath") },
  "svg.size": px(24, "width", "layout", only("icon")),
  "svg.stroke": color("currentColor", "stroke", "paint", SVG_STROKED),
  "svg.strokeWidth": px(2, "stroke-width", "paint", SVG_STROKED),
  "svg.fill": color("none", "fill", "paint", SVG_STROKED),
  "svg.strokeDasharray": str("none", "stroke-dasharray", "paint", SVG_STROKED),
  "svg.strokeDashoffset": num(0, "stroke-dashoffset", "paint", SVG_STROKED),
  "svg.href": str("", null, "paint", only("svgUse")),
  "svg.viewBox": str("0 0 24 24", null, "layout", only("icon", "svgGroup")),
  "svg.filter.gaussianBlur": num(0, "filter", "paint", SVG_STROKED),
  "svg.filter.colorMatrix": str("", "filter", "paint", SVG_STROKED),
  "svg.filter.displacementScale": num(0, "filter", "paint", SVG_STROKED),

  // --- Divider (CONVENTIONS §4.4) ---------------------------------------------
  "divider.orientation": oneOf(["horizontal", "vertical"], "horizontal", null, "layout", only("divider")),
  "divider.length": num(100, "width", "layout", only("divider")),
  "divider.thickness": px(1, "height", "layout", only("divider")),
  "divider.style": oneOf(["solid", "dashed", "dotted", "gradient"], "solid", "border-style", "paint", only("divider")),
  "divider.color": color("#e2e8f0", "background-color", "paint", only("divider")),
  "divider.capStyle": oneOf(["butt", "round", "square"], "round", "stroke-linecap", "paint", only("divider")),
  "divider.strokeDashoffset": num(0, "stroke-dashoffset", "paint", only("divider")),
  "divider.gradient.angle": deg(90, "background-image", "paint", only("divider")),

  // --- Background (CONVENTIONS §4.4) ------------------------------------------
  "background.type": oneOf(["solid", "gradient", "image", "pattern", "noise"], "solid", null, "paint", only("background")),
  "background.color": color("#0f172a", "background-color", "paint", only("background")),
  "background.gradient.stops": { valueType: "gradientStops", default: [], css: "background-image", compositing: "paint", animatable: false, scope: only("background") },
  "background.gradient.angle": deg(135, "background-image", "paint", only("background")),
  "background.gradient.stopOffset": num(0, "background-image", "paint", only("background")),
  "background.gradient.stopColor": color("#0f172a", "background-image", "paint", only("background")),
  "background.parallax.speed": num(0, null, "gpu", only("background")),
  "background.blendMode": oneOf(null, "normal", "mix-blend-mode", "paint", only("background")),
  "background.noise.opacity": num(0, "opacity", "paint", only("background")),
  "background.pattern": str("none", "background-image", "paint", only("background")),

  // --- 3D scene -----------------------------------------------------------------
  "scene3d.position": { valueType: "vector3", default: [0, 0, 0], css: null, compositing: "gpu", animatable: true, scope: SCENE3D },
  "scene3d.rotation": { valueType: "quaternion", default: [0, 0, 0, 1], css: null, compositing: "gpu", animatable: true, scope: SCENE3D },
  "scene3d.scale": { valueType: "vector3", default: [1, 1, 1], css: null, compositing: "gpu", animatable: true, scope: SCENE3D },
  "scene3d.visible": flag(true, "gpu", SCENE3D),
  "scene3d.castShadow": flag(true, "gpu", OBJECT3D),
  "scene3d.receiveShadow": flag(true, "gpu", OBJECT3D),
  "scene3d.geometry": { valueType: "object", default: { type: "box", dimensions: [1, 1, 1] }, css: null, compositing: "gpu", animatable: false, scope: OBJECT3D },
  "scene3d.material.color": color("#4f46e5", null, "gpu", OBJECT3D),
  "scene3d.material.roughness": num(0.4, null, "gpu", OBJECT3D),
  "scene3d.material.metalness": num(0.2, null, "gpu", OBJECT3D),
  "scene3d.material.emissive": color("#000000", null, "gpu", OBJECT3D),
  "scene3d.material.emissiveIntensity": num(0, null, "gpu", OBJECT3D),
  "scene3d.material.wireframe": flag(false, "gpu", OBJECT3D),
  "scene3d.material.transparent": flag(false, "gpu", OBJECT3D),
  "scene3d.material.opacity": num(1, null, "gpu", OBJECT3D),
  "scene3d.camera.projection": oneOf(["perspective", "orthographic"], "perspective", null, "gpu", CAMERA3D),
  "scene3d.camera.fov": num(60, null, "gpu", CAMERA3D),
  "scene3d.camera.near": num(0.1, null, "gpu", CAMERA3D),
  "scene3d.camera.far": num(1000, null, "gpu", CAMERA3D),
  "scene3d.camera.aspect": num(16 / 9, null, "gpu", CAMERA3D),
  "scene3d.camera.lookAt": { valueType: "vector3", default: [0, 0, 0], css: null, compositing: "gpu", animatable: true, scope: CAMERA3D },
  "scene3d.light.type": oneOf(["directional", "point", "spot", "ambient", "hemisphere"], "directional", null, "gpu", LIGHT3D),
  "scene3d.light.color": color("#ffffff", null, "gpu", LIGHT3D),
  "scene3d.light.intensity": num(1, null, "gpu", LIGHT3D),
  "scene3d.light.castShadow": flag(true, "gpu", LIGHT3D),
  "scene3d.light.distance": num(0, null, "gpu", LIGHT3D),
  "scene3d.light.decay": num(1, null, "gpu", LIGHT3D),

  // --- Editor metadata stored on layers ------------------------------------------
  "motion.attachedSampleId": str("", null, "none", ALL),
  "motion.trigger": str("", null, "none", ALL),
  /** Logic Blueprint graph this layer's events run (After-track; read by the dependency graph). */
  "logic.blueprintGraphId": str("", null, "none", ALL),
} satisfies Record<string, Def>;

/** Every canonical property path, as a type: readers index props with these. */
export type PropertyPath = keyof typeof DEFS;

export const PROPERTY_REGISTRY: Readonly<Record<string, PropertyDefinition>> = Object.fromEntries(
  Object.entries(DEFS as Record<string, Def>).map(([path, { scope, ...def }]) => [path, { path, ...def, archetypes: resolveScope(scope) }])
);

export const PROPERTY_PATHS: readonly string[] = Object.keys(PROPERTY_REGISTRY);

// ---------------------------------------------------------------------------
// Legacy aliases (v2 prop keys + track dialects → canonical)
// ---------------------------------------------------------------------------

export interface LegacyAlias {
  /** Canonical path for archetypes not listed in `byArchetype`. */
  to?: string;
  byArchetype?: Partial<Record<ArchetypeId, string>>;
  /**
   * The legacy value is an object whose keys become sub-paths of the target
   * (`filter: { blur }` on an image → `media.filter.blur`).
   */
  split?: boolean;
  /** Multiply numeric values by this on migration, per archetype (image opacity was 0–100). */
  scaleByArchetype?: Partial<Record<ArchetypeId, number>>;
}

const TEXT_COLOR_OWNERS: Partial<Record<ArchetypeId, string>> = {
  divider: "divider.color",
  background: "background.color",
  light3D: "scene3d.light.color",
  icon: "svg.stroke",
};

export const LEGACY_ALIASES: Readonly<Record<string, LegacyAlias>> = {
  // Track dialect (presets) — the §4.1 row 4 scrub bug
  "transform.translateX": { to: "transform.x" },
  "transform.translateY": { to: "transform.y" },
  "transform.translateZ": { to: "transform.z" },
  "transform.rotateZ": { to: "transform.rotate" },
  opacity: { to: "appearance.opacity", scaleByArchetype: { image: 0.01 } },

  // Flat v2 prop keys
  backgroundColor: { to: "appearance.background.color" },
  borderRadius: { to: "appearance.radius" },
  borderColor: { to: "appearance.border.color" },
  borderWidth: { to: "appearance.border.width" },
  border: { to: "appearance.border" },
  borderBottom: { to: "appearance.border.bottom" },
  boxShadow: { to: "appearance.shadow" },
  shadow: { to: "appearance.shadow" },
  blur: { to: "filter.blur", byArchetype: { image: "media.filter.blur" } },
  backdropFilter: { to: "appearance.backdropFilter" },
  marginTop: { to: "layout.marginTop" },
  marginBottom: { to: "layout.marginBottom" },
  alignSelf: { to: "layout.alignSelf" },
  flex: { to: "layout.flex" },
  styleType: { to: "divider.style" },
  color: { to: "typography.color", byArchetype: TEXT_COLOR_OWNERS },
  blendMode: { to: "appearance.blendMode", byArchetype: { background: "background.blendMode" } },
  variant: { to: "appearance.variant" },
  elevation: { to: "appearance.elevation" },
  cursor: { to: "appearance.cursor" },
  pointerEvents: { to: "appearance.pointerEvents" },
  userSelect: { to: "appearance.userSelect" },
  willChange: { to: "appearance.willChange" },

  fontSize: { to: "typography.fontSize" },
  fontSizeUnit: { to: "typography.fontSizeUnit" },
  fontWeight: { to: "typography.fontWeight" },
  fontFamily: { to: "typography.fontFamily" },
  fontStyle: { to: "typography.fontStyle" },
  letterSpacing: { to: "typography.letterSpacing" },
  letterSpacingUnit: { to: "typography.letterSpacingUnit" },
  lineHeight: { to: "typography.lineHeight" },
  lineHeightUnit: { to: "typography.lineHeightUnit" },
  wordSpacing: { to: "typography.wordSpacing" },
  wordSpacingUnit: { to: "typography.wordSpacingUnit" },
  textAlign: { to: "typography.textAlign" },
  textTransform: { to: "typography.textTransform" },
  textDecoration: { to: "typography.textDecoration" },
  textDecorationColor: { to: "typography.textDecorationColor" },
  textOverflow: { to: "typography.textOverflow" },
  whiteSpace: { to: "typography.whiteSpace" },
  formatBold: { to: "typography.format.bold" },
  formatItalic: { to: "typography.format.italic" },
  formatUnderline: { to: "typography.format.underline" },
  formatStrike: { to: "typography.format.strike" },
  formatCode: { to: "typography.format.code" },
  splitText: { to: "typography.split" },

  // Text on a button or badge is its label.
  textContent: { to: "content.text", byArchetype: { button: "content.label", badge: "content.label", fab: "content.label" } },
  content: { to: "content.text", byArchetype: { button: "content.label", badge: "content.label", fab: "content.label" } },
  text: { to: "content.text", byArchetype: { button: "content.label", badge: "content.label", fab: "content.label" } },
  label: { to: "content.label" },
  isRichText: { to: "content.isRichText" },
  icon: { to: "content.icon" },
  iconName: { to: "content.iconName" },

  width: { to: "frame.width" },
  height: { to: "frame.height" },
  widthUnit: { to: "frame.widthUnit" },
  heightUnit: { to: "frame.heightUnit" },
  display: { to: "layout.display" },
  layoutMode: { to: "layout.mode" },
  flexDirection: { to: "layout.flexDirection" },
  flexWrap: { to: "layout.flexWrap" },
  justifyContent: { to: "layout.justifyContent" },
  alignItems: { to: "layout.alignItems" },
  gap: { to: "layout.gap" },
  gapUnit: { to: "layout.gapUnit" },
  rowGap: { to: "layout.rowGap" },
  columnGap: { to: "layout.columnGap" },
  gridColumns: { to: "layout.gridColumns" },
  gridRows: { to: "layout.gridRows" },
  gridTemplateColumns: { to: "layout.gridTemplateColumns" },
  gridTemplateRows: { to: "layout.gridTemplateRows" },
  padding: { to: "layout.padding" },
  paddingX: { to: "layout.paddingX" },
  paddingY: { to: "layout.paddingY" },
  margin: { to: "layout.margin" },
  flexGrow: { to: "layout.flexGrow" },
  flexShrink: { to: "layout.flexShrink" },
  position: { to: "layout.position" },
  top: { to: "layout.top" },
  right: { to: "layout.right" },
  bottom: { to: "layout.bottom" },
  left: { to: "layout.left" },
  zIndex: { to: "layout.zIndex" },
  minWidth: { to: "layout.minWidth" },
  maxWidth: { to: "layout.maxWidth" },
  minHeight: { to: "layout.minHeight" },
  maxHeight: { to: "layout.maxHeight" },
  overflowX: { to: "layout.overflowX" },
  overflowY: { to: "layout.overflowY" },
  boxSizing: { to: "layout.boxSizing" },

  disabled: { to: "interaction.disabled" },
  ariaLabel: { to: "a11y.label" },
  role: { to: "a11y.role" },
  semanticTag: { to: "export.tag" },

  size: { byArchetype: { fab: "button.size", button: "button.size", toggle: "toggle.size", icon: "svg.size" } },
  hoverBgColor: { to: "button.hoverBgColor" },
  activeBgColor: { to: "button.activeBgColor" },
  focusRingColor: { to: "button.focusRingColor" },
  focusRingWidth: { to: "button.focusRingWidth" },
  disabledOpacity: { to: "button.disabledOpacity" },
  rippleEnabled: { to: "button.rippleEnabled" },
  rippleDuration: { to: "button.rippleDuration" },
  rippleOrigin: { to: "button.rippleOrigin" },
  isLoading: { to: "button.isLoading" },
  loadingLabel: { to: "button.loadingLabel" },
  spinnerType: { to: "button.spinnerType" },
  spinnerColor: { to: "button.spinnerColor" },
  disableWhileLoading: { to: "button.disableWhileLoading" },
  expandOnHover: { to: "button.expandOnHover" },

  checked: { to: "toggle.checked" },
  defaultChecked: { to: "toggle.checked" },
  activeColor: { to: "toggle.activeColor" },
  inactiveColor: { to: "toggle.inactiveColor" },

  inputType: { to: "input.type" },
  value: { to: "input.value" },
  placeholder: { to: "input.placeholder", byArchetype: { image: "media.placeholder" } },
  required: { to: "input.required" },
  readOnly: { to: "input.readOnly" },
  pattern: { byArchetype: { input: "input.pattern", background: "background.pattern" } },
  errorMessage: { to: "input.errorMessage" },

  src: { to: "media.src" },
  imageSrc: { to: "media.src" },
  fallbackSrc: { to: "media.fallbackSrc" },
  alt: { to: "media.alt" },
  objectFit: { to: "media.objectFit" },
  objectPosition: { to: "media.objectPosition" },
  aspectRatio: { to: "media.aspectRatio" },
  loadingMode: { to: "media.loadingMode" },
  focalPoint: { to: "media.focalPoint", split: true },
  filter: { to: "media.filter", split: true },
  overlay: { to: "media.overlay", split: true },
  clipPath: { to: "media.clipPath" },

  path: { to: "svg.path" },
  d: { to: "svg.path" },
  stroke: { to: "svg.stroke" },
  strokeWidth: { to: "svg.strokeWidth" },
  fill: { to: "svg.fill" },
  strokeDasharray: { to: "svg.strokeDasharray" },
  strokeDashoffset: { to: "svg.strokeDashoffset", byArchetype: { divider: "divider.strokeDashoffset" } },
  href: { to: "svg.href" },
  viewBox: { to: "svg.viewBox" },

  orientation: { to: "divider.orientation" },
  length: { to: "divider.length" },
  thickness: { to: "divider.thickness" },
  style: { to: "divider.style" },
  capStyle: { to: "divider.capStyle" },

  type: { byArchetype: { background: "background.type", input: "input.type", button: "button.type" } },
  gradientStops: { to: "background.gradient.stops" },
  gradientAngle: { to: "background.gradient.angle", byArchetype: { divider: "divider.gradient.angle" } },
  parallaxSpeed: { to: "background.parallax.speed" },
  noiseOpacity: { to: "background.noise.opacity" },

  position3D: { to: "scene3d.position" },
  rotation3D: { to: "scene3d.rotation" },
  scale3D: { to: "scene3d.scale" },
  visible: { to: "scene3d.visible" },
  castShadow: { to: "scene3d.castShadow", byArchetype: { light3D: "scene3d.light.castShadow" } },
  receiveShadow: { to: "scene3d.receiveShadow" },
  geometry: { to: "scene3d.geometry" },
  material: { to: "scene3d.material", split: true },
  projection: { to: "scene3d.camera.projection" },
  fov: { to: "scene3d.camera.fov" },
  near: { to: "scene3d.camera.near" },
  far: { to: "scene3d.camera.far" },
  aspect: { to: "scene3d.camera.aspect" },
  lookAtTarget: { to: "scene3d.camera.lookAt" },
  lightType: { to: "scene3d.light.type" },
  intensity: { to: "scene3d.light.intensity" },
  distance: { to: "scene3d.light.distance" },
  decay: { to: "scene3d.light.decay" },

  attachedAnimationSampleId: { to: "motion.attachedSampleId" },
  animationTrigger: { to: "motion.trigger" },
  blueprintGraphId: { to: "logic.blueprintGraphId" },
};

/**
 * The legacy animation-sample vocabulary (`AnimationSample` tracks, used by the
 * sample library and the GSAP emitter) mapped onto canonical paths. Typed
 * against the full `AnimationTrackId` union, so a new id without a mapping
 * fails to compile. The sample model itself retires in Phase 57.
 */
export const ANIMATION_TRACK_ID_PATHS: Readonly<Record<AnimationTrackId, PropertyPath>> = {
  translateX: "transform.x",
  translateY: "transform.y",
  translateZ: "transform.z",
  scale: "transform.scale",
  scaleX: "transform.scaleX",
  scaleY: "transform.scaleY",
  rotate: "transform.rotate",
  rotateX: "transform.rotateX",
  rotateY: "transform.rotateY",
  skewX: "transform.skewX",
  skewY: "transform.skewY",
  opacity: "appearance.opacity",
  backgroundColor: "appearance.background.color",
  borderRadius: "appearance.radius",
  boxShadow: "appearance.shadow",
  filterBlur: "filter.blur",
  filterBrightness: "media.filter.brightness",
  filterContrast: "media.filter.contrast",
  letterSpacing: "typography.letterSpacing",
  lineHeight: "typography.lineHeight",
  color: "typography.color",
  fontSize: "typography.fontSize",
  pathMorph: "svg.path",
  strokeDashoffset: "svg.strokeDashoffset",
  motionPath: "transform.motionPath",
  feGaussianBlur: "svg.filter.gaussianBlur",
  feColorMatrix: "svg.filter.colorMatrix",
  feDisplacementMap: "svg.filter.displacementScale",
  gradientStopOffset: "background.gradient.stopOffset",
  gradientStopColor: "background.gradient.stopColor",
  position3D: "scene3d.position",
  rotation3D: "scene3d.rotation",
  scale3D: "scene3d.scale",
  cameraFov: "scene3d.camera.fov",
  lightIntensity: "scene3d.light.intensity",
  lightColor: "scene3d.light.color",
};

// ---------------------------------------------------------------------------
// Lookup & resolution
// ---------------------------------------------------------------------------

export function isCanonicalPath(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(PROPERTY_REGISTRY, path);
}

export function getPropertyDefinition(path: string): PropertyDefinition | undefined {
  return isCanonicalPath(path) ? PROPERTY_REGISTRY[path] : undefined;
}

export function isPropertyLegalFor(path: string, archetype: ArchetypeId): boolean {
  return getPropertyDefinition(path)?.archetypes.includes(archetype) ?? false;
}

export type PathResolution =
  | { ok: true; path: string; definition: PropertyDefinition; aliasedFrom?: string; scale?: number }
  | { ok: false; input: string; suggestion?: string; reason: string };

function aliasTarget(alias: LegacyAlias, archetype?: ArchetypeId): string | undefined {
  return (archetype && alias.byArchetype?.[archetype]) || alias.to;
}

/**
 * Resolves any property name (canonical, legacy flat key, legacy track path,
 * or a sub-path of a split legacy object) to its canonical definition.
 * `archetype` disambiguates keys whose meaning depends on the layer.
 */
export function resolvePropertyPath(input: string, archetype?: ArchetypeId): PathResolution {
  if (isCanonicalPath(input)) return { ok: true, path: input, definition: PROPERTY_REGISTRY[input] };

  const direct = Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, input) ? LEGACY_ALIASES[input] : undefined;
  if (direct && !direct.split) {
    const target = aliasTarget(direct, archetype);
    if (target && isCanonicalPath(target)) {
      const scale = archetype ? direct.scaleByArchetype?.[archetype] : undefined;
      return { ok: true, path: target, definition: PROPERTY_REGISTRY[target], aliasedFrom: input, ...(scale ? { scale } : {}) };
    }
    return { ok: false, input, reason: `"${input}" has no meaning on ${archetype ?? "this layer"}.` };
  }

  // Sub-path of a split legacy object: `filter.blur` → `media.filter.blur`.
  const dot = input.indexOf(".");
  if (dot > 0) {
    const head = input.slice(0, dot);
    const split = Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, head) ? LEGACY_ALIASES[head] : undefined;
    const base = split?.split ? aliasTarget(split, archetype) : undefined;
    if (base) {
      const target = `${base}${input.slice(dot)}`;
      if (isCanonicalPath(target)) return { ok: true, path: target, definition: PROPERTY_REGISTRY[target], aliasedFrom: input };
    }
  }

  const suggestion = suggestPropertyPath(input);
  return {
    ok: false,
    input,
    ...(suggestion ? { suggestion } : {}),
    reason: suggestion ? `Unknown property "${input}". Did you mean "${suggestion}"?` : `Unknown property "${input}".`,
  };
}

/** The closest canonical path by edit distance, or undefined when nothing is close. */
export function suggestPropertyPath(input: string): string | undefined {
  const needle = input.toLowerCase();
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const path of PROPERTY_PATHS) {
    const d = editDistance(needle, path.toLowerCase());
    if (d < bestDistance) {
      bestDistance = d;
      best = path;
    }
  }
  return best !== undefined && bestDistance <= Math.max(2, Math.floor(input.length / 4)) ? best : undefined;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

// ---------------------------------------------------------------------------
// Per-archetype prop validation (the check Phase 2 left open)
// ---------------------------------------------------------------------------

export interface PropIssue {
  key: string;
  message: string;
}

/**
 * Checks every key of a props bag resolves to a property legal for the
 * archetype. Legacy keys pass (they resolve through aliases) until the v3
 * migration rewrites them; split objects are checked key by key.
 */
export function validateLayerProps(archetype: ArchetypeId, props: Record<string, PropValue>): PropIssue[] {
  const issues: PropIssue[] = [];
  for (const [key, value] of Object.entries(props)) {
    const alias = Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, key) ? LEGACY_ALIASES[key] : undefined;
    const subKeys =
      alias?.split && value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : null;
    const paths = subKeys ? subKeys.map((sub) => `${key}.${sub}`) : [key];
    for (const path of paths) {
      const res = resolvePropertyPath(path, archetype);
      if (!res.ok) issues.push({ key: path, message: res.reason });
      else if (!res.definition.archetypes.includes(archetype)) {
        issues.push({ key: path, message: `"${res.path}" is not a property of ${archetype}.` });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Canonicalization (the v2 → v3 migration and the store's write boundary)
// ---------------------------------------------------------------------------

/** v1 node-shaped style blocks (see `migrations/v1-to-v2.ts` NODE_STYLE_FIELDS). */
const STYLE_BLOCKS = ["layout", "appearance", "transform", "typography"] as const;

export interface CanonicalizeResult {
  props: Record<string, PropValue>;
  /** Keys that could not be kept: unknown, or not a property of this archetype. */
  dropped: PropIssue[];
}

function scaleValue(value: PropValue, scale: number | undefined): PropValue {
  // `|| 0` folds a rounded -0 into 0 so a rescaled value survives JSON unchanged.
  return scale !== undefined && typeof value === "number" ? Math.round(value * scale * 1e6) / 1e6 || 0 : value;
}

/**
 * Rewrites a props bag onto canonical paths for `archetype`: legacy keys are
 * renamed (per archetype), split legacy objects become leaf paths, and values
 * are rescaled where the unit changed. When two keys land on one path, an
 * already-canonical key wins over a legacy one, then the first key wins.
 */
export function canonicalizeProps(archetype: ArchetypeId, props: Record<string, PropValue>): CanonicalizeResult {
  const out: Record<string, PropValue> = {};
  const fromCanonical = new Set<string>();
  const dropped: PropIssue[] = [];

  const place = (path: string, value: PropValue, canonicalSource: boolean) => {
    if (path in out && (fromCanonical.has(path) || !canonicalSource)) return;
    out[path] = value;
    if (canonicalSource) fromCanonical.add(path);
  };

  for (const [key, value] of Object.entries(props)) {
    // v1 node-shaped elements stored style blocks (`layout: { width }`, `transform: { x }`).
    // Unpack them: `<block>.<sub>` when that is canonical, else the sub-key as a legacy name.
    if ((STYLE_BLOCKS as readonly string[]).includes(key) && value && typeof value === "object" && !Array.isArray(value)) {
      for (const [sub, subValue] of Object.entries(value)) {
        const nested = `${key}.${sub}`;
        const res = isPropertyLegalFor(nested, archetype) ? resolvePropertyPath(nested, archetype) : resolvePropertyPath(sub, archetype);
        if (res.ok && res.definition.archetypes.includes(archetype)) place(res.path, scaleValue(subValue, res.scale), false);
        else dropped.push({ key: nested, message: res.ok ? `"${res.path}" is not a property of ${archetype}.` : res.reason });
      }
      continue;
    }
    const alias = Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, key) ? LEGACY_ALIASES[key] : undefined;
    if (alias?.split && value && typeof value === "object" && !Array.isArray(value)) {
      const base = aliasTarget(alias, archetype);
      for (const [sub, subValue] of Object.entries(value)) {
        // The split object's own target wins (an image's `filter.blur` is
        // `media.filter.blur`, not the universal `filter.blur`).
        const direct = base ? `${base}.${sub}` : undefined;
        if (direct && isPropertyLegalFor(direct, archetype)) {
          place(direct, subValue, false);
          continue;
        }
        const res = resolvePropertyPath(`${key}.${sub}`, archetype);
        if (res.ok && res.definition.archetypes.includes(archetype)) place(res.path, subValue, false);
        else dropped.push({ key: `${key}.${sub}`, message: res.ok ? `"${res.path}" is not a property of ${archetype}.` : res.reason });
      }
      continue;
    }
    const res = resolvePropertyPath(key, archetype);
    if (!res.ok) {
      dropped.push({ key, message: res.reason });
    } else if (!res.definition.archetypes.includes(archetype)) {
      dropped.push({ key, message: `"${res.path}" is not a property of ${archetype}.` });
    } else {
      place(res.path, scaleValue(value, res.ok ? res.scale : undefined), !res.aliasedFrom);
    }
  }
  return { props: out, dropped };
}

/** The canonical path for a track property on `archetype`, or null when it has none. */
export function canonicalizeTrackPath(path: string, archetype: ArchetypeId): { path: string; scale?: number } | null {
  const res = resolvePropertyPath(path, archetype);
  if (!res.ok || !res.definition.archetypes.includes(archetype)) return null;
  return res.scale !== undefined ? { path: res.path, scale: res.scale } : { path: res.path };
}

/** Rescales a keyframe value when its track was renamed across a unit change. */
export function rescaleValue(value: PropValue, scale: number | undefined): PropValue {
  return scaleValue(value, scale);
}

// ---------------------------------------------------------------------------
// Typed reads
// ---------------------------------------------------------------------------

/**
 * A reader over a props bag that only accepts canonical paths, so a legacy
 * name at a call site is a compile error: `const get = propReader(layer.properties);
 * get("appearance.background.color")`.
 */
export function propReader(props: Record<string, PropValue> | undefined) {
  const bag = props ?? {};
  return (path: PropertyPath): PropValue | undefined => bag[path];
}
