"use client";

/**
 * ============================================================================
 * LOGIC FLOW EMITTER (BLUEPRINT DAG TO ASYNC TYPESCRIPT BUSINESS LOGIC)
 * ============================================================================
 * Compiles visual Blueprint graphs into clean, type-safe, human-readable
 * async TypeScript business logic functions with full control flow.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.2 & DETAILED_ROADMAP.md §19.1
 * ============================================================================
 */

import {
  BlueprintGraph,
  BlueprintNodeInstance,
  BlueprintWire,
  BlueprintVariable,
} from "@/core/ast/ASTManager";
import { LogicFlowEmitterOptions, EmittedFile } from "@/core/types/compiler";

/** Older saved graphs used `typeId` on nodes, array-shaped `nodes`, and `connections` for wires. */
type LegacyBlueprintNode = BlueprintNodeInstance & { typeId?: string };
type LegacyBlueprintGraph = BlueprintGraph & { connections?: BlueprintWire[] };

export class LogicFlowEmitter {
  /**
   * Sanitizes graph name to a clean PascalCase or camelCase function name.
   */
  public static toFunctionName(name: string): string {
    const words = name
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .filter(Boolean);
    if (words.length === 0) return "executeFlow";

    const first = words[0].charAt(0).toLowerCase() + words[0].slice(1);
    const rest = words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
    return first + rest;
  }

  /**
   * Safely retrieves a node instance from a graph whether nodes is a Map or an Array.
   */
  public static getNode(graph: BlueprintGraph, nodeId: string): BlueprintNodeInstance | undefined {
    if (!graph || !graph.nodes) return undefined;
    if (Array.isArray(graph.nodes)) {
      return (graph.nodes as unknown as LegacyBlueprintNode[]).find((n) => n?.id === nodeId);
    }
    return graph.nodes[nodeId];
  }

  /**
   * Safely retrieves the list of wires from a graph.
   */
  public static getWires(graph: BlueprintGraph): BlueprintWire[] {
    if (!graph) return [];
    if (Array.isArray(graph.wires)) return graph.wires;
    const { connections } = graph as LegacyBlueprintGraph;
    if (Array.isArray(connections)) return connections;
    return [];
  }

  /**
   * Generates a safe variable name for a node's output.
   */
  public static getNodeVarName(node: BlueprintNodeInstance): string {
    const rawType = node?.type || (node as LegacyBlueprintNode)?.typeId || "node";
    const cleanType = rawType.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const shortId = (node?.id || "unknown").replace(/[^a-zA-Z0-9]/g, "").substring(0, 6);
    return `${cleanType}_${shortId}`;
  }

  /**
   * Resolves the code expression for a specific input pin of a target node.
   */
  public static resolveInputExpression(
    targetNodeId: string,
    targetPinId: string,
    graph: BlueprintGraph,
    nodeVarMap: Map<string, string>
  ): string {
    const targetNode = LogicFlowEmitter.getNode(graph, targetNodeId);
    if (!targetNode) return "undefined";

    const wires = LogicFlowEmitter.getWires(graph);

    // 1. Check if there is an incoming data wire connected to this pin
    const wire = wires.find(
      (w) => w.targetNodeId === targetNodeId && w.targetPinId === targetPinId && !w.isExec
    );

    if (wire) {
      const sourceVar = nodeVarMap.get(wire.sourceNodeId);
      if (sourceVar) {
        return sourceVar;
      }
    }

    // 2. Check literal pin value
    if (targetNode.pinValues && targetNode.pinValues[targetPinId] !== undefined) {
      const val = targetNode.pinValues[targetPinId];
      if (typeof val === "string") return JSON.stringify(val);
      if (typeof val === "number" || typeof val === "boolean") return String(val);
      if (val === null) return "null";
      try {
        return JSON.stringify(val);
      } catch {
        return "undefined";
      }
    }

    // 3. Fallback sensible default based on pin name
    const pinName = targetPinId.toLowerCase();
    if (pinName.includes("num") || pinName.includes("count") || pinName.includes("amount")) {
      return "0";
    }
    if (pinName.includes("bool") || pinName.includes("condition")) {
      return "false";
    }
    if (pinName.includes("str") || pinName.includes("text") || pinName.includes("url")) {
      return '""';
    }
    return "undefined";
  }

