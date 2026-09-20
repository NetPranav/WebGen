"use client";

/**
 * ============================================================================
 * ADVANCED HISTORY & TRANSACTION SYSTEM CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for granular transaction tracking, action categories,
 * diff metadata, arbitrary state jumping, and action grouping.
 * Architecture Ref: ROADMAP.md §Sub-Phase 8.1 & PANELS.md §Panel 23
 * ============================================================================
 */

export type HistoryActionCategory =
  | "canvas"
  | "property"
  | "blueprint"
  | "database"
  | "page"
  | "style"
  | "variable"
  | "general";

export interface HistoryTransaction<T = unknown> {
  id: string;
  actionLabel: string;
  actionCategory: HistoryActionCategory;
  timestamp: number;
  snapshot: T;
  entityId?: string;
  entityName?: string;
  propertyKey?: string;
  diffSummary?: string;
  groupKey?: string;
  groupCount?: number;
}

export interface TransactionOptions<T = unknown> {
  actionLabel: string;
  actionCategory?: HistoryActionCategory;
  snapshot: T;
  entityId?: string;
  entityName?: string;
  propertyKey?: string;
  diffSummary?: string;
  groupKey?: string;
}

export interface HistoryTimeline<T = unknown> {
  past: HistoryTransaction<T>[];
  present: HistoryTransaction<T> | null;
  future: HistoryTransaction<T>[];
  totalCount: number;
}

export interface HistoryFilterOptions {
  category?: HistoryActionCategory | "all";
  searchQuery?: string;
}
