"use client";

/**
 * ============================================================================
 * LAZYLAYOUT MULTI-ENGINE ANIMATION RUNTIME & EXECUTOR
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Phase 5 (Sub-Phases 5.1–5.6)
 * Companion Spec: DOCS/Initial/ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md
 * Standards: CONVENTIONS.md §4 Standard Animation Property Paths
 *
 * Implements:
 * - Sub-Phase 5.1: GSAP 3.12 Core Integration (Timeline, ScrollTrigger, universal/media/divider/bg paths)
 * - Sub-Phase 5.2: Framer Motion 11 Core Integration (RK4 / analytical spring physics, continuous v0 handoff, variants)
 * - Sub-Phase 5.3: SVG & Divider Stroke-Draw Engine (Stroke dashoffset, path morph, divider draw-in)
 * - Sub-Phase 5.4: Image Motion Engine (Ken Burns slow zoom, clip-path reveals, filter transitions, scroll parallax)
 * - Sub-Phase 5.5: Background Motion Engine (Animatable gradient angle/stop drift, parallax, blend modes, noise pulse)
 * - Sub-Phase 5.6: Native CSS Keyframe & Spring Emitter (Pure CSS @keyframes, CSS Easing Level 2 linear() spring curves)
 * ============================================================================
 */

import {
  AnimationSample,
  AnimationTrack,
  AnimationTrackId,
  KeyframePoint,
} from "../types/animations";
import { synthesizeSingleTransformMatrix } from "./EngineAdapters";

export interface SpringConfig {
  stiffness: number; // Spring stiffness constant (k)
  damping: number;   // Damping coefficient (c)
  mass: number;      // Mass (m)
  initialVelocity?: number; // Continuous handoff velocity (v0)
}

export interface GradientStop {
  color: string;
  offset: number; // 0 to 100%
}

export interface ImageFilterConfig {
  blur?: number;       // px
  grayscale?: number;  // 0 to 1
  brightness?: number; // 0 to 2
  contrast?: number;   // 0 to 2
  saturate?: number;   // 0 to 2
}

export interface ScrollTriggerConfig {
  trigger?: string;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  pin?: boolean | string;
  markers?: boolean;
}

export interface GsapTimelineOptions {
  componentSelector?: string;
  scrollTrigger?: ScrollTriggerConfig;
  useReactHook?: boolean;
}

export interface FramerMotionOptions {
  springConfig?: SpringConfig;
  reducedMotion?: boolean;
}

export interface CssModuleOptions {
  className?: string;
  reducedMotion?: boolean;
}

export interface EvaluatedStylePatch {
  transform?: string;
  opacity?: string;
  filter?: string;
  backgroundColor?: string;
  color?: string;
  borderRadius?: string;
  boxShadow?: string;
  clipPath?: string;
  strokeDashoffset?: string | number;
  strokeDasharray?: string | number;
  background?: string;
  mixBlendMode?: string;
  width?: string;
  height?: string;
  [key: string]: string | number | undefined;
}

