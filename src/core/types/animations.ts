"use client";

/**
 * ============================================================================
 * ANIMATION CONTRACTS, TRACK IDENTIFIERS & ARCHETYPE COMPATIBILITY
 * ============================================================================
 * Defines pure contracts for animation samples, property tracks, keyframes,
 * cubic-bezier curves, and archetype compatibility matrices.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.3 & SCHEMA_REFERENCE.md §13.2
 * ============================================================================
 */

import { ElementType } from "./element-sections";

export type AnimationTrackId =
  // Transform tracks
  | "translateX"
  | "translateY"
  | "translateZ"
  | "scale"
  | "scaleX"
  | "scaleY"
  | "rotate"
  | "rotateX"
  | "rotateY"
  | "skewX"
  | "skewY"
  // Appearance tracks
  | "opacity"
  | "backgroundColor"
  | "borderRadius"
  | "boxShadow"
  // Filter tracks
  | "filterBlur"
  | "filterBrightness"
  | "filterContrast"
  // Typography tracks
  | "letterSpacing"
  | "lineHeight"
  | "color"
  | "fontSize"
  // SVG Vector & Filter tracks (Sub-Phase 7.2 & 7.3)
  | "pathMorph"
  | "strokeDashoffset"
  | "feGaussianBlur"
  | "feColorMatrix"
  | "feDisplacementMap"
  | "gradientStopOffset"
  | "gradientStopColor";

export type CubicBezierHandle = [number, number, number, number];

export interface KeyframePoint {
  offset: number; // 0 to 100 percentage
  value: number | string;
  easing?: string | CubicBezierHandle;
}

export interface AnimationTrack {
  trackId: AnimationTrackId;
  keyframes: KeyframePoint[];
}

export type AnimationTrigger =
  | "onMount"
  | "onHover"
  | "onClick"
  | "onScroll"
  | "onStateChange"
  | "manual";

export interface AnimationSample {
  id: string;
  name: string;
  description?: string;
  duration: number; // in milliseconds
  delay?: number; // in milliseconds
  easing: string; // e.g. "power2.out", "cubic-bezier(...)"
  iterations: number | "infinite";
  direction: "normal" | "reverse" | "alternate";
  fillMode: "forwards" | "backwards" | "both";
  tracks: AnimationTrack[];
  trigger?: AnimationTrigger;
}

export interface DisallowedTrackReason {
  trackId: AnimationTrackId;
  reason: string;
  alternativeSuggestion: string;
}

export interface ArchetypeAnimationCompatibilityRule {
  archetype: ElementType;
  allowedTracks: AnimationTrackId[];
  disallowedTracks: Record<string, DisallowedTrackReason>;
}

/**
 * Universal Archetype Animation Compatibility Matrix.
 * Specifies exactly which tracks are legally permitted on each element archetype.
 */
export const ARCHETYPE_ANIMATION_COMPATIBILITY: Record<
  ElementType,
  ArchetypeAnimationCompatibilityRule
