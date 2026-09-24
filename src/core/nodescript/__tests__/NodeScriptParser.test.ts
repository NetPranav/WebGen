import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Lexer } from "../Lexer";
import { NodeScriptParser } from "../Parser";
import { NodeScriptSyntaxError } from "../types";
import { ASTManager, BlueprintGraph } from "@/core/ast/ASTManager";

describe("Sub-Phase 5.1: NodeScript Grammar & Parser", () => {
  // --------------------------------------------------------------------------
  // 1. Lexer Tokenization & Source Position Tracking
  // --------------------------------------------------------------------------
  it("should accurately tokenize statements with 1-indexed line and column tracking", () => {
    const source = `graph TestGraph {\n  node n1 : Event.click\n  wire n1.exec -> n2.exec\n}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    assert.strictEqual(tokens[0].type, "KEYWORD");
    assert.strictEqual(tokens[0].value, "graph");
    assert.strictEqual(tokens[0].loc.line, 1);
    assert.strictEqual(tokens[0].loc.column, 1);

    const wireToken = tokens.find((t) => t.value === "wire");
    assert.ok(wireToken);
    assert.strictEqual(wireToken.loc.line, 3);
    assert.strictEqual(wireToken.loc.column, 3);

    const arrowToken = tokens.find((t) => t.type === "ARROW");
    assert.ok(arrowToken);
    assert.strictEqual(arrowToken.value, "->");
  });

  // --------------------------------------------------------------------------
  // 2. Canonical AuthFlow Graph Specification Test
  // --------------------------------------------------------------------------
  it("should parse the canonical AuthFlow specification graph", () => {
    const authFlowSource = `
graph AuthFlow {
  node onSubmit   : Event.onSubmit(target: "LoginForm")
  node validate   : Utility.regexTest(pattern: "^[^@]+@[^@]+$")
  node lookupUser : Database.query(table: "UsersCollection", where: { email: $onSubmit.email })
  node setSession : Variables.set(scope: Global, key: "session", value: $lookupUser.result)
  node goDash     : Navigation.push(route: "/dashboard")

  wire onSubmit.exec -> validate.exec
  wire validate.exec -> lookupUser.exec [when: validate.result == true]
  wire lookupUser.exec -> setSession.exec
  wire setSession.exec -> goDash.exec
  wire onSubmit.email -> validate.input
  wire onSubmit.email -> lookupUser.email
}
`;

    const graph = NodeScriptParser.parse(authFlowSource);

    assert.strictEqual(graph.name, "AuthFlow");
    assert.strictEqual(graph.type, "event");
    assert.strictEqual(Object.keys(graph.nodes).length, 5);
    assert.strictEqual(graph.wires.length, 6);

    // Verify node properties
    const onSubmit = graph.nodes["onSubmit"];
    assert.ok(onSubmit);
    assert.strictEqual(onSubmit.type, "Event.onSubmit");
    assert.deepStrictEqual(onSubmit.customParams, { target: "LoginForm" });

    const lookupUser = graph.nodes["lookupUser"];
    assert.ok(lookupUser);
    assert.strictEqual(lookupUser.type, "Database.query");
    assert.strictEqual(
      (lookupUser.customParams?.where as Record<string, unknown>)?.email !== undefined,
      true
    );

    // Verify wire connections
    const wire1 = graph.wires[0];
    assert.strictEqual(wire1.sourceNodeId, "onSubmit");
    assert.strictEqual(wire1.sourcePinId, "exec");
    assert.strictEqual(wire1.targetNodeId, "validate");
    assert.strictEqual(wire1.targetPinId, "exec");
    assert.strictEqual(wire1.isExec, true);

    // Verify conditional wire guard
    const guardedWire = graph.wires.find(
      (w) => w.sourceNodeId === "validate" && w.targetNodeId === "lookupUser"
    );
    assert.ok(guardedWire);
    assert.strictEqual(
      (guardedWire as unknown as Record<string, unknown>)["when"],
      "validate.result == true"
    );
  });

  // --------------------------------------------------------------------------
  // 3. Structural Parity Against Hand-Built ASTManager Graph
  // --------------------------------------------------------------------------
  it("should exhibit structural equality to a reference graph constructed via ASTManager", () => {
    const source = `
graph AuthFlow {
  node onSubmit   : Event.onSubmit(target: "LoginForm") @pos(100, 100)
  node validate   : Utility.regexTest(pattern: "^[^@]+@[^@]+$") @pos(420, 100)

  wire onSubmit.exec -> validate.exec
  wire onSubmit.email -> validate.input
}
`;

    const parsedGraph = NodeScriptParser.parse(source, { autoLayout: false });

    // Construct equivalent reference graph using ASTManager
    const refGraph = ASTManager.createGraph("graph_AuthFlow", "AuthFlow", "event");
    refGraph.nodes["onSubmit"] = {
      id: "onSubmit",
      type: "Event.onSubmit",
      title: "onSubmit",
      position: { x: 100, y: 100 },
      customParams: { target: "LoginForm" },
      pinValues: { target: "LoginForm" },
    };
    refGraph.nodes["validate"] = {
      id: "validate",
      type: "Utility.regexTest",
      title: "regexTest",
      position: { x: 420, y: 100 },
      customParams: { pattern: "^[^@]+@[^@]+$" },
      pinValues: { pattern: "^[^@]+@[^@]+$" },
    };
    refGraph.wires.push({
      id: "wire_onSubmit_exec_validate_exec",
      sourceNodeId: "onSubmit",
      sourcePinId: "exec",
      targetNodeId: "validate",
      targetPinId: "exec",
      pinType: "exec",
      isExec: true,
    });
    refGraph.wires.push({
      id: "wire_onSubmit_email_validate_input",
      sourceNodeId: "onSubmit",
      sourcePinId: "email",
      targetNodeId: "validate",
      targetPinId: "input",
      pinType: "any",
      isExec: false,
    });

    // Verify structural equality
    assert.strictEqual(parsedGraph.name, refGraph.name);
    assert.strictEqual(parsedGraph.type, refGraph.type);
    assert.strictEqual(
      Object.keys(parsedGraph.nodes).length,
      Object.keys(refGraph.nodes).length
    );
    assert.strictEqual(parsedGraph.wires.length, refGraph.wires.length);

    for (const [id, refNode] of Object.entries(refGraph.nodes)) {
      const parsedNode = parsedGraph.nodes[id];
      assert.ok(parsedNode, `Missing node ${id}`);
      assert.strictEqual(parsedNode.type, refNode.type);
      assert.strictEqual(parsedNode.position.x, refNode.position.x);
      assert.strictEqual(parsedNode.position.y, refNode.position.y);
      assert.deepStrictEqual(parsedNode.customParams, refNode.customParams);
    }

    for (let i = 0; i < refGraph.wires.length; i++) {
      const rw = refGraph.wires[i];
      const pw = parsedGraph.wires[i];
      assert.strictEqual(pw.sourceNodeId, rw.sourceNodeId);
      assert.strictEqual(pw.sourcePinId, rw.sourcePinId);
      assert.strictEqual(pw.targetNodeId, rw.targetNodeId);
      assert.strictEqual(pw.targetPinId, rw.targetPinId);
      assert.strictEqual(pw.isExec, rw.isExec);
    }
  });

  // --------------------------------------------------------------------------
  // 4. Variables and Auto-Layout Support
  // --------------------------------------------------------------------------
  it("should parse variables and auto-assign tiered DAG positions", () => {
    const source = `
graph Inventory(type: function) {
  variable maxItems : number = 100
  var debugMode : boolean = false
  var storeName : string = "Warehouse A"

  node start : Event.onLoad
  node compute : Math.add(a: 10, b: 20)
  wire start.exec -> compute.exec
}
`;

    const graph = NodeScriptParser.parse(source, { autoLayout: true });

    assert.strictEqual(graph.name, "Inventory");
    assert.strictEqual(graph.type, "function");
    assert.strictEqual(graph.variables.length, 3);

    const maxItemsVar = graph.variables.find((v) => v.name === "maxItems");
    assert.ok(maxItemsVar);
    assert.strictEqual(maxItemsVar.type, "number");
    assert.strictEqual(maxItemsVar.defaultValue, 100);

    const debugModeVar = graph.variables.find((v) => v.name === "debugMode");
    assert.ok(debugModeVar);
    assert.strictEqual(debugModeVar.type, "boolean");
    assert.strictEqual(debugModeVar.defaultValue, false);

    // Auto-layout should place 'start' in tier 0 and 'compute' in tier 1
    assert.ok(graph.nodes["start"].position.x < graph.nodes["compute"].position.x);
  });

  // --------------------------------------------------------------------------
  // 5. Syntax Error Diagnostics with Line and Column Snippets
  // --------------------------------------------------------------------------
  it("should throw NodeScriptSyntaxError with line, column, and code snippet", () => {
    const invalidSource = `graph BadGraph {\n  node missingColon Event.click\n}`;

    try {
      NodeScriptParser.parse(invalidSource);
      assert.fail("Should have thrown NodeScriptSyntaxError");
    } catch (err) {
      assert.ok(err instanceof NodeScriptSyntaxError);
      assert.strictEqual(err.line, 2);
      assert.ok(err.column > 0);
      assert.ok(err.message.includes("Line 2"));
      assert.ok(err.message.includes("node missingColon Event.click"));
      assert.ok(err.message.includes("^"));
    }
  });
});
