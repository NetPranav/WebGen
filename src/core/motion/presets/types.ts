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

import type { ArchetypeId, FamilyId } from "../../document/registry";
import type { ClipDraft } from "../../document/factories";

/** A preset's animation as stored in the catalogue: a clip draft without ids. */
export type PresetAnimation = ClipDraft;

export interface MotionPreset {
  id: string;
  name: string;
  family: FamilyId;
  compatibleArchetypes: ArchetypeId[];
  blockedCategories?: string[]; // Rule 6.1 blocked categories
  description: string;
  badge: "Spring" | "Gesture" | "Mount" | "ScrollTrigger" | "Hover" | "ClipPath" | "Vector" | "Ambient" | "SplitText" | "Physics";
  engine: "gsap" | "framer-motion" | "css-spring" | "svg-runtime";
  animation: PresetAnimation;
  tags: string[];
}

export interface PresetFilterCriteria {
  family?: FamilyId;
  archetype?: ArchetypeId;
  badge?: string;
  searchQuery?: string;
}
