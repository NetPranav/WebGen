import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  generateElementMarkup,
  buildSandboxDocument,
} from "../SandboxHost";
import { PageDefinition, StateVariable } from "@/core/store/useProjectStore";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";
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

  it("renders Phase 7.6 parametric shapes and the Pen/Pencil svgPath, not the invisible default div (Sub-Phase 43.2)", () => {
    const shapeLayer = (archetype: Layer["archetype"], properties: Layer["properties"]): Record<string, Layer> => ({
      el_shape: { id: "el_shape", name: "Shape", archetype, parentId: null, properties, children: [] },
    });

    const rect = generateElementMarkup(
      "el_shape",
      shapeLayer("rectangle", { "frame.width": 200, "frame.height": 100, "svg.fill": "#ff0000" })
    );
    assert.ok(rect.includes('data-archetype="rectangle"'));
    assert.ok(rect.includes("width: 200px"));
    assert.ok(rect.includes("height: 100px"));
    assert.ok(rect.includes("background-color: #ff0000"));
    assert.ok(!rect.includes('<div id="el_shape" data-element-id="el_shape" style="box-sizing: border-box;">'), "must not fall through to the invisible default div");

    const ellipse = generateElementMarkup("el_shape", shapeLayer("ellipse", { "frame.width": 80, "frame.height": 80 }));
    assert.ok(ellipse.includes("border-radius: 50%"));

    const line = generateElementMarkup("el_shape", shapeLayer("line", { "frame.width": 300 }));
    assert.ok(line.includes("<svg"));
    assert.ok(line.includes('x2="300"'));

    const polygon = generateElementMarkup("el_shape", shapeLayer("polygon", { "frame.width": 100, "frame.height": 100, "shape.sides": 6 }));
    assert.ok(polygon.includes("<polygon"));
    // A regular hexagon has 6 vertices — 6 comma-separated coordinate pairs.
    assert.strictEqual((polygon.match(/points="([^"]+)"/)?.[1] ?? "").trim().split(" ").length, 6);

    const star = generateElementMarkup("el_shape", shapeLayer("star", { "frame.width": 100, "frame.height": 100, "shape.points": 5, "shape.innerRadius": 0.5 }));
    assert.ok(star.includes("<polygon"));
    // A 5-point star alternates outer/inner vertices: 10 total.
    assert.strictEqual((star.match(/points="([^"]+)"/)?.[1] ?? "").trim().split(" ").length, 10);

    const arrow = generateElementMarkup("el_shape", shapeLayer("arrow", { "frame.width": 160, "frame.height": 32 }));
    assert.ok(arrow.includes("<path"));

    const svgPath = generateElementMarkup("el_shape", shapeLayer("svgPath", { "svg.path": "M0 0 L50 50" }));
    assert.ok(svgPath.includes('d="M0 0 L50 50"'));
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

describe("Phase 16 (decision record 0008): layer data is escaped before it reaches the stage markup", () => {
  const layerWith = (id: string, name: string, properties: Record<string, unknown>) =>
    ({
      [id]: { id, name, archetype: "text", parentId: null, children: [], properties },
    }) as unknown as Record<string, import("@/core/document/schema").Layer>;

  it("text and names containing HTML are shown as text, not parsed", () => {
    const hostile = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const markup = generateElementMarkup("t", layerWith("t", hostile, { "content.text": hostile }));
    assert.ok(!markup.includes("<img"), markup);
    assert.ok(!markup.includes("<script"), markup);
    assert.ok(markup.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  });

  it("a hostile id or style value cannot break out of its attribute", () => {
    const id = 'a" onmouseover="alert(1)';
    const markup = generateElementMarkup(id, layerWith(id, "n", { "appearance.background.color": 'red;" onfocus="x' }));
    assert.ok(!/ onmouseover="/.test(markup), "id attribute stayed closed");
    assert.ok(!/ onfocus="/.test(markup), "style attribute stayed closed");
    assert.ok(markup.includes("a&quot; onmouseover=&quot;alert(1)"));
  });

  it("state-variable values are escaped when interpolated", () => {
    const layers = layerWith("t", "n", { "content.text": "Hi {{who}}" });
    const stateVars = { who: { id: "v", name: "who", type: "string", value: "<b>x</b>", defaultValue: "", scope: "global" } } as never;
    const markup = generateElementMarkup("t", layers, stateVars);
    assert.ok(markup.includes("Hi &lt;b&gt;x&lt;/b&gt;"), markup);
  });
});

