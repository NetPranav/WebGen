/**
 * ============================================================================
 * STRUCTURAL FAMILY ARCHETYPE SCHEMAS & FACTORIES
 * ============================================================================
 * Family: Structural (Family C)
 * Archetypes: Divider, Background Layer, Container
 * Architecture Ref: FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md §2 & PRD.md §5.3
 * Conventions Ref: CONVENTIONS.md §4.4 (divider.* and background.* properties)
 * Scope: Initial Phase — Element Animation Studio
 * ============================================================================
 */

import { BaseElementNode } from "../types";

/* ----------------------------------------------------------------------------
 * 1. Divider Archetype
 * ---------------------------------------------------------------------------- */
export interface GradientStop {
  color: string;
  offset: number; // 0 to 100
}

export interface DividerArchetypeConfig {
  orientation: "horizontal" | "vertical";
  length: number;            // 0–100%, animatable draw-in
  thickness: number;         // px
  style: "solid" | "dashed" | "dotted" | "gradient";
  color: string;
  gradientStops?: GradientStop[];
  gradientAngle?: number;    // deg, for gradient-style dividers
  capStyle: "round" | "square" | "butt";
  strokeDashoffset: number;  // Shares the SVG draw mechanism
}

export function createDefaultDivider(name = "Section Accent Divider"): BaseElementNode<DividerArchetypeConfig> {
  return {
    id: `elem_divider_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "divider",
    family: "structural",
    tag: "hr",
    parentId: null,
    layout: {
      display: "block",
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 16, right: 0, bottom: 16, left: 0 },
    },
    appearance: {
      opacity: 1,
    },
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
      orientation: "horizontal",
      length: 100,
      thickness: 2,
      style: "solid",
      color: "#206859",
      gradientAngle: 90,
      capStyle: "round",
      strokeDashoffset: 0,
    },
    children: [],
    animationStack: [
      {
        id: "anim_divider_draw",
        name: "Length Draw-In Reveal",
        type: "entrance",
        trigger: "onMount",
        duration: 0.8,
        easing: "power3.inOut",
        enabled: true,
      },
    ],
  };
}

/* ----------------------------------------------------------------------------
 * 2. Background Layer Archetype
 * ---------------------------------------------------------------------------- */
export interface BackgroundArchetypeConfig {
  type: "solid" | "gradient" | "radial" | "noise" | "image";
  color: string;
  gradientStops: GradientStop[];
  gradientAngle: number;     // deg, animatable gradient rotation
  imageSrc?: string;
  parallaxSpeed: number;     // Scroll-linked translateY multiplier
  blendMode: "normal" | "multiply" | "screen" | "overlay" | "difference";
  noiseOpacity: number;      // 0.0 – 0.5 grain intensity
  noiseScale: number;
}

export function createDefaultBackground(name = "Gradient Backdrop"): BaseElementNode<BackgroundArchetypeConfig> {
  return {
    id: `elem_bg_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "background",
    family: "structural",
    tag: "div",
    parentId: null,
    layout: {
      display: "block",
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    appearance: {
      opacity: 1,
      borderRadius: 0,
    },
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
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
      noiseScale: 1.0,
    },
    children: [],
    animationStack: [
      {
        id: "anim_bg_ambient",
        name: "Ambient Gradient Drift",
        type: "loop",
        trigger: "ambient",
        duration: 12.0,
        repeat: -1, // Infinite ambient loop
        easing: "none",
        enabled: true,
      },
    ],
  };
}

/* ----------------------------------------------------------------------------
 * 3. Container Archetype
 * ---------------------------------------------------------------------------- */
export interface ContainerArchetypeConfig {
  display: "flex" | "grid" | "block";
  flexDirection: "row" | "column";
  gap: number;
  padding: number;
  justifyContent: string;
  alignItems: string;
  wrap: boolean;
  borderRadius: number;
  backgroundColor: string;
}

export function createDefaultContainer(name = "Element Slot Container"): BaseElementNode<ContainerArchetypeConfig> {
  return {
    id: `elem_container_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "container",
    family: "structural",
    tag: "div",
    parentId: null,
    layout: {
      display: "flex",
      direction: "column",
      gap: 16,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    appearance: {
      opacity: 1,
      backgroundColor: "transparent",
      borderRadius: 8,
    },
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: 24,
      justifyContent: "center",
      alignItems: "center",
      wrap: false,
      borderRadius: 8,
      backgroundColor: "transparent",
    },
    children: [],
    animationStack: [],
  };
}

/**
 * Validates whether a configuration object matches the required structural archetype surface.
 */
export function validateStructuralConfig(
  archetype: "divider" | "background" | "container",
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (archetype === "divider") {
    if (typeof config.length !== "number" || (config.length as number) < 0 || (config.length as number) > 100) {
      errors.push("divider.length must be a number between 0 and 100");
    }
    if (typeof config.thickness !== "number") errors.push("divider.thickness must be a number");
    if (!["solid", "dashed", "dotted", "gradient"].includes(config.style as string)) {
      errors.push("divider.style must be solid, dashed, dotted, or gradient");
    }
  } else if (archetype === "background") {
    if (!["solid", "gradient", "radial", "noise", "image"].includes(config.type as string)) {
      errors.push("background.type must be solid, gradient, radial, noise, or image");
    }
    if (typeof config.parallaxSpeed !== "number") errors.push("background.parallaxSpeed must be a number");
    if (typeof config.gradientAngle !== "number") errors.push("background.gradientAngle must be a number in degrees");
  } else if (archetype === "container") {
    if (typeof config.gap !== "number") errors.push("container.gap must be a number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
