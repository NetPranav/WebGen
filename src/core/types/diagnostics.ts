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
  | "STA_CONFLICT"     // Single Transform Authority / rule-table conflict (grammar §6.1, §6.8) (Phase 8)
  | "PERF_LAYOUT"      // A continuous binding targets a layout-triggering property (grammar §6.8 v0.2) (Phase 8)
  | "A11Y_FLASH"       // Sustained flashing exceeds the ≤3 flashes/second accessibility limit (Phase 8)
  | "PROP_ERR"         // Invalid CSS property value, out-of-range metric, or syntax error
  | "BLUEPRINT_ERR"    // Node pin type mismatch or execution flow cycles
  | "STATE_VAR_WARN"   // State variable type mismatch or invalid initial value warning
  | "STATE_VAR_ERR"    // State variable mutation or reference error
  | "SANDBOX_ERR"      // Runtime exception inside iframe sandbox host
  | "SANDBOX_WARN"     // Runtime warning or unhandled rejection in sandbox
  | "SANDBOX_INFO"     // Sandbox lifecycle, mount, or reconciliation event
  | "MOCK_DB_ERR"      // Mock database schema violation, constraint failure, or query error
  | "MOCK_API_ERR"     // Mock API 4xx/5xx error or failed route handler
  | "MOCK_API_INFO"    // Mock API request intercepted and responded to successfully
  | "TRACE_OVERFLOW_WARN" // Execution trace ring buffer overflow warning
  | "TRACE_EXEC_ERR"    // Node execution runtime failure in execution tracer
  | "AI_SCHEMA_VALIDATION_ERR" // AI generated invalid schema or illegal pin connection
  | "AI_DIFF_REJECTED"         // User rejected AI-proposed AST diff
  | "AI_COPILOT_INFO"          // AI suggestion generated or applied successfully
  | "BREAKPOINT_HIT"           // Execution paused at a breakpoint node
  | "HOT_RELOAD_INFO"          // Hot-swap successfully patched the sandbox
  | "PERF_WARN"                // Node execution duration exceeded performance threshold (bottleneck)
  | "WATCH_MUTATION"           // Watched variable or expression value changed during execution
  | "CODEGEN_INTEGRITY_ERR"    // Code emitter integrity violation or AST compilation mismatch
  | "ROUTE_COLLISION"          // Multiple pages conflicting on the same URL route pattern
  | "MISSING_LAYOUT_ERR"       // Page references non-existent layout ID
  | "BUILD_COMPILE_ERR"        // Pre-flight compilation error or bundle failure
  | "DEPLOY_CONFIG_ERR"        // Cloud provider configuration or credential mismatch
  | "SEARCH_INDEX_DESYNC"      // Inverted search index desync with project AST
  | "PLUGIN_SECURITY_VIOLATION"// Plugin attempted ungranted capability (network, storage)
  | "HOOK_EXEC_TIMEOUT"        // Plugin hook execution exceeded budget
  | "UNDO_STACK_CORRUPT"       // Snapshot integrity violation or corrupted history transaction
  | "SNAPSHOT_DIFF_ERR"        // Version snapshot delta calculation error
  | "BRANCH_MERGE_CONFLICT"    // Diverging branch merge conflict detected
  | "ORPHAN_ASSET_WARN"        // Unused component, dead variable, or unreferenced schema
  | "CIRCULAR_REF_ERR"         // Circular reference loop detected in project dependencies
  | "COLLAB_SYNC_ERR"          // Multiplayer delta sync desynchronization or corrupted CRDT packet
  | "PEER_DISCONNECTED"        // Peer heartbeat timed out or abnormal disconnect
  | "COMMENT_ORPHAN_WARN";     // Comment thread anchored to missing or deleted AST element/node

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
