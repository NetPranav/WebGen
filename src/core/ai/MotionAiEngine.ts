"use client";

/**
 * ============================================================================
 * MOTION AI CO-PILOT ENGINE
 * ============================================================================
 * Natural Language Prompt-to-Motion Choreography Engine with Rule 6.1
 * Category Hard Block enforcement and Ghost Diff staging.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.1–7.2 & PRD.md §3, §5
 * ============================================================================
 */

import { getArchetype, type ArchetypeId, type FamilyId } from "../document/registry";
import { hydrateClip, type ClipDraft } from "../document/factories";
import type { ClipTemplate, Layer } from "../document/schema";
import { ALL_PRESETS, getPresetById, RULE_6_1_BLOCKED_CATEGORIES } from "../motion/presets";
import { createId } from "../ids";

export interface MotionAiRequest {
  prompt: string;
  targetElement: Layer;
  existingAnimations?: ClipTemplate[];
}

export interface MotionAiDiffSummary {
  addedTracks: string[];
  modifiedTracks: string[];
  description: string;
}

export interface MotionAiResponse {
  success: boolean;
  intent: string;
  targetFamily: FamilyId | null;
  targetArchetype: ArchetypeId;
  ghostAnimation: ClipTemplate | null;
  diffSummary: MotionAiDiffSummary;
  explanation: string;
  ruleViolation?: {
    rule: string;
    explanation: string;
    alternativeSuggestion: string;
  };
  suggestedPromptAlternatives?: string[];
}

/**
 * Natural language intent matching patterns.
 */
interface IntentMatchRule {
  keywords: string[];
  matchedIntent: string;
  presetId?: string;
  generator?: (element: Layer) => ClipDraft;
}

export class MotionAiEngine {
  /**
   * Process a natural language prompt and generate candidate ghost animation keyframes.
   */
  public generateMotion(request: MotionAiRequest): MotionAiResponse {
    const { prompt, targetElement, existingAnimations = [] } = request;
    const normalizedPrompt = prompt.toLowerCase().trim();
    const { archetype } = targetElement;
    const family = getArchetype(archetype).family;

    // 1. Check Rule 6.1 (Category Hard Block)
    const ruleCheck = this.checkRule61(normalizedPrompt, archetype);
    if (ruleCheck) {
      return {
        success: false,
        intent: "blocked_interaction",
        targetFamily: family,
        targetArchetype: archetype,
        ghostAnimation: null,
        diffSummary: {
          addedTracks: [],
          modifiedTracks: [],
          description: "Operation halted by architectural contract",
        },
        explanation: ruleCheck.explanation,
        ruleViolation: ruleCheck,
        suggestedPromptAlternatives: ruleCheck.suggestedPromptAlternatives,
      };
    }

    // 2. Parse Intent and synthesize a clip
    const candidate = hydrateClip(this.synthesizeAnimationForPrompt(normalizedPrompt, targetElement));

    // 3. Compute Diff against existing tracks
    const diffSummary = this.computeDiff(candidate, existingAnimations);

    return {
      success: true,
      intent: candidate.name,
      targetFamily: family,
      targetArchetype: archetype,
      ghostAnimation: candidate,
      diffSummary,
      explanation: `Synthesized "${candidate.name}" (${candidate.type} / ${candidate.trigger}) for ${targetElement.name} with ${candidate.tracks?.length || 0} tracks. Preview active as translucent ghost keyframes.`,
      suggestedPromptAlternatives: [
        "Make it bounce slightly faster",
        "Add subtle rotation",
        "Loop continuously as ambient state",
      ],
    };
  }

  /**
   * Evaluates Rule 6.1 Category Hard Block constraints for the target archetype.
   */
  private checkRule61(
    prompt: string,
    archetype: ArchetypeId
  ): { rule: string; explanation: string; alternativeSuggestion: string; suggestedPromptAlternatives: string[] } | null {
    const isInteractiveGesture =
      prompt.includes("tap") ||
      prompt.includes("click") ||
      prompt.includes("press") ||
      prompt.includes("hover");

    if (archetype === "text" && isInteractiveGesture) {
      return {
        rule: "Rule 6.1 (Category Hard Block)",
        explanation:
          "Rule 6.1 Violation: Plain text elements cannot directly receive tap, click, or hover gesture tracks. In accordance with PRD §3 and §6.1, non-interactive text must be wrapped inside a Button or Link element to receive gesture triggers.",
        alternativeSuggestion: "Apply an entrance stagger reveal or ambient sheen to the text instead.",
        suggestedPromptAlternatives: [
          "Reveal text with word-by-word stagger",
          "Blur-up line reveal on entrance",
          "Ambient gradient text sheen loop",
        ],
      };
    }

    if (archetype === "divider" && isInteractiveGesture) {
      return {
        rule: "Rule 6.1 (Category Hard Block)",
        explanation:
          "Rule 6.1 Violation: Structural dividers cannot directly receive user click or hover events.",
        alternativeSuggestion: "Choreograph divider draw-in on mount or scroll.",
        suggestedPromptAlternatives: [
          "Draw in divider from center on scroll",
          "Draw divider from left to right on mount",
          "Slow gradient sweep loop across divider",
        ],
      };
    }

    if (archetype === "background" && (prompt.includes("tap") || prompt.includes("click"))) {
      return {
        rule: "Rule 6.1 (Category Hard Block)",
        explanation:
          "Rule 6.1 Violation: Full background backdrops cannot consume tap gestures directly to avoid blocking child clicks.",
        alternativeSuggestion: "Animate ambient gradient drifts, parallax scroll, or noise grain pulses.",
        suggestedPromptAlternatives: [
          "Give this background a slow sunrise gradient drift",
          "Aurora borealis shifting color loop",
          "Parallax scroll depth",
        ],
      };
    }

    return null;
  }

