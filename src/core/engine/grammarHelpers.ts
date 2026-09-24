"use client";

/**
 * ============================================================================
 * LAZYLAYOUT ELEMENT GRAMMAR UI & RUNTIME HELPERS
 * ============================================================================
 * Bridges UI outliner nodes, animation tracks, and property paths to the
 * authoritative ElementGrammarEngine contracts.
 * Matches:
 * - DOCS/Initial/lazylayout_element_grammer.md (§3, §6, §8)
 * - DOCS/Initial/ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md (§2, §9)
 * ============================================================================
 */

import {
  AnimationBinding,
  AnimationCategory,
  GrammarElementType,
  TriggerType,
  CATEGORY_PRIORITY_ORDER,
} from "../types/element-grammar";

export interface GrammarPropertyTierInfo {
  tier: 1 | 2 | 3;
  name: string;
  label: string;
  badge: string;
  color: string;
  bg: string;
  border: string;
}

export interface GrammarCategoryPriorityInfo {
  priority: number;
  category: AnimationCategory;
  badge: string;
  color: string;
  bg: string;
}

/**
 * Maps element identifiers, names, or tags into one of the 32 authoritative
 * GrammarElementType contracts.
 */
export function resolveGrammarElementType(
  elementId?: string,
  elementName?: string,
  elementTag?: string
): GrammarElementType {
  const id = (elementId || "").toLowerCase();
  const name = (elementName || "").toLowerCase();
  const tag = (elementTag || "").toUpperCase();

  // 1. Tag-specific checks
  if (tag === "BTN") return "Button";
  if (tag === "TXT") return "Text";
  if (tag === "BADGE") return "Badge";
  if (tag === "IMG") return "Image";
  if (tag === "CARD") return "Card";
  if (tag === "GRID") return "Grid";
  if (tag === "NAV") return "Navbar";
  if (tag === "HERO" || tag === "SECTION") return "Section";
  if (tag === "FOOTER") return "Footer";

  // 2. Name / ID semantic heuristics
  if (name.includes("button") || id.includes("btn") || name.includes("launch")) return "Button";
  if (name.includes("badge") || id.includes("badge") || name.includes("pill")) return "Badge";
  if (
    name.includes("text") ||
    name.includes("headline") ||
    name.includes("subtext") ||
    name.includes("paragraph") ||
    id.includes("headline")
  )
    return "Text";
  if (name.includes("image") || id.includes("img") || name.includes("logo") || id.includes("logo"))
    return "Image";
  if (name.includes("card") || id.includes("card")) return "Card";
  if (name.includes("grid") || id.includes("grid")) return "Grid";
  if (name.includes("navbar") || name.includes("nav") || id.includes("nav") || name.includes("header"))
    return "Navbar";
  if (name.includes("footer") || id.includes("footer")) return "Footer";
  if (name.includes("hero") || name.includes("section") || id.includes("hero") || id.includes("section"))
    return "Section";
  // Drawers are side-anchored Modals in the grammar (§3.B.6).
  if (name.includes("modal") || id.includes("modal") || name.includes("drawer") || id.includes("drawer"))
    return "Modal";
  if (name.includes("accordion") || id.includes("accordion")) return "Accordion";
  if (name.includes("tabs") || id.includes("tabs")) return "Tabs";
  if (name.includes("tooltip") || id.includes("tooltip")) return "Tooltip";
  if (name.includes("input") || id.includes("input")) return "Input";
  if (name.includes("icon") || id.includes("icon")) return "Icon";
  if (name.includes("avatar") || id.includes("avatar")) return "Avatar";
  if (name.includes("video") || id.includes("video")) return "Video";
  if (name.includes("canvas") || id.includes("canvas")) return "Canvas";
  if (name.includes("stack") || id.includes("stack")) return "Stack";
  if (name.includes("form") || id.includes("form")) return "Form";
  if (name.includes("switch") || id.includes("switch")) return "Switch";
  if (name.includes("checkbox") || id.includes("checkbox")) return "Checkbox";
  if (name.includes("slider") || id.includes("slider")) return "Slider";
  if (name.includes("dropdown") || id.includes("dropdown")) return "Dropdown";
  if (name.includes("divider") || id.includes("divider")) return "Divider";
  if (name.includes("spinner") || id.includes("spinner")) return "Spinner";
  if (name.includes("link") || id.includes("link")) return "Link";

  return "Container";
}

/**
 * Converts generic element tracks into typed AnimationBinding tuples for the grammar engine.
 */
