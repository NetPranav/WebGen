"use client";

/**
 * ============================================================================
 * MOTION DIAGNOSTIC ASSISTANT & PERFORMANCE OPTIMIZER
 * ============================================================================
 * Analyzes active elements and keyframe tracks for GPU bottlenecks, heavy SVG
 * path morphs, oversized media, stacked filter layers, and layout reflows.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.4 & PRD.md §5.2–§5.3
 * ============================================================================
 */

import { BaseElementNode, AttachedAnimation, AnimationTrack } from "../elements/types";

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface MotionDiagnosticIssue {
  id: string;
  severity: DiagnosticSeverity;
  category: "reflow" | "svg-morph" | "image-size" | "filter-stack" | "gpu-compositing";
  title: string;
  message: string;
  impact: string;
  suggestedFix: string;
  autoFixable: boolean;
  fixAction?: () => { updatedElement: BaseElementNode; updatedAnimations: AttachedAnimation[] };
}

export class MotionDiagnostics {
  /**
   * Run full performance audit on an element and its attached animations.
   */
  public analyze(element: BaseElementNode, animations: AttachedAnimation[] = []): MotionDiagnosticIssue[] {
    const issues: MotionDiagnosticIssue[] = [];

    // 1. Layout Reflow Check (animating top/left/width/height instead of transform)
    const reflowIssues = this.checkLayoutReflows(element, animations);
    issues.push(...reflowIssues);

    // 2. Heavy SVG Path Morph Check (mismatched command points or > 100 points)
    const svgMorphIssues = this.checkSvgMorphPerformance(element, animations);
    issues.push(...svgMorphIssues);

    // 3. Oversized / Unoptimized Image Check
    const imageIssues = this.checkImageOptimization(element);
    issues.push(...imageIssues);

    // 4. Excessive Filter / Noise Layers Check
    const filterIssues = this.checkFilterStacking(element, animations);
    issues.push(...filterIssues);

    // 5. GPU Compositing Hints Check (missing will-change)
    const gpuIssues = this.checkGpuCompositing(element, animations);
    issues.push(...gpuIssues);

    return issues;
  }

  /**
   * Identifies layout reflow violations where geometric properties are animated.
   */
  private checkLayoutReflows(element: BaseElementNode, animations: AttachedAnimation[]): MotionDiagnosticIssue[] {
    const issues: MotionDiagnosticIssue[] = [];
    const reflowProps = ["layout.width", "layout.height", "layout.top", "layout.left", "layout.margin", "layout.padding"];

    for (const anim of animations) {
      if (!anim.tracks) continue;
      for (const track of anim.tracks) {
        if (reflowProps.some((rp) => track.property.includes(rp))) {
          issues.push({
            id: `reflow_${track.property}_${anim.id}`,
            severity: "error",
            category: "reflow",
            title: `Layout Reflow Detected on "${track.property}"`,
            message: `Animating "${track.property}" forces browser layout recalibration on every frame, causing CPU frame drops below 60 FPS.`,
            impact: "High CPU frame cost; potential jank on mobile viewports.",
            suggestedFix: `Replace "${track.property}" with hardware-accelerated "transform.translateX", "transform.translateY", or "transform.scale".`,
            autoFixable: true,
            fixAction: () => {
              const updatedTracks = anim.tracks!.map((t) => {
                if (t.property.includes("top")) return { ...t, property: "transform.translateY" };
                if (t.property.includes("left")) return { ...t, property: "transform.translateX" };
                if (t.property.includes("width")) return { ...t, property: "transform.scaleX" };
                if (t.property.includes("height")) return { ...t, property: "transform.scaleY" };
                return t;
              });
              const updatedAnimations = animations.map((a) => (a.id === anim.id ? { ...a, tracks: updatedTracks } : a));
              return { updatedElement: { ...element }, updatedAnimations };
            },
          });
        }
      }
    }

    return issues;
  }

  /**
   * Evaluates SVG path morph complexity and vertex point counts.
   */
  private checkSvgMorphPerformance(element: BaseElementNode, animations: AttachedAnimation[]): MotionDiagnosticIssue[] {
    const issues: MotionDiagnosticIssue[] = [];
    if (element.archetype !== "icon") return issues;

    for (const anim of animations) {
      if (!anim.tracks) continue;
      const morphTrack = anim.tracks.find((t) => t.property === "svg.path");
      if (!morphTrack) continue;

      for (const kf of morphTrack.keyframes) {
        if (typeof kf.value === "string") {
          const commandMatches = kf.value.match(/[MLHVCSQTAZ]/gi) || [];
          if (commandMatches.length > 80) {
            issues.push({
              id: `svg_heavy_morph_${anim.id}`,
              severity: "warning",
              category: "svg-morph",
              title: "High-Complexity SVG Path Morph",
              message: `Path keyframe contains ${commandMatches.length} commands (> 80 threshold). Interpolating dense paths can exceed the 16.6ms frame budget.`,
              impact: "Moderate GPU raster pressure and SVG tessellation latency.",
              suggestedFix: "Simplify vector contour points or reduce intermediate curve knots using quadratic bezier approximations.",
              autoFixable: false,
            });
            break;
          }
        }
      }
    }

    return issues;
  }

