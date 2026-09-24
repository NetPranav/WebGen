"use client";

/**
 * ============================================================================
 * SVG VECTOR ELEMENT ARCHETYPES & PATH DATA MODEL
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 7.1
 *
 * Defines pure contracts, schemas, and archetypes for first-class SVG support:
 * - Element Archetypes: `svgPath`, `svgGroup`, `svgUse`, `svgText`
 * - Geometry & Path Data: `d` attribute commands, point normalization
 * - Viewport: `viewBox` coordinates and aspect ratio preservation
 * - Styling: Stroke configuration, Fill configuration, Dashoffset animation
 * ============================================================================
 */

import { ElementType } from "./element-sections";

// ----------------------------------------------------------------------------
// 1. SVG Archetype Element Types
// ----------------------------------------------------------------------------

export type SvgElementType = "svgPath" | "svgGroup" | "svgUse" | "svgText";

export const SVG_ELEMENT_TYPES: readonly SvgElementType[] = [
  "svgPath",
  "svgGroup",
  "svgUse",
  "svgText",
] as const;

export function isSvgElementType(type: ElementType): type is SvgElementType {
  return (SVG_ELEMENT_TYPES as readonly string[]).includes(type);
}

// ----------------------------------------------------------------------------
// 2. ViewBox & Dimensions
// ----------------------------------------------------------------------------

export interface SVGViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export type SVGAspectRatioAlign =
  | "none"
  | "xMinYMin"
  | "xMidYMin"
  | "xMaxYMin"
  | "xMinYMid"
  | "xMidYMid"
  | "xMaxYMid"
  | "xMinYMax"
  | "xMidYMax"
  | "xMaxYMax";

export type SVGMeetOrSlice = "meet" | "slice";

export interface SVGPreserveAspectRatio {
  align: SVGAspectRatioAlign;
  meetOrSlice?: SVGMeetOrSlice;
}

// ----------------------------------------------------------------------------
// 3. Stroke & Fill Configuration
// ----------------------------------------------------------------------------

export type SVGStrokeLinecap = "butt" | "round" | "square";
export type SVGStrokeLinejoin = "miter" | "round" | "bevel";
export type SVGFillRule = "nonzero" | "evenodd";

export interface SVGStrokeConfig {
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeLinecap?: SVGStrokeLinecap;
  strokeLinejoin?: SVGStrokeLinejoin;
  strokeMiterlimit?: number;
  strokeDasharray?: string;
  strokeDashoffset?: number;
}

export interface SVGFillConfig {
  fill?: string;
  fillOpacity?: number;
  fillRule?: SVGFillRule;
}

// ----------------------------------------------------------------------------
// 4. SVG Path Commands & Path Data Model
// ----------------------------------------------------------------------------

export type SVGPathCommandType =
  | "M" | "m" // MoveTo
  | "L" | "l" // LineTo
  | "H" | "h" // Horizontal LineTo
  | "V" | "v" // Vertical LineTo
  | "C" | "c" // Cubic Bezier
  | "S" | "s" // Smooth Cubic Bezier
  | "Q" | "q" // Quadratic Bezier
  | "T" | "t" // Smooth Quadratic Bezier
  | "A" | "a" // Elliptical Arc
  | "Z" | "z"; // ClosePath

export interface SVGPathCommand {
  type: SVGPathCommandType;
  params: number[];
}

export interface SVGPathPoint {
  x: number;
  y: number;
}

// ----------------------------------------------------------------------------
// 5. Element Configurations
// ----------------------------------------------------------------------------

export interface SVGPathElementProps extends SVGStrokeConfig, SVGFillConfig {
  d: string;
  pathLength?: number;
  transform?: string;
}

export interface SVGGroupElementProps {
  transform?: string;
  opacity?: number;
  fill?: string;
  stroke?: string;
}

export interface SVGUseElementProps {
  href: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  transform?: string;
}

export interface SVGTextElementProps extends SVGFillConfig, SVGStrokeConfig {
  text: string;
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
  fontSize?: number | string;
  fontFamily?: string;
  textAnchor?: "start" | "middle" | "end";
  transform?: string;
}

// ----------------------------------------------------------------------------
// 6. Utility Functions: Parsing & Validation
// ----------------------------------------------------------------------------

/**
 * Parses a standard viewBox string ("0 0 100 100") into an SVGViewBox object.
 */
export function parseViewBox(viewBoxStr: string): SVGViewBox | null {
  if (!viewBoxStr || typeof viewBoxStr !== "string") return null;
  const parts = viewBoxStr.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) {
    return null;
  }
  return {
    minX: parts[0],
    minY: parts[1],
    width: parts[2],
    height: parts[3],
  };
}

/**
 * Formats an SVGViewBox object into a standard SVG viewBox string.
 */
export function formatViewBox(vb: SVGViewBox): string {
  return `${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`;
}

/**
 * Simple SVG Path `d` syntax validator.
 * Validates that string begins with MoveTo ('M' or 'm') and only contains valid command letters and coordinates.
 */
export function validateSvgPathData(d: string): { isValid: boolean; error?: string } {
  if (!d || typeof d !== "string") {
    return { isValid: false, error: "Path data 'd' must be a non-empty string" };
  }
  const trimmed = d.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: "Path data 'd' cannot be empty" };
  }
  if (!/^[Mm]/.test(trimmed)) {
    return { isValid: false, error: "SVG path data must begin with a MoveTo command ('M' or 'm')" };
  }

  // Verify that commands only use standard SVG path command letters
  const invalidCharMatch = trimmed.match(/[^MmLlHhVvCcSsQqTtAaZz0-9\s,.\-+eE]/);
  if (invalidCharMatch) {
    return {
      isValid: false,
      error: `Invalid character '${invalidCharMatch[0]}' found in path data 'd'`,
    };
  }

  return { isValid: true };
}

/**
 * Parses a raw SVG path `d` string into structured SVGPathCommand tokens.
 */
export function parseSvgPathCommands(d: string): SVGPathCommand[] {
  const commands: SVGPathCommand[] = [];
  if (!d || typeof d !== "string") return commands;

  // Match command letters followed by parameter sequences
  const commandRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match: RegExpExecArray | null;

  while ((match = commandRegex.exec(d)) !== null) {
    const type = match[1] as SVGPathCommandType;
    const paramsStr = match[2].trim();
    const params: number[] = [];

    if (paramsStr.length > 0) {
      // Split params on whitespace or commas or signs
      const numRegex = /[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;
      let numMatch: RegExpExecArray | null;
      while ((numMatch = numRegex.exec(paramsStr)) !== null) {
        params.push(parseFloat(numMatch[0]));
      }
    }

    commands.push({ type, params });
  }

  return commands;
}
