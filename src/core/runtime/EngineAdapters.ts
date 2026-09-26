"use client";

/**
 * ============================================================================
 * LAZYLAYOUT RUNTIME ENGINE ADAPTERS & SINGLE TRANSFORM AUTHORITY (STA)
 * ============================================================================
 * Implements the Two-Tier Architecture and Single Transform Authority (STA)
 * runtime protocol as specified in:
 * - DOCS/Initial/ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md (§2, §8, §10)
 * - DOCS/Initial/lazylayout_element_grammer.md (§6.2, §8)
 *
 * Tiers:
 * 1. CssCompositorAdapter: 100% Zero-Dependency Web (Pure CSS / WAAPI, Target A)
 * 2. FramerMotionAdapter: Framework-Native React Motion (Target B)
 * 3. GsapEngineAdapter: High-Precision Studio Timeline Authoring (Target C)
 * ============================================================================
 */

import {
  AnimationBinding,
  AnimationCategory,
  CompilationTarget,
  CATEGORY_PRIORITY_ORDER,
  ReducedMotionPolicy,
} from "../types/element-grammar";
import { ElementGrammarEngine } from "../engine/ElementGrammarEngine";

export interface TransformComponents {
  x: string;
  y: string;
  z: string;
  scale: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  rotateX: number;
  rotateY: number;
  skewX: number;
  skewY: number;
}

export interface ComputedStylePatch {
  transform?: string;
  opacity?: string;
  filter?: string;
  backgroundColor?: string;
  color?: string;
  width?: string;
  height?: string;
  [key: string]: string | undefined;
}

export interface IEngineAdapter {
  readonly name: string;
  readonly target: CompilationTarget;
  supportsProperty(property: string): boolean;
  apply(
    element: HTMLElement | null,
    bindings: AnimationBinding[],
    time: number,
    reducedMotion?: boolean
  ): ComputedStylePatch;
  respectsSingleTransformAuthority(): boolean;
}

/**
 * Evaluates Single Transform Authority (STA) for a set of spatial transform inputs.
 * Synthesizes individual components into a single, canonical, composited matrix string.
 */
