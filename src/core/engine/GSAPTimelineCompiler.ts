"use client";

/**
 * ============================================================================
 * GSAP TIMELINE & CSS KEYFRAMES COMPILER
 * ============================================================================
 * Compiles validated AnimationSample models into GSAP tween configurations
 * and native CSS @keyframes definitions for 60/120 FPS hardware acceleration.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.3 & SCHEMA_REFERENCE.md §13.2
 * ============================================================================
 */

import {
  AnimationSample,
  AnimationTrack,
  AnimationTrackId,
  KeyframePoint,
  toScalarKeyframeValue,
} from "../types/animations";

export interface CompiledAnimation {
  name: string;
  cssKeyframes: string;
  cssRule: string;
  gsapConfig: Record<string, unknown>;
}

export class GSAPTimelineCompilerService {
  /**
   * Maps an AnimationTrackId to its CSS property generator.
   */
  private formatCssValue(trackId: AnimationTrackId, value: number | string): {
    property: string;
    value: string;
    isTransform: boolean;
  } {
    switch (trackId) {
      case "translateX":
        return { property: "transform", value: `translateX(${value}px)`, isTransform: true };
      case "translateY":
        return { property: "transform", value: `translateY(${value}px)`, isTransform: true };
      case "translateZ":
        return { property: "transform", value: `translateZ(${value}px)`, isTransform: true };
      case "scale":
        return { property: "transform", value: `scale(${value})`, isTransform: true };
      case "scaleX":
        return { property: "transform", value: `scaleX(${value})`, isTransform: true };
      case "scaleY":
        return { property: "transform", value: `scaleY(${value})`, isTransform: true };
      case "rotate":
        return { property: "transform", value: `rotate(${value}deg)`, isTransform: true };
      case "rotateX":
        return { property: "transform", value: `rotateX(${value}deg)`, isTransform: true };
      case "rotateY":
        return { property: "transform", value: `rotateY(${value}deg)`, isTransform: true };
      case "skewX":
        return { property: "transform", value: `skewX(${value}deg)`, isTransform: true };
      case "skewY":
        return { property: "transform", value: `skewY(${value}deg)`, isTransform: true };
      case "opacity":
        return { property: "opacity", value: String(value), isTransform: false };
      case "backgroundColor":
        return { property: "background-color", value: String(value), isTransform: false };
      case "borderRadius":
        return { property: "border-radius", value: typeof value === "number" ? `${value}px` : String(value), isTransform: false };
      case "boxShadow":
        return { property: "box-shadow", value: String(value), isTransform: false };
      case "filterBlur":
        return { property: "filter", value: `blur(${value}px)`, isTransform: false };
      case "filterBrightness":
        return { property: "filter", value: `brightness(${value}%)`, isTransform: false };
      case "filterContrast":
        return { property: "filter", value: `contrast(${value}%)`, isTransform: false };
      case "letterSpacing":
        return { property: "letter-spacing", value: typeof value === "number" ? `${value}px` : String(value), isTransform: false };
      case "lineHeight":
        return { property: "line-height", value: String(value), isTransform: false };
      case "color":
        return { property: "color", value: String(value), isTransform: false };
      case "fontSize":
        return { property: "font-size", value: typeof value === "number" ? `${value}px` : String(value), isTransform: false };
      case "feGaussianBlur":
        return { property: "filter", value: `blur(${value}px)`, isTransform: false };
      case "feColorMatrix":
      case "feDisplacementMap":
        return { property: "filter", value: typeof value === "string" && value.startsWith("url(") ? value : `url(#${value})`, isTransform: false };
      case "gradientStopOffset":
        return { property: "stop-opacity", value: String(value), isTransform: false };
      case "gradientStopColor":
        return { property: "stop-color", value: String(value), isTransform: false };
      case "pathMorph":
        return { property: "d", value: `path('${value}')`, isTransform: false };
      case "strokeDashoffset":
        return { property: "stroke-dashoffset", value: String(value), isTransform: false };
      default:
        return { property: trackId, value: String(value), isTransform: false };
    }
  }

  /**
   * Compiles an AnimationSample into CSS Keyframes and GSAP parameters.
   */
  public compile(sample: AnimationSample): CompiledAnimation {
    const animName = `anim_${sample.name.toLowerCase().replace(/[^a-z0-9_]/g, "_")}_${sample.id.substring(0, 6)}`;

    // Group keyframes by percentage offset (0% to 100%)
    const offsetMap = new Map<
      number,
      { transforms: string[]; styles: Record<string, string> }
    >();

    sample.tracks.forEach((track) => {
      track.keyframes.forEach((kf) => {
        if (!offsetMap.has(kf.offset)) {
          offsetMap.set(kf.offset, { transforms: [], styles: {} });
        }
        const bucket = offsetMap.get(kf.offset)!;
        const formatted = this.formatCssValue(track.trackId, toScalarKeyframeValue(kf.value));

        if (formatted.isTransform) {
          bucket.transforms.push(formatted.value);
        } else {
          bucket.styles[formatted.property] = formatted.value;
        }
      });
    });

    // Sort offsets ascending
    const sortedOffsets = Array.from(offsetMap.keys()).sort((a, b) => a - b);

    // Build CSS @keyframes text
    let keyframeBody = `@keyframes ${animName} {\n`;
    sortedOffsets.forEach((offset) => {
      const bucket = offsetMap.get(offset)!;
      const declarations: string[] = [];

      if (bucket.transforms.length > 0) {
        declarations.push(`transform: ${bucket.transforms.join(" ")};`);
      }
      Object.entries(bucket.styles).forEach(([prop, val]) => {
        declarations.push(`${prop}: ${val};`);
      });

      keyframeBody += `  ${offset}% {\n    ${declarations.join("\n    ")}\n  }\n`;
    });
    keyframeBody += "}\n";

    // Build companion CSS class
    const cssRule = `.${animName} {\n  animation-name: ${animName};\n  animation-duration: ${sample.duration}ms;\n  animation-timing-function: ${sample.easing};\n  animation-iteration-count: ${sample.iterations};\n  animation-direction: ${sample.direction};\n  animation-fill-mode: ${sample.fillMode};\n}\n`;

    // Build GSAP tween configuration object
    const gsapConfig: Record<string, unknown> = {
      duration: sample.duration / 1000,
      ease: sample.easing,
      delay: (sample.delay || 0) / 1000,
      repeat: sample.iterations === "infinite" ? -1 : (Number(sample.iterations) || 1) - 1,
      yoyo: sample.direction === "alternate",
    };

    return {
      name: animName,
      cssKeyframes: keyframeBody,
      cssRule,
      gsapConfig,
    };
  }
}

export const GSAPTimelineCompiler = new GSAPTimelineCompilerService();
