import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { StyleEmitter, TokenThemeInput } from "../emitters/StyleEmitter";
import type { Layer } from "@/core/document/schema";

describe("Sub-Phase 6.1: StyleEmitter (Scoped CSS & Design Tokens)", () => {
  // --------------------------------------------------------------------------
  // 1. Design Token Emission
  // --------------------------------------------------------------------------
  it("compiles design tokens into :root CSS custom properties", () => {
    const mockTheme: TokenThemeInput = {
      colors: {
        canvasBg: "#0F172A",
        accentPrimary: "#206859",
        textPrimary: "#F8FAFC",
        borderDefault: "#334155",
      },
      wires: {
        exec: "#FFFFFF",
        string: "#F59E0B",
        number: "#10B981",
      },
    };

    const tokenFile = StyleEmitter.emitTokens(mockTheme);
    assert.equal(tokenFile.language, "css");
    assert.equal(tokenFile.path, "styles/tokens.css");
    assert.match(tokenFile.content, /:root \{/);
    assert.match(tokenFile.content, /--color-canvas-bg: #0F172A;/);
    assert.match(tokenFile.content, /--color-accent-primary: #206859;/);
    assert.match(tokenFile.content, /--color-text-primary: #F8FAFC;/);
    assert.match(tokenFile.content, /--wire-exec: #FFFFFF;/);
    assert.match(tokenFile.content, /--wire-string: #F59E0B;/);
  });

  // --------------------------------------------------------------------------
  // 2. Element Property Translation & Kebab-Casing
  // --------------------------------------------------------------------------
  it("maps canonical property paths to CSS through the registry and formats units", () => {
    const containerEl: Layer = {
      id: "el_card_123",
      name: "HeroCard",
      archetype: "container",
      parentId: null,
      properties: {
        "layout.display": "flex",
        "layout.flexDirection": "column",
        "layout.gap": 24,
        "layout.padding": 32,
        "appearance.background.color": "#1E293B",
        "appearance.radius": 12,
        "appearance.opacity": 0.95,
        "typography.fontWeight": 600,
      },
      children: [],
    };

    const rules = StyleEmitter.emitElementRules(containerEl);
    assert.match(rules, /\.herocard_card_123 \{/);
    assert.match(rules, /display: flex;/);
    assert.match(rules, /flex-direction: column;/);
    assert.match(rules, /gap: 24px;/);
    assert.match(rules, /padding: 32px;/);
    assert.match(rules, /background-color: #1E293B;/);
    assert.match(rules, /border-radius: 12px;/);
    assert.match(rules, /opacity: 0.95;/); // Unitless preserved
    assert.match(rules, /font-weight: 600;/); // Unitless preserved
  });

  // --------------------------------------------------------------------------
  // 3. Pseudo-Classes & Archetype Defaults
  // --------------------------------------------------------------------------
  it("emits archetype defaults and pseudo-classes (:hover, :active, :disabled)", () => {
    const btnEl: Layer = {
      id: "el_btn_submit",
      name: "SubmitBtn",
      archetype: "button",
      parentId: null,
      properties: {
        "appearance.background.color": "#206859",
        "typography.color": "#FFFFFF",
      },
      children: [],
    };

    const rules = StyleEmitter.emitElementRules(btnEl, {
      stateStyles: {
        hover: { "appearance.background.color": "#2A8572", "transform.y": -2 },
        active: { "transform.y": 0 },
      },
    });
    assert.match(rules, /cursor: pointer;/);
    assert.match(rules, /display: inline-flex;/);
    assert.match(rules, /\.submitbtn_btn_subm:hover \{/);
    assert.match(rules, /background-color: #2A8572;/);
    assert.match(rules, /transform: translateY\(-2px\);/);
    assert.match(rules, /transform: translateY\(0px\);/);
    assert.match(rules, /\.submitbtn_btn_subm:active \{/);
    assert.match(rules, /\.submitbtn_btn_subm:disabled \{/);
  });

  // --------------------------------------------------------------------------
  // 4. Responsive Media Queries
  // --------------------------------------------------------------------------
  it("emits media queries for responsive breakpoint overrides", () => {
    const el: Layer = {
      id: "el_grid_responsive",
      name: "ProductGrid",
      archetype: "container",
      parentId: null,
      properties: {
        "layout.display": "grid",
        "layout.gridTemplateColumns": "repeat(3, 1fr)",
      },
      children: [],
    };

    const rules = StyleEmitter.emitElementRules(el, {
      breakpointOverrides: { mobile: { "layout.gridTemplateColumns": "1fr", "layout.padding": 16 } },
    });
    assert.match(rules, /@media \(max-width: 640px\) \{/);
    assert.match(rules, /grid-template-columns: 1fr;/);
    assert.match(rules, /padding: 16px;/);
  });

  it("combines transform and filter paths, honours unit companions, and skips non-CSS paths", () => {
    const el: Layer = {
      id: "el_mix",
      name: "Mix",
      archetype: "text",
      parentId: null,
      properties: {
        "transform.x": 10,
        "transform.rotate": 45,
        "transform.scale": 1.2,
        "filter.blur": 4,
        "typography.fontSize": 2,
        "typography.fontSizeUnit": "rem",
        "content.text": "Hello",
      },
      children: [],
    };
    const rules = StyleEmitter.emitElementRules(el);
    assert.match(rules, /transform: translateX\(10px\) rotate\(45deg\) scale\(1.2\);/);
    assert.match(rules, /filter: blur\(4px\);/);
    assert.match(rules, /font-size: 2rem;/);
    assert.doesNotMatch(rules, /Hello|content|font-size-unit/);
  });

  // --------------------------------------------------------------------------
  // 5. Project-Level Stylesheet Compilation
  // --------------------------------------------------------------------------
  it("compiles all elements into a unified scoped stylesheet", () => {
    const elements: Record<string, Layer> = {
      el_1: {
        id: "el_1",
        name: "Header",
        archetype: "container",
        parentId: null,
        properties: { "frame.height": 64 },
        children: [],
      },
      el_2: {
        id: "el_2",
        name: "Logo",
        archetype: "image",
        parentId: "el_1",
        properties: { "frame.width": 120 },
        children: [],
      },
    };

    const file = StyleEmitter.emitProjectStyles(elements);
    assert.equal(file.path, "styles/elements.css");
    assert.match(file.content, /\.header_1 \{/);
    assert.match(file.content, /\.logo_2 \{/);
  });
});

describe("StyleEmitter geometry (Phase 42.3)", () => {
  const layer = (parentId: string | null, properties: Layer["properties"]): Layer => ({
    id: "el_geo",
    name: "Geo",
    archetype: "container",
    parentId,
    children: [],
    properties,
  });

  it("emits fixed sizes with their unit, explicit fill as 100%, and nothing for hug", () => {
    const rules = StyleEmitter.emitElementRules(
      layer("root", { "frame.width": 50, "frame.widthUnit": "%", "frame.height": 120, "sizing.vertical": "fixed" })
    );
    assert.match(rules, /width: 50%;/);
    assert.match(rules, /height: 120px;/);
    assert.doesNotMatch(StyleEmitter.emitElementRules(layer("root", {})), /width|height/);
    assert.match(StyleEmitter.emitElementRules(layer("root", { "sizing.horizontal": "fill" })), /width: 100%;/);
  });

  it("positions absolute children, never roots, and emits layout rotation separately from transform", () => {
    const child = StyleEmitter.emitElementRules(layer("root", { positioning: "absolute", "frame.x": 12, "frame.y": 34, "frame.rotation": 15 }));
    assert.match(child, /position: absolute;/);
    assert.match(child, /left: 12px;/);
    assert.match(child, /top: 34px;/);
    assert.match(child, /rotate: 15deg;/);
    const root = StyleEmitter.emitElementRules(layer(null, { positioning: "absolute", "frame.x": 40 }));
    assert.doesNotMatch(root, /position: absolute|left:/);
  });
});