  /**
   * Synthesize animation tracks matching user natural language prompt.
   */
  private synthesizeAnimationForPrompt(prompt: string, element: Layer): ClipDraft {
    const p = prompt.toLowerCase();
    const family = getArchetype(element.archetype).family;
    const animId = createId("ghost");

    // A. Image: Ken Burns
    if (p.includes("ken burns") || (p.includes("zoom") && family === "media")) {
      return {
        id: animId,
        name: "Ken Burns Subtle Zoom",
        type: "loop",
        trigger: "time",
        duration: 8.0,
        repeat: -1,
        easing: "sine.inOut",
        enabled: true,
        tracks: [
          {
            property: "transform.scale",
            keyframes: [
              { time: 0, value: 1.0, ease: "sine.inOut" },
              { time: 4.0, value: 1.14, ease: "sine.inOut" },
              { time: 8.0, value: 1.0, ease: "sine.inOut" },
            ],
          },
          {
            property: "media.focalPoint.x",
            keyframes: [
              { time: 0, value: 50, ease: "sine.inOut" },
              { time: 4.0, value: 55, ease: "sine.inOut" },
              { time: 8.0, value: 50, ease: "sine.inOut" },
            ],
          },
          {
            property: "media.focalPoint.y",
            keyframes: [
              { time: 0, value: 50, ease: "sine.inOut" },
              { time: 4.0, value: 45, ease: "sine.inOut" },
              { time: 8.0, value: 50, ease: "sine.inOut" },
            ],
          },
        ],
      };
    }

    // B. Interactive: Elastic bounce on tap / click
    if ((p.includes("elastic") && p.includes("bounce")) || (p.includes("bounce") && (p.includes("tap") || p.includes("click")))) {
      return {
        id: animId,
        name: "Elastic Bounce on Tap",
        type: "tap",
        trigger: "press",
        duration: 0.35,
        easing: "spring(stiffness: 450, damping: 18)",
        enabled: true,
        tracks: [
          {
            property: "transform.scale",
            keyframes: [
              { time: 0, value: 1.0, ease: "power1.in" },
              { time: 0.1, value: 0.92, ease: "power1.in" },
              { time: 0.22, value: 1.06, ease: "back.out(3)" },
              { time: 0.35, value: 1.0, ease: "spring(stiffness: 450, damping: 18)" },
            ],
          },
        ],
      };
    }

    // C. Structural: Sunrise gradient drift
    if (p.includes("sunrise") || (p.includes("gradient") && p.includes("drift"))) {
      return {
        id: animId,
        name: "Slow Sunrise Gradient Drift",
        type: "loop",
        trigger: "time",
        duration: 12.0,
        repeat: -1,
        easing: "sine.inOut",
        enabled: true,
        tracks: [
          {
            property: "background.gradient.angle",
            keyframes: [
              { time: 0, value: 45, ease: "sine.inOut" },
              { time: 6.0, value: 135, ease: "sine.inOut" },
              { time: 12.0, value: 45, ease: "sine.inOut" },
            ],
          },
          {
            property: "appearance.opacity",
            keyframes: [
              { time: 0, value: 0.88, ease: "sine.inOut" },
              { time: 6.0, value: 1.0, ease: "sine.inOut" },
              { time: 12.0, value: 0.88, ease: "sine.inOut" },
            ],
          },
        ],
      };
    }

    // D. Structural: Divider draw from center on scroll
    if (element.archetype === "divider" && (p.includes("center") || p.includes("scroll") || p.includes("draw"))) {
      const isScroll = p.includes("scroll");
      return {
        id: animId,
        name: "Divider Center Draw-In",
        type: isScroll ? "scroll" : "entrance",
        trigger: isScroll ? "scrollProgress" : "mount",
        duration: 0.9,
        easing: isScroll ? "none" : "power3.out",
        enabled: true,
        scrollTrigger: isScroll
          ? {
              start: "top 80%",
              end: "top 45%",
              scrub: 1.0,
            }
          : undefined,
        tracks: [
          {
            property: "transform.scaleX",
            keyframes: [
              { time: 0, value: 0, ease: "power3.out" },
              { time: 0.9, value: 1.0, ease: "power3.out" },
            ],
          },
          {
            property: "appearance.opacity",
            keyframes: [
              { time: 0, value: 0, ease: "linear" },
              { time: 0.25, value: 1.0, ease: "linear" },
            ],
          },
        ],
      };
    }

    // E. Text: Word stagger cascade
    if (family === "text" && (p.includes("stagger") || p.includes("word") || p.includes("cascade"))) {
      return {
        id: animId,
        name: "Word Stagger Cascade",
        type: "entrance",
        trigger: "mount",
        duration: 0.85,
        easing: "power3.out",
        enabled: true,
        stagger: {
          amount: 0.35,
          from: "start",
        },
        tracks: [
          {
            property: "transform.y",
            keyframes: [
              { time: 0, value: 24, ease: "power3.out" },
              { time: 0.85, value: 0, ease: "power3.out" },
            ],
          },
          {
            property: "appearance.opacity",
            keyframes: [
              { time: 0, value: 0, ease: "linear" },
              { time: 0.4, value: 1.0, ease: "linear" },
            ],
          },
        ],
      };
    }

    // F. Media / Icon: SVG stroke draw
    if (element.archetype === "icon" && (p.includes("draw") || p.includes("stroke") || p.includes("vector"))) {
      return {
        id: animId,
        name: "SVG Vector Path Draw",
        type: "entrance",
        trigger: "mount",
        duration: 1.4,
        easing: "power2.inOut",
        enabled: true,
        tracks: [
          {
            property: "svg.strokeDashoffset",
            keyframes: [
              { time: 0, value: 1000, ease: "power2.inOut" },
              { time: 1.4, value: 0, ease: "power2.inOut" },
            ],
          },
        ],
      };
    }

    // G. Hover / Spring
    if (p.includes("hover") || p.includes("spring")) {
      return {
        id: animId,
        name: "Magnetic Spring Hover",
        type: "hover",
        trigger: "hover",
        duration: 0.3,
        easing: "spring(stiffness: 400, damping: 22)",
        enabled: true,
        tracks: [
          {
            property: "transform.scale",
            keyframes: [
              { time: 0, value: 1.0, ease: "linear" },
              { time: 0.3, value: 1.07, ease: "spring(stiffness: 400, damping: 22)" },
            ],
          },
          {
            property: "transform.y",
            keyframes: [
              { time: 0, value: 0, ease: "linear" },
              { time: 0.3, value: -3, ease: "spring(stiffness: 400, damping: 22)" },
            ],
          },
        ],
      };
    }

    // H. Default Fallback: Clean Entrance Fade & Up
    return {
      id: animId,
      name: "Smooth Entrance Reveal",
      type: "entrance",
      trigger: "mount",
      duration: 0.6,
      easing: "power2.out",
      enabled: true,
      tracks: [
        {
          property: "transform.y",
          keyframes: [
            { time: 0, value: 16, ease: "power2.out" },
            { time: 0.6, value: 0, ease: "power2.out" },
          ],
        },
        {
          property: "appearance.opacity",
          keyframes: [
            { time: 0, value: 0, ease: "power2.out" },
            { time: 0.6, value: 1.0, ease: "power2.out" },
          ],
        },
      ],
    };
  }

