/**
 * ============================================================================
 * NODESCRIPT PARSER & AST GENERATOR
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 5.1
 *
 * Parses .nls token stream directly into the standard in-memory BlueprintGraph
 * AST consumed by ASTManager (zero shadow AST, 100% structural parity).
 * ============================================================================
 */

import { Lexer } from "./Lexer";
import {
  NodeScriptReference,
  NodeScriptSyntaxError,
  ParserOptions,
  Token,
  TokenType,
} from "./types";
import {
  BlueprintGraph,
  BlueprintNodeInstance,
  BlueprintVariable,
  BlueprintWire,
} from "@/core/ast/ASTManager";
import { getNodeDefinition, PinDataType } from "@/core/types/node-registry";

export class NodeScriptParser {
  private tokens: Token[];
  private cursor: number = 0;
  private source: string;
  private options: ParserOptions;

  constructor(source: string, options: ParserOptions = {}) {
    this.source = source;
    this.options = {
      autoLayout: options.autoLayout ?? true,
      schemaVersion: options.schemaVersion ?? "1.0.0",
      graphId: options.graphId,
    };
    const lexer = new Lexer(source);
    this.tokens = lexer.tokenize();
  }

  public static parse(source: string, options?: ParserOptions): BlueprintGraph {
    const parser = new NodeScriptParser(source, options);
    return parser.parseGraph();
  }

  public parseGraph(): BlueprintGraph {
    this.expect("KEYWORD", "graph");

    const nameToken = this.expect("IDENTIFIER");
    const graphName = String(nameToken.value);

    let graphType: "event" | "function" | "macro" = "event";
    if (this.match("LPAREN")) {
      this.expect("KEYWORD", "type");
      this.expect("COLON");
      const typeToken = this.expect("IDENTIFIER");
      const typeVal = String(typeToken.value);
      if (typeVal === "function" || typeVal === "macro" || typeVal === "event") {
        graphType = typeVal;
      } else {
        throw new NodeScriptSyntaxError(
          `Invalid graph type '${typeVal}', expected 'event', 'function', or 'macro'`,
          typeToken.loc,
          this.source
        );
      }
      this.expect("RPAREN");
    }

    this.expect("LBRACE");

    const graphId = this.options.graphId || `graph_${graphName}`;
    const graph: BlueprintGraph = {
      id: graphId,
      name: graphName,
      type: graphType,
      nodes: {},
      wires: [],
      variables: [],
      metadata: {
        schemaVersion: this.options.schemaVersion || "1.0.0",
        updatedAt: new Date().toISOString(),
      },
    };

    // Alias map to resolve alias -> node instance ID
    const aliasToIdMap = new Map<string, string>();
    const nodeOrder: string[] = [];

    // Parse graph body
    while (!this.match("RBRACE") && !this.isAtEnd()) {
      if (this.check("KEYWORD", "node")) {
        this.parseNodeDeclaration(graph, aliasToIdMap, nodeOrder);
        continue;
      }

      if (this.check("KEYWORD", "wire")) {
        this.parseWireDeclaration(graph, aliasToIdMap);
        continue;
      }

      if (this.check("KEYWORD", "variable") || this.check("KEYWORD", "var")) {
        this.parseVariableDeclaration(graph);
        continue;
      }

      const nextTok = this.peek();
      throw new NodeScriptSyntaxError(
        `Unexpected token '${nextTok.raw}', expected 'node', 'wire', or 'variable'`,
        nextTok.loc,
        this.source
      );
    }

    // Auto-layout nodes without explicit coordinates
    if (this.options.autoLayout) {
      this.applyAutoLayout(graph, nodeOrder);
    }

    return graph;
  }

  // --------------------------------------------------------------------------
  // Declarations
  // --------------------------------------------------------------------------

  private parseNodeDeclaration(
    graph: BlueprintGraph,
    aliasToIdMap: Map<string, string>,
    nodeOrder: string[]
  ): void {
    this.expect("KEYWORD", "node");

    const aliasTok = this.expect("IDENTIFIER");
    const alias = String(aliasTok.value);

    this.expect("COLON");

    const type = this.parseQualifiedType();
    let params: Record<string, unknown> = {};

    if (this.match("LPAREN")) {
      params = this.parseParameterList();
      this.expect("RPAREN");
    }

    let explicitPos: { x: number; y: number } | null = null;
    if (this.match("AT")) {
      const atIdent = this.expect("IDENTIFIER");
      if (atIdent.value !== "pos") {
        throw new NodeScriptSyntaxError(
          `Unknown annotation '@${atIdent.value}', expected '@pos(x, y)'`,
          atIdent.loc,
          this.source
        );
      }
      this.expect("LPAREN");
      const xTok = this.expect("NUMBER");
      this.expect("COMMA");
      const yTok = this.expect("NUMBER");
      this.expect("RPAREN");
      explicitPos = { x: Number(xTok.value), y: Number(yTok.value) };
    }

    // Resolve definition & title from node-registry
    const def = getNodeDefinition(type);
    const title = def ? def.title : type.split(".").pop() || type;
    const nodeId = alias; // Alias serves as the canonical node ID for predictable AST addressing

    aliasToIdMap.set(alias, nodeId);
    nodeOrder.push(nodeId);

    const nodeInstance: BlueprintNodeInstance = {
      id: nodeId,
      type,
      title,
      position: explicitPos || { x: 0, y: 0 },
      customParams: params,
      pinValues: params,
    };

    graph.nodes[nodeId] = nodeInstance;
  }

