/**
 * ============================================================================
 * NODESCRIPT LANGUAGE SERVER ENGINE
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 5.3
 *
 * Headless Language Server providing contextual autocompletion, hover docs,
 * and inline type-checking diagnostics integrating TypeChecker & DiagnosticBus.
 * ============================================================================
 */

import {
  CompletionItem,
  HoverInfo,
  LanguageDiagnostic,
  Position,
  Range,
} from "./language-server-types";
import { NodeScriptParser } from "./Parser";
import { NodeScriptSyntaxError } from "./types";
import {
  getAllRegisteredNodes,
  getNodeDefinition,
  NodeDefinition,
  PinDefinition,
} from "@/core/types/node-registry";
import { TypeChecker, WireConnectionRequest } from "@/core/ast/TypeChecker";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";

export class NodeScriptLanguageServer {
  /**
   * Resolves a NodeDefinition from either dotted ("Event.onClick"),
   * slashed ("event/onClick"), or bare title/type representations.
   */
  public static resolveNodeDefinition(type: string): NodeDefinition | undefined {
    // 1. Direct lookup
    let def = getNodeDefinition(type);
    if (def) return def;

    // 2. Normalized category/action lookup (e.g. Math.add -> math/add)
    if (type.includes(".")) {
      const [cat, ...rest] = type.split(".");
      const action = rest.join(".");
      const slashed = `${cat.toLowerCase()}/${action}`;
      def = getNodeDefinition(slashed);
      if (def) return def;

      // Special category prefixes
      if (cat.toLowerCase() === "flowcontrol" || cat.toLowerCase() === "flow") {
        def = getNodeDefinition(`flow/${action}`);
        if (def) return def;
      }
      if (cat.toLowerCase() === "database") {
        def = getNodeDefinition(`db/${action}`);
        if (def) return def;
      }
    }

    // 3. Reverse slash / case-insensitive search
    const all = getAllRegisteredNodes();
    const cleanType = type.toLowerCase().replace(/[./]/g, "");
    for (const node of Object.values(all)) {
      const cleanNode = node.type.toLowerCase().replace(/[./]/g, "");
      if (cleanNode === cleanType || node.title.toLowerCase() === type.toLowerCase()) {
        return node;
      }
    }

    return undefined;
  }

  // --------------------------------------------------------------------------
  // 1. Autocompletion Engine
  // --------------------------------------------------------------------------

  public static getCompletions(source: string, pos: Position): CompletionItem[] {
    const lines = source.split(/\r?\n/);
    const lineIndex = pos.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) return [];

    const currentLine = lines[lineIndex];
    const prefix = currentLine.substring(0, pos.column - 1);
    const trimmedPrefix = prefix.trim();

    // 1. Node Type completions: after "node <alias> : "
    const nodeTypeMatch = prefix.match(/node\s+([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_.]*)$/);
    if (nodeTypeMatch) {
      const allNodes = getAllRegisteredNodes();
      const items: CompletionItem[] = [];

      for (const node of Object.values(allNodes)) {
        // Convert category/action to PascalCase.action format (e.g. event/onClick -> Event.onClick)
        const parts = node.type.split("/");
        const formattedType =
          parts.length === 2
            ? `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}.${parts[1]}`
            : node.type;

        items.push({
          label: formattedType,
          kind: "nodeType",
          detail: `[${node.category}] ${node.title}`,
          documentation: node.description,
          insertText: formattedType,
        });

        // Also suggest standard slashed format
        items.push({
          label: node.type,
          kind: "nodeType",
          detail: `[${node.category}] ${node.title}`,
          documentation: node.description,
          insertText: node.type,
        });
      }

      return items;
    }

