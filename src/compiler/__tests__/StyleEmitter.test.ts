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
  it("converts camelCase properties to CSS kebab-case and formats units", () => {
    const containerEl: Layer = {
      id: "el_card_123",
      name: "HeroCard",
      archetype: "container",
      parentId: null,
      properties: {
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: 32,
        backgroundColor: "#1E293B",
        borderRadius: 12,
        opacity: 0.95,
        fontWeight: 600,
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
        backgroundColor: "#206859",
        color: "#FFFFFF",
        hoverStyles: {
          backgroundColor: "#2A8572",
          transform: "translateY(-2px)",
        },
        activeStyles: {
          transform: "translateY(0px)",
        },
      },
      children: [],
    };

    const rules = StyleEmitter.emitElementRules(btnEl);
    assert.match(rules, /cursor: pointer;/);
    assert.match(rules, /display: inline-flex;/);
    assert.match(rules, /\.submitbtn_btn_subm:hover \{/);
    assert.match(rules, /background-color: #2A8572;/);
    assert.match(rules, /transform: translateY\(-2px\);/);
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
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        mediaQueries: {
          mobile: {
            gridTemplateColumns: "1fr",
            padding: 16,
          },
        },
      },
      children: [],
    };

    const rules = StyleEmitter.emitElementRules(el);
    assert.match(rules, /@media \(max-width: 640px\) \{/);
    assert.match(rules, /grid-template-columns: 1fr;/);
    assert.match(rules, /padding: 16px;/);
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
        properties: { height: 64 },
        children: [],
      },
      el_2: {
        id: "el_2",
        name: "Logo",
        archetype: "image",
        parentId: "el_1",
        properties: { width: 120 },
        children: [],
      },
    };

    const file = StyleEmitter.emitProjectStyles(elements);
    assert.equal(file.path, "styles/elements.css");
    assert.match(file.content, /\.header_1 \{/);
    assert.match(file.content, /\.logo_2 \{/);
  });
});
