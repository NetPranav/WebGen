import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NodeScriptCLI } from "../../../../bin/nodescript-cli";
import { BlueprintGraph } from "@/core/ast/ASTManager";

describe("Sub-Phase 5.4: NodeScript CLI & Editor Tooling", () => {
  const sampleNls = `
#nls-version: 1.0

graph AuthFlow {
  variable maxRetries : number = 3

  node onSubmit   : event/onSubmit(formId: "LoginForm") @pos(100, 100)
  node validate   : utility/regexTest(pattern: "^[^@]+@[^@]+$") @pos(400, 100)
  node lookupUser : db/query(table: "Users") @pos(700, 100)

  wire onSubmit.exec -> validate.execIn
  wire validate.execOut -> lookupUser.execIn [when: validate.result == true]
}
`;

  // --------------------------------------------------------------------------
  // 1. Compilation: .nls -> .bp.json
  // --------------------------------------------------------------------------
  it("should compile .nls source to valid Blueprint JSON consumable by ASTManager", () => {
    const jsonOutput = NodeScriptCLI.compile(sampleNls);
    assert.ok(jsonOutput);

    const parsed = JSON.parse(jsonOutput) as BlueprintGraph;
    assert.strictEqual(parsed.name, "AuthFlow");
    assert.strictEqual(Object.keys(parsed.nodes).length, 3);
    assert.strictEqual(parsed.wires.length, 2);
    assert.strictEqual(parsed.variables.length, 1);
    assert.strictEqual(parsed.variables[0].name, "maxRetries");
    assert.strictEqual(parsed.variables[0].defaultValue, 3);

    const onSubmit = parsed.nodes["onSubmit"];
    assert.ok(onSubmit);
    assert.strictEqual(onSubmit.type, "event/onSubmit");
    assert.strictEqual(onSubmit.position.x, 100);
    assert.strictEqual(onSubmit.position.y, 100);
    assert.strictEqual(onSubmit.customParams?.formId, "LoginForm");
  });

  // --------------------------------------------------------------------------
  // 2. Decompilation: .bp.json -> .nls
  // --------------------------------------------------------------------------
  it("should decompile Blueprint JSON back to canonical .nls text", () => {
    const jsonOutput = NodeScriptCLI.compile(sampleNls);
    const decompiledNls = NodeScriptCLI.decompile(jsonOutput);

    assert.ok(decompiledNls.includes("#nls-version: 1.0"));
    assert.ok(decompiledNls.includes("graph AuthFlow {"));
    assert.ok(decompiledNls.includes("variable maxRetries : number = 3"));
    assert.ok(decompiledNls.includes("node onSubmit : event/onSubmit"));
    assert.ok(decompiledNls.includes("wire onSubmit.exec -> validate.execIn"));
  });

  // --------------------------------------------------------------------------
  // 3. Semantic Graph Diff Engine
  // --------------------------------------------------------------------------
  it("should detect zero semantic changes when diffing identical graphs", () => {
    const diff = NodeScriptCLI.diff(sampleNls, sampleNls);
    assert.strictEqual(diff.hasChanges, false);
    assert.strictEqual(diff.addedNodes.length, 0);
    assert.strictEqual(diff.removedNodes.length, 0);
    assert.strictEqual(diff.modifiedNodes.length, 0);
    assert.ok(diff.formattedSummary.includes("No semantic changes detected"));
  });

  it("should accurately detect added, removed, and modified nodes and wires", () => {
    const modifiedNls = `
#nls-version: 1.0

graph AuthFlow {
  variable maxRetries : number = 5
  variable newConfig : string = "active"

  node onSubmit   : event/onSubmit(formId: "LoginForm") @pos(150, 150)
  node lookupUser : db/query(table: "Users_V2") @pos(700, 100)
  node logger     : utility/log @pos(950, 100)

  wire onSubmit.exec -> lookupUser.execIn
  wire lookupUser.execOut -> logger.execIn
}
`;

    const diff = NodeScriptCLI.diff(sampleNls, modifiedNls);
    assert.strictEqual(diff.hasChanges, true);

    // Added & Removed Nodes
    assert.ok(diff.addedNodes.includes("logger"));
    assert.ok(diff.removedNodes.includes("validate"));

    // Modified Nodes (position or params)
    const modifiedNodeIds = diff.modifiedNodes.map((m) => m.id);
    assert.ok(modifiedNodeIds.includes("onSubmit"));
    assert.ok(modifiedNodeIds.includes("lookupUser"));

    // Variables diff
    assert.ok(diff.addedVariables.includes("newConfig"));

    // Wires diff
    assert.ok(diff.addedWires.some((w) => w.includes("logger")));
    assert.ok(diff.removedWires.some((w) => w.includes("validate")));

    // Human-readable summary
    assert.ok(diff.formattedSummary.includes("Added Nodes"));
    assert.ok(diff.formattedSummary.includes("Removed Nodes"));
  });

  // --------------------------------------------------------------------------
  // 4. Headless Validation
  // --------------------------------------------------------------------------
  it("should validate source and return true for valid scripts", () => {
    const result = NodeScriptCLI.validate(sampleNls);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.diagnostics.length, 0);
  });

  it("should validate source and return false with diagnostics for invalid scripts", () => {
    const invalidNls = `
graph InvalidScript {
  node btn : event/onClick
  node branch : flow/branch
  wire btn.exec -> branch.condition
}
`;
    const result = NodeScriptCLI.validate(invalidNls);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.diagnostics.length, 1);
    assert.strictEqual(result.diagnostics[0].code, "PIN_TYPE_MISMATCH");
  });

  // --------------------------------------------------------------------------
  // 5. CLI Invocation Runner
  // --------------------------------------------------------------------------
  it("should handle --help command and return exit code 0", async () => {
    const exitCode = await NodeScriptCLI.run(["node", "nodescript", "--help"]);
    assert.strictEqual(exitCode, 0);
  });
});
