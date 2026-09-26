"use client";

/**
 * ============================================================================
 * REACT 19 / NEXT.JS 15 COMPONENT & JSX EMITTER
 * ============================================================================
 * Compiles visual AST element trees, page hierarchies, and state bindings
 * into accessible, fully-typed React 19 JSX components with WCAG semantic tags.
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.1 & FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md
 * ============================================================================
 */

import { PageDefinition, StateVariable } from "@/core/store/useProjectStore";
import { ComponentEmitterOptions, EmittedFile } from "@/core/types/compiler";
import { StyleEmitter } from "./StyleEmitter";
import type { Layer } from "@/core/document/schema";
import { propReader } from "@/core/document/properties";

export class ReactComponentEmitter {
  /**
   * Sanitizes an element or page name into a valid PascalCase React identifier.
   */
  public static toPascalCase(name: string): string {
    const clean = name
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
    return clean || "VisualComponent";
  }

  /**
   * Determines the optimal semantic HTML tag for an element.
   */
  public static resolveSemanticTag(element: Layer): string {
    const get = propReader(element.properties);

    // 1. Explicit semantic tag
    const explicitTag = get("export.tag");
    if (typeof explicitTag === "string" && explicitTag.trim()) {
      return explicitTag.trim().toLowerCase();
    }

    // 2. Archetype-specific deduction
    switch (element.archetype) {
      case "button":
        return "button";
      case "image":
        return "img";
      case "input":
        return "input";
      case "form":
        return "form";
      case "text": {
        // Infer from font size or role
        const size = get("typography.fontSize");
        const fontSize = typeof size === "number" ? size : 16;
        if (fontSize >= 32) return "h1";
        if (fontSize >= 26) return "h2";
        if (fontSize >= 22) return "h3";
        if (fontSize >= 18) return "h4";
        const role = String(get("a11y.role") || "").toLowerCase();
        if (role === "label") return "label";
        if (role === "caption" || role === "span") return "span";
        return "p";
      }
      case "container": {
        const nameLower = element.name.toLowerCase();
        if (nameLower.includes("header") || nameLower.includes("navbar") || nameLower.includes("nav")) {
          return nameLower.includes("nav") ? "nav" : "header";
        }
        if (nameLower.includes("footer")) return "footer";
        if (nameLower.includes("main") || nameLower.includes("root")) return "main";
        if (nameLower.includes("section")) return "section";
        if (nameLower.includes("article") || nameLower.includes("card")) return "article";
        if (nameLower.includes("aside") || nameLower.includes("sidebar")) return "aside";
        return "div";
      }
      default:
        return "div";
    }
  }

