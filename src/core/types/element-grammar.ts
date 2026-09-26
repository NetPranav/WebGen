"use client";

/**
 * ============================================================================
 * LAZYLAYOUT ELEMENT & ANIMATION GRAMMAR TYPE CONTRACTS
 * ============================================================================
 * Formal TypeScript contracts defining the 32 canvas Element Types,
 * 10 Animation Categories, state transition graphs, and binding models.
 * Direct implementation of:
 * - DOCS/Initial/lazylayout_element_grammer.md (Sections 2, 3, 4, 5, 9, 11)
 * - DOCS/Initial/ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md
 * ============================================================================
 */

// ============================================================================
// 1. ELEMENT TYPE TAXONOMY (32 TYPES ACROSS 5 CATEGORIES)
// ============================================================================

export type AtomicElementType =
  | "Text"
  | "Icon"
  | "Image"
  | "Button"
  | "Input"
  | "Badge"
  | "Divider"
  | "Avatar"
  | "Link"
  | "Spinner";

export type ContainerElementType =
  | "Section"
  | "Container"
  | "Card"
  | "Stack"
  | "Grid"
  | "Modal"
  | "Tooltip"
  | "Accordion";

export type StructuralElementType = "Page" | "Navbar" | "Footer" | "Slot";

export type InteractiveElementType =
  | "Form"
  | "Dropdown"
  | "Checkbox"
  | "Radio"
  | "Switch"
  | "Slider"
  | "Tabs";

export type MediaElementType = "Video" | "SVG" | "Canvas";

/** Grammar §13.3 (v0.2): the 7 Effect Surface types (3.F.1–3.F.7). */
export type EffectElementType =
  | "EffectSurface"
  | "ShaderLayer"
  | "ParticleSystem"
  | "SimulationLayer"
  | "CursorLayer"
  | "TextureSource"
  | "CodeComponent";

export type GrammarElementType =
  | AtomicElementType
  | ContainerElementType
  | StructuralElementType
  | InteractiveElementType
  | MediaElementType
  | EffectElementType;

export type TopLevelElementCategory =
  | "Atomic"
  | "Container"
  | "Structural"
  | "Interactive"
  | "Media"
  | "Effect";

// ============================================================================
// 2. ANIMATION CATEGORIES (11 CATEGORIES, v0.2 adds Reactive)
// ============================================================================

export type AnimationCategory =
  | "Entrance"
  | "Exit"
  | "Hover"
  | "Press"
  | "Focus"
  | "ScrollLinked"
  | "Ambient"
  | "StateTransition"
  | "Stagger"
  | "LayoutTransition"
  | "Reactive";

// Priority hierarchy per Grammar §6.2, with Reactive inserted per §13.2 (v0.2):
// Focus > Press > Hover > StateTransition > Reactive > ScrollLinked > Entrance/Exit > Ambient
export const CATEGORY_PRIORITY_ORDER: AnimationCategory[] = [
  "Focus",
  "Press",
  "Hover",
  "StateTransition",
  "Reactive",
  "ScrollLinked",
  "Entrance",
  "Exit",
  "Ambient",
  "LayoutTransition",
  "Stagger",
];

// ============================================================================
// 3. TRIGGERS & STATES
// ============================================================================

export type TriggerType =
  | "OnLoad"
  | "OnScrollEnter"
  | "OnScrollExit"
  | "OnScrollScrub"
  | "OnHoverEnter"
  | "OnHoverExit"
  | "OnPress"
  | "OnRelease"
  | "OnFocus"
  | "OnBlur"
  | "OnStateChange"
  | "OnChildEvent"
  | "Ambient"
  | "Continuous"; // Grammar §13.1 (v0.2): Reactive's trigger, `Continuous(<SignalExpr>)`

export type GrammarStateName =
  | "Default"
  | "Hover"
  | "Active"
  | "Focus"
  | "Disabled"
  | "Selected"
  | "Open"
  | "Closed"
  | "Loading"
  | "Success"
  | "Error"
  | "Checked"
  | "Unchecked"
  | "On"
  | "Off"
  | "Indeterminate"
  | "Empty"
  | "Submitting"
  | "Scrolled"
  | "Playing"
  | "Paused"
  | "Ended"
  | "Filled"
  | "Dragging"
  | "ActiveIndex"
  | "HasSelection"
  | "NoSelection"
  // Cursor Layer states (grammar §13.3, 3.F.5): derived from the hovered target's type.
  | "Link"
  | "Text"
  | "Press"
  | "Drag"
  | "Hidden";

// ============================================================================
// 4. ANIMATION BINDINGS (<AnimationBinding> TUPLE)
// ============================================================================

export interface AnimationTimingConfig {
  duration?: number; // ms
  delay?: number; // ms
  ease?: string; // e.g. "cubic-bezier(0.16, 1, 0.3, 1)", "power2.out"
  springConfig?: {
    stiffness: number;
    damping: number;
    mass: number;
    velocity?: number;
    bounce?: number;
  };
  iterations?: number | "infinite";
  direction?: "normal" | "reverse" | "alternate";
}

export type StaggerOrderMode =
  | "document-order"
  | "reverse-document-order"
  | "row-major"
  | "column-major"
  | "radial-distance";

export interface StaggerConfig {
  delayStep: number; // ms offset between children, e.g. 80ms
  orderMode: StaggerOrderMode;
  originPoint?: [number, number]; // [x, y] for radial-distance
  gridDimensions?: [number, number]; // [columns, rows]
}

export interface ScrollLinkedConfig {
  subMode: "curve-mapped" | "playhead-mapped";
  startThreshold: string; // e.g. "top 80%"
  endThreshold: string; // e.g. "bottom 20%"
  scrubSmoothing?: number | boolean; // seconds or boolean
  pin?: boolean;
}

export interface AnimationBinding {
  id: string;
  targetElementId: string;
  category: AnimationCategory;
  trigger: TriggerType;
  properties: string[]; // e.g. ["transform.y", "opacity"]
  priority: number;
  fromState?: GrammarStateName;
  toState?: GrammarStateName;
  timing?: AnimationTimingConfig;
  stagger?: StaggerConfig;
  scrollLinked?: ScrollLinkedConfig;
  inheritsStagger?: boolean; // Grammar §7.2.4
  inFlight?: boolean; // Grammar §6.7
}

// ============================================================================
// 5. ELEMENT TYPE CONTRACT DEFINITION
// ============================================================================

export interface StateTransitionEdge {
  from: GrammarStateName;
  to: GrammarStateName;
  description?: string;
}

export interface ElementTypeContract {
  type: GrammarElementType;
  category: TopLevelElementCategory;
  canHaveChildren: boolean;
  maxNestingDepth?: number;
  defaultStateSet: GrammarStateName[];
  extendedStates?: GrammarStateName[];
  allowedCategories: AnimationCategory[];
  blockedCategories: AnimationCategory[];
  maxSimultaneousTracks: number;
  transitionGraph: StateTransitionEdge[];
  isClosedDefault?: boolean; // Grammar §5.1.1 (Modal, Tooltip, Accordion, Dropdown)
  pressMergesWithStateTransition?: boolean; // Grammar §6.3 (Checkbox, Switch)
}

// ============================================================================
// 6. ACCESSIBILITY & COMPILATION TARGETS
// ============================================================================

export type ReducedMotionPolicy =
  | "respect-os"
  | "reduce"
  | "ignore-os"
  | "subtle-fallback";

export type CompilationTarget =
  | "zero-dependency-web" // Target A: Pure HTML/CSS + WAAPI
  | "framer-motion" // Target B: React Motion
  | "gsap"; // Target C: GSAP bundle
