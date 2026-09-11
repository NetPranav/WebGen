/**
 * ============================================================================
 * LOGIC BLUEPRINT GRAPH AST MANAGER & SERIALIZER
 * ============================================================================
 * Manages graph AST CRUD operations, wire connections, literal pin values,
 * variables, and `.bp.json` serialization round-tripping.
 *
 * Architecture Ref: ROADMAP.md §Sub-Phase 3.3 & 3.5
 * ============================================================================
 */

import { PinDataType, getNodeDefinition } from "@/core/types/node-registry";
import { TypeChecker } from "./TypeChecker";
import { DAGSorter } from "./DAGSorter";

export interface BlueprintNodeInstance {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  customParams?: Record<string, unknown>;
  pinValues?: Record<string, unknown>; // Unconnected literal input pin values
}

export interface BlueprintWire {
  id: string;
  sourceNodeId: string;
  sourcePinId: string;
  targetNodeId: string;
  targetPinId: string;
  pinType: PinDataType;
  isExec?: boolean;
}

export interface BlueprintVariable {
  id: string;
  name: string;
  type: "boolean" | "number" | "string" | "object" | "array";
  defaultValue: unknown;
  category?: string;
  isPublic?: boolean;
  description?: string;
}

export interface BlueprintGraph {
  id: string;
  name: string;
  type: "event" | "function" | "macro";
  nodes: Record<string, BlueprintNodeInstance>;
  wires: BlueprintWire[];
  variables: BlueprintVariable[];
  metadata?: {
    schemaVersion: string;
    description?: string;
    updatedAt?: string;
  };
}

export interface BlueprintValidationIssue {
  id: string;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  nodeId?: string;
  pinId?: string;
}

export interface GraphValidationResult {
  isValid: boolean;
  issues: BlueprintValidationIssue[];
}

export class ASTManager {
  public static readonly SCHEMA_VERSION = "1.0.0";

