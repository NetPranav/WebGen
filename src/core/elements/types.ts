/**
 * ============================================================================
 * ELEMENT AST TYPE DEFINITIONS
 * ============================================================================
 * Architecture Ref: FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md §2 & SCHEMA_REFERENCE.md §3
 * Scope: Initial Phase — Element Animation Studio
 * Role: Base element AST contracts and archetype family unions.
 * ============================================================================
 */

import { ArchetypeId, FamilyId } from "@/editor/panels/launcher/archetypeData";

export type { ArchetypeId, FamilyId };

export interface ElementLayout {
  display?: "flex" | "grid" | "block" | "inline-flex" | "inline-block";
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  justify?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  align?: "stretch" | "flex-start" | "center" | "flex-end" | "baseline";
  gap?: number;
  wrap?: boolean;
  width?: number;
  height?: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ElementAppearance {
  opacity?: number;
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  boxShadow?: string;
}

export interface ElementTransform {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
  origin?: string;
}

export interface AnimationKeyframe {
  id?: string;
  time: number; // in seconds
  value: unknown;
  ease?: string;
}

export interface AnimationTrack {
  id?: string;
  property: string;
  muted?: boolean;
  locked?: boolean;
  keyframes: AnimationKeyframe[];
}

export interface ScrollTriggerConfig {
  start?: string;       // e.g. "top 80%"
  end?: string;         // e.g. "bottom 20%"
  scrub?: boolean | number; // true, false, or smoothing duration (e.g. 1.0)
  pin?: boolean;
  markers?: boolean;
}

export interface StaggerConfig {
  amount: number;       // total stagger delay or per-element delay
  from: "start" | "center" | "end" | "random";
  grid?: [number, number];
  axis?: "x" | "y";
}

export interface AttachedAnimation {
  id: string;
  name: string;
  type: "entrance" | "hover" | "tap" | "scroll" | "loop" | "morph";
  trigger: "onMount" | "onHover" | "onClick" | "onScroll" | "ambient";
  duration: number; // in seconds
  delay?: number;
  easing: string; // e.g. "power2.out", "spring(stiffness: 100, damping: 10)"
  repeat?: number; // -1 for infinite loop
  enabled: boolean;
  locked?: boolean;
  scrollTrigger?: ScrollTriggerConfig;
  stagger?: StaggerConfig;
  tracks?: AnimationTrack[];
}

export interface BaseElementNode<TProps extends object = Record<string, unknown>> {
  id: string;
  name: string;
  archetype: ArchetypeId;
  family: FamilyId;
  tag: string;
  parentId: string | null;
  layout: ElementLayout;
  appearance: ElementAppearance;
  transform: ElementTransform;
  properties: TProps;
  children: string[];
  animationStack: AttachedAnimation[];
  createdAt?: string;
  updatedAt?: string;
}
