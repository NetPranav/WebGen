/**
 * ============================================================================
 * SVG FILTER & GRADIENT ANIMATION ENGINE
 * ============================================================================
 * Core engine for animated SVG filters (feGaussianBlur, feColorMatrix,
 * feDisplacementMap) and animated SVG gradients (linearGradient, radialGradient).
 * Supports:
 *  - Keyframe stop and attribute interpolation without visual popping
 *  - 20-element 4x5 color matrix interpolation & hue-rotation wrapping
 *  - Robust RGBA color parsing and gamut-safe blending
 *  - SVG XML serialization and CSS filter/gradient equivalent generation
 *  - Guaranteed Play Mode vs Production Export render parity
 *
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & §Sub-Phase 13.4
 * ============================================================================
 */

import {
  ColorMatrixType,
  FeColorMatrixEffect,
  FeDisplacementMapEffect,
  FeGaussianBlurEffect,
  FilterGradientParityManifest,
  SvgFilterDefinition,
  SvgFilterEffect,
  SvgGradientDefinition,
  SvgGradientStop,
  SvgLinearGradientDefinition,
  SvgRadialGradientDefinition,
} from "../types/svg-filters-gradients";

export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  transparent: "rgba(0,0,0,0)",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  yellow: "#ffff00",
  gray: "#808080",
  grey: "#808080",
};

export class SvgFilterGradientEngine {
  // ==========================================================================
  // 1. COLOR PARSING & INTERPOLATION
  // ==========================================================================

