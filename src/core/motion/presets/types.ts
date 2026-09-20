"use client";

/**
 * ============================================================================
 * MOTION STUDIO PRESET CONTRACTS & METADATA
 * ============================================================================
 * Defines the contract for curated, production-grade animation presets across
 * all four element families (Interactive, Media, Structural, Text).
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.3 & PRD.md §5.1–§5.4
 * ============================================================================
 */

import { AttachedAnimation, FamilyId, ArchetypeId } from "../../elements/types";

export interface MotionPreset {
  id: string;
  name: string;
  family: FamilyId;
  compatibleArchetypes: ArchetypeId[];
  blockedCategories?: string[]; // Rule 6.1 blocked categories
  description: string;
  badge: "Spring" | "Gesture" | "Mount" | "ScrollTrigger" | "Hover" | "ClipPath" | "Vector" | "Ambient" | "SplitText" | "Physics";
  engine: "gsap" | "framer-motion" | "css-spring" | "svg-runtime";
  animation: Omit<AttachedAnimation, "id">;
  tags: string[];
}

export interface PresetFilterCriteria {
  family?: FamilyId;
  archetype?: ArchetypeId;
  badge?: string;
  searchQuery?: string;
}
