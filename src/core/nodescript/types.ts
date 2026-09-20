/**
 * ============================================================================
 * NODESCRIPT PARSER & LEXER TYPE DEFINITIONS
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 5.1
 *
 * Defines token taxonomy, source position tracking, syntax errors, and
 * configuration options for parsing .nls (NodeScript) files into Blueprint ASTs.
 * ============================================================================
 */

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export type TokenType =
  | "KEYWORD"
  | "IDENTIFIER"
  | "STRING"
  | "NUMBER"
  | "BOOLEAN"
  | "NULL"
  | "ARROW" // "->"
  | "COLON" // ":"
  | "ASSIGN" // "="
  | "DOLLAR" // "$"
  | "DOT" // "."
  | "SLASH" // "/"
  | "COMMA" // ","
  | "AT" // "@"
  | "LBRACE" // "{"
  | "RBRACE" // "}"
  | "LPAREN" // "("
  | "RPAREN" // ")"
  | "LBRACKET" // "["
  | "RBRACKET" // "]"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string | number | boolean | null;
  raw: string;
  loc: SourceLocation;
}

export interface NodeScriptReference {
  __ref: true;
  node: string;
  pin: string;
}

export interface ParserOptions {
  /** If true, assigns visual positions automatically using tiered DAG layout when @pos is missing */
  autoLayout?: boolean;
  /** Schema version metadata string */
  schemaVersion?: string;
  /** Custom graph ID (defaults to graph name or auto-generated) */
  graphId?: string;
}

export class NodeScriptSyntaxError extends Error {
  public readonly line: number;
  public readonly column: number;
  public readonly offset: number;

  constructor(message: string, loc: SourceLocation, source?: string) {
    const locStr = `Line ${loc.line}, Column ${loc.column}`;
    const snippet = source ? `\n\n${NodeScriptSyntaxError.extractSnippet(source, loc)}` : "";
    super(`[NodeScript Error] ${message} (${locStr})${snippet}`);
    this.name = "NodeScriptSyntaxError";
    this.line = loc.line;
    this.column = loc.column;
    this.offset = loc.offset;
  }

  public static extractSnippet(source: string, loc: SourceLocation): string {
    const lines = source.split(/\r?\n/);
    const lineIdx = loc.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) return "";

    const lineText = lines[lineIdx];
    const pointer = " ".repeat(Math.max(0, loc.column - 1)) + "^";
    return `  ${loc.line} | ${lineText}\n    | ${pointer}`;
  }
}
