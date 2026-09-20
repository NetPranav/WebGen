#!/usr/bin/env node
/**
 * ============================================================================
 * NODESCRIPT COMMAND LINE INTERFACE (CLI) & DEVELOPER TOOLING
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 5.4
 *
 * Provides headless command line actions for .nls file compilation,
 * decompilation, semantic AST graph diffing, and type validation.
 *
 * Commands:
 *   compile <file.nls> [-o output.bp.json]   Compile .nls to Blueprint JSON
 *   decompile <file.bp.json> [-o output.nls] Decompile Blueprint JSON to .nls
 *   diff <a.nls> <b.nls>                     Semantic visual graph AST diff
 *   validate <file.nls>                      Type check & lint .nls source
 * ============================================================================
 */

import * as fs from "fs";
import * as path from "path";
import { NodeScriptParser } from "@/core/nodescript/Parser";
import { NodeScriptSerializer, SerializerOptions } from "@/core/nodescript/Serializer";
import { NodeScriptLanguageServer } from "@/core/nodescript/LanguageServer";
import { BlueprintGraph } from "@/core/ast/ASTManager";
import { LanguageDiagnostic } from "@/core/nodescript/language-server-types";

export interface NodeScriptDiffResult {
  hasChanges: boolean;
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: Array<{
    id: string;
    changes: string[];
  }>;
  addedWires: string[];
  removedWires: string[];
  modifiedWires: Array<{
    id: string;
    changes: string[];
  }>;
  addedVariables: string[];
  removedVariables: string[];
  formattedSummary: string;
}

export class NodeScriptCLI {
  /**
   * Compiles .nls source text to formatted Blueprint JSON.
   */
  public static compile(
    nlsSource: string,
    options: { autoLayout?: boolean } = {}
  ): string {
    const graph = NodeScriptParser.parse(nlsSource, {
      autoLayout: options.autoLayout ?? false,
    });
    return JSON.stringify(graph, null, 2);
  }

  /**
   * Decompiles Blueprint JSON to canonical .nls text.
   */
  public static decompile(
    jsonSource: string,
    options: SerializerOptions = {}
  ): string {
    const graph = JSON.parse(jsonSource) as BlueprintGraph;
    return NodeScriptSerializer.serialize(graph, options);
  }

