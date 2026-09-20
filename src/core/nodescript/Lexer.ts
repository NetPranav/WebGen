/**
 * ============================================================================
 * NODESCRIPT LEXICAL ANALYZER & TOKENIZER
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 5.1
 *
 * Scans .nls source text into a strongly typed token stream with
 * character-accurate 1-indexed line and column tracking for diagnostic errors.
 * ============================================================================
 */

import { NodeScriptSyntaxError, SourceLocation, Token, TokenType } from "./types";

const KEYWORDS = new Set([
  "graph",
  "node",
  "wire",
  "variable",
  "var",
  "when",
  "type",
  "true",
  "false",
  "null",
]);

export class Lexer {
  private source: string;
  private length: number;
  private cursor: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string) {
    this.source = source;
    this.length = source.length;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.cursor < this.length) {
      this.skipWhitespaceAndComments();

      if (this.cursor >= this.length) break;

      const loc = this.getCurrentLocation();
      const ch = this.peek();

      // 1. Operators & Punctuation
      if (ch === "-" && this.peekAhead(1) === ">") {
        this.advance(2);
        tokens.push({ type: "ARROW", value: "->", raw: "->", loc });
        continue;
      }

      if (ch === ":") {
        this.advance();
        tokens.push({ type: "COLON", value: ":", raw: ":", loc });
        continue;
      }

      if (ch === "=") {
        this.advance();
        tokens.push({ type: "ASSIGN", value: "=", raw: "=", loc });
        continue;
      }

      if (ch === "$") {
        this.advance();
        tokens.push({ type: "DOLLAR", value: "$", raw: "$", loc });
        continue;
      }

      if (ch === ".") {
        this.advance();
        tokens.push({ type: "DOT", value: ".", raw: ".", loc });
        continue;
      }

      if (ch === "/") {
        this.advance();
        tokens.push({ type: "SLASH", value: "/", raw: "/", loc });
        continue;
      }

      if (ch === ",") {
        this.advance();
        tokens.push({ type: "COMMA", value: ",", raw: ",", loc });
        continue;
      }

      if (ch === "@") {
        this.advance();
        tokens.push({ type: "AT", value: "@", raw: "@", loc });
        continue;
      }

      if (ch === "{") {
        this.advance();
        tokens.push({ type: "LBRACE", value: "{", raw: "{", loc });
        continue;
      }

      if (ch === "}") {
        this.advance();
        tokens.push({ type: "RBRACE", value: "}", raw: "}", loc });
        continue;
      }

      if (ch === "(") {
        this.advance();
        tokens.push({ type: "LPAREN", value: "(", raw: "(", loc });
        continue;
      }

      if (ch === ")") {
        this.advance();
        tokens.push({ type: "RPAREN", value: ")", raw: ")", loc });
        continue;
      }

      if (ch === "[") {
        this.advance();
        tokens.push({ type: "LBRACKET", value: "[", raw: "[", loc });
        continue;
      }

      if (ch === "]") {
        this.advance();
        tokens.push({ type: "RBRACKET", value: "]", raw: "]", loc });
        continue;
      }

      // 2. String Literals
      if (ch === '"' || ch === "'") {
        tokens.push(this.readString(ch, loc));
        continue;
      }

      // 3. Numeric Literals
      if (
        this.isDigit(ch) ||
        (ch === "-" && this.isDigit(this.peekAhead(1)))
      ) {
        tokens.push(this.readNumber(loc));
        continue;
      }

      // 4. Identifiers & Keywords
      if (this.isIdentStart(ch)) {
        tokens.push(this.readIdentifierOrKeyword(loc));
        continue;
      }

      throw new NodeScriptSyntaxError(
        `Unexpected character '${ch}'`,
        loc,
        this.source
      );
    }

    tokens.push({
      type: "EOF",
      value: "",
      raw: "",
      loc: this.getCurrentLocation(),
    });

    return tokens;
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods
  // --------------------------------------------------------------------------

  private getCurrentLocation(): SourceLocation {
    return {
      line: this.line,
      column: this.column,
      offset: this.cursor,
    };
  }

  private peek(): string {
    return this.source[this.cursor] || "";
  }

  private peekAhead(n: number): string {
    return this.source[this.cursor + n] || "";
  }

  private advance(count: number = 1): string {
    let result = "";
    for (let i = 0; i < count; i++) {
      if (this.cursor >= this.length) break;
      const ch = this.source[this.cursor++];
      result += ch;
      if (ch === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
    return result;
  }

  private skipWhitespaceAndComments(): void {
    while (this.cursor < this.length) {
      const ch = this.peek();

      // Whitespace
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        this.advance();
        continue;
      }

      // Single-line comment "//" or "#" (skip header directive like #nls-version:)
      if (
        (ch === "/" && this.peekAhead(1) === "/") ||
        (ch === "#" && !this.source.startsWith("#nls-version:", this.cursor))
      ) {
        while (this.cursor < this.length && this.peek() !== "\n") {
          this.advance();
        }
        continue;
      }

      // Header directive "#nls-version:"
      if (this.source.startsWith("#nls-version:", this.cursor)) {
        while (this.cursor < this.length && this.peek() !== "\n") {
          this.advance();
        }
        continue;
      }

      // Multi-line comment "/* ... */"
      if (ch === "/" && this.peekAhead(1) === "*") {
        const startLoc = this.getCurrentLocation();
        this.advance(2);
        let closed = false;
        while (this.cursor < this.length) {
          if (this.peek() === "*" && this.peekAhead(1) === "/") {
            this.advance(2);
            closed = true;
            break;
          }
          this.advance();
        }
        if (!closed) {
          throw new NodeScriptSyntaxError(
            "Unterminated multi-line comment",
            startLoc,
            this.source
          );
        }
        continue;
      }

      break;
    }
  }

  private readString(quote: string, loc: SourceLocation): Token {
    this.advance(); // skip opening quote
    let value = "";
    let raw = quote;

    while (this.cursor < this.length) {
      const ch = this.peek();

      if (ch === quote) {
        this.advance(); // skip closing quote
        raw += quote;
        return { type: "STRING", value, raw, loc };
      }

      if (ch === "\\") {
        this.advance();
        raw += "\\";
        const next = this.peek();
        raw += next;
        this.advance();

        if (next === "n") value += "\n";
        else if (next === "t") value += "\t";
        else if (next === '"') value += '"';
        else if (next === "'") value += "'";
        else if (next === "\\") value += "\\";
        else value += next;
        continue;
      }

      if (ch === "\n") {
        throw new NodeScriptSyntaxError(
          "Unterminated string literal",
          loc,
          this.source
        );
      }

      value += ch;
      raw += ch;
      this.advance();
    }

    throw new NodeScriptSyntaxError(
      "Unterminated string literal at end of file",
      loc,
      this.source
    );
  }

  private readNumber(loc: SourceLocation): Token {
    let raw = "";

    if (this.peek() === "-") {
      raw += this.advance();
    }

    while (this.cursor < this.length && this.isDigit(this.peek())) {
      raw += this.advance();
    }

    if (this.peek() === "." && this.isDigit(this.peekAhead(1))) {
      raw += this.advance(); // '.'
      while (this.cursor < this.length && this.isDigit(this.peek())) {
        raw += this.advance();
      }
    }

    const value = parseFloat(raw);
    return { type: "NUMBER", value, raw, loc };
  }

  private readIdentifierOrKeyword(loc: SourceLocation): Token {
    let raw = "";

    while (this.cursor < this.length && this.isIdentPart(this.peek())) {
      raw += this.advance();
    }

    if (raw === "true") {
      return { type: "BOOLEAN", value: true, raw, loc };
    }
    if (raw === "false") {
      return { type: "BOOLEAN", value: false, raw, loc };
    }
    if (raw === "null") {
      return { type: "NULL", value: null, raw, loc };
    }

    if (KEYWORDS.has(raw)) {
      return { type: "KEYWORD", value: raw, raw, loc };
    }

    return { type: "IDENTIFIER", value: raw, raw, loc };
  }

  private isDigit(ch: string): boolean {
    return ch >= "0" && ch <= "9";
  }

  private isIdentStart(ch: string): boolean {
    return (
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      ch === "_"
    );
  }

  private isIdentPart(ch: string): boolean {
    return (
      this.isIdentStart(ch) ||
      this.isDigit(ch)
    );
  }
}
