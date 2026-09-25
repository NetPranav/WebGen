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
import { getPropertyDefinition } from "@/core/document/properties";

/** Property groups whose registry `css` mapping is a direct, emit-as-is CSS declaration. */
const CSS_DIRECT_GROUPS = ["appearance.", "typography.", "layout.", "frame.width", "frame.height", "transform.", "filter.", "media.filter.", "media.objectFit", "media.objectPosition", "media.aspectRatio", "svg.stroke", "svg.fill"];

/** CSS transform function per canonical path (the rest use the path's last segment). */
const TRANSFORM_FUNCTIONS: Record<string, string> = {
  "transform.x": "translateX",
  "transform.y": "translateY",
  "transform.z": "translateZ",
};

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
   * Formats a value for the canonical property `path` using its registry value
   * type: lengths get `px`, angles `deg`, plain numbers stay unitless.
   */
  public static formatCssValue(path: string, val: unknown): string {
    if (val === null || val === undefined) return "";
    if (typeof val !== "number") return String(val);
    const def = getPropertyDefinition(path);
    if (def?.valueType === "length") return `${val}px`;
    if (def?.valueType === "angle") return `${val}deg`;
    return String(val);
  }

  /**
   * CSS declarations for a bag of canonical props. Paths with no direct CSS
   * mapping (content, media sources, behaviour flags) are skipped; the
   * `transform.*` and filter paths are combined into one declaration each.
   */
  public static cssDeclarations(props: Record<string, unknown>, indent: string): string[] {
    const out: string[] = [];
    const transforms: string[] = [];
    const filters: string[] = [];
    for (const [path, val] of Object.entries(props)) {
      if (val === undefined || val === null || val === "") continue;
      const def = getPropertyDefinition(path);
      if (!def || def.css === null || def.css === "offset-path" || !CSS_DIRECT_GROUPS.some((g) => path.startsWith(g))) continue;
      // A companion `<path>Unit` (e.g. `typography.fontSizeUnit: "rem"`) overrides the default unit.
      const unit = props[`${path}Unit`];
      const formatted =
        typeof val === "number" && def.valueType === "length" && typeof unit === "string" && unit !== "auto"
          ? `${val}${unit}`
          : StyleEmitter.formatCssValue(path, val);
      if (def.css === "transform") {
        transforms.push(`${TRANSFORM_FUNCTIONS[path] ?? path.slice("transform.".length)}(${formatted})`);
      } else if (def.css === "filter") {
        filters.push(`${path.slice(path.lastIndexOf(".") + 1)}(${formatted})`);
      } else {
        out.push(`${indent}${def.css}: ${formatted};`);
      }
    }
    if (transforms.length) out.push(`${indent}transform: ${transforms.join(" ")};`);
    if (filters.length) out.push(`${indent}filter: ${filters.join(" ")};`);
    return out;
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

    declarations.push(...StyleEmitter.cssDeclarations(props, indent));

    const rules: string[] = [];
    rules.push(`.${className} {`);
    rules.push(declarations.join("\n"));
    rules.push("}");

    // Pseudo-class: :hover
    const hoverDecls = StyleEmitter.cssDeclarations(options?.stateStyles?.hover ?? {}, indent);
    if (hoverDecls.length > 0) {
      rules.push("");
      rules.push(`.${className}:hover {`);
      rules.push(hoverDecls.join("\n"));
      rules.push("}");
    }

    // Pseudo-class: :active
    const activeDecls = StyleEmitter.cssDeclarations(options?.stateStyles?.active ?? {}, indent);
    if (activeDecls.length > 0) {
      rules.push("");
      rules.push(`.${className}:active {`);
      rules.push(activeDecls.join("\n"));
      rules.push("}");
    }

    // Pseudo-class: :focus-visible
    const focusDecls = StyleEmitter.cssDeclarations(options?.stateStyles?.focus ?? {}, indent);
    if (focusDecls.length > 0) {
      rules.push("");
      rules.push(`.${className}:focus-visible {`);
      rules.push(focusDecls.join("\n"));
      rules.push("}");
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

    // Responsive breakpoint overrides
    for (const [breakpoint, overrides] of Object.entries(options?.breakpointOverrides ?? {})) {
      const bpDecls = StyleEmitter.cssDeclarations(overrides, indent + indent);
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
