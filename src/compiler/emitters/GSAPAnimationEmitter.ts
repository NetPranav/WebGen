"use client";

/**
 * ============================================================================
 * GSAP ANIMATION EMITTER (PRODUCTION GSAP 3 CODE GENERATOR)
 * ============================================================================
 * Compiles keyframed visual animation tracks (AnimationSample) into production
 * GSAP timelines, ScrollTriggers, and React lifecycle hooks with cleanups.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.1 & SCHEMA_REFERENCE.md §13.2
 * ============================================================================
 */

import { AnimationSample, AnimationTrack, AnimationTrackId, KeyframePoint } from "@/core/types/animations";
import { GSAPAnimationEmitterOptions, EmittedFile } from "@/core/types/compiler";

export class GSAPAnimationEmitter {
  /**
   * Translates visual engine track IDs to GSAP 3 property names.
   */
  public static mapTrackIdToGsapProp(trackId: AnimationTrackId): string {
    switch (trackId) {
      case "translateX":
        return "x";
      case "translateY":
        return "y";
      case "translateZ":
        return "z";
      case "rotate":
        return "rotation";
      case "rotateX":
        return "rotationX";
      case "rotateY":
        return "rotationY";
      case "skewX":
        return "skewX";
      case "skewY":
        return "skewY";
      case "scale":
        return "scale";
      case "scaleX":
        return "scaleX";
      case "scaleY":
        return "scaleY";
      case "opacity":
        return "opacity";
      case "backgroundColor":
        return "backgroundColor";
      case "borderRadius":
        return "borderRadius";
      case "boxShadow":
        return "boxShadow";
      case "filterBlur":
        return "filter";
      case "color":
        return "color";
      case "fontSize":
        return "fontSize";
      case "letterSpacing":
        return "letterSpacing";
      case "lineHeight":
        return "lineHeight";
      default:
        return trackId;
    }
  }

  /**
   * Formats property value for GSAP (e.g. wrapping filter in blur()).
   */
  public static formatGsapValue(trackId: AnimationTrackId, val: unknown): string {
    if (trackId === "filterBlur") {
      const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
      return `"blur(${num}px)"`;
    }
    if (typeof val === "string") {
      return JSON.stringify(val);
    }
    return String(val);
  }

  /**
   * Translates CSS / abstract easing names into canonical GSAP easing strings.
   */
  public static mapEasing(easing: string = "power2.out"): string {
    const clean = easing.trim().toLowerCase();
    switch (clean) {
      case "linear":
        return '"none"';
      case "ease":
        return '"power1.out"';
      case "ease-in":
        return '"power1.in"';
      case "ease-out":
        return '"power1.out"';
      case "ease-in-out":
        return '"power1.inOut"';
      case "bounce":
      case "bounce.out":
        return '"bounce.out"';
      case "elastic":
      case "elastic.out":
        return '"elastic.out(1, 0.3)"';
      case "back.out":
        return '"back.out(1.7)"';
      default:
        // If already a valid GSAP easing name like power2.out or custom string
        if (clean.includes("power") || clean.includes("circ") || clean.includes("expo") || clean.includes("sine")) {
          return `"${easing}"`;
        }
        return `"${easing}"`;
    }
  }

  /**
   * Sanitizes sample name into a PascalCase identifier for hooks / functions.
   */
  public static toPascalCase(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  }

  /**
   * Compiles an AnimationSample into a standalone timeline builder function body.
   */
  public static emitTimelineBody(
    sample: AnimationSample,
    options?: GSAPAnimationEmitterOptions
  ): string {
    const tlName = options?.timelineName || "tl";
    const targetRef = options?.targetRefName || "target";
    const durationSec = Math.max(0.01, sample.duration / 1000);
    const delaySec = sample.delay ? sample.delay / 1000 : 0;
    const globalEase = GSAPAnimationEmitter.mapEasing(sample.easing);

    // Repeat calculation
    let repeatVal = 0;
    if (sample.iterations === "infinite") {
      repeatVal = -1;
    } else if (typeof sample.iterations === "number" && sample.iterations > 1) {
      repeatVal = sample.iterations - 1;
    }

    const yoyoVal = sample.direction === "alternate";

    const lines: string[] = [];
    const tlConfigProps: string[] = [];
    if (delaySec > 0) tlConfigProps.push(`delay: ${delaySec}`);
    if (repeatVal !== 0) tlConfigProps.push(`repeat: ${repeatVal}`);
    if (yoyoVal) tlConfigProps.push("yoyo: true");

    const tlConfigStr = tlConfigProps.length > 0 ? `{ ${tlConfigProps.join(", ")} }` : "";
    lines.push(`const ${tlName} = gsap.timeline(${tlConfigStr});`);
    lines.push("");

    // Group keyframes by track and emit sequential tweens
    for (const track of sample.tracks) {
      const propName = GSAPAnimationEmitter.mapTrackIdToGsapProp(track.trackId);
      const sortedKfs = [...track.keyframes].sort((a, b) => a.offset - b.offset);

      if (sortedKfs.length < 2) {
        // Single keyframe: set immediate value
        if (sortedKfs.length === 1) {
          const val = GSAPAnimationEmitter.formatGsapValue(track.trackId, sortedKfs[0].value);
          lines.push(`${tlName}.set(${targetRef}, { ${propName}: ${val} }, 0);`);
        }
        continue;
      }

      // If initial keyframe at 0% exists, set it or fromTo
      const firstKf = sortedKfs[0];
      if (firstKf.offset === 0) {
        const initVal = GSAPAnimationEmitter.formatGsapValue(track.trackId, firstKf.value);
        lines.push(`${tlName}.set(${targetRef}, { ${propName}: ${initVal} }, 0);`);
      }

      // Generate tweens for intermediate segments
      for (let i = 1; i < sortedKfs.length; i++) {
        const prevKf = sortedKfs[i - 1];
        const currKf = sortedKfs[i];

        const segDuration = ((currKf.offset - prevKf.offset) / 100) * durationSec;
        const segStartTime = (prevKf.offset / 100) * durationSec;
        const segEase = currKf.easing
          ? GSAPAnimationEmitter.mapEasing(String(currKf.easing))
          : globalEase;
        const targetVal = GSAPAnimationEmitter.formatGsapValue(track.trackId, currKf.value);

        lines.push(
          `${tlName}.to(${targetRef}, { ${propName}: ${targetVal}, duration: ${segDuration.toFixed(
            3
          )}, ease: ${segEase} }, ${segStartTime.toFixed(3)});`
        );
      }
    }

    return lines.join("\n");
  }