  /**
   * Computes a semantic diff between two .nls source texts.
   */
  public static diff(sourceA: string, sourceB: string): NodeScriptDiffResult {
    const graphA = NodeScriptParser.parse(sourceA, { autoLayout: false });
    const graphB = NodeScriptParser.parse(sourceB, { autoLayout: false });

    const nodesA = graphA.nodes || {};
    const nodesB = graphB.nodes || {};

    const addedNodes: string[] = [];
    const removedNodes: string[] = [];
    const modifiedNodes: Array<{ id: string; changes: string[] }> = [];

    // Compare Nodes
    for (const id of Object.keys(nodesB)) {
      if (!nodesA[id]) {
        addedNodes.push(id);
      } else {
        const nodeA = nodesA[id];
        const nodeB = nodesB[id];
        const changes: string[] = [];

        if (nodeA.type !== nodeB.type) {
          changes.push(`Type changed: ${nodeA.type} -> ${nodeB.type}`);
        }
        if (JSON.stringify(nodeA.customParams) !== JSON.stringify(nodeB.customParams)) {
          changes.push(`Parameters modified`);
        }
        if (
          nodeA.position.x !== nodeB.position.x ||
          nodeA.position.y !== nodeB.position.y
        ) {
          changes.push(
            `Position changed: (${nodeA.position.x}, ${nodeA.position.y}) -> (${nodeB.position.x}, ${nodeB.position.y})`
          );
        }

        if (changes.length > 0) {
          modifiedNodes.push({ id, changes });
        }
      }
    }

    for (const id of Object.keys(nodesA)) {
      if (!nodesB[id]) {
        removedNodes.push(id);
      }
    }

    // Compare Wires
    const wireKey = (w: {
      sourceNodeId: string;
      sourcePinId: string;
      targetNodeId: string;
      targetPinId: string;
    }) => `${w.sourceNodeId}.${w.sourcePinId}->${w.targetNodeId}.${w.targetPinId}`;

    const wiresA = new Map(graphA.wires.map((w) => [wireKey(w), w]));
    const wiresB = new Map(graphB.wires.map((w) => [wireKey(w), w]));

    const addedWires: string[] = [];
    const removedWires: string[] = [];
    const modifiedWires: Array<{ id: string; changes: string[] }> = [];

    for (const [key, wireB] of wiresB.entries()) {
      if (!wiresA.has(key)) {
        addedWires.push(key);
      } else {
        const wireA = wiresA.get(key)!;
        const whenA = (wireA as unknown as Record<string, unknown>)["when"];
        const whenB = (wireB as unknown as Record<string, unknown>)["when"];
        if (whenA !== whenB) {
          modifiedWires.push({
            id: key,
            changes: [`Guard condition changed: ${whenA ?? "none"} -> ${whenB ?? "none"}`],
          });
        }
      }
    }

    for (const key of wiresA.keys()) {
      if (!wiresB.has(key)) {
        removedWires.push(key);
      }
    }

    // Compare Variables
    const varsA = new Map((graphA.variables || []).map((v) => [v.name, v]));
    const varsB = new Map((graphB.variables || []).map((v) => [v.name, v]));

    const addedVariables: string[] = [];
    const removedVariables: string[] = [];

    for (const name of varsB.keys()) {
      if (!varsA.has(name)) addedVariables.push(name);
    }
    for (const name of varsA.keys()) {
      if (!varsB.has(name)) removedVariables.push(name);
    }

    const hasChanges =
      addedNodes.length > 0 ||
      removedNodes.length > 0 ||
      modifiedNodes.length > 0 ||
      addedWires.length > 0 ||
      removedWires.length > 0 ||
      modifiedWires.length > 0 ||
      addedVariables.length > 0 ||
      removedVariables.length > 0;

    // Build human-readable formatted summary
    const summaryLines: string[] = [];
    summaryLines.push(`Graph Diff: ${graphA.name} <-> ${graphB.name}`);
    if (!hasChanges) {
      summaryLines.push("  (No semantic changes detected)");
    } else {
      if (addedNodes.length > 0) {
        summaryLines.push(`  + Added Nodes (${addedNodes.length}): ${addedNodes.join(", ")}`);
      }
      if (removedNodes.length > 0) {
        summaryLines.push(`  - Removed Nodes (${removedNodes.length}): ${removedNodes.join(", ")}`);
      }
      if (modifiedNodes.length > 0) {
        summaryLines.push(`  ~ Modified Nodes (${modifiedNodes.length}):`);
        for (const m of modifiedNodes) {
          summaryLines.push(`      * ${m.id}: ${m.changes.join("; ")}`);
        }
      }
      if (addedWires.length > 0) {
        summaryLines.push(`  + Added Wires (${addedWires.length}): ${addedWires.join(", ")}`);
      }
      if (removedWires.length > 0) {
        summaryLines.push(`  - Removed Wires (${removedWires.length}): ${removedWires.join(", ")}`);
      }
      if (modifiedWires.length > 0) {
        summaryLines.push(`  ~ Modified Wires (${modifiedWires.length}):`);
        for (const mw of modifiedWires) {
          summaryLines.push(`      * ${mw.id}: ${mw.changes.join("; ")}`);
        }
      }
      if (addedVariables.length > 0) {
        summaryLines.push(`  + Added Variables: ${addedVariables.join(", ")}`);
      }
      if (removedVariables.length > 0) {
        summaryLines.push(`  - Removed Variables: ${removedVariables.join(", ")}`);
      }
    }

    return {
      hasChanges,
      addedNodes,
      removedNodes,
      modifiedNodes,
      addedWires,
      removedWires,
      modifiedWires,
      addedVariables,
      removedVariables,
      formattedSummary: summaryLines.join("\n"),
    };
  }