  private parseWireDeclaration(
    graph: BlueprintGraph,
    aliasToIdMap: Map<string, string>
  ): void {
    this.expect("KEYWORD", "wire");

    const srcAliasTok = this.expect("IDENTIFIER");
    this.expect("DOT");
    const srcPinTok = this.expect("IDENTIFIER");

    this.expect("ARROW");

    const tgtAliasTok = this.expect("IDENTIFIER");
    this.expect("DOT");
    const tgtPinTok = this.expect("IDENTIFIER");

    const srcAlias = String(srcAliasTok.value);
    const srcPin = String(srcPinTok.value);
    const tgtAlias = String(tgtAliasTok.value);
    const tgtPin = String(tgtPinTok.value);

    const srcNodeId = aliasToIdMap.get(srcAlias) || srcAlias;
    const tgtNodeId = aliasToIdMap.get(tgtAlias) || tgtAlias;

    // Optional conditional guard [when: ...]
    let whenCondition: string | null = null;
    if (this.match("LBRACKET")) {
      this.expect("KEYWORD", "when");
      const colonTok = this.expect("COLON");
      const startOffset = colonTok.loc.offset + colonTok.raw.length;

      while (!this.check("RBRACKET") && !this.isAtEnd()) {
        this.advance();
      }
      const rbracketTok = this.expect("RBRACKET");
      const endOffset = rbracketTok.loc.offset;
      whenCondition = this.source.substring(startOffset, endOffset).trim();
    }

    // Infer isExec and pinType
    const isExec = srcPin.toLowerCase() === "exec" || tgtPin.toLowerCase() === "exec";
    let pinType: PinDataType = isExec ? "exec" : "any";

    // Lookup output pin in node definition if available
    const srcNode = graph.nodes[srcNodeId];
    if (srcNode) {
      const def = getNodeDefinition(srcNode.type);
      if (def) {
        const pinDef = def.outputs.find((p) => p.name === srcPin);
        if (pinDef) {
          pinType = pinDef.type;
        }
      }
    }

    const wireId = `wire_${srcNodeId}_${srcPin}_${tgtNodeId}_${tgtPin}`;
    const wire: BlueprintWire = {
      id: wireId,
      sourceNodeId: srcNodeId,
      sourcePinId: srcPin,
      targetNodeId: tgtNodeId,
      targetPinId: tgtPin,
      pinType,
      isExec,
    };

    // If a conditional guard exists, attach it to the wire metadata
    if (whenCondition) {
      (wire as unknown as Record<string, unknown>)["when"] = whenCondition;
    }

    graph.wires.push(wire);
  }

  private parseVariableDeclaration(graph: BlueprintGraph): void {
    this.advance(); // skip 'variable' or 'var'

    const nameTok = this.expect("IDENTIFIER");
    const varName = String(nameTok.value);

    this.expect("COLON");

    const typeTok = this.expect("IDENTIFIER");
    const rawType = String(typeTok.value).toLowerCase();

    let varType: "string" | "number" | "boolean" | "object" | "array" = "string";
    if (rawType === "number" || rawType === "int" || rawType === "float") {
      varType = "number";
    } else if (rawType === "boolean" || rawType === "bool") {
      varType = "boolean";
    } else if (rawType === "object" || rawType === "map") {
      varType = "object";
    } else if (rawType === "array" || rawType === "list") {
      varType = "array";
    }

    this.expect("ASSIGN");
    const defaultValue = this.parseValue();

    const variable: BlueprintVariable = {
      id: `var_${varName}`,
      name: varName,
      type: varType,
      defaultValue,
      category: "Default",
      isPublic: true,
    };

    graph.variables.push(variable);
  }

  // --------------------------------------------------------------------------
  // Expressions & Values
  // --------------------------------------------------------------------------

  private parseQualifiedType(): string {
    let result = String(this.expect("IDENTIFIER").value);

    while (this.check("DOT") || this.check("SLASH")) {
      const sep = this.advance().raw; // "." or "/"
      const next = this.expect("IDENTIFIER");
      result += sep + String(next.value);
    }

    return result;
  }

  private parseParameterList(): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (this.check("RPAREN")) {
      return params;
    }