export function synthesizeSingleTransformMatrix(components: Partial<TransformComponents>): string {
  const parts: string[] = [];

  const x = components.x ?? "0px";
  const y = components.y ?? "0px";
  const z = components.z ?? "0px";

  if (x !== "0px" || y !== "0px" || z !== "0px") {
    parts.push(`translate3d(${x}, ${y}, ${z})`);
  }

  if (components.rotateX !== undefined && components.rotateX !== 0) {
    parts.push(`rotateX(${components.rotateX}deg)`);
  }
  if (components.rotateY !== undefined && components.rotateY !== 0) {
    parts.push(`rotateY(${components.rotateY}deg)`);
  }
  if (components.rotate !== undefined && components.rotate !== 0) {
    parts.push(`rotate(${components.rotate}deg)`);
  }

  if (components.skewX !== undefined && components.skewX !== 0) {
    parts.push(`skewX(${components.skewX}deg)`);
  }
  if (components.skewY !== undefined && components.skewY !== 0) {
    parts.push(`skewY(${components.skewY}deg)`);
  }

  const s = components.scale;
  const sx = components.scaleX ?? (s !== undefined ? s : 1);
  const sy = components.scaleY ?? (s !== undefined ? s : 1);

  if (sx !== 1 || sy !== 1) {
    parts.push(`scale(${sx}, ${sy})`);
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

/**
 * ----------------------------------------------------------------------------
 * 1. CSS COMPOSITOR ADAPTER (Target A: Zero-Dependency Web)
 * ----------------------------------------------------------------------------
 * Pure GPU compositor execution. Strips transition: all, unifies spatial
 * transforms under Single Transform Authority (STA), and applies safe reduced
 * motion fallbacks.
 */
export class CssCompositorAdapter implements IEngineAdapter {
  public readonly name = "CssCompositor";
  public readonly target: CompilationTarget = "zero-dependency-web";

  private readonly supportedProps = new Set([
    "transform.x",
    "transform.y",
    "transform.z",
    "transform.scale",
    "transform.scaleX",
    "transform.scaleY",
    "transform.rotate",
    "transform.rotateX",
    "transform.rotateY",
    "transform.skewX",
    "transform.skewY",
    "opacity",
    "appearance.opacity",
    "filter",
    "filter.blur",
    "backgroundColor",
    "appearance.background.color",
    "color",
    "typography.color",
  ]);

  public supportsProperty(property: string): boolean {
    return this.supportedProps.has(property);
  }

  public respectsSingleTransformAuthority(): boolean {
    return true;
  }

  public apply(
    element: HTMLElement | null,
    bindings: AnimationBinding[],
    time: number,
    reducedMotion: boolean = false
  ): ComputedStylePatch {
    const patch: ComputedStylePatch = {};
    const transformState: Partial<TransformComponents> = {};

    // Sort bindings by priority order (§6.2): Focus > Press > Hover > StateTransition > ScrollLinked > Entrance > Exit > Ambient
    const sortedBindings = [...bindings].sort((a, b) => {
      const idxA = CATEGORY_PRIORITY_ORDER.indexOf(a.category);
      const idxB = CATEGORY_PRIORITY_ORDER.indexOf(b.category);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    for (const binding of sortedBindings) {
      const effectiveBinding = reducedMotion
        ? ElementGrammarEngine.applyReducedMotionFallback(binding)
        : binding;

      for (const prop of effectiveBinding.properties) {
        if (!reducedMotion) {
          if (prop === "transform.x") transformState.x = `${Math.sin(time) * 10}px`;
          else if (prop === "transform.y") transformState.y = `${Math.cos(time) * 10}px`;
          else if (prop === "transform.scale") transformState.scale = 1 + Math.sin(time) * 0.05;
          else if (prop === "transform.rotate") transformState.rotate = Math.sin(time) * 5;
        }

        if (prop === "opacity" || prop === "appearance.opacity") {
          patch.opacity = patch.opacity ?? "1";
        } else if (prop === "filter.blur") {
          patch.filter = patch.filter ?? "none";
        } else if (prop === "backgroundColor" || prop === "appearance.background.color") {
          patch.backgroundColor = patch.backgroundColor ?? "transparent";
        }
      }
    }

    const synthesizedTransform = synthesizeSingleTransformMatrix(transformState);
    if (synthesizedTransform !== "none") {
      patch.transform = synthesizedTransform;
    }

    if (element) {
      if (patch.transform) element.style.transform = patch.transform;
      if (patch.opacity) element.style.opacity = patch.opacity;
      if (patch.filter) element.style.filter = patch.filter;
      if (patch.backgroundColor) element.style.backgroundColor = patch.backgroundColor;

      // Single Transform Authority Rule: Strip transition: all to prevent layout reflow thrashing
      if (element.style.transition && element.style.transition.includes("all")) {
        element.style.transition = element.style.transition.replace(/\ball\b/g, "transform, opacity");
      }
    }

    return patch;
  }
}

/**
 * ----------------------------------------------------------------------------
 * 2. FRAMER MOTION ADAPTER (Target B: Framework-Native React Motion)
 * ----------------------------------------------------------------------------
 * Maps bindings to Framer Motion gesture and layout transition props.
 */
export class FramerMotionAdapter implements IEngineAdapter {
  public readonly name = "FramerMotion";
  public readonly target: CompilationTarget = "framer-motion";

  public supportsProperty(property: string): boolean {
    return true; // Framer Motion supports transforms, opacity, layout, colors
  }

  public respectsSingleTransformAuthority(): boolean {
    return true;
  }

  public apply(
    element: HTMLElement | null,
    bindings: AnimationBinding[],
    time: number,
    reducedMotion: boolean = false
  ): ComputedStylePatch {
    const patch: ComputedStylePatch = {};
    const transformState: Partial<TransformComponents> = {};

    for (const binding of bindings) {
      if (reducedMotion) {
        patch.opacity = "1";
        continue;
      }

      if (binding.category === "Hover") {
        transformState.scale = 1.05;
        transformState.y = "-2px";
      } else if (binding.category === "Press") {
        transformState.scale = 0.96;
      } else if (binding.category === "Entrance") {
        patch.opacity = "1";
        transformState.y = "0px";
      }
    }

    const matrix = synthesizeSingleTransformMatrix(transformState);
    if (matrix !== "none") patch.transform = matrix;

    if (element) {
      if (patch.transform) element.style.transform = patch.transform;
      if (patch.opacity) element.style.opacity = patch.opacity;
    }

    return patch;
  }

  public generateMotionProps(bindings: AnimationBinding[]): Record<string, unknown> {
    const motionProps: Record<string, unknown> = {
      initial: {},
      animate: {},
      whileHover: {},
      whileTap: {},
      whileFocus: {},
    };

    for (const b of bindings) {
      if (b.category === "Entrance") {
        (motionProps.initial as Record<string, unknown>).opacity = 0;
        (motionProps.initial as Record<string, unknown>).y = 20;
        (motionProps.animate as Record<string, unknown>).opacity = 1;
        (motionProps.animate as Record<string, unknown>).y = 0;
      } else if (b.category === "Hover") {
        (motionProps.whileHover as Record<string, unknown>).scale = 1.05;
      } else if (b.category === "Press") {
        (motionProps.whileTap as Record<string, unknown>).scale = 0.95;
      }
    }

    return motionProps;
  }
}

/**
 * ----------------------------------------------------------------------------
 * 3. GSAP ENGINE ADAPTER (Target C: Studio Authoring Engine)
 * ----------------------------------------------------------------------------
 * High precision authoring adapter. Used during live studio playback.
 */
export class GsapEngineAdapter implements IEngineAdapter {
  public readonly name = "GsapEngine";
  public readonly target: CompilationTarget = "gsap";

  public supportsProperty(property: string): boolean {
    return true;
  }

  public respectsSingleTransformAuthority(): boolean {
    return true;
  }

  public apply(
    element: HTMLElement | null,
    bindings: AnimationBinding[],
    time: number,
    reducedMotion: boolean = false
  ): ComputedStylePatch {
    const patch: ComputedStylePatch = {};
    const transformState: Partial<TransformComponents> = {};

    for (const b of bindings) {
      if (reducedMotion) {
        patch.opacity = "1";
        continue;
      }

      if (b.properties.includes("transform.x")) transformState.x = `${time * 20}px`;
      if (b.properties.includes("transform.y")) transformState.y = `${Math.sin(time) * 15}px`;
      if (b.properties.includes("transform.rotate")) transformState.rotate = (time * 45) % 360;
      if (b.properties.includes("appearance.opacity") || b.properties.includes("opacity")) patch.opacity = `${Math.min(1, Math.max(0, time))}`;
    }

    const matrix = synthesizeSingleTransformMatrix(transformState);
    if (matrix !== "none") patch.transform = matrix;

    if (element) {
      if (patch.transform) element.style.transform = patch.transform;
      if (patch.opacity) element.style.opacity = patch.opacity;
    }

    return patch;
  }
}

/**
 * ----------------------------------------------------------------------------
 * ENGINE ADAPTER MANAGER
 * ----------------------------------------------------------------------------
 * Singleton arbiter routing property updates to the appropriate adapter
 * based on selected compilation target or authoring mode.
 */
export class EngineAdapterManager {
  private adapters: Map<CompilationTarget, IEngineAdapter> = new Map();

  constructor() {
    this.adapters.set("zero-dependency-web", new CssCompositorAdapter());
    this.adapters.set("framer-motion", new FramerMotionAdapter());
    this.adapters.set("gsap", new GsapEngineAdapter());
  }

  public getAdapter(target: CompilationTarget = "zero-dependency-web"): IEngineAdapter {
    return this.adapters.get(target) || this.adapters.get("zero-dependency-web")!;
  }

  /**
   * Applies Single Transform Authority (STA) across all active bindings.
   */
  public applyUnifiedStyles(
    element: HTMLElement | null,
    bindings: AnimationBinding[],
    time: number,
    target: CompilationTarget = "zero-dependency-web",
    policy: ReducedMotionPolicy = "respect-os",
    osPrefersReduced: boolean = false
  ): ComputedStylePatch {
    const isReduced = ElementGrammarEngine.evaluateReducedMotion(policy, osPrefersReduced);
    const adapter = this.getAdapter(target);
    return adapter.apply(element, bindings, time, isReduced);
  }
}

export const engineAdapterManager = new EngineAdapterManager();
