"use client";

/**
 * ============================================================================
 * DATA BINDING CONTRACTS & CONNECTION INTERFACES
 * ============================================================================
 * Defines pure contracts for binding UI element properties to diverse data sources
 * (Database collections, state atoms, URL parameters, and local storage).
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.2 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import { ElementType } from "./element-sections";

export type BindingSourceType =
  | "database"
  | "state_variable"
  | "url_param"
  | "local_storage"
  | "formula"
  | "websocket";

export type RefreshStrategy = "once" | "interval" | "onChange" | "realtime";

export type TransformFunctionType =
  | "none"
  | "currency_usd"
  | "date_iso"
  | "date_localized"
  | "uppercase"
  | "lowercase"
  | "stringify"
  | "boolean_not"
  | "number_round";

export interface BindingTarget {
  elementId: string;
  elementName?: string;
  archetype: ElementType;
  propertyKey: string;
}

export interface DataBindingDescriptor {
  id: string;
  target: BindingTarget;
  sourceType: BindingSourceType;
  // Database source options
  sourceCollection?: string;
  sourceField?: string;
  recordId?: string; // specific record ID or "first" / "active"
  // State source options
  stateVariableId?: string;
  // URL source options
  paramKey?: string;
  // Local storage options
  storageKey?: string;
  // Custom formula expression
  formulaExpression?: string;
  // Value transform & syncing options
  transformFn?: TransformFunctionType;
  twoWay?: boolean;
  debounceMs?: number;
  fallbackValue?: unknown;
}

export interface DataContext {
  database: Record<string, Record<string, unknown>[]>;
  stateVariables: Record<string, unknown>;
  urlParams: Record<string, string>;
  localStorage: Record<string, string>;
}

export interface ResolvedBindingValue {
  isValid: boolean;
  value: unknown;
  rawSourceValue?: unknown;
  error?: string;
  fallbackApplied?: boolean;
}
