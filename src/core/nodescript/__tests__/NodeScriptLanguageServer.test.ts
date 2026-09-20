import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NodeScriptLanguageServer } from "../LanguageServer";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";

describe("Sub-Phase 5.3: NodeScript Language Server", () => {
  // --------------------------------------------------------------------------
  // 1. Autocompletion Engine
  // --------------------------------------------------------------------------
  it("should provide contextual node type autocompletions after 'node alias : '", () => {
    const source = `graph TestGraph {\n  node btn : \n}`;
    // Position at line 2, column 14 (after "node btn : ")
    const completions = NodeScriptLanguageServer.getCompletions(source, {
      line: 2,
      column: 14,
    });

    assert.ok(completions.length > 0);
    const hasEventClick = completions.some(
      (c) => c.label === "Event.onClick" || c.label === "event/onClick"
    );
    assert.ok(hasEventClick, "Should suggest Event.onClick");

    const hasMathAdd = completions.some(
      (c) => c.label === "Math.add" || c.label === "math/add"
    );
    assert.ok(hasMathAdd, "Should suggest Math.add");
  });

  it("should provide output pin autocompletions after 'wire sourceNode.'", () => {
    const source = `graph TestGraph {\n  node btn : event/onClick\n  wire btn.\n}`;
    const completions = NodeScriptLanguageServer.getCompletions(source, {
      line: 3,
      column: 12,
    });

    assert.ok(completions.length > 0);
    const pinNames = completions.map((c) => c.label);
    assert.ok(pinNames.includes("exec"), "Should include 'exec' output pin");
  });

  it("should provide target node alias completions after 'wire source.pin -> '", () => {
    const source = `graph TestGraph {\n  node btn : event/onClick\n  node math : math/add\n  wire btn.exec -> \n}`;
    const completions = NodeScriptLanguageServer.getCompletions(source, {
      line: 4,
      column: 20,
    });

    const labels = completions.map((c) => c.label);
    assert.ok(labels.includes("btn"));
    assert.ok(labels.includes("math"));
  });

  it("should provide target input pin completions after 'wire source.pin -> target.'", () => {
    const source = `graph TestGraph {\n  node btn : event/onClick\n  node branch : flow/branch\n  wire btn.exec -> branch.\n}`;
    const completions = NodeScriptLanguageServer.getCompletions(source, {
      line: 4,
      column: 27,
    });

    const pinNames = completions.map((c) => c.label);
    assert.ok(pinNames.includes("execIn"), "flow/branch has execIn input pin");
    assert.ok(pinNames.includes("condition"), "flow/branch has condition input pin");
  });

  // --------------------------------------------------------------------------
  // 2. Inline Diagnostics & Type Checking (<100ms budget)
  // --------------------------------------------------------------------------
  it("should validate valid graphs with 0 diagnostic errors", () => {
    const validSource = `
graph ValidGraph {
  node btn : event/onClick
  node branch : flow/branch
  wire btn.exec -> branch.execIn
}
`;
    const diagnostics = NodeScriptLanguageServer.validateDocument(validSource);
    assert.strictEqual(diagnostics.length, 0);
  });

  it("should surface [PIN_TYPE_MISMATCH] within <100ms when wiring exec pin to a data pin", () => {
    const invalidSource = `
graph BadWiring {
  node btn : event/onClick
  node branch : flow/branch
  wire btn.exec -> branch.condition
}
`;

    let busEmitted = false;
    let emittedMessage = "";

    const unsubscribe = DiagnosticBus.subscribe((diagnostic) => {
      if (
        diagnostic.channel === "BLUEPRINT_ERR" &&
        diagnostic.message.includes("PIN_TYPE_MISMATCH")
      ) {
        busEmitted = true;
        emittedMessage = diagnostic.message;
      }
    });

    const start = performance.now();
    const diagnostics = NodeScriptLanguageServer.validateDocument(invalidSource, {
      emitDiagnostics: true,
    });
    const duration = performance.now() - start;

    unsubscribe();

    // Verify performance budget (<100ms)
    assert.ok(duration < 100, `Validation must execute in <100ms, took ${duration.toFixed(2)}ms`);

    // Verify diagnostic output
    assert.strictEqual(diagnostics.length, 1);
    const diag = diagnostics[0];
    assert.strictEqual(diag.code, "PIN_TYPE_MISMATCH");
    assert.strictEqual(diag.severity, "error");
    assert.ok(diag.message.includes("Execution flow pin"));
    assert.strictEqual(diag.range.start.line, 5);

    // Verify DiagnosticBus integration
    assert.ok(busEmitted, "Should emit PIN_TYPE_MISMATCH to DiagnosticBus");
    assert.ok(emittedMessage.includes("Execution flow pin"));
  });

  it("should surface UNDEFINED_NODE when referencing a non-existent node in wires", () => {
    const source = `
graph MissingNode {
  node btn : event/onClick
  wire btn.exec -> nonExistent.exec
}
`;
    const diagnostics = NodeScriptLanguageServer.validateDocument(source);
    assert.ok(diagnostics.length >= 1);
    assert.strictEqual(diagnostics[0].code, "UNDEFINED_NODE");
  });

  // --------------------------------------------------------------------------
  // 3. Hover Documentation Provider
  // --------------------------------------------------------------------------
  it("should provide rich markdown hover tooltips for node types", () => {
    const source = `graph Test {\n  node btn : event/onClick\n}`;
    const hover = NodeScriptLanguageServer.getHover(source, {
      line: 2,
      column: 16,
    });

    assert.ok(hover);
    assert.ok(hover.contents.includes("Event: OnClick"));
    assert.ok(hover.contents.includes("Events"));
    assert.ok(hover.contents.includes("Outputs:"));
    assert.ok(hover.contents.includes("exec"));
  });
});
