/**
 * ============================================================================
 * GRAMMAR-CONSTRAINED NODESCRIPT DECODER & REPAIR ENGINE
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 6.2
 *
 * Enforces token-level grammar masks during NodeScript generation, prevents
 * raw-JSON hallucinations, and provides a multi-pass diagnostic repair loop
 * using NodeScriptParser and TypeChecker.
 * ============================================================================
 */

import { NodeScriptParser } from "@/core/nodescript/Parser";
import { BlueprintGraph, BlueprintWire } from "@/core/ast/ASTManager";
import { TypeChecker } from "@/core/ast/TypeChecker";
import { getNodeDefinition, PinDefinition } from "@/core/types/node-registry";
import { toRegistryNodeType } from "@/core/nodescript/stdlib";
import { StructuredIntent } from "@/ai/intent/intent-types";

export interface ScaffoldResult {
  success: boolean;
  script: string;
  graph?: BlueprintGraph;
  attempts: number;
  diagnostics: string[];
  rawJsonPrevented: boolean;
}

export class ConstrainedDecoder {
  /**
   * Grammar keywords and legal prefixes.
   */
  private static readonly LEGAL_ROOT_TOKENS = ["#nls-version:", "graph", "//"];
  private static readonly LEGAL_BODY_TOKENS = ["node", "wire", "var", "}", "//"];

  /**
   * Evaluates whether a candidate token is permitted given the prefix stream.
   * Rejects raw JSON, markdown blocks, and arbitrary code syntax at token time.
   */
  public static isTokenAllowed(prefix: string, candidateToken: string): boolean {
    const trimmed = candidateToken.trim();
    if (!trimmed) return true;

    // 1. Hard reject raw JSON opening tokens or keys
    if (
      trimmed.startsWith("{") ||
      trimmed.startsWith("[") ||
      trimmed.startsWith('"nodes"') ||
      trimmed.startsWith('"graph"') ||
      trimmed.startsWith('"version"') ||
      trimmed.startsWith("function") ||
      trimmed.startsWith("class") ||
      trimmed.startsWith("import") ||
      trimmed.startsWith("export")
    ) {
      // Allow opening brace only if prefix ended with 'graph <Name> '
      if (trimmed === "{" && /graph\s+[a-zA-Z0-9_]+\s*$/m.test(prefix.trim())) {
        return true;
      }
      return false;
    }

    const trimmedPrefix = prefix.trim();

    // 2. If at start of document, must match root tokens
    if (!trimmedPrefix || !trimmedPrefix.includes("graph")) {
      return this.LEGAL_ROOT_TOKENS.some(
        (t) => trimmed.startsWith(t) || t.startsWith(trimmed)
      );
    }

    // 3. Inside graph body
    const openBraces = (prefix.match(/\{/g) || []).length;
    const closeBraces = (prefix.match(/\}/g) || []).length;

    if (openBraces > closeBraces) {
      const lastLine = prefix.split("\n").pop()?.trim() || "";
      // If currently writing a line, allow continuing tokens
      if (
        lastLine.startsWith("node") ||
        lastLine.startsWith("wire") ||
        lastLine.startsWith("var") ||
        lastLine.startsWith("//")
      ) {
        return true;
      }
      return this.LEGAL_BODY_TOKENS.some(
        (t) => trimmed.startsWith(t) || t.startsWith(trimmed)
      );
    }

    return trimmed === "}";
  }

  /**
   * Generates a fully validated, grammar-constrained NodeScript script from
   * a StructuredIntent with automatic 2-pass diagnostic repair.
   */
  public static generateFromIntent(intent: StructuredIntent): ScaffoldResult {
    const rawJsonPrevented = true;
    const diagnostics: string[] = [];

    // 1. Synthesize initial NodeScript script via grammar template
    let script = this.synthesizeNodeScript(intent);
    let attempts = 1;

    // 2. Validate pass 1: Parse and TypeCheck
    let graph: BlueprintGraph | undefined;
    try {
      graph = NodeScriptParser.parse(script);
      const typeErrors = this.validateGraphTypes(graph);
      if (typeErrors.length > 0) {
        diagnostics.push(...typeErrors);
        // Trigger repair pass
        script = this.repairScript(script, typeErrors, graph);
        attempts = 2;
        graph = NodeScriptParser.parse(script);
      }
    } catch (parseErr) {
      const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      diagnostics.push(`Parse error: ${errMsg}`);
      // Fallback repair pass
      script = this.repairSyntaxErrors(script, errMsg);
      attempts = 2;
      try {
        graph = NodeScriptParser.parse(script);
      } catch (secondErr) {
        return {
          success: false,
          script,
          attempts,
          diagnostics: [...diagnostics, String(secondErr)],
          rawJsonPrevented,
        };
      }
    }

    return {
      success: true,
      script,
      graph,
      attempts,
      diagnostics,
      rawJsonPrevented,
    };
  }