  /**
   * Compiles an AnimationSample into a reusable React hook file (`use<Name>Animation.ts`).
   */
  public static emitHook(
    sample: AnimationSample,
    options?: GSAPAnimationEmitterOptions
  ): EmittedFile {
    const pascalName = GSAPAnimationEmitter.toPascalCase(sample.name || "Element");
    const hookName = `use${pascalName}Animation`;
    const targetRefName = options?.targetRefName || "elementRef";
    const tlName = options?.timelineName || "tl";
    const hookType = options?.hookType || "useEffect";

    const lines: string[] = [];
    lines.push('"use client";');
    lines.push("");
    lines.push("/* ==========================================================================");
    lines.push(` * GSAP ANIMATION HOOK: ${hookName}`);
    lines.push(" * LazyLayout Compiler — Next.js 15 & React 19");
    lines.push(" * ========================================================================== */");
    lines.push("");
    lines.push('import { useEffect, useRef } from "react";');
    lines.push('import gsap from "gsap";');
    lines.push("");

    lines.push("/**");
    lines.push(` * Custom hook that binds the ${sample.name} timeline to a target DOM node.`);
    lines.push(" */");
    lines.push(`export function ${hookName}(${targetRefName}: React.RefObject<HTMLElement | null>) {`);
    lines.push(`  const timelineRef = useRef<gsap.core.Timeline | null>(null);`);
    lines.push("");
    lines.push(`  ${hookType}(() => {`);
    lines.push(`    const target = ${targetRefName}.current;`);
    lines.push("    if (!target) return;");
    lines.push("");
    lines.push("    const ctx = gsap.context(() => {");

    // Indented timeline body
    const body = GSAPAnimationEmitter.emitTimelineBody(sample, {
      ...options,
      timelineName: tlName,
      targetRefName: "target",
    });
    const indentedBody = body
      .split("\n")
      .map((l) => (l.trim() ? `      ${l}` : ""))
      .join("\n");
    lines.push(indentedBody);
    lines.push(`      timelineRef.current = ${tlName};`);
    lines.push("    }, target);");
    lines.push("");
    lines.push("    return () => {");
    lines.push("      ctx.revert();");
    lines.push("    };");
    lines.push(`  }, [${targetRefName}]);`);
    lines.push("");
    lines.push("  return timelineRef;");
    lines.push("}");
    lines.push("");

    return {
      path: `animations/${hookName}.ts`,
      content: lines.join("\n"),
      language: "typescript",
      type: "animation",
    };
  }

  /**
   * Compiles an AnimationSample into a standalone timeline factory function.
   */
  public static emitFunction(
    sample: AnimationSample,
    options?: GSAPAnimationEmitterOptions
  ): EmittedFile {
    const pascalName = GSAPAnimationEmitter.toPascalCase(sample.name || "Element");
    const funcName = `create${pascalName}Timeline`;

    const lines: string[] = [];
    lines.push('"use client";');
    lines.push("");
    lines.push('import gsap from "gsap";');
    lines.push("");
    lines.push("/**");
    lines.push(` * Factory function returning a preconfigured GSAP timeline for ${sample.name}.`);
    lines.push(" */");
    lines.push(`export function ${funcName}(target: gsap.TweenTarget): gsap.core.Timeline {`);

    const body = GSAPAnimationEmitter.emitTimelineBody(sample, {
      ...options,
      targetRefName: "target",
      timelineName: "tl",
    });
    const indentedBody = body
      .split("\n")
      .map((l) => (l.trim() ? `  ${l}` : ""))
      .join("\n");
    lines.push(indentedBody);
    lines.push("  return tl;");
    lines.push("}");
    lines.push("");

    return {
      path: `animations/${funcName}.ts`,
      content: lines.join("\n"),
      language: "typescript",
      type: "animation",
    };
  }
}