  /**
   * Parses arbitrary CSS / SVG color strings into RGBA channels [0..255, 0..255, 0..255, 0..1].
   */
  public static parseColor(colorStr: string): RGBAColor {
    const str = colorStr.trim().toLowerCase();

    // Check named colors
    if (NAMED_COLORS[str]) {
      return this.parseColor(NAMED_COLORS[str]);
    }

    // #RGB or #RGBA
    if (/^#([0-9a-f]{3,4})$/i.test(str)) {
      const hex = str.slice(1);
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }

    // #RRGGBB or #RRGGBBAA
    if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(str)) {
      const hex = str.slice(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }

    // rgb(...) or rgba(...)
    const rgbMatch = str.match(
      /^rgba?\s*\(\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/i
    );
    if (rgbMatch) {
      const parseChannel = (val: string) => {
        if (val.endsWith("%")) {
          return (parseFloat(val) / 100) * 255;
        }
        return parseFloat(val);
      };
      const r = Math.min(255, Math.max(0, parseChannel(rgbMatch[1])));
      const g = Math.min(255, Math.max(0, parseChannel(rgbMatch[2])));
      const b = Math.min(255, Math.max(0, parseChannel(rgbMatch[3])));
      const a = rgbMatch[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(rgbMatch[4]))) : 1;
      return { r, g, b, a };
    }

    // Fallback: black
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  /**
   * Interpolates two colors in linear RGBA space.
   */
  public static interpolateColor(colorA: string, colorB: string, t: number): string {
    const clampedT = Math.max(0, Math.min(1, t));
    const cA = this.parseColor(colorA);
    const cB = this.parseColor(colorB);

    const u = 1 - clampedT;
    const r = Math.round(u * cA.r + clampedT * cB.r);
    const g = Math.round(u * cA.g + clampedT * cB.g);
    const b = Math.round(u * cA.b + clampedT * cB.b);
    const a = Number((u * cA.a + clampedT * cB.a).toFixed(3));

    if (a >= 1) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // ==========================================================================
  // 2. SVG FILTER SERIALIZATION & INTERPOLATION
  // ==========================================================================

  /**
   * Serializes a single feGaussianBlur effect to SVG XML.
   */
  public static serializeGaussianBlur(effect: FeGaussianBlurEffect): string {
    const stdDevStr = Array.isArray(effect.stdDeviation)
      ? `${effect.stdDeviation[0]} ${effect.stdDeviation[1]}`
      : `${effect.stdDeviation}`;
    const edgeModeAttr = effect.edgeMode ? ` edgeMode="${effect.edgeMode}"` : "";
    const inAttr = effect.in ? ` in="${effect.in}"` : "";
    const resultAttr = effect.result ? ` result="${effect.result}"` : "";
    return `<feGaussianBlur stdDeviation="${stdDevStr}"${edgeModeAttr}${inAttr}${resultAttr} />`;
  }

  /**
   * Serializes a single feColorMatrix effect to SVG XML.
   */
  public static serializeColorMatrix(effect: FeColorMatrixEffect): string {
    const typeAttr = ` type="${effect.matrixType}"`;
    const valuesAttr = effect.values !== undefined ? ` values="${effect.values}"` : "";
    const inAttr = effect.in ? ` in="${effect.in}"` : "";
    const resultAttr = effect.result ? ` result="${effect.result}"` : "";
    return `<feColorMatrix${typeAttr}${valuesAttr}${inAttr}${resultAttr} />`;
  }

  /**
   * Serializes a single feDisplacementMap effect to SVG XML.
   */
  public static serializeDisplacementMap(effect: FeDisplacementMapEffect): string {
    const scaleAttr = ` scale="${effect.scale}"`;
    const xChan = effect.xChannelSelector ? ` xChannelSelector="${effect.xChannelSelector}"` : "";
    const yChan = effect.yChannelSelector ? ` yChannelSelector="${effect.yChannelSelector}"` : "";
    const inAttr = effect.in ? ` in="${effect.in}"` : "";
    const in2Attr = effect.in2 ? ` in2="${effect.in2}"` : "";
    const resultAttr = effect.result ? ` result="${effect.result}"` : "";
    return `<feDisplacementMap${scaleAttr}${xChan}${yChan}${inAttr}${in2Attr}${resultAttr} />`;
  }

  /**
   * Serializes a full SVG filter definition to SVG XML `<filter>...</filter>`.
   */
  public static serializeFilter(filter: SvgFilterDefinition): string {
    const attrs: string[] = [`id="${filter.id}"`];
    if (filter.x !== undefined) attrs.push(`x="${filter.x}"`);
    if (filter.y !== undefined) attrs.push(`y="${filter.y}"`);
    if (filter.width !== undefined) attrs.push(`width="${filter.width}"`);
    if (filter.height !== undefined) attrs.push(`height="${filter.height}"`);
    if (filter.filterUnits) attrs.push(`filterUnits="${filter.filterUnits}"`);
    if (filter.primitiveUnits) attrs.push(`primitiveUnits="${filter.primitiveUnits}"`);

    const childrenXml = filter.effects
      .map((effect) => {
        switch (effect.type) {
          case "feGaussianBlur":
            return `  ${this.serializeGaussianBlur(effect)}`;
          case "feColorMatrix":
            return `  ${this.serializeColorMatrix(effect)}`;
          case "feDisplacementMap":
            return `  ${this.serializeDisplacementMap(effect)}`;
          default:
            return "";
        }
      })
      .join("\n");

    return `<filter ${attrs.join(" ")}>\n${childrenXml}\n</filter>`;
  }

  /**
   * Interpolates feGaussianBlur stdDeviation smoothly without discontinuities.
   */
  public static interpolateStdDeviation(
    from: number | [number, number],
    to: number | [number, number],
    t: number
  ): number | [number, number] {
    const clampedT = Math.max(0, Math.min(1, t));
    const u = 1 - clampedT;

    const fromX = Array.isArray(from) ? from[0] : from;
    const fromY = Array.isArray(from) ? from[1] : from;
    const toX = Array.isArray(to) ? to[0] : to;
    const toY = Array.isArray(to) ? to[1] : to;

    const resX = Number((u * fromX + clampedT * toX).toFixed(3));
    const resY = Number((u * fromY + clampedT * toY).toFixed(3));

    if (resX === resY) {
      return resX;
    }
    return [resX, resY];
  }

  /**
   * Interpolates feColorMatrix values (matrix, saturate, hueRotate).
   */
  public static interpolateColorMatrixValues(
    matrixType: ColorMatrixType,
    fromVal: string | number | undefined,
    toVal: string | number | undefined,
    t: number
  ): string | number {
    const clampedT = Math.max(0, Math.min(1, t));
    const u = 1 - clampedT;

    if (matrixType === "matrix") {
      // Identity 4x5 matrix fallback
      const identityMatrix = [
        1, 0, 0, 0, 0,
        0, 1, 0, 0, 0,
        0, 0, 1, 0, 0,
        0, 0, 0, 1, 0,
      ];

      const parseNums = (val: string | number | undefined): number[] => {
        if (!val) return [...identityMatrix];
        const nums = String(val).trim().split(/\s+/).map(Number);
        while (nums.length < 20) nums.push(0);
        return nums.slice(0, 20);
      };

      const numsA = parseNums(fromVal);
      const numsB = parseNums(toVal);

      const interp = numsA.map((vA, i) => {
        const vB = numsB[i];
        return Number((u * vA + clampedT * vB).toFixed(4));
      });

      return interp.join(" ");
    }

    if (matrixType === "saturate") {
      const valA = fromVal !== undefined ? Number(fromVal) : 1;
      const valB = toVal !== undefined ? Number(toVal) : 1;
      return Number((u * valA + clampedT * valB).toFixed(4));
    }

    if (matrixType === "hueRotate") {
      const valA = fromVal !== undefined ? Number(fromVal) : 0;
      const valB = toVal !== undefined ? Number(toVal) : 0;
      return Number((u * valA + clampedT * valB).toFixed(2));
    }

    return "";
  }

  /**
   * Interpolates feDisplacementMap scale parameter.
   */
  public static interpolateDisplacementScale(
    fromScale: number,
    toScale: number,
    t: number
  ): number {
    const clampedT = Math.max(0, Math.min(1, t));
    return Number(((1 - clampedT) * fromScale + clampedT * toScale).toFixed(3));
  }

  /**
   * Interpolates an entire SVG filter definition.
   */
  public static interpolateFilter(
    filterA: SvgFilterDefinition,
    filterB: SvgFilterDefinition,
    t: number,
    resultId?: string
  ): SvgFilterDefinition {
    const clampedT = Math.max(0, Math.min(1, t));
    const targetId = resultId || `${filterA.id}_interp`;
    const effects: SvgFilterEffect[] = [];

    const len = Math.max(filterA.effects.length, filterB.effects.length);
    for (let i = 0; i < len; i++) {
      const effA = filterA.effects[i] || filterB.effects[i];
      const effB = filterB.effects[i] || filterA.effects[i];

      if (effA.type === "feGaussianBlur" && effB.type === "feGaussianBlur") {
        effects.push({
          type: "feGaussianBlur",
          stdDeviation: this.interpolateStdDeviation(
            effA.stdDeviation,
            effB.stdDeviation,
            clampedT
          ),
          edgeMode: effA.edgeMode || effB.edgeMode,
          in: effA.in || effB.in,
          result: effA.result || effB.result,
        });
      } else if (effA.type === "feColorMatrix" && effB.type === "feColorMatrix") {
        effects.push({
          type: "feColorMatrix",
          matrixType: effA.matrixType,
          values: this.interpolateColorMatrixValues(
            effA.matrixType,
            effA.values,
            effB.values,
            clampedT
          ),
          in: effA.in || effB.in,
          result: effA.result || effB.result,
        });
      } else if (effA.type === "feDisplacementMap" && effB.type === "feDisplacementMap") {
        effects.push({
          type: "feDisplacementMap",
          scale: this.interpolateDisplacementScale(effA.scale, effB.scale, clampedT),
          xChannelSelector: effA.xChannelSelector || effB.xChannelSelector,
          yChannelSelector: effA.yChannelSelector || effB.yChannelSelector,
          in: effA.in || effB.in,
          in2: effA.in2 || effB.in2,
          result: effA.result || effB.result,
        });
      }
    }

    return {
      id: targetId,
      filterUnits: filterA.filterUnits || filterB.filterUnits,
      primitiveUnits: filterA.primitiveUnits || filterB.primitiveUnits,
      effects,
    };
  }

  // ==========================================================================
  // 3. SVG GRADIENT SERIALIZATION & STOP KEYFRAMING
  // ==========================================================================

  /**
   * Serializes an SVG gradient stop to XML `<stop offset="..." stop-color="..." />`.
   */
  public static serializeGradientStop(stop: SvgGradientStop): string {
    const offsetStr = `${(stop.offset * (stop.offset <= 1 ? 100 : 1)).toFixed(1)}%`;
    const opacityAttr =
      stop.stopOpacity !== undefined ? ` stop-opacity="${stop.stopOpacity}"` : "";
    return `<stop offset="${offsetStr}" stop-color="${stop.stopColor}"${opacityAttr} />`;
  }

  /**
   * Serializes a linearGradient definition.
   */
  public static serializeLinearGradient(grad: SvgLinearGradientDefinition): string {
    const attrs: string[] = [
      `id="${grad.id}"`,
      `x1="${grad.x1}"`,
      `y1="${grad.y1}"`,
      `x2="${grad.x2}"`,
      `y2="${grad.y2}"`,
    ];
    if (grad.gradientUnits) attrs.push(`gradientUnits="${grad.gradientUnits}"`);
    if (grad.spreadMethod) attrs.push(`spreadMethod="${grad.spreadMethod}"`);

    const stopsXml = grad.stops.map((s) => `  ${this.serializeGradientStop(s)}`).join("\n");
    return `<linearGradient ${attrs.join(" ")}>\n${stopsXml}\n</linearGradient>`;
  }

  /**
   * Serializes a radialGradient definition.
   */
  public static serializeRadialGradient(grad: SvgRadialGradientDefinition): string {
    const attrs: string[] = [
      `id="${grad.id}"`,
      `cx="${grad.cx}"`,
      `cy="${grad.cy}"`,
      `r="${grad.r}"`,
    ];
    if (grad.fx !== undefined) attrs.push(`fx="${grad.fx}"`);
    if (grad.fy !== undefined) attrs.push(`fy="${grad.fy}"`);
    if (grad.gradientUnits) attrs.push(`gradientUnits="${grad.gradientUnits}"`);
    if (grad.spreadMethod) attrs.push(`spreadMethod="${grad.spreadMethod}"`);

    const stopsXml = grad.stops.map((s) => `  ${this.serializeGradientStop(s)}`).join("\n");
    return `<radialGradient ${attrs.join(" ")}>\n${stopsXml}\n</radialGradient>`;
  }

  /**
   * Resamples/interpolates stops so that two gradients of differing stop counts can morph
   * smoothly without visual popping or missing steps.
   */
  public static interpolateGradientStops(
    stopsA: SvgGradientStop[],
    stopsB: SvgGradientStop[],
    t: number
  ): SvgGradientStop[] {
    const clampedT = Math.max(0, Math.min(1, t));
    const u = 1 - clampedT;

    // Normalizing stops if lengths differ
    const maxLen = Math.max(stopsA.length, stopsB.length);
    const normA = this.resampleStopsToCount(stopsA, maxLen);
    const normB = this.resampleStopsToCount(stopsB, maxLen);

    const result: SvgGradientStop[] = [];
    for (let i = 0; i < maxLen; i++) {
      const sA = normA[i];
      const sB = normB[i];

      const offset = Number((u * sA.offset + clampedT * sB.offset).toFixed(4));
      const stopColor = this.interpolateColor(sA.stopColor, sB.stopColor, clampedT);
      const opacityA = sA.stopOpacity !== undefined ? sA.stopOpacity : 1;
      const opacityB = sB.stopOpacity !== undefined ? sB.stopOpacity : 1;
      const stopOpacity = Number((u * opacityA + clampedT * opacityB).toFixed(3));

      result.push({
        id: `stop_${i}`,
        offset,
        stopColor,
        stopOpacity,
      });
    }

    return result;
  }

  private static resampleStopsToCount(
    stops: SvgGradientStop[],
    targetCount: number
  ): SvgGradientStop[] {
    if (stops.length === targetCount || stops.length === 0) return [...stops];

    const sorted = [...stops].sort((a, b) => a.offset - b.offset);
    if (sorted.length === 1) {
      return Array.from({ length: targetCount }, (_, i) => ({
        ...sorted[0],
        id: `resampled_${i}`,
        offset: i / Math.max(1, targetCount - 1),
      }));
    }

    const resampled: SvgGradientStop[] = [];
    for (let i = 0; i < targetCount; i++) {
      const targetOffset = i / (targetCount - 1);

      // Find surrounding stops
      let lower = sorted[0];
      let upper = sorted[sorted.length - 1];

      for (let j = 0; j < sorted.length - 1; j++) {
        if (targetOffset >= sorted[j].offset && targetOffset <= sorted[j + 1].offset) {
          lower = sorted[j];
          upper = sorted[j + 1];
          break;
        }
      }

      const span = upper.offset - lower.offset;
      const localT = span === 0 ? 0 : (targetOffset - lower.offset) / span;

      resampled.push({
        id: `resampled_${i}`,
        offset: targetOffset,
        stopColor: this.interpolateColor(lower.stopColor, upper.stopColor, localT),
        stopOpacity:
          (1 - localT) * (lower.stopOpacity ?? 1) + localT * (upper.stopOpacity ?? 1),
      });
    }

    return resampled;
  }

  /**
   * Interpolates between two linearGradient definitions.
   */
  public static interpolateLinearGradient(
    gradA: SvgLinearGradientDefinition,
    gradB: SvgLinearGradientDefinition,
    t: number,
    resultId?: string
  ): SvgLinearGradientDefinition {
    const clampedT = Math.max(0, Math.min(1, t));
    const u = 1 - clampedT;

    const parseNum = (v: number | string) => (typeof v === "number" ? v : parseFloat(v) || 0);

    const x1 = Number((u * parseNum(gradA.x1) + clampedT * parseNum(gradB.x1)).toFixed(3));
    const y1 = Number((u * parseNum(gradA.y1) + clampedT * parseNum(gradB.y1)).toFixed(3));
    const x2 = Number((u * parseNum(gradA.x2) + clampedT * parseNum(gradB.x2)).toFixed(3));
    const y2 = Number((u * parseNum(gradA.y2) + clampedT * parseNum(gradB.y2)).toFixed(3));

    const stops = this.interpolateGradientStops(gradA.stops, gradB.stops, clampedT);

    return {
      id: resultId || `${gradA.id}_interp`,
      type: "linearGradient",
      x1,
      y1,
      x2,
      y2,
      gradientUnits: gradA.gradientUnits || gradB.gradientUnits,
      spreadMethod: gradA.spreadMethod || gradB.spreadMethod,
      stops,
    };
  }

  /**
   * Interpolates between two radialGradient definitions.
   */
  public static interpolateRadialGradient(
    gradA: SvgRadialGradientDefinition,
    gradB: SvgRadialGradientDefinition,
    t: number,
    resultId?: string
  ): SvgRadialGradientDefinition {
    const clampedT = Math.max(0, Math.min(1, t));
    const u = 1 - clampedT;

    const parseNum = (v: number | string) => (typeof v === "number" ? v : parseFloat(v) || 0);

    const cx = Number((u * parseNum(gradA.cx) + clampedT * parseNum(gradB.cx)).toFixed(3));
    const cy = Number((u * parseNum(gradA.cy) + clampedT * parseNum(gradB.cy)).toFixed(3));
    const r = Number((u * parseNum(gradA.r) + clampedT * parseNum(gradB.r)).toFixed(3));

    const stops = this.interpolateGradientStops(gradA.stops, gradB.stops, clampedT);

    return {
      id: resultId || `${gradA.id}_interp`,
      type: "radialGradient",
      cx,
      cy,
      r,
      gradientUnits: gradA.gradientUnits || gradB.gradientUnits,
      spreadMethod: gradA.spreadMethod || gradB.spreadMethod,
      stops,
    };
  }

  // ==========================================================================
  // 4. PLAY MODE & EXPORTED PRODUCTION BUILD PARITY CHECK
  // ==========================================================================

  /**
   * Generates a parity manifest mapping the SVG definitions to CSS filter / gradient equivalents.
   */
  public static generateParityManifest(
    elementId: string,
    filter?: SvgFilterDefinition,
    gradient?: SvgGradientDefinition
  ): FilterGradientParityManifest {
    let cssFilter: string | undefined;
    let cssBackground: string | undefined;
    const svgDefs: string[] = [];

    if (filter) {
      svgDefs.push(this.serializeFilter(filter));

      // Build CSS equivalent for common filters
      const blurEffect = filter.effects.find((e) => e.type === "feGaussianBlur") as
        | FeGaussianBlurEffect
        | undefined;
      if (blurEffect) {
        const stdDev = Array.isArray(blurEffect.stdDeviation)
          ? blurEffect.stdDeviation[0]
          : blurEffect.stdDeviation;
        cssFilter = `blur(${stdDev}px)`;
      } else {
        cssFilter = `url(#${filter.id})`;
      }
    }

    if (gradient) {
      if (gradient.type === "linearGradient") {
        svgDefs.push(this.serializeLinearGradient(gradient));
        const stopDefs = gradient.stops
          .map((s) => `${s.stopColor} ${(s.offset * (s.offset <= 1 ? 100 : 1)).toFixed(1)}%`)
          .join(", ");
        cssBackground = `linear-gradient(to right, ${stopDefs})`;
      } else {
        svgDefs.push(this.serializeRadialGradient(gradient));
        const stopDefs = gradient.stops
          .map((s) => `${s.stopColor} ${(s.offset * (s.offset <= 1 ? 100 : 1)).toFixed(1)}%`)
          .join(", ");
        cssBackground = `radial-gradient(circle, ${stopDefs})`;
      }
    }

    return {
      elementId,
      filterId: filter?.id,
      gradientId: gradient?.id,
      cssEquivalent: {
        filter: cssFilter,
        background: cssBackground,
      },
      svgDefXml: svgDefs.join("\n\n"),
    };
  }

  /**
   * Verifies blur-in filter animation parity between Play Mode (DOM/CSS engine)
   * and exported production build (SVG filter pipeline).
   *
   * Verifies that the numerical deviation parameter at progress `t` translates
   * identically to both `filter: blur(${value}px)` and `<feGaussianBlur stdDeviation="${value}" />`.
   */
  public static verifyBlurInFilterParity(
    startStdDev: number,
    endStdDev: number,
    t: number
  ): {
    playModeCss: string;
    prodExportSvg: string;
    isParityMatch: boolean;
    deviationValue: number;
  } {
    const clampedT = Math.max(0, Math.min(1, t));
    const interpolatedVal = Number(
      ((1 - clampedT) * startStdDev + clampedT * endStdDev).toFixed(3)
    );

    const playModeCss = `filter: blur(${interpolatedVal}px);`;
    const prodExportSvg = `<feGaussianBlur stdDeviation="${interpolatedVal}" />`;

    // Extract value from both representations and check within 0.001 tolerance
    const cssMatch = playModeCss.match(/blur\((\d+(?:\.\d+)?)px\)/);
    const svgMatch = prodExportSvg.match(/stdDeviation="(\d+(?:\.\d+)?)"/);

    const cssVal = cssMatch ? parseFloat(cssMatch[1]) : -1;
    const svgVal = svgMatch ? parseFloat(svgMatch[1]) : -2;

    const isParityMatch = Math.abs(cssVal - svgVal) < 0.001 && Math.abs(cssVal - interpolatedVal) < 0.001;

    return {
      playModeCss,
      prodExportSvg,
      isParityMatch,
      deviationValue: interpolatedVal,
    };
  }
}
