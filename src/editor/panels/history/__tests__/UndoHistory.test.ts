import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useHistoryStore } from "../../../../core/store/useHistoryStore";
import { useProjectStore } from "../../../../core/store/useProjectStore";
import { DiagnosticBus } from "../../../../core/engine/DiagnosticBus";
import { DiagnosticEvent } from "../../../../core/types/diagnostics";

describe("Sub-Phase 8.1: Panel 23 — Undo History & Transaction Graph", () => {
  beforeEach(() => {
    // Reset history store
    useHistoryStore.getState().clearHistory();

    // Reset project store to valid baseline
    useProjectStore.setState({
      projectName: "Test App",
      activePageId: "page_home",
      pages: {
        page_home: {
          id: "page_home",
          name: "Home",
          slug: "/",
          rootElementId: "el_root",
        },
      },
      elements: {
        el_root: {
          id: "el_root",
          name: "Root Container",
          archetype: "container",
          parentId: null,
          children: [],
          properties: {
            title: "Original Title",
          },
        },
      },
      databaseSchemas: {},
      redirectRules: {},
    });
  });

  it("should record transactions with explicit category, entity tags, and diff summaries", () => {
    const historyStore = useHistoryStore.getState();

    historyStore.pushTransaction({
      actionLabel: "Update Button Variant",
      actionCategory: "property",
      snapshot: { buttonText: "Click Me" },
      entityId: "btn_1",
      entityName: "Submit Button",
      propertyKey: "variant",
      diffSummary: "variant: 'outline' -> 'primary'",
    });

    const timeline = historyStore.getTimeline();
    assert.strictEqual(timeline.past.length, 1);
    const tx = timeline.past[0];
    assert.strictEqual(tx.actionLabel, "Update Button Variant");
    assert.strictEqual(tx.actionCategory, "property");
    assert.strictEqual(tx.entityId, "btn_1");
    assert.strictEqual(tx.entityName, "Submit Button");
    assert.strictEqual(tx.propertyKey, "variant");
    assert.strictEqual(tx.diffSummary, "variant: 'outline' -> 'primary'");
    assert.strictEqual(tx.groupCount, 1);
  });

  it("should auto-infer action category when pushState is called without explicit category", () => {
    const historyStore = useHistoryStore.getState();

    historyStore.pushState("Create Page /dashboard", { page: 1 });
    historyStore.pushState("Wire Blueprint Pin", { node: 1 });
    historyStore.pushState("Add Schema Table Users", { table: 1 });
    historyStore.pushState("Update Container Background Color", { color: "#fff" });
    historyStore.pushState("Change Property label to Submit", { prop: "submit" });
    historyStore.pushState("Update Variable isLoggedIn", { var: true });
    historyStore.pushState("Move Element to Container", { el: "btn" });
    historyStore.pushState("Batch Refresh All", { refresh: true });

    const timeline = historyStore.getTimeline();
    assert.strictEqual(timeline.past.length, 8);
    assert.strictEqual(timeline.past[0].actionCategory, "page");
    assert.strictEqual(timeline.past[1].actionCategory, "blueprint");
    assert.strictEqual(timeline.past[2].actionCategory, "database");
    assert.strictEqual(timeline.past[3].actionCategory, "style");
    assert.strictEqual(timeline.past[4].actionCategory, "property");
    assert.strictEqual(timeline.past[5].actionCategory, "variable");
    assert.strictEqual(timeline.past[6].actionCategory, "canvas");
    assert.strictEqual(timeline.past[7].actionCategory, "general");
  });

  it("should group sequential rapid edits within 800ms debounce window and increment groupCount", () => {
    const historyStore = useHistoryStore.getState();

    // 1st edit to title property
    historyStore.pushTransaction({
      actionLabel: "Type 'H'",
      entityId: "el_root",
      propertyKey: "title",
      snapshot: { title: "H" },
    });

    assert.strictEqual(useHistoryStore.getState().past.length, 1);
    assert.strictEqual(useHistoryStore.getState().past[0].groupCount, 1);

    // 2nd edit immediately following (within 800ms) with same entityId + propertyKey
    historyStore.pushTransaction({
      actionLabel: "Type 'He'",
      entityId: "el_root",
      propertyKey: "title",
      snapshot: { title: "He" },
      diffSummary: "title: 'H' -> 'He'",
    });

    assert.strictEqual(useHistoryStore.getState().past.length, 1);
    assert.strictEqual(useHistoryStore.getState().past[0].groupCount, 2);
    assert.strictEqual(useHistoryStore.getState().past[0].actionLabel, "Type 'He'");
    assert.deepStrictEqual(useHistoryStore.getState().past[0].snapshot, { title: "He" });
    assert.strictEqual(useHistoryStore.getState().past[0].diffSummary, "title: 'H' -> 'He'");

    // 3rd edit with different propertyKey creates a new transaction
    historyStore.pushTransaction({
      actionLabel: "Change Padding",
      entityId: "el_root",
      propertyKey: "padding",
      snapshot: { title: "He", padding: 16 },
    });

    assert.strictEqual(useHistoryStore.getState().past.length, 2);
    assert.strictEqual(useHistoryStore.getState().past[1].groupCount, 1);
  });

  it("should jump backwards to arbitrary past state without linear stepping", () => {
    const historyStore = useHistoryStore.getState();

    historyStore.pushTransaction({
      actionLabel: "Step 1: Init",
      snapshot: { step: 1 },
    });
    const tx1Id = useHistoryStore.getState().past[0].id;

    historyStore.pushTransaction({
      actionLabel: "Step 2: Add Button",
      snapshot: { step: 2 },
    });

    historyStore.pushTransaction({
      actionLabel: "Step 3: Change Color",
      snapshot: { step: 3 },
    });

    assert.strictEqual(useHistoryStore.getState().past.length, 3);
    assert.strictEqual(useHistoryStore.getState().future.length, 0);

    // Jump directly from Step 3 to Step 1
    const restored = historyStore.jumpToState(tx1Id, { step: 3, head: true });
    assert.deepStrictEqual(restored, { step: 1 });

    // Past should now contain 0 items (since we jumped to the first item)
    assert.strictEqual(useHistoryStore.getState().past.length, 0);
    // Future should contain Step 3 (head jumped from) and intervening Step 3, Step 2
    assert.strictEqual(useHistoryStore.getState().future.length, 3);
  });

  it("should jump forwards to arbitrary future state", () => {
    const historyStore = useHistoryStore.getState();

    historyStore.pushTransaction({
      actionLabel: "Step 1: Init",
      snapshot: { step: 1 },
    });
    historyStore.pushTransaction({
      actionLabel: "Step 2: Add Button",
      snapshot: { step: 2 },
    });
    historyStore.pushTransaction({
      actionLabel: "Step 3: Change Color",
      snapshot: { step: 3 },
    });

    // Undo twice to populate future stack
    historyStore.undo({ step: 3 });
    historyStore.undo({ step: 2 });

    assert.strictEqual(useHistoryStore.getState().past.length, 1);
    assert.strictEqual(useHistoryStore.getState().future.length, 2);

    const targetTx = useHistoryStore.getState().future[1]; // Step 3
    const restored = historyStore.jumpToState(targetTx.id, { step: 1 });

    assert.deepStrictEqual(restored, { step: 3 });
    assert.strictEqual(useHistoryStore.getState().future.length, 0);
    assert.strictEqual(useHistoryStore.getState().past.length, 3);
  });

  it("should detect corrupted snapshots and emit [UNDO_STACK_CORRUPT] via DiagnosticBus", () => {
    const historyStore = useHistoryStore.getState();
    const emittedDiagnostics: DiagnosticEvent[] = [];
    const unsubscribe = DiagnosticBus.subscribe((evt) => {
      if (evt.channel === "UNDO_STACK_CORRUPT") {
        emittedDiagnostics.push(evt);
      }
    });

    // Push a transaction with null snapshot
    useHistoryStore.setState({
      past: [
        {
          id: "corrupt_tx_1",
          actionLabel: "Corrupted Action",
          actionCategory: "general",
          timestamp: Date.now(),
          snapshot: null as unknown as object,
        },
      ],
      future: [],
    });

    // Attempt undo
    const result = historyStore.undo({ valid: true });
    assert.strictEqual(result, null);
    assert.strictEqual(emittedDiagnostics.length, 1);
    assert.strictEqual(emittedDiagnostics[0].channel, "UNDO_STACK_CORRUPT");
    assert.strictEqual(emittedDiagnostics[0].severity, "error");
    assert.ok(emittedDiagnostics[0].message.includes("integrity violation"));

    // Attempt jumpToState
    const jumpResult = historyStore.jumpToState("corrupt_tx_1", { valid: true });
    assert.strictEqual(jumpResult, null);
    assert.strictEqual(emittedDiagnostics.length, 2);

    unsubscribe();
  });

  it("should integrate with useProjectStore.jumpToHistoryState to cleanly restore AST state", () => {
    const projectStore = useProjectStore.getState();

    // 1. Initial snapshot taken when element has title "Original Title"
    const snap1 = projectStore.getSnapshot();
    useHistoryStore.getState().pushTransaction({
      actionLabel: "Initial Baseline",
      actionCategory: "canvas",
      snapshot: snap1,
    });
    const txId1 = useHistoryStore.getState().past[0].id;

    // 2. Mutate project store
    useProjectStore.setState({
      elements: {
        el_root: {
          id: "el_root",
          name: "Root Container",
          archetype: "container",
          parentId: null,
          children: [],
          properties: {
            title: "Updated Title After Changes",
          },
        },
      },
    });

    assert.strictEqual(
      useProjectStore.getState().elements.el_root.properties.title,
      "Updated Title After Changes"
    );

    // 3. Jump to history state
    useProjectStore.getState().jumpToHistoryState(txId1);

    // 4. Verify AST state restored back to Original Title
    assert.strictEqual(
      useProjectStore.getState().elements.el_root.properties.title,
      "Original Title"
    );
  });
});
