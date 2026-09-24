"use client";

/**
 * ============================================================================
 * GLOBAL SEARCH & FIND IN BLUEPRINTS CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for inverted index indexing, entity categories,
 * fuzzy search queries, search ranking scores, and deep jump navigation.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.2 & PANELS.md §Panel 25
 * ============================================================================
 */

export type SearchEntityType =
  | "page"
  | "element"
  | "blueprint_node"
  | "blueprint_variable"
  | "state_variable"
  | "database_collection"
  | "database_field"
  | "api_endpoint";

export type SearchCategory =
  | "all"
  | "pages"
  | "elements"
  | "blueprints"
  | "variables"
  | "database"
  | "api";

export interface NavigationPayload {
  targetPanel: "canvas" | "blueprint" | "pages-manager" | "database" | "details" | "code";
  pageId?: string;
  elementId?: string;
  graphId?: string;
  nodeId?: string;
  variableId?: string;
  collectionId?: string;
  fieldId?: string;
  propertyKey?: string;
}

export interface SearchResultItem {
  id: string;
  entityId: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string;
  matchedField: string;
  matchSnippet: string;
  matchScore: number;
  navigationPayload: NavigationPayload;
}

export interface SearchQueryOptions {
  query: string;
  category: SearchCategory;
  caseSensitive?: boolean;
  exactMatch?: boolean;
  maxResults?: number;
}

export interface SearchIndexEntry {
  entityId: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string;
  tokens: string[];
  rawText: string;
  metadata: Record<string, string>;
  navigationPayload: NavigationPayload;
}

export const CATEGORY_DEFINITIONS: { id: SearchCategory; label: string; description: string }[] = [
  { id: "all", label: "All Categories", description: "Search across all project entities" },
  { id: "blueprints", label: "Blueprints", description: "Nodes, functions, pins, and graph flows" },
  { id: "elements", label: "Elements", description: "Visual canvas components, hierarchy, and properties" },
  { id: "pages", label: "Pages & Routes", description: "App router pages, URL slugs, and layout templates" },
  { id: "database", label: "Database", description: "Collections, relational tables, and schema fields" },
  { id: "variables", label: "Variables", description: "State variables, blueprint variables, and constants" },
  { id: "api", label: "API Endpoints", description: "Server actions, REST routes, and handlers" },
];
