"use client";

/**
 * ============================================================================
 * DIAGNOSTIC SYSTEM & EVENT CONTRACTS
 * ============================================================================
 * Defines typed error channels, severity levels, and structured event payloads
 * emitted by the Engine Compatibility Evaluator to Panel 07 (Output Log).
 * Architecture Ref: SCHEMA_REFERENCE.md §13.3 & ROADMAP.md §Sub-Phase 2.1
 * ============================================================================
 */

export type DiagnosticChannel =
  | "DB_SCHEMA_ERR"    // Relational schema inconsistencies, missing PK, circular cascade
  | "BIND_ERR"         // Property-to-database / state binding type mismatch
  | "ANIM_COMPAT"      // Unsupported animation track for element archetype
  | "PROP_ERR"         // Invalid CSS property value, out-of-range metric, or syntax error
  | "BLUEPRINT_ERR"    // Node pin type mismatch or execution flow cycles
  | "STATE_VAR_WARN"   // State variable type mismatch or invalid initial value warning
  | "STATE_VAR_ERR";   // State variable mutation or reference error

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface DiagnosticSource {
  panel?: string;
  entityId: string;
  entityName?: string;
  archetype?: string;
  propertyKey?: string;
}

export interface DiagnosticEvent {
  id: string;
  timestamp: number;
  channel: DiagnosticChannel;
  severity: DiagnosticSeverity;
  source: DiagnosticSource;
  message: string;
  suggestion?: string;
  targetInspectorSection?: string;
  isFixable?: boolean;
  fallbackApplied?: unknown;
}

export type DiagnosticEventListener = (event: DiagnosticEvent) => void;
