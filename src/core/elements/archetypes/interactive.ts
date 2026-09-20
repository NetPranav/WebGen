/**
 * ============================================================================
 * INTERACTIVE FAMILY ARCHETYPE SCHEMAS & FACTORIES
 * ============================================================================
 * Family: Interactive (Family A)
 * Archetypes: Button, Toggle Switch, Badge / Chip, Floating Action Button
 * Architecture Ref: FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md §2 & PRD.md §5.1
 * Scope: Initial Phase — Element Animation Studio
 * ============================================================================
 */

import { BaseElementNode } from "../types";

/* ----------------------------------------------------------------------------
 * 1. Button Archetype
 * ---------------------------------------------------------------------------- */
export interface ButtonArchetypeConfig {
  label: string;
  variant: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  disabled: boolean;
  iconLeft?: string;
  iconRight?: string;
  rippleEffect: boolean;
  loading: boolean;
  hoverScale: number;
  tapScale: number;
}

export function createDefaultButton(name = "Primary Action Button"): BaseElementNode<ButtonArchetypeConfig> {
  return {
    id: `elem_btn_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "button",
    family: "interactive",
    tag: "button",
    parentId: null,
    layout: {
      display: "inline-flex",
      direction: "row",
      justify: "center",
      align: "center",
      gap: 8,
      padding: { top: 12, right: 24, bottom: 12, left: 24 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    appearance: {
      opacity: 1,
      backgroundColor: "#206859",
      borderRadius: 8,
      borderWidth: 0,
      borderColor: "transparent",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
    },
    transform: {
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
      label: name,
      variant: "primary",
      disabled: false,
      rippleEffect: true,
      loading: false,
      hoverScale: 1.03,
      tapScale: 0.97,
    },
    children: [],
    animationStack: [
      {
        id: "anim_btn_hover",
        name: "Spring Hover Pull",
        type: "hover",
        trigger: "onHover",
        duration: 0.25,
        easing: "spring(stiffness: 400, damping: 25)",
        enabled: true,
      },
    ],
  };
}

/* ----------------------------------------------------------------------------
 * 2. Toggle Switch Archetype
 * ---------------------------------------------------------------------------- */
export interface ToggleArchetypeConfig {
  checked: boolean;
  activeColor: string;
  inactiveColor: string;
  thumbColor: string;
  size: "sm" | "md" | "lg";
  disabled: boolean;
  ariaLabel: string;
}

export function createDefaultToggle(name = "Settings Toggle"): BaseElementNode<ToggleArchetypeConfig> {
  return {
    id: `elem_toggle_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "toggle",
    family: "interactive",
    tag: "button",
    parentId: null,
    layout: {
      display: "inline-flex",
      direction: "row",
      justify: "flex-start",
      align: "center",
      padding: { top: 2, right: 2, bottom: 2, left: 2 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    appearance: {
      opacity: 1,
      backgroundColor: "#e2e8f0",
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: "#cbd5e1",
      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
    },
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
      checked: false,
      activeColor: "#206859",
      inactiveColor: "#e2e8f0",
      thumbColor: "#ffffff",
      size: "md",
      disabled: false,
      ariaLabel: "Toggle setting",
    },
    children: [],
    animationStack: [
      {
        id: "anim_toggle_slide",
        name: "Elastic Thumb Snap",
        type: "tap",
        trigger: "onClick",
        duration: 0.3,
        easing: "spring(stiffness: 500, damping: 30)",
        enabled: true,
      },
    ],
  };
}

/* ----------------------------------------------------------------------------
 * 3. Badge / Chip Archetype
 * ---------------------------------------------------------------------------- */
export interface BadgeArchetypeConfig {
  label: string;
  variant: "filled" | "subtle" | "outline";
  pillShape: boolean;
  colorScheme: "brand" | "neutral" | "success" | "warning" | "danger";
  icon?: string;
  interactive: boolean;
}

export function createDefaultBadge(name = "Status Badge"): BaseElementNode<BadgeArchetypeConfig> {
  return {
    id: `elem_badge_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "badge",
    family: "interactive",
    tag: "span",
    parentId: null,
    layout: {
      display: "inline-flex",
      direction: "row",
      justify: "center",
      align: "center",
      gap: 6,
      padding: { top: 4, right: 12, bottom: 4, left: 12 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    appearance: {
      opacity: 1,
      backgroundColor: "#e6f4f1",
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: "rgba(32, 104, 89, 0.2)",
    },
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
      label: name,
      variant: "subtle",
      pillShape: true,
      colorScheme: "brand",
      interactive: false,
    },
    children: [],
    animationStack: [
      {
        id: "anim_badge_mount",
        name: "Pop In Spring",
        type: "entrance",
        trigger: "onMount",
        duration: 0.4,
        easing: "back.out(1.7)",
        enabled: true,
      },
    ],
  };
}

/* ----------------------------------------------------------------------------
 * 4. Floating Action Button (FAB) Archetype
 * ---------------------------------------------------------------------------- */
export interface FabArchetypeConfig {
  icon: string;
  label?: string;
  elevation: "sm" | "md" | "lg" | "xl";
  extended: boolean;
  badgeCount?: number;
}

export function createDefaultFab(name = "Floating Action"): BaseElementNode<FabArchetypeConfig> {
  return {
    id: `elem_fab_${Math.random().toString(36).substring(2, 9)}`,
    name,
    archetype: "fab",
    family: "interactive",
    tag: "button",
    parentId: null,
    layout: {
      display: "inline-flex",
      direction: "row",
      justify: "center",
      align: "center",
      gap: 8,
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    appearance: {
      opacity: 1,
      backgroundColor: "#206859",
      borderRadius: 9999,
      borderWidth: 0,
      boxShadow: "0 10px 25px -5px rgba(32, 104, 89, 0.4), 0 8px 10px -6px rgba(32, 104, 89, 0.2)",
    },
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      origin: "50% 50%",
    },
    properties: {
      icon: "Plus",
      elevation: "lg",
      extended: false,
    },
    children: [],
    animationStack: [
      {
        id: "anim_fab_pulse",
        name: "Ambient Floating Hover",
        type: "hover",
        trigger: "onHover",
        duration: 0.3,
        easing: "power2.out",
        enabled: true,
      },
    ],
  };
}

/**
 * Validates whether a configuration object matches the required interactive archetype surface.
 */
export function validateInteractiveConfig(
  archetype: "button" | "toggle" | "badge" | "fab",
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (archetype === "button") {
    if (typeof config.label !== "string") errors.push("button.label must be a string");
    if (!["primary", "secondary", "outline", "ghost", "destructive"].includes(config.variant as string)) {
      errors.push("button.variant must be one of primary, secondary, outline, ghost, destructive");
    }
  } else if (archetype === "toggle") {
    if (typeof config.checked !== "boolean") errors.push("toggle.checked must be a boolean");
    if (typeof config.activeColor !== "string") errors.push("toggle.activeColor must be a color string");
  } else if (archetype === "badge") {
    if (typeof config.label !== "string") errors.push("badge.label must be a string");
    if (typeof config.pillShape !== "boolean") errors.push("badge.pillShape must be a boolean");
  } else if (archetype === "fab") {
    if (typeof config.icon !== "string") errors.push("fab.icon must be a string");
    if (typeof config.extended !== "boolean") errors.push("fab.extended must be a boolean");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
