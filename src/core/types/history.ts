"use client";

/**
 * ============================================================================
 * HISTORY CONTRACTS
 * ============================================================================
 * ROADMAP Phase 3.1. A history entry records one undoable change:
 *   - `document`: Immer patches plus inverse patches for the Motion Document.
 *   - `project`:  a snapshot of non-document project state (pages, blueprints,
 *                 databases …), swapped with the live state on undo/redo.
 *                 It carries the document only when the action also replaced
 *                 document data outside the document commands.
 * ============================================================================
 */

import type { Patch } from "immer";

export type HistoryActionCategory =
  | "canvas"
  | "property"
  | "blueprint"
  | "database"
  | "page"
  | "style"
  | "variable"
  | "general";

export type HistoryChange =
  | { kind: "document"; patches: Patch[]; inversePatches: Patch[] }
  | { kind: "project"; state: Record<string, unknown> };

export interface HistoryTransaction {
  id: string;
  actionLabel: string;
  actionCategory: HistoryActionCategory;
  timestamp: number;
  change: HistoryChange;
  entityId?: string;
  entityName?: string;
  propertyKey?: string;
  diffSummary?: string;
  /** Consecutive document entries with the same merge key (within the merge window) become one entry. */
  mergeKey?: string;
  groupCount?: number;
}

export interface HistoryTimeline {
  past: HistoryTransaction[];
  present: Pick<HistoryTransaction, "id" | "actionLabel" | "actionCategory" | "timestamp"> | null;
  future: HistoryTransaction[];
  totalCount: number;
}

export interface HistoryFilterOptions {
  category?: HistoryActionCategory | "all";
  searchQuery?: string;
}
