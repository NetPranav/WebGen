import { describe, it } from "node:test";
import assert from "node:assert";
import {
  BUILTIN_NODES,
  getNodeDefinition,
  getNodesByCategory,
  getAllNodeCategories,
  searchNodeDefinitions,
  getPinColor,
} from "@/core/types/node-registry";
import { TypeChecker } from "@/core/ast/TypeChecker";
import { DAGSorter } from "@/core/ast/DAGSorter";
import { ASTManager, BlueprintGraph } from "@/core/ast/ASTManager";

describe("Sub-Phase 3.1: Node Type Registry & Catalog", () => {
  it("Built-in nodes catalog is properly populated with typed pins", () => {
    const categories = getAllNodeCategories();
    assert.strictEqual(categories.length, 8);
    assert.ok(categories.includes("Events"));
    assert.ok(categories.includes("Flow Control"));
    assert.ok(categories.includes("Database"));
    assert.ok(categories.includes("API"));

    const clickNode = getNodeDefinition("event/onClick");
    assert.ok(clickNode);
    assert.strictEqual(clickNode.category, "Events");
    assert.ok(clickNode.outputs.some((p) => p.type === "exec"));

    const branchNode = getNodeDefinition("flow/branch");
    assert.ok(branchNode);
    assert.strictEqual(branchNode.category, "Flow Control");
    assert.ok(branchNode.inputs.some((p) => p.type === "boolean"));

    const dbNode = getNodeDefinition("database/query");
    assert.ok(dbNode);
    assert.strictEqual(dbNode.category, "Database");
    assert.ok(dbNode.outputs.some((p) => p.name === "records" && p.type === "array"));
  });

  it("Query functions filter and search correctly", () => {
    const eventNodes = getNodesByCategory("Events");
    assert.ok(eventNodes.length >= 4);
    assert.ok(eventNodes.every((n) => n.category === "Events"));

    const searchResults = searchNodeDefinitions("branch");
    assert.ok(searchResults.some((n) => n.type === "flow/branch"));

    assert.strictEqual(getPinColor("exec"), "#F8FAFC");
    assert.strictEqual(getPinColor("boolean"), "#EA580C");
    assert.strictEqual(getPinColor("number"), "#10B981");
  });
});

describe("Sub-Phase 3.2: TypeChecker & Pin Compatibility", () => {
  it("Validates compatible pin connections", () => {
    // 1. Exec to Exec
    const execRes = TypeChecker.validateWireConnection({
      sourceNodeId: "node_1",
      sourcePin: { id: "out", name: "out", label: "Exec", type: "exec", direction: "output" },
      targetNodeId: "node_2",
      targetPin: { id: "in", name: "in", label: "Exec", type: "exec", direction: "input" },
    });
    assert.strictEqual(execRes.isValid, true);

    // 2. String to String
    const strRes = TypeChecker.validateWireConnection({
      sourceNodeId: "node_1",
      sourcePin: { id: "out", name: "out", label: "Text", type: "string", direction: "output" },
      targetNodeId: "node_2",
      targetPin: { id: "in", name: "in", label: "Text", type: "string", direction: "input" },
    });
    assert.strictEqual(strRes.isValid, true);

    // 3. Number to String (Safe coercion)
    const coerceRes = TypeChecker.validateWireConnection({
      sourceNodeId: "node_1",
      sourcePin: { id: "out", name: "out", label: "Num", type: "number", direction: "output" },
      targetNodeId: "node_2",
      targetPin: { id: "in", name: "in", label: "Text", type: "string", direction: "input" },
    });
    assert.strictEqual(coerceRes.isValid, true);
    assert.strictEqual(coerceRes.isCoerced, true);
  });

  it("Rejects illegal pin connections and enforces rules", () => {
    // 1. Self connection
    const selfRes = TypeChecker.validateWireConnection({
      sourceNodeId: "node_1",
      sourcePin: { id: "out", name: "out", label: "Exec", type: "exec", direction: "output" },
      targetNodeId: "node_1",
      targetPin: { id: "in", name: "in", label: "Exec", type: "exec", direction: "input" },
    });
    assert.strictEqual(selfRes.isValid, false);
    assert.strictEqual(selfRes.reason, "SELF_CONNECTION");

    // 2. Output to Output
    const dirRes = TypeChecker.validateWireConnection({
      sourceNodeId: "node_1",
      sourcePin: { id: "out1", name: "out1", label: "Out", type: "string", direction: "output" },
      targetNodeId: "node_2",
      targetPin: { id: "out2", name: "out2", label: "Out", type: "string", direction: "output" },
    });
    assert.strictEqual(dirRes.isValid, false);
    assert.strictEqual(dirRes.reason, "DIRECTION_MISMATCH");

    // 3. Exec to Data
    const execDataRes = TypeChecker.validateWireConnection({
      sourceNodeId: "node_1",
      sourcePin: { id: "execOut", name: "execOut", label: "Exec", type: "exec", direction: "output" },
      targetNodeId: "node_2",
      targetPin: { id: "textIn", name: "textIn", label: "Text", type: "string", direction: "input" },
    });
    assert.strictEqual(execDataRes.isValid, false);
    assert.strictEqual(execDataRes.reason, "EXEC_DATA_MISMATCH");

    // 4. Incompatible Data Types (Array to String)
    const arrayStrRes = TypeChecker.validateWireConnection({
      sourceNodeId: "node_1",
      sourcePin: { id: "records", name: "records", label: "Records", type: "array", direction: "output" },
      targetNodeId: "node_2",
      targetPin: { id: "label", name: "label", label: "Label", type: "string", direction: "input" },
    });
    assert.strictEqual(arrayStrRes.isValid, false);
    assert.strictEqual(arrayStrRes.reason, "INCOMPATIBLE_TYPES");
  });
});

