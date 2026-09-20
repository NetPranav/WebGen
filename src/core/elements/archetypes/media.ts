/**
 * ============================================================================
 * MEDIA FAMILY ARCHETYPE SCHEMAS & FACTORIES
 * ============================================================================
 * Family: Media (Family B)
 * Archetypes: Image, Icon (SVG)
 * Architecture Ref: FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md §2 & PRD.md §5.2
 * Conventions Ref: CONVENTIONS.md §4.3 (media.* and svg.* properties)
 * Scope: Initial Phase — Element Animation Studio
 * ============================================================================
 */

import { BaseElementNode } from "../types";

/* ----------------------------------------------------------------------------
 * 1. Image Archetype
 * ---------------------------------------------------------------------------- */
export interface ImageFilters {
  grayscale: number; // 0.0 – 1.0
  blur: number;      // px (0 - 30)
  brightness: number;// 0.0 – 2.0
  contrast: number;  // 0.0 – 2.0
  saturate: number;  // 0.0 – 2.0
}

export interface ImageOverlay {
  color: string;
  opacity: number;   // 0.0 – 1.0
  blendMode: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge";
}

export interface ImageFocalPoint {
  x: number;         // 0 – 100%
  y: number;         // 0 – 100%
}

export interface ImageArchetypeConfig {
  src: string;
  fallbackSrc: string;
  alt: string;
  objectFit: "cover" | "contain" | "fill" | "none" | "scale-down";
  aspectRatio: "1:1" | "16:9" | "4:3" | "21:9" | "auto" | "custom";
  focalPoint: ImageFocalPoint;
  filter: ImageFilters;
  clipPath: string;
  overlay: ImageOverlay;
  loadingMode: "lazy" | "eager";
  placeholder: "blur" | "skeleton" | "none";
}

export function createDefaultImage(name = "Hero Banner Image"): BaseElementNode<ImageArchetypeConfig> {
  return {
    id: `elem_img_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "image",
    family: "media",
    tag: "img",
    parentId: null,
    layout: {
      display: "block",
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    appearance: {
      opacity: 1,
      borderRadius: 12,
      borderWidth: 0,
      borderColor: "transparent",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    },
    transform: {
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
      src: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80",
      fallbackSrc: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=50",
      alt: name,
      objectFit: "cover",
      aspectRatio: "16:9",
      focalPoint: { x: 50, y: 50 },
      filter: {
        grayscale: 0,
        blur: 0,
        brightness: 1,
        contrast: 1,
        saturate: 1,
      },
      clipPath: "none",
      overlay: {
        color: "#000000",
        opacity: 0,
        blendMode: "normal",
      },
      loadingMode: "lazy",
      placeholder: "blur",
    },
    children: [],
    animationStack: [
      {
        id: "anim_img_parallax",
        name: "ScrollTrigger Parallax Scrub",
        type: "scroll",
        trigger: "onScroll",
        duration: 1.0,
        easing: "none",
        enabled: true,
      },
    ],
  };
}

/* ----------------------------------------------------------------------------
 * 2. Icon (SVG) Archetype
 * ---------------------------------------------------------------------------- */
export interface IconArchetypeConfig {
  iconName: string;
  size: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
  strokeDasharray: string;
  strokeDashoffset: number;
  path: string;
}

export function createDefaultIcon(name = "Vector Sparkle Icon"): BaseElementNode<IconArchetypeConfig> {
  return {
    id: `elem_icon_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "icon",
    family: "media",
    tag: "svg",
    parentId: null,
    layout: {
      display: "inline-block",
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    appearance: {
      opacity: 1,
      backgroundColor: "transparent",
    },
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
      iconName: "Sparkles",
      size: 32,
      stroke: "#206859",
      strokeWidth: 2,
      fill: "none",
      strokeDasharray: "none",
      strokeDashoffset: 0,
      path: "M12 2L2 7l10 5 10-5-10-5z",
    },
    children: [],
    animationStack: [
      {
        id: "anim_icon_draw",
        name: "SVG Stroke Draw In",
        type: "entrance",
        trigger: "onMount",
        duration: 1.2,
        easing: "power2.out",
        enabled: true,
      },
    ],
  };
}

/**
 * Validates whether a configuration object matches the required media archetype surface.
 */
export function validateMediaConfig(
  archetype: "image" | "icon",
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (archetype === "image") {
    if (typeof config.src !== "string" || !config.src) errors.push("image.src must be a non-empty string");
    if (typeof config.alt !== "string") errors.push("image.alt must be a string");
    if (!["cover", "contain", "fill", "none", "scale-down"].includes(config.objectFit as string)) {
      errors.push("image.objectFit must be one of cover, contain, fill, none, scale-down");
    }
    if (!config.filter || typeof config.filter !== "object") {
      errors.push("image.filter must be an object with filter sliders");
    }
  } else if (archetype === "icon") {
    if (typeof config.strokeWidth !== "number") errors.push("icon.strokeWidth must be a number");
    if (typeof config.path !== "string") errors.push("icon.path must be an SVG path string");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
