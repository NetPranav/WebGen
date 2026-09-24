"use client";

/**
 * ============================================================================
 * GLOBAL SEARCH & FIND IN BLUEPRINTS RUNTIME ENGINE
 * ============================================================================
 * Inverted search index across all project entities: pages, visual canvas
 * elements, blueprint DAG nodes, variables, and database schemas.
 * Provides ranked fuzzy matching, category filtering, and deep jump navigation.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.2 & PANELS.md §Panel 25
 * ============================================================================
 */

import {
  SearchEntityType,
  SearchCategory,
  SearchResultItem,
  SearchQueryOptions,
  SearchIndexEntry,
} from "../core/types/search";
import { useProjectStore } from "../core/store/useProjectStore";
import { useSelectionStore } from "../core/store/useSelectionStore";
import { DiagnosticBus } from "../core/engine/DiagnosticBus";
import { getNodeDefinition } from "../core/types/node-registry";
import { errorMessage } from "@/core/errors";
import type { BlueprintVariable } from "@/core/ast/ASTManager";

export class GlobalSearchEngineManager {
  private entries: SearchIndexEntry[] = [];
  private tokenIndex: Map<string, Set<number>> = new Map();
  private recentSearches: string[] = [];
  private recentSearchListeners = new Set<() => void>();
  private lastIndexedTimestamp: number = 0;

  constructor() {
    this.loadRecentSearches();
    // Index will be built on first query or explicitly
  }

