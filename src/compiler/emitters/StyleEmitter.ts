"use client";

/**
 * ============================================================================
 * STYLE EMITTER (CSS & DESIGN TOKEN CODE GENERATOR)
 * ============================================================================
 * Compiles visual AST element properties, design tokens, and theme configs
 * into clean, scoped CSS variables, CSS modules, and responsive stylesheets.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.1 & PANELS.md (Panel 27)
 * ============================================================================
 */

import { ColorTokens, WireColorTokens } from "@/core/types/theme";
import { StyleEmitterOptions, EmittedFile } from "@/core/types/compiler";
import type { Layer } from "@/core/document/schema";

/** The part of a theme that `emitTokens` reads. Partial token maps are allowed. */
export interface TokenThemeInput {
  colors?: Partial<ColorTokens>;
  wires?: Partial<WireColorTokens>;
  /** Legacy name for `wires`. */
  wireColors?: Partial<WireColorTokens>;
}

export class StyleEmitter {
  /**
   * Converts camelCase property name to CSS kebab-case.
   */
  public static toKebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  }

  /**
   * Sanitizes identifier to make it a legal CSS class name.
   */
  public static sanitizeClassName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/^([0-9])/, "_$1")
      .toLowerCase();
  }

  /**
   * Formats a CSS value, appending "px" to unitless dimensional numbers.
   */
  public static formatCssValue(propKey: string, val: unknown): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "number") {
      // Unitless CSS properties
      const unitlessProps = new Set([
        "opacity",
        "fontWeight",
        "zIndex",
        "flex",
        "flexGrow",
        "flexShrink",
        "order",
        "lineHeight",
      ]);
      if (unitlessProps.has(propKey)) {
        return String(val);
      }
      return `${val}px`;
    }
    return String(val);
  }

  /**
   * Generates a CSS class selector for a given project element.
   */
  public static getElementClassName(
    element: Layer,
    options?: StyleEmitterOptions
  ): string {
    const prefix = options?.classPrefix ? `${options.classPrefix}-` : "";
    const cleanName = StyleEmitter.sanitizeClassName(element.name || element.archetype);
    const shortId = element.id.replace(/^el_/, "").substring(0, 8);
    return `${prefix}${cleanName}_${shortId}`;
  }

  /**
   * Compiles design tokens into `:root { --... }` CSS custom properties.
   */
  public static emitTokens(
    theme: TokenThemeInput,
    options?: StyleEmitterOptions
  ): EmittedFile {
    const indent = " ".repeat(options?.indent ?? 2);
    const lines: string[] = [];

    lines.push("/* ==========================================================================");
    lines.push(" * AUTOMATICALLY GENERATED DESIGN SYSTEM TOKENS");
    lines.push(" * LazyLayout Compiler — Next.js 15 & React 19");
    lines.push(" * ========================================================================== */");
    lines.push("");
    lines.push(":root {");

    // 1. Colors
    if (theme.colors) {
      lines.push(`${indent}/* --- Color Tokens --- */`);
      for (const [key, val] of Object.entries(theme.colors)) {
        if (typeof val === "string" && val.trim()) {
          const varName = `--color-${StyleEmitter.toKebabCase(key)}`;
          lines.push(`${indent}${varName}: ${val};`);
        }
      }
    }

    // 2. Wire & Data Type Colors
    const wireTokens = theme.wires || theme.wireColors;
    if (wireTokens) {
      lines.push("");
      lines.push(`${indent}/* --- Blueprint Wire & Data Type Colors --- */`);
      for (const [key, val] of Object.entries(wireTokens)) {
        if (typeof val === "string" && val.trim()) {
          const varName = `--wire-${StyleEmitter.toKebabCase(key)}`;
          lines.push(`${indent}${varName}: ${val};`);
        }
      }
    }

    // 3. Spacing & Typography Defaults
    lines.push("");
    lines.push(`${indent}/* --- Typography & Elevation Tokens --- */`);
    lines.push(`${indent}--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`);
    lines.push(`${indent}--font-mono: "JetBrains Mono", "Fira Code", monospace;`);
    lines.push(`${indent}--radius-sm: 4px;`);
    lines.push(`${indent}--radius-md: 8px;`);
    lines.push(`${indent}--radius-lg: 12px;`);
    lines.push(`${indent}--shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.2);`);
    lines.push(`${indent}--shadow-elevation: 0 10px 25px -5px rgba(0, 0, 0, 0.4);`);

    lines.push("}");
    lines.push("");

    return {
      path: "styles/tokens.css",
      content: lines.join("\n"),
      language: "css",
      type: "styles",
    };
  }

  /**
   * Compiles an element's properties into CSS declarations and returns the rule string.
   */
  public static emitElementRules(
    element: Layer,
    options?: StyleEmitterOptions
  ): string {
    const indent = " ".repeat(options?.indent ?? 2);
    const className = StyleEmitter.getElementClassName(element, options);
    const props = element.properties || {};

    // Keys that map directly to CSS properties
    const ignoredKeys = new Set([
      "textContent",
      "label",
      "placeholder",
      "src",
      "alt",
      "href",
      "disabled",
      "type",
      "ariaLabel",
      "semanticTag",
      "hoverStyles",
      "activeStyles",
      "focusStyles",
      "mediaQueries",
    ]);

    const declarations: string[] = [];

    // Default base styles based on archetype
    if (element.archetype === "button") {
      declarations.push(`${indent}cursor: pointer;`);
      declarations.push(`${indent}border: none;`);
      declarations.push(`${indent}outline: none;`);
      declarations.push(`${indent}display: inline-flex;`);
      declarations.push(`${indent}align-items: center;`);
      declarations.push(`${indent}justify-content: center;`);
      declarations.push(`${indent}font-family: inherit;`);
      declarations.push(`${indent}transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);`);
    } else if (element.archetype === "container") {
      declarations.push(`${indent}box-sizing: border-box;`);
    } else if (element.archetype === "image") {
      declarations.push(`${indent}max-width: 100%;`);
      declarations.push(`${indent}height: auto;`);
      declarations.push(`${indent}display: block;`);
    } else if (element.archetype === "input") {
      declarations.push(`${indent}box-sizing: border-box;`);
      declarations.push(`${indent}font-family: inherit;`);
      declarations.push(`${indent}outline: none;`);
      declarations.push(`${indent}transition: border-color 0.15s ease;`);
    }

    for (const [key, val] of Object.entries(props)) {
      if (ignoredKeys.has(key) || val === undefined || val === null || val === "") {
        continue;
      }
      const cssProp = StyleEmitter.toKebabCase(key);
      const cssVal = StyleEmitter.formatCssValue(key, val);
      declarations.push(`${indent}${cssProp}: ${cssVal};`);
    }

    const rules: string[] = [];
    rules.push(`.${className} {`);
    rules.push(declarations.join("\n"));
    rules.push("}");

    // Pseudo-class: :hover
    if (props.hoverStyles && typeof props.hoverStyles === "object") {
      const hoverDecls: string[] = [];
      for (const [k, v] of Object.entries(props.hoverStyles as Record<string, unknown>)) {
        hoverDecls.push(`${indent}${StyleEmitter.toKebabCase(k)}: ${StyleEmitter.formatCssValue(k, v)};`);
      }
      if (hoverDecls.length > 0) {
        rules.push("");
        rules.push(`.${className}:hover {`);
        rules.push(hoverDecls.join("\n"));
        rules.push("}");
      }
    }

    // Pseudo-class: :active
    if (props.activeStyles && typeof props.activeStyles === "object") {
      const activeDecls: string[] = [];
      for (const [k, v] of Object.entries(props.activeStyles as Record<string, unknown>)) {
        activeDecls.push(`${indent}${StyleEmitter.toKebabCase(k)}: ${StyleEmitter.formatCssValue(k, v)};`);
      }
      if (activeDecls.length > 0) {
        rules.push("");
        rules.push(`.${className}:active {`);
        rules.push(activeDecls.join("\n"));
        rules.push("}");
      }
    }

    // Pseudo-class: :focus-visible
    if (props.focusStyles && typeof props.focusStyles === "object") {
      const focusDecls: string[] = [];
      for (const [k, v] of Object.entries(props.focusStyles as Record<string, unknown>)) {
        focusDecls.push(`${indent}${StyleEmitter.toKebabCase(k)}: ${StyleEmitter.formatCssValue(k, v)};`);
      }
      if (focusDecls.length > 0) {
        rules.push("");
        rules.push(`.${className}:focus-visible {`);
        rules.push(focusDecls.join("\n"));
        rules.push("}");
      }
    }

    // Pseudo-class: :disabled
    if (element.archetype === "button" || element.archetype === "input") {
      rules.push("");
      rules.push(`.${className}:disabled {`);
      rules.push(`${indent}opacity: 0.5;`);
      rules.push(`${indent}cursor: not-allowed;`);
      rules.push(`${indent}pointer-events: none;`);
      rules.push("}");
    }

    // Responsive media queries
    if (props.mediaQueries && typeof props.mediaQueries === "object") {
      for (const [breakpoint, overrides] of Object.entries(
        props.mediaQueries as Record<string, Record<string, unknown>>
      )) {
        if (overrides && typeof overrides === "object") {
          const bpDecls: string[] = [];
          for (const [k, v] of Object.entries(overrides)) {
            bpDecls.push(`${indent}${indent}${StyleEmitter.toKebabCase(k)}: ${StyleEmitter.formatCssValue(k, v)};`);
          }
          if (bpDecls.length > 0) {
            const maxWidth = options?.responsiveBreakpoints?.[breakpoint] ?? (breakpoint === "mobile" ? 640 : 768);
            rules.push("");
            rules.push(`@media (max-width: ${maxWidth}px) {`);
            rules.push(`${indent}.${className} {`);
            rules.push(bpDecls.join("\n"));
            rules.push(`${indent}}`);
            rules.push("}");
          }
        }
      }
    }

    return rules.join("\n");
  }

  /**
   * Compiles an entire dictionary of layers into a scoped stylesheet.
   */
  public static emitProjectStyles(
    elements: Record<string, Layer>,
    options?: StyleEmitterOptions
  ): EmittedFile {
    const lines: string[] = [];
    lines.push("/* ==========================================================================");
    lines.push(" * AUTOMATICALLY GENERATED SCOPED STYLES");
    lines.push(" * LazyLayout Compiler — Next.js 15 & React 19");
    lines.push(" * ========================================================================== */");
    lines.push("");

    for (const el of Object.values(elements)) {
      lines.push(StyleEmitter.emitElementRules(el, options));
      lines.push("");
    }

    const fileName = options?.format === "css-modules" ? "styles/elements.module.css" : "styles/elements.css";

    return {
      path: fileName,
      content: lines.join("\n"),
      language: "css",
      type: "styles",
    };
  }
}
