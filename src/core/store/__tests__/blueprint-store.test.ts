import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { useProjectStore } from "../useProjectStore";
import { ASTManager } from "../../ast/ASTManager";

describe("Sub-Phase 3.4 & 3.5: Blueprint Store Integration & Validation", () => {
  test("Store initializes with default graph_main_event and activeBlueprintGraphId", () => {
    const state = useProjectStore.getState();
    assert.ok(state.blueprintGraphs["graph_main_event"], "Default event graph should be present");
    assert.equal(state.activeBlueprintGraphId, "graph_main_event");

    const mainGraph = state.blueprintGraphs["graph_main_event"];
    assert.equal(mainGraph.name, "Main Event Graph");
    assert.ok(mainGraph.nodes["node_evt_click"], "OnClick node should be seeded");
    assert.ok(mainGraph.nodes["node_db_query"], "Database query node should be seeded");
    assert.ok(mainGraph.wires.length >= 4, "Wires should be seeded");
  });

  test("Graph CRUD: create, switch active, add node, move node, remove node", () => {
    const store = useProjectStore.getState();

    // 1. Create Graph
    const graphId = store.createBlueprintGraph("Custom Checkout Flow", "event", "Create Checkout Graph");
    assert.ok(graphId);
    assert.equal(useProjectStore.getState().activeBlueprintGraphId, graphId);

    // 2. Add Node
    const node = store.addBlueprintNode(
      graphId,
      "flow/branch",
      { x: 200, y: 150 },
      {},
      "Add Branch Node"
    );
    assert.ok(node);
    assert.equal(node.type, "flow/branch");
    assert.equal(useProjectStore.getState().blueprintGraphs[graphId].nodes[node.id].position.x, 200);

    // 3. Move Node
    store.moveBlueprintNode(graphId, node.id, { x: 350, y: 220 });
    assert.equal(useProjectStore.getState().blueprintGraphs[graphId].nodes[node.id].position.x, 350);
    assert.equal(useProjectStore.getState().blueprintGraphs[graphId].nodes[node.id].position.y, 220);

    // 4. Set Pin Value
    store.setBlueprintPinValue(graphId, node.id, "condition", true);
    assert.equal(useProjectStore.getState().blueprintGraphs[graphId].nodes[node.id].pinValues?.["condition"], true);

    // 5. Remove Node
    store.removeBlueprintNode(graphId, node.id, "Remove Branch Node");
    assert.equal(useProjectStore.getState().blueprintGraphs[graphId].nodes[node.id], undefined);

    // Switch back to main graph
    store.setActiveBlueprintGraph("graph_main_event");
    assert.equal(useProjectStore.getState().activeBlueprintGraphId, "graph_main_event");
  });

  test("Wire connection & Pin compatibility in store", () => {
    const store = useProjectStore.getState();
    const graphId = store.createBlueprintGraph("Wiring Test", "event");

    const n1 = store.addBlueprintNode(graphId, "event/onClick", { x: 50, y: 50 });
    const n2 = store.addBlueprintNode(graphId, "flow/branch", { x: 300, y: 50 });

    // Connect Exec (output) -> Exec (input)
    const conn1 = store.connectBlueprintPins(graphId, n1.id, "exec", n2.id, "execIn");
    assert.equal(conn1.success, true);
    assert.equal(useProjectStore.getState().blueprintGraphs[graphId].wires.length, 1);

    // Disconnect wire
    const wireId = useProjectStore.getState().blueprintGraphs[graphId].wires[0].id;
    store.disconnectBlueprintWire(graphId, wireId);
    assert.equal(useProjectStore.getState().blueprintGraphs[graphId].wires.length, 0);

    // Incompatible pin connection: Exec -> Boolean condition
    const conn2 = store.connectBlueprintPins(graphId, n1.id, "exec", n2.id, "condition");
    assert.equal(conn2.success, false);
    assert.ok(conn2.error?.includes("Execution flow pin"));
  });

  test("Variable system: add, update, remove variable", () => {
    const store = useProjectStore.getState();
    const graphId = "graph_main_event";

    // Add variable
    store.addBlueprintVariable(graphId, {
      name: "cartDiscount",
      type: "number",
      defaultValue: 15,
      category: "Pricing",
    });

    const vars = useProjectStore.getState().blueprintGraphs[graphId].variables;
    const addedVar = vars.find((v) => v.name === "cartDiscount");
    assert.ok(addedVar, "cartDiscount variable should be present");
    assert.equal(addedVar.type, "number");
    assert.equal(addedVar.defaultValue, 15);

    // Update variable
    store.updateBlueprintVariable(graphId, addedVar.id, {
      defaultValue: 20,
    });
    const updatedVar = useProjectStore
      .getState()
      .blueprintGraphs[graphId].variables.find((v) => v.id === addedVar.id);
    assert.equal(updatedVar?.defaultValue, 20);

    // Remove variable
    store.removeBlueprintVariable(graphId, addedVar.id);
    const remainingVars = useProjectStore.getState().blueprintGraphs[graphId].variables;
    assert.equal(remainingVars.find((v) => v.id === addedVar.id), undefined);
  });

  test("Compile & JSON Serialization round-trip", () => {
    const store = useProjectStore.getState();
    store.setActiveBlueprintGraph("graph_main_event");

    const compileResult = store.compileActiveBlueprintGraph();
    assert.equal(compileResult.isValid, true);

    const activeGraph = useProjectStore.getState().blueprintGraphs["graph_main_event"];
    const json = ASTManager.serializeGraphToJson(activeGraph);
    const parsed = ASTManager.deserializeJsonToGraph(json);

    assert.equal(parsed.id, activeGraph.id);
    assert.equal(parsed.name, activeGraph.name);
    assert.equal(Object.keys(parsed.nodes).length, Object.keys(activeGraph.nodes).length);
    assert.equal(parsed.wires.length, activeGraph.wires.length);
  });
});