  /**
   * Checks whether the element or any of its children require React client directives.
   */
  public static requiresClientDirective(
    elementId: string,
    elements: Record<string, Layer>
  ): boolean {
    const el = elements[elementId];
    if (!el) return false;

    // Buttons, inputs, forms or elements with event listeners require client components
    if (el.archetype === "button" || el.archetype === "input" || el.archetype === "form") {
      return true;
    }
    for (const childId of el.children || []) {
      if (ReactComponentEmitter.requiresClientDirective(childId, elements)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates a JSX node representation for an element, recursively including its children.
   */
  public static emitJsxNode(
    elementId: string,
    elements: Record<string, Layer>,
    options?: ComponentEmitterOptions,
    depth: number = 2
  ): string {
    const el = elements[elementId];
    if (!el) return "";

    const indent = " ".repeat(depth * 2);
    const tag = ReactComponentEmitter.resolveSemanticTag(el);
    const get = propReader(el.properties);
    const className = StyleEmitter.getElementClassName(el, { classPrefix: options?.styleIdentifier });

    const attributes: string[] = [];

    // Class Name
    if (options?.stylingApproach === "css-modules") {
      attributes.push(`className={styles.${className}}`);
    } else {
      attributes.push(`className="${className}"`);
    }

    // Accessibility attributes (WCAG standard)
    if (options?.includeAccessibility !== false) {
      if (tag === "img") {
        const altText = get("media.alt") || get("a11y.label") || el.name || "Visual graphic";
        attributes.push(`alt="${altText}"`);
        attributes.push(`loading="lazy"`);
      } else if (tag === "button") {
        attributes.push(`type="${get("button.type") === "submit" ? "submit" : "button"}"`);
        if (get("a11y.label")) {
          attributes.push(`aria-label="${get("a11y.label")}"`);
        }
      } else if (tag === "input") {
        const inputType = get("input.type") || "text";
        attributes.push(`type="${inputType}"`);
        if (get("input.placeholder")) attributes.push(`placeholder="${get("input.placeholder")}"`);
        if (get("a11y.label")) attributes.push(`aria-label="${get("a11y.label")}"`);
        if (get("input.required")) attributes.push(`aria-required="true"`);
      }

      if (get("interaction.disabled")) {
        attributes.push(`disabled`);
        attributes.push(`aria-disabled="true"`);
      }

      if (get("a11y.role") && tag === "div") {
        attributes.push(`role="${get("a11y.role")}"`);
      }
    }

    // Image Source
    if (tag === "img" && get("media.src")) {
      attributes.push(`src="${get("media.src")}"`);
    }

    // Interactive event handlers
    if (tag === "button" || el.archetype === "button") {
      attributes.push(`onClick={handleClick}`);
    }

    const attrStr = attributes.length > 0 ? " " + attributes.join(" ") : "";

    // Self-closing void HTML elements
    const isVoidElement = tag === "img" || tag === "input" || tag === "hr" || tag === "br";
    if (isVoidElement) {
      return `${indent}<${tag}${attrStr} />`;
    }

    // Content: textContent or children
    const text = get("content.text");
    const label = get("content.label");
    const textContent = typeof text === "string" ? text : typeof label === "string" ? label : null;

    const childIds = el.children || [];

    if (childIds.length === 0) {
      if (textContent) {
        return `${indent}<${tag}${attrStr}>${textContent}</${tag}>`;
      }
      return `${indent}<${tag}${attrStr} />`;
    }

    // Children nesting
    const childrenJsx = childIds
      .map((childId) => ReactComponentEmitter.emitJsxNode(childId, elements, options, depth + 1))
      .filter(Boolean)
      .join("\n");

    const innerContent = textContent ? `${indent}  ${textContent}\n${childrenJsx}` : childrenJsx;

    return `${indent}<${tag}${attrStr}>\n${innerContent}\n${indent}</${tag}>`;
  }

  /**
   * Compiles an element tree into an isolated reusable component file.
   */
  public static emitComponent(
    rootElementId: string,
    elements: Record<string, Layer>,
    options?: ComponentEmitterOptions
  ): EmittedFile {
    const rootEl = elements[rootElementId];
    if (!rootEl) {
      throw new Error(`Cannot emit component: Element '${rootElementId}' not found in AST.`);
    }

    const compName =
      options?.componentName || ReactComponentEmitter.toPascalCase(rootEl.name || rootEl.archetype);
    const isClient =
      options?.useClientDirective === "always" ||
      (options?.useClientDirective !== "never" &&
        ReactComponentEmitter.requiresClientDirective(rootElementId, elements));

    const lines: string[] = [];

    // Next.js 15 Client Component Directive
    if (isClient) {
      lines.push('"use client";');
      lines.push("");
    }

    lines.push("/* ==========================================================================");
    lines.push(` * COMPONENT: ${compName}`);
    lines.push(" * LazyLayout Compiler — Next.js 15 & React 19");
    lines.push(" * ========================================================================== */");
    lines.push("");

    // React Imports
    const reactImports: string[] = ["React"];
    if (isClient) {
      reactImports.push("useCallback");
    }
    lines.push(`import ${reactImports.join(", { ")}${reactImports.length > 1 ? " }" : ""} from "react";`);

    // Styling Import
    if (options?.stylingApproach === "css-modules") {
      lines.push(`import styles from "./${compName}.module.css";`);
    } else {
      lines.push(`import "./styles.css";`);
    }
    lines.push("");

    // TypeScript Props Interface
    if (options?.includeTypeScriptTypes !== false) {
      lines.push(`export interface ${compName}Props {`);
      lines.push(`  className?: string;`);
      lines.push(`  style?: React.CSSProperties;`);
      lines.push(`  children?: React.ReactNode;`);
      lines.push(`  onClick?: (e: React.MouseEvent) => void;`);
      lines.push(`}`);
      lines.push("");
    }

    // Component Function
    const propsArg = options?.includeTypeScriptTypes !== false ? `props: ${compName}Props` : "props";
    const exportPrefix = options?.exportType === "default" ? "export default function" : "export function";

    lines.push(`${exportPrefix} ${compName}(${propsArg}) {`);

    if (isClient) {
      lines.push("  const handleClick = useCallback((e: React.MouseEvent) => {");
      lines.push("    props.onClick?.(e);");
      lines.push("  }, [props]);");
      lines.push("");
    }

    lines.push("  return (");
    lines.push(ReactComponentEmitter.emitJsxNode(rootElementId, elements, options, 2));
    lines.push("  );");
    lines.push("}");
    lines.push("");

    return {
      path: `components/${compName}.tsx`,
      content: lines.join("\n"),
      language: "typescript",
      type: "component",
    };
  }

  /**
   * Compiles an entire page definition into a Next.js 15 App Router `page.tsx` file.
   */
  public static emitPage(
    page: PageDefinition,
    elements: Record<string, Layer>,
    options?: ComponentEmitterOptions
  ): EmittedFile {
    const pagePascalName = ReactComponentEmitter.toPascalCase(page.name || "Page");
    const isClient =
      options?.useClientDirective === "always" ||
      (options?.useClientDirective !== "never" &&
        ReactComponentEmitter.requiresClientDirective(page.rootElementId, elements));

    const lines: string[] = [];

    if (isClient) {
      lines.push('"use client";');
      lines.push("");
    }

    lines.push("/* ==========================================================================");
    lines.push(` * PAGE: ${page.name} (${page.slug})`);
    lines.push(" * LazyLayout Compiler — Next.js 15 (App Router)");
    lines.push(" * ========================================================================== */");
    lines.push("");

    lines.push('import React from "react";');
    lines.push('import "./page.css";');
    lines.push("");

    lines.push(`export default function ${pagePascalName}Page() {`);
    lines.push("  return (");
    lines.push(ReactComponentEmitter.emitJsxNode(page.rootElementId, elements, options, 2));
    lines.push("  );");
    lines.push("}");
    lines.push("");

    const routeDir = page.slug === "/" ? "app" : `app/${page.slug.replace(/^\//, "")}`;

    return {
      path: `${routeDir}/page.tsx`,
      content: lines.join("\n"),
      language: "typescript",
      type: "page",
    };
  }
}