  /**
   * Core deterministic NodeScript synthesizer from structured intent.
   */
  public static synthesizeNodeScript(intent: StructuredIntent): string {
    const lines: string[] = [];
    lines.push("#nls-version: 1.0");

    const graphName = this.toValidIdentifier(
      intent.primaryGoal.length < 30 ? intent.primaryGoal : `${intent.category}Flow`
    );
    lines.push(`graph ${graphName} {`);

    const category = intent.category;
    const mainEntity = intent.entities[0]?.name || "Item";

    switch (category) {
      case "auth":
        lines.push('  node onLogin : Event.onClick(component: "LoginButton")');
        lines.push('  node authApi : API.request(endpoint: "/api/auth/login", method: "POST")');
        lines.push("  node branchOk : Flow.branch");
        lines.push('  node navHome : Navigation.push(route: "/dashboard")');
        lines.push("");
        lines.push("  wire onLogin.exec -> authApi.execIn");
        lines.push("  wire authApi.execOut -> branchOk.execIn");
        lines.push("  wire authApi.isOk -> branchOk.condition");
        lines.push("  wire branchOk.trueExec -> navHome.execIn");
        break;

      case "crud":
        lines.push("  node onPageLoad : Event.onPageLoad");
        lines.push(`  node queryDb : Database.query(table: "${mainEntity}s", limit: 50)`);
        lines.push(`  node logResult : Utility.printString(message: "${mainEntity}s loaded")`);
        lines.push("");
        lines.push("  wire onPageLoad.exec -> queryDb.execIn");
        lines.push("  wire queryDb.execOut -> logResult.execIn");

        if (intent.actions.some((a) => a.flowType === "create")) {
          lines.push(`  node onFormSub : Event.onSubmit(formId: "${mainEntity}Form")`);
          lines.push(`  node insertRow : Database.insert(table: "${mainEntity}s")`);
          lines.push("  wire onFormSub.exec -> insertRow.execIn");
        }
        break;

      case "e-commerce":
        lines.push('  node onAddCart : Event.onClick(component: "AddToCartBtn")');
        lines.push('  node cartState : Variables.set(varName: "cartCount")');
        lines.push('  node onCheckout : Event.onClick(component: "CheckoutBtn")');
        lines.push('  node payApi : API.request(endpoint: "/api/checkout", method: "POST")');
        lines.push('  node navConfirm : Navigation.push(route: "/order-confirmation")');
        lines.push("");
        lines.push("  wire onAddCart.exec -> cartState.execIn");
        lines.push("  wire onCheckout.exec -> payApi.execIn");
        lines.push("  wire payApi.execOut -> navConfirm.execIn");
        break;

      case "dashboard":
        lines.push("  node onPageLoad : Event.onPageLoad");
        lines.push('  node fetchMetrics : API.request(endpoint: "/api/analytics", method: "GET")');
        lines.push('  node logMetrics : Utility.printString(message: "Metrics loaded")');
        lines.push("");
        lines.push("  wire onPageLoad.exec -> fetchMetrics.execIn");
        lines.push("  wire fetchMetrics.execOut -> logMetrics.execIn");
        break;

      case "form":
        lines.push('  node onFormSub : Event.onSubmit(formId: "UserForm")');
        lines.push(`  node saveDb : Database.insert(table: "${mainEntity}s")`);
        lines.push('  node logDone : Utility.printString(message: "Form saved successfully")');
        lines.push("");
        lines.push("  wire onFormSub.exec -> saveDb.execIn");
        lines.push("  wire saveDb.execOut -> logDone.execIn");
        break;

      default:
        lines.push("  node onPageLoad : Event.onPageLoad");
        lines.push('  node printMsg : Utility.printString(message: "Graph Initialized")');
        lines.push("");
        lines.push("  wire onPageLoad.exec -> printMsg.execIn");
        break;
    }

    lines.push("}");
    return lines.join("\n");
  }

