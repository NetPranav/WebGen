import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  generateElementMarkup,
  buildSandboxDocument,
} from "../../../editor/runtime/SandboxHost";
import { PageDefinition, StateVariable } from "../../store/useProjectStore";
import { DiagnosticBus } from "../../engine/DiagnosticBus";
import type { Layer } from "@/core/document/schema";

describe("Sub-Phase 5.1: In-Memory Runtime Sandbox Host", () => {
  beforeEach(() => {
    DiagnosticBus.clearHistory();
  });

  it("reconciles AST element hierarchy into DOM markup", () => {
    const elements: Record<string, Layer> = {
      el_root: {
        id: "el_root",
        name: "Root Container",
        archetype: "container",
        parentId: null,
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.gap": 20,
          "layout.padding": 30,
          "appearance.background.color": "#1E293B",
        },
        children: ["el_title", "el_action_btn"],
      },
      el_title: {
        id: "el_title",
        name: "Page Title",
        archetype: "text",
        parentId: "el_root",
        properties: {
          "content.text": "Welcome {{userName}}",
          "typography.fontSize": 28,
          "typography.color": "#FFFFFF",
        },
        children: [],
      },
      el_action_btn: {
        id: "el_action_btn",
        name: "Action Button",
        archetype: "button",
        parentId: "el_root",
        properties: {
          "content.label": "Deploy Now",
          "appearance.background.color": "#206859",
          "interaction.disabled": false,
        },
        children: [],
      },
    };

    const stateVars: Record<string, StateVariable> = {
      userName: {
        id: "var_user",
        name: "userName",
        type: "string",
        value: "Antigravity Engineer",
        defaultValue: "Guest",
        scope: "global",
      },
    };

    const markup = generateElementMarkup("el_root", elements, stateVars);

    // Verify container attributes
    assert.ok(markup.includes('id="el_root"'));
    assert.ok(markup.includes('data-archetype="container"'));
    assert.ok(markup.includes("background-color: #1E293B"));

    // Verify interpolated text content
    assert.ok(markup.includes("Welcome Antigravity Engineer"));

    // Verify button element
    assert.ok(markup.includes('id="el_action_btn"'));
    assert.ok(markup.includes("Deploy Now"));
    assert.ok(markup.includes("background-color: #206859"));
  });

  it("builds an isolated standalone sandbox HTML document with exception trapping", () => {
    const page: PageDefinition = {
      id: "page_main",
      name: "Dashboard",
      slug: "/dashboard",
      rootElementId: "el_card",
    };

    const elements: Record<string, Layer> = {
      el_card: {
        id: "el_card",
        name: "Feature Card",
        archetype: "container",
        parentId: null,
        properties: {
          isCard: true,
          "layout.padding": 16,
        },
        children: ["el_input"],
      },
      el_input: {
        id: "el_input",
        name: "Email Input",
        archetype: "input",
        parentId: "el_card",
        properties: {
          "input.placeholder": "Enter work email...",
          "input.value": "test@engine.dev",
        },
        children: [],
      },
    };

    const doc = buildSandboxDocument(page, elements, {});

    // Must be a valid full HTML5 document
    assert.ok(doc.startsWith("<!DOCTYPE html>"));
    assert.ok(doc.includes("<html"));
    assert.ok(doc.includes("sandbox-root"));

    // Must include the fail-safe exception trapping script
    assert.ok(doc.includes("window.onerror"));
    assert.ok(doc.includes("unhandledrejection"));
    assert.ok(doc.includes("SANDBOX_RUNTIME_ERROR"));
    assert.ok(doc.includes("SANDBOX_CONSOLE_ERROR"));
    assert.ok(doc.includes("SANDBOX_ELEMENT_CLICK"));

    // Must contain the reconciled AST elements
    assert.ok(doc.includes('id="el_card"'));
    assert.ok(doc.includes("Enter work email..."));
    assert.ok(doc.includes("test@engine.dev"));
  });

  it("traps runtime exceptions and routes them to DiagnosticBus on SANDBOX_ERR channel", () => {
    // Simulate trapped runtime exception forwarded from sandbox
    const simulatedErrorMsg = "TypeError: Cannot read properties of undefined (reading 'calculateTotal')";

    DiagnosticBus.emit({
      channel: "SANDBOX_ERR",
      severity: "error",
      source: {
        panel: "Panel 07: Output Console (Sandbox Host)",
        entityId: "sandbox-runtime",
        entityName: "Play Mode Runtime",
      },
      message: `[SANDBOX_ERR] ${simulatedErrorMsg}`,
      suggestion: "Check your event handlers, variable bindings, or script logic for null references.",
    });

    const sandboxErrors = DiagnosticBus.getHistoryByChannel("SANDBOX_ERR");
    assert.equal(sandboxErrors.length, 1);
    assert.equal(sandboxErrors[0].channel, "SANDBOX_ERR");
    assert.equal(sandboxErrors[0].severity, "error");
    assert.ok(sandboxErrors[0].message.includes(simulatedErrorMsg));
    assert.equal(sandboxErrors[0].source.panel, "Panel 07: Output Console (Sandbox Host)");
  });

  it("handles lifecycle notifications on SANDBOX_INFO channel", () => {
    DiagnosticBus.emit({
      channel: "SANDBOX_INFO",
      severity: "info",
      source: {
        panel: "SandboxHost",
        entityId: "sandbox-ready",
        entityName: "Play Mode Host",
      },
      message: "Sandbox iframe runtime successfully initialized and DOM reconciled.",
    });

    const infoEvents = DiagnosticBus.getHistoryByChannel("SANDBOX_INFO");
    assert.equal(infoEvents.length, 1);
    assert.equal(infoEvents[0].channel, "SANDBOX_INFO");
    assert.ok(infoEvents[0].message.includes("initialized"));
  });
});
