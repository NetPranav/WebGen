"use client";

/**
 * ============================================================================
 * CENTRAL MOTION PRESET LIBRARY & REGISTRY (51 PRESETS)
 * ============================================================================
 * Central aggregator and query engine for all curated motion presets.
 * Enforces Rule 6.1 (Category Hard Block) per archetype contract.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & PRD.md §5.1–§5.4
 * ============================================================================
 */

import { INTERACTIVE_PRESETS } from "./interactivePresets";
import { MEDIA_PRESETS } from "./mediaPresets";
import { STRUCTURAL_PRESETS } from "./structuralPresets";
import { TEXT_PRESETS } from "./textPresets";
import { MotionPreset, PresetFilterCriteria } from "./types";
import { ArchetypeId, FamilyId, AttachedAnimation } from "../../elements/types";

export * from "./types";
export * from "./interactivePresets";
export * from "./mediaPresets";
export * from "./structuralPresets";
export * from "./textPresets";

/**
 * Master catalog containing all 51 curated production motion presets.
 */
export const ALL_PRESETS: MotionPreset[] = [
  ...INTERACTIVE_PRESETS,
  ...MEDIA_PRESETS,
  ...STRUCTURAL_PRESETS,
  ...TEXT_PRESETS,
];

/**
 * Retrieve all presets in the library.
 */
export function getAllPresets(): MotionPreset[] {
  return ALL_PRESETS;
}

/**
 * Retrieve a preset by its unique ID.
 */
export function getPresetById(id: string): MotionPreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

/**
 * Retrieve presets belonging to a specific element family.
 */
export function getPresetsByFamily(family: FamilyId): MotionPreset[] {
  return ALL_PRESETS.filter((p) => p.family === family);
}

/**
 * Rule 6.1 Category Hard Block definition per archetype.
 * Specifies disallowed animation categories for each archetype.
 */
export const RULE_6_1_BLOCKED_CATEGORIES: Record<ArchetypeId, { blockedCategories: string[]; explanation: string }> = {
  text: {
    blockedCategories: ["hover", "tap"],
    explanation: "Rule 6.1: Plain text cannot be directly clicked or hovered. Wrap in a Button or Link to enable interactive gestures.",
  },
  divider: {
    blockedCategories: ["hover", "tap"],
    explanation: "Rule 6.1: Structural dividers do not receive direct pointer interactions.",
  },
  background: {
    blockedCategories: ["tap"],
    explanation: "Rule 6.1: Full background layers do not accept direct tap gestures; clicks must pass through to interactive children.",
  },
  image: {
    blockedCategories: [],
    explanation: "",
  },
  icon: {
    blockedCategories: [],
    explanation: "",
  },
  container: {
    blockedCategories: [],
    explanation: "",
  },
  button: {
    blockedCategories: [],
    explanation: "",
  },
  toggle: {
    blockedCategories: [],
    explanation: "",
  },
  badge: {
    blockedCategories: [],
    explanation: "",
  },
  fab: {
    blockedCategories: [],
    explanation: "",
  },
};

/**
 * Categorize presets for a specific element archetype into available vs blocked by Rule 6.1.
 */
export function getPresetsForArchetype(archetype: ArchetypeId): {
  available: MotionPreset[];
  blocked: { preset: MotionPreset; reason: string }[];
} {
  const rule = RULE_6_1_BLOCKED_CATEGORIES[archetype];
  const available: MotionPreset[] = [];
  const blocked: { preset: MotionPreset; reason: string }[] = [];

  for (const preset of ALL_PRESETS) {
    const isFamilyCompatible = preset.compatibleArchetypes.includes(archetype);
    const isCategoryBlocked = rule && rule.blockedCategories.includes(preset.animation.type);

    if (isCategoryBlocked) {
      blocked.push({
        preset,
        reason: rule.explanation,
      });
    } else if (isFamilyCompatible) {
      available.push(preset);
    }
  }

  return { available, blocked };
}

/**
 * Filter presets using flexible search and criteria parameters.
 */
export function filterPresets(criteria: PresetFilterCriteria): MotionPreset[] {
  return ALL_PRESETS.filter((preset) => {
    if (criteria.family && preset.family !== criteria.family) {
      return false;
    }
    if (criteria.archetype && !preset.compatibleArchetypes.includes(criteria.archetype)) {
      return false;
    }
    if (criteria.badge && preset.badge.toLowerCase() !== criteria.badge.toLowerCase()) {
      return false;
    }
    if (criteria.searchQuery) {
      const q = criteria.searchQuery.toLowerCase();
      const matchName = preset.name.toLowerCase().includes(q);
      const matchDesc = preset.description.toLowerCase().includes(q);
      const matchTags = preset.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchTags) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Instantiate a preset into a fully hydrated AttachedAnimation object.
 */
export function instantiatePreset(
  presetId: string,
  customOverrides?: Partial<AttachedAnimation>
): AttachedAnimation | null {
  const preset = getPresetById(presetId);
  if (!preset) return null;

  const instanceId = `anim_${preset.id.replace("preset_", "")}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: instanceId,
    name: preset.animation.name,
    type: preset.animation.type,
    trigger: preset.animation.trigger,
    duration: preset.animation.duration,
    easing: preset.animation.easing,
    repeat: preset.animation.repeat,
    enabled: true,
    scrollTrigger: preset.animation.scrollTrigger ? { ...preset.animation.scrollTrigger } : undefined,
    stagger: preset.animation.stagger ? { ...preset.animation.stagger } : undefined,
    tracks: preset.animation.tracks
      ? preset.animation.tracks.map((t) => ({
          property: t.property,
          keyframes: t.keyframes.map((kf, i) => ({
            id: `kf_${i}_${Math.random().toString(36).slice(2, 6)}`,
            time: kf.time,
            value: kf.value,
            ease: kf.ease,
          })),
        }))
      : [],
    ...customOverrides,
  };
}
