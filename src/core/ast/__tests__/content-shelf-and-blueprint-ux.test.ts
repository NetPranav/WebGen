/**
 * ============================================================================
 * CONTENT SHELF & BLUEPRINT UX VALIDATION TESTS
 * ============================================================================
 * Verifies:
 * 1. Event node headers and pins NEVER use red (red is reserved strictly for errors).
 * 2. TypeChecker & Pin connection safety.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  BUILTIN_NODES,
  PIN_COLOR_MAP,
  getPinColor,
  getNodeDefinition,
} from "../../types/node-registry";
import { TypeChecker } from "../TypeChecker";

describe("Phase 3 & UX Polish: Color Psychology & Non-Red Integrity", () => {
  it("Guarantees all Event nodes use Deep Indigo (#4338CA), NEVER red", () => {
    const eventNodes = Object.values(BUILTIN_NODES).filter(
      (n) => n.category === "Events"
    );
    assert.ok(eventNodes.length >= 5, "At least 5 event nodes exist");

    for (const node of eventNodes) {
      assert.strictEqual(
        node.headerColor,
        "#4338CA",
        `Node ${node.title} must have #4338CA header color, got ${node.headerColor}`
      );
      assert.notStrictEqual(
        node.headerColor,
        "#DC2626",
        `Node ${node.title} must never have red header`
      );
    }
  });

  it("Guarantees Boolean pins use Amber (#EA580C) and NO valid pin is red", () => {
    assert.strictEqual(PIN_COLOR_MAP.boolean, "#EA580C");
    assert.strictEqual(getPinColor("boolean"), "#EA580C");

    // Check all pin types: none should be red (#EF4444 or #DC2626)
    const redColors = ["#EF4444", "#DC2626", "#B91C1C", "#F87171", "#FF0000"];
    for (const [pinType, color] of Object.entries(PIN_COLOR_MAP)) {
      assert.ok(
        !redColors.includes(color.toUpperCase()),
        `Pin type ${pinType} has forbidden red color ${color}`
      );
    }
  });

  it("Ensures TypeChecker permits compatible connections and flags mismatches with error diagnostic", () => {
    const validConn = TypeChecker.validateWireConnection({
      sourceNodeId: "node_src",
      sourcePin: { id: "out", name: "out", label: "Out", type: "string", direction: "output" },
      targetNodeId: "node_tgt",
      targetPin: { id: "in", name: "in", label: "In", type: "string", direction: "input" },
    });
    assert.strictEqual(validConn.isValid, true);

    const invalidConn = TypeChecker.validateWireConnection({
      sourceNodeId: "node_src",
      sourcePin: { id: "out", name: "out", label: "Out", type: "number", direction: "output" },
      targetNodeId: "node_tgt",
      targetPin: { id: "exec_in", name: "exec_in", label: "Exec", type: "exec", direction: "input" },
    });
    assert.strictEqual(invalidConn.isValid, false);
    assert.ok(invalidConn.error?.includes("cannot connect to data pin"));
  });
});
