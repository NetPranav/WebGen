/**
 * ============================================================================
 * TEXT FAMILY ARCHETYPE SCHEMAS & FACTORIES
 * ============================================================================
 * Family: Text (Family D)
 * Archetype: Text / Label
 * Architecture Ref: FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md §2 & PRD.md §5.4
 * Conventions Ref: CONVENTIONS.md §4.2 (typography.* properties)
 * Scope: Initial Phase — Element Animation Studio
 * ============================================================================
 */

import { BaseElementNode } from "../types";

export interface SplitTextConfig {
  enabled: boolean;
  mode: "chars" | "words" | "lines";
  stagger: number; // delay in seconds between items, e.g. 0.04
  staggerOrigin: "start" | "center" | "end" | "random";
}

export interface TextArchetypeConfig {
  textContent: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  letterSpacing: number;
  lineHeight: number;
  color: string;
  textAlign: "left" | "center" | "right" | "justify";
  splitText: SplitTextConfig;
}

export function createDefaultText(name = "Dynamic Headline"): BaseElementNode<TextArchetypeConfig> {
  return {
    id: `elem_text_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "text",
    family: "text",
    tag: "p",
    parentId: null,
    layout: {
      display: "block",
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    appearance: {
      opacity: 1,
      backgroundColor: "transparent",
    },
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
      textContent: "Choreograph Kinetic Typography",
      fontFamily: "Inter",
      fontSize: 32,
      fontWeight: "700",
      letterSpacing: -0.5,
      lineHeight: 1.2,
      color: "#0f172a",
      textAlign: "left",
      splitText: {
        enabled: true,
        mode: "chars",
        stagger: 0.03,
        staggerOrigin: "start",
      },
    },
    children: [],
    animationStack: [
      {
        id: "anim_text_split",
        name: "Character Reveal Stagger",
        type: "entrance",
        trigger: "onMount",
        duration: 0.6,
        easing: "back.out(2)",
        enabled: true,
      },
    ],
  };
}

/**
 * Validates whether a configuration object matches the required text archetype surface.
 */
export function validateTextConfig(
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof config.textContent !== "string") {
    errors.push("text.textContent must be a string");
  }
  if (typeof config.fontSize !== "number" || (config.fontSize as number) <= 0) {
    errors.push("text.fontSize must be a positive number");
  }
  if (config.splitText && typeof config.splitText === "object") {
    const split = config.splitText as Record<string, unknown>;
    if (!["chars", "words", "lines"].includes(split.mode as string)) {
      errors.push("text.splitText.mode must be chars, words, or lines");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