    // 2. Wire Target Pin completions: "wire <srcNode>.<srcPin> -> <tgtNode>."
    const wireTargetPinMatch = prefix.match(
      /wire\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*->\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]*)$/
    );
    if (wireTargetPinMatch) {
      const tgtAlias = wireTargetPinMatch[3];
      const nodeDeclarations = this.extractNodeDeclarations(source);
      const tgtNode = nodeDeclarations.get(tgtAlias);

      if (tgtNode) {
        const def = this.resolveNodeDefinition(tgtNode.type);
        if (def) {
          return def.inputs.map((pin) => ({
            label: pin.name,
            kind: "pin",
            detail: `Input Pin (${pin.type})`,
            documentation: pin.description || `Input pin of type ${pin.type}`,
            insertText: pin.name,
          }));
        }
      }
      return [];
    }

    // 3. Wire Target Node completions: "wire <srcNode>.<srcPin> -> "
    const wireTargetNodeMatch = prefix.match(
      /wire\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*->\s*([a-zA-Z0-9_]*)$/
    );
    if (wireTargetNodeMatch) {
      const nodeDeclarations = this.extractNodeDeclarations(source);
      return Array.from(nodeDeclarations.entries()).map(([alias, info]) => ({
        label: alias,
        kind: "nodeAlias",
        detail: `Node: ${info.type}`,
        documentation: `Target node instance '${alias}'`,
        insertText: alias,
      }));
    }

    // 4. Wire Source Pin completions: "wire <srcNode>."
    const wireSourcePinMatch = prefix.match(/wire\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]*)$/);
    if (wireSourcePinMatch) {
      const srcAlias = wireSourcePinMatch[1];
      const nodeDeclarations = this.extractNodeDeclarations(source);
      const srcNode = nodeDeclarations.get(srcAlias);

      if (srcNode) {
        const def = this.resolveNodeDefinition(srcNode.type);
        if (def) {
          return def.outputs.map((pin) => ({
            label: pin.name,
            kind: "pin",
            detail: `Output Pin (${pin.type})`,
            documentation: pin.description || `Output pin of type ${pin.type}`,
            insertText: pin.name,
          }));
        }
      }
      return [];
    }

    // 5. Variable Type completions: "variable <name> : " or "var <name> : "
    const varTypeMatch = prefix.match(/(?:variable|var)\s+([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]*)$/);
    if (varTypeMatch) {
      const types = ["string", "number", "boolean", "object", "array"];
      return types.map((t) => ({
        label: t,
        kind: "type",
        detail: `Primitive variable type: ${t}`,
        insertText: t,
      }));
    }

    // 6. Top-level keywords inside graph block
    if (trimmedPrefix === "" || !trimmedPrefix.includes(":")) {
      return [
        {
          label: "node",
          kind: "keyword",
          detail: "Declare a blueprint node instance",
          insertText: "node ",
        },
        {
          label: "wire",
          kind: "keyword",
          detail: "Connect two nodes with a wire",
          insertText: "wire ",
        },
        {
          label: "variable",
          kind: "keyword",
          detail: "Declare a graph variable",
          insertText: "variable ",
        },
        {
          label: "var",
          kind: "keyword",
          detail: "Declare a graph variable (shorthand)",
          insertText: "var ",
        },
      ];
    }

    return [];
  }

  // --------------------------------------------------------------------------
  // 2. Inline Diagnostics & Type Checking (<100ms budget)
  // --------------------------------------------------------------------------

  public static validateDocument(
    source: string,
    options: { emitDiagnostics?: boolean } = {}
  ): LanguageDiagnostic[] {
    const diagnostics: LanguageDiagnostic[] = [];
    const shouldEmit = options.emitDiagnostics !== false;

    // Phase A: Syntax Validation
    let parsedGraph;
    try {
      parsedGraph = NodeScriptParser.parse(source, { autoLayout: false });
    } catch (err) {
      if (err instanceof NodeScriptSyntaxError) {
        diagnostics.push({
          code: "SYNTAX_ERROR",
          message: err.message,
          severity: "error",
          range: {
            start: { line: err.line, column: err.column },
            end: { line: err.line, column: err.column + 1 },
          },
          suggestion: "Fix syntax error to conform with NodeScript grammar.",
        });
      } else {
        diagnostics.push({
          code: "PARSE_ERROR",
          message: err instanceof Error ? err.message : String(err),
          severity: "error",
          range: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 1 },
          },
        });
      }
      return diagnostics;
    }

    const lines = source.split(/\r?\n/);

    // Phase B: Semantic & Wire Type Checking
    const nodes = parsedGraph.nodes;

    for (const wire of parsedGraph.wires) {
      const srcNode = nodes[wire.sourceNodeId];
      const tgtNode = nodes[wire.targetNodeId];

      const wireLineNum = this.findWireLineNumber(lines, wire.sourceNodeId, wire.targetNodeId);
      const wireRange: Range = {
        start: { line: wireLineNum, column: 1 },
        end: { line: wireLineNum, column: lines[wireLineNum - 1]?.length || 20 },
      };

      // 1. Missing Node Validation
      if (!srcNode) {
        diagnostics.push({
          code: "UNDEFINED_NODE",
          message: `Referenced source node '${wire.sourceNodeId}' does not exist in graph.`,
          severity: "error",
          range: wireRange,
          suggestion: `Declare 'node ${wire.sourceNodeId} : ...' before connecting wires.`,
        });
        continue;
      }

      if (!tgtNode) {
        diagnostics.push({
          code: "UNDEFINED_NODE",
          message: `Referenced target node '${wire.targetNodeId}' does not exist in graph.`,
          severity: "error",
          range: wireRange,
          suggestion: `Declare 'node ${wire.targetNodeId} : ...' before connecting wires.`,
        });
        continue;
      }

      // 2. Node Registry Pin Lookup
      const srcDef = this.resolveNodeDefinition(srcNode.type);
      const tgtDef = this.resolveNodeDefinition(tgtNode.type);

      let srcPin: PinDefinition | undefined;
      let tgtPin: PinDefinition | undefined;

      if (srcDef) {
        srcPin = srcDef.outputs.find((p) => p.name === wire.sourcePinId);
        if (!srcPin) {
          diagnostics.push({
            code: "PIN_NOT_FOUND",
            message: `Output pin '${wire.sourcePinId}' does not exist on node type '${srcNode.type}'.`,
            severity: "error",
            range: wireRange,
            suggestion: `Available outputs: ${srcDef.outputs.map((p) => p.name).join(", ")}`,
          });
          continue;
        }
      } else {
        // Fallback synthetic pin if custom/unregistered type
        srcPin = {
          id: wire.sourcePinId,
          name: wire.sourcePinId,
          label: wire.sourcePinId,
          type: wire.isExec ? "exec" : "any",
          direction: "output",
        };
      }

      if (tgtDef) {
        tgtPin = tgtDef.inputs.find((p) => p.name === wire.targetPinId);
        if (!tgtPin) {
          diagnostics.push({
            code: "PIN_NOT_FOUND",
            message: `Input pin '${wire.targetPinId}' does not exist on node type '${tgtNode.type}'.`,
            severity: "error",
            range: wireRange,
            suggestion: `Available inputs: ${tgtDef.inputs.map((p) => p.name).join(", ")}`,
          });
          continue;
        }
      } else {
        tgtPin = {
          id: wire.targetPinId,
          name: wire.targetPinId,
          label: wire.targetPinId,
          type: wire.isExec ? "exec" : "any",
          direction: "input",
        };
      }

      // 3. Delegate to TypeChecker Engine
      const connReq: WireConnectionRequest = {
        sourceNodeId: wire.sourceNodeId,
        sourcePin: srcPin,
        targetNodeId: wire.targetNodeId,
        targetPin: tgtPin,
      };

      const checkResult = TypeChecker.validateWireConnection(connReq, { silent: !shouldEmit });

      if (!checkResult.isValid) {
        const errorMsg = checkResult.error || `[PIN_TYPE_MISMATCH] Incompatible wire connection between '${srcPin.name}' (${srcPin.type}) and '${tgtPin.name}' (${tgtPin.type}).`;

        diagnostics.push({
          code: "PIN_TYPE_MISMATCH",
          message: errorMsg,
          severity: "error",
          range: wireRange,
          suggestion:
            checkResult.reason === "EXEC_DATA_MISMATCH"
              ? "Execution pins (white) can only connect to other execution pins."
              : "Ensure output and input pin data types match or can be converted.",
        });

        // Emit to DiagnosticBus if enabled
        if (shouldEmit) {
          DiagnosticBus.emit({
            channel: "BLUEPRINT_ERR",
            severity: "error",
            source: {
              panel: "Panel 05: Logic Blueprint",
              entityId: wire.id,
            },
            message: errorMsg,
            suggestion: "Verify pin types match in NodeScript source.",
          });
        }
      }
    }

    return diagnostics;
  }

  // --------------------------------------------------------------------------
  // 3. Hover Documentation Provider
  // --------------------------------------------------------------------------

  public static getHover(source: string, pos: Position): HoverInfo | null {
    const lines = source.split(/\r?\n/);
    const lineIndex = pos.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) return null;

    const currentLine = lines[lineIndex];
    const word = this.getWordAtColumn(currentLine, pos.column);
    if (!word) return null;

    // 1. Check if word is a Node Type
    const def = this.resolveNodeDefinition(word);
    if (def) {
      const inputsStr = def.inputs.map((p) => `• \`${p.name}\` (${p.type})`).join("\n");
      const outputsStr = def.outputs.map((p) => `• \`${p.name}\` (${p.type})`).join("\n");

      const markdown = [
        `### ${def.title}`,
        `**Category:** ${def.category} | **Type:** \`${def.type}\``,
        "",
        def.description,
        "",
        "**Inputs:**",
        inputsStr || "None",
        "",
        "**Outputs:**",
        outputsStr || "None",
      ].join("\n");

      return { contents: markdown };
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private static extractNodeDeclarations(
    source: string
  ): Map<string, { type: string }> {
    const map = new Map<string, { type: string }>();
    const regex = /node\s+([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_./]+)/g;
    let match;

    while ((match = regex.exec(source)) !== null) {
      map.set(match[1], { type: match[2] });
    }

    return map;
  }

  private static findWireLineNumber(
    lines: string[],
    srcNode: string,
    tgtNode: string
  ): number {
    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].includes("wire") &&
        lines[i].includes(srcNode) &&
        lines[i].includes(tgtNode)
      ) {
        return i + 1;
      }
    }
    return 1;
  }

  private static getWordAtColumn(line: string, col: number): string | null {
    const index = col - 1;
    if (index < 0 || index >= line.length) return null;

    let start = index;
    while (start > 0 && /[a-zA-Z0-9_./]/.test(line[start - 1])) {
      start--;
    }

    let end = index;
    while (end < line.length && /[a-zA-Z0-9_./]/.test(line[end])) {
      end++;
    }

    const word = line.substring(start, end);
    return word.length > 0 ? word : null;
  }
}
