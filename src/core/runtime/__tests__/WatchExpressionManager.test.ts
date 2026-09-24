import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { WatchExpressionManager } from "../../../runtime/WatchExpressionManager";
import { DiagnosticBus } from "../../engine/DiagnosticBus";
import { WatchEvaluationContext } from "../../types/watch";

describe("Sub-Phase 5.7: WatchExpressionManager & Live Variable Inspector", () => {
  let manager: WatchExpressionManager;

  beforeEach(() => {
    DiagnosticBus.clearHistory();
    manager = new WatchExpressionManager([]);
  });

  // --------------------------------------------------------------------------
  // 1. Watch CRUD Operations
  // --------------------------------------------------------------------------
  it("creates, reads, updates, and deletes watch expressions", () => {
    // Add watch with custom label
    const w1 = manager.addWatch("inputs.amount * 2", "Total Doubled");
    assert.ok(w1.id.startsWith("watch_"));
    assert.equal(w1.expression, "inputs.amount * 2");
    assert.equal(w1.name, "Total Doubled");
    assert.equal(w1.isEnabled, true);

    // Add watch without custom label
    const w2 = manager.addWatch("state.counter");
    assert.equal(w2.expression, "state.counter");
    assert.equal(w2.name, undefined);

    // Get watches
    const all = manager.getWatches();
    assert.equal(all.length, 2);
    assert.equal(manager.getWatch(w1.id)?.expression, "inputs.amount * 2");

    // Toggle watch
    const toggleRes = manager.toggleWatch(w1.id);
    assert.equal(toggleRes, false);
    assert.equal(manager.getWatch(w1.id)?.isEnabled, false);

    manager.toggleWatch(w1.id);
    assert.equal(manager.getWatch(w1.id)?.isEnabled, true);

    // Update expression
    const updateRes = manager.updateExpression(w1.id, "inputs.amount * 3", "Total Tripled");
    assert.equal(updateRes, true);
    assert.equal(manager.getWatch(w1.id)?.expression, "inputs.amount * 3");
    assert.equal(manager.getWatch(w1.id)?.name, "Total Tripled");

    // Rejection on empty expression
    assert.throws(() => manager.addWatch("   "), /Watch expression cannot be empty/);
    assert.equal(manager.updateExpression(w1.id, "   "), false);

    // Remove watch
    assert.equal(manager.removeWatch(w2.id), true);
    assert.equal(manager.getWatches().length, 1);
    assert.equal(manager.removeWatch("non_existent"), false);

    // Clear watches
    manager.clearWatches();
    assert.equal(manager.getWatches().length, 0);
  });

  // --------------------------------------------------------------------------
  // 2. Reactive Subscriptions
  // --------------------------------------------------------------------------
  it("notifies listeners on CRUD and evaluation changes", () => {
    let callCount = 0;
    let lastListCount = 0;

    const unsubscribe = manager.subscribe((watches) => {
      callCount++;
      lastListCount = watches.length;
    });

    manager.addWatch("state.activeUser");
    assert.equal(callCount, 1);
    assert.equal(lastListCount, 1);

    manager.addWatch("outputs.status");
    assert.equal(callCount, 2);
    assert.equal(lastListCount, 2);

    unsubscribe();
    manager.addWatch("variables.flag");
    assert.equal(callCount, 2); // Did not trigger after unsubscribe
  });

  // --------------------------------------------------------------------------
  // 3. Evaluation across Scopes (inputs, outputs, state, variables, step, run)
  // --------------------------------------------------------------------------
  it("evaluates expressions across inputs, outputs, state, variables, and step context", () => {
    const w1 = manager.addWatch("inputs.qty * inputs.unitPrice");
    const w2 = manager.addWatch("outputs.records.length");
    const w3 = manager.addWatch("state.user.role === 'admin'");
    const w4 = manager.addWatch("variables.apiKey ? 'configured' : 'missing'");
    const w5 = manager.addWatch("step.nodeTitle");

    const context: WatchEvaluationContext = {
      inputs: {
        qty: 4,
        unitPrice: 25,
      },
      outputs: {
        records: ["rec_1", "rec_2", "rec_3"],
      },
      state: {
        user: { role: "admin", name: "Alice" },
      },
      variables: {
        apiKey: "sk_live_12345",
      },
      step: {
        nodeId: "node_1",
        nodeTitle: "Execute Query",
        durationMs: 12.5,
      },
      run: {
        runId: "run_999",
        status: "completed",
      },
    };

    const results = manager.evaluateAll(context, 0);

    const r1 = results.get(w1.id);
    assert.ok(r1);
    assert.equal(r1.status, "success");
    assert.equal(r1.value, 100);
    assert.equal(r1.valueType, "number");
    assert.equal(r1.formattedValue, "100");

    const r2 = results.get(w2.id);
    assert.ok(r2);
    assert.equal(r2.status, "success");
    assert.equal(r2.value, 3);
    assert.equal(r2.valueType, "number");

    const r3 = results.get(w3.id);
    assert.ok(r3);
    assert.equal(r3.status, "success");
    assert.equal(r3.value, true);
    assert.equal(r3.valueType, "boolean");

    const r4 = results.get(w4.id);
    assert.ok(r4);
    assert.equal(r4.status, "success");
    assert.equal(r4.value, "configured");
    assert.equal(r4.valueType, "string");
    assert.equal(r4.formattedValue, '"configured"');

    const r5 = results.get(w5.id);
    assert.ok(r5);
    assert.equal(r5.status, "success");
    assert.equal(r5.value, "Execute Query");
  });

  // --------------------------------------------------------------------------
  // 4. Safe Error Handling & Disabled Watches
  // --------------------------------------------------------------------------
  it("gracefully catches syntax and runtime evaluation errors without crashing", () => {
    const wValid = manager.addWatch("10 + 20");
    const wSyntax = manager.addWatch("definitely invalid %$# syntax !");
    const wRuntime = manager.addWatch("inputs.nonExistent.subProp.value");
    const wDisabled = manager.addWatch("inputs.amount");
    manager.toggleWatch(wDisabled.id); // disable it

    const results = manager.evaluateAll({ inputs: {} });

    // Valid evaluation
    assert.equal(results.get(wValid.id)?.status, "success");
    assert.equal(results.get(wValid.id)?.value, 30);

    // Syntax error caught
    const syntaxRes = results.get(wSyntax.id);
    assert.ok(syntaxRes);
    assert.equal(syntaxRes.status, "error");
    assert.ok(syntaxRes.errorMessage);
    assert.match(syntaxRes.formattedValue, /<Error: /);

    // Runtime TypeError caught
    const runtimeRes = results.get(wRuntime.id);
    assert.ok(runtimeRes);
    assert.equal(runtimeRes.status, "error");
    assert.ok(runtimeRes.errorMessage);

    // Disabled watch is skipped
    assert.equal(results.has(wDisabled.id), false);
  });

  // --------------------------------------------------------------------------
  // 5. Mutation Detection & DiagnosticBus Telemetry
  // --------------------------------------------------------------------------
  it("detects value mutations across sequential steps and emits DiagnosticBus events", () => {
    const wCounter = manager.addWatch("state.counter", "Counter Watch");
    const wTotal = manager.addWatch("inputs.total", "Total Pin Watch");

    // Step 0 evaluation: initial values
    const step0Ctx: WatchEvaluationContext = {
      state: { counter: 1 },
      inputs: { total: 100 },
    };
    const res0 = manager.evaluateAll(step0Ctx, 0);
    assert.equal(res0.get(wCounter.id)?.hasMutated, false);
    assert.equal(res0.get(wTotal.id)?.hasMutated, false);
    assert.equal(DiagnosticBus.getHistory().length, 0);

    // Step 1 evaluation: state.counter mutated to 2, inputs.total unchanged
    const step1Ctx: WatchEvaluationContext = {
      state: { counter: 2 },
      inputs: { total: 100 },
    };
    const res1 = manager.evaluateAll(step1Ctx, 1);
    const rCounter1 = res1.get(wCounter.id);
    const rTotal1 = res1.get(wTotal.id);

    assert.equal(rCounter1?.hasMutated, true);
    assert.equal(rCounter1?.previousValue, 1);
    assert.equal(rCounter1?.value, 2);

    assert.equal(rTotal1?.hasMutated, false);
    assert.equal(rTotal1?.previousValue, undefined);

    // Verify DiagnosticBus event emission
    const diagHistory = DiagnosticBus.getHistory();
    assert.equal(diagHistory.length, 1);
    const mutationEvent = diagHistory[0];
    assert.equal(mutationEvent.channel, "WATCH_MUTATION");
    assert.equal(mutationEvent.severity, "info");
    assert.equal(mutationEvent.source.panel, "Panel 20: Execution Trace (Watch)");
    assert.equal(mutationEvent.source.entityId, wCounter.id);
    assert.match(mutationEvent.message, /\[WATCH_MUTATION\] Watch 'state\.counter' mutated: 1 ➔ 2 \(at step #2\)/);

    // Step 2 evaluation: no changes
    const step2Ctx: WatchEvaluationContext = {
      state: { counter: 2 },
      inputs: { total: 100 },
    };
    const res2 = manager.evaluateAll(step2Ctx, 2);
    assert.equal(res2.get(wCounter.id)?.hasMutated, false);
    assert.equal(DiagnosticBus.getHistory().length, 1); // No new diagnostic emitted
  });

  // --------------------------------------------------------------------------
  // 6. Object / Array Equality & Type Classification
  // --------------------------------------------------------------------------
  it("classifies types correctly and detects deep mutations on structured objects", () => {
    const wObj = manager.addWatch("state.data");

    // Evaluation 1: object
    manager.evaluateAll({ state: { data: { a: 1, b: "hello" } } }, 0);
    const r1 = manager.getResult(wObj.id);
    assert.equal(r1?.valueType, "object");
    assert.equal(r1?.formattedValue, '{"a":1,"b":"hello"}');
    assert.equal(r1?.hasMutated, false);

    // Evaluation 2: identical object content (should NOT count as mutation)
    manager.evaluateAll({ state: { data: { a: 1, b: "hello" } } }, 1);
    const r2 = manager.getResult(wObj.id);
    assert.equal(r2?.hasMutated, false);

    // Evaluation 3: deep change
    manager.evaluateAll({ state: { data: { a: 2, b: "hello" } } }, 2);
    const r3 = manager.getResult(wObj.id);
    assert.equal(r3?.hasMutated, true);
    assert.deepEqual(r3?.previousValue, { a: 1, b: "hello" });
  });

  // --------------------------------------------------------------------------
  // 7. Initial Watches & Storage Hydration
  // --------------------------------------------------------------------------
  it("initializes from provided initial watches", () => {
    const initial = [
      {
        id: "w_preset_1",
        expression: "state.items.length",
        name: "Cart Count",
        isEnabled: true,
        createdAt: 1000,
      },
    ];
    const customManager = new WatchExpressionManager(initial);
    assert.equal(customManager.getWatches().length, 1);
    assert.equal(customManager.getWatch("w_preset_1")?.expression, "state.items.length");
  });
});
