import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DiagnosticSuggester, AiAstPatch } from "../DiagnosticSuggester";

/**
 * Sub-Phase 41.1: the AI co-pilot can't propose or apply blueprint/state-variable
 * patches outside the full edition (those actions are After-track). Skipped
 * under `npm run test:unit:full-edition` (the inverse of what this checks) —
 * see DiagnosticSuggester.test.ts's one full-edition-only test for that side.
 */
const IS_FULL_EDITION = process.env.NEXT_PUBLIC_EDITION === "full";
const SKIP = IS_FULL_EDITION && "only meaningful outside the full edition";

describe("Sub-Phase 41.1: DiagnosticSuggester rejects After-track actions outside the full edition", () => {
  it("validatePatch rejects update_variable and add_node with a clear reason", { skip: SKIP }, () => {
    const suggester = new DiagnosticSuggester();

    const patch: AiAstPatch = {
      patchId: "patch_initial_edition",
      title: "Add Safe Variable",
      description: "Adds a verified state variable",
      riskLevel: "low",
      affectedEntities: ["ai_test_var"],
      actions: [
        {
          type: "update_variable",
          description: "Initialize ai_test_var",
          variableName: "ai_test_var",
          variableType: "string",
          defaultValue: "Copilot Initialized",
        },
      ],
      diffSummary: { additions: ["Variable: ai_test_var"], modifications: [], deletions: [] },
    };

    const result = suggester.validatePatch(patch);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes("update_variable") && e.includes("not available in this edition")));
  });

  it("applyPatch refuses to run an update_variable or add_node action", { skip: SKIP }, () => {
    const suggester = new DiagnosticSuggester();

    const patch: AiAstPatch = {
      patchId: "patch_initial_edition_2",
      title: "Add Blueprint Node",
      description: "Adds a node to the active graph",
      riskLevel: "low",
      affectedEntities: [],
      actions: [
        {
          type: "add_node",
          description: "Add a print node",
          nodeType: "utility/printString",
        },
      ],
      diffSummary: { additions: [], modifications: [], deletions: [] },
    };

    const success = suggester.applyPatch(patch);
    assert.equal(success, false);
  });
});