  /**
   * Compares the candidate animation against existing element tracks.
   */
  private computeDiff(candidate: ClipTemplate, existingAnimations: ClipTemplate[]): MotionAiDiffSummary {
    const existingProperties = new Set<string>();
    for (const anim of existingAnimations) {
      if (anim.tracks) {
        for (const t of anim.tracks) {
          existingProperties.add(t.property);
        }
      }
    }

    const addedTracks: string[] = [];
    const modifiedTracks: string[] = [];

    if (candidate.tracks) {
      for (const t of candidate.tracks) {
        if (existingProperties.has(t.property)) {
          modifiedTracks.push(t.property);
        } else {
          addedTracks.push(t.property);
        }
      }
    }

    let description = "";
    if (addedTracks.length > 0 && modifiedTracks.length > 0) {
      description = `Adding ${addedTracks.length} new track(s) (${addedTracks.join(", ")}) and updating ${modifiedTracks.length} existing track(s) (${modifiedTracks.join(", ")}).`;
    } else if (addedTracks.length > 0) {
      description = `Adding ${addedTracks.length} new track(s): ${addedTracks.join(", ")}.`;
    } else if (modifiedTracks.length > 0) {
      description = `Updating ${modifiedTracks.length} existing track(s): ${modifiedTracks.join(", ")}.`;
    } else {
      description = "No track collisions detected.";
    }

    return { addedTracks, modifiedTracks, description };
  }
}

export const motionAiEngine = new MotionAiEngine();
