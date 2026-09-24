/**
 * ============================================================================
 * NODESCRIPT DETERMINISTIC RANDOM GRAPH GENERATOR
 * ============================================================================
 * Architecture Ref: Detailed Roadmap.md §Sub-Phase 5.2
 *
 * Generates realistic, valid BlueprintGraph instances using a seeded PRNG.
 * Used for property-based round-trip verification across 50 corpus graphs to
 * enforce the AI-Native Parity Law.
 * ============================================================================
 */

import {
  BlueprintGraph,
  BlueprintNodeInstance,
  BlueprintVariable,
  BlueprintWire,
} from "@/core/ast/ASTManager";

export class GraphGenerator {
  /**
   * Mulberry32 32-bit seeded pseudo-random number generator.
   */
  private static createRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Generates a deterministic valid random graph from an integer seed.
   */
  public static generateRandomGraph(seed: number): BlueprintGraph {
    const rng = this.createRng(seed);

    const graphTypes: Array<"event" | "function" | "macro"> = [
      "event",
      "function",
      "macro",
    ];
    const graphType = graphTypes[Math.floor(rng() * graphTypes.length)];
    const graphName = `Graph_${seed}_${Math.floor(rng() * 1000)}`;

    const graph: BlueprintGraph = {
      id: `graph_${graphName.toLowerCase()}`,
      name: graphName,
      type: graphType,
      nodes: {},
      wires: [],
      variables: [],
      metadata: {
        schemaVersion: "1.0.0",
        updatedAt: new Date().toISOString(),
      },
    };

    // 1. Generate 1 to 3 Variables
    const varCount = 1 + Math.floor(rng() * 3);
    for (let v = 0; v < varCount; v++) {
      const vType = rng() > 0.6 ? "string" : rng() > 0.3 ? "number" : "boolean";
      let defaultValue: unknown;
      if (vType === "string") defaultValue = `init_val_${v}`;
      else if (vType === "number") defaultValue = Math.floor(rng() * 100);
      else defaultValue = rng() > 0.5;

      const variable: BlueprintVariable = {
        id: `var_prop_${v}`,
        name: `prop_${v}`,
        type: vType,
        defaultValue,
        category: "Default",
        isPublic: true,
      };
      graph.variables.push(variable);
    }

    // 2. Generate 3 to 7 Nodes
    const nodeTemplates = [
      { type: "Event.onClick", title: "onClick", outPins: ["exec", "target"] },
      { type: "Event.onLoad", title: "onLoad", outPins: ["exec"] },
      { type: "Math.add", title: "add", outPins: ["exec", "result"] },
      { type: "Math.multiply", title: "multiply", outPins: ["exec", "result"] },
      { type: "Utility.regexTest", title: "regexTest", outPins: ["exec", "result"] },
      { type: "Database.query", title: "query", outPins: ["exec", "data"] },
      { type: "Variables.set", title: "set", outPins: ["exec"] },
      { type: "Navigation.push", title: "push", outPins: ["exec"] },
    ];

    const nodeCount = 3 + Math.floor(rng() * 5);
    const nodeIds: string[] = [];

    for (let n = 0; n < nodeCount; n++) {
      const template = nodeTemplates[Math.floor(rng() * nodeTemplates.length)];
      const nodeId = `node_${n}`;
      nodeIds.push(nodeId);

      // Generate custom parameters
      const customParams: Record<string, unknown> = {};
      if (template.type.startsWith("Math")) {
        customParams["a"] = Math.floor(rng() * 50);
        customParams["b"] = Math.floor(rng() * 50);
      } else if (template.type === "Utility.regexTest") {
        customParams["pattern"] = "^[a-z]+$";
      } else if (template.type === "Navigation.push") {
        customParams["route"] = `/page_${n}`;
      } else if (template.type === "Database.query") {
        customParams["table"] = `Table_${n}`;
      }

      const posX = 100 + Math.floor(n / 2) * 300;
      const posY = 100 + (n % 2) * 180;

      const nodeInstance: BlueprintNodeInstance = {
        id: nodeId,
        type: template.type,
        title: template.title,
        position: { x: posX, y: posY },
        customParams,
        pinValues: customParams,
      };

      graph.nodes[nodeId] = nodeInstance;
    }

    // 3. Generate Wires in Sequential Flow
    for (let w = 0; w < nodeIds.length - 1; w++) {
      const srcId = nodeIds[w];
      const tgtId = nodeIds[w + 1];

      const isGuarded = rng() > 0.7;
      const when = isGuarded ? `result_${w} == true` : undefined;

      const wire: BlueprintWire = {
        id: `wire_${srcId}_exec_${tgtId}_exec`,
        sourceNodeId: srcId,
        sourcePinId: "exec",
        targetNodeId: tgtId,
        targetPinId: "exec",
        pinType: "exec",
        isExec: true,
      };

      if (when) {
        (wire as unknown as Record<string, unknown>)["when"] = when;
      }

      graph.wires.push(wire);
    }

    return graph;
  }
}
