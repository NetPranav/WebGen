import test from "node:test";
import assert from "node:assert/strict";
import { useProjectStore } from "../useProjectStore";
import { useSelectionStore } from "../useSelectionStore";
import { useHistoryStore } from "../useHistoryStore";
import { EventBus } from "../../events/EventBus";
import { ConnectionPipeline } from "../../engine/ConnectionPipeline";
import { DiagnosticBus } from "../../engine/DiagnosticBus";
import { StateVariableValidator } from "../../engine/StateVariableValidator";
import { documentCommands, historyCommands } from "@/core/store/useDocumentStore";

test("useProjectStore: Initializes with default pages, elements, and schemas", () => {
  const state = useProjectStore.getState();
  assert.equal(state.activePageId, "page_home");
  assert.ok(state.document.layers["el_hero_heading"]);
  assert.ok(state.document.layers["el_buy_button"]);
  assert.ok(state.databaseSchemas["Products"]);
  assert.ok(state.stateVariables["cartTotal"]);
});

test("useProjectStore: Mutates element properties and pushes undo history", () => {
  useHistoryStore.getState().clearHistory();

  // Initial title
  const initialTitle = useProjectStore.getState().document.layers["el_hero_heading"].properties.textContent;

  // Mutate with history label
  documentCommands.updateProps("el_hero_heading", { textContent: "NextGen Studio" }, "Edit Hero Heading");

  assert.equal(
    useProjectStore.getState().document.layers["el_hero_heading"].properties.textContent,
    "NextGen Studio"
  );
  assert.equal(useHistoryStore.getState().canUndo(), true);
  assert.equal(useHistoryStore.getState().getLastActionLabel(), "Edit Hero Heading");

  // Undo
  historyCommands.undo();
  assert.equal(
    useProjectStore.getState().document.layers["el_hero_heading"].properties.textContent,
    initialTitle
  );
  assert.equal(useHistoryStore.getState().canRedo(), true);

  // Redo
  historyCommands.redo();
  assert.equal(
    useProjectStore.getState().document.layers["el_hero_heading"].properties.textContent,
    "NextGen Studio"
  );
});

test("useProjectStore & ConnectionPipeline: State variable update triggers reactive binding evaluation", () => {
  ConnectionPipeline.clear();

  // Register binding: stateVariables.cartTotal -> buy_button.label with currency transform
  useProjectStore.getState().registerBinding({
    id: "bind_cart_button",
    target: {
      elementId: "el_buy_button",
      elementName: "BuyButton",
      archetype: "button",
      propertyKey: "label",
    },
    sourceType: "state_variable",
    stateVariableId: "cartTotal",
    transformFn: "currency_usd",
  });

  // Initial evaluation
  const ctx = useProjectStore.getState().getDataContext();
  const { properties } = ConnectionPipeline.evaluateElementProperties("el_buy_button", ctx);
  assert.equal(properties.label, "$0.00");

  // Update state variable in store
  useProjectStore.getState().updateStateVariable("cartTotal", 49.99);

  // Verify updated context
  const updatedCtx = useProjectStore.getState().getDataContext();
  const { properties: updatedProps } = ConnectionPipeline.evaluateElementProperties("el_buy_button", updatedCtx);
  assert.equal(updatedProps.label, "$49.99");
});

test("useSelectionStore: Manages entity selections and multi-select", () => {
  useSelectionStore.getState().clearSelection();

  assert.equal(useSelectionStore.getState().selectedId, null);

  // Single select
  useSelectionStore.getState().select("el_hero_heading", "element");
  assert.equal(useSelectionStore.getState().selectedId, "el_hero_heading");
  assert.equal(useSelectionStore.getState().isSelected("el_hero_heading"), true);

  // Multi select
  useSelectionStore.getState().toggleSelection("el_buy_button", "element");
  assert.equal(useSelectionStore.getState().selectedIds.length, 2);
  assert.equal(useSelectionStore.getState().isSelected("el_buy_button"), true);

  // Clear
  useSelectionStore.getState().clearSelection();
  assert.equal(useSelectionStore.getState().selectedIds.length, 0);
});

test("EventBus: Dispatches and cleans up listeners cleanly", () => {
  EventBus.clear();
  let receivedPayload: unknown = null;

  const unsubscribe = EventBus.on("test:event", (payload) => {
    receivedPayload = payload;
  });

  EventBus.emit("test:event", { score: 100 });
  assert.deepEqual(receivedPayload, { score: 100 });

  // Unsubscribe and verify no further events
  unsubscribe();
  EventBus.emit("test:event", { score: 200 });
  assert.deepEqual(receivedPayload, { score: 100 });
});

test("StateVariableValidator: Valid values pass without warnings", () => {
  DiagnosticBus.clearHistory();

  const numResult = StateVariableValidator.validateAndEmit("test_num", "number", "42");
  assert.equal(numResult.isValid, true);
  assert.equal(numResult.parsedValue, 42);

  const boolResult = StateVariableValidator.validateAndEmit("test_bool", "boolean", "true");
  assert.equal(boolResult.isValid, true);
  assert.equal(boolResult.parsedValue, true);

  const jsonResult = StateVariableValidator.validateAndEmit("test_json", "json", '{"key": "val"}');
  assert.equal(jsonResult.isValid, true);
  assert.deepEqual(jsonResult.parsedValue, { key: "val" });

  assert.equal(DiagnosticBus.getHistoryByChannel("STATE_VAR_WARN").length, 0);
});

test("StateVariableValidator: Traps invalid initial value ('hello' for number) and emits [STATE_VAR_WARN]", () => {
  DiagnosticBus.clearHistory();

  const trapped = StateVariableValidator.validateAndEmit("test_price", "number", "hello", "global");

  assert.equal(trapped.isValid, false);
  assert.equal(trapped.parsedValue, 0);
  assert.equal(trapped.fallbackValue, 0);

  const warnings = DiagnosticBus.getHistoryByChannel("STATE_VAR_WARN");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].channel, "STATE_VAR_WARN");
  assert.equal(warnings[0].severity, "warning");
  assert.equal(warnings[0].source.entityId, "test_price");
  assert.match(warnings[0].message, /Type Mismatch on Variable 'test_price'/);
  assert.match(warnings[0].message, /initial value string 'hello' is invalid for this type/);
});

test("useProjectStore.addStateVariable: Traps type mismatch on creation and logs [STATE_VAR_WARN]", () => {
  DiagnosticBus.clearHistory();

  useProjectStore.getState().addStateVariable({
    id: "user_score",
    name: "user_score",
    type: "number",
    value: "hello",
    defaultValue: "hello",
    scope: "global",
  });

  // Value in store should be sanitized fallback 0
  const createdVar = useProjectStore.getState().stateVariables["user_score"];
  assert.ok(createdVar);
  assert.equal(createdVar.value, 0);

  // DiagnosticBus should record STATE_VAR_WARN
  const warnings = DiagnosticBus.getHistoryByChannel("STATE_VAR_WARN");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].source.entityId, "user_score");
});

