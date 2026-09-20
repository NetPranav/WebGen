"use client";

/**
 * ============================================================================
 * VERSION CONTROL & SNAPSHOT SYSTEM CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for project checkpointing, semantic AST diffing,
 * branch management, and merge conflict detection.
 * Architecture Ref: ROADMAP.md §Sub-Phase 8.2 & PANELS.md §Panel 24
 * ============================================================================
 */

import { ProjectStateSnapshot } from "../store/useProjectStore";

export type EntityDiffStatus = "added" | "removed" | "modified" | "unchanged";

export interface PropertyDiff {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  status: "added" | "removed" | "modified";
}

export interface ElementDiff {
  id: string;
  name: string;
  archetype: string;
  status: EntityDiffStatus;
  propertyDiffs: PropertyDiff[];
}

export interface PageDiff {
  id: string;
  name: string;
  slug: string;
  status: EntityDiffStatus;
  slugChanged?: boolean;
  oldSlug?: string;
  newSlug?: string;
}

export interface SchemaFieldDiff {
  fieldId: string;
  fieldName: string;
  status: EntityDiffStatus;
  oldType?: string;
  newType?: string;
}

export interface SchemaDiff {
  id: string;
  name: string;
  status: EntityDiffStatus;
  fieldDiffs: SchemaFieldDiff[];
}

export interface BlueprintGraphDiff {
  id: string;
  title: string;
  status: EntityDiffStatus;
  nodesAdded: number;
  nodesRemoved: number;
}

export interface SnapshotDiffReport {
  baseSnapshotId: string;
  targetSnapshotId: string;
  baseName: string;
  targetName: string;
  elements: ElementDiff[];
  pages: PageDiff[];
  schemas: SchemaDiff[];
  blueprintGraphs: BlueprintGraphDiff[];
  totalAdded: number;
  totalRemoved: number;
  totalModified: number;
  isIdentical: boolean;
  summary: string;
}

export interface ProjectSnapshotRecord {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  author: string;
  branchName: string;
  snapshot: ProjectStateSnapshot;
  sizeBytes: number;
  tags: string[];
  isAutoSnapshot: boolean;
}

export interface CreateSnapshotParams {
  name: string;
  description?: string;
  author?: string;
  branchName?: string;
  tags?: string[];
  isAutoSnapshot?: boolean;
  snapshot: ProjectStateSnapshot;
}

export interface BranchRecord {
  id: string;
  name: string;
  headSnapshotId: string | null;
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
  description?: string;
}

export interface MergeConflict {
  conflictId: string;
  entityType: "element" | "page" | "schema" | "property";
  entityId: string;
  entityName: string;
  path: string;
  baseValue: unknown;
  currentValue: unknown;
  incomingValue: unknown;
  conflictDescription: string;
  resolvedValue?: unknown;
}

export interface BranchMergeResult {
  success: boolean;
  conflicts: MergeConflict[];
  mergedSnapshot?: ProjectStateSnapshot;
  summary: string;
}