describe("Sub-Phase 3.3: DAGSorter & Cycle Trapping", () => {
  it("Topologically sorts linear and branching DAGs", () => {
    const nodes = {
      n1: { id: "n1", type: "event/onPageLoad", title: "PageLoad" },
      n2: { id: "n2", type: "database/query", title: "Query" },
      n3: { id: "n3", type: "flow/branch", title: "Branch" },
      n4: { id: "n4", type: "utility/printString", title: "Print" },
    };

    const wires = [
      { id: "w1", sourceNodeId: "n1", sourcePinId: "exec", targetNodeId: "n2", targetPinId: "execIn", isExec: true },
      { id: "w2", sourceNodeId: "n2", sourcePinId: "execOut", targetNodeId: "n3", targetPinId: "execIn", isExec: true },
      { id: "w3", sourceNodeId: "n3", sourcePinId: "trueExec", targetNodeId: "n4", targetPinId: "execIn", isExec: true },
    ];

    const result = DAGSorter.sortGraph(nodes, wires, { execOnly: true });
    assert.strictEqual(result.hasCycle, false);
    assert.strictEqual(result.sortedNodeIds[0], "n1");
    assert.strictEqual(result.sortedNodeIds[1], "n2");
    assert.strictEqual(result.sortedNodeIds[2], "n3");
    assert.strictEqual(result.sortedNodeIds[3], "n4");
  });

  it("Detects and traps circular execution loops", () => {
    const nodes = {
      n1: { id: "n1", type: "flow/sequence", title: "Seq" },
      n2: { id: "n2", type: "flow/delay", title: "Delay" },
      n3: { id: "n3", type: "utility/printString", title: "Print" },
    };

    // Cycle: n1 -> n2 -> n3 -> n1
    const cycleWires = [
      { id: "w1", sourceNodeId: "n1", sourcePinId: "then0", targetNodeId: "n2", targetPinId: "execIn", isExec: true },
      { id: "w2", sourceNodeId: "n2", sourcePinId: "completed", targetNodeId: "n3", targetPinId: "execIn", isExec: true },
      { id: "w3", sourceNodeId: "n3", sourcePinId: "execOut", targetNodeId: "n1", targetPinId: "execIn", isExec: true },
    ];

    const result = DAGSorter.sortGraph(nodes, cycleWires, { execOnly: true, silent: true });
    assert.strictEqual(result.hasCycle, true);
    assert.ok(result.error?.includes("[GRAPH_CYCLE_ERR]"));
  });
});

describe("Sub-Phase 3.4 & 3.5: ASTManager & Serialization", () => {
  it("Performs complete Graph CRUD operations", () => {
    let graph = ASTManager.createGraph("test-graph", "MainEventGraph");
    assert.strictEqual(graph.name, "MainEventGraph");

    // Add node
    const { graph: g1, node: nodeA } = ASTManager.addNode(graph, "event/onClick", { x: 50, y: 50 });
    const { graph: g2, node: nodeB } = ASTManager.addNode(g1, "utility/printString", { x: 300, y: 50 });
    graph = g2;

    assert.ok(graph.nodes[nodeA.id]);
    assert.ok(graph.nodes[nodeB.id]);

    // Connect pins
    const connectRes = ASTManager.connectPins(graph, nodeA.id, "exec", nodeB.id, "execIn");
    assert.ok(connectRes.wire);
    assert.strictEqual(connectRes.error, undefined);
    graph = connectRes.graph;
    assert.strictEqual(graph.wires.length, 1);

    // Reposition node
    graph = ASTManager.moveNode(graph, nodeB.id, { x: 450, y: 120 });
    assert.strictEqual(graph.nodes[nodeB.id].position.x, 450);

    // Add variable
    const { graph: gVar, variable } = ASTManager.addVariable(graph, {
      name: "userScore",
      type: "number",
      defaultValue: 100,
    });
    graph = gVar;
    assert.strictEqual(graph.variables.length, 1);
    assert.strictEqual(graph.variables[0].name, "userScore");

    // Validate graph
    const validation = ASTManager.validateGraph(graph);
    assert.strictEqual(validation.isValid, true);

    // Remove node
    graph = ASTManager.removeNode(graph, nodeA.id);
    assert.strictEqual(graph.nodes[nodeA.id], undefined);
    assert.strictEqual(graph.wires.length, 0); // Connected wire cleaned up
  });

  it("Serializes to .bp.json and deserializes back faithfully", () => {
    let graph = ASTManager.createGraph("roundtrip-graph", "CheckoutFlow");
    const { graph: g1, node: n1 } = ASTManager.addNode(graph, "event/onSubmit", { x: 100, y: 80 });
    const { graph: g2, node: n2 } = ASTManager.addNode(g1, "database/insert", { x: 400, y: 80 });
    const { graph: g3 } = ASTManager.connectPins(g2, n1.id, "exec", n2.id, "execIn");
    graph = g3;

    // Serialize
    const jsonString = ASTManager.serializeGraphToJson(graph);
    assert.ok(jsonString.includes("CheckoutFlow"));
    assert.ok(jsonString.includes("event/onSubmit"));
    assert.ok(jsonString.includes("database/insert"));

    // Deserialize
    const restored = ASTManager.deserializeJsonToGraph(jsonString);
    assert.strictEqual(restored.name, "CheckoutFlow");
    assert.strictEqual(Object.keys(restored.nodes).length, 2);
    assert.strictEqual(restored.wires.length, 1);
    assert.strictEqual(restored.wires[0].sourceNodeId, n1.id);
    assert.strictEqual(restored.wires[0].targetNodeId, n2.id);
  });
});