  /**
   * Validates .nls source text for syntax and type errors.
   */
  public static validate(sourceText: string): {
    isValid: boolean;
    diagnostics: LanguageDiagnostic[];
  } {
    const diagnostics = NodeScriptLanguageServer.validateDocument(sourceText, {
      emitDiagnostics: false,
    });
    return {
      isValid: diagnostics.length === 0,
      diagnostics,
    };
  }

  /**
   * Main CLI entry point.
   */
  public static async run(argv: string[]): Promise<number> {
    const args = argv.slice(2);
    const command = args[0];

    if (!command || command === "--help" || command === "-h") {
      console.log(`
NodeScript CLI - AI-Native Logic Blueprint Tooling
Usage:
  nodescript compile <file.nls> [-o output.bp.json]
  nodescript decompile <file.bp.json> [-o output.nls]
  nodescript diff <a.nls> <b.nls>
  nodescript validate <file.nls>
`);
      return 0;
    }

    if (command === "compile") {
      const inputPath = args[1];
      if (!inputPath) {
        console.error("Error: Please specify an input .nls file.");
        return 1;
      }
      const source = fs.readFileSync(path.resolve(inputPath), "utf-8");
      const compiled = this.compile(source);

      const outFlagIdx = args.indexOf("-o");
      if (outFlagIdx !== -1 && args[outFlagIdx + 1]) {
        const outputPath = path.resolve(args[outFlagIdx + 1]);
        fs.writeFileSync(outputPath, compiled, "utf-8");
        console.log(`Compiled '${inputPath}' -> '${outputPath}'`);
      } else {
        console.log(compiled);
      }
      return 0;
    }

    if (command === "decompile") {
      const inputPath = args[1];
      if (!inputPath) {
        console.error("Error: Please specify an input .bp.json file.");
        return 1;
      }
      const json = fs.readFileSync(path.resolve(inputPath), "utf-8");
      const decompiled = this.decompile(json);

      const outFlagIdx = args.indexOf("-o");
      if (outFlagIdx !== -1 && args[outFlagIdx + 1]) {
        const outputPath = path.resolve(args[outFlagIdx + 1]);
        fs.writeFileSync(outputPath, decompiled, "utf-8");
        console.log(`Decompiled '${inputPath}' -> '${outputPath}'`);
      } else {
        console.log(decompiled);
      }
      return 0;
    }

    if (command === "diff") {
      const fileA = args[1];
      const fileB = args[2];
      if (!fileA || !fileB) {
        console.error("Error: Please specify both fileA.nls and fileB.nls for diffing.");
        return 1;
      }
      const sourceA = fs.readFileSync(path.resolve(fileA), "utf-8");
      const sourceB = fs.readFileSync(path.resolve(fileB), "utf-8");
      const diffResult = this.diff(sourceA, sourceB);
      console.log(diffResult.formattedSummary);
      return diffResult.hasChanges ? 1 : 0;
    }

    if (command === "validate") {
      const inputPath = args[1];
      if (!inputPath) {
        console.error("Error: Please specify an input .nls file.");
        return 1;
      }
      const source = fs.readFileSync(path.resolve(inputPath), "utf-8");
      const { isValid, diagnostics } = this.validate(source);

      if (isValid) {
        console.log(`✓ '${inputPath}' is valid with 0 errors.`);
        return 0;
      } else {
        console.error(`✗ Validation failed for '${inputPath}' with ${diagnostics.length} error(s):`);
        for (const d of diagnostics) {
          console.error(`  [${d.code}] Line ${d.range.start.line}: ${d.message}`);
          if (d.suggestion) console.error(`    ↳ Suggestion: ${d.suggestion}`);
        }
        return 1;
      }
    }

    console.error(`Unknown command '${command}'. Run 'nodescript --help' for usage.`);
    return 1;
  }
}

// Auto-run if executed directly via CLI
if (typeof require !== "undefined" && require.main === module) {
  NodeScriptCLI.run(process.argv).then((code) => {
    process.exit(code);
  });
}