  /**
   * Loads recent search queries from localStorage if available.
   */
  private loadRecentSearches(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem("antigravity_recent_searches");
        if (stored) {
          this.recentSearches = JSON.parse(stored);
        }
      } catch {
        this.recentSearches = [];
      }
    }
  }

  /**
   * Saves recent searches to localStorage.
   */
  private saveRecentSearches(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(
          "antigravity_recent_searches",
          JSON.stringify(this.recentSearches.slice(0, 10))
        );
      } catch {
        // ignore
      }
    }
  }

  public getRecentSearches(): string[] {
    return [...this.recentSearches];
  }

  /** Stable snapshot for `useSyncExternalStore`; replaced (never mutated) on change. */
  public getRecentSearchesSnapshot = (): readonly string[] => this.recentSearches;

  public subscribeRecentSearches = (listener: () => void): (() => void) => {
    this.recentSearchListeners.add(listener);
    return () => this.recentSearchListeners.delete(listener);
  };

  private notifyRecentSearches(): void {
    this.recentSearchListeners.forEach((listener) => listener());
  }

  public addRecentSearch(query: string): void {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    this.recentSearches = [trimmed, ...this.recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
    this.saveRecentSearches();
    this.notifyRecentSearches();
  }

  public clearRecentSearches(): void {
    this.recentSearches = [];
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem("antigravity_recent_searches");
    }
    this.notifyRecentSearches();
  }

  /**
   * Tokenizes text into searchable tokens (splitting camelCase, snake_case, kebab-case, punctuation).
   */
  public tokenize(text: string): string[] {
    if (!text) return [];
    // Insert space before capital letters in camelCase
    const withSpaces = text.replace(/([a-z])([A-Z])/g, "$1 $2");
    // Split on non-alphanumeric characters
    const parts = withSpaces.toLowerCase().split(/[^a-z0-9]+/);
    return parts.filter((p) => p.length > 0);
  }

  /**
   * Builds the inverted search index from the current project store state.
   */
  public rebuildIndex(): void {
    const storeState = useProjectStore.getState();
    const newEntries: SearchIndexEntry[] = [];
    const newTokenIndex: Map<string, Set<number>> = new Map();

    const addEntry = (
      entityId: string,
      entityType: SearchEntityType,
      title: string,
      subtitle: string,
      rawStrings: string[],
      metadata: Record<string, string>,
      navigationPayload: SearchIndexEntry["navigationPayload"]
    ) => {
      const allText = [title, subtitle, ...rawStrings].join(" ");
      const tokens = Array.from(new Set(this.tokenize(allText)));
      const entryIdx = newEntries.length;

      newEntries.push({
        entityId,
        entityType,
        title,
        subtitle,
        tokens,
        rawText: allText,
        metadata,
        navigationPayload,
      });

      for (const token of tokens) {
        let set = newTokenIndex.get(token);
        if (!set) {
          set = new Set();
          newTokenIndex.set(token, set);
        }
        set.add(entryIdx);
      }
    };

    try {
      // 1. Index Pages
      const pages = Object.values(storeState.pages || {});
      for (const page of pages) {
        addEntry(
          page.id,
          "page",
          page.name,
          `Route: ${page.slug}`,
          [page.slug, page.metaTitle || "", page.metaDescription || ""],
          { slug: page.slug, id: page.id },
          { targetPanel: "pages-manager", pageId: page.id }
        );
      }

      // 2. Index Elements
      const elements = Object.values(storeState.document.layers);
      for (const elem of elements) {
        const propValues: string[] = [];
        if (elem.properties) {
          for (const [key, val] of Object.entries(elem.properties)) {
            if (typeof val === "string" || typeof val === "number") {
              propValues.push(`${key}: ${val}`);
            }
          }
        }
        addEntry(
          elem.id,
          "element",
          elem.name || `Unnamed ${elem.archetype}`,
          `Archetype: ${elem.archetype}`,
          [elem.archetype, ...propValues],
          { archetype: elem.archetype, id: elem.id },
          { targetPanel: "canvas", elementId: elem.id }
        );
      }

      // 3. Index Blueprint Graphs & Nodes
      const graphs = Object.values(storeState.blueprintGraphs || {});
      for (const graph of graphs) {
        const nodes = Object.values(graph.nodes || {});
        for (const node of nodes) {
          const nodeDef = getNodeDefinition(node.type);
          const category = nodeDef?.category || "General";
          const description = nodeDef?.description || "";
          const pinNames = (nodeDef?.inputs || []).concat(nodeDef?.outputs || []).map((p) => p.name);
          addEntry(
            node.id,
            "blueprint_node",
            node.title,
            `Graph: ${graph.name} (${category})`,
            [category, description, ...pinNames],
            { graphId: graph.id, graphName: graph.name, category },
            { targetPanel: "blueprint", graphId: graph.id, nodeId: node.id }
          );
        }

        // Blueprint Graph Variables
        const rawVars: BlueprintVariable[] = Array.isArray(graph.variables)
          ? graph.variables
          : Object.values(graph.variables || {});
        for (const v of rawVars) {
          addEntry(
            v.id,
            "blueprint_variable",
            v.name,
            `Blueprint Var (${v.type}) in ${graph.name}`,
            [v.type, String(v.defaultValue ?? "")],
            { graphId: graph.id, type: v.type },
            { targetPanel: "blueprint", graphId: graph.id, variableId: v.id }
          );
        }
      }

      // 4. Index State Variables
      const stateVars = Object.values(storeState.stateVariables || {});
      for (const sv of stateVars) {
        addEntry(
          sv.id,
          "state_variable",
          sv.name,
          `Global State (${sv.type})`,
          [sv.type, String(sv.defaultValue ?? sv.value ?? "")],
          { type: sv.type },
          { targetPanel: "details", variableId: sv.id }
        );
      }

      // 5. Index Database Schemas & Fields
      const schemas = Object.values(storeState.databaseSchemas || {});
      for (const schema of schemas) {
        addEntry(
          schema.id,
          "database_collection",
          schema.displayName || schema.name,
          `Database Collection: ${schema.name}`,
          [schema.name, schema.description || ""],
          { name: schema.name },
          { targetPanel: "database", collectionId: schema.id }
        );

        const fields = Object.values(schema.fields || {});
        for (const f of fields) {
          addEntry(
            `${schema.id}_${f.id}`,
            "database_field",
            f.name,
            `Field in ${schema.name} (${f.type})`,
            [f.type, f.description || "", f.isPrimaryKey ? "Primary Key" : ""],
            { collectionId: schema.id, collectionName: schema.name, type: f.type },
            { targetPanel: "database", collectionId: schema.id, fieldId: f.id }
          );
        }
      }

      // 6. Index Redirect Rules as API endpoints / routes
      const redirects = Object.values(storeState.redirectRules || {});
      for (const r of redirects) {
        addEntry(
          r.id,
          "api_endpoint",
          `${r.sourcePattern} -> ${r.targetPattern}`,
          `Redirect Rule (HTTP ${r.statusCode})`,
          [r.sourcePattern, r.targetPattern, String(r.statusCode)],
          { statusCode: String(r.statusCode) },
          { targetPanel: "pages-manager" }
        );
      }

      this.entries = newEntries;
      this.tokenIndex = newTokenIndex;
      this.lastIndexedTimestamp = Date.now();
    } catch (err) {
      DiagnosticBus.emit({
        channel: "SEARCH_INDEX_DESYNC",
        severity: "warning",
        source: { panel: "Panel 25: Global Search", entityId: "search_index" },
        message: `Inverted search index desync: ${errorMessage(err)}`,
      });
    }
  }

  /**
   * Executes a search query across the inverted index.
   */
  public search(options: SearchQueryOptions): SearchResultItem[] {
    const rawQuery = options.query?.trim() || "";
    if (!rawQuery) return [];

    // Rebuild index if empty
    if (this.entries.length === 0) {
      this.rebuildIndex();
    }

    const caseSensitive = !!options.caseSensitive;
    const exactMatch = !!options.exactMatch;
    const category = options.category || "all";
    const maxResults = options.maxResults || 50;

    const normalizedQuery = caseSensitive ? rawQuery : rawQuery.toLowerCase();
    const queryTokens = this.tokenize(normalizedQuery);

    const scoredResults: SearchResultItem[] = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Category filter check
      if (!this.matchesCategory(entry.entityType, category)) {
        continue;
      }

      const titleForSearch = caseSensitive ? entry.title : entry.title.toLowerCase();
      const rawTextForSearch = caseSensitive ? entry.rawText : entry.rawText.toLowerCase();

      let score = 0;
      let matchedField = "title";
      let matchSnippet = entry.subtitle;

      // Exact phrase match
      if (exactMatch) {
        const regex = new RegExp(`\\b${escapeRegExp(normalizedQuery)}\\b`, caseSensitive ? "" : "i");
        if (regex.test(titleForSearch)) {
          score = 100;
          matchedField = "title";
          matchSnippet = entry.title;
        } else if (regex.test(rawTextForSearch)) {
          score = 50;
          matchedField = "content";
          matchSnippet = this.extractSnippet(rawTextForSearch, normalizedQuery);
        } else {
          continue;
        }
      } else {
        // Fuzzy / Substring match scoring
        if (titleForSearch === normalizedQuery) {
          score = 100;
          matchedField = "exact title";
          matchSnippet = entry.title;
        } else if (titleForSearch.startsWith(normalizedQuery)) {
          score = 85;
          matchedField = "title prefix";
          matchSnippet = entry.title;
        } else if (titleForSearch.includes(normalizedQuery)) {
          score = 70;
          matchedField = "title substring";
          matchSnippet = entry.title;
        } else if (rawTextForSearch.includes(normalizedQuery)) {
          score = 45;
          matchedField = "content substring";
          matchSnippet = this.extractSnippet(rawTextForSearch, normalizedQuery);
        } else if (!caseSensitive) {
          // Token overlap check
          let tokenMatches = 0;
          for (const qTok of queryTokens) {
            if (entry.tokens.some((eTok) => eTok.includes(qTok))) {
              tokenMatches++;
            }
          }
          if (tokenMatches > 0) {
            score = 20 + (tokenMatches / Math.max(queryTokens.length, 1)) * 20;
            matchedField = "token match";
            matchSnippet = entry.subtitle;
          }
        }
      }

      if (score > 0) {
        scoredResults.push({
          id: `sr_${entry.entityId}_${i}`,
          entityId: entry.entityId,
          entityType: entry.entityType,
          title: entry.title,
          subtitle: entry.subtitle,
          matchedField,
          matchSnippet,
          matchScore: Math.round(score),
          navigationPayload: entry.navigationPayload,
        });
      }
    }

    // Sort by match score descending, then by title length
    scoredResults.sort((a, b) => b.matchScore - a.matchScore || a.title.length - b.title.length);

    return scoredResults.slice(0, maxResults);
  }

  /**
   * Checks if an entity type matches the category filter.
   */
  private matchesCategory(entityType: SearchEntityType, category: SearchCategory): boolean {
    if (category === "all") return true;
    switch (category) {
      case "pages":
        return entityType === "page";
      case "elements":
        return entityType === "element";
      case "blueprints":
        return entityType === "blueprint_node";
      case "variables":
        return entityType === "blueprint_variable" || entityType === "state_variable";
      case "database":
        return entityType === "database_collection" || entityType === "database_field";
      case "api":
        return entityType === "api_endpoint";
      default:
        return true;
    }
  }

  /**
   * Extracts a short contextual snippet around a matched keyword.
   */
  private extractSnippet(text: string, query: string): string {
    const idx = text.indexOf(query);
    if (idx === -1) return text.substring(0, 60);
    const start = Math.max(0, idx - 20);
    const end = Math.min(text.length, idx + query.length + 30);
    return `${start > 0 ? "..." : ""}${text.substring(start, end)}${end < text.length ? "..." : ""}`;
  }

  /**
   * Navigates to the entity corresponding to a search result.
   */
  public navigateTo(
    item: SearchResultItem,
    openPanelCallback?: (panelId: string, panelTitle?: string) => void
  ): void {
    const { targetPanel, pageId, elementId, graphId, nodeId, variableId, collectionId } =
      item.navigationPayload;

    const storeState = useProjectStore.getState();

    // 1. Page switch if needed
    if (pageId && storeState.pages[pageId]) {
      storeState.setActivePage(pageId);
    }

    // 2. Element selection if needed
    if (elementId) {
      useSelectionStore.getState().select(elementId, "element");
    }

    // 3. Blueprint switch & node focus
    if (graphId && storeState.blueprintGraphs[graphId]) {
      storeState.setActiveBlueprintGraph(graphId);
    }

    // 4. Panel docking transition
    if (openPanelCallback) {
      switch (targetPanel) {
        case "blueprint":
          openPanelCallback("blueprint", "Logic Blueprint");
          break;
        case "pages-manager":
          openPanelCallback("pages-manager", "Pages & Routing Manager");
          break;
        case "database":
          openPanelCallback("er-modeler", "Database Schema (ER Modeler)");
          break;
        case "canvas":
          openPanelCallback("viewport", "Canvas Viewport");
          break;
        default:
          openPanelCallback(targetPanel, targetPanel);
          break;
      }
    }
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GlobalSearchEngine = new GlobalSearchEngineManager();
