import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DiagnosticSuggester, AiAstPatch } from "../../../ai/copilot/DiagnosticSuggester";
import { DiagnosticBus } from "../../engine/DiagnosticBus";
import { DiagnosticEvent } from "../../types/diagnostics";
import { useProjectStore } from "../../store/useProjectStore";

describe("Sub-Phase 5.4: AI Co-Pilot DiagnosticSuggester & AST Patch Engine", () => {
  let suggester: DiagnosticSuggester;

  beforeEach(() => {
    suggester = new DiagnosticSuggester();
    DiagnosticBus.clearHistory();
  });

  it("analyzes [BIND_ERR] diagnostic and proposes typed fallback patch", () => {
    const diag: DiagnosticEvent = {
      id: "diag_bind_01",
      timestamp: Date.now(),
      channel: "BIND_ERR",
      severity: "error",
      source: {
        panel: "PropertyInspector",
        entityId: "btn_checkout",
        entityName: "Checkout Button",
        propertyKey: "title",
      },
      message: "Unresolved binding 'user.totalAmount' on Checkout Button",
      suggestion: "Provide fallback value or bind to a valid state variable.",
      isFixable: true,
    };

    const suggestions = suggester.analyzeDiagnostics([diag]);
    assert.equal(suggestions.length, 1);
    const sug = suggestions[0];
    assert.equal(sug.severity, "error");
    assert.match(sug.title, /Fix Binding Mismatch/);
    assert.equal(sug.patch.riskLevel, "low");
    assert.equal(sug.patch.actions.length, 2);
    assert.equal(sug.patch.actions[0].type, "update_variable");
    assert.equal(sug.patch.actions[1].type, "update_element_prop");
  });

  it("analyzes [TRACE_EXEC_ERR] and proposes runtime execution guard patch", () => {
    const diag: DiagnosticEvent = {
      id: "diag_trace_01",
      timestamp: Date.now(),
      channel: "TRACE_EXEC_ERR",
      severity: "error",
      source: {
        panel: "ExecutionTracer",
        entityId: "node_branch_01",
        entityName: "Branch Condition",
      },
      message: "Node execution failed: Condition input is undefined.",
    };

    const suggestions = suggester.analyzeDiagnostics([diag]);
    assert.equal(suggestions.length, 1);
    const sug = suggestions[0];
    assert.match(sug.title, /Handle Trace Runtime Fault/);
    assert.equal(sug.patch.riskLevel, "medium");
    assert.equal(sug.patch.actions[0].type, "set_node_prop");
    assert.equal(sug.patch.actions[0].propertyKey, "catchErrors");
  });

  it("analyzes [DB_SCHEMA_ERR] and proposes Primary Key enforcement patch", () => {
    const diag: DiagnosticEvent = {
      id: "diag_db_01",
      timestamp: Date.now(),
      channel: "DB_SCHEMA_ERR",
      severity: "error",
      source: {
        panel: "DatabaseStudio",
        entityId: "orders_collection",
        entityName: "Orders",
      },
      message: "Collection 'Orders' missing Primary Key.",
    };

    const suggestions = suggester.analyzeDiagnostics([diag]);
    assert.equal(suggestions.length, 1);
    const sug = suggestions[0];
    assert.match(sug.title, /Enforce Primary Key/);
    assert.equal(sug.patch.actions[0].propertyKey, "primaryKey");
    assert.equal(sug.patch.actions[0].propertyValue, "id");
  });

  it("validates patch integrity and catches illegal empty actions with [AI_SCHEMA_VALIDATION_ERR]", () => {
    let emittedDiag: DiagnosticEvent | null = null;
    const unsub = DiagnosticBus.subscribe((e) => {
      if (e.channel === "AI_SCHEMA_VALIDATION_ERR") {
        emittedDiag = e;
      }
    });

    const invalidPatch: AiAstPatch = {
      patchId: "patch_invalid",
      title: "Broken Patch",
      description: "Has no executable actions",
      riskLevel: "high",
      affectedEntities: [],
      actions: [],
      diffSummary: { additions: [], modifications: [], deletions: [] },
    };

    const result = suggester.validatePatch(invalidPatch);
    unsub();

    assert.equal(result.isValid, false);
    assert.equal(result.errors.length, 1);
    assert.ok(emittedDiag);
    assert.equal((emittedDiag as unknown as DiagnosticEvent).channel, "AI_SCHEMA_VALIDATION_ERR");
  });

  it("applies approved patch to useProjectStore and emits [AI_COPILOT_INFO]", () => {
    let infoDiag: DiagnosticEvent | null = null;
    const unsub = DiagnosticBus.subscribe((e) => {
      if (e.channel === "AI_COPILOT_INFO") {
        infoDiag = e;
      }
    });

    const patch: AiAstPatch = {
      patchId: "patch_valid_merge",
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

    const success = suggester.applyPatch(patch);
    unsub();

    assert.equal(success, true);
    assert.ok(infoDiag);
    assert.equal((infoDiag as unknown as DiagnosticEvent).channel, "AI_COPILOT_INFO");

    // Verify useProjectStore updated state variable
    const storeState = useProjectStore.getState();
    assert.ok(Object.values(storeState.stateVariables).some((v) => v.name === "ai_test_var"));
  });

  it("records user rejection and emits [AI_DIFF_REJECTED]", () => {
    let rejectDiag: DiagnosticEvent | null = null;
    const unsub = DiagnosticBus.subscribe((e) => {
      if (e.channel === "AI_DIFF_REJECTED") {
        rejectDiag = e;
      }
    });

    const patch: AiAstPatch = {
      patchId: "patch_reject_test",
      title: "Unwanted Mutation",
      description: "User declines this change",
      riskLevel: "medium",
      affectedEntities: [],
      actions: [],
      diffSummary: { additions: [], modifications: [], deletions: [] },
    };

    suggester.rejectPatch(patch, "User cancelled from modal");
    unsub();

    assert.ok(rejectDiag);
    assert.equal((rejectDiag as unknown as DiagnosticEvent).channel, "AI_DIFF_REJECTED");
    assert.match((rejectDiag as unknown as DiagnosticEvent).message, /User rejected AI AST Patch/);
  });

  it("generates natural language responses for counter generation and clean diagnostics", async () => {
    // 1. Clean diagnostics
    const cleanResp = await suggester.generateNaturalLanguageResponse("diagnose errors", {
      diagnostics: [],
    });
    assert.match(cleanResp.content, /System Diagnostics Clean/);

    // 2. Counter logic request produces an AST patch
    const genResp = await suggester.generateNaturalLanguageResponse("Create counter logic and state variable", {});
    assert.match(genResp.content, /Blueprint Generation Proposal/);
    assert.ok(genResp.patch);
    assert.equal(genResp.patch.title, "Generate Counter State & Increment Node");
    assert.equal(genResp.patch.actions.length, 2);
  });
});
