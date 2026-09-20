/**
 * ============================================================================
 * NODESCRIPT LANGUAGE SERVER PROTOCOL TYPES
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 5.3
 *
 * Defines language intelligence types: Positions, Ranges, Completions,
 * Hover documentation, and Diagnostics for .nls file editing.
 * ============================================================================
 */

export interface Position {
  /** 1-indexed line number */
  line: number;
  /** 1-indexed column number */
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export type CompletionItemKind =
  | "keyword"
  | "nodeType"
  | "pin"
  | "nodeAlias"
  | "type"
  | "variable";

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface LanguageDiagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  range: Range;
  suggestion?: string;
}

export interface HoverInfo {
  contents: string;
  range?: Range;
}
