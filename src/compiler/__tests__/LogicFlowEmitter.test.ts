import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LogicFlowEmitter } from "../emitters/LogicFlowEmitter";
import { BlueprintGraph } from "../../core/ast/ASTManager";

describe("Sub-Phase 6.2: LogicFlowEmitter (Blueprint DAG to Async TypeScript)", () => {
  // --------------------------------------------------------------------------
  // 1. Math & Sequence Calculation
  // --------------------------------------------------------------------------
  it("compiles math nodes and literal pins into arithmetic expressions", () => {
    const mathGraph: BlueprintGraph = {
      id: "graph_calc",
      name: "CalculateTotal",
      type: "function",
      nodes: {
        node_start: {
          id: "node_start",
          type: "event/entry",
          title: "Entry",
          position: { x: 0, y: 0 },
        },
        node_add: {
          id: "node_add",
          type: "math/add",
          title: "Add",
          position: { x: 100, y: 0 },
          pinValues: { a: 10, b: 25 },
        },
        node_ret: {
          id: "node_ret",
          type: "flow/return",
          title: "Return",
          position: { x: 200, y: 0 },
        },
      },
      wires: [
        {
          id: "w_exec1",
          sourceNodeId: "node_start",
          sourcePinId: "exec",
          targetNodeId: "node_add",
          targetPinId: "exec",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "w_exec2",
          sourceNodeId: "node_add",
          sourcePinId: "exec",
          targetNodeId: "node_ret",
          targetPinId: "exec",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "w_data",
          sourceNodeId: "node_add",
          sourcePinId: "result",
          targetNodeId: "node_ret",
          targetPinId: "value",
          pinType: "number",
          isExec: false,
        },
      ],
      variables: [],
    };

    const file = LogicFlowEmitter.emitLogicFlow(mathGraph);
    assert.equal(file.language, "typescript");
    assert.equal(file.path, "server/logic/calculateTotal.ts");
    assert.match(file.content, /export async function calculateTotal/);
    assert.match(file.content, /const math_add_nodead = \(10\) \+ \(25\);/);
    assert.match(file.content, /return math_add_nodead;/);
  });

  // --------------------------------------------------------------------------
  // 2. Branch Control Flow
  // --------------------------------------------------------------------------
  it("compiles flow/branch nodes into if/else control flow statements", () => {
    const branchGraph: BlueprintGraph = {
      id: "graph_branch",
      name: "CheckAdminAccess",
      type: "function",
      nodes: {
        node_start: {
          id: "node_start",
          type: "event/entry",
          title: "Entry",
          position: { x: 0, y: 0 },
        },
        node_branch: {
          id: "node_branch",
          type: "flow/branch",
          title: "Is Admin?",
          position: { x: 100, y: 0 },
          pinValues: { condition: true },
        },
        node_ret_true: {
          id: "node_ret_true",
          type: "flow/return",
          title: "Return Allowed",
          position: { x: 200, y: -50 },
          pinValues: { value: "granted" },
        },
        node_ret_false: {
          id: "node_ret_false",
          type: "flow/return",
          title: "Return Denied",
          position: { x: 200, y: 50 },
          pinValues: { value: "denied" },
        },
      },
      wires: [
        {
          id: "w1",
          sourceNodeId: "node_start",
          sourcePinId: "exec",
          targetNodeId: "node_branch",
          targetPinId: "exec",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "w_true",
          sourceNodeId: "node_branch",
          sourcePinId: "true",
          targetNodeId: "node_ret_true",
          targetPinId: "exec",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "w_false",
          sourceNodeId: "node_branch",
          sourcePinId: "false",
          targetNodeId: "node_ret_false",
          targetPinId: "exec",
          pinType: "exec",
          isExec: true,
        },
      ],
      variables: [],
    };

    const file = LogicFlowEmitter.emitLogicFlow(branchGraph);
    assert.match(file.content, /if \(true\) \{/);
    assert.match(file.content, /return "granted";/);
    assert.match(file.content, /\} else \{/);
    assert.match(file.content, /return "denied";/);
  });

  // --------------------------------------------------------------------------
  // 3. Database Operations & Error Handling
  // --------------------------------------------------------------------------
  it("compiles database query nodes and wraps in try-catch error handling", () => {
    const dbGraph: BlueprintGraph = {
      id: "graph_db",
      name: "GetProducts",
      type: "function",
      nodes: {
        node_start: {
          id: "node_start",
          type: "event/entry",
          title: "Start",
          position: { x: 0, y: 0 },
        },
        node_query: {
          id: "node_query",
          type: "db/find_many",
          title: "Find Products",
          position: { x: 100, y: 0 },
          customParams: { collection: "Products" },
        },
        node_return: {
          id: "node_return",
          type: "flow/return",
          title: "Return List",
          position: { x: 200, y: 0 },
        },
      },
      wires: [
        {
          id: "w1",
          sourceNodeId: "node_start",
          sourcePinId: "exec",
          targetNodeId: "node_query",
          targetPinId: "exec",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "w2",
          sourceNodeId: "node_query",
          sourcePinId: "exec",
          targetNodeId: "node_return",
          targetPinId: "exec",
          pinType: "exec",
          isExec: true,
        },
        {
          id: "w3",
          sourceNodeId: "node_query",
          sourcePinId: "records",
          targetNodeId: "node_return",
          targetPinId: "value",
          pinType: "array",
          isExec: false,
        },
      ],
      variables: [],
    };

    const file = LogicFlowEmitter.emitLogicFlow(dbGraph);
    assert.match(file.content, /import \{ prisma \} from "@\/lib\/prisma";/);
    assert.match(file.content, /try \{/);
    assert.match(file.content, /const db_find_many_nodequ = await prisma\.products\.findMany\(\);/);
    assert.match(file.content, /return db_find_many_nodequ;/);
    assert.match(file.content, /\} catch \(error: any\) \{/);
  });
});