export function toPascalCase(id: string): string {
  return id
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

export function toCamelCase(id: string): string {
  const pascal = toPascalCase(id);
  if (!pascal) return "";
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Universal Multi-Engine Animation Runtime
 */
export class MultiEngineAnimationRuntimeService {
  // ==========================================================================
  // SUB-PHASE 5.1: GSAP 3.12 CORE INTEGRATION
  // ==========================================================================

  /**
   * Translates an abstract or dot-notation property path to GSAP 3.x property name.
   */
  public mapPropertyToGsap(propertyPath: string): string {
    switch (propertyPath) {
      // Universal Transforms
      case "transform.x":
      case "translateX":
        return "x";
      case "transform.y":
      case "translateY":
        return "y";
      case "transform.z":
      case "translateZ":
        return "z";
      case "transform.scale":
      case "scale":
        return "scale";
      case "transform.scaleX":
      case "scaleX":
        return "scaleX";
      case "transform.scaleY":
      case "scaleY":
        return "scaleY";
      case "transform.rotate":
      case "rotate":
        return "rotation";
      case "transform.rotateX":
      case "rotateX":
        return "rotationX";
      case "transform.rotateY":
      case "rotateY":
        return "rotationY";
      case "transform.skewX":
      case "skewX":
        return "skewX";
      case "transform.skewY":
      case "skewY":
        return "skewY";

      // Appearance & Filters
      case "appearance.opacity":
      case "opacity":
        return "opacity";
      case "appearance.border.color":
        return "borderColor";
      case "appearance.border.width":
        return "borderWidth";
      case "appearance.radius":
      case "borderRadius":
        return "borderRadius";
      case "appearance.background.color":
      case "backgroundColor":
        return "backgroundColor";
      case "filter.blur":
      case "filterBlur":
        return "filter";
      case "boxShadow":
        return "boxShadow";

      // Typography
      case "typography.color":
      case "color":
        return "color";
      case "typography.fontSize":
      case "fontSize":
        return "fontSize";
      case "typography.letterSpacing":
      case "letterSpacing":
        return "letterSpacing";
      case "typography.lineHeight":
      case "lineHeight":
        return "lineHeight";

      // Media Family
      case "media.scale":
        return "scale";
      case "media.clipPath":
        return "clipPath";
      case "media.filter.blur":
      case "media.filter.grayscale":
      case "media.filter.brightness":
      case "media.filter.contrast":
      case "media.filter.saturate":
        return "filter";
      case "media.overlay.opacity":
        return "opacity";
      case "svg.path":
      case "pathMorph":
        return "morphSVG";
      case "svg.strokeDashoffset":
      case "strokeDashoffset":
        return "strokeDashoffset";

      // Structural Family (Divider & Background)
      case "divider.length":
        return "scaleX";
      case "divider.thickness":
        return "scaleY";
      case "divider.strokeDashoffset":
        return "strokeDashoffset";
      case "divider.gradient.angle":
      case "background.gradient.angle":
        return "--gradient-angle";
      case "background.color":
        return "backgroundColor";
      case "background.parallax.speed":
        return "y";
      case "background.noise.opacity":
        return "opacity";
      case "background.blendMode":
        return "mixBlendMode";

      default:
        return propertyPath;
    }
  }

  /**
   * Compiles timeline tracks and ScrollTrigger into clean GSAP 3.12 executable code.
   */
  public compileGsapTimeline(
    sample: AnimationSample,
    options: GsapTimelineOptions = {}
  ): string {
    const selector = options.componentSelector || `.${sample.id}-target`;
    const lines: string[] = [];

    lines.push(`// GSAP 3.12 Production Timeline Driver`);
    lines.push(`// Target: ${selector} | Duration: ${sample.duration}ms | Easing: ${sample.easing}`);

    let timelineInit = `const tl = gsap.timeline({`;
    const tlParams: string[] = [];

    if (sample.iterations === "infinite") {
      tlParams.push(`repeat: -1`);
      if (sample.direction === "alternate") {
        tlParams.push(`yoyo: true`);
      }
    } else if (sample.iterations > 1) {
      tlParams.push(`repeat: ${sample.iterations - 1}`);
      if (sample.direction === "alternate") {
        tlParams.push(`yoyo: true`);
      }
    }

    if (sample.delay && sample.delay > 0) {
      tlParams.push(`delay: ${(sample.delay / 1000).toFixed(2)}`);
    }

    // ScrollTrigger integration
    if (options.scrollTrigger) {
      const st = options.scrollTrigger;
      const stParts: string[] = [];
      stParts.push(`trigger: "${st.trigger || selector}"`);
      stParts.push(`start: "${st.start || "top 80%"}"`);
      stParts.push(`end: "${st.end || "bottom 20%"}"`);
      if (st.scrub !== undefined) {
        stParts.push(`scrub: ${typeof st.scrub === "number" ? st.scrub : true}`);
      }
      if (st.pin) {
        stParts.push(`pin: ${typeof st.pin === "string" ? `"${st.pin}"` : true}`);
      }
      if (st.markers) {
        stParts.push(`markers: true`);
      }
      tlParams.push(`scrollTrigger: { ${stParts.join(", ")} }`);
    }

    timelineInit += tlParams.length > 0 ? ` ${tlParams.join(", ")} ` : "";
    timelineInit += `});`;
    lines.push(timelineInit);

    // Group keyframes by time offset across tracks
    const durationSec = sample.duration / 1000;
    const offsets = new Set<number>();
    for (const track of sample.tracks) {
      for (const kf of track.keyframes) {
        offsets.add(kf.offset);
      }
    }
    const sortedOffsets = Array.from(offsets).sort((a, b) => a - b);

    for (let i = 1; i < sortedOffsets.length; i++) {
      const currOffset = sortedOffsets[i];
      const prevOffset = sortedOffsets[i - 1];
      const stepDuration = ((currOffset - prevOffset) / 100) * durationSec;
      const stepProps: Record<string, string | number> = {};

      for (const track of sample.tracks) {
        const kf = track.keyframes.find((k) => k.offset === currOffset);
        if (kf !== undefined) {
          const gsapProp = this.mapPropertyToGsap(track.trackId);
          stepProps[gsapProp] = kf.value;
        }
      }

      if (Object.keys(stepProps).length > 0) {
        const propsStr = Object.entries(stepProps)
          .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : v}`)
          .join(", ");
        lines.push(
          `tl.to("${selector}", { ${propsStr}, duration: ${stepDuration.toFixed(3)}, ease: "${sample.easing}" });`
        );
      }
    }

    if (options.useReactHook) {
      const hookName = `use${toPascalCase(sample.id)}Animation`;
      return `import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function ${hookName}(containerRef: React.RefObject<HTMLElement>) {
  useGSAP(() => {
    ${lines.join("\n    ")}
  }, { scope: containerRef });
}
`;
    }

    return lines.join("\n");
  }

  // ==========================================================================
  // SUB-PHASE 5.2: FRAMER MOTION 11 CORE INTEGRATION
  // ==========================================================================

  /**
   * Solves a damped harmonic oscillator with continuous initial velocity handoff:
   * d^2x/dt^2 + 2*zeta*w0 * dx/dt + w0^2 * (x - 1) = 0
   */
  public solveSpringPhysics(
    config: SpringConfig,
    timeSeconds: number,
    target = 1
  ): { position: number; velocity: number } {
    const { stiffness, damping, mass, initialVelocity = 0 } = config;
    const w0 = Math.sqrt(stiffness / mass); // undamped angular frequency
    const gamma = damping / (2 * mass);    // damping factor
    const v0 = initialVelocity;

    // Underdamped regime (typical for UI springs)
    if (w0 > gamma) {
      const wd = Math.sqrt(w0 * w0 - gamma * gamma);
      const envelope = Math.exp(-gamma * timeSeconds);
      const c1 = -target;
      const c2 = (v0 + gamma * c1) / wd;

      const position = target + envelope * (c1 * Math.cos(wd * timeSeconds) + c2 * Math.sin(wd * timeSeconds));
      const velocity =
        -gamma * envelope * (c1 * Math.cos(wd * timeSeconds) + c2 * Math.sin(wd * timeSeconds)) +
        envelope * (-c1 * wd * Math.sin(wd * timeSeconds) + c2 * wd * Math.cos(wd * timeSeconds));

      return { position, velocity };
    } else {
      // Critically damped or overdamped
      const envelope = Math.exp(-w0 * timeSeconds);
      const position = target - envelope * (target + (w0 * target - v0) * timeSeconds);
      const velocity = envelope * (v0 + (w0 * target - v0) * (1 - w0 * timeSeconds));
      return { position, velocity };
    }
  }

  /**
   * Compiles abstract AnimationSample into declarative Framer Motion 11 Variants.
   */
  public compileFramerMotionVariants(
    sample: AnimationSample,
    options: FramerMotionOptions = {}
  ): string {
    const spring = options.springConfig || { stiffness: 350, damping: 22, mass: 1 };
    const springStr = `transition: { type: "spring", stiffness: ${spring.stiffness}, damping: ${spring.damping}, mass: ${spring.mass} }`;

    const initialProps: Record<string, string | number> = {};
    const animateProps: Record<string, string | number> = {};

    for (const track of sample.tracks) {
      const firstKf = track.keyframes[0];
      const lastKf = track.keyframes[track.keyframes.length - 1];
      const propName = this.mapPropertyToFramer(track.trackId);

      if (firstKf !== undefined) {
        initialProps[propName] = firstKf.value;
      }
      if (lastKf !== undefined) {
        animateProps[propName] = lastKf.value;
      }
    }

    const fmtProps = (props: Record<string, string | number>): string =>
      Object.entries(props)
        .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : v}`)
        .join(", ");

    const varName = `${toCamelCase(sample.id)}Variants`;

    return `import { motion, type Variants } from "framer-motion";

export const ${varName}: Variants = {
  initial: {
    ${fmtProps(initialProps)}
  },
  animate: {
    ${fmtProps(animateProps)},
    ${springStr}
  },
  hover: {
    scale: 1.04,
    ${springStr}
  },
  tap: {
    scale: 0.96,
    transition: { type: "spring", stiffness: 500, damping: 28 }
  }
};
`;
  }

  private mapPropertyToFramer(trackId: string): string {
    switch (trackId) {
      case "transform.x":
      case "translateX":
        return "x";
      case "transform.y":
      case "translateY":
        return "y";
      case "transform.z":
      case "translateZ":
        return "z";
      case "transform.scale":
      case "scale":
        return "scale";
      case "transform.rotate":
      case "rotate":
        return "rotate";
      case "appearance.opacity":
      case "opacity":
        return "opacity";
      case "appearance.background.color":
      case "backgroundColor":
        return "backgroundColor";
      case "appearance.radius":
      case "borderRadius":
        return "borderRadius";
      default:
        return trackId;
    }
  }

  // ==========================================================================
  // SUB-PHASE 5.3: SVG & DIVIDER STROKE-DRAW ENGINE
  // ==========================================================================

  /**
   * Calculates stroke-dasharray and stroke-dashoffset for animated line drawing.
   */
  public solveSvgStrokeDraw(
    totalLength: number,
    progress: number
  ): { strokeDasharray: number; strokeDashoffset: number } {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const strokeDasharray = totalLength;
    const strokeDashoffset = totalLength * (1 - clampedProgress);
    return { strokeDasharray, strokeDashoffset };
  }

  /**
   * Computes Divider draw-in properties (either via CSS scaleX or SVG stroke).
   */
  public solveDividerDrawIn(
    progress: number,
    orientation: "horizontal" | "vertical" = "horizontal",
    mode: "scale" | "stroke" = "scale",
    strokeLength = 1000
  ): { transform?: string; strokeDasharray?: number; strokeDashoffset?: number; lengthPercentage: number } {
    const clamped = Math.max(0, Math.min(1, progress));
    const lengthPercentage = clamped * 100;

    if (mode === "stroke") {
      const { strokeDasharray, strokeDashoffset } = this.solveSvgStrokeDraw(strokeLength, clamped);
      return { strokeDasharray, strokeDashoffset, lengthPercentage };
    }

    const transform =
      orientation === "horizontal"
        ? `scaleX(${clamped.toFixed(4)})`
        : `scaleY(${clamped.toFixed(4)})`;

    return { transform, lengthPercentage };
  }

  /**
   * Simple linear point interpolation between two matching SVG path strings.
   */
  public interpolateSvgPath(pathA: string, pathB: string, progress: number): string {
    const clamped = Math.max(0, Math.min(1, progress));
    if (clamped <= 0) return pathA;
    if (clamped >= 1) return pathB;

    const numsA = pathA.match(/-?\d+(\.\d+)?/g);
    const numsB = pathB.match(/-?\d+(\.\d+)?/g);

    if (!numsA || !numsB || numsA.length !== numsB.length) {
      return clamped < 0.5 ? pathA : pathB;
    }

    let i = 0;
    return pathA.replace(/-?\d+(\.\d+)?/g, () => {
      const a = parseFloat(numsA[i]);
      const b = parseFloat(numsB[i]);
      i++;
      const val = a + (b - a) * clamped;
      return val.toFixed(2);
    });
  }

  // ==========================================================================
  // SUB-PHASE 5.4: IMAGE MOTION ENGINE
  // ==========================================================================

  /**
   * Evaluates Ken Burns slow-zoom and pan coordinates at a given progress (0 to 1).
   */
  public evaluateKenBurns(
    scaleStart: number,
    scaleEnd: number,
    driftX: number,
    driftY: number,
    progress: number
  ): { transform: string; scale: number; x: number; y: number } {
    const clamped = Math.max(0, Math.min(1, progress));
    const scale = scaleStart + (scaleEnd - scaleStart) * clamped;
    const x = driftX * clamped;
    const y = driftY * clamped;
    const transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0px) scale(${scale.toFixed(3)})`;
    return { transform, scale, x, y };
  }

  /**
   * Evaluates animated clip-path reveal wipe (inset, circle).
   */
  public evaluateClipPathReveal(
    shape: "inset" | "circle",
    progress: number,
    direction: "left-to-right" | "top-to-bottom" | "center-out" = "left-to-right"
  ): string {
    const clamped = Math.max(0, Math.min(1, progress));
    const pct = clamped * 100;

    if (shape === "circle") {
      return `circle(${pct.toFixed(1)}% at 50% 50%)`;
    }

    switch (direction) {
      case "left-to-right":
        return `inset(0% ${(100 - pct).toFixed(1)}% 0% 0%)`;
      case "top-to-bottom":
        return `inset(0% 0% ${(100 - pct).toFixed(1)}% 0%)`;
      case "center-out": {
        const halfRemaining = ((100 - pct) / 2).toFixed(1);
        return `inset(${halfRemaining}% ${halfRemaining}% ${halfRemaining}% ${halfRemaining}%)`;
      }
      default:
        return `inset(0% ${(100 - pct).toFixed(1)}% 0% 0%)`;
    }
  }

  /**
   * Evaluates combined CSS filter string for an Image.
   */
  public evaluateImageFilter(filters: ImageFilterConfig): string {
    const parts: string[] = [];
    if (filters.blur !== undefined && filters.blur > 0) {
      parts.push(`blur(${filters.blur}px)`);
    }
    if (filters.grayscale !== undefined && filters.grayscale > 0) {
      parts.push(`grayscale(${filters.grayscale})`);
    }
    if (filters.brightness !== undefined && filters.brightness !== 1) {
      parts.push(`brightness(${filters.brightness})`);
    }
    if (filters.contrast !== undefined && filters.contrast !== 1) {
      parts.push(`contrast(${filters.contrast})`);
    }
    if (filters.saturate !== undefined && filters.saturate !== 1) {
      parts.push(`saturate(${filters.saturate})`);
    }
    return parts.length > 0 ? parts.join(" ") : "none";
  }

  /**
   * Calculates scroll-linked parallax translation offset.
   */
  public evaluateScrollParallax(scrollY: number, speedMultiplier: number): { transform: string; yOffset: number } {
    const yOffset = -(scrollY * speedMultiplier);
    return {
      transform: `translate3d(0px, ${yOffset.toFixed(2)}px, 0px)`,
      yOffset,
    };
  }

  // ==========================================================================
  // SUB-PHASE 5.5: BACKGROUND MOTION ENGINE
  // ==========================================================================

  /**
   * Evaluates animatable gradient angle/stop drift.
   */
  public evaluateBackgroundGradient(
    stops: GradientStop[],
    angleDeg = 135,
    angleDelta = 0,
    progress = 0
  ): { background: string; currentAngle: number } {
    const clamped = Math.max(0, Math.min(1, progress));
    const currentAngle = (angleDeg + angleDelta * clamped) % 360;

    const stopStrs = stops.map((s) => `${s.color} ${s.offset}%`).join(", ");
    const background = `linear-gradient(${currentAngle.toFixed(1)}deg, ${stopStrs})`;
    return { background, currentAngle };
  }

  /**
   * Evaluates SVG turbulence noise parameters for backdrop grain pulse.
   */
  public evaluateBackgroundNoise(
    baseOpacity = 0.05,
    pulseDelta = 0.03,
    progress = 0
  ): { noiseOpacity: number; filterId: string } {
    const clamped = Math.max(0, Math.min(1, progress));
    const noiseOpacity = baseOpacity + pulseDelta * Math.sin(clamped * Math.PI * 2);
    return {
      noiseOpacity: Math.max(0, Math.min(1, noiseOpacity)),
      filterId: "lazylayout-noise-filter",
    };
  }

  // ==========================================================================
  // SUB-PHASE 5.6: NATIVE CSS KEYFRAME & SPRING EMITTER
  // ==========================================================================

  /**
   * Numerically samples an analytical spring into a CSS Easing Level 2 linear(...) curve.
   */
  public generateCssLinearSpring(
    stiffness = 350,
    damping = 22,
    mass = 1,
    points = 24
  ): string {
    const w0 = Math.sqrt(stiffness / mass);
    const gamma = damping / (2 * mass);
    const wd = Math.sqrt(Math.max(0.001, w0 * w0 - gamma * gamma));

    const settlingTime = Math.min(2.0, Math.max(0.3, 4.5 / gamma));
    const samples: string[] = [];

    for (let i = 0; i <= points; i++) {
      if (i === 0) {
        samples.push("0.000");
      } else if (i === points) {
        samples.push("1.000");
      } else {
        const t = (i / points) * settlingTime;
        const envelope = Math.exp(-gamma * t);
        const val = 1 - envelope * (Math.cos(wd * t) + (gamma / wd) * Math.sin(wd * t));
        samples.push(val.toFixed(3));
      }
    }

    return `linear(${samples.join(", ")})`;
  }

  /**
   * Emits a pure, zero-dependency CSS @keyframes block from tracks.
   */
  public generateCssKeyframes(name: string, tracks: AnimationTrack[]): string {
    const keyframeMap: Record<number, Record<string, string | number>> = {};

    for (const track of tracks) {
      for (const kf of track.keyframes) {
        if (!keyframeMap[kf.offset]) {
          keyframeMap[kf.offset] = {};
        }
        const cssProp = this.mapPropertyToCss(track.trackId);
        keyframeMap[kf.offset][cssProp] = kf.value;
      }
    }

    const sortedOffsets = Object.keys(keyframeMap)
      .map(Number)
      .sort((a, b) => a - b);

    const steps = sortedOffsets.map((offset) => {
      const props = keyframeMap[offset];
      const declarations = Object.entries(props)
        .map(([k, v]) => `    ${k}: ${v};`)
        .join("\n");
      return `  ${offset}% {\n${declarations}\n  }`;
    });

    return `@keyframes ${name} {\n${steps.join("\n")}\n}`;
  }

  private mapPropertyToCss(trackId: string): string {
    switch (trackId) {
      case "transform.x":
      case "translateX":
        return "transform";
      case "transform.y":
      case "translateY":
        return "transform";
      case "appearance.opacity":
      case "opacity":
        return "opacity";
      case "appearance.background.color":
      case "backgroundColor":
        return "background-color";
      case "appearance.radius":
      case "borderRadius":
        return "border-radius";
      case "filter.blur":
      case "filterBlur":
        return "filter";
      default:
        return trackId;
    }
  }

  // ==========================================================================
  // UNIFIED RUNTIME EVALUATION GATE (SANDBOX & STAGE HOT-PATCHING)
  // ==========================================================================

  /**
   * Interpolates an element's active tracks at time T (0..duration) and produces
   * an authoritative, single-transform-synthesized style patch.
   */
  public evaluateElementStyles(
    sample: AnimationSample,
    timeMs: number
  ): EvaluatedStylePatch {
    const duration = sample.duration || 1000;
    const progress = Math.max(0, Math.min(1, timeMs / duration));
    const patch: EvaluatedStylePatch = {};

    const transformParts: {
      x?: string;
      y?: string;
      z?: string;
      scale?: number;
      scaleX?: number;
      scaleY?: number;
      rotate?: number;
      rotateX?: number;
      rotateY?: number;
      skewX?: number;
      skewY?: number;
    } = {};

    for (const track of sample.tracks) {
      const val = this.interpolateTrackValue(track, progress);

      switch (track.trackId) {
        case "translateX":
        case "transform.x":
          transformParts.x = typeof val === "number" ? `${val}px` : String(val);
          break;
        case "translateY":
        case "transform.y":
          transformParts.y = typeof val === "number" ? `${val}px` : String(val);
          break;
        case "translateZ":
        case "transform.z":
          transformParts.z = typeof val === "number" ? `${val}px` : String(val);
          break;
        case "scale":
        case "transform.scale":
        case "media.scale":
          transformParts.scale = typeof val === "number" ? val : parseFloat(String(val)) || 1;
          break;
        case "scaleX":
        case "transform.scaleX":
        case "divider.length":
          transformParts.scaleX = typeof val === "number" ? val : parseFloat(String(val)) || 1;
          break;
        case "scaleY":
        case "transform.scaleY":
        case "divider.thickness":
          transformParts.scaleY = typeof val === "number" ? val : parseFloat(String(val)) || 1;
          break;
        case "rotate":
        case "transform.rotate":
          transformParts.rotate = typeof val === "number" ? val : parseFloat(String(val)) || 0;
          break;
        case "rotateX":
        case "transform.rotateX":
          transformParts.rotateX = typeof val === "number" ? val : parseFloat(String(val)) || 0;
          break;
        case "rotateY":
        case "transform.rotateY":
          transformParts.rotateY = typeof val === "number" ? val : parseFloat(String(val)) || 0;
          break;

        case "opacity":
        case "appearance.opacity":
        case "media.overlay.opacity":
        case "background.noise.opacity":
          patch.opacity = String(val);
          break;
        case "backgroundColor":
        case "appearance.background.color":
        case "background.color":
          patch.backgroundColor = String(val);
          break;
        case "borderRadius":
        case "appearance.radius":
          patch.borderRadius = typeof val === "number" ? `${val}px` : String(val);
          break;
        case "boxShadow":
          patch.boxShadow = String(val);
          break;
        case "color":
        case "typography.color":
          patch.color = String(val);
          break;
        case "filterBlur":
        case "filter.blur":
        case "media.filter.blur":
          patch.filter = `blur(${val}px)`;
          break;
        case "media.clipPath":
          patch.clipPath = String(val);
          break;
        case "strokeDashoffset":
        case "svg.strokeDashoffset":
        case "divider.strokeDashoffset":
          patch.strokeDashoffset = val;
          break;
        case "background.blendMode":
          patch.mixBlendMode = String(val);
          break;
        default:
          break;
      }
    }

    // Synthesize single transform authority string
    const synthesizedTransform = synthesizeSingleTransformMatrix(transformParts);
    if (synthesizedTransform !== "none") {
      patch.transform = synthesizedTransform;
    }

    return patch;
  }

  private interpolateTrackValue(track: AnimationTrack, progress: number): number | string {
    if (!track.keyframes || track.keyframes.length === 0) return 0;
    if (track.keyframes.length === 1) return track.keyframes[0].value;

    const sorted = [...track.keyframes].sort((a, b) => a.offset - b.offset);

    if (progress <= sorted[0].offset / 100) return sorted[0].value;
    if (progress >= sorted[sorted.length - 1].offset / 100) return sorted[sorted.length - 1].value;

    // Find bounding keyframes
    let kfA = sorted[0];
    let kfB = sorted[1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (progress >= sorted[i].offset / 100 && progress <= sorted[i + 1].offset / 100) {
        kfA = sorted[i];
        kfB = sorted[i + 1];
        break;
      }
    }

    const range = (kfB.offset - kfA.offset) / 100;
    const localProgress = range > 0 ? (progress - kfA.offset / 100) / range : 0;

    const numA = typeof kfA.value === "number" ? kfA.value : parseFloat(String(kfA.value));
    const numB = typeof kfB.value === "number" ? kfB.value : parseFloat(String(kfB.value));

    if (!isNaN(numA) && !isNaN(numB)) {
      const interpolated = numA + (numB - numA) * localProgress;
      return interpolated;
    }

    return localProgress < 0.5 ? kfA.value : kfB.value;
  }
}

export const multiEngineAnimationRuntime = new MultiEngineAnimationRuntimeService();
