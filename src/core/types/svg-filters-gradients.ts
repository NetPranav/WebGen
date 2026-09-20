/**
 * ============================================================================
 * SVG FILTERS & GRADIENTS CONTRACTS & TYPE DEFINITIONS
 * ============================================================================
 * Defines pure data models for animated SVG filters (feGaussianBlur, feColorMatrix,
 * feDisplacementMap) and animated SVG gradients (linearGradient, radialGradient).
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & SCHEMA_REFERENCE.md
 * ============================================================================
 */

export type SvgFilterEffectType =
  | "feGaussianBlur"
  | "feColorMatrix"
  | "feDisplacementMap";

export interface FeGaussianBlurEffect {
  type: "feGaussianBlur";
  stdDeviation: number | [number, number];
  edgeMode?: "duplicate" | "wrap" | "none";
  in?: string;
  result?: string;
}

export type ColorMatrixType =
  | "matrix"
  | "saturate"
  | "hueRotate"
  | "luminanceToAlpha";

export interface FeColorMatrixEffect {
  type: "feColorMatrix";
  matrixType: ColorMatrixType;
  /**
   * For matrix: 20 space-separated numbers (4 rows x 5 columns).
   * For saturate: single number (e.g. 0 to 1+).
   * For hueRotate: rotation degrees (e.g. 0 to 360).
   * For luminanceToAlpha: empty or omitted.
   */
  values?: string | number;
  in?: string;
  result?: string;
}

export interface FeDisplacementMapEffect {
  type: "feDisplacementMap";
  scale: number;
  xChannelSelector?: "R" | "G" | "B" | "A";
  yChannelSelector?: "R" | "G" | "B" | "A";
  in?: string;
  in2?: string;
  result?: string;
}

export type SvgFilterEffect =
  | FeGaussianBlurEffect
  | FeColorMatrixEffect
  | FeDisplacementMapEffect;

export interface SvgFilterDefinition {
  id: string;
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  filterUnits?: "userSpaceOnUse" | "objectBoundingBox";
  primitiveUnits?: "userSpaceOnUse" | "objectBoundingBox";
  effects: SvgFilterEffect[];
}

export interface SvgGradientStop {
  id: string;
  /** Offset normalized between 0.0 and 1.0 (or percentage 0 to 100) */
  offset: number;
  stopColor: string;
  stopOpacity?: number;
}

export interface SvgLinearGradientDefinition {
  id: string;
  type: "linearGradient";
  x1: number | string;
  y1: number | string;
  x2: number | string;
  y2: number | string;
  gradientUnits?: "userSpaceOnUse" | "objectBoundingBox";
  spreadMethod?: "pad" | "reflect" | "repeat";
  stops: SvgGradientStop[];
}

export interface SvgRadialGradientDefinition {
  id: string;
  type: "radialGradient";
  cx: number | string;
  cy: number | string;
  r: number | string;
  fx?: number | string;
  fy?: number | string;
  gradientUnits?: "userSpaceOnUse" | "objectBoundingBox";
  spreadMethod?: "pad" | "reflect" | "repeat";
  stops: SvgGradientStop[];
}

export type SvgGradientDefinition =
  | SvgLinearGradientDefinition
  | SvgRadialGradientDefinition;

/**
 * Filter & Gradient Parity Manifest for cross-checking Play Mode and production exports.
 */
export interface FilterGradientParityManifest {
  elementId: string;
  filterId?: string;
  gradientId?: string;
  cssEquivalent: {
    filter?: string;
    background?: string;
  };
  svgDefXml: string;
}