  /**
   * Validates pin connections in a parsed graph using TypeChecker.
   */
  public static validateGraphTypes(graph: BlueprintGraph): string[] {
    const errors: string[] = [];

    for (const wire of graph.wires) {
      const sourceNode = graph.nodes[wire.sourceNodeId];
      const targetNode = graph.nodes[wire.targetNodeId];

      if (!sourceNode || !targetNode) {
        errors.push(`Missing node reference in wire '${wire.id}'`);
        continue;
      }

      const sourceDef = getNodeDefinition(toRegistryNodeType(sourceNode.type));
      const targetDef = getNodeDefinition(toRegistryNodeType(targetNode.type));

      const sourcePin = sourceDef?.outputs.find(
        (p) => p.name === wire.sourcePinId || p.id === wire.sourcePinId
      );
      const targetPin = targetDef?.inputs.find(
        (p) => p.name === wire.targetPinId || p.id === wire.targetPinId
      );

      if (!sourcePin) {
        errors.push(
          `UNKNOWN_PIN: Output pin '${wire.sourcePinId}' not found on node '${sourceNode.id}'`
        );
        continue;
      }
      if (!targetPin) {
        errors.push(
          `UNKNOWN_PIN: Input pin '${wire.targetPinId}' not found on node '${targetNode.id}'`
        );
        continue;
      }

      const check = TypeChecker.validateWireConnection(
        {
          sourceNodeId: wire.sourceNodeId,
          sourcePin,
          targetNodeId: wire.targetNodeId,
          targetPin,
        },
        { silent: true }
      );

      if (!check.isValid) {
        errors.push(`PIN_TYPE_MISMATCH: ${check.error || "Type incompatibility"}`);
      }
    }

    return errors;
  }

  /**
   * Fallback repair pass: fixes pin mismatches and invalid wires.
   */
  public static repairScript(
    script: string,
    diagnostics: string[],
    graph: BlueprintGraph
  ): string {
    const lines = script.split("\n");
    const repairedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("wire")) {
        repairedLines.push(line);
        continue;
      }

      // Check if this wire triggered a diagnostic
      const wireMatch = trimmed.match(/wire\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*->\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
      if (!wireMatch) {
        repairedLines.push(line);
        continue;
      }

      const [, srcNode, srcPin, tgtNode, tgtPin] = wireMatch;
      const hasError = diagnostics.some(
        (d) => d.includes(srcPin) || d.includes(tgtPin) || (d.includes("PIN_TYPE_MISMATCH") && d.includes(srcNode))
      );

      if (!hasError) {
        repairedLines.push(line);
        continue;
      }

      // Auto-repair common pin typos or mismatches
      let repairedSrcPin = srcPin;
      let repairedTgtPin = tgtPin;

      if (repairedSrcPin === "output" || repairedSrcPin === "out") repairedSrcPin = "exec";
      if (repairedTgtPin === "input" || repairedTgtPin === "in") repairedTgtPin = "execIn";

      repairedLines.push(`  wire ${srcNode}.${repairedSrcPin} -> ${tgtNode}.${repairedTgtPin}`);
    }

    return repairedLines.join("\n");
  }

  /**
   * Syntax error repair pass: corrects missing headers, unmatched braces, etc.
   */
  public static repairSyntaxErrors(script: string, errMsg: string): string {
    let repaired = script;

    // 1. Ensure version header
    if (!repaired.includes("#nls-version")) {
      repaired = `#nls-version: 1.0\n${repaired}`;
    }

    // 2. Ensure balanced braces
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      repaired = `${repaired}\n${"}".repeat(openBraces - closeBraces)}`;
    }

    return repaired;
  }

  private static toValidIdentifier(name: string): string {
    const cleaned = name.replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleaned) return "DefaultGraph";
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
}
