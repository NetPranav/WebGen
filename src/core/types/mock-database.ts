"use client";

/**
 * ============================================================================
 * MOCK DATABASE & API SERVER TYPE DEFINITIONS
 * ============================================================================
 * Defines pure TypeScript contracts for the Play Mode in-memory database,
 * filter queries, mutation events, network latency simulation, and API routes.
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.2 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

export type FilterOperator =
  | "$eq"
  | "$ne"
  | "$gt"
  | "$gte"
  | "$lt"
  | "$lte"
  | "$in"
  | "$nin"
  | "$contains"
  | "$startsWith"
  | "$endsWith";

export type FilterCondition =
  | unknown
  | { [K in FilterOperator]?: unknown };

export type MockQueryFilter = Record<string, FilterCondition>;

export interface MockQuerySort {
  field: string;
  direction?: "asc" | "desc";
}

export interface MockQueryOptions {
  sort?: MockQuerySort | string;
  direction?: "asc" | "desc";
  limit?: number;
  offset?: number;
  select?: string[];
}

export type MockDatabaseRecord = Record<string, unknown>;

export type MockMutationType = "insert" | "update" | "delete" | "truncate" | "seed" | "reset";

export interface MockDatabaseEvent {
  type: MockMutationType;
  collection: string;
  id?: string | number;
  record?: MockDatabaseRecord;
  previousRecord?: MockDatabaseRecord;
  timestamp: number;
}

export type MockDatabaseListener = (event: MockDatabaseEvent) => void;

export interface MockApiResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data?: T;
  error?: string;
  durationMs?: number;
  url?: string;
  method?: string;
}

export interface MockApiRequest {
  method: string;
  path: string;
  url: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
}

export type MockRouteHandler = (
  req: MockApiRequest
) => Promise<MockApiResponse> | MockApiResponse;

export interface MockRouteDefinition {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ALL";
  pathPattern: string; // e.g. "/api/:collection" or "/api/:collection/:id"
  handler: MockRouteHandler;
}