  /**
   * Factory function to create an empty Blueprint graph
   */
  public static createGraph(
    id: string,
    name: string,
    type: "event" | "function" | "macro" = "event"
  ): BlueprintGraph {
    return {
      id,
      name,
      type,
      nodes: {},
      wires: [],
      variables: [],
      metadata: {
        schemaVersion: ASTManager.SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Adds a new node instance to a graph
   */
  public static addNode(
    graph: BlueprintGraph,
    type: string,
    position: { x: number; y: number },
    customParams?: Record<string, unknown>
  ): { graph: BlueprintGraph; node: BlueprintNodeInstance } {
    const def = getNodeDefinition(type);
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const title = def ? def.title : type;

    // Seed default literal values for input pins
    const defaultPinValues: Record<string, unknown> = {};
    if (def) {
      def.inputs.forEach((p) => {
        if (p.defaultValue !== undefined) {
          defaultPinValues[p.id] = p.defaultValue;
        }
      });
    }

    const newNode: BlueprintNodeInstance = {
      id: nodeId,
      type,
      title,
      position,
      customParams: customParams || {},
      pinValues: defaultPinValues,
    };

    const updatedGraph: BlueprintGraph = {
      ...graph,
      nodes: {
        ...graph.nodes,
        [nodeId]: newNode,
      },
      metadata: {
        ...graph.metadata,
        schemaVersion: ASTManager.SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      },
    };

    return { graph: updatedGraph, node: newNode };
  }

  /**
   * Removes a node and all attached wires from a graph
   */
  public static removeNode(
    graph: BlueprintGraph,
    nodeId: string
  ): BlueprintGraph {
    const { [nodeId]: removed, ...remainingNodes } = graph.nodes;
    const remainingWires = graph.wires.filter(
      (w) => w.sourceNodeId !== nodeId && w.targetNodeId !== nodeId
    );

    return {
      ...graph,
      nodes: remainingNodes,
      wires: remainingWires,
      metadata: {
        ...graph.metadata,
        schemaVersion: ASTManager.SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Repositions a node on the canvas
   */
  public static moveNode(
    graph: BlueprintGraph,
    nodeId: string,
    position: { x: number; y: number }
  ): BlueprintGraph {
    const node = graph.nodes[nodeId];
    if (!node) return graph;

    return {
      ...graph,
      nodes: {
        ...graph.nodes,
        [nodeId]: {
          ...node,
          position: {
            x: Math.round(position.x),
            y: Math.round(position.y),
          },
        },
      },
    };
  }

  /**
   * Connects an output pin to an input pin with type checking
   */
  public static connectPins(
    graph: BlueprintGraph,
    sourceNodeId: string,
    sourcePinId: string,
    targetNodeId: string,
    targetPinId: string
  ): { graph: BlueprintGraph; wire?: BlueprintWire; error?: string } {
    const sourceNode = graph.nodes[sourceNodeId];
    const targetNode = graph.nodes[targetNodeId];
    if (!sourceNode || !targetNode) {
      return { graph, error: "Source or Target node not found in graph." };
    }

    const sourceDef = getNodeDefinition(sourceNode.type);
    const targetDef = getNodeDefinition(targetNode.type);
    if (!sourceDef || !targetDef) {
      return { graph, error: "Node definition not found in registry." };
    }

    const sourcePin = sourceDef.outputs.find((p) => p.id === sourcePinId);
    const targetPin = targetDef.inputs.find((p) => p.id === targetPinId);
    if (!sourcePin || !targetPin) {
      return { graph, error: "Specified pin IDs not found on node definitions." };
    }

    // Perform strict type check
    const check = TypeChecker.validateWireConnection({
      sourceNodeId,
      sourcePin,
      targetNodeId,
      targetPin,
    });

    if (!check.isValid) {
      return { graph, error: check.error || "Pin type mismatch." };
    }

    // Remove existing wire on input pin (input pins take at most 1 connection)
    const filteredWires = graph.wires.filter(
      (w) => !(w.targetNodeId === targetNodeId && w.targetPinId === targetPinId)
    );

    const newWire: BlueprintWire = {
      id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceNodeId,
      sourcePinId,
      targetNodeId,
      targetPinId,
      pinType: sourcePin.type,
      isExec: sourcePin.type === "exec",
    };

    const updatedGraph: BlueprintGraph = {
      ...graph,
      wires: [...filteredWires, newWire],
      metadata: {
        ...graph.metadata,
        schemaVersion: ASTManager.SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      },
    };

    return { graph: updatedGraph, wire: newWire };
  }

  /**
   * Disconnects a specific wire by ID
   */
  public static disconnectWire(
    graph: BlueprintGraph,
    wireId: string
  ): BlueprintGraph {
    return {
      ...graph,
      wires: graph.wires.filter((w) => w.id !== wireId),
    };
  }

  /**
   * Updates an unconnected literal pin value
   */
  public static setPinLiteralValue(
    graph: BlueprintGraph,
    nodeId: string,
    pinId: string,
    value: unknown
  ): BlueprintGraph {
    const node = graph.nodes[nodeId];
    if (!node) return graph;

    return {
      ...graph,
      nodes: {
        ...graph.nodes,
        [nodeId]: {
          ...node,
          pinValues: {
            ...node.pinValues,
            [pinId]: value,
          },
        },
      },
    };
  }

  /**
   * Adds a variable to the graph
   */
  public static addVariable(
    graph: BlueprintGraph,
    variable: Omit<BlueprintVariable, "id">
  ): { graph: BlueprintGraph; variable: BlueprintVariable } {
    const newVar: BlueprintVariable = {
      ...variable,
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    const updatedGraph: BlueprintGraph = {
      ...graph,
      variables: [...graph.variables, newVar],
    };

    return { graph: updatedGraph, variable: newVar };
  }

  /**
   * Updates an existing variable
   */
  public static updateVariable(
    graph: BlueprintGraph,
    varId: string,
    updates: Partial<BlueprintVariable>
  ): BlueprintGraph {
    return {
      ...graph,
      variables: graph.variables.map((v) =>
        v.id === varId ? { ...v, ...updates } : v
      ),
    };
  }

  /**
   * Deletes a variable from the graph
   */
  public static removeVariable(
    graph: BlueprintGraph,
    varId: string
  ): BlueprintGraph {
    return {
      ...graph,
      variables: graph.variables.filter((v) => v.id !== varId),
    };
  }

  /**
   * Validates an entire Blueprint graph for compilation issues
   */
  public static validateGraph(graph: BlueprintGraph): {
    isValid: boolean;
    issues: BlueprintValidationIssue[];
  } {
    const issues: BlueprintValidationIssue[] = [];

    // 1. Check for cycles
    const sortResult = DAGSorter.sortGraph(graph.nodes, graph.wires, {
      execOnly: true,
      silent: true,
    });
    if (sortResult.hasCycle) {
      issues.push({
        id: `cycle_${Date.now()}`,
        severity: "error",
        code: "[GRAPH_CYCLE_ERR]",
        message: sortResult.error || "Circular execution loop detected.",
        nodeId: sortResult.cycleNodes?.[0],
      });
    }

    // 2. Check for unlinked execution pins on nodes
    Object.values(graph.nodes).forEach((node) => {
      const def = getNodeDefinition(node.type);
      if (!def) {
        issues.push({
          id: `unknown_${node.id}`,
          severity: "error",
          code: "[UNKNOWN_NODE]",
          message: `Node type '${node.type}' is not recognized in registry.`,
          nodeId: node.id,
        });
        return;
      }

      // Check required input connections
      def.inputs.forEach((inputPin) => {
        if (inputPin.isConnectionRequired) {
          const isConnected = graph.wires.some(
            (w) => w.targetNodeId === node.id && w.targetPinId === inputPin.id
          );
          if (!isConnected) {
            issues.push({
              id: `req_${node.id}_${inputPin.id}`,
              severity: "warning",
              code: "[UNCONNECTED_REQUIRED_PIN]",
              message: `Required pin '${inputPin.label}' on node '${node.title}' is not connected.`,
              nodeId: node.id,
              pinId: inputPin.id,
            });
          }
        }
      });
    });

    const hasErrors = issues.some((i) => i.severity === "error");
    return { isValid: !hasErrors, issues };
  }

  /**
   * Serializes a BlueprintGraph to formatted JSON string (.bp.json)
   */
  public static serializeGraphToJson(graph: BlueprintGraph): string {
    const payload = {
      $schema: "https://visualwebappengine.io/schemas/blueprint-v1.json",
      schemaVersion: ASTManager.SCHEMA_VERSION,
      id: graph.id,
      name: graph.name,
      type: graph.type,
      nodes: graph.nodes,
      wires: graph.wires,
      variables: graph.variables,
      metadata: {
        ...graph.metadata,
        exportedAt: new Date().toISOString(),
      },
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Deserializes a JSON string to BlueprintGraph with schema validation
   */
  public static deserializeJsonToGraph(jsonString: string): BlueprintGraph {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid JSON: Payload must be an object.");
      }

      return {
        id: parsed.id || `bp_${Date.now()}`,
        name: parsed.name || "ImportedGraph",
        type: parsed.type || "event",
        nodes: parsed.nodes || {},
        wires: Array.isArray(parsed.wires) ? parsed.wires : [],
        variables: Array.isArray(parsed.variables) ? parsed.variables : [],
        metadata: {
          schemaVersion: parsed.schemaVersion || ASTManager.SCHEMA_VERSION,
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      throw new Error(`Failed to parse Blueprint JSON: ${(err as Error).message}`);
    }
  }
}