> = {
  text: {
    archetype: "text",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "scale",
      "rotate",
      "color",
      "fontSize",
      "letterSpacing",
      "lineHeight",
      "filterBlur",
    ],
    disallowedTracks: {
      pathMorph: {
        trackId: "pathMorph",
        reason: "Text elements cannot execute SVG path morphing.",
        alternativeSuggestion: "Convert text to SVG path glyphs or apply pathMorph to an svgPath element.",
      },
      strokeDashoffset: {
        trackId: "strokeDashoffset",
        reason: "Text elements do not possess SVG stroke geometry pipelines.",
        alternativeSuggestion: "Use svgPath archetype for stroke drawing animation.",
      },
    },
  },
  image: {
    archetype: "image",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "translateZ",
      "scale",
      "scaleX",
      "scaleY",
      "rotate",
      "rotateX",
      "rotateY",
      "filterBlur",
      "filterBrightness",
      "filterContrast",
      "borderRadius",
      "boxShadow",
    ],
    disallowedTracks: {
      letterSpacing: {
        trackId: "letterSpacing",
        reason: "Image elements do not possess text rendering pipelines.",
        alternativeSuggestion: "Apply letter spacing to sibling or parent text elements.",
      },
      lineHeight: {
        trackId: "lineHeight",
        reason: "Image elements do not possess font metric layout pipelines.",
        alternativeSuggestion: "Use scaleY or height tracks instead.",
      },
      color: {
        trackId: "color",
        reason: "Image elements do not use CSS font color.",
        alternativeSuggestion: "Use filterBrightness or filterContrast tracks.",
      },
      fontSize: {
        trackId: "fontSize",
        reason: "Image elements do not use font sizing metrics.",
        alternativeSuggestion: "Use scale tracks to animate image dimensions.",
      },
    },
  },
  button: {
    archetype: "button",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "scale",
      "rotate",
      "backgroundColor",
      "borderRadius",
      "boxShadow",
      "color",
      "letterSpacing",
      "filterBlur",
    ],
    disallowedTracks: {},
  },
  input: {
    archetype: "input",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "scale",
      "backgroundColor",
      "borderRadius",
      "boxShadow",
      "color",
      "letterSpacing",
    ],
    disallowedTracks: {},
  },
  container: {
    archetype: "container",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "translateZ",
      "scale",
      "scaleX",
      "scaleY",
      "rotate",
      "backgroundColor",
      "borderRadius",
      "boxShadow",
      "filterBlur",
    ],
    disallowedTracks: {
      letterSpacing: {
        trackId: "letterSpacing",
        reason: "Container layout elements do not render direct text glyphs.",
        alternativeSuggestion: "Attach typography animation to child Text components.",
      },
    },
  },
  form: {
    archetype: "form",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "scale",
      "backgroundColor",
      "borderRadius",
      "boxShadow",
    ],
    disallowedTracks: {},
  },
  generic: {
    archetype: "generic",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "scale",
      "rotate",
      "backgroundColor",
      "borderRadius",
      "boxShadow",
    ],
    disallowedTracks: {},
  },
  svgPath: {
    archetype: "svgPath",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "scale",
      "rotate",
      "color",
      "filterBlur",
      "pathMorph",
      "strokeDashoffset",
      "feGaussianBlur",
      "feColorMatrix",
      "feDisplacementMap",
      "gradientStopOffset",
      "gradientStopColor",
    ],
    disallowedTracks: {
      letterSpacing: {
        trackId: "letterSpacing",
        reason: "SVG path elements do not possess text rendering pipelines.",
        alternativeSuggestion: "Use svgText element archetype instead.",
      },
      fontSize: {
        trackId: "fontSize",
        reason: "SVG path geometry is controlled via path coordinates or scale.",
        alternativeSuggestion: "Use scale or scaleX/scaleY tracks.",
      },
    },
  },
  svgGroup: {
    archetype: "svgGroup",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "scale",
      "scaleX",
      "scaleY",
      "rotate",
      "filterBlur",
      "feGaussianBlur",
      "feColorMatrix",
      "feDisplacementMap",
    ],
    disallowedTracks: {
      letterSpacing: {
        trackId: "letterSpacing",
        reason: "SVG group containers do not directly render font glyphs.",
        alternativeSuggestion: "Attach typography animation to child svgText elements.",
      },
    },
  },
  svgUse: {
    archetype: "svgUse",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "scale",
      "rotate",
      "filterBlur",
      "feGaussianBlur",
      "feColorMatrix",
      "feDisplacementMap",
    ],
    disallowedTracks: {
      letterSpacing: {
        trackId: "letterSpacing",
        reason: "SVG use elements reference existing definitions and do not render text directly.",
        alternativeSuggestion: "Animate properties on the referenced symbol.",
      },
    },
  },
  svgText: {
    archetype: "svgText",
    allowedTracks: [
      "opacity",
      "translateX",
      "translateY",
      "scale",
      "rotate",
      "color",
      "fontSize",
      "letterSpacing",
      "filterBlur",
    ],
    disallowedTracks: {},
  },
};