  /**
   * Compiles an execution sub-tree starting from a given node along execution wires.
   */
  public static emitExecutionSequence(
    currentNodeId: string,
    graph: BlueprintGraph,
    nodeVarMap: Map<string, string>,
    visitedNodes: Set<string>,
    indentDepth: number = 2
  ): string[] {
    if (visitedNodes.has(currentNodeId)) {
      return [];
    }
    visitedNodes.add(currentNodeId);

    const node = LogicFlowEmitter.getNode(graph, currentNodeId);
    if (!node) return [];

    const wires = LogicFlowEmitter.getWires(graph);
    const indent = " ".repeat(indentDepth * 2);
    const lines: string[] = [];
    const varName = LogicFlowEmitter.getNodeVarName(node);
    nodeVarMap.set(node.id, varName);

    const nodeType = (node.type || (node as LegacyBlueprintNode).typeId || "").toLowerCase();

    // 1. Branch / Condition Node
    if (nodeType.includes("branch") || nodeType === "flow/branch") {
      const conditionExpr = LogicFlowEmitter.resolveInputExpression(
        node.id,
        "condition",
        graph,
        nodeVarMap
      );

      lines.push(`${indent}// [Branch: ${node.title || node.id}]`);
      lines.push(`${indent}if (${conditionExpr}) {`);

      // Find wire from "true" exec pin
      const trueWire = wires.find(
        (w) => w.sourceNodeId === node.id && (w.sourcePinId === "true" || w.sourcePinId === "then")
      );
      if (trueWire) {
        const trueLines = LogicFlowEmitter.emitExecutionSequence(
          trueWire.targetNodeId,
          graph,
          nodeVarMap,
          visitedNodes,
          indentDepth + 1
        );
        lines.push(trueLines.join("\n"));
      }

      lines.push(`${indent}} else {`);

      // Find wire from "false" exec pin
      const falseWire = wires.find(
        (w) => w.sourceNodeId === node.id && w.sourcePinId === "false"
      );
      if (falseWire) {
        const falseLines = LogicFlowEmitter.emitExecutionSequence(
          falseWire.targetNodeId,
          graph,
          nodeVarMap,
          visitedNodes,
          indentDepth + 1
        );
        lines.push(falseLines.join("\n"));
      }

      lines.push(`${indent}}`);
      return lines;
    }

    // 2. Math Operations
    if (nodeType.startsWith("math/")) {
      const a = LogicFlowEmitter.resolveInputExpression(node.id, "a", graph, nodeVarMap);
      const b = LogicFlowEmitter.resolveInputExpression(node.id, "b", graph, nodeVarMap);
      let op = "+";
      if (nodeType.includes("subtract")) op = "-";
      else if (nodeType.includes("multiply")) op = "*";
      else if (nodeType.includes("divide")) op = "/";
      else if (nodeType.includes("modulo")) op = "%";

      lines.push(`${indent}const ${varName} = (${a}) ${op} (${b});`);
    }

    // 3. String Operations
    else if (nodeType.startsWith("string/")) {
      if (nodeType.includes("concat")) {
        const strA = LogicFlowEmitter.resolveInputExpression(node.id, "a", graph, nodeVarMap);
        const strB = LogicFlowEmitter.resolveInputExpression(node.id, "b", graph, nodeVarMap);
        lines.push(`${indent}const ${varName} = String(${strA}) + String(${strB});`);
      } else {
        lines.push(`${indent}const ${varName} = "";`);
      }
    }

    // 4. Database Operations
    else if (nodeType.startsWith("db/")) {
      const collection = String(node.customParams?.collection || "Record");
      const colLower = collection.charAt(0).toLowerCase() + collection.slice(1);

      if (nodeType.includes("find_many") || nodeType.includes("query")) {
        lines.push(`${indent}const ${varName} = await prisma.${colLower}.findMany();`);
      } else if (nodeType.includes("find_by_id")) {
        const idExpr = LogicFlowEmitter.resolveInputExpression(node.id, "id", graph, nodeVarMap);
        lines.push(
          `${indent}const ${varName} = await prisma.${colLower}.findUnique({ where: { id: ${idExpr} } });`
        );
      } else if (nodeType.includes("create") || nodeType.includes("insert")) {
        const dataExpr = LogicFlowEmitter.resolveInputExpression(node.id, "data", graph, nodeVarMap);
        lines.push(
          `${indent}const ${varName} = await prisma.${colLower}.create({ data: ${dataExpr} });`
        );
      } else if (nodeType.includes("delete")) {
        const idExpr = LogicFlowEmitter.resolveInputExpression(node.id, "id", graph, nodeVarMap);
        lines.push(
          `${indent}const ${varName} = await prisma.${colLower}.delete({ where: { id: ${idExpr} } });`
        );
      }
    }

    // 5. API / Network Fetch Operations
    else if (nodeType.startsWith("api/") || nodeType.includes("fetch")) {
      const urlExpr = LogicFlowEmitter.resolveInputExpression(node.id, "url", graph, nodeVarMap);
      lines.push(`${indent}const ${varName}Res = await fetch(${urlExpr});`);
      lines.push(`${indent}const ${varName} = await ${varName}Res.json();`);
    }

    // 6. Return Node
    else if (nodeType.includes("return") || nodeType === "flow/return") {
      const valExpr = LogicFlowEmitter.resolveInputExpression(node.id, "value", graph, nodeVarMap);
      lines.push(`${indent}return ${valExpr};`);
      return lines; // Return halts further sequence along this branch
    }

    // 7. Event Entry or Generic Node
    else if (nodeType.startsWith("event/")) {
      lines.push(`${indent}// Event Trigger: ${node.title || node.type}`);
    }

    // Follow outgoing execution wires
    const outgoingExecWires = wires.filter(
      (w) => w.sourceNodeId === node.id && (w.isExec || w.sourcePinId === "exec" || w.sourcePinId === "then")
    );

    for (const wire of outgoingExecWires) {
      const nextLines = LogicFlowEmitter.emitExecutionSequence(
        wire.targetNodeId,
        graph,
        nodeVarMap,
        visitedNodes,
        indentDepth
      );
      if (nextLines.length > 0) {
        lines.push(nextLines.join("\n"));
      }
    }

    return lines;
  }