    do {
      const keyTok = this.expect("IDENTIFIER");
      const key = String(keyTok.value);

      this.expect("COLON");

      const value = this.parseValue();
      params[key] = value;
    } while (this.match("COMMA"));

    return params;
  }

  private parseValue(): unknown {
    const tok = this.peek();

    // 1. Reference expression $node.pin
    if (this.match("DOLLAR")) {
      const nodeTok = this.expect("IDENTIFIER");
      this.expect("DOT");
      const pinTok = this.expect("IDENTIFIER");
      const ref: NodeScriptReference = {
        __ref: true,
        node: String(nodeTok.value),
        pin: String(pinTok.value),
      };
      return ref;
    }

    // 2. Object literal { key: value, ... }
    if (this.match("LBRACE")) {
      const obj: Record<string, unknown> = {};
      if (!this.check("RBRACE")) {
        do {
          const keyTok = this.expect("IDENTIFIER");
          this.expect("COLON");
          obj[String(keyTok.value)] = this.parseValue();
        } while (this.match("COMMA"));
      }
      this.expect("RBRACE");
      return obj;
    }

    // 3. Array literal [ a, b, ... ]
    if (this.match("LBRACKET")) {
      const arr: unknown[] = [];
      if (!this.check("RBRACKET")) {
        do {
          arr.push(this.parseValue());
        } while (this.match("COMMA"));
      }
      this.expect("RBRACKET");
      return arr;
    }

    // 4. Primitive literals
    if (tok.type === "STRING" || tok.type === "NUMBER" || tok.type === "BOOLEAN" || tok.type === "NULL") {
      this.advance();
      return tok.value;
    }

    // 5. Bare identifier (e.g. enum values like Global, Local)
    if (tok.type === "IDENTIFIER") {
      this.advance();
      return String(tok.value);
    }

    throw new NodeScriptSyntaxError(
      `Unexpected token '${tok.raw}', expected value`,
      tok.loc,
      this.source
    );
  }

  // --------------------------------------------------------------------------
  // Auto-Layout
  // --------------------------------------------------------------------------

  private applyAutoLayout(graph: BlueprintGraph, nodeOrder: string[]): void {
    // Determine topological rank for each node
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const nodeId of nodeOrder) {
      inDegree.set(nodeId, 0);
      adjacency.set(nodeId, []);
    }

    for (const wire of graph.wires) {
      if (adjacency.has(wire.sourceNodeId) && inDegree.has(wire.targetNodeId)) {
        adjacency.get(wire.sourceNodeId)!.push(wire.targetNodeId);
        inDegree.set(wire.targetNodeId, (inDegree.get(wire.targetNodeId) || 0) + 1);
      }
    }

    // Assign tiers
    const tiers = new Map<string, number>();
    for (const nodeId of nodeOrder) {
      if (inDegree.get(nodeId) === 0) {
        tiers.set(nodeId, 0);
      }
    }

    // Forward pass
    for (const nodeId of nodeOrder) {
      const currentTier = tiers.get(nodeId) ?? 0;
      const neighbors = adjacency.get(nodeId) || [];
      for (const next of neighbors) {
        const existing = tiers.get(next) ?? 0;
        tiers.set(next, Math.max(existing, currentTier + 1));
      }
    }

    // Group nodes by tier
    const tierBuckets = new Map<number, string[]>();
    for (const nodeId of nodeOrder) {
      const node = graph.nodes[nodeId];
      // Only auto-layout if position is at default (0, 0)
      if (node.position.x === 0 && node.position.y === 0) {
        const tier = tiers.get(nodeId) ?? 0;
        if (!tierBuckets.has(tier)) {
          tierBuckets.set(tier, []);
        }
        tierBuckets.get(tier)!.push(nodeId);
      }
    }

    tierBuckets.forEach((nodesInTier, tier) => {
      nodesInTier.forEach((nodeId, idx) => {
        graph.nodes[nodeId].position = {
          x: 100 + tier * 320,
          y: 100 + idx * 160,
        };
      });
    });
  }

  // --------------------------------------------------------------------------
  // Parser Utilities
  // --------------------------------------------------------------------------

  private peek(): Token {
    return this.tokens[this.cursor] || this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const current = this.peek();
    if (this.cursor < this.tokens.length - 1) {
      this.cursor++;
    }
    return current;
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private check(type: TokenType, value?: string): boolean {
    const tok = this.peek();
    if (tok.type !== type) return false;
    if (value !== undefined && tok.value !== value) return false;
    return true;
  }

  private match(type: TokenType, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, value?: string): Token {
    const tok = this.peek();
    if (!this.check(type, value)) {
      const expectedStr = value ? `'${value}'` : type;
      throw new NodeScriptSyntaxError(
        `Expected ${expectedStr} but found '${tok.raw}'`,
        tok.loc,
        this.source
      );
    }
    return this.advance();
  }
}
