"use client";

/**
 * ============================================================================
 * REFERENCE VIEWER & DEPENDENCY GRAPH SYSTEM CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for cross-domain dependency modeling, reference
 * tracing, orphan asset detection, and circular dependency traps.
 * Architecture Ref: ROADMAP.md §Sub-Phase 8.3 & PANELS.md §Panel 26
 * ============================================================================
 */

export type DependencyNodeType =
  | "page"
  | "element"
  | "blueprint"
  | "schema"
  | "variable"
  | "redirect";

export type DependencyRelationType =
  | "contains"
  | "binds_to"
  | "queries"
  | "navigates_to"
  | "triggers";

export interface DependencyNode {
  id: string;
  name: string;
  type: DependencyNodeType;
  sizeBytes: number;
  referenceCount: number;
  dependencyCount: number;
  isOrphan: boolean;
  metadata?: {
    slug?: string;
    archetype?: string;
    fieldsCount?: number;
    variableType?: string;
    graphType?: string;
    targetUrl?: string;
  };
}

export interface DependencyEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: DependencyRelationType;
  description: string;
}

export interface CircularDependencyChain {
  cycleId: string;
  nodeIds: string[];
  description: string;
}

export interface DependencyGraphMetrics {
  totalNodes: number;
  totalEdges: number;
  orphanCount: number;
  cycleCount: number;
  totalSizeBytes: number;
}

export interface DependencyGraphData {
  nodes: Record<string, DependencyNode>;
  edges: DependencyEdge[];
  orphanNodes: DependencyNode[];
  circularChains: CircularDependencyChain[];
  metrics: DependencyGraphMetrics;
}

export interface DependencyFilterOptions {
  nodeType?: DependencyNodeType | "all";
  searchQuery?: string;
  onlyOrphans?: boolean;
}