  /**
   * Compiles a BlueprintGraph into a complete async TypeScript logic file.
   */
  public static emitLogicFlow(
    graph: BlueprintGraph,
    options?: LogicFlowEmitterOptions
  ): EmittedFile {
    const fnName = LogicFlowEmitter.toFunctionName(graph.name);
    const prismaPath = options?.prismaImportPath || "@/lib/prisma";
    const useTryCatch = options?.errorHandling !== "propagate";

    const lines: string[] = [];

    // Header
    lines.push("/* ==========================================================================");
    lines.push(` * LOGIC FLOW: ${graph.name} (${graph.type})`);
    lines.push(" * LazyLayout Compiler — Async TypeScript Engine");
    lines.push(" * ========================================================================== */");
    lines.push("");

    // Safely extract node list and wire list whether array or object map
    const nodeList: LegacyBlueprintNode[] = Array.isArray(graph.nodes)
      ? (graph.nodes as unknown as LegacyBlueprintNode[])
      : Object.values(graph.nodes || {});
    const wireList = LogicFlowEmitter.getWires(graph);

    // Imports
    const hasDbNode = nodeList.some((n) => {
      const typeStr = (n?.type || n?.typeId || "").toLowerCase();
      return typeStr.startsWith("db/");
    });
    if (hasDbNode) {
      lines.push(`import { prisma } from "${prismaPath}";`);
      lines.push("");
    }

    // Function Declaration
    lines.push("/**");
    lines.push(` * Auto-generated async execution flow for ${graph.name}.`);
    lines.push(" */");
    lines.push(`export async function ${fnName}(params: Record<string, unknown> = {}): Promise<unknown> {`);

    const nodeVarMap = new Map<string, string>();
    const visitedNodes = new Set<string>();

    // Locate entry point nodes (event nodes or root nodes without incoming exec wires)
    const entryNodes = nodeList.filter((node) => {
      const typeStr = (node?.type || node?.typeId || "").toLowerCase();
      if (typeStr.startsWith("event/")) return true;
      const hasIncomingExec = wireList.some(
        (w) => w.targetNodeId === node.id && (w.isExec || w.targetPinId === "exec")
      );
      return !hasIncomingExec;
    });

    const startNode = entryNodes[0] || nodeList[0];

    let bodyLines: string[] = [];
    if (startNode) {
      bodyLines = LogicFlowEmitter.emitExecutionSequence(
        startNode.id,
        graph,
        nodeVarMap,
        visitedNodes,
        useTryCatch ? 2 : 1
      );
    }

    if (useTryCatch) {
      lines.push("  try {");
      lines.push(bodyLines.join("\n"));
      lines.push("  } catch (error: any) {");
      lines.push(`    console.error("[LogicFlow:${fnName}] Execution failed:", error);`);
      lines.push("    throw error;");
      lines.push("  }");
    } else {
      lines.push(bodyLines.join("\n"));
    }

    lines.push("}");
    lines.push("");

    return {
      path: `server/logic/${fnName}.ts`,
      content: lines.join("\n"),
      language: "typescript",
      type: "logic",
    };
  }
}