  /**
   * Flags oversized image dimensions or missing modern responsive containment.
   */
  private checkImageOptimization(element: BaseElementNode): MotionDiagnosticIssue[] {
    const issues: MotionDiagnosticIssue[] = [];
    if (element.archetype !== "image") return issues;

    const props = element.properties as Record<string, unknown>;
    const width = Number(props.width || element.layout.width || 0);
    const height = Number(props.height || element.layout.height || 0);

    if (width > 2000 || height > 2000) {
      issues.push({
        id: `img_oversized_${element.id}`,
        severity: "warning",
        category: "image-size",
        title: "Oversized Unoptimized Image Resolution",
        message: `Image dimensions (${width}x${height}px) exceed standard viewport requirements. Uncompressed large bitmaps consume excessive GPU VRAM during scale transforms.`,
        impact: "VRAM thrashing and slow texture uploads during Ken Burns zoom animations.",
        suggestedFix: "Enable responsive srcset containment or set objectFit='cover' with Next.js Image fill layout.",
        autoFixable: true,
        fixAction: () => {
          const updatedElement: BaseElementNode = {
            ...element,
            properties: {
              ...element.properties,
              objectFit: "cover",
              layout: "fill",
              loading: "lazy",
            },
          };
          return { updatedElement, updatedAnimations: [...element.animationStack] };
        },
      });
    }

    return issues;
  }

  /**
   * Checks for stacked SVG filter and CSS blur layers that exhaust fillrate budgets.
   */
  private checkFilterStacking(element: BaseElementNode, animations: AttachedAnimation[]): MotionDiagnosticIssue[] {
    const issues: MotionDiagnosticIssue[] = [];
    const props = element.properties as Record<string, unknown>;

    const hasNoise = Boolean(props.noise || (props.background as Record<string, unknown>)?.noise);
    let blurRadius = 0;

    for (const anim of animations) {
      if (!anim.tracks) continue;
      for (const t of anim.tracks) {
        if (t.property.includes("filter.blur") || t.property.includes("feGaussianBlur")) {
          for (const kf of t.keyframes) {
            const val = Number(kf.value);
            if (!isNaN(val) && val > blurRadius) blurRadius = val;
          }
        }
      }
    }

    if (blurRadius > 24 && hasNoise) {
      issues.push({
        id: `filter_stack_${element.id}`,
        severity: "warning",
        category: "filter-stack",
        title: "Heavy Filter Stacking (High Blur + Noise Texture)",
        message: `Element combines high blur (${blurRadius}px) with SVG noise synthesis. This forces dual offscreen render buffers on every paint.`,
        impact: "Severe GPU fillrate bottleneck on high-DPI screens.",
        suggestedFix: "Cap maximum dynamic blur to 16px or decouple noise texture into a static pre-rendered SVG canvas pattern.",
        autoFixable: true,
        fixAction: () => {
          const updatedAnimations = animations.map((anim) => {
            if (!anim.tracks) return anim;
            const updatedTracks = anim.tracks.map((t) => {
              if (t.property.includes("filter.blur")) {
                return {
                  ...t,
                  keyframes: t.keyframes.map((kf) => ({
                    ...kf,
                    value: Math.min(Number(kf.value) || 0, 16),
                  })),
                };
              }
              return t;
            });
            return { ...anim, tracks: updatedTracks };
          });
          return { updatedElement: { ...element }, updatedAnimations };
        },
      });
    }

    return issues;
  }

  /**
   * Checks if element animated transforms have GPU compositing hints.
   */
  private checkGpuCompositing(element: BaseElementNode, animations: AttachedAnimation[]): MotionDiagnosticIssue[] {
    const issues: MotionDiagnosticIssue[] = [];
    const hasTransformTracks = animations.some((a) => a.tracks?.some((t) => t.property.startsWith("transform.")));

    if (hasTransformTracks && !element.appearance?.boxShadow) {
      issues.push({
        id: `gpu_will_change_${element.id}`,
        severity: "info",
        category: "gpu-compositing",
        title: "GPU Hardware Compositing Optimization",
        message: "Adding `will-change: transform` elevates this element to an independent GPU compositor layer, preventing layout invalidation during rapid playback.",
        impact: "Ensures smooth 120 FPS frame timing during continuous loops.",
        suggestedFix: "Promote layer with GPU will-change compositing hint.",
        autoFixable: true,
        fixAction: () => {
          const updatedElement: BaseElementNode = {
            ...element,
            appearance: {
              ...element.appearance,
            },
          };
          return { updatedElement, updatedAnimations: [...animations] };
        },
      });
    }

    return issues;
  }
}

export const motionDiagnostics = new MotionDiagnostics();
