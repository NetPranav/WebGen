import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NodeScriptParser } from "../Parser";
import { NodeScriptSerializer } from "../Serializer";
import { GraphGenerator } from "../GraphGenerator";
import { BlueprintGraph } from "@/core/ast/ASTManager";

describe("Sub-Phase 5.2: NodeScript Serializer & Round-Trip Compiler (AI-Native Parity Law)", () => {
  // --------------------------------------------------------------------------
  // 1. Canonical AuthFlow Serialization
  // --------------------------------------------------------------------------
  it("should serialize the canonical AuthFlow graph to deterministic .nls text", () => {
    const authFlowSource = `
graph AuthFlow {
  node onSubmit   : Event.onSubmit(target: "LoginForm") @pos(100, 100)
  node validate   : Utility.regexTest(pattern: "^[^@]+@[^@]+$") @pos(400, 100)
  node lookupUser : Database.query(table: "UsersCollection") @pos(700, 100)

  wire onSubmit.exec -> validate.exec
  wire validate.exec -> lookupUser.exec [when: validate.result == true]
  wire onSubmit.email -> validate.input
}
`;

    const graph = NodeScriptParser.parse(authFlowSource, { autoLayout: false });
    const serialized = NodeScriptSerializer.serialize(graph);

    assert.ok(serialized.includes("#nls-version: 1.0"));
    assert.ok(serialized.includes("graph AuthFlow {"));
    assert.ok(serialized.includes('node onSubmit : Event.onSubmit(target: "LoginForm") @pos(100, 100)'));
    assert.ok(serialized.includes("wire onSubmit.exec -> validate.exec"));
    assert.ok(serialized.includes("wire validate.exec -> lookupUser.exec [when: validate.result == true]"));
  });

  // --------------------------------------------------------------------------
  // 2. Textual Idempotence: serialize(parse(serialize(g))) === serialize(g)
  // --------------------------------------------------------------------------
  it("should maintain strict textual idempotence across serialization cycles", () => {
    const sampleGraph = GraphGenerator.generateRandomGraph(42);

    const text1 = NodeScriptSerializer.serialize(sampleGraph);
    const parsed1 = NodeScriptParser.parse(text1, { autoLayout: false });
    const text2 = NodeScriptSerializer.serialize(parsed1);

    assert.strictEqual(text2, text1, "Serialization output must be identical across round-trips");
  });

  // --------------------------------------------------------------------------
  // 3. AI-Native Parity Law: 50-Graph Corpus Property Test
  // --------------------------------------------------------------------------
  it("should pass round-trip property test across a corpus of 50 generated random graphs with zero structural drift", () => {
    const TOTAL_TEST_GRAPHS = 50;
    let passedCount = 0;

    for (let seed = 1; seed <= TOTAL_TEST_GRAPHS; seed++) {
      const originalGraph: BlueprintGraph = GraphGenerator.generateRandomGraph(seed);

      // Serialize original graph to .nls text
      const nlsText = NodeScriptSerializer.serialize(originalGraph);

      // Parse .nls text back into BlueprintGraph
      const parsedGraph = NodeScriptParser.parse(nlsText, { autoLayout: false });

      // 1. Graph Level Parity
      assert.strictEqual(parsedGraph.name, originalGraph.name, `Graph name mismatch on seed ${seed}`);
      assert.strictEqual(parsedGraph.type, originalGraph.type, `Graph type mismatch on seed ${seed}`);

      // 2. Variables Parity
      assert.strictEqual(
        parsedGraph.variables.length,
        originalGraph.variables.length,
        `Variable count mismatch on seed ${seed}`
      );

      const origVarsByName = new Map(originalGraph.variables.map((v) => [v.name, v]));
      for (const pv of parsedGraph.variables) {
        const ov = origVarsByName.get(pv.name);
        assert.ok(ov, `Missing variable ${pv.name} on seed ${seed}`);
        assert.strictEqual(pv.type, ov.type);
        assert.deepStrictEqual(pv.defaultValue, ov.defaultValue);
      }

      // 3. Node Level Parity
      const origNodeIds = Object.keys(originalGraph.nodes);
      const parsedNodeIds = Object.keys(parsedGraph.nodes);
      assert.strictEqual(
        parsedNodeIds.length,
        origNodeIds.length,
        `Node count mismatch on seed ${seed}`
      );

      for (const nodeId of origNodeIds) {
        const on = originalGraph.nodes[nodeId];
        const pn = parsedGraph.nodes[nodeId];
        assert.ok(pn, `Missing node ${nodeId} in parsed graph on seed ${seed}`);
        assert.strictEqual(pn.type, on.type);
        assert.strictEqual(pn.position.x, on.position.x);
        assert.strictEqual(pn.position.y, on.position.y);
        assert.deepStrictEqual(pn.customParams, on.customParams);
      }

      // 4. Wire Level Parity
      assert.strictEqual(
        parsedGraph.wires.length,
        originalGraph.wires.length,
        `Wire count mismatch on seed ${seed}`
      );

      const wireKey = (w: {
        sourceNodeId: string;
        sourcePinId: string;
        targetNodeId: string;
        targetPinId: string;
      }) => `${w.sourceNodeId}.${w.sourcePinId}->${w.targetNodeId}.${w.targetPinId}`;

      const origWiresMap = new Map(originalGraph.wires.map((w) => [wireKey(w), w]));
      for (const pw of parsedGraph.wires) {
        const ow = origWiresMap.get(wireKey(pw));
        assert.ok(ow, `Missing wire ${wireKey(pw)} on seed ${seed}`);
        assert.strictEqual(pw.isExec, ow.isExec);

        const pWhen = (pw as unknown as Record<string, unknown>)["when"];
        const oWhen = (ow as unknown as Record<string, unknown>)["when"];
        assert.strictEqual(pWhen, oWhen, `Wire when guard mismatch on seed ${seed}`);
      }

      passedCount++;
    }

    assert.strictEqual(
      passedCount,
      TOTAL_TEST_GRAPHS,
      `All 50 graphs must pass round-trip compilation with 0% drift`
    );
  });
});
