/**
 * ============================================================================
 * ARCHETYPE TAXONOMY & METADATA REGISTRY
 * ============================================================================
 * Scope: Screen 00: Project Hub / Archetype Picker
 * Single Source of Truth for the 4 Element Families & 10 Archetypes
 * defined in PRD.md §5, CONVENTIONS.md §3, and SCHEMA_REFERENCE.md §2.
 * ============================================================================
 */

export type ArchetypeId =
  | "button"
  | "toggle"
  | "badge"
  | "fab"
  | "image"
  | "icon"
  | "divider"
  | "background"
  | "container"
  | "text";

export type FamilyId = "interactive" | "media" | "structural" | "text";

export interface ArchetypeDefinition {
  id: ArchetypeId;
  family: FamilyId;
  name: string;
  idPrefix: string;
  examples: string;
  description: string;
  defaultTag: string;
  animatableFeatures: string[];
  suggestedPresets: string[];
  defaultProjectName: string;
}

export interface FamilyDefinition {
  id: FamilyId;
  name: string;
  badge: string;
  description: string;
  archetypes: ArchetypeDefinition[];
}

export const ARCHETYPE_FAMILIES: FamilyDefinition[] = [
  {
    id: "interactive",
    name: "Interactive Elements",
    badge: "Family A",
    description: "Atomic interactive controls with hover, tap, focus, and micro-interaction states.",
    archetypes: [
      {
        id: "button",
        family: "interactive",
        name: "Button",
        idPrefix: "elem_btn_",
        examples: "Magnetic Button, Primary CTA, Icon Button",
        description: "Standard or magnetic action button with hover glow and spring click feedback.",
        defaultTag: "button",
        animatableFeatures: ["Transform (Scale, Rotate)", "Glow Shadows", "Background Color", "Label Color"],
        suggestedPresets: ["Elastic Bounce", "Magnetic Pull", "Glow Pulse"],
        defaultProjectName: "MagneticButton",
      },
      {
        id: "toggle",
        family: "interactive",
        name: "Toggle Switch",
        idPrefix: "elem_toggle_",
        examples: "Animated Switch, Stateful Toggle",
        description: "Smooth sliding toggle with thumb spring physics and active track color transition.",
        defaultTag: 'div role="switch"',
        animatableFeatures: ["Thumb Translation X", "Thumb Scale Bounce", "Track Color Morph"],
        suggestedPresets: ["Snappy Spring Switch", "Smooth Pill Slide"],
        defaultProjectName: "AnimatedToggleSwitch",
      },
      {
        id: "badge",
        family: "interactive",
        name: "Badge / Chip",
        idPrefix: "elem_badge_",
        examples: "Notification Chip, Status Badge, Live Indicator",
        description: "Compact status indicator with pulsating live indicators and border shines.",
        defaultTag: "span",
        animatableFeatures: ["Scale Entrance", "Pulse Radar Ring", "Border Gradient Shine"],
        suggestedPresets: ["Pulsing Live Dot", "Border Glow Sweep"],
        defaultProjectName: "StatusBadge",
      },
      {
        id: "fab",
        family: "interactive",
        name: "Floating Action Button",
        idPrefix: "elem_fab_",
        examples: "Floating Action Button, Quick Menu Trigger",
        description: "Elevated action button anchored above content with 3D spring hover and spin icons.",
        defaultTag: "button",
        animatableFeatures: ["Elevation Z / Shadow", "Icon 90° Rotation", "Spring Scale Pop"],
        suggestedPresets: ["Elastic Hover Pop", "Cross-to-Plus Morph"],
        defaultProjectName: "FloatingActionButton",
      },
    ],
  },
  {
    id: "media",
    name: "Media Elements",
    badge: "Family B",
    description: "Visual media and vector graphics with clip-path reveals, filters, and path morphing.",
    archetypes: [
      {
        id: "image",
        family: "media",
        name: "Image",
        idPrefix: "elem_img_",
        examples: "Animated Hero Image, Ken-Burns Tile, Reveal Image",
        description: "High-performance image element with focal-point crop, clip-path reveals, and parallax.",
        defaultTag: "Image / img",
        animatableFeatures: ["Ken Burns Zoom (Scale)", "Scroll Parallax (Y)", "Clip-Path Wipe", "Color/Grayscale Filter"],
        suggestedPresets: ["Ken Burns Loop", "Clip-Path Wipe In", "Scroll Parallax Depth", "Grayscale to Color"],
        defaultProjectName: "AnimatedHeroImage",
      },
      {
        id: "icon",
        family: "media",
        name: "Icon (SVG)",
        idPrefix: "elem_icon_",
        examples: "SVG Path Morph Icon, Animated Logo Mark",
        description: "Vector SVG graphic with live path data morphing, stroke dashoffset drawing, and spin.",
        defaultTag: "svg",
        animatableFeatures: ["Path Morphing (d)", "Stroke Dashoffset", "Rotation (deg)", "Filter Glow"],
        suggestedPresets: ["Stroke Draw-In", "Play-to-Pause Morph", "Spin Entrance"],
        defaultProjectName: "MorphingIcon",
      },
    ],
  },
  {
    id: "structural",
    name: "Structural Elements",
    badge: "Family C",
    description: "Layout rules, animated section dividers, ambient backdrops, and containers.",
    archetypes: [
      {
        id: "divider",
        family: "structural",
        name: "Divider",
        idPrefix: "elem_divider_",
        examples: "Animated Section Divider, Gradient Rule",
        description: "Horizontal or vertical rule with animated stroke draw-in and gradient angle sweeps.",
        defaultTag: "hr / svg:line",
        animatableFeatures: ["Stroke Draw-In (Length)", "Dashoffset Marquee", "Gradient Angle Sweep"],
        suggestedPresets: ["Draw-In Center-Out", "Draw-In Left-to-Right", "Gradient Sweep Loop"],
        defaultProjectName: "AnimatedSectionDivider",
      },
      {
        id: "background",
        family: "structural",
        name: "Background Layer",
        idPrefix: "elem_bg_",
        examples: "Animated Gradient Backdrop, Parallax Background, Noise Layer",
        description: "Full-width backdrop layer with shifting gradients, scroll parallax, and film-grain noise.",
        defaultTag: "div",
        animatableFeatures: ["Gradient Angle Drift", "Parallax Scroll Speed", "SVG Noise Texture Pulse", "Blend Mode Crossfade"],
        suggestedPresets: ["Gradient Angle Drift", "Parallax Scroll Depth", "Noise Texture Pulse"],
        defaultProjectName: "GradientBackdrop",
      },
      {
        id: "container",
        family: "structural",
        name: "Container",
        idPrefix: "elem_container_",
        examples: "Wrapping Frame for composite elements",
        description: "Flexible layout wrapper used to compose multi-node elements with coordinated layout.",
        defaultTag: "div",
        animatableFeatures: ["Flex/Grid Layout", "Padding / Gap", "Fade / Slide Entrance"],
        suggestedPresets: ["Fade Up Entrance", "Scale Container"],
        defaultProjectName: "ElementContainer",
      },
    ],
  },
  {
    id: "text",
    name: "Text Elements",
    badge: "Family D",
    description: "Standalone typography fragments, animated headings, and kinetic text.",
    archetypes: [
      {
        id: "text",
        family: "text",
        name: "Text / Label",
        idPrefix: "elem_text_",
        examples: "Button label, Animated Heading Fragment",
        description: "Typography element with character/word split reveals, gradient text, and tracking.",
        defaultTag: "span / h1-h6",
        animatableFeatures: ["SplitText Word Stagger", "Letter Spacing", "Gradient Text Shift", "Opacity Fade"],
        suggestedPresets: ["Staggered Word Reveal", "Character Blur-In", "Shimmer Gradient"],
        defaultProjectName: "KineticTextHeading",
      },
    ],
  },
];

/**
 * Helper to look up an archetype definition by its ID
 */
export function getArchetypeDefinition(id: ArchetypeId): ArchetypeDefinition | undefined {
  for (const family of ARCHETYPE_FAMILIES) {
    const found = family.archetypes.find((a) => a.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * All 10 valid archetype IDs
 */
export const ALL_ARCHETYPE_IDS: ArchetypeId[] = [
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
];