export function convertTracksToGrammarBindings(
  targetElementId: string,
  tracks: Array<{
    id: string;
    trigger: string;
    duration?: number;
    delay?: number;
    easing?: string;
    properties: Array<{ property: string }>;
  }>
): AnimationBinding[] {
  return tracks.map((track) => {
    let category: AnimationCategory = "Entrance";
    let trigger: TriggerType = "OnLoad";

    if (track.trigger === "hover") {
      category = "Hover";
      trigger = "OnHoverEnter";
    } else if (track.trigger === "click") {
      category = "Press";
      trigger = "OnPress";
    } else if (track.trigger === "scroll") {
      category = "ScrollLinked";
      trigger = "OnScrollScrub";
    } else if (track.trigger === "state") {
      category = "StateTransition";
      trigger = "OnStateChange";
    } else {
      category = "Entrance";
      trigger = "OnLoad";
    }

    const props = track.properties.map((p) => p.property);
    const priorityIdx = CATEGORY_PRIORITY_ORDER.indexOf(category);

    return {
      id: track.id,
      targetElementId,
      category,
      trigger,
      properties: props,
      priority: priorityIdx !== -1 ? priorityIdx : 99,
      timing: {
        duration: Math.round((track.duration || 0.5) * 1000),
        delay: Math.round((track.delay || 0) * 1000),
        ease: track.easing || "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    };
  });
}

/**
 * Returns rendering pipeline performance tier information for a property path
 * per Section 2 of ANIMATION_PROPERTIES_AND_ENGINE_SPECIFICATION.md.
 */
export function getPropertyRenderingTier(property: string): GrammarPropertyTierInfo {
  const p = property.toLowerCase();

  // Tier 1: GPU Compositor (Zero Layout, Zero Paint) — 120 FPS
  if (
    p.startsWith("transform") ||
    p === "opacity" ||
    p === "appearance.opacity" ||
    p.startsWith("filter")
  ) {
    return {
      tier: 1,
      name: "GPU Compositor",
      label: "Tier 1: GPU",
      badge: "GPU 120fps",
      color: "#059669",
      bg: "rgba(16, 185, 129, 0.1)",
      border: "rgba(16, 185, 129, 0.25)",
    };
  }

  // Tier 2: Paint Only (Color, Background, Box-Shadow, SVG Stroke)
  if (
    p.includes("color") ||
    p.includes("background") ||
    p.includes("shadow") ||
    p.includes("stroke") ||
    p.includes("border")
  ) {
    return {
      tier: 2,
      name: "Paint Only",
      label: "Tier 2: Paint",
      badge: "Paint 60fps",
      color: "#D97706",
      bg: "rgba(245, 158, 11, 0.1)",
      border: "rgba(245, 158, 11, 0.25)",
    };
  }

  // Tier 3: Layout & Geometry (Width, Height, Padding, Margin, Flex, Grid)
  return {
    tier: 3,
    name: "Layout Reflow",
    label: "Tier 3: Layout",
    badge: "Reflow Alert",
    color: "#DC2626",
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.25)",
  };
}

/**
 * Returns priority hierarchy details per Grammar §6.2.
 */
export function getCategoryPriorityInfo(category: AnimationCategory): GrammarCategoryPriorityInfo {
  const priority = CATEGORY_PRIORITY_ORDER.indexOf(category);
  const priorityNum = priority !== -1 ? priority + 1 : 99;

  let color = "#64748B";
  let bg = "rgba(100, 116, 139, 0.1)";

  switch (category) {
    case "Focus":
      color = "#4338CA";
      bg = "rgba(67, 56, 202, 0.12)";
      break;
    case "Press":
      color = "#DC2626";
      bg = "rgba(220, 38, 38, 0.12)";
      break;
    case "Hover":
      color = "#206859";
      bg = "rgba(32, 104, 89, 0.12)";
      break;
    case "StateTransition":
      color = "#7C3AED";
      bg = "rgba(124, 58, 237, 0.12)";
      break;
    case "ScrollLinked":
      color = "#2563EB";
      bg = "rgba(37, 99, 235, 0.12)";
      break;
    case "Entrance":
      color = "#059669";
      bg = "rgba(5, 150, 105, 0.12)";
      break;
    case "Exit":
      color = "#D97706";
      bg = "rgba(217, 119, 6, 0.12)";
      break;
    case "Ambient":
      color = "#EC4899";
      bg = "rgba(236, 72, 153, 0.12)";
      break;
  }

  return {
    priority: priorityNum,
    category,
    badge: `P#${priorityNum}`,
    color,
    bg,
  };
}
